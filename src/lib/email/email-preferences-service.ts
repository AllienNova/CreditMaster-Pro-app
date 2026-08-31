/**
 * Email Preferences Service
 *
 * Manages user email preferences including opt-in/opt-out per template type,
 * frequency control, and unsubscribe token generation/validation.
 */

import crypto from "crypto";
import { getSupabase } from "@/lib/supabase/client";
import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailTemplateType =
  | "welcome"
  | "dispute_status"
  | "score_change"
  | "payment_receipt"
  | "bill_reminder"
  | "weekly_digest"
  | "trading_alert"
  | "marketing";

export type EmailFrequency = "immediate" | "daily" | "weekly";

export interface EmailPreference {
  templateType: EmailTemplateType;
  enabled: boolean;
  frequency: EmailFrequency;
}

export interface UserEmailPreferences {
  userId: string;
  preferences: EmailPreference[];
  globalUnsubscribe: boolean;
  updatedAt: string;
}

export interface UnsubscribeTokenPayload {
  userId: string;
  templateType: EmailTemplateType | "all";
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEV_UNSUBSCRIBE_SECRET = "default-unsubscribe-secret-change-in-production";

/**
 * Resolve the unsubscribe-token signing secret.
 *
 * A missing `EMAIL_UNSUBSCRIBE_SECRET` previously fell back silently to a
 * hard-coded public default, making every HMAC unsubscribe token forgeable.
 * In production a missing secret is now a hard failure; in non-production a
 * warning is emitted and the dev default is used so local work and tests are
 * unblocked. Resolved lazily so importing this module never throws.
 */
function getUnsubscribeSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET environment variable is required in production",
    );
  }

  console.warn(
    "EMAIL_UNSUBSCRIBE_SECRET is not set — using an insecure development " +
      "default. Set EMAIL_UNSUBSCRIBE_SECRET before deploying to production.",
  );
  return DEV_UNSUBSCRIBE_SECRET;
}

const UNSUBSCRIBE_TOKEN_EXPIRY_HOURS = 72;

