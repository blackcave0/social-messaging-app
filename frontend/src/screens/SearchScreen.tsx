import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaLayout } from '../components';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import { RootTabScreenProps } from '../types/navigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../context/AuthContext';

// Define user type to include the properties we need
interface AppUser {
  _id: string;
  token?: string;
  following?: string[];
  friendRequests?: string[];
}

interface SearchResult {
  _id: string;
  username: string;
  name: string;
  profilePicture: string;
  isFollowing?: boolean;
  hasSentRequest?: boolean;
  hasReceivedRequest?: boolean;
}

const SearchScreen = ({ navigation }: RootTabScreenProps<'Search'>) => {
  const { user } = useAuthContext() as { user: AppUser | null };
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent searches from AsyncStorage
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const savedSearches = await AsyncStorage.getItem('recentSearches');
        if (savedSearches) {
          setRecentSearches(JSON.parse(savedSearches));
        }
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    };
    loadRecentSearches();
  }, []);

  // Save recent searches to AsyncStorage
  const saveRecentSearches = async (searches: string[]) => {
    try {
      await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  };

  // Effect to handle search
  useEffect(() => {
    if (searchQuery.trim() === '' || !user?.token) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  // Function to search users
  const searchUsers = async (query: string) => {
    if (!user?.token) {
      console.error('No auth token available for search');
      return;
    }

    setIsLoading(true);
    try {
      // console.log(`Searching for users matching: "${query}"`);
      // console.log(`Using API URL: ${API_URL}/api/users/search?query=${query}`);

      const response = await axios.get(`${API_URL}/api/users/search?query=${query}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      // console.log(`Search results count: ${response.data.length}`);

      // Get friend requests to check status
      let friendRequests: string[] = [];
      try {
        const requestsResponse = await axios.get(`${API_URL}/api/users/friend-requests`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        friendRequests = requestsResponse.data.map((req: any) => req._id);
      } catch (err) {
        // console.log('Could not fetch friend requests, continuing without this data');
      }

      // Get sent friend requests (check endpoint implementation)
      let sentFriendRequests: string[] = [];
      try {
        // This assumes the API has an endpoint to get sent friend requests
        // If it doesn't exist, we'll catch the error and continue
        const sentRequestsResponse = await axios.get(`${API_URL}/api/users/sent-requests`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        sentFriendRequests = sentRequestsResponse.data || [];
      } catch (err) {
        // console.log('Could not fetch sent requests, continuing without this data');

        // Fallback approach if the API doesn't support getting sent requests
        // Get all users and look for those with our ID in their friendRequests array
        try {
          // console.log('Trying alternative approach to fetch sent requests');
          // This is not ideal for production as it fetches all users
          // but it's a workaround for testing/demo purposes
          const allUsersResponse = await axios.get(`${API_URL}/api/users`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });

          // For each search result, check if they have our user ID in their friendRequests
          const searchResultIds = response.data.map((r: any) => r._id);
          sentFriendRequests = allUsersResponse.data
            .filter((u: any) =>
              searchResultIds.includes(u._id) &&
              u.friendRequests &&
              u.friendRequests.includes(user._id)
            )
            .map((u: any) => u._id);
        } catch (fetchErr) {
          // console.log('Alternative approach also failed:', fetchErr);
        }
      }

      // Enhance search results with relationship status
      const enhancedResults = response.data.map((result: SearchResult) => {
        return {
          ...result,
          isFollowing: user.following?.includes(result._id) || false,
          hasReceivedRequest: friendRequests.includes(result._id) || false,
          hasSentRequest: sentFriendRequests.includes(result._id) || false
        };
      });

      setResults(enhancedResults);
    } catch (error: any) {
      console.error('Error searching users:', error);

      // More detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        Alert.alert('Error', error.response.data.message || 'Failed to search users. Please try again.');
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to send friend request
  const sendFriendRequest = async (userId: string) => {
    if (!user?.token) {
      Alert.alert('Error', 'You need to be logged in to send friend requests');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/friend-request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      Alert.alert('Success', 'Friend request sent successfully');

      // Update UI by updating the results list to show a different button state
      // This would be better handled with a state for each user, but for simplicity
      // we'll just refresh the search results
      searchUsers(searchQuery);
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send friend request';
      Alert.alert('Error', errorMessage);
    }
  };

  // Function to accept friend request
  const acceptFriendRequest = async (userId: string) => {
    if (!user?.token) {
      Alert.alert('Error', 'You need to be logged in to accept friend requests');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/accept-request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      Alert.alert('Success', 'Friend request accepted');

      // Refresh search results
      searchUsers(searchQuery);
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to accept friend request';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const handleResultPress = (item: SearchResult) => {
    // Save to recent searches
    if (!recentSearches.includes(item.username)) {
      const updatedSearches = [item.username, ...recentSearches].slice(0, 10);
      setRecentSearches(updatedSearches);
      saveRecentSearches(updatedSearches);
    }

    // Navigate to user profile through the Home stack
    navigation.navigate('Home', {
      screen: 'UserProfile',
      params: { userId: item._id }
    });
  };

  const handleMessageUser = (user: SearchResult) => {
    // Navigate to the Chat screen with this user
    (navigation as any).navigate('Chat', {
      chatId: user._id,
      userId: user._id,
      name: user.name || user.username
    });
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <Image
        source={{ uri: item.profilePicture || DEFAULT_AVATAR }}
        style={styles.resultImage}
      />

      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.username}</Text>
        {item.name && (
          <Text style={styles.resultSubtitle}>{item.name}</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {item.isFollowing ? (
          <TouchableOpacity style={styles.followingButton} disabled>
            <Text style={styles.followingButtonText}>Following</Text>
          </TouchableOpacity>
        ) : item.hasSentRequest ? (
          <TouchableOpacity style={styles.pendingButton} disabled>
            <Text style={styles.pendingButtonText}>Requested</Text>
          </TouchableOpacity>
        ) : item.hasReceivedRequest ? (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => acceptFriendRequest(item._id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.followButton}
            onPress={() => sendFriendRequest(item._id)}
          >
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => handleMessageUser(item)}
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => setSearchQuery(item)}
    >
      <Ionicons name="time-outline" size={16} color="#999" style={styles.recentIcon} />
      <Text style={styles.recentText}>{item}</Text>
      <TouchableOpacity
        onPress={() => {
          const updatedSearches = recentSearches.filter(s => s !== item);
          setRecentSearches(updatedSearches);
          saveRecentSearches(updatedSearches);
        }}
      >
        <Ionicons name="close" size={16} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaLayout>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#405DE6" />
        </View>
      ) : searchQuery.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          renderItem={renderSearchResult}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.recentSearchesContainer}>
          {recentSearches.length > 0 && (
            <>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => {
                  setRecentSearches([]);
                  saveRecentSearches([]);
                }}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={recentSearches}
                keyExtractor={(item, index) => `recent-${index}`}
                renderItem={renderRecentSearch}
              />
            </>
          )}
        </View>
      )}
    </SafeAreaLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followButton: {
    backgroundColor: '#3897F0', // Instagram blue
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 4,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  recentSearchesContainer: {
    flex: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearText: {
    fontSize: 14,
    color: '#405DE6',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  recentIcon: {
    marginRight: 10,
  },
  recentText: {
    flex: 1,
    fontSize: 16,
  },
  followingButton: {
    backgroundColor: '#EFEFEF', // Light gray (Instagram style)
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 4,
  },
  followingButtonText: {
    color: '#000',
    fontWeight: '500',
    fontSize: 14,
  },
  pendingButton: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 4,
  },
  pendingButtonText: {
    color: '#000',
    fontWeight: '500',
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: '#3897F0', // Instagram blue
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 4,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  messageButtonText: {
    color: '#000',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default SearchScreen; 