import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../utils/config';

interface User {
  _id: string;
  username: string;
  email: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  token: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export default function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
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

      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        username,
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
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Registration failed. Please try again.',
        isLoading: false,
      }));
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Remove token from axios header
      delete axios.defaults.headers.common['Authorization'];

      // Remove user from AsyncStorage
      await AsyncStorage.removeItem('user');

      setState({
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
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

  return {
    ...state,
    login,
    register,
    logout,
    clearError,
  };
} 