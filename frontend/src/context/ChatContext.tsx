import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../utils/config';
import { useAuthContext } from './AuthContext';
import { User } from '../types/User';

// Types for chat data
export interface Message {
  _id?: string;
  id?: string; // Supabase ID
  sender?: User;
  sender_id?: string; // Supabase sender ID
  recipient?: User;
  recipient_id?: string; // Supabase recipient ID
  conversation?: string;
  conversation_id?: string; // Supabase conversation ID
  text: string;
  content?: string; // Add content property
  mediaUrl?: string;
  media_url?: string; // Supabase media URL
  mediaType?: 'image' | 'video';
  media_type?: 'image' | 'video'; // Supabase media type
  read: boolean;
  createdAt?: string;
  created_at?: string; // Supabase created at
  updatedAt?: string;
  updated_at?: string; // Supabase updated at
  pending?: boolean;
  failed?: boolean; // Add failed flag for failed messages
  client_id?: string; // Add client ID for tracking messages
  _delivery_status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'; // Add delivery status
  _delivery_timestamp?: string; // Add delivery timestamp
  _read_timestamp?: string; // Add read timestamp
  _delivery_type?: 'direct' | 'room' | 'queued' | 'direct_db' | 'room_db' | 'queued_db'; // Add delivery type
  _metadata?: {
    socket_id?: string;
    timestamp?: number;
    from_database?: boolean;
  };
}

// Updated Conversation interface to support both MongoDB and Supabase formats
interface Conversation {
  _id?: string;
  id?: string; // Supabase ID
  participants: User[] | string[]; // Can be array of Users or string IDs
  lastMessage?: Message;
  last_message?: Message; // Add last_message property to match usage in ChatListScreen
  last_message_id?: string; // Supabase last message ID
  createdAt?: string;
  created_at?: string; // Supabase created at
  updatedAt?: string;
  updated_at?: string; // Supabase updated at
  typing_users?: string[]; // Add typing users array
  unread_count?: number; // Add unread count field
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
  markMessagesAsRead: (conversationId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => void;
  resendMessage: (message: Message) => Promise<Message | null>;
}

// Create Context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider Component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUserState] = useState<User | null>(authUser);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  // Helper to normalize message data to a consistent format
  const normalizeMessage = (message: any): Message => {
    if (!message) return {
      text: '',
      read: false
    };

    // Create a unique ID if none exists
    const messageId = message._id || message.id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Ensure conversation ID is consistent
    const conversationId = message.conversation_id || message.conversation;
    if (!conversationId) {
      console.warn('Message missing conversation ID:', messageId);
    }

    // Ensure sender has profile picture
    let sender = message.sender || { _id: message.sender_id };
    if (sender && !sender.profilePicture && message.sender_profile_picture) {
      sender = { ...sender, profilePicture: message.sender_profile_picture };
    }

    return {
      _id: messageId,
      id: messageId,
      sender: sender,
      sender_id: message.sender_id || (message.sender?._id),
      recipient: message.recipient || { _id: message.recipient_id },
      recipient_id: message.recipient_id || (message.recipient?._id),
      conversation: conversationId,
      conversation_id: conversationId,
      text: message.text || '',
      mediaUrl: message.mediaUrl || message.media_url,
      media_url: message.media_url || message.mediaUrl,
      mediaType: message.mediaType || message.media_type,
      media_type: message.media_type || message.mediaType,
      read: typeof message.read === 'boolean' ? message.read : false,
      createdAt: message.createdAt || message.created_at || new Date().toISOString(),
      created_at: message.created_at || message.createdAt || new Date().toISOString(),
      updatedAt: message.updatedAt || message.updated_at,
      updated_at: message.updated_at || message.updatedAt,
      pending: message.pending || false,
      failed: message.failed || false,
      _delivery_status: message._delivery_status || 'sent',
      _delivery_timestamp: message._delivery_timestamp,
      _read_timestamp: message._read_timestamp,
      _delivery_type: message._delivery_type,
      _metadata: {
        socket_id: message._metadata?.socket_id || socket?.id,
        timestamp: Date.now(),
        from_database: Boolean(message._id || message.id)
      }
    };
  };

