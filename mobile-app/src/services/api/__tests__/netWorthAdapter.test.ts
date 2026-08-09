/**
 * mapWebAccountsToNetWorth — web -> mobile net-worth adapter (PARITY).
 *
 * The real web route (GET /api/financial/accounts, withPermission "financial:read")
 * returns PlaidAccount[] straight through as the response data. Each account carries a
 * Plaid accountType ("depository" | "credit" | "loan" | "investment") and a
 * currentBalance. The mobile Net Worth screen previously classified accounts by balance
 * SIGN and, on any gap, silently rendered hardcoded MOCK_ASSETS / MOCK_LIABILITIES /
 * MOCK_HISTORY. That sign rule is wrong for Plaid — credit and loan balances are
 * positive amounts owed — so debts were miscounted as assets. These tests pin the
 * accountType-based classification (matching src/lib/financial/financial-service.ts) and
 * prove getNetWorth hits the real path and never fabricates on failure.
 */

// Stub the module's side-effecting client import so financial.ts loads in isolation,
// while still driving api.get for the getNetWorth wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebAccountsToNetWorth, financialOverviewApi } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("mapWebAccountsToNetWorth", () => {
  it("classifies depository and investment accounts as assets, summed at currentBalance", () => {
    const nw = mapWebAccountsToNetWorth([
      {
        id: "a1",
        accountName: "Checking",
        accountType: "depository",
        accountSubtype: "checking",
        currentBalance: 10000,
      },
      {
        id: "a2",
        accountName: "Brokerage",
        accountType: "investment",
        accountSubtype: "brokerage",
        currentBalance: 40000,
      },
    ]);

    expect(nw.assets).toEqual([
      {
        id: "a1",
        name: "Checking",
        subtype: "checking",
        accountType: "depository",
        value: 10000,
      },
      {
        id: "a2",
        name: "Brokerage",
        subtype: "brokerage",
        accountType: "investment",
        value: 40000,
      },
    ]);
    expect(nw.liabilities).toEqual([]);
    expect(nw.totalAssets).toBe(50000);
    expect(nw.totalLiabilities).toBe(0);
    expect(nw.netWorth).toBe(50000);
  });

  it("classifies credit and loan accounts as liabilities, summed at |currentBalance| (Plaid debts are positive amounts owed)", () => {
    const nw = mapWebAccountsToNetWorth([
      {
        id: "l1",
        accountName: "Credit Card",
        accountType: "credit",
        accountSubtype: "credit card",
        currentBalance: 5000,
      },
      {
        id: "l2",
        accountName: "Auto Loan",
        accountType: "loan",
        accountSubtype: "auto",
        currentBalance: 15000,
      },
    ]);

    expect(nw.liabilities).toEqual([
      {
        id: "l1",
        name: "Credit Card",
        subtype: "credit card",
        accountType: "credit",
        value: 5000,
      },
      {
        id: "l2",
        name: "Auto Loan",
        subtype: "auto",
        accountType: "loan",
        value: 15000,
      },
    ]);
    expect(nw.assets).toEqual([]);
    expect(nw.totalLiabilities).toBe(20000);
  });

  it("normalizes a negative liability balance to its absolute magnitude", () => {
    const nw = mapWebAccountsToNetWorth([
      {
        id: "l3",
        accountName: "Student Loan",
        accountType: "loan",
        currentBalance: -22000,
      },
    ]);
    expect(nw.liabilities[0].value).toBe(22000);
    expect(nw.totalLiabilities).toBe(22000);
  });

  it("computes net worth as total assets minus total liabilities", () => {
    const nw = mapWebAccountsToNetWorth([
      { id: "a", accountName: "Savings", accountType: "depository", currentBalance: 30000 },
      { id: "l", accountName: "Mortgage", accountType: "loan", currentBalance: 12000 },
    ]);
    expect(nw.totalAssets).toBe(30000);
    expect(nw.totalLiabilities).toBe(12000);
    expect(nw.netWorth).toBe(18000);
  });

  it("excludes accounts with an unknown or absent accountType from both buckets (matches web)", () => {
    const nw = mapWebAccountsToNetWorth([
      { id: "x", accountName: "Mystery", accountType: "brokerage-esque", currentBalance: 999 },
      { id: "y", accountName: "No Type", currentBalance: 500 },
      { id: "a", accountName: "Checking", accountType: "depository", currentBalance: 1000 },
    ]);
    expect(nw.assets).toHaveLength(1);
    expect(nw.assets[0].name).toBe("Checking");
    expect(nw.liabilities).toEqual([]);
    expect(nw.totalAssets).toBe(1000);
    expect(nw.netWorth).toBe(1000);
  });

  it("defaults an absent balance to 0 and an absent name to an empty string rather than inventing figures", () => {
    const nw = mapWebAccountsToNetWorth([
      { accountId: "acc-1", accountType: "depository" },
    ]);
    expect(nw.assets[0]).toEqual({
      id: "acc-1",
      name: "",
      subtype: "",
      accountType: "depository",
      value: 0,
    });
    expect(nw.totalAssets).toBe(0);
  });

  it("returns empty buckets and zero totals for an empty account list", () => {
    const nw = mapWebAccountsToNetWorth([]);
    expect(nw.assets).toEqual([]);
    expect(nw.liabilities).toEqual([]);
    expect(nw.totalAssets).toBe(0);
    expect(nw.totalLiabilities).toBe(0);
    expect(nw.netWorth).toBe(0);
  });
});

describe("financialOverviewApi.getNetWorth", () => {
  it("hits the real /financial/accounts route and adapts the bare account array", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: [
        {
          id: "a1",
          accountName: "Checking",
          accountType: "depository",
          currentBalance: 8000,
        },
        {
          id: "l1",
          accountName: "Credit Card",
          accountType: "credit",
          currentBalance: 3000,
        },
      ],
    });

    const res = await financialOverviewApi.getNetWorth();

    expect(mockApiGet).toHaveBeenCalledWith("/financial/accounts");
    expect(res.success).toBe(true);
    expect(res.data?.totalAssets).toBe(8000);
    expect(res.data?.totalLiabilities).toBe(3000);
    expect(res.data?.netWorth).toBe(5000);
  });

  it("tolerates a non-array data payload without throwing, yielding an empty net worth", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });

    const res = await financialOverviewApi.getNetWorth();

    expect(res.success).toBe(true);
    expect(res.data?.assets).toEqual([]);
    expect(res.data?.netWorth).toBe(0);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await financialOverviewApi.getNetWorth();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
