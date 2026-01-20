import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useAppTheme, AppTheme } from '@/context/theme-context';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%', height = 20, borderRadius, style,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const resolvedBorderRadius = borderRadius ?? theme.borderRadius.md;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View style={[styles.skeleton, { width, height, borderRadius: resolvedBorderRadius, opacity }, style]} />
  );
};

export const SkeletonText: React.FC<{ lines?: number; style?: ViewStyle }> = ({ lines = 3, style }) => {
  const theme = useAppTheme();

  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
          style={i < lines - 1 ? { marginBottom: theme.spacing[2] } : undefined}
        />
      ))}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  skeleton: { backgroundColor: theme.colors.backgroundTertiary },
});
