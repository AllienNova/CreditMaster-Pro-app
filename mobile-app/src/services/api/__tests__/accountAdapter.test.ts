/**
 * mapWebAccount — web -> mobile credit-account (tradeline) adapter (M2-1).
 *
 * The real web route (GET /api/credit-repair/accounts, withAuth) returns accounts
 * shaped from the credit_accounts row: `creditorName`, `accountType`, `balance`,
 * `creditLimit`, `paymentStatus`, `openedDate`, and a server-computed `ageMonths`
 * (whole months since opened_date, null when opened_date is unknown). The mobile
 * Credit Age screen speaks `name`, `type`, `balance`, `creditLimit`, `status`,
 * `openDate`, `ageMonths`, and a derived `ageYears`. These tests pin the field map,
 * prove `ageYears` is derived only when the age is genuinely known (null / negative
 * / non-finite ageMonths -> null age, NEVER a fabricated 0y), prove null balances
 * and limits stay null rather than a fabricated $0, and prove getAccounts fetches
 * the right path and never fabricates on failure or on a non-array payload.
 */

// Stub the module's side-effecting client import so creditRepair.ts loads in
// isolation, while still driving api.get for the getAccounts wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import {
  mapWebAccount,
  creditRepairApi,
  type CreditAccount,
  type WebCreditAccount,
} from "../creditRepair";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebCreditAccount = {
  id: "a1",
  creditorName: "Bank of America",
  accountType: "Credit Card",
  balance: 1200,
  creditLimit: 5000,
  paymentStatus: "current",
  openedDate: "2016-03-15",
  ageMonths: 118,
};

describe("mapWebAccount — field map", () => {
  it("renames creditorName/accountType/paymentStatus/openedDate and passes id through", () => {
    expect(mapWebAccount(base)).toEqual<CreditAccount>({
      id: "a1",
      name: "Bank of America",
      type: "Credit Card",
      balance: 1200,
      creditLimit: 5000,
      status: "current",
      openDate: "2016-03-15",
      ageMonths: 118,
      ageYears: 9, // floor(118 / 12)
    });
  });

  it("derives whole ageYears from ageMonths (floor), keeping ageMonths as the total", () => {
    // 5 months -> 0 whole years, but a real, known 5-month age (not unknown).
    const m = mapWebAccount({ ...base, ageMonths: 5 });
    expect(m.ageMonths).toBe(5);
    expect(m.ageYears).toBe(0);

    // 78 months -> 6 whole years.
    const n = mapWebAccount({ ...base, ageMonths: 78 });
    expect(n.ageYears).toBe(6);
  });

  it("defaults an absent creditorName/accountType/paymentStatus to empty strings, not made-up values", () => {
    const m = mapWebAccount({ id: "a2", ageMonths: 24 });
    expect(m.name).toBe("");
    expect(m.type).toBe("");
    expect(m.status).toBe("");
  });
});

describe("mapWebAccount — honest unknown age (null ageMonths -> null age, never 0y)", () => {
  it("keeps a null ageMonths as a null age rather than coercing to 0y", () => {
    const m = mapWebAccount({ ...base, ageMonths: null });
    expect(m.ageMonths).toBeNull();
    expect(m.ageYears).toBeNull();
  });

  it("treats an absent ageMonths as unknown, not 0", () => {
    const raw: WebCreditAccount = {
      id: "a3",
      creditorName: "No Age Bank",
      accountType: "Installment",
    };
    const m = mapWebAccount(raw);
    expect(m.ageMonths).toBeNull();
    expect(m.ageYears).toBeNull();
  });

  it("treats a negative ageMonths (a future opened_date — data error) as unknown, not -1y", () => {
    const m = mapWebAccount({ ...base, ageMonths: -3 });
    expect(m.ageMonths).toBeNull();
    expect(m.ageYears).toBeNull();
  });

  it("treats a NaN or Infinity ageMonths as unknown", () => {
    expect(mapWebAccount({ ...base, ageMonths: Number.NaN }).ageYears).toBeNull();
    expect(
      mapWebAccount({ ...base, ageMonths: Number.POSITIVE_INFINITY }).ageYears,
    ).toBeNull();
  });

  it("keeps a genuine zero age — 0 months is a real, known age, not unknown", () => {
    const m = mapWebAccount({ ...base, ageMonths: 0 });
    expect(m.ageMonths).toBe(0);
    expect(m.ageYears).toBe(0);
  });
});

describe("mapWebAccount — nullable money passes through (null stays null, never $0)", () => {
  it("keeps a null balance and a null credit limit as null, not a fabricated $0", () => {
    const m = mapWebAccount({ ...base, balance: null, creditLimit: null });
    expect(m.balance).toBeNull();
    expect(m.creditLimit).toBeNull();
  });

  it("treats a NaN or Infinity balance/limit as null rather than rendering it", () => {
    const m = mapWebAccount({
      ...base,
      balance: Number.NaN,
      creditLimit: Number.POSITIVE_INFINITY,
    });
    expect(m.balance).toBeNull();
    expect(m.creditLimit).toBeNull();
  });

  it("keeps a genuine zero balance — 0 is a real value, not a missing one", () => {
    const m = mapWebAccount({ ...base, balance: 0 });
    expect(m.balance).toBe(0);
  });

  it("keeps a null openedDate as null rather than a made-up date", () => {
    const m = mapWebAccount({ ...base, openedDate: null });
    expect(m.openDate).toBeNull();
  });
});

describe("creditRepairApi.getAccounts", () => {
  it("fetches the accounts route and adapts the payload onto the mobile shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        accounts: [
          {
            id: "a1",
            creditorName: "Bank of America",
            accountType: "Credit Card",
            balance: 1200,
            creditLimit: 5000,
            paymentStatus: "current",
            openedDate: "2016-03-15",
            ageMonths: 118,
          },
          {
            id: "a2",
            creditorName: "Wells Fargo",
            accountType: "Installment",
            balance: null,
            creditLimit: null,
            paymentStatus: "closed",
            openedDate: null,
            ageMonths: null,
          },
        ],
      },
    });

    const res = await creditRepairApi.getAccounts();

    expect(mockApiGet).toHaveBeenCalledWith("/credit-repair/accounts");
    expect(res.success).toBe(true);
    expect(res.data?.accounts).toEqual<CreditAccount[]>([
      {
        id: "a1",
        name: "Bank of America",
        type: "Credit Card",
        balance: 1200,
        creditLimit: 5000,
        status: "current",
        openDate: "2016-03-15",
        ageMonths: 118,
        ageYears: 9,
      },
      {
        id: "a2",
        name: "Wells Fargo",
        type: "Installment",
        balance: null,
        creditLimit: null,
        status: "closed",
        openDate: null,
        ageMonths: null,
        ageYears: null,
      },
    ]);
  });

  it("returns an empty list when the payload accounts are not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    const res = await creditRepairApi.getAccounts();
    expect(res.success).toBe(true);
    expect(res.data?.accounts).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await creditRepairApi.getAccounts();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
