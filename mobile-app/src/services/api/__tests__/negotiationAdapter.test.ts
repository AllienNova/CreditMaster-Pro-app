/**
 * mapWebNegotiation — web -> mobile debt-negotiation adapter (PARITY-P2).
 *
 * The real web route (GET /api/credit-repair/negotiate, withAuth) returns
 * negotiations shaped by src/lib/credit-repair/db/negotiations-db-service.ts:
 * `collectionAgency` / `currentBalance` / `originalBalance` plus a six-value
 * pay-for-delete status lifecycle (pending | negotiating | agreed | paid |
 * completed | failed) and Date columns that serialize to ISO strings over HTTP.
 * The mobile screen speaks `creditor` / `balance` / `originalBalance` and a
 * narrower three-value enum (active | negotiating | settled). These tests pin the
 * field map and the status compression — in particular that a `failed`
 * negotiation maps to `active` (a failure is never a win) and an `agreed`
 * negotiation stays `negotiating` (a deal struck is not a debt settled) — and
 * prove getNegotiations never fabricates on failure.
 */

// Stub the module's side-effecting client import so creditRepair.ts loads in
// isolation, while still driving api.get for the getNegotiations wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import {
  mapWebNegotiation,
  creditRepairApi,
  type WebNegotiation,
} from "../creditRepair";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebNegotiation = {
  id: "n1",
  updatedAt: "2026-01-10T00:00:00.000Z",
};

describe("mapWebNegotiation", () => {
  it("maps web collectionAgency -> creditor, currentBalance -> balance, and preserves id/originalBalance/updatedAt", () => {
    const m = mapWebNegotiation({
      ...base,
      collectionAgency: "Midland Credit",
      currentBalance: 2000,
      originalBalance: 3000,
      status: "negotiating",
    });
    expect(m.id).toBe("n1");
    expect(m.creditor).toBe("Midland Credit");
    expect(m.balance).toBe(2000);
    expect(m.originalBalance).toBe(3000);
    expect(m.updatedAt).toBe("2026-01-10T00:00:00.000Z");
    expect(m.status).toBe("negotiating");
  });

  it("compresses the six-value web status onto the three mobile buckets", () => {
    const s = (status?: string) =>
      mapWebNegotiation({ ...base, status }).status;
    expect(s("pending")).toBe("active");
    expect(s("negotiating")).toBe("negotiating");
    expect(s("agreed")).toBe("negotiating");
    expect(s("paid")).toBe("settled");
    expect(s("completed")).toBe("settled");
  });

  it("maps failed -> active (a failed negotiation is unresolved, never a win)", () => {
    expect(mapWebNegotiation({ ...base, status: "failed" }).status).toBe(
      "active",
    );
  });

  it("keeps agreed as negotiating (a settlement struck is not a debt settled)", () => {
    expect(mapWebNegotiation({ ...base, status: "agreed" }).status).toBe(
      "negotiating",
    );
  });

  it("degrades unknown or missing status to active rather than inventing an outcome", () => {
    expect(
      mapWebNegotiation({ ...base, status: "brand_new_status" }).status,
    ).toBe("active");
    expect(mapWebNegotiation({ ...base, status: undefined }).status).toBe(
      "active",
    );
    expect(mapWebNegotiation({ ...base }).status).toBe("active");
  });

  it("degrades inherited object keys (__proto__, constructor) to active, not a truthy prototype value", () => {
    expect(mapWebNegotiation({ ...base, status: "__proto__" }).status).toBe(
      "active",
    );
    expect(mapWebNegotiation({ ...base, status: "constructor" }).status).toBe(
      "active",
    );
    expect(
      mapWebNegotiation({ ...base, status: "hasOwnProperty" }).status,
    ).toBe("active");
  });

  it("defaults an absent creditor/balances to empty/0 rather than made-up values", () => {
    const m = mapWebNegotiation({ ...base });
    expect(m.creditor).toBe("");
    expect(m.balance).toBe(0);
    expect(m.originalBalance).toBe(0);
    expect(m.updatedAt).toBe("2026-01-10T00:00:00.000Z");
  });

  it("defaults an absent updatedAt to an empty string", () => {
    expect(
      mapWebNegotiation({ id: "n2", collectionAgency: "LVNV" }).updatedAt,
    ).toBe("");
  });
});

describe("creditRepairApi.getNegotiations", () => {
  it("adapts the web negotiations array onto the mobile NegotiationDebt shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        negotiations: [
          {
            id: "n1",
            collectionAgency: "Midland Credit",
            currentBalance: 2000,
            originalBalance: 3000,
            status: "failed",
            updatedAt: "2026-01-10T00:00:00.000Z",
          },
          {
            id: "n2",
            collectionAgency: "Portfolio Recovery",
            currentBalance: 0,
            originalBalance: 4000,
            status: "completed",
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
        stats: { total: 2 },
        pagination: { limit: 50, offset: 0, total: 2 },
      },
    });

    const res = await creditRepairApi.getNegotiations();

    expect(mockApiGet).toHaveBeenCalledWith("/credit-repair/negotiate");
    expect(res.success).toBe(true);
    expect(res.data?.debts).toEqual([
      {
        id: "n1",
        creditor: "Midland Credit",
        balance: 2000,
        originalBalance: 3000,
        status: "active",
        updatedAt: "2026-01-10T00:00:00.000Z",
      },
      {
        id: "n2",
        creditor: "Portfolio Recovery",
        balance: 0,
        originalBalance: 4000,
        status: "settled",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when the payload negotiations are not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: { stats: {} } });
    const res = await creditRepairApi.getNegotiations();
    expect(res.success).toBe(true);
    expect(res.data?.debts).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await creditRepairApi.getNegotiations();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
