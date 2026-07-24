/**
 * SavingsScreen — real store wiring (PARITY-P1).
 *
 * The screen used to render hardcoded ACCOUNTS + GOALS arrays with a fake
 * setTimeout load. It now reads real goals from useGoalStore and real aggregate
 * balances from useDashboardStore (fetch both on mount, honest
 * loading/error/empty states). These tests prove the real data renders and the
 * former mock values (per-account APY list, mock goal names) never appear.
 */

import React from "react";
import { ScrollView } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import type { FinancialGoal } from "../../services/api/types";

const mockFetchGoals = jest.fn();
const mockFetchDashboard = jest.fn();

interface Dashboard {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  lastUpdated: string;
}

interface GoalState {
  goals: FinancialGoal[];
  isLoadingGoals: boolean;
  error: string | null;
  fetchGoals: jest.Mock;
}

interface DashboardState {
  dashboard: Dashboard | null;
  isLoadingDashboard: boolean;
  error: string | null;
  fetchDashboard: jest.Mock;
}

let mockGoalState: GoalState;
let mockDashboardState: DashboardState;

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../store/goalStore", () => ({
  useGoalStore: () => mockGoalState,
}));

jest.mock("../../store/dashboardStore", () => ({
  useDashboardStore: () => mockDashboardState,
}));

// expo-router is mocked globally in jest.setup.js.

import SavingsScreen from "../../../app/financial/savings";

function goal(over: Partial<FinancialGoal> = {}): FinancialGoal {
  return {
    id: "g1",
    userId: "u1",
    name: "Roth IRA Boost",
    type: "retirement",
    targetAmount: 20000,
    currentAmount: 15000,
    deadline: "2026-08-01T00:00:00.000Z",
    targetDate: "2026-08-01T00:00:00.000Z",
    status: "active",
    ...over,
  };
}

const realDashboard: Dashboard = {
  netWorth: 47250,
  totalAssets: 82400,
  totalLiabilities: 35150,
  monthlyIncome: 6800,
  monthlyExpenses: 4350,
  savingsRate: 36,
  lastUpdated: "2026-07-24T12:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGoalState = {
    goals: [],
    isLoadingGoals: false,
    error: null,
    fetchGoals: mockFetchGoals,
  };
  mockDashboardState = {
    dashboard: null,
    isLoadingDashboard: false,
    error: null,
    fetchDashboard: mockFetchDashboard,
  };
});

describe("SavingsScreen", () => {
  it("fetches goals and dashboard from the stores on mount", () => {
    render(<SavingsScreen />);
    expect(mockFetchGoals).toHaveBeenCalled();
    expect(mockFetchDashboard).toHaveBeenCalled();
  });

  it("renders real goals and real balances; never the removed mock values", () => {
    mockGoalState.goals = [
      goal({ id: "g1", name: "Roth IRA Boost", currentAmount: 15000, targetAmount: 20000 }),
      goal({ id: "g2", name: "Kyoto Trip", currentAmount: 2000, targetAmount: 4000 }),
    ];
    mockDashboardState.dashboard = realDashboard;

    render(<SavingsScreen />);

    // Real goals (name + computed progress).
    expect(screen.getByText("Roth IRA Boost")).toBeTruthy();
    expect(screen.getByText("Kyoto Trip")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy(); // 15000/20000
    expect(screen.getByText("50%")).toBeTruthy(); // 2000/4000

    // Real dashboard aggregates.
    expect(screen.getByText("$47,250")).toBeTruthy(); // net worth
    expect(screen.getByText("36% savings rate")).toBeTruthy();

    // Former hardcoded ACCOUNTS/GOALS content must never appear.
    expect(screen.queryByText("4.5% APY")).toBeNull();
    expect(screen.queryByText("IRA Contributions")).toBeNull();
    expect(screen.queryByText("General Savings")).toBeNull();
    expect(screen.queryByText("Emergency Fund (6 months)")).toBeNull();
    expect(screen.queryByText("Vacation to Europe")).toBeNull();
    expect(screen.queryByText("New Car Down Payment")).toBeNull();
  });

  it("shows the loading state while fetching with no data yet", () => {
    mockGoalState.isLoadingGoals = true;
    mockDashboardState.isLoadingDashboard = true;
    render(<SavingsScreen />);
    expect(screen.getByTestId("savings-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when a store errors and has no data", () => {
    mockGoalState.error = "Network down";
    render(<SavingsScreen />);

    expect(screen.getByTestId("savings-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    // mount + retry
    expect(mockFetchGoals).toHaveBeenCalledTimes(2);
    expect(mockFetchDashboard).toHaveBeenCalledTimes(2);
  });

  it("shows the inline empty state when there are no goals", () => {
    mockDashboardState.dashboard = realDashboard; // past loading/error gates
    render(<SavingsScreen />);
    expect(screen.getByTestId("savings-empty")).toBeTruthy();
    expect(screen.getByText("No savings goals yet")).toBeTruthy();
  });

  it("re-fetches both stores on pull-to-refresh", async () => {
    mockDashboardState.dashboard = realDashboard;
    const { UNSAFE_getByType } = render(<SavingsScreen />);

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockFetchGoals).toHaveBeenCalledTimes(2);
    expect(mockFetchDashboard).toHaveBeenCalledTimes(2);
  });
});
