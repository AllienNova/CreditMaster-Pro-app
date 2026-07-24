/**
 * mapWebInsight — web -> mobile AI-insights adapter (PARITY-P1).
 *
 * The real web route (GET /api/ai/insights, withAuth) is what the web /insights
 * page renders. Its `insights` array is CoachingInsight[] = { type, title,
 * description, data? } with a narrow 4-value type union and NO id. The mobile
 * screen previously rendered fabricated 6-type insights with invented
 * priority/amount/action fields. These tests pin the mapping (type validation +
 * stable id from list position) and prove getInsights never fabricates on failure.
 */

// Stub the module's side-effecting client import so financial.ts loads in
// isolation, while still driving api.get for the getInsights wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebInsight, financialOverviewApi } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("mapWebInsight", () => {
  it("passes through a valid insight and derives a stable id from the index", () => {
    const m = mapWebInsight(
      {
        type: "warning",
        title: "Dining up 45%",
        description: "Your dining spend rose sharply this week.",
      },
      0,
    );
    expect(m).toEqual({
      id: "insight-0",
      type: "warning",
      title: "Dining up 45%",
      description: "Your dining spend rose sharply this week.",
    });
  });

  it("preserves each of the four real insight types", () => {
    expect(mapWebInsight({ type: "observation" }, 0).type).toBe("observation");
    expect(mapWebInsight({ type: "suggestion" }, 1).type).toBe("suggestion");
    expect(mapWebInsight({ type: "warning" }, 2).type).toBe("warning");
    expect(mapWebInsight({ type: "celebration" }, 3).type).toBe("celebration");
  });

  it("defaults an unknown or missing type to observation", () => {
    expect(mapWebInsight({ type: "spending_anomaly" }, 0).type).toBe(
      "observation",
    );
    expect(mapWebInsight({}, 0).type).toBe("observation");
  });

  it("defaults missing title/description to empty strings", () => {
    const m = mapWebInsight({ type: "suggestion" }, 2);
    expect(m).toEqual({
      id: "insight-2",
      type: "suggestion",
      title: "",
      description: "",
    });
  });

  it("assigns distinct ids across a list", () => {
    const list = [{ type: "observation" }, { type: "suggestion" }].map(
      mapWebInsight,
    );
    expect(list.map((i) => i.id)).toEqual(["insight-0", "insight-1"]);
  });
});

describe("financialOverviewApi.getInsights", () => {
  it("adapts the /api/ai/insights payload and ignores coaching/personality", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        insights: [
          {
            type: "warning",
            title: "Dining up 45%",
            description: "Your dining spend rose sharply this week.",
          },
          {
            type: "celebration",
            title: "Goal reached",
            description: "You hit your savings target.",
          },
        ],
        // web-only extras that must be dropped
        coaching: { currentTopic: "weekly_review", suggestedActions: [] },
        personality: { type: "saver", riskScore: 6, biases: null },
      },
    });

    const res = await financialOverviewApi.getInsights();

    expect(mockApiGet).toHaveBeenCalledWith("/ai/insights");
    expect(res.success).toBe(true);
    expect(res.data?.insights).toEqual([
      {
        id: "insight-0",
        type: "warning",
        title: "Dining up 45%",
        description: "Your dining spend rose sharply this week.",
      },
      {
        id: "insight-1",
        type: "celebration",
        title: "Goal reached",
        description: "You hit your savings target.",
      },
    ]);
  });

  it("returns an empty list when the payload has no insights array", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    const res = await financialOverviewApi.getInsights();
    expect(res.success).toBe(true);
    expect(res.data?.insights).toEqual([]);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await financialOverviewApi.getInsights();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
