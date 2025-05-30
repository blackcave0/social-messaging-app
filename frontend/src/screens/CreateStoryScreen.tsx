import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  CreateStory: undefined;
  // Add other screen params as needed
};

type Props = NativeStackScreenProps<RootStackParamList, 'CreateStory'>;

const CreateStoryScreen: React.FC<Props> = ({ route, navigation }) => {
  return (
    <View style={styles.container}>
      <Text>Create Story Screen</Text>
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

export default CreateStoryScreen; 