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

function setupFinancialGoals(
  goals: Array<{ current_amount: number; target_amount: number; type: string }>,
) {
  // financial_goals → select → eq(user_id) → eq(type)
  const eq2Fn = jest.fn().mockResolvedValue({ data: goals, error: null });
  const eq1Fn = jest.fn().mockReturnValue({ eq: eq2Fn });
  const selectFn = jest.fn().mockReturnValue({ eq: eq1Fn });

  return { selectFn, eq1Fn, eq2Fn };
}

type FetchError = { message: string; code?: string };

/**
 * Simulates Postgrest resolving with an error (e.g. "relation does not exist"
 * or a transient failure) instead of throwing. This mirrors real
 * @supabase/supabase-js behavior — API-level errors are returned as
 * `{ data: null, error }`; `throwOnError()` is opt-in and unused by this
 * module, so the promise always resolves (see PostgrestBuilder.ts:72-73).
 */
function setupQueryError(chain: "single" | "eq-gt" | "eq-eq", error: FetchError) {
  if (chain === "single") {
    // profiles → select → eq(id) → single
    const singleFn = jest.fn().mockResolvedValue({ data: null, error });
    const eqFn = jest.fn().mockReturnValue({ single: singleFn });
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn });
    return { selectFn, eqFn, singleFn };
  }
  if (chain === "eq-gt") {
    // debt_accounts → select → eq(user_id) → eq(is_active) → gt(balance)
    // transactions  → select → eq(user_id) → gte(date)      → gt(amount)
    const gtFn = jest.fn().mockResolvedValue({ data: null, error });
    const eq2Fn = jest.fn().mockReturnValue({ gt: gtFn });
    const eq1Fn = jest.fn().mockReturnValue({ eq: eq2Fn, gte: eq2Fn });
    const selectFn = jest.fn().mockReturnValue({ eq: eq1Fn });
    return { selectFn, eq1Fn, eq2Fn, gtFn };
  }
  // financial_goals → select → eq(user_id) → eq(type)
  const eq2Fn = jest.fn().mockResolvedValue({ data: null, error });
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
 * profiles, transactions, debt_accounts, financial_goals.
 *
 * Also wires the legacy table names ("debts", "savings_goals") to a
 * "relation does not exist" error, matching the live schema (verified
 * 2026-07-31 — neither table has ever existed). This lets a single test be
 * run unmodified against pre-fix code (which queries the legacy names) and
 * post-fix code (which queries the real names) and fail/pass for the right
 * reason in each case, without per-test bespoke mock wiring.
 *
 * Pass `debtAccountsError` / `financialGoalsError` / `transactionsError` /
 * `profileError` to simulate a *correctly-named* table query failing (e.g. a
 * transient timeout) instead of supplying happy-path data.
 */
