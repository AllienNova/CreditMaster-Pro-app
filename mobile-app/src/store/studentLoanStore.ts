/**
 * Fynvita Student Loan Store
 * Manages student loan portfolio and AI repayment strategies
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  studentLoansApi,
  StudentLoan,
  PortfolioStats,
  AIStrategyRecommendation,
  CreateLoanInput,
  UpdateLoanInput,
  FinancialSituation,
  LoanStatus,
  LoanType,
} from '../services/api/studentLoans';

// Re-export types for convenience
export type {
  StudentLoan,
  PortfolioStats,
  AIStrategyRecommendation,
  CreateLoanInput,
  UpdateLoanInput,
  FinancialSituation,
  LoanStatus,
  LoanType,
};

interface StudentLoanState {
  // State
  loans: StudentLoan[];
  selectedLoan: StudentLoan | null;
  portfolioStats: PortfolioStats | null;
  strategies: AIStrategyRecommendation[];
  selectedStrategy: AIStrategyRecommendation | null;
  financialSituation: FinancialSituation | null;
  eligibilityResults: Record<string, unknown> | null;

  // Loading states
  isLoadingLoans: boolean;
  isLoadingStats: boolean;
  isLoadingStrategies: boolean;
  isAddingLoan: boolean;
  isUpdatingLoan: boolean;
  isDeletingLoan: boolean;
  isCheckingEligibility: boolean;

  // Error
  error: string | null;

  // Actions - Loans
  fetchLoans: () => Promise<void>;
  fetchLoan: (id: string) => Promise<StudentLoan | null>;
  addLoan: (loan: CreateLoanInput) => Promise<StudentLoan | null>;
  updateLoan: (id: string, data: UpdateLoanInput) => Promise<StudentLoan | null>;
  deleteLoan: (id: string) => Promise<boolean>;
  selectLoan: (loan: StudentLoan | null) => void;

  // Actions - Analysis
  analyzePortfolio: () => Promise<PortfolioStats | null>;
  generateStrategies: (financialSituation: FinancialSituation) => Promise<AIStrategyRecommendation[]>;
  selectStrategy: (strategy: AIStrategyRecommendation | null) => void;
  checkEligibility: (financialSituation: FinancialSituation) => Promise<Record<string, unknown> | null>;

  // Actions - Financial Situation
  setFinancialSituation: (situation: FinancialSituation) => void;

  // Utility
  clearError: () => void;
  resetStore: () => void;
  refreshAll: () => Promise<void>;
}

const initialState = {
  loans: [] as StudentLoan[],
  selectedLoan: null as StudentLoan | null,
  portfolioStats: null as PortfolioStats | null,
  strategies: [] as AIStrategyRecommendation[],
  selectedStrategy: null as AIStrategyRecommendation | null,
  financialSituation: null as FinancialSituation | null,
  eligibilityResults: null as Record<string, unknown> | null,
  isLoadingLoans: false,
  isLoadingStats: false,
  isLoadingStrategies: false,
  isAddingLoan: false,
  isUpdatingLoan: false,
  isDeletingLoan: false,
  isCheckingEligibility: false,
  error: null as string | null,
};

export const useStudentLoanStore = create<StudentLoanState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Fetch all loans
      fetchLoans: async () => {
        set({ isLoadingLoans: true, error: null });
        try {
          const response = await studentLoansApi.getLoans();
          if (response.error) {
            set({ error: response.error, isLoadingLoans: false });
          } else {
            set({ loans: response.data, isLoadingLoans: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch loans',
            isLoadingLoans: false,
          });
        }
      },

      // Fetch single loan
      fetchLoan: async (id: string) => {
        set({ isLoadingLoans: true, error: null });
        try {
          const response = await studentLoansApi.getLoan(id);
          if (response.error || !response.data) {
            set({ error: response.error || 'Loan not found', isLoadingLoans: false });
            return null;
          }
          set({ selectedLoan: response.data, isLoadingLoans: false });
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch loan',
            isLoadingLoans: false,
          });
          return null;
        }
      },

      // Add new loan
      addLoan: async (loan: CreateLoanInput) => {
        set({ isAddingLoan: true, error: null });
        try {
          const response = await studentLoansApi.addLoan(loan);
          if (response.error || !response.data) {
            set({ error: response.error || 'Failed to add loan', isAddingLoan: false });
            return null;
          }
          // Add to local state
          set((state) => ({
            loans: [...state.loans, response.data!],
            isAddingLoan: false,
          }));
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add loan',
            isAddingLoan: false,
          });
          return null;
        }
      },

      // Update loan
      updateLoan: async (id: string, data: UpdateLoanInput) => {
        set({ isUpdatingLoan: true, error: null });
        try {
          const response = await studentLoansApi.updateLoan(id, data);
          if (response.error || !response.data) {
            set({ error: response.error || 'Failed to update loan', isUpdatingLoan: false });
            return null;
          }
          // Update in local state
          set((state) => ({
            loans: state.loans.map((l) => (l.id === id ? response.data! : l)),
            selectedLoan: state.selectedLoan?.id === id ? response.data : state.selectedLoan,
            isUpdatingLoan: false,
          }));
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update loan',
            isUpdatingLoan: false,
          });
          return null;
        }
      },

      // Delete loan
      deleteLoan: async (id: string) => {
        set({ isDeletingLoan: true, error: null });
        try {
          const response = await studentLoansApi.deleteLoan(id);
          if (!response.success) {
            set({ error: response.error || 'Failed to delete loan', isDeletingLoan: false });
            return false;
          }
          // Remove from local state
          set((state) => ({
            loans: state.loans.filter((l) => l.id !== id),
            selectedLoan: state.selectedLoan?.id === id ? null : state.selectedLoan,
            isDeletingLoan: false,
          }));
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete loan',
            isDeletingLoan: false,
          });
          return false;
        }
      },

      // Select loan
      selectLoan: (loan: StudentLoan | null) => {
        set({ selectedLoan: loan });
      },

      // Analyze portfolio
      analyzePortfolio: async () => {
        const { loans } = get();
        if (loans.length === 0) {
          set({ portfolioStats: null });
          return null;
        }

        set({ isLoadingStats: true, error: null });
        try {
          const response = await studentLoansApi.analyzePortfolio(loans);
          if (response.error || !response.data) {
            set({ error: response.error || 'Failed to analyze portfolio', isLoadingStats: false });
            return null;
          }
          set({ portfolioStats: response.data, isLoadingStats: false });
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to analyze portfolio',
            isLoadingStats: false,
          });
          return null;
        }
      },

      // Generate AI strategies
      generateStrategies: async (financialSituation: FinancialSituation) => {
        const { loans } = get();
        if (loans.length === 0) {
          set({ strategies: [] });
          return [];
        }

        set({ isLoadingStrategies: true, error: null, financialSituation });
        try {
          const response = await studentLoansApi.generateStrategies(loans, financialSituation);
          if (response.error) {
            set({ error: response.error, isLoadingStrategies: false });
            return [];
          }
          set({ strategies: response.data, isLoadingStrategies: false });
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate strategies',
            isLoadingStrategies: false,
          });
          return [];
        }
      },

      // Select strategy
      selectStrategy: (strategy: AIStrategyRecommendation | null) => {
        set({ selectedStrategy: strategy });
      },

      // Check eligibility for federal programs
      checkEligibility: async (financialSituation: FinancialSituation) => {
        const { loans } = get();
        if (loans.length === 0) {
          return null;
        }

        set({ isCheckingEligibility: true, error: null });
        try {
          const response = await studentLoansApi.checkEligibility(loans, financialSituation);
          if (response.error || !response.data) {
            set({
              error: response.error || 'Failed to check eligibility',
              isCheckingEligibility: false,
            });
            return null;
          }
          set({ eligibilityResults: response.data, isCheckingEligibility: false });
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to check eligibility',
            isCheckingEligibility: false,
          });
          return null;
        }
      },

      // Set financial situation
      setFinancialSituation: (situation: FinancialSituation) => {
        set({ financialSituation: situation });
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      resetStore: () => set(initialState),

      // Refresh all data
      refreshAll: async () => {
        const { fetchLoans, analyzePortfolio, financialSituation, generateStrategies } = get();
        await fetchLoans();
        await analyzePortfolio();
        if (financialSituation) {
          await generateStrategies(financialSituation);
        }
      },
    }),
    {
      name: 'cpfi-student-loan-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        loans: state.loans,
        portfolioStats: state.portfolioStats,
        financialSituation: state.financialSituation,
        strategies: state.strategies,
      }),
    }
  )
);

// Selectors
export const selectLoans = (state: StudentLoanState) => state.loans;
export const selectSelectedLoan = (state: StudentLoanState) => state.selectedLoan;
export const selectPortfolioStats = (state: StudentLoanState) => state.portfolioStats;
export const selectStrategies = (state: StudentLoanState) => state.strategies;
export const selectSelectedStrategy = (state: StudentLoanState) => state.selectedStrategy;
export const selectFinancialSituation = (state: StudentLoanState) => state.financialSituation;
export const selectEligibilityResults = (state: StudentLoanState) => state.eligibilityResults;

// Computed selectors
export const selectTotalDebt = (state: StudentLoanState) =>
  state.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);

export const selectTotalMonthlyPayment = (state: StudentLoanState) =>
  state.loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

export const selectAverageInterestRate = (state: StudentLoanState) => {
  if (state.loans.length === 0) return 0;
  const totalBalance = state.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  if (totalBalance === 0) return 0;
  return state.loans.reduce(
    (sum, loan) => sum + (loan.interestRate * loan.currentBalance) / totalBalance,
    0
  );
};

export const selectLoansByType = (type: LoanType) => (state: StudentLoanState) =>
  state.loans.filter((loan) => loan.loanType === type);

export const selectLoansByStatus = (status: LoanStatus) => (state: StudentLoanState) =>
  state.loans.filter((loan) => loan.status === status);

export const selectFederalLoans = (state: StudentLoanState) =>
  state.loans.filter((loan) => loan.loanType !== 'private');

export const selectPrivateLoans = (state: StudentLoanState) =>
  state.loans.filter((loan) => loan.loanType === 'private');

export const selectLoansInRepayment = (state: StudentLoanState) =>
  state.loans.filter((loan) => loan.status === 'in_repayment');

export const selectHighestInterestLoan = (state: StudentLoanState) => {
  if (state.loans.length === 0) return null;
  return state.loans.reduce((highest, loan) =>
    loan.interestRate > highest.interestRate ? loan : highest
  );
};

export const selectSmallestBalanceLoan = (state: StudentLoanState) => {
  if (state.loans.length === 0) return null;
  return state.loans.reduce((smallest, loan) =>
    loan.currentBalance < smallest.currentBalance ? loan : smallest
  );
};

export const selectRecommendedStrategy = (state: StudentLoanState) =>
  state.strategies.find((s) => s.recommended) || null;

export const selectPSLFEligibleLoans = (state: StudentLoanState) =>
  state.loans.filter((loan) => loan.pslf_eligible);

export const selectIDREligibleLoans = (state: StudentLoanState) =>
  state.loans.filter((loan) => loan.idr_eligible);

export const selectIsLoading = (state: StudentLoanState) =>
  state.isLoadingLoans ||
  state.isLoadingStats ||
  state.isLoadingStrategies ||
  state.isAddingLoan ||
  state.isUpdatingLoan ||
  state.isDeletingLoan ||
  state.isCheckingEligibility;

export const selectError = (state: StudentLoanState) => state.error;
