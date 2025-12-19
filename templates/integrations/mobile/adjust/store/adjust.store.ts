import { create } from 'zustand';
import { adjustService } from '../services/adjustService';
import { useRevenueCatStore } from './revenuecat.store';
import { useScateStore } from './scate.store';
import { logger } from '../utils/logger';

interface AdjustState {
  // State
  isInitialized: boolean;
  adid: string | null;
  isRetrievingAdid: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  retrieveAdid: () => Promise<void>;
  retrieveAdidWithRetry: () => Promise<void>;
  setAdid: (adid: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  notifyOtherStores: (adid: string) => void;

  // Computed values
  hasAdid: boolean;
}

export const useAdjustStore = create<AdjustState>((set, get) => ({
  // Initial state
  isInitialized: false,
  adid: null,
  isRetrievingAdid: false,
  isLoading: false,
  error: null,
  hasAdid: false,

  // Actions
  initialize: () => {
    const state = get();
    if (state.isInitialized) {
      logger.info('AdjustStore: Already initialized, skipping');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('AdjustStore: Initializing Adjust SDK...');

      adjustService.initialize();
      
      set({
        isInitialized: true,
        isLoading: false,
        error: null,
        hasAdid: false
      });

      logger.info('AdjustStore: Adjust SDK initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Adjust SDK';
      logger.error('AdjustStore: Failed to initialize Adjust SDK', { error });
      set({
        error: errorMessage,
        isLoading: false,
        isInitialized: false,
        hasAdid: false
      });
    }
  },

  retrieveAdid: async () => {
    const state = get();
    if (state.isRetrievingAdid || state.adid) {
      logger.info('AdjustStore: ADID retrieval already in progress or ADID already available');
      return;
    }

    try {
      set({ isRetrievingAdid: true, error: null });
      logger.info('AdjustStore: Retrieving ADID...');

      const adid = await adjustService.getAdid();
      
      if (adid) {
        set({
          adid,
          isRetrievingAdid: false,
          error: null,
          hasAdid: true
        });

        // Notify other stores about ADID availability
        get().notifyOtherStores(adid);
        
        logger.info('AdjustStore: ADID retrieved successfully', { adid });
      } else {
        set({
          adid: null,
          isRetrievingAdid: false,
          error: 'ADID not available',
          hasAdid: false
        });
        logger.info('AdjustStore: ADID not available');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve ADID';
      logger.error('AdjustStore: Failed to retrieve ADID', { error });
      set({
        error: errorMessage,
        isRetrievingAdid: false,
        adid: null,
        hasAdid: false
      });
    }
  },

  retrieveAdidWithRetry: async () => {
    const state = get();
    if (state.isRetrievingAdid || state.adid) {
      logger.info('AdjustStore: ADID retrieval with retry already in progress or ADID already available');
      return;
    }

    try {
      set({ isRetrievingAdid: true, error: null });
      logger.info('AdjustStore: Retrieving ADID with retry mechanism...');

      const adid = await adjustService.retrieveAdidWithRetry();
      
      if (adid) {
        set({
          adid,
          isRetrievingAdid: false,
          error: null,
          hasAdid: true
        });

        // Notify other stores about ADID availability
        get().notifyOtherStores(adid);
        
        logger.info('AdjustStore: ADID retrieved successfully with retry', { adid });
      } else {
        set({
          adid: null,
          isRetrievingAdid: false,
          error: 'ADID not available after retry attempts',
          hasAdid: false
        });
        logger.info('AdjustStore: ADID not available after retry attempts');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve ADID with retry';
      logger.error('AdjustStore: Failed to retrieve ADID with retry', { error });
      set({
        error: errorMessage,
        isRetrievingAdid: false,
        adid: null,
        hasAdid: false
      });
    }
  },

  setAdid: (adid) => {
    const currentState = get();
    if (currentState.adid === adid) {
      return; // No change needed
    }

    set({ adid, hasAdid: !!adid });
    
    if (adid) {
      // Notify other stores about ADID availability
      get().notifyOtherStores(adid);
    }
    
    logger.info('AdjustStore: ADID set', { adid });
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  reset: () => {
    set({
      isInitialized: false,
      adid: null,
      isRetrievingAdid: false,
      isLoading: false,
      error: null,
      hasAdid: false
    });
    logger.info('AdjustStore: Store reset');
  },

  // Helper method to notify other stores about ADID
  notifyOtherStores: (adid: string) => {
    try {
      // Notify RevenueCat store
      const revenueCatStore = useRevenueCatStore.getState();
      if (revenueCatStore.isInitialized) {
        revenueCatStore.setAdjustId(adid);
      }

      // Notify Scate store  
      const scateStore = useScateStore.getState();
      if (scateStore.isInitialized) {
        scateStore.setAdid(adid);
      }

      logger.info('AdjustStore: Other stores notified about ADID', { adid });
    } catch (error) {
      logger.error('AdjustStore: Failed to notify other stores about ADID', { error });
    }
  },

}));

// Selectors for commonly used Adjust state
export const useAdjust = () => {
  const state = useAdjustStore();
  return {
    isInitialized: state.isInitialized,
    adid: state.adid,
    isRetrievingAdid: state.isRetrievingAdid,
    isLoading: state.isLoading,
    error: state.error,
    hasAdid: state.hasAdid,
  };
};

export const useAdjustActions = () => {
  const state = useAdjustStore();
  return {
    initialize: state.initialize,
    retrieveAdid: state.retrieveAdid,
    retrieveAdidWithRetry: state.retrieveAdidWithRetry,
    setAdid: state.setAdid,
    setLoading: state.setLoading,
    setError: state.setError,
    reset: state.reset,
  };
};