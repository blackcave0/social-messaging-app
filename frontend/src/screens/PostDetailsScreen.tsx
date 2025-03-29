import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import axios from 'axios';

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
  text: string;
  image?: string;
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

interface PostDetailsScreenProps {
  route: {
    params: {
      postId: string;
    }
  };
  navigation: any;
}

const getMockPostDetails = (postId: string): Post => {
  const mockPosts = {
    '1': {
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
      comments: [
        {
          _id: 'comment1',
          text: 'This looks amazing! Can\'t wait to try it out.',
          user: {
            _id: '102',
            username: 'mike_design',
            name: 'Mike Wilson',
            profilePicture: 'https://randomuser.me/api/portraits/men/32.jpg'
          },
          createdAt: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
        },
        {
          _id: 'comment2',
          text: 'Is it available on iOS?',
          user: {
            _id: '103',
            username: 'alex_nature',
            name: 'Alex Green',
            profilePicture: 'https://randomuser.me/api/portraits/women/44.jpg'
          },
          createdAt: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
        },
        {
          _id: 'comment3',
          text: 'Great job on the UI!',
          user: {
            _id: '104',
            username: 'bookworm',
            name: 'Jamie Reed',
            profilePicture: 'https://randomuser.me/api/portraits/men/67.jpg'
          },
          createdAt: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
        }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    '2': {
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
      comments: [
        {
          _id: 'comment4',
          text: 'Love the color scheme!',
          user: {
            _id: '101',
            username: 'sarah_dev',
            name: 'Sarah Johnson',
            profilePicture: 'https://randomuser.me/api/portraits/women/22.jpg'
          },
          createdAt: new Date(Date.now() - 3000000).toISOString() // 50 minutes ago
        },
        {
          _id: 'comment5',
          text: 'Have you considered a dark mode?',
          user: {
            _id: '105',
            username: 'coffee_lover',
            name: 'Taylor Swift',
            profilePicture: 'https://randomuser.me/api/portraits/women/73.jpg'
          },
          createdAt: new Date(Date.now() - 1200000).toISOString() // 20 minutes ago
        }
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    },
    '3': {
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
    '4': {
      _id: '4',
      text: 'Just finished reading an amazing book on AI and the future of technology. Highly recommend!',
      user: {
        _id: '104',
        username: 'bookworm',
        name: 'Jamie Reed',
        profilePicture: 'https://randomuser.me/api/portraits/men/67.jpg'
      },
      likes: ['101'],
      comments: [
        {
          _id: 'comment6',
          text: 'What\'s the title? I\'ve been looking for a good tech book.',
          user: {
            _id: '101',
            username: 'sarah_dev',
            name: 'Sarah Johnson',
            profilePicture: 'https://randomuser.me/api/portraits/women/22.jpg'
          },
          createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        }
      ],
      createdAt: new Date(Date.now() - 14400000).toISOString() // 4 hours ago
    },
    '5': {
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
      comments: [
        {
          _id: 'comment7',
          text: 'What\'s it called? I need to check it out!',
          user: {
            _id: '102',
            username: 'mike_design',
            name: 'Mike Wilson',
            profilePicture: 'https://randomuser.me/api/portraits/men/32.jpg'
          },
          createdAt: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
        },
        {
          _id: 'comment8',
          text: 'Do they have good pastries too?',
          user: {
            _id: '103',
            username: 'alex_nature',
            name: 'Alex Green',
            profilePicture: 'https://randomuser.me/api/portraits/women/44.jpg'
          },
          createdAt: new Date(Date.now() - 5400000).toISOString() // 1.5 hours ago
        }
      ],
      createdAt: new Date(Date.now() - 18000000).toISOString() // 5 hours ago
    }
  };

  return mockPosts[postId as keyof typeof mockPosts] || {
    _id: postId,
    text: 'Post not found',
    user: {
      _id: '999',
      username: 'unknown',
      name: 'Unknown User',
      profilePicture: DEFAULT_AVATAR
    },
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };
};

const PostDetailsScreen: React.FC<PostDetailsScreenProps> = ({ route, navigation }) => {
  const { postId } = route.params;
  const { user } = useAuthContext();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      
      // In a real app, we would fetch from the API
      // const response = await axios.get(`${API_URL}/api/posts/${postId}`);
      // setPost(response.data);
      
      // For testing, use mock data with a simulated delay
      setTimeout(() => {
        setPost(getMockPostDetails(postId));
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to load post details');
      console.error(error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async () => {
    if (!post || !user?._id) return;
    
    try {
      const isLiked = post.likes.includes(user._id);
      const updatedLikes = isLiked
        ? post.likes.filter(id => id !== user._id)
        : [...post.likes, user._id];
      
      // Optimistic update
      setPost(prev => prev ? {
        ...prev,
        likes: updatedLikes
      } : null);
      
      // In a real app, we would call the API
      // await axios.post(`${API_URL}/api/posts/${post._id}/like`);
      
      // Simulate API call delay
      // setTimeout(() => {
      //   // No need to do anything, we already updated the UI
      // }, 500);
    } catch (error) {
      // Revert on error
      fetchPost();
      Alert.alert('Error', 'Could not update like');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post || !user) return;
    
    try {
      setSubmitting(true);
      
      // In a real app, we would call the API
      // await axios.post(`${API_URL}/api/posts/${post._id}/comment`, {
      //   text: commentText
      // });
      
      // Simulate adding a comment
      const newComment: Comment = {
        _id: `temp-${Date.now()}`,
        text: commentText,
        user: {
          _id: user._id,
          username: user.username,
          name: user.name,
          profilePicture: user.profilePicture
        },
        createdAt: new Date().toISOString()
      };
      
      // Update post with new comment
      setPost(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [...prev.comments, newComment]
        };
      });
      
      setCommentText('');
      
      // Simulate API delay
      setTimeout(() => {
        setSubmitting(false);
      }, 500);
    } catch (error) {
      Alert.alert('Error', 'Could not post comment');
      setSubmitting(false);
    }
  };

  const handleUserPress = (userId: string) => {
    if (userId === user?._id) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('UserProfile', { userId });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView style={styles.container}>
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <TouchableOpacity 
              style={styles.userInfo}
              onPress={() => handleUserPress(post.user._id)}
            >
              <Image 
                source={{ uri: post.user.profilePicture || DEFAULT_AVATAR }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.userName}>{post.user.name}</Text>
                <Text style={styles.userUsername}>@{post.user.username}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
          </View>
          
          <Text style={styles.postText}>{post.text}</Text>
          
          {post.image && (
            <Image 
              source={{ uri: post.image }}
              style={styles.postImage}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.postActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLike}
            >
              <Ionicons 
                name={post.likes.includes(user?._id || '') ? "heart" : "heart-outline"} 
                size={24} 
                color={post.likes.includes(user?._id || '') ? "#FF3B30" : "#666"}
              />
              <Text style={styles.actionText}>{post.likes.length}</Text>
            </TouchableOpacity>
            
            <View style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={22} color="#666" />
              <Text style={styles.actionText}>{post.comments.length}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          
          {post.comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubbles-outline" size={32} color="#ccc" />
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
            </View>
          ) : (
            post.comments.map(comment => (
              <View key={comment._id} style={styles.commentItem}>
                <TouchableOpacity 
                  onPress={() => handleUserPress(comment.user._id)}
                  style={styles.commentUserSection}
                >
                  <Image 
                    source={{ uri: comment.user.profilePicture || DEFAULT_AVATAR }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUserName}>{comment.user.name}</Text>
                      <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      <View style={styles.commentInput}>
        <Image 
          source={{ uri: user?.profilePicture || DEFAULT_AVATAR }}
          style={styles.commentInputAvatar}
        />
        <TextInput
          style={styles.commentTextInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity 
          style={[
            styles.commentSubmitButton,
            (!commentText.trim() || submitting) && styles.disabledButton
          ]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginVertical: 10
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#4B0082',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  postContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16
  },
  userUsername: {
    color: '#666',
    fontSize: 13
  },
  postDate: {
    color: '#999',
    fontSize: 12
  },
  postText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
    color: '#333'
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 10
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    paddingTop: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  actionText: {
    marginLeft: 5,
    color: '#666'
  },
  commentsSection: {
    backgroundColor: '#fff',
    padding: 15,
    flex: 1
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  commentItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    paddingBottom: 15
  },
  commentUserSection: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10
  },
  commentContent: {
    flex: 1
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  commentUserName: {
    fontWeight: 'bold',
    fontSize: 14
  },
  commentDate: {
    color: '#999',
    fontSize: 11
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333'
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  emptyCommentsText: {
    fontSize: 16,
    marginTop: 10,
    color: '#666'
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  commentInputAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100
  },
  commentSubmitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4B0082',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  disabledButton: {
    backgroundColor: '#cccccc'
  }
});

export default PostDetailsScreen;
