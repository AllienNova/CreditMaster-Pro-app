/**
 * analytics/credit-score — real-data wiring.
 *
 * The screen showed a SCORE_HISTORY fixture climbing 680 -> 742 over six
 * months, a SCORE_FACTORS fixture claiming "100% on-time payments", and a
 * hardcoded "742" as the current score. No request. The 1M/3M/6M/1Y/ALL
 * selector changed none of it.
 *
 * It was NOT wired earlier on purpose: /api/credit/factors returned five
 * invented factors to every caller until the previous commit (SF-16), and
 * pointing a screen at a fabricating endpoint launders a fixture through an
 * HTTP call — worse than the fixture, because it looks sourced.
 *
 * The arithmetic is what these tests mostly guard. The fixture could never be
 * empty, so nothing below it was written to survive an empty series: Math.max()
 * of no scores is -Infinity, and every bar height becomes NaN.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";

const mockFetchScores = jest.fn();
const mockFetchScoreHistory = jest.fn();
const mockGetFactors = jest.fn();
let mockStoreState: Record<string, unknown> = {};

jest.mock("../../store/creditStore", () => ({
  useCreditStore: () => ({
    ...mockStoreState,
    fetchScores: mockFetchScores,
    fetchScoreHistory: mockFetchScoreHistory,
  }),
}));

jest.mock("../../services/api/credit", () => ({
  creditScoreApi: { getFactors: (...a: unknown[]) => mockGetFactors(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import CreditScoreAnalyticsScreen from "../../../app/analytics/credit-score";

const FACTORS = {
  data: [
    {
      id: "credit_age",
      name: "Credit Age",
      impact: "positive",
      value: "8.3 year average across your linked accounts",
      percentImpact: 15,
    },
  ],
  unavailable: [
    {
      id: "payment_history",
      name: "Payment History",
      percentImpact: 35,
      blockedBy: "Needs a linked credit report.",
    },
  ],
};

function withHistory(scores: number[], current?: number) {
  return {
    // The headline score is deliberately DIFFERENT from the last history
    // point in these fixtures: they come from two different reads, and
    // keeping them equal made every text assertion ambiguous.
    scores: [
      { bureau: "experian", score: current ?? (scores[scores.length - 1] ?? 0) },
    ],
    scoreHistory: {
      history: scores.map((score, i) => ({
        date: `2026-0${i + 1}-01T00:00:00.000Z`,
        score,
        bureau: "experian",
      })),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState = withHistory([700, 720, 742]);
  mockFetchScores.mockResolvedValue(undefined);
  mockFetchScoreHistory.mockResolvedValue(undefined);
  mockGetFactors.mockResolvedValue({ success: true, data: FACTORS });
});

describe("analytics/credit-score", () => {
  it("fetches on mount instead of rendering fixtures", async () => {
    render(<CreditScoreAnalyticsScreen />);
    await waitFor(() => {
      expect(mockFetchScores).toHaveBeenCalled();
      expect(mockFetchScoreHistory).toHaveBeenCalledWith(6);
      expect(mockGetFactors).toHaveBeenCalled();
    });
  });

  it("never claims 100% on-time payments again", async () => {
    render(<CreditScoreAnalyticsScreen />);
    await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
    expect(screen.queryByText("100% on-time payments")).toBeNull();
  });

  it("shows the real current score, not a hardcoded 742", async () => {
    mockStoreState = withHistory([690, 705], 711);
    render(<CreditScoreAnalyticsScreen />);
    expect(await screen.findByText("711")).toBeTruthy();
  });

  it("shows a dash when no bureau has reported a score", async () => {
    // A placeholder number reads as the user's own.
    mockStoreState = { scores: [], scoreHistory: { history: [] } };
    render(<CreditScoreAnalyticsScreen />);
    expect(await screen.findByText("—")).toBeTruthy();
  });

  it("renders the measured finding for each factor", async () => {
    render(<CreditScoreAnalyticsScreen />);
    expect(
      await screen.findByText("8.3 year average across your linked accounts"),
    ).toBeTruthy();
  });

  it("names the factors that cannot be measured, with the reason", async () => {
    render(<CreditScoreAnalyticsScreen />);
    expect(await screen.findByText("Not yet available")).toBeTruthy();
    expect(screen.getByText("Needs a linked credit report.")).toBeTruthy();
  });

  describe("the period selector, which used to change nothing", () => {
    it("refetches the history with the matching window", async () => {
      render(<CreditScoreAnalyticsScreen />);
      await waitFor(() => expect(mockFetchScoreHistory).toHaveBeenCalledWith(6));

      fireEvent.press(screen.getByText("1Y"));
      await waitFor(() =>
        expect(mockFetchScoreHistory).toHaveBeenCalledWith(12),
      );

      fireEvent.press(screen.getByText("1M"));
      await waitFor(() => expect(mockFetchScoreHistory).toHaveBeenCalledWith(1));
    });
  });

  describe("an empty history, which the fixture could never be", () => {
    beforeEach(() => {
      mockStoreState = { scores: [], scoreHistory: { history: [] } };
    });

    it("says so instead of drawing an empty chart", async () => {
      render(<CreditScoreAnalyticsScreen />);
      expect(
        await screen.findByText(/No score history yet/i),
      ).toBeTruthy();
    });

    it("renders no bars at all, so no NaN heights", async () => {
      // Math.max() of no scores is -Infinity; every bar height would be NaN.
      render(<CreditScoreAnalyticsScreen />);
      await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
      expect(screen.queryByTestId("score-bar-0")).toBeNull();
    });

    it("shows no score-change badge, because there is no change", async () => {
      render(<CreditScoreAnalyticsScreen />);
      await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
      expect(screen.queryByTestId("score-change-badge")).toBeNull();
    });
  });

  it("shows a single reading without inventing a change", async () => {
    // One point is not a trend. The fixture always had six.
    mockStoreState = withHistory([712], 718);
    render(<CreditScoreAnalyticsScreen />);
    await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
    expect(screen.getByText("718")).toBeTruthy();
    // One point is not a trend, so no badge at all — NOT "+0 pts", which
    // would assert the score held steady when there is nothing to compare.
    expect(screen.queryByTestId("score-change-badge")).toBeNull();
  });

  it("distinguishes a failed factor read from having none, and retries", async () => {
    mockGetFactors.mockResolvedValue({
      success: false,
      error: { message: "boom" },
    });
    render(<CreditScoreAnalyticsScreen />);

    expect(
      await screen.findByText(/could not load your score factors/i),
    ).toBeTruthy();
    expect(
      screen.queryByText(/None of your score factors can be measured/i),
    ).toBeNull();

    mockGetFactors.mockResolvedValue({ success: true, data: FACTORS });
    fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(mockGetFactors).toHaveBeenCalledTimes(2));
  });
});
