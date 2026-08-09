/**
 * Fynvita Debt Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useDebtStore,
  selectTotalDebt,
  selectDebts,
  selectHighestInterestDebt,
  selectSmallestDebt,
  selectDebtFreeDate,
  selectIsLoading,
} from "../debtStore";

jest.mock("../../services/api", () => ({
  debtApi: {
    getOverview: jest.fn(),
    calculatePayoff: jest.fn(),
  },
}));

const { debtApi } = require("../../services/api");

const mockOverview = {
  totalDebt: 50000,
  debts: [
    { id: "d-1", name: "CC", type: "credit_card", balance: 5000, interestRate: 22.0, minimumPayment: 150 },
    { id: "d-2", name: "Auto", type: "auto_loan", balance: 15000, interestRate: 5.5, minimumPayment: 350 },
    { id: "d-3", name: "Student", type: "student_loan", balance: 30000, interestRate: 6.8, minimumPayment: 300 },
  ],
  monthlyPayments: 800,
  projectedPayoffDate: "2030-06-15",
};

describe("Debt Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDebtStore.setState({
      overview: null,
      payoffCalculation: null,
      isLoadingOverview: false,
      isCalculatingPayoff: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useDebtStore.getState();
      expect(state.overview).toBeNull();
      expect(state.payoffCalculation).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("fetchOverview", () => {
    it("should fetch debt overview successfully", async () => {
      debtApi.getOverview.mockResolvedValue({ success: true, data: mockOverview });

      await act(async () => {
        await useDebtStore.getState().fetchOverview();
      });

      const state = useDebtStore.getState();
      expect(state.overview?.totalDebt).toBe(50000);
      expect(state.overview?.debts).toHaveLength(3);
      expect(state.isLoadingOverview).toBe(false);
    });

    it("should handle API error", async () => {
      debtApi.getOverview.mockResolvedValue({
        success: false,
        error: { message: "Unauthorized" },
      });

      await act(async () => {
        await useDebtStore.getState().fetchOverview();
      });

      expect(useDebtStore.getState().error).toBe("Unauthorized");
    });

    it("should handle thrown exception", async () => {
      debtApi.getOverview.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useDebtStore.getState().fetchOverview();
      });

      expect(useDebtStore.getState().error).toBe("Network error");
    });
  });

  describe("calculatePayoff", () => {
    it("should calculate payoff with snowball strategy", async () => {
      const mockPayoff = {
        timeline: [{ month: "2025-05", totalPaid: 800, remainingDebt: 49200 }],
        payoffDate: "2028-01-01",
        interestSaved: 5000,
        totalInterestPaid: 12000,
      };
      debtApi.calculatePayoff.mockResolvedValue({ success: true, data: mockPayoff });

      let result;
      await act(async () => {
        result = await useDebtStore.getState().calculatePayoff("snowball", 200);
      });

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("snowball");
      expect(useDebtStore.getState().payoffCalculation?.interestSaved).toBe(5000);
    });

    it("should return null on failure", async () => {
      debtApi.calculatePayoff.mockRejectedValue(new Error("Calc failed"));

      let result;
      await act(async () => {
        result = await useDebtStore.getState().calculatePayoff("avalanche");
      });

      expect(result).toBeNull();
      expect(useDebtStore.getState().error).toBe("Calc failed");
    });
  });

  describe("Selectors", () => {
    beforeEach(() => {
      useDebtStore.setState({ overview: mockOverview });
    });

    it("selectTotalDebt returns total", () => {
      expect(selectTotalDebt(useDebtStore.getState())).toBe(50000);
    });

    it("selectDebts returns debts array", () => {
      expect(selectDebts(useDebtStore.getState())).toHaveLength(3);
    });

    it("selectHighestInterestDebt returns CC", () => {
      expect(selectHighestInterestDebt(useDebtStore.getState())?.name).toBe("CC");
    });

    it("selectSmallestDebt returns CC", () => {
      expect(selectSmallestDebt(useDebtStore.getState())?.name).toBe("CC");
    });

    it("selectDebtFreeDate returns date", () => {
      expect(selectDebtFreeDate(useDebtStore.getState())).toBe("2030-06-15");
    });

    it("selectIsLoading reflects loading states", () => {
      expect(selectIsLoading(useDebtStore.getState())).toBe(false);
      useDebtStore.setState({ isCalculatingPayoff: true });
      expect(selectIsLoading(useDebtStore.getState())).toBe(true);
    });

    it("selectors return defaults when overview is null", () => {
      useDebtStore.setState({ overview: null });
      expect(selectTotalDebt(useDebtStore.getState())).toBe(0);
      expect(selectDebts(useDebtStore.getState())).toEqual([]);
      expect(selectHighestInterestDebt(useDebtStore.getState())).toBeNull();
      expect(selectSmallestDebt(useDebtStore.getState())).toBeNull();
      expect(selectDebtFreeDate(useDebtStore.getState())).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useDebtStore.setState({ overview: mockOverview, error: "err" });
      useDebtStore.getState().resetStore();
      expect(useDebtStore.getState().overview).toBeNull();
      expect(useDebtStore.getState().error).toBeNull();
    });
  });
});
