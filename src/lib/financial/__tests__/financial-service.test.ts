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
    // startDate/endDate arguments passed to getTransactions for each month.
    // The dashboard also issues its own 30-day transaction fetch; we select
    // only the calls whose endDate is the last day of a month (endDate + 1 day
    // == 1st of the next month) to isolate the monthly-trend calls.
    const mar31 = new Date(2026, 2, 31);
    jest.useFakeTimers();
    jest.setSystemTime(mar31);

    await financialService.getFinancialDashboard(userId);

    // Isolate calls where endDate is the last day of a calendar month.
    const monthCalls = mockGetTransactions.mock.calls.filter(
      ([, , endDate]) => {
        if (!(endDate instanceof Date)) return false;
        const dayAfter = new Date(endDate);
        dayAfter.setDate(endDate.getDate() + 1);
        return dayAfter.getDate() === 1;
      },
    );

    // Deduplicate by startDate ISO string (dashboard 30-day fetch may coincide
    // with a monthly boundary on certain clock dates; we want 6 distinct months).
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
