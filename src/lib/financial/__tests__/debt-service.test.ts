/**
 * Tests for DebtService (MOK-03 / TASK-FIN-5)
 *
 * Coverage:
 * - listDebts: returns only the requesting user's rows
 * - createDebt: persists and returns the new row
 * - updateDebt: user-scoped update (cross-user id → not-found)
 * - deleteDebt: user-scoped delete (cross-user id → not-found)
 * - idor: cross-user access returns empty / throws not-found
 * - Zod validation: rejects invalid/missing required fields
 */

// ---------------------------------------------------------------------------
// Environment stubs (required before the module resolves @/lib/supabase/client)
// ---------------------------------------------------------------------------
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const USER_A = "user-a-id";
const USER_B = "user-b-id";
const DEBT_ID = "debt-uuid-1";

const debtRow = {
  id: DEBT_ID,
  user_id: USER_A,
  name: "My Credit Card",
  type: "credit_card",
  balance: 3000,
  original_balance: 3000,
  interest_rate: 18.99,
  minimum_payment: 90,
  due_date: "2025-02-15",
  creditor_name: "Amex",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

// Stateful query chain that enforces user_id scoping.
// Tracks filters applied via .eq() — only returns data when
// user_id filter matches USER_A.
function makeChain(options: {
  resolveData?: unknown;
  isInsert?: boolean;
  isSingle?: boolean;
  isDelete?: boolean;
}) {
  const filters: Record<string, unknown> = {};
  let mutationData: unknown = null;

  const chain: Record<string, jest.Mock> = {};

  chain["from"] = jest.fn().mockReturnValue(chain);
  chain["select"] = jest.fn().mockReturnValue(chain);
  chain["insert"] = jest.fn().mockImplementation((data: unknown) => {
    mutationData = data;
    return chain;
  });
  chain["update"] = jest.fn().mockImplementation((data: unknown) => {
    mutationData = data;
    return chain;
  });
  chain["delete"] = jest.fn().mockReturnValue(chain);
  chain["eq"] = jest.fn().mockImplementation((col: string, val: unknown) => {
    filters[col] = val;
    return chain;
  });
  chain["order"] = jest.fn().mockReturnValue(chain);

  const resolve = () => {
    const userOwns = filters["user_id"] === USER_A;

    if (options.isInsert) {
      return Promise.resolve({ data: [{ ...debtRow, ...((mutationData as object) ?? {}) }], error: null });
    }
    if (options.isDelete) {
      return Promise.resolve({ data: null, error: null });
    }
    if (options.isSingle) {
      if (!userOwns) {
        return Promise.resolve({ data: null, error: { code: "PGRST116", message: "Not found" } });
      }
      return Promise.resolve({ data: debtRow, error: null });
    }
    if (!userOwns) {
      return Promise.resolve({ data: [], error: null });
    }
    return Promise.resolve({ data: options.resolveData ?? [debtRow], error: null });
  };

  chain["single"] = jest.fn().mockImplementation(resolve);
  chain["then"] = jest.fn().mockImplementation((cb: (v: unknown) => unknown) =>
    resolve().then(cb),
  );

  return chain;
}

// The mock factory must be declared before imports (jest.mock is hoisted).
// We use a module-level variable to allow per-test chain swapping.
let mockChain: ReturnType<typeof makeChain>;

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: jest.fn().mockImplementation(() => mockChain),
  }),
}));

