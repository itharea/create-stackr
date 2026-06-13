import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Pressable,
  Animated,
} from 'react-native';
import { useAppTheme, AppTheme } from '@/context/theme-context';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  inputStyle,
  leftIcon,
  rightIcon,
  secureTextEntry,
  showPasswordToggle = false,
  ...props
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const hasError = !!error;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: theme.timing.fast,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: theme.timing.fast,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      hasError ? theme.colors.error : theme.colors.border,
      hasError ? theme.colors.error : theme.colors.primary,
    ],
  });

  const actualRightIcon = showPasswordToggle && secureTextEntry ? (
    <Pressable onPress={() => setIsSecure(!isSecure)} style={styles.iconContainer} hitSlop={8}>
      <Text style={styles.toggleText}>{isSecure ? 'Show' : 'Hide'}</Text>
    </Pressable>
  ) : rightIcon ? (
    <View style={styles.iconContainer}>{rightIcon}</View>
  ) : null;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, hasError && styles.errorLabel]}>{label}</Text>
      )}

      <Animated.View style={[styles.inputContainer, { borderColor }]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            actualRightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          {...props}
        />
        {actualRightIcon}
      </Animated.View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { marginBottom: theme.spacing[4] },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  errorLabel: { color: theme.colors.error },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  inputWithLeftIcon: { paddingLeft: theme.spacing[2] },
  inputWithRightIcon: { paddingRight: theme.spacing[2] },
  iconContainer: { paddingHorizontal: theme.spacing[3], justifyContent: 'center', alignItems: 'center' },
  toggleText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.primary, fontWeight: '600' },
  errorText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.error, marginTop: theme.spacing[1] },
  hintText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textMuted, marginTop: theme.spacing[1] },
});
