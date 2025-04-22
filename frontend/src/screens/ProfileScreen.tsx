import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback for renderPostItem optimization
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  // Dimensions, // No longer primary source for grid size
  ActivityIndicator,
  Alert,
  useWindowDimensions, // Import the hook
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { usePostsContext } from '../context/PostsContext';
import { SafeAreaLayout } from '../components';
import { DEFAULT_AVATAR } from '../utils/config';
import { getAllPosts } from '../api/posts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../utils/config'; // Import API_URL from config instead of defining it locally
import StoryCircle from '../components/StoryCircle';
// import { useUserContext } from '../context/UserContext';
interface ExtendedUser {
  _id: string;
  username: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  followers: string[];
  following: string[];
  token?: string;
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

interface BackendPost extends Post {
  isBackendPost?: boolean;
}

interface PostDisplay {
  _id: string;
  isBackendPost: boolean;
  content: string;
  imageUrl?: string;
  isVideo?: boolean;
}

interface FollowerUser {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
  isPrivate?: boolean;
  followRequestSent?: boolean;
  followRequestReceived?: boolean;
  isNowFollowed?: boolean; // Flag to track users we just followed but data isn't refreshed yet
}

type ProfileScreenProps = NativeStackScreenProps<ProfileStackParamList, 'MyProfile'>;

// --- Constants for Grid Layout ---
const NUM_COLUMNS = 3;
const ITEM_MARGIN = 2; // Instagram uses slightly larger gap between posts

export default function ProfileScreen({ navigation, route }: ProfileScreenProps) {
  const { user, fetchCurrentUser } = useAuthContext() as { user: ExtendedUser | null, fetchCurrentUser: () => Promise<void> };
  const { getUserPosts, refreshPosts, refreshing } = usePostsContext();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [backendPosts, setBackendPosts] = useState<BackendPost[]>([]);
  const [displayPosts, setDisplayPosts] = useState<PostDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  // Add a state to force refresh FlatList
  const [refreshKey, setRefreshKey] = useState(0);

  // Follow/Follower state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<FollowerUser[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  // Add state to track which user IDs are currently being followed
  const [followingInProgress, setFollowingInProgress] = useState<{ [key: string]: boolean }>({});

  // Add new state variables
  const [followRequests, setFollowRequests] = useState<FollowerUser[]>([]);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  // --- Responsive Calculation START ---
  // Get screen dimensions using the hook
  const { width: windowWidth } = useWindowDimensions(); // Get current window width

  // Calculate item size based on current window width
  // Total horizontal space taken by margins = (margin on left + margin on right) * number of columns
  const totalHorizontalMargin = ITEM_MARGIN * 3 * NUM_COLUMNS;
  // Width available for the items themselves
  const availableWidth = windowWidth - totalHorizontalMargin;
  // Calculate the size for each square grid item
  const itemSize = availableWidth / NUM_COLUMNS;
  // --- Responsive Calculation END ---

  // ... (Keep existing useEffect hooks for editComplete, useFocusEffect, loading posts, updating displayPosts) ...
  // Check if returning from edit profile
  useEffect(() => {
    if (route.params?.editComplete) {
      // console.log('Returning from edit profile, refreshing data...');
      setInitialDataLoaded(false); // Reset so useFocusEffect will refresh data

      // Clear the parameter so it doesn't trigger again
      navigation.setParams({ editComplete: undefined });
    }
  }, [route.params?.editComplete, navigation]); // Added navigation dependency

  // Only fetch user data on first screen focus or after profile edit
  useFocusEffect(
    React.useCallback(() => { // Keep React.useCallback for optimization
      let isMounted = true;

      const refreshUserData = async () => {
        if (!initialDataLoaded && isMounted && user) {
          // console.log('Initial user data load');
          try {
            await fetchCurrentUser();
            if (isMounted) setInitialDataLoaded(true); // Check mount status before setting state
          } catch (error) {
            if (isMounted) console.error('Error refreshing user data:', error);
          }
        }
      };

      // Fetch user data and then posts
      refreshUserData().then(() => {
        if (isMounted && user) {
          // console.log('useFocusEffect: Loading posts');
          loadUserPosts();
          fetchUserPostsFromBackend();
        }
      });


      return () => {
        isMounted = false;
      };
    }, [fetchCurrentUser, initialDataLoaded, user]) // Keep original dependencies unless specific changes needed elsewhere
  );

  // Keep useEffect for initial post load based on user
  useEffect(() => {
    if (user) {
      loadUserPosts();
      fetchUserPostsFromBackend();
    } else {
      // Clear posts if user becomes null
      setUserPosts([]);
      setBackendPosts([]);
    }
  }, [user]); // Depend on user object

  // Keep useEffect for updating displayPosts
  useEffect(() => {
    if (backendPosts.length > 0) {
      const posts = backendPosts.map(post => ({
        _id: post._id || `temp-${Date.now()}-${Math.random()}`, // Use more unique temp key
        isBackendPost: true,
        content: post.description || 'No description',
        // Basic image URL handling (adjust if needed based on your API)
        imageUrl: post.images && post.images.length > 0
          ? post.images[0].startsWith('http') ? post.images[0] : `${API_URL}/${post.images[0]}`
          : undefined
      }));
      setDisplayPosts(posts);
      // console.log('Processed backend posts:', posts.length);
    } else {
      const posts = userPosts.map(post => ({
        _id: post._id,
        isBackendPost: false,
        content: post.description,
        imageUrl: post.images && post.images.length > 0 ? post.images[0] : undefined
      }));
      setDisplayPosts(posts);
      // console.log(userPosts.length > 0 ? 'Using local posts:' : 'No posts to display', posts.length);
    }
  }, [backendPosts, userPosts]); // Keep original dependencies

  // Fetch followers and following details
  const fetchFollowersAndFollowing = async () => {
    if (!user?._id || !user?.token) {
      // console.log('No user data, skip fetching followers');
      return;
    }

    // console.log('Fetching followers/following for user ID:', user._id, 'with token length:', user.token.length);

    try {
      setLoadingFollowers(true);

      // Fetch current user with populated followers and following
      const response = await axios.get(`${API_URL}/api/users/${user._id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (response.data) {
        // console.log('User data response received');

        // Check if followers and following are arrays
        let followersArray: FollowerUser[] = [];
        let followingArray: FollowerUser[] = [];

        // Handle different possible data structures
        if (Array.isArray(response.data.followers)) {
          followersArray = response.data.followers;
        } else if (response.data.followers) {
          // console.log('Unexpected followers structure:', typeof response.data.followers);
        }

        if (Array.isArray(response.data.following)) {
          followingArray = response.data.following;
        } else if (response.data.following) {
          // console.log('Unexpected following structure:', typeof response.data.following);
        }

        // Additional validation - make sure each item has _id
        followersArray = followersArray.filter(item => item && typeof item === 'object' && item._id);
        followingArray = followingArray.filter(item => item && typeof item === 'object' && item._id);

        // console.log('After validation - Followers count:', followersArray.length);
        // console.log('After validation - Following count:', followingArray.length);

        // Set the state with validated arrays
        setFollowers(followersArray);
        setFollowing(followingArray);

        // console.log(`Loaded ${followersArray.length} followers and ${followingArray.length} following`);
      }
    } catch (err: any) {
      console.error('Error fetching followers/following:', err);

      // Try fetching from the new endpoints
      try {
        // Fetch followers
        const followersResponse = await axios.get(`${API_URL}/api/users/${user._id}/followers`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (followersResponse.data.success) {
          const validFollowers = followersResponse.data.followers.filter(
            (item: any) => item && typeof item === 'object' && item._id
          );
          setFollowers(validFollowers);
          // console.log(`Loaded ${validFollowers.length} followers from followers endpoint`);
        }
      } catch (followersErr: any) {
        console.error('Error fetching followers from dedicated endpoint:', followersErr);
        // Silently handle 404s
        if (followersErr.response && followersErr.response.status !== 404) {
          console.error('Non-404 error fetching followers:', followersErr.response.status);
        }
        // Clear followers array on any error
        setFollowers([]);
      }

      try {
        // Fetch following
        const followingResponse = await axios.get(`${API_URL}/api/users/${user._id}/following`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (followingResponse.data.success) {
          const validFollowing = followingResponse.data.following.filter(
            (item: any) => item && typeof item === 'object' && item._id
          );
          setFollowing(validFollowing);
          // console.log(`Loaded ${validFollowing.length} following from following endpoint`);
        }
      } catch (followingErr: any) {
        console.error('Error fetching following from dedicated endpoint:', followingErr);
        // Silently handle 404s
        if (followingErr.response && followingErr.response.status !== 404) {
          console.error('Non-404 error fetching following:', followingErr.response.status);
        }
        // Clear following array on any error
        setFollowing([]);
      }
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Add this to the refresh function
  const handleRefresh = async () => {
    if (refreshing || loading) {
      // console.log('Already refreshing, skip duplicate refresh');
      return;
    }

    // console.log('Manual refresh triggered');
    setInitialDataLoaded(false); // Allow user data refresh
    setError(null); // Clear errors on refresh

    // Keep original refresh logic sequence
    await fetchCurrentUser(); // Refresh user data first
    fetchUserPostsFromBackend(); // Then fetch posts
    loadUserPosts(); // Reload local posts
    fetchFollowersAndFollowing(); // Fetch followers and following

    setInitialDataLoaded(true);
  };

  // Open followers modal
  const handleShowFollowers = async () => {
    // First load the data
    await fetchFollowersAndFollowing();
    // Then show the modal
    // console.log('Setting followers modal to true after data fetch');
    setShowFollowersModal(true);
  };

  // Open following modal
  const handleShowFollowing = async () => {
    // First load the data
    await fetchFollowersAndFollowing();
    // Then show the modal
    // console.log('Setting following modal to true after data fetch');
    setShowFollowingModal(true);
  };

  // Navigate to user profile when clicking on a follower/following
  const handleViewUserProfile = (userId: string) => {
    // Close any open modal
    setShowFollowersModal(false);
    setShowFollowingModal(false);

    // Navigate to the user profile
    navigation.navigate('UserProfile', { userId });
  };

  // Add new functions for follow functionality
  const handleFollow = async (userId: string) => {
    if (!user?.token) {
      Alert.alert('Error', 'You need to be logged in to follow users');
      return;
    }

    if (!userId) {
      console.error('Invalid userId received in handleFollow:', userId);
      Alert.alert('Error', 'Unable to follow this user. Invalid user data.');
      return;
    }

    // console.log('Attempting to follow user:', userId);

    // Set this specific user's follow action as in progress
    setFollowingInProgress(prev => ({ ...prev, [userId]: true }));

    try {
      setLoading(true); // Set loading state while request is in progress

      const response = await axios.post(
        `${API_URL}/api/users/${userId}/follow`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.success) {
        // console.log('Follow success response:', response.data);

        // Safely update following list with full validation
        if (response.data.user && response.data.user._id) {
          const newFollowing = response.data.user;

          // Immediately update the UI by adding the user to the following list
          // This will cause the renderUserItem to show the Message button on the next render
          setFollowing(prevFollowing => {
            // Make sure we don't add duplicates
            if (!prevFollowing.some(f => f && f._id === newFollowing._id)) {
              return [...prevFollowing, newFollowing];
            }
            return prevFollowing;
          });

          // Update the current follower in-place if they're in the followers list
          // Create a new array to ensure React detects the change
          const updatedFollowers = [...followers];
          const followerIndex = updatedFollowers.findIndex(f => f._id === userId);

          if (followerIndex !== -1) {
            // Create a new object to ensure React detects the change
            updatedFollowers[followerIndex] = {
              ...updatedFollowers[followerIndex],
              isNowFollowed: true
            };
            setFollowers(updatedFollowers);

            // Force re-render of the list after state update
            setTimeout(() => {
              // Create another copy with same data to force refresh
              setFollowers([...updatedFollowers]);
              // Increment refresh key to force FlatList to re-render
              setRefreshKey(prev => prev + 1);
            }, 50);
          }

          // Also refresh followers data in the background
          fetchFollowersAndFollowing().catch(err => {
            console.error('Error refreshing follower data after follow:', err);
          });

          // Refresh user data in the background
          fetchCurrentUser().catch(err => {
            console.error('Error refreshing user data after follow:', err);
          });

          // No alert - UI has been updated immediately
          // console.log('Successfully followed user, UI updated');
        } else {
          console.warn('Invalid user object in follow response:', response.data);
        }
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      const errorMessage = error.response?.data?.message || 'Failed to follow user';
      Alert.alert('Error', errorMessage);
    } finally {
      // Clear the loading state for this specific user
      setFollowingInProgress(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user?.token) {
      Alert.alert('Error', 'You need to be logged in to unfollow users');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/unfollow`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.success) {
        // Remove from following list 
        setFollowing(following.filter(f => f._id !== userId));
        // Refresh user data
        fetchCurrentUser();
        Alert.alert('Success', 'User unfollowed successfully');
      }
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to unfollow user';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleAcceptFollowRequest = async (userId: string) => {
    if (!user?.token) {
      Alert.alert('Error', 'You need to be logged in to accept follow requests');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/accept-follow-request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.success) {
        // Remove from follow requests
        setFollowRequests(followRequests.filter(f => f._id !== userId));
        // Add to followers
        setFollowers([...followers, response.data.user]);
        Alert.alert('Success', 'Follow request accepted');
      }
    } catch (error: any) {
      console.error('Error accepting follow request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to accept follow request';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRejectFollowRequest = async (userId: string) => {
    if (!user?.token) {
      Alert.alert('Error', 'You need to be logged in to reject follow requests');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/reject-follow-request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.success) {
        // Remove from follow requests
        setFollowRequests(followRequests.filter(f => f._id !== userId));
        Alert.alert('Success', 'Follow request rejected');
      }
    } catch (error: any) {
      console.error('Error rejecting follow request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reject follow request';
      Alert.alert('Error', errorMessage);
    }
  };

  // Render a follower/following item
  const renderUserItem = ({ item, handleAction }: { item: FollowerUser, handleAction?: (userId: string) => void }) => {
    // Safe guard against invalid items
    if (!item || typeof item !== 'object') {
      console.error('Invalid item passed to renderUserItem:', item);
      return (
        <View style={styles.userItemContainer}>
          <Text style={styles.errorText}>Invalid user data</Text>
        </View>
      );
    }

    // Make sure we have an ID
    if (!item._id) {
      console.error('Item without _id passed to renderUserItem:', item);
      return (
        <View style={styles.userItemContainer}>
          <Text style={styles.errorText}>Missing user ID</Text>
        </View>
      );
    }

    // Safe check for following - check both regular following status and the temporary isNowFollowed flag
    const isUserFollowed =
      (Array.isArray(following) && following.some(followingUser => followingUser &&
        typeof followingUser === 'object' && followingUser._id === item._id)) ||
      // Also consider users we just followed but data hasn't been refreshed yet  
      item.isNowFollowed === true;

    const isFollowerNotFollowed = !isUserFollowed && showFollowersModal;
    const isFollowerAndFollowing = isUserFollowed && showFollowersModal;

    const handleMessage = (userId: string) => {
      if (!userId) {
        console.error('Invalid userId passed to handleMessage:', userId);
        return;
      }

      // Close current modal
      setShowFollowersModal(false);
      setShowFollowingModal(false);

      // Navigate to ChatDetail directly instead of UserProfile
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        rootNavigation.navigate('ChatDetail', { userId, name: item.name });
      } else {
        // Fallback to direct navigation if parent navigator is not available
        navigation.navigate('UserProfile', { userId });
      }
    };

    const renderActionButton = () => {
      try {
        if (item.followRequestReceived) {
          return (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptFollowRequest(item._id)}
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectFollowRequest(item._id)}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          );
        } else if (item.followRequestSent) {
          return (
            <TouchableOpacity
              style={[styles.actionButton, styles.requestedButton]}
              onPress={() => handleUnfollow(item._id)}
            >
              <Text style={styles.requestedButtonText}>Requested</Text>
            </TouchableOpacity>
          );
        } else if (handleAction) {
          return (
            <TouchableOpacity
              style={[styles.actionButton, styles.unfollowButton]}
              onPress={() => handleAction(item._id)}
            >
              <Text style={styles.unfollowButtonText}>Unfollow</Text>
            </TouchableOpacity>
          );
        } else if (isFollowerAndFollowing) {
          return (
            <TouchableOpacity
              style={[styles.actionButton, styles.messageBubbleButton]}
              onPress={() => handleMessage(item._id)}
            >
              <Text style={styles.messageBubbleButtonText}>Message</Text>
            </TouchableOpacity>
          );
        } else if (isFollowerNotFollowed) {
          const isLoading = followingInProgress[item._id] === true;

          return (
            <TouchableOpacity
              style={[styles.actionButton, styles.followBackButton]}
              onPress={() => handleFollow(item._id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Follow Back</Text>
              )}
            </TouchableOpacity>
          );
        } else {
          return (
            <TouchableOpacity
              style={[styles.actionButton, styles.followButton]}
              onPress={() => handleFollow(item._id)}
            >
              <Text style={styles.actionButtonText}>Follow</Text>
            </TouchableOpacity>
          );
        }
      } catch (error) {
        console.error('Error in renderActionButton:', error);
        return (
          <TouchableOpacity style={[styles.actionButton, styles.errorButton]}>
            <Text style={styles.actionButtonText}>Error</Text>
          </TouchableOpacity>
        );
      }
    };

    // Final rendering with extra safety
    try {
      return (
        <View style={styles.userItemContainer}>
          <TouchableOpacity
            style={styles.userItemMain}
            onPress={() => handleViewUserProfile(item._id)}
          >
            <Image
              source={{ uri: item.profilePicture || DEFAULT_AVATAR }}
              style={styles.userItemAvatar}
              defaultSource={{ uri: DEFAULT_AVATAR }}
            />
            <View style={styles.userItemInfo}>
              <Text style={styles.userItemName}>{item.name || 'Unknown User'}</Text>
              <Text style={styles.userItemUsername}>@{item.username || 'unknown'}</Text>
            </View>
          </TouchableOpacity>
          {renderActionButton()}
        </View>
      );
    } catch (error) {
      console.error('Error rendering user item:', error);
      return (
        <View style={styles.userItemContainer}>
          <Text style={styles.errorText}>Error displaying user</Text>
        </View>
      );
    }
  };

  // Load followers and following on first load
  useEffect(() => {
    if (user && initialDataLoaded) {
      fetchFollowersAndFollowing();
    }
  }, [user, initialDataLoaded]);

  // Add effect to log when modal visibility changes and validate data
  useEffect(() => {
    // console.log('Followers modal visibility changed to:', showFollowersModal);
    if (showFollowersModal) {
      // Validate followers data when modal opens
      if (!Array.isArray(followers)) {
        console.error('Followers is not an array:', followers);
        setFollowers([]);
      } else {
        // Filter out any invalid items before displaying
        const validFollowers = followers.filter(f => f && typeof f === 'object' && f._id);
        if (validFollowers.length !== followers.length) {
          console.warn(`Fixed ${followers.length - validFollowers.length} invalid follower items`);
          setFollowers(validFollowers);
        }
        // console.log('Followers count when modal opened:', validFollowers.length);
      }
    }
  }, [showFollowersModal, followers]);

  useEffect(() => {
    // console.log('Following modal visibility changed to:', showFollowingModal);
    if (showFollowingModal) {
      // Validate following data when modal opens
      if (!Array.isArray(following)) {
        console.error('Following is not an array:', following);
        setFollowing([]);
      } else {
        // Filter out any invalid items before displaying
        const validFollowing = following.filter(f => f && typeof f === 'object' && f._id);
        if (validFollowing.length !== following.length) {
          console.warn(`Fixed ${following.length - validFollowing.length} invalid following items`);
          setFollowing(validFollowing);
        }
        // console.log('Following count when modal opened:', validFollowing.length);
      }
    }
  }, [showFollowingModal, following]);

  // --- Keep original functions (loadUserPosts, fetchUserPostsFromBackend, handleRefresh, handleEditProfile, handleSettings) ---
  const loadUserPosts = () => {
    if (user?._id) { // Check user._id
      // console.log('Loading user posts from local storage');
      const posts = getUserPosts(user._id);
      setUserPosts(posts);
    }
  };

  const fetchUserPostsFromBackend = async () => {
    if (!user || !user._id) {
      // console.log('No user found, skipping post fetch');
      return;
    }

    if (loading) {
      // console.log('Already loading posts, skipping duplicate fetch');
      return;
    }

    // Simplified token fetch for this example, keep your original complex logic if needed
    let token = user.token;
    if (!token) {
      const userString = await AsyncStorage.getItem('user');
      if (userString) token = JSON.parse(userString)?.token;
    }

    if (!token) {
      // console.log('No token found in user data');
      // setError might be better here if needed
      return;
    }


    try {
      setLoading(true);
      setError(null);

      // console.log('Fetching posts from backend...');

      const apiClient = axios.create({
        baseURL: `${API_URL}/api`,
        headers: {
          'Authorization': `Bearer ${token}`, // Use fetched token
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      const response = await apiClient.get('/posts');

      if (response.data && response.data.success) {
        const posts = response.data.data || [];
        const userPosts = posts.filter((post: BackendPost) =>
          post.user && post.user._id === user._id // Use user._id for filtering
        );
        // Sort posts by creation date, newest first
        userPosts.sort((a: BackendPost, b: BackendPost) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBackendPosts(userPosts);
        // console.log(`Found ${userPosts.length} posts for user ${user._id}`);
      } else {
        const message = response.data?.message || 'Failed to fetch posts';
        console.error('API returned error:', message);
        setError(message);
        setBackendPosts([]); // Clear on error
      }
    } catch (err: any) {
      console.error('Error fetching posts from backend:', err);
      setBackendPosts([]); // Clear on error

      if (err.response) {
        setError(`Server error: ${err.response.status}. ${err.response.data?.message || 'Something went wrong.'}`);
      } else if (err.request) {
        setError('No response from server. Check connection.');
      } else {
        setError(`Request error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleMessages = () => {
    // Use the root navigation instead of the stack navigation for proper navigation to ChatList
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('ChatList');
    } else {
      // console.error('Could not access root navigation');
    }
  };
  // --- End of original functions ---


  // --- Updated renderPostItem ---
  const renderPostItem = useCallback(({ item }: { item: PostDisplay }) => (
    <TouchableOpacity
      style={[
        styles.postItemBase,
        {
          width: itemSize,
          height: itemSize,
          margin: ITEM_MARGIN,
        }
      ]}
      onPress={() => {
        try {
          navigation.push('PostDetails', {
            postId: item._id,
            userId: user?._id
          });
        } catch (err) {
          console.error('Navigation error:', err);
          navigation.navigate('PostDetails', {
            postId: item._id,
            userId: user?._id
          });
        }
      }}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.postImage}
          onError={(e) => {/* console.log(`Failed to load image ${item.imageUrl}:`, e.nativeEvent.error) */ }}
        />
      ) : (
        <View style={styles.textPostContainer}>
          <Text style={styles.textPostContent} numberOfLines={5}>
            {item.content}
          </Text>
        </View>
      )}
      {/* Add video icon overlay if it's a video post - based on Instagram UI */}
      {item.isVideo && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={20} color="white" />
        </View>
      )}
    </TouchableOpacity>
  ), [itemSize, navigation, user?._id]);


  // Determine total posts count
  const totalPosts = displayPosts.length;

  // Create stories data for the profile highlights
  const storyHighlights = [
    { id: 'new', title: 'New' },
    { id: 'shaap', title: 'sнaαρ & s↑єєк...' },
    { id: 'maababa', title: 'maaBaba 🙏' },
    { id: 'crown', title: '👑' },
    { id: 'deeksha', title: 'de...' },
  ];

  // Render a story highlight item
  const renderStoryItem = ({ item }: { item: { id: string, title: string } }) => (
    <View style={styles.storyItem}>
      {item.id === 'new' ? (
        <TouchableOpacity style={styles.newStoryButton}>
          <Ionicons name="add" size={30} color="black" />
        </TouchableOpacity>
      ) : (
        <View style={styles.storyCircle}>
          <Image
            source={{ uri: user?.profilePicture || DEFAULT_AVATAR }}
            style={styles.storyImage}
          />
        </View>
      )}
      <Text style={styles.storyTitle} numberOfLines={1}>{item.title}</Text>
    </View>
  );

  // Keep error handling useEffect (or remove if not desired)
  useEffect(() => {
    if (error) {
      // Alert.alert('Error', error); // Or use a different way to show error
      console.error("Displaying Error:", error);
      // Optionally clear the error after some time
      // const timer = setTimeout(() => setError(null), 5000);
      // return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <SafeAreaLayout style={styles.container}>
      <StatusBar backgroundColor="black" barStyle="light-content" />

      {/* Instagram-style header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.lockIconContainer}>
            <Feather name="lock" size={14} color="white" style={styles.lockIcon} />
          </TouchableOpacity>
          <Text style={styles.username}>{user?.username}</Text>
          <TouchableOpacity>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('CreatePost')}>
            <Feather name="plus-square" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleSettings}>
            <Feather name="menu" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        numColumns={NUM_COLUMNS}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={handleRefresh}
            colors={['#ffffff']}
            tintColor={'#ffffff'}
            progressBackgroundColor="#121212"
          />
        }
        ListHeaderComponent={
          <>
            {/* Profile Information Section */}
            <View style={styles.profileSection}>
              {/* Profile Image and Stats Row */}
              <View style={styles.profileTopRow}>
                <View style={styles.profileImageContainer}>
                  <StoryCircle
                    userId={user?._id || ''}
                    profileImage={user?.profilePicture || DEFAULT_AVATAR}
                    size="large"
                    showAddButton={true}
                    onAddPress={() => navigation.navigate('CreateStory')}
                  />
                </View>

                <View style={styles.statsContainer}>
                  <TouchableOpacity style={styles.statItem}>
                    <Text style={styles.statValue}>{totalPosts}</Text>
                    <Text style={styles.statLabel}>posts</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={handleShowFollowers}
                  >
                    <Text style={styles.statValue}>{followers.length}</Text>
                    <Text style={styles.statLabel}>followers</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={handleShowFollowing}
                  >
                    <Text style={styles.statValue}>{following.length}</Text>
                    <Text style={styles.statLabel}>following</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Info */}
              <View style={styles.userInfoContainer}>
                <Text style={styles.displayName}>{user?.name || "_•⁠ ⁠⁠Daksh Srivastava•⁠_"}</Text>
                <Text style={styles.bioText}>{user?.bio || "No bio yet"}</Text>
                {/* <Text style={styles.bioText}>#ResilientSpirit</Text> */}
                {/* <TouchableOpacity>
                  <Text style={styles.websiteLink}>imdaksh.vercel.app</Text>
                </TouchableOpacity> */}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={handleEditProfile}
                >
                  <Text style={styles.editProfileText}>Edit profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareProfileButton}
                  onPress={() => {/* Handle share profile */ }}
                >
                  <Text style={styles.shareProfileText}>Share profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.addFriendButton}>
                  <Ionicons name="person-add-outline" size={18} color="#000000" />
                  {/* <FontAwesome name="user-md" size={20} color="#000000" /> */}
                </TouchableOpacity>
              </View>

              {/* Story Highlights */}
              <FlatList
                data={storyHighlights}
                renderItem={renderStoryItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storyHighlightsContainer}
              />

              {/* Content Tabs */}
              <View style={styles.contentTabsContainer}>
                <TouchableOpacity style={styles.tabActive}>
                  <Ionicons name="grid-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab}>
                  <Ionicons name="play-outline" size={24} color="gray" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab}>
                  <Ionicons name="person-outline" size={24} color="gray" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading States */}
            {loading && displayPosts.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="white" />
              </View>
            )}

            {!loading && displayPosts.length === 0 && !error && (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color="#555" />
                <Text style={styles.emptyStateText}>No posts yet</Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.postsGridContainer}
      />

      {/* Bottom Tab Bar - Just for visual completeness */}


      {/* Followers Modal */}
      <Modal
        visible={showFollowersModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={false}
        onRequestClose={() => {
          setShowFollowersModal(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <SafeAreaLayout style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  setShowFollowersModal(false);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Followers</Text>
              <View style={styles.modalPlaceholder} />
            </View>

            {loadingFollowers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4B0082" />
                <Text style={styles.loadingText}>Loading followers...</Text>
              </View>
            ) : followers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No followers yet</Text>
              </View>
            ) : (
              <FlatList
                data={followers.filter(item => item && item._id)}
                renderItem={({ item }) => {
                  if (!item || !item._id) {
                    // console.log('Skipping invalid follower item');
                    return null;
                  }
                  // console.log('Rendering follower item:', item._id);
                  // Add isFollowed flag to force UI update
                  const isFollowed = following.some(f => f._id === item._id) || item.isNowFollowed === true;
                  return renderUserItem({
                    item,
                  });
                }}
                keyExtractor={(item) => {
                  if (!item || !item._id) {
                    return `invalid-${Math.random()}`;
                  }
                  // Include follow status in key to force re-render when status changes
                  const isFollowed = following.some(f => f._id === item._id) || item.isNowFollowed === true;
                  return `${item._id}-${isFollowed ? 'followed' : 'notfollowed'}`;
                }}
                contentContainerStyle={styles.userListContainer}
                // Add extraData prop to force FlatList to re-render when following state changes
                extraData={[following, followingInProgress, followers, refreshKey]}
                key={`followers-list-${refreshKey}`}
              />
            )}
          </SafeAreaLayout>
        </View>
      </Modal>

      {/* Following Modal */}
      <Modal
        visible={showFollowingModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={false}
        onRequestClose={() => {
          setShowFollowingModal(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <SafeAreaLayout style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  setShowFollowingModal(false);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Following</Text>
              <View style={styles.modalPlaceholder} />
            </View>

            {loadingFollowers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4B0082" />
                <Text style={styles.loadingText}>Loading following...</Text>
              </View>
            ) : following.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>Not following anyone yet</Text>
              </View>
            ) : (
              <FlatList
                data={following.filter(item => item && item._id)}
                renderItem={({ item }) => {
                  if (!item || !item._id) {
                    // console.log('Skipping invalid following item');
                    return null;
                  }
                  // console.log('Rendering following item:', item._id);
                  return renderUserItem({
                    item,
                    handleAction: handleUnfollow,
                  });
                }}
                keyExtractor={(item) => {
                  if (!item || !item._id) {
                    return `invalid-${Math.random()}`;
                  }
                  // console.log('Key for following item:', item._id);
                  return `following-${item._id}`;
                }}
                contentContainerStyle={styles.userListContainer}
                // Add extraData prop to force re-render when following changes
                extraData={[following, refreshKey]}
                key={`following-list-${refreshKey}`}
              />
            )}
          </SafeAreaLayout>
        </View>
      </Modal>
    </SafeAreaLayout>
  );
}

// --- Stylesheet Adjustments ---
// Removed the old static postSize calculation
// const { width } = Dimensions.get('window'); // No longer needed here
// const postSize = (width - 30) / 3; // Old static calculation REMOVED

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomColor: '#E0E0E0', // Light gray border
    borderBottomWidth: 0.5,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    marginLeft: 20,
  },
  lockIconContainer: {
    marginRight: 5,
  },
  lockIcon: {
    marginTop: 2,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 5,
  },
  profileSection: {
    paddingBottom: 10,
  },
  profileTopRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },
  profileImageContainer: {
    // position: 'relative',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 0,
    // backgroundColor: '#F5F5F5', // Light gray fallback
  },
  storyAddButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    // marginLeft : 10,x`
    // backgroundColor: '#000000',
    padding: 2,
    // borderColor: "#393E46",
    // borderWidth : 2,
    borderRadius: 100
  },
  storyAddButtonIcon: {
    color: "#F85959",
    backgroundColor: '#20262E',
    borderRadius: 100,
    // padding : 5
  },
  profileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderColor: "#FF204E",

    borderWidth: 2,
    backgroundColor: '#F5F5F5', // Light gray fallback
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666', // Medium gray for secondary text
  },
  userInfoContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  displayName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  websiteLink: {
    fontSize: 14,
    color: '#0095F6', // Instagram blue
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  editProfileButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 5,
    alignItems: 'center',
  },
  editProfileText: {
    color: '#000000',
    fontWeight: '600',
  },
  shareProfileButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: 'center',
  },
  shareProfileText: {
    color: '#000000',
    fontWeight: '600',
  },
  addFriendButton: {
    backgroundColor: '#F5F5F5',
    width: 40,
    height: 33,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  storyHighlightsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 75,
  },
  storyCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newStoryButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  storyTitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
  contentTabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabActive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  postsGridContainer: {
    paddingHorizontal: ITEM_MARGIN,
    paddingBottom: 70, // Extra space for the bottom tab bar
  },
  postItemBase: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
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
    backgroundColor: '#FFFFFF',
  },
  textPostContent: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyStateText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE', // Light red background
    padding: 10,
    margin: 15,
    borderRadius: 5,
  },
  errorText: {
    color: '#D32F2F', // Material Design red
    textAlign: 'center',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  // Keep the existing modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  modalBackButton: {
    padding: 8,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalPlaceholder: {
    width: 40,
  },
  userListContainer: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  userItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  userItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userItemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userItemInfo: {
    flex: 1,
  },
  userItemName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#000000',
    marginBottom: 2,
  },
  userItemUsername: {
    color: '#666666',
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: '#0095F6', // Instagram blue
  },
  unfollowButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  requestedButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  acceptButton: {
    backgroundColor: '#0095F6',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  followBackButton: {
    backgroundColor: '#0095F6',
  },
  messageBubbleButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  errorButton: {
    backgroundColor: '#FF3B30',
  },
  // Add new styles for unfollow and requested button text
  unfollowButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
  requestedButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
  messageBubbleButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
});