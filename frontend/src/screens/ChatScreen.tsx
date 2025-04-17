import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { DEFAULT_AVATAR, API_URL } from '../utils/config';
import { fetchUserData } from '../utils/helpers';
import { Message } from '../context/ChatContext';
import { User } from '../types/User';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface ChatScreenProps {
  navigation: any;
  route: any;
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  // Make sure route.params exist with safe defaults to prevent hooks from being skipped
  const params = route.params || {};
  const chatId = params.chatId || null;
  const routeUserId = params.userId || null;
  const name = params.name || 'Chat';

  // Add a state variable to track the UI state (loading, error, or normal)
  const [uiState, setUiState] = useState<'normal' | 'loading' | 'error'>('normal');

  const [recipientId, setRecipientId] = useState<string | undefined>(routeUserId);
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
    clearChatError,
    socket,
    markMessagesAsRead
  } = useChatContext();
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(chatId || null);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add validation for route params
  useEffect(() => {
    // Log route parameters for debugging
    // console.log("Route params received:", JSON.stringify(params));

    // Validate required parameters
    if (!routeUserId && !chatId) {
      console.error("Missing both userId and chatId in route params");
      Alert.alert(
        "Error",
        "Cannot open chat: Missing user or conversation information",
        [{ text: "Go Back", onPress: () => navigation.goBack() }]
      );
    }
  }, []);

  // Auto-scroll to the bottom when new messages arrive
  const scrollToBottom = useCallback((animated = false) => {
    if (flatListRef.current && (localMessages.length + optimisticMessages.length) > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  }, [localMessages.length, optimisticMessages.length]);

  // Sync messages from context to local state to ensure UI updates
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Syncing messages from context:', messages.length);

      // Create a map of existing local messages by ID for faster lookup
      const existingMessageMap = new Map();
      localMessages.forEach(msg => {
        const msgId = msg._id || msg.id;
        if (msgId) {
          existingMessageMap.set(msgId, msg);
        }
      });

      // Create a map of optimistic messages by text+sender for deduplication
      const optimisticMessageKeys = new Set();
      optimisticMessages.forEach(msg => {
        const key = `${msg.text}-${msg.sender_id}`;
        optimisticMessageKeys.add(key);
      });

      // Filter messages from context
      const uniqueMessages = messages.reduce((acc: any[], message: any) => {
        const messageId = message._id || message.id;
        const messageText = (message.text || '').toLowerCase();
        const msgKey = `${message.text}-${message.sender_id}`;

        // Skip test messages
        if (messageText.includes('hello from supabase') ||
          messageText.includes('reply from supabase')) {
          return acc;
        }

        // Skip messages that don't belong to current conversation
        const msgConversationId = message.conversation_id || message.conversation;
        if (conversationId && msgConversationId !== conversationId) {
          console.debug(`Filtering out message from different conversation. Expected ${conversationId}, got ${msgConversationId}`);
          return acc;
        }

        // If the message already exists in local messages, merge properties
        if (messageId && existingMessageMap.has(messageId)) {
          const existingMsg = existingMessageMap.get(messageId);
          // Merge, preferring newer properties but keeping read status
          const mergedMsg = {
            ...existingMsg,
            ...message,
            read: message.read || existingMsg.read, // Prefer 'read' status
            _id: messageId,
            id: messageId
          };
          acc.push(mergedMsg);
          // Remove from the map so we don't add duplicates
          existingMessageMap.delete(messageId);
        }
        // If message exists as an optimistic message, skip it (will be handled separately)
        else if (optimisticMessageKeys.has(msgKey)) {
          // The message is already showing as an optimistic message, don't duplicate
          return acc;
        }
        // Otherwise, add the new message
        else {
          acc.push(message);
        }

        return acc;
      }, []);

      // Add all remaining local messages (ones not in the context)
      existingMessageMap.forEach(localMsg => {
        // Don't add messages that are already represented in optimistic messages
        const localMsgKey = `${localMsg.text}-${localMsg.sender_id}`;
        if (!optimisticMessageKeys.has(localMsgKey)) {
          uniqueMessages.push(localMsg);
        }
      });

      // Sort messages by timestamp
      const sortedMessages = [...uniqueMessages].sort((a, b) => {
        const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
        const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
        return aTime - bTime;
      });

      // Don't overwrite local messages, merge with them
      setLocalMessages(sortedMessages);

      // Carefully clean up optimistic messages to avoid duplicates
      // but keep those that haven't been confirmed yet
      setOptimisticMessages(prev => {
        return prev.filter(optMsg => {
          // Keep optimistic messages that aren't represented in real messages
          return !messages.some(realMsg =>
            // Check ID if available
            ((realMsg._id && optMsg._id && realMsg._id === optMsg._id) ||
              (realMsg.id && optMsg.id && realMsg.id === optMsg.id)) ||
            // Or check content and sender if no ID match
            (realMsg.text === optMsg.text &&
              realMsg.sender_id === optMsg.sender_id &&
              // Timestamps within 1 minute
              Math.abs(new Date(realMsg.created_at || realMsg.createdAt || 0).getTime() -
                new Date(optMsg.created_at || optMsg.createdAt || 0).getTime()) < 60000)
          );
        });
      });

      // Scroll to bottom when new messages arrive
      scrollToBottom(true);
    }
  }, [messages, scrollToBottom, conversationId]);

  // Set up typing indicator socket events
  useEffect(() => {
    if (socket && conversationId) {
      // Create a variable to store timeout IDs
      let typingTimeout: NodeJS.Timeout;

      // Function to handle typing event
      const handleTyping = (data: any) => {
        if (data.conversationId === conversationId && data.userId !== user?._id) {
          // Clear any existing timeout
          if (typingTimeout) clearTimeout(typingTimeout);

          setIsTyping(true);

          // Auto-hide typing indicator after 3 seconds
          typingTimeout = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      };

      // Function to handle stop typing event
      const handleStopTyping = (data: any) => {
        if (data.conversationId === conversationId && data.userId !== user?._id) {
          setIsTyping(false);
        }
      };

      // Add event listeners
      socket.on('typing', handleTyping);
      socket.on('stop_typing', handleStopTyping);

      // Clean up listeners on unmount
      return () => {
        socket.off('typing', handleTyping);
        socket.off('stop_typing', handleStopTyping);
        if (typingTimeout) clearTimeout(typingTimeout);
      };
    }
  }, [socket, conversationId, user?._id]); // Minimize dependencies

  // Handle typing indicator emission with debounce
  useEffect(() => {
    // Ignore empty effect when dependencies aren't ready
    if (!socket || !conversationId || !user?._id) return;

    // Create a variable to track the timeout
    let typingTimeout: NodeJS.Timeout | null = null;

    // Function to emit typing event (debounced)
    const emitTyping = () => {
      // Only emit if we have a message being typed
      if (newMessage.trim()) {
        // Emit typing event
        socket.emit('typing', {
          conversationId,
          userId: user._id
        });

        // Clear any existing timeout
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }

        // Set a new timeout to emit stop_typing after 2 seconds of inactivity
        typingTimeout = setTimeout(() => {
          socket.emit('stop_typing', {
            conversationId,
            userId: user._id
          });
        }, 2000);
      }
    };

    // Call emit function when message changes
    emitTyping();

    // Cleanup function to clear timeout and emit stop_typing
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [newMessage, socket, conversationId, user?._id]); // Keep only essential dependencies

  // Direct socket message handler for instant updates
  useEffect(() => {
    if (!socket || !conversationId) return;

    // console.log("Setting up direct message listener for conversation:", conversationId);

    // Function to handle new messages coming directly from socket
    const handleDirectMessage = (data: any) => {
      const messageConvoId = data.conversation_id || data.conversation;

      // Only process messages for this conversation - strict equality check
      if (messageConvoId === conversationId) {
        console.log("Real-time message received in current conversation:", data.text);

        // Create normalized message object
        const newMessage = {
          _id: data._id || data.id || `msg_${Date.now()}`,
          id: data.id || data._id || `msg_${Date.now()}`,
          text: data.text || "",
          sender: data.sender || { _id: data.sender_id },
          sender_id: data.sender_id,
          recipient_id: data.recipient_id,
          conversation_id: conversationId,
          createdAt: data.createdAt || data.created_at || new Date().toISOString(),
          created_at: data.created_at || data.createdAt || new Date().toISOString(),
          read: true, // Mark as read since user is viewing the conversation
          _delivery_type: data._delivery_type, // Track how this message was delivered
          _delivery_status: data._delivery_status // Track delivery status
        };

        // Add to local messages WITHOUT replacing existing messages
        setLocalMessages(prev => {
          // Check if message already exists by ID to prevent duplicates
          const messageId = data._id || data.id;
          const messageText = (data.text || '').toLowerCase();

          // Skip test messages
          if (messageText.includes('hello from supabase') ||
            messageText.includes('reply from supabase')) {
            return prev;
          }

          const exists = prev.some(m =>
            (m._id && messageId && m._id === messageId) ||
            (m.id && messageId && m.id === messageId) ||
            // Also check for messages with same text and sender within 1 minute timeframe
            (m.text === data.text &&
              m.sender_id === data.sender_id &&
              Math.abs(new Date(m.created_at || m.createdAt || 0).getTime() -
                new Date(data.created_at || data.createdAt || 0).getTime()) < 60000)
          );

          if (exists) {
            // If message exists, don't add duplicate
            return prev;
          }

          // Always add message if it doesn't exist
          return [...prev, newMessage];
        });

        // IMPORTANT: DON'T clear optimistic messages completely
        // Instead, just remove the ones that match this specific message
        setOptimisticMessages(prev => {
          // Only filter out optimistic messages that match this specific message
          return prev.filter(msg => {
            const isMatch =
              // Message content matches
              msg.text === newMessage.text &&
              // Same sender
              msg.sender_id === newMessage.sender_id &&
              // Within 1 minute timeframe (to handle clock differences)
              Math.abs(new Date(msg.created_at || msg.createdAt || 0).getTime() -
                new Date(newMessage.created_at || newMessage.createdAt || 0).getTime()) < 60000;

            // Keep all messages that don't match
            return !isMatch;
          });
        });

        // Auto-scroll to show new message
        scrollToBottom(false);

        // Send delivery confirmation for message from other user
        if (socket && data.sender_id !== user?._id && data._id) {
          socket.emit('confirm_delivery', {
            messageId: data._id || data.id,
            conversationId: conversationId,
            senderId: data.sender_id
          });
        }
      }
    };

    // Handle delivery receipts
    const handleMessageDelivered = (data: any) => {
      if (data.conversationId === conversationId) {
        // Update optimistic messages to show delivered status
        setOptimisticMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId || msg.id === data.messageId) {
              return {
                ...msg,
                _delivery_status: data.status,
                _delivery_timestamp: data.timestamp,
                pending: false
              };
            }
            return msg;
          })
        );
      }
    };

    // Handle read receipts
    const handleMessageRead = (data: any) => {
      if (data.conversationId === conversationId) {
        // Update both optimistic and regular messages to show read status
        setOptimisticMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId || msg.id === data.messageId) {
              return {
                ...msg,
                read: true,
                _read_timestamp: data.timestamp,
                pending: false
              };
            }
            return msg;
          })
        );

        setLocalMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId || msg.id === data.messageId) {
              return {
                ...msg,
                read: true,
                _read_timestamp: data.timestamp
              };
            }
            return msg;
          })
        );
      }
    };

    // Handle messages_read event (multiple messages marked as read)
    const handleMessagesRead = (data: any) => {
      if (data.conversationId === conversationId && data.userId !== user?._id) {
        // Update all messages sent by the current user to show as read
        setLocalMessages(prev =>
          prev.map(msg => {
            // Only update messages sent by the current user
            if (msg.sender_id === user?._id || msg.sender?._id === user?._id) {
              return {
                ...msg,
                read: true,
                _read_timestamp: data.timestamp
              };
            }
            return msg;
          })
        );

        // Also update optimistic messages
        setOptimisticMessages(prev =>
          prev.map(msg => {
            if (msg.sender_id === user?._id || msg.sender?._id === user?._id) {
              return {
                ...msg,
                read: true,
                _read_timestamp: data.timestamp,
                pending: false
              };
            }
            return msg;
          })
        );
      }
    };

    // Add the direct message listener
    socket.on('receive_message', handleDirectMessage);

    // Add delivery and read receipt listeners
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_seen', handleMessageRead);
    socket.on('message_read', handleMessageRead);
    socket.on('messages_read', handleMessagesRead);

    // Clean up on unmount
    return () => {
      socket.off('receive_message', handleDirectMessage);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message_seen', handleMessageRead);
      socket.off('message_read', handleMessageRead);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, conversationId, user?._id, scrollToBottom]);

  // Add a function to reload conversation messages (for manual refresh)
  const reloadConversation = useCallback(async () => {
    try {
      if (!conversationId) {
        console.error("Cannot reload: No conversation ID");
        return;
      }

      // console.log(`Manually reloading conversation: ${conversationId}`);

      // Clear existing messages
      setLocalMessages([]);
      setOptimisticMessages([]);

      // Get fresh messages
      await getMessages(conversationId, 1, 100);

      // Mark as read
      await markMessagesAsRead(conversationId);

      // Scroll to bottom
      scrollToBottom(true);
    } catch (err) {
      console.error("Error reloading conversation:", err);
    }
  }, [conversationId, getMessages, markMessagesAsRead, scrollToBottom]);

  // Reload user data function
  const reloadUserData = useCallback(async () => {
    try {
      if (!routeUserId || !user?.token) {
        console.error('Missing userId or token for reloading user data');
        return;
      }

      // console.log('Reloading user data for:', routeUserId);
      navigation.setOptions({
        title: 'Loading user...',
      });

      // Use the fetchUserData helper function
      const userData = await fetchUserData(routeUserId, user.token);

      if (userData && userData.name) {
        // console.log('Successfully reloaded user data:', userData.name);

        // Update the navigation title with the user's name
        navigation.setOptions({
          title: userData.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={reloadUserData} style={{ marginRight: 10 }}>
                <Ionicons name="person-circle-outline" size={24} color="#4B0082" />
              </TouchableOpacity>
              <TouchableOpacity onPress={reloadConversation} style={{ marginRight: 15 }}>
                <Ionicons name="refresh" size={24} color="#4B0082" />
              </TouchableOpacity>
            </View>
          ),
        });
      }
    } catch (error) {
      console.error('Failed to reload user data:', error);
      // Keep the refresh button
      navigation.setOptions({
        title: 'User not found',
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={reloadUserData} style={{ marginRight: 10 }}>
              <Ionicons name="person-circle-outline" size={24} color="#4B0082" />
            </TouchableOpacity>
            <TouchableOpacity onPress={reloadConversation} style={{ marginRight: 15 }}>
              <Ionicons name="refresh" size={24} color="#4B0082" />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [routeUserId, user, navigation, reloadConversation]);

  // Set up header with title and reload buttons
  useEffect(() => {
    navigation.setOptions({
      title: name && name !== 'User not loaded' && name !== 'Loading User...' ? name : 'Chat',
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={reloadUserData} style={{ marginRight: 10 }}>
            <Ionicons name="person-circle-outline" size={24} color="#4B0082" />
          </TouchableOpacity>
          <TouchableOpacity onPress={reloadConversation} style={{ marginRight: 15 }}>
            <Ionicons name="refresh" size={24} color="#4B0082" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, name, reloadConversation, reloadUserData, conversationId]);

  // Load or create the conversation
  useEffect(() => {
    const loadConversation = async () => {
      try {
        // If we already have a conversationId, use it
        if (conversationId) {
          // console.log(`Loading messages for existing conversation: ${conversationId}`);

          // Clear any previously loaded messages first
          setLocalMessages([]);
          setOptimisticMessages([]);

          // Get messages with a larger limit to ensure we see history
          await getMessages(conversationId, 1, 50);

          // Join the conversation for real-time updates
          joinConversation(conversationId);

          // Mark messages as read both on client and server
          if (socket) {
            // console.log(`Marking messages as read in conversation: ${conversationId}`);
            socket.emit('mark_read', {
              conversationId,
              userId: user?._id
            });
          }

          // Also use the API to mark messages as read
          await markMessagesAsRead(conversationId);

          return;
        }

        // Otherwise create a new conversation with the user
        // console.log(`Creating conversation with user: ${routeUserId}`);
        const conversation = await getOrCreateConversation(routeUserId);
        if (conversation) {
          // Use the conversation ID (handle both MongoDB and Supabase formats)
          const convoId = conversation._id || conversation.id;
          if (convoId) {
            setConversationId(convoId);

            // Clear any previously loaded messages first
            setLocalMessages([]);
            setOptimisticMessages([]);

            // Get messages with a larger limit to ensure we see history
            await getMessages(convoId, 1, 50);

            // Join the conversation for real-time updates
            joinConversation(convoId);

            // Mark messages as read both on client and server
            if (socket) {
              // console.log(`Marking messages as read in new conversation: ${convoId}`);
              socket.emit('mark_read', {
                conversationId: convoId,
                userId: user?._id
              });
            }

            // Also use the API to mark messages as read
            await markMessagesAsRead(convoId);
          } else {
            console.error("Conversation has no valid ID");
          }
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
  }, [routeUserId, conversationId]);

  // Ensure recipientId is set from conversation if needed
  useEffect(() => {
    if (!recipientId && currentConversation?.participants) {
      // console.log("Attempting to extract recipient from conversation:", currentConversation);

      // Find the other participant in the conversation (not the current user)
      const participants = Array.isArray(currentConversation.participants)
        ? currentConversation.participants
        : [];

      // console.log("Participants:", JSON.stringify(participants));
      // console.log("Current user ID:", user?._id);

      // First try with objects
      let otherUser = participants.find(p => {
        if (typeof p === 'object' && p !== null) {
          return p._id !== user?._id;
        }
        return false;
      });

      // If not found, try with strings
      if (!otherUser) {
        otherUser = participants.find(p => {
          if (typeof p === 'string') {
            return p !== user?._id;
          }
          return false;
        });
      }

      // Set the recipientId using the other user's ID
      if (otherUser) {
        const otherId = typeof otherUser === 'string' ? otherUser : otherUser._id;
        // console.log("Setting recipientId from conversation participants:", otherId);
        setRecipientId(otherId);
      } else {
        console.error("Could not find other participant in conversation");
      }
    }
  }, [currentConversation, user, recipientId]);

  // Get recipient ID from messages if needed
  useEffect(() => {
    if (!recipientId && messages.length > 0) {
      // console.log("No recipient ID yet, trying to extract from messages");

      // Look through messages to find the other user
      for (const message of messages) {
        const senderId = message.sender?._id || message.sender_id;
        const recipientId = message.recipient?._id || message.recipient_id;

        // console.log(`Message - sender: ${senderId}, recipient: ${recipientId}, current: ${user?._id}`);

        // If sender is not current user, that's our recipient
        if (senderId && senderId !== user?._id) {
          // console.log("Found recipient from message sender:", senderId);
          setRecipientId(senderId);
          break;
        }

        // If recipient is not current user, that's our recipient
        if (recipientId && recipientId !== user?._id) {
          // console.log("Found recipient from message recipient:", recipientId);
          setRecipientId(recipientId);
          break;
        }
      }
    }
  }, [messages, user, recipientId]);

  // Scroll to bottom when keyboard appears or component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Make sure messages are displayed properly on component mount
  useEffect(() => {
    // Ensure messages are loaded if none are present
    if (!isLoading && localMessages.length === 0 && conversationId) {
      // console.log('No messages found in local state, trying to load more');
      getMessages(conversationId, 1, 100);
    }

    // Scroll to bottom on initial load
    const initialScrollTimer = setTimeout(() => {
      scrollToBottom(false);
    }, 500);

    return () => clearTimeout(initialScrollTimer);
  }, [conversationId]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Leave conversation if we're in one
      if (conversationId) {
        leaveConversation(conversationId);
      }

      // Clear all messages in local state
      setLocalMessages([]);
      setOptimisticMessages([]);

      // Reset typing state
      setIsTyping(false);
    };
  }, []);

  const handleSendMessage = async () => {
    const messageText = newMessage.trim();
    if (messageText === '') return;

    try {
      // Determine recipient ID - first try direct recipientId
      let messageRecipientId = recipientId;

      // If no direct recipientId, try from conversation
      if (!messageRecipientId && currentConversation?.participants) {
        console.log("Trying to extract recipient from conversation participants");
        const participants = Array.isArray(currentConversation.participants)
          ? currentConversation.participants
          : [];

        // First try to find another user in the conversation
        const otherUser = participants.find(p => {
          const participantId = typeof p === 'string' ? p : p?._id;
          return participantId && participantId !== user?._id;
        });

        if (otherUser) {
          messageRecipientId = typeof otherUser === 'string' ? otherUser : otherUser._id;
          console.log("Found recipient from conversation:", messageRecipientId);
          setRecipientId(messageRecipientId); // Update state for future messages
        }
      }

      // As a last resort, try to extract from messages
      if (!messageRecipientId && messages.length > 0) {
        console.log("Looking for recipient in message history");
        for (const message of messages) {
          // If we're replying to a message from someone else, use their ID
          if ((message.sender?._id || message.sender_id) !== user?._id) {
            messageRecipientId = message.sender?._id || message.sender_id;
            console.log("Found recipient from message history:", messageRecipientId);
            setRecipientId(messageRecipientId); // Update state for future messages
            break;
          }
        }
      }

      // Check if we have a valid recipient ID now
      if (!messageRecipientId) {
        console.error("Missing recipient ID - cannot send message");
        Alert.alert('Error', 'Cannot send message: Recipient not found');
        return;
      }

      console.log("Sending message to recipient:", messageRecipientId);

      // Store original message text and clear input field immediately for better UX
      const originalMessageText = messageText;
      setNewMessage('');

      // Create a unique optimistic message ID with timestamp for sorting
      const timestamp = new Date().toISOString();
      const optimisticId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create an optimistic message to show immediately
      const optimisticMessage = {
        _id: optimisticId,
        id: optimisticId,
        text: originalMessageText,
        sender: user,
        sender_id: user?._id,
        recipient_id: messageRecipientId,
        conversation_id: conversationId,
        read: false,
        createdAt: timestamp,
        created_at: timestamp,
        pending: true, // Mark as pending
        _delivery_status: 'sending' // Initial delivery status
      };

      // Add to optimistic messages
      setOptimisticMessages(prev => [...prev, optimisticMessage]);

      // Scroll to bottom after adding the optimistic message
      scrollToBottom(true);

      // Emulate Instagram behavior by emitting the message via socket immediately
      // This makes the message appear in real-time on the recipient's device
      if (socket && conversationId) {
        console.log("Emitting message via socket for real-time delivery");
        socket.emit('send_message', {
          ...optimisticMessage,
          recipientId: messageRecipientId,
          pending: undefined // Don't send pending status to other clients
        });
      } else {
        console.warn("Socket not available or missing conversation ID, real-time delivery disabled");
      }

      // Call sendMessage with the determined recipientId
      console.log("Calling API to send message");
      const result = await sendMessage(messageRecipientId, originalMessageText);

      if (!result) {
        console.error("Failed to send message - empty result from API");

        // If the actual send fails, keep the optimistic message but mark it as failed
        setOptimisticMessages(prev => {
          const updatedMessages = prev.map(msg =>
            msg._id === optimisticId
              ? { ...msg, failed: true, pending: false, _delivery_status: 'failed' }
              : msg
          );
          return updatedMessages;
        });

        // Show alert to user
        Alert.alert(
          'Message Not Sent',
          'The message could not be saved to the server. It will appear as failed in your chat.',
          [{ text: 'OK' }]
        );
      } else {
        console.log("Message sent successfully:", result.id || result._id);

        // Update the optimistic message with real message ID and marked as sent
        setOptimisticMessages(prev => {
          const updatedMessages = prev.map(msg =>
            msg._id === optimisticId
              ? {
                ...msg,
                _id: result.id || result._id,
                id: result.id || result._id,
                pending: false,
                _delivery_status: 'sent'
              }
              : msg
          );

          // Filter out duplicates that might have come in from socket
          const existingIds = new Set(localMessages.map(m => m._id || m.id));
          return updatedMessages.filter(msg => !existingIds.has(msg._id) && !existingIds.has(msg.id));
        });
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      console.error('Response status:', err.response?.status);
      console.error('Response data:', JSON.stringify(err.response?.data));

      // Create a more user-friendly error message
      let errorMessage = 'Unknown error occurred';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert(
        'Error Sending Message',
        `Failed to send message: ${errorMessage}`,
        [{ text: 'OK' }]
      );

      // Mark any optimistic messages as failed
      setOptimisticMessages(prev =>
        prev.map(msg =>
          msg.pending
            ? { ...msg, failed: true, pending: false, _delivery_status: 'failed' }
            : msg
        )
      );
    }
  };

  // Create a separate component for message items
  const MessageItem = ({
    item,
    isCurrentUser,
    senderName,
    profilePicture,
    timestamp,
    isPending,
    hasFailed,
    navigation,
    senderId,
    user,
    setLocalMessages
  }: {
    item: Message;
    isCurrentUser: boolean;
    senderName: string;
    profilePicture: string;
    timestamp: string;
    isPending: boolean;
    hasFailed: boolean;
    navigation: NativeStackNavigationProp<any>;
    senderId: string | undefined;
    user: User | null;
    setLocalMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  }) => {
    // Get delivery status indicators
    const deliveryStatus = item._delivery_status;

    // Get read status
    const isRead = item.read === true;

    // Fetch user data if needed
    useEffect(() => {
      const fetchSenderData = async () => {
        if (!isCurrentUser && senderId && user?.token && (!item.sender?.profilePicture || !item.sender?.name)) {
          try {
            const userData = await fetchUserData(senderId, user.token);
            if (userData && senderId) {
              // Update the message with the fetched user data
              setLocalMessages(prevMessages =>
                prevMessages.map(msg =>
                  msg._id === item._id || msg.id === item.id
                    ? {
                      ...msg,
                      sender: {
                        _id: senderId,
                        username: userData.username || msg.sender?.username || 'unknown',
                        name: userData.name || msg.sender?.name || 'Unknown User',
                        profilePicture: userData.profilePicture || msg.sender?.profilePicture
                      }
                    }
                    : msg
                ) as Message[]
              );
            }
          } catch (error) {
            console.error('Error fetching sender data:', error);
          }
        }
      };

      fetchSenderData();
    }, [senderId, isCurrentUser, user?.token, item._id, item.id, setLocalMessages]);

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { userId: senderId })}
            style={styles.avatarContainer}
          >
            <Image
              source={{ uri: profilePicture }}
              style={styles.avatar}
              onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isPending && styles.pendingBubble,
          hasFailed && styles.failedBubble
        ]}>
          {!isCurrentUser && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', { userId: senderId })}
              style={styles.senderNameContainer}
            >
              <Text style={styles.senderName}>
                {senderName}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            {isPending && (
              <Ionicons name="time-outline" size={12} color="#999" style={styles.statusIcon} />
            )}
            {hasFailed && (
              <TouchableOpacity onPress={() => Alert.alert('Error', 'Message failed to send')}>
                <Ionicons name="alert-circle" size={12} color="#ff6b6b" style={styles.statusIcon} />
              </TouchableOpacity>
            )}
            {!isPending && !hasFailed && isCurrentUser && (
              <>
                {deliveryStatus === 'sending' && (
                  <Ionicons name="ellipsis-horizontal" size={12} color="#999" style={styles.statusIcon} />
                )}
                {deliveryStatus === 'sent' && (
                  <Ionicons name="checkmark" size={12} color="#999" style={styles.statusIcon} />
                )}
                {deliveryStatus === 'delivered' && (
                  <Ionicons name="checkmark-done" size={12} color="#999" style={styles.statusIcon} />
                )}
                {isRead && (
                  <Ionicons name="checkmark-done" size={12} color="#4B0082" style={styles.statusIcon} />
                )}
              </>
            )}
            <Text style={styles.timestamp}>
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Update UI state based on loading and error states
  useEffect(() => {
    if (isLoading && messages.length === 0 && optimisticMessages.length === 0) {
      setUiState('loading');
    } else if (error && messages.length === 0 && optimisticMessages.length === 0) {
      setUiState('error');
    } else {
      setUiState('normal');
    }
  }, [isLoading, error, messages.length, optimisticMessages.length]);

  // Combine local and optimistic messages for rendering
  const allMessages = [...localMessages, ...optimisticMessages];

  // Check if all messages are from the same conversation
  useEffect(() => {
    // Skip if no messages
    if (messages.length === 0) return;

    // Get unique conversation IDs
    const uniqueConversationIds = new Set(
      messages.map(msg => msg.conversation_id || msg.conversation).filter(Boolean)
    );

    // Log if there are multiple conversation IDs
    if (uniqueConversationIds.size > 1) {
      console.warn(`WARNING: Messages from ${uniqueConversationIds.size} different conversations detected!`,
        Array.from(uniqueConversationIds));

      // Filter to only show messages from current conversation
      if (conversationId) {
        const filtered = messages.filter(msg =>
          (msg.conversation_id === conversationId) ||
          (msg.conversation === conversationId)
        );

        // console.log(`Filtering from ${messages.length} to ${filtered.length} messages for conversation ${conversationId}`);

        if (filtered.length < messages.length) {
          setLocalMessages(filtered);
        }
      }
    }
  }, [messages, conversationId]);

  // Preload user data when component mounts
  useEffect(() => {
    const preloadUserData = async () => {
      // Skip if we already have a name from route params
      if (name && name !== 'User not loaded' && name !== 'Loading User...') {
        // console.log('Using provided name from route params:', name);
        return;
      }

      try {
        if (!routeUserId || !user?.token) {
          console.error('Missing userId or token for preloading user data');
          return;
        }

        // console.log('Preloading user data for:', routeUserId);
        const userData = await fetchUserData(routeUserId, user.token);

        if (userData && userData.name) {
          // console.log('Successfully preloaded user data:', userData.name);
          // Update the navigation title with the user's name
          navigation.setOptions({
            title: userData.name,
          });
        }
      } catch (error) {
        console.error('Failed to preload user data:', error);
      }
    };

    preloadUserData();
  }, [routeUserId, user, name, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {uiState === 'loading' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4B0082" />
        </View>
      ) : uiState === 'error' ? (
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
                getOrCreateConversation(routeUserId);
              }
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={allMessages}
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                isCurrentUser={item.sender?._id === user?._id}
                senderName={item.sender?.name || 'User'}
                profilePicture={item.sender?.profilePicture || DEFAULT_AVATAR}
                timestamp={item.createdAt || item.created_at || new Date().toISOString()}
                isPending={item.pending === true}
                hasFailed={item.failed === true}
                navigation={navigation}
                senderId={item.sender?._id || item.sender_id}
                user={user}
                setLocalMessages={setLocalMessages}
              />
            )}
            keyExtractor={(item, index) => {
              // Generate a truly unique key based on multiple parameters
              const baseId = item._id || item.id || `temp-${Date.now()}`;
              const senderId = item.sender_id || item.sender?._id || 'unknown';
              const timestamp = item.created_at || item.createdAt || new Date().toISOString();
              // Add index to ensure uniqueness even with duplicate messages
              return `msg-${baseId}-${senderId}-${index}`;
            }}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onContentSizeChange={() => scrollToBottom(false)}
            onLayout={() => scrollToBottom(false)}
            removeClippedSubviews={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubText}>Start the conversation!</Text>
              </View>
            }
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          />

          {isTyping && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>
                {name || 'User'} is typing...
              </Text>
            </View>
          )}

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
        </>
      )}
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
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    width: '100%',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  currentUserBubble: {
    backgroundColor: '#4B0082',
    borderBottomRightRadius: 0,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
  },
  pendingBubble: {
    opacity: 0.7,
  },
  failedBubble: {
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  messageText: {
    fontSize: 16,
    flexShrink: 1,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  statusIcon: {
    marginRight: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#aaa',
    textAlign: 'right',
  },
  typingContainer: {
    padding: 5,
    paddingLeft: 15,
    backgroundColor: '#f0f0f0',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  senderNameContainer: {
    marginBottom: 4,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  deliveredIcon: {
    color: '#999',
  },
  readIcon: {
    color: '#4B0082',
  },
  sendingIcon: {
    color: '#ccc',
  },
  sentIcon: {
    color: '#999',
  },
  failedIcon: {
    color: '#ff6b6b',
  }
});
