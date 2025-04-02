import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useAuth from '../hooks/useAuth';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [darkMode, setDarkMode] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout", 
          onPress: () => {
            logout();
            // Navigation will be handled by the AuthProvider
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleEditProfile = () => {
    // @ts-ignore - Navigation typing can be improved
    navigation.navigate('EditProfile');
  };

  const renderSettingItem = (
    icon: string, 
    title: string, 
    onPress?: () => void, 
    rightElement?: React.ReactNode,
    color?: string
  ) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon as any} size={24} color={color || "#333"} style={styles.icon} />
        <Text style={[styles.settingTitle, color ? {color} : null]}>{title}</Text>
      </View>
      <View style={styles.settingItemRight}>
        {rightElement || (
          onPress && <Ionicons name="chevron-forward" size={20} color="#999" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {renderSettingItem('person-outline', 'Edit Profile', handleEditProfile)}
        {renderSettingItem('key-outline', 'Change Password', () => 
          Alert.alert('Coming Soon', 'This feature will be available soon!')
        )}
        {renderSettingItem('log-out-outline', 'Logout', handleLogout, undefined, '#FF3B30')}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {renderSettingItem(
          'moon-outline', 
          'Dark Mode', 
          undefined,
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: "#d3d3d3", true: "#4CAF50" }}
            thumbColor={darkMode ? "#fff" : "#f4f3f4"}
          />
        )}
        {renderSettingItem(
          'notifications-outline', 
          'Notifications', 
          undefined,
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#d3d3d3", true: "#4CAF50" }}
            thumbColor={notificationsEnabled ? "#fff" : "#f4f3f4"}
          />
        )}
        {renderSettingItem('language-outline', 'Language', () => 
          Alert.alert('Coming Soon', 'This feature will be available soon!')
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        {renderSettingItem('lock-closed-outline', 'Privacy Settings', () => 
          Alert.alert('Coming Soon', 'This feature will be available soon!')
        )}
        {renderSettingItem('shield-checkmark-outline', 'Security', () => 
          Alert.alert('Coming Soon', 'This feature will be available soon!')
        )}
        {renderSettingItem('eye-off-outline', 'Blocked Users', () => 
          Alert.alert('Coming Soon', 'This feature will be available soon!')
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        {renderSettingItem('help-circle-outline', 'Help Center', () => 
          Alert.alert('Coming Soon', 'This feature will be available soon!')
        )}
        {renderSettingItem('mail-outline', 'Contact Us', () => 
          Alert.alert('Coming Soon', 'This feature will be available soon!')
        )}
        {renderSettingItem('information-circle-outline', 'About', () => 
          Alert.alert('About', 'Social Messaging App v1.0.0\nCreated with React Native and Expo')
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Social Messaging App v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
    paddingHorizontal: 10,
    color: '#444',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
});

export default SettingsScreen;
