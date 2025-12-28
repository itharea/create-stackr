import React, { useRef, useMemo } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  PressableProps,
  Animated,
} from 'react-native';
import { useAppTheme, AppTheme } from '@/context/ThemeContext';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled,
  style,
  textStyle,
  ...props
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={[
      fullWidth && styles.fullWidth,
      { transform: [{ scale: scaleAnim }] },
    ]}>
      <Pressable
        style={[
          styles.base,
          styles[variant],
          styles[size],
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          variant === 'primary' && !isDisabled && theme.shadows.button,
          style,
        ]}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? theme.colors.textInverse : theme.colors.primary}
          />
        ) : (
          <Text style={[
            styles.text,
            styles[`${variant}Text` as keyof typeof styles],
            styles[`${size}Text` as keyof typeof styles],
            isDisabled && styles.disabledText,
            textStyle,
          ]}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.backgroundSecondary },
  outline: { backgroundColor: 'transparent', borderColor: theme.colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },

  small: { paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2], minHeight: 36 },
  medium: { paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3], minHeight: 48 },
  large: { paddingHorizontal: theme.spacing[6], paddingVertical: theme.spacing[4], minHeight: 56 },

  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  text: { fontWeight: '600', textAlign: 'center' },
  primaryText: { color: theme.colors.textInverse },
  secondaryText: { color: theme.colors.text },
  outlineText: { color: theme.colors.text },
  ghostText: { color: theme.colors.primary },

  smallText: { fontSize: theme.typography.fontSize.sm },
  mediumText: { fontSize: theme.typography.fontSize.base },
  largeText: { fontSize: theme.typography.fontSize.lg },

  disabledText: {},
});