  // Helper to normalize conversation objects
  const normalizeConversation = (conversation: any): Conversation => {
    // Process participants to ensure we always have an array
    let normalizedParticipants: any[] = [];

    if (conversation.participants) {
      if (Array.isArray(conversation.participants)) {
        normalizedParticipants = conversation.participants;
      } else if (typeof conversation.participants === 'object') {
        // Handle some weird API responses that might have participants as an object
        normalizedParticipants = Object.values(conversation.participants);
      }
    }

    // Ensure we have objects for participants whenever possible
    normalizedParticipants = normalizedParticipants.map((p: any) => {
      // If it's a string ID but has a matching user object in participants_data, use that
      if (typeof p === 'string' && conversation.participants_data) {
        const userData = conversation.participants_data.find((u: any) =>
          u._id === p || u.id === p
        );
        if (userData) {
          return userData;
        }
      }
      return p;
    });

    // Create normalized conversation object
    const normalized: Conversation = {
      _id: conversation._id || conversation.id,
      id: conversation.id || conversation._id,
      participants: normalizedParticipants,
      created_at: conversation.created_at || conversation.createdAt,
      updated_at: conversation.updated_at || conversation.updatedAt,
      lastMessage: conversation.lastMessage || conversation.last_message,
      unread_count: conversation.unread_count || 0
    };

    return normalized;
  };

