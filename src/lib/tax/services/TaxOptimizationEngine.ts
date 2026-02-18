/**
 * Tax Optimization Engine
 *
 * Main orchestrator for tax optimization analysis and recommendations.
 * Coordinates multiple specialized services to provide comprehensive tax guidance.
 *
 * SECURITY & COMPLIANCE:
 * - All recommendations logged for audit trail
 * - Disclaimers required on all tax advice
 * - PII handling follows GDPR/CCPA guidelines
 * - No tax data stored in logs
 *
 * LEGISLATION AWARENESS:
 * - Tax tables loaded from versioned configuration
 * - Easy to update when tax law changes
 * - Supports multiple tax years
 *
 * @module TaxOptimizationEngine
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();
import {
  TaxBracketCalculator,
  TaxCalculationResult,
} from './TaxBracketCalculator';
import {
  RetirementAccountOptimizer,
  RetirementOptimizationResult,
} from './RetirementAccountOptimizer';
import {
  TaxProfile,
  FilingStatus,
  OptimizationGoal,
  TaxAccountType,
  CONTRIBUTION_LIMITS_2024,
} from '../types/tax-profile.types';
import {
  TaxRecommendation,
  RecommendationPriority,
  RecommendationStatus,
  TAX_STRATEGIES,
  StrategyCategory,
} from '../types/tax-strategy.types';
import { FICA_RATES_2024 } from '../types/tax-jurisdiction.types';
import type { TaxOptimizationResult, TaxSavingsOpportunity } from '../types';

// ============================================================================
// QUARTERLY ESTIMATED TAX TYPES
// ============================================================================

/**
 * Represents a single quarter's estimated tax payment calculation.
 */
export interface QuarterlyEstimate {
  /** Quarter number (1-4) */
  quarter: 1 | 2 | 3 | 4;
  /** Due date for this quarterly payment */
  dueDate: Date;
  /** Period start date covered by this quarter */
  periodStart: Date;
  /** Period end date covered by this quarter */
  periodEnd: Date;
  /** Federal estimated tax payment for this quarter */
  federalPayment: number;
  /** State estimated tax payment for this quarter */
  statePayment: number;
  /** Self-employment tax portion for this quarter */
  selfEmploymentTaxPayment: number;
  /** Total payment due for this quarter (federal + state + SE) */
  totalPayment: number;
  /** Cumulative payments through this quarter */
  cumulativePayment: number;
  /** Whether this payment has passed its due date */
  isPastDue: boolean;
  /** Breakdown of quarterlyTax by component (federal, state, SE) */
  quarterlyTaxBreakdown: {
    federal: number;
    state: number;
    selfEmployment: number;
  };
}

/**
 * Result of safe harbor calculation per IRS rules.
 * Safe harbor protects taxpayers from underpayment penalties.
 */
export interface SafeHarborResult {
  /** 100% of prior year tax liability */
  priorYearTaxLiability: number;
  /** 90% of current year estimated tax liability */
  currentYearNinetyPercent: number;
  /** 110% of prior year (required for AGI > $150K / $75K MFS) */
  priorYearOneHundredTenPercent: number;
  /** Whether the high-income threshold applies (AGI > $150K) */
  isHighIncome: boolean;
  /** The safe harbor amount to use (minimum required to avoid penalty) */
  safeHarborAmount: number;
  /** The method that produced the lowest safe harbor amount */
  recommendedMethod: 'prior_year_100' | 'prior_year_110' | 'current_year_90';
  /** Required quarterly payment based on safe harbor */
  quarterlyPaymentRequired: number;
}

/**
 * Estimated underpayment penalty calculation based on IRS Form 2210
 * simplified method.
 */
export interface UnderpaymentPenalty {
  /** Whether an underpayment exists */
  hasUnderpayment: boolean;
  /** Total tax owed for the year */
  totalTaxOwed: number;
  /** Total payments made (withholding + estimated payments) */
  totalPaymentsMade: number;
  /** Amount of underpayment */
  underpaymentAmount: number;
  /** IRS penalty rate (federal short-term rate + 3%) */
  penaltyRate: number;
  /** Estimated penalty amount */
  estimatedPenalty: number;
  /** Number of days of underpayment (simplified) */
  underpaymentDays: number;
  /** Whether a penalty exception may apply */
  exceptionMayApply: boolean;
  /** Reason for possible exception */
  exceptionReason: string | null;
}

/**
 * A single entry in the quarterly payment schedule with
 * due dates and payment amounts.
 */
