import { create } from 'zustand';
import { attService } from '../services/attService';
import { TrackingStatus, TrackingPermissionResult } from '../services/trackingPermissions';
import { logger } from '../utils/logger';

interface ATTState {
  // State
  permissionStatus: TrackingStatus;
  isPermissionRequested: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  requestPermissions: () => Promise<TrackingPermissionResult>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed values
  canTrack: boolean;
  isTrackingSupported: boolean;
}

export const useATTStore = create<ATTState>((set, get) => ({
  // Initial state
  permissionStatus: TrackingStatus.NOT_DETERMINED,
  isPermissionRequested: false,
  isLoading: false,
  error: null,

  // Actions
  initialize: async () => {
    const state = get();
    if (state.isLoading) {
      logger.info('ATTStore: Already initializing, skipping');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('ATTStore: Initializing ATT permissions...');

      const result = await attService.initialize();
      
      set({
        permissionStatus: result.status,
        isLoading: false,
        error: null
      });

      logger.info('ATTStore: ATT permissions initialized', { 
        status: result.status,
        canTrack: result.canTrack 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize ATT permissions';
      logger.error('ATTStore: Failed to initialize ATT permissions', { error });
      set({
        error: errorMessage,
        isLoading: false,
        permissionStatus: TrackingStatus.DENIED
      });
    }
  },

  requestPermissions: async () => {
    const state = get();
    if (state.isLoading) {
      logger.info('ATTStore: Permission request already in progress');
      return { status: state.permissionStatus, canTrack: state.canTrack };
    }

    try {
      set({ isLoading: true, error: null });
      logger.info('ATTStore: Requesting ATT permissions...');

      const result = await attService.requestPermissions();
      
      set({
        permissionStatus: result.status,
        isPermissionRequested: true,
        isLoading: false,
        error: null
      });

      logger.info('ATTStore: ATT permissions requested', { 
        status: result.status,
        canTrack: result.canTrack 
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request ATT permissions';
      logger.error('ATTStore: Failed to request ATT permissions', { error });
      
      const result = {
        status: TrackingStatus.DENIED,
        canTrack: false
      };

      set({
        error: errorMessage,
        isLoading: false,
        permissionStatus: TrackingStatus.DENIED,
        isPermissionRequested: true
      });

      return result;
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  reset: () => {
    set({
      permissionStatus: TrackingStatus.NOT_DETERMINED,
      isPermissionRequested: false,
      isLoading: false,
      error: null
    });
    attService.reset();
    logger.info('ATTStore: Store reset');
  },

  // Computed values
  get canTrack() {
    const state = get();
    return state.permissionStatus === TrackingStatus.GRANTED || 
           state.permissionStatus === TrackingStatus.UNSUPPORTED;
  },

  get isTrackingSupported() {
    return attService.isTrackingSupported();
  },
}));

// Selectors for commonly used ATT state
export const useATT = () => {
  const state = useATTStore();
  return {
    permissionStatus: state.permissionStatus,
    isPermissionRequested: state.isPermissionRequested,
    isLoading: state.isLoading,
    error: state.error,
    canTrack: state.canTrack,
    isTrackingSupported: state.isTrackingSupported,
  };
};

export const useATTActions = () => {
  const state = useATTStore();
  return {
    initialize: state.initialize,
    requestPermissions: state.requestPermissions,
    setLoading: state.setLoading,
    setError: state.setError,
    reset: state.reset,
  };
};