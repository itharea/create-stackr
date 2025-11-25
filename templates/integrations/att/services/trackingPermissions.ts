import * as TrackingTransparency from 'expo-tracking-transparency';
import { logger } from '../utils/logger';

export enum TrackingStatus {
  NOT_DETERMINED = 'not-determined',
  RESTRICTED = 'restricted', 
  DENIED = 'denied',
  GRANTED = 'granted',
  UNSUPPORTED = 'unsupported' // For non-iOS platforms
}

export interface TrackingPermissionResult {
  status: TrackingStatus;
  canTrack: boolean;
  advertisingId?: string;
}

class TrackingPermissionsService {
  private _currentStatus: TrackingStatus = TrackingStatus.NOT_DETERMINED;
  private _isInitialized: boolean = false;

  /**
   * Get current tracking permission status
   */
  get currentStatus(): TrackingStatus {
    return this._currentStatus;
  }

  /**
   * Check if tracking is supported on this platform
   */
  get isTrackingSupported(): boolean {
    return TrackingTransparency.isAvailable();
  }

  /**
   * Check if user can be tracked
   */
  get canTrack(): boolean {
    return this._currentStatus === TrackingStatus.GRANTED;
  }

  /**
   * Initialize the service and get current permission status
   */
  async initialize(): Promise<TrackingPermissionResult> {
    logger.debug('TrackingPermissions: Initializing...');

    if (!this.isTrackingSupported) {
      logger.info('TrackingPermissions: ATT not available on this platform/version');
      this._currentStatus = TrackingStatus.UNSUPPORTED;
      this._isInitialized = true;
      return {
        status: this._currentStatus,
        canTrack: true // Allow tracking when ATT is not required
      };
    }

    try {
      // Get current permissions without requesting
      const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
      this._currentStatus = this._mapExpoStatusToOurStatus(status);
      this._isInitialized = true;

      logger.debug('TrackingPermissions: Current status retrieved', {
        status: this._currentStatus,
        canTrack: this.canTrack
      });

      return await this._buildResult();
    } catch (error) {
      logger.error('TrackingPermissions: Failed to get current status', { error });
      this._currentStatus = TrackingStatus.NOT_DETERMINED;
      this._isInitialized = true;
      return {
        status: this._currentStatus,
        canTrack: false
      };
    }
  }

  /**
   * Request tracking permissions from the user
   */
  async requestPermissions(): Promise<TrackingPermissionResult> {
    logger.debug('TrackingPermissions: Requesting permissions...');

    if (!this.isTrackingSupported) {
      logger.info('TrackingPermissions: ATT not available, returning unsupported');
      return {
        status: TrackingStatus.UNSUPPORTED,
        canTrack: true
      };
    }

    try {
      // Check current status first
      if (!this._isInitialized) {
        await this.initialize();
      }

      // If already determined, don't request again
      if (this._currentStatus === TrackingStatus.GRANTED ||
          this._currentStatus === TrackingStatus.DENIED ||
          this._currentStatus === TrackingStatus.RESTRICTED) {
        logger.info('TrackingPermissions: Status already determined', {
          status: this._currentStatus
        });
        return await this._buildResult();
      }

      // Request permissions
      const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
      this._currentStatus = this._mapExpoStatusToOurStatus(status);

      logger.debug('TrackingPermissions: Permission request completed', {
        status: this._currentStatus,
        canTrack: this.canTrack
      });

      return await this._buildResult();
    } catch (error) {
      logger.error('TrackingPermissions: Failed to request permissions', { error });
      this._currentStatus = TrackingStatus.DENIED;
      return {
        status: this._currentStatus,
        canTrack: false
      };
    }
  }

  /**
   * Get advertising ID if tracking is allowed
   */
  async getAdvertisingId(): Promise<string | null> {
    if (!this.isTrackingSupported) {
      logger.info('TrackingPermissions: ATT not available, cannot get advertising ID from this API');
      return null; // Let Adjust SDK handle ADID when ATT is not available
    }

    if (!this.canTrack) {
      logger.info('TrackingPermissions: Cannot get advertising ID - tracking not granted');
      return null;
    }

    try {
      const advertisingId = TrackingTransparency.getAdvertisingId();
      logger.info('TrackingPermissions: Retrieved advertising ID', {
        hasId: !!advertisingId
      });
      return advertisingId;
    } catch (error) {
      logger.error('TrackingPermissions: Failed to get advertising ID', { error });
      return null;
    }
  }

  /**
   * Reset the service state (useful for testing)
   */
  reset(): void {
    this._currentStatus = TrackingStatus.NOT_DETERMINED;
    this._isInitialized = false;
    logger.debug('TrackingPermissions: Service reset');
  }

  /**
   * Map Expo's tracking status to our internal status
   */
  private _mapExpoStatusToOurStatus(expoStatus: string): TrackingStatus {
    switch (expoStatus) {
      case 'granted':
        return TrackingStatus.GRANTED;
      case 'denied':
        return TrackingStatus.DENIED;
      case 'restricted':
        return TrackingStatus.RESTRICTED;
      case 'not-determined':
      case 'undetermined': // Handle both possible values
      default:
        return TrackingStatus.NOT_DETERMINED;
    }
  }

  /**
   * Build a complete result object
   */
  private async _buildResult(): Promise<TrackingPermissionResult> {
    const result: TrackingPermissionResult = {
      status: this._currentStatus,
      canTrack: this.canTrack
    };

    // Try to get advertising ID if tracking is allowed
    if (this.canTrack && this.isTrackingSupported) {
      try {
        result.advertisingId = (await this.getAdvertisingId()) || undefined;
      } catch (error) {
        logger.error('TrackingPermissions: Failed to get advertising ID for result', { error });
      }
    }

    return result;
  }
}

// Export singleton instance
export const trackingPermissions = new TrackingPermissionsService();