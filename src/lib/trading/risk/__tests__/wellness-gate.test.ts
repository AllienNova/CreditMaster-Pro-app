/**
 * Financial Wellness Gate Tests
 *
 * Verifies DTI blocking, income estimation fallback, emergency fund check,
 * negative net income blocking, warning thresholds, and factory function.
 */

// ============================================================================
// MOCK: supabaseAdmin
// ============================================================================

const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockGt = jest.fn().mockReturnValue({ data: [], error: null });
const mockEq3 = jest.fn().mockReturnValue(mockGt);
const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle, eq: mockEq3, gt: mockGt });
const mockGte = jest.fn().mockReturnValue({ gt: mockGt });
const mockEq1 = jest.fn().mockReturnValue({ single: mockSingle, eq: mockEq2, gte: mockGte });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  WellnessGate,
  createWellnessGate,
  DEFAULT_WELLNESS_CONFIG,
  type WellnessCheckResult,
} from "../wellness-gate";

// ============================================================================
// HELPERS
// ============================================================================

function setupProfileIncome(monthlyIncome: number | null) {
  // profiles → select → eq(id) → single
  const singleFn = jest.fn().mockResolvedValue({
    data: monthlyIncome !== null ? { monthly_income: monthlyIncome } : null,
    error: null,
  });
  const eqFn = jest.fn().mockReturnValue({ single: singleFn });
  const selectFn = jest.fn().mockReturnValue({ eq: eqFn });

  return { selectFn, eqFn, singleFn };
}

function setupDebts(debts: Array<{ minimum_payment: number; is_active: boolean; balance: number }>) {
  // debts → select → eq(user_id) → eq(is_active) → gt(balance)
  const gtFn = jest.fn().mockResolvedValue({ data: debts, error: null });
  const eq2Fn = jest.fn().mockReturnValue({ gt: gtFn });
  const eq1Fn = jest.fn().mockReturnValue({ eq: eq2Fn });
  const selectFn = jest.fn().mockReturnValue({ eq: eq1Fn });

  return { selectFn, eq1Fn, eq2Fn, gtFn };
}

function setupSavingsGoals(
  goals: Array<{ current_amount: number; target_amount: number; category: string }>,
) {
  // savings_goals → select → eq(user_id) → eq(category)
  const eq2Fn = jest.fn().mockResolvedValue({ data: goals, error: null });
  const eq1Fn = jest.fn().mockReturnValue({ eq: eq2Fn });
  const selectFn = jest.fn().mockReturnValue({ eq: eq1Fn });

  return { selectFn, eq1Fn, eq2Fn };
}

function setupTransactions(
  transactions: Array<{ amount: number; date: string }>,
) {
  // transactions → select → eq(user_id) → gte(date) → gt(amount)
  const gtFn = jest.fn().mockResolvedValue({ data: transactions, error: null });
  const gteFn = jest.fn().mockReturnValue({ gt: gtFn });
  const eqFn = jest.fn().mockReturnValue({ gte: gteFn });
  const selectFn = jest.fn().mockReturnValue({ eq: eqFn });

  return { selectFn, eqFn, gteFn, gtFn };
}

/**
 * Wire all table mocks together via mockFrom. Call order matters:
 * profiles, transactions, debts, savings_goals
 */
