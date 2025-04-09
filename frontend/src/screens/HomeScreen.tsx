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
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import SafeAreaLayout from '../components/SafeAreaLayout';

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

  const renderStoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.storyContainer}>
      <View style={styles.storyRing}>
        <Image 
          source={{ uri: item.profilePicture }}
          style={styles.storyAvatar}
        />
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {item.username.length > 9 ? item.username.substring(0, 9) + '...' : item.username}
      </Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = item.likes.includes(user?._id || '');
    
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => handleUserPress(item.user._id)}
          >
            <Image 
              source={{ uri: item.user.profilePicture || DEFAULT_AVATAR }}
              style={styles.avatar}
            />
            <Text style={styles.userName}>{item.user.username}</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        
        {item.image && (
          <Image 
            source={{ uri: item.image }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.actionsContainer}>
          <View style={styles.leftActions}>
            <TouchableOpacity 
              onPress={() => handleLike(item._id)}
              style={styles.actionIcon}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={26} 
                color={isLiked ? "#FF3B30" : "#000"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handlePostPress(item._id)}
              style={styles.actionIcon}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#000" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionIcon}>
              <Ionicons name="paper-plane-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity>
            <Ionicons name="bookmark-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.postContent}>
          {item.likes.length > 0 && (
            <Text style={styles.likesText}>{item.likes.length} likes</Text>
          )}
          
          <View style={styles.captionContainer}>
            <Text style={styles.captionUsername}>{item.user.username}</Text>
            <Text style={styles.captionText}>{item.text}</Text>
          </View>
          
          {item.comments.length > 0 && (
            <TouchableOpacity onPress={() => handlePostPress(item._id)}>
              <Text style={styles.viewComments}>
                View {item.comments.length > 1 ? `all ${item.comments.length} comments` : '1 comment'}
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const mockStories = [
    { id: 1, username: 'Your Story', profilePicture: user?.profilePicture || DEFAULT_AVATAR, isCurrentUser: true },
    ...getMockPosts().map(post => ({ 
      id: post.user._id, 
      username: post.user.username, 
      profilePicture: post.user.profilePicture || DEFAULT_AVATAR
    }))
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#405DE6" />
      </View>
    );
  }

  return (
    <SafeAreaLayout>
      <View style={styles.header}>
        <Text style={styles.logoText}>Social App</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="add-circle-outline" size={26} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="paper-plane-outline" size={26} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#405DE6"
          />
        }
        ListHeaderComponent={
          <View style={styles.storiesContainer}>
            <FlatList
              data={mockStories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderStoryItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesList}
            />
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaLayout>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 20,
  },
  storiesContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
    paddingVertical: 10,
  },
  storiesList: {
    paddingLeft: 10,
  },
  storyContainer: {
    alignItems: 'center',
    marginRight: 15,
    width: 70,
  },
  storyRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#E1306C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyUsername: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  postContainer: {
    width: '100%',
    marginBottom: 10,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  userName: {
    fontWeight: '600',
    fontSize: 14,
  },
  postImage: {
    width: width,
    height: width,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
  },
  actionIcon: {
    marginRight: 16,
  },
  postContent: {
    paddingHorizontal: 12,
    paddingBottom: 15,
  },
  likesText: {
    fontWeight: '600',
    marginBottom: 6,
  },
  captionContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  captionUsername: {
    fontWeight: '600',
    marginRight: 5,
  },
  captionText: {
    flex: 1,
  },
  viewComments: {
    color: '#8E8E8E',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 2,
  },
}); 