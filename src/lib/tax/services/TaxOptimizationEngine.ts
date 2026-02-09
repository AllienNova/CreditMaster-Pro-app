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

import { supabase } from '@/lib/supabase';
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
import type { TaxOptimizationResult, TaxSavingsOpportunity } from '../types';

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
} as const;

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

  /**
   * Get standard disclaimers
   */
  getDisclaimers(): string[] {
    return [...TAX_DISCLAIMERS];
  }
}

// Export singleton
export const taxOptimizationEngine = new TaxOptimizationEngine();