function wireAllTables(opts: {
  profileIncome: number | null;
  profileError?: FetchError;
  debts?: Array<{ minimum_payment: number; is_active: boolean; balance: number }>;
  debtAccountsError?: FetchError;
  goals?: Array<{ current_amount: number; target_amount: number; type: string }>;
  financialGoalsError?: FetchError;
  transactions?: Array<{ amount: number; date: string }>;
  transactionsError?: FetchError;
}) {
  const profileMock = opts.profileError
    ? setupQueryError("single", opts.profileError)
    : setupProfileIncome(opts.profileIncome);
  const txMock = opts.transactionsError
    ? setupQueryError("eq-gt", opts.transactionsError)
    : setupTransactions(opts.transactions || []);
  const debtMock = opts.debtAccountsError
    ? setupQueryError("eq-gt", opts.debtAccountsError)
    : setupDebts(opts.debts || []);
  const goalMock = opts.financialGoalsError
    ? setupQueryError("eq-eq", opts.financialGoalsError)
    : setupFinancialGoals(opts.goals || []);
  const legacyDebtsMock = setupQueryError("eq-gt", {
    message: 'relation "public.debts" does not exist',
    code: "42P01",
  });
  const legacyGoalsMock = setupQueryError("eq-eq", {
    message: 'relation "public.savings_goals" does not exist',
    code: "42P01",
  });

  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case "profiles":
        return { select: profileMock.selectFn };
      case "transactions":
        return { select: txMock.selectFn };
      case "debt_accounts":
        return { select: debtMock.selectFn };
      case "debts":
        return { select: legacyDebtsMock.selectFn };
      case "financial_goals":
        return { select: goalMock.selectFn };
      case "savings_goals":
        return { select: legacyGoalsMock.selectFn };
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
          { current_amount: 15000, target_amount: 24000, type: "emergency_fund" },
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
          { current_amount: 10000, target_amount: 18000, type: "emergency_fund" },
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
          { current_amount: 15000, target_amount: 15000, type: "emergency_fund" },
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
          { current_amount: 20000, target_amount: 30000, type: "emergency_fund" },
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
          { current_amount: 20000, target_amount: 30000, type: "emergency_fund" },
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
          { current_amount: 10000, target_amount: 10000, type: "emergency_fund" },
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
          { current_amount: 10000, target_amount: 12000, type: "emergency_fund" },
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
          { current_amount: 2000, target_amount: 24000, type: "emergency_fund" },
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
          { current_amount: 12000, target_amount: 24000, type: "emergency_fund" },
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
          { current_amount: 20000, target_amount: 30000, type: "emergency_fund" },
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
          { current_amount: 20000, target_amount: 30000, type: "emergency_fund" },
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
          { current_amount: 15000, target_amount: 24000, type: "emergency_fund" },
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
          { current_amount: 15000, target_amount: 15000, type: "emergency_fund" },
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
          { current_amount: 15000, target_amount: 24000, type: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.monthlyDebtPayments).toBe(500);
      expect(result.dtiRatio).toBeCloseTo(6.25, 1);
    });
  });

  // ========================================================================
  // TABLE-NAME REGRESSION — debt_accounts / financial_goals
  // ========================================================================
  // `debts` and `savings_goals` have never existed in the live schema
  // (confirmed via `\d+ debt_accounts` / `\d+ financial_goals` against the
  // local Supabase instance, 2026-07-31). Because the checked-in Database
  // type omits `Relationships`, `.from()` accepts any string, so the wrong
  // table name compiled cleanly and only failed at runtime — where the
  // swallowed Postgrest error let the DTI gate silently pass every user.
  describe("table-name regression", () => {
    it("computes DTI from debt_accounts (not the nonexistent debts table) and fires max_dti when debt is high", async () => {
      wireAllTables({
        profileIncome: 10000,
        debts: [{ minimum_payment: 4500, is_active: true, balance: 60000 }],
        goals: [
          { current_amount: 20000, target_amount: 30000, type: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      // Against pre-fix code (queries "debts"): the legacy-table error is
      // swallowed, monthlyDebtPayments computes to 0, DTI is 0%, and
      // max_dti never fires — this assertion block fails.
      expect(result.monthlyDebtPayments).toBe(4500);
      expect(result.dtiRatio).toBeCloseTo(45, 0);
      expect(result.approved).toBe(false);
      expect(result.violations.some((v) => v.rule === "max_dti")).toBe(true);
    });

    it("reads the emergency fund flag from financial_goals.type (not the nonexistent savings_goals.category)", async () => {
      wireAllTables({
        profileIncome: 8000,
        debts: [],
        goals: [
          { current_amount: 20000, target_amount: 24000, type: "emergency_fund" },
        ],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      // Against pre-fix code (queries "savings_goals"): the legacy-table
      // error is swallowed, hasEmergencyFund is always false, and the
      // no_emergency_fund warning always fires — this assertion block fails.
      expect(result.hasEmergencyFund).toBe(true);
      expect(result.warnings.some((w) => w.rule === "no_emergency_fund")).toBe(false);
    });
  });

  // ========================================================================
  // FAIL-CLOSED ON DB ERROR
  // ========================================================================
  // A failed lookup must never be silently read as a passed safety check.
  // These simulate a *correctly-named* table query failing (e.g. a transient
  // timeout) — distinct from the table-name regressions above — and prove
  // the gate blocks rather than defaulting to "no debt / safe".
  describe("fails closed on DB error", () => {
    it("blocks with system_error when debt_accounts query errors, instead of reading as zero debt", async () => {
      wireAllTables({
        profileIncome: 10000,
        debtAccountsError: {
          message: "connection terminated unexpectedly",
          code: "08006",
        },
        goals: [],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      // Pre-fix code has no error handling anywhere in the file: it queries
      // "debts" (also swallowed), computes 0 debt payments, and approves —
      // silently reading a DB failure as "no debt, safe to trade".
      expect(result.approved).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe("system_error");
    });

    it("blocks with system_error when financial_goals query errors, instead of reading as no emergency fund", async () => {
      wireAllTables({
        profileIncome: 8000,
        debts: [],
        financialGoalsError: {
          message: "connection terminated unexpectedly",
          code: "08006",
        },
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      expect(result.approved).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe("system_error");
    });

    it("blocks with system_error (not the misleading no_income_data) when the transaction-estimate lookup errors", async () => {
      wireAllTables({
        profileIncome: null,
        transactionsError: {
          message: "connection terminated unexpectedly",
          code: "08006",
        },
        debts: [],
        goals: [],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      // Pre-fix code swallows the transactions error, returns 0 income, and
      // reports "no_income_data" — accurate-sounding but misattributed; the
      // real cause is a DB failure, not an absence of income data.
      expect(result.approved).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe("system_error");
    });

    it("logs (does not throw) when profiles.monthly_income errors, and falls back to the transaction estimate", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      wireAllTables({
        profileIncome: null,
        profileError: {
          message: 'column "monthly_income" does not exist',
          code: "42703",
        },
        transactions: [
          { amount: 4000, date: new Date().toISOString() },
          { amount: 4000, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          { amount: 4000, date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
        ],
        debts: [],
        goals: [],
      });

      const gate = new WellnessGate("user_1");
      const result = await gate.check();

      // profiles.monthly_income has never existed (see FND report) — this is
      // a permanent gap with a working fallback, not a transient failure, so
      // it is logged and degrades gracefully rather than blocking.
      expect(result.monthlyIncome).toBeGreaterThan(0);
      expect(result.violations.some((v) => v.rule === "system_error")).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("profiles.monthly_income lookup failed"),
        expect.anything(),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
