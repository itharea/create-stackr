import { create } from 'zustand';

interface UIState {
  // Global loading states
  isAppLoading: boolean;
  isNetworkLoading: boolean;
  
  // Theme
  colorScheme: 'light' | 'dark' | 'system';
  
  // Notifications/Toasts
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  } | null;

  // Actions
  setAppLoading: (loading: boolean) => void;
  setNetworkLoading: (loading: boolean) => void;
  setColorScheme: (scheme: 'light' | 'dark' | 'system') => void;
  showNotification: (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }) => void;
  hideNotification: () => void;
  
  // Computed
  isAnyLoading: boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isAppLoading: false,
  isNetworkLoading: false,
  colorScheme: 'system',
  notification: null,

  // Actions
  setAppLoading: (isAppLoading) => set({ isAppLoading }),
  setNetworkLoading: (isNetworkLoading) => set({ isNetworkLoading }),
  setColorScheme: (colorScheme) => set({ colorScheme }),
  
  showNotification: (notificationData) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set({
      notification: {
        id,
        ...notificationData,
        duration: notificationData.duration ?? 4000,
      }
    });
    
    // Auto-hide after duration
    const duration = notificationData.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        const currentNotification = get().notification;
        if (currentNotification?.id === id) {
          set({ notification: null });
        }
      }, duration);
    }
  },
  
  hideNotification: () => set({ notification: null }),

  // Computed values
  get isAnyLoading() {
    const state = get();
    return state.isAppLoading || state.isNetworkLoading;
  },
}));

// Selectors for commonly used UI state
export const useUI = () => {
  const state = useUIStore();
  return {
    isAppLoading: state.isAppLoading,
    isNetworkLoading: state.isNetworkLoading,
    isAnyLoading: state.isAnyLoading,
    colorScheme: state.colorScheme,
    notification: state.notification,
  };
};

export const useUIActions = () => {
  const state = useUIStore();
  return {
    setAppLoading: state.setAppLoading,
    setNetworkLoading: state.setNetworkLoading,
    setColorScheme: state.setColorScheme,
    showNotification: state.showNotification,
    hideNotification: state.hideNotification,
  };
};