import api from './api';
import {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  UpdateUserData,
  ChangePasswordData,
} from '../store/auth.store';

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Login failed');
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Registration failed');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get current user');
    }
  }

  async updateProfile(userData: UpdateUserData): Promise<User> {
    try {
      const response = await api.put<User>('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update profile');
    }
  }

  async changePassword(passwordData: ChangePasswordData): Promise<void> {
    try {
      await api.put('/auth/password', passwordData);
    } catch (error) {
      throw this.handleError(error, 'Failed to change password');
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      await api.delete('/auth/account');
    } catch (error) {
      throw this.handleError(error, 'Failed to delete account');
    }
  }

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await api.get('/auth/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Health check failed');
    }
  }

  private handleError(error: any, fallbackMessage: string): Error {
    if (error.response?.data?.error?.message) {
      return new Error(error.response.data.error.message);
    }
    
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    
    if (error.message) {
      return new Error(error.message);
    }
    
    return new Error(fallbackMessage);
  }
}

export const authService = AuthService.getInstance();