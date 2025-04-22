import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  // Auth screens
  Login: undefined;
  Register: undefined;

  // Main screens
  Main: undefined;
  Feed: undefined;
  PostDetails: { postId: string; userId?: string; userName?: string };
  Post: undefined;
  UserProfile: { userId: string; fromFollowRequest?: boolean; userName?: string };
  Profile: undefined;
  MyProfile: undefined;
  CreatePost: undefined;
  CreateStory: undefined;
  Stories: { userId?: string; refresh?: boolean };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;

  // Chat screens
  ChatList: undefined;
  ChatDetail: { chatId?: string; userId?: string; name?: string };
  UserList: undefined;
};

export type HomeStackParamList = {
  Feed: undefined;
  PostDetails: { postId: string; userId?: string; userName?: string };
  UserProfile: { userId: string; fromFollowRequest?: boolean; userName?: string };
  CreatePost: undefined;
  CreateStory: undefined;
};

export type ProfileStackParamList = {
  MyProfile: { editComplete?: boolean };
  EditProfile: undefined;
  Settings: undefined;
  PostDetails: { postId: string; userId?: string; userName?: string };
  UserProfile: { userId: string; fromFollowRequest?: boolean; userName?: string };
  CreatePost: undefined;
  CreateStory: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatDetail: { chatId?: string; userId?: string; name?: string };
  UserList: undefined;
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

export type ChatStackScreenProps<T extends keyof ChatStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ChatStackParamList, T>,
  RootStackScreenProps<'ChatList'>
>; 