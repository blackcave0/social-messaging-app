import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CreateScreen() {
  const [postText, setPostText] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Post</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          multiline
          value={postText}
          onChangeText={setPostText}
        />
        
        <View style={styles.mediaContainer}>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="image" size={24} color="#405DE6" />
            <Text style={styles.mediaButtonText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="videocam" size={24} color="#405DE6" />
            <Text style={styles.mediaButtonText}>Video</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#405DE6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  mediaContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  mediaButtonText: {
    marginLeft: 5,
    color: '#405DE6',
  },
}); 