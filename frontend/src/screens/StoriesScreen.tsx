import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../context/AuthContext';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types/navigation';
import StoryProgressBar from '../components/StoryProgressBar';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Define types
interface StoryType {
  _id: string;
  user: {
    _id: string;
    username: string;
    name: string;
    profilePicture?: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  views: string[];
  createdAt: string;
  expiresAt: string;
}

interface UserWithStories {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
  stories: StoryType[];
}

interface UserInfo {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
}

type StoriesScreenRouteProp = RouteProp<RootStackParamList, 'Stories'>;
type StoriesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const StoriesScreen = () => {
  const route = useRoute<StoriesScreenRouteProp>();
  const navigation = useNavigation<StoriesScreenNavigationProp>();
  const { user } = useAuthContext();
  const [allUserStories, setAllUserStories] = useState<UserWithStories[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [storyViewers, setStoryViewers] = useState<UserInfo[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Get userId from route params or default to current user
  const initialUserId = route.params?.userId || user?._id;
  const shouldRefresh = route.params?.refresh === true;

  // Fetch stories from backend
  const fetchStories = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.token) {
        setError('You must be logged in to view stories');
        setLoading(false);
        return;
      }

      // Create a temporary array to hold all the user stories
      let tempUserStories: UserWithStories[] = [];

      // First get current user's stories
      if (user._id) {
        try {
          console.log('Fetching current user stories');
          const userStoriesResponse = await axios.get(
            `${API_URL}/api/stories/user/${user._id}`,
            {
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            }
          );

          if (userStoriesResponse.data && userStoriesResponse.data.success) {
            const userStoriesData = userStoriesResponse.data.data || [];
            console.log(`Found ${userStoriesData.length} stories for current user`);

            if (userStoriesData.length > 0) {
              // Sort stories by creation date, oldest first so new stories appear at the end
              const sortedStories = [...userStoriesData].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );

              const userStories = {
                _id: user._id,
                username: user.username,
                name: user.name,
                profilePicture: user.profilePicture,
                stories: sortedStories,
              };

              tempUserStories.push(userStories);
            }
          }
        } catch (error) {
          console.warn('Could not fetch current user stories:', error);
          // Don't set error here, continue trying to fetch following stories
        }
      }

      // Get followed users' stories
      try {
        console.log('Fetching following users stories');
        const followingStoriesResponse = await axios.get(
          `${API_URL}/api/stories/feed`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        if (followingStoriesResponse.data && followingStoriesResponse.data.success) {
          const followingUserStories = followingStoriesResponse.data.data || [];
          console.log(`Found ${followingUserStories.length} users with stories in feed`);

          if (followingUserStories.length > 0) {
            // Sort each user's stories by creation date, oldest first
            const sortedFollowingUserStories = followingUserStories.map((userStory: UserWithStories) => {
              if (userStory.stories && Array.isArray(userStory.stories)) {
                const sortedStories = [...userStory.stories].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                return { ...userStory, stories: sortedStories };
              }
              return userStory;
            });

            // Add following user stories to the array
            sortedFollowingUserStories.forEach((userStory: UserWithStories) => {
              // Make sure we don't duplicate users
              if (!tempUserStories.some(u => u._id === userStory._id)) {
                tempUserStories.push(userStory);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching feed stories:', error);
      }

      // Set all user stories
      setAllUserStories(tempUserStories);
      console.log(`Total users with stories: ${tempUserStories.length}`);

      // If stories exist for the requested userId, set that as current
      if (initialUserId && tempUserStories.length > 0) {
        const index = tempUserStories.findIndex(u => u._id === initialUserId);
        if (index !== -1) {
          setCurrentUserIndex(index);
          // Start with the oldest story (index 0) by default
          setCurrentStoryIndex(0);
        }
      }

      // Check if we have no stories at all
      if (tempUserStories.length === 0) {
        setError('No stories available to view');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setError('Failed to load stories');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [initialUserId, shouldRefresh]);

  // Mark story as viewed
  const markStoryAsViewed = async (storyId: string) => {
    try {
      if (!user?.token) return;

      await axios.post(
        `${API_URL}/api/stories/${storyId}/view`,
        { userId: user._id },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      // Update local state to show story as viewed
      setAllUserStories(prevState => {
        return prevState.map(userWithStories => {
          return {
            ...userWithStories,
            stories: userWithStories.stories.map(story => {
              if (story._id === storyId && !story.views.includes(user._id)) {
                return {
                  ...story,
                  views: [...story.views, user._id],
                };
              }
              return story;
            }),
          };
        });
      });
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  // Pause animation when holding down on the screen
  const pauseAnimation = () => {
    setIsPaused(true);
  };

  // Resume animation when releasing hold
  const resumeAnimation = () => {
    setIsPaused(false);
  };

  // Effect to mark story as viewed when it changes
  useEffect(() => {
    if (allUserStories.length > 0 && !loading) {
      const currentUser = allUserStories[currentUserIndex];
      if (currentUser && currentUser.stories.length > 0) {
        const storyId = currentUser.stories[currentStoryIndex]._id;
        if (storyId && user?._id) {
          console.log(`Marking story ${storyId} as viewed`);
          markStoryAsViewed(storyId);
        }
      }
    }
  }, [currentUserIndex, currentStoryIndex, allUserStories.length, loading]);

  // Handle tap to navigate stories
  const handleTap = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      if (currentStoryIndex > 0) {
        // Go to previous story
        setCurrentStoryIndex(currentStoryIndex - 1);
      } else if (currentUserIndex > 0) {
        // Go to previous user's last story
        setCurrentUserIndex(currentUserIndex - 1);
        const prevUserStories = allUserStories[currentUserIndex - 1].stories;
        setCurrentStoryIndex(prevUserStories.length - 1);
      }
    } else {
      handleNextStory();
    }
  };

  // Handle advancing to next story or user
  const handleNextStory = () => {
    const currentUser = allUserStories[currentUserIndex];

    if (currentStoryIndex < currentUser.stories.length - 1) {
      // Go to next story of current user
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentUserIndex < allUserStories.length - 1) {
      // Go to next user's first story
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // End of stories, go back
      navigation.goBack();
    }
  };

  // Handle press on user avatar in the header
  const handleUserAvatarPress = (index: number) => {
    setCurrentUserIndex(index);
    setCurrentStoryIndex(0);
  };

  // Get detailed information about users who viewed the story
  const fetchStoryViewers = async (storyId: string) => {
    if (!user?.token) return;

    try {
      setLoadingViewers(true);

      const response = await axios.get(
        `${API_URL}/api/stories/${storyId}/viewers`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.success) {
        setStoryViewers(response.data.viewers || []);
      } else {
        console.error("Failed to fetch story viewers:", response.data.message);
        setStoryViewers([]);
      }
    } catch (error) {
      console.error("Error fetching story viewers:", error);
      setStoryViewers([]);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Handle tap on view count
  const handleViewCountPress = (storyId: string) => {
    // Pause the story while viewing the list
    setIsPaused(true);
    // Fetch viewers and show modal
    fetchStoryViewers(storyId);
    setShowViewers(true);
  };

  // Close viewers modal
  const closeViewersModal = () => {
    setShowViewers(false);
    // Resume the story after closing the modal
    setIsPaused(false);
  };

  // Render an individual viewer item
  const renderViewerItem = ({ item }: { item: UserInfo }) => (
    <View style={styles.viewerItem}>
      <Image
        source={{ uri: item.profilePicture || DEFAULT_AVATAR }}
        style={styles.viewerAvatar}
      />
      <View style={styles.viewerInfo}>
        <Text style={styles.viewerUsername}>{item.username}</Text>
        <Text style={styles.viewerName}>{item.name}</Text>
      </View>

      {/* "Seen" timestamp - would need API update to track when each user viewed */}
      <Text style={styles.viewerTimestamp}>
        1d
      </Text>
    </View>
  );

  // Render the viewers modal
  const renderViewersModal = () => (
    <Modal
      visible={showViewers}
      transparent={true}
      animationType="slide"
      onRequestClose={closeViewersModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Viewers</Text>
            <TouchableOpacity onPress={closeViewersModal} style={styles.closeModalButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {loadingViewers ? (
            <View style={styles.loadingViewersContainer}>
              <ActivityIndicator size="small" color="#0095F6" />
              <Text style={styles.loadingViewersText}>Loading viewers...</Text>
            </View>
          ) : storyViewers.length > 0 ? (
            <FlatList
              data={storyViewers}
              renderItem={renderViewerItem}
              keyExtractor={(item) => item._id}
              style={styles.viewersList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noViewersContainer}>
              <FontAwesome name="eye-slash" size={50} color="#ccc" />
              <Text style={styles.noViewersText}>No viewers yet</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // Render current story
  const renderCurrentStory = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading stories...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchStories}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, { marginTop: 10, backgroundColor: '#333' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (allUserStories.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="images-outline" size={60} color="#FFFFFF" />
          <Text style={styles.errorText}>No stories available to view</Text>
          <TouchableOpacity
            style={[styles.retryButton, { marginTop: 20 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    try {
      const currentUser = allUserStories[currentUserIndex];
      if (!currentUser || !currentUser.stories || currentUser.stories.length === 0) {
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No stories found for this user</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        );
      }

      const currentStory = currentUser.stories[currentStoryIndex];
      if (!currentStory) {
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Story not found</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        );
      }

      const isCurrentUser = currentUser._id === user?._id;

      return (
        <View style={styles.storyContainer}>
          {/* Story content */}
          <Image
            source={{ uri: currentStory.mediaUrl }}
            style={styles.storyImage}
            resizeMode="cover"
          />

          {/* Top gradient overlay for better text visibility */}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']}
            style={styles.topGradient}
          />

          {/* Progress bars */}
          <View style={styles.progressContainer}>
            {currentUser.stories.map((_, index) => (
              <StoryProgressBar
                key={index}
                index={index}
                currentIndex={currentStoryIndex}
                duration={10000} // 10 seconds
                length={currentUser.stories.length}
                onComplete={handleNextStory}
                isActive={index === currentStoryIndex}
                isPaused={isPaused}
              />
            ))}
          </View>

          {/* Story header */}
          <View style={styles.storyHeader}>
            <View style={styles.userInfoContainer}>
              <Image
                source={{ uri: currentUser.profilePicture || DEFAULT_AVATAR }}
                style={styles.userAvatar}
              />
              <View style={styles.textContainer}>
                <Text style={styles.username}>{currentUser.username}</Text>
                <Text style={styles.timeAgo}>
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* View count for own stories */}
          {isCurrentUser && (
            <TouchableOpacity
              style={styles.viewCountContainer}
              onPress={() => handleViewCountPress(currentStory._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewCountText}>
                {currentStory.views.length}
              </Text>
              <Ionicons name="chevron-up-outline" size={16} color="#FFFFFF" style={styles.viewCountIcon} />
            </TouchableOpacity>
          )}

          {/* Pause indicator */}
          {isPaused && (
            <View style={styles.pauseIndicator}>
              <View style={styles.pauseIconContainer}>
                <Ionicons name="pause" size={48} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* Tap areas for navigation */}
          <View style={styles.tapArea}>
            <TouchableOpacity
              style={styles.leftTapArea}
              activeOpacity={1}
              onPress={() => handleTap('left')}
              onLongPress={pauseAnimation}
              onPressOut={resumeAnimation}
              delayLongPress={150}
            />
            <TouchableOpacity
              style={styles.rightTapArea}
              activeOpacity={1}
              onPress={() => handleTap('right')}
              onLongPress={pauseAnimation}
              onPressOut={resumeAnimation}
              delayLongPress={150}
            />
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering current story:', error);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to render current story</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  // Render user avatar for stories list
  const renderUserItem = ({ item, index }: { item: UserWithStories; index: number }) => {
    const isActive = index === currentUserIndex;
    const hasUnseenStories = item.stories.some(
      story => !story.views.includes(user?._id || '')
    );

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isActive && styles.activeUserItem,
        ]}
        onPress={() => handleUserAvatarPress(index)}
      >
        {/* <LinearGradient
          colors={
            hasUnseenStories
              ? ['#C13584', '#E1306C', '#FD1D1D', '#F77737']
              : ['#8E8E8E', '#8E8E8E']
          }
          style={styles.avatarGradient}
        >
          <Image
            source={{ uri: item.profilePicture || DEFAULT_AVATAR }}
            style={styles.avatarImage}
          />
        </LinearGradient>
        <Text
          style={[
            styles.userItemUsername,
            isActive && styles.activeUserItemText,
          ]}
          numberOfLines={1}
        >
          {item.username}
        </Text> */}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Horizontal list of users with stories */}
      <View style={styles.userListContainer}>
        <FlatList
          data={allUserStories}
          renderItem={renderUserItem}
          keyExtractor={(item) => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.userList}
        />
      </View>

      {/* Current story view */}
      {renderCurrentStory()}

      {/* Viewers Modal */}
      {renderViewersModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  storyContainer: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30,
    width: '100%',
    paddingHorizontal: 10,
    zIndex: 20,
  },
  viewedProgressBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeAgo: {
    color: '#fff',
    fontSize: 12,
  },
  closeButton: {
    padding: 10,
    backgroundColor: 'transparent',
  },
  storyText: {
    color: '#fff',
    fontSize: 16,
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1e88e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  controlTouchable: {
    flex: 1,
  },
  storyHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 30,
    paddingHorizontal: 15,
    zIndex: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    marginLeft: 10,
  },
  storyImage: {
    width,
    height,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 5,
  },
  leftTapArea: {
    width: '30%',
    height: '100%',
  },
  rightTapArea: {
    width: '70%',
    height: '100%',
  },
  viewCountContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  viewCountText: {
    color: '#FFFFFF',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  userListContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 12,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight : 40,
    paddingBottom: 10,
    borderBottomWidth: 0,
  },
  userList: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  userItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    opacity: 0.7,
    width: 70,
  },
  activeUserItem: {
    opacity: 1,
  },
  avatarGradient: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2.5,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  userItemUsername: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    width: 65,
    fontWeight: '400',
  },
  activeUserItemText: {
    fontWeight: '600',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 5,
  },
  pauseIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pauseIconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 24,
  },
  viewCountIcon: {
    marginLeft: 5,
  },
  // Modal styles for viewer list
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    width: '100%',
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    right: 10,
    padding: 10,
  },
  loadingViewersContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingViewersText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
  viewersList: {
    padding: 10,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 0.5,
  },
  viewerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 15,
  },
  viewerInfo: {
    flex: 1,
  },
  viewerUsername: {
    fontWeight: '600',
    fontSize: 14,
  },
  viewerName: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  viewerTimestamp: {
    color: '#8e8e8e',
    fontSize: 12,
  },
  noViewersContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noViewersText: {
    marginTop: 10,
    color: '#8e8e8e',
    fontSize: 14,
  },
});

export default StoriesScreen; 