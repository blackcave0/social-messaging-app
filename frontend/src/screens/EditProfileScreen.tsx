import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuthContext } from '../context/AuthContext';
import { API_URL, DEFAULT_AVATAR } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EditProfileScreenProps {
  navigation: any;
  route: any;
}

export default function EditProfileScreen({ navigation, route }: EditProfileScreenProps) {
  const { user, updateUser, fetchCurrentUser } = useAuthContext();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || DEFAULT_AVATAR);
  const [loading, setLoading] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);

  const handleSelectImage = async () => {
    try {
      // Request permission to access the camera roll
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Launch the image picker
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      /* const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      }); */

      if (!pickerResult.canceled) {
        setProfilePicture(pickerResult.assets[0].uri);
        setImageChanged(true);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        throw new Error('User data not found');
      }

      const userData = JSON.parse(userString);
      const token = userData.token;

      // Create form data for the image
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'profile.jpg';
      const fileType = filename.split('.').pop()?.toLowerCase() || 'jpg';

      // @ts-ignore - FormData type issues in React Native
      formData.append('profilePicture', {
        uri,
        name: filename,
        type: `image/${fileType}`,
      });

      console.log(`Uploading image to ${API_URL}/api/users/upload-profile-picture`);

      // Check if the API URL is accessible before attempting upload
      try {
        await axios.get(API_URL, { timeout: 5000 });
      } catch (connectionError) {
        console.error('API server not accessible:', connectionError);
        throw new Error('Cannot connect to the server. Please check your internet connection and try again.');
      }

      // Upload image to server with timeout and retry logic
      let retries = 2;
      let lastError = null;

      while (retries >= 0) {
        try {
          const response = await axios.post(`${API_URL}/api/users/upload-profile-picture`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`,
            },
            timeout: 30000, // 30 second timeout
          });

          if (!response.data || !response.data.profilePicture) {
            throw new Error('Invalid response from server');
          }

          return response.data.profilePicture;
        } catch (error: any) {
          lastError = error;
          console.error(`Upload attempt ${3 - retries} failed:`, error);

          if (retries > 0) {
            console.log(`Retrying upload (${retries} attempts remaining)...`);
            // Wait for 1 second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          retries--;
        }
      }

      // If we've exhausted all retries, throw the last error
      throw lastError;
    } catch (error: any) {
      console.error('Error uploading image:', error);

      // Provide more specific error messages
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timed out. Please check your internet connection and try again.');
      } else if (error.response) {
        // Server responded with an error
        throw new Error(`Server error: ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Network error. Please check your internet connection and try again.');
      } else {
        // Something else happened
        throw new Error(`Failed to upload profile picture: ${error.message}`);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      setLoading(true);

      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        throw new Error('User data not found');
      }

      const userData = JSON.parse(userString);
      const token = userData.token;

      let profilePictureUrl = user?.profilePicture || '';

      // Upload image if changed
      if (imageChanged && profilePicture !== DEFAULT_AVATAR) {
        try {
          profilePictureUrl = await uploadImage(profilePicture);
        } catch (uploadError: any) {
          console.error('Profile picture upload failed:', uploadError);
          Alert.alert(
            'Upload Failed',
            uploadError.message || 'Failed to upload profile picture. Your profile will be saved without the new picture.',
            [
              {
                text: 'Continue Anyway',
                onPress: () => console.log('User chose to continue without uploading the image')
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setLoading(false);
                  return;
                }
              }
            ]
          );

          // If user cancels, stop the save process
          if (loading) {
            return;
          }
        }
      }

      // Update user profile
      const response = await axios.put(
        `${API_URL}/api/users/profile`,
        {
          name,
          bio,
          profilePicture: profilePictureUrl,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        // Update user in context and storage
        await updateUser({
          name: response.data.name,
          bio: response.data.bio,
          profilePicture: response.data.profilePicture,
        });

        // Make sure the latest data is fetched
        await fetchCurrentUser();

        // Show success message and navigate back to profile screen
        Alert.alert(
          'Success',
          'Profile updated successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to the MyProfile screen within the ProfileStack
                navigation.navigate('MyProfile', {
                  refresh: true,
                  timestamp: Date.now()
                });
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <View style={styles.profileImageContainer}>
        <Image
          source={{ uri: profilePicture }}
          style={styles.profileImage}
        />
        <TouchableOpacity
          style={styles.editImageButton}
          onPress={handleSelectImage}
        >
          <Ionicons name="camera" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Write something about yourself"
          multiline
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: '30%',
    backgroundColor: '#4B0082',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4B0082',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
