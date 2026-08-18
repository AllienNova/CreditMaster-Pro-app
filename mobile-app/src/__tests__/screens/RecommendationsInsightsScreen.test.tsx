/**
 * recommendations/insights — real-data wiring.
 *
 * The screen showed an INSIGHTS fixture to every user with no request:
 * "Dining Out Increased 45% — You spent $420 on restaurants this month, up
 * from $290 last month", impact "-$130", tagged NEW. Precise figures about
 * somebody who does not exist.
 *
 * It also carried a WEEKLY_SUMMARY constant — $1,245 spent, -12% vs last
 * week, Groceries $320, "3 opportunities worth +$127/mo" — that NO gate saw
 * for this entire sweep, because audit:screen-data detected a constant ARRAY
 * of objects and this was a constant OBJECT. A fabrication does not have to
 * be plural. The detector now covers both.
 *
 * FOUR OF THE FIXTURE'S FIELDS HAD NO SOURCE. The real CoachingInsight is
 * { type, title, description, data? } — there is no impact figure, no action
 * label, no route, and no isNew flag.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type {
  Insight,
  SpendingAnalysisData,
} from "../../services/api/financial";

const mockGetInsights = jest.fn();
const mockGetSpendingAnalysis = jest.fn();

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getInsights: (...a: unknown[]) => mockGetInsights(...a),
    getSpendingAnalysis: (...a: unknown[]) => mockGetSpendingAnalysis(...a),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import InsightsScreen from "../../../app/recommendations/insights";

function insight(over: Partial<Insight> = {}): Insight {
  return {
    id: "insight-0",
    type: "warning",
    title: "Groceries Spending",
    description: "Your highest spending category was Groceries at $312.40.",
    ...over,
  };
}

function weekly(over: Partial<SpendingAnalysisData> = {}): SpendingAnalysisData {
  return {
    totalSpending: 842.5,
    transactionCount: 19,
    averageTransaction: 44.34,
    dailyAverage: 120.36,
    comparedToLastPeriod: -8.4,
    categories: [
      {
        name: "Groceries",
        amount: 312.4,
        percentOfTotal: 37,
        trend: "up",
        trendPercent: 12,
        transactionCount: 7,
      },
    ],
    patterns: [],
    recommendations: [],
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInsights.mockResolvedValue({
    success: true,
    data: { insights: [insight()] },
  });
  mockGetSpendingAnalysis.mockResolvedValue({ success: true, data: weekly() });
});

describe("recommendations/insights", () => {
  it("fetches both sources on mount instead of rendering fixtures", async () => {
    render(<InsightsScreen />);
    await waitFor(() => {
      expect(mockGetInsights).toHaveBeenCalled();
      expect(mockGetSpendingAnalysis).toHaveBeenCalled();
    });
  });

  it("never shows the invented insight again", async () => {
    render(<InsightsScreen />);
    await waitFor(() => expect(mockGetInsights).toHaveBeenCalled());
    expect(screen.queryByText("Dining Out Increased 45%")).toBeNull();
    expect(screen.queryByText("-$130")).toBeNull();
  });

  it("renders the real insight title and description", async () => {
    render(<InsightsScreen />);
    expect(await screen.findByText("Groceries Spending")).toBeTruthy();
    expect(
      screen.getByText(/highest spending category was Groceries at \$312\.40/),
    ).toBeTruthy();
  });

  it("shows no impact figure or action button, because neither exists", async () => {
    // CoachingInsight has no impact, no action label and no route. The
    // fixture invented all three.
    render(<InsightsScreen />);
    await waitFor(() => expect(mockGetInsights).toHaveBeenCalled());
    expect(screen.queryByText("Set Budget")).toBeNull();
    expect(screen.queryByText("NEW")).toBeNull();
  });

  describe("the weekly card, which was a constant OBJECT no gate saw", () => {
    it("shows the real seven-day spend", async () => {
      render(<InsightsScreen />);
      expect(await screen.findByText("$842.5")).toBeTruthy();
    });

    it("shows the real top category and its amount", async () => {
      render(<InsightsScreen />);
      expect(await screen.findByText("Groceries")).toBeTruthy();
      expect(screen.getByText("$312")).toBeTruthy();
    });

    it("no longer claims savings opportunities, which nothing computes", async () => {
      render(<InsightsScreen />);
      await waitFor(() => expect(mockGetSpendingAnalysis).toHaveBeenCalled());
      expect(screen.queryByText(/opportunities/i)).toBeNull();
      expect(screen.queryByText("+$127/mo")).toBeNull();
    });

    it("shows the real week-over-week change", async () => {
      render(<InsightsScreen />);
      // The constant was always -12.
      expect(await screen.findByText("8%")).toBeTruthy();
      expect(screen.queryByText("12%")).toBeNull();
    });

    it("leaves the weekly card empty rather than blanking the insights", async () => {
      // Secondary source: its failure must not take the primary one down.
      mockGetSpendingAnalysis.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<InsightsScreen />);
      expect(await screen.findByText("Groceries Spending")).toBeTruthy();
    });
  });

  it("filters by the route's own type vocabulary", async () => {
    // spending | saving | alert | tip was invented; no real insight could
    // have matched a chip.
    mockGetInsights.mockResolvedValue({
      success: true,
      data: {
        insights: [
          insight({ id: "a", type: "warning", title: "A warning" }),
          insight({ id: "b", type: "celebration", title: "A win" }),
        ],
      },
    });
    render(<InsightsScreen />);

    await waitFor(() => expect(mockGetInsights).toHaveBeenCalled());
    expect(screen.queryByText("Spending")).toBeNull();
    expect(screen.queryByText("Tips")).toBeNull();

    fireEvent.press(screen.getByText("Wins"));
    await waitFor(() => expect(screen.queryByText("A warning")).toBeNull());
    expect(screen.getByText("A win")).toBeTruthy();
  });

  describe("honest states", () => {
    it("distinguishes a failed read from having no insights, and retries", async () => {
      mockGetInsights.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<InsightsScreen />);

      expect(
        await screen.findByText(/could not load your insights/i),
      ).toBeTruthy();
      expect(screen.queryByText(/No insights yet/i)).toBeNull();

      mockGetInsights.mockResolvedValue({
        success: true,
        data: { insights: [insight()] },
      });
      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetInsights).toHaveBeenCalledTimes(2));
    });

    it("explains why there is nothing to say yet", async () => {
      mockGetInsights.mockResolvedValue({
        success: true,
        data: { insights: [] },
      });
      render(<InsightsScreen />);
      expect(await screen.findByText(/No insights yet/i)).toBeTruthy();
    });
  });
});
