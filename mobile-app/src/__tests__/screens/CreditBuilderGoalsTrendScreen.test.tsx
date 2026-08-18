/**
 * credit-builder/goals — the trend statistics come from the trend.
 *
 * The two figures under the chart were hardcoded "+58 6 Month Gain" and
 * "+10 Monthly Avg": the caller's own score movement, invented. They survived
 * the earlier fix of this screen (which replaced SAMPLE_GOALS, SCORE_HISTORY,
 * RECOMMENDED_ACTIONS and a bare `currentScore = 678`) because that pass
 * removed the module-level constants and left the JSX literals. Nothing looked
 * for a number typed straight into the markup until audit:inline-metrics did.
 *
 * They are now computed from the SAME series the chart draws, so the chart and
 * the numbers beneath it cannot tell different stories.
 *
 * The chart bounds were hardcoded too — minValue 580, maxValue 720 — so a
 * caller above 720 or below 580, both entirely ordinary, had their own history
 * drawn outside the chart.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

const mockFetchScores = jest.fn();
const mockFetchScoreHistory = jest.fn();
let mockStoreState: Record<string, unknown> = {};

jest.mock("../../store/creditStore", () => ({
  useCreditStore: () => ({
    fetchScores: mockFetchScores,
    fetchScoreHistory: mockFetchScoreHistory,
    ...mockStoreState,
  }),
}));

const mockGetAll = jest.fn();
jest.mock("../../services/api/credit", () => ({
  creditBuilderRecommendationsApi: { getAll: (...a: unknown[]) => mockGetAll(...a) },
}));

/** Capture what the chart was actually asked to draw. */
const mockChartProps: Record<string, unknown>[] = [];
jest.mock("../../components/charts", () => ({
  LineChart: (props: Record<string, unknown>) => {
    mockChartProps.push(props);
    return null;
  },
}));

// expo-router is mocked globally in jest.setup.js.

import GoalsScreen from "../../../app/credit-builder/goals";

function history(scores: number[]) {
  return {
    history: scores.map((score, i) => ({
      score,
      date: `2026-0${i + 1}-01T00:00:00.000Z`,
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChartProps.length = 0;
  mockStoreState = {
    scores: [{ score: 700, bureau: "experian" }],
    scoreHistory: history([640, 660, 700]),
  };
  mockGetAll.mockResolvedValue({ success: true, data: { recommendations: [] } });
});

describe("credit-builder/goals — score trend", () => {
  it("never shows the invented gain again", async () => {
    render(<GoalsScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    expect(screen.queryByText("+58")).toBeNull();
    expect(screen.queryByText("+10")).toBeNull();
  });

  it("computes the change across the caller's own readings", async () => {
    // 640 -> 700 over three readings: +60 total, +30 per step.
    render(<GoalsScreen />);
    expect((await screen.findByTestId("trend-gain")).props.children).toBe("+60");
    expect(screen.getByTestId("trend-avg").props.children).toBe("+30");
  });

  it("labels the window as the readings there are, not a fixed six months", async () => {
    render(<GoalsScreen />);
    expect(await screen.findByText("Change over 3 readings")).toBeTruthy();
    expect(screen.queryByText(/6 Month/)).toBeNull();
  });

  it("signs a decline correctly", async () => {
    mockStoreState.scoreHistory = history([700, 660]);
    render(<GoalsScreen />);
    expect((await screen.findByTestId("trend-gain")).props.children).toBe("-40");
  });

  it("says there is nothing to measure from a single reading", async () => {
    // (n - 1) would divide by zero, and "+0 average" would be a claim.
    mockStoreState.scoreHistory = history([700]);
    render(<GoalsScreen />);
    expect(
      await screen.findByText(/no change to measure yet/i),
    ).toBeTruthy();
    expect(screen.queryByTestId("trend-gain")).toBeNull();
  });

  describe("chart bounds", () => {
    it("frames the caller's own range instead of a fixed 580-720", async () => {
      mockStoreState.scoreHistory = history([780, 800, 810]);
      render(<GoalsScreen />);
      await waitFor(() => expect(mockChartProps.length).toBeGreaterThan(0));
      const last = mockChartProps[mockChartProps.length - 1];
      // 780-20 and 810+20 — a series the old fixed bounds drew off-chart.
      expect(last.minValue).toBe(760);
      expect(last.maxValue).toBe(830);
    });

    it("never runs past the ends of the score scale", async () => {
      mockStoreState.scoreHistory = history([310, 845]);
      render(<GoalsScreen />);
      await waitFor(() => expect(mockChartProps.length).toBeGreaterThan(0));
      const last = mockChartProps[mockChartProps.length - 1];
      expect(last.minValue).toBe(300);
      expect(last.maxValue).toBe(850);
    });
  });
});
