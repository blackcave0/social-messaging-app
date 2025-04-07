import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_AVATAR, API_URL } from '../utils/config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useAuthContext } from '../context/AuthContext';

interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'follow' | 'friendRequest';
  sender: {
    _id: string;
    name: string;
    username: string;
    profilePicture: string;
  };
  post?: {
    _id: string;
    content: string;
    images: string[];
  };
  comment?: {
    _id: string;
    content: string;
  };
  read: boolean;
  createdAt: string;
}

export default function NotificationsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFocused = useIsFocused();

  // Fetch notifications when screen is focused or user changes
  useEffect(() => {
    if (user?.token && isFocused) {
      fetchNotifications();
    }
  }, [user, isFocused]);

  const fetchNotifications = async () => {
    if (!user?.token) {
      console.error('No auth token available for fetching notifications');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching notifications from API');
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      console.log(`Received ${response.data.notifications?.length || 0} notifications, ${response.data.unreadCount || 0} unread`);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);

      // More detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.token) return;

    try {
      await axios.put(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );

      // Decrement unread count if this was an unread notification
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.token || unreadCount === 0) return;

    try {
      await axios.put(
        `${API_URL}/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);

      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    try {
      // Mark as read
      markAsRead(notification._id);

      // Navigate based on notification type
      switch (notification.type) {
        case 'like':
        case 'comment':
          if (notification.post) {
            navigation.navigate('Home', {
              screen: 'PostDetails',
              params: { postId: notification.post._id }
            });
          }
          break;
        case 'follow':
        case 'friendRequest':
          navigation.navigate('Home', {
            screen: 'UserProfile',
            params: { userId: notification.sender._id }
          });
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      // If navigation fails, at least try to mark it as read
      try {
        markAsRead(notification._id);
      } catch (err) {
        console.error('Failed to mark notification as read after navigation error:', err);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Convert to appropriate time format
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'Just now';
    }
  };

  const getNotificationContent = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return `commented: "${notification.comment?.content.substring(0, 30)}${notification.comment?.content && notification.comment.content.length > 30 ? '...' : ''}"`;
      case 'follow':
        return 'started following you';
      case 'friendRequest':
        return 'sent you a friend request';
      default:
        return '';
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
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <Image
        source={{ uri: item.sender.profilePicture || DEFAULT_AVATAR }}
        style={styles.avatar}
      />
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.username}>{item.sender.name}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
        </View>
        <View style={styles.notificationBody}>
          <Text style={styles.content}>{getNotificationContent(item)}</Text>
          {getNotificationIcon(item.type)}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  markAllButton: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  markAllText: {
    color: '#405DE6',
    fontWeight: 'bold',
  },
});