export interface PaymentScheduleEntry {
  /** Quarter number (1-4) */
  quarter: 1 | 2 | 3 | 4;
  /** Due date for payment */
  dueDate: Date;
  /** Label for the quarter (e.g., "Q1 (Jan-Mar)") */
  label: string;
  /** Income period covered */
  incomePeriod: string;
  /** Recommended federal estimated payment amount */
  federalPayment: number;
  /** Recommended state estimatedPayment amount */
  statePayment: number;
  /** Self-employment tax portion */
  selfEmploymentTaxPayment: number;
  /** Total recommended payment */
  totalPayment: number;
  /** Whether this quarter's payment is past due */
  isPastDue: boolean;
  /** Days until due date (negative if past due) */
  daysUntilDue: number;
  /** Payment voucher form number */
  federalVoucherForm: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TAX_DISCLAIMERS = [
  'Tax recommendations are for informational purposes only and do not constitute tax, legal, or financial advice.',
  'Consult a qualified tax professional before making any tax-related decisions.',
  'Tax laws change frequently. Recommendations are based on current law as of the analysis date.',
  'Individual circumstances vary. Results may differ based on your specific situation.',
  'Fynvita is not a registered tax advisor and does not provide professional tax preparation services.',
];

const AUDIT_ACTION_TYPES = {
  ANALYSIS_RUN: 'analysis_run',
  RECOMMENDATION_GENERATED: 'recommendation_generated',
  PROFILE_UPDATED: 'profile_updated',
  QUARTERLY_ESTIMATE: 'quarterly_estimate',
} as const;

// Self-employment tax rates
const SE_TAX = {
  /** Combined SS + Medicare rate for self-employed */
  combinedRate: 0.153,
  /** Social Security portion rate */
  socialSecurityRate: 0.124,
  /** Medicare portion rate */
  medicareRate: 0.029,
  /** Net earnings factor (92.35% of gross SE income) */
  netEarningsFactor: 0.9235,
} as const;

// IRS underpayment penalty rate (federal short-term rate + 3%)
// Updated quarterly by IRS; using 2024 Q1 rate as default
const IRS_UNDERPAYMENT_PENALTY_RATE = 0.08;

// Safe harbor AGI thresholds
const SAFE_HARBOR_HIGH_INCOME_THRESHOLD_JOINT = 150000;
const SAFE_HARBOR_HIGH_INCOME_THRESHOLD_MFS = 75000;

// ============================================================================
// TAX OPTIMIZATION ENGINE CLASS
// ============================================================================

export class TaxOptimizationEngine {
  private taxCalculator: TaxBracketCalculator;
  private retirementOptimizer: RetirementAccountOptimizer;

  constructor() {
    this.taxCalculator = new TaxBracketCalculator();
    this.retirementOptimizer = new RetirementAccountOptimizer();
  }

  /**
   * Run complete tax optimization analysis
   */
  async analyzeAndRecommend(
    userId: string,
    profile: TaxProfile
  ): Promise<TaxOptimizationResult> {
    const startTime = Date.now();

    // Step 1: Calculate current tax situation
    const currentProjection = this.taxCalculator.calculateTaxes(profile);

    // Step 2: Analyze retirement account opportunities
    const retirementAnalysis = this.retirementOptimizer.analyze(profile);

    // Step 3: Identify all tax-saving opportunities
    const opportunities = this.identifyOpportunities(
      profile,
      currentProjection
    );

    // Step 4: Generate personalized recommendations
    const recommendations = await this.generateRecommendations(
      profile,
      opportunities,
      retirementAnalysis
    );

    // Step 5: Calculate year-end actions
    const yearEndActions = this.getYearEndActions(profile, opportunities);

    // Step 6: Calculate totals
    const totalPotentialSavings = opportunities.reduce(
      (sum, opp) => sum + opp.potentialTaxSavings,
      0
    );

    // Step 7: Asset location analysis
    const assetLocationAnalysis = this.analyzeAssetLocation(profile);

    // Step 8: Log audit trail (async, non-blocking)
    this.logAuditEvent(userId, AUDIT_ACTION_TYPES.ANALYSIS_RUN, {
      taxYear: profile.taxYear,
      analysisTimeMs: Date.now() - startTime,
      opportunitiesFound: opportunities.length,
      recommendationsGenerated: recommendations.length,
    }).catch(() => {}); // Silent fail for audit logging

    return {
      userId,
      taxYear: profile.taxYear,
      analyzedAt: new Date(),

      currentProjection: this.mapToTaxProjection(currentProjection, profile),

      opportunities,
      totalPotentialSavings,

      topRecommendations: recommendations.slice(0, 5),

      retirementContributionGap: retirementAnalysis.totalUnusedCapacity,
      suggestedMonthlyContribution:
        this.calculateSuggestedMonthlyContribution(retirementAnalysis),

      assetLocationScore: assetLocationAnalysis.score,
      assetLocationSuggestions: assetLocationAnalysis.suggestions,

      yearEndActions,
    };
  }

