import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  SafeAreaView,
  useWindowDimensions,
  Button,
  ActivityIndicator,
  Alert
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { UserContext } from '../context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { createPost } from '../api/posts';
import { checkAuthentication, testImageUpload } from '../api/testUpload';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get dynamic window dimensions instead of using a fixed value
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  CreatePost: undefined;
  // Add other screen params as needed
};

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;

const CreatePostScreen: React.FC<Props> = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const [postText, setPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ checked: false, authenticated: false });

  // Get user from context
  const { user, isLoading } = useContext(UserContext);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use AsyncStorage directly to check if user exists
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const userData = JSON.parse(userString);
          if (userData && userData.token) {
            setAuthStatus({
              checked: true,
              authenticated: true
            });
            return;
          }
        }

        // If we couldn't get user from storage, try the API check
        const result = await checkAuthentication();
        console.log('Auth check result:', result);
        setAuthStatus({
          checked: true,
          authenticated: result.authenticated
        });
      } catch (error) {
        console.error('Error checking auth:', error);
        setAuthStatus({
          checked: true,
          authenticated: false
        });
      }
    };

    checkAuth();
  }, []);

  const handleAddImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log('Image picker result:', result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }

  // Default user data if not available from context
  const defaultUserData = {
    name: user?.name,
    profilePic: user?.profilePic
  };

  const moods = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '❤️', label: 'In love' },
    { emoji: '😎', label: 'Cool' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '😠', label: 'Angry' },
  ];

  const handlePost = async () => {
    if (!postText.trim()) {
      Alert.alert('Error', 'Please enter some text for your post');
      return;
    }

    try {
      setIsUploading(true);

      // Log user state for debugging
      console.log('Current user state:', {
        userId: user?.id,
        name: user?.name,
        isLoading,
        authStatus
      });

      if (!authStatus.authenticated) {
        Alert.alert('Authentication Error', 'You must be logged in to create a post.');
        setIsUploading(false);
        return;
      }

      if (!image) {
        Alert.alert('No Image', 'Would you like to post without an image?', [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsUploading(false)
          },
          {
            text: 'Post without image',
            onPress: async () => {
              await submitPost();
            }
          }
        ]);
        return;
      }

      await submitPost();
    } catch (error: any) {
      console.error('Error creating post:', error);
      // Provide more detailed error information
      const errorMessage = error.response?.data?.message ||
        error.message ||
        'Failed to create post. Please try again.';

      Alert.alert('Error', errorMessage);
      setIsUploading(false);
    }
  };

  const submitPost = async () => {
    try {
      // Prepare the data for upload
      const postData = {
        description: postText,
        mood: mood || undefined,
        images: image ? [image] : []
      };

      console.log('Submitting post with image:', image ? 'Yes' : 'No');

      let response;

      // Try using the test upload function first for better debugging
      if (image) {
        console.log('Using test upload function with image');
        response = await testImageUpload(image, postText);
      } else {
        // Use regular createPost function
        response = await createPost(postData);
      }

      console.log('Post created successfully:', response);

      // Clear state and go back
      setPostText('');
      setImage(null);
      setMood(null);

      Alert.alert('Success', 'Your post has been shared!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error in submitPost:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload post');
    } finally {
      setIsUploading(false);
    }
  };

  // Calculate image size based on screen width (3 images per row with margins)
  const imageSize = (width - 48) / 3;

  // Show authentication status indicator
  const renderAuthStatus = () => {
    if (!authStatus.checked) {
      return <Text style={styles.authStatus}>Checking authentication...</Text>;
    }
    return (
      <Text style={[
        styles.authStatus,
        { color: authStatus.authenticated ? 'green' : 'red' }
      ]}>
        {authStatus.authenticated ? '✓ Authenticated' : '✗ Not authenticated'}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} >
      <StatusBar barStyle="dark-content" />

      {/* Header - Fixed to match image */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Post</Text>
          {renderAuthStatus()}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handlePost}
            style={[
              styles.shareButton,
              (!postText.trim() || isUploading) ? styles.shareButtonDisabled : null
            ]}
            disabled={!postText.trim() || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info Section */}
          <View style={styles.userInfoSection}>
            <Image
              source={{ uri: user?.profilePic || defaultUserData.profilePic }}
              style={styles.avatar}
            />
            <Text style={styles.userName}>{user?.name || defaultUserData.name}</Text>
          </View>

          {/* Text Input Section */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              multiline
              value={postText}
              onChangeText={setPostText}
              editable={!isUploading}
            />
          </View>

          {/* Mood Selector Section */}
          <View style={styles.moodSelector}>
            <Text style={styles.moodTitle}>How are you feeling?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.moodList}
            >
              {moods.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.moodItem,
                    mood === item.label ? styles.selectedMood : null
                  ]}
                  onPress={() => setMood(item.label)}
                  disabled={isUploading}
                >
                  <Text style={styles.moodEmoji}>{item.emoji}</Text>
                  <Text style={styles.moodLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <View style={styles.imagePreviewContainer}>
          {image && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
                disabled={isUploading}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer Media Options */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handleAddImage}
            disabled={isUploading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4A90E2' }]}>
              <Ionicons name="images" size={22} color="#fff" />
            </View>
            <Text style={styles.mediaButtonText}>Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaButton} disabled={isUploading}>
            <View style={[styles.iconCircle, { backgroundColor: '#E91E63' }]}>
              <Ionicons name="videocam" size={22} color="#fff" />
            </View>
            <Text style={styles.mediaButtonText}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaButton} disabled={isUploading}>
            <View style={[styles.iconCircle, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="location" size={22} color="#fff" />
            </View>
            <Text style={styles.mediaButtonText}>Check In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => setMood(mood ? null : 'Happy')}
            disabled={isUploading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#8BC34A' }]}>
              <FontAwesome name="smile-o" size={22} color="#fff" />
            </View>
            <Text style={styles.mediaButtonText}>Mood</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    // paddingTop: 60,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    // alignItems: 'center',

  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
    // height: 56,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  authStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  backButton: {
    padding: 5,
  },
  shareButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 80,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 0,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    padding: 0,
  },
  moodSelector: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  moodTitle: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  moodList: {
    flexDirection: 'row',
  },
  moodItem: {
    alignItems: 'center',
    marginRight: 24,
    padding: 8,
    borderRadius: 12,
  },
  selectedMood: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  moodEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  moodLabel: {
    color: '#666',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  mediaButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mediaButtonText: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  imagePreviewContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
  },
});

export default CreatePostScreen; 