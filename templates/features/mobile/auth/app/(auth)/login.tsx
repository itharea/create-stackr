import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { LoginForm } from '../../src/components/auth';
import { IconSymbol } from '../../src/components/ui/IconSymbol';
import { useAppTheme, AppTheme } from '@/context/ThemeContext';
import { useAuth } from '../../src/hooks';

export default function LoginScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { isAuthenticated } = useAuth();

  // Watch for auth state changes (handles both native and browser OAuth)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    // Navigate to the main app (for email/password login)
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
            color={theme.colors.text}
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...theme.shadows.small,
  },
  content: {
    flex: 1,
  },
});
