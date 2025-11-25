import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessionService, Session, MigrationEligibilityResponse } from '../services/session';
import { logger } from '../utils/logger';

export interface MigrateSessionData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface SessionMigrationResponse {
  user: {
    id: string;
    email: string;
    name: string;
    preferredCurrency: string;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
}

interface SessionState {
  // State
  session: Session | null;
  sessionToken: string | null;
  deviceId: string | null;
  isLoading: boolean;
  isSessionChecked: boolean;
  error: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  setSessionToken: (token: string | null) => void;
  setDeviceId: (deviceId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSessionChecked: (checked: boolean) => void;
  clearSession: () => void;
  clearError: () => void;

  // Async actions
  initializeSession: () => Promise<void>;
  deleteSession: () => Promise<void>;
  isSessionValid: () => Promise<boolean>;
  getMigrationEligibility: () => Promise<MigrationEligibilityResponse>;
  migrateSession: (data: MigrateSessionData) => Promise<SessionMigrationResponse>;
  refreshSession: () => Promise<void>;

  // Computed values
  hasValidSession: boolean;
}

export const useSessionStore = create<SessionState>()(
  (set, get) => ({
    // Initial state
    session: null,
    sessionToken: null,
    deviceId: null,
    isLoading: false,
    isSessionChecked: false,
    error: null,

    // Actions
    setSession: (session) => set({ session }),
    setSessionToken: (sessionToken) => set({ sessionToken }),
    setDeviceId: (deviceId) => set({ deviceId }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setSessionChecked: (isSessionChecked) => set({ isSessionChecked }),
    
    clearSession: () => set({ 
      session: null, 
      sessionToken: null, 
      deviceId: null,
      error: null,
      isLoading: false 
    }),
    
    clearError: () => set({ error: null }),

    // Async actions
    initializeSession: async () => {
      try {
        logger.debug('SessionStore: Initializing session...');
        set({ isLoading: true, error: null });

        const sessionData = await sessionService.initialize();
        
        if (sessionData) {
          set({
            session: sessionData,
            sessionToken: await sessionService.getSessionToken(),
            deviceId: sessionService.getDeviceId(),
          });
          logger.info('SessionStore: Session initialized successfully', { 
            sessionId: sessionData.id,
            deviceId: sessionData.deviceId 
          });
        } else {
          logger.warn('SessionStore: No session data returned from initialize');
          set({ session: null, sessionToken: null });
        }
        
      } catch (error) {
        logger.error('SessionStore: Failed to initialize session', { error });
        
        const errorMessage = error instanceof Error ? error.message : 'Session initialization failed';
        set({ error: errorMessage, session: null, sessionToken: null });
        
      } finally {
        set({ isLoading: false, isSessionChecked: true });
      }
    },

    deleteSession: async () => {
      try {
        logger.info('SessionStore: Deleting session...');
        set({ isLoading: true, error: null });

        // Clear onboarding flag to restart onboarding flow
        try {
          await AsyncStorage.removeItem('onboarding_completed');
          logger.info('Onboarding flag cleared after session deletion');
        } catch (error) {
          logger.error('Failed to clear onboarding flag', { error });
          // Don't throw - not critical
        }

        await sessionService.deleteSession();
        set({ session: null, sessionToken: null, deviceId: null });

        logger.info('SessionStore: Session deleted successfully');

      } catch (error) {
        // Still clear onboarding flag even on error
        try {
          await AsyncStorage.removeItem('onboarding_completed');
        } catch (e) {
          logger.error('Failed to clear onboarding flag in error handler', { e });
        }

        logger.error('SessionStore: Failed to delete session', { error });

        const errorMessage = error instanceof Error ? error.message : 'Session deletion failed';
        set({ error: errorMessage });

        throw error;

      } finally {
        set({ isLoading: false });
      }
    },

    isSessionValid: async () => {
      try {
        logger.debug('SessionStore: Checking session validity...');
        
        const isValid = await sessionService.isSessionValid();
        
        if (!isValid && get().session) {
          // Session became invalid, clear it
          logger.warn('SessionStore: Session is no longer valid, clearing');
          set({ session: null, sessionToken: null, error: 'Session expired' });
        }
        
        return isValid;
        
      } catch (error) {
        logger.error('SessionStore: Error checking session validity', { error });
        return false;
      }
    },

    getMigrationEligibility: async () => {
      try {
        logger.debug('SessionStore: Checking migration eligibility...');
        set({ error: null });
        
        const eligibility = await sessionService.getMigrationEligibility();
        
        logger.debug('SessionStore: Migration eligibility checked', { 
          canMigrate: eligibility.canMigrate
        });
        
        return eligibility;
        
      } catch (error) {
        logger.error('SessionStore: Failed to check migration eligibility', { error });
        
        const errorMessage = error instanceof Error ? error.message : 'Migration eligibility check failed';
        set({ error: errorMessage });
        
        throw error;
      }
    },

    migrateSession: async (data: MigrateSessionData): Promise<SessionMigrationResponse> => {
      try {
        logger.info('SessionStore: Migrating session to user account...');
        set({ isLoading: true, error: null });
        
        const sessionToken = get().sessionToken;
        if (!sessionToken) {
          throw new Error('No session token available for migration');
        }

        // Call the migration endpoint
        const migrationData = {
          sessionToken,
          ...data,
        };

        // This would be a direct API call since migration is a one-time operation
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sessions/migrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(migrationData),
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: { message?: string } };
          throw new Error(errorData.error?.message || 'Migration failed');
        }

        const result = await response.json() as SessionMigrationResponse;
        
        // Clear session data after successful migration
        set({ session: null, sessionToken: null, deviceId: null });
        
        logger.info('SessionStore: Session migrated successfully', {
          userId: result.user.id,
        });
        
        return result;
        
      } catch (error) {
        logger.error('SessionStore: Failed to migrate session', { error });
        
        const errorMessage = error instanceof Error ? error.message : 'Session migration failed';
        set({ error: errorMessage });
        
        throw error;
        
      } finally {
        set({ isLoading: false });
      }
    },

    refreshSession: async () => {
      try {
        logger.info('SessionStore: Refreshing session...');
        set({ error: null });
        
        // Check if current session is still valid
        const currentSession = sessionService.getCurrentSession();
        if (currentSession) {
          const isValid = await sessionService.isSessionValid();
          
          if (isValid) {
            // Session is still valid, just update the local state
            set({ session: currentSession });
            logger.debug('SessionStore: Session is still valid');
            return;
          }
        }
        
        // Session is invalid or doesn't exist, initialize a new one
        await get().initializeSession();
        
      } catch (error) {
        logger.error('SessionStore: Failed to refresh session', { error });
        
        const errorMessage = error instanceof Error ? error.message : 'Session refresh failed';
        set({ error: errorMessage });
        
        throw error;
      }
    },

    // Computed values
    get hasValidSession() {
      const state = get();
      return !!(state.session && state.sessionToken);
    },
  })
);

// Selectors for commonly used combinations
export const useSession = () => {
  const state = useSessionStore();
  return {
    session: state.session,
    sessionToken: state.sessionToken,
    deviceId: state.deviceId,
    isLoading: state.isLoading,
    isSessionChecked: state.isSessionChecked,
    error: state.error,
    hasValidSession: state.hasValidSession,
    clearError: state.clearError,
  };
};

export const useSessionActions = () => {
  const state = useSessionStore();
  return {
    setSession: state.setSession,
    setSessionToken: state.setSessionToken,
    setDeviceId: state.setDeviceId,
    setLoading: state.setLoading,
    setError: state.setError,
    setSessionChecked: state.setSessionChecked,
    clearSession: state.clearSession,
    initializeSession: state.initializeSession,
    deleteSession: state.deleteSession,
    isSessionValid: state.isSessionValid,
    getMigrationEligibility: state.getMigrationEligibility,
    migrateSession: state.migrateSession,
    refreshSession: state.refreshSession,
  };
};