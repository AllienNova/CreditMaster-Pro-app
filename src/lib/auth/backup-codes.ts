/**
 * Backup Codes Service
 *
 * Provides backup codes for 2FA recovery:
 * - Generate backup codes
 * - Verify backup codes
 * - Regenerate backup codes
 * - Track used codes
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import crypto from "crypto";

export interface BackupCode {
  id: string;
  userId: string;
  code: string;
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
}

class BackupCodesService {
  /**
   * Generate backup codes for a user
   */
  async generateBackupCodes(
    userId: string,
    count: number = 10,
  ): Promise<{ success: boolean; codes?: string[]; error?: string }> {
    try {
      // Delete existing backup codes
      await supabase.from("backup_codes").delete().eq("user_id", userId);

      // Generate new codes
      const codes: string[] = [];
      const codeRecords = [];

      for (let i = 0; i < count; i++) {
        // Generate a random 8-character code
        const code = crypto.randomBytes(4).toString("hex").toUpperCase();
        codes.push(code);

        codeRecords.push({
          user_id: userId,
          code: this.hashCode(code),
          used: false,
          created_at: new Date().toISOString(),
        });
      }

      // Save to database
      const { error } = await supabase.from("backup_codes").insert(codeRecords);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        codes,
      };
    } catch (error) {
      // BackupCodesService error: Generate backup codes error
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate backup codes",
      };
    }
  }

  /**
   * Verify a backup code
   *
   * Redemption goes through the atomic `redeem_backup_code` RPC, which takes
   * a FOR UPDATE row lock so a code cannot be consumed twice by concurrent
   * requests (FND-010). The previous check-then-update pair had a TOCTOU race.
   */
  async verifyBackupCode(
    userId: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const hashedCode = this.hashCode(code);

      const { data, error } = await supabase.rpc("redeem_backup_code", {
        p_user_id: userId,
        p_code_hash: hashedCode,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // The RPC returns a single row { redeemed: boolean }.
      const redeemed = Array.isArray(data)
        ? data[0]?.redeemed === true
        : (data as { redeemed?: boolean } | null)?.redeemed === true;

      if (!redeemed) {
        return {
          success: false,
          error: "Invalid or already used backup code",
        };
      }

      return { success: true };
    } catch (error) {
      // BackupCodesService error: Verify backup code error
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify backup code",
      };
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingCodesCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("backup_codes")
        .select("id")
        .eq("user_id", userId)
        .eq("used", false);

      if (error) {
        // BackupCodesService error: Get remaining codes count error
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      // BackupCodesService error: Get remaining codes count error
      return 0;
    }
  }

  /**
   * Get all backup codes for a user (for display purposes)
   */
  async getBackupCodes(userId: string): Promise<BackupCode[]> {
    try {
      const { data, error } = await supabase
        .from("backup_codes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        // BackupCodesService error: Get backup codes error
        return [];
      }

      return data.map((code) => ({
        id: code.id,
        userId: code.user_id,
        code: "********", // Don't expose actual codes
        used: code.used,
        usedAt: code.used_at ? new Date(code.used_at) : undefined,
        createdAt: new Date(code.created_at),
      }));
    } catch (error) {
      // BackupCodesService error: Get backup codes error
      return [];
    }
  }

  /**
   * Hash a backup code for storage
   */
  private hashCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }
}

// Export singleton instance
export const backupCodesService = new BackupCodesService();
export default backupCodesService;
