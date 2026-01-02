/**
 * Debt Payoff Types
 * Types for debt payoff planning, strategies, and projections
 */

// Debt item with full details
export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: DebtType;
  balance: number;
  originalBalance: number;
  interestRate: number; // APR as percentage (e.g., 18.5)
  minimumPayment: number;
  dueDate?: string;
  linkedAccountId?: string;
  creditorName?: string;
  accountNumber?: string;
  startDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DebtType = 
  | 'credit_card'
  | 'student_loan'
  | 'auto_loan'
  | 'mortgage'
  | 'personal_loan'
  | 'medical'
  | 'other';

export type PayoffStrategy = 'avalanche' | 'snowball' | 'hybrid' | 'ai_optimized';

// Payoff calculation result
export interface PayoffPlan {
  strategy: PayoffStrategy;
  totalDebt: number;
  monthlyPayment: number;
  extraPayment: number;
  payoffDate: Date;
  totalMonths: number;
  totalInterestPaid: number;
  totalAmountPaid: number;
  interestSaved: number; // Compared to minimum payments only
  monthsSaved: number;
  debtOrder: DebtPayoffOrder[];
  timeline: PayoffTimelineEntry[];
}

export interface DebtPayoffOrder {
  debtId: string;
  debtName: string;
  balance: number;
  interestRate: number;
  payoffMonth: number;
  payoffDate: Date;
  totalInterestPaid: number;
  priority: number;
}

export interface PayoffTimelineEntry {
  month: number;
  date: Date;
  totalBalance: number;
  totalPaid: number;
  totalInterest: number;
  debtBalances: { [debtId: string]: number };
  debtsPaidOff: string[];
}

// Strategy comparison
export interface StrategyComparison {
  avalanche: PayoffPlan;
  snowball: PayoffPlan;
  hybrid: PayoffPlan;
  ai_optimized?: PayoffPlan;
  recommendation: PayoffStrategy;
  recommendationReason: string;
}

// Debt overview
export interface DebtOverview {
  totalDebt: number;
  totalMinimumPayments: number;
  averageInterestRate: number;
  highestInterestRate: number;
  lowestBalance: number;
  debtCount: number;
  debtToIncomeRatio?: number;
  monthlyIncome?: number;
  debtsByType: { [key in DebtType]?: number };
}

// Payoff milestone
export interface PayoffMilestone {
  id: string;
  type: 'percentage' | 'debt_paid' | 'amount';
  target: number | string;
  achieved: boolean;
  achievedDate?: Date;
  projectedDate: Date;
  description: string;
}

// Debt payment record
export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  principal: number;
  interest: number;
  paymentDate: string;
  isExtraPayment: boolean;
  createdAt: string;
}

// Payoff insight
export interface PayoffInsight {
  type: 'tip' | 'warning' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  impact?: string;
  actionable?: boolean;
  action?: string;
}

// API request/response types
export interface CalculatePayoffRequest {
  strategy: PayoffStrategy;
  extraPayment?: number;
  targetDate?: string;
}

export interface DebtPayoffResponse {
  overview: DebtOverview;
  debts: Debt[];
  currentPlan?: PayoffPlan;
  comparison?: StrategyComparison;
  milestones: PayoffMilestone[];
  insights: PayoffInsight[];
}

// Debt form data
export interface DebtFormData {
  name: string;
  type: DebtType;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate?: string;
  creditorName?: string;
  accountNumber?: string;
}

