/**
 * Student Loans API Service
 *
 * API client for student loan management endpoints
 */

import { api } from "./client";

// ============================================================================
// TYPES
// ============================================================================

export type LoanType =
  | "federal_direct_subsidized"
  | "federal_direct_unsubsidized"
  | "federal_plus_parent"
  | "federal_plus_grad"
  | "federal_perkins"
  | "private"
  | "consolidated";

export type LoanStatus =
  | "in_repayment"
  | "in_grace"
  | "deferment"
  | "forbearance"
  | "default"
  | "cancelled"
  | "paid_in_full";

export interface StudentLoan {
  id: string;
  userId?: string;
  loanType: LoanType;
  servicer: string;
  accountNumber?: string;
  originalPrincipal: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  originationDate: string;
  status: LoanStatus;
  repaymentPlan?: string;
  remainingPayments?: number;
  pslf_eligible?: boolean;
  idr_eligible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioStats {
  totalDebt: number;
  totalMonthlyPayment: number;
  weightedInterestRate: number;
  averageInterestRate: number;
  loanCount: number;
  federalLoans: number;
  privateLoans: number;
  inRepayment: number;
  inDeferment: number;
  estimatedPayoffDate?: string;
  totalInterestPaid?: number;
  totalProjectedInterest?: number;
}

export interface AIStrategyRecommendation {
  id: string;
  name: string;
  type: "standard" | "idr" | "avalanche" | "snowball" | "pslf" | "refinance";
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  payoffMonths: number;
  forgiveness?: number;
  savings?: number;
  description: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
  confidence: number;
}

export interface CreateLoanInput {
  loanType: LoanType;
  servicer: string;
  accountNumber?: string;
  originalPrincipal: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  originationDate: string;
  status: LoanStatus;
  repaymentPlan?: string;
}

export interface UpdateLoanInput {
  currentBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
  status?: LoanStatus;
  repaymentPlan?: string;
  servicer?: string;
}

export interface FinancialSituation {
  annualIncome: number;
  filingStatus:
    | "single"
    | "married_filing_jointly"
    | "married_filing_separately"
    | "head_of_household";
  familySize: number;
  state: string;
  employmentType:
    | "public_service"
    | "private_sector"
    | "nonprofit"
    | "self_employed";
  yearsOfService?: number;
}

// ============================================================================
// API METHODS
// ============================================================================

export const studentLoansApi = {
  /**
   * Get all student loans for the current user
   */
  getLoans: async (): Promise<{ data: StudentLoan[]; error?: string }> => {
    try {
      const response = await api.get<{ loans: StudentLoan[] }>(
        "/student-loans",
      );
      return { data: response.data?.loans || [] };
    } catch (error) {
      if (__DEV__) console.error("Get loans error:", error);
      return {
        data: [],
        error: error instanceof Error ? error.message : "Failed to fetch loans",
      };
    }
  },

  /**
   * Get a single student loan by ID
   */
  getLoan: async (
    id: string,
  ): Promise<{ data: StudentLoan | null; error?: string }> => {
    try {
      const response = await api.get<StudentLoan>(`/student-loans/${id}`);
      return { data: response.data || null };
    } catch (error) {
      if (__DEV__) console.error("Get loan error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch loan",
      };
    }
  },

  /**
   * Add a new student loan
   */
  addLoan: async (
    loan: CreateLoanInput,
  ): Promise<{ data: StudentLoan | null; error?: string }> => {
    try {
      const response = await api.post<StudentLoan>("/student-loans", loan);
      return { data: response.data || null };
    } catch (error) {
      if (__DEV__) console.error("Add loan error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to add loan",
      };
    }
  },

  /**
   * Update an existing student loan
   */
  updateLoan: async (
    id: string,
    data: UpdateLoanInput,
  ): Promise<{ data: StudentLoan | null; error?: string }> => {
    try {
      const response = await api.patch<StudentLoan>(
        `/student-loans/${id}`,
        data,
      );
      return { data: response.data || null };
    } catch (error) {
      if (__DEV__) console.error("Update loan error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to update loan",
      };
    }
  },

  /**
   * Delete a student loan
   */
  deleteLoan: async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.delete(`/student-loans/${id}`);
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error("Delete loan error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete loan",
      };
    }
  },

  /**
   * Analyze portfolio and get statistics
   */
  analyzePortfolio: async (
    loans: StudentLoan[],
  ): Promise<{ data: PortfolioStats | null; error?: string }> => {
    try {
      const response = await api.post<PortfolioStats>(
        "/student-loans/analyze",
        { loans },
      );
      return { data: response.data || null };
    } catch (error) {
      if (__DEV__) console.error("Analyze portfolio error:", error);
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze portfolio",
      };
    }
  },

  /**
   * Generate AI repayment strategies
   */
  generateStrategies: async (
    loans: StudentLoan[],
    financialSituation: FinancialSituation,
  ): Promise<{ data: AIStrategyRecommendation[]; error?: string }> => {
    try {
      const response = await api.post<{
        strategies: AIStrategyRecommendation[];
      }>("/student-loans/strategy", { loans, financialSituation });
      return { data: response.data?.strategies || [] };
    } catch (error) {
      if (__DEV__) console.error("Generate strategies error:", error);
      return {
        data: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate strategies",
      };
    }
  },

  /**
   * Generate a dispute letter for a student loan
   */
  generateDispute: async (
    loanId: string,
    disputeType: string,
    details: string,
  ): Promise<{ data: string | null; error?: string }> => {
    try {
      const response = await api.post<{ letter: string }>(
        "/disputes/generate-student-loan",
        { loanId, disputeType, details },
      );
      return { data: response.data?.letter || null };
    } catch (error) {
      if (__DEV__) console.error("Generate dispute error:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to generate dispute",
      };
    }
  },

  /**
   * Check eligibility for federal programs
   */
  checkEligibility: async (
    loans: StudentLoan[],
    financialSituation: FinancialSituation,
  ): Promise<{ data: any; error?: string }> => {
    try {
      const response = await api.post("/federal/check-eligibility", {
        loans,
        financialSituation,
      });
      return { data: response };
    } catch (error) {
      if (__DEV__) console.error("Check eligibility error:", error);
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check eligibility",
      };
    }
  },
};

export default studentLoansApi;
