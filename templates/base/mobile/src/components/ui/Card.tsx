import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable, Animated } from 'react-native';
import { useAppTheme, AppTheme } from '@/context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children, title, subtitle, onPress, style, variant = 'default',
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    }
  };

  const Content = (
    <>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </>
  );

  const cardStyle = [styles.card, styles[variant], style];

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable style={cardStyle} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          {Content}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={cardStyle}>{Content}</View>;
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, overflow: 'hidden' },
  default: { borderWidth: 1, borderColor: theme.colors.borderLight, ...theme.shadows.small },
  outlined: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: 'transparent' },
  header: { padding: theme.spacing[4], paddingBottom: 0 },
  title: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing[1] },
  subtitle: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
  content: { padding: theme.spacing[4] },
});
