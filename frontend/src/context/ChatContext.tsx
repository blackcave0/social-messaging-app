import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../utils/config';
import { useAuthContext } from './AuthContext';

// Types for chat data
interface User {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
}

interface Message {
  _id: string;
  sender: User;
  recipient: User;
  conversation: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

interface ChatContextType {
  socket: Socket | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  getConversations: () => Promise<void>;
  getOrCreateConversation: (userId: string) => Promise<Conversation | null>;
  getMessages: (conversationId: string, page?: number, limit?: number) => Promise<void>;
  sendMessage: (recipientId: string, text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<Message | null>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  clearChatError: () => void;
  getUnreadCount: () => Promise<void>;
}

// Create Context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider Component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Initialize Socket.IO connection when user is logged in
  useEffect(() => {
    if (user) {
      console.log('Attempting to connect to socket at:', SOCKET_URL);

      // Configure the socket
      const socketInstance = io(SOCKET_URL, {
        query: { userId: user._id },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        auth: {
          token: user.token
        }
      });

      socketInstance.on('connect', () => {
        console.log('Connected to Socket.IO server');
        setError(null); // Clear any previous connection errors
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        // Only set the error if it's a new connection attempt
        // This prevents error states during normal operation
        if (!socket) {
          setError(`Socket connection error: ${error.message}`);
        }
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.IO server:', reason);
        if (reason === 'io server disconnect') {
          // The server has forcefully disconnected
          // Try to reconnect manually
          setTimeout(() => {
            socketInstance.connect();
          }, 2000);
        }
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected to Socket.IO server after ${attemptNumber} attempts`);
      });

      // Only update the socket state once it's connected
      setSocket(socketInstance);

      socketInstance.on('receive_message', (messageData: Message) => {
        console.log('New message received:', messageData);

        // Only update messages if we're in the correct conversation
        if (currentConversation && messageData.conversation === currentConversation._id) {
          setMessages(prevMessages => [...prevMessages, messageData]);
        }

        // Update conversations list to show latest message
        setConversations(prevConversations => {
          return prevConversations.map(convo => {
            if (convo._id === messageData.conversation) {
              return { ...convo, lastMessage: messageData };
            }
            return convo;
          });
        });

        // Update unread count if message is not from the current user
        if (user && messageData.sender._id !== user._id) {
          getUnreadCount();
        }
      });

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [user, currentConversation]);

  // Get all conversations for the current user
  const getConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setConversations(response.data);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      setError(error.response?.data?.message || 'Failed to fetch conversations');
      setIsLoading(false);
    }
  };

  // Get or create a conversation with another user
  const getOrCreateConversation = async (userId: string) => {
    if (!user) return null;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/chat/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      const conversation = response.data;

      // Update the conversations list if this is a new conversation
      const exists = conversations.some(c => c._id === conversation._id);
      if (!exists) {
        setConversations(prev => [conversation, ...prev]);
      }

      setCurrentConversation(conversation);
      setIsLoading(false);
      return conversation;
    } catch (error: any) {
      console.error('Error getting/creating conversation:', error);
      setError(error.response?.data?.message || 'Failed to start conversation');
      setIsLoading(false);
      return null;
    }
  };

  // Get messages for a conversation
  const getMessages = async (conversationId: string, page = 1, limit = 20) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/api/chat/messages/${conversationId}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setMessages(response.data.messages);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error.response?.data?.message || 'Failed to fetch messages');
      setIsLoading(false);
    }
  };

  // Send a message
  const sendMessage = async (
    recipientId: string,
    text: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video'
  ) => {
    if (!user) return null;

    try {
      setError(null);

      const response = await axios.post(
        `${API_URL}/api/chat/messages`,
        { recipientId, text, mediaUrl, mediaType },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      const newMessage = response.data;

      // If we have a socket connection and a current conversation, emit the message
      if (socket && currentConversation) {
        socket.emit('send_message', {
          ...newMessage,
          conversation: currentConversation._id
        });
      }

      // Update local messages state
      setMessages(prevMessages => [...prevMessages, newMessage]);

      // Update the conversation's last message
      if (currentConversation) {
        const updatedConversation = {
          ...currentConversation,
          lastMessage: newMessage
        };
        setCurrentConversation(updatedConversation);

        // Update the conversations list
        setConversations(prevConversations => {
          return prevConversations.map(convo => {
            if (convo._id === currentConversation._id) {
              return updatedConversation;
            }
            return convo;
          });
        });
      }

      return newMessage;
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.response?.data?.message || 'Failed to send message');
      return null;
    }
  };

  // Join a conversation room (socket)
  const joinConversation = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  }, [socket]);

  // Leave a conversation room (socket)
  const leaveConversation = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  }, [socket]);

  // Get unread message count
  const getUnreadCount = async () => {
    if (!user) return;

    try {
      // Add a request timeout
      const response = await axios.get(`${API_URL}/api/chat/messages/unread`, {
        headers: { Authorization: `Bearer ${user.token}` },
        timeout: 5000 // 5 second timeout
      });

      if (response.data && typeof response.data.unreadCount === 'number') {
        setUnreadCount(response.data.unreadCount);
      } else {
        console.log('Invalid unread count data received:', response.data);
        setUnreadCount(0); // Set to 0 if invalid
      }
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      // Don't update state on error, just keep previous value
      // This prevents repeated error logs
    }
  };

  // Clear error state
  const clearChatError = () => {
    setError(null);
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      // Use Promise.allSettled to continue even if one promise fails
      const loadInitialData = async () => {
        try {
          // First try to get conversations
          await getConversations();
        } catch (error) {
          console.error('Error loading conversations:', error);
        }

        // Then try to get unread count, regardless of whether conversations loaded
        try {
          await getUnreadCount();
        } catch (error) {
          console.error('Error loading unread count:', error);
        }
      };

      loadInitialData();
    }
  }, [user]);

  return (
    <ChatContext.Provider
      value={{
        socket,
        conversations,
        currentConversation,
        messages,
        isLoading,
        error,
        unreadCount,
        getConversations,
        getOrCreateConversation,
        getMessages,
        sendMessage,
        joinConversation,
        leaveConversation,
        setCurrentConversation,
        clearChatError,
        getUnreadCount
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use the chat context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}; 