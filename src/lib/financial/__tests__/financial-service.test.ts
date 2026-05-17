/**
 * financial-service.ts unit tests
 *
 * Covers the month-rollover bug (FND-039) in getMonthlyTrend, which is
 * exercised indirectly through getFinancialDashboard.
 */

// ============================================================================
// MOCKS — declared before imports so jest hoisting works
// ============================================================================

jest.mock("@/lib/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  const chainFn = jest.fn().mockReturnValue(chain);
  const terminalFn = jest.fn().mockResolvedValue({ data: [], error: null });
  [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "or",
    "not",
    "order",
    "limit",
    "range",
  ].forEach((m) => {
    chain[m] = chainFn;
  });
  chain.single = terminalFn;
  chain.maybeSingle = terminalFn;
  chain.then = (res: (v: unknown) => unknown, rej?: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(res, rej);
  const client = { from: jest.fn().mockReturnValue(chain) };
  return { getSupabase: () => client };
});

jest.mock("../plaid-service", () => ({
  plaidService: {
    getAccounts: jest.fn(),
    getTransactions: jest.fn(),
    getTransactionsForAccounts: jest.fn(),
  },
}));

// ============================================================================
// Imports
// ============================================================================

import { financialService } from "../financial-service";
import { plaidService } from "../plaid-service";

// ============================================================================
// Helpers
// ============================================================================

const mockGetAccounts = plaidService.getAccounts as jest.MockedFunction<
  typeof plaidService.getAccounts
>;
const mockGetTransactions = plaidService.getTransactions as jest.MockedFunction<
  typeof plaidService.getTransactions
>;
const mockGetTransactionsForAccounts =
  plaidService.getTransactionsForAccounts as jest.MockedFunction<
    typeof plaidService.getTransactionsForAccounts
  >;

