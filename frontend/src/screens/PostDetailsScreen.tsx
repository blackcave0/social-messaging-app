import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  // TextInput, // Removed as comment input is not per-post here
  ActivityIndicator,
  Alert,
  // KeyboardAvoidingView, // Not needed without the bottom input
  Platform,
  SafeAreaView, // Use SafeAreaView
  RefreshControl,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import axios from 'axios';
import { RootStackScreenProps } from '../types/navigation';
import { useFocusEffect } from '@react-navigation/native';

type Props = RootStackScreenProps<'PostDetails'>; // Keep type, but screen content changed

// Interfaces remain the same
interface Comment {
  _id: string;
  text: string;
  user: {
    _id: string;
    username: string;
    name: string;
    profilePicture?: string;
  };
  createdAt: string;
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
  comments: Comment[];
  createdAt: string;
}

// This screen now functions more like a Feed or Post List
const PostDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  // Get parameters from route
  const { postId: initialPostId, userId, userName } = route.params; // Get userId if coming from a user profile
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<Post[]>([]); // State holds the array of posts
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Store the origin of navigation to determine where to go back
  const [fromProfileTab] = useState(() => {
    // Check if we are coming from the Profile tab
    // This is determined by examining the navigation state
    try {
      const navState = navigation.getState();
      // Check if we are in the Profile tab by examining the routes
      return navState.routes.some(route =>
        route.name === 'Profile' ||
        (route.state && route.state.routes.some(r => r.name === 'Profile'))
      );
    } catch (err) {
      console.error('Error checking navigation state:', err);
      return false;
    }
  });

  // Handle back button press to maintain navigation history
  const handleBackPress = useCallback(() => {
    // Check if we came from a user profile or somewhere else
    const fromUserProfile = !!userId;

    // Try to go back if we can
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // If we can't go back, we need to reset navigation to an appropriate screen
    try {
      if (fromUserProfile) {
        // Navigate back to the Profile tab stack with UserProfile screen
        (navigation as any).navigate('Profile', {
          screen: 'UserProfile',
          params: {
            userId: userId,
            userName: userName
          }
        });
      } else {
        // If we're viewing our own profile posts or all posts
        // Navigate to the Profile tab
        (navigation as any).navigate('Profile', {
          screen: 'MyProfile'
        });
      }
    } catch (err) {
      console.error('Navigation error:', err);
      // Last resort fallback - just go to our profile
      navigation.navigate('Profile');
    }
  }, [navigation, userId, userName]);

  // Setup navigation header and back button handling
  useLayoutEffect(() => {
    // Determine appropriate header title based on available information
    let headerTitle = 'All Posts';

    if (userId) {
      // Only add the @ symbol and username if userName is defined
      headerTitle = userName ? `@${userName}` : 'User Posts';
    }

    navigation.setOptions({
      headerShown: true,
      headerTitle,
      headerLeft: () => (
        <TouchableOpacity
          style={{ padding: 10 }}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, userId, userName, handleBackPress]);

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    try {
      // console.log('Requesting all posts from:', `${API_URL}/api/posts`);
      const response = await axios.get<{ data: Post[] }>(`${API_URL}/api/posts`);

      let filteredPosts = response.data.data;

      // Filter posts by user ID if it's provided (coming from a user profile)
      if (userId) {
        // console.log(`Filtering posts for user: ${userId}`);
        filteredPosts = filteredPosts.filter(post => post.user && post.user._id === userId);
        // console.log(`Found ${filteredPosts.length} posts for user ${userId}`);

        // Update header title if we have posts and can get a valid username
        if (filteredPosts.length > 0 && filteredPosts[0].user && filteredPosts[0].user.username) {
          navigation.setOptions({
            headerTitle: `@${filteredPosts[0].user.username}`
          });
        }
      } else {
        // console.log('Showing all posts:', filteredPosts.length);
      }

      setPosts(filteredPosts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load posts');
      console.error('Fetch posts error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, navigation]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  // Handle hardware back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackPress();
        return true; // Prevent default behavior
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [handleBackPress])
  );

  // Handle like action for a specific post in the list
  const handleLike = async (postId: string) => {
    if (!user?._id) return;

    const postIndex = posts.findIndex(p => p._id === postId);
    if (postIndex === -1) return;

    const originalPosts = [...posts]; // Store original state
    const post = originalPosts[postIndex];
    const isLiked = post.likes.includes(user._id);
    const updatedLikes = isLiked
      ? post.likes.filter(id => id !== user._id)
      : [...post.likes, user._id];

    // Optimistic update
    setPosts(prevPosts => {
      const newPosts = [...prevPosts];
      newPosts[postIndex] = { ...newPosts[postIndex], likes: updatedLikes };
      return newPosts;
    });

    try {
      // *** IMPORTANT: Add your actual API call here ***
      // console.log(`Simulating API call: ${isLiked ? 'Unlike' : 'Like'} post ${postId}`);
      // Example API call (uncomment and adapt)
      // await axios.post(`${API_URL}/api/posts/${postId}/like`);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay

    } catch (error) {
      console.error('Failed to update like:', error);
      Alert.alert('Error', 'Could not update like status.');
      // Revert UI on error
      setPosts(originalPosts);
    }
  };

  // Navigate to User Profile or own Profile
  const handleUserPress = (userId: string) => {
    if (userId === user?._id) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('UserProfile', { userId });
    }
  };

  // Handle post press - since we're already in post details, this just selects the post
  const handlePostPress = (postId: string) => {
    // Find the post and scroll to it or highlight it
    // console.log('Selected post:', postId);

    // If needed, you could re-fetch the specific post details
    // or update UI to show this post is selected
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Simple relative time or fallback to date string might be better for a feed
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Render a single post item within the FlatList
  const renderPostItem = ({ item }: { item: Post }) => {
    return (
      // Post container - no navigation when tapped as we're already in post details
      <View style={styles.postContainer}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => handleUserPress(item.user._id)}
          >
            <Image
              source={{ uri: item.user.profilePicture || DEFAULT_AVATAR }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.userName}>{item.user.name}</Text>
              <Text style={styles.userUsername}>@{item.user.username}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.postDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Post Content */}
        <Text style={styles.postText} ellipsizeMode="tail">
          {item.description}
        </Text>

        {item.images && item.images.length > 0 && item.images[0] && (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item._id)}
          >
            <Ionicons
              name={item.likes.includes(user?._id || '') ? "heart" : "heart-outline"}
              size={24}
              color={item.likes.includes(user?._id || '') ? "#FF3B30" : "#666"}
            />
            <Text style={styles.actionText}>{item.likes.length}</Text>
          </TouchableOpacity>

          {/* Comment Action */}
          <TouchableOpacity
            style={styles.actionButton}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#666" />
            <Text style={styles.actionText}>{item.comments.length}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Render Logic ---

  if (loading && posts.length === 0) { // Show full screen loader only on initial load
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContentContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4B0082"]}
            tintColor={"#4B0082"}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyListContainer}>
              <Ionicons name="newspaper-outline" size={50} color="#ccc" />
              <Text style={styles.emptyListText}>No posts found.</Text>
              <Text style={styles.emptyListSubText}>Pull down to refresh.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Background for the feed area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerRight: {
    width: 40, // Same size as backButton for balance
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  listContentContainer: {
    paddingBottom: 20, // More space at the bottom
  },
  postContainer: {
    backgroundColor: '#fff', // White background for each post card
    marginBottom: 8, // Space between post cards
    paddingVertical: 15, // Vertical padding inside the card
    // No horizontal padding here, applied to inner elements
    // Add elevation/shadow for card effect if desired
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align items vertically
    marginBottom: 12,
    paddingHorizontal: 15, // Horizontal padding for header content
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40, // Slightly smaller avatar for feed view
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#eee'
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 15, // Slightly smaller font
  },
  userUsername: {
    color: '#555', // Darker grey
    fontSize: 13,
  },
  postDate: {
    color: '#888', // Lighter grey
    fontSize: 12,
  },
  postText: {
    fontSize: 15, // Standard text size
    lineHeight: 22, // Good line spacing
    marginBottom: 10,
    color: '#333',
    paddingHorizontal: 15, // Horizontal padding for text
  },
  postImage: {
    width: '100%', // Full width image
    aspectRatio: 16 / 9, // Common aspect ratio, adjust as needed
    // height: 250, // Or fixed height
    marginBottom: 10,
    backgroundColor: '#e0e0e0', // Placeholder color while loading
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Align actions to the left
    paddingTop: 10,
    paddingHorizontal: 15, // Horizontal padding for actions row
    // borderTopWidth: 1, // Optional separator line above actions
    // borderTopColor: '#f1f1f1',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 25, // Space between action buttons
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#555', // Match username color maybe
  },
  separator: {
    height: 1, // Or can be 0 if margin provides enough separation
    // backgroundColor: '#e0e0e0', // If you want a visible line separator
  },
  emptyListContainer: {
    flex: 1, // Take up available space if list is empty
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50, // Push it down a bit
    padding: 20,
  },
  emptyListText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 15,
  },
  emptyListSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
});

// Rename export if you rename the component
export default PostDetailsScreen; // Or export default PostDetailsScreen if you keep that name