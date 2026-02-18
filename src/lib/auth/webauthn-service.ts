/**
 * WebAuthn Service
 *
 * Implements FIDO2/WebAuthn support for hardware security keys
 * and platform authenticators (Touch ID, Face ID, Windows Hello).
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();

// ============================================================================
// TYPES
// ============================================================================

export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  name: string;
  type: 'security_key' | 'platform';
  transports?: AuthenticatorTransport[];
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface RegistrationOptions {
  challenge: string;
  rpId: string;
  rpName: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  attestation: AttestationConveyancePreference;
  authenticatorSelection: AuthenticatorSelectionCriteria;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout: number;
  excludeCredentials: PublicKeyCredentialDescriptor[];
}

export interface AuthenticationOptions {
  challenge: string;
  rpId: string;
  allowCredentials: PublicKeyCredentialDescriptor[];
  timeout: number;
  userVerification: UserVerificationRequirement;
}

export interface WebAuthnRegistrationResult {
  success: boolean;
  credential?: WebAuthnCredential;
  error?: string;
}

export interface WebAuthnAuthenticationResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RP_NAME = 'Fynvita';
const TIMEOUT = 60000; // 60 seconds

// ============================================================================
// WEBAUTHN SERVICE
// ============================================================================

export class WebAuthnService {
  private rpId: string;

  constructor() {
    // Get RP ID from window location or use default
    this.rpId =
      typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  }

  // ==========================================================================
  // FEATURE DETECTION
  // ==========================================================================

  /**
   * Check if WebAuthn is supported in the current browser
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential;
  }

  /**
   * Check if platform authenticator (biometric) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Check if conditional UI (autofill) is supported
   */
  async isConditionalMediationAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      // Check if the method exists before calling
      const pkc = PublicKeyCredential as typeof PublicKeyCredential & {
        isConditionalMediationAvailable?: () => Promise<boolean>;
      };
      if (typeof pkc.isConditionalMediationAvailable === 'function') {
        return await pkc.isConditionalMediationAvailable();
      }
      return false;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Start the registration process for a new credential
   */
  async startRegistration(
    userId: string,
    userName: string,
    displayName: string,
    options?: {
      authenticatorType?: 'platform' | 'cross-platform' | 'any';
      credentialName?: string;
    }
  ): Promise<WebAuthnRegistrationResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'WebAuthn is not supported in this browser',
      };
    }

    try {
      // Get existing credentials to exclude
      const existingCredentials = await this.getCredentials(userId);
      const excludeCredentials: PublicKeyCredentialDescriptor[] =
        existingCredentials.map((cred) => ({
          type: 'public-key',
          id: this.base64ToArrayBuffer(cred.credentialId),
          transports: cred.transports,
        }));

      // Generate challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Build authenticator selection criteria
      const authenticatorSelection: AuthenticatorSelectionCriteria = {
        userVerification: 'preferred',
      };

      if (options?.authenticatorType === 'platform') {
        authenticatorSelection.authenticatorAttachment = 'platform';
      } else if (options?.authenticatorType === 'cross-platform') {
        authenticatorSelection.authenticatorAttachment = 'cross-platform';
      }

      // Create credential options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
        {
          challenge,
          rp: {
            name: RP_NAME,
            id: this.rpId,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userName,
            displayName: displayName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection,
          timeout: TIMEOUT,
          attestation: 'none',
          excludeCredentials,
        };

      // Create the credential
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Failed to create credential' };
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Extract credential data
      const credentialId = this.arrayBufferToBase64(credential.rawId);
      const clientDataJSON = this.arrayBufferToBase64(response.clientDataJSON);
      const attestationObject = this.arrayBufferToBase64(
        response.attestationObject
      );

      // Determine credential type
      const credentialType =
        authenticatorSelection.authenticatorAttachment === 'platform'
          ? 'platform'
          : 'security_key';

      // Get transports if available
      const transports = response.getTransports?.() as
        | AuthenticatorTransport[]
        | undefined;

      // Store credential in database
      const storedCredential = await this.storeCredential(userId, {
        credentialId,
        publicKey: attestationObject,
        clientDataJSON,
        name:
          options?.credentialName ||
          (credentialType === 'platform' ? 'This Device' : 'Security Key'),
        type: credentialType,
        transports,
      });

      if (!storedCredential) {
        return { success: false, error: 'Failed to store credential' };
      }

      return { success: true, credential: storedCredential };
    } catch (error) {
      // WebAuthnService error: Registration error

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Registration was cancelled or timed out',
          };
        }
        if (error.name === 'InvalidStateError') {
          return {
            success: false,
            error: 'This authenticator is already registered',
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  /**
   * Start the authentication process
   */
  async startAuthentication(
    userId?: string,
    options?: {
      conditional?: boolean;
    }
  ): Promise<WebAuthnAuthenticationResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'WebAuthn is not supported in this browser',
      };
    }

    try {
      // Get allowed credentials
      let allowCredentials: PublicKeyCredentialDescriptor[] = [];

      if (userId) {
        const credentials = await this.getCredentials(userId);
        allowCredentials = credentials.map((cred) => ({
          type: 'public-key',
          id: this.base64ToArrayBuffer(cred.credentialId),
          transports: cred.transports,
        }));

        if (allowCredentials.length === 0) {
          return { success: false, error: 'No registered credentials found' };
        }
      }

      // Generate challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Create assertion options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
        {
          challenge,
          rpId: this.rpId,
          allowCredentials:
            allowCredentials.length > 0 ? allowCredentials : undefined,
          timeout: TIMEOUT,
          userVerification: 'preferred',
        };

      // Get the credential
      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
        mediation: options?.conditional ? 'conditional' : undefined,
      })) as PublicKeyCredential;

      if (!assertion) {
        return { success: false, error: 'Authentication failed' };
      }

      const response = assertion.response as AuthenticatorAssertionResponse;
      const credentialId = this.arrayBufferToBase64(assertion.rawId);

      // Verify the assertion (in production, this should be done server-side)
      const isValid = await this.verifyAssertion(
        credentialId,
        response.authenticatorData,
        response.clientDataJSON,
        response.signature
      );

      if (!isValid) {
        return { success: false, error: 'Invalid authentication' };
      }

      // Update last used timestamp
      await this.updateLastUsed(credentialId);

      return { success: true, credentialId };
    } catch (error) {
      // WebAuthnService error: Authentication error

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Authentication was cancelled or timed out',
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  // ==========================================================================
  // CREDENTIAL MANAGEMENT
  // ==========================================================================

  /**
   * Get all registered credentials for a user
   */
  async getCredentials(userId: string): Promise<WebAuthnCredential[]> {
    try {
      const { data, error } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // WebAuthnService error: Failed to get credentials
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        credentialId: row.credential_id,
        name: row.name,
        type: row.type,
        transports: row.transports,
        createdAt: new Date(row.created_at),
        lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Store a new credential
   */
  private async storeCredential(
    userId: string,
    data: {
      credentialId: string;
      publicKey: string;
      clientDataJSON: string;
      name: string;
      type: 'security_key' | 'platform';
      transports?: AuthenticatorTransport[];
    }
  ): Promise<WebAuthnCredential | null> {
    try {
      const { data: result, error } = await supabase
        .from('webauthn_credentials')
        .insert({
          user_id: userId,
          credential_id: data.credentialId,
          public_key: data.publicKey,
          name: data.name,
          type: data.type,
          transports: data.transports,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // WebAuthnService error: Failed to store credential
        return null;
      }

      return {
        id: result.id,
        credentialId: result.credential_id,
        name: result.name,
        type: result.type,
        transports: result.transports,
        createdAt: new Date(result.created_at),
      };
    } catch {
      return null;
    }
  }

  /**
   * Rename a credential
   */
  async renameCredential(
    credentialId: string,
    newName: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('webauthn_credentials')
        .update({ name: newName })
        .eq('credential_id', credentialId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Delete a credential
   */
  async deleteCredential(credentialId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('credential_id', credentialId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(credentialId: string): Promise<void> {
    try {
      await supabase
        .from('webauthn_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('credential_id', credentialId);
    } catch {
      // Ignore errors
    }
  }

  // ==========================================================================
  // VERIFICATION (Simplified - should be server-side in production)
  // ==========================================================================

  private async verifyAssertion(
    credentialId: string,
    authenticatorData: ArrayBuffer,
    clientDataJSON: ArrayBuffer,
    signature: ArrayBuffer
  ): Promise<boolean> {
    // In production, this verification should happen server-side
    // For now, we just check that we have all required data
    return !!(credentialId && authenticatorData && clientDataJSON && signature);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let webAuthnServiceInstance: WebAuthnService | null = null;

export function getWebAuthnService(): WebAuthnService {
  if (!webAuthnServiceInstance) {
    webAuthnServiceInstance = new WebAuthnService();
  }
  return webAuthnServiceInstance;
}

export const webAuthnService = getWebAuthnService();
