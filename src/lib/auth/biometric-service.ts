/**
 * Biometric Authentication Service
 *
 * Simplified wrapper for biometric authentication using WebAuthn
 * platform authenticators (Touch ID, Face ID, Windows Hello).
 *
 * For React Native mobile apps, this would integrate with
 * expo-local-authentication or react-native-biometrics.
 */

import { webAuthnService, WebAuthnCredential } from './webauthn-service';

// ============================================================================
// TYPES
// ============================================================================

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'unknown';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
  canAuthenticate: boolean;
  securityLevel: 'weak' | 'strong';
}

export interface BiometricEnrollmentResult {
  success: boolean;
  credential?: WebAuthnCredential;
  error?: string;
}

export interface BiometricAuthResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export interface StoredBiometricCredential {
  id: string;
  userId: string;
  deviceName: string;
  biometricType: BiometricType;
  createdAt: Date;
  lastUsedAt?: Date;
}

// ============================================================================
// BIOMETRIC SERVICE
// ============================================================================

export class BiometricService {
  // ==========================================================================
  // CAPABILITY DETECTION
  // ==========================================================================

  /**
   * Check if biometric authentication is available
   */
  async checkCapabilities(): Promise<BiometricCapabilities> {
    // Check WebAuthn platform authenticator availability
    const isAvailable =
      await webAuthnService.isPlatformAuthenticatorAvailable();

    if (!isAvailable) {
      return {
        isAvailable: false,
        biometricType: 'unknown',
        isEnrolled: false,
        canAuthenticate: false,
        securityLevel: 'weak',
      };
    }

    // Detect biometric type based on platform
    const biometricType = this.detectBiometricType();

    return {
      isAvailable: true,
      biometricType,
      isEnrolled: true, // Platform authenticator implies biometrics are enrolled
      canAuthenticate: true,
      securityLevel: 'strong',
    };
  }

  /**
   * Detect the type of biometric available on the device
   */
  private detectBiometricType(): BiometricType {
    if (typeof window === 'undefined') return 'unknown';

    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';

    // iOS devices (Face ID on newer, Touch ID on older)
    if (/iphone|ipad|ipod/.test(userAgent)) {
      // iPhone X and newer typically have Face ID
      // This is a simplification - in a real app, you'd use native APIs
      return 'face';
    }

    // macOS (Touch ID on MacBooks with Touch Bar)
    if (platform.includes('mac')) {
      return 'fingerprint';
    }

    // Android devices
    if (/android/.test(userAgent)) {
      return 'fingerprint'; // Most Android devices use fingerprint
    }

    // Windows (Windows Hello can be face or fingerprint)
    if (platform.includes('win')) {
      return 'face'; // Windows Hello often uses face recognition
    }

    return 'unknown';
  }

  // ==========================================================================
  // ENROLLMENT
  // ==========================================================================

  /**
   * Enroll biometric authentication for a user
   */
  async enroll(
    userId: string,
    userName: string,
    displayName: string,
    deviceName?: string
  ): Promise<BiometricEnrollmentResult> {
    const capabilities = await this.checkCapabilities();

    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    if (!capabilities.canAuthenticate) {
      return {
        success: false,
        error:
          'Biometrics are not set up on this device. Please configure biometrics in your device settings.',
      };
    }

    // Use WebAuthn to register a platform authenticator
    const result = await webAuthnService.startRegistration(
      userId,
      userName,
      displayName,
      {
        authenticatorType: 'platform',
        credentialName:
          deviceName || this.getDefaultDeviceName(capabilities.biometricType),
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to enroll biometric',
      };
    }

    return {
      success: true,
      credential: result.credential,
    };
  }

  /**
   * Get a default device name based on biometric type
   */
  private getDefaultDeviceName(biometricType: BiometricType): string {
    switch (biometricType) {
      case 'face':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID';
      case 'iris':
        return 'Iris Scanner';
      default:
        return 'Biometric';
    }
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  /**
   * Authenticate using biometrics
   */
  async authenticate(userId?: string): Promise<BiometricAuthResult> {
    const capabilities = await this.checkCapabilities();

    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available',
      };
    }

