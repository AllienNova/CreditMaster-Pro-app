/**
 * IDOR tests for PlaidService — FND-036, FND-037
 *
 * Verifies that getTransactions and getAccessToken (via the private path)
 * are scoped to the requesting user and never return data owned by another user.
 */

// Must be hoisted before imports
const mockFrom = jest.fn();

// Mutable plaid client object — tests can replace properties before calling syncAccounts
const mockPlaidClient: Record<string, jest.Mock> = {};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: mockFrom,
  }),
}));

// plaid_items/financial_accounts reads go through a lazily constructed
// service-role client built on @supabase/supabase-js's createClient (see
// plaid-service.ts's getServiceRoleClient()) — same shared mockFrom spy as
// @/lib/supabase/client above so the IDOR assertions below keep working
// unchanged.
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => mockPlaidClient,
}));

import { plaidService } from "../plaid-service";

// ---------------------------------------------------------------------------
// Chain factory — builds the chainable mock on every `from()` call
// ---------------------------------------------------------------------------
function makeChain(rows: unknown[] | null, error: unknown = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: rows, error }),
    single: jest.fn().mockResolvedValue({ data: rows?.[0] ?? null, error }),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const USER_A_ID = "user-a-uuid";
const USER_B_ID = "user-b-uuid";
const ITEM_X_ID = "item-x-uuid";
const ACCOUNT_X_ID = "account-x-uuid";

const userATransaction = {
  id: "txn-1",
  account_id: ACCOUNT_X_ID,
  user_id: USER_A_ID,
  transaction_id: "plaid-txn-1",
  date: "2026-01-15T00:00:00Z",
  amount: 42.5,
  name: "Grocery Store",
  merchant_name: null,
  category: ["Food"],
  pending: false,
  payment_channel: "online",
  location: null,
  created_at: "2026-01-15T12:00:00Z",
};

// ---------------------------------------------------------------------------

