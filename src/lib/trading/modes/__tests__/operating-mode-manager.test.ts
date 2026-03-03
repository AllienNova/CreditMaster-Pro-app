/**
 * Operating Mode Manager Tests
 *
 * Comprehensive tests for the WATCH -> GUIDED -> AUTONOMOUS state machine.
 * Covers account creation/retrieval, graduation progress, mode transitions,
 * trade recording, permissions, circuit breaker events, and edge cases.
 */

import {
  OperatingModeManager,
  createOperatingModeManager,
} from "../operating-mode-manager";
import {
  WATCH_TO_GUIDED_CRITERIA,
  GUIDED_TO_AUTONOMOUS_CRITERIA,
  getNextMode,
  getPreviousMode,
  type OperatingMode,
  type ModePermissions,
} from "../mode-types";

// ============================================================================
// MOCK: supabaseAdmin
// ============================================================================

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/server", () => {
  return {
    supabaseAdmin: {
      get from() {
        return mockFrom;
      },
    },
  };
});

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

function makeWatchAccountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "acct-001",
    user_id: "user-123",
    operating_mode: "watch",
    watch_start_date: "2026-01-01T00:00:00.000Z",
    watch_paper_trade_count: 0,
    watch_paper_days_active: 0,
    watch_paper_profitable: false,
    watch_graduation_date: null,
    guided_start_date: null,
    guided_live_trade_count: 0,
    guided_live_days_active: 0,
    guided_live_profitable: false,
    guided_graduation_date: null,
    strategy_performance: {},
    max_daily_trades: 10,
    max_position_value: "10000.00",
    max_daily_loss_pct: "2.00",
    autonomous_enabled: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeGuidedAccountRow(overrides: Record<string, unknown> = {}) {
  return makeWatchAccountRow({
    operating_mode: "guided",
    watch_paper_trade_count: 35,
    watch_paper_days_active: 35,
    watch_paper_profitable: true,
    watch_graduation_date: "2026-02-01T00:00:00.000Z",
    guided_start_date: "2026-02-01T00:00:00.000Z",
    guided_live_trade_count: 0,
    guided_live_days_active: 0,
    guided_live_profitable: false,
    ...overrides,
  });
}

function makeAutonomousAccountRow(overrides: Record<string, unknown> = {}) {
  return makeGuidedAccountRow({
    operating_mode: "autonomous",
    guided_live_trade_count: 35,
    guided_live_days_active: 35,
    guided_live_profitable: true,
    guided_graduation_date: "2026-03-01T00:00:00.000Z",
    autonomous_enabled: true,
    ...overrides,
  });
}

function makeCircuitBreakerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cb-001",
    user_id: "user-123",
    breaker_type: "daily_loss",
    severity: "warning",
    trigger_value: 2.5,
    threshold_value: 2.0,
    action_taken: "halt_trading",
    details: { message: "Daily loss limit exceeded" },
    resolved: false,
    resolved_at: null,
    resolution_notes: null,
    symbol: null,
    operating_mode: "guided",
    created_at: "2026-02-15T10:00:00.000Z",
    ...overrides,
  };
}

/**
 * Set up mockFrom to return a row for select().eq().single() chain.
 * Also supports insert/update chains.
 */
function setupSelectMock(
  row: Record<string, unknown> | null,
  error: { message: string; code?: string } | null = null,
) {
  const singleMock = jest.fn().mockResolvedValue({ data: row, error });
  const eqMock = jest.fn().mockReturnValue({ single: singleMock });
  mockSelect.mockReturnValue({ eq: eqMock });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate });
}

function setupSelectNotFound() {
  const singleMock = jest
    .fn()
    .mockResolvedValue({ data: null, error: { code: "PGRST116", message: "No rows found" } });
  const eqMock = jest.fn().mockReturnValue({ single: singleMock });
  mockSelect.mockReturnValue({ eq: eqMock });
}

function setupInsertMock(
  row: Record<string, unknown> | null,
  error: { message: string } | null = null,
) {
  const singleMock = jest.fn().mockResolvedValue({ data: row, error });
  const selectAfterInsert = jest.fn().mockReturnValue({ single: singleMock });
  mockInsert.mockReturnValue({ select: selectAfterInsert });
}

function setupUpdateMock(
  error: { message: string } | null = null,
  data: Record<string, unknown> | null = null,
) {
  const singleMock = jest.fn().mockResolvedValue({ data, error });
  const selectAfterUpdate = jest.fn().mockReturnValue({ single: singleMock });
  const eqSecond = jest.fn().mockReturnValue({
    select: selectAfterUpdate,
    single: singleMock,
  });
  const eqFirst = jest.fn().mockReturnValue({
    eq: eqSecond,
    select: selectAfterUpdate,
  });
  mockUpdate.mockReturnValue({ eq: eqFirst });
}

