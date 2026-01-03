import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
  overlay = false,
  style,
  textStyle,
}) => {
  const theme = useAppTheme();

  // Use provided color or fall back to theme primary
  const spinnerColor = color ?? theme.colors.primary;

  // Dynamic styles based on theme
  const overlayStyle = {
    backgroundColor: theme.mode === 'dark'
      ? 'rgba(9, 9, 11, 0.9)'  // neutral-950 with opacity
      : 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.lg,
  };

  const overlayBackgroundStyle = {
    backgroundColor: theme.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.5)'
      : 'rgba(0, 0, 0, 0.3)',
  };

  const containerStyle = [
    styles.container,
    overlay && [styles.overlay, overlayStyle],
    style,
  ];

  const Wrapper = overlay ? View : React.Fragment;
  const wrapperProps = overlay
    ? { style: [styles.overlayBackground, overlayBackgroundStyle] }
    : {};

  return (
    <Wrapper {...wrapperProps}>
      <View style={containerStyle}>
        <ActivityIndicator size={size} color={spinnerColor} />
        {text && (
          <Text style={[styles.text, { color: spinnerColor }, textStyle]}>
            {text}
          </Text>
        )}
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  overlay: {
    minWidth: 100,
    minHeight: 100,
  },

  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
