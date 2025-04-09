import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DEFAULT_AVATAR, API_URL } from '../utils/config';
import { useAuthContext } from '../context/AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaLayout } from '../components';

// Types
type RootStackParamList = {
  UserProfile: { userId: string };
  // Add other screen params as needed
};

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

interface UserData {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  token?: string;
}

interface Post {
  _id: string;
  description: string;
  images: string[];
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  likes: string[];
  createdAt: string;
}

interface PostDisplay {
  _id: string;
  content: string;
  imageUrl?: string;
}

// Add this type to fix navigation
type PossibleNavigation = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
};

const UserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
  const { user: currentUser } = useAuthContext() as { user: UserData | null };
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [displayPosts, setDisplayPosts] = useState<PostDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  // Cast navigation to a more flexible type
  const nav = navigation as unknown as PossibleNavigation;

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
  }, [userId]);

  // Update display posts when source data changes
  useEffect(() => {
    if (posts.length > 0) {
      const formattedPosts = posts.map(post => ({
        _id: post._id,
        content: post.description || 'No description',
        imageUrl: post.images && post.images.length > 0 ? post.images[0] : undefined
      }));
      setDisplayPosts(formattedPosts);
    }
  }, [posts]);

  const fetchUserProfile = async () => {
    if (!currentUser?.token) {
      console.error('No auth token available');
      setLoading(false);
      return;
    }

    try {
      console.log(`Fetching user profile for ID: ${userId}`);
      const response = await axios.get(`${API_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      setUser(response.data);

      // Check if this user is in current user's following list
      if (currentUser?.following?.includes(userId)) {
        setIsFriend(true);
      } else {
        // Try to check if we have sent a friend request
        // Using try/catch to handle any API errors without breaking the app
        try {
          await checkFriendRequestStatus();
        } catch (error) {
          console.log('Friend request status check failed, continuing without it');
        }
      }

    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile');

      if (error.response) {
        console.error('Error response data:', error.response.data);
        Alert.alert('Error', error.response.data.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!currentUser?.token) {
      console.error('No auth token available');
      return;
    }

    try {
      console.log(`Fetching posts for user: ${userId}`);
      const response = await axios.get(`${API_URL}/api/posts`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      if (response.data && response.data.success) {
        // Filter posts for the specific user
        const userPosts = response.data.data.filter(
          (post: Post) => post.user && post.user._id === userId
        );
        setPosts(userPosts);
        console.log(`Found ${userPosts.length} posts for user ${userId}`);
      }
    } catch (error: any) {
      console.error('Error fetching user posts:', error);

      if (error.response) {
        console.error('Error response data:', error.response.data);
      }
    }
  };

  const checkFriendRequestStatus = async () => {
    if (!currentUser?.token) return;

    try {
      // Use the existing endpoint to get all friend requests
      // This endpoint exists in the backend from the search results
      const response = await axios.get(`${API_URL}/api/users/friend-requests`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      // Check if the current user has an active friend request to this user
      // The backend returns information about the users who sent requests to you,
      // so we need to check differently to see if we've sent a request to this user

      // For now, we'll just set it to false since the backend doesn't
      // have the specific endpoint we need yet
      setFriendRequestSent(false);
    } catch (error) {
      console.error('Error checking friend request status:', error);
      // Don't show alerts for this error since it's not critical
      // Just assume we haven't sent a request
      setFriendRequestSent(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchUserProfile(), fetchUserPosts()])
      .finally(() => setRefreshing(false));
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser?.token) {
      Alert.alert('Error', 'You need to be logged in to send friend requests');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/friend-request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      setFriendRequestSent(true);
      Alert.alert('Success', 'Friend request sent successfully');
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send friend request';
      Alert.alert('Error', errorMessage);
    }
  };

  const renderPostItem = ({ item }: { item: PostDisplay }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => {
        // Use the cast navigation
        nav.navigate('Home', {
          screen: 'PostDetails',
          params: { postId: item._id }
        });
      }}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      ) : (
        <View style={styles.textPostContainer}>
          <Text style={styles.textPostContent} numberOfLines={5}>
            {item.content}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaLayout>
      <FlatList
        data={displayPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4B0082']}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => nav.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{user?.username || 'User Profile'}</Text>
              <View style={styles.headerRight} />
            </View>

            <View style={styles.profileContainer}>
              <Image
                source={{ uri: user?.profilePicture || DEFAULT_AVATAR }}
                style={styles.profileImage}
              />

              <View style={styles.profileInfoContainer}>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{displayPosts.length}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{user?.following?.length || 0}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{user?.followers?.length || 0}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </View>
                </View>

                {!isFriend && !friendRequestSent ? (
                  <TouchableOpacity
                    style={styles.followButton}
                    onPress={handleSendFriendRequest}
                  >
                    <Text style={styles.followButtonText}>Follow</Text>
                  </TouchableOpacity>
                ) : friendRequestSent ? (
                  <TouchableOpacity
                    style={styles.pendingButton}
                    disabled={true}
                  >
                    <Text style={styles.pendingButtonText}>Request Sent</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.followingButton}>
                    <Text style={styles.followingButtonText}>Following</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.username}>@{user?.username}</Text>
              <Text style={styles.bioText}>{user?.bio || 'No bio yet'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Posts</Text>

              {!refreshing && displayPosts.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="images-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No posts yet</Text>
                </View>
              )}
            </View>
          </>
        }
        contentContainerStyle={styles.postsGrid}
      />
    </SafeAreaLayout>
  );
};

const { width } = Dimensions.get('window');
const POST_WIDTH = width / 3 - 2;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4B0082',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 30, // To balance the back button
  },
  profileContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileInfoContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  followButton: {
    backgroundColor: '#405DE6',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pendingButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  pendingButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  followingButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  followingButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userInfoContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  postsGrid: {
    paddingBottom: 20,
  },
  postItem: {
    width: POST_WIDTH,
    height: POST_WIDTH,
    margin: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  textPostContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    padding: 10,
  },
  textPostContent: {
    fontSize: 12,
    color: '#333',
  },
});

export default UserProfileScreen; 