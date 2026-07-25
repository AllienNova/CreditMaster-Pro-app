/**
 * mapWebDebtPlan / mapWebDebt — web -> mobile debt adapter (PARITY).
 *
 * The real web route (GET /api/financial/debt, withAuth) returns
 * data: { overview, debts, currentPlan, comparison, ... } (src/app/api/financial/debt/
 * route.ts). The mobile client previously declared it as a FLAT
 * { totalDebt, debts, monthlyPayments, projectedPayoffDate } shape, so the store read
 * `undefined` for every headline field (they actually live under overview / currentPlan),
 * and the debt screen hardcoded MOCK_DEBTS plus a fabricated STRATEGIES object. These
 * tests pin the nested mapping: getOverview flattens overview + currentPlan for the
 * store/reports, getDebtPlan carries the overview, real debts, and the real
 * avalanche/snowball comparison for the screen — nothing fabricated on failure.
 */

// Stub the module's side-effecting client import so financial.ts loads in isolation,
// while still driving api.get for the wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebDebt, mapWebDebtPlan, debtApi } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("mapWebDebt", () => {
  it("maps a real debt onto the mobile DebtAccount shape", () => {
    expect(
      mapWebDebt({
        id: "d1",
        name: "Visa Signature",
        type: "credit_card",
        balance: 5000,
        interestRate: 24.99,
        minimumPayment: 150,
      }),
    ).toEqual({
      id: "d1",
      name: "Visa Signature",
      type: "credit_card",
      balance: 5000,
      interestRate: 24.99,
      minimumPayment: 150,
    });
  });

  it("falls back to 'other' for an unknown or absent debt type rather than trusting it blindly", () => {
    expect(mapWebDebt({ id: "d2", type: "line_of_credit" }).type).toBe("other");
    expect(mapWebDebt({ id: "d3" }).type).toBe("other");
  });

  it("defaults absent numbers to 0 and an absent name to an empty string rather than inventing figures", () => {
    expect(mapWebDebt({ id: "d4" })).toEqual({
      id: "d4",
      name: "",
      type: "other",
      balance: 0,
      interestRate: 0,
      minimumPayment: 0,
    });
  });
});

describe("mapWebDebtPlan", () => {
  it("reads the summary from overview and the projected payoff date from currentPlan (not the top level)", () => {
    const plan = mapWebDebtPlan({
      overview: {
        totalDebt: 48000,
        totalMinimumPayments: 900,
        averageInterestRate: 12.5,
        highestInterestRate: 24.99,
        debtCount: 3,
      },
      currentPlan: { payoffDate: "2030-06-15T00:00:00.000Z" },
      debts: [
        {
          id: "d1",
          name: "Visa",
          type: "credit_card",
          balance: 5000,
          interestRate: 24.99,
          minimumPayment: 150,
        },
      ],
    });

    expect(plan.overview).toEqual({
      totalDebt: 48000,
      totalMinimumPayments: 900,
      averageInterestRate: 12.5,
      highestInterestRate: 24.99,
      debtCount: 3,
      projectedPayoffDate: "2030-06-15T00:00:00.000Z",
    });
    expect(plan.debts).toHaveLength(1);
    expect(plan.debts[0].name).toBe("Visa");
  });

  it("maps the real avalanche/snowball comparison metrics", () => {
    const plan = mapWebDebtPlan({
      comparison: {
        avalanche: {
          totalInterestPaid: 4231.4,
          totalMonths: 34,
          interestSaved: 612,
          monthsSaved: 4,
        },
        snowball: {
          totalInterestPaid: 5102.9,
          totalMonths: 41,
          interestSaved: 288,
          monthsSaved: 2,
        },
        recommendation: "avalanche",
        recommendationReason: "Avalanche saves $871 in interest",
      },
    });

    expect(plan.comparison).toEqual({
      avalanche: {
        totalInterestPaid: 4231.4,
        totalMonths: 34,
        interestSaved: 612,
        monthsSaved: 4,
      },
      snowball: {
        totalInterestPaid: 5102.9,
        totalMonths: 41,
        interestSaved: 288,
        monthsSaved: 2,
      },
      recommendation: "avalanche",
      recommendationReason: "Avalanche saves $871 in interest",
    });
  });

  it("yields comparison null when the route did not compute one", () => {
    const plan = mapWebDebtPlan({
      overview: { totalDebt: 1000 },
      debts: [{ id: "d1", balance: 1000 }],
    });
    expect(plan.comparison).toBeNull();
  });

  it("tolerates an empty payload without throwing, yielding zeroed overview and no debts", () => {
    const plan = mapWebDebtPlan({});
    expect(plan.overview).toEqual({
      totalDebt: 0,
      totalMinimumPayments: 0,
      averageInterestRate: 0,
      highestInterestRate: 0,
      debtCount: 0,
      projectedPayoffDate: "",
    });
    expect(plan.debts).toEqual([]);
    expect(plan.comparison).toBeNull();
  });

  it("defaults absent comparison plan metrics to 0 rather than fabricating them", () => {
    const plan = mapWebDebtPlan({ comparison: { recommendation: "snowball" } });
    expect(plan.comparison).toEqual({
      avalanche: {
        totalInterestPaid: 0,
        totalMonths: 0,
        interestSaved: 0,
        monthsSaved: 0,
      },
      snowball: {
        totalInterestPaid: 0,
        totalMonths: 0,
        interestSaved: 0,
        monthsSaved: 0,
      },
      recommendation: "snowball",
      recommendationReason: "",
    });
  });
});

