import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DEFAULT_AVATAR, API_URL } from '../utils/config';
import { useAuthContext } from '../context/AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaLayout } from '../components';

// Types
type RootStackParamList = {
  UserProfile: {
    userId: string;
    fromFollowRequest?: boolean;
    userName?: string;
  };
  // Add other screen params as needed
};

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

interface UserData {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  friendRequests?: string[];
  token?: string;
  userName?: string;
}

interface UserRelationship {
  isFollowing: boolean;
  isFollowedBy: boolean;
  hasReceivedRequest: boolean;
  hasSentRequest: boolean;
}

interface Post {
  _id: string;
  description: string;
  images: string[];
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  likes: string[];
  createdAt: string;
}

interface PostDisplay {
  _id: string;
  content: string;
  imageUrl?: string;
}

// Add this type to fix navigation
type PossibleNavigation = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  push: (screen: string, params?: any) => void;
  popToTop: () => void;
  getState?: () => any;
};

const UserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  // Destructure only the parameters we know exist in the type definition
  const { userId, fromFollowRequest } = route.params;
  // Safely access userName with optional chaining
  const userName = route.params?.userName;
  const { user: currentUser } = useAuthContext() as { user: UserData | null };
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [displayPosts, setDisplayPosts] = useState<PostDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<UserData[]>([]);
  const [following, setFollowing] = useState<UserData[]>([]);
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);

  // Replace old relationship state with a single relationship object
  const [relationship, setRelationship] = useState<UserRelationship>({
    isFollowing: false,
    isFollowedBy: false,
    hasReceivedRequest: false,
    hasSentRequest: false
  });

  // Cast navigation to a more flexible type
  const nav = navigation as unknown as PossibleNavigation;

  useEffect(() => {
    if (!userId) {
      setError('User ID is missing. Cannot load profile.');
      setLoading(false);
      return;
    }

    fetchUserProfile();
    fetchUserPosts();
    fetchRelationshipStatus();
  }, [userId]);

  // Update display posts when source data changes
  useEffect(() => {
    if (posts.length > 0) {
      const formattedPosts = posts.map(post => ({
        _id: post._id,
        content: post.description || 'No description',
        imageUrl: post.images && post.images.length > 0 ? post.images[0] : undefined
      }));
      setDisplayPosts(formattedPosts);
    }
  }, [posts]);

  // Effect to auto-scroll to the follow request buttons when coming from a notification
  useEffect(() => {
    if (fromFollowRequest && relationship.hasReceivedRequest) {
      // We could add scroll to view logic here if needed
      // console.log('Coming from follow request notification');
    }
  }, [fromFollowRequest, relationship.hasReceivedRequest]);

  // New function to fetch relationship status
  const fetchRelationshipStatus = async () => {
    if (!currentUser?.token) {
      console.error('No auth token available');
      return;
    }

    try {
      // console.log(`Fetching relationship status with user ID: ${userId}`);
      const response = await axios.get(`${API_URL}/api/users/${userId}/relationship`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      if (response.data.success) {
        setRelationship(response.data.relationship);
        // console.log('Relationship data:', response.data.relationship);
      }
    } catch (error: any) {
      console.error('Error fetching relationship status:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!currentUser?.token) {
      console.error('No auth token available');
      setLoading(false);
      return;
    }

    try {
      // console.log(`Fetching user profile for ID: ${userId}`);
      const response = await axios.get(`${API_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      setUser(response.data);
      // Relationship status is now handled by fetchRelationshipStatus()
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile');

      if (error.response) {
        console.error('Error response data:', error.response.data);
        Alert.alert('Error', error.response.data.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    if (!currentUser?.token) {
      console.error('No auth token available');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/users/${userId}/followers`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      if (response.data.success) {
        setFollowers(response.data.followers);
        // console.log('Followers loaded:', response.data.followers.length);
      }
    } catch (error: any) {
      console.error('Error fetching followers:', error);
      // Only show alert for non-404 errors
      if (error.response && error.response.status !== 404) {
        Alert.alert('Error', 'Failed to load followers');
      } else {
        // If 404, just set empty followers array
        // console.log('No followers found or endpoint not available');
        setFollowers([]);
      }
    }
  };

  const fetchFollowing = async () => {
    if (!currentUser?.token) {
      console.error('No auth token available');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/users/${userId}/following`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      if (response.data.success) {
        setFollowing(response.data.following);
        // console.log('Following loaded:', response.data.following.length);
      }
    } catch (error: any) {
      console.error('Error fetching following:', error);
      // Only show alert for non-404 errors
      if (error.response && error.response.status !== 404) {
        Alert.alert('Error', 'Failed to load following');
      } else {
        // If 404, just set empty following array
        // console.log('No following found or endpoint not available');
        setFollowing([]);
      }
    }
  };

  const handleShowFollowers = async () => {
    setShowFollowersModal(true);
    await fetchFollowers();
  };

  const handleShowFollowing = async () => {
    setShowFollowingModal(true);
    await fetchFollowing();
  };

  const fetchUserPosts = async () => {
    if (!currentUser?.token) {
      console.error('No auth token available');
      return;
    }

    try {
      // console.log(`Fetching posts for user: ${userId}`);
      // Add timeout and retry logic
      const response = await axios.get(`${API_URL}/api/posts`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data && response.data.success) {
        // Filter posts for the specific user
        const userPosts = response.data.data.filter(
          (post: Post) => post.user && post.user._id === userId
        );
        setPosts(userPosts);
        // console.log(`Found ${userPosts.length} posts for user ${userId}`);
      }
    } catch (error: any) {
      console.error('Error fetching user posts:', error);

      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (!error.response) {
        setError('Network error. Make sure the backend server is running and accessible.');
      } else {
        setError(error.response?.data?.message || 'Failed to load posts');
      }

      // Log more detailed information for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null); // Clear any previous errors

    try {
      // Run both fetch operations in parallel and catch errors
      await Promise.all([
        fetchUserProfile().catch(err => {
          console.error('Error refreshing profile:', err);
          setError('Error refreshing profile data. Pull down to try again.');
        }),
        fetchUserPosts().catch(err => {
          console.error('Error refreshing posts:', err);
          // Don't set error here, as fetchUserPosts already sets it if needed
        })
      ]);

      // console.log('Profile and posts refreshed successfully');
    } catch (error) {
      console.error('Error during refresh:', error);
      setError('Failed to refresh data. Pull down to try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFollowUser = async () => {
    if (!currentUser?.token) {
      Alert.alert('Error', 'You need to be logged in to follow users');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/follow`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update relationship state
        setRelationship(prev => ({
          ...prev,
          isFollowing: true,
          hasSentRequest: true
        }));

        Alert.alert('Success', 'Follow request sent successfully');
        // Refresh data
        fetchUserProfile();
        fetchRelationshipStatus();
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to follow user';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleUnfollowUser = async () => {
    if (!currentUser?.token) {
      Alert.alert('Error', 'You need to be logged in to unfollow users');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/unfollow`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update relationship state
        setRelationship(prev => ({
          ...prev,
          isFollowing: false,
          hasSentRequest: false
        }));

        Alert.alert('Success', 'User unfollowed successfully');
        // Refresh data
        fetchUserProfile();
        fetchRelationshipStatus();
      }
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to unfollow user';
      Alert.alert('Error', errorMessage);
    }
  };

  // Add new function to accept follow request
  const handleAcceptFollowRequest = async () => {
    if (!currentUser?.token) {
      Alert.alert('Error', 'You need to be logged in to accept follow requests');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/accept-follow-request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update relationship state
        setRelationship(prev => ({
          ...prev,
          isFollowedBy: true,
          hasReceivedRequest: false
        }));

        Alert.alert('Success', 'Follow request accepted');
        // Refresh data
        fetchUserProfile();
        fetchRelationshipStatus();
      }
    } catch (error: any) {
      console.error('Error accepting follow request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to accept follow request';
      Alert.alert('Error', errorMessage);
    }
  };

  // Add new function to reject follow request
  const handleRejectFollowRequest = async () => {
    if (!currentUser?.token) {
      Alert.alert('Error', 'You need to be logged in to reject follow requests');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/reject-follow-request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update relationship state
        setRelationship(prev => ({
          ...prev,
          hasReceivedRequest: false
        }));

        Alert.alert('Success', 'Follow request rejected');
        // Refresh data
        fetchRelationshipStatus();
      }
    } catch (error: any) {
      console.error('Error rejecting follow request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reject follow request';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleSendMessage = () => {
    // Navigate to the Chat screen
    (navigation as any).navigate('ChatDetail', {
      chatId: userId,
      userId: userId,
      name: user?.name || user?.username || 'User'
    });
  };

  const handleRemoveFollower = async (userId: string) => {
    if (!currentUser?.token) {
      Alert.alert('Error', 'You need to be logged in to remove followers');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/remove-follower`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update relationship state
        setRelationship(prev => ({
          ...prev,
          isFollowedBy: false
        }));
        Alert.alert('Success', 'Follower removed successfully');
        // Refresh data
        fetchUserProfile();
        fetchRelationshipStatus();
      }
    } catch (error: any) {
      console.error('Error removing follower:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove follower';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!currentUser?.token) {
      Alert.alert('Error', 'You need to be logged in to block users');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/block`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update relationship state
        setRelationship(prev => ({
          ...prev,
          isFollowing: false,
          isFollowedBy: false,
          hasSentRequest: false,
          hasReceivedRequest: false
        }));
        Alert.alert('Success', 'User blocked successfully');
        // Go back to previous screen
        nav.goBack();
      }
    } catch (error: any) {
      console.error('Error blocking user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to block user';
      Alert.alert('Error', errorMessage);
    }
  };

  const renderPostItem = ({ item }: { item: PostDisplay }) => {
    // Make sure we have a valid username before navigating
    const displayUsername = user?.username || '';

    return (
      <TouchableOpacity
        style={styles.postItem}
        onPress={() => {
          // Find the best way to navigate to PostDetails based on the current navigation state
          if (nav.navigate) {
            try {
              // Check if we're in the Profile tab navigation stack
              const navState = nav.getState?.() || {};
              const isInProfileTab = navState.routes?.some?.(
                (route: { name: string; state?: { routes?: Array<{ name: string }> } }) =>
                  route.name === 'Profile' ||
                  (route.state && route.state.routes?.some?.((r: { name: string }) => r.name === 'Profile'))
              );

              // If we're in the Profile tab, navigate within the Profile stack
              if (isInProfileTab) {
                // Navigate to PostDetails within the Profile stack
                nav.navigate('PostDetails', {
                  postId: item._id,
                  userId,
                  userName: displayUsername
                });
              }
              // When in the root stack, navigate to PostDetails directly
              else if (route.name === 'UserProfile') {
                // Use the Profile tab instead of Home tab for consistent navigation
                nav.navigate('Profile', {
                  screen: 'PostDetails',
                  params: {
                    postId: item._id,
                    userId,
                    userName: displayUsername
                  }
                });
              } else {
                // When in a nested stack (like inside Home), navigate to PostDetails in that stack
                nav.navigate('PostDetails', {
                  postId: item._id,
                  userId,
                  userName: displayUsername
                });
              }
            } catch (err) {
              console.error('Navigation error:', err);

              // Fallback navigation through the Profile tab if nested fails
              nav.navigate('Profile', {
                screen: 'PostDetails',
                params: {
                  postId: item._id,
                  userId,
                  userName: displayUsername
                }
              });
            }
          }
        }}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
        ) : (
          <View style={styles.textPostContainer}>
            <Text style={styles.textPostContent} numberOfLines={5}>
              {item.content}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }: { item: UserData }) => (
    <View style={styles.userItemContainer}>
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => {
          setShowFollowersModal(false);
          setShowFollowingModal(false);
          navigation.navigate('UserProfile', {
            userId: item._id,
            fromFollowRequest: false
          });
        }}
      >
        <Image
          source={{ uri: item.profilePicture || DEFAULT_AVATAR }}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{item.username}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowUserMenu(showUserMenu === item._id ? null : item._id)}
      >
        <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
      </TouchableOpacity>

      {showUserMenu === item._id && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowUserMenu(null);
              handleRemoveFollower(item._id);
            }}
          >
            <Text style={styles.menuItemText}>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowUserMenu(null);
              handleBlockUser(item._id);
            }}
          >
            <Text style={[styles.menuItemText, styles.blockText]}>Block</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B0082" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaLayout>
      <FlatList
        data={displayPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4B0082']}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => nav.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{user?.username || 'User Profile'}</Text>
              {userId !== currentUser?._id && (
                <TouchableOpacity
                  style={styles.optionsButton}
                  onPress={() => setShowUserMenu(showUserMenu ? null : userId)}
                >
                  <Ionicons name="ellipsis-vertical" size={24} color="#333" />
                </TouchableOpacity>
              )}
            </View>

            {showUserMenu && userId !== currentUser?._id && (
              <View style={styles.userOptionsMenu}>
                {relationship.isFollowedBy && (
                  <TouchableOpacity
                    style={styles.userOptionItem}
                    onPress={() => {
                      handleRemoveFollower(userId);
                      setShowUserMenu(null);
                    }}
                  >
                    <Ionicons name="person-remove" size={20} color="#333" />
                    <Text style={styles.userOptionText}>Remove Follower</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.userOptionItem}
                  onPress={() => {
                    handleBlockUser(userId);
                    setShowUserMenu(null);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#ff4444" />
                  <Text style={[styles.userOptionText, styles.blockText]}>Block User</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.profileContainer}>
              <Image
                source={{ uri: user?.profilePicture || DEFAULT_AVATAR }}
                style={styles.profileImage}
              />

              <View style={styles.profileInfoContainer}>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{displayPosts.length}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={handleShowFollowing}
                  >
                    <Text style={styles.statValue}>{user?.following?.length || 0}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={handleShowFollowers}
                  >
                    <Text style={styles.statValue}>{user?.followers?.length || 0}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </TouchableOpacity>
                </View>

                {/* Relationship buttons based on state */}
                {relationship.hasReceivedRequest ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={handleAcceptFollowRequest}
                    >
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={handleRejectFollowRequest}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : relationship.isFollowing ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.followingButton}
                      onPress={handleUnfollowUser}
                    >
                      <Text style={styles.followingButtonText}>Following</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={handleSendMessage}
                    >
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                ) : relationship.hasSentRequest ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.requestedButton}
                      onPress={handleUnfollowUser}
                    >
                      <Text style={styles.requestedButtonText}>Requested</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={handleSendMessage}
                    >
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                ) : relationship.isFollowedBy ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.followBackButton}
                      onPress={handleFollowUser}
                    >
                      <Text style={styles.followBackButtonText}>Follow Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={handleSendMessage}
                    >
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.followButton}
                      onPress={handleFollowUser}
                    >
                      <Text style={styles.followButtonText}>Follow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={handleSendMessage}
                    >
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.username}>@{user?.username}</Text>
              <Text style={styles.bioText}>{user?.bio || 'No bio yet'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Posts</Text>

              {!refreshing && displayPosts.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="images-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No posts yet</Text>
                </View>
              )}
            </View>
          </>
        }
        contentContainerStyle={styles.postsGrid}
      />

      {/* Followers Modal */}
      <Modal
        visible={showFollowersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFollowersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Followers</Text>
              <TouchableOpacity
                onPress={() => setShowFollowersModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={followers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Following Modal */}
      <Modal
        visible={showFollowingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFollowingModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Following</Text>
              <TouchableOpacity
                onPress={() => setShowFollowingModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={following}
              renderItem={renderUserItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaLayout>
  );
};

const { width } = Dimensions.get('window');
const POST_WIDTH = width / 3 - 2;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4B0082',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    position: 'relative',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  optionsButton: {
    padding: 5,
    position: 'absolute',
    right: 10,
  },
  profileContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileInfoContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  userInfoContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  section: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  postsGrid: {
    paddingHorizontal: 1,
  },
  postItem: {
    width: POST_WIDTH,
    height: POST_WIDTH,
    margin: 1,
    backgroundColor: '#f1f1f1',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textPostContainer: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  textPostContent: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  followButton: {
    backgroundColor: '#405DE6',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  followingButton: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  followingButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  requestedButton: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  requestedButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageButton: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#405DE6',
  },
  rejectButton: {
    backgroundColor: '#f5f5f5',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalList: {
    padding: 10,
  },
  userItemContainer: {
    position: 'relative',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  followBackButton: {
    backgroundColor: '#405DE6',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  followBackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  menuButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 5,
  },
  menuContainer: {
    position: 'absolute',
    right: 10,
    top: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
  },
  blockText: {
    color: '#ff4444',
  },
  userOptionsMenu: {
    position: 'absolute',
    right: 10,
    top: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    width: 200,
  },
  userOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userOptionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
});

export default UserProfileScreen; 