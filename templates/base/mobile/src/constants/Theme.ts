/**
 * Design system for Mobile Platform Dev Kit
 * Light theme with clean, modern styling
 */

import { Platform } from "react-native";

// COLORS
const palette = {
  blue: {
    primary: "#4299E1",
    light: "#BEE3F8",
    lighter: "rgba(66, 153, 225, 0.1)",
    dark: "#2B6CB0",
  },
  neutral: {
    white: "#FFFFFF",
    black: "#000000",
    gray10: "#F7FAFC",
    gray20: "#EDF2F7",
    gray30: "#E2E8F0",
    gray40: "#CBD5E0",
    gray50: "#A0AEC0",
    gray60: "#718096",
    gray70: "#4A5568",
    gray80: "#2D3748",
    gray90: "#1A202C",
  },
  transparent: {
    white10: "rgba(255, 255, 255, 0.1)",
    white20: "rgba(255, 255, 255, 0.2)",
    white30: "rgba(255, 255, 255, 0.3)",
    white50: "rgba(255, 255, 255, 0.5)",
    white70: "rgba(255, 255, 255, 0.7)",
    white90: "rgba(255, 255, 255, 0.9)",
    black10: "rgba(0, 0, 0, 0.1)",
    black20: "rgba(0, 0, 0, 0.2)",
    black30: "rgba(0, 0, 0, 0.3)",
    black50: "rgba(0, 0, 0, 0.5)",
  },
  status: {
    success: "#48BB78",
    warning: "#ECC94B",
    error: "#F56565",
    info: "#4299E1",
  },
};

// SPACING
const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// TYPOGRAPHY
const fontFamily =
  Platform.OS === "ios"
    ? {
        regular: "System",
        medium: "System",
        semiBold: "System",
        bold: "System",
      }
    : {
        regular: "Roboto",
        medium: "Roboto-Medium",
        semiBold: "Roboto-Medium",
        bold: "Roboto-Bold",
      };

const fontSize = {
  xs: 12,
  s: 14,
  m: 16,
  l: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

const lineHeight = {
  xs: 16,
  s: 20,
  m: 24,
  l: 28,
  xl: 32,
  xxl: 36,
  xxxl: 40,
  huge: 48,
};

// SHADOWS
const shadows = {
  small: {
    shadowColor: palette.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: palette.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: palette.neutral.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    shadowColor: palette.blue.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

// BORDER RADIUS
const borderRadius = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  round: 100,
};

// Transitions & Animations
const timing = {
  fast: 200,
  medium: 300,
  slow: 500,
};

// Export the theme
export const Theme = {
  colors: {
    primary: palette.blue.primary,
    primaryDark: palette.blue.dark,
    primaryLight: palette.blue.light,
    background: palette.neutral.white,
    backgroundSecondary: palette.neutral.gray10,
    card: palette.neutral.white,
    text: palette.neutral.gray90,
    textSecondary: palette.neutral.gray70,
    textMuted: palette.neutral.gray60,
    textLight: palette.neutral.gray50,
    textInverse: palette.neutral.white,
    border: palette.neutral.gray30,
    borderLight: palette.neutral.gray20,
    icon: palette.neutral.gray70,
    iconMuted: palette.neutral.gray50,
    success: palette.status.success,
    warning: palette.status.warning,
    error: palette.status.error,
    info: palette.status.info,
  },
  palette,
  spacing,
  typography: {
    fontFamily,
    fontSize,
    lineHeight,
    headline1: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xxxl,
      lineHeight: lineHeight.xxxl,
    },
    headline2: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xxl,
      lineHeight: lineHeight.xxl,
    },
    headline3: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xl,
      lineHeight: lineHeight.xl,
    },
    subtitle1: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.l,
      lineHeight: lineHeight.l,
    },
    subtitle2: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.m,
      lineHeight: lineHeight.m,
    },
    body1: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.m,
      lineHeight: lineHeight.m,
    },
    body2: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.s,
      lineHeight: lineHeight.s,
    },
    button: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.m,
      lineHeight: lineHeight.m,
    },
    caption: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lineHeight.xs,
    },
  },
  shadows,
  borderRadius,
  timing,
};
