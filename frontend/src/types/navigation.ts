import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

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

export type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  Create: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type RootTabScreenProps<T extends keyof RootTabParamList> = BottomTabScreenProps<RootTabParamList, T>; 