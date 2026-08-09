/**
 * Fynvita Goal Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useGoalStore,
  selectActiveGoals,
  selectCompletedGoals,
  selectGoalProgress,
  selectTotalGoalProgress,
  selectIsLoading,
} from "../goalStore";

jest.mock("../../services/api", () => ({
  financialGoalsApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    addContribution: jest.fn(),
    delete: jest.fn(),
  },
}));

const { financialGoalsApi } = require("../../services/api");

const mockGoals = [
  { id: "g-1", name: "Emergency Fund", targetAmount: 10000, currentAmount: 5000, status: "active" },
  { id: "g-2", name: "Vacation", targetAmount: 3000, currentAmount: 3000, status: "completed" },
];

describe("Goal Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGoalStore.setState({
      goals: [],
      isLoadingGoals: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isContributing: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useGoalStore.getState();
      expect(state.goals).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchGoals", () => {
    it("should fetch goals successfully", async () => {
      financialGoalsApi.getAll.mockResolvedValue({
        success: true,
        data: { goals: mockGoals },
      });

      await act(async () => {
        await useGoalStore.getState().fetchGoals();
      });

      expect(useGoalStore.getState().goals).toEqual(mockGoals);
      expect(useGoalStore.getState().isLoadingGoals).toBe(false);
    });

    it("should handle error", async () => {
      financialGoalsApi.getAll.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useGoalStore.getState().fetchGoals();
      });

      expect(useGoalStore.getState().error).toBe("Network error");
    });
  });

  describe("createGoal", () => {
    it("should create goal and add to list", async () => {
      const newGoal = { id: "g-3", name: "Car", targetAmount: 20000, currentAmount: 0, status: "active" };
      financialGoalsApi.create.mockResolvedValue({ success: true, data: newGoal });

      let result = false;
      await act(async () => {
        result = await useGoalStore.getState().createGoal({ name: "Car", targetAmount: 20000 } as never);
      });

      expect(result).toBe(true);
      expect(useGoalStore.getState().goals).toHaveLength(1);
    });

    it("should return false on failure", async () => {
      financialGoalsApi.create.mockRejectedValue(new Error("Create failed"));

      let result = true;
      await act(async () => {
        result = await useGoalStore.getState().createGoal({ name: "x" } as never);
      });

      expect(result).toBe(false);
      expect(useGoalStore.getState().error).toBe("Create failed");
    });
  });

  describe("updateGoal", () => {
    it("should update goal in list", async () => {
      useGoalStore.setState({ goals: mockGoals as never[] });
      financialGoalsApi.update.mockResolvedValue({ success: true });

      let result = false;
      await act(async () => {
        result = await useGoalStore.getState().updateGoal("g-1", { name: "Bigger Emergency Fund" });
      });

      expect(result).toBe(true);
      expect(useGoalStore.getState().goals[0].name).toBe("Bigger Emergency Fund");
    });
  });

  describe("contributeToGoal", () => {
    it("should update currentAmount on success", async () => {
      useGoalStore.setState({ goals: mockGoals as never[] });
      financialGoalsApi.addContribution.mockResolvedValue({
        success: true,
        data: { currentAmount: 6000 },
      });

      let result = false;
      await act(async () => {
        result = await useGoalStore.getState().contributeToGoal("g-1", 1000);
      });

      expect(result).toBe(true);
      expect(useGoalStore.getState().goals[0].currentAmount).toBe(6000);
    });

    it("should handle failure", async () => {
      useGoalStore.setState({ goals: mockGoals as never[] });
      financialGoalsApi.addContribution.mockRejectedValue(new Error("Payment failed"));

      let result = true;
      await act(async () => {
        result = await useGoalStore.getState().contributeToGoal("g-1", 1000);
      });

      expect(result).toBe(false);
      expect(useGoalStore.getState().error).toBe("Payment failed");
    });
  });

  describe("deleteGoal", () => {
    it("should remove goal from list", async () => {
      useGoalStore.setState({ goals: mockGoals as never[] });
      financialGoalsApi.delete.mockResolvedValue({ success: true });

      let result = false;
      await act(async () => {
        result = await useGoalStore.getState().deleteGoal("g-2");
      });

      expect(result).toBe(true);
      expect(useGoalStore.getState().goals).toHaveLength(1);
    });
  });

  describe("Selectors", () => {
    beforeEach(() => {
      useGoalStore.setState({ goals: mockGoals as never[] });
    });

    it("selectActiveGoals filters active goals", () => {
      expect(selectActiveGoals(useGoalStore.getState())).toHaveLength(1);
    });

    it("selectCompletedGoals filters completed goals", () => {
      expect(selectCompletedGoals(useGoalStore.getState())).toHaveLength(1);
    });

    it("selectGoalProgress computes progress for each goal", () => {
      const progress = selectGoalProgress(useGoalStore.getState());
      expect(progress[0].progress).toBe(50);
      expect(progress[0].remaining).toBe(5000);
    });

    it("selectTotalGoalProgress averages active goal progress", () => {
      expect(selectTotalGoalProgress(useGoalStore.getState())).toBe(50);
    });

    it("selectTotalGoalProgress returns 0 with no active goals", () => {
      useGoalStore.setState({ goals: [mockGoals[1]] as never[] });
      expect(selectTotalGoalProgress(useGoalStore.getState())).toBe(0);
    });

    it("selectIsLoading checks all flags", () => {
      expect(selectIsLoading(useGoalStore.getState())).toBe(false);
      useGoalStore.setState({ isContributing: true });
      expect(selectIsLoading(useGoalStore.getState())).toBe(true);
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useGoalStore.setState({ goals: mockGoals as never[], error: "err" });
      useGoalStore.getState().resetStore();
      expect(useGoalStore.getState().goals).toEqual([]);
    });
  });
});
