import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaLayoutProps {
  children: ReactNode;
  style?: ViewStyle;
  includeTopInset?: boolean;
  includeBottomInset?: boolean;
}

/**
 * A component that handles safe area insets for full-screen layouts
 */
const SafeAreaLayout = ({
  children,
  style,
  includeTopInset = true,
  includeBottomInset = true,
}: SafeAreaLayoutProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: includeTopInset ? insets.top : 0,
          paddingBottom: includeBottomInset ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default SafeAreaLayout; 