import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/components/ui/button';
import { useAppTheme, AppTheme } from '@/context/theme-context';

export default function NotFoundScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      handleGoHome();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.message}>Page Not Found</Text>
      <Text style={styles.description}>
        The page you're looking for doesn't exist or has been moved.
      </Text>

      <View style={styles.actions}>
        <Button
          title="Go Back"
          onPress={handleGoBack}
          style={styles.button}
        />
        <Button
          title="Go Home"
          variant="outline"
          onPress={handleGoHome}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },

  title: {
    fontSize: 72,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
  },

  message: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  actions: {
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },

  button: {
    width: '100%',
  },
});
