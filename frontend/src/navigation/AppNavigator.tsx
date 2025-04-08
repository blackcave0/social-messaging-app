import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { RootStackParamList, RootTabParamList } from '../types/navigation';
import { ChatProvider } from '../context/ChatContext';
import { ChatStackNavigator } from './ChatNavigator';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import UserListScreen from '../screens/UserListScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import CreateStoryScreen from '../screens/CreateStoryScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PostDetailsScreen from '../screens/PostDetailsScreen';
import SearchScreen from '../screens/SearchScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// Auth navigator
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />

  </Stack.Navigator>
);

// Home stack navigator
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Feed" component={HomeScreen} />
    <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} />
    <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
  </Stack.Navigator>
);

// Create stack navigator
const CreateStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CreatePost" component={CreatePostScreen} />
    <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
  </Stack.Navigator>
);

// Profile stack navigator
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyProfile" component={ProfileScreen as React.ComponentType<any>} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} />
  </Stack.Navigator>
);

// Main tab navigator
const MainNavigator = () => {
  return (
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
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#405DE6',
        tabBarInactiveTintColor: '#888888',
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 50,
          borderTopWidth: 0.5,
          borderTopColor: '#E0E0E0',
          elevation: 0,
          shadowOpacity: 0,
          backgroundColor: '#FFFFFF'
        },
        headerShown: false
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen
        name="Create"
        component={CreateStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={30} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Chat"
      >
        {() => (
          <ChatProvider>
            <ChatStackNavigator />
          </ChatProvider>
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

// Root navigator
export default function AppNavigator() {
  const { user, isLoading, logout } = useAuthContext();

  if (isLoading) {
    return null; // Or a splash screen / loading indicator
  }

  return user ? (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainNavigator} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen
        name="ChatDetail"
        options={{
          headerShown: true,
          title: "Chat"
        }}
      >
        {(props) => (
          <ChatProvider>
            <ChatScreen {...props} />
          </ChatProvider>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="UserList"
        options={{
          title: 'New Message',
          headerShown: true
        }}
      >
        {(props) => (
          <ChatProvider>
            <UserListScreen {...props} />
          </ChatProvider>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  ) : (
    <AuthNavigator />
  );
} 