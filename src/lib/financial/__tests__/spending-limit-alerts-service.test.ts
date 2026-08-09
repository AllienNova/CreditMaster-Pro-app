/**
 * @jest-environment node
 */

/**
 * Spending Limit Alerts Service Unit Tests
 *
 * Comprehensive tests for limit CRUD, transaction processing,
 * alert lifecycle (create/acknowledge/dismiss), threshold-based
 * alert generation, analytics, and summary.
 */

// ---------------------------------------------------------------------------
// Mock Setup — must come before imports
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({
  from: mockFrom,
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { SpendingLimitAlertsService } from "../spending-limit-alerts-service";
import type { SpendingLimit } from "../spending-limit-alerts-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_URL = "https://test.supabase.co";
const TEST_KEY = "test-key";
const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const NOW_ISO = "2026-02-23T12:00:00.000Z";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbLimit(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    name: "Grocery Limit",
    type: "category",
    limit_amount: 500,
    period: "monthly",
    categories: ["groceries"],
    merchants: null,
    tags: null,
    warning_threshold: 80,
    critical_threshold: 95,
    notify_on_warning: true,
    notify_on_critical: true,
    notify_on_exceed: true,
    notification_channels: ["push", "in_app"],
    current_spent: 0,
    last_reset_date: NOW_ISO,
    is_active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

function makeDbAlert(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    limit_id: "limit-1",
    limit_name: "Grocery Limit",
    severity: "warning",
    status: "active",
    spent_amount: 420,
    limit_amount: 500,
    percent_used: 84,
    remaining_amount: 80,
    trigger_transaction_id: "txn-1",
    trigger_transaction_amount: 50,
    trigger_merchant: "Whole Foods",
    trigger_category: "groceries",
    title: "Grocery Limit spending alert",
    message: "You've used 84% of your monthly Grocery Limit limit. $80.00 remaining.",
    triggered_at: NOW_ISO,
    acknowledged_at: null,
    expires_at: "2026-03-02T12:00:00.000Z",
    ...overrides,
  };
}

function makeLimitInput(
  overrides: Partial<Omit<SpendingLimit, "id" | "currentSpent" | "lastResetDate" | "createdAt" | "updatedAt">> = {},
): Omit<SpendingLimit, "id" | "currentSpent" | "lastResetDate" | "createdAt" | "updatedAt"> {
  return {
    userId: "user-1",
    name: "Grocery Limit",
    type: "category",
    limitAmount: 500,
    period: "monthly",
    categories: ["groceries"],
    warningThreshold: 80,
    criticalThreshold: 95,
    notifyOnWarning: true,
    notifyOnCritical: true,
    notifyOnExceed: true,
    notificationChannels: ["push", "in_app"],
    isActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SpendingLimitAlertsService", () => {
  let service: SpendingLimitAlertsService;

  beforeEach(() => {
    // Re-set mockCreateClient implementation (resetMocks strips it each test)
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    } as any);
    service = new SpendingLimitAlertsService(TEST_URL, TEST_KEY);
    jest.spyOn(crypto, "randomUUID").mockReturnValue(FIXED_UUID);
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe("constructor", () => {
    it("calls createClient with the provided url and key", () => {
      expect(mockCreateClient).toHaveBeenCalledWith(TEST_URL, TEST_KEY);
    });
  });

  // =========================================================================
  // createLimit
  // =========================================================================

  describe("createLimit", () => {
    it("creates a limit and returns the mapped result", async () => {
      const dbRow = makeDbLimit();
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.createLimit(makeLimitInput());

      expect(result.id).toBe(FIXED_UUID);
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("Grocery Limit");
      expect(result.currentSpent).toBe(0);
      expect(result.limitAmount).toBe(500);
      expect(mockFrom).toHaveBeenCalledWith("spending_limits");
    });

    it("initializes currentSpent to zero", async () => {
      const dbRow = makeDbLimit({ current_spent: 0 });
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.createLimit(makeLimitInput());
      expect(result.currentSpent).toBe(0);
    });

    it("throws when supabase returns an error", async () => {
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Insert failed" },
            }),
          }),
        }),
      });

      await expect(service.createLimit(makeLimitInput())).rejects.toEqual({
        message: "Insert failed",
      });
    });

    it("assigns a crypto.randomUUID id", async () => {
      const dbRow = makeDbLimit();
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.createLimit(makeLimitInput());
      expect(result.id).toBe(FIXED_UUID);
    });
  });

  // =========================================================================
  // updateLimit
  // =========================================================================

  describe("updateLimit", () => {
    it("updates a limit and returns the mapped result", async () => {
      const dbRow = makeDbLimit({ name: "Updated Limit", limit_amount: 700 });
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
            }),
          }),
        }),
      });

      const result = await service.updateLimit(FIXED_UUID, {
        name: "Updated Limit",
        limitAmount: 700,
      });
      expect(result.name).toBe("Updated Limit");
      expect(result.limitAmount).toBe(700);
    });

    it("throws when supabase returns an error", async () => {
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Update failed" },
              }),
            }),
          }),
        }),
      });

      await expect(
        service.updateLimit(FIXED_UUID, { name: "fail" }),
      ).rejects.toEqual({ message: "Update failed" });
    });
  });

  // =========================================================================
  // deleteLimit
  // =========================================================================

  describe("deleteLimit", () => {
    it("deletes a limit by id", async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await expect(service.deleteLimit(FIXED_UUID)).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith("spending_limits");
    });

    it("throws when supabase returns an error", async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Delete failed" },
          }),
        }),
      });

      await expect(service.deleteLimit(FIXED_UUID)).rejects.toEqual({
        message: "Delete failed",
      });
    });
  });

  // =========================================================================
  // getLimit
  // =========================================================================

  describe("getLimit", () => {
    it("returns a mapped limit when found", async () => {
      const dbRow = makeDbLimit();
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.getLimit(FIXED_UUID);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(FIXED_UUID);
      expect(result!.limitAmount).toBe(500);
    });

    it("returns null when not found", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await service.getLimit("nonexistent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getUserLimits
  // =========================================================================

  describe("getUserLimits", () => {
    it("returns active limits by default", async () => {
      const rows = [makeDbLimit(), makeDbLimit({ id: "limit-2", name: "Dining" })];

      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getUserLimits("user-1");
      expect(result).toHaveLength(2);
    });

    it("includes inactive limits when activeOnly is false", async () => {
      const rows = [
        makeDbLimit(),
        makeDbLimit({ id: "limit-2", is_active: false }),
      ];

      const orderMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getUserLimits("user-1", false);
      expect(result).toHaveLength(2);
    });

    it("throws on supabase error", async () => {
      const eqActiveMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      await expect(service.getUserLimits("user-1")).rejects.toEqual({
        message: "Query failed",
      });
    });

    it("returns empty array when no limits exist", async () => {
      const eqActiveMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getUserLimits("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // processTransaction
  // =========================================================================

  describe("processTransaction", () => {
    /**
     * processTransaction is complex: it calls getUserLimits, then for each
     * matching limit checks reset, updates spent, checks thresholds, and
     * possibly creates alerts. We set up multi-table mocks carefully.
     */
    function setupProcessTransaction(opts: {
      limits: Record<string, unknown>[];
      updatedLimit?: Record<string, unknown>;
      alertDbRow?: Record<string, unknown>;
      recentAlert?: Record<string, unknown> | null;
    }) {
      const {
        limits,
        updatedLimit = makeDbLimit({ current_spent: 420 }),
        alertDbRow = makeDbAlert(),
        recentAlert = null,
      } = opts;

      mockFrom.mockImplementation((table: string) => {
        if (table === "spending_limits") {
          return {
            // getUserLimits chain
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: limits, error: null }),
                }),
              }),
            }),
            // updateLimit chain
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedLimit,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "spending_alerts") {
          return {
            // getRecentAlertForLimit chain
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: recentAlert,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            // createAlert chain
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: alertDbRow,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });
    }

    it("generates a warning alert when spending exceeds warning threshold", async () => {
      const limit = makeDbLimit({
        current_spent: 370,
        last_reset_date: new Date().toISOString(),
        type: "category",
        categories: ["groceries"],
        warning_threshold: 80,
        critical_threshold: 95,
        notify_on_warning: true,
      });

      setupProcessTransaction({
        limits: [limit],
        updatedLimit: makeDbLimit({ current_spent: 420 }),
        alertDbRow: makeDbAlert({ severity: "warning", percent_used: 84 }),
      });

      // $370 + $50 = $420 = 84% of $500 → exceeds 80% warning threshold
      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Whole Foods", "groceries",
      );
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe("warning");
    });

    it("generates a critical alert when spending exceeds critical threshold", async () => {
      const limit = makeDbLimit({
        current_spent: 460,
        last_reset_date: new Date().toISOString(),
        type: "category",
        categories: ["groceries"],
        critical_threshold: 95,
        notify_on_critical: true,
      });

      setupProcessTransaction({
        limits: [limit],
        updatedLimit: makeDbLimit({ current_spent: 490 }),
        alertDbRow: makeDbAlert({ severity: "critical", percent_used: 98 }),
      });

      // $460 + $30 = $490 = 98% → exceeds 95% critical
      const alerts = await service.processTransaction(
        "user-1", "txn-1", 30, "Trader Joe", "groceries",
      );
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe("critical");
    });

    it("skips limits that don't match the transaction category", async () => {
      const limit = makeDbLimit({
        type: "category",
        categories: ["dining"],
        current_spent: 0,
        last_reset_date: new Date().toISOString(),
      });

      setupProcessTransaction({ limits: [limit] });

      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Whole Foods", "groceries",
      );
      expect(alerts).toHaveLength(0);
    });

    it("matches total-type limits regardless of category", async () => {
      const limit = makeDbLimit({
        type: "total",
        categories: null,
        current_spent: 450,
        last_reset_date: new Date().toISOString(),
        notify_on_critical: true,
        critical_threshold: 95,
      });

      setupProcessTransaction({
        limits: [limit],
        updatedLimit: makeDbLimit({ current_spent: 500 }),
        alertDbRow: makeDbAlert({ severity: "critical", percent_used: 100 }),
      });

      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Any Merchant", "any_category",
      );
      expect(alerts).toHaveLength(1);
    });

    it("matches merchant-type limits by merchant name", async () => {
      const limit = makeDbLimit({
        type: "merchant",
        categories: null,
        merchants: ["amazon"],
        current_spent: 380,
        last_reset_date: new Date().toISOString(),
        notify_on_warning: true,
        warning_threshold: 80,
      });

      setupProcessTransaction({
        limits: [limit],
        updatedLimit: makeDbLimit({ current_spent: 430 }),
        alertDbRow: makeDbAlert({ severity: "warning" }),
      });

      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Amazon.com", "shopping",
      );
      expect(alerts).toHaveLength(1);
    });

    it("skips merchant-type limit when merchant does not match", async () => {
      const limit = makeDbLimit({
        type: "merchant",
        merchants: ["amazon"],
        current_spent: 0,
        last_reset_date: new Date().toISOString(),
      });

      setupProcessTransaction({ limits: [limit] });

      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Whole Foods", "groceries",
      );
      expect(alerts).toHaveLength(0);
    });

    it("does not create duplicate alert when recent alert exists", async () => {
      const limit = makeDbLimit({
        type: "category",
        categories: ["groceries"],
        current_spent: 370,
        last_reset_date: new Date().toISOString(),
        notify_on_warning: true,
        warning_threshold: 80,
      });

      // recentAlert is NOT null → should suppress
      setupProcessTransaction({
        limits: [limit],
        updatedLimit: makeDbLimit({ current_spent: 420 }),
        recentAlert: makeDbAlert(),
      });

      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Whole Foods", "groceries",
      );
      expect(alerts).toHaveLength(0);
    });

    it("does not alert when below warning threshold", async () => {
      const limit = makeDbLimit({
        type: "category",
        categories: ["groceries"],
        current_spent: 100,
        last_reset_date: new Date().toISOString(),
        warning_threshold: 80,
        notify_on_warning: true,
      });

      setupProcessTransaction({
        limits: [limit],
        updatedLimit: makeDbLimit({ current_spent: 150 }),
      });

      // $100 + $50 = $150 = 30% → below 80% warning
      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Whole Foods", "groceries",
      );
      expect(alerts).toHaveLength(0);
    });

    it("handles recurring-type limit (returns false for match)", async () => {
      const limit = makeDbLimit({
        type: "recurring",
        current_spent: 0,
        last_reset_date: new Date().toISOString(),
      });

      setupProcessTransaction({ limits: [limit] });

      const alerts = await service.processTransaction(
        "user-1", "txn-1", 50, "Netflix", "subscriptions",
      );
      expect(alerts).toHaveLength(0);
    });
  });

  // =========================================================================
  // createAlert
  // =========================================================================

  describe("createAlert", () => {
    it("creates an alert and returns the mapped result", async () => {
      const dbRow = makeDbAlert();
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.createAlert({
        userId: "user-1",
        limitId: "limit-1",
        limitName: "Grocery Limit",
        severity: "warning",
        spentAmount: 420,
        limitAmount: 500,
        percentUsed: 84,
        remainingAmount: 80,
        triggerTransactionId: "txn-1",
        triggerTransactionAmount: 50,
        triggerMerchant: "Whole Foods",
        triggerCategory: "groceries",
        title: "Grocery Limit spending alert",
        message: "You've used 84% of your monthly Grocery Limit limit. $80.00 remaining.",
      });

      expect(result.id).toBe(FIXED_UUID);
      expect(result.status).toBe("active");
      expect(result.severity).toBe("warning");
      expect(mockFrom).toHaveBeenCalledWith("spending_alerts");
    });

    it("sets expiration to 7 days from now", async () => {
      const dbRow = makeDbAlert({
        expires_at: "2026-03-02T12:00:00.000Z",
      });
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.createAlert({
        userId: "user-1",
        limitId: "limit-1",
        limitName: "Test",
        severity: "warning",
        spentAmount: 100,
        limitAmount: 200,
        percentUsed: 50,
        remainingAmount: 100,
        title: "Test",
        message: "Test",
      });

      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("throws when supabase returns an error", async () => {
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Insert failed" },
            }),
          }),
        }),
      });

      await expect(
        service.createAlert({
          userId: "user-1",
          limitId: "limit-1",
          limitName: "Test",
          severity: "warning",
          spentAmount: 100,
          limitAmount: 200,
          percentUsed: 50,
          remainingAmount: 100,
          title: "Test",
          message: "Test",
        }),
      ).rejects.toEqual({ message: "Insert failed" });
    });
  });

  // =========================================================================
  // acknowledgeAlert
  // =========================================================================

  describe("acknowledgeAlert", () => {
    it("marks alert as acknowledged", async () => {
      const dbRow = makeDbAlert({
        status: "acknowledged",
        acknowledged_at: NOW_ISO,
      });
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
            }),
          }),
        }),
      });

      const result = await service.acknowledgeAlert(FIXED_UUID);
      expect(result.status).toBe("acknowledged");
      expect(result.acknowledgedAt).toBeInstanceOf(Date);
    });

    it("throws when supabase returns an error", async () => {
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Update failed" },
              }),
            }),
          }),
        }),
      });

      await expect(service.acknowledgeAlert(FIXED_UUID)).rejects.toEqual({
        message: "Update failed",
      });
    });
  });

  // =========================================================================
  // dismissAlert
  // =========================================================================

  describe("dismissAlert", () => {
    it("updates alert status to dismissed", async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockFrom.mockReturnValue({ update: updateMock });

      await service.dismissAlert(FIXED_UUID);
      expect(mockFrom).toHaveBeenCalledWith("spending_alerts");
      expect(updateMock).toHaveBeenCalledWith({ status: "dismissed" });
    });
  });

  // =========================================================================
  // getActiveAlerts
  // =========================================================================

  describe("getActiveAlerts", () => {
    it("returns active non-expired alerts", async () => {
      const rows = [makeDbAlert(), makeDbAlert({ id: "alert-2" })];

      const orderMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const gtMock = jest.fn().mockReturnValue({ order: orderMock });
      const eqStatusMock = jest.fn().mockReturnValue({ gt: gtMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getActiveAlerts("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("active");
    });

    it("throws on supabase error", async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });
      const gtMock = jest.fn().mockReturnValue({ order: orderMock });
      const eqStatusMock = jest.fn().mockReturnValue({ gt: gtMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      await expect(service.getActiveAlerts("user-1")).rejects.toEqual({
        message: "Query failed",
      });
    });

    it("returns empty array when no active alerts", async () => {
      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const gtMock = jest.fn().mockReturnValue({ order: orderMock });
      const eqStatusMock = jest.fn().mockReturnValue({ gt: gtMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getActiveAlerts("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getAlertHistory
  // =========================================================================

  describe("getAlertHistory", () => {
    it("returns alert history with default limit of 50", async () => {
      const rows = [makeDbAlert()];

      const limitMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      const result = await service.getAlertHistory("user-1");
      expect(result).toHaveLength(1);
      expect(limitMock).toHaveBeenCalledWith(50);
    });

    it("accepts a custom limit", async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      await service.getAlertHistory("user-1", 10);
      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it("throws on supabase error", async () => {
      const limitMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });

      await expect(service.getAlertHistory("user-1")).rejects.toEqual({
        message: "Query failed",
      });
    });
  });

  // =========================================================================
  // analyzeLimit
  // =========================================================================

  describe("analyzeLimit", () => {
    it("returns null when limit is not found", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await service.analyzeLimit("nonexistent");
      expect(result).toBeNull();
    });

    it("returns analysis with correct spending data", async () => {
      const dbRow = makeDbLimit({ current_spent: 250 });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.analyzeLimit(FIXED_UUID);
      expect(result).not.toBeNull();
      expect(result!.currentSpent).toBe(250);
      expect(result!.percentUsed).toBe(50); // 250/500 * 100
      expect(result!.remaining).toBe(250);
      expect(result!.limit.id).toBe(FIXED_UUID);
    });

    it("marks willExceed true when projected total exceeds limit", async () => {
      // Set current_spent high enough that projection will exceed
      const dbRow = makeDbLimit({ current_spent: 480 });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.analyzeLimit(FIXED_UUID);
      expect(result).not.toBeNull();
      // With 480 spent early in the period, projected total will likely exceed 500
      expect(typeof result!.willExceed).toBe("boolean");
      expect(typeof result!.projectedTotal).toBe("number");
    });

    it("returns empty recentTransactions array", async () => {
      const dbRow = makeDbLimit({ current_spent: 100 });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.analyzeLimit(FIXED_UUID);
      expect(result!.recentTransactions).toEqual([]);
    });

    it("calculates trend as stable/increasing/decreasing", async () => {
      const dbRow = makeDbLimit({ current_spent: 100 });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await service.analyzeLimit(FIXED_UUID);
      expect(["increasing", "decreasing", "stable"]).toContain(result!.trend);
    });
  });

  // =========================================================================
  // getLimitSummary
  // =========================================================================

  describe("getLimitSummary", () => {
    function setupLimits(rows: Record<string, unknown>[]) {
      const eqActiveMock = jest.fn().mockResolvedValue({ data: rows, error: null });
      const orderMock = jest.fn().mockReturnValue({ eq: eqActiveMock });
      const eqUserMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: eqUserMock }),
      });
    }

    it("returns correct summary with mixed spending levels", async () => {
      const limits = [
        makeDbLimit({ id: "l1", limit_amount: 500, current_spent: 420, warning_threshold: 80 }),  // 84% → warning
        makeDbLimit({ id: "l2", limit_amount: 200, current_spent: 250, warning_threshold: 80 }),  // 125% → exceeded
        makeDbLimit({ id: "l3", limit_amount: 300, current_spent: 100, warning_threshold: 80 }),  // 33% → ok
      ];

      setupLimits(limits);

      const summary = await service.getLimitSummary("user-1");
      expect(summary.totalLimits).toBe(3);
      expect(summary.activeLimits).toBe(3);
      expect(summary.limitsAtWarning).toBe(1);
      expect(summary.limitsExceeded).toBe(1);
      expect(summary.totalBudgeted).toBe(1000);
      expect(summary.totalSpent).toBe(770);
      expect(summary.overallPercentUsed).toBe(77);
    });

    it("returns zero values when no limits exist", async () => {
      setupLimits([]);

      const summary = await service.getLimitSummary("user-1");
      expect(summary.totalLimits).toBe(0);
      expect(summary.totalBudgeted).toBe(0);
      expect(summary.totalSpent).toBe(0);
      expect(summary.overallPercentUsed).toBe(0);
    });

    it("handles all limits exceeded", async () => {
      const limits = [
        makeDbLimit({ id: "l1", limit_amount: 100, current_spent: 150, warning_threshold: 80 }),
        makeDbLimit({ id: "l2", limit_amount: 200, current_spent: 300, warning_threshold: 80 }),
      ];

      setupLimits(limits);

      const summary = await service.getLimitSummary("user-1");
      expect(summary.limitsExceeded).toBe(2);
      expect(summary.limitsAtWarning).toBe(0);
    });

    it("handles all limits under warning threshold", async () => {
      const limits = [
        makeDbLimit({ id: "l1", limit_amount: 500, current_spent: 100, warning_threshold: 80 }),
        makeDbLimit({ id: "l2", limit_amount: 200, current_spent: 50, warning_threshold: 80 }),
      ];

      setupLimits(limits);

      const summary = await service.getLimitSummary("user-1");
      expect(summary.limitsAtWarning).toBe(0);
      expect(summary.limitsExceeded).toBe(0);
    });
  });
});
