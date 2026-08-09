/**
 * mapWebDisputableItem — web -> mobile disputable-item adapter (M2-2).
 *
 * The real web route (GET /api/credit-repair/disputable-items, authed) returns
 * each item as { id, accountName, status, balance: number | null, type:
 * "account" | "inquiry" }: negative tradelines carry a balance, while credit
 * inquiries have none (balance null). The mobile New Dispute screen renders a
 * selectable list of these. These tests pin the field map, prove a null balance
 * stays null (never a fabricated $0), prove NaN/Infinity balances degrade to
 * null while a genuine 0 survives, prove the type normalizes to the known two
 * values (unknown -> "account"), and prove getDisputableItems fetches the right
 * path and never fabricates on failure or on a non-array payload. `selected` is
 * NOT part of the adapter output — it is per-screen UI state the screen adds.
 */

// Stub the module's side-effecting client import so creditRepair.ts loads in
// isolation, while still driving api.get for the getDisputableItems wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import {
  mapWebDisputableItem,
  creditRepairApi,
  type DisputableItem,
  type WebDisputableItem,
} from "../creditRepair";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebDisputableItem = {
  id: "i1",
  accountName: "Chase Sapphire",
  status: "Late 30 days",
  balance: 2450,
  type: "account",
};

describe("mapWebDisputableItem — field map", () => {
  it("passes id/accountName/status/balance through and normalizes type", () => {
    expect(mapWebDisputableItem(base)).toEqual<DisputableItem>({
      id: "i1",
      accountName: "Chase Sapphire",
      status: "Late 30 days",
      balance: 2450,
      type: "account",
    });
  });

  it("never emits a `selected` field — selection is screen-local UI state, not API data", () => {
    expect(mapWebDisputableItem(base)).not.toHaveProperty("selected");
  });

  it("defaults an absent accountName/status to empty strings, not made-up values", () => {
    const m = mapWebDisputableItem({ id: "i2", balance: null, type: "inquiry" });
    expect(m.accountName).toBe("");
    expect(m.status).toBe("");
  });
});

describe("mapWebDisputableItem — type normalization", () => {
  it("keeps a real inquiry as 'inquiry'", () => {
    expect(mapWebDisputableItem({ ...base, type: "inquiry" }).type).toBe(
      "inquiry",
    );
  });

  it("keeps a real account as 'account'", () => {
    expect(mapWebDisputableItem({ ...base, type: "account" }).type).toBe(
      "account",
    );
  });

  it("degrades an unknown or absent type to 'account', the general bucket", () => {
    expect(mapWebDisputableItem({ ...base, type: "weird" }).type).toBe(
      "account",
    );
    expect(mapWebDisputableItem({ ...base, type: undefined }).type).toBe(
      "account",
    );
  });
});

describe("mapWebDisputableItem — honest balance (null stays null, never $0)", () => {
  it("keeps a null balance as null — an inquiry has no balance, and that is not $0", () => {
    const m = mapWebDisputableItem({ ...base, type: "inquiry", balance: null });
    expect(m.balance).toBeNull();
  });

  it("treats an absent balance as null rather than a fabricated $0", () => {
    const m = mapWebDisputableItem({ id: "i3", accountName: "No Balance Co" });
    expect(m.balance).toBeNull();
  });

  it("treats a NaN or Infinity balance as null rather than rendering it", () => {
    expect(mapWebDisputableItem({ ...base, balance: Number.NaN }).balance).toBeNull();
    expect(
      mapWebDisputableItem({ ...base, balance: Number.POSITIVE_INFINITY }).balance,
    ).toBeNull();
  });

  it("keeps a genuine zero balance — 0 is a real value, not a missing one", () => {
    const m = mapWebDisputableItem({ ...base, balance: 0 });
    expect(m.balance).toBe(0);
  });
});

describe("creditRepairApi.getDisputableItems", () => {
  it("fetches the disputable-items route and adapts the payload onto the mobile shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: "i1",
            accountName: "Chase Sapphire",
            status: "Late 30 days",
            balance: 2450,
            type: "account",
          },
          {
            id: "i2",
            accountName: "XYZ Lender",
            status: "Unauthorized inquiry",
            balance: null,
            type: "inquiry",
          },
        ],
      },
    });

    const res = await creditRepairApi.getDisputableItems();

    expect(mockApiGet).toHaveBeenCalledWith("/credit-repair/disputable-items");
    expect(res.success).toBe(true);
    expect(res.data?.items).toEqual<DisputableItem[]>([
      {
        id: "i1",
        accountName: "Chase Sapphire",
        status: "Late 30 days",
        balance: 2450,
        type: "account",
      },
      {
        id: "i2",
        accountName: "XYZ Lender",
        status: "Unauthorized inquiry",
        balance: null,
        type: "inquiry",
      },
    ]);
  });

  it("returns an honest empty list when the user has nothing disputable", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: { items: [] } });
    const res = await creditRepairApi.getDisputableItems();
    expect(res.success).toBe(true);
    expect(res.data?.items).toEqual([]);
  });

  it("returns an empty list when the payload items are not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    const res = await creditRepairApi.getDisputableItems();
    expect(res.success).toBe(true);
    expect(res.data?.items).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await creditRepairApi.getDisputableItems();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
