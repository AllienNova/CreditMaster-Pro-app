/**
 * Fynvita Financial Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useFinancialStore,
  selectNetWorth,
  selectTotalBalance,
  selectBudgetProgress,
  selectGoalProgress,
} from "../financialStore";

// Mock API services
jest.mock("../../services/api", () => ({
  financialOverviewApi: {
    getDashboard: jest.fn(),
  },
  bankAccountApi: {
    getAccounts: jest.fn(),
    getPlaidLinkToken: jest.fn(),
    exchangePlaidToken: jest.fn(),
    refreshAccount: jest.fn(),
    disconnectAccount: jest.fn(),
  },
  transactionApi: {
    getAll: jest.fn(),
    getCategories: jest.fn(),
    updateCategory: jest.fn(),
  },
  budgetApi: {
    getAll: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    getAlerts: jest.fn(),
  },
  financialGoalsApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    addContribution: jest.fn(),
    delete: jest.fn(),
  },
  debtApi: {
    getOverview: jest.fn(),
    calculatePayoff: jest.fn(),
  },
}));

const {
  financialOverviewApi,
  bankAccountApi,
  transactionApi,
  budgetApi,
  financialGoalsApi,
  debtApi,
} = require("../../services/api");

import type {
  BankAccount,
  Transaction,
  Budget,
  FinancialGoal,
} from "../../services/api/types";

// Helper functions to create mock objects with required fields
const createMockBankAccount = (
  overrides: Partial<BankAccount> = {},
): BankAccount => ({
  id: overrides.id || "1",
  userId: overrides.userId || "user-1",
  institutionName: overrides.institutionName || "Test Bank",
  accountType: overrides.accountType || "checking",
  type: overrides.type || "checking",
  accountName: overrides.accountName || overrides.name || "Test Account",
  name: overrides.name || "Test Account",
  balance: overrides.balance ?? 1000,
  lastSynced: overrides.lastSynced || new Date().toISOString(),
  isConnected: overrides.isConnected ?? true,
});

const createMockTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: overrides.id || "1",
  accountId: overrides.accountId || "account-1",
  amount: overrides.amount ?? -50,
  category: overrides.category || "Food",
  merchantName: overrides.merchantName || "Test Merchant",
  date: overrides.date || new Date().toISOString(),
  pending: overrides.pending ?? false,
  type: overrides.type || "expense",
});

const createMockBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: overrides.id || "1",
  userId: overrides.userId || "user-1",
  category: overrides.category || "Food",
  limit: overrides.limit ?? 500,
  spent: overrides.spent ?? 250,
  remaining: overrides.remaining ?? 250,
  period: overrides.period || "monthly",
});

const createMockGoal = (
  overrides: Partial<FinancialGoal> = {},
): FinancialGoal => ({
  id: overrides.id || "1",
  userId: overrides.userId || "user-1",
  name: overrides.name || "Test Goal",
  targetAmount: overrides.targetAmount ?? 10000,
  currentAmount: overrides.currentAmount ?? 0,
  status: overrides.status || "active",
});

describe("Financial Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFinancialStore.getState().resetStore();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useFinancialStore.getState();
      expect(state.dashboard).toBeNull();
      expect(state.accounts).toEqual([]);
      expect(state.transactions).toEqual([]);
      expect(state.budgets).toEqual([]);
      expect(state.goals).toEqual([]);
      expect(state.isLoadingDashboard).toBe(false);
    });
  });

  describe("Dashboard", () => {
    it("should fetch dashboard successfully", async () => {
      const mockDashboard = {
        netWorth: 50000,
        totalAssets: 75000,
        totalLiabilities: 25000,
        monthlyIncome: 5000,
        monthlyExpenses: 3500,
        savingsRate: 30,
      };

      financialOverviewApi.getDashboard.mockResolvedValueOnce({
        success: true,
        data: mockDashboard,
      });

      await act(async () => {
        await useFinancialStore.getState().fetchDashboard();
      });

      expect(useFinancialStore.getState().dashboard).toEqual(mockDashboard);
    });
  });

  describe("Accounts", () => {
    it("should fetch accounts successfully", async () => {
      const mockAccounts = [
        { id: "1", name: "Checking", type: "checking", balance: 5000 },
        { id: "2", name: "Savings", type: "savings", balance: 10000 },
      ];

      bankAccountApi.getAccounts.mockResolvedValueOnce({
        success: true,
        data: { accounts: mockAccounts },
      });

      await act(async () => {
        await useFinancialStore.getState().fetchAccounts();
      });

      expect(useFinancialStore.getState().accounts).toEqual(mockAccounts);
    });

    it("should connect account and get link token", async () => {
      bankAccountApi.getPlaidLinkToken.mockResolvedValueOnce({
        success: true,
        data: { linkToken: "test-link-token" },
      });

      let result;
      await act(async () => {
        result = await useFinancialStore.getState().connectAccount();
      });

      expect(result).toEqual({ linkToken: "test-link-token" });
    });

    it("should disconnect account", async () => {
      useFinancialStore.setState({
        accounts: [createMockBankAccount({ id: "1", name: "Test" })],
      });

      bankAccountApi.disconnectAccount.mockResolvedValueOnce({ success: true });

      let result;
      await act(async () => {
        result = await useFinancialStore.getState().disconnectAccount("1");
      });

      expect(result).toBe(true);
      expect(useFinancialStore.getState().accounts).toHaveLength(0);
    });

    it("should select account", () => {
      useFinancialStore.getState().selectAccount("account-1");
      expect(useFinancialStore.getState().selectedAccountId).toBe("account-1");
    });
  });

  describe("Transactions", () => {
    it("should fetch transactions successfully", async () => {
      const mockTransactions = [
        createMockTransaction({
          id: "1",
          amount: -50,
          category: "Food",
          date: "2024-01-15",
        }),
        createMockTransaction({
          id: "2",
          amount: -100,
          category: "Shopping",
          date: "2024-01-14",
        }),
      ];

      transactionApi.getAll.mockResolvedValueOnce({
        success: true,
        data: { items: mockTransactions, total: 2 },
      });

      await act(async () => {
        await useFinancialStore.getState().fetchTransactions();
      });

      expect(useFinancialStore.getState().transactions).toEqual(
        mockTransactions,
      );
      expect(useFinancialStore.getState().totalTransactions).toBe(2);
    });

    it("should update transaction category", async () => {
      useFinancialStore.setState({
        transactions: [createMockTransaction({ id: "1", category: "Food" })],
      });

      transactionApi.updateCategory.mockResolvedValueOnce({
        success: true,
        data: createMockTransaction({ id: "1", category: "Dining" }),
      });

      let result;
      await act(async () => {
        result = await useFinancialStore
          .getState()
          .updateTransactionCategory("1", "Dining");
      });

      expect(result).toBe(true);
      expect(useFinancialStore.getState().transactions[0].category).toBe(
        "Dining",
      );
    });
  });

  describe("Budgets", () => {
    it("should fetch budgets successfully", async () => {
      const mockBudgets = [
        createMockBudget({ category: "Food", limit: 500, spent: 250 }),
        createMockBudget({
          id: "2",
          category: "Entertainment",
          limit: 200,
          spent: 150,
        }),
      ];

      budgetApi.getAll.mockResolvedValueOnce({
        success: true,
        data: { budgets: mockBudgets },
      });

      await act(async () => {
        await useFinancialStore.getState().fetchBudgets();
      });

      expect(useFinancialStore.getState().budgets).toEqual(mockBudgets);
    });

    it("should create budget", async () => {
      budgetApi.upsert.mockResolvedValueOnce({
        success: true,
        data: createMockBudget({
          category: "Travel",
          limit: 300,
          spent: 0,
          remaining: 300,
        }),
      });

      let result;
      await act(async () => {
        result = await useFinancialStore.getState().createBudget({
          category: "Travel",
          limit: 300,
          period: "monthly",
        });
      });

      expect(result).toBe(true);
      expect(useFinancialStore.getState().budgets).toHaveLength(1);
    });

    it("should delete budget", async () => {
      useFinancialStore.setState({
        budgets: [createMockBudget({ category: "Food", limit: 500 })],
      });

      budgetApi.delete.mockResolvedValueOnce({ success: true });

      let result;
      await act(async () => {
        result = await useFinancialStore.getState().deleteBudget("Food");
      });

      expect(result).toBe(true);
      expect(useFinancialStore.getState().budgets).toHaveLength(0);
    });
  });

  describe("Goals", () => {
    it("should fetch goals successfully", async () => {
      const mockGoals = [
        createMockGoal({
          id: "1",
          name: "Emergency Fund",
          targetAmount: 10000,
          currentAmount: 5000,
        }),
        createMockGoal({
          id: "2",
          name: "Vacation",
          targetAmount: 3000,
          currentAmount: 1500,
        }),
      ];

      financialGoalsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: { goals: mockGoals },
      });

      await act(async () => {
        await useFinancialStore.getState().fetchGoals();
      });

      expect(useFinancialStore.getState().goals).toEqual(mockGoals);
    });

    it("should create goal", async () => {
      financialGoalsApi.create.mockResolvedValueOnce({
        success: true,
        data: createMockGoal({
          id: "1",
          name: "New Car",
          targetAmount: 20000,
          currentAmount: 0,
        }),
      });

      let result;
      await act(async () => {
        result = await useFinancialStore.getState().createGoal({
          name: "New Car",
          targetAmount: 20000,
          targetDate: "2025-12-31",
        });
      });

      expect(result).toBe(true);
    });

    it("should contribute to goal", async () => {
      useFinancialStore.setState({
        goals: [createMockGoal({ id: "1", name: "Test", currentAmount: 100 })],
      });

      financialGoalsApi.addContribution.mockResolvedValueOnce({
        success: true,
        data: createMockGoal({ id: "1", name: "Test", currentAmount: 200 }),
      });

      let result;
      await act(async () => {
        result = await useFinancialStore.getState().contributeToGoal("1", 100);
      });

      expect(result).toBe(true);
      expect(useFinancialStore.getState().goals[0].currentAmount).toBe(200);
    });
  });

  describe("Debt", () => {
    it("should fetch debt overview", async () => {
      const mockDebt = {
        totalDebt: 25000,
        debts: [{ id: "1", name: "Credit Card", balance: 5000 }],
        monthlyPayments: 500,
      };

      debtApi.getOverview.mockResolvedValueOnce({
        success: true,
        data: mockDebt,
      });

      await act(async () => {
        await useFinancialStore.getState().fetchDebtOverview();
      });

      expect(useFinancialStore.getState().debtOverview).toEqual(mockDebt);
    });

    it("should calculate payoff", async () => {
      debtApi.calculatePayoff.mockResolvedValueOnce({
        success: true,
        data: {
          timeline: [
            { month: "2024-01", totalPaid: 500, remainingDebt: 24500 },
          ],
          payoffDate: "2028-01-01",
          interestSaved: 2000,
        },
      });

      const result = await useFinancialStore
        .getState()
        .calculatePayoff("avalanche", 100);

      expect(result).not.toBeNull();
      expect(result?.interestSaved).toBe(2000);
    });
  });

  describe("Selectors", () => {
    it("selectNetWorth should return net worth", () => {
      const state = { dashboard: { netWorth: 50000 } };
      expect(selectNetWorth(state as any)).toBe(50000);
    });

    it("selectNetWorth should return 0 when no dashboard", () => {
      expect(selectNetWorth({ dashboard: null } as any)).toBe(0);
    });

    it("selectTotalBalance should sum account balances", () => {
      const state = {
        accounts: [{ balance: 5000 }, { balance: 10000 }, { balance: 2500 }],
      };
      expect(selectTotalBalance(state as any)).toBe(17500);
    });

    it("selectBudgetProgress should calculate percentages", () => {
      const state = {
        budgets: [
          { category: "Food", limit: 500, spent: 250 },
          { category: "Entertainment", limit: 200, spent: 200 },
        ],
      };
      const progress = selectBudgetProgress(state as any);
      expect(progress[0].percentage).toBe(50);
      expect(progress[1].percentage).toBe(100);
    });

    it("selectGoalProgress should calculate percentages", () => {
      const state = {
        goals: [
          { id: "1", name: "Test", targetAmount: 10000, currentAmount: 2500 },
        ],
      };
      const progress = selectGoalProgress(state as any);
      expect(progress[0].percentage).toBe(25);
    });
  });
});
