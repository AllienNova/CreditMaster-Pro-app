/**
 * Fynvita Goal Store
 * Manages financial goals and progress tracking
 * Split from financialStore for better modularity
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { financialGoalsApi } from "../services/api";
import type { FinancialGoal } from "../services/api/types";

interface GoalState {
  // State
  goals: FinancialGoal[];

  // Loading states
  isLoadingGoals: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isContributing: boolean;

  // Error
  error: string | null;

  // Actions
  fetchGoals: () => Promise<void>;
  createGoal: (
    goal: Omit<FinancialGoal, "id" | "userId" | "currentAmount" | "status">,
  ) => Promise<boolean>;
  updateGoal: (
    goalId: string,
    updates: Partial<FinancialGoal>,
  ) => Promise<boolean>;
  contributeToGoal: (goalId: string, amount: number) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  refreshGoals: () => Promise<void>;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  goals: [] as FinancialGoal[],
  isLoadingGoals: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isContributing: false,
  error: null as string | null,
};

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchGoals: async () => {
        set({ isLoadingGoals: true, error: null });
        try {
          const response = await financialGoalsApi.getAll();
          if (response.success && response.data) {
            set({
              goals: response.data.goals,
              isLoadingGoals: false,
            });
          } else {
            set({
              error: response.error?.message || "Failed to fetch goals",
              isLoadingGoals: false,
            });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to fetch goals",
            isLoadingGoals: false,
          });
        }
      },

      createGoal: async (goal) => {
        set({ isCreating: true, error: null });
        try {
          const response = await financialGoalsApi.create(goal);
          if (response.success && response.data) {
            set({
              goals: [...get().goals, response.data],
              isCreating: false,
            });
            return true;
          }
          set({
            error: response.error?.message || "Failed to create goal",
            isCreating: false,
          });
          return false;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to create goal",
            isCreating: false,
          });
          return false;
        }
      },

      updateGoal: async (goalId, updates) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await financialGoalsApi.update(goalId, updates);
          if (response.success) {
            set({
              goals: get().goals.map((g) =>
                g.id === goalId ? { ...g, ...updates } : g,
              ),
              isUpdating: false,
            });
            return true;
          }
          set({
            error: response.error?.message || "Failed to update goal",
            isUpdating: false,
          });
          return false;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to update goal",
            isUpdating: false,
          });
          return false;
        }
      },

      contributeToGoal: async (goalId, amount) => {
        set({ isContributing: true, error: null });
        try {
          const response = await financialGoalsApi.addContribution(
            goalId,
            amount,
          );
          if (response.success && response.data) {
            set({
              goals: get().goals.map((g) =>
                g.id === goalId
                  ? { ...g, currentAmount: response.data!.currentAmount }
                  : g,
              ),
              isContributing: false,
            });
            return true;
          }
          set({
            error: response.error?.message || "Failed to contribute to goal",
            isContributing: false,
          });
          return false;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to contribute to goal",
            isContributing: false,
          });
          return false;
        }
      },

      deleteGoal: async (goalId) => {
        set({ isDeleting: true, error: null });
        try {
          const response = await financialGoalsApi.delete(goalId);
          if (response.success) {
            set({
              goals: get().goals.filter((g) => g.id !== goalId),
              isDeleting: false,
            });
            return true;
          }
          set({
            error: response.error?.message || "Failed to delete goal",
            isDeleting: false,
          });
          return false;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to delete goal",
            isDeleting: false,
          });
          return false;
        }
      },

      refreshGoals: async () => {
        await get().fetchGoals();
      },

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),
    }),
    {
      name: "cpfi-goal-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        goals: state.goals,
      }),
    },
  ),
);

// Selectors
export const selectGoals = (state: GoalState) => state.goals;
export const selectActiveGoals = (state: GoalState) =>
  state.goals.filter((g) => g.status === "active");
export const selectCompletedGoals = (state: GoalState) =>
  state.goals.filter((g) => g.status === "completed");
export const selectGoalById = (goalId: string) => (state: GoalState) =>
  state.goals.find((g) => g.id === goalId);
export const selectGoalProgress = (state: GoalState) =>
  state.goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    progress:
      goal.targetAmount > 0
        ? (goal.currentAmount / goal.targetAmount) * 100
        : 0,
    remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
    status: goal.status,
  }));
export const selectTotalGoalProgress = (state: GoalState) => {
  const activeGoals = state.goals.filter((g) => g.status === "active");
  if (activeGoals.length === 0) return 0;

  const totalProgress = activeGoals.reduce((sum, goal) => {
    const progress =
      goal.targetAmount > 0
        ? (goal.currentAmount / goal.targetAmount) * 100
        : 0;
    return sum + progress;
  }, 0);

  return totalProgress / activeGoals.length;
};
export const selectIsLoading = (state: GoalState) =>
  state.isLoadingGoals ||
  state.isCreating ||
  state.isUpdating ||
  state.isDeleting ||
  state.isContributing;
