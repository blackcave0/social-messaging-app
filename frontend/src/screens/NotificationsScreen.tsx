import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_AVATAR } from '../utils/config';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'friendRequest';
  user: {
    id: string;
    name: string;
    username: string;
    profilePicture: string;
  };
  content?: string;
  timestamp: string;
  isRead: boolean;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    user: {
      id: '101',
      name: 'John Doe',
      username: 'johndoe',
      profilePicture: '',
    },
    content: 'liked your post',
    timestamp: '3m ago',
    isRead: false,
  },
  {
    id: '2',
    type: 'comment',
    user: {
      id: '102',
      name: 'Jane Smith',
      username: 'janesmith',
      profilePicture: '',
    },
    content: 'commented: "This is amazing!"',
    timestamp: '15m ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'follow',
    user: {
      id: '103',
      name: 'Robert Johnson',
      username: 'robertj',
      profilePicture: '',
    },
    content: 'started following you',
    timestamp: '2h ago',
    isRead: true,
  },
  {
    id: '4',
    type: 'friendRequest',
    user: {
      id: '104',
      name: 'Emily Davis',
      username: 'emilyd',
      profilePicture: '',
    },
    content: 'sent you a friend request',
    timestamp: '1d ago',
    isRead: true,
  },
];

export default function NotificationsScreen({ navigation }: { navigation: any }) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    // In a real app, you would fetch new notifications here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications(prevNotifications => 
      prevNotifications.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        // Navigate to the post
        // navigation.navigate('Post', { postId: 'some-id' });
        break;
      case 'follow':
      case 'friendRequest':
        // Navigate to user profile
        navigation.navigate('UserProfile', { userId: notification.user.id });
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Ionicons name="heart" size={20} color="#e74c3c" />;
      case 'comment':
        return <Ionicons name="chatbubble" size={20} color="#3498db" />;
      case 'follow':
        return <Ionicons name="person-add" size={20} color="#2ecc71" />;
      case 'friendRequest':
        return <Ionicons name="people" size={20} color="#f39c12" />;
      default:
        return <Ionicons name="notifications" size={20} color="#4B0082" />;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <Image 
        source={{ uri: item.user.profilePicture || DEFAULT_AVATAR }}
        style={styles.avatar}
      />
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.username}>{item.user.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <View style={styles.notificationBody}>
          <Text style={styles.content}>{item.content}</Text>
          {getNotificationIcon(item.type)}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4B0082']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubText}>
              When you have notifications, they will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  notificationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
