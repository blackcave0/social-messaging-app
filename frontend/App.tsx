import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { PostsProvider } from './src/context/PostsContext';
import UserProvider from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './src/utils/config';

// Configure Axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.timeout = 15000; // 15 seconds timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

export default function App() {
  // Set up axios interceptors and load token on startup
  useEffect(() => {
    const setupAxios = async () => {
      try {
        // Check for stored token
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          // Set authorization header if token exists
          if (user?.token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
          }
        }
      } catch (error) {
        console.error('Error setting up axios:', error);
      }
    };

    setupAxios();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <UserProvider>
            <PostsProvider>
              <View style={styles.container}>
                <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
                <AppNavigator />
              </View>
            </PostsProvider>
          </UserProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 