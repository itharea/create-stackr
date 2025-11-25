import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthChecked: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthChecked: (checked: boolean) => void;
  clearAuth: () => void;
  clearError: () => void;

  // Computed values
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      isAuthChecked: false,
      error: null,

      // Actions
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setAuthChecked: (isAuthChecked) => set({ isAuthChecked }),
      
      clearAuth: () => set({ 
        user: null, 
        token: null, 
        error: null,
        isLoading: false 
      }),
      
      clearError: () => set({ error: null }),

      // Computed values
      get isAuthenticated() {
        const state = get();
        return !!(state.user && state.token);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user and token, not loading states or errors
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token 
      }),
    }
  )
);

// Selectors for commonly used combinations
export const useAuth = () => {
  const state = useAuthStore();
  return {
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    isAuthChecked: state.isAuthChecked,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    clearError: state.clearError,
  };
};

export const useAuthActions = () => {
  const state = useAuthStore();
  return {
    setUser: state.setUser,
    setToken: state.setToken,
    setLoading: state.setLoading,
    setError: state.setError,
    setAuthChecked: state.setAuthChecked,
    clearAuth: state.clearAuth,
  };
};