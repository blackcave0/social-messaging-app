import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { PostsProvider } from './src/context/PostsContext';
import UserProvider from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
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