/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockSingle = jest.fn();
const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockUpsert = jest.fn();
const mockFrom = jest.fn().mockImplementation(() => ({
  select: mockSelect,
  upsert: mockUpsert,
}));

const mockClient = { from: mockFrom };

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => mockClient,
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  EmailPreferencesService,
  type EmailTemplateType,
} from "../email-preferences-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createService(): EmailPreferencesService {
  return new EmailPreferencesService();
}

function makeDbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user_id: "user-123",
    preferences: [
      { templateType: "welcome", enabled: true, frequency: "immediate" },
      { templateType: "dispute_status", enabled: true, frequency: "immediate" },
      { templateType: "score_change", enabled: true, frequency: "immediate" },
      { templateType: "payment_receipt", enabled: true, frequency: "immediate" },
      { templateType: "bill_reminder", enabled: true, frequency: "immediate" },
      { templateType: "weekly_digest", enabled: true, frequency: "weekly" },
      { templateType: "trading_alert", enabled: true, frequency: "immediate" },
      { templateType: "marketing", enabled: false, frequency: "weekly" },
    ],
    global_unsubscribe: false,
    updated_at: "2026-02-28T00:00:00.000Z",
    ...overrides,
  };
}

function resetChainMocks() {
  mockFrom.mockClear();
  mockSelect.mockClear();
  mockEq.mockClear();
  mockSingle.mockClear();
  mockUpsert.mockClear();

  // Re-wire the chain
  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    upsert: mockUpsert,
  }));
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailPreferencesService", () => {
  beforeEach(() => {
    resetChainMocks();
  });

  // -----------------------------------------------------------------------
  // getPreferences
  // -----------------------------------------------------------------------

  describe("getPreferences", () => {
    it("returns stored preferences when they exist", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      const result = await svc.getPreferences("user-123");

      expect(result.userId).toBe("user-123");
      expect(result.preferences).toHaveLength(8);
      expect(result.globalUnsubscribe).toBe(false);
      expect(mockFrom).toHaveBeenCalledWith("email_preferences");
    });

    it("initializes defaults when no preferences exist (PGRST116)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.getPreferences("user-new");

      expect(result.userId).toBe("user-new");
      expect(result.preferences).toHaveLength(8);
      expect(result.globalUnsubscribe).toBe(false);
      // Should have called upsert to persist defaults
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-new",
          global_unsubscribe: false,
        }),
      );
    });

    it("initializes defaults when data is null without error", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.getPreferences("user-new");

      expect(result.preferences).toHaveLength(8);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it("throws on non-PGRST116 database errors", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      } as never);

      const svc = createService();
      await expect(svc.getPreferences("user-123")).rejects.toThrow(
        "Failed to fetch email preferences: relation does not exist",
      );
    });

    it("throws when userId is empty", async () => {
      const svc = createService();
      await expect(svc.getPreferences("")).rejects.toThrow(
        "userId is required",
      );
    });

    it("returns default preferences with correct marketing default", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.getPreferences("user-123");

      const marketing = result.preferences.find(
        (p) => p.templateType === "marketing",
      );
      expect(marketing?.enabled).toBe(false);
      expect(marketing?.frequency).toBe("weekly");

      const welcome = result.preferences.find(
        (p) => p.templateType === "welcome",
      );
      expect(welcome?.enabled).toBe(true);
      expect(welcome?.frequency).toBe("immediate");
    });

    it("throws when initializing defaults fails", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      } as never);
      mockUpsert.mockResolvedValueOnce({
        error: { message: "DB write failed" },
      } as never);

      const svc = createService();
      await expect(svc.getPreferences("user-123")).rejects.toThrow(
        "Failed to initialize email preferences",
      );
    });
  });

  // -----------------------------------------------------------------------
  // updatePreference
  // -----------------------------------------------------------------------

  describe("updatePreference", () => {
    it("updates a single preference enabled status", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.updatePreference("user-123", "bill_reminder", {
        enabled: false,
      });

      const billReminder = result.preferences.find(
        (p) => p.templateType === "bill_reminder",
      );
      expect(billReminder?.enabled).toBe(false);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it("updates a single preference frequency", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.updatePreference("user-123", "trading_alert", {
        frequency: "daily",
      });

      const trading = result.preferences.find(
        (p) => p.templateType === "trading_alert",
      );
      expect(trading?.frequency).toBe("daily");
    });

    it("updates both enabled and frequency", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.updatePreference("user-123", "weekly_digest", {
        enabled: false,
        frequency: "daily",
      });

      const digest = result.preferences.find(
        (p) => p.templateType === "weekly_digest",
      );
      expect(digest?.enabled).toBe(false);
      expect(digest?.frequency).toBe("daily");
    });

    it("throws for unknown template type", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      await expect(
        svc.updatePreference(
          "user-123",
          "nonexistent" as EmailTemplateType,
          { enabled: false },
        ),
      ).rejects.toThrow("Unknown template type: nonexistent");
    });

    it("throws when userId is empty", async () => {
      const svc = createService();
      await expect(
        svc.updatePreference("", "bill_reminder", { enabled: false }),
      ).rejects.toThrow("userId is required");
    });

    it("throws when upsert fails", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({
        error: { message: "DB write failed" },
      } as never);

      const svc = createService();
      await expect(
        svc.updatePreference("user-123", "bill_reminder", { enabled: false }),
      ).rejects.toThrow("Failed to update email preference");
    });
  });

  // -----------------------------------------------------------------------
  // updatePreferences (bulk)
  // -----------------------------------------------------------------------

  describe("updatePreferences", () => {
    it("updates multiple preferences at once", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.updatePreferences("user-123", [
        { templateType: "bill_reminder", enabled: false },
        { templateType: "trading_alert", frequency: "daily" },
        { templateType: "marketing", enabled: true },
      ]);

      const billReminder = result.preferences.find(
        (p) => p.templateType === "bill_reminder",
      );
      const trading = result.preferences.find(
        (p) => p.templateType === "trading_alert",
      );
      const marketing = result.preferences.find(
        (p) => p.templateType === "marketing",
      );

      expect(billReminder?.enabled).toBe(false);
      expect(trading?.frequency).toBe("daily");
      expect(marketing?.enabled).toBe(true);
    });

    it("throws for unknown template type in bulk update", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      await expect(
        svc.updatePreferences("user-123", [
          { templateType: "bill_reminder", enabled: false },
          { templateType: "invalid_type" as EmailTemplateType, enabled: false },
        ]),
      ).rejects.toThrow("Unknown template type: invalid_type");
    });

    it("throws when userId is empty", async () => {
      const svc = createService();
      await expect(
        svc.updatePreferences("", [
          { templateType: "bill_reminder", enabled: false },
        ]),
      ).rejects.toThrow("userId is required");
    });

    it("throws when upsert fails", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({
        error: { message: "DB write failed" },
      } as never);

      const svc = createService();
      await expect(
        svc.updatePreferences("user-123", [
          { templateType: "bill_reminder", enabled: false },
        ]),
      ).rejects.toThrow("Failed to update email preferences");
    });
  });

  // -----------------------------------------------------------------------
  // globalUnsubscribe
  // -----------------------------------------------------------------------

  describe("globalUnsubscribe", () => {
    it("disables all email preferences", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.globalUnsubscribe("user-123");

      expect(result.globalUnsubscribe).toBe(true);
      for (const pref of result.preferences) {
        expect(pref.enabled).toBe(false);
      }
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ global_unsubscribe: true }),
      );
    });

    it("throws when userId is empty", async () => {
      const svc = createService();
      await expect(svc.globalUnsubscribe("")).rejects.toThrow(
        "userId is required",
      );
    });

    it("throws when upsert fails", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({
        error: { message: "DB write failed" },
      } as never);

      const svc = createService();
      await expect(svc.globalUnsubscribe("user-123")).rejects.toThrow(
        "Failed to global unsubscribe",
      );
    });
  });

  // -----------------------------------------------------------------------
  // resubscribe
  // -----------------------------------------------------------------------

  describe("resubscribe", () => {
    it("restores default preferences and clears global unsubscribe", async () => {
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const svc = createService();
      const result = await svc.resubscribe("user-123");

      expect(result.globalUnsubscribe).toBe(false);
      expect(result.preferences).toHaveLength(8);

      // Marketing should default to disabled
      const marketing = result.preferences.find(
        (p) => p.templateType === "marketing",
      );
      expect(marketing?.enabled).toBe(false);

      // Transactional should default to enabled
      const welcome = result.preferences.find(
        (p) => p.templateType === "welcome",
      );
      expect(welcome?.enabled).toBe(true);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ global_unsubscribe: false }),
      );
    });

    it("throws when userId is empty", async () => {
      const svc = createService();
      await expect(svc.resubscribe("")).rejects.toThrow("userId is required");
    });

    it("throws when upsert fails", async () => {
      mockUpsert.mockResolvedValueOnce({
        error: { message: "DB write failed" },
      } as never);

      const svc = createService();
      await expect(svc.resubscribe("user-123")).rejects.toThrow(
        "Failed to resubscribe",
      );
    });
  });

  // -----------------------------------------------------------------------
  // shouldSendEmail
  // -----------------------------------------------------------------------

  describe("shouldSendEmail", () => {
    it("returns true for enabled template", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      const result = await svc.shouldSendEmail("user-123", "bill_reminder");

      expect(result).toBe(true);
    });

    it("returns false for disabled template", async () => {
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      const result = await svc.shouldSendEmail("user-123", "marketing");

      expect(result).toBe(false);
    });

    it("returns false when globally unsubscribed", async () => {
      const row = makeDbRow({ global_unsubscribe: true });
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      const result = await svc.shouldSendEmail("user-123", "bill_reminder");

      expect(result).toBe(false);
    });

    it("returns false for empty userId", async () => {
      const svc = createService();
      const result = await svc.shouldSendEmail("", "bill_reminder");
      expect(result).toBe(false);
    });

    it("defaults to true for transactional emails on error", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      } as never);

      const svc = createService();
      const result = await svc.shouldSendEmail("user-123", "bill_reminder");

      expect(result).toBe(true);
    });

    it("defaults to false for marketing emails on error", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      } as never);

      const svc = createService();
      const result = await svc.shouldSendEmail("user-123", "marketing");

      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // generateUnsubscribeToken / validateUnsubscribeToken
  // -----------------------------------------------------------------------

  describe("unsubscribe tokens", () => {
    it("generates a valid token that can be validated", () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123", "bill_reminder");

      expect(token).toBeTruthy();
      expect(token.split(".")).toHaveLength(2);

      const payload = svc.validateUnsubscribeToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe("user-123");
      expect(payload?.templateType).toBe("bill_reminder");
    });

    it("generates token with 'all' type by default", () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123");

      const payload = svc.validateUnsubscribeToken(token);
      expect(payload?.templateType).toBe("all");
    });

    it("rejects tampered tokens", () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123");
      const tampered = token.slice(0, -4) + "XXXX";

      const payload = svc.validateUnsubscribeToken(tampered);
      expect(payload).toBeNull();
    });

    it("rejects tokens with invalid format", () => {
      const svc = createService();

      expect(svc.validateUnsubscribeToken("")).toBeNull();
      expect(svc.validateUnsubscribeToken("no-dot-here")).toBeNull();
      expect(svc.validateUnsubscribeToken("a.b.c")).toBeNull();
    });

    it("rejects expired tokens", () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123");

      // Decode the token and modify the expiry to the past
      const [payloadBase64] = token.split(".");
      const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
      const payload = JSON.parse(payloadStr) as Record<string, unknown>;
      payload.expiresAt = Date.now() - 1000; // expired 1 second ago

      const modifiedPayloadStr = JSON.stringify(payload);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require("crypto") as typeof import("crypto");
      const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET || "default-unsubscribe-secret";
      const modifiedBase64 = Buffer.from(modifiedPayloadStr).toString("base64url");
      const modifiedSignature = nodeCrypto
        .createHmac("sha256", secret)
        .update(modifiedPayloadStr)
        .digest("base64url");

      const expiredToken = `${modifiedBase64}.${modifiedSignature}`;
      const result = svc.validateUnsubscribeToken(expiredToken);
      expect(result).toBeNull();
    });

    it("sets expiry in the future", () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123");
      const payload = svc.validateUnsubscribeToken(token);

      expect(payload?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  // -----------------------------------------------------------------------
  // processUnsubscribe
  // -----------------------------------------------------------------------

  describe("processUnsubscribe", () => {
    it("processes global unsubscribe for 'all' token", async () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123", "all");

      // getPreferences call inside globalUnsubscribe
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const result = await svc.processUnsubscribe(token);

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ global_unsubscribe: true }),
      );
    });

    it("processes single template unsubscribe", async () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123", "bill_reminder");

      // getPreferences call inside updatePreference
      const row = makeDbRow();
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);
      mockUpsert.mockResolvedValueOnce({ error: null } as never);

      const result = await svc.processUnsubscribe(token);

      expect(result.success).toBe(true);
    });

    it("returns error for invalid token", async () => {
      const svc = createService();
      const result = await svc.processUnsubscribe("invalid-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid or expired unsubscribe token");
    });

    it("returns error when database operation fails", async () => {
      const svc = createService();
      const token = svc.generateUnsubscribeToken("user-123", "bill_reminder");

      // getPreferences fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      } as never);

      const result = await svc.processUnsubscribe(token);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // mapDbRowToPreferences edge cases
  // -----------------------------------------------------------------------

  describe("edge cases", () => {
    it("handles db row with null preferences array", async () => {
      const row = makeDbRow({ preferences: null });
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      const result = await svc.getPreferences("user-123");

      // Should fall back to defaults
      expect(result.preferences).toHaveLength(8);
    });

    it("handles db row with null global_unsubscribe", async () => {
      const row = makeDbRow({ global_unsubscribe: null });
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      const result = await svc.getPreferences("user-123");

      expect(result.globalUnsubscribe).toBe(false);
    });

    it("handles db row with null updated_at", async () => {
      const row = makeDbRow({ updated_at: null });
      mockSingle.mockResolvedValueOnce({
        data: row,
        error: null,
      } as never);

      const svc = createService();
      const result = await svc.getPreferences("user-123");

      // Should get a valid ISO date string as fallback
      expect(result.updatedAt).toBeTruthy();
    });
  });
});
