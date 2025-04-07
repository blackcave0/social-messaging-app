import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import axios from 'axios';
import { RootStackScreenProps } from '../types/navigation';

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
  // postId from route.params might be unused here if showing all posts
  const { postId: initialPostId } = route.params; // Renamed for clarity
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<Post[]>([]); // State holds the array of posts
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Removed commentText and submitting state as there's no single comment input

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    try {
      console.log('Requesting all posts from:', `${API_URL}/api/posts`);
      // Assuming the endpoint returns { data: Post[] }
      const response = await axios.get<{ data: Post[] }>(`${API_URL}/api/posts`);
      console.log('Fetched all posts:', response.data.data.length);
      setPosts(response.data.data); // Set the array of posts
    } catch (error) {
      Alert.alert('Error', 'Failed to load posts');
      console.error('Fetch posts error:', error);
      // Handle specific error types if needed (e.g., network error, server error)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // No dependencies needed if fetching all posts

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

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
      console.log(`Simulating API call: ${isLiked ? 'Unlike' : 'Like'} post ${postId}`);
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

  // Navigate to the actual Post Details screen when a post item is pressed
  // (Assuming you have a screen dedicated to showing *one* post and its comments)
  const handlePostPress = (postId: string) => {
    // This navigation assumes you *also* have a screen (maybe the one from the previous refactor)
    // actually named 'PostDetails' that shows a single post.
    // If this *is* your main feed and you don't have a separate details screen, adjust accordingly.
    navigation.navigate('PostDetails', { postId });
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
    // console.log('Rendering post:', item._id, 'Image:', item.images?.[0]);
    return (
      // Wrap item in TouchableOpacity to navigate on press
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handlePostPress(item._id)}
        style={styles.postContainer}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={(e) => {
              e.stopPropagation(); // Prevent post press when clicking user info
              handleUserPress(item.user._id);
            }}
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
        <Text style={styles.postText} numberOfLines={4} ellipsizeMode="tail">
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
            onPress={(e) => {
              e.stopPropagation(); // Prevent post press when clicking like
              handleLike(item._id);
            }}
          >
            <Ionicons
              name={item.likes.includes(user?._id || '') ? "heart" : "heart-outline"}
              size={24}
              color={item.likes.includes(user?._id || '') ? "#FF3B30" : "#666"}
            />
            <Text style={styles.actionText}>{item.likes.length}</Text>
          </TouchableOpacity>

          {/* Comment Action - Navigates to details on press */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent post press when clicking comment icon
              handlePostPress(item._id); // Navigate to details to see/add comments
            }}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#666" />
            <Text style={styles.actionText}>{item.comments.length}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
        ItemSeparatorComponent={() => <View style={styles.separator} />} // Optional separator
        // ListHeaderComponent={<View><Text>Start of Feed</Text></View>} // Example header
        // ListFooterComponent={loading ? <ActivityIndicator/> : null} // Example footer loader for pagination
        refreshControl={ // Pull-to-refresh
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4B0082"]}
            tintColor={"#4B0082"}
          />
        }
        ListEmptyComponent={ // Show if fetch completes but posts array is empty
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  listContentContainer: {
    paddingBottom: 10, // Space at the very bottom of the list
    // backgroundColor: '#f0f0f0', // Match safe area if needed
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
  }
});

// Rename export if you rename the component
export default PostDetailsScreen; // Or export default PostDetailsScreen if you keep that name