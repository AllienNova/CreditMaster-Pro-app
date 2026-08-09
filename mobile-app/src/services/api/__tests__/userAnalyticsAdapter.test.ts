/**
 * normalizeUserAnalytics + userAnalyticsApi.getAnalytics (PARITY).
 *
 * GET /api/user/analytics returns the user's real credit-dashboard analytics.
 * The mobile normalizer guards array/number shapes and clamps score-factor
 * status to the known union so the analytics screen never crashes on a partial
 * payload — while never fabricating values (a missing/invalid field becomes
 * [] / 0 / "neutral" / the default range, not an invented figure). These tests
 * pin that honest-normalization contract and the getAnalytics request/response
 * plumbing.
 */

// Stub the module's side-effecting imports so user.ts loads in isolation while
// still driving api.get for the getAnalytics wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));
jest.mock("../../offline-sync", () => ({
  offlineSyncService: {
    getIsOnline: () => true,
    addToQueue: jest.fn(),
  },
}));

import { normalizeUserAnalytics, userAnalyticsApi } from "../user";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("normalizeUserAnalytics", () => {
  it("passes a well-formed payload through unchanged", () => {
    const raw = {
      creditHistory: [
        { date: "Jan", score: 700 },
        { date: "Feb", score: 720 },
      ],
      disputeStats: { total: 3, resolved: 2, pending: 1, successRate: 66 },
      scoreFactors: [
        { factor: "Payment History", impact: 35, status: "positive" as const },
      ],
      recommendations: ["Pay on time"],
      timeRange: "12m",
    };

    expect(normalizeUserAnalytics(raw)).toEqual(raw);
  });

  it("coerces missing/invalid fields to honest empties without fabricating", () => {
    const result = normalizeUserAnalytics({
      creditHistory: "nope",
      disputeStats: null,
      scoreFactors: [{ factor: 123, impact: "high", status: "bogus" }],
      recommendations: ["ok", 42, null],
      // timeRange omitted
    });

    expect(result.creditHistory).toEqual([]);
    expect(result.disputeStats).toEqual({
      total: 0,
      resolved: 0,
      pending: 0,
      successRate: 0,
    });
    // Non-string factor + invalid status collapse to honest defaults.
    expect(result.scoreFactors).toEqual([
      { factor: "", impact: 0, status: "neutral" },
    ]);
    // Only string tips survive.
    expect(result.recommendations).toEqual(["ok"]);
    expect(result.timeRange).toBe("6m");
  });

  it("keeps finite scores/impacts and only known factor statuses", () => {
    const result = normalizeUserAnalytics({
      creditHistory: [
        { date: "Jan", score: 700 },
        { date: "Feb", score: "x" },
      ],
      scoreFactors: [
        { factor: "A", impact: 10, status: "negative" },
        { factor: "B", impact: 20, status: "neutral" },
      ],
    });

    expect(result.creditHistory).toEqual([
      { date: "Jan", score: 700 },
      { date: "Feb", score: 0 },
    ]);
    expect(result.scoreFactors[0].status).toBe("negative");
    expect(result.scoreFactors[1].status).toBe("neutral");
  });
});

describe("userAnalyticsApi.getAnalytics", () => {
  it("requests the analytics route with the range and normalizes the payload", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: { creditHistory: [{ date: "Jan", score: 700 }] },
    });

    const res = await userAnalyticsApi.getAnalytics("3m");

    expect(mockApiGet).toHaveBeenCalledWith("/user/analytics?range=3m");
    expect(res.success).toBe(true);
    expect(res.data?.creditHistory).toEqual([{ date: "Jan", score: 700 }]);
    // Missing fields are normalized, not fabricated.
    expect(res.data?.disputeStats).toEqual({
      total: 0,
      resolved: 0,
      pending: 0,
      successRate: 0,
    });
    expect(res.data?.recommendations).toEqual([]);
  });

  it("defaults the range to 6m", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    await userAnalyticsApi.getAnalytics();
    expect(mockApiGet).toHaveBeenCalledWith("/user/analytics?range=6m");
  });

  it("passes an API failure straight through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "X", message: "boom" },
    });

    const res = await userAnalyticsApi.getAnalytics();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error).toEqual({ code: "X", message: "boom" });
  });
});
