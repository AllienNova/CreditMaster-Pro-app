/**
 * Fynvita Student Loan Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useStudentLoanStore,
  selectTotalDebt,
  selectTotalMonthlyPayment,
  selectAverageInterestRate,
  selectHighestInterestLoan,
  selectSmallestBalanceLoan,
  selectFederalLoans,
  selectPrivateLoans,
  selectIsLoading,
} from "../studentLoanStore";

jest.mock("../../services/api/studentLoans", () => ({
  studentLoansApi: {
    getLoans: jest.fn(),
    getLoan: jest.fn(),
    addLoan: jest.fn(),
    updateLoan: jest.fn(),
    deleteLoan: jest.fn(),
    analyzePortfolio: jest.fn(),
    generateStrategies: jest.fn(),
    checkEligibility: jest.fn(),
  },
}));

const { studentLoansApi } = require("../../services/api/studentLoans");

const mockLoans = [
  {
    id: "sl-1", lender: "FedLoan", loanType: "direct_subsidized",
    currentBalance: 15000, interestRate: 4.5, monthlyPayment: 200,
    status: "in_repayment", pslf_eligible: true, idr_eligible: true,
  },
  {
    id: "sl-2", lender: "SallieMae", loanType: "private",
    currentBalance: 25000, interestRate: 7.2, monthlyPayment: 350,
    status: "in_repayment", pslf_eligible: false, idr_eligible: false,
  },
];

describe("Student Loan Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStudentLoanStore.getState().resetStore();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useStudentLoanStore.getState();
      expect(state.loans).toEqual([]);
      expect(state.selectedLoan).toBeNull();
      expect(state.portfolioStats).toBeNull();
      expect(state.strategies).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchLoans", () => {
    it("should fetch loans successfully", async () => {
      studentLoansApi.getLoans.mockResolvedValue({ data: mockLoans });

      await act(async () => {
        await useStudentLoanStore.getState().fetchLoans();
      });

      expect(useStudentLoanStore.getState().loans).toEqual(mockLoans);
      expect(useStudentLoanStore.getState().isLoadingLoans).toBe(false);
    });

    it("should handle error response", async () => {
      studentLoansApi.getLoans.mockResolvedValue({ error: "Unauthorized" });

      await act(async () => {
        await useStudentLoanStore.getState().fetchLoans();
      });

      expect(useStudentLoanStore.getState().error).toBe("Unauthorized");
    });

    it("should handle thrown exception", async () => {
      studentLoansApi.getLoans.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useStudentLoanStore.getState().fetchLoans();
      });

      expect(useStudentLoanStore.getState().error).toBe("Network error");
    });
  });

  describe("addLoan", () => {
    it("should add loan to list", async () => {
      const newLoan = { ...mockLoans[0], id: "sl-3" };
      studentLoansApi.addLoan.mockResolvedValue({ data: newLoan });

      let result;
      await act(async () => {
        result = await useStudentLoanStore.getState().addLoan({} as never);
      });

      expect(result).toEqual(newLoan);
      expect(useStudentLoanStore.getState().loans).toHaveLength(1);
    });

    it("should return null on failure", async () => {
      studentLoansApi.addLoan.mockResolvedValue({ error: "Invalid data" });

      let result;
      await act(async () => {
        result = await useStudentLoanStore.getState().addLoan({} as never);
      });

      expect(result).toBeNull();
    });
  });

  describe("updateLoan", () => {
    it("should update loan in list", async () => {
      useStudentLoanStore.setState({ loans: mockLoans as never[] });
      const updated = { ...mockLoans[0], currentBalance: 14000 };
      studentLoansApi.updateLoan.mockResolvedValue({ data: updated });

      let result;
      await act(async () => {
        result = await useStudentLoanStore.getState().updateLoan("sl-1", { currentBalance: 14000 } as never);
      });

      expect(result).toEqual(updated);
      expect(useStudentLoanStore.getState().loans[0].currentBalance).toBe(14000);
    });
  });

  describe("deleteLoan", () => {
    it("should remove loan from list", async () => {
      useStudentLoanStore.setState({ loans: mockLoans as never[] });
      studentLoansApi.deleteLoan.mockResolvedValue({ success: true });

      let result = false;
      await act(async () => {
        result = await useStudentLoanStore.getState().deleteLoan("sl-1");
      });

      expect(result).toBe(true);
      expect(useStudentLoanStore.getState().loans).toHaveLength(1);
    });

    it("should return false on failure", async () => {
      useStudentLoanStore.setState({ loans: mockLoans as never[] });
      studentLoansApi.deleteLoan.mockResolvedValue({ success: false, error: "Not found" });

      let result = true;
      await act(async () => {
        result = await useStudentLoanStore.getState().deleteLoan("sl-99");
      });

      expect(result).toBe(false);
    });
  });

  describe("selectLoan", () => {
    it("should set selected loan", () => {
      useStudentLoanStore.getState().selectLoan(mockLoans[0] as never);
      expect(useStudentLoanStore.getState().selectedLoan).toEqual(mockLoans[0]);
    });
  });

  describe("analyzePortfolio", () => {
    it("should return null when no loans", async () => {
      let result;
      await act(async () => {
        result = await useStudentLoanStore.getState().analyzePortfolio();
      });

      expect(result).toBeNull();
    });

    it("should analyze portfolio with loans", async () => {
      useStudentLoanStore.setState({ loans: mockLoans as never[] });
      const mockStats = { totalBalance: 40000, avgRate: 5.8 };
      studentLoansApi.analyzePortfolio.mockResolvedValue({ data: mockStats });

      let result;
      await act(async () => {
        result = await useStudentLoanStore.getState().analyzePortfolio();
      });

      expect(result).toEqual(mockStats);
      expect(useStudentLoanStore.getState().portfolioStats).toEqual(mockStats);
    });
  });

  describe("Selectors", () => {
    beforeEach(() => {
      useStudentLoanStore.setState({ loans: mockLoans as never[] });
    });

    it("selectTotalDebt sums balances", () => {
      expect(selectTotalDebt(useStudentLoanStore.getState())).toBe(40000);
    });

    it("selectTotalMonthlyPayment sums payments", () => {
      expect(selectTotalMonthlyPayment(useStudentLoanStore.getState())).toBe(550);
    });

    it("selectAverageInterestRate computes weighted average", () => {
      const rate = selectAverageInterestRate(useStudentLoanStore.getState());
      expect(rate).toBeGreaterThan(4);
      expect(rate).toBeLessThan(8);
    });

    it("selectHighestInterestLoan returns private loan", () => {
      expect(selectHighestInterestLoan(useStudentLoanStore.getState())?.id).toBe("sl-2");
    });

    it("selectSmallestBalanceLoan returns federal loan", () => {
      expect(selectSmallestBalanceLoan(useStudentLoanStore.getState())?.id).toBe("sl-1");
    });

    it("selectFederalLoans filters non-private", () => {
      expect(selectFederalLoans(useStudentLoanStore.getState())).toHaveLength(1);
    });

    it("selectPrivateLoans filters private", () => {
      expect(selectPrivateLoans(useStudentLoanStore.getState())).toHaveLength(1);
    });

    it("selectIsLoading checks all flags", () => {
      expect(selectIsLoading(useStudentLoanStore.getState())).toBe(false);
      useStudentLoanStore.setState({ isAddingLoan: true });
      expect(selectIsLoading(useStudentLoanStore.getState())).toBe(true);
    });

    it("returns defaults with empty loans", () => {
      useStudentLoanStore.setState({ loans: [] });
      expect(selectTotalDebt(useStudentLoanStore.getState())).toBe(0);
      expect(selectAverageInterestRate(useStudentLoanStore.getState())).toBe(0);
      expect(selectHighestInterestLoan(useStudentLoanStore.getState())).toBeNull();
      expect(selectSmallestBalanceLoan(useStudentLoanStore.getState())).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useStudentLoanStore.setState({ loans: mockLoans as never[], error: "err" });
      useStudentLoanStore.getState().resetStore();
      expect(useStudentLoanStore.getState().loans).toEqual([]);
      expect(useStudentLoanStore.getState().error).toBeNull();
    });
  });
});
