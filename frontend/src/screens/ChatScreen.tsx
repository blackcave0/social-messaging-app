import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { useChatContext } from '../context/ChatContext';
import { DEFAULT_AVATAR } from '../utils/config';

interface ChatScreenProps {
  navigation: any;
  route: any;
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { chatId, userId, name } = route.params;
  const { user } = useAuthContext();
  const {
    messages,
    isLoading,
    error,
    getMessages,
    sendMessage,
    joinConversation,
    leaveConversation,
    getOrCreateConversation,
    currentConversation,
    clearChatError
  } = useChatContext();
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(chatId || null);

  useEffect(() => {
    navigation.setOptions({
      title: name,
    });
  }, [navigation, name]);

  // Load or create the conversation
  useEffect(() => {
    const loadConversation = async () => {
      try {
        // If we already have a conversationId, use it
        if (conversationId) {
          await getMessages(conversationId);
          joinConversation(conversationId);
          return;
        }

        // Otherwise create a new conversation with the user
        const conversation = await getOrCreateConversation(userId);
        if (conversation) {
          setConversationId(conversation._id);
          await getMessages(conversation._id);
          joinConversation(conversation._id);
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
      }
    };

    loadConversation();

    // Clean up on unmount
    return () => {
      if (conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [userId, conversationId]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    try {
      await sendMessage(userId, newMessage);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderMessage = useCallback(({ item }: any) => {
    const isCurrentUser = item.sender._id === user?._id;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <Image
            source={{ uri: item.sender.profilePicture || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.text}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [user]);

  // Show a loading indicator while fetching messages
  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </View>
    );
  }

  // Show an error message if there was a problem
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            clearChatError();
            if (conversationId) {
              getMessages(conversationId);
            } else {
              getOrCreateConversation(userId);
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubText}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendMessage}
          disabled={newMessage.trim() === ''}
        >
          <Ionicons
            name="send"
            size={24}
            color={newMessage.trim() === '' ? '#ccc' : '#4B0082'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4B0082',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  messagesList: {
    padding: 10,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 20,
  },
  currentUserBubble: {
    backgroundColor: '#4B0082',
    borderBottomRightRadius: 0,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: '#aaa',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
