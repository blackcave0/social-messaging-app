import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { RootStackParamList, RootTabParamList } from '../types/navigation';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import CreateStoryScreen from '../screens/CreateStoryScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PostDetailsScreen from '../screens/PostDetailsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

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
        } else if (route.name === 'Search') {
          iconName = focused ? 'search' : 'search-outline';
        } else if (route.name === 'Create') {
          iconName = focused ? 'add-circle' : 'add-circle-outline';
        } else if (route.name === 'Notifications') {
          iconName = focused ? 'heart' : 'heart-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName as any} size={24} color={color} />;
      },
      tabBarActiveTintColor: '#405DE6',
      tabBarInactiveTintColor: 'black',
      tabBarShowLabel: false,
      tabBarStyle: { 
        height: 50,
        borderTopWidth: 0.5,
        borderTopColor: '#E0E0E0',
        elevation: 0,
        shadowOpacity: 0
      },
      headerShown: false
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Search" component={NotificationsScreen} />
    <Tab.Screen 
      name="Create" 
      component={CreatePostScreen as any} 
      options={{
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={30} color={color} />
        )
      }}
    />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

// Root navigator
export default function AppNavigator() {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return null; // Or a splash screen / loading indicator
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
} 