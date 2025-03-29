import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';

interface Post {
  _id: string;
  text: string;
  image?: string;
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

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Generate mock posts for testing
  const getMockPosts = (): Post[] => {
    return [
      {
        _id: '1',
        text: 'Just launched the new social messaging app! 🚀 What do you think?',
        image: 'https://picsum.photos/id/1/500/300',
        user: {
          _id: '101',
          username: 'sarah_dev',
          name: 'Sarah Johnson',
          profilePicture: 'https://randomuser.me/api/portraits/women/22.jpg'
        },
        likes: ['102', '103'],
        comments: ['comment1', 'comment2', 'comment3'],
        createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        _id: '2',
        text: 'Working on some new design concepts for our mobile app. Feedback welcome!',
        image: 'https://picsum.photos/id/26/500/300',
        user: {
          _id: '102',
          username: 'mike_design',
          name: 'Mike Wilson',
          profilePicture: 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        likes: ['101', '103'],
        comments: ['comment4', 'comment5'],
        createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      },
      {
        _id: '3',
        text: 'Beautiful day for hiking! 🏞️ #nature #outdoors',
        image: 'https://picsum.photos/id/15/500/300',
        user: {
          _id: '103',
          username: 'alex_nature',
          name: 'Alex Green',
          profilePicture: 'https://randomuser.me/api/portraits/women/44.jpg'
        },
        likes: [],
        comments: [],
        createdAt: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
      },
      {
        _id: '4',
        text: 'Just finished reading an amazing book on AI and the future of technology. Highly recommend!',
        user: {
          _id: '104',
          username: 'bookworm',
          name: 'Jamie Reed',
          profilePicture: 'https://randomuser.me/api/portraits/men/67.jpg'
        },
        likes: ['101'],
        comments: ['comment6'],
        createdAt: new Date(Date.now() - 14400000).toISOString() // 4 hours ago
      },
      {
        _id: '5',
        text: 'New coffee shop downtown is amazing! ☕',
        image: 'https://picsum.photos/id/42/500/300',
        user: {
          _id: '105',
          username: 'coffee_lover',
          name: 'Taylor Swift',
          profilePicture: 'https://randomuser.me/api/portraits/women/73.jpg'
        },
        likes: ['102', '103', '104'],
        comments: ['comment7', 'comment8'],
        createdAt: new Date(Date.now() - 18000000).toISOString() // 5 hours ago
      }
    ];
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // In a real app, we would use the API
      // const response = await axios.get(`${API_URL}/api/posts`);
      // setPosts(response.data);
      
      // For testing, use mock data with a simulated delay
      setTimeout(() => {
        setPosts(getMockPosts());
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please try again later.');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleCreatePost = () => {
    navigation.navigate('CreatePost');
  };

  const handleLike = async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            const isLiked = post.likes.includes(user?._id || '');
            return {
              ...post,
              likes: isLiked 
                ? post.likes.filter(id => id !== user?._id)
                : [...post.likes, user?._id || '']
            };
          }
          return post;
        })
      );

      await axios.post(`${API_URL}/api/posts/${postId}/like`);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert optimistic update
      fetchPosts();
    }
  };

  const handlePostPress = (postId: string) => {
    navigation.navigate('PostDetails', { postId });
  };

  const handleUserPress = (userId: string) => {
    if (userId === user?._id) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('UserProfile', { userId });
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = item.likes.includes(user?._id || '');
    const timestamp = new Date(item.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity 
        style={styles.postContainer}
        onPress={() => handlePostPress(item._id)}
        activeOpacity={0.9}
      >
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
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
        
        <Text style={styles.postText}>{item.text}</Text>
        
        {item.image && (
          <Image 
            source={{ uri: item.image }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item._id)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={22} 
              color={isLiked ? "#FF3B30" : "#666666"}
            />
            <Text style={styles.actionText}>{item.likes.length}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handlePostPress(item._id)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666666" />
            <Text style={styles.actionText}>{item.comments.length}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.feedContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#4B0082"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color="#cccccc" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share something!</Text>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleCreatePost}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedContainer: {
    paddingBottom: 80,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  userUsername: {
    color: '#666',
    fontSize: 13,
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 25,
  },
  actionText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4B0082',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
}); 