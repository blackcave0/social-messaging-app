import React from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from '../../src/screens/HomeScreen';
import { AuthProvider } from '../../src/context/AuthContext';

export default function TabsHomeScreen() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <AuthProvider>
          <HomeScreen navigation={{ 
            navigate: (screen: string, params?: any) => {
              // For now, just show an alert with the navigation info
              Alert.alert(
                "Navigation",
                `Navigating to ${screen} ${params ? JSON.stringify(params) : ''}`,
                [{ text: "OK" }]
              );
            }
          }} />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
