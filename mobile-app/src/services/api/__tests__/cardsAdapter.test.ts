/**
 * mapWebCard — web -> mobile credit-card adapter (M1-1 / FR-201).
 *
 * The real web route (GET /api/credit-repair/cards, withAuth) returns cards
 * shaped by src/lib/credit-repair/db/credit-cards-db-service.ts: `cardName`,
 * `currentBalance`, `creditLimit`, and a database-generated `utilization`
 * (0-100 percent). The mobile Utilization screen speaks `name`, `balance`,
 * `limit`, and `utilization`. These tests pin the field map, prove a card
 * missing any required numeric is DROPPED (returns null) rather than coerced to
 * $0 / 0%, prove getCards fetches the right path and renormalizes over the
 * surviving cards, and prove it never fabricates on failure or on a non-array
 * payload.
 */

// Stub the module's side-effecting client import so creditRepair.ts loads in
// isolation, while still driving api.get for the getCards wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import {
  mapWebCard,
  creditRepairApi,
  type CreditCard,
  type WebCreditCard,
} from "../creditRepair";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebCreditCard = {
  id: "c1",
  cardName: "Chase Sapphire",
  currentBalance: 500,
  creditLimit: 5000,
  utilization: 10,
};

describe("mapWebCard — field map", () => {
  it("renames cardName/currentBalance/creditLimit and passes id + utilization through", () => {
    expect(mapWebCard(base)).toEqual<CreditCard>({
      id: "c1",
      name: "Chase Sapphire",
      balance: 500,
      limit: 5000,
      utilization: 10,
    });
  });

  it("passes the database utilization percent through unchanged (does not recompute)", () => {
    // A card whose stored utilization would not equal balance/limit*100 proves
    // the adapter trusts the DB-generated value rather than deriving its own.
    const m = mapWebCard({ ...base, currentBalance: 500, creditLimit: 5000, utilization: 42 });
    expect(m?.utilization).toBe(42);
  });

  it("defaults an absent cardName to an empty string rather than a made-up issuer name", () => {
    const m = mapWebCard({
      id: "c2",
      currentBalance: 100,
      creditLimit: 1000,
      utilization: 10,
    });
    expect(m?.name).toBe("");
  });

  it("ignores fields the mobile screen does not render (lastFourDigits, dates, notes)", () => {
    const m = mapWebCard({
      ...base,
      lastFourDigits: "4242",
      statementDate: 15,
      dueDate: 25,
      lastPaymentDate: "2026-01-01T00:00:00.000Z",
      notes: "primary card",
    });
    expect(m).toEqual<CreditCard>({
      id: "c1",
      name: "Chase Sapphire",
      balance: 500,
      limit: 5000,
      utilization: 10,
    });
  });
});

describe("mapWebCard — drops a card missing a required numeric (never coerces to 0)", () => {
  it("drops a card with a missing balance and does NOT return a $0 balance", () => {
    const raw: WebCreditCard = {
      id: "c3",
      cardName: "NoBalance",
      creditLimit: 5000,
      utilization: 10,
    };
    expect(mapWebCard(raw)).toBeNull();
  });

  it("drops a card with a missing credit limit", () => {
    const raw: WebCreditCard = {
      id: "c4",
      cardName: "NoLimit",
      currentBalance: 500,
      utilization: 10,
    };
    expect(mapWebCard(raw)).toBeNull();
  });

  it("drops a card with a missing utilization", () => {
    const raw: WebCreditCard = {
      id: "c5",
      cardName: "NoUtil",
      currentBalance: 500,
      creditLimit: 5000,
    };
    expect(mapWebCard(raw)).toBeNull();
  });

  it("drops a card whose numerics are NaN or Infinity rather than rendering them", () => {
    expect(
      mapWebCard({ ...base, currentBalance: Number.NaN }),
    ).toBeNull();
    expect(
      mapWebCard({ ...base, creditLimit: Number.POSITIVE_INFINITY }),
    ).toBeNull();
  });

  it("keeps a genuine zero balance — 0 is a real value, not a missing one", () => {
    const m = mapWebCard({ ...base, currentBalance: 0, utilization: 0 });
    expect(m).not.toBeNull();
    expect(m?.balance).toBe(0);
    expect(m?.utilization).toBe(0);
  });
});

describe("creditRepairApi.getCards", () => {
  it("fetches the credit-cards route and adapts the payload onto the mobile shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        cards: [
          {
            id: "c1",
            cardName: "Chase Sapphire",
            currentBalance: 500,
            creditLimit: 5000,
            utilization: 10,
          },
          {
            id: "c2",
            cardName: "Amex Gold",
            currentBalance: 2000,
            creditLimit: 4000,
            utilization: 50,
          },
        ],
        totalUtilization: 27.78,
        pagination: { limit: 50, offset: 0, total: 2 },
      },
    });

    const res = await creditRepairApi.getCards();

    expect(mockApiGet).toHaveBeenCalledWith("/credit-repair/cards");
    expect(res.success).toBe(true);
    expect(res.data?.cards).toEqual<CreditCard[]>([
      { id: "c1", name: "Chase Sapphire", balance: 500, limit: 5000, utilization: 10 },
      { id: "c2", name: "Amex Gold", balance: 2000, limit: 4000, utilization: 50 },
    ]);
  });

  it("renormalizes by dropping cards missing a required numeric (does not fabricate $0 rows)", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        cards: [
          {
            id: "c1",
            cardName: "Good Card",
            currentBalance: 500,
            creditLimit: 5000,
            utilization: 10,
          },
          // Missing creditLimit — must be dropped, not shown as a $0-limit card.
          { id: "c2", cardName: "Broken Card", currentBalance: 800, utilization: 20 },
        ],
      },
    });

    const res = await creditRepairApi.getCards();

    expect(res.success).toBe(true);
    expect(res.data?.cards).toHaveLength(1);
    expect(res.data?.cards[0]).toEqual<CreditCard>({
      id: "c1",
      name: "Good Card",
      balance: 500,
      limit: 5000,
      utilization: 10,
    });
  });

  it("returns an empty list when the payload cards are not an array", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: { totalUtilization: 0 },
    });
    const res = await creditRepairApi.getCards();
    expect(res.success).toBe(true);
    expect(res.data?.cards).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await creditRepairApi.getCards();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