  /**
   * Identify all tax-saving opportunities
   */
  private identifyOpportunities(
    profile: TaxProfile,
    taxCalc: TaxCalculationResult
  ): TaxSavingsOpportunity[] {
    const opportunities: TaxSavingsOpportunity[] = [];
    const marginalRate = taxCalc.marginalRate;

    // 1. 401(k) Contribution Opportunity
    const remaining401k =
      CONTRIBUTION_LIMITS_2024.traditional401k - profile.ytd401kContribution;
    if (remaining401k > 0) {
      opportunities.push({
        strategyCode: 'MAX_401K',
        strategyName: 'Maximize 401(k) Contributions',
        category: 'retirement',
        currentContribution: profile.ytd401kContribution,
        maxContribution: CONTRIBUTION_LIMITS_2024.traditional401k,
        remainingCapacity: remaining401k,
        potentialTaxSavings: remaining401k * marginalRate,
        recommendedAction: `Increase 401(k) contributions by $${remaining401k.toLocaleString()}`,
        deadline: new Date(profile.taxYear, 11, 31),
        priority: remaining401k > 10000 ? 'high' : 'medium',
        steps: [
          'Log into your employer benefits portal',
          'Increase your contribution percentage',
          'Consider front-loading contributions if cash flow allows',
        ],
        complexity: 'easy',
        requiresProfessional: false,
      });
    }

    // 2. IRA Contribution Opportunity
    const remainingIra =
      CONTRIBUTION_LIMITS_2024.traditionalIra - profile.ytdIraContribution;
    if (remainingIra > 0) {
      opportunities.push({
        strategyCode: 'MAX_IRA',
        strategyName: 'Maximize IRA Contributions',
        category: 'retirement',
        currentContribution: profile.ytdIraContribution,
        maxContribution: CONTRIBUTION_LIMITS_2024.traditionalIra,
        remainingCapacity: remainingIra,
        potentialTaxSavings: remainingIra * marginalRate,
        recommendedAction: `Contribute $${remainingIra.toLocaleString()} to your IRA`,
        deadline: new Date(profile.taxYear + 1, 3, 15), // April 15 of next year
        priority: 'medium',
        steps: [
          'Open or access your IRA account',
          'Make a lump-sum or monthly contributions',
          'Deadline is April 15 of the following year',
        ],
        complexity: 'easy',
        requiresProfessional: false,
      });
    }

    // 3. HSA Opportunity (if eligible)
    if (profile.hasHdhp) {
      const hsaLimit =
        profile.dependents.length > 0
          ? CONTRIBUTION_LIMITS_2024.hsaFamily
          : CONTRIBUTION_LIMITS_2024.hsaIndividual;
      const remainingHsa = hsaLimit - profile.ytdHsaContribution;

      if (remainingHsa > 0) {
        const hsaSavings = remainingHsa * (marginalRate + 0.0765); // Include FICA savings
        opportunities.push({
          strategyCode: 'HSA_TRIPLE_TAX',
          strategyName: 'HSA Triple Tax Advantage',
          category: 'retirement',
          currentContribution: profile.ytdHsaContribution,
          maxContribution: hsaLimit,
          remainingCapacity: remainingHsa,
          potentialTaxSavings: hsaSavings,
          recommendedAction: `Contribute $${remainingHsa.toLocaleString()} to your HSA`,
          deadline: new Date(profile.taxYear + 1, 3, 15),
          priority: 'high',
          steps: [
            'Contribute through payroll for FICA tax savings',
            'Or make direct contributions and claim on tax return',
            'Keep receipts for future tax-free reimbursement',
          ],
          complexity: 'easy',
          requiresProfessional: false,
        });
      }
    }

    // 4. Charitable Giving Opportunity
    if (
      profile.charitableDonations < profile.grossIncome * 0.1 &&
      taxCalc.taxableIncome > 0
    ) {
      const potentialDonation = Math.min(5000, profile.grossIncome * 0.05);
      const savings = potentialDonation * marginalRate;

      opportunities.push({
        strategyCode: 'CHARITABLE_BUNCHING',
        strategyName: 'Charitable Contribution Bunching',
        category: 'deduction',
        currentContribution: profile.charitableDonations,
        maxContribution: profile.grossIncome * 0.6, // 60% AGI limit
        remainingCapacity: potentialDonation,
        potentialTaxSavings: savings,
        recommendedAction: 'Consider charitable donations before year-end',
        deadline: new Date(profile.taxYear, 11, 31),
        priority: 'low',
        steps: [
          'Identify charities you want to support',
          'Consider bunching multiple years into one for itemization benefit',
          'Use a Donor Advised Fund for flexibility',
        ],
        complexity: 'easy',
        requiresProfessional: false,
      });
    }

    // 5. Self-Employment Tax Strategies
    if (profile.isSelfEmployed && profile.selfEmploymentIncome > 0) {
      const sepLimit = Math.min(
        profile.selfEmploymentIncome * 0.25,
        CONTRIBUTION_LIMITS_2024.sepIra
      );

      opportunities.push({
        strategyCode: 'SEP_IRA',
        strategyName: 'SEP IRA for Self-Employed',
        category: 'retirement',
        currentContribution: 0,
        maxContribution: sepLimit,
        remainingCapacity: sepLimit,
        potentialTaxSavings: sepLimit * marginalRate,
        recommendedAction: `Contribute up to $${sepLimit.toLocaleString()} to a SEP IRA`,
        deadline: new Date(profile.taxYear + 1, 3, 15),
        priority: 'high',
        steps: [
          "Open a SEP IRA if you don't have one",
          'Calculate 25% of net self-employment income',
          'Contribute before tax filing deadline (including extensions)',
        ],
        complexity: 'moderate',
        requiresProfessional: false,
      });

      // Home office deduction
      if (profile.homeOfficeSqft && profile.homeOfficeSqft > 0) {
        const homeOfficeDeduction = Math.min(profile.homeOfficeSqft * 5, 1500);
        opportunities.push({
          strategyCode: 'HOME_OFFICE',
          strategyName: 'Home Office Deduction',
          category: 'business',
          currentContribution: 0,
          maxContribution: 1500,
          remainingCapacity: homeOfficeDeduction,
          potentialTaxSavings: homeOfficeDeduction * marginalRate,
          recommendedAction: 'Claim home office deduction on Schedule C',
          priority: 'medium',
          steps: [
            'Measure your home office space',
            'Use simplified method ($5/sq ft, max 300 sq ft)',
            'Or calculate actual expenses proportionally',
          ],
          complexity: 'moderate',
          requiresProfessional: false,
        });
      }
    }

    // Sort by potential savings
    opportunities.sort((a, b) => b.potentialTaxSavings - a.potentialTaxSavings);

    return opportunities;
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(
    profile: TaxProfile,
    opportunities: TaxSavingsOpportunity[],
    retirementAnalysis: RetirementOptimizationResult
  ): Promise<TaxRecommendation[]> {
    const recommendations: TaxRecommendation[] = [];
    const now = new Date();

    // Convert opportunities to recommendations
    for (const opp of opportunities.slice(0, 10)) {
      const strategy = TAX_STRATEGIES.find((s) => s.code === opp.strategyCode);

      recommendations.push({
        id: crypto.randomUUID(),
        userId: profile.userId,
        taxYear: profile.taxYear,
        strategyId: opp.strategyCode,

        title: opp.strategyName,
        summary: opp.recommendedAction,
        description: strategy?.detailedExplanation || opp.recommendedAction,
        actionSteps: opp.steps.map((step, idx) => ({
          stepNumber: idx + 1,
          title: `Step ${idx + 1}`,
          description: step,
          isOptional: false,
        })),

        estimatedTaxSavings: opp.potentialTaxSavings,
        estimatedImplementationCost: 0,
        netBenefit: opp.potentialTaxSavings,
        confidenceLevel: 0.85,

        priority: this.mapPriority(opp.priority),
        deadline: opp.deadline,
        daysUntilDeadline: opp.deadline
          ? Math.ceil(
              (opp.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          : undefined,

        status: RecommendationStatus.PENDING,

        aiReasoning: this.generateAIReasoning(opp, profile),
        aiModelVersion: 'tax-optimizer-v1.0',

        createdAt: now,
        updatedAt: now,
      });
    }

    // Add retirement-specific recommendations from retirement analyzer
    for (const rec of retirementAnalysis.recommendations) {
      if (rec.employerMatchMissed > 0) {
        recommendations.unshift({
          id: crypto.randomUUID(),
          userId: profile.userId,
          taxYear: profile.taxYear,
          strategyId: 'EMPLOYER_MATCH',

          title: 'Missing Free Money: Employer Match',
          summary: `You're missing $${rec.employerMatchMissed.toLocaleString()} in employer 401(k) match!`,
          description:
            "Your employer offers matching contributions to your 401(k), but you're not contributing enough to get the full match. This is essentially free money with an immediate 50-100% return.",
          actionSteps: [
            {
              stepNumber: 1,
              title: 'Check Match',
              description: 'Verify your employer match percentage',
              isOptional: false,
            },
            {
              stepNumber: 2,
              title: 'Increase Contribution',
              description:
                'Increase your 401(k) contribution to at least the match threshold',
              isOptional: false,
            },
            {
              stepNumber: 3,
              title: 'Confirm',
              description: 'Verify the change in your next paycheck',
              isOptional: false,
            },
          ],

          estimatedTaxSavings: rec.employerMatchMissed,
          estimatedImplementationCost: 0,
          netBenefit: rec.employerMatchMissed,
          confidenceLevel: 0.99,

          priority: RecommendationPriority.CRITICAL,

          status: RecommendationStatus.PENDING,

          aiReasoning:
            'Employer match is guaranteed return. Not capturing it is leaving money on the table.',
          aiModelVersion: 'tax-optimizer-v1.0',

          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Sort by priority and savings
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return (b.estimatedTaxSavings || 0) - (a.estimatedTaxSavings || 0);
    });

    return recommendations;
  }

  /**
   * Get year-end tax actions
   */
  private getYearEndActions(
    profile: TaxProfile,
    opportunities: TaxSavingsOpportunity[]
  ): TaxOptimizationResult['yearEndActions'] {
    const actions: TaxOptimizationResult['yearEndActions'] = [];
    const yearEnd = new Date(profile.taxYear, 11, 31);

    // Filter opportunities with year-end deadlines
    for (const opp of opportunities) {
      if (opp.deadline && opp.deadline <= yearEnd) {
        actions.push({
          action: opp.recommendedAction,
          deadline: opp.deadline,
          estimatedSavings: opp.potentialTaxSavings,
          priority: opp.priority,
        });
      }
    }

    // Add standard year-end reminders
    actions.push({
      action:
        'Review and rebalance investment portfolio for tax-loss harvesting opportunities',
      deadline: yearEnd,
      estimatedSavings: 0,
      priority: 'medium',
    });

    actions.push({
      action: 'Gather charitable donation receipts and documentation',
      deadline: yearEnd,
      estimatedSavings: 0,
      priority: 'low',
    });

    return actions.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  /**
   * Analyze asset location optimization
   */
  private analyzeAssetLocation(profile: TaxProfile): {
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 70; // Base score

    // Check if user has multiple account types
    const accountTypes = new Set(profile.accounts.map((a) => a.accountType));

    if (
      accountTypes.has(TaxAccountType.TRADITIONAL_401K) &&
      accountTypes.has(TaxAccountType.ROTH_IRA) &&
      accountTypes.has(TaxAccountType.TAXABLE_BROKERAGE)
    ) {
      score += 10;
      suggestions.push(
        'Good diversification across account types for tax-efficient asset location.'
      );
    } else {
      suggestions.push(
        'Consider diversifying across Traditional, Roth, and taxable accounts for optimal tax efficiency.'
      );
    }

    if (accountTypes.has(TaxAccountType.HSA)) {
      score += 10;
      suggestions.push(
        'HSA provides excellent asset location for long-term healthcare expenses.'
      );
    }

    // General suggestions
    suggestions.push(
      'Place high-growth assets in Roth accounts for tax-free growth.'
    );
    suggestions.push(
      'Keep bonds and REITs in tax-deferred accounts to avoid ordinary income taxes.'
    );
    suggestions.push('Hold tax-efficient index funds in taxable accounts.');

    return { score: Math.min(100, score), suggestions };
  }

  /**
   * Map TaxProjection from calculation result
   */
  private mapToTaxProjection(calc: TaxCalculationResult, profile: TaxProfile) {
    return {
      taxYear: profile.taxYear,
      filingStatus: profile.filingStatus,
      stateCode: profile.stateOfResidence,

      grossIncome: calc.grossIncome,
      adjustedGrossIncome: calc.adjustedGrossIncome,
      taxableIncome: calc.taxableIncome,

      federalIncomeTax: calc.federalTax,
      federalEffectiveRate: calc.federalBreakdown.effectiveRate,
      federalMarginalRate: calc.federalBreakdown.marginalRate,

      stateIncomeTax: calc.stateTax,
      stateEffectiveRate: calc.stateBreakdown?.effectiveRate || 0,
      stateMarginalRate: calc.stateBreakdown?.marginalRate || 0,

      socialSecurityTax: calc.fica.socialSecurityTax,
      medicareTax: calc.fica.medicareTax,
      additionalMedicareTax: calc.fica.additionalMedicareTax,
      selfEmploymentTax: calc.selfEmploymentTax,

      niit: calc.niit,
      amt: 0,

      childTaxCredit: 0,
      earnedIncomeCredit: 0,
      educationCredits: 0,
      otherCredits: 0,
      totalCredits: calc.totalCredits,

      totalFederalTax: calc.federalTax,
      totalStateTax: calc.stateTax,
      totalTax: calc.totalTax,
      effectiveRate: calc.effectiveRate,

      takeHomePay: calc.takeHomePay,
      monthlyTakeHome: calc.monthlyTakeHome,
    };
  }

  /**
   * Calculate suggested monthly contribution
   */
  private calculateSuggestedMonthlyContribution(
    retirementAnalysis: RetirementOptimizationResult
  ): number {
    const monthsRemaining = Math.max(1, 12 - new Date().getMonth());
    return Math.ceil(retirementAnalysis.totalUnusedCapacity / monthsRemaining);
  }

  /**
   * Map priority string to enum
   */
  private mapPriority(priority: string): RecommendationPriority {
    switch (priority) {
      case 'critical':
        return RecommendationPriority.CRITICAL;
      case 'high':
        return RecommendationPriority.HIGH;
      case 'medium':
        return RecommendationPriority.MEDIUM;
      case 'low':
        return RecommendationPriority.LOW;
      default:
        return RecommendationPriority.MEDIUM;
    }
  }

  /**
   * Generate AI reasoning for recommendation
   */
  private generateAIReasoning(
    opp: TaxSavingsOpportunity,
    profile: TaxProfile
  ): string {
    const marginalRate = this.taxCalculator.getMarginalRate(
      profile.grossIncome,
      profile.filingStatus
    );

    return (
      `Based on your ${(marginalRate * 100).toFixed(0)}% marginal tax rate and ${profile.filingStatus.replace('_', ' ')} filing status, ` +
      `implementing this strategy could save you approximately $${opp.potentialTaxSavings.toLocaleString()} in taxes. ` +
      `This recommendation is ${opp.complexity} to implement and ${opp.requiresProfessional ? 'may require' : 'does not require'} professional assistance.`
    );
  }

  /**
   * Log audit event for compliance
   */
  private async logAuditEvent(
    userId: string,
    actionType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.from('tax_audit_log').insert({
        user_id: userId,
        action_type: actionType,
        entity_type: 'tax_analysis',
        new_values: details,
        created_at: new Date().toISOString(),
      });
    } catch (_error) {
      // TaxOptimizationEngine error: Failed to log tax audit event
      void _error;
    }
  }

  // ==========================================================================
  // QUARTERLY ESTIMATED TAX METHODS (TAX-003)
  // ==========================================================================

  /**
   * Calculate quarterly estimated tax payments for the given tax year.
   *
   * Computes federal income tax, state income tax, and self-employment tax,
   * then divides into four equal quarterly installments. Accounts for
   * withholding already taken from W-2 wages to determine the remaining
   * estimated tax obligation.
   *
   * @param profile       The user's tax profile for the current year
   * @param priorYearTax  Total tax liability from the prior year (for safe harbor)
   * @returns Array of 4 QuarterlyEstimate objects
   */
  calculateQuarterlyEstimatedTax(
    profile: TaxProfile,
    priorYearTax: number = 0
  ): QuarterlyEstimate[] {
    const taxCalc = this.taxCalculator.calculateTaxes(profile);
    const now = new Date();

    // Total annual tax liability
    const federalTaxOwed = taxCalc.federalTax;
    const stateTaxOwed = taxCalc.stateTax;
    const selfEmploymentTax = this.calculateSelfEmploymentTaxForEstimate(profile);

    // Subtract withholding already paid through W-2
    const remainingFederalTax = Math.max(
      0,
      federalTaxOwed - profile.federalWithheld
    );
    const remainingStateTax = Math.max(
      0,
      stateTaxOwed - profile.stateWithheld
    );

    // Self-employment tax is not withheld, so full amount is owed via estimates
    const totalEstimatedTaxNeeded =
      remainingFederalTax + remainingStateTax + selfEmploymentTax;

    // Safe harbor check: determine minimum required payment
    const safeHarbor = this.calculateSafeHarborAmount(
      profile,
      priorYearTax,
      taxCalc
    );

    // Use the higher of: estimated tax needed or safe harbor requirement
    // (minus withholding already applied to safe harbor)
    const safeHarborRemaining = Math.max(
      0,
      safeHarbor.safeHarborAmount - profile.federalWithheld - profile.stateWithheld
    );

    const annualEstimatedPayment = Math.max(
      totalEstimatedTaxNeeded,
      safeHarborRemaining
    );

    // Split into quarterly payments (equal installments)
    const quarterlyFederal = remainingFederalTax / 4;
    const quarterlyState = remainingStateTax / 4;
    const quarterlySE = selfEmploymentTax / 4;
    const quarterlyTotal = annualEstimatedPayment / 4;

    // Get quarterly due dates
    const dueDates = this.getQuarterlyDueDates(profile.taxYear);

    // Quarter period boundaries
    const periodBoundaries: { start: Date; end: Date }[] = [
      {
        start: new Date(profile.taxYear, 0, 1),
        end: new Date(profile.taxYear, 2, 31),
      },
      {
        start: new Date(profile.taxYear, 3, 1),
        end: new Date(profile.taxYear, 4, 31),
      },
      {
        start: new Date(profile.taxYear, 5, 1),
        end: new Date(profile.taxYear, 7, 31),
      },
      {
        start: new Date(profile.taxYear, 8, 1),
        end: new Date(profile.taxYear, 11, 31),
      },
    ];

    const quarters: QuarterlyEstimate[] = [];

    for (let i = 0; i < 4; i++) {
      const quarterNum = (i + 1) as 1 | 2 | 3 | 4;
      const cumulativePayment = quarterlyTotal * (i + 1);

      const roundedFederal = Math.round(quarterlyFederal * 100) / 100;
      const roundedState = Math.round(quarterlyState * 100) / 100;
      const roundedSE = Math.round(quarterlySE * 100) / 100;

      quarters.push({
        quarter: quarterNum,
        dueDate: dueDates[i],
        periodStart: periodBoundaries[i].start,
        periodEnd: periodBoundaries[i].end,
        federalPayment: roundedFederal,
        statePayment: roundedState,
        selfEmploymentTaxPayment: roundedSE,
        totalPayment: Math.round(quarterlyTotal * 100) / 100,
        cumulativePayment: Math.round(cumulativePayment * 100) / 100,
        isPastDue: now > dueDates[i],
        quarterlyTaxBreakdown: {
          federal: roundedFederal,
          state: roundedState,
          selfEmployment: roundedSE,
        },
      });
    }

    return quarters;
  }

  /**
   * Calculate the IRS safe harbor amount to avoid underpayment penalties.
   *
   * IRS safe harbor rules:
   * - Pay at least 90% of current year tax, OR
   * - Pay 100% of prior year tax (110% if AGI > $150K, or $75K if MFS)
   * The taxpayer must meet EITHER threshold to be penalty-free.
   *
   * @param profile        The user's current year tax profile
   * @param priorYearTax   Total tax liability from the prior tax year
   * @param currentCalc    Optional pre-computed current year tax calculation
   * @returns SafeHarborResult with amounts and recommended method
   */
  calculateSafeHarborAmount(
    profile: TaxProfile,
    priorYearTax: number = 0,
    currentCalc?: TaxCalculationResult
  ): SafeHarborResult {
    // Calculate current year tax if not provided
    const taxCalc = currentCalc ?? this.taxCalculator.calculateTaxes(profile);

    // Current year total tax including SE tax
    const selfEmploymentTax = this.calculateSelfEmploymentTaxForEstimate(profile);
    const currentYearTotalTax = taxCalc.totalTax + selfEmploymentTax;

    // 90% of current year estimated tax
    const currentYearNinetyPercent = currentYearTotalTax * 0.9;

    // Determine if high-income threshold applies
    const highIncomeThreshold =
      profile.filingStatus === FilingStatus.MARRIED_FILING_SEPARATELY
        ? SAFE_HARBOR_HIGH_INCOME_THRESHOLD_MFS
        : SAFE_HARBOR_HIGH_INCOME_THRESHOLD_JOINT;

    const agi = taxCalc.adjustedGrossIncome;
    const isHighIncome = agi > highIncomeThreshold;

    // 100% of prior year tax (or 110% for high income)
    const priorYearTaxLiability = priorYearTax;
    const priorYearOneHundredTenPercent = priorYearTax * 1.1;

    // Determine the applicable prior year threshold
    const applicablePriorYearAmount = isHighIncome
      ? priorYearOneHundredTenPercent
      : priorYearTaxLiability;

    // Safe harbor is the SMALLER of: 90% current year OR applicable prior year amount
    // (taxpayer needs to meet only ONE of the two thresholds)
    let safeHarborAmount: number;
    let recommendedMethod: SafeHarborResult['recommendedMethod'];

    if (priorYearTax <= 0) {
      // No prior year tax data available — use 90% of current year
      safeHarborAmount = currentYearNinetyPercent;
      recommendedMethod = 'current_year_90';
    } else if (currentYearNinetyPercent <= applicablePriorYearAmount) {
      safeHarborAmount = currentYearNinetyPercent;
      recommendedMethod = 'current_year_90';
    } else {
      safeHarborAmount = applicablePriorYearAmount;
      recommendedMethod = isHighIncome ? 'prior_year_110' : 'prior_year_100';
    }

    return {
      priorYearTaxLiability,
      currentYearNinetyPercent: Math.round(currentYearNinetyPercent * 100) / 100,
      priorYearOneHundredTenPercent:
        Math.round(priorYearOneHundredTenPercent * 100) / 100,
      isHighIncome,
      safeHarborAmount: Math.round(safeHarborAmount * 100) / 100,
      recommendedMethod,
      quarterlyPaymentRequired: Math.round((safeHarborAmount / 4) * 100) / 100,
    };
  }

  /**
   * Estimate the underpayment penalty using the IRS Form 2210 simplified method.
   *
   * The simplified method calculates penalty as:
   *   penalty = underpayment_amount * penalty_rate * (days_of_underpayment / 365)
   *
   * Exception: No penalty if total tax owed is under $1,000, or if
   * withholding covers at least 90% of current year tax or 100% (110% for
   * high income) of prior year tax.
   *
   * @param profile          The user's tax profile
   * @param priorYearTax     Prior year total tax liability
   * @param paymentsMade     Total estimated payments made during the year
   * @param penaltyRate      IRS penalty rate (defaults to current rate)
   * @returns UnderpaymentPenalty with penalty estimate and exception info
   */
  estimateUnderpaymentPenalty(
    profile: TaxProfile,
    priorYearTax: number = 0,
    paymentsMade: number = 0,
    penaltyRate: number = IRS_UNDERPAYMENT_PENALTY_RATE
  ): UnderpaymentPenalty {
    const taxCalc = this.taxCalculator.calculateTaxes(profile);
    const selfEmploymentTax = this.calculateSelfEmploymentTaxForEstimate(profile);
    const totalTaxOwed = taxCalc.totalTax + selfEmploymentTax;

    // Total payments = withholding + estimated payments made
    const totalPaymentsMade =
      profile.federalWithheld +
      profile.stateWithheld +
      profile.estimatedPayments +
      paymentsMade;

    const underpaymentAmount = Math.max(0, totalTaxOwed - totalPaymentsMade);

    // Check exceptions
    let exceptionMayApply = false;
    let exceptionReason: string | null = null;

    // Exception 1: Total tax owed is less than $1,000
    const remainingTaxAfterWithholding = Math.max(
      0,
      totalTaxOwed - profile.federalWithheld - profile.stateWithheld
    );
    if (remainingTaxAfterWithholding < 1000) {
      exceptionMayApply = true;
      exceptionReason =
        'Tax owed after withholding is less than $1,000. No penalty applies.';
    }

    // Exception 2: Safe harbor met
    if (!exceptionMayApply) {
      const safeHarbor = this.calculateSafeHarborAmount(
        profile,
        priorYearTax,
        taxCalc
      );
      if (totalPaymentsMade >= safeHarbor.safeHarborAmount) {
        exceptionMayApply = true;
        exceptionReason =
          'Payments meet safe harbor threshold. No penalty applies.';
      }
    }

    // Calculate penalty using simplified method
    // Assume underpayment spans from April 15 to April 15 (365 days)
    const underpaymentDays = underpaymentAmount > 0 ? 365 : 0;
    const estimatedPenalty = exceptionMayApply
      ? 0
      : Math.round(
          underpaymentAmount * penaltyRate * (underpaymentDays / 365) * 100
        ) / 100;

    return {
      hasUnderpayment: underpaymentAmount > 0 && !exceptionMayApply,
      totalTaxOwed: Math.round(totalTaxOwed * 100) / 100,
      totalPaymentsMade: Math.round(totalPaymentsMade * 100) / 100,
      underpaymentAmount: Math.round(underpaymentAmount * 100) / 100,
      penaltyRate,
      estimatedPenalty,
      underpaymentDays,
      exceptionMayApply,
      exceptionReason,
    };
  }

  /**
   * Get the full quarterly payment schedule with due dates, amounts,
   * and status information for each quarter.
   *
   * @param profile       The user's tax profile
   * @param priorYearTax  Prior year total tax liability (for safe harbor)
   * @returns Array of 4 PaymentScheduleEntry objects with complete details
   */
  getQuarterlyPaymentSchedule(
    profile: TaxProfile,
    priorYearTax: number = 0
  ): PaymentScheduleEntry[] {
    const estimates = this.calculateQuarterlyEstimatedTax(profile, priorYearTax);
    const now = new Date();

    const quarterLabels = [
      'Q1 (Jan-Mar)',
      'Q2 (Apr-May)',
      'Q3 (Jun-Aug)',
      'Q4 (Sep-Dec)',
    ];

    const incomePeriods = [
      'January 1 – March 31',
      'April 1 – May 31',
      'June 1 – August 31',
      'September 1 – December 31',
    ];

    const voucherForms = [
      '1040-ES (Voucher 1)',
      '1040-ES (Voucher 2)',
      '1040-ES (Voucher 3)',
      '1040-ES (Voucher 4)',
    ];

    return estimates.map((estimate, idx) => {
      const daysUntilDue = Math.ceil(
        (estimate.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        quarter: estimate.quarter,
        dueDate: estimate.dueDate,
        label: quarterLabels[idx],
        incomePeriod: incomePeriods[idx],
        federalPayment: estimate.federalPayment,
        statePayment: estimate.statePayment,
        selfEmploymentTaxPayment: estimate.selfEmploymentTaxPayment,
        totalPayment: estimate.totalPayment,
        isPastDue: estimate.isPastDue,
        daysUntilDue,
        federalVoucherForm: voucherForms[idx],
      };
    });
  }

  // ==========================================================================
  // QUARTERLY TAX PRIVATE HELPERS
  // ==========================================================================

  /**
   * Calculate self-employment tax for estimated tax purposes.
   * Uses the same IRS methodology: 92.35% of net SE income,
   * then applies SS (12.4% up to wage base) + Medicare (2.9%).
   */
  private calculateSelfEmploymentTaxForEstimate(profile: TaxProfile): number {
    if (!profile.isSelfEmployed || profile.selfEmploymentIncome <= 0) {
      return 0;
    }

    // Net self-employment earnings = 92.35% of gross SE income
    const netSE = profile.selfEmploymentIncome * SE_TAX.netEarningsFactor;

    // Social Security: 12.4% up to wage base, accounting for W-2 wages already taxed
    const remainingSSWageBase = Math.max(
      0,
      FICA_RATES_2024.socialSecurityWageBase - profile.w2Income
    );
    const ssTaxableIncome = Math.min(netSE, remainingSSWageBase);
    const ssTax = ssTaxableIncome * SE_TAX.socialSecurityRate;

    // Medicare: 2.9% on all SE income
    const medicareTax = netSE * SE_TAX.medicareRate;

    return ssTax + medicareTax;
  }

  /**
   * Get the four quarterly estimated tax due dates for a given tax year.
   * Standard IRS due dates:
   *   Q1: April 15
   *   Q2: June 15
   *   Q3: September 15
   *   Q4: January 15 of the following year
   *
   * Note: In practice, if a due date falls on a weekend or holiday,
   * the due date moves to the next business day. This method returns
   * the standard dates; business day adjustments can be layered on.
   */
  private getQuarterlyDueDates(taxYear: number): Date[] {
    return [
      new Date(taxYear, 3, 15),     // Q1: April 15
      new Date(taxYear, 5, 15),     // Q2: June 15
      new Date(taxYear, 8, 15),     // Q3: September 15
      new Date(taxYear + 1, 0, 15), // Q4: January 15 (next year)
    ];
  }

  /**
   * Get standard disclaimers
   */
  getDisclaimers(): string[] {
    return [...TAX_DISCLAIMERS];
  }
}

// Export singleton
export const taxOptimizationEngine = new TaxOptimizationEngine();
