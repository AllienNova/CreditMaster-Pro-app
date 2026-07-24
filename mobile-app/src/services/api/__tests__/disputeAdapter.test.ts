/**
 * mapWebDispute — web -> mobile dispute adapter (PARITY-P2).
 *
 * The real web route (GET /api/disputes, backed by disputeServiceDB) returns
 * items carrying `itemDescription` + `reason` and NO `updatedAt`, while the
 * mobile Dispute type expects `creditorName` + `disputeReason` + a required
 * `updatedAt`. Left unmapped those fields are undefined at runtime (the list's
 * description renders empty). This adapter bridges the shapes; getting the
 * field map wrong blanks the dispute rows.
 */

// Stub the module's side-effecting client import so disputes.ts loads in
// isolation, while still driving api.get for the getAll wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebDispute, disputeApi, type WebDispute } from "../disputes";

beforeEach(() => {
  jest.clearAllMocks();
});

const base: WebDispute = {
  id: "d1",
  bureau: "experian",
  createdAt: "2026-01-10T00:00:00.000Z",
};

describe("mapWebDispute", () => {
  it("maps web itemDescription -> creditorName and reason -> disputeReason", () => {
    const m = mapWebDispute({
      ...base,
      itemType: "Late Payment",
      itemDescription: "Capital One",
      reason: "Reported late in error",
      status: "under_review",
    });
    expect(m.id).toBe("d1");
    expect(m.itemType).toBe("Late Payment");
    expect(m.creditorName).toBe("Capital One");
    expect(m.disputeReason).toBe("Reported late in error");
    expect(m.status).toBe("under_review");
  });

  it("prefers explicit creditorName/disputeReason over itemDescription/reason", () => {
    const m = mapWebDispute({
      ...base,
      creditorName: "Chase",
      itemDescription: "ignored",
      disputeReason: "Not mine",
      reason: "ignored",
    });
    expect(m.creditorName).toBe("Chase");
    expect(m.disputeReason).toBe("Not mine");
  });

  it("falls back updatedAt to createdAt when the web payload omits it", () => {
    expect(mapWebDispute({ ...base }).updatedAt).toBe(base.createdAt);
    expect(
      mapWebDispute({ ...base, updatedAt: "2026-02-01T00:00:00.000Z" })
        .updatedAt,
    ).toBe("2026-02-01T00:00:00.000Z");
  });

  it("defaults userId to an empty string when the web payload omits it", () => {
    expect(mapWebDispute({ ...base }).userId).toBe("");
    expect(mapWebDispute({ ...base, userId: "u9" }).userId).toBe("u9");
  });

  it("passes valid statuses through and defaults unknown/missing to pending", () => {
    const s = (status?: string) => mapWebDispute({ ...base, status }).status;
    expect(s("draft")).toBe("draft");
    expect(s("sent")).toBe("sent");
    expect(s("resolved")).toBe("resolved");
    expect(s("rejected")).toBe("rejected");
    expect(s("brand_new_status")).toBe("pending");
    expect(s(undefined)).toBe("pending");
  });

  it("defaults absent creditorName and disputeReason to empty strings", () => {
    const m = mapWebDispute({ ...base });
    expect(m.creditorName).toBe("");
    expect(m.disputeReason).toBe("");
    expect(m.itemType).toBe("");
  });

  it("preserves optional fields without fabricating absent ones", () => {
    const m = mapWebDispute({
      ...base,
      accountNumber: "****1234",
      outcome: "removed",
      sentAt: "2026-01-11T00:00:00.000Z",
      resolvedAt: "2026-01-20T00:00:00.000Z",
      followUpDate: "2026-02-01T00:00:00.000Z",
    });
    expect(m.accountNumber).toBe("****1234");
    expect(m.outcome).toBe("removed");
    expect(m.sentAt).toBe("2026-01-11T00:00:00.000Z");
    expect(m.resolvedAt).toBe("2026-01-20T00:00:00.000Z");
    expect(m.followUpDate).toBe("2026-02-01T00:00:00.000Z");

    const bare = mapWebDispute({ ...base });
    expect(bare.accountNumber).toBeUndefined();
    expect(bare.outcome).toBeUndefined();
    expect(bare.responseDetails).toBeUndefined();
  });
});

describe("disputeApi.getAll", () => {
  it("adapts the paginated web items onto the mobile Dispute shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: "d1",
            bureau: "equifax",
            itemType: "Collection",
            itemDescription: "Midland",
            reason: "Settled in full",
            status: "sent",
            createdAt: "2026-01-10T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
      },
    });

    const res = await disputeApi.getAll();

    expect(mockApiGet).toHaveBeenCalledWith("/disputes");
    expect(res.success).toBe(true);
    expect(res.data?.total).toBe(1);
    expect(res.data?.items).toHaveLength(1);
    expect(res.data?.items[0]).toMatchObject({
      id: "d1",
      userId: "",
      creditorName: "Midland",
      disputeReason: "Settled in full",
      status: "sent",
      updatedAt: "2026-01-10T00:00:00.000Z",
    });
  });

  it("builds the query string from filter params", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await disputeApi.getAll({ page: 1, status: "pending", bureau: "experian" });
    expect(mockApiGet).toHaveBeenCalledWith(
      "/disputes?page=1&status=pending&bureau=experian",
    );
  });

  it("returns empty items when the payload items are not an array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: { total: 0 } });
    const res = await disputeApi.getAll();
    expect(res.success).toBe(true);
    expect(res.data?.items).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_500", message: "boom" },
    });
    const res = await disputeApi.getAll();
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("boom");
  });
});
