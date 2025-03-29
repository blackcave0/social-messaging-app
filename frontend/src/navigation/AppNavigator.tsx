import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import PostScreen from '../screens/PostScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import CreateStoryScreen from '../screens/CreateStoryScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PostDetailsScreen from '../screens/PostDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth navigator
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Home stack navigator
const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Feed" component={HomeScreen} options={{ headerTitle: 'Social App' }} />
    <Stack.Screen name="PostDetails" component={PostDetailsScreen} options={{ headerTitle: 'Post' }} />
    <Stack.Screen name="Post" component={PostScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerTitle: 'Profile' }} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerTitle: 'Create Post' }} />
    <Stack.Screen name="CreateStory" component={CreateStoryScreen} options={{ headerTitle: 'Create Story' }} />
  </Stack.Navigator>
);

// Chat stack navigator
const ChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerTitle: 'Messages' }} />
    <Stack.Screen name="Chat" component={ChatScreen} />
  </Stack.Navigator>
);

// Profile stack navigator
const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MyProfile" component={ProfileScreen} options={{ headerTitle: 'My Profile' }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerTitle: 'Edit Profile' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerTitle: 'Settings' }} />
  </Stack.Navigator>
);

// Main tab navigator
const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Chat') {
          iconName = focused ? 'chatbubble' : 'chatbubble-outline';
        } else if (route.name === 'Notifications') {
          iconName = focused ? 'notifications' : 'notifications-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName as any} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4B0082',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} options={{ headerShown: false }} />
    <Tab.Screen name="Chat" component={ChatStack} options={{ headerShown: false }} />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
  </Tab.Navigator>
);

// Root navigator
export default function AppNavigator() {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return null; // Or a splash screen / loading indicator
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
} 