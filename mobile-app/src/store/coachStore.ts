/**
 * AI Financial Coach Store
 *
 * Zustand store for managing AI Financial Coach state in the mobile app.
 */

import { create } from "zustand";
import * as coachApi from "../services/coachApi";
import {
  Recommendation,
  FinancialGoalPlan,
  GoalSimulation,
  BudgetOptimizationResult,
  DebtStrategyAnalysis,
  CoachDashboard,
} from "../types/coach.types";

interface CoachState {
  // Dashboard
  dashboard: CoachDashboard | null;
  dashboardLoading: boolean;
  dashboardError: string | null;

  // Recommendations
  recommendations: Recommendation[];
  recommendationsLoading: boolean;
  recommendationsError: string | null;

  // Goals
  goals: FinancialGoalPlan[];
  selectedGoal: FinancialGoalPlan | null;
  goalSimulation: GoalSimulation | null;
  goalsLoading: boolean;
  goalsError: string | null;

  // Budget
  budgetOptimization: BudgetOptimizationResult | null;
  budgetLoading: boolean;
  budgetError: string | null;

  // Debt Strategy
  debtStrategy: DebtStrategyAnalysis | null;
  debtLoading: boolean;
  debtError: string | null;

  // Actions
  fetchDashboard: () => Promise<void>;
  fetchRecommendations: (
    params?: coachApi.GetRecommendationsParams,
  ) => Promise<void>;
  fetchGoals: () => Promise<void>;
  createGoal: (params: coachApi.CreateGoalParams) => Promise<FinancialGoalPlan>;
  updateGoalProgress: (goalId: string, amount: number) => Promise<void>;
  simulateGoal: (
    goalId: string,
    scenarios: coachApi.SimulateGoalParams["scenarios"],
  ) => Promise<void>;
  selectGoal: (goal: FinancialGoalPlan | null) => void;
  fetchBudgetOptimization: (
    params?: coachApi.OptimizeBudgetParams,
  ) => Promise<void>;
  fetchDebtStrategy: (params?: coachApi.AnalyzeDebtParams) => Promise<void>;
  clearErrors: () => void;
  resetStore: () => void;
}

const initialState = {
  dashboard: null,
  dashboardLoading: false,
  dashboardError: null,
  recommendations: [],
  recommendationsLoading: false,
  recommendationsError: null,
  goals: [],
  selectedGoal: null,
  goalSimulation: null,
  goalsLoading: false,
  goalsError: null,
  budgetOptimization: null,
  budgetLoading: false,
  budgetError: null,
  debtStrategy: null,
  debtLoading: false,
  debtError: null,
};

export const useCoachStore = create<CoachState>((set, get) => ({
  ...initialState,

  // Actions
  fetchDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null });
    try {
      const dashboard = await coachApi.getCoachDashboard();
      set({ dashboard, dashboardLoading: false });
    } catch (error) {
      set({
        dashboardError: "Failed to load dashboard",
        dashboardLoading: false,
      });
    }
  },

  fetchRecommendations: async (params) => {
    set({ recommendationsLoading: true, recommendationsError: null });
    try {
      const response = await coachApi.getRecommendations(params);
      set({
        recommendations: response.recommendations,
        recommendationsLoading: false,
      });
    } catch (error) {
      set({
        recommendationsError: "Failed to load recommendations",
        recommendationsLoading: false,
      });
    }
  },

  fetchGoals: async () => {
    set({ goalsLoading: true, goalsError: null });
    try {
      const response = await coachApi.getGoals();
      set({ goals: response.goals, goalsLoading: false });
    } catch (error) {
      set({ goalsError: "Failed to load goals", goalsLoading: false });
    }
  },

  createGoal: async (params) => {
    set({ goalsLoading: true, goalsError: null });
    try {
      const goal = await coachApi.createGoal(params);
      set((state) => ({
        goals: [...state.goals, goal],
        goalsLoading: false,
      }));
      return goal;
    } catch (error) {
      set({ goalsError: "Failed to create goal", goalsLoading: false });
      throw error;
    }
  },

  updateGoalProgress: async (goalId, amount) => {
    try {
      const updatedGoal = await coachApi.updateGoalProgress(goalId, amount);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === goalId ? updatedGoal : g)),
        selectedGoal:
          state.selectedGoal?.id === goalId ? updatedGoal : state.selectedGoal,
      }));
    } catch (error) {
      set({ goalsError: "Failed to update goal progress" });
    }
  },

  simulateGoal: async (goalId, scenarios) => {
    try {
      const simulation = await coachApi.simulateGoal(goalId, { scenarios });
      set({ goalSimulation: simulation });
    } catch (error) {
      set({ goalsError: "Failed to simulate goal" });
    }
  },

  selectGoal: (goal) => {
    set({ selectedGoal: goal, goalSimulation: null });
  },

  fetchBudgetOptimization: async (params) => {
    set({ budgetLoading: true, budgetError: null });
    try {
      const result = await coachApi.getBudgetOptimization(params);
      set({ budgetOptimization: result, budgetLoading: false });
    } catch (error) {
      set({
        budgetError: "Failed to load budget optimization",
        budgetLoading: false,
      });
    }
  },

  fetchDebtStrategy: async (params) => {
    set({ debtLoading: true, debtError: null });
    try {
      const result = await coachApi.getDebtStrategy(params);
      set({ debtStrategy: result, debtLoading: false });
    } catch (error) {
      set({ debtError: "Failed to load debt strategy", debtLoading: false });
    }
  },

  clearErrors: () => {
    set({
      dashboardError: null,
      recommendationsError: null,
      goalsError: null,
      budgetError: null,
      debtError: null,
    });
  },

  resetStore: () => set(initialState),
}));

export default useCoachStore;
