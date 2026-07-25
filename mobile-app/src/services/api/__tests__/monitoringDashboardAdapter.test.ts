/**
 * monitoringDashboardAdapter — pure mappers for the /dashboard/monitoring
 * screen. These prove real store types are flattened faithfully (no
 * fabrication): bureau title-casing, `change` defaulting, `lastUpdated`
 * fallback, createdAt -> date, acknowledged -> read, and score history ->
 * chart points, including the empty-history and invalid-date edges.
 */

import {
  mapBureauScore,
  mapMonitoringAlert,
  mapScoreHistoryToTrend,
} from "../monitoringDashboardAdapter";
import type {
  CreditMonitoringAlert,
  CreditScore,
  CreditScoreHistory,
} from "../types";

function score(over: Partial<CreditScore> = {}): CreditScore {
  return {
    id: "cs-exp",
    userId: "u1",
    bureau: "experian",
    score: 738,
    previousScore: 721,
    change: 17,
    date: "2026-02-01T00:00:00.000Z",
    lastUpdated: "2026-02-02T00:00:00.000Z",
    ...over,
  };
}

function alert(over: Partial<CreditMonitoringAlert> = {}): CreditMonitoringAlert {
  return {
    id: "a1",
    userId: "u1",
    bureau: "experian",
    alertType: "score_change",
    type: "score_change",
    severity: "low",
    title: "Score Increased +17",
    description: "Your Experian score increased from 721 to 738.",
    createdAt: "2026-02-01T00:00:00.000Z",
    acknowledged: false,
    ...over,
  };
}

describe("mapBureauScore", () => {
  it("title-cases the bureau slug and copies score fields", () => {
    const view = mapBureauScore(
      score({ bureau: "transunion", score: 731, change: 17 }),
    );
    expect(view.bureau).toBe("Transunion");
    expect(view.score).toBe(731);
    expect(view.change).toBe(17);
    expect(view.id).toBe("cs-exp");
  });

  it("defaults change to 0 when the source omits it", () => {
    const view = mapBureauScore(score({ change: undefined }));
    expect(view.change).toBe(0);
  });

  it("falls back to the score date when lastUpdated is absent", () => {
    const view = mapBureauScore(
      score({ lastUpdated: undefined, date: "2026-01-15T00:00:00.000Z" }),
    );
    expect(view.lastUpdated).toBe("2026-01-15T00:00:00.000Z");
  });

  it("returns an empty display name for an empty bureau slug", () => {
    const view = mapBureauScore(score({ bureau: "" as CreditScore["bureau"] }));
    expect(view.bureau).toBe("");
  });
});

describe("mapMonitoringAlert", () => {
  it("normalizes createdAt -> date and acknowledged -> read", () => {
    const view = mapMonitoringAlert(
      alert({
        createdAt: "2026-03-10T00:00:00.000Z",
        acknowledged: true,
        severity: "critical",
        type: "fraud_alert",
      }),
    );
    expect(view.date).toBe("2026-03-10T00:00:00.000Z");
    expect(view.read).toBe(true);
    expect(view.severity).toBe("critical");
    expect(view.type).toBe("fraud_alert");
    expect(view.title).toBe("Score Increased +17");
  });
});

describe("mapScoreHistoryToTrend", () => {
  it("returns an empty array when history is null", () => {
    expect(mapScoreHistoryToTrend(null)).toEqual([]);
  });

  it("maps each history point to a value + short-month label", () => {
    const history: CreditScoreHistory = {
      history: [
        { date: "2026-01-15T00:00:00.000Z", score: 705 },
        { date: "2026-02-15T00:00:00.000Z", score: 728 },
      ],
      averageScore: 716,
      highestScore: 728,
      lowestScore: 705,
      trend: "improving",
      periodStart: "2026-01-15T00:00:00.000Z",
      periodEnd: "2026-02-15T00:00:00.000Z",
    };
    expect(mapScoreHistoryToTrend(history)).toEqual([
      { value: 705, label: "Jan" },
      { value: 728, label: "Feb" },
    ]);
  });

  it("yields an empty label for an invalid timestamp instead of crashing", () => {
    const history: CreditScoreHistory = {
      history: [{ date: "not-a-date", score: 700 }],
      averageScore: 700,
      highestScore: 700,
      lowestScore: 700,
      trend: "stable",
      periodStart: "not-a-date",
      periodEnd: "not-a-date",
    };
    expect(mapScoreHistoryToTrend(history)).toEqual([
      { value: 700, label: "" },
    ]);
  });
});
