/**
 * Multi-Factor Authentication Service
 *
 * Comprehensive MFA management with support for:
 * - TOTP (Time-based One-Time Password) authenticator apps
 * - WebAuthn/FIDO2 hardware security keys
 * - Backup recovery codes
 * - MFA method management
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export type MFAMethodType = 'totp' | 'webauthn' | 'sms' | 'email';
export type MFAMethodStatus = 'pending' | 'verified' | 'disabled';

export interface MFAMethod {
  id: string;
  type: MFAMethodType;
  name: string;
  status: MFAMethodStatus;
  createdAt: Date;
  lastUsedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface TOTPEnrollmentResult {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export interface WebAuthnCredential {
  id: string;
  name: string;
  publicKey: string;
  credentialId: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export interface MFAStatus {
  enabled: boolean;
  methods: MFAMethod[];
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
  requiredForLogin: boolean;
  lastVerifiedAt?: Date;
}

export interface MFAChallenge {
  challengeId: string;
  factorId: string;
  type: MFAMethodType;
  expiresAt: Date;
}

export interface MFAVerificationResult {
  success: boolean;
  error?: string;
  factorId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const TOTP_ISSUER = 'Fynvita';

// ============================================================================
// MFA SERVICE
// ============================================================================

export class MFAService {
  // ==========================================================================
  // TOTP MANAGEMENT
  // ==========================================================================

  /**
   * Start TOTP enrollment - generates QR code and secret
   */
  async enrollTOTP(friendlyName?: string): Promise<{
    success: boolean;
    data?: TOTPEnrollmentResult;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName || 'Authenticator App',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          factorId: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        },
      };
    } catch (error) {
      // MFAService error: TOTP enrollment error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enroll TOTP',
      };
    }
  }

  /**
   * Verify TOTP code to complete enrollment
   */
  async verifyTOTPEnrollment(
    factorId: string,
    code: string
  ): Promise<MFAVerificationResult> {
    try {
      // First create a challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId,
        });

      if (challengeError) {
        return { success: false, error: challengeError.message };
      }

      // Then verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      return { success: true, factorId };
    } catch (error) {
      // MFAService error: TOTP verification error
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to verify TOTP code',
      };
    }
  }

  /**
   * Verify TOTP code during login
   */
  async verifyTOTP(
    factorId: string,
    code: string
  ): Promise<MFAVerificationResult> {
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, factorId };
    } catch (error) {
      // MFAService error: TOTP verification error (login)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to verify TOTP code',
      };
    }
  }

  /**
   * Unenroll TOTP factor
   */
  async unenrollTOTP(
    factorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      // MFAService error: TOTP unenroll error
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to unenroll TOTP',
      };
    }
  }

  // ==========================================================================
  // BACKUP CODES
  // ==========================================================================

  /**
   * Generate backup recovery codes
   */
  async generateBackupCodes(userId: string): Promise<{
    success: boolean;
    codes?: string[];
    error?: string;
  }> {
    try {
      // Generate random backup codes
      const codes: string[] = [];
      for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        const code = crypto
          .randomBytes(BACKUP_CODE_LENGTH / 2)
          .toString('hex')
          .toUpperCase();
        codes.push(code);
      }

      // Hash codes for storage
      const hashedCodes = codes.map((code) => ({
        code_hash: this.hashBackupCode(code),
        used: false,
        created_at: new Date().toISOString(),
      }));

      // Store in database (replace existing codes)
      const { error } = await supabase.from('user_backup_codes').upsert({
        user_id: userId,
        codes: hashedCodes,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        // MFAService error: Failed to store backup codes
        return { success: false, error: 'Failed to save backup codes' };
      }

      return { success: true, codes };
    } catch (error) {
      // MFAService error: Generate backup codes error
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate backup codes',
      };
    }
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string
  ): Promise<MFAVerificationResult> {
    try {
      const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase();
      const codeHash = this.hashBackupCode(normalizedCode);

      // Get user's backup codes
      const { data, error } = await supabase
        .from('user_backup_codes')
        .select('codes')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return { success: false, error: 'No backup codes found' };
      }

      const codes = data.codes as Array<{ code_hash: string; used: boolean }>;
      const codeIndex = codes.findIndex(
        (c) => c.code_hash === codeHash && !c.used
      );

      if (codeIndex === -1) {
        return { success: false, error: 'Invalid or already used backup code' };
      }

      // Mark code as used
      codes[codeIndex].used = true;

      const { error: updateError } = await supabase
        .from('user_backup_codes')
        .update({
          codes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        // MFAService error: Failed to mark backup code as used
      }

      return { success: true };
    } catch (error) {
      // MFAService error: Verify backup code error
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to verify backup code',
      };
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodesCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_backup_codes')
        .select('codes')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return 0;
      }

      const codes = data.codes as Array<{ used: boolean }>;
      return codes.filter((c) => !c.used).length;
    } catch {
      return 0;
    }
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  // ==========================================================================
  // MFA STATUS & MANAGEMENT
  // ==========================================================================

  /**
   * Get current MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<MFAStatus> {
    try {
      // Get Supabase MFA factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();

      const methods: MFAMethod[] = [];

      if (factorsData) {
        // Process TOTP factors
        for (const factor of factorsData.totp) {
          methods.push({
            id: factor.id,
            type: 'totp',
            name: factor.friendly_name || 'Authenticator App',
            status: factor.status === 'verified' ? 'verified' : 'pending',
            createdAt: new Date(factor.created_at),
            lastUsedAt: factor.last_challenged_at
              ? new Date(factor.last_challenged_at)
              : undefined,
          });
        }
      }

      // Get backup codes count
      const backupCodesRemaining = await this.getBackupCodesCount(userId);

      const verifiedMethods = methods.filter((m) => m.status === 'verified');

      return {
        enabled: verifiedMethods.length > 0,
        methods,
        hasBackupCodes: backupCodesRemaining > 0,
        backupCodesRemaining,
        requiredForLogin: verifiedMethods.length > 0,
        lastVerifiedAt:
          verifiedMethods.length > 0
            ? verifiedMethods.reduce(
                (latest, m) => {
                  if (!m.lastUsedAt) return latest;
                  if (!latest) return m.lastUsedAt;
                  return m.lastUsedAt > latest ? m.lastUsedAt : latest;
                },
                undefined as Date | undefined
              )
            : undefined,
      };
    } catch (error) {
      // MFAService error: Get MFA status error
      return {
        enabled: false,
        methods: [],
        hasBackupCodes: false,
        backupCodesRemaining: 0,
        requiredForLogin: false,
      };
    }
  }

  /**
   * Check if MFA is required for login
   */
  async checkMFARequired(): Promise<{
    required: boolean;
    factors: Array<{ id: string; type: MFAMethodType; name: string }>;
  }> {
    try {
      const { data, error } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (error) {
        return { required: false, factors: [] };
      }

      const required = data.currentLevel !== data.nextLevel;
      const factors = data.currentAuthenticationMethods
        .filter((m): m is { method: string; timestamp: number } => typeof m !== 'string' && m.method === 'totp')
        .map((m) => ({
          id: m.method,
          type: 'totp' as MFAMethodType,
          name: 'Authenticator App',
        }));

      return { required, factors };
    } catch {
      return { required: false, factors: [] };
    }
  }

  /**
   * Rename an MFA method
   */
  async renameMFAMethod(
    factorId: string,
    newName: string
  ): Promise<{ success: boolean; error?: string }> {
    // Supabase doesn't support renaming factors directly,
    // so we'd need to store names separately
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase.from('user_mfa_names').upsert({
        user_id: user.id,
        factor_id: factorId,
        name: newName,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to rename method',
      };
    }
  }

  // ==========================================================================
  // MFA CHALLENGE FLOW
  // ==========================================================================

  /**
   * Create an MFA challenge for verification
   */
  async createChallenge(factorId: string): Promise<{
    success: boolean;
    challenge?: MFAChallenge;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        challenge: {
          challengeId: data.id,
          factorId,
          type: 'totp',
          expiresAt: new Date(data.expires_at),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create challenge',
      };
    }
  }

  /**
   * Verify an MFA challenge
   */
  async verifyChallenge(
    factorId: string,
    challengeId: string,
    code: string
  ): Promise<MFAVerificationResult> {
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, factorId };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to verify challenge',
      };
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let mfaServiceInstance: MFAService | null = null;

export function getMFAService(): MFAService {
  if (!mfaServiceInstance) {
    mfaServiceInstance = new MFAService();
  }
  return mfaServiceInstance;
}

export const mfaService = getMFAService();
