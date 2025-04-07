import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  // Auth screens
  Login: undefined;
  Register: undefined;

  // Main screens
  Feed: undefined;
  PostDetails: { postId: string };
  Post: undefined;
  UserProfile: { userId: string };
  Profile: undefined;
  MyProfile: undefined;
  CreatePost: undefined;
  CreateStory: undefined;
  EditProfile: undefined;
  Settings: undefined;

  // Chat screens
  ChatList: undefined;
  Chat: { chatId: string };
};

export type HomeStackParamList = {
  Feed: undefined;
  PostDetails: { postId: string };
  UserProfile: { userId: string };
  CreatePost: undefined;
  CreateStory: undefined;
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  PostDetails: { postId: string };
  UserProfile: { userId: string };
  CreatePost: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  Chat: { chatId: string };
};

export type CreateStackParamList = {
  CreatePost: undefined;
  CreateStory: undefined;
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Search: undefined;
  Create: NavigatorScreenParams<CreateStackParamList>;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type RootTabScreenProps<T extends keyof RootTabParamList> = BottomTabScreenProps<RootTabParamList, T>;

// Composite types for nested navigation
export type HomeStackScreenProps<T extends keyof HomeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, T>,
  RootTabScreenProps<'Home'>
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, T>,
  RootTabScreenProps<'Profile'>
>;

export type CreateStackScreenProps<T extends keyof CreateStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<CreateStackParamList, T>,
  RootTabScreenProps<'Create'>
>; 