import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, useAuth as useAuthStore_selector, useAuthActions } from '../store/auth.store';
import { useUIActions } from '../store/ui.store';
import { authService } from '../services/auth';
import { errorService } from '../services/errorService';

export const useAuth = () => {
  const authState = useAuthStore_selector();
  const authActions = useAuthActions();
  const { showNotification } = useUIActions();

  // Check authentication status on app start
  const checkAuth = useCallback(async () => {
    if (authState.isAuthChecked) return;

    authActions.setLoading(true);
    
    try {
      if (authState.token) {
        // Token exists, verify it with backend
        const user = await authService.getCurrentUser();
        authActions.setUser(user);
      }
    } catch (error: any) {
      // Token is invalid or expired, clear auth
      authActions.clearAuth();
      
      // Don't show error notification for expired tokens on app start
      if (error?.message && !error.message.includes('token') && !error.message.includes('auth')) {
        const appError = errorService.handleGenericError(error);
        showNotification({
          type: 'error',
          title: 'Authentication Error',
          message: errorService.getUserFriendlyMessage(appError),
        });
      }
    } finally {
      authActions.setLoading(false);
      authActions.setAuthChecked(true);
    }
  }, [authState.isAuthChecked, authState.token, authActions, showNotification]);

  // Login function
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    authActions.setLoading(true);
    authActions.setError(null);

    try {
      const response = await authService.login(credentials);
      authActions.setUser(response.user);
      authActions.setToken(response.token);
      
      showNotification({
        type: 'success',
        title: 'Welcome back!',
        message: `Hello, ${response.user.name}`,
      });
      
      return { success: true };
    } catch (error: any) {
      const appError = errorService.handleGenericError(error);
      const errorMessage = errorService.getUserFriendlyMessage(appError);
      
      authActions.setError(errorMessage);
      showNotification({
        type: 'error',
        title: 'Login Failed',
        message: errorMessage,
      });
      
      return { success: false, error: errorMessage };
    } finally {
      authActions.setLoading(false);
    }
  }, [authActions, showNotification]);

  // Register function
  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) => {
    authActions.setLoading(true);
    authActions.setError(null);

    try {
      const response = await authService.register(data);
      authActions.setUser(response.user);
      authActions.setToken(response.token);
      
      showNotification({
        type: 'success',
        title: 'Account Created!',
        message: `Welcome, ${response.user.name}!`,
      });
      
      return { success: true };
    } catch (error: any) {
      const appError = errorService.handleGenericError(error);
      const errorMessage = errorService.getUserFriendlyMessage(appError);
      
      authActions.setError(errorMessage);
      showNotification({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage,
      });
      
      return { success: false, error: errorMessage };
    } finally {
      authActions.setLoading(false);
    }
  }, [authActions, showNotification]);

  // Logout function
  const logout = useCallback(async () => {
    authActions.setLoading(true);
    
    try {
      // Clear local state immediately for better UX
      authActions.clearAuth();
      
      showNotification({
        type: 'success',
        title: 'Logged out',
        message: 'You have been logged out successfully',
      });
      
      return { success: true };
    } catch (error: any) {
      // Even if logout fails on backend, clear local state
      authActions.clearAuth();
      
      const appError = errorService.handleGenericError(error);
      showNotification({
        type: 'warning',
        title: 'Logout Warning',
        message: 'You have been logged out, but there was an issue with the server.',
      });
      
      return { success: true }; // Return success because local logout worked
    } finally {
      authActions.setLoading(false);
    }
  }, [authActions, showNotification]);

  // Update profile function
  const updateProfile = useCallback(async (data: { name?: string; email?: string }) => {
    if (!authState.user) return { success: false, error: 'Not authenticated' };

    authActions.setLoading(true);
    
    try {
      const updatedUser = await authService.updateProfile(data);
      authActions.setUser(updatedUser);
      
      showNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully',
      });
      
      return { success: true };
    } catch (error: any) {
      const appError = errorService.handleGenericError(error);
      const errorMessage = errorService.getUserFriendlyMessage(appError);
      
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage,
      });
      
      return { success: false, error: errorMessage };
    } finally {
      authActions.setLoading(false);
    }
  }, [authState.user, authActions, showNotification]);

  // Change password function
  const changePassword = useCallback(async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    authActions.setLoading(true);

    try {
      await authService.changePassword(data);

      showNotification({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been changed successfully',
      });

      return { success: true };
    } catch (error: any) {
      const appError = errorService.handleGenericError(error);
      const errorMessage = errorService.getUserFriendlyMessage(appError);

      showNotification({
        type: 'error',
        title: 'Password Change Failed',
        message: errorMessage,
      });

      return { success: false, error: errorMessage };
    } finally {
      authActions.setLoading(false);
    }
  }, [authActions, showNotification]);

  // Delete account function
  const deleteAccount = useCallback(async () => {
    authActions.setLoading(true);

    try {
      await authService.deleteAccount();

      // Clear onboarding completed flag to restart onboarding flow
      try {
        await AsyncStorage.removeItem('onboarding_completed');
        console.log('Onboarding flag cleared after account deletion');
      } catch (error) {
        console.error('Failed to clear onboarding flag', error);
        // Don't throw - not critical
      }

      // Clear local state after successful deletion
      authActions.clearAuth();

      showNotification({
        type: 'success',
        title: 'Account Deleted',
        message: 'Your account has been permanently deleted',
      });

      return { success: true };
    } catch (error: any) {
      // Clear onboarding flag even on error
      try {
        await AsyncStorage.removeItem('onboarding_completed');
      } catch (e) {
        console.error('Failed to clear onboarding flag', e);
      }

      // Even if deletion fails on backend, clear local state (user wanted logout completely)
      authActions.clearAuth();

      const appError = errorService.handleGenericError(error);
      const errorMessage = errorService.getUserFriendlyMessage(appError);

      showNotification({
        type: 'warning',
        title: 'Account Deletion Warning',
        message: 'Local data cleared, but there was an issue with the server: ' + errorMessage,
      });

      return { success: false, error: errorMessage };
    } finally {
      authActions.setLoading(false);
    }
  }, [authActions, showNotification]);

  // Initialize auth check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    // State
    ...authState,

    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    checkAuth,
  };
};