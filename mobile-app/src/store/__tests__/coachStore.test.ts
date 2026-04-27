/**
 * Fynvita Coach Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import { useCoachStore } from "../coachStore";

jest.mock("../../services/coachApi", () => ({
  getCoachDashboard: jest.fn(),
  getRecommendations: jest.fn(),
  getGoals: jest.fn(),
  createGoal: jest.fn(),
  updateGoalProgress: jest.fn(),
  simulateGoal: jest.fn(),
  getBudgetOptimization: jest.fn(),
  getDebtStrategy: jest.fn(),
}));

const coachApi = require("../../services/coachApi");

const mockDashboard = { healthScore: 72, insights: ["Save more"] };
const mockGoal = { id: "g-1", name: "Emergency Fund", target: 10000, current: 3000 };

describe("Coach Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.setState({
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
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useCoachStore.getState();
      expect(state.dashboard).toBeNull();
      expect(state.recommendations).toEqual([]);
      expect(state.goals).toEqual([]);
    });
  });

  describe("fetchDashboard", () => {
    it("should fetch dashboard successfully", async () => {
      coachApi.getCoachDashboard.mockResolvedValue(mockDashboard);

      await act(async () => {
        await useCoachStore.getState().fetchDashboard();
      });

      expect(useCoachStore.getState().dashboard).toEqual(mockDashboard);
      expect(useCoachStore.getState().dashboardLoading).toBe(false);
    });

    it("should handle error", async () => {
      coachApi.getCoachDashboard.mockRejectedValue(new Error("Fail"));

      await act(async () => {
        await useCoachStore.getState().fetchDashboard();
      });

      expect(useCoachStore.getState().dashboardError).toBe("Failed to load dashboard");
      expect(useCoachStore.getState().dashboardLoading).toBe(false);
    });
  });

  describe("fetchRecommendations", () => {
    it("should fetch recommendations successfully", async () => {
      const mockRecs = [{ id: "r-1", text: "Increase savings" }];
      coachApi.getRecommendations.mockResolvedValue({ recommendations: mockRecs });

      await act(async () => {
        await useCoachStore.getState().fetchRecommendations();
      });

      expect(useCoachStore.getState().recommendations).toEqual(mockRecs);
    });

    it("should handle error", async () => {
      coachApi.getRecommendations.mockRejectedValue(new Error("Fail"));

      await act(async () => {
        await useCoachStore.getState().fetchRecommendations();
      });

      expect(useCoachStore.getState().recommendationsError).toBe("Failed to load recommendations");
    });
  });

  describe("fetchGoals", () => {
    it("should fetch goals successfully", async () => {
      coachApi.getGoals.mockResolvedValue({ goals: [mockGoal] });

      await act(async () => {
        await useCoachStore.getState().fetchGoals();
      });

      expect(useCoachStore.getState().goals).toEqual([mockGoal]);
      expect(useCoachStore.getState().goalsLoading).toBe(false);
    });
  });

  describe("createGoal", () => {
    it("should create goal and add to list", async () => {
      coachApi.createGoal.mockResolvedValue(mockGoal);

      let result;
      await act(async () => {
        result = await useCoachStore.getState().createGoal({ name: "Emergency Fund", target: 10000 } as never);
      });

      expect(result).toEqual(mockGoal);
      expect(useCoachStore.getState().goals).toHaveLength(1);
    });

    it("should rethrow on failure", async () => {
      coachApi.createGoal.mockRejectedValue(new Error("Create failed"));

      await expect(
        act(async () => {
          await useCoachStore.getState().createGoal({ name: "x" } as never);
        }),
      ).rejects.toThrow("Create failed");

      expect(useCoachStore.getState().goalsError).toBe("Failed to create goal");
    });
  });

  describe("selectGoal", () => {
    it("should set selected goal and clear simulation", () => {
      useCoachStore.setState({ goalSimulation: { result: "data" } as never });
      useCoachStore.getState().selectGoal(mockGoal as never);
      expect(useCoachStore.getState().selectedGoal).toEqual(mockGoal);
      expect(useCoachStore.getState().goalSimulation).toBeNull();
    });
  });

  describe("fetchBudgetOptimization", () => {
    it("should fetch budget optimization", async () => {
      const mockResult = { suggestions: ["Cut dining out"] };
      coachApi.getBudgetOptimization.mockResolvedValue(mockResult);

      await act(async () => {
        await useCoachStore.getState().fetchBudgetOptimization();
      });

      expect(useCoachStore.getState().budgetOptimization).toEqual(mockResult);
    });

    it("should handle error", async () => {
      coachApi.getBudgetOptimization.mockRejectedValue(new Error("Fail"));

      await act(async () => {
        await useCoachStore.getState().fetchBudgetOptimization();
      });

      expect(useCoachStore.getState().budgetError).toBe("Failed to load budget optimization");
    });
  });

  describe("clearErrors", () => {
    it("should clear all errors", () => {
      useCoachStore.setState({
        dashboardError: "e1",
        recommendationsError: "e2",
        goalsError: "e3",
        budgetError: "e4",
        debtError: "e5",
      });
      useCoachStore.getState().clearErrors();
      const state = useCoachStore.getState();
      expect(state.dashboardError).toBeNull();
      expect(state.recommendationsError).toBeNull();
      expect(state.goalsError).toBeNull();
      expect(state.budgetError).toBeNull();
      expect(state.debtError).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useCoachStore.setState({ dashboard: mockDashboard as never, goals: [mockGoal] as never[] });
      useCoachStore.getState().resetStore();
      expect(useCoachStore.getState().dashboard).toBeNull();
      expect(useCoachStore.getState().goals).toEqual([]);
    });
  });
});
