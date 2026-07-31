/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Plaid Service Unit Tests
 *
 * Tests for bank account connection and transaction syncing via Plaid SDK.
 * Covers: createLinkToken, exchangePublicToken, getAccounts, syncAccounts,
 * getTransactions, syncTransactions, and private helpers (storeAccessToken,
 * getAccessToken, storeAccount, storeTransaction, mapDatabaseToAccount,
 * mapDatabaseToTransaction) exercised indirectly.
 */

// ---------------------------------------------------------------------------
// Environment variables (set BEFORE the module loads via jest.config.js env)
// ---------------------------------------------------------------------------
process.env.PLAID_CLIENT_ID = "test-client-id";
process.env.PLAID_SECRET = "test-secret";
process.env.PLAID_ENV = "sandbox";
process.env.NEXT_PUBLIC_APP_URL = "https://app.fynvita.test";

// ---------------------------------------------------------------------------
// Supabase mock (getSupabase from @/lib/supabase/client)
//
// plaid-service.ts reads plaid_items/financial_accounts via a lazily
// constructed service-role client (getServiceRoleClient(), built on
// @supabase/supabase-js's createClient — see plaid-service.ts's top-of-file
// comment for why: neither table is in the generated Database type, so the
// shared typed supabaseAdmin can't query them without touching types.ts or
// an `any` cast) and transactions via getSupabase() (@/lib/supabase/client).
// Both mocks share the SAME underlying `mockFrom` spy so every existing
// assertion below (`supabaseClient().from`) keeps working regardless of
// which client the production code actually calls.
// ---------------------------------------------------------------------------
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ from: mockFrom }),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

/** Helper: get the mock supabase client (shared spy, either import path) */
function supabaseClient() {
  return { from: mockFrom };
}

/**
 * Build a Supabase chain mock that resolves to {data, error}.
 * Each chainable method returns the same object.
 */
function buildChain(resolvedValue: { data: any; error: any }) {
  const chain: any = {};
  const methods = [
    "select",
    "insert",
    "upsert",
    "update",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "order",
    "limit",
    "single",
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve(resolvedValue);
  return chain;
}

// ---------------------------------------------------------------------------
// Plaid SDK mock
// ---------------------------------------------------------------------------
const mockLinkTokenCreate = jest.fn();
const mockItemPublicTokenExchange = jest.fn();
const mockAccountsGet = jest.fn();
const mockTransactionsGet = jest.fn();
const mockTransactionsSync = jest.fn();

jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => ({
    linkTokenCreate: mockLinkTokenCreate,
    itemPublicTokenExchange: mockItemPublicTokenExchange,
    accountsGet: mockAccountsGet,
    transactionsGet: mockTransactionsGet,
    transactionsSync: mockTransactionsSync,
  }),
}));

// ---------------------------------------------------------------------------
// Import under test (must come AFTER mocks are declared)
// ---------------------------------------------------------------------------
import { plaidService } from "../plaid-service";

// ============================================================================
// TESTS
// ============================================================================

