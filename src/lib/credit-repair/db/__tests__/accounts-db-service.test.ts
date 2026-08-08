/**
 * @jest-environment node
 */

/**
 * Tests for AccountsDbService
 *
 * Covers: user-scoped tradeline reads, ordering, pagination, honest null-field
 * mapping, error handling, and the pure `computeAgeMonths` derivation
 * (deterministic via an injected `now`: happy path, complete-month boundary,
 * missing → null, unparseable → null, future → 0 floor).
 * Requires mocking: @/lib/supabase/client
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/service-role", () => {
  const _client = { from: jest.fn() };
  return { getServiceRoleClient: () => _client };
});

import { getServiceRoleClient } from "@/lib/supabase/service-role";

function sb(): { from: jest.Mock } {
  return getServiceRoleClient() as unknown as { from: jest.Mock };
}

function chainMock(result: { data: unknown; error: unknown; count?: number }) {
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
    "not",
    "order",
    "limit",
    "range",
    "gte",
    "lte",
    "ilike",
    "single",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) =>
    Promise.resolve({ ...result, count: result.count ?? 0 }).then(
      resolve,
      reject,
    );
  return obj;
}

function mockFrom(result: { data: unknown; error: unknown; count?: number }) {
  const mock = chainMock(result);
  sb().from.mockReturnValue(mock);
  return mock;
}

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { accountsDbService, computeAgeMonths } from "../accounts-db-service";
import { db } from "../index";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const accountRow = {
  id: "acc-1",
  creditor_name: "Chase Bank",
  account_type: "credit_card",
  balance: 1234.56,
  credit_limit: 5000,
  payment_status: "current",
  opened_date: "2018-03-15",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AccountsDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAccountsByUser", () => {
    it("scopes the query to the user and orders by opened_date desc (nulls last)", async () => {
      const mock = mockFrom({ data: [accountRow], error: null });

      const result = await accountsDbService.getAccountsByUser("u-1");

      expect(sb().from).toHaveBeenCalledWith("credit_accounts");
      expect(mock.eq).toHaveBeenCalledWith("user_id", "u-1");
      expect(mock.order).toHaveBeenCalledWith("opened_date", {
        ascending: false,
        nullsFirst: false,
      });
      expect(result).toHaveLength(1);
    });

    it("maps a row to the app shape (snake_case → camelCase)", async () => {
      mockFrom({ data: [accountRow], error: null });

      const [acc] = await accountsDbService.getAccountsByUser("u-1");

      expect(acc.id).toBe("acc-1");
      expect(acc.creditorName).toBe("Chase Bank");
      expect(acc.accountType).toBe("credit_card");
      expect(acc.balance).toBe(1234.56);
      expect(acc.creditLimit).toBe(5000);
      expect(acc.paymentStatus).toBe("current");
      expect(acc.openedDate).toBe("2018-03-15");
    });

    it("reports missing money / status / date fields as null (never fabricated)", async () => {
      mockFrom({
        data: [
          {
            ...accountRow,
            balance: null,
            credit_limit: null,
            payment_status: null,
            opened_date: null,
          },
        ],
        error: null,
      });

      const [acc] = await accountsDbService.getAccountsByUser("u-1");

      expect(acc.balance).toBeNull();
      expect(acc.creditLimit).toBeNull();
      expect(acc.paymentStatus).toBeNull();
      expect(acc.openedDate).toBeNull();
    });

    it("applies limit when provided without offset", async () => {
      const mock = mockFrom({ data: [], error: null });

      await accountsDbService.getAccountsByUser("u-1", { limit: 5 });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("applies range when offset is provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await accountsDbService.getAccountsByUser("u-1", { offset: 10, limit: 5 });
      expect(mock.range).toHaveBeenCalledWith(10, 14);
    });

    it("uses default limit of 50 when offset provided without limit", async () => {
      const mock = mockFrom({ data: [], error: null });

      await accountsDbService.getAccountsByUser("u-1", { offset: 0 });
      expect(mock.range).toHaveBeenCalledWith(0, 49);
    });

    it("returns an empty array when data is null", async () => {
      mockFrom({ data: null, error: null });

      const result = await accountsDbService.getAccountsByUser("u-1");
      expect(result).toEqual([]);
    });

    it("throws on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        accountsDbService.getAccountsByUser("u-1"),
      ).rejects.toThrow("Failed to get accounts");
    });
  });

  describe("computeAgeMonths", () => {
    const now = new Date("2024-01-15T00:00:00Z");

    it("returns complete months elapsed for a past open date", () => {
      // 2020-01-15 → 2024-01-15 is exactly 48 months (open day reached).
      expect(computeAgeMonths("2020-01-15", now)).toBe(48);
    });

    it("does not count the final month until the open day is reached", () => {
      // Opened on the 20th; on the 15th the current month is not yet complete.
      expect(computeAgeMonths("2020-01-20", now)).toBe(47);
    });

    it("counts a month exactly on the open-day anniversary", () => {
      expect(
        computeAgeMonths("2020-01-15", new Date("2020-02-15T00:00:00Z")),
      ).toBe(1);
    });

    it("does not count a month one day before the anniversary", () => {
      expect(
        computeAgeMonths("2020-01-15", new Date("2020-02-14T00:00:00Z")),
      ).toBe(0);
    });

    it("returns null for a missing open date (null / undefined / empty) — never 0", () => {
      expect(computeAgeMonths(null, now)).toBeNull();
      expect(computeAgeMonths(undefined, now)).toBeNull();
      expect(computeAgeMonths("", now)).toBeNull();
    });

    it("returns null for an unparseable open date", () => {
      expect(computeAgeMonths("not-a-date", now)).toBeNull();
    });

    it("floors a future open date to 0 (an account cannot have negative age)", () => {
      expect(computeAgeMonths("2030-06-01", now)).toBe(0);
    });

    it("is timezone-independent (UTC on both sides)", () => {
      // Same calendar boundary regardless of the runner's local offset.
      expect(
        computeAgeMonths("2020-01-15", new Date("2021-01-15T00:00:00Z")),
      ).toBe(12);
    });
  });

  describe("db facade wiring", () => {
    it("exposes the accounts service on the unified db facade", () => {
      expect(db.accounts).toBe(accountsDbService);
      expect(typeof db.accounts.getAccountsByUser).toBe("function");
      expect(typeof db.accounts.computeAgeMonths).toBe("function");
    });
  });
});
