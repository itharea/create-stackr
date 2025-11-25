import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Base dimensions for scaling (iPhone 14 as reference)
const baseWidth = 390;
const baseHeight = 844;

// Device type categories based on height
export const DeviceTypes = {
  SMALL: 'small',   // iPhone SE, mini devices (< 700)
  MEDIUM: 'medium', // Standard iPhones (700-900)
  LARGE: 'large',   // Plus/Pro Max, tablets (> 900)
} as const;

export type DeviceType = typeof DeviceTypes[keyof typeof DeviceTypes];

interface ResponsiveSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

interface ResponsiveInterface {
  getDeviceType(): DeviceType;
  scale(size: number): number;
  verticalScale(size: number): number;
  moderateScale(size: number, factor?: number): number;
  wp(percentage: number): number;
  hp(percentage: number): number;
  fontSize(size: number): number;
  getSpacing(size: number): number;
  getSafeHeight(): number;
  getContentHeight(): number;
  getImageContainerSize(): { width: number; height: number };
  getButtonBottomPosition(): number;
  getSectionHeights(): { topSection: number; bottomPadding: number; pageIndicatorMargin: number };
  getPlanCardHeight(): number;
  spacing?: ResponsiveSpacing;
}

export const responsive: ResponsiveInterface = {
  // Get current device type
  getDeviceType(): DeviceType {
    if (screenHeight < 700) return DeviceTypes.SMALL;
    if (screenHeight > 900) return DeviceTypes.LARGE;
    return DeviceTypes.MEDIUM;
  },

  // Scale based on width
  scale(size: number): number {
    return (screenWidth / baseWidth) * size;
  },

  // Scale based on height
  verticalScale(size: number): number {
    return (screenHeight / baseHeight) * size;
  },

  // Moderate scale - combines width and height scaling with factor
  moderateScale(size: number, factor: number = 0.5): number {
    const widthScale = responsive.scale(size);
    return size + (widthScale - size) * factor;
  },

  // Get responsive width as percentage
  wp(percentage: number): number {
    return (screenWidth * percentage) / 100;
  },

  // Get responsive height as percentage
  hp(percentage: number): number {
    return (screenHeight * percentage) / 100;
  },

  // Get responsive font size
  fontSize(size: number): number {
    const deviceType = responsive.getDeviceType();

    switch (deviceType) {
      case DeviceTypes.SMALL:
        return responsive.moderateScale(size * 0.9); // 10% smaller
      case DeviceTypes.LARGE:
        return responsive.moderateScale(size * 1.1); // 10% larger
      default:
        return responsive.moderateScale(size);
    }
  },

  // Get responsive margin/padding based on device type
  getSpacing(size: number): number {
    const deviceType = responsive.getDeviceType();

    switch (deviceType) {
      case DeviceTypes.SMALL:
        return responsive.scale(size * 0.8); // 20% less spacing
      case DeviceTypes.LARGE:
        return responsive.scale(size * 1.2); // 20% more spacing
      default:
        return responsive.scale(size);
    }
  },

  // Safe height calculation (excluding status bar and home indicator)
  getSafeHeight(): number {
    const statusBarHeight = Platform.OS === 'ios' ? 44 : 24;
    const homeIndicatorHeight = Platform.OS === 'ios' ? 34 : 0;
    return screenHeight - statusBarHeight - homeIndicatorHeight;
  },

  // Content height for onboarding/paywall screens
  getContentHeight(): number {
    const safeHeight = responsive.getSafeHeight();
    const deviceType = responsive.getDeviceType();

    switch (deviceType) {
      case DeviceTypes.SMALL:
        return safeHeight * 0.85; // More conservative for small screens
      case DeviceTypes.LARGE:
        return safeHeight * 0.9;  // More space available
      default:
        return safeHeight * 0.88;
    }
  },

  // Dynamic image container sizing
  getImageContainerSize(): { width: number; height: number } {
    const deviceType = responsive.getDeviceType();
    const maxWidth = screenWidth - responsive.getSpacing(48);

    let height: number;
    switch (deviceType) {
      case DeviceTypes.SMALL:
        height = responsive.hp(25); // 25% of screen height
        break;
      case DeviceTypes.LARGE:
        height = responsive.hp(28); // 30% of screen height
        break;
      default:
        height = responsive.hp(28); // 28% of screen height
        break;
    }

    return {
      width: Math.min(maxWidth, 320),
      height: Math.min(height, 280),
    };
  },

  // Button positioning from bottom
  getButtonBottomPosition(): number {
    const deviceType = responsive.getDeviceType();

    switch (deviceType) {
      case DeviceTypes.SMALL:
        return responsive.verticalScale(40); // Closer to bottom on small screens
      case DeviceTypes.LARGE:
        return responsive.verticalScale(80); // More space on large screens
      default:
        return responsive.verticalScale(60);
    }
  },

  // Get flexible section heights for onboarding/paywall
  getSectionHeights(): {
    topSection: number;
    bottomPadding: number;
    pageIndicatorMargin: number;
  } {
    const deviceType = responsive.getDeviceType();
    const contentHeight = responsive.getContentHeight();

    switch (deviceType) {
      case DeviceTypes.SMALL:
        return {
          topSection: contentHeight * 0.35,
          bottomPadding: responsive.verticalScale(180),
          pageIndicatorMargin: responsive.verticalScale(100),
        };
      case DeviceTypes.LARGE:
        return {
          topSection: contentHeight * 0.4,
          bottomPadding: responsive.verticalScale(220),
          pageIndicatorMargin: responsive.verticalScale(140),
        };
      default:
        return {
          topSection: contentHeight * 0.38,
          bottomPadding: responsive.verticalScale(200),
          pageIndicatorMargin: responsive.verticalScale(120),
        };
    }
  },

  // Get adaptive plan card height for paywall
  getPlanCardHeight(): number {
    const deviceType = responsive.getDeviceType();

    switch (deviceType) {
      case DeviceTypes.SMALL:
        return responsive.verticalScale(120);
      case DeviceTypes.LARGE:
        return responsive.verticalScale(128);
      default:
        return responsive.verticalScale(124);
    }
  },
};

// Add spacing object after responsive is fully defined
responsive.spacing = {
  xs: responsive.scale(4),
  sm: responsive.scale(8),
  md: responsive.scale(16),
  lg: responsive.scale(24),
  xl: responsive.scale(32),
  xxl: responsive.scale(48),
};

// Export convenience functions
export const { wp, hp, scale, verticalScale, moderateScale, fontSize, getSpacing } = responsive;

// Export screen dimensions
export const screenDimensions = {
  width: screenWidth,
  height: screenHeight,
};

// Helper to check if screen is small
export const isSmallScreen = () => responsive.getDeviceType() === DeviceTypes.SMALL;
export const isLargeScreen = () => responsive.getDeviceType() === DeviceTypes.LARGE;
