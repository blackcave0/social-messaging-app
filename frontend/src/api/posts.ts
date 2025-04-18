import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/config';

// Use the centralized API URL from config
const API_ENDPOINT = `${API_URL}/api`;

// Create a new Axios instance
const api = axios.create({
  baseURL: API_ENDPOINT,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Interceptor to add token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      // Get user object that contains the token
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Create a post with image
export const createPost = async (postData: {
  description: string;
  mood?: string;
  images?: any[];
}) => {
  try {
    const formData = new FormData();
    
    // Add text data
    formData.append('description', postData.description);
    
    if (postData.mood) {
      formData.append('mood', postData.mood);
    }
    
    // Add images if they exist
    if (postData.images && postData.images.length > 0) {
      postData.images.forEach((image, index) => {
        if (image) {
          const imageName = image.split('/').pop();
          // Get file extension
          const fileExtension = (imageName && imageName.split('.').pop()) || 'jpg';
          const imageType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
          
          formData.append('images', {
            uri: image,
            type: imageType,
            name: imageName || `image_${index}.jpg`,
          } as any);
        }
      });
    }
    
    console.log('Sending post data:', {
      description: postData.description,
      mood: postData.mood,
      imageCount: postData.images?.length || 0
    });
    
    const response = await api.post('/posts', formData);
    return response.data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// Get all posts
export const getAllPosts = async () => {
  try {
    const response = await api.get('/posts');
    return response.data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

// Get post by ID
export const getPostById = async (id: string) => {
  try {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching post ${id}:`, error);
    throw error;
  }
}; 