const DEFAULT_PREFERENCES: ReadonlyArray<EmailPreference> = [
  { templateType: "welcome", enabled: true, frequency: "immediate" },
  { templateType: "dispute_status", enabled: true, frequency: "immediate" },
  { templateType: "score_change", enabled: true, frequency: "immediate" },
  { templateType: "payment_receipt", enabled: true, frequency: "immediate" },
  { templateType: "bill_reminder", enabled: true, frequency: "immediate" },
  { templateType: "weekly_digest", enabled: true, frequency: "weekly" },
  { templateType: "trading_alert", enabled: true, frequency: "immediate" },
  { templateType: "marketing", enabled: false, frequency: "weekly" },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EmailPreferencesService {
  /**
   * Retrieve email preferences for a user.
   * If no preferences exist, returns defaults and persists them.
   */
  async getPreferences(userId: string): Promise<UserEmailPreferences> {
    if (!userId) {
      throw new Error("userId is required");
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("email_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found — that is fine (first visit)
      throw new Error(`Failed to fetch email preferences: ${error.message}`);
    }

    if (!data) {
      // First time — seed defaults
      const defaults = await this.initializeDefaults(userId);
      return defaults;
    }

    return this.mapDbRowToPreferences(data);
  }

  /**
   * Update a single template preference.
   */
  async updatePreference(
    userId: string,
    templateType: EmailTemplateType,
    updates: { enabled?: boolean; frequency?: EmailFrequency },
  ): Promise<UserEmailPreferences> {
    if (!userId) {
      throw new Error("userId is required");
    }

    const current = await this.getPreferences(userId);
    const idx = current.preferences.findIndex(
      (p) => p.templateType === templateType,
    );

    if (idx === -1) {
      throw new Error(`Unknown template type: ${templateType}`);
    }

    if (updates.enabled !== undefined) {
      current.preferences[idx].enabled = updates.enabled;
    }
    if (updates.frequency !== undefined) {
      current.preferences[idx].frequency = updates.frequency;
    }

    const now = new Date().toISOString();
    const supabase = getSupabase();
    const { error } = await supabase.from("email_preferences").upsert({
      user_id: userId,
      preferences: current.preferences,
      global_unsubscribe: current.globalUnsubscribe,
      updated_at: now,
    });

    if (error) {
      throw new Error(`Failed to update email preference: ${error.message}`);
    }

    return { ...current, updatedAt: now };
  }

  /**
   * Bulk-update multiple template preferences at once.
   */
  async updatePreferences(
    userId: string,
    updates: Array<{
      templateType: EmailTemplateType;
      enabled?: boolean;
      frequency?: EmailFrequency;
    }>,
  ): Promise<UserEmailPreferences> {
    if (!userId) {
      throw new Error("userId is required");
    }

    const current = await this.getPreferences(userId);

    for (const update of updates) {
      const idx = current.preferences.findIndex(
        (p) => p.templateType === update.templateType,
      );
      if (idx === -1) {
        throw new Error(`Unknown template type: ${update.templateType}`);
      }
      if (update.enabled !== undefined) {
        current.preferences[idx].enabled = update.enabled;
      }
      if (update.frequency !== undefined) {
        current.preferences[idx].frequency = update.frequency;
      }
    }

    const now = new Date().toISOString();
    const supabase = getSupabase();
    const { error } = await supabase.from("email_preferences").upsert({
      user_id: userId,
      preferences: current.preferences,
      global_unsubscribe: current.globalUnsubscribe,
      updated_at: now,
    });

    if (error) {
      throw new Error(`Failed to update email preferences: ${error.message}`);
    }

    return { ...current, updatedAt: now };
  }

  /**
   * Global unsubscribe — disables ALL email categories.
   */
  async globalUnsubscribe(userId: string): Promise<UserEmailPreferences> {
    if (!userId) {
      throw new Error("userId is required");
    }

    const current = await this.getPreferences(userId);
    const disabledPrefs = current.preferences.map((p) => ({
      ...p,
      enabled: false,
    }));

    const now = new Date().toISOString();
    const supabase = getSupabase();
    const { error } = await supabase.from("email_preferences").upsert({
      user_id: userId,
      preferences: disabledPrefs,
      global_unsubscribe: true,
      updated_at: now,
    });

    if (error) {
      throw new Error(`Failed to global unsubscribe: ${error.message}`);
    }

    return {
      userId,
      preferences: disabledPrefs,
      globalUnsubscribe: true,
      updatedAt: now,
    };
  }

  /**
   * Re-subscribe (undo global unsubscribe) — restores defaults.
   */
  async resubscribe(userId: string): Promise<UserEmailPreferences> {
    if (!userId) {
      throw new Error("userId is required");
    }

    const defaults = DEFAULT_PREFERENCES.map((p) => ({ ...p }));
    const now = new Date().toISOString();
    const supabase = getSupabase();
    const { error } = await supabase.from("email_preferences").upsert({
      user_id: userId,
      preferences: defaults,
      global_unsubscribe: false,
      updated_at: now,
    });

    if (error) {
      throw new Error(`Failed to resubscribe: ${error.message}`);
    }

    return {
      userId,
      preferences: defaults,
      globalUnsubscribe: false,
      updatedAt: now,
    };
  }

  /**
   * Check whether a specific email should be sent to a user.
   */
  async shouldSendEmail(
    userId: string,
    templateType: EmailTemplateType,
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      const prefs = await this.getPreferences(userId);

      if (prefs.globalUnsubscribe) {
        return false;
      }

      const pref = prefs.preferences.find(
        (p) => p.templateType === templateType,
      );
      return pref?.enabled ?? false;
    } catch {
      // If we cannot read preferences, default to allowing transactional emails
      // and blocking marketing emails
      return templateType !== "marketing";
    }
  }

  /**
   * Generate a signed, time-limited unsubscribe token.
   */
  generateUnsubscribeToken(
    userId: string,
    templateType: EmailTemplateType | "all" = "all",
  ): string {
    const expiresAt =
      Date.now() + UNSUBSCRIBE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

    const payload: UnsubscribeTokenPayload = {
      userId,
      templateType,
      expiresAt,
    };

    const payloadStr = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadStr).toString("base64url");
    const signature = crypto
      .createHmac("sha256", getUnsubscribeSecret())
      .update(payloadStr)
      .digest("base64url");

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Validate an unsubscribe token and return the payload if valid.
   * Returns null if the token is invalid or expired.
   */
  validateUnsubscribeToken(
    token: string,
  ): UnsubscribeTokenPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 2) {
        return null;
      }

      const [payloadBase64, signature] = parts;
      const payloadStr = Buffer.from(payloadBase64, "base64url").toString(
        "utf-8",
      );

      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", getUnsubscribeSecret())
        .update(payloadStr)
        .digest("base64url");

      if (!timingSafeEqual(signature, expectedSignature)) {
        return null;
      }

      const payload = JSON.parse(payloadStr) as UnsubscribeTokenPayload;

      // Check expiry
      if (payload.expiresAt < Date.now()) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Process an unsubscribe request from a token.
   */
  async processUnsubscribe(
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    const payload = this.validateUnsubscribeToken(token);
    if (!payload) {
      return { success: false, error: "Invalid or expired unsubscribe token" };
    }

    try {
      if (payload.templateType === "all") {
        await this.globalUnsubscribe(payload.userId);
      } else {
        await this.updatePreference(payload.userId, payload.templateType, {
          enabled: false,
        });
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async initializeDefaults(
    userId: string,
  ): Promise<UserEmailPreferences> {
    const defaults = DEFAULT_PREFERENCES.map((p) => ({ ...p }));
    const now = new Date().toISOString();

    const supabase = getSupabase();
    const { error } = await supabase.from("email_preferences").upsert({
      user_id: userId,
      preferences: defaults,
      global_unsubscribe: false,
      updated_at: now,
    });

    if (error) {
      throw new Error(
        `Failed to initialize email preferences: ${error.message}`,
      );
    }

    return {
      userId,
      preferences: defaults,
      globalUnsubscribe: false,
      updatedAt: now,
    };
  }

  private mapDbRowToPreferences(
    row: Record<string, unknown>,
  ): UserEmailPreferences {
    const prefs = row.preferences as EmailPreference[] | undefined;
    return {
      userId: row.user_id as string,
      preferences: prefs ?? DEFAULT_PREFERENCES.map((p) => ({ ...p })),
      globalUnsubscribe: (row.global_unsubscribe as boolean) ?? false,
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    };
  }
}

// Singleton export
const emailPreferencesService = new EmailPreferencesService();
export default emailPreferencesService;
