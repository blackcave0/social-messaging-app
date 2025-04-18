import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../context/AuthContext';

export interface Post {
  _id: string;
  description: string;
  images: string[];
  createdAt: string;
  user: {
    _id: string;
    username: string;
    name: string;
    profilePicture?: string;
  };
  likes: string[];
  comments: string[];
}

export const usePosts = () => {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load posts from storage on initial mount
  useEffect(() => {
    loadPosts();
  }, []);

  // Load posts from AsyncStorage
  const loadPosts = async () => {
    try {
      setLoading(true);
      const storedPosts = await AsyncStorage.getItem('posts');
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts));
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Save posts to AsyncStorage
  const savePosts = async (updatedPosts: Post[]) => {
    try {
      await AsyncStorage.setItem('posts', JSON.stringify(updatedPosts));
    } catch (error) {
      console.error('Error saving posts:', error);
    }
  };

  // Create a new post
  const createPost = async (description: string, images: string[] = []) => {
    if (!user) return false;

    try {
      // Log detailed info about the images
      if (images.length > 0) {
        // console.log('Images being added to post:', images);
      } else {
        // console.log('Creating post without images');
      }

      const newPost: Post = {
        _id: Date.now().toString(),
        description,
        images,
        createdAt: new Date().toISOString(),
        user: {
          _id: user._id,
          username: user.username,
          name: user.name,
          profilePicture: user.profilePicture,
        },
        likes: [],
        comments: [],
      };

      // console.log('Creating new post:', newPost);

      const updatedPosts = [newPost, ...posts];
      setPosts(updatedPosts);
      await savePosts(updatedPosts);
      return true;
    } catch (error) {
      console.error('Error creating post:', error);
      return false;
    }
  };

  // Like/unlike a post
  const toggleLike = async (postId: string) => {
    if (!user) return;

    try {
      const updatedPosts = posts.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes.includes(user._id);
          return {
            ...post,
            likes: isLiked
              ? post.likes.filter(id => id !== user._id)
              : [...post.likes, user._id],
          };
        }
        return post;
      });

      setPosts(updatedPosts);
      await savePosts(updatedPosts);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Get user's posts
  const getUserPosts = (userId: string) => {
    return posts.filter(post => post.user._id === userId);
  };

  // Refresh posts
  const refreshPosts = async () => {
    setRefreshing(true);
    await loadPosts();
  };

  return {
    posts,
    loading,
    refreshing,
    createPost,
    toggleLike,
    getUserPosts,
    refreshPosts,
  };
}; 