/**
 * mapWebGoodwillLetter — web -> mobile goodwill-letter adapter (PARITY-P2).
 *
 * The real web route (GET /api/credit-repair/goodwill, withAuth) returns letters
 * shaped by src/lib/credit-repair/db/goodwill-db-service.ts: `creditorName` plus a
 * five-value status lifecycle (draft | sent | response_received | approved |
 * denied). The mobile screen speaks `creditor` and a narrower four-value enum
 * (draft | sent | responded | success). These tests pin the field map and the
 * status compression — in particular that a `denied` letter maps to `responded`
 * (a denial is a reply, never a success) and that unknown/missing statuses
 * degrade to `draft` — and prove getGoodwillLetters never fabricates on failure.
 */

// Stub the module's side-effecting client import so creditRepair.ts loads in
// isolation, while still driving api.get for the getGoodwillLetters wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import {
  mapWebGoodwillLetter,
  creditRepairApi,
  type WebGoodwillLetter,
} from "../creditRepair";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebGoodwillLetter = {
  id: "g1",
  createdAt: "2026-01-10T00:00:00.000Z",
};

describe("mapWebGoodwillLetter", () => {
  it("maps web creditorName -> creditor and preserves id + createdAt", () => {
    const m = mapWebGoodwillLetter({
      ...base,
      creditorName: "Capital One",
      status: "sent",
    });
    expect(m.id).toBe("g1");
    expect(m.creditor).toBe("Capital One");
    expect(m.createdAt).toBe("2026-01-10T00:00:00.000Z");
    expect(m.status).toBe("sent");
  });

  it("passes draft/sent through and maps response_received -> responded and approved -> success", () => {
    const s = (status?: string) =>
      mapWebGoodwillLetter({ ...base, status }).status;
    expect(s("draft")).toBe("draft");
    expect(s("sent")).toBe("sent");
    expect(s("response_received")).toBe("responded");
    expect(s("approved")).toBe("success");
  });

  it("maps denied -> responded (a denial is a reply, not a success)", () => {
    expect(mapWebGoodwillLetter({ ...base, status: "denied" }).status).toBe(
      "responded",
    );
  });

  it("degrades unknown or missing status to draft rather than inventing an outcome", () => {
    expect(
      mapWebGoodwillLetter({ ...base, status: "brand_new_status" }).status,
    ).toBe("draft");
    expect(mapWebGoodwillLetter({ ...base, status: undefined }).status).toBe(
      "draft",
    );
    expect(mapWebGoodwillLetter({ ...base }).status).toBe("draft");
  });

  it("degrades inherited object keys (__proto__, constructor) to draft, not a truthy prototype value", () => {
    expect(
      mapWebGoodwillLetter({ ...base, status: "__proto__" }).status,
    ).toBe("draft");
    expect(
      mapWebGoodwillLetter({ ...base, status: "constructor" }).status,
    ).toBe("draft");
    expect(
      mapWebGoodwillLetter({ ...base, status: "hasOwnProperty" }).status,
    ).toBe("draft");
  });

  it("defaults an absent creditorName to an empty string rather than a made-up name", () => {
    expect(mapWebGoodwillLetter({ ...base }).creditor).toBe("");
    expect(
      mapWebGoodwillLetter({ ...base, creditorName: "Chase" }).creditor,
    ).toBe("Chase");
  });
});

describe("creditRepairApi.getGoodwillLetters", () => {
  it("adapts the web letters array onto the mobile GoodwillLetter shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        letters: [
          {
            id: "g1",
            creditorName: "Wells Fargo",
            status: "approved",
            createdAt: "2026-01-10T00:00:00.000Z",
          },
          {
            id: "g2",
            creditorName: "Discover",
            status: "denied",
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
        stats: { total: 2 },
        pagination: { limit: 50, offset: 0, total: 2 },
      },
    });

    const res = await creditRepairApi.getGoodwillLetters();

    expect(mockApiGet).toHaveBeenCalledWith("/credit-repair/goodwill");
    expect(res.success).toBe(true);
    expect(res.data?.letters).toEqual([
      {
        id: "g1",
        creditor: "Wells Fargo",
        status: "success",
        createdAt: "2026-01-10T00:00:00.000Z",
      },
      {
        id: "g2",
        creditor: "Discover",
        status: "responded",
        createdAt: "2026-02-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when the payload letters are not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: { stats: {} } });
    const res = await creditRepairApi.getGoodwillLetters();
    expect(res.success).toBe(true);
    expect(res.data?.letters).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await creditRepairApi.getGoodwillLetters();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
