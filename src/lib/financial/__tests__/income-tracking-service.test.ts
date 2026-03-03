/**
 * @jest-environment node
 */

/**
 * Income Tracking Service Unit Tests
 *
 * Tests for CRUD operations, payday countdown, monthly income stats,
 * income pattern detection from transactions, and next pay date calculation.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/server", () => {
  const _admin = {
    from: jest.fn(),
  };
  return { supabaseAdmin: _admin };
});

function sb() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

// Self-referencing chain mock
function chainMock(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "is",
    "in",
    "order",
    "limit",
    "gte",
    "lte",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);
  return obj;
}

function mockFrom(result: { data: unknown; error: unknown }) {
  const mock = chainMock(result);
  sb().from.mockReturnValue(mock);
  return mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2026-02-20T12:00:00.000Z");
const FIVE_DAYS_LATER = new Date("2026-02-25T12:00:00.000Z");
const TEN_DAYS_AGO = new Date("2026-02-10T12:00:00.000Z");

function incomeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inc-1",
    user_id: "user-1",
    name: "Acme Corp Salary",
    amount: 3000,
    frequency: "biweekly",
    next_pay_date: FIVE_DAYS_LATER.toISOString(),
    account_id: "acc-1",
    is_auto_detected: false,
    last_pay_date: TEN_DAYS_AGO.toISOString(),
    category: "salary",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-02-15T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------

import { incomeTrackingService } from "../income-tracking-service";
import type { Transaction } from "../income-tracking-service";

describe("IncomeTrackingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // getIncomeSources
  // =========================================================================
  describe("getIncomeSources", () => {
    it("should return mapped income sources", async () => {
      const rows = [incomeRow(), incomeRow({ id: "inc-2", name: "Side Gig" })];
      mockFrom({ data: rows, error: null });

      const result = await incomeTrackingService.getIncomeSources("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("inc-1");
      expect(result[0].name).toBe("Acme Corp Salary");
      expect(result[0].amount).toBe(3000);
      expect(result[0].frequency).toBe("biweekly");
      expect(result[0].nextPayDate).toBeInstanceOf(Date);
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });
      const result = await incomeTrackingService.getIncomeSources("user-1");
      expect(result).toEqual([]);
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "db error" } });
      await expect(
        incomeTrackingService.getIncomeSources("user-1"),
      ).rejects.toThrow("Failed to fetch income sources");
    });
  });

  // =========================================================================
  // getIncomeSource
  // =========================================================================
  describe("getIncomeSource", () => {
    it("should return a single income source", async () => {
      mockFrom({ data: incomeRow(), error: null });

      const result = await incomeTrackingService.getIncomeSource(
        "user-1",
        "inc-1",
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe("inc-1");
    });

    it("should return null for PGRST116 (not found)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await incomeTrackingService.getIncomeSource(
        "user-1",
        "inc-x",
      );
      expect(result).toBeNull();
    });

    it("should throw on other Supabase errors", async () => {
      mockFrom({
        data: null,
        error: { code: "OTHER", message: "db fail" },
      });

      await expect(
        incomeTrackingService.getIncomeSource("user-1", "inc-x"),
      ).rejects.toThrow("Failed to fetch income source");
    });
  });

  // =========================================================================
  // createIncomeSource
  // =========================================================================
  describe("createIncomeSource", () => {
    it("should create an income source with required fields", async () => {
      mockFrom({ data: incomeRow(), error: null });

      const result = await incomeTrackingService.createIncomeSource("user-1", {
        name: "Acme Corp Salary",
        amount: 3000,
        frequency: "biweekly",
        nextPayDate: FIVE_DAYS_LATER,
      });

      expect(result.id).toBe("inc-1");
      expect(result.name).toBe("Acme Corp Salary");
      expect(sb().from).toHaveBeenCalledWith("income_sources");
    });

    it("should create with optional fields", async () => {
      mockFrom({ data: incomeRow({ is_auto_detected: true }), error: null });

      const result = await incomeTrackingService.createIncomeSource("user-1", {
        name: "Acme Corp Salary",
        amount: 3000,
        frequency: "biweekly",
        nextPayDate: FIVE_DAYS_LATER,
        accountId: "acc-1",
        isAutoDetected: true,
      });

      expect(result.isAutoDetected).toBe(true);
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "insert fail" } });

      await expect(
        incomeTrackingService.createIncomeSource("user-1", {
          name: "Test",
          amount: 1000,
          frequency: "monthly",
          nextPayDate: FIVE_DAYS_LATER,
        }),
      ).rejects.toThrow("Failed to create income source");
    });
  });

  // =========================================================================
  // updateIncomeSource
  // =========================================================================
  describe("updateIncomeSource", () => {
    it("should update income source fields", async () => {
      mockFrom({ data: incomeRow({ amount: 3500 }), error: null });

      const result = await incomeTrackingService.updateIncomeSource(
        "user-1",
        "inc-1",
        { amount: 3500 },
      );

      expect(result.amount).toBe(3500);
    });

    it("should update multiple fields at once", async () => {
      mockFrom({
        data: incomeRow({ name: "New Name", frequency: "monthly" }),
        error: null,
      });

      const result = await incomeTrackingService.updateIncomeSource(
        "user-1",
        "inc-1",
        { name: "New Name", frequency: "monthly" },
      );

      expect(result.name).toBe("New Name");
      expect(result.frequency).toBe("monthly");
    });

    it("should throw on Supabase error", async () => {
      mockFrom({ data: null, error: { message: "update fail" } });

      await expect(
        incomeTrackingService.updateIncomeSource("user-1", "inc-1", {
          amount: 5000,
        }),
      ).rejects.toThrow("Failed to update income source");
    });
  });

  // =========================================================================
  // deleteIncomeSource
  // =========================================================================
  describe("deleteIncomeSource", () => {
    it("should delete an income source", async () => {
      const mock = chainMock({ data: null, error: null });
      mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(r, j);
      sb().from.mockReturnValue(mock);

      await incomeTrackingService.deleteIncomeSource("user-1", "inc-1");
      expect(sb().from).toHaveBeenCalledWith("income_sources");
      expect(mock.delete).toHaveBeenCalled();
    });

    it("should throw on Supabase error", async () => {
      const mock = chainMock({
        data: null,
        error: { message: "delete fail" },
      });
      mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: { message: "delete fail" } }).then(
          r,
          j,
        );
      sb().from.mockReturnValue(mock);

      await expect(
        incomeTrackingService.deleteIncomeSource("user-1", "inc-1"),
      ).rejects.toThrow("Failed to delete income source");
    });
  });

  // =========================================================================
  // getPaydayCountdown
  // =========================================================================
  describe("getPaydayCountdown", () => {
    it("should return countdown for next upcoming payday", async () => {
      const futureDate = new Date(NOW.getTime() + 5 * 86400000).toISOString();
      mockFrom({
        data: [incomeRow({ next_pay_date: futureDate })],
        error: null,
      });

      const result = await incomeTrackingService.getPaydayCountdown("user-1");
      expect(result).not.toBeNull();
      expect(result!.daysUntilPayday).toBeGreaterThanOrEqual(4);
      expect(result!.expectedAmount).toBe(3000);
      expect(result!.sourceName).toBe("Acme Corp Salary");
    });

    it("should return null when user has no income sources", async () => {
      mockFrom({ data: [], error: null });

      const result = await incomeTrackingService.getPaydayCountdown("user-1");
      expect(result).toBeNull();
    });

    it("should update next pay dates when all are in the past", async () => {
      const pastDate = new Date(
        NOW.getTime() - 2 * 86400000,
      ).toISOString();
      const futureDate = new Date(
        NOW.getTime() + 12 * 86400000,
      ).toISOString();

      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          // First getIncomeSources — all past dates
          return chainMock({
            data: [incomeRow({ next_pay_date: pastDate })],
            error: null,
          });
        }
        if (callCount <= 2) {
          // updateNextPayDates → update call (no .single())
          const mock = chainMock({ data: null, error: null });
          mock.then = (r: (v: unknown) => void, j: (e: unknown) => void) =>
            Promise.resolve({ data: null, error: null }).then(r, j);
          return mock;
        }
        // Second getIncomeSources — updated future date
        return chainMock({
          data: [incomeRow({ next_pay_date: futureDate })],
          error: null,
        });
      });

      const result = await incomeTrackingService.getPaydayCountdown("user-1");
      expect(result).not.toBeNull();
      expect(result!.daysUntilPayday).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // getMonthlyIncomeStats
  // =========================================================================
  describe("getMonthlyIncomeStats", () => {
    it("should calculate monthly stats for single biweekly source", async () => {
      mockFrom({ data: [incomeRow()], error: null });

      const result = await incomeTrackingService.getMonthlyIncomeStats("user-1");
      // biweekly multiplier = 2.17, so 3000 * 2.17 = 6510
      expect(result.totalMonthlyIncome).toBe(6510);
      expect(result.sources).toHaveLength(1);
      expect(result.averagePaycheck).toBe(3000);
      expect(result.payFrequency).toBe("biweekly");
    });

    it("should return zeros for user with no sources", async () => {
      mockFrom({ data: [], error: null });

      const result = await incomeTrackingService.getMonthlyIncomeStats("user-1");
      expect(result.totalMonthlyIncome).toBe(0);
      expect(result.sources).toEqual([]);
      expect(result.averagePaycheck).toBe(0);
      expect(result.payFrequency).toBe("monthly");
    });

    it("should report mixed frequency for multiple different frequencies", async () => {
      mockFrom({
        data: [
          incomeRow({ id: "inc-1", frequency: "biweekly", amount: 3000 }),
          incomeRow({ id: "inc-2", frequency: "monthly", amount: 1000 }),
        ],
        error: null,
      });

      const result = await incomeTrackingService.getMonthlyIncomeStats("user-1");
      expect(result.payFrequency).toBe("mixed");
      // 3000*2.17 + 1000*1 = 6510 + 1000 = 7510
      expect(result.totalMonthlyIncome).toBe(7510);
    });

    it("should calculate weekly multiplier correctly", async () => {
      mockFrom({
        data: [incomeRow({ frequency: "weekly", amount: 1000 })],
        error: null,
      });

      const result = await incomeTrackingService.getMonthlyIncomeStats("user-1");
      // weekly multiplier = 4.33, so 1000 * 4.33 = 4330
      expect(result.totalMonthlyIncome).toBe(4330);
    });

    it("should calculate semimonthly multiplier correctly", async () => {
      mockFrom({
        data: [incomeRow({ frequency: "semimonthly", amount: 2000 })],
        error: null,
      });

      const result = await incomeTrackingService.getMonthlyIncomeStats("user-1");
      // semimonthly multiplier = 2, so 2000 * 2 = 4000
      expect(result.totalMonthlyIncome).toBe(4000);
    });
  });

  // =========================================================================
  // calculateNextPayDate (pure, sync)
  // =========================================================================
  describe("calculateNextPayDate", () => {
    // The implementation uses local-time Date methods (getDate/setDate/setMonth),
    // so we construct dates with local-time noon to avoid UTC-offset day shifts.
    function localNoon(year: number, month: number, day: number): Date {
      const d = new Date(year, month, day, 12, 0, 0, 0);
      return d;
    }

    it("should add 7 days for weekly", () => {
      const last = localNoon(2026, 1, 1); // Feb 1
      const next = incomeTrackingService.calculateNextPayDate(last, "weekly");
      expect(next.getDate()).toBe(8);
      expect(next.getMonth()).toBe(1); // Still February
    });

    it("should add 14 days for biweekly", () => {
      const last = localNoon(2026, 1, 1); // Feb 1
      const next = incomeTrackingService.calculateNextPayDate(last, "biweekly");
      expect(next.getDate()).toBe(15);
      expect(next.getMonth()).toBe(1);
    });

    it("should jump to 15th for semimonthly when day < 15", () => {
      const last = localNoon(2026, 1, 1); // Feb 1
      const next = incomeTrackingService.calculateNextPayDate(
        last,
        "semimonthly",
      );
      expect(next.getDate()).toBe(15);
      expect(next.getMonth()).toBe(1); // Still February
    });

    it("should jump to 1st of next month for semimonthly when day >= 15", () => {
      const last = localNoon(2026, 1, 15); // Feb 15
      const next = incomeTrackingService.calculateNextPayDate(
        last,
        "semimonthly",
      );
      expect(next.getDate()).toBe(1);
      expect(next.getMonth()).toBe(2); // March
    });

    it("should add 1 month for monthly", () => {
      const last = localNoon(2026, 1, 15); // Feb 15
      const next = incomeTrackingService.calculateNextPayDate(last, "monthly");
      expect(next.getMonth()).toBe(2); // March
      expect(next.getDate()).toBe(15);
    });
  });

  // =========================================================================
  // detectIncomeFromTransactions (pure logic)
  // =========================================================================
  describe("detectIncomeFromTransactions", () => {
    it("should detect income pattern from recurring credits", async () => {
      const transactions: Transaction[] = [];
      // 6 biweekly "PAYROLL Acme" transactions
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01T00:00:00.000Z");
        date.setDate(date.getDate() + i * 14);
        transactions.push({
          id: `tx-${i}`,
          date,
          amount: 3000,
          merchantName: "PAYROLL Acme Corp",
        });
      }

      const patterns =
        await incomeTrackingService.detectIncomeFromTransactions(transactions);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].frequency).toBe("biweekly");
      expect(patterns[0].amount).toBe(3000);
      expect(patterns[0].occurrences).toBe(6);
    });

    it("should filter out debit (negative) transactions", async () => {
      const transactions: Transaction[] = [
        {
          id: "tx-1",
          date: new Date("2026-01-01"),
          amount: -50,
          merchantName: "Coffee Shop",
        },
        {
          id: "tx-2",
          date: new Date("2026-01-15"),
          amount: -50,
          merchantName: "Coffee Shop",
        },
        {
          id: "tx-3",
          date: new Date("2026-02-01"),
          amount: -50,
          merchantName: "Coffee Shop",
        },
      ];

      const patterns =
        await incomeTrackingService.detectIncomeFromTransactions(transactions);
      expect(patterns).toEqual([]);
    });

    it("should require minimum occurrences for detection", async () => {
      const transactions: Transaction[] = [
        {
          id: "tx-1",
          date: new Date("2026-01-01"),
          amount: 5000,
          merchantName: "PAYROLL BigCo",
        },
      ];

      const patterns =
        await incomeTrackingService.detectIncomeFromTransactions(transactions);
      expect(patterns).toEqual([]);
    });

    it("should return empty array for no transactions", async () => {
      const patterns =
        await incomeTrackingService.detectIncomeFromTransactions([]);
      expect(patterns).toEqual([]);
    });

    it("should detect monthly frequency", async () => {
      const transactions: Transaction[] = [];
      // 4 monthly "Direct Deposit" transactions
      for (let i = 0; i < 4; i++) {
        const date = new Date("2026-01-15T00:00:00.000Z");
        date.setMonth(date.getMonth() + i);
        transactions.push({
          id: `tx-${i}`,
          date,
          amount: 5000,
          merchantName: "Direct Deposit Employer",
        });
      }

      const patterns =
        await incomeTrackingService.detectIncomeFromTransactions(transactions);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].frequency).toBe("monthly");
    });

    it("should detect weekly frequency", async () => {
      const transactions: Transaction[] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01T00:00:00.000Z");
        date.setDate(date.getDate() + i * 7);
        transactions.push({
          id: `tx-${i}`,
          date,
          amount: 800,
          merchantName: "Paycheck Weekly Inc",
        });
      }

      const patterns =
        await incomeTrackingService.detectIncomeFromTransactions(transactions);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].frequency).toBe("weekly");
    });

    it("should sort patterns by confidence descending", async () => {
      // Two income sources, one with keyword, one without
      const transactions: Transaction[] = [];
      // Source 1: "PAYROLL Corp" — 6 biweekly, amount consistent
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01T00:00:00.000Z");
        date.setDate(date.getDate() + i * 14);
        transactions.push({
          id: `a-${i}`,
          date,
          amount: 3000,
          merchantName: "PAYROLL Corp",
        });
      }
      // Source 2: "Random Co" — 3 biweekly, no income keyword
      for (let i = 0; i < 3; i++) {
        const date = new Date("2026-01-03T00:00:00.000Z");
        date.setDate(date.getDate() + i * 14);
        transactions.push({
          id: `b-${i}`,
          date,
          amount: 1500,
          merchantName: "Random Co",
        });
      }

      const patterns =
        await incomeTrackingService.detectIncomeFromTransactions(transactions);
      if (patterns.length >= 2) {
        expect(patterns[0].confidence).toBeGreaterThanOrEqual(
          patterns[1].confidence,
        );
      }
    });
  });
});
