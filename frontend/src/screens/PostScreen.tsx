import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RootStackScreenProps } from '../types/navigation';

const PostScreen: React.FC<RootStackScreenProps<'Post'>> = ({ route, navigation }) => {
  return (
    <View style={styles.container}>
      <Text>Post Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PostScreen; 