    // Use WebAuthn to authenticate
    const result = await webAuthnService.startAuthentication(userId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Biometric authentication failed',
      };
    }

    return {
      success: true,
      credentialId: result.credentialId,
    };
  }

  /**
   * Prompt for biometric authentication with a custom message
   * Note: WebAuthn doesn't support custom prompts, but native mobile APIs do
   */
  async promptAuthentication(
    options: {
      title?: string;
      subtitle?: string;
      description?: string;
      cancelLabel?: string;
      fallbackLabel?: string;
    } = {}
  ): Promise<BiometricAuthResult> {
    // In a React Native app, you would use expo-local-authentication here
    // For web, we just use the standard WebAuthn flow
    // BiometricService: Prompt options (for mobile)
    void options;

    return this.authenticate();
  }

  // ==========================================================================
  // CREDENTIAL MANAGEMENT
  // ==========================================================================

  /**
   * Get enrolled biometric credentials for a user
   */
  async getEnrolledCredentials(
    userId: string
  ): Promise<StoredBiometricCredential[]> {
    const credentials = await webAuthnService.getCredentials(userId);

    return credentials
      .filter((cred) => cred.type === 'platform')
      .map((cred) => ({
        id: cred.id,
        userId,
        deviceName: cred.name,
        biometricType: this.inferBiometricType(cred.name),
        createdAt: cred.createdAt,
        lastUsedAt: cred.lastUsedAt,
      }));
  }

  /**
   * Check if user has biometric credentials enrolled
   */
  async hasEnrolledCredentials(userId: string): Promise<boolean> {
    const credentials = await this.getEnrolledCredentials(userId);
    return credentials.length > 0;
  }

  /**
   * Remove a biometric credential
   */
  async removeCredential(credentialId: string): Promise<boolean> {
    return webAuthnService.deleteCredential(credentialId);
  }

  /**
   * Rename a biometric credential
   */
  async renameCredential(
    credentialId: string,
    newName: string
  ): Promise<boolean> {
    return webAuthnService.renameCredential(credentialId, newName);
  }

  /**
   * Infer biometric type from credential name
   */
  private inferBiometricType(name: string): BiometricType {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('face')) return 'face';
    if (lowerName.includes('touch') || lowerName.includes('finger'))
      return 'fingerprint';
    if (lowerName.includes('iris')) return 'iris';
    return 'unknown';
  }

  // ==========================================================================
  // SETTINGS & PREFERENCES
  // ==========================================================================

  /**
   * Check if biometric login is enabled for quick access
   */
  async isBiometricLoginEnabled(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('biometric_login_enabled') === 'true';
  }

  /**
   * Enable/disable biometric login for quick access
   */
  async setBiometricLoginEnabled(enabled: boolean): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem('biometric_login_enabled', enabled ? 'true' : 'false');
  }

  /**
   * Get the stored user ID for biometric login
   */
  async getStoredUserId(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('biometric_user_id');
  }

  /**
   * Store user ID for biometric login
   */
  async storeUserId(userId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem('biometric_user_id', userId);
  }

  /**
   * Clear stored biometric login data
   */
  async clearStoredData(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('biometric_login_enabled');
    localStorage.removeItem('biometric_user_id');
  }
}

// ============================================================================
// REACT NATIVE INTEGRATION NOTES
// ============================================================================

/**
 * For React Native mobile apps, replace the WebAuthn calls with:
 *
 * 1. expo-local-authentication:
 *    - LocalAuthentication.hasHardwareAsync()
 *    - LocalAuthentication.isEnrolledAsync()
 *    - LocalAuthentication.authenticateAsync({ promptMessage: 'Login with biometrics' })
 *
 * 2. react-native-biometrics:
 *    - ReactNativeBiometrics.isSensorAvailable()
 *    - ReactNativeBiometrics.simplePrompt({ promptMessage: 'Confirm' })
 *    - ReactNativeBiometrics.createKeys()
 *    - ReactNativeBiometrics.createSignature({ promptMessage, payload })
 *
 * Example for expo-local-authentication:
 *
 * import * as LocalAuthentication from 'expo-local-authentication';
 *
 * async authenticate(): Promise<BiometricAuthResult> {
 *   const result = await LocalAuthentication.authenticateAsync({
 *     promptMessage: 'Authenticate to continue',
 *     fallbackLabel: 'Use Passcode',
 *     disableDeviceFallback: false,
 *   });
 *
 *   return {
 *     success: result.success,
 *     error: result.error,
 *   };
 * }
 */

// ============================================================================
// SINGLETON
// ============================================================================

let biometricServiceInstance: BiometricService | null = null;

export function getBiometricService(): BiometricService {
  if (!biometricServiceInstance) {
    biometricServiceInstance = new BiometricService();
  }
  return biometricServiceInstance;
}

export const biometricService = getBiometricService();
