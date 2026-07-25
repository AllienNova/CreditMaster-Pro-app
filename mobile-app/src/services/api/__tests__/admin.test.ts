/**
 * Fynvita Admin Analytics API Service Tests
 *
 * adminAnalyticsApi.getAnalytics hits the real admin-guarded route
 * (GET /api/admin/analytics?range=). These tests pin the endpoint + range query for
 * every supported range and prove a failed request is passed straight through
 * without fabricating analytics.
 */

import {
  adminAnalyticsApi,
  ANALYTICS_RANGES,
  adminDisputesApi,
  mapAdminDispute,
  ADMIN_DISPUTE_STATUSES,
} from "../admin";
import type { AdminAnalytics, AdminDisputeRow } from "../admin";
import { api } from "../client";

jest.mock("../client", () => ({
  api: {
    get: jest.fn(),
  },
}));

const realAnalytics: AdminAnalytics = {
  userGrowth: [{ date: "Jul 1", count: 12 }],
  revenueByMonth: [{ month: "Jul", revenue: 7000 }],
  disputesByStatus: [{ status: "resolved", count: 8 }],
  subscriptionsByTier: [{ tier: "pro", count: 5 }],
  topFeatures: [{ feature: "Dispute Letters", usage: 11 }],
  timeRange: "30d",
};

describe("adminAnalyticsApi.getAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the real admin route with the given range", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: realAnalytics,
    });

    const res = await adminAnalyticsApi.getAnalytics("30d");

    expect(api.get).toHaveBeenCalledWith("/admin/analytics?range=30d");
    expect(res.data).toEqual(realAnalytics);
  });

  it("puts each supported range in the query string", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      success: true,
      data: realAnalytics,
    });

    for (const r of ANALYTICS_RANGES) {
      await adminAnalyticsApi.getAnalytics(r);
      expect(api.get).toHaveBeenCalledWith(`/admin/analytics?range=${r}`);
    }
    expect(api.get).toHaveBeenCalledTimes(ANALYTICS_RANGES.length);
  });

  it("passes a failed request through without fabricating analytics", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    const res = await adminAnalyticsApi.getAnalytics("30d");

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Forbidden");
  });
});

describe("mapAdminDispute", () => {
  const row: AdminDisputeRow = {
    id: "dsp-1",
    user_email: "owner@fynvita.test",
    bureau: "transunion",
    status: "under_review",
    item_type: "collection",
    created_at: "2026-07-01T09:15:00.000Z",
  };

  it("maps every real column/enrichment onto the display model", () => {
    const m = mapAdminDispute(row);
    expect(m.id).toBe("dsp-1");
    expect(m.user).toBe("owner@fynvita.test");
    expect(m.type).toBe("collection");
  });

  it("prettifies the bureau CHECK value to its brand label", () => {
    expect(mapAdminDispute({ ...row, bureau: "experian" }).bureau).toBe(
      "Experian",
    );
    expect(mapAdminDispute({ ...row, bureau: "equifax" }).bureau).toBe(
      "Equifax",
    );
    expect(mapAdminDispute({ ...row, bureau: "transunion" }).bureau).toBe(
      "TransUnion",
    );
  });

  it("capitalizes an unrecognized bureau instead of dropping it", () => {
    expect(mapAdminDispute({ ...row, bureau: "innovis" }).bureau).toBe(
      "Innovis",
    );
  });

  it("passes the real status enum straight through (no remapping)", () => {
    for (const s of ADMIN_DISPUTE_STATUSES) {
      expect(mapAdminDispute({ ...row, status: s }).status).toBe(s);
    }
  });

  it("trims the created_at timestamp to a plain date", () => {
    expect(mapAdminDispute(row).created).toBe("2026-07-01");
    // A date-only value (no 'T') is returned unchanged.
    expect(mapAdminDispute({ ...row, created_at: "2026-07-01" }).created).toBe(
      "2026-07-01",
    );
  });

  it("substitutes empty values for missing fields, never fabricating", () => {
    const m = mapAdminDispute({ id: "dsp-2" });
    expect(m.id).toBe("dsp-2");
    expect(m.user).toBe("Unknown");
    expect(m.bureau).toBe("");
    expect(m.status).toBe("");
    expect(m.type).toBe("");
    expect(m.created).toBe("");
  });
});

describe("adminDisputesApi.getDisputes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the real admin route and adapts each row", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        disputes: [
          {
            id: "dsp-1",
            user_email: "owner@fynvita.test",
            bureau: "equifax",
            status: "sent",
            item_type: "late_payment",
            created_at: "2026-06-15T00:00:00.000Z",
          },
        ],
        total: 1,
      },
    });

    const res = await adminDisputesApi.getDisputes();

    expect(api.get).toHaveBeenCalledWith("/admin/disputes");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0]).toEqual({
      id: "dsp-1",
      user: "owner@fynvita.test",
      bureau: "Equifax",
      status: "sent",
      type: "late_payment",
      created: "2026-06-15",
    });
  });

  it("returns an empty list when disputes is not an array", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { total: 0 },
    });

    const res = await adminDisputesApi.getDisputes();

    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("passes a failed request through without fabricating disputes", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    const res = await adminDisputesApi.getDisputes();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Forbidden");
  });
});
