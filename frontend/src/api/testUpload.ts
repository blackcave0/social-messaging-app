import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.30.181:5000/api';

/**
 * Test function to check if a user is authenticated
 */
export const checkAuthentication = async () => {
  try {
    // Get user from async storage
    const userString = await AsyncStorage.getItem('user');
    if (!userString) {
      console.log('No user found in AsyncStorage');
      return { authenticated: false };
    }

    const user = JSON.parse(userString);
    console.log('User from AsyncStorage:', {
      id: user._id,
      name: user.name,
      token: user.token ? 'exists' : 'missing'
    });

    if (!user.token) {
      console.log('Token missing from user object');
      return { authenticated: false, user: { id: user._id, name: user.name } };
    }

    // Try to get current user with token
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    });

    console.log('Authentication successful, user data:', response.data);
    return { authenticated: true, user: response.data.data };
  } catch (error) {
    console.error('Authentication check error:', error);
    return { authenticated: false, error };
  }
};

/**
 * Test function for file uploads
 */
export const testImageUpload = async (imageUri: string, description: string) => {
  try {
    // Get user token
    const userString = await AsyncStorage.getItem('user');
    if (!userString) {
      console.log('No user found in AsyncStorage');
      return { success: false, error: 'Not authenticated' };
    }

    const user = JSON.parse(userString);
    if (!user.token) {
      console.log('Token missing from user object');
      return { success: false, error: 'No token available' };
    }

    // Create FormData
    const formData = new FormData();
    formData.append('description', description);
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    console.log('File info:', fileInfo);
    
    // Add image to formData
    const uriParts = imageUri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    
    formData.append('images', {
      uri: imageUri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`
    } as any);
    
    console.log('Sending form data:', {
      description,
      imageUri,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${user.token.substring(0, 10)}...`
      }
    });
    
    // Send request
    const response = await axios.post(`${API_URL}/posts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${user.token}`
      }
    });
    
    console.log('Upload response:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Upload test error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}; 