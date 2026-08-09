/**
 * Dashboard MonitoringScreen — real store wiring (PARITY).
 *
 * The /dashboard/monitoring screen used to render hardcoded MOCK_SCORES /
 * MOCK_ALERTS / SCORE_HISTORY arrays (behind a fake setTimeout) plus an inline
 * hardcoded "Key Factors" block (Payment History / Utilization 32% / Credit Age
 * 7yr / Credit Mix). It now reads the user's real bureau scores, alerts, and
 * score-history trend from useCreditStore (fetch on mount, honest inline
 * loading / error / empty states). These tests prove the three fetches fire on
 * mount, real data renders, the former mock values and the fabricated Key
 * Factors numbers never appear, each honest state shows, and pull-to-refresh
 * re-fetches.
 */

import React from "react";
import { ScrollView } from "react-native";
import {
  render,
  screen,
  fireEvent,
  act,
} from "@testing-library/react-native";
import type {
  CreditMonitoringAlert,
  CreditScore,
  CreditScoreHistory,
} from "../../services/api/types";

const mockFetchScores = jest.fn();
const mockFetchAlerts = jest.fn();
const mockFetchScoreHistory = jest.fn();

interface CreditStoreState {
  scores: CreditScore[];
  alerts: CreditMonitoringAlert[];
  scoreHistory: CreditScoreHistory | null;
  isLoadingScores: boolean;
  isLoadingAlerts: boolean;
  scoreError: string | null;
  alertError: string | null;
  fetchScores: jest.Mock;
  fetchAlerts: jest.Mock;
  fetchScoreHistory: jest.Mock;
}

let mockCreditState: CreditStoreState;

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../store/creditStore", () => ({
  useCreditStore: () => mockCreditState,
}));

// expo-router is mocked globally in jest.setup.js.

import MonitoringScreen from "../../../app/dashboard/monitoring";

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

function history(): CreditScoreHistory {
  return {
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
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreditState = {
    scores: [],
    alerts: [],
    scoreHistory: null,
    isLoadingScores: false,
    isLoadingAlerts: false,
    scoreError: null,
    alertError: null,
    fetchScores: mockFetchScores,
    fetchAlerts: mockFetchAlerts,
    fetchScoreHistory: mockFetchScoreHistory,
  };
});

