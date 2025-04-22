import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { RootStackParamList, RootTabParamList, ProfileStackParamList, RootTabScreenProps, ProfileStackScreenProps } from '../types/navigation';
import { ChatProvider } from '../context/ChatContext';
import { ChatStackNavigator, ChatTabBadgeWrapper } from './ChatNavigator';
import { TouchableOpacity, View, Text, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';

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
import ChatListScreen from '../screens/ChatListScreen';
import { User } from '../types/User';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import StoriesScreen from '../screens/StoriesScreen';

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
    <Stack.Screen name="Stories" component={StoriesScreen} />
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
    <Stack.Screen name="PostDetails" component={PostDetailsScreen} options={{ headerTitle: 'All Posts' }} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} />
    <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
    <Stack.Screen name="Stories" component={StoriesScreen} />
  </Stack.Navigator>
);

// Main tab navigator
const MainNavigator = () => {
  const { user } = useAuthContext();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const navigation = useNavigation();

  useEffect(() => {
    if (user?.profilePicture) {
      setProfilePicture(user.profilePicture);
    }
    if (user?.token) {
      setIsLoggedIn(true);
    }
  }, [user]);

  const handleProfilePress = () => {
    return (
      <TouchableOpacity >
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, overflow: 'hidden' }}>
            <Image
              source={{ uri: user?.profilePicture || DEFAULT_AVATAR }}
              style={{ width: 24, height: 24 }}
            />
          </View>
          <Text style={{ fontSize: 10, color: '#888888', marginTop: 2 }}>
            {user?.username || 'Profile'}
          </Text>
        </View>
      </TouchableOpacity>
    )
  };

  const DEFAULT_AVATAR = 'https://i.imgur.com/6VBx3io.png';
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
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            // Return null for Profile tab as we're using a custom tabBarButton
            return null;
            // iconName = focused ? 'person' : 'person-outline';
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
        name="Notifications"
        component={NotificationsScreen}
      />
      <Tab.Screen name="Profile" component={ProfileStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            (isLoggedIn) ? <FontAwesome >
              {/* <TouchableOpacity > */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, overflow: 'hidden' }}>
                  <Image
                    source={{ uri: user?.profilePicture || DEFAULT_AVATAR }}
                    style={{ width: 24, height: 24 }}
                  />
                </View>

              </View>
              {/* </TouchableOpacity> */}
            </FontAwesome> : <FontAwesome name="user-o" size={30} color={color} />
          )
          // tabBarIcon: ({ focused, color }) => (
          //   <Ionicons name={focused ? "person" : "person-outline"} size={30} color={color} />
          // )
        }}
      />

    </Tab.Navigator>
  );
};

// Main navigator
export default function AppNavigator() {
  const { user, isLoading, logout } = useAuthContext();

  if (isLoading) {
    return null; // Or a splash screen / loading indicator
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Authentication screens
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        // Main app screens
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen name="ChatList" component={ChatStackNavigator} />
          <Stack.Screen name="ChatDetail" component={ChatScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="Stories" component={StoriesScreen} />
        </>
      )}
    </Stack.Navigator>
  );
} 