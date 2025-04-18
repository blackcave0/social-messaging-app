import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../utils/config';

// Define the auth context types
interface User {
  _id: string;
  username: string;
  email: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    user: User | null;
    isLoading: boolean;
    error: string | null;
  }>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Check if user is logged in
    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);

          // Set token in axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;

          setState(prev => ({
            ...prev,
            user,
            isLoading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    loadUser();
  }, []);

  // Fetch current user data from the server
  const fetchCurrentUser = async () => {
    try {
      // Get user from storage if not in state
      if (!state.user || !state.user.token) {
        const userString = await AsyncStorage.getItem('user');
        if (!userString) {
          console.log('No authenticated user found in state or storage');
          return; // Just return instead of throwing
        }

        // Try to get user from storage
        const storedUser = JSON.parse(userString);
        if (!storedUser || !storedUser.token) {
          console.log('Invalid user data in storage');
          return;
        }

        // Use stored user data
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedUser.token}`
          }
        });

        if (response.data && response.data.success) {
          const updatedUser = {
            ...storedUser,
            ...response.data.data,
          };

          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          setState(prev => ({ ...prev, user: updatedUser }));
          console.log('User data refreshed from storage successfully');
        }

        return;
      }

      // Regular flow with user in state
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${state.user.token}`
        }
      });

      if (response.data && response.data.success) {
        // Get the updated user data
        const updatedUserData = response.data.data;

        // Create a complete user object by merging with current user (to keep the token)
        const updatedUser = {
          ...state.user,
          ...updatedUserData,
        };

        // Update AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

        // Update state
        setState(prev => ({
          ...prev,
          user: updatedUser,
        }));

        console.log('User data refreshed successfully');
      }
    } catch (error: any) {
      console.error('Error fetching current user:', error);
      // Don't throw - just log the error and continue
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const user = res.data;

      // Set token in axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;

      // Save user to AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(user));

      setState(prev => ({
        ...prev,
        user,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Login error:', error);
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Login failed. Please try again.',
        isLoading: false,
      }));
    }
  };

  const register = async (name: string, username: string, email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('Sending registration request to:', `${API_URL}/api/auth/register`);
      console.log('Registration data:', { name, username, email, password: '***' });

      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        username,
        email,
        password,
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Registration response:', res.data);
      const user = res.data;

      // Set token in axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;

      // Save user to AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // Update state and return - don't try to fetch current user here
      setState(prev => ({
        ...prev,
        user,
        isLoading: false,
      }));

      // Instead of trying to fetch the user data immediately, let the app
      // continue with the basic user data we already have from registration
    } catch (error: any) {
      console.error('Registration error details:', error.message);

      // Handle network errors specifically
      if (error.code === 'ECONNABORTED') {
        setState(prev => ({
          ...prev,
          error: 'Connection timed out. Please check your internet connection.',
          isLoading: false,
        }));
      } else if (!error.response) {
        setState(prev => ({
          ...prev,
          error: `Network error: Unable to reach the server at ${API_URL}. Please check your network connection and server status.`,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: error.response?.data?.message || 'Registration failed. Please try again.',
          isLoading: false,
        }));
      }
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Remove token from axios header
      delete axios.defaults.headers.common['Authorization'];

      // Remove user from AsyncStorage
      await AsyncStorage.removeItem('user');

      // Update the state - this will trigger a re-render of AppNavigator with AuthNavigator
      setState({
        user: null,
        isLoading: false,
        error: null,
      });

      // No navigation code needed here - the AppNavigator will handle it
      console.log('User logged out successfully');

    } catch (error: any) {
      console.error('Logout error:', error);
      setState(prev => ({
        ...prev,
        error: 'Logout failed. Please try again.',
        isLoading: false,
      }));
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!state.user) {
        throw new Error('No user is logged in');
      }

      // Update user in state
      const updatedUser = { ...state.user, ...userData };

      // Update AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Update state
      setState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      console.log('User updated successfully:', updatedUser);
    } catch (error: any) {
      console.error('Update user error:', error);
      throw new Error(error.message || 'Failed to update user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isLoading: state.isLoading,
        error: state.error,
        login,
        register,
        logout,
        clearError,
        updateUser,
        fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}; 