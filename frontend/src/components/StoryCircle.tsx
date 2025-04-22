import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import { useAuthContext } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

interface StoryCircleProps {
  userId: string;
  profileImage?: string;
  size?: 'small' | 'medium' | 'large';
  showAddButton?: boolean;
  onAddPress?: () => void;
}

const StoryCircle: React.FC<StoryCircleProps> = ({
  userId,
  profileImage,
  size = 'medium',
  showAddButton = false,
  onAddPress,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthContext();
  const [hasStories, setHasStories] = useState(false);
  const [hasUnseenStories, setHasUnseenStories] = useState(false);
  const [loading, setLoading] = useState(false);

  // Define sizes based on the size prop
  const getSizes = () => {
    switch (size) {
      case 'small':
        return {
          container: 60,
          image: 54,
          gradient: 58,
          border: 2,
          addButton: 16
        };
      case 'large':
        return {
          container: 90,
          image: 82,
          gradient: 86,
          border: 3,
          addButton: 24
        };
      case 'medium':
      default:
        return {
          container: 80,
          image: 74,
          gradient: 78,
          border: 2,
          addButton: 20
        };
    }
  };

  const sizes = getSizes();

  // Check if user has stories
  useEffect(() => {
    const checkUserStories = async () => {
      if (!user?.token) return;

      try {
        setLoading(true);

        const response = await axios.get(
          `${API_URL}/api/stories/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            }
          }
        );

        // Check for stories in the response data structure
        if (response.data && response.data.success) {
          const storiesData = response.data.data || [];
          // User has stories
          setHasStories(storiesData.length > 0);

          // Check if there are unseen stories
          if (storiesData.length > 0) {
            const unseenStories = storiesData.some(
              (story: any) => !story.views.includes(user._id)
            );
            setHasUnseenStories(unseenStories);
          }
        } else {
          setHasStories(false);
          setHasUnseenStories(false);
        }
      } catch (error) {
        console.error('Error checking user stories:', error);
        setHasStories(false);
        setHasUnseenStories(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserStories();
  }, [userId, user]);

  const handlePress = () => {
    if (showAddButton && onAddPress) {
      onAddPress();
      return;
    }

    if (hasStories) {
      navigation.navigate('Stories', { userId });
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: sizes.container, height: sizes.container }
      ]}
      onPress={handlePress}
      disabled={loading || (!hasStories && !showAddButton)}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#0095F6" />
      ) : (
        <>
          {hasStories ? (
            <LinearGradient
              colors={
                hasUnseenStories
                  ? ['#C13584', '#E1306C', '#FD1D1D', '#F77737']  // Instagram gradient
                  : ['#8E8E8E', '#8E8E8E']  // Gray for seen stories
              }
              style={[
                styles.gradientBorder,
                {
                  width: sizes.gradient,
                  height: sizes.gradient,
                  borderRadius: sizes.gradient / 2
                }
              ]}
            >
              <Image
                source={{ uri: profileImage || DEFAULT_AVATAR }}
                style={[
                  styles.profileImage,
                  {
                    width: sizes.image,
                    height: sizes.image,
                    borderRadius: sizes.image / 2,
                    borderWidth: sizes.border
                  }
                ]}
              />
            </LinearGradient>
          ) : (
            <Image
              source={{ uri: profileImage || DEFAULT_AVATAR }}
              style={[
                styles.profileImage,
                {
                  width: sizes.image,
                  height: sizes.image,
                  borderRadius: sizes.image / 2,
                  borderWidth: 0
                }
              ]}
            />
          )}

          {showAddButton && (
            <View style={styles.addButtonContainer}>
              <Ionicons
                name="add-circle"
                size={sizes.addButton}
                color="#0095F6"
                style={{ backgroundColor: '#FFFFFF', borderRadius: sizes.addButton / 2 }}
              />
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gradientBorder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  profileImage: {
    borderColor: '#FFFFFF',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'transparent',
  }
});

export default StoryCircle; 