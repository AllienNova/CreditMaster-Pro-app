/**
 * Debt Strategy Optimizer Types
 *
 * Enhanced type definitions for AI-powered debt payoff optimization
 * Extends existing debt-payoff.types.ts with advanced strategy features
 */

import {
  Debt as BaseDebt,
  DebtType as BaseDebtType,
  PayoffMilestone,
  DebtPayment
} from './debt-payoff.types';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Debt payoff method strategies
 */
export enum PayoffMethod {
  /** Dave Ramsey method - smallest balance first for psychological wins */
  SNOWBALL = 'snowball',
  /** Mathematically optimal - highest interest rate first */
  AVALANCHE = 'avalanche',
  /** AI-powered hybrid approach balancing math and psychology */
  AI_OPTIMIZED = 'ai_optimized',
  /** Custom hybrid with configurable weights */
  HYBRID = 'hybrid',
}

/**
 * Debt type classification
 */
export enum DebtType {
  CREDIT_CARD = 'credit_card',
  STUDENT_LOAN = 'student_loan',
  PERSONAL_LOAN = 'personal_loan',
  MORTGAGE = 'mortgage',
  AUTO_LOAN = 'auto_loan',
  MEDICAL = 'medical',
  OTHER = 'other',
}

/**
 * Strategy optimization focus
 */
export enum StrategyFocus {
  /** Minimize total interest paid */
  INTEREST_SAVINGS = 'interest_savings',
  /** Maximize quick wins for motivation */
  QUICK_WINS = 'quick_wins',
  /** Balance between savings and motivation */
  BALANCED = 'balanced',
  /** Optimize for monthly cash flow */
  CASH_FLOW = 'cash_flow',
}

// ============================================================================
// CORE DEBT INTERFACES
// ============================================================================

/**
 * Individual debt with full details
 */
export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: DebtType;
  balance: number;
  originalBalance: number;
  interestRate: number; // APR as percentage (e.g., 18.5)
  minimumPayment: number;
  dueDate?: Date;
  creditorName?: string;
  accountNumber?: string;
  linkedAccountId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PAYOFF PLAN INTERFACES
// ============================================================================

/**
 * Complete debt payoff plan with timeline and projections
 */
export interface DebtPayoffPlan {
  id: string;
  userId: string;
  method: PayoffMethod;
  focus: StrategyFocus;
  createdAt: Date;

  // Financial metrics
  totalDebt: number;
  totalMinimumPayments: number;
  extraPayment: number;
  totalMonthlyPayment: number;

  // Timeline
  startDate: Date;
  payoffDate: Date;
  totalMonths: number;

  // Cost analysis
  totalInterestPaid: number;
  totalAmountPaid: number;
  interestSaved: number; // Compared to minimum payments only
  monthsSaved: number; // Compared to minimum payments only

  // Debt ordering
  debtOrder: DebtPayoffOrder[];

  // Detailed schedule
  schedule: PayoffSchedule[];

  // Milestones
  milestones: PayoffMilestone[];

  // Motivation tracking
  motivationMetrics: MotivationMetrics;

  // AI insights (for AI_OPTIMIZED method)
  aiInsights?: {
    reasoning: string;
    behavioralFactors: string[];
    confidenceScore: number;
    alternativeApproaches: string[];
  };
}

/**
 * Debt payoff order with priority
 */
export interface DebtPayoffOrder {
  debtId: string;
  debtName: string;
  debtType: DebtType;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  priority: number; // 1 = first to pay off
  payoffMonth: number;
  payoffDate: Date;
  totalInterestPaid: number;
  totalPaid: number;
  reasoning?: string; // Why this debt is prioritized
}

/**
 * Month-by-month payment schedule
 */
export interface PayoffSchedule {
  month: number;
  date: Date;

  // Overall metrics
  totalBalance: number;
  totalPaid: number;
  totalInterest: number;
  totalPrincipal: number;

  // Per-debt breakdown
  debtBalances: Record<string, number>;
  debtPayments: Record<string, DebtPayment>;

  // Milestones achieved this month
  milestonesAchieved: string[];

  // Debts paid off this month
  debtsPaidOff: string[];
}

/**
 * Motivation tracking metrics for debt payoff
 */
export interface MotivationMetrics {
  quickWins: number; // Number of debts paid off in first 6 months
  totalDebtsEliminated: number;
  percentageComplete: number;
  streakDays: number; // Days of consistent payments
  motivationScore: number; // 0-100
  psychologicalMomentum: 'high' | 'medium' | 'low';
  celebrationPoints: string[]; // Milestones achieved
}

