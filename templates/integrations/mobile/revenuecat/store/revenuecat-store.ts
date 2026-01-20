import { create } from 'zustand';
import { revenueCatService } from '../services/revenuecat-service';
import { CustomerInfo, PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';
import { logger } from '../utils/logger';

interface RevenueCatState {
  // State
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  adjustId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  setAdjustId: (adjustId: string) => void;
  getCustomerInfo: () => Promise<void>;
  getOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; userCancelled: boolean }>;
  restorePurchases: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed values
  hasActiveSubscription: boolean;
  getActiveEntitlements: () => string[];
}

export const useRevenueCatStore = create<RevenueCatState>((set, get) => ({
  // Initial state
  isInitialized: false,
  customerInfo: null,
  offerings: null,
  adjustId: null,
  isLoading: false,
  error: null,

  // Actions
  initialize: () => {
    const state = get();
    if (state.isInitialized) {
      logger.info('RevenueCatStore: Already initialized, skipping');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('RevenueCatStore: Initializing RevenueCat SDK...');

      revenueCatService.initialize();
      
      set({
        isInitialized: true,
        isLoading: false,
        error: null
      });

      logger.info('RevenueCatStore: RevenueCat SDK initialized successfully');

      // Get initial customer info
      get().getCustomerInfo();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize RevenueCat SDK';
      logger.error('RevenueCatStore: Failed to initialize RevenueCat SDK', { error });
      set({
        error: errorMessage,
        isLoading: false,
        isInitialized: false
      });
    }
  },

  setAdjustId: (adjustId) => {
    try {
      const currentState = get();
      if (currentState.adjustId === adjustId) {
        logger.info('RevenueCatStore: Adjust ID already set, skipping');
        return;
      }

      logger.info('RevenueCatStore: Setting Adjust ID', { adjustId });
      revenueCatService.setAdjustId(adjustId);
      
      set({ adjustId });
      logger.info('RevenueCatStore: Adjust ID set successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set Adjust ID';
      logger.error('RevenueCatStore: Failed to set Adjust ID', { error });
      set({ error: errorMessage });
    }
  },

  getCustomerInfo: async () => {
    const state = get();
    if (state.isLoading) {
      logger.info('RevenueCatStore: Customer info request already in progress');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('RevenueCatStore: Getting customer info...');

      const customerInfo = await revenueCatService.getCustomerInfo();

      set({
        customerInfo,
        isLoading: false,
        error: null
      });

      logger.info('RevenueCatStore: Customer info retrieved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get customer info';
      logger.error('RevenueCatStore: Failed to get customer info', { error });
      set({
        error: errorMessage,
        isLoading: false,
        customerInfo: null
      });
    }
  },

  getOfferings: async () => {
    const state = get();
    if (state.isLoading) {
      logger.info('RevenueCatStore: Offerings request already in progress');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('RevenueCatStore: Getting offerings...');

      const offerings = await revenueCatService.getOfferings();

      set({
        offerings,
        isLoading: false,
        error: null
      });

      logger.info('RevenueCatStore: Offerings retrieved successfully', {
        offeringsCount: Object.keys(offerings.all).length,
        hasCurrent: !!offerings.current,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get offerings';
      logger.error('RevenueCatStore: Failed to get offerings', { error });
      set({
        error: errorMessage,
        isLoading: false,
        offerings: null
      });
    }
  },

  purchasePackage: async (pkg) => {
    const state = get();
    if (state.isLoading) {
      logger.info('RevenueCatStore: Purchase already in progress');
      return { success: false, userCancelled: false };
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('RevenueCatStore: Purchasing package', { packageId: pkg.identifier });

      const result = await revenueCatService.purchasePackage(pkg);
      
      set({
        customerInfo: result.customerInfo,
        isLoading: false,
        error: null
      });

      const success = !result.userCancelled;
      logger.info('RevenueCatStore: Package purchase completed', { 
        success,
        userCancelled: result.userCancelled 
      });

      return { success, userCancelled: result.userCancelled };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to purchase package';
      logger.error('RevenueCatStore: Failed to purchase package', { error });
      set({
        error: errorMessage,
        isLoading: false
      });
      return { success: false, userCancelled: false };
    }
  },

  restorePurchases: async () => {
    const state = get();
    if (state.isLoading) {
      logger.info('RevenueCatStore: Restore purchases already in progress');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('RevenueCatStore: Restoring purchases...');

      const customerInfo = await revenueCatService.restorePurchases();
      
      set({
        customerInfo,
        isLoading: false,
        error: null
      });

      logger.info('RevenueCatStore: Purchases restored successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore purchases';
      logger.error('RevenueCatStore: Failed to restore purchases', { error });
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  reset: () => {
    set({
      isInitialized: false,
      customerInfo: null,
      offerings: null,
      adjustId: null,
      isLoading: false,
      error: null
    });
    revenueCatService.reset();
    logger.info('RevenueCatStore: Store reset');
  },

  // Computed values
  get hasActiveSubscription() {
    const state = get();
    if (!state.customerInfo) return false;
    return Object.keys(state.customerInfo.entitlements.active).length > 0;
  },

  getActiveEntitlements: () => {
    const state = get();
    if (!state.customerInfo) return [];
    return Object.keys(state.customerInfo.entitlements.active);
  },
}));

// Selectors for commonly used RevenueCat state
export const useRevenueCat = () => {
  const state = useRevenueCatStore();
  return {
    isInitialized: state.isInitialized,
    customerInfo: state.customerInfo,
    offerings: state.offerings,
    adjustId: state.adjustId,
    isLoading: state.isLoading,
    error: state.error,
    hasActiveSubscription: state.hasActiveSubscription,
    activeEntitlements: state.getActiveEntitlements(),
  };
};

export const useRevenueCatActions = () => {
  const state = useRevenueCatStore();
  return {
    initialize: state.initialize,
    setAdjustId: state.setAdjustId,
    getCustomerInfo: state.getCustomerInfo,
    getOfferings: state.getOfferings,
    purchasePackage: state.purchasePackage,
    restorePurchases: state.restorePurchases,
    setLoading: state.setLoading,
    setError: state.setError,
    reset: state.reset,
  };
};