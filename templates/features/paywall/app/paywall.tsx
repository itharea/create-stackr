import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '../src/components/ui/IconSymbol';
import { Theme } from '@/constants/Theme';
import { router, Stack } from 'expo-router';
import { useRevenueCat, useRevenueCatActions } from '../src/store/revenuecat.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../src/utils/logger';
import OnboardingLayout from '../src/components/ui/OnboardingLayout';
import { responsive, fontSize, getSpacing } from '@/utils/responsive';

interface PlanOption {
  id: string;
  title: string;
  price: string;
  period: string;
  badge?: string;
  revenueCatPackage: any;
  pricePerWeek?: string;
}

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    customerInfo,
    isLoading: subscriptionLoading,
    offerings,
  } = useRevenueCat();

  const { getOfferings, purchasePackage, restorePurchases } = useRevenueCatActions();

  const hasActiveSubscription = customerInfo?.entitlements.active ?
    Object.keys(customerInfo.entitlements.active).length > 0 : false;

  // Fetch offerings when component mounts
  useEffect(() => {
    getOfferings();
  }, [getOfferings]);

  const hasOfferings = useMemo(() => {
    return offerings && Object.keys(offerings.all).length > 0;
  }, [offerings]);

  const plans: PlanOption[] = useMemo(() => {
    const mappedPlans: PlanOption[] = [];

    if (hasOfferings && offerings) {
      // Use real offerings from RevenueCat
      for (const key in offerings.all) {
        if (offerings.all.hasOwnProperty(key)) {
          const offering = offerings.all[key];
          if (offering && offering.availablePackages?.length > 0) {
            const pkg = offering.availablePackages[0];
            let badge = '';
            let pricePerWeek = '';

            // Map plans according to receipt-scanner pattern
            if (offering.serverDescription === 'Weekly') {
              badge = 'Popular';
            } else if (offering.serverDescription === 'Annual') {
              badge = '80% OFF!';
              // Get the weekly price from RevenueCat for annual plans
              pricePerWeek = pkg.product.pricePerWeekString || '';
            }

            mappedPlans.push({
              id: pkg.identifier,
              title: offering.serverDescription === 'Weekly' ? '1 Week' :
                offering.serverDescription === 'Annual' ? '1 Year' :
                  offering.serverDescription === 'Monthly' ? '1 Month' : offering.serverDescription,
              price: pkg.product.priceString,
              period: `per ${pkg.packageType.toLowerCase()}`,
              badge,
              pricePerWeek,
              revenueCatPackage: pkg,
            });
          }
        }
      }
    } else {
      // Use mock data for development
      mappedPlans.push(
        {
          id: 'mock_weekly',
          title: '1 Week',
          price: '$4.99',
          period: 'per week',
          badge: 'Popular',
          revenueCatPackage: null,
        },
        {
          id: 'mock_annual',
          title: '1 Year',
          price: '$49.99',
          period: 'per year',
          badge: '80% OFF!',
          pricePerWeek: '$0.96',
          revenueCatPackage: null,
        },
        {
          id: 'mock_monthly',
          title: '1 Month',
          price: '$9.99',
          period: 'per month',
          revenueCatPackage: null,
        }
      );
    }

    // Sort: Weekly, Annual, Monthly
    mappedPlans.sort((a, b) => {
      const order = ['1 Week', '1 Year', '1 Month'];
      return order.indexOf(a.title) - order.indexOf(b.title);
    });

    return mappedPlans;
  }, [offerings]);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      // Select the Annual plan by default (80% OFF!)
      const annualPlan = plans.find(p => p.title === '1 Year') || plans[0];
      setSelectedPlan(annualPlan.id);
    }
  }, [plans, selectedPlan]);

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan || !plan.revenueCatPackage) {
      Alert.alert('Error', 'Unable to process subscription. Please try again later.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await purchasePackage(plan.revenueCatPackage);
      const success = result?.success;

      if (success) {
        Alert.alert(
          'Welcome to Premium!',
          'Your subscription is now active. You can now access all premium features!',
          [
            {
              text: 'Start Using App',
              onPress: async () => {
                // Mark onboarding as completed when subscription is successful
                await AsyncStorage.setItem('onboarding_completed', 'true');
                logger.info('Subscription successful - onboarding marked as completed');

                // Navigate to main app
                router.replace('/(tabs)');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to activate subscription. Please try again.');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('Subscription activation error:', e);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Mark onboarding as completed when user skips paywall
      await AsyncStorage.setItem('onboarding_completed', 'true');
      logger.info('Paywall skipped - onboarding marked as completed');

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Error completing onboarding after skip', { error });
      Alert.alert('Error', 'Something went wrong. Please restart the app.');
    }
  };

  const handleRestore = async () => {
    try {
      setIsLoading(true);
      await restorePurchases();
      Alert.alert('Success', 'Your purchases have been restored successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanCard = (plan: PlanOption) => {
    const isSelected = selectedPlan === plan.id;
    const hasPopularBadge = plan.badge === 'Popular';
    const hasDiscountBadge = plan.badge === '80% OFF!';

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          hasPopularBadge && !isSelected && styles.popularPlan,
          hasDiscountBadge && !isSelected && styles.discountPlan,
          isSelected && styles.selectedPlan,
        ]}
        onPress={() => setSelectedPlan(plan.id)}
        activeOpacity={0.7}
      >
        {plan.badge && (
          <View style={[
            styles.badge,
            hasPopularBadge && styles.popularBadge,
            hasDiscountBadge && styles.discountBadge,
          ]}>
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </View>
        )}

        <View style={styles.planContent}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <View style={styles.planPriceContainer}>
            <Text style={styles.planPrice}>{plan.price}</Text>
            {plan.pricePerWeek && (
              <View style={styles.weeklyPriceContainer}>
                <Text style={styles.pricePerWeek}>{plan.pricePerWeek}</Text>
                <Text style={styles.perWeekLabel}>per week</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Image placeholder for children prop
  const paywallContent = (
    <View style={styles.imageContainer}>
      <View style={styles.imagePlaceholder} />
    </View>
  );

  // Middle content: subscription plans with optional warning banner
  const middleContent = (
    <View style={styles.middleContentContainer}>
      {!hasOfferings && (
        <View style={styles.warningBanner}>
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#F59E0B" />
          <Text style={styles.warningText}>
            Test Mode: Showing mock pricing. Configure RevenueCat to see real offerings.
          </Text>
        </View>
      )}
      <View style={styles.plansContainer}>
        {plans.map(renderPlanCard)}
      </View>
    </View>
  );

  // Footer content: billing info and links
  const footerContent = (
    <>
      <View style={styles.billingInfo}>
        <View style={styles.billingRow}>
          <IconSymbol name="checkmark" size={16} color="#4CAF50" />
          <Text style={styles.billingText}>Recurring billing, cancel anytime</Text>
        </View>
      </View>

      <View style={styles.footerLinks}>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.footerLinkText}>Terms</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.footerLinkText}>Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.footerLinkText}>Restore</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Loading content when subscription is loading
  const loadingContent = subscriptionLoading ? (
    <>
      <ActivityIndicator size="large" color={Theme.colors.primary} />
      <Text style={styles.loadingText}>Loading subscription details...</Text>
    </>
  ) : undefined;

  // Show subscription management if already subscribed
  if (hasActiveSubscription) {
    const subscriptionContent = (
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder} />
        <View style={styles.subscribedIconOverlay}>
          <IconSymbol
            name="checkmark.circle.fill"
            size={80}
            color="#4CAF50"
          />
        </View>
      </View>
    );

    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <OnboardingLayout
          title="You're All Set!"
          subtitle="You already have an active subscription. Enjoy all premium features!"
          onContinue={async () => {
            // Mark onboarding as completed for users with existing subscriptions
            await AsyncStorage.setItem('onboarding_completed', 'true');
            logger.info('Existing subscription detected - onboarding marked as completed');

            // Navigate to main app
            router.replace('/(tabs)');
          }}
          continueText="Continue to App"
          pageIndicators={4}
          totalPages={4}
        >
          {subscriptionContent}
        </OnboardingLayout>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingLayout
        title="Premium"
        subtitle="Unlock all premium features and advanced functionality"
        pageIndicators={4}
        totalPages={4}
        onContinue={handlePurchase}
        continueDisabled={!selectedPlan || isLoading}
        continueLoading={isLoading}
        loadingContent={loadingContent}
        middleContent={!subscriptionLoading ? middleContent : undefined}
        footerContent={!subscriptionLoading ? footerContent : undefined}
        onSkip={handleSkip}
        showSkipAfter={3}
      >
        {paywallContent}
      </OnboardingLayout>
    </>
  );
}

const imageSize = responsive.getImageContainerSize();
const planCardHeight = responsive.getPlanCardHeight();

const styles = StyleSheet.create({
  // Image Section
  imageContainer: {
    width: imageSize.width,
    height: imageSize.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: responsive.scale(20),
    borderWidth: 2,
    borderColor: Theme.colors.borderLight,
    borderStyle: 'dashed',
  },

  // Middle Content Container
  middleContentContainer: {
    width: '100%',
  },

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: responsive.scale(8),
    padding: responsive.scale(10),
    marginBottom: getSpacing(12),
    gap: getSpacing(8),
  },
  warningText: {
    flex: 1,
    fontSize: fontSize(12),
    color: '#92400E',
    fontWeight: '500',
  },

  // Plans Section - Horizontal Layout
  plansContainer: {
    flexDirection: 'row',
    gap: responsive.scale(8),
  },

  planCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.scale(12),
    padding: responsive.scale(10),
    borderWidth: responsive.scale(1.5),
    borderColor: '#E5E7EB',
    position: 'relative',
    alignItems: 'center',
    height: planCardHeight,
    justifyContent: 'center',
  },
  selectedPlan: {
    borderColor: Theme.colors.primary,
    backgroundColor: `${Theme.colors.primary}14`, // Light blue tint (14 = 8% opacity in hex)
    borderWidth: responsive.scale(2.5),
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: responsive.scale(8),
    elevation: 5,
  },
  popularPlan: {
    borderColor: Theme.colors.primary,
  },
  discountPlan: {
    borderColor: Theme.colors.primary,
  },
  badge: {
    position: 'absolute',
    top: responsive.scale(-8),
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: getSpacing(8),
    paddingVertical: getSpacing(3),
    borderRadius: responsive.scale(8),
    zIndex: 1,
  },
  popularBadge: {
    backgroundColor: Theme.colors.primary,
  },
  discountBadge: {
    backgroundColor: Theme.colors.primary,
  },
  badgeText: {
    color: Theme.colors.textInverse,
    fontSize: fontSize(10),
    fontWeight: '700',
  },
  planContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
    paddingTop: getSpacing(12),
  },
  planTitle: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: getSpacing(4),
  },
  planPriceContainer: {
    alignItems: 'center',
  },
  planPrice: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: Theme.colors.text,
  },
  weeklyPriceContainer: {
    backgroundColor: Theme.colors.primary,
    borderRadius: responsive.scale(6),
    paddingHorizontal: getSpacing(8),
    paddingVertical: getSpacing(4),
    marginTop: getSpacing(8),
    flexDirection: 'column',
    alignItems: 'center',
  },
  pricePerWeek: {
    fontSize: fontSize(12),
    color: Theme.colors.textInverse,
    fontWeight: '600',
  },
  perWeekLabel: {
    fontSize: fontSize(11),
    color: Theme.colors.textInverse,
    fontWeight: '400',
  },

  // Billing Info
  billingInfo: {
    alignItems: 'center',
    marginBottom: getSpacing(10),
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(6),
  },
  billingText: {
    fontSize: fontSize(13),
    color: Theme.colors.textSecondary,
  },

  // Footer Links
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: getSpacing(28),
  },
  footerLinkText: {
    fontSize: fontSize(13),
    color: Theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // Loading state
  loadingText: {
    fontSize: fontSize(16),
    color: Theme.colors.textSecondary,
    marginTop: getSpacing(16),
    textAlign: 'center',
  },

  // Subscribed state
  subscribedIconOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
