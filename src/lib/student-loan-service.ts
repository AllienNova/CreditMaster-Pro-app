/**
 * Student Loan Service
 * Core database operations and business logic for student loans
 */

import { createClient } from '@supabase/supabase-js';
import type {
  StudentLoan,
  ServicerProfile,
  FederalProgramApplication,
  ServicerAnalysisResult
} from '../types/student-loan';

// Create a Supabase client for student loan operations
function getStudentLoanSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Type aliases for service-specific types
export type StudentLoanStrategy = {
  id: string;
  name: string;
  description: string;
  success_rate: number;
  applicable_loan_types: string[];
};

export type ServicerCommunication = {
  id: string;
  servicer_id: string;
  type: string;
  content: string;
  date: Date;
  status: string;
};

export type RegulatoryComplaint = {
  id: string;
  agency: string;
  complaint_type: string;
  status: string;
  filed_date: Date;
};

export type ComplianceAnalytics = {
  total_complaints: number;
  resolved_complaints: number;
  pending_complaints: number;
  compliance_score: number;
};

export type StudentLoanAnalysisResponse = {
  loans: StudentLoan[];
  total_balance: number;
  recommendations: string[];
  risk_assessment: string;
};

export type StrategyRecommendation = {
  strategy_id: string;
  strategy_name: string;
  confidence: number;
  rationale: string;
};

export type EligibilitySummary = {
  eligible_programs: string[];
  ineligible_programs: string[];
  pending_verification: string[];
};

export type ProjectedOutcomes = {
  best_case: number;
  worst_case: number;
  expected: number;
  timeline_months: number;
};

/**
 * Student Loan Service Class
 */
export class StudentLoanService {
  /**
   * Create a new student loan record
   */
  async createStudentLoan(loan: Omit<StudentLoan, 'id' | 'created_at' | 'updated_at'>): Promise<StudentLoan> {
    const supabase = getStudentLoanSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('student_loans')
      .insert(loan)
      .select()
      .single();

    if (error) throw error;
    return data as StudentLoan;
  }

  /**
   * Get student loans for a user
   */
  async getStudentLoans(userId: string): Promise<StudentLoan[]> {
    const supabase = getStudentLoanSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('student_loans')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []) as StudentLoan[];
  }

  /**
   * Get a single student loan by ID
   */
  async getStudentLoan(loanId: string): Promise<StudentLoan | null> {
    const supabase = getStudentLoanSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('student_loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (error) return null;
    return data as StudentLoan;
  }

  /**
   * Update a student loan
   */
  async updateStudentLoan(loanId: string, updates: Partial<StudentLoan>): Promise<StudentLoan> {
    const supabase = getStudentLoanSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('student_loans')
      .update(updates)
      .eq('id', loanId)
      .select()
      .single();

    if (error) throw error;
    return data as StudentLoan;
  }

  /**
   * Delete a student loan
   */
  async deleteStudentLoan(loanId: string): Promise<void> {
    const supabase = getStudentLoanSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('student_loans')
      .delete()
      .eq('id', loanId);

    if (error) throw error;
  }

  /**
   * Analyze student loans for a user
   */
  async analyzeLoans(userId: string): Promise<StudentLoanAnalysisResponse> {
    const loans = await this.getStudentLoans(userId);
    const totalBalance = loans.reduce((sum, loan) => sum + (loan.balance || 0), 0);
    
    return {
      loans,
      total_balance: totalBalance,
      recommendations: ['Review repayment options', 'Check for forgiveness eligibility'],
      risk_assessment: 'moderate'
    };
  }

  /**
   * Get strategy recommendations
   */
  async getStrategyRecommendations(loanId: string): Promise<StrategyRecommendation[]> {
    return [{
      strategy_id: 'strat_1',
      strategy_name: 'Income-Driven Repayment',
      confidence: 0.85,
      rationale: 'Based on loan type and balance'
    }];
  }
}

export const studentLoanService = new StudentLoanService();
export default studentLoanService;

