/**
 * Fynvita Biometric Authentication Service
 * Cross-platform biometric authentication for iOS (Face ID, Touch ID) and Android (Fingerprint, Face)
 * Provides secure access to sensitive financial data
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const BIOMETRIC_ENABLED_KEY = '@fynvita_biometric_enabled';
const BIOMETRIC_TYPE_KEY = '@fynvita_biometric_type';
const SECURE_TOKEN_KEY = 'fynvita_secure_token';

// Biometric types
export enum BiometricType {
  None = 'none',
  TouchID = 'touchId',
  FaceID = 'faceId',
  Fingerprint = 'fingerprint',
  Iris = 'iris',
  FacialRecognition = 'facialRecognition',
}

// Authentication result
export interface AuthenticationResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

// Biometric capabilities
export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType;
  securityLevel: 'none' | 'weak' | 'strong';
}

/**
 * Biometric Authentication Service
 * Provides secure biometric authentication for the app
 */
class BiometricService {
  private isInitialized = false;
  private capabilities: BiometricCapabilities | null = null;

  /**
   * Initialize biometric service and check capabilities
   */
  async initialize(): Promise<BiometricCapabilities> {
    if (this.isInitialized && this.capabilities) {
      return this.capabilities;
    }

    try {
      // Check if device supports biometrics
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await this.getSecurityLevel();

      // Determine biometric type
      let biometricType = BiometricType.None;
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = Platform.OS === 'ios' ? BiometricType.FaceID : BiometricType.FacialRecognition;
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = Platform.OS === 'ios' ? BiometricType.TouchID : BiometricType.Fingerprint;
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = BiometricType.Iris;
      }

      this.capabilities = {
        isAvailable,
        isEnrolled,
        biometricType,
        securityLevel,
      };

      this.isInitialized = true;
      return this.capabilities;
    } catch (error) {
      if (__DEV__) console.error('Failed to initialize biometric service:', error);
      this.capabilities = {
        isAvailable: false,
        isEnrolled: false,
        biometricType: BiometricType.None,
        securityLevel: 'none',
      };
      return this.capabilities;
    }
  }

  /**
   * Get security level based on authentication types
   */
  private async getSecurityLevel(): Promise<'none' | 'weak' | 'strong'> {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    switch (level) {
      case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
        return 'strong';
      case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
        return 'weak';
      default:
        return 'none';
    }
  }

  /**
   * Get biometric capabilities
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    if (!this.isInitialized) {
      return this.initialize();
    }
    return this.capabilities!;
  }

  /**
   * Check if biometric authentication is enabled for the app
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enable or disable biometric authentication
   */
  async setBiometricEnabled(enabled: boolean): Promise<boolean> {
    try {
      if (enabled) {
        // Verify biometrics work before enabling
        const result = await this.authenticate('Enable biometric authentication');
        if (!result.success) {
          return false;
        }
      }

      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));

      if (this.capabilities) {
        await AsyncStorage.setItem(BIOMETRIC_TYPE_KEY, this.capabilities.biometricType);
      }

      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to set biometric enabled:', error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(promptMessage?: string): Promise<AuthenticationResult> {
    try {
      const capabilities = await this.getCapabilities();

      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
          errorCode: 'NOT_AVAILABLE',
        };
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: 'No biometrics enrolled. Please set up biometrics in your device settings.',
          errorCode: 'NOT_ENROLLED',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to access Fynvita',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(result.error),
          errorCode: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        errorCode: 'UNKNOWN',
      };
    }
  }

  /**
   * Authenticate with fallback to passcode/password
   */
  async authenticateWithFallback(promptMessage?: string): Promise<AuthenticationResult> {
    const capabilities = await this.getCapabilities();

    if (!capabilities.isAvailable || !capabilities.isEnrolled) {
      // Allow fallback to device credentials
      return this.authenticateWithDeviceCredentials(promptMessage);
    }

    return this.authenticate(promptMessage);
  }

  /**
   * Authenticate using device credentials (passcode/password)
   */
  private async authenticateWithDeviceCredentials(promptMessage?: string): Promise<AuthenticationResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Enter your device passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(result.error),
          errorCode: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        errorCode: 'UNKNOWN',
      };
    }
  }

  /**
   * Get human-readable error message
   */
  private getErrorMessage(errorCode?: string): string {
    switch (errorCode) {
      case 'user_cancel':
        return 'Authentication was cancelled';
      case 'system_cancel':
        return 'Authentication was cancelled by the system';
      case 'not_available':
        return 'Biometric authentication is not available';
      case 'not_enrolled':
        return 'No biometrics enrolled on this device';
      case 'lockout':
        return 'Too many failed attempts. Please try again later.';
      case 'lockout_permanent':
        return 'Biometrics are locked. Please use your device passcode.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }

  /**
   * Get friendly name for biometric type
   */
  getBiometricTypeName(): string {
    if (!this.capabilities) {
      return 'Biometrics';
    }

    switch (this.capabilities.biometricType) {
      case BiometricType.FaceID:
        return 'Face ID';
      case BiometricType.TouchID:
        return 'Touch ID';
      case BiometricType.Fingerprint:
        return 'Fingerprint';
      case BiometricType.FacialRecognition:
        return 'Face Recognition';
      case BiometricType.Iris:
        return 'Iris Scan';
      default:
        return 'Biometrics';
    }
  }

  /**
   * Store sensitive data securely (protected by biometrics)
   */
  async storeSecureData(key: string, value: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to store secure data:', error);
      return false;
    }
  }

  /**
   * Retrieve sensitive data (requires biometric authentication)
   */
  async getSecureData(key: string, requireAuth: boolean = true): Promise<string | null> {
    try {
      if (requireAuth) {
        const authResult = await this.authenticate('Access secure data');
        if (!authResult.success) {
          return null;
        }
      }

      return await SecureStore.getItemAsync(key);
    } catch (error) {
      if (__DEV__) console.error('Failed to get secure data:', error);
      return null;
    }
  }

  /**
   * Delete secure data
   */
  async deleteSecureData(key: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to delete secure data:', error);
      return false;
    }
  }

  /**
   * Store authentication token securely
   */
  async storeAuthToken(token: string): Promise<boolean> {
    return this.storeSecureData(SECURE_TOKEN_KEY, token);
  }

  /**
   * Get authentication token
   */
  async getAuthToken(requireAuth: boolean = false): Promise<string | null> {
    return this.getSecureData(SECURE_TOKEN_KEY, requireAuth);
  }

  /**
   * Clear authentication token
   */
  async clearAuthToken(): Promise<boolean> {
    return this.deleteSecureData(SECURE_TOKEN_KEY);
  }
}

export const biometricService = new BiometricService();
export default biometricService;
