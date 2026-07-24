/**
 * Dashboard (Home) tab — real store wiring (PARITY-P1).
 *
 * Credit + disputes were already real; this suite covers the three sections that
 * used to be inline hardcoded objects:
 *  - Spending  -> dashboardStore (real monthly spend, per-category breakdown,
 *                 last-month delta from the aggregate's monthlyTrend)
 *  - Payday    -> honest "add income" empty state (no pay-schedule source is
 *                 wired, so the countdown is never fabricated)
 *  - Gamification -> gamificationStore (real XP / level / streak)
 * The tests prove real store data renders and the former hardcoded values
 * (spending $2,846 / "Food & Dining"; payday "Acme Corp" / $3,200; gamification
 * "Financial Warrior" / "2,450 / 3,000 XP" / "Level 12") never appear.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import type { GamificationProgress } from "../../services/api/gamification";
import type {
  DashboardCategorySpending,
  DashboardMonthlyTrend,
} from "../../services/api/financial";

const mockFetchScores = jest.fn();
const mockFetchAlerts = jest.fn();
const mockFetchDisputes = jest.fn();
const mockFetchDashboard = jest.fn();
const mockFetchProgress = jest.fn();

interface MockDashboard {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  spendingByCategory?: DashboardCategorySpending[];
  monthlyTrend?: DashboardMonthlyTrend[];
  lastUpdated: string;
}

interface MockCreditState {
  scores: unknown[];
  alerts: unknown[];
  unreadAlertCount: number;
  fetchScores: jest.Mock;
  fetchAlerts: jest.Mock;
  isLoadingScores: boolean;
}

interface MockDisputeState {
  disputes: unknown[];
  fetchDisputes: jest.Mock;
  isLoading: boolean;
}

interface MockDashboardState {
  dashboard: MockDashboard | null;
  isLoadingDashboard: boolean;
  fetchDashboard: jest.Mock;
}

interface MockGamificationState {
  progress: GamificationProgress | null;
  isLoadingProgress: boolean;
  fetchProgress: jest.Mock;
}

let mockCreditState: MockCreditState;
let mockDisputeState: MockDisputeState;
let mockDashboardState: MockDashboardState;
let mockGamificationState: MockGamificationState;

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../store/authStore", () => ({
  useAuthStore: () => ({ user: { name: "Marcus" } }),
}));

jest.mock("../../store/creditStore", () => ({
  useCreditStore: () => mockCreditState,
}));

jest.mock("../../store/disputeStore", () => ({
  useDisputeStore: () => mockDisputeState,
}));

jest.mock("../../store/dashboardStore", () => ({
  useDashboardStore: () => mockDashboardState,
}));

jest.mock("../../store/gamificationStore", () => ({
  useGamificationStore: () => mockGamificationState,
}));

// expo-router is mocked globally in jest.setup.js.

import HomeScreen from "../../../app/(tabs)/index";

const realProgress: GamificationProgress = {
  xp: { current: 1500, toNextLevel: 2000, totalEarned: 8500 },
  level: { current: 5, title: "Budgeting Pro", progress: 75 },
  streak: { days: 9, multiplier: 1.5, longestStreak: 20 },
};

const realDashboard: MockDashboard = {
  netWorth: 47250,
  totalAssets: 82400,
  totalLiabilities: 35150,
  monthlyIncome: 6800,
  monthlyExpenses: 4350,
  savingsRate: 36,
  spendingByCategory: [
    { category: "Groceries", amount: 2000, percentage: 46, transactionCount: 8 },
    { category: "Travel", amount: 1500, percentage: 34, transactionCount: 3 },
    { category: "Utilities", amount: 850, percentage: 20, transactionCount: 4 },
  ],
  monthlyTrend: [
    { month: "Feb", income: 6800, expenses: 4000, savings: 2800 },
    { month: "Mar", income: 6800, expenses: 4350, savings: 2450 },
  ],
  lastUpdated: "2026-07-24T12:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreditState = {
    scores: [],
    alerts: [],
    unreadAlertCount: 0,
    fetchScores: mockFetchScores,
    fetchAlerts: mockFetchAlerts,
    isLoadingScores: false,
  };
  mockDisputeState = {
    disputes: [],
    fetchDisputes: mockFetchDisputes,
    isLoading: false,
  };
  mockDashboardState = {
    dashboard: null,
    isLoadingDashboard: false,
    fetchDashboard: mockFetchDashboard,
  };
  mockGamificationState = {
    progress: null,
    isLoadingProgress: false,
    fetchProgress: mockFetchProgress,
  };
});

describe("Dashboard (Home) tab", () => {
  it("fetches the dashboard and gamification progress on mount", () => {
    render(<HomeScreen />);
    expect(mockFetchDashboard).toHaveBeenCalled();
    expect(mockFetchProgress).toHaveBeenCalled();
  });

  it("renders real spending (total + top category) from the dashboard aggregate", () => {
    mockDashboardState.dashboard = realDashboard;
    render(<HomeScreen />);

    // Real monthly spend + the highest-value real category.
    expect(screen.getByText("$4,350")).toBeTruthy();
    expect(screen.getByText("Groceries")).toBeTruthy();
    expect(screen.getByText("$2,000")).toBeTruthy();

    // Former hardcoded spending must never appear.
    expect(screen.queryByText("$2,846")).toBeNull();
    expect(screen.queryByText("Food & Dining")).toBeNull();
  });

  it("renders real gamification (level, title, XP) from gamificationStore", () => {
    mockGamificationState.progress = realProgress;
    render(<HomeScreen />);

    expect(screen.getByText("Budgeting Pro")).toBeTruthy();
    expect(screen.getByText("Level 5")).toBeTruthy();
    expect(screen.getByText("1,500 / 2,000 XP")).toBeTruthy();

    // Former hardcoded gamification must never appear.
    expect(screen.queryByText("Financial Warrior")).toBeNull();
    expect(screen.queryByText("Level 12")).toBeNull();
    expect(screen.queryByText("2,450 / 3,000 XP")).toBeNull();
  });

  it("hides the gamification card entirely when there is no progress (no fake data)", () => {
    mockGamificationState.progress = null;
    render(<HomeScreen />);
    expect(screen.queryByText("Financial Warrior")).toBeNull();
    expect(screen.queryByText("View Rewards")).toBeNull();
  });

  it("renders the honest payday empty state, never a fabricated countdown", () => {
    mockDashboardState.dashboard = realDashboard;
    render(<HomeScreen />);

    // The widget's own "add income" empty state.
    expect(screen.getByText("Track Your Payday")).toBeTruthy();
    expect(screen.getByText("Add income to see countdown")).toBeTruthy();

    // Former hardcoded payday must never appear.
    expect(screen.queryByText("Acme Corp")).toBeNull();
    expect(screen.queryByText("$3,200")).toBeNull();
  });
});