describe("debtApi.getDebtPlan", () => {
  it("hits the real /financial/debt route with compare=true and the forwarded extra payment", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        overview: {
          totalDebt: 20000,
          totalMinimumPayments: 500,
          averageInterestRate: 10,
          highestInterestRate: 18,
          debtCount: 2,
        },
        currentPlan: { payoffDate: "2029-01-01T00:00:00.000Z" },
        debts: [{ id: "d1", name: "Card", type: "credit_card", balance: 8000 }],
        comparison: {
          avalanche: { totalInterestPaid: 1200, totalMonths: 30 },
          snowball: { totalInterestPaid: 1450, totalMonths: 33 },
          recommendation: "avalanche",
          recommendationReason: "Avalanche saves $250 in interest",
        },
      },
    });

    const res = await debtApi.getDebtPlan(300);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/financial/debt?compare=true&extraPayment=300",
    );
    expect(res.success).toBe(true);
    expect(res.data?.overview.totalDebt).toBe(20000);
    expect(res.data?.overview.projectedPayoffDate).toBe(
      "2029-01-01T00:00:00.000Z",
    );
    expect(res.data?.comparison?.avalanche.totalInterestPaid).toBe(1200);
    expect(res.data?.comparison?.snowball.totalMonths).toBe(33);
    expect(res.data?.debts[0].name).toBe("Card");
  });

  it("defaults the extra payment to 0 when none is supplied", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    await debtApi.getDebtPlan();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/financial/debt?compare=true&extraPayment=0",
    );
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await debtApi.getDebtPlan(0);

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});

describe("debtApi.getOverview", () => {
  it("flattens the nested overview + currentPlan into the store's shape (real values, not undefined)", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        overview: {
          totalDebt: 48000,
          totalMinimumPayments: 900,
          averageInterestRate: 12.5,
          debtCount: 3,
        },
        currentPlan: { payoffDate: "2030-06-15T00:00:00.000Z" },
        debts: [
          {
            id: "d1",
            name: "Visa",
            type: "credit_card",
            balance: 5000,
            interestRate: 24.99,
            minimumPayment: 150,
          },
        ],
      },
    });

    const res = await debtApi.getOverview();

    expect(mockApiGet).toHaveBeenCalledWith("/financial/debt");
    expect(res.success).toBe(true);
    // These previously read `undefined` because the client typed the route as flat.
    expect(res.data?.totalDebt).toBe(48000);
    expect(res.data?.monthlyPayments).toBe(900);
    expect(res.data?.projectedPayoffDate).toBe("2030-06-15T00:00:00.000Z");
    expect(res.data?.debts).toHaveLength(1);
    expect(res.data?.debts[0].minimumPayment).toBe(150);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_500", message: "Failed to fetch debt data" },
    });

    const res = await debtApi.getOverview();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Failed to fetch debt data");
  });
});
