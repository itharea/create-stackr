import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IconSymbol } from './icon-symbol';
import { useAppTheme, AppTheme } from '@/context/theme-context';
import { responsive, fontSize, getSpacing } from '@/utils/responsive';

interface OnboardingLayoutProps {
  children?: React.ReactNode; // For the image/content area
  title: string;
  subtitle: string;
  pageIndicators?: number; // Current page (1-4)
  totalPages?: number; // Total pages (3 for onboarding, 4 for paywall)
  onContinue: () => void;
  continueText?: string;
  footerContent?: React.ReactNode; // For billing info and footer links in paywall
  continueDisabled?: boolean;
  continueLoading?: boolean;
  loadingContent?: React.ReactNode;
  middleContent?: React.ReactNode; // For subscription plans in paywall
  onSkip?: () => void; // Skip functionality
  showSkipAfter?: number; // Show skip button after X seconds (default 3)
}

export default function OnboardingLayout({
  children,
  title,
  subtitle,
  pageIndicators,
  totalPages = 3,
  onContinue,
  continueText = 'Continue',
  footerContent,
  continueDisabled = false,
  continueLoading = false,
  loadingContent,
  middleContent,
  onSkip,
  showSkipAfter = 3,
}: OnboardingLayoutProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showSkipButton, setShowSkipButton] = useState(false);

  useEffect(() => {
    if (onSkip) {
      const timer = setTimeout(() => {
        setShowSkipButton(true);
      }, showSkipAfter * 1000);

      return () => clearTimeout(timer);
    }
  }, [onSkip, showSkipAfter]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Skip Button */}
        {showSkipButton && onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="xmark"
              size={responsive.moderateScale(20)}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          {loadingContent ? (
            <View style={styles.loadingWrapper}>
              {loadingContent}
            </View>
          ) : (
            <>
              {/* Scrollable content area */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Top Section - Image/Content Area */}
                <View style={styles.topSection}>
                  {children || (
                    <View style={styles.imagePlaceholder}>
                      {/* Default placeholder */}
                    </View>
                  )}
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>

                {/* Middle Content - Subscription Plans (only in paywall) */}
                {middleContent && (
                  <View style={styles.middleContentWrapper}>
                    {middleContent}
                  </View>
                )}

                {/* Bottom padding to ensure content doesn't overlap with fixed bottom */}
                <View style={styles.bottomPadding} />
              </ScrollView>

              {/* Fixed Bottom Content - Background and spacing */}
              <View style={[
                styles.fixedBottomContent,
                footerContent ? styles.fixedBottomContentWithFooter : styles.fixedBottomContentNoFooter
              ]}>
                {/* Page Indicators */}
                {pageIndicators && (
                  <View style={styles.pageIndicators}>
                    {Array.from({ length: totalPages }, (_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.indicator,
                          pageIndicators === index + 1 && styles.indicatorActive,
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* Footer Content (billing info, links) - positioned at bottom */}
                {footerContent && (
                  <View style={styles.footerContentWrapper}>
                    {footerContent}
                  </View>
                )}
              </View>

              {/* Continue Button - Fixed position from bottom */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    (continueDisabled || continueLoading) && styles.continueButtonDisabled
                  ]}
                  onPress={onContinue}
                  activeOpacity={continueDisabled || continueLoading ? 1 : 0.7}
                  disabled={continueDisabled || continueLoading}
                >
                  <View style={styles.buttonSpacer} />
                  <Text style={styles.continueButtonText}>{continueText}</Text>
                  <IconSymbol
                    name="arrow.right"
                    size={20}
                    color={theme.colors.textInverse}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => {
  const sectionHeights = responsive.getSectionHeights();
  const imageSize = responsive.getImageContainerSize();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    skipButton: {
      position: 'absolute',
      top: responsive.verticalScale(60),
      right: getSpacing(24),
      width: responsive.scale(32),
      height: responsive.scale(32),
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: responsive.scale(16),
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      ...theme.shadows.small,
    },
    content: {
      flex: 1,
      paddingHorizontal: getSpacing(24),
    },

    // ScrollView styles
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: getSpacing(16),
    },

    // Top Section - Image area
    topSection: {
      height: sectionHeights.topSection,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: responsive.verticalScale(200), // Minimum height to prevent squishing
    },

    // Image placeholder
    imagePlaceholder: {
      width: imageSize.width,
      height: imageSize.height,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: responsive.scale(20),
      borderWidth: 2,
      borderColor: theme.colors.borderLight,
      borderStyle: 'dashed',
    },

    // Text content
    textContainer: {
      alignItems: 'center',
      paddingHorizontal: responsive.scale(20),
      marginBottom: responsive.scale(16),
    },

    title: {
      fontSize: fontSize(24),
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: fontSize(30),
      marginTop: responsive.scale(-12),
      marginBottom: responsive.scale(8),
    },
    subtitle: {
      fontSize: fontSize(16),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: fontSize(22),
    },

    // Middle content wrapper (for subscription plans)
    middleContentWrapper: {
      marginTop: getSpacing(16),
      marginBottom: getSpacing(12),
      flex: 1,
      justifyContent: 'center',
    },

    // Bottom padding for ScrollView to prevent content overlap with fixed bottom
    bottomPadding: {
      height: sectionHeights.bottomPadding,
    },

    // Fixed bottom content container
    fixedBottomContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background,
      paddingHorizontal: getSpacing(24),
      paddingTop: getSpacing(20),
    },
    fixedBottomContentWithFooter: {
      paddingBottom: 0,
    },
    fixedBottomContentNoFooter: {
      paddingBottom: getSpacing(20),
    },

    // Page indicators
    pageIndicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: responsive.scale(8),
      marginBottom: sectionHeights.pageIndicatorMargin,
      height: responsive.scale(8),
    },
    indicator: {
      width: responsive.scale(8),
      height: responsive.scale(8),
      borderRadius: responsive.scale(4),
      backgroundColor: theme.colors.borderLight,
    },
    indicatorActive: {
      backgroundColor: theme.colors.primary,
      width: responsive.scale(8), // Reverted to dot instead of pill
    },

    // Continue button - Fixed position from bottom
    buttonContainer: {
      position: 'absolute',
      bottom: responsive.getButtonBottomPosition(),
      left: getSpacing(24),
      right: getSpacing(24),
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: responsive.scale(25),
      paddingVertical: responsive.scale(18),
      paddingHorizontal: getSpacing(32),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...theme.shadows.button,
    },
    continueButtonDisabled: {
      backgroundColor: theme.colors.textLight,
      ...theme.shadows.small,
    },
    continueButtonText: {
      fontSize: fontSize(16),
      fontWeight: '600',
      color: theme.colors.textInverse,
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
    },
    buttonSpacer: {
      width: responsive.scale(20),
    },

    // Footer content wrapper
    footerContentWrapper: {
      alignItems: 'center',
    },

    // Loading wrapper
    loadingWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};
