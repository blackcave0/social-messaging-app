import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../context/AuthContext';
import { API_URL } from '../utils/config';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// Define the navigation prop type
type CreateStoryNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CreateStoryScreen = () => {
  const [image, setImage] = useState<string | null>(null);
  const { user } = useAuthContext();
  const navigation = useNavigation<CreateStoryNavigationProp>();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadStory = async () => {
    if (!image || !user?._id) {
      Alert.alert('Please select an image or video first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('media', {
        uri: image,
        type: 'image/jpeg',
        name: 'story.jpg',
      } as any);
      formData.append('userId', user._id);

      const response = await axios.post(`${API_URL}/api/stories`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (response.data.success) {
        Alert.alert('Success', 'Story uploaded successfully');

        // Navigate to the Stories screen to view the newly uploaded story
        // Use a slight delay to allow the server to process the story
        setTimeout(() => {
          // Navigate with the current user ID to see their own story
          navigation.navigate('Stories', { userId: user._id, refresh: true });
        }, 300);
      }
    } catch (error) {
      console.error('Error uploading story:', error);
      Alert.alert('Error', 'Failed to upload story');
    }
  };

  return (
    <View style={styles.container}>
      {image ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.preview} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={uploadStory}>
              <Text style={styles.buttonText}>Upload Story</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setImage(null)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
            <Text style={styles.optionButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
            <Text style={styles.optionButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 20,
  },
  button: {
    backgroundColor: '#0095F6',
    padding: 15,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: '#0095F6',
    padding: 20,
    borderRadius: 5,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  optionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CreateStoryScreen; 