  // Initialize socket connection when user logs in
  useEffect(() => {
    if (user) {
      // Connect to socket server
      const newSocket = io(SOCKET_URL);

      // Set up connection handlers
      newSocket.on('connect', () => {
        // console.log('Connected to socket server:', newSocket.id);

        // Authenticate socket with user ID
        newSocket.emit('authenticate', user._id);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      newSocket.on('disconnect', (reason) => {
        // console.log('Socket disconnected:', reason);
      });

      // Store socket in state and ref
      setSocket(newSocket);
      socketRef.current = newSocket;

      // Clean up on unmount
      return () => {
        // console.log('Cleaning up socket connection');
        newSocket.disconnect();
        setSocket(null);
        socketRef.current = null;
      };
    }
  }, [user]);

  // Set up global message listener
  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages globally
    const handleReceiveMessage = (message: any) => {
      // Normalize message format first
      const normalizedMessage = normalizeMessage(message);

      // Filter out test messages
      const messageText = (normalizedMessage.text || normalizedMessage.content || '').toLowerCase();
      if (messageText.includes('hello from supabase') ||
        messageText.includes('reply from supabase')) {
        return;
      }

      // Get conversation ID from message
      const messageConvoId = normalizedMessage.conversation_id || normalizedMessage.conversation;
      if (!messageConvoId) {
        console.error('Received message without conversation ID:', normalizedMessage);
        return;
      }

      // If we received direct delivery, confirm it back to sender
      if (normalizedMessage.sender_id !== user?._id &&
        (normalizedMessage._delivery_type === 'direct' ||
          normalizedMessage._delivery_type === 'direct_db')) {
        // Send delivery confirmation
        socket.emit('confirm_delivery', {
          messageId: normalizedMessage._id || normalizedMessage.id,
          conversationId: messageConvoId,
          senderId: normalizedMessage.sender_id
        });
      }

      // Only update messages if this message belongs to the current conversation
      if (currentConversation) {
        const currentConvoId = currentConversation._id || currentConversation.id;

        // Strict conversation matching
        if (currentConvoId === messageConvoId) {
          setMessages((prevMessages) => {
            // Check for duplicates using both ID formats and metadata
            const existingMessageIndex = prevMessages.findIndex(m => {
              // Check both ID formats
              if ((m._id && normalizedMessage._id && m._id === normalizedMessage._id) ||
                (m.id && normalizedMessage.id && m.id === normalizedMessage.id)) {
                return true;
              }

              // If message has exact same text, sender and approximate timestamp, it's likely the same
              if (m.text === normalizedMessage.text &&
                m.sender_id === normalizedMessage.sender_id) {
                // Get timestamps in Unix time
                const mTime = new Date(m.created_at || m.createdAt || 0).getTime();
                const newTime = new Date(normalizedMessage.created_at || normalizedMessage.createdAt || 0).getTime();

                // If timestamps are within 1 minute, consider it the same message
                if (Math.abs(mTime - newTime) < 60000) {
                  return true;
                }
              }

              return false;
            });

            if (existingMessageIndex !== -1) {
              // Update existing message instead of adding duplicate
              const updatedMessages = [...prevMessages];
              const existingMsg = updatedMessages[existingMessageIndex];

              // Merge properties, prefer values from database message if it has _from_database flag
              updatedMessages[existingMessageIndex] = {
                ...existingMsg,
                ...normalizedMessage,
                // Only update read status if message is actually marked as read
                read: normalizedMessage.read || existingMsg.read,
                // Keep ID consistent
                _id: existingMsg._id || normalizedMessage._id,
                id: existingMsg.id || normalizedMessage.id,
                // Update delivery status if newer
                _delivery_status: normalizedMessage._delivery_status || existingMsg._delivery_status,
                // If was pending before, mark as not pending now
                pending: false
              };

              return updatedMessages;
            }

            // This is a new message, add it to the list
            return [...prevMessages, normalizedMessage];
          });
        }
      }

      // Update conversations list with new message
      setConversations((prevConversations) => {
        // Find if conversation exists in the list
        const conversationIndex = prevConversations.findIndex((c) =>
          (c._id && c._id === messageConvoId) || (c.id && c.id === messageConvoId)
        );

        if (conversationIndex !== -1) {
          // Update the conversation with the new message
          const updatedConversations = [...prevConversations];
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            lastMessage: normalizedMessage,
            last_message: normalizedMessage,
            updatedAt: normalizedMessage.createdAt || normalizedMessage.created_at || new Date().toISOString(),
            updated_at: normalizedMessage.created_at || normalizedMessage.createdAt || new Date().toISOString(),
            // If message is from someone else and we're not in the conversation, increment unread count
            unread_count:
              normalizedMessage.sender_id !== user?._id &&
                (!currentConversation ||
                  (currentConversation._id !== messageConvoId && currentConversation.id !== messageConvoId))
                ? (updatedConversations[conversationIndex].unread_count || 0) + 1
                : updatedConversations[conversationIndex].unread_count
          };

          // Move the updated conversation to the top
          const [updatedConvo] = updatedConversations.splice(conversationIndex, 1);
          return [updatedConvo, ...updatedConversations];
        }

        // No matching conversation found - this is uncommon but possible with direct messages
        // We should fetch the conversation details in a real implementation
        return prevConversations;
      });

      // Increment global unread count if message is from someone else and we're not viewing the conversation
      if (normalizedMessage.sender_id !== user?._id &&
        (!currentConversation ||
          (currentConversation._id !== messageConvoId && currentConversation.id !== messageConvoId))) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    // Handle read receipts
    const handleMessagesRead = (data: any) => {
      const { conversationId, userId, timestamp } = data;

      if (userId === user?._id) return; // Ignore our own read receipts

      // Update message read status in the current conversation
      if (currentConversation) {
        const currentConvoId = currentConversation._id || currentConversation.id;

        if (currentConvoId === conversationId) {
          setMessages(prevMessages =>
            prevMessages.map(msg => {
              // Only update messages sent by the current user
              if (msg.sender_id === user?._id || (msg.sender && msg.sender._id === user?._id)) {
                return {
                  ...msg,
                  read: true,
                  _read_timestamp: timestamp,
                  _delivery_status: 'read'
                };
              }
              return msg;
            })
          );
        }
      }
    };

    // Handle single message read receipt
    const handleMessageRead = (data: any) => {
      const { conversationId, messageId, userId, timestamp } = data;

      if (userId === user?._id) return; // Ignore our own read receipts

      // Update read status for specific message
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if ((msg._id === messageId || msg.id === messageId) &&
            (msg.sender_id === user?._id || (msg.sender && msg.sender._id === user?._id))) {
            return {
              ...msg,
              read: true,
              _read_timestamp: timestamp,
              _delivery_status: 'read'
            };
          }
          return msg;
        })
      );
    };

    // Handle delivery receipt
    const handleMessageDelivered = (data: any) => {
      const { conversationId, messageId, status, timestamp } = data;

      // Update delivery status for specific message
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg._id === messageId || msg.id === messageId) {
            return {
              ...msg,
              _delivery_status: status,
              _delivery_timestamp: timestamp,
              pending: false
            };
          }
          return msg;
        })
      );
    };

    // Handle typing indicator
    const handleTyping = (data: any) => {
      const { conversationId, userId } = data;

      if (userId === user?._id) return; // Ignore our own typing indicators

      // Update typing status in conversations
      setConversations(prevConversations =>
        prevConversations.map(convo => {
          if ((convo._id === conversationId || convo.id === conversationId)) {
            // Add userId to typing_users array if not already there
            const typingUsers = convo.typing_users || [];
            if (!typingUsers.includes(userId)) {
              return {
                ...convo,
                typing_users: [...typingUsers, userId]
              };
            }
          }
          return convo;
        })
      );
    };

    // Handle stop typing
    const handleStopTyping = (data: any) => {
      const { conversationId, userId } = data;

      if (userId === user?._id) return; // Ignore our own typing indicators

      // Remove user from typing_users array
      setConversations(prevConversations =>
        prevConversations.map(convo => {
          if ((convo._id === conversationId || convo.id === conversationId) && convo.typing_users) {
            return {
              ...convo,
              typing_users: convo.typing_users.filter(id => id !== userId)
            };
          }
          return convo;
        })
      );
    };

    // Add event listeners
    socket.on('receive_message', handleReceiveMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_read', handleMessageRead);
    socket.on('message_seen', handleMessageRead);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    // Clean up on unmount
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_read', handleMessageRead);
      socket.off('message_seen', handleMessageRead);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, user, currentConversation]);

  // Get all conversations for the current user
  const getConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Normalize conversations to ensure consistent format
      const normalizedConversations = response.data.map((conv: any) => {
        // Ensure both lastMessage and last_message are set
        const lastMessage = conv.lastMessage || conv.last_message;
        return {
          ...conv,
          id: conv._id || conv.id,
          lastMessage,
          last_message: lastMessage,
          participants: conv.participants || [],
          createdAt: conv.createdAt || conv.created_at,
          updatedAt: conv.updatedAt || conv.updated_at,
          typing_users: conv.typing_users || [],
          unread_count: conv.unread_count || 0,
        };
      });

      // Deduplicate conversations
      const uniqueConversations = deduplicateConversations(normalizedConversations);

      setConversations(uniqueConversations);
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

      // Normalize the conversation to handle both MongoDB and Supabase formats
      const normalizedConversation = normalizeConversation(response.data);

      // Update the conversations list using deduplication
      const conversationId = normalizedConversation._id || normalizedConversation.id;
      const exists = conversations.some(c =>
        (c._id && c._id === conversationId) || (c.id && c.id === conversationId)
      );

      if (!exists) {
        // Add new conversation to the list and deduplicate
        updateConversations([normalizedConversation, ...conversations]);
      }

      setCurrentConversation(normalizedConversation);
      setIsLoading(false);
      return normalizedConversation;
    } catch (error: any) {
      console.error('Error getting/creating conversation:', error);
      setError(error.response?.data?.message || 'Failed to start conversation');
      setIsLoading(false);
      return null;
    }
  };

  // Get messages for a conversation
  const getMessages = async (conversationId: string, page = 1, limit = 50) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/api/chat/messages/${conversationId}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // Handle the potentially different response structure from Supabase
      const messagesData = response.data.messages || response.data;

      // Normalize messages and ensure strict conversation filtering
      const normalizedMessages = Array.isArray(messagesData)
        ? messagesData
          .map(msg => normalizeMessage({ ...msg, conversation_id: conversationId }))
          .filter(msg => {
            // Filter out test messages
            const messageText = (msg.text || '').toLowerCase();
            if (messageText.includes('hello from supabase') ||
              messageText.includes('reply from supabase')) {
              return false;
            }

            // Strict conversation ID matching
            const msgConversationId = msg.conversation_id || msg.conversation;
            return msgConversationId === conversationId;
          })
          .sort((a, b) => {
            const dateAStr = a.created_at || a.createdAt || new Date().toISOString();
            const dateBStr = b.created_at || b.createdAt || new Date().toISOString();
            return new Date(dateAStr).getTime() - new Date(dateBStr).getTime();
          })
        : [];

      // Replace all messages with the filtered set
      setMessages(normalizedMessages);
      setIsLoading(false);
    } catch (error: any) {
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
    try {
      setIsLoading(true);

      // Validate inputs
      if (!recipientId || !text) {
        throw new Error('Recipient ID and message text are required');
      }

      // Generate a client-side ID for the message
      const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create message object
      const messageData = {
        text,
        recipientId: recipientId,
        media_url: mediaUrl,
        media_type: mediaType,
        // Add client-generated ID for tracking
        client_id: clientMessageId
      };

      // If we have a conversation ID, include it
      if (currentConversation) {
        const conversationId = currentConversation._id || currentConversation.id;
        if (conversationId) {
          // @ts-ignore: Add conversation ID to message data
          messageData.conversation_id = conversationId;
        }
      }

      // First, emit the message via socket for instant delivery (like Instagram)
      // This lets the recipient see the message before it's saved to the database
      if (socket) {
        const socketMessage = {
          ...messageData,
          sender_id: user?._id,
          // Use client ID as temporary ID
          _id: clientMessageId,
          id: clientMessageId,
          created_at: new Date().toISOString(),
          conversation_id: currentConversation ? currentConversation._id || currentConversation.id : undefined,
          read: false,
          // Ensure we're using recipientId for consistency
          recipientId: recipientId,
          // Add sender data to help recipient render message immediately
          sender: user
        };

        // Send via socket first
        socket.emit('send_message', socketMessage);
      }

      // Then save to the database (API call)
      const response = await axios.post(
        `${API_URL}/api/chat/messages`,
        messageData,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );

      // Log response for debugging
      console.log('Message API response:', JSON.stringify(response.data));

      // Handle response - check both formats for backward compatibility
      const serverMessage = response.data && response.data.message
        ? response.data.message    // New format: { message: {...} }
        : response.data;           // Old format: {...}

      // Log parsed message
      console.log('Parsed server message:', serverMessage ? 'Found message data' : 'No message data found');

      if (serverMessage) {
        // Normalize message format
        const normalizedMessage = normalizeMessage({
          ...serverMessage,
          // Make sure sender info is correct 
          sender: user,
          sender_id: user?._id,
          // Add client ID for tracking
          client_id: clientMessageId
        });

        // Update messages state with server-provided message data
        setMessages(prev => {
          // Check if this message already exists in our list by client ID
          const existingIndex = prev.findIndex(m =>
            m.client_id === clientMessageId ||
            m.text === normalizedMessage.text &&
            Math.abs(new Date(m.created_at || m.createdAt || 0).getTime() -
              new Date(normalizedMessage.created_at || normalizedMessage.createdAt || 0).getTime()) < 60000
          );

          if (existingIndex !== -1) {
            // Update the existing message instead of adding a duplicate
            const updatedMessages = [...prev];
            updatedMessages[existingIndex] = {
              ...updatedMessages[existingIndex],
              ...normalizedMessage,
              // Preserve key fields
              _id: normalizedMessage._id || normalizedMessage.id || updatedMessages[existingIndex]._id,
              id: normalizedMessage.id || normalizedMessage._id || updatedMessages[existingIndex].id,
              // Mark as no longer pending
              pending: false,
              _delivery_status: 'sent'
            };
            return updatedMessages;
          }

          // Add as a new message if not found
          return [...prev, normalizedMessage];
        });

        // Update conversations list with new message
        if (currentConversation) {
          const convoId = currentConversation._id || currentConversation.id;
          updateConversationWithMessage(convoId, normalizedMessage);
        }

        setError(null);
        setIsLoading(false);
        return normalizedMessage;
      }

      setIsLoading(false);
      return null;
    } catch (err: any) {
      console.error('Error sending message:', err);
      console.error('Response data:', err.response?.data);

      setError(err.response?.data?.message || err.message || 'Failed to send message');
      setIsLoading(false);

      // Throw the error so it can be handled by the component
      throw err;
    }
  };

  // Helper function to update a conversation with a new message
  const updateConversationWithMessage = (conversationId: string | undefined, message: Message) => {
    if (!conversationId) return;

    setConversations(prev => {
      // Find the conversation to update
      const index = prev.findIndex(c =>
        (c._id && c._id === conversationId) ||
        (c.id && c.id === conversationId)
      );

      if (index !== -1) {
        // Create a copy of the conversations array
        const updated = [...prev];

        // Update the last message and timestamp
        updated[index] = {
          ...updated[index],
          lastMessage: message,
          last_message: message,
          updatedAt: message.createdAt || message.created_at || new Date().toISOString(),
          updated_at: message.created_at || message.createdAt || new Date().toISOString()
        };

        // Move conversation to top of the list
        const [updatedConvo] = updated.splice(index, 1);
        return [updatedConvo, ...updated];
      }

      return prev;
    });
  };

  // Add a resend message function
  const resendMessage = async (message: Message) => {
    try {
      // For resending, we need the recipient ID and text at minimum
      if (!message.recipient_id || !message.text) {
        throw new Error('Cannot resend message: missing recipient or text');
      }

      // Mark as no longer failed
      const updatedMessage: Message = {
        ...message,
        failed: false,
        pending: true,
        _delivery_status: 'sending'
      };

      // Update message in state to show it's being resent
      setMessages(prev => prev.map(m =>
        (m._id === message._id || m.id === message.id) ? updatedMessage : m
      ));

      // Send via socket for instant delivery
      if (socket && message.conversation_id) {
        socket.emit('send_message', {
          ...updatedMessage,
          sender_id: user?._id,
          sender: user,
          created_at: new Date().toISOString() // Use new timestamp
        });
      }

      // Try saving to database again
      const result = await sendMessage(
        message.recipient_id,
        message.text,
        message.mediaUrl || message.media_url,
        message.mediaType || message.media_type
      );

      return result;
    } catch (err) {
      console.error('Error resending message:', err);

      // Mark as failed again
      setMessages(prev => prev.map(m =>
        (m._id === message._id || m.id === message.id)
          ? { ...m, failed: true, pending: false, _delivery_status: 'failed' }
          : m
      ));

      return null;
    }
  };

  // Join a conversation room
  const joinConversation = (conversationId: string) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  };

  // Leave a conversation room
  const leaveConversation = (conversationId: string) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit('leave_conversation', conversationId);
    }
  };

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
        // console.log('Invalid unread count data received:', response.data);
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

  // Helper function to deduplicate conversations by participant
  const deduplicateConversations = useCallback((convos: Conversation[]): Conversation[] => {
    // Track seen user IDs to avoid duplicates
    const seenParticipantPairs = new Map<string, string>();
    const uniqueConversations: Conversation[] = [];

    // Sort by most recent first (based on last message or creation date)
    const sortedConvos = [...convos].sort((a, b) => {
      const timeA = a.lastMessage?.created_at || a.created_at || '';
      const timeB = b.lastMessage?.created_at || b.created_at || '';
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    for (const convo of sortedConvos) {
      // Get participants excluding current user
      const participants = Array.isArray(convo.participants) ? convo.participants : [];
      const otherParticipants = participants.filter(p => {
        const participantId = typeof p === 'string' ? p : p._id;
        return participantId !== user?._id;
      });

      // Skip conversations with no other participants
      if (otherParticipants.length === 0) continue;

      // Generate a key for this participant set
      const otherParticipantIds = otherParticipants.map(p =>
        typeof p === 'string' ? p : p._id
      ).sort().join('-');

      // Skip if we've already seen this participant combination
      if (seenParticipantPairs.has(otherParticipantIds)) {
        // console.log(`Skipping duplicate conversation with: ${otherParticipantIds}`);
        continue;
      }

      // Mark as seen and keep this conversation
      seenParticipantPairs.set(otherParticipantIds, convo._id || convo.id || '');
      uniqueConversations.push(convo);
    }

    return uniqueConversations;
  }, [user?._id]);

  // Apply deduplication to conversations before setting in state
  const updateConversations = useCallback((newConversations: Conversation[]) => {
    const uniqueConversations = deduplicateConversations(newConversations);
    // console.log(`Filtered conversations from ${newConversations.length} to ${uniqueConversations.length} unique conversations`);
    setConversations(uniqueConversations);
  }, [deduplicateConversations]);

  // Mark messages as read
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user || !socket) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/chat/messages/mark_as_read`,
        { conversationId },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // console.log('Marked messages as read:', response.data);

      // Emit socket event to notify other users
      socket.emit('mark_read', { conversationId });

      // Update local message state to mark all as read
      setMessages(prev => {
        return prev.map(message => {
          if (message.conversation_id === conversationId && message.recipient_id === user._id) {
            return { ...message, read: true };
          }
          return message;
        });
      });

      // Update unread count in conversation state
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if ((conv._id || conv.id) === conversationId) {
            return { ...conv, unread_count: 0 };
          }
          return conv;
        });

        // Apply deduplication
        return deduplicateConversations(updatedConversations);
      });

      // Update global unread count
      getUnreadCount();

      return response.data;
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      return { success: false, error: error.message };
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    if (!user || !socket) return;

    try {
      const response = await axios.put(
        `${API_URL}/api/chat/conversations/${conversationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // Update local state
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if ((conv._id || conv.id) === conversationId) {
            return { ...conv, unread_count: 0 };
          }
          return conv;
        });
        return deduplicateConversations(updatedConversations);
      });

      // Emit socket event to notify other users
      socket.emit('conversation_read', { conversationId });

      // Update global unread count
      getUnreadCount();

      return response.data;
    } catch (error: any) {
      console.error('Error marking conversation as read:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user || !socket) return;

    try {
      const response = await axios.delete(
        `${API_URL}/api/chat/conversations/${conversationId}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // Remove from local state
      setConversations(prev =>
        deduplicateConversations(prev.filter(conv =>
          (conv._id || conv.id) !== conversationId
        ))
      );

      // Clear current conversation if it was deleted
      if (currentConversation &&
        (currentConversation._id === conversationId || currentConversation.id === conversationId)) {
        setCurrentConversation(null);
        setMessages([]);
      }

      // Emit socket event to notify other participants
      socket.emit('conversation_deleted', { conversationId });

      return response.data;
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      setError(error.response?.data?.message || 'Failed to delete conversation');
      return { success: false, error: error.message };
    }
  };

  const value = {
    socket,
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    unreadCount,
    getConversations,
    getMessages,
    sendMessage,
    joinConversation,
    leaveConversation,
    setCurrentConversation,
    clearChatError,
    getUnreadCount,
    markMessagesAsRead,
    getOrCreateConversation,
    markConversationAsRead,
    deleteConversation,
    resendMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook to use the chat context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext; 