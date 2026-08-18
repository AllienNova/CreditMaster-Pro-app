/**
 * mapWebBill — web -> mobile bill adapter (PARITY-P2).
 *
 * The real web route (GET /api/financial/bills, withPermission "financial:read")
 * returns recurring bills shaped by src/lib/financial/types/bill.types.ts `Bill`
 * (mapped by bill-detection-service.mapBillFromDb): `merchantName` and a
 * `nextDueDate` Date that serializes to an ISO string over HTTP. The mobile
 * Payments screen speaks `merchant` and `dueDate`. These tests pin the field map
 * and prove getBills hits the real route (with activeOnly=true), never fabricates
 * on failure, and never invents a merchant, amount, or due date for a partial
 * payload — the payment-history metrics (on-time %/late) the screen dropped have
 * no field here to fabricate from.
 */

// Stub the module's side-effecting client import so financial.ts loads in
// isolation, while still driving api.get for the getBills wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebBill, billsApi, type WebBill } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebBill = {
  id: "b1",
};

describe("mapWebBill", () => {
  it("maps web merchantName -> merchant and nextDueDate -> dueDate, preserving id/amount/category/autopay", () => {
    const m = mapWebBill({
      ...base,
      merchantName: "Pacific Gas & Electric",
      amount: 120.5,
      category: "utilities",
      nextDueDate: "2026-03-20T00:00:00.000Z",
      isAutoPay: true,
    });
    expect(m.id).toBe("b1");
    expect(m.merchant).toBe("Pacific Gas & Electric");
    expect(m.amount).toBe(120.5);
    expect(m.category).toBe("utilities");
    expect(m.dueDate).toBe("2026-03-20T00:00:00.000Z");
    expect(m.isAutoPay).toBe(true);
  });

  it("defaults an absent merchant to an empty string rather than a made-up name", () => {
    expect(mapWebBill({ ...base }).merchant).toBe("");
    expect(mapWebBill({ ...base, merchantName: "Comcast" }).merchant).toBe(
      "Comcast",
    );
  });

  it("defaults an absent amount to 0 and an absent due date to an empty string rather than inventing figures", () => {
    const m = mapWebBill({ ...base });
    expect(m.amount).toBe(0);
    expect(m.dueDate).toBe("");
    expect(m.category).toBe("");
  });

  it("defaults absent autopay to false rather than assuming a bill is automated", () => {
    expect(mapWebBill({ ...base }).isAutoPay).toBe(false);
    expect(mapWebBill({ ...base, isAutoPay: false }).isAutoPay).toBe(false);
    expect(mapWebBill({ ...base, isAutoPay: true }).isAutoPay).toBe(true);
  });
});

describe("billsApi.getBills", () => {
  it("requests the real route with activeOnly=true and adapts the web bills array onto the mobile shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        bills: [
          {
            id: "b1",
            merchantName: "Pacific Gas & Electric",
            amount: 120,
            category: "utilities",
            nextDueDate: "2026-03-20T00:00:00.000Z",
            isAutoPay: true,
            frequency: "monthly",
            status: "active",
          },
          {
            id: "b2",
            merchantName: "State Farm",
            amount: 85,
            category: "insurance",
            nextDueDate: "2026-03-25T00:00:00.000Z",
            isAutoPay: false,
            frequency: "yearly",
            status: "active",
          },
        ],
      },
    });

    const res = await billsApi.getBills();

    expect(mockApiGet).toHaveBeenCalledWith("/financial/bills?activeOnly=true");
    expect(res.success).toBe(true);
    expect(res.data?.bills).toEqual([
      {
        id: "b1",
        // Carried through so a monthly total can be computed. It used to be
        // dropped by the mapper, which made a yearly and a monthly bill
        // indistinguishable to any caller summing them.
        frequency: "monthly",
        merchant: "Pacific Gas & Electric",
        amount: 120,
        category: "utilities",
        dueDate: "2026-03-20T00:00:00.000Z",
        isAutoPay: true,
      },
      {
        id: "b2",
        // A different cadence from b1 on purpose: proving the field is carried
        // per bill, not stamped from a constant.
        frequency: "yearly",
        merchant: "State Farm",
        amount: 85,
        category: "insurance",
        dueDate: "2026-03-25T00:00:00.000Z",
        isAutoPay: false,
      },
    ]);
  });

  it("returns an empty list when the payload bills are not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    const res = await billsApi.getBills();
    expect(res.success).toBe(true);
    expect(res.data?.bills).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await billsApi.getBills();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