/**
 * Setup a full getAccount call that returns a row, then allows
 * subsequent update/insert calls.
 */
function setupAccountAndUpdate(
  accountRow: Record<string, unknown>,
  updateError: { message: string } | null = null,
) {
  // First call: getAccount -> select
  // Second call: update
  let callCount = 0;

  mockFrom.mockImplementation((table: string) => {
    callCount++;
    if (table === "trading_accounts" && callCount === 1) {
      // getAccount call
      const singleMock = jest
        .fn()
        .mockResolvedValue({ data: accountRow, error: null });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      return {
        select: jest.fn().mockReturnValue({ eq: eqMock }),
        insert: mockInsert,
        update: mockUpdate,
      };
    }
    if (table === "trading_accounts") {
      // update call
      const eqMock = jest
        .fn()
        .mockReturnValue({ error: updateError });
      mockUpdate.mockReturnValue({ eq: eqMock });
      return { update: mockUpdate };
    }
    if (table === "mode_transitions") {
      // insert transition
      mockInsert.mockReturnValue({ error: null });
      return { insert: jest.fn().mockReturnValue({ error: null }) };
    }
    // circuit_breaker_events
    const singleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const selectAfterOp = jest.fn().mockReturnValue({ single: singleMock });
    return {
      insert: jest.fn().mockReturnValue({ select: selectAfterOp }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: selectAfterOp,
          }),
        }),
      }),
    };
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("OperatingModeManager", () => {
  let manager: OperatingModeManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new OperatingModeManager("user-123");
  });

  // --------------------------------------------------------------------------
  // Factory Function
  // --------------------------------------------------------------------------

  describe("createOperatingModeManager", () => {
    it("should create an instance via factory function", () => {
      const instance = createOperatingModeManager("user-456");
      expect(instance).toBeInstanceOf(OperatingModeManager);
    });
  });

  // --------------------------------------------------------------------------
  // Account Creation & Retrieval
  // --------------------------------------------------------------------------

  describe("getAccount", () => {
    it("should return existing account when found", async () => {
      const row = makeWatchAccountRow();
      setupSelectMock(row);

      const result = await manager.getAccount();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.userId).toBe("user-123");
      expect(result.data!.operatingMode).toBe("watch");
      expect(result.data!.watchPaperTradeCount).toBe(0);
      expect(result.data!.isActive).toBe(true);
    });

    it("should create a new account when none exists (PGRST116)", async () => {
      const createdRow = makeWatchAccountRow();

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: select -> not found
          const singleMock = jest.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "No rows" },
          });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        // Second call: insert -> created
        const singleMock = jest
          .fn()
          .mockResolvedValue({ data: createdRow, error: null });
        const selectAfterInsert = jest
          .fn()
          .mockReturnValue({ single: singleMock });
        return {
          insert: jest.fn().mockReturnValue({ select: selectAfterInsert }),
        };
      });

      const result = await manager.getAccount();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.operatingMode).toBe("watch");
    });

    it("should return error on database failure", async () => {
      setupSelectMock(null, { message: "Connection refused" });

      const result = await manager.getAccount();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to load account");
    });

    it("should handle insert failure when creating new account", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "No rows" },
          });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const singleMock = jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Unique violation" },
        });
        const selectAfterInsert = jest
          .fn()
          .mockReturnValue({ single: singleMock });
        return {
          insert: jest.fn().mockReturnValue({ select: selectAfterInsert }),
        };
      });

      const result = await manager.getAccount();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create account");
    });

    it("should convert numeric string DB values (max_position_value, max_daily_loss_pct)", async () => {
      const row = makeWatchAccountRow({
        max_position_value: "25000.50",
        max_daily_loss_pct: "3.50",
      });
      setupSelectMock(row);

      const result = await manager.getAccount();

      expect(result.success).toBe(true);
      expect(result.data!.maxPositionValue).toBe(25000.5);
      expect(result.data!.maxDailyLossPct).toBe(3.5);
    });
  });

  // --------------------------------------------------------------------------
  // getCurrentMode
  // --------------------------------------------------------------------------

  describe("getCurrentMode", () => {
    it("should return the current operating mode", async () => {
      const row = makeGuidedAccountRow();
      setupSelectMock(row);

      const result = await manager.getCurrentMode();

      expect(result.success).toBe(true);
      expect(result.data).toBe("guided");
    });

    it("should return error for inactive account", async () => {
      const row = makeWatchAccountRow({ is_active: false });
      setupSelectMock(row);

      const result = await manager.getCurrentMode();

      expect(result.success).toBe(false);
      expect(result.error).toContain("inactive");
    });
  });

  // --------------------------------------------------------------------------
  // Graduation Progress — WATCH -> GUIDED
  // --------------------------------------------------------------------------

  describe("getGraduationProgress — WATCH mode", () => {
    it("should report all criteria unmet for fresh watch account", async () => {
      const row = makeWatchAccountRow();
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.success).toBe(true);
      const progress = result.data!;
      expect(progress.currentMode).toBe("watch");
      expect(progress.nextMode).toBe("guided");
      expect(progress.allCriteriaMet).toBe(false);

      // Paper trades: 0/30
      expect(progress.criteria["paperTrades"].current).toBe(0);
      expect(progress.criteria["paperTrades"].required).toBe(30);
      expect(progress.criteria["paperTrades"].met).toBe(false);

      // Days active: 0/30
      expect(progress.criteria["daysActive"].current).toBe(0);
      expect(progress.criteria["daysActive"].required).toBe(30);
      expect(progress.criteria["daysActive"].met).toBe(false);

      // Profitable: false
      expect(progress.criteria["profitable"].met).toBe(false);
    });

    it("should report partial progress when some criteria met", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 35,
        watch_paper_days_active: 15,
        watch_paper_profitable: true,
      });
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.success).toBe(true);
      const progress = result.data!;
      expect(progress.criteria["paperTrades"].met).toBe(true);
      expect(progress.criteria["daysActive"].met).toBe(false);
      expect(progress.criteria["profitable"].met).toBe(true);
      expect(progress.allCriteriaMet).toBe(false);
    });

    it("should report all criteria met when eligible for graduation", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 30,
        watch_paper_days_active: 30,
        watch_paper_profitable: true,
      });
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.success).toBe(true);
      const progress = result.data!;
      expect(progress.allCriteriaMet).toBe(true);
      expect(progress.summary).toContain("All criteria met");
    });

    it("should show correct required values from WATCH_TO_GUIDED_CRITERIA", async () => {
      const row = makeWatchAccountRow();
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.data!.criteria["paperTrades"].required).toBe(
        WATCH_TO_GUIDED_CRITERIA.minPaperTrades,
      );
      expect(result.data!.criteria["daysActive"].required).toBe(
        WATCH_TO_GUIDED_CRITERIA.minDaysActive,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Graduation Progress — GUIDED -> AUTONOMOUS
  // --------------------------------------------------------------------------

  describe("getGraduationProgress — GUIDED mode", () => {
    it("should report guided criteria with user opt-in requirement", async () => {
      const row = makeGuidedAccountRow();
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.success).toBe(true);
      const progress = result.data!;
      expect(progress.currentMode).toBe("guided");
      expect(progress.nextMode).toBe("autonomous");
      expect(progress.allCriteriaMet).toBe(false);

      // Live trades: 0/30
      expect(progress.criteria["liveTrades"].current).toBe(0);
      expect(progress.criteria["liveTrades"].required).toBe(30);
      expect(progress.criteria["liveTrades"].met).toBe(false);

      // User opt-in: false
      expect(progress.criteria["userOptIn"].current).toBe(false);
      expect(progress.criteria["userOptIn"].met).toBe(false);
    });

    it("should require user opt-in even when other criteria are met", async () => {
      const row = makeGuidedAccountRow({
        guided_live_trade_count: 40,
        guided_live_days_active: 40,
        guided_live_profitable: true,
        autonomous_enabled: false,
      });
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      const progress = result.data!;
      expect(progress.criteria["liveTrades"].met).toBe(true);
      expect(progress.criteria["daysActive"].met).toBe(true);
      expect(progress.criteria["profitable"].met).toBe(true);
      expect(progress.criteria["userOptIn"].met).toBe(false);
      expect(progress.allCriteriaMet).toBe(false);
    });

    it("should report all criteria met when fully eligible", async () => {
      const row = makeGuidedAccountRow({
        guided_live_trade_count: 30,
        guided_live_days_active: 30,
        guided_live_profitable: true,
        autonomous_enabled: true,
      });
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.data!.allCriteriaMet).toBe(true);
    });

    it("should show correct required values from GUIDED_TO_AUTONOMOUS_CRITERIA", async () => {
      const row = makeGuidedAccountRow();
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.data!.criteria["liveTrades"].required).toBe(
        GUIDED_TO_AUTONOMOUS_CRITERIA.minLiveTrades,
      );
      expect(result.data!.criteria["daysActive"].required).toBe(
        GUIDED_TO_AUTONOMOUS_CRITERIA.minDaysActive,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Graduation Progress — AUTONOMOUS (max mode)
  // --------------------------------------------------------------------------

  describe("getGraduationProgress — AUTONOMOUS mode", () => {
    it("should report no next mode and empty criteria at max", async () => {
      const row = makeAutonomousAccountRow();
      setupSelectMock(row);

      const result = await manager.getGraduationProgress();

      expect(result.success).toBe(true);
      const progress = result.data!;
      expect(progress.currentMode).toBe("autonomous");
      expect(progress.nextMode).toBeNull();
      expect(progress.allCriteriaMet).toBe(false);
      expect(Object.keys(progress.criteria)).toHaveLength(0);
      expect(progress.summary).toContain("maximum");
    });
  });

  // --------------------------------------------------------------------------
  // canGraduate
  // --------------------------------------------------------------------------

  describe("canGraduate", () => {
    it("should return true when all watch criteria are met", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 30,
        watch_paper_days_active: 30,
        watch_paper_profitable: true,
      });
      setupSelectMock(row);

      const result = await manager.canGraduate();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it("should return false when criteria are not fully met", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 25,
        watch_paper_days_active: 30,
        watch_paper_profitable: true,
      });
      setupSelectMock(row);

      const result = await manager.canGraduate();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it("should return false for autonomous mode (already at max)", async () => {
      const row = makeAutonomousAccountRow();
      setupSelectMock(row);

      const result = await manager.canGraduate();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it("should return false for inactive account", async () => {
      const row = makeWatchAccountRow({
        is_active: false,
        watch_paper_trade_count: 50,
        watch_paper_days_active: 50,
        watch_paper_profitable: true,
      });
      setupSelectMock(row);

      const result = await manager.canGraduate();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Mode Transitions — Upgrade
  // --------------------------------------------------------------------------

  describe("graduate — WATCH to GUIDED", () => {
    it("should transition from watch to guided when criteria met", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 35,
        watch_paper_days_active: 35,
        watch_paper_profitable: true,
      });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // getAccount select
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "trading_accounts") {
          // update
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ error: null }),
            }),
          };
        }
        if (table === "mode_transitions") {
          // insert transition
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          };
        }
        return {};
      });

      const result = await manager.graduate();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.fromMode).toBe("watch");
      expect(result.data!.toMode).toBe("guided");
      expect(result.data!.direction).toBe("upgrade");
      expect(result.data!.initiatedBy).toBe("user");
    });

    it("should reject graduation when criteria not met", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 10,
        watch_paper_days_active: 5,
        watch_paper_profitable: false,
      });
      setupSelectMock(row);

      const result = await manager.graduate();

      expect(result.success).toBe(false);
      expect(result.error).toContain("criteria not met");
    });

    it("should reject graduation for inactive account", async () => {
      const row = makeWatchAccountRow({ is_active: false });
      setupSelectMock(row);

      const result = await manager.graduate();

      expect(result.success).toBe(false);
      expect(result.error).toContain("inactive");
    });
  });

  describe("graduate — GUIDED to AUTONOMOUS", () => {
    it("should transition from guided to autonomous when all criteria met", async () => {
      const row = makeGuidedAccountRow({
        guided_live_trade_count: 35,
        guided_live_days_active: 35,
        guided_live_profitable: true,
        autonomous_enabled: true,
      });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "trading_accounts") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ error: null }),
            }),
          };
        }
        if (table === "mode_transitions") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          };
        }
        return {};
      });

      const result = await manager.graduate();

      expect(result.success).toBe(true);
      expect(result.data!.fromMode).toBe("guided");
      expect(result.data!.toMode).toBe("autonomous");
      expect(result.data!.direction).toBe("upgrade");
    });

    it("should reject when user has not opted in", async () => {
      const row = makeGuidedAccountRow({
        guided_live_trade_count: 35,
        guided_live_days_active: 35,
        guided_live_profitable: true,
        autonomous_enabled: false, // no opt-in
      });
      setupSelectMock(row);

      const result = await manager.graduate();

      expect(result.success).toBe(false);
      expect(result.error).toContain("criteria not met");
      expect(result.error).toContain("userOptIn");
    });
  });

  describe("graduate — already at max", () => {
    it("should reject graduation from autonomous mode", async () => {
      const row = makeAutonomousAccountRow();
      setupSelectMock(row);

      const result = await manager.graduate();

      expect(result.success).toBe(false);
      expect(result.error).toContain("maximum mode");
    });
  });

  // --------------------------------------------------------------------------
  // Mode Transitions — Downgrade
  // --------------------------------------------------------------------------

  describe("downgrade", () => {
    it("should downgrade from guided to watch", async () => {
      const row = makeGuidedAccountRow();

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "trading_accounts") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ error: null }),
            }),
          };
        }
        if (table === "mode_transitions") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          };
        }
        return {};
      });

      const result = await manager.downgrade("Kill switch triggered");

      expect(result.success).toBe(true);
      expect(result.data!.fromMode).toBe("guided");
      expect(result.data!.toMode).toBe("watch");
      expect(result.data!.direction).toBe("downgrade");
      expect(result.data!.initiatedBy).toBe("system");
      expect(result.data!.reason).toBe("Kill switch triggered");
    });

    it("should downgrade from autonomous to guided", async () => {
      const row = makeAutonomousAccountRow();

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "trading_accounts") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ error: null }),
            }),
          };
        }
        if (table === "mode_transitions") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          };
        }
        return {};
      });

      const result = await manager.downgrade("Admin review", "admin");

      expect(result.success).toBe(true);
      expect(result.data!.fromMode).toBe("autonomous");
      expect(result.data!.toMode).toBe("guided");
      expect(result.data!.initiatedBy).toBe("admin");
    });

    it("should reject downgrade from watch mode (already at minimum)", async () => {
      const row = makeWatchAccountRow();
      setupSelectMock(row);

      const result = await manager.downgrade("Some reason");

      expect(result.success).toBe(false);
      expect(result.error).toContain("minimum mode");
    });

    it("should include metrics snapshot in transition record", async () => {
      const row = makeGuidedAccountRow({
        guided_live_trade_count: 15,
        guided_live_days_active: 10,
      });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "trading_accounts") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ error: null }),
            }),
          };
        }
        if (table === "mode_transitions") {
          return {
            insert: jest.fn().mockReturnValue({ error: null }),
          };
        }
        return {};
      });

      const result = await manager.downgrade("Emergency");

      expect(result.success).toBe(true);
      expect(result.data!.metricsSnapshot).toEqual(
        expect.objectContaining({
          guidedLiveTradeCount: 15,
          guidedLiveDaysActive: 10,
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // Paper Trade Recording
  // --------------------------------------------------------------------------

  describe("recordPaperTrade", () => {
    it("should increment paper trade count", async () => {
      const row = makeWatchAccountRow({ watch_paper_trade_count: 5 });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        // update call
        const eqMock = jest.fn().mockReturnValue({ error: null });
        const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
        return { update: updateMock };
      });

      const result = await manager.recordPaperTrade(true);

      expect(result.success).toBe(true);
    });

    it("should set profitable flag when a profitable trade is recorded", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 5,
        watch_paper_profitable: false,
      });

      let capturedUpdateData: Record<string, unknown> = {};
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const eqMock = jest.fn().mockReturnValue({ error: null });
        const updateMock = jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedUpdateData = data;
          return { eq: eqMock };
        });
        return { update: updateMock };
      });

      await manager.recordPaperTrade(true);

      expect(capturedUpdateData["watch_paper_profitable"]).toBe(true);
      expect(capturedUpdateData["watch_paper_trade_count"]).toBe(6);
    });

    it("should handle update failure gracefully", async () => {
      const row = makeWatchAccountRow();

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const eqMock = jest
          .fn()
          .mockReturnValue({ error: { message: "Update failed" } });
        return { update: jest.fn().mockReturnValue({ eq: eqMock }) };
      });

      const result = await manager.recordPaperTrade(false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to record paper trade");
    });
  });

  // --------------------------------------------------------------------------
  // Live Trade Recording
  // --------------------------------------------------------------------------

  describe("recordLiveTrade", () => {
    it("should increment live trade count", async () => {
      const row = makeGuidedAccountRow({ guided_live_trade_count: 10 });

      let capturedUpdateData: Record<string, unknown> = {};
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const eqMock = jest.fn().mockReturnValue({ error: null });
        const updateMock = jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedUpdateData = data;
          return { eq: eqMock };
        });
        return { update: updateMock };
      });

      const result = await manager.recordLiveTrade(true);

      expect(result.success).toBe(true);
      expect(capturedUpdateData["guided_live_trade_count"]).toBe(11);
      expect(capturedUpdateData["guided_live_profitable"]).toBe(true);
    });

    it("should preserve profitable flag once set", async () => {
      const row = makeGuidedAccountRow({
        guided_live_trade_count: 10,
        guided_live_profitable: true,
      });

      let capturedUpdateData: Record<string, unknown> = {};
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const eqMock = jest.fn().mockReturnValue({ error: null });
        const updateMock = jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedUpdateData = data;
          return { eq: eqMock };
        });
        return { update: updateMock };
      });

      // Record a losing trade -- profitable should remain true
      await manager.recordLiveTrade(false);

      expect(capturedUpdateData["guided_live_profitable"]).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Active Day Recording
  // --------------------------------------------------------------------------

  describe("recordActiveDay", () => {
    it("should increment watch paper days active", async () => {
      const row = makeWatchAccountRow({ watch_paper_days_active: 15 });

      let capturedUpdateData: Record<string, unknown> = {};
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const eqMock = jest.fn().mockReturnValue({ error: null });
        const updateMock = jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedUpdateData = data;
          return { eq: eqMock };
        });
        return { update: updateMock };
      });

      const result = await manager.recordActiveDay("watch");

      expect(result.success).toBe(true);
      expect(capturedUpdateData["watch_paper_days_active"]).toBe(16);
    });

    it("should increment guided live days active", async () => {
      const row = makeGuidedAccountRow({ guided_live_days_active: 20 });

      let capturedUpdateData: Record<string, unknown> = {};
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const eqMock = jest.fn().mockReturnValue({ error: null });
        const updateMock = jest.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedUpdateData = data;
          return { eq: eqMock };
        });
        return { update: updateMock };
      });

      const result = await manager.recordActiveDay("guided");

      expect(result.success).toBe(true);
      expect(capturedUpdateData["guided_live_days_active"]).toBe(21);
    });

    it("should handle update failure gracefully", async () => {
      const row = makeWatchAccountRow();

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        const eqMock = jest
          .fn()
          .mockReturnValue({ error: { message: "DB error" } });
        return { update: jest.fn().mockReturnValue({ eq: eqMock }) };
      });

      const result = await manager.recordActiveDay("watch");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to record active day");
    });
  });

  // --------------------------------------------------------------------------
  // Mode Permissions
  // --------------------------------------------------------------------------

  describe("getModePermissions", () => {
    it("should return WATCH permissions: view + paper only", async () => {
      const row = makeWatchAccountRow();
      setupSelectMock(row);

      const result = await manager.getModePermissions();

      expect(result.success).toBe(true);
      const perms = result.data!;
      expect(perms.mode).toBe("watch");
      expect(perms.canViewSignals).toBe(true);
      expect(perms.canPaperTrade).toBe(true);
      expect(perms.canPlaceLiveOrders).toBe(false);
      expect(perms.requiresConfirmation).toBe(false);
      expect(perms.canAutoExecute).toBe(false);
    });

    it("should return GUIDED permissions: live orders with confirmation", async () => {
      const row = makeGuidedAccountRow();
      setupSelectMock(row);

      const result = await manager.getModePermissions();

      expect(result.success).toBe(true);
      const perms = result.data!;
      expect(perms.mode).toBe("guided");
      expect(perms.canViewSignals).toBe(true);
      expect(perms.canPaperTrade).toBe(true);
      expect(perms.canPlaceLiveOrders).toBe(true);
      expect(perms.requiresConfirmation).toBe(true);
      expect(perms.canAutoExecute).toBe(false);
    });

    it("should return AUTONOMOUS permissions: auto-execute", async () => {
      const row = makeAutonomousAccountRow();
      setupSelectMock(row);

      const result = await manager.getModePermissions();

      expect(result.success).toBe(true);
      const perms = result.data!;
      expect(perms.mode).toBe("autonomous");
      expect(perms.canViewSignals).toBe(true);
      expect(perms.canPaperTrade).toBe(true);
      expect(perms.canPlaceLiveOrders).toBe(true);
      expect(perms.requiresConfirmation).toBe(false);
      expect(perms.canAutoExecute).toBe(true);
    });
  });

  describe("getPermissionsForMode (static)", () => {
    it("should return watch permissions without DB call", () => {
      const perms = OperatingModeManager.getPermissionsForMode("watch");
      expect(perms.canPlaceLiveOrders).toBe(false);
      expect(perms.canPaperTrade).toBe(true);
    });

    it("should return guided permissions without DB call", () => {
      const perms = OperatingModeManager.getPermissionsForMode("guided");
      expect(perms.canPlaceLiveOrders).toBe(true);
      expect(perms.requiresConfirmation).toBe(true);
    });

    it("should return autonomous permissions without DB call", () => {
      const perms = OperatingModeManager.getPermissionsForMode("autonomous");
      expect(perms.canAutoExecute).toBe(true);
      expect(perms.requiresConfirmation).toBe(false);
    });

    it("should return a copy (not a reference)", () => {
      const perms1 = OperatingModeManager.getPermissionsForMode("watch");
      const perms2 = OperatingModeManager.getPermissionsForMode("watch");
      expect(perms1).toEqual(perms2);
      expect(perms1).not.toBe(perms2);
    });
  });

  // --------------------------------------------------------------------------
  // Circuit Breaker Events
  // --------------------------------------------------------------------------

  describe("recordCircuitBreakerEvent", () => {
    it("should insert a circuit breaker event and return it", async () => {
      const eventRow = makeCircuitBreakerRow();

      mockFrom.mockImplementation(() => {
        const singleMock = jest
          .fn()
          .mockResolvedValue({ data: eventRow, error: null });
        const selectAfterInsert = jest
          .fn()
          .mockReturnValue({ single: singleMock });
        return {
          insert: jest.fn().mockReturnValue({ select: selectAfterInsert }),
        };
      });

      const result = await manager.recordCircuitBreakerEvent({
        type: "daily_loss",
        severity: "warning",
        triggerValue: 2.5,
        thresholdValue: 2.0,
        actionTaken: "halt_trading",
        details: { message: "Daily loss limit exceeded" },
        operatingMode: "guided",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.type).toBe("daily_loss");
      expect(result.data!.severity).toBe("warning");
      expect(result.data!.resolved).toBe(false);
    });

    it("should handle insert failure", async () => {
      mockFrom.mockImplementation(() => {
        const singleMock = jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        });
        const selectAfterInsert = jest
          .fn()
          .mockReturnValue({ single: singleMock });
        return {
          insert: jest.fn().mockReturnValue({ select: selectAfterInsert }),
        };
      });

      const result = await manager.recordCircuitBreakerEvent({
        type: "kill_switch",
        severity: "emergency",
        triggerValue: null,
        thresholdValue: null,
        actionTaken: "kill_all",
        details: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to record circuit breaker");
    });
  });

  describe("getCircuitBreakerHistory", () => {
    it("should return recent circuit breaker events", async () => {
      const events = [
        makeCircuitBreakerRow({ id: "cb-001" }),
        makeCircuitBreakerRow({ id: "cb-002", breaker_type: "drawdown" }),
      ];

      mockFrom.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest
                  .fn()
                  .mockResolvedValue({ data: events, error: null }),
              }),
            }),
          }),
        };
      });

      const result = await manager.getCircuitBreakerHistory(10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].id).toBe("cb-001");
      expect(result.data![1].type).toBe("drawdown");
    });

    it("should default to limit of 50", async () => {
      let capturedLimit: number | undefined;

      mockFrom.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockImplementation((lim: number) => {
                  capturedLimit = lim;
                  return Promise.resolve({ data: [], error: null });
                }),
              }),
            }),
          }),
        };
      });

      await manager.getCircuitBreakerHistory();

      expect(capturedLimit).toBe(50);
    });

    it("should handle query failure", async () => {
      mockFrom.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Query failed" },
                }),
              }),
            }),
          }),
        };
      });

      const result = await manager.getCircuitBreakerHistory();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to load circuit breaker");
    });
  });

  describe("resolveCircuitBreaker", () => {
    it("should mark a circuit breaker event as resolved", async () => {
      const resolvedRow = makeCircuitBreakerRow({
        resolved: true,
        resolved_at: "2026-02-15T12:00:00.000Z",
        resolution_notes: "Manually reviewed, safe to resume",
      });

      mockFrom.mockImplementation(() => {
        const singleMock = jest
          .fn()
          .mockResolvedValue({ data: resolvedRow, error: null });
        const selectAfterUpdate = jest
          .fn()
          .mockReturnValue({ single: singleMock });
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: selectAfterUpdate,
              }),
            }),
          }),
        };
      });

      const result = await manager.resolveCircuitBreaker(
        "cb-001",
        "Manually reviewed, safe to resume",
      );

      expect(result.success).toBe(true);
      expect(result.data!.resolved).toBe(true);
      expect(result.data!.resolutionNotes).toBe(
        "Manually reviewed, safe to resume",
      );
    });

    it("should handle resolve failure", async () => {
      mockFrom.mockImplementation(() => {
        const singleMock = jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        });
        const selectAfterUpdate = jest
          .fn()
          .mockReturnValue({ single: singleMock });
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: selectAfterUpdate,
              }),
            }),
          }),
        };
      });

      const result = await manager.resolveCircuitBreaker("cb-999", "notes");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to resolve circuit breaker");
    });
  });

  // --------------------------------------------------------------------------
  // getModeStatus
  // --------------------------------------------------------------------------

  describe("getModeStatus", () => {
    it("should return full mode status for watch mode", async () => {
      const row = makeWatchAccountRow();
      setupSelectMock(row);

      const result = await manager.getModeStatus();

      expect(result.success).toBe(true);
      expect(result.data!.currentMode).toBe("watch");
      expect(result.data!.isActive).toBe(true);
      expect(result.data!.nextModeAvailable).toBe(false);
      expect(result.data!.graduationProgress.nextMode).toBe("guided");
    });

    it("should show nextModeAvailable when criteria met", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 40,
        watch_paper_days_active: 40,
        watch_paper_profitable: true,
      });
      setupSelectMock(row);

      const result = await manager.getModeStatus();

      expect(result.success).toBe(true);
      expect(result.data!.nextModeAvailable).toBe(true);
    });

    it("should use guided_start_date as modeStartDate for guided mode", async () => {
      const row = makeGuidedAccountRow({
        guided_start_date: "2026-02-01T00:00:00.000Z",
      });
      setupSelectMock(row);

      const result = await manager.getModeStatus();

      expect(result.success).toBe(true);
      expect(result.data!.modeStartDate).toBe("2026-02-01T00:00:00.000Z");
    });
  });

  // --------------------------------------------------------------------------
  // Helper Functions (from mode-types.ts)
  // --------------------------------------------------------------------------

  describe("getNextMode", () => {
    it("should return guided for watch", () => {
      expect(getNextMode("watch")).toBe("guided");
    });

    it("should return autonomous for guided", () => {
      expect(getNextMode("guided")).toBe("autonomous");
    });

    it("should return null for autonomous", () => {
      expect(getNextMode("autonomous")).toBeNull();
    });
  });

  describe("getPreviousMode", () => {
    it("should return null for watch", () => {
      expect(getPreviousMode("watch")).toBeNull();
    });

    it("should return watch for guided", () => {
      expect(getPreviousMode("guided")).toBe("watch");
    });

    it("should return guided for autonomous", () => {
      expect(getPreviousMode("autonomous")).toBe("guided");
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe("edge cases", () => {
    it("should handle exception thrown by supabaseAdmin", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Module not initialized");
      });

      const result = await manager.getAccount();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Module not initialized");
    });

    it("should handle graduation with DB update failure", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 50,
        watch_paper_days_active: 50,
        watch_paper_profitable: true,
      });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "trading_accounts") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest
                .fn()
                .mockReturnValue({ error: { message: "Update blocked" } }),
            }),
          };
        }
        return {};
      });

      const result = await manager.graduate();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update account mode");
    });

    it("should handle transition insert failure after successful account update", async () => {
      const row = makeWatchAccountRow({
        watch_paper_trade_count: 50,
        watch_paper_days_active: 50,
        watch_paper_profitable: true,
      });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          const singleMock = jest
            .fn()
            .mockResolvedValue({ data: row, error: null });
          const eqMock = jest.fn().mockReturnValue({ single: singleMock });
          return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
        }
        if (table === "trading_accounts") {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ error: null }),
            }),
          };
        }
        if (table === "mode_transitions") {
          return {
            insert: jest.fn().mockReturnValue({
              error: { message: "FK violation" },
            }),
          };
        }
        return {};
      });

      const result = await manager.graduate();

      expect(result.success).toBe(false);
      expect(result.error).toContain("failed to record transition");
    });

    it("should handle exception in recordPaperTrade", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected crash");
      });

      const result = await manager.recordPaperTrade(true);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unexpected crash");
    });

    it("should handle exception in recordLiveTrade", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected crash");
      });

      const result = await manager.recordLiveTrade(false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unexpected crash");
    });

    it("should handle exception in recordActiveDay", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Timeout");
      });

      const result = await manager.recordActiveDay("watch");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Timeout");
    });

    it("should handle exception in recordCircuitBreakerEvent", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Network error");
      });

      const result = await manager.recordCircuitBreakerEvent({
        type: "daily_loss",
        severity: "warning",
        triggerValue: 1.5,
        thresholdValue: 2.0,
        actionTaken: "alert",
        details: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle exception in getCircuitBreakerHistory", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Auth expired");
      });

      const result = await manager.getCircuitBreakerHistory();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Auth expired");
    });

    it("should handle exception in resolveCircuitBreaker", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Service unavailable");
      });

      const result = await manager.resolveCircuitBreaker("cb-001", "notes");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Service unavailable");
    });
  });

  // --------------------------------------------------------------------------
  // Graduation Criteria Constants
  // --------------------------------------------------------------------------

  describe("graduation criteria constants", () => {
    it("should have correct WATCH_TO_GUIDED_CRITERIA", () => {
      expect(WATCH_TO_GUIDED_CRITERIA.minPaperTrades).toBe(30);
      expect(WATCH_TO_GUIDED_CRITERIA.minDaysActive).toBe(30);
      expect(WATCH_TO_GUIDED_CRITERIA.requireProfitable).toBe(true);
    });

    it("should have correct GUIDED_TO_AUTONOMOUS_CRITERIA", () => {
      expect(GUIDED_TO_AUTONOMOUS_CRITERIA.minLiveTrades).toBe(30);
      expect(GUIDED_TO_AUTONOMOUS_CRITERIA.minDaysActive).toBe(30);
      expect(GUIDED_TO_AUTONOMOUS_CRITERIA.requireProfitable).toBe(true);
      expect(GUIDED_TO_AUTONOMOUS_CRITERIA.requireUserOptIn).toBe(true);
    });
  });
});
