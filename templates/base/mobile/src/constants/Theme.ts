/**
 * Design system for Mobile Platform
 * Unified theme with light/dark mode support
 */

import { Platform } from 'react-native';

// Shared palette
const palette = {
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

const spacing = {
  1: 4, 2: 8, 3: 12, 4: 16,
  5: 20, 6: 24, 8: 32, 10: 40,
  12: 48, 16: 64, 20: 80, 24: 96,
};

const borderRadius = {
  none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999,
};

const fontSize = {
  xs: 12, sm: 14, base: 16, lg: 18,
  xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
};

const fontFamily = Platform.OS === 'ios'
  ? { regular: 'System', medium: 'System', semiBold: 'System', bold: 'System' }
  : { regular: 'Roboto', medium: 'Roboto-Medium', semiBold: 'Roboto-Medium', bold: 'Roboto-Bold' };

// Light theme colors (monochrome primary matching web)
const lightColors = {
  background: palette.neutral[0],
  backgroundSecondary: palette.neutral[50],
  backgroundTertiary: palette.neutral[100],
  card: palette.neutral[0],

  text: palette.neutral[950],
  textSecondary: palette.neutral[600],
  textMuted: palette.neutral[500],
  textLight: palette.neutral[400],
  textInverse: palette.neutral[0],

  border: palette.neutral[200],
  borderLight: palette.neutral[100],
  borderStrong: palette.neutral[400],

  // Monochrome primary (matches web design system)
  primary: palette.neutral[900],
  primaryDark: palette.neutral[950],
  primaryLight: palette.neutral[100],

  icon: palette.neutral[700],
  iconMuted: palette.neutral[400],

  success: palette.semantic.success,
  warning: palette.semantic.warning,
  error: palette.semantic.error,
  info: palette.semantic.info,
};

// Dark theme colors (monochrome primary matching web)
const darkColors = {
  background: palette.neutral[950],
  backgroundSecondary: palette.neutral[900],
  backgroundTertiary: palette.neutral[800],
  card: palette.neutral[900],

  text: palette.neutral[50],
  textSecondary: palette.neutral[400],
  textMuted: palette.neutral[500],
  textLight: palette.neutral[600],
  textInverse: palette.neutral[950],

  border: palette.neutral[800],
  borderLight: palette.neutral[900],
  borderStrong: palette.neutral[500],

  // Monochrome primary (matches web design system)
  primary: palette.neutral[50],
  primaryDark: palette.neutral[0],
  primaryLight: palette.neutral[800],

  icon: palette.neutral[300],
  iconMuted: palette.neutral[500],

  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
};

const createShadows = (mode: 'light' | 'dark') => {
  const opacity = mode === 'dark' ? 0.4 : 0.08;
  return {
    none: {},
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: opacity * 0.5,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: opacity,
      shadowRadius: 4,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity * 1.5,
      shadowRadius: 8,
      elevation: 8,
    },
    button: {
      shadowColor: palette.neutral[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
  };
};

export type ThemeMode = 'light' | 'dark';

export const createTheme = (mode: ThemeMode = 'light') => ({
  mode,
  colors: mode === 'light' ? lightColors : darkColors,
  palette,
  spacing,
  borderRadius,
  typography: { fontFamily, fontSize },
  shadows: createShadows(mode),
  timing: { fast: 150, base: 200, slow: 300 },
});

// Default export for backwards compatibility
export const Theme = createTheme('light');
export type AppTheme = ReturnType<typeof createTheme>;