describe("PlaidService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // createLinkToken
  // =========================================================================
  describe("createLinkToken", () => {
    it("should call plaidClient.linkTokenCreate with correct params", async () => {
      mockLinkTokenCreate.mockResolvedValue({
        data: {
          link_token: "link-sandbox-abc-123",
          expiration: "2026-12-31T00:00:00Z",
        },
      });

      await plaidService.createLinkToken("user-123");

      expect(mockLinkTokenCreate).toHaveBeenCalledTimes(1);
      const params = mockLinkTokenCreate.mock.calls[0][0];
      expect(params.user.client_user_id).toBe("user-123");
      expect(params.client_name).toBe("Fynvita");
      expect(params.language).toBe("en");
    });

    it("should return linkToken and expiration date", async () => {
      mockLinkTokenCreate.mockResolvedValue({
        data: {
          link_token: "link-sandbox-abc-123",
          expiration: "2026-12-31T00:00:00Z",
        },
      });

      const result = await plaidService.createLinkToken("user-123");

      expect(result.linkToken).toBe("link-sandbox-abc-123");
      expect(result.expiration).toBeInstanceOf(Date);
      expect(result.expiration.getFullYear()).toBe(2026);
    });

    it("should request transactions, auth, and identity products", async () => {
      mockLinkTokenCreate.mockResolvedValue({
        data: {
          link_token: "link-abc",
          expiration: "2026-12-31T00:00:00Z",
        },
      });

      await plaidService.createLinkToken("user-456");

      const params = mockLinkTokenCreate.mock.calls[0][0];
      expect(params.products).toHaveLength(3);
      // Products enum values
      expect(params.products).toContain("transactions");
      expect(params.products).toContain("auth");
      expect(params.products).toContain("identity");
    });

    it("should request US country code", async () => {
      mockLinkTokenCreate.mockResolvedValue({
        data: {
          link_token: "link-abc",
          expiration: "2026-12-31T00:00:00Z",
        },
      });

      await plaidService.createLinkToken("user-456");

      const params = mockLinkTokenCreate.mock.calls[0][0];
      expect(params.country_codes).toEqual(["US"]);
    });

    it("should include webhook URL", async () => {
      mockLinkTokenCreate.mockResolvedValue({
        data: {
          link_token: "link-abc",
          expiration: "2026-12-31T00:00:00Z",
        },
      });

      await plaidService.createLinkToken("user-123");

      const params = mockLinkTokenCreate.mock.calls[0][0];
      expect(params.webhook).toBe(
        "https://app.fynvita.test/api/financial/plaid/webhook",
      );
    });

    it("should throw when SDK call rejects", async () => {
      mockLinkTokenCreate.mockRejectedValue(new Error("SDK error"));

      await expect(plaidService.createLinkToken("user-123")).rejects.toThrow(
        "SDK error",
      );
    });

    it("should throw when SDK returns an API error", async () => {
      const plaidError = new Error("INVALID_REQUEST");
      (plaidError as any).response = {
        data: {
          error_type: "INVALID_REQUEST",
          error_code: "MISSING_FIELDS",
          error_message: "client_user_id is required",
        },
      };
      mockLinkTokenCreate.mockRejectedValue(plaidError);

      await expect(plaidService.createLinkToken("")).rejects.toThrow(
        "INVALID_REQUEST",
      );
    });
  });

  // =========================================================================
  // exchangePublicToken
  // =========================================================================
  describe("exchangePublicToken", () => {
    it("should call plaidClient.itemPublicTokenExchange with public_token", async () => {
      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: "access-sandbox-abc",
          item_id: "item-abc",
        },
      });
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      await plaidService.exchangePublicToken("public-token-123", "user-123");

      expect(mockItemPublicTokenExchange).toHaveBeenCalledTimes(1);
      expect(mockItemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: "public-token-123",
      });
    });

    it("should return itemId on success", async () => {
      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: "access-sandbox-abc",
          item_id: "item-abc",
        },
      });
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const itemId = await plaidService.exchangePublicToken(
        "public-token-123",
        "user-123",
      );

      expect(itemId).toBe("item-abc");
    });

    it("should store access token in plaid_items table", async () => {
      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: "access-sandbox-stored",
          item_id: "item-stored",
        },
      });
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      await plaidService.exchangePublicToken("public-token-123", "user-123");

      expect(supabaseClient().from).toHaveBeenCalledWith("plaid_items");
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          item_id: "item-stored",
          access_token: "access-sandbox-stored",
        }),
      );
    });

    it("should throw when SDK call fails", async () => {
      mockItemPublicTokenExchange.mockRejectedValue(
        new Error("INVALID_PUBLIC_TOKEN"),
      );

      await expect(
        plaidService.exchangePublicToken("bad-token", "user-123"),
      ).rejects.toThrow("INVALID_PUBLIC_TOKEN");
    });

    it("should throw when storeAccessToken DB insert fails", async () => {
      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: "access-sandbox-abc",
          item_id: "item-abc",
        },
      });
      const chain = buildChain({
        data: null,
        error: { message: "DB insert failed" },
      });
      supabaseClient().from.mockReturnValue(chain);

      await expect(
        plaidService.exchangePublicToken("public-token-123", "user-123"),
      ).rejects.toThrow("Failed to store access token");
    });
  });

  // =========================================================================
  // getAccounts
  // =========================================================================
  describe("getAccounts", () => {
    const mockAccountRow = {
      id: "item1_acc1",
      item_id: "item1",
      user_id: "user-123",
      account_id: "acc1",
      institution_id: "ins-chase",
      institution_name: "Chase",
      account_name: "Checking",
      account_type: "depository" as const,
      account_subtype: "checking",
      mask: "1234",
      current_balance: 5000,
      available_balance: 4800,
      currency: "USD",
      last_synced: "2026-02-20T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    };

    it("should query financial_accounts with user_id", async () => {
      const chain = buildChain({ data: [mockAccountRow], error: null });
      supabaseClient().from.mockReturnValue(chain);

      await plaidService.getAccounts("user-123");

      expect(supabaseClient().from).toHaveBeenCalledWith("financial_accounts");
      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(chain.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("should map database rows to PlaidAccount objects", async () => {
      const chain = buildChain({ data: [mockAccountRow], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const accounts = await plaidService.getAccounts("user-123");

      expect(accounts).toHaveLength(1);
      const acct = accounts[0];
      expect(acct.id).toBe("item1_acc1");
      expect(acct.itemId).toBe("item1");
      expect(acct.userId).toBe("user-123");
      expect(acct.accountId).toBe("acc1");
      expect(acct.institutionId).toBe("ins-chase");
      expect(acct.institutionName).toBe("Chase");
      expect(acct.accountName).toBe("Checking");
      expect(acct.accountType).toBe("depository");
      expect(acct.accountSubtype).toBe("checking");
      expect(acct.mask).toBe("1234");
      expect(acct.currentBalance).toBe(5000);
      expect(acct.availableBalance).toBe(4800);
      expect(acct.currency).toBe("USD");
      expect(acct.lastSynced).toBeInstanceOf(Date);
      expect(acct.createdAt).toBeInstanceOf(Date);
    });

    it("should handle null available_balance", async () => {
      const row = { ...mockAccountRow, available_balance: null };
      const chain = buildChain({ data: [row], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const accounts = await plaidService.getAccounts("user-123");

      expect(accounts[0].availableBalance).toBeUndefined();
    });

    it("should return empty array when no accounts exist", async () => {
      const chain = buildChain({ data: [], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const accounts = await plaidService.getAccounts("user-123");

      expect(accounts).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const accounts = await plaidService.getAccounts("user-123");

      expect(accounts).toEqual([]);
    });

    it("should throw when database query errors", async () => {
      const chain = buildChain({
        data: null,
        error: { message: "Connection timeout" },
      });
      supabaseClient().from.mockReturnValue(chain);

      await expect(plaidService.getAccounts("user-123")).rejects.toThrow(
        "Failed to fetch accounts",
      );
    });
  });

  // =========================================================================
  // syncAccounts
  // =========================================================================
  describe("syncAccounts", () => {
    const plaidSdkAccountsResponse = {
      data: {
        accounts: [
          {
            account_id: "plaid-acc-1",
            name: "Chase Checking",
            official_name: "TOTAL CHECKING",
            type: "depository",
            subtype: "checking",
            mask: "4567",
            balances: {
              current: 12000,
              available: 11500,
              iso_currency_code: "USD",
            },
          },
          {
            account_id: "plaid-acc-2",
            name: "Chase Credit",
            official_name: null,
            type: "credit",
            subtype: "credit card",
            mask: "8901",
            balances: {
              current: -1500,
              available: null,
              iso_currency_code: "USD",
            },
          },
        ],
        item: { institution_id: "ins_chase" },
      },
    };

    it("should fetch access token then call accountsGet", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue(plaidSdkAccountsResponse);

      await plaidService.syncAccounts("item-abc", "user-123");

      expect(mockAccountsGet).toHaveBeenCalledTimes(1);
      expect(mockAccountsGet).toHaveBeenCalledWith({
        access_token: "access-token-abc",
      });
    });

    it("should return mapped PlaidAccount objects", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue(plaidSdkAccountsResponse);

      const accounts = await plaidService.syncAccounts("item-abc", "user-123");

      expect(accounts).toHaveLength(2);
      expect(accounts[0].accountId).toBe("plaid-acc-1");
      expect(accounts[0].accountName).toBe("TOTAL CHECKING");
      expect(accounts[0].id).toBe("item-abc_plaid-acc-1");
      expect(accounts[0].userId).toBe("user-123");
      expect(accounts[0].accountType).toBe("depository");
      expect(accounts[0].currentBalance).toBe(12000);
      expect(accounts[0].availableBalance).toBe(11500);
      expect(accounts[0].currency).toBe("USD");
      expect(accounts[0].lastSynced).toBeInstanceOf(Date);
    });

    it("should use account.name when official_name is null", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue(plaidSdkAccountsResponse);

      const accounts = await plaidService.syncAccounts("item-abc", "user-123");

      expect(accounts[1].accountName).toBe("Chase Credit");
    });

    it("should upsert each account to financial_accounts", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue(plaidSdkAccountsResponse);

      await plaidService.syncAccounts("item-abc", "user-123");

      const financialAccountsCalls = supabaseClient().from.mock.calls.filter(
        (c: any[]) => c[0] === "financial_accounts",
      );
      expect(financialAccountsCalls).toHaveLength(2);
    });

    // Regression coverage: storeAccount's upsert error branch used to be an
    // empty comment (no-op) — a failed write reported success to
    // syncAccounts()'s caller while persisting nothing. Must now surface.
    it("throws when storing an account fails instead of silently swallowing the error", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue(plaidSdkAccountsResponse);

      await expect(
        plaidService.syncAccounts("item-abc", "user-123"),
      ).rejects.toThrow("Failed to store account");
    });

    it("should throw when access token not found", async () => {
      const tokenChain = buildChain({
        data: null,
        error: { message: "Not found" },
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      await expect(
        plaidService.syncAccounts("item-abc", "user-123"),
      ).rejects.toThrow("Access token not found");
    });

    it("should throw when SDK accountsGet rejects", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      mockAccountsGet.mockRejectedValue(new Error("ITEM_LOGIN_REQUIRED"));

      await expect(
        plaidService.syncAccounts("item-abc", "user-123"),
      ).rejects.toThrow("ITEM_LOGIN_REQUIRED");
    });

    it("should handle empty accounts array from Plaid", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      mockAccountsGet.mockResolvedValue({
        data: {
          accounts: [],
          item: { institution_id: "ins_test" },
        },
      });

      const accounts = await plaidService.syncAccounts("item-abc", "user-123");

      expect(accounts).toEqual([]);
    });

    it("should handle missing mask and fallback to empty string", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: "acc-no-mask",
              name: "No Mask",
              official_name: null,
              type: "depository",
              subtype: "checking",
              mask: null,
              balances: {
                current: 1000,
                available: 900,
                iso_currency_code: "USD",
              },
            },
          ],
          item: { institution_id: "ins_test" },
        },
      });

      const accounts = await plaidService.syncAccounts("item-abc", "user-123");

      expect(accounts[0].mask).toBe("");
    });

    it("should default currency to USD when iso_currency_code is null", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: "acc-no-currency",
              name: "No Currency",
              official_name: null,
              type: "depository",
              subtype: "savings",
              mask: "1111",
              balances: {
                current: 500,
                available: 500,
                iso_currency_code: null,
              },
            },
          ],
          item: { institution_id: "ins_test" },
        },
      });

      const accounts = await plaidService.syncAccounts("item-abc", "user-123");

      expect(accounts[0].currency).toBe("USD");
    });

    it("should handle missing subtype and fallback to empty string", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: "acc-no-subtype",
              name: "No Subtype",
              official_name: null,
              type: "depository",
              subtype: null,
              mask: "2222",
              balances: {
                current: 100,
                available: 100,
                iso_currency_code: "USD",
              },
            },
          ],
          item: { institution_id: "ins_test" },
        },
      });

      const accounts = await plaidService.syncAccounts("item-abc", "user-123");

      expect(accounts[0].accountSubtype).toBe("");
    });

    it("should handle null current balance as 0", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockAccountsGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: "acc-null-balance",
              name: "Empty Account",
              official_name: null,
              type: "depository",
              subtype: "checking",
              mask: "0000",
              balances: {
                current: null,
                available: null,
                iso_currency_code: "USD",
              },
            },
          ],
          item: { institution_id: "ins_test" },
        },
      });

      const accounts = await plaidService.syncAccounts("item-abc", "user-123");

      expect(accounts[0].currentBalance).toBe(0);
      expect(accounts[0].availableBalance).toBeUndefined();
    });
  });

  // =========================================================================
  // getTransactions
  // =========================================================================
  describe("getTransactions", () => {
    const mockTransactionRow = {
      id: "item1_txn1",
      account_id: "acc1",
      user_id: "user-123",
      transaction_id: "txn1",
      date: "2026-02-15T00:00:00Z",
      amount: 42.5,
      name: "Starbucks",
      merchant_name: "Starbucks Corp",
      category: ["Food and Drink", "Coffee"],
      pending: false,
      payment_channel: "in store",
      location: {
        city: "New York",
        region: "NY",
        country: "US",
      },
      created_at: "2026-02-15T12:00:00Z",
    };

    it("should query transactions table with filters", async () => {
      const chain = buildChain({ data: [mockTransactionRow], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const start = new Date("2026-02-01");
      const end = new Date("2026-02-28");

      await plaidService.getTransactions("acc1", start, end, "user-123");

      expect(supabaseClient().from).toHaveBeenCalledWith("transactions");
      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).toHaveBeenCalledWith("account_id", "acc1");
      expect(chain.gte).toHaveBeenCalledWith("date", start.toISOString());
      expect(chain.lte).toHaveBeenCalledWith("date", end.toISOString());
      expect(chain.order).toHaveBeenCalledWith("date", { ascending: false });
    });

    it("should map database rows to PlaidTransaction objects", async () => {
      const chain = buildChain({ data: [mockTransactionRow], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const transactions = await plaidService.getTransactions(
        "acc1",
        new Date("2026-02-01"),
        new Date("2026-02-28"),
        "user-123",
      );

      expect(transactions).toHaveLength(1);
      const txn = transactions[0];
      expect(txn.id).toBe("item1_txn1");
      expect(txn.accountId).toBe("acc1");
      expect(txn.userId).toBe("user-123");
      expect(txn.transactionId).toBe("txn1");
      expect(txn.date).toBeInstanceOf(Date);
      expect(txn.amount).toBe(42.5);
      expect(txn.name).toBe("Starbucks");
      expect(txn.merchantName).toBe("Starbucks Corp");
      expect(txn.category).toEqual(["Food and Drink", "Coffee"]);
      expect(txn.pending).toBe(false);
      expect(txn.paymentChannel).toBe("in store");
      expect(txn.location).toEqual({
        city: "New York",
        region: "NY",
        country: "US",
      });
      expect(txn.createdAt).toBeInstanceOf(Date);
    });

    it("should handle null merchant_name", async () => {
      const row = { ...mockTransactionRow, merchant_name: null };
      const chain = buildChain({ data: [row], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const transactions = await plaidService.getTransactions(
        "acc1",
        new Date("2026-02-01"),
        new Date("2026-02-28"),
        "user-123",
      );

      expect(transactions[0].merchantName).toBeUndefined();
    });

    it("should handle null category", async () => {
      const row = { ...mockTransactionRow, category: null };
      const chain = buildChain({ data: [row], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const transactions = await plaidService.getTransactions(
        "acc1",
        new Date("2026-02-01"),
        new Date("2026-02-28"),
        "user-123",
      );

      expect(transactions[0].category).toEqual([]);
    });

    it("should handle null location", async () => {
      const row = { ...mockTransactionRow, location: null };
      const chain = buildChain({ data: [row], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const transactions = await plaidService.getTransactions(
        "acc1",
        new Date("2026-02-01"),
        new Date("2026-02-28"),
        "user-123",
      );

      expect(transactions[0].location).toBeUndefined();
    });

    it("should return empty array when no transactions", async () => {
      const chain = buildChain({ data: [], error: null });
      supabaseClient().from.mockReturnValue(chain);

      const transactions = await plaidService.getTransactions(
        "acc1",
        new Date("2026-02-01"),
        new Date("2026-02-28"),
        "user-123",
      );

      expect(transactions).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const transactions = await plaidService.getTransactions(
        "acc1",
        new Date("2026-02-01"),
        new Date("2026-02-28"),
        "user-123",
      );

      expect(transactions).toEqual([]);
    });

    it("should throw when database query errors", async () => {
      const chain = buildChain({
        data: null,
        error: { message: "Query failed" },
      });
      supabaseClient().from.mockReturnValue(chain);

      await expect(
        plaidService.getTransactions(
          "acc1",
          new Date("2026-02-01"),
          new Date("2026-02-28"),
          "user-123",
        ),
      ).rejects.toThrow("Failed to fetch transactions");
    });
  });

  // =========================================================================
  // syncTransactions
  // =========================================================================
  describe("syncTransactions", () => {
    const plaidSdkTransactionsResponse = {
      data: {
        transactions: [
          {
            transaction_id: "txn-plaid-1",
            account_id: "acc-plaid-1",
            date: "2026-02-15",
            amount: 15.99,
            name: "Amazon",
            merchant_name: "Amazon.com",
            category: ["Shops", "Online Marketplaces"],
            pending: false,
            payment_channel: "online",
            location: {
              address: null,
              city: "Seattle",
              region: "WA",
              postal_code: null,
              country: "US",
            },
          },
          {
            transaction_id: "txn-plaid-2",
            account_id: "acc-plaid-2",
            date: "2026-02-16",
            amount: 8.5,
            name: "Uber",
            merchant_name: "Uber Technologies",
            category: ["Transportation", "Ride Share"],
            pending: true,
            payment_channel: "online",
            location: null,
          },
        ],
      },
    };

    it("should fetch access token then call transactionsGet", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue(plaidSdkTransactionsResponse);

      await plaidService.syncTransactions("item-abc", "user-123");

      expect(mockTransactionsGet).toHaveBeenCalledTimes(1);
      const params = mockTransactionsGet.mock.calls[0][0];
      expect(params.access_token).toBe("access-token-abc");
      expect(params.start_date).toBeTruthy();
      expect(params.end_date).toBeTruthy();
    });

    it("should send date range in params", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-xyz" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue(plaidSdkTransactionsResponse);

      await plaidService.syncTransactions("item-abc", "user-123", 60);

      const params = mockTransactionsGet.mock.calls[0][0];
      const startDate = new Date(params.start_date);
      const endDate = new Date(params.end_date);
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it("should default to 30 days when days not specified", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue(plaidSdkTransactionsResponse);

      await plaidService.syncTransactions("item-abc", "user-123");

      const params = mockTransactionsGet.mock.calls[0][0];
      const startDate = new Date(params.start_date);
      const endDate = new Date(params.end_date);
      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeCloseTo(30, 0);
    });

    it("should return mapped PlaidTransaction objects", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue(plaidSdkTransactionsResponse);

      const transactions = await plaidService.syncTransactions(
        "item-abc",
        "user-123",
      );

      expect(transactions).toHaveLength(2);

      const txn1 = transactions[0];
      expect(txn1.id).toBe("item-abc_txn-plaid-1");
      expect(txn1.accountId).toBe("acc-plaid-1");
      expect(txn1.userId).toBe("user-123");
      expect(txn1.transactionId).toBe("txn-plaid-1");
      expect(txn1.date).toBeInstanceOf(Date);
      expect(txn1.amount).toBe(15.99);
      expect(txn1.name).toBe("Amazon");
      expect(txn1.merchantName).toBe("Amazon.com");
      expect(txn1.category).toEqual(["Shops", "Online Marketplaces"]);
      expect(txn1.pending).toBe(false);
      expect(txn1.paymentChannel).toBe("online");
      expect(txn1.createdAt).toBeInstanceOf(Date);
    });

    it("should map location fields from SDK response", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue(plaidSdkTransactionsResponse);

      const transactions = await plaidService.syncTransactions(
        "item-abc",
        "user-123",
      );

      // First transaction has location
      expect(transactions[0].location).toEqual({
        address: undefined,
        city: "Seattle",
        region: "WA",
        postalCode: undefined,
        country: "US",
      });

      // Second transaction has null location
      expect(transactions[1].location).toBeUndefined();
    });

    it("should handle null category from Plaid as empty array", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue({
        data: {
          transactions: [
            {
              transaction_id: "txn-no-cat",
              account_id: "acc1",
              date: "2026-02-15",
              amount: 10,
              name: "Unknown",
              merchant_name: null,
              category: null,
              pending: false,
              payment_channel: "other",
              location: null,
            },
          ],
        },
      });

      const transactions = await plaidService.syncTransactions(
        "item-abc",
        "user-123",
      );

      expect(transactions[0].category).toEqual([]);
    });

    it("should handle null merchant_name from SDK", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue({
        data: {
          transactions: [
            {
              transaction_id: "txn-no-merchant",
              account_id: "acc1",
              date: "2026-02-15",
              amount: 25,
              name: "POS Debit",
              merchant_name: null,
              category: ["Shops"],
              pending: false,
              payment_channel: "in store",
              location: null,
            },
          ],
        },
      });

      const transactions = await plaidService.syncTransactions(
        "item-abc",
        "user-123",
      );

      expect(transactions[0].merchantName).toBeUndefined();
    });

    it("should upsert each transaction to transactions table", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      const storeChain = buildChain({ data: null, error: null });

      supabaseClient().from.mockImplementation((table: string) => {
        if (table === "plaid_items") return tokenChain;
        return storeChain;
      });

      mockTransactionsGet.mockResolvedValue(plaidSdkTransactionsResponse);

      await plaidService.syncTransactions("item-abc", "user-123");

      const txnCalls = supabaseClient().from.mock.calls.filter(
        (c: any[]) => c[0] === "transactions",
      );
      expect(txnCalls).toHaveLength(2);
    });

    it("should throw when access token not found", async () => {
      const tokenChain = buildChain({
        data: null,
        error: { message: "Not found" },
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      await expect(
        plaidService.syncTransactions("item-abc", "user-123"),
      ).rejects.toThrow("Access token not found");
    });

    it("should throw when SDK transactionsGet rejects", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      mockTransactionsGet.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidService.syncTransactions("item-abc", "user-123"),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should handle empty transactions array from Plaid", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      mockTransactionsGet.mockResolvedValue({
        data: { transactions: [] },
      });

      const transactions = await plaidService.syncTransactions(
        "item-abc",
        "user-123",
      );

      expect(transactions).toEqual([]);
    });

    it("should handle Plaid rate limit error", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      const rateLimitError = new Error("RATE_LIMIT_EXCEEDED");
      (rateLimitError as any).response = {
        status: 429,
        data: {
          error_type: "RATE_LIMIT_EXCEEDED",
          error_code: "TRANSACTIONS_LIMIT",
        },
      };
      mockTransactionsGet.mockRejectedValue(rateLimitError);

      await expect(
        plaidService.syncTransactions("item-abc", "user-123"),
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
  });

  // =========================================================================
  // Database mapping edge cases
  // =========================================================================
  describe("Database Mapping Edge Cases", () => {
    it("should handle multiple accounts with diverse types", async () => {
      const rows = [
        {
          id: "a1",
          item_id: "item1",
          user_id: "user-123",
          account_id: "acc1",
          institution_id: "ins1",
          institution_name: "Bank A",
          account_name: "Checking",
          account_type: "depository" as const,
          account_subtype: "checking",
          mask: "1111",
          current_balance: 1000,
          available_balance: 900,
          currency: "USD",
          last_synced: "2026-02-20T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "a2",
          item_id: "item1",
          user_id: "user-123",
          account_id: "acc2",
          institution_id: "ins1",
          institution_name: "Bank A",
          account_name: "Credit Card",
          account_type: "credit" as const,
          account_subtype: "credit card",
          mask: "2222",
          current_balance: -500,
          available_balance: null,
          currency: "USD",
          last_synced: "2026-02-20T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "a3",
          item_id: "item2",
          user_id: "user-123",
          account_id: "acc3",
          institution_id: "ins2",
          institution_name: "Bank B",
          account_name: "Investment",
          account_type: "investment" as const,
          account_subtype: "brokerage",
          mask: "3333",
          current_balance: 50000,
          available_balance: null,
          currency: "USD",
          last_synced: "2026-02-20T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];

      const chain = buildChain({ data: rows, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const accounts = await plaidService.getAccounts("user-123");

      expect(accounts).toHaveLength(3);
      expect(accounts[0].accountType).toBe("depository");
      expect(accounts[1].accountType).toBe("credit");
      expect(accounts[2].accountType).toBe("investment");
      expect(accounts[1].availableBalance).toBeUndefined();
      expect(accounts[2].availableBalance).toBeUndefined();
    });

    it("should handle multiple transactions with varied data", async () => {
      const rows = [
        {
          id: "t1",
          account_id: "acc1",
          user_id: "user-123",
          transaction_id: "txn1",
          date: "2026-02-10T00:00:00Z",
          amount: 100,
          name: "Purchase 1",
          merchant_name: "Store A",
          category: ["Shops"],
          pending: false,
          payment_channel: "in store",
          location: { city: "NYC" },
          created_at: "2026-02-10T00:00:00Z",
        },
        {
          id: "t2",
          account_id: "acc1",
          user_id: "user-123",
          transaction_id: "txn2",
          date: "2026-02-11T00:00:00Z",
          amount: -50,
          name: "Refund",
          merchant_name: null,
          category: null,
          pending: true,
          payment_channel: "other",
          location: null,
          created_at: "2026-02-11T00:00:00Z",
        },
      ];

      const chain = buildChain({ data: rows, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const transactions = await plaidService.getTransactions(
        "acc1",
        new Date("2026-02-01"),
        new Date("2026-02-28"),
        "user-123",
      );

      expect(transactions).toHaveLength(2);
      expect(transactions[0].merchantName).toBe("Store A");
      expect(transactions[0].category).toEqual(["Shops"]);
      expect(transactions[0].location).toEqual({ city: "NYC" });
      expect(transactions[1].merchantName).toBeUndefined();
      expect(transactions[1].category).toEqual([]);
      expect(transactions[1].location).toBeUndefined();
      expect(transactions[1].pending).toBe(true);
      expect(transactions[1].amount).toBe(-50);
    });
  });

  // =========================================================================
  // SDK Error Handling
  // =========================================================================
  describe("SDK Error Handling", () => {
    it("should propagate PlaidError with error_type and error_code", async () => {
      const plaidError = new Error("INVALID_INPUT");
      (plaidError as any).response = {
        status: 400,
        data: {
          error_type: "INVALID_INPUT",
          error_code: "INVALID_ACCESS_TOKEN",
          error_message: "the access token is not valid",
          display_message: null,
          request_id: "req-123",
        },
      };
      mockLinkTokenCreate.mockRejectedValue(plaidError);

      await expect(plaidService.createLinkToken("user-123")).rejects.toThrow(
        "INVALID_INPUT",
      );
    });

    it("should propagate ITEM_LOGIN_REQUIRED error", async () => {
      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      const plaidError = new Error("ITEM_LOGIN_REQUIRED");
      (plaidError as any).response = {
        status: 400,
        data: {
          error_type: "ITEM_ERROR",
          error_code: "ITEM_LOGIN_REQUIRED",
          error_message: "the login details of this item have changed",
        },
      };
      mockAccountsGet.mockRejectedValue(plaidError);

      await expect(
        plaidService.syncAccounts("item-abc", "user-123"),
      ).rejects.toThrow("ITEM_LOGIN_REQUIRED");
    });

    it("should propagate network errors from SDK", async () => {
      mockLinkTokenCreate.mockRejectedValue(
        new Error("connect ECONNREFUSED 127.0.0.1:443"),
      );

      await expect(plaidService.createLinkToken("user-123")).rejects.toThrow(
        "connect ECONNREFUSED",
      );
    });

    it("should propagate timeout errors from SDK", async () => {
      const timeoutError = new Error("timeout of 10000ms exceeded");
      (timeoutError as any).code = "ECONNABORTED";
      mockTransactionsGet.mockRejectedValue(timeoutError);

      const tokenChain = buildChain({
        data: { access_token: "access-token-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(tokenChain);

      await expect(
        plaidService.syncTransactions("item-abc", "user-123"),
      ).rejects.toThrow("timeout of 10000ms exceeded");
    });
  });

  // =========================================================================
  // Singleton export
  // =========================================================================
  describe("Module Exports", () => {
    it("should export plaidService as a singleton", () => {
      expect(plaidService).toBeDefined();
      expect(typeof plaidService.createLinkToken).toBe("function");
      expect(typeof plaidService.exchangePublicToken).toBe("function");
      expect(typeof plaidService.getAccounts).toBe("function");
      expect(typeof plaidService.syncAccounts).toBe("function");
      expect(typeof plaidService.getTransactions).toBe("function");
      expect(typeof plaidService.syncTransactions).toBe("function");
    });

    it("should export default as the same singleton", () => {
      const defaultExport = require("../plaid-service").default;
      expect(defaultExport).toBe(plaidService);
    });
  });
});
