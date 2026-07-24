/**
 * Fynvita Admin Analytics API Service Tests
 *
 * adminAnalyticsApi.getAnalytics hits the real admin-guarded route
 * (GET /api/admin/analytics?range=). These tests pin the endpoint + range query for
 * every supported range and prove a failed request is passed straight through
 * without fabricating analytics.
 */

import { adminAnalyticsApi, ANALYTICS_RANGES } from "../admin";
import type { AdminAnalytics } from "../admin";
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
