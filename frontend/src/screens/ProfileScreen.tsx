import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { usePostsContext } from '../context/PostsContext';
import { SafeAreaLayout } from '../components';
import { DEFAULT_AVATAR } from '../utils/config';
import { getAllPosts } from '../api/posts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Change this to your computer's actual IP address on your local network
// For example: 'http://192.168.1.100:5000/api'
const API_URL = 'http://192.168.30.181:5000/api'; // For physical devices

interface ProfileScreenProps {
  navigation: any;
  route: any;
}

// Extended User type to include following and followers arrays
interface ExtendedUser {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  token?: string;
}

interface BackendPost {
  _id: string;
  description: string;
  images: string[];
  mood?: string;
  createdAt: string;
  user: {
    _id: string;
    username: string;
    name: string;
    profilePic?: string;
  };
  likes: string[];
  comments: string[];
}

interface Post {
  _id: string;
  description: string;
  images: string[];
  user: {
    _id: string;
    username: string;
    name: string;
    profilePicture?: string;
  };
  likes: string[];
  comments: string[];
  createdAt: string;
}

// Union type to handle both post types
type PostDisplay = {
  _id: string;
  isBackendPost: boolean;
  content: string;
  imageUrl?: string;
}

export default function ProfileScreen({ navigation, route }: ProfileScreenProps) {
  const { user, fetchCurrentUser } = useAuthContext() as { user: ExtendedUser | null, fetchCurrentUser: () => Promise<void> };
  const { getUserPosts, refreshPosts, refreshing } = usePostsContext();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [backendPosts, setBackendPosts] = useState<BackendPost[]>([]);
  const [displayPosts, setDisplayPosts] = useState<PostDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Check if returning from edit profile
  useEffect(() => {
    if (route.params?.editComplete) {
      console.log('Returning from edit profile, refreshing data...');
      setInitialDataLoaded(false); // Reset so useFocusEffect will refresh data

      // Clear the parameter so it doesn't trigger again
      navigation.setParams({ editComplete: undefined });
    }
  }, [route.params?.editComplete]);

  // Only fetch user data on first screen focus or after profile edit
  useFocusEffect(
    React.useCallback(() => {
      // This will track if the component is mounted
      let isMounted = true;

      const refreshUserData = async () => {
        // Only proceed if we haven't loaded data yet or if explicitly refreshing
        if (!initialDataLoaded && isMounted && user) {
          try {
            console.log('Initial user data load');
            await fetchCurrentUser();
            setInitialDataLoaded(true);
          } catch (error) {
            console.error('Error refreshing user data:', error);
          }
        }
      };

      refreshUserData();
      loadUserPosts()
      // Cleanup function to handle unmounting
      return () => {
        isMounted = false;
      };
    }, [fetchCurrentUser, initialDataLoaded, user])
  );

  useEffect(() => {
    if (user) {
      loadUserPosts();
      fetchUserPostsFromBackend();
    }
  }, [user]);

  // Update display posts whenever source data changes
  useEffect(() => {
    if (backendPosts.length > 0) {
      // Use backend posts if available
      const posts = backendPosts.map(post => ({
        _id: post._id || `temp-${Date.now()}`,
        isBackendPost: true,
        content: post.description || 'No description',
        imageUrl: post.images && post.images.length > 0 ? post.images[0] : undefined
      }));
      setDisplayPosts(posts);
      console.log('Processed backend posts:', posts.length);
    } else {
      // Otherwise use local posts
      const posts = userPosts.map(post => ({
        _id: post._id,
        isBackendPost: false,
        content: post.description,
        imageUrl: post.images && post.images.length > 0 ? post.images[0] : undefined
      }));
      setDisplayPosts(posts);
      console.log('Using local posts:', posts.length);
    }
  }, [backendPosts, userPosts]);

  const loadUserPosts = () => {
    if (user) {
      console.log('Loading user posts from local storage');
      const posts = getUserPosts(user._id);
      setUserPosts(posts);
    }
  };

  const fetchUserPostsFromBackend = async () => {
    if (!user || !user._id) {
      console.log('No user found, skipping post fetch');
      return;
    }

    if (loading) {
      console.log('Already loading posts, skipping duplicate fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get token for authentication
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        console.log('No user found in storage');
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userString);
      if (!userData.token) {
        console.log('No token found in user data');
        setLoading(false);
        return;
      }

      console.log('Fetching posts from backend...');

      // Create axios instance with authentication
      const apiClient = axios.create({
        baseURL: API_URL,
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });

      // Fetch all posts then filter for user's posts
      const response = await apiClient.get('/posts');

      if (response.data && response.data.success) {
        const posts = response.data.data || [];
        // Filter for user's posts only
        const userPosts = posts.filter((post: BackendPost) =>
          post.user && post.user._id === userData._id
        );
        setBackendPosts(userPosts);
        console.log(`Found ${userPosts.length} posts for user ${userData._id}`);
      } else {
        const message = response.data?.message || 'Failed to fetch posts';
        console.error('API returned error:', message);
        setError(message);
      }
    } catch (err: any) {
      console.error('Error fetching posts from backend:', err);

      // Handle different error types
      if (err.response) {
        console.error('Server response error:', {
          status: err.response.status,
          data: err.response.data,
        });
        setError(`Server error: ${err.response.status}. ${err.response.data?.message || 'Something went wrong.'}`);
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError('No response from server. Please check your network connection and server status.');
      } else {
        console.error('Request setup error:', err.message);
        setError(`Request error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || loading) {
      console.log('Already refreshing, skip duplicate refresh');
      return;
    }

    console.log('Manual refresh triggered');
    // Reset the initialDataLoaded flag when manually refreshing
    setInitialDataLoaded(false);
    await refreshPosts();
    loadUserPosts();
    fetchUserPostsFromBackend();
    await fetchCurrentUser();
    setInitialDataLoaded(true); // Set back to true after manual refresh completes
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const renderPostItem = ({ item }: { item: PostDisplay }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => navigation.navigate('PostDetails', { postId: item._id })}
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

  // Determine total posts count
  const totalPosts = displayPosts.length;

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
    // handleRefresh()
  }, [error]);

  return (
    <SafeAreaLayout>
      <FlatList
        data={displayPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={handleRefresh}
            colors={['#4B0082']}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
                <Ionicons name="settings-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileContainer}>
              <Image
                source={{ uri: user?.profilePicture || DEFAULT_AVATAR }}
                style={styles.profileImage}
              />

              <View style={styles.profileInfoContainer}>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{totalPosts}</Text>
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

                <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.username}>@{user?.username}</Text>
              <Text style={styles.bioText}>{user?.bio || 'No bio yet'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Posts</Text>

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4B0082" />
                  <Text style={styles.loadingText}>Loading posts...</Text>
                </View>
              )}

              {!loading && displayPosts.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="images-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No posts yet</Text>
                  <TouchableOpacity
                    style={styles.createPostButton}
                    onPress={() => navigation.navigate('CreatePost')}
                  >
                    <Text style={styles.createPostButtonText}>Create Your First Post</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        }
        contentContainerStyle={styles.postsGrid}
      />
    </SafeAreaLayout>
  );
}

const { width } = Dimensions.get('window');
const postSize = (width - 30) / 3; // Three columns with spacing

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  profileContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileInfoContainer: {
    flex: 1,
  },
  userInfoContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  editButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  settingsButton: {
    padding: 5,
  },
  postsGrid: {
    paddingHorizontal: 0,
  },
  postItem: {
    width: postSize,
    height: postSize,
    margin: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textPostContainer: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  textPostContent: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  createPostButton: {
    backgroundColor: '#4B0082',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createPostButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
