/**
 * Tax Types Index
 *
 * Central export for all tax-related types and interfaces.
 */

export * from './tax-profile.types';
export * from './tax-strategy.types';
export * from './tax-jurisdiction.types';

// ============================================================================
// TAX ANALYSIS TYPES
// ============================================================================

export interface TaxProjection {
  taxYear: number;
  filingStatus: string;
  stateCode: string;

  // Income
  grossIncome: number;
  adjustedGrossIncome: number;
  taxableIncome: number;

  // Federal Taxes
  federalIncomeTax: number;
  federalEffectiveRate: number;
  federalMarginalRate: number;

  // State Taxes
  stateIncomeTax: number;
  stateEffectiveRate: number;
  stateMarginalRate: number;

  // FICA Taxes
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  selfEmploymentTax: number;

  // Additional Taxes
  niit: number; // Net Investment Income Tax
  amt: number; // Alternative Minimum Tax

  // Credits
  childTaxCredit: number;
  earnedIncomeCredit: number;
  educationCredits: number;
  otherCredits: number;
  totalCredits: number;

  // Totals
  totalFederalTax: number;
  totalStateTax: number;
  totalTax: number;
  effectiveRate: number;

  // Take-home
  takeHomePay: number;
  monthlyTakeHome: number;
}

export interface TaxSavingsOpportunity {
  strategyCode: string;
  strategyName: string;
  category: string;

  // Current State
  currentContribution: number;
  maxContribution: number;
  remainingCapacity: number;

  // Potential Savings
  potentialTaxSavings: number;
  potentialInvestmentGrowth?: number;

  // Action
  recommendedAction: string;
  deadline?: Date;
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Implementation
  steps: string[];
  complexity: 'easy' | 'moderate' | 'complex';
  requiresProfessional: boolean;
}

export interface TaxOptimizationResult {
  userId: string;
  taxYear: number;
  analyzedAt: Date;

  // Current Situation
  currentProjection: TaxProjection;

  // Opportunities
  opportunities: TaxSavingsOpportunity[];
  totalPotentialSavings: number;

  // Recommendations
  topRecommendations: TaxRecommendation[];

  // Retirement Optimization
  retirementContributionGap: number;
  suggestedMonthlyContribution: number;

  // Asset Location
  assetLocationScore: number;
  assetLocationSuggestions: string[];

  // Year-End Actions
  yearEndActions: {
    action: string;
    deadline: Date;
    estimatedSavings: number;
    priority: string;
  }[];

  // Multi-Year Projection
  fiveYearProjection?: {
    year: number;
    projectedTax: number;
    projectedSavings: number;
  }[];
}

export interface TaxScenario {
  id: string;
  userId: string;
  name: string;
  description?: string;

  // Scenario Changes
  changes: {
    type:
      | 'income_change'
      | 'contribution_change'
      | 'sale'
      | 'deduction'
      | 'filing_status'
      | 'state_change';
    description: string;
    value: number;
    details?: Record<string, unknown>;
  }[];

  // Results
  baselineProjection: TaxProjection;
  scenarioProjection: TaxProjection;
  taxDifference: number;

  // Comparison
  isBeneficial: boolean;
  savingsOrCost: number;
  recommendation: string;

  createdAt: Date;
}

export interface TaxCalendarEvent {
  id: string;
  userId: string;
  taxYear: number;

  eventType: 'deadline' | 'recommendation' | 'payment' | 'review';
  title: string;
  description: string;
  eventDate: Date;

  reminderDays: number[];
  isCompleted: boolean;
  completedAt?: Date;

  relatedRecommendationId?: string;

  createdAt: Date;
}

// Import for TaxRecommendation reference
import type { TaxRecommendation } from './tax-strategy.types';
