import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_AVATAR } from '../utils/config';
import { useChatContext } from '../context/ChatContext';
import { useAuthContext } from '../context/AuthContext';

interface ChatListScreenProps {
  navigation: any;
}

export default function ChatListScreen({ navigation }: ChatListScreenProps) {
  const { conversations, getConversations, isLoading, error } = useChatContext();
  const { user } = useAuthContext();

  useEffect(() => {
    getConversations();
  }, []);

  const navigateToChat = (chatId: string, userId: string, name: string) => {
    navigation.navigate('ChatDetail', { chatId, userId, name });
  };

  const getOtherParticipant = (participants: any[]) => {
    return participants.find(p => p._id !== user?._id) || participants[0];
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

  const renderChatItem = ({ item }: any) => {
    const otherUser = getOtherParticipant(item.participants);
    const lastMessage = item.lastMessage ? item.lastMessage.text : 'Start a conversation';
    const timestamp = item.lastMessage ? formatLastMessageTime(item.lastMessage.createdAt) : '';
    const unread = item.lastMessage && !item.lastMessage.read && item.lastMessage.sender._id !== user?._id ? 1 : 0;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigateToChat(item._id, otherUser._id, otherUser.name)}
      >
        <Image
          source={{ uri: otherUser.profilePicture || DEFAULT_AVATAR }}
          style={styles.avatar}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name}>{otherUser.name}</Text>
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
  };

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
      {conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderChatItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
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
});