describe("idor — PlaidService IDOR guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // FND-036: getTransactions must filter by user_id
  describe("getTransactions", () => {
    it("idor: returns empty array when userId does not own the account", async () => {
      // The DB returns 0 rows because RLS / the user_id filter excludes user B's request
      const chain = makeChain([]);
      mockFrom.mockReturnValue(chain);

      const result = await plaidService.getTransactions(
        ACCOUNT_X_ID,
        new Date("2026-01-01"),
        new Date("2026-01-31"),
        USER_B_ID, // user B requests user A's account
      );

      // Expect empty — user B owns no rows for this account
      expect(result).toEqual([]);

      // Verify the query includes a user_id equality filter
      const eqCalls: [string, string][] = chain.eq.mock.calls as [string, string][];
      const hasUserIdFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === USER_B_ID,
      );
      expect(hasUserIdFilter).toBe(true);
    });

    it("idor: returns transactions only when userId matches owner", async () => {
      const chain = makeChain([userATransaction]);
      mockFrom.mockReturnValue(chain);

      const result = await plaidService.getTransactions(
        ACCOUNT_X_ID,
        new Date("2026-01-01"),
        new Date("2026-01-31"),
        USER_A_ID, // correct owner
      );

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(USER_A_ID);
    });
  });

  // FND-037: getAccessToken must filter by user_id (via public surface — syncAccounts)
  // We test the private getAccessToken indirectly by observing the DB query it emits.
  describe("getAccessToken (via syncAccounts IDOR boundary)", () => {
    it("idor: throws 'not found' when userId does not own the item", async () => {
      // plaid_items query returns null for user B + item X
      const chain = makeChain(null, { message: "not found" });
      mockFrom.mockImplementation((table: string) => {
        if (table === "plaid_items") {
          return chain;
        }
        // financial_accounts fallback (not reached in error path)
        return makeChain([]);
      });

      // syncAccounts calls getAccessToken(itemId) internally.
      // With user B the plaid_items lookup should fail.
      await expect(
        plaidService.syncAccounts(ITEM_X_ID, USER_B_ID),
      ).rejects.toThrow();

      // Verify the plaid_items query carried a user_id eq filter
      const eqCalls: [string, string][] = chain.eq.mock.calls as [string, string][];
      const hasUserIdFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === USER_B_ID,
      );
      expect(hasUserIdFilter).toBe(true);
    });

    it("idor: succeeds when userId matches item owner", async () => {
      const itemChain = makeChain([
        { access_token: "secret-access-token" },
      ]);
      // Return user A's item for user A
      mockFrom.mockImplementation((table: string) => {
        if (table === "plaid_items") {
          return itemChain;
        }
        return makeChain([]);
      });

      // Wire the Plaid SDK method onto the shared mutable client object
      mockPlaidClient.accountsGet = jest.fn().mockResolvedValue({
        data: { accounts: [], item: { institution_id: "ins-1" } },
      });

      // Should not throw — user A owns the item
      await expect(
        plaidService.syncAccounts(ITEM_X_ID, USER_A_ID),
      ).resolves.toEqual([]);

      // Verify user_id filter was applied on plaid_items
      const eqCalls: [string, string][] = itemChain.eq.mock.calls as [string, string][];
      const hasUserIdFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === USER_A_ID,
      );
      expect(hasUserIdFilter).toBe(true);
    });
  });

  // FIN-4 / FND-038: getAccessTokenForUser — public wrapper delegates to private getAccessToken
  describe("getAccessTokenForUser", () => {
    it("returns the access token for the owning user", async () => {
      const chain = makeChain([{ access_token: "tok-for-user-a" }]);
      mockFrom.mockReturnValue(chain);

      const token = await plaidService.getAccessTokenForUser(ITEM_X_ID, USER_A_ID);

      expect(token).toBe("tok-for-user-a");
      // Verify user_id scoping was applied
      const eqCalls: [string, string][] = chain.eq.mock.calls as [string, string][];
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_A_ID)).toBe(true);
    });

    it("throws when the item does not belong to the requesting user", async () => {
      const chain = makeChain(null, { message: "not found" });
      mockFrom.mockReturnValue(chain);

      await expect(
        plaidService.getAccessTokenForUser(ITEM_X_ID, USER_B_ID),
      ).rejects.toThrow("Access token not found");
    });
  });

  // FIN-4 / FND-040: getTransactionsForAccounts
  describe("getTransactionsForAccounts", () => {
    it("returns empty array immediately when accountIds is empty (early-return guard)", async () => {
      // No DB call should be made
      const result = await plaidService.getTransactionsForAccounts(
        [],
        new Date("2026-01-01"),
        new Date("2026-01-31"),
        USER_A_ID,
      );

      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns mapped transactions for multiple account IDs", async () => {
      const chain = makeChain([userATransaction]);
      mockFrom.mockReturnValue(chain);

      const result = await plaidService.getTransactionsForAccounts(
        [ACCOUNT_X_ID, "account-y-uuid"],
        new Date("2026-01-01"),
        new Date("2026-01-31"),
        USER_A_ID,
      );

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(USER_A_ID);
      // Verify .in() was called with the account list
      const inCall = chain.in.mock.calls[0] as [string, string[]];
      expect(inCall[0]).toBe("account_id");
      expect(inCall[1]).toContain(ACCOUNT_X_ID);
    });

    it("throws when the database query returns an error", async () => {
      const chain = makeChain(null, { message: "query timeout" });
      mockFrom.mockReturnValue(chain);

      await expect(
        plaidService.getTransactionsForAccounts(
          [ACCOUNT_X_ID],
          new Date("2026-01-01"),
          new Date("2026-01-31"),
          USER_A_ID,
        ),
      ).rejects.toThrow("Failed to fetch transactions");
    });

    it("idor: applies user_id filter to prevent cross-user data access", async () => {
      const chain = makeChain([]);
      mockFrom.mockReturnValue(chain);

      await plaidService.getTransactionsForAccounts(
        [ACCOUNT_X_ID],
        new Date("2026-01-01"),
        new Date("2026-01-31"),
        USER_B_ID,
      );

      const eqCalls: [string, string][] = chain.eq.mock.calls as [string, string][];
      expect(eqCalls.some(([col, val]) => col === "user_id" && val === USER_B_ID)).toBe(true);
    });
  });
});
