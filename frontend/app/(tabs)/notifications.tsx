import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow';
  user: string;
  post: string;
  time: string;
}

const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'like',
    user: 'John Doe',
    post: 'Your post',
    time: '2h ago',
  },
  {
    id: '2',
    type: 'comment',
    user: 'Jane Smith',
    post: 'Your post',
    time: '5h ago',
  },
  {
    id: '3',
    type: 'follow',
    user: 'Mike Johnson',
    post: 'started following you',
    time: '1d ago',
  },
];

export default function NotificationsScreen() {
  const renderNotification = ({ item }: { item: Notification }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'like':
          return <Ionicons name="heart" size={24} color="#E91E63" />;
        case 'comment':
          return <Ionicons name="chatbubble" size={24} color="#2196F3" />;
        case 'follow':
          return <Ionicons name="person-add" size={24} color="#4CAF50" />;
        default:
          return <Ionicons name="notifications" size={24} color="#405DE6" />;
      }
    };

    return (
      <View style={styles.notificationItem}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.userName}>{item.user}</Text>
            {' '}{item.post}
          </Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <FlatList
        data={DUMMY_NOTIFICATIONS}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
  },
  userName: {
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
}); 