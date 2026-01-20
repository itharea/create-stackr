import { trackingPermissions, TrackingPermissionResult } from './trackingPermissions';
import { logger } from '../utils/logger';

class ATTService {
  /**
   * Initialize ATT permissions service
   */
  async initialize(): Promise<TrackingPermissionResult> {
    try {
      logger.debug('ATTService: Initializing ATT permissions');
      const result = await trackingPermissions.initialize();
      logger.debug('ATTService: ATT permissions initialized', {
        status: result.status,
        canTrack: result.canTrack
      });
      return result;
    } catch (error) {
      logger.error('ATTService: Failed to initialize ATT permissions', { error });
      throw error;
    }
  }

  /**
   * Request ATT permissions from user
   */
  async requestPermissions(): Promise<TrackingPermissionResult> {
    try {
      logger.debug('ATTService: Requesting ATT permissions');
      const result = await trackingPermissions.requestPermissions();
      logger.debug('ATTService: ATT permissions request completed', {
        status: result.status,
        canTrack: result.canTrack
      });
      return result;
    } catch (error) {
      logger.error('ATTService: Failed to request ATT permissions', { error });
      throw error;
    }
  }

  /**
   * Get current permission status
   */
  getCurrentStatus() {
    return trackingPermissions.currentStatus;
  }

  /**
   * Check if tracking is supported on this platform
   */
  isTrackingSupported(): boolean {
    return trackingPermissions.isTrackingSupported;
  }

  /**
   * Check if user can be tracked
   */
  canTrack(): boolean {
    return trackingPermissions.canTrack;
  }

  /**
   * Get advertising ID if available
   */
  async getAdvertisingId(): Promise<string | null> {
    try {
      return await trackingPermissions.getAdvertisingId();
    } catch (error) {
      logger.error('ATTService: Failed to get advertising ID', { error });
      return null;
    }
  }

  /**
   * Reset ATT service state
   */
  reset(): void {
    trackingPermissions.reset();
    logger.debug('ATTService: Service reset');
  }
}

// Export singleton instance
export const attService = new ATTService();