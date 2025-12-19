import axios from 'axios';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';

export interface DeviceSession {
  id: string;
  deviceId: string;
  sessionToken: string;
  createdAt: string;
  lastActiveAt: string;
  migrated: boolean;
  migratedToUserId?: string;
  preferredCurrency: string;
}

export interface CreateDeviceSessionResponse {
  session: DeviceSession;
  sessionToken: string;
}

export interface DeviceSessionValidationResponse {
  valid: boolean;
  session?: DeviceSession;
}

export interface DeviceSessionMigrationEligibilityResponse {
  canMigrate: boolean;
  reason?: string;
}

class DeviceSessionService {
  private static instance: DeviceSessionService;
  private sessionToken: string | null = null;
  private deviceId: string | null = null;
  private session: DeviceSession | null = null;

  private readonly SESSION_TOKEN_KEY = 'device_session_token';
  private readonly DEVICE_ID_KEY = 'device_id';
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    logger.debug('DeviceSessionService: Initializing...');
  }

  public static getInstance(): DeviceSessionService {
    if (!DeviceSessionService.instance) {
      DeviceSessionService.instance = new DeviceSessionService();
    }
    return DeviceSessionService.instance;
  }

  async initialize(): Promise<DeviceSession | null> {
    try {
      logger.info('SessionService: Initializing session...');
      
      // Get or create device ID
      const deviceId = await this.getOrCreateDeviceId();
      
      // Check for existing session token
      const existingToken = await this.getSessionToken();
      
      if (existingToken) {
        // Validate existing device session
        const validation = await this.validateDeviceSession(existingToken);
        if (validation.valid && validation.session) {
          this.session = validation.session;
          this.sessionToken = existingToken;
          this.startHeartbeat();
          logger.info('DeviceSessionService: Restored existing device session');
          return validation.session;
        }
      }

      // Create new device session if no valid existing session
      const newSession = await this.createDeviceSession(deviceId);
      this.session = newSession.session;
      this.sessionToken = newSession.sessionToken;
      await this.setSessionToken(newSession.sessionToken);
      this.startHeartbeat();
      
      logger.info('SessionService: Created new session');
      return newSession.session;
      
    } catch (error) {
      logger.error('SessionService: Failed to initialize session', { error });
      throw error;
    }
  }

  async createDeviceSession(deviceId: string): Promise<CreateDeviceSessionResponse> {
    try {
      logger.info('DeviceSessionService: Creating new device session for device:', deviceId);

      const response = await api.post<CreateDeviceSessionResponse>('/device-sessions', { deviceId });

      logger.info('DeviceSessionService: Device session created successfully');
      return response.data;
      
    } catch (error) {
      logger.error('SessionService: Failed to create session', { error });
      
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error?.message || 'Failed to create session');
      }
      
      throw new Error('Session creation failed');
    }
  }

  async validateDeviceSession(sessionToken: string): Promise<DeviceSessionValidationResponse> {
    try {
      logger.debug('DeviceSessionService: Validating device session token...');

      const response = await api.post<DeviceSessionValidationResponse>('/device-sessions/validate', { sessionToken });

      logger.debug('DeviceSessionService: Device session validation complete');
      return response.data;
      
    } catch (error) {
      logger.error('SessionService: Failed to validate session', { error });
      
      // Return invalid for validation errors
      return { valid: false };
    }
  }

  async updateActivity(): Promise<void> {
    try {
      const token = await this.getSessionToken();
      if (!token) {
        logger.warn('SessionService: No session token for activity update');
        return;
      }

      logger.debug('SessionService: Updating session activity...');
      
      await api.put('/device-sessions/activity', { sessionToken: token });
      
      logger.debug('SessionService: Session activity updated');
      
    } catch (error) {
      logger.error('SessionService: Failed to update session activity', { error });
      
      // Don't throw for activity update errors
    }
  }

  async getMigrationEligibility(): Promise<DeviceSessionMigrationEligibilityResponse> {
    try {
      const token = await this.getSessionToken();
      if (!token) {
        throw new Error('No device session token available');
      }

      logger.debug('DeviceSessionService: Checking migration eligibility...');

      const response = await api.post<DeviceSessionMigrationEligibilityResponse>('/device-sessions/migration-eligibility', { sessionToken: token });

      logger.debug('DeviceSessionService: Migration eligibility checked');
      return response.data;
      
    } catch (error) {
      logger.error('SessionService: Failed to check migration eligibility', { error });
      
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error?.message || 'Failed to check migration eligibility');
      }
      
      throw new Error('Migration eligibility check failed');
    }
  }

  async deleteSession(): Promise<void> {
    try {
      const token = await this.getSessionToken();
      if (!token) {
        logger.warn('SessionService: No session token to delete');
        return;
      }

      logger.info('SessionService: Deleting session...');
      
      try {
        await api.delete('/device-sessions', { data: { sessionToken: token } });
      } catch (error) {
        logger.warn('SessionService: Session deletion API call failed, continuing with local cleanup', { error });
      }
      
      // Always clear local session data
      await this.clearSession();
      logger.info('SessionService: Session deleted successfully');
      
    } catch (error) {
      logger.error('SessionService: Error during session deletion', { error });
      // Still try to clear local data on error
      await this.clearSession();
    }
  }

  // Device ID management
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      // Try to get existing device ID from secure storage
      let deviceId = await SecureStore.getItemAsync(this.DEVICE_ID_KEY);
      
      if (deviceId) {
        this.deviceId = deviceId;
        logger.debug('SessionService: Found existing device ID');
        return deviceId;
      }
      
      // Generate new device ID
      deviceId = await this.generateDeviceId();
      await SecureStore.setItemAsync(this.DEVICE_ID_KEY, deviceId);
      this.deviceId = deviceId;
      
      logger.info('SessionService: Generated new device ID');
      return deviceId;
      
    } catch (error) {
      logger.error('SessionService: Failed to get/create device ID', { error });
      
      // Fallback to AsyncStorage if SecureStore fails
      try {
        let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
        
        if (deviceId) {
          this.deviceId = deviceId;
          return deviceId;
        }
        
        deviceId = await this.generateDeviceId();
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
        this.deviceId = deviceId;
        
        return deviceId;
      } catch (fallbackError) {
        logger.error('SessionService: Fallback device ID generation failed', { fallbackError });
        throw new Error('Failed to generate device ID');
      }
    }
  }

  private async generateDeviceId(): Promise<string> {
    try {
      // Create a unique device identifier
      const installId = Application.applicationId || 'unknown';
      const buildId = Application.nativeBuildVersion || '0';
      const platform = Platform.OS;
      const timestamp = Date.now().toString();
      const randomBytes = Math.random().toString(36).substring(2, 15);
      
      const deviceId = `${platform}-${installId.replace(/\./g, '_')}-${buildId}-${timestamp}-${randomBytes}`;
      
      logger.debug('SessionService: Generated device ID pattern:', deviceId.substring(0, 20) + '...');
      return deviceId;
      
    } catch (error) {
      logger.error('SessionService: Failed to generate device ID', { error });
      
      // Fallback to simple random ID
      const fallbackId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      logger.warn('SessionService: Using fallback device ID');
      return fallbackId;
    }
  }

  // Session token management
  public async getSessionToken(): Promise<string | null> {
    if (this.sessionToken) {
      return this.sessionToken;
    }
    try {
      const token = await AsyncStorage.getItem(this.SESSION_TOKEN_KEY);
      this.sessionToken = token;
      return token;
    } catch (error) {
      logger.error('SessionService: Failed to get session token from storage', { error });
      return null;
    }
  }

  private async setSessionToken(token: string): Promise<void> {
    try {
      logger.debug('SessionService: Setting session token...');
      await AsyncStorage.setItem(this.SESSION_TOKEN_KEY, token);
      this.sessionToken = token;
      logger.debug('SessionService: Session token set successfully');
    } catch (error) {
      logger.error('SessionService: Failed to save session token to storage', { error });
      throw new Error('Failed to save session token');
    }
  }

  private async removeSessionToken(): Promise<void> {
    try {
      logger.debug('SessionService: Removing session token...');
      await AsyncStorage.removeItem(this.SESSION_TOKEN_KEY);
      this.sessionToken = null;
      logger.debug('SessionService: Session token removed successfully');
    } catch (error) {
      logger.error('SessionService: Failed to remove session token from storage', { error });
      throw new Error('Failed to remove session token');
    }
  }

  async clearSession(): Promise<void> {
    try {
      logger.info('SessionService: Clearing session...');
      this.stopHeartbeat();
      await this.removeSessionToken();
      this.session = null;
      logger.info('SessionService: Session cleared successfully');
    } catch (error) {
      logger.error('SessionService: Failed to clear session', { error });
      throw new Error('Failed to clear session');
    }
  }

  // Device session state getters
  getCurrentDeviceSession(): DeviceSession | null {
    return this.session;
  }

  async isDeviceSessionValid(): Promise<boolean> {
    try {
      const token = await this.getSessionToken();
      if (!token) {
        return false;
      }

      const validation = await this.validateDeviceSession(token);
      return validation.valid;
    } catch (error) {
      logger.error('DeviceSessionService: Error checking device session validity:', error);
      return false;
    }
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  // Heartbeat management
  private startHeartbeat(): void {
    // Clear any existing heartbeat
    this.stopHeartbeat();
    
    // Update activity every 5 minutes
    this.heartbeatInterval = setInterval(() => {
      this.updateActivity();
    }, 5 * 60 * 1000);
    
    logger.debug('SessionService: Heartbeat started');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.debug('SessionService: Heartbeat stopped');
    }
  }
}

export const deviceSessionService = DeviceSessionService.getInstance();