function makeAccount(id: string) {
  return {
    id,
    itemId: "item-1",
    userId: "user-1",
    accountId: id,
    institutionId: "ins-1",
    institutionName: "Test Bank",
    accountName: "Checking",
    accountType: "depository" as const,
    accountSubtype: "checking",
    mask: "0000",
    currentBalance: 1000,
    currency: "USD",
    lastSynced: new Date(),
    createdAt: new Date(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("FinancialService — getMonthlyTrend (FND-039 month-rollover)", () => {
  const userId = "user-1";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccounts.mockResolvedValue([makeAccount("acct-1")]);
    // getTransactionsForAccounts is the batched method used after the FIN-4 fix
    mockGetTransactionsForAccounts.mockResolvedValue([]);
    // getTransactions is the old serial method — kept for completeness
    mockGetTransactions.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Returns the month labels from the dashboard's monthlyTrend, in order.
   */
  async function getMonthLabels(): Promise<string[]> {
    const dashboard = await financialService.getFinancialDashboard(userId);
    return dashboard.monthlyTrend.map((t) => t.month);
  }

  /**
   * Derives the expected month labels for the 6 months ending at `now`
   * using the correct algorithm (year + month integer construction).
   */
  function expectedMonths(now: Date): string[] {
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(
        d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      );
    }
    return labels;
  }

  it("returns 6 consecutive distinct months when the clock is Jan 31", async () => {
    const jan31 = new Date(2026, 0, 31); // January 31 2026
    jest.useFakeTimers();
    jest.setSystemTime(jan31);

    const labels = await getMonthLabels();
    const expected = expectedMonths(jan31);

    // 6 entries
    expect(labels).toHaveLength(6);

    // Each month label matches the correct expected value
    expect(labels).toEqual(expected);

    // All distinct (no month doubled)
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(6);
  });

  it("returns 6 consecutive distinct months when the clock is Mar 31", async () => {
    const mar31 = new Date(2026, 2, 31); // March 31 2026
    jest.useFakeTimers();
    jest.setSystemTime(mar31);

    const labels = await getMonthLabels();
    const expected = expectedMonths(mar31);

    // Expected: Oct 2025, Nov 2025, Dec 2025, Jan 2026, Feb 2026, Mar 2026
    expect(labels).toHaveLength(6);
    expect(labels).toEqual(expected);

    // Feb 2026 must appear (the month the bug drops)
    const feb = new Date(2026, 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    expect(labels).toContain(feb);

    // All distinct
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(6);
  });

  it("startDate of each month is the 1st and endDate is the last day of that same month (Mar 31 clock)", async () => {
    // This test verifies the date boundary invariant by inspecting the
    // startDate/endDate arguments passed to getTransactionsForAccounts for
    // each month. After the FIN-4 batch fix, the code calls the batched method
    // (signature: accountIds, startDate, endDate, userId); we select only the
    // calls whose endDate is the last day of a month to isolate monthly-trend
    // calls from the dashboard's 30-day window call.
    const mar31 = new Date(2026, 2, 31);
    jest.useFakeTimers();
    jest.setSystemTime(mar31);

    await financialService.getFinancialDashboard(userId);

    // Isolate calls where endDate is the last day of a calendar month.
    const monthCalls = mockGetTransactionsForAccounts.mock.calls.filter(
      ([, , endDate]) => {
        if (!(endDate instanceof Date)) return false;
        const dayAfter = new Date(endDate);
        dayAfter.setDate((endDate as Date).getDate() + 1);
        return dayAfter.getDate() === 1;
      },
    );

    // Deduplicate by startDate ISO string (the 30-day window may coincide with
    // a monthly boundary on certain clock dates; we want 6 distinct months).
    const uniqueByStart = new Map<string, (typeof monthCalls)[0]>();
    for (const call of monthCalls) {
      const key = (call[1] as Date).toISOString();
      if (!uniqueByStart.has(key)) uniqueByStart.set(key, call);
    }
    const dedupedCalls = Array.from(uniqueByStart.values());

    expect(dedupedCalls).toHaveLength(6);

    for (const [, startDate, endDate] of dedupedCalls) {
      // startDate must be the 1st
      expect((startDate as Date).getDate()).toBe(1);

      // endDate must be in the SAME month/year as startDate
      const sd = startDate as Date;
      const ed = endDate as Date;
      expect(ed.getMonth()).toBe(sd.getMonth());
      expect(ed.getFullYear()).toBe(sd.getFullYear());

      // endDate is the last day: the following day is the 1st of the next month
      const dayAfter = new Date(ed);
      dayAfter.setDate(ed.getDate() + 1);
      expect(dayAfter.getDate()).toBe(1);
    }
  });
});

// ============================================================================
// FIN-4: N+1 query storm elimination (FND-040)
// ============================================================================

describe("FinancialService — N+1 batch fix (FND-040)", () => {
  const userId = "user-1";

  // 3 accounts — enough to prove batching is not per-account serial
  const accounts = [
    makeAccount("acct-a"),
    makeAccount("acct-b"),
    makeAccount("acct-c"),
  ];

  // Transactions spread across accounts so we can verify totals are preserved
  const txnA = {
    id: "t1",
    accountId: "acct-a",
    userId,
    transactionId: "txn-1",
    date: new Date("2026-03-15"),
    amount: 50,
    name: "Coffee",
    category: ["Food"],
    pending: false,
    paymentChannel: "online",
    createdAt: new Date(),
  };
  const txnB = {
    id: "t2",
    accountId: "acct-b",
    userId,
    transactionId: "txn-2",
    date: new Date("2026-03-10"),
    amount: 100,
    name: "Grocery",
    category: ["Food"],
    pending: false,
    paymentChannel: "in_store",
    createdAt: new Date(),
  };
  const txnC = {
    id: "t3",
    accountId: "acct-c",
    userId,
    transactionId: "txn-3",
    date: new Date("2026-03-01"),
    amount: -200,
    name: "Payroll",
    category: ["Income"],
    pending: false,
    paymentChannel: "online",
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockGetAccounts.mockResolvedValue(accounts);
    // getTransactionsForAccounts returns all three transactions in one call
    mockGetTransactionsForAccounts.mockResolvedValue([txnA, txnB, txnC]);
    // getTransactions is the OLD per-account method — should not be called after fix
    mockGetTransactions.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("getFinancialDashboard: fetches transactions in ONE batched call, not N serial calls (N=3 accounts)", async () => {
    await financialService.getFinancialDashboard(userId);

    // After the fix, getTransactionsForAccounts is called for the 30-day window
    // and once per month for the 6-month trend — getTransactions (serial) must
    // NOT be called at all for the dashboard's account loops.
    expect(mockGetTransactions).not.toHaveBeenCalled();

    // The batched method is called — at most once for the dashboard window
    // + once per month for the trend (7 total max).  It must be called far
    // fewer times than N×M = 3×6 = 18 (the pre-fix serial count).
    const batchCallCount = mockGetTransactionsForAccounts.mock.calls.length;
    expect(batchCallCount).toBeLessThan(accounts.length * 6);
  });

  it("getFinancialDashboard: call count is bounded — at most M+1 calls for M months (not N×M)", async () => {
    const MONTHS = 6;
    const N = accounts.length; // 3

    await financialService.getFinancialDashboard(userId);

    const batchCallCount = mockGetTransactionsForAccounts.mock.calls.length;

    // Bound: at most (MONTHS + 1) calls — one for the 30-day window + one per month.
    // Before fix: N×MONTHS + N = 21 calls (or N + N×MONTHS = 21 with getTransactions).
    expect(batchCallCount).toBeLessThanOrEqual(MONTHS + 1);

    // Confirm the old serial method was never used
    expect(mockGetTransactions).not.toHaveBeenCalled();

    // Confirm each batched call targets ALL account ids, not just one
    for (const call of mockGetTransactionsForAccounts.mock.calls) {
      const accountIds = call[0] as string[];
      expect(accountIds).toEqual(
        expect.arrayContaining(accounts.map((a) => a.accountId)),
      );
    }
  });

  it("getFinancialDashboard: data correctness — totals are identical to what per-account fetches would return", async () => {
    // txnA: +50 (expense), txnB: +100 (expense), txnC: -200 (income)
    // Expected: monthlyIncome = 200, monthlyExpenses = 150
    const dashboard = await financialService.getFinancialDashboard(userId);

    // recentTransactions must contain all 3 transactions
    expect(dashboard.recentTransactions).toHaveLength(3);

    // monthly income = abs(negative amounts) = 200
    expect(dashboard.monthlyIncome).toBe(200);

    // monthly expenses = positive amounts = 150
    expect(dashboard.monthlyExpenses).toBe(150);

    // cashFlow = income - expenses
    expect(dashboard.cashFlow).toBe(50);
  });

  it("getMonthlyTrend: for 6 months × 3 accounts, uses at most 6 batch calls (not 18 serial)", async () => {
    // Drive getMonthlyTrend directly via getFinancialDashboard.
    // We count only the batch calls that look like monthly-range calls
    // (endDate is last day of a calendar month).
    await financialService.getFinancialDashboard(userId);

    const monthlyBatchCalls = mockGetTransactionsForAccounts.mock.calls.filter(
      ([, , endDate]) => {
        if (!(endDate instanceof Date)) return false;
        const dayAfter = new Date(endDate);
        dayAfter.setDate((endDate as Date).getDate() + 1);
        return dayAfter.getDate() === 1;
      },
    );

    // 6 months → at most 6 batch calls (one per month)
    expect(monthlyBatchCalls.length).toBeLessThanOrEqual(6);

    // Pre-fix would have been 3 accounts × 6 months = 18 getTransactions calls
    expect(mockGetTransactions).not.toHaveBeenCalled();
  });

  it("getSpendingAnalysis: current + previous period each use ONE batch call (not N each)", async () => {
    await financialService.getSpendingAnalysis(userId, 30);

    // Exactly 2 batch calls: one for current period, one for previous period
    expect(mockGetTransactionsForAccounts).toHaveBeenCalledTimes(2);
    expect(mockGetTransactions).not.toHaveBeenCalled();
  });

  it("getTransactionsForAccounts: always called with userId scoping (FIN-2 IDOR fix preserved)", async () => {
    await financialService.getFinancialDashboard(userId);

    for (const call of mockGetTransactionsForAccounts.mock.calls) {
      // 4th argument is userId
      expect(call[3]).toBe(userId);
    }
  });
});
