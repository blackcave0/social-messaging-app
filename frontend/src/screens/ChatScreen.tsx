import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { DEFAULT_AVATAR } from '../utils/config';

interface ChatScreenProps {
  navigation: any;
  route: any;
}

// Mock messages for demo
const mockMessages = [
  {
    id: '1',
    senderId: 'other-user',
    text: 'Hey, how are you doing?',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    senderId: 'current-user',
    text: 'I\'m doing great! How about you?',
    createdAt: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: '3',
    senderId: 'other-user',
    text: 'Pretty good! Just working on some projects.',
    createdAt: new Date(Date.now() - 2400000).toISOString(),
  },
  {
    id: '4',
    senderId: 'current-user',
    text: 'That sounds interesting. What kind of projects?',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '5',
    senderId: 'other-user',
    text: 'Building a social messaging app with React Native!',
    createdAt: new Date(Date.now() - 1200000).toISOString(),
  },
];

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { userId, name } = route.params;
  const { user } = useAuthContext();
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');

  // Set the header title to the chat partner's name
  useEffect(() => {
    navigation.setOptions({
      title: name,
    });
  }, [navigation, name]);

  const sendMessage = () => {
    if (newMessage.trim() === '') return;

    const message = {
      id: Date.now().toString(),
      senderId: 'current-user',
      text: newMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const renderMessage = ({ item }: any) => {
    const isCurrentUser = item.senderId === 'current-user';

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <Image 
            source={{ uri: DEFAULT_AVATAR }} 
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
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
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
          onPress={sendMessage}
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
  messagesList: {
    padding: 10,
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
