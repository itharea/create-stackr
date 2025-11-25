import { create } from 'zustand';
import { scateService } from '../services/scateService';
import { logger } from '../utils/logger';

interface ScateState {
  // State
  isInitialized: boolean;
  adid: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  setAdid: (adid: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed values
  hasAdid: boolean;
}

export const useScateStore = create<ScateState>((set, get) => ({
  // Initial state
  isInitialized: false,
  adid: null,
  isLoading: false,
  error: null,

  // Actions
  initialize: () => {
    const state = get();
    if (state.isInitialized) {
      logger.info('ScateStore: Already initialized, skipping');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('ScateStore: Initializing Scate SDK...');

      scateService.initialize();
      
      set({
        isInitialized: true,
        isLoading: false,
        error: null
      });

      logger.info('ScateStore: Scate SDK initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Scate SDK';
      logger.error('ScateStore: Failed to initialize Scate SDK', { error });
      set({
        error: errorMessage,
        isLoading: false,
        isInitialized: false
      });
    }
  },

  setAdid: (adid) => {
    try {
      const currentState = get();
      if (currentState.adid === adid) {
        logger.info('ScateStore: ADID already set, skipping');
        return;
      }

      logger.info('ScateStore: Setting ADID', { adid });
      scateService.setAdid(adid);
      
      set({ adid });
      logger.info('ScateStore: ADID set successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set ADID';
      logger.error('ScateStore: Failed to set ADID', { error });
      set({ error: errorMessage });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  reset: () => {
    set({
      isInitialized: false,
      adid: null,
      isLoading: false,
      error: null
    });
    scateService.reset();
    logger.info('ScateStore: Store reset');
  },

  // Computed values
  get hasAdid() {
    const state = get();
    return !!state.adid;
  },
}));

// Selectors for commonly used Scate state
export const useScate = () => {
  const state = useScateStore();
  return {
    isInitialized: state.isInitialized,
    adid: state.adid,
    isLoading: state.isLoading,
    error: state.error,
    hasAdid: state.hasAdid,
  };
};

export const useScateActions = () => {
  const state = useScateStore();
  return {
    initialize: state.initialize,
    setAdid: state.setAdid,
    setLoading: state.setLoading,
    setError: state.setError,
    reset: state.reset,
  };
};