import React from 'react';
import { Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useChatContext } from '../context/ChatContext';
import { ChatStackParamList } from '../types/navigation';

// Chat related screens
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import UserListScreen from '../screens/UserListScreen';

const Stack = createNativeStackNavigator<ChatStackParamList>();

// Chat stack navigator wrapped with its own context consumer
export const ChatStackNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ChatList"
      component={ChatListScreen}
      options={{
        title: 'Messages',
        headerShown: true
      }}
    />
    <Stack.Screen
      name="ChatDetail"
      component={ChatScreen}
      options={{
        headerShown: true,
        title: "Conversation"
      }}
    />
    <Stack.Screen
      name="UserList"
      component={UserListScreen}
      options={{
        title: 'New Message',
        headerShown: true
      }}
    />
  </Stack.Navigator>
);

// A safe badge component that doesn't throw errors when ChatProvider isn't available
export const ChatTabBadgeWrapper = () => {
  try {
    // Try to use the context
    const { unreadCount } = useChatContext();

    if (unreadCount > 0) {
      return (
        <View style={{
          position: 'absolute',
          right: -6,
          top: 0,
          backgroundColor: 'red',
          borderRadius: 10,
          width: 18,
          height: 18,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      );
    }
  } catch (error) {
    // Silently fail if the context isn't available
    // console.log('ChatTabBadgeWrapper: ChatContext not available');
  }

  return null;
}; 