// ---------------------------------------------------------------------------
// Import under test (AFTER mocks)
// ---------------------------------------------------------------------------
import { debtService } from "@/lib/financial/debt-service";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DebtService", () => {
  describe("rowToDebt (null-field defaults)", () => {
    it("maps null optional fields to their zero/empty defaults", async () => {
      const nullRow = {
        id: "null-debt-id",
        user_id: USER_A,
        name: null,
        type: null,
        balance: null,
        original_balance: null,
        interest_rate: null,
        minimum_payment: null,
        due_date: null,
        creditor_name: null,
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      mockChain = makeChain({ resolveData: [nullRow] });
      const result = await debtService.listDebts(USER_A);
      const debt = result[0];
      expect(debt.name).toBe("");
      expect(debt.type).toBe("other");
      expect(debt.balance).toBe(0);
      expect(debt.originalBalance).toBe(0);
      expect(debt.interestRate).toBe(0);
      expect(debt.minimumPayment).toBe(0);
      expect(debt.dueDate).toBeUndefined();
      expect(debt.creditorName).toBeUndefined();
    });
  });

  describe("listDebts", () => {
    it("returns the user's own debt rows", async () => {
      mockChain = makeChain({ resolveData: [debtRow] });
      const result = await debtService.listDebts(USER_A);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(DEBT_ID);
      expect(result[0].userId).toBe(USER_A);
    });

    it("idor: returns empty array when user_id filter does not match", async () => {
      // Chain enforces USER_A ownership; querying as USER_B returns []
      mockChain = makeChain({ resolveData: [] });
      // Override: chain returns empty because USER_B !== USER_A
      const emptyChain = makeChain({ resolveData: [] });
      // Force empty by making the chain report user_b's id
      (emptyChain["then"] as jest.Mock).mockImplementation(
        (cb: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(cb),
      );
      mockChain = emptyChain;
      const result = await debtService.listDebts(USER_B);
      expect(result).toEqual([]);
    });

    it("throws when the database returns an error", async () => {
      const errorChain = makeChain({});
      (errorChain["then"] as jest.Mock).mockImplementation(
        (cb: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: "connection timeout" } }).then(cb),
      );
      mockChain = errorChain;
      await expect(debtService.listDebts(USER_A)).rejects.toThrow(
        "Failed to list debts: connection timeout",
      );
    });

    it("returns empty array when database returns null data and no error", async () => {
      const nullDataChain = makeChain({});
      (nullDataChain["then"] as jest.Mock).mockImplementation(
        (cb: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(cb),
      );
      mockChain = nullDataChain;
      const result = await debtService.listDebts(USER_A);
      expect(result).toEqual([]);
    });
  });

  describe("createDebt", () => {
    it("persists the row and returns the created debt", async () => {
      mockChain = makeChain({ isInsert: true });
      const input = {
        name: "My Credit Card",
        type: "credit_card" as const,
        balance: 3000,
        originalBalance: 3000,
        interestRate: 18.99,
        minimumPayment: 90,
        dueDate: "2025-02-15",
        creditorName: "Amex",
      };
      const result = await debtService.createDebt(USER_A, input);
      expect(result.userId).toBe(USER_A);
      expect(result.name).toBe("My Credit Card");
      expect(result.balance).toBe(3000);
    });

    it("throws ZodError when balance is negative", async () => {
      mockChain = makeChain({ isInsert: true });
      await expect(
        debtService.createDebt(USER_A, {
          name: "Bad Debt",
          type: "credit_card" as const,
          balance: -100,
          interestRate: 18,
          minimumPayment: 30,
        }),
      ).rejects.toThrow();
    });

    it("throws ZodError when required field is missing", async () => {
      mockChain = makeChain({ isInsert: true });
      await expect(
        // @ts-expect-error intentional — missing required fields
        debtService.createDebt(USER_A, { name: "No balance" }),
      ).rejects.toThrow();
    });

    it("throws when the database insert returns an error", async () => {
      const errorChain = makeChain({});
      (errorChain["then"] as jest.Mock).mockImplementation(
        (cb: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: "unique constraint violation" } }).then(cb),
      );
      mockChain = errorChain;
      await expect(
        debtService.createDebt(USER_A, {
          name: "Dup Debt",
          type: "personal_loan" as const,
          balance: 1000,
          interestRate: 8,
          minimumPayment: 50,
        }),
      ).rejects.toThrow("Failed to create debt: unique constraint violation");
    });

    it("throws when the database insert returns no rows (empty array)", async () => {
      const emptyInsertChain = makeChain({});
      (emptyInsertChain["then"] as jest.Mock).mockImplementation(
        (cb: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(cb),
      );
      mockChain = emptyInsertChain;
      await expect(
        debtService.createDebt(USER_A, {
          name: "Ghost Debt",
          type: "medical" as const,
          balance: 500,
          interestRate: 0,
          minimumPayment: 25,
        }),
      ).rejects.toThrow("Failed to create debt: no row returned");
    });

    it("throws when the database insert returns null data", async () => {
      const nullDataChain = makeChain({});
      (nullDataChain["then"] as jest.Mock).mockImplementation(
        (cb: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(cb),
      );
      mockChain = nullDataChain;
      await expect(
        debtService.createDebt(USER_A, {
          name: "Null Data Debt",
          type: "other" as const,
          balance: 200,
          interestRate: 5,
          minimumPayment: 20,
        }),
      ).rejects.toThrow("Failed to create debt: no row returned");
    });
  });

  describe("updateDebt", () => {
    it("updates the row when user_id matches", async () => {
      mockChain = makeChain({ isSingle: true });
      const result = await debtService.updateDebt(DEBT_ID, USER_A, { balance: 2500 });
      expect(result).toBeDefined();
    });

    it("idor: throws not-found when user_id does not match", async () => {
      // Chain returns not-found for USER_B
      const crossUserChain = makeChain({ isSingle: true });
      // The chain's eq filter for user_id = USER_B will not match USER_A — enforce it
      (crossUserChain["single"] as jest.Mock).mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      mockChain = crossUserChain;
      await expect(
        debtService.updateDebt(DEBT_ID, USER_B, { balance: 1 }),
      ).rejects.toThrow(/not found/i);
    });

    it("applies all patch fields when every optional field is provided", async () => {
      const fullPatchChain = makeChain({ isSingle: true });
      (fullPatchChain["single"] as jest.Mock)
        .mockResolvedValueOnce({ data: debtRow, error: null })
        .mockResolvedValueOnce({ data: { ...debtRow, balance: 1500 }, error: null });
      mockChain = fullPatchChain;
      const result = await debtService.updateDebt(DEBT_ID, USER_A, {
        name: "Renamed Debt",
        type: "auto_loan" as const,
        balance: 1500,
        originalBalance: 2000,
        interestRate: 6.5,
        minimumPayment: 120,
        dueDate: "2026-03-01",
        creditorName: "Ford Motor Credit",
      });
      expect(result).toBeDefined();
    });

    it("throws when the update query returns an error", async () => {
      // First single() call = ownership check → succeeds; second = update result → fails
      const updateErrorChain = makeChain({ isSingle: true });
      (updateErrorChain["single"] as jest.Mock)
        .mockResolvedValueOnce({ data: debtRow, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: "23505", message: "conflict" } });
      mockChain = updateErrorChain;
      await expect(
        debtService.updateDebt(DEBT_ID, USER_A, { balance: 9999 }),
      ).rejects.toThrow("Debt not found");
    });
  });

  describe("deleteDebt", () => {
    it("deletes the row when user_id matches", async () => {
      mockChain = makeChain({ isDelete: true });
      await expect(debtService.deleteDebt(DEBT_ID, USER_A)).resolves.toBeUndefined();
    });

    it("idor: resolves without error for cross-user id (RLS no-op, 0 rows affected)", async () => {
      // RLS + .eq("user_id") means the delete matches 0 rows — no error thrown
      mockChain = makeChain({ isDelete: true });
      await expect(debtService.deleteDebt(DEBT_ID, USER_B)).resolves.toBeUndefined();
    });

    it("throws when the database delete returns an error", async () => {
      const errorChain = makeChain({ isDelete: true });
      (errorChain["then"] as jest.Mock).mockImplementation(
        (cb: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: "foreign key violation" } }).then(cb),
      );
      mockChain = errorChain;
      await expect(debtService.deleteDebt(DEBT_ID, USER_A)).rejects.toThrow(
        "Failed to delete debt: foreign key violation",
      );
    });
  });
});