function wireAllTables(opts: {
  profileIncome: number | null;
  debts?: Array<{ minimum_payment: number; is_active: boolean; balance: number }>;
  goals?: Array<{ current_amount: number; target_amount: number; category: string }>;
  transactions?: Array<{ amount: number; date: string }>;
}) {
  const profileMock = setupProfileIncome(opts.profileIncome);
  const debtMock = setupDebts(opts.debts || []);
  const goalMock = setupSavingsGoals(opts.goals || []);
  const txMock = setupTransactions(opts.transactions || []);

  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case "profiles":
        return { select: profileMock.selectFn };
      case "transactions":
        return { select: txMock.selectFn };
      case "debts":
        return { select: debtMock.selectFn };
      case "savings_goals":
        return { select: goalMock.selectFn };
      default:
        return { select: jest.fn().mockReturnValue({ eq: jest.fn() }) };
    }
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("WellnessGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // HEALTHY USER — APPROVED
  // ========================================================================
  describe("healthy user", () => {
    it("approves when DTI is below threshold", async () => {
      wireAllTables({
        profileIncome: 8000,
        debts: [
          { minimum_payment: 500, is_active: true, balance: 10000 },
          { minimum_payment: 300, is_active: true, balance: 5000 },
        ],
        goals: [
          { current_amount: 15000, target_amount: 24000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.monthlyIncome).toBe(8000);
      expect(result.monthlyDebtPayments).toBe(800);
      expect(result.dtiRatio).toBeCloseTo(10, 0);
      expect(result.hasEmergencyFund).toBe(true);
      expect(result.netMonthlyIncome).toBe(7200);
      expect(result.checkedAt).toBeLessThanOrEqual(Date.now());
    });

    it("approves with zero debt", async () => {
      wireAllTables({
        profileIncome: 6000,
        debts: [],
        goals: [
          { current_amount: 10000, target_amount: 18000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(true);
      expect(result.dtiRatio).toBe(0);
      expect(result.monthlyDebtPayments).toBe(0);
    });
  });

  // ========================================================================
  // DTI VIOLATION — BLOCKED
  // ========================================================================
  describe("DTI violation", () => {
    it("blocks when DTI exceeds 40%", async () => {
      wireAllTables({
        profileIncome: 5000,
        debts: [
          { minimum_payment: 1200, is_active: true, balance: 30000 },
          { minimum_payment: 900, is_active: true, balance: 20000 },
        ],
        goals: [
          { current_amount: 15000, target_amount: 15000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(false);
      expect(result.dtiRatio).toBeCloseTo(42, 0);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe("max_dti");
      expect(result.violations[0].currentValue).toBeGreaterThan(40);
    });

    it("blocks at exact boundary (DTI = 40.1%)", async () => {
      wireAllTables({
        profileIncome: 10000,
        debts: [
          { minimum_payment: 4010, is_active: true, balance: 50000 },
        ],
        goals: [
          { current_amount: 20000, target_amount: 30000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_dti")).toBe(true);
    });

    it("allows at exact boundary (DTI = 40.0%)", async () => {
      wireAllTables({
        profileIncome: 10000,
        debts: [
          { minimum_payment: 4000, is_active: true, balance: 50000 },
        ],
        goals: [
          { current_amount: 20000, target_amount: 30000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.violations.some((v) => v.rule === "max_dti")).toBe(false);
    });

    it("uses custom maxDTI threshold", async () => {
      wireAllTables({
        profileIncome: 10000,
        debts: [
          { minimum_payment: 2600, is_active: true, balance: 30000 },
        ],
        goals: [],
      });

      const gate = new WellnessGate("user_1", { maxDTI: 25 });
      const result = await gate.check();

      expect(result.approved).toBe(false);
      expect(result.violations[0].rule).toBe("max_dti");
      expect(result.violations[0].limit).toBe(25);
    });
  });

  // ========================================================================
  // NEGATIVE NET INCOME — BLOCKED
  // ========================================================================
  describe("negative net income", () => {
    it("blocks when debt payments exceed income", async () => {
      wireAllTables({
        profileIncome: 3000,
        debts: [
          { minimum_payment: 2000, is_active: true, balance: 50000 },
          { minimum_payment: 1500, is_active: true, balance: 30000 },
        ],
        goals: [
          { current_amount: 10000, target_amount: 10000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(false);
      expect(result.netMonthlyIncome).toBeLessThan(0);
      expect(result.violations.some((v) => v.rule === "negative_net_income")).toBe(true);
    });
  });

  // ========================================================================
  // NO INCOME DATA — BLOCKED
  // ========================================================================
  describe("no income data", () => {
    it("blocks when no profile income and no transactions", async () => {
      wireAllTables({
        profileIncome: null,
        transactions: [],
        debts: [],
        goals: [],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(false);
      expect(result.monthlyIncome).toBe(0);
      expect(result.dtiRatio).toBeNull();
      expect(result.violations.some((v) => v.rule === "no_income_data")).toBe(true);
    });

    it("falls back to transaction-based income estimate", async () => {
      wireAllTables({
        profileIncome: null,
        transactions: [
          { amount: 4000, date: new Date().toISOString() },
          { amount: 4000, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          { amount: 4000, date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
        ],
        debts: [{ minimum_payment: 500, is_active: true, balance: 5000 }],
        goals: [
          { current_amount: 10000, target_amount: 12000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      // 12000 total income / ~3 months ≈ 4000/month, DTI = 500/4000 = 12.5%
      expect(result.monthlyIncome).toBeGreaterThan(0);
      expect(result.approved).toBe(true);
    });
  });

  // ========================================================================
  // EMERGENCY FUND WARNINGS
  // ========================================================================
  describe("emergency fund", () => {
    it("warns when no emergency fund exists", async () => {
      wireAllTables({
        profileIncome: 8000,
        debts: [{ minimum_payment: 500, is_active: true, balance: 5000 }],
        goals: [],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      // Should approve (DTI ok) but warn about emergency fund
      expect(result.approved).toBe(true);
      expect(result.hasEmergencyFund).toBe(false);
      expect(result.warnings.some((w) => w.rule === "no_emergency_fund")).toBe(true);
    });

    it("warns when emergency fund is under 50% funded", async () => {
      wireAllTables({
        profileIncome: 8000,
        debts: [],
        goals: [
          { current_amount: 2000, target_amount: 24000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.hasEmergencyFund).toBe(false);
      expect(result.warnings.some((w) => w.rule === "no_emergency_fund")).toBe(true);
    });

    it("considers emergency fund adequate when >= 50% funded", async () => {
      wireAllTables({
        profileIncome: 8000,
        debts: [],
        goals: [
          { current_amount: 12000, target_amount: 24000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.hasEmergencyFund).toBe(true);
      expect(result.warnings.some((w) => w.rule === "no_emergency_fund")).toBe(false);
    });
  });

  // ========================================================================
  // DTI APPROACHING LIMIT WARNING
  // ========================================================================
  describe("DTI approaching limit", () => {
    it("warns when DTI is between 80% and 100% of max", async () => {
      // DTI = 35% → 80% of 40 = 32, so 35 > 32 → warning
      wireAllTables({
        profileIncome: 10000,
        debts: [{ minimum_payment: 3500, is_active: true, balance: 40000 }],
        goals: [
          { current_amount: 20000, target_amount: 30000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(true);
      expect(result.warnings.some((w) => w.rule === "dti_approaching_limit")).toBe(true);
    });

    it("does not warn when DTI is well below threshold", async () => {
      wireAllTables({
        profileIncome: 10000,
        debts: [{ minimum_payment: 1000, is_active: true, balance: 10000 }],
        goals: [
          { current_amount: 20000, target_amount: 30000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.warnings.some((w) => w.rule === "dti_approaching_limit")).toBe(false);
    });
  });

  // ========================================================================
  // isApproved SHORTCUT
  // ========================================================================
  describe("isApproved", () => {
    it("returns true when healthy", async () => {
      wireAllTables({
        profileIncome: 8000,
        debts: [{ minimum_payment: 500, is_active: true, balance: 5000 }],
        goals: [
          { current_amount: 15000, target_amount: 24000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      expect(await gate.isApproved()).toBe(true);
    });

    it("returns false when DTI too high", async () => {
      wireAllTables({
        profileIncome: 5000,
        debts: [{ minimum_payment: 2500, is_active: true, balance: 50000 }],
        goals: [
          { current_amount: 15000, target_amount: 15000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      expect(await gate.isApproved()).toBe(false);
    });
  });

  // ========================================================================
  // FACTORY
  // ========================================================================
  describe("createWellnessGate", () => {
    it("creates a WellnessGate instance", () => {
      const gate = createWellnessGate("user_1");
      expect(gate).toBeInstanceOf(WellnessGate);
    });

    it("accepts custom config", () => {
      const gate = createWellnessGate("user_1", { maxDTI: 30 });
      expect(gate).toBeInstanceOf(WellnessGate);
    });
  });

  // ========================================================================
  // DEFAULT CONFIG
  // ========================================================================
  describe("DEFAULT_WELLNESS_CONFIG", () => {
    it("has expected defaults", () => {
      expect(DEFAULT_WELLNESS_CONFIG.maxDTI).toBe(40);
      expect(DEFAULT_WELLNESS_CONFIG.minMonthlyIncome).toBe(0);
      expect(DEFAULT_WELLNESS_CONFIG.emergencyFundMonths).toBe(3);
      expect(DEFAULT_WELLNESS_CONFIG.incomeEstimateFallback).toBe(5000);
    });
  });

  // ========================================================================
  // MULTIPLE VIOLATIONS
  // ========================================================================
  describe("multiple violations", () => {
    it("reports all violations at once", async () => {
      // High DTI + negative net income + no income data won't combine (DTI needs income),
      // but high DTI + negative net income can
      wireAllTables({
        profileIncome: 3000,
        debts: [
          { minimum_payment: 2000, is_active: true, balance: 50000 },
          { minimum_payment: 1500, is_active: true, balance: 30000 },
        ],
        goals: [],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(false);
      // DTI = 3500/3000 * 100 ≈ 116.7% (violation)
      // Net income = 3000 - 3500 = -500 (violation)
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
      expect(result.violations.some((v) => v.rule === "max_dti")).toBe(true);
      expect(result.violations.some((v) => v.rule === "negative_net_income")).toBe(true);
    });
  });

  // ========================================================================
  // INACTIVE DEBTS EXCLUDED
  // ========================================================================
  describe("debt filtering", () => {
    it("only counts active debts with positive balance", async () => {
      wireAllTables({
        profileIncome: 8000,
        // The DB query filters is_active=true and balance>0 already,
        // so only active debts are returned
        debts: [
          { minimum_payment: 500, is_active: true, balance: 10000 },
        ],
        goals: [
          { current_amount: 15000, target_amount: 24000, category: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.monthlyDebtPayments).toBe(500);
      expect(result.dtiRatio).toBeCloseTo(6.25, 1);
    });
  });
});