describe("Dashboard MonitoringScreen", () => {
  it("fetches scores, alerts, and score history from the store on mount", () => {
    render(<MonitoringScreen />);
    expect(mockFetchScores).toHaveBeenCalledTimes(1);
    expect(mockFetchAlerts).toHaveBeenCalledTimes(1);
    expect(mockFetchScoreHistory).toHaveBeenCalledTimes(1);
  });

  it("renders real bureau scores and alerts, and never the removed mock values", () => {
    mockCreditState.scores = [
      score({ id: "cs-exp", bureau: "experian", score: 738, change: 17 }),
      score({ id: "cs-eqf", bureau: "equifax", score: 725, change: -5 }),
    ];
    mockCreditState.alerts = [
      alert({
        id: "a1",
        severity: "low",
        type: "score_change",
        title: "Score Increased +17",
        description: "Your Experian score increased from 721 to 738.",
        acknowledged: false,
      }),
      alert({
        id: "a2",
        severity: "critical",
        type: "fraud_alert",
        title: "Possible Fraud Detected",
        description: "A new account was opened that you may not recognize.",
        acknowledged: true,
      }),
    ];
    mockCreditState.scoreHistory = history();

    render(<MonitoringScreen />);

    // Real, title-cased bureau names + real scores + change deltas.
    expect(screen.getByText("Experian")).toBeTruthy();
    expect(screen.getByText("Equifax")).toBeTruthy();
    expect(screen.getByText("738")).toBeTruthy();
    expect(screen.getByText("725")).toBeTruthy();
    expect(screen.getByText("17")).toBeTruthy(); // abs(+17), up branch
    expect(screen.getByText("5")).toBeTruthy(); // abs(-5), down branch

    // Real alerts, real severities (raw low/critical), and the unread badge.
    expect(screen.getByText("Score Increased +17")).toBeTruthy();
    expect(screen.getByText("Possible Fraud Detected")).toBeTruthy();
    expect(screen.getByText("low")).toBeTruthy();
    expect(screen.getByText("critical")).toBeTruthy();
    expect(screen.getByText("1 new")).toBeTruthy(); // one unacknowledged alert

    // History present -> chart renders, not the history-empty note.
    expect(screen.queryByTestId("dashboard-monitoring-history-empty")).toBeNull();
    // No honest loading/error/empty page states when data is present.
    expect(screen.queryByTestId("dashboard-monitoring-loading")).toBeNull();
    expect(screen.queryByTestId("dashboard-monitoring-error")).toBeNull();
    expect(screen.queryByTestId("dashboard-monitoring-empty")).toBeNull();

    // Former hardcoded MOCK_SCORES / MOCK_ALERTS values must never appear.
    expect(screen.queryByText("678")).toBeNull();
    expect(screen.queryByText("665")).toBeNull();
    expect(screen.queryByText("672")).toBeNull();
    expect(screen.queryByText("Credit Score Increased")).toBeNull();
    expect(screen.queryByText("New Hard Inquiry")).toBeNull();
    expect(screen.queryByText("High Utilization Alert")).toBeNull();
    expect(screen.queryByText("Payment Due Soon")).toBeNull();
    expect(
      screen.queryByText("A hard inquiry was added by ABC Lender"),
    ).toBeNull();
    expect(
      screen.queryByText("Your credit utilization is above 30%"),
    ).toBeNull();
  });

  it("shows an honest 'Key Factors unavailable' state and never the fabricated factor values", () => {
    mockCreditState.scores = [score()];

    render(<MonitoringScreen />);

    // The Key Factors card now shows an honest unavailable note.
    expect(
      screen.getByTestId("dashboard-monitoring-factors-unavailable"),
    ).toBeTruthy();
    expect(screen.getByText(/Score factors unavailable/i)).toBeTruthy();

    // The removed inline hardcoded factor values must never render.
    expect(screen.queryByText("Payment History")).toBeNull();
    expect(screen.queryByText("Excellent")).toBeNull();
    expect(screen.queryByText("Credit Utilization")).toBeNull();
    expect(screen.queryByText("32%")).toBeNull();
    expect(screen.queryByText("Credit Age")).toBeNull();
    expect(screen.queryByText("7 years")).toBeNull();
    expect(screen.queryByText("Credit Mix")).toBeNull();
    expect(screen.queryByText("Good")).toBeNull();
  });

  it("shows an honest score-history empty note when there is no history", () => {
    mockCreditState.scores = [score()];
    mockCreditState.scoreHistory = null;

    render(<MonitoringScreen />);

    expect(
      screen.getByTestId("dashboard-monitoring-history-empty"),
    ).toBeTruthy();
  });

  it("shows the inline loading state while fetching with no data yet", () => {
    mockCreditState.isLoadingScores = true;
    render(<MonitoringScreen />);
    expect(screen.getByTestId("dashboard-monitoring-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the store errors and has no data", () => {
    mockCreditState.scoreError = "Network down";
    render(<MonitoringScreen />);

    expect(screen.getByTestId("dashboard-monitoring-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    // mount + retry
    expect(mockFetchScores).toHaveBeenCalledTimes(2);
    expect(mockFetchAlerts).toHaveBeenCalledTimes(2);
    expect(mockFetchScoreHistory).toHaveBeenCalledTimes(2);
  });

  it("surfaces an alert-side error when only the alert fetch fails", () => {
    mockCreditState.alertError = "Alerts unavailable";
    render(<MonitoringScreen />);

    expect(screen.getByTestId("dashboard-monitoring-error")).toBeTruthy();
    expect(screen.getByText("Alerts unavailable")).toBeTruthy();
  });

  it("shows the inline empty state when there are no scores or alerts", () => {
    render(<MonitoringScreen />);
    expect(screen.getByTestId("dashboard-monitoring-empty")).toBeTruthy();
  });

  it("re-fetches scores, alerts, and history on pull-to-refresh", async () => {
    mockCreditState.scores = [score()];
    const { UNSAFE_getAllByType } = render(<MonitoringScreen />);

    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockFetchScores).toHaveBeenCalledTimes(2);
    expect(mockFetchAlerts).toHaveBeenCalledTimes(2);
    expect(mockFetchScoreHistory).toHaveBeenCalledTimes(2);
  });
});
