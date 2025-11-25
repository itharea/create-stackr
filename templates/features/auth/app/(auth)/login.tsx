import React from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { LoginForm } from '../../src/components/auth';
import { IconSymbol } from '../../src/components/ui/IconSymbol';
import { Theme } from '@/constants/Theme';

export default function LoginScreen() {
  const handleLoginSuccess = () => {
    // Navigate to the main app
    router.replace('/(tabs)');
  };

  const handleSwitchToRegister = () => {
    router.push('/(auth)/register');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="chevron.left"
            size={24}
            color={Theme.colors.text}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Theme.shadows.small,
  },
  content: {
    flex: 1,
  },
});