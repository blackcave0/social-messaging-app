import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_AVATAR, API_URL } from '../utils/config';
import { useChatContext } from '../context/ChatContext';
import { useAuthContext } from '../context/AuthContext';
import { fetchUserData, getOtherParticipant, batchLoadUsers } from '../utils/helpers';
import axios from 'axios';

interface ChatListScreenProps {
  navigation: any;
}

// Define a minimal Conversation type for the component
type Conversation = {
  _id?: string;
  id?: string;
  participants: any[];
  lastMessage?: {
    created_at?: string;
    text?: string;
    sender_id?: string;
  };
  created_at?: string;
  unread_count?: number;
};

export default function ChatListScreen({ navigation }: ChatListScreenProps) {
  const { conversations, getConversations, isLoading, error } = useChatContext();
  const { user } = useAuthContext();
  const [enrichedConversations, setEnrichedConversations] = useState(conversations);
  const [loadedUsers, setLoadedUsers] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    getConversations();
  }, []);

  useEffect(() => {
    const enrichConversations = async () => {
      if (!conversations.length) return;

      let updatedConversations = [...conversations];
      let needsUpdate = false;

      for (let i = 0; i < updatedConversations.length; i++) {
        const convo = updatedConversations[i];

        if (!convo.participants || convo.participants.length === 0) {
          continue;
        }

        const hasStringParticipants = convo.participants.some(p => typeof p === 'string');
        if (!hasStringParticipants) {
          continue;
        }

        needsUpdate = true;

        const newParticipants = [];

        for (const participant of convo.participants) {
          if (typeof participant !== 'string') {
            newParticipants.push(participant);
            continue;
          }

          if (participant === user?._id && user) {
            newParticipants.push(user);
            continue;
          }

          // Try to fetch user data with retry logic for reliability
          let userData = null;
          let retryCount = 0;
          const maxRetries = 3;

          while (!userData && retryCount < maxRetries && user?.token) {
            try {
              // Use exponential backoff
              if (retryCount > 0) {
                const delay = Math.pow(2, retryCount) * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                // console.log(`Retry ${retryCount} fetching data for user ${participant}`);
              }

              userData = await fetchUserData(participant, user.token);
              if (userData) {
                break;
              }
            } catch (err) {
              console.error(`Attempt ${retryCount + 1} failed:`, err);
            }
            retryCount++;
          }

          if (userData) {
            // console.log(`Successfully loaded user ${userData.name} after ${retryCount} retries`);
            newParticipants.push(userData);
          } else {
            console.warn(`Failed to load user data after ${maxRetries} attempts. Using ID only: ${participant}`);
            // Create a placeholder user object instead of just using the string ID
            newParticipants.push({
              _id: participant,
              name: "User data loading...",
              profilePicture: DEFAULT_AVATAR
            });
          }
        }

        updatedConversations[i] = {
          ...convo,
          participants: newParticipants
        };
      }

      if (needsUpdate) {
        // console.log(`Updated ${updatedConversations.length} conversations with enriched user data`);
        setEnrichedConversations(updatedConversations);
      } else {
        setEnrichedConversations(conversations);
      }
    };

    enrichConversations();
  }, [conversations, user]);

  // Preload all user data once on component mount
  useEffect(() => {
    const preloadAllUserData = async () => {
      if (!conversations || !conversations.length || !user?.token) return;

      // Collect all unique user IDs from conversations
      const userIds = new Set<string>();

      conversations.forEach(convo => {
        if (!convo.participants) return;

        convo.participants.forEach(participant => {
          if (typeof participant === 'string' && participant !== user?._id) {
            userIds.add(participant);
          }
        });
      });

      console.log(`Preloading data for ${userIds.size} users...`);

      // Use the batch loader function from helpers with the required user token
      const result = await batchLoadUsers(Array.from(userIds), user.token);
      console.log(`Loaded ${Object.keys(result).length} users`);

      // Force refresh conversations (without triggering this useEffect again)
      if (result && Object.keys(result).length > 0) {
        // Update the enriched conversations with the new user data
        const updatedConversations = conversations.map(convo => {
          if (!convo.participants) return convo;

          const updatedParticipants = convo.participants.map(participant => {
            if (typeof participant === 'string') {
              return result[participant] || participant;
            }
            return participant;
          });

          return {
            ...convo,
            participants: updatedParticipants
          };
        });

        setEnrichedConversations(updatedConversations);
      }
    };

    preloadAllUserData();
  }, [conversations, user?.token]);

  const navigateToChat = (chatId: string, userId: string, name: string) => {
    navigation.navigate('ChatDetail', { chatId, userId, name });
  };

  const formatLastMessageTime = (timestamp: string) => {
    if (!timestamp) return '';

    const messageDate = new Date(timestamp);
    const now = new Date();

    // Time formatting helper
    const formatTime = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
      return `${hour12}:${minutesStr} ${ampm}`;
    };

    // Day name helper
    const getDayName = (date: Date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    };

    // Month name helper
    const getMonthName = (date: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[date.getMonth()];
    };

    // If it's today, show time
    if (messageDate.toDateString() === now.toDateString()) {
      return formatTime(messageDate);
    }

    // If it's within the last week, show day name
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return getDayName(messageDate);
    }

    // Otherwise show date
    return `${getMonthName(messageDate)} ${messageDate.getDate()}`;
  };

  // Create a separate component for chat items to properly use hooks
  const ChatItem = React.memo(({ item, navigateToChat, enrichedConversations, setEnrichedConversations, user }: any) => {
    const otherParticipant = getOtherParticipant(
      item.participants,
      user?._id || '',
      DEFAULT_AVATAR
    );

    const isUserLoading = otherParticipant.name === 'Loading User...' || otherParticipant.name === 'User data loading...';

    // If user is loading but we have ID, try to load one more time
    useEffect(() => {
      if (isUserLoading && otherParticipant._id && user?.token) {
        fetchUserData(otherParticipant._id, user.token)
          .then((userData: any) => {
            if (userData && userData.name !== 'Unknown User') {
              // User data loaded, update the conversation with the new user data
              const updatedConversations = enrichedConversations.map((c: any) => {
                if (c._id === item._id || c.id === item.id) {
                  const updatedParticipants = c.participants.map((p: any) => {
                    if (typeof p === 'string' && p === otherParticipant._id) {
                      return userData;
                    }
                    return p;
                  });

                  return {
                    ...c,
                    participants: updatedParticipants
                  };
                }
                return c;
              });

              setEnrichedConversations(updatedConversations);
            }
          })
          .catch((err: Error) => console.error('Failed to load user while rendering:', err));
      }
    }, [otherParticipant._id, isUserLoading, user?.token, setEnrichedConversations, enrichedConversations, item._id, item.id]);

    // Get the last message
    const lastMessageObj = item.lastMessage;
    const lastMessage = lastMessageObj ? (lastMessageObj.text || lastMessageObj.content || 'No message content') : 'Start a conversation';

    // Handle different timestamp formats
    const timestamp = lastMessageObj
      ? formatLastMessageTime(lastMessageObj.createdAt || lastMessageObj.created_at)
      : '';

    // Check if message is from other user (more reliable check)
    const isMessageFromOtherUser = lastMessageObj &&
      ((lastMessageObj.sender_id && lastMessageObj.sender_id === otherParticipant._id) ||
        (lastMessageObj.sender && lastMessageObj.sender._id === otherParticipant._id));

    // Only show as unread if the message is from the other user AND not read
    const unread = lastMessageObj && !lastMessageObj.read && isMessageFromOtherUser ? 1 : 0;

    // Use conversation id in the correct format
    const conversationId = item._id || item.id;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          // When opening a chat, pre-mark messages as read locally
          if (unread > 0) {
            const updatedConversations = enrichedConversations.map((c: any) => {
              if ((c._id === item._id) || (c.id === item.id)) {
                // Update the last message read status
                const lastMsg = c.lastMessage;
                if (lastMsg) {
                  return {
                    ...c,
                    lastMessage: { ...lastMsg, read: true }
                  };
                }
              }
              return c;
            });

            setEnrichedConversations(updatedConversations);
          }

          // Navigate to the chat
          navigateToChat(conversationId, otherParticipant._id, otherParticipant.name);
        }}
      >
        <Image
          source={{ uri: otherParticipant.profilePicture || DEFAULT_AVATAR }}
          style={styles.avatar}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.name, isUserLoading && styles.loadingName]}>
              {otherParticipant.name}
              {isUserLoading && ' ⟳'}
            </Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
          <View style={styles.messageRow}>
            <Text
              style={[styles.message, unread > 0 && styles.unreadMessage]}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  // Process the conversations to ensure uniqueness by participant before displaying
  const processedConversations = useMemo(() => {
    const uniqueParticipants = new Map<string, Conversation>();

    // Process each conversation
    conversations.forEach(convo => {
      // Get the other participant in the conversation
      const participants = Array.isArray(convo.participants) ? convo.participants : [];
      const otherParticipant = participants.find(p => {
        const participantId = typeof p === 'string' ? p : p._id;
        return participantId !== user?._id;
      });

      // Skip if no other participant
      if (!otherParticipant) return;

      // Get participant ID
      const otherParticipantId = typeof otherParticipant === 'string'
        ? otherParticipant
        : otherParticipant._id;

      // If we haven't seen this participant or this conversation is newer, use it
      if (!uniqueParticipants.has(otherParticipantId) ||
        (convo.lastMessage && (!uniqueParticipants.get(otherParticipantId)?.lastMessage ||
          new Date(convo.lastMessage.created_at || '').getTime() >
          new Date(uniqueParticipants.get(otherParticipantId)?.lastMessage?.created_at || '').getTime()))) {
        uniqueParticipants.set(otherParticipantId, convo);
      }
    });

    // Convert map values to array and sort by most recent message
    return Array.from(uniqueParticipants.values()).sort((a, b) => {
      const timeA = a.lastMessage?.created_at || a.created_at || '';
      const timeB = b.lastMessage?.created_at || b.created_at || '';
      // Sort descending (newest first)
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [conversations, user?._id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.emptyText}>Error loading conversations</Text>
        <Text style={styles.emptySubText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={getConversations}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {processedConversations.length > 0 ? (
        <FlatList
          data={processedConversations}
          renderItem={({ item }) => (
            <ChatItem
              item={item}
              loadedUsers={loadedUsers}
              fetchUserData={fetchUserData}
              setEnrichedConversations={setEnrichedConversations}
              navigateToChat={navigateToChat}
              enrichedConversations={enrichedConversations}
              user={user}
            />
          )}
          keyExtractor={(item) => {
            // Ensure we have a unique key even if _id and id are missing
            return item._id?.toString() || item.id?.toString() || Math.random().toString(36).substring(2, 11);
          }}
          contentContainerStyle={styles.listContent}
          onRefresh={getConversations}
          refreshing={isLoading}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubText}>
            Start messaging with users who follow you
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('UserList')}
      >
        <Ionicons name="create" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#4B0082',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4B0082',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingName: {
    color: '#999',
  },
});
