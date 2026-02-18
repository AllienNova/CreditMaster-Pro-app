/**
 * Retirement Account Optimizer Service
 *
 * Analyzes and optimizes retirement account contributions for maximum tax benefit.
 * Supports 401(k), IRA, Roth IRA, HSA, SEP IRA, and other tax-advantaged accounts.
 *
 * SECURITY CONSIDERATIONS:
 * - All financial data is processed in-memory only
 * - No sensitive data is logged
 * - Recommendations include appropriate disclaimers
 *
 * @module RetirementAccountOptimizer
 */

import {
  TaxProfile,
  TaxAccount,
  TaxAccountType,
  FilingStatus,
  CONTRIBUTION_LIMITS_2024,
  INCOME_THRESHOLDS_2024,
} from "../types/tax-profile.types";
import { TaxBracketCalculator } from "./TaxBracketCalculator";

// ============================================================================
// TYPES
// ============================================================================

export interface ContributionRecommendation {
  accountType: TaxAccountType;
  accountName: string;

  // Current State
  currentContribution: number;
  maxContribution: number;
  remainingCapacity: number;

  // Employer Match
  employerMatchAvailable: number;
  employerMatchCaptured: number;
  employerMatchMissed: number;

  // Recommendation
  recommendedContribution: number;
  recommendedMonthlyIncrease: number;

  // Tax Impact
  estimatedTaxSavings: number;
  effectiveCostAfterTax: number;

  // Priority & Reasoning
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  warnings: string[];
}

export interface RetirementOptimizationResult {
  userId: string;
  taxYear: number;
  analyzedAt: Date;

  // Account Summary
  totalRetirementBalance: number;
  totalYtdContributions: number;
  totalContributionCapacity: number;
  totalUnusedCapacity: number;

  // Recommendations
  recommendations: ContributionRecommendation[];

  // Summary
  totalPotentialTaxSavings: number;
  totalEmployerMatchMissed: number;

  // Optimal Contribution Order
  contributionPriorityOrder: TaxAccountType[];

  // Roth vs Traditional Analysis
  rothVsTraditionalRecommendation: "roth" | "traditional" | "split";
  rothVsTraditionalReasoning: string;

  // Warnings
  warnings: string[];
  disclaimers: string[];
}

// ============================================================================
// RETIREMENT ACCOUNT OPTIMIZER CLASS
// ============================================================================

export class RetirementAccountOptimizer {
  private taxCalculator: TaxBracketCalculator;

  constructor() {
    this.taxCalculator = new TaxBracketCalculator();
  }

  /**
   * Analyze and optimize retirement contributions
   */
  analyze(profile: TaxProfile): RetirementOptimizationResult {
    const recommendations: ContributionRecommendation[] = [];
    const warnings: string[] = [];

    // Analyze each account type
    const accountAnalyses = [
      this.analyze401k(profile),
      this.analyzeIRA(profile),
      this.analyzeRothIRA(profile),
      this.analyzeHSA(profile),
      this.analyzeSEPIRA(profile),
    ].filter(Boolean) as ContributionRecommendation[];

    recommendations.push(...accountAnalyses);

    // Sort by priority and tax savings
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.estimatedTaxSavings - a.estimatedTaxSavings;
    });

    // Calculate totals
    const totalRetirementBalance = profile.accounts
      .filter((a) => this.isRetirementAccount(a.accountType))
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const totalYtdContributions = recommendations.reduce(
      (sum, r) => sum + r.currentContribution,
      0,
    );

    const totalContributionCapacity = recommendations.reduce(
      (sum, r) => sum + r.maxContribution,
      0,
    );

    const totalUnusedCapacity = recommendations.reduce(
      (sum, r) => sum + r.remainingCapacity,
      0,
    );

    const totalPotentialTaxSavings = recommendations.reduce(
      (sum, r) => sum + r.estimatedTaxSavings,
      0,
    );

    const totalEmployerMatchMissed = recommendations.reduce(
      (sum, r) => sum + r.employerMatchMissed,
      0,
    );

    // Determine Roth vs Traditional recommendation
    const rothAnalysis = this.analyzeRothVsTraditional(profile);

    // Generate contribution priority order
    const contributionPriorityOrder =
      this.getContributionPriorityOrder(profile);

    // Add income-based warnings
    if (
      profile.grossIncome > INCOME_THRESHOLDS_2024.rothIraPhaseOutSingle.end &&
      profile.filingStatus === FilingStatus.SINGLE
    ) {
      warnings.push(
        "Your income exceeds Roth IRA limits. Consider a Backdoor Roth IRA strategy.",
      );
    }

    return {
      userId: profile.userId,
      taxYear: profile.taxYear,
      analyzedAt: new Date(),

      totalRetirementBalance,
      totalYtdContributions,
      totalContributionCapacity,
      totalUnusedCapacity,

      recommendations,

      totalPotentialTaxSavings,
      totalEmployerMatchMissed,

      contributionPriorityOrder,

      rothVsTraditionalRecommendation: rothAnalysis.recommendation,
      rothVsTraditionalReasoning: rothAnalysis.reasoning,

      warnings,
      disclaimers: [
        "Tax recommendations are for informational purposes only.",
        "Consult a qualified tax professional before making retirement decisions.",
        "Contribution limits and tax rules are subject to change.",
      ],
    };
  }

  /**
   * Analyze 401(k) contributions
   */
  private analyze401k(profile: TaxProfile): ContributionRecommendation | null {
    const account = profile.accounts.find(
      (a) => a.accountType === TaxAccountType.TRADITIONAL_401K,
    );

    const currentContribution = profile.ytd401kContribution;
    const maxContribution = CONTRIBUTION_LIMITS_2024.traditional401k;
    const remainingCapacity = Math.max(
      0,
      maxContribution - currentContribution,
    );

    // Calculate employer match
    let employerMatchAvailable = 0;
    let employerMatchCaptured = 0;

    if (account?.employerMatchPercent && account.employerMatch) {
      const matchableContribution =
        profile.w2Income * (account.employerMatchPercent / 100);
      employerMatchAvailable = Math.min(
        matchableContribution,
        account.employerMatch,
      );

      // Estimate how much match has been captured based on YTD contribution
      const contributionRate =
        profile.w2Income > 0 ? currentContribution / profile.w2Income : 0;
      const matchRate = account.employerMatchPercent / 100;
      employerMatchCaptured =
        contributionRate >= matchRate
          ? employerMatchAvailable
          : (contributionRate / matchRate) * employerMatchAvailable;
    }

    const employerMatchMissed = employerMatchAvailable - employerMatchCaptured;

    // Calculate tax savings
    const taxSavings = this.taxCalculator.calculateDeductionSavings(
      remainingCapacity,
      profile.grossIncome,
      profile.filingStatus,
      profile.stateOfResidence,
    );

    // Determine priority
    let priority: ContributionRecommendation["priority"] = "medium";
    let reasoning = "";
    const warnings: string[] = [];

    if (employerMatchMissed > 0) {
      priority = "critical";
      reasoning = `You're missing $${employerMatchMissed.toLocaleString()} in free employer match! This is essentially a 50-100% immediate return on your contribution.`;
    } else if (remainingCapacity > 10000) {
      priority = "high";
      reasoning = `Maxing your 401(k) could save you $${taxSavings.totalSavings.toLocaleString()} in taxes this year.`;
    } else if (remainingCapacity > 0) {
      priority = "medium";
      reasoning = `You have $${remainingCapacity.toLocaleString()} of 401(k) contribution room remaining.`;
    } else {
      priority = "low";
      reasoning =
        "You've maxed out your 401(k) contributions for the year. Great job!";
    }

    // Calculate recommended monthly increase
    const monthsRemaining = 12 - new Date().getMonth();
    const recommendedMonthlyIncrease =
      monthsRemaining > 0 ? Math.ceil(remainingCapacity / monthsRemaining) : 0;

    return {
      accountType: TaxAccountType.TRADITIONAL_401K,
      accountName: account?.accountName || "401(k)",
      currentContribution,
      maxContribution,
      remainingCapacity,
      employerMatchAvailable,
      employerMatchCaptured,
      employerMatchMissed,
      recommendedContribution: remainingCapacity,
      recommendedMonthlyIncrease,
      estimatedTaxSavings: taxSavings.totalSavings,
      effectiveCostAfterTax: remainingCapacity - taxSavings.totalSavings,
      priority,
      reasoning,
      warnings,
    };
  }

  /**
   * Analyze Traditional IRA contributions
   */
  private analyzeIRA(profile: TaxProfile): ContributionRecommendation | null {
    const currentContribution = profile.ytdIraContribution;
    const maxContribution = CONTRIBUTION_LIMITS_2024.traditionalIra;
    const remainingCapacity = Math.max(
      0,
      maxContribution - currentContribution,
    );

    const warnings: string[] = [];

    // Check deductibility (if covered by workplace retirement plan)
    const hasWorkplacePlan = profile.accounts.some(
      (a) => a.accountType === TaxAccountType.TRADITIONAL_401K,
    );

    let isDeductible = true;
    if (hasWorkplacePlan) {
      const phaseOut =
        profile.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY
          ? INCOME_THRESHOLDS_2024.traditionalIraPhaseOutMarried
          : INCOME_THRESHOLDS_2024.traditionalIraPhaseOutSingle;

      if (profile.grossIncome > phaseOut.end) {
        isDeductible = false;
        warnings.push(
          "Your Traditional IRA contributions are NOT deductible due to income and workplace plan coverage.",
        );
      } else if (profile.grossIncome > phaseOut.start) {
        warnings.push(
          "Your Traditional IRA deduction is partially phased out.",
        );
      }
    }

    // Calculate tax savings
    const taxSavings = isDeductible
      ? this.taxCalculator.calculateDeductionSavings(
          remainingCapacity,
          profile.grossIncome,
          profile.filingStatus,
          profile.stateOfResidence,
        )
      : { federalSavings: 0, stateSavings: 0, totalSavings: 0 };

    let priority: ContributionRecommendation["priority"] = "medium";
    let reasoning = "";

    if (!isDeductible) {
      priority = "low";
      reasoning =
        "Traditional IRA contributions are not deductible at your income level. Consider Backdoor Roth instead.";
    } else if (remainingCapacity > 0) {
      priority = "medium";
      reasoning = `Contributing to your Traditional IRA could save you $${taxSavings.totalSavings.toLocaleString()} in taxes.`;
    } else {
      priority = "low";
      reasoning = "You've maxed out your IRA contributions for the year.";
    }

    const monthsRemaining = 12 - new Date().getMonth();

    return {
      accountType: TaxAccountType.TRADITIONAL_IRA,
      accountName: "Traditional IRA",
      currentContribution,
      maxContribution,
      remainingCapacity,
      employerMatchAvailable: 0,
      employerMatchCaptured: 0,
      employerMatchMissed: 0,
      recommendedContribution: remainingCapacity,
      recommendedMonthlyIncrease:
        monthsRemaining > 0
          ? Math.ceil(remainingCapacity / monthsRemaining)
          : 0,
      estimatedTaxSavings: taxSavings.totalSavings,
      effectiveCostAfterTax: remainingCapacity - taxSavings.totalSavings,
      priority,
      reasoning,
      warnings,
    };
  }

  /**
   * Analyze Roth IRA contributions
   */
  private analyzeRothIRA(
    profile: TaxProfile,
  ): ContributionRecommendation | null {
    const currentContribution = profile.ytdRothIraContribution;
    const maxContribution = CONTRIBUTION_LIMITS_2024.rothIra;

    const warnings: string[] = [];

    // Check eligibility
    const phaseOut =
      profile.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY
        ? INCOME_THRESHOLDS_2024.rothIraPhaseOutMarried
        : INCOME_THRESHOLDS_2024.rothIraPhaseOutSingle;

    let effectiveLimit: number = maxContribution;
    if (profile.grossIncome > phaseOut.end) {
      effectiveLimit = 0;
      warnings.push(
        "Your income exceeds Roth IRA limits. Consider Backdoor Roth IRA strategy.",
      );
    } else if (profile.grossIncome > phaseOut.start) {
      // Calculate phased-out limit
      const phaseOutRange = phaseOut.end - phaseOut.start;
      const incomeOverThreshold = profile.grossIncome - phaseOut.start;
      const reductionRatio = incomeOverThreshold / phaseOutRange;
      effectiveLimit = Math.round(maxContribution * (1 - reductionRatio));
      warnings.push(
        `Your Roth IRA contribution limit is reduced to $${effectiveLimit.toLocaleString()} due to income.`,
      );
    }

    const remainingCapacity = Math.max(0, effectiveLimit - currentContribution);

    let priority: ContributionRecommendation["priority"] = "medium";
    let reasoning = "";

    if (effectiveLimit === 0) {
      priority = "low";
      reasoning =
        "Direct Roth IRA contributions are not allowed at your income level. Use Backdoor Roth instead.";
    } else if (remainingCapacity > 0) {
      priority = "medium";
      reasoning = `Roth IRA offers tax-free growth and withdrawals in retirement. You have $${remainingCapacity.toLocaleString()} of contribution room.`;
    } else {
      priority = "low";
      reasoning = "You've maxed out your Roth IRA contributions for the year.";
    }

    const monthsRemaining = 12 - new Date().getMonth();

    return {
      accountType: TaxAccountType.ROTH_IRA,
      accountName: "Roth IRA",
      currentContribution,
      maxContribution: effectiveLimit,
      remainingCapacity,
      employerMatchAvailable: 0,
      employerMatchCaptured: 0,
      employerMatchMissed: 0,
      recommendedContribution: remainingCapacity,
      recommendedMonthlyIncrease:
        monthsRemaining > 0
          ? Math.ceil(remainingCapacity / monthsRemaining)
          : 0,
      estimatedTaxSavings: 0, // Roth doesn't give immediate tax savings
      effectiveCostAfterTax: remainingCapacity,
      priority,
      reasoning,
      warnings,
    };
  }

  /**
   * Analyze HSA contributions
   */
  private analyzeHSA(profile: TaxProfile): ContributionRecommendation | null {
    if (!profile.hasHdhp) {
      return null; // Not eligible for HSA
    }

    const currentContribution = profile.ytdHsaContribution;

    // Determine limit based on coverage
    const hasFamily =
      profile.dependents.length > 0 ||
      profile.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY;
    const maxContribution = hasFamily
      ? CONTRIBUTION_LIMITS_2024.hsaFamily
      : CONTRIBUTION_LIMITS_2024.hsaIndividual;

    const remainingCapacity = Math.max(
      0,
      maxContribution - currentContribution,
    );

    // HSA has triple tax benefit
    const taxSavings = this.taxCalculator.calculateDeductionSavings(
      remainingCapacity,
      profile.grossIncome,
      profile.filingStatus,
      profile.stateOfResidence,
    );

    // Add FICA savings (7.65% if contributed via payroll)
    const ficaSavings = remainingCapacity * 0.0765;
    const totalSavings = taxSavings.totalSavings + ficaSavings;

    let priority: ContributionRecommendation["priority"] = "high";
    const reasoning = `HSA offers triple tax benefits: deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses. Contributing $${remainingCapacity.toLocaleString()} saves approximately $${totalSavings.toLocaleString()} in taxes.`;

    if (remainingCapacity === 0) {
      priority = "low";
    }

    const monthsRemaining = 12 - new Date().getMonth();

    return {
      accountType: TaxAccountType.HSA,
      accountName: "Health Savings Account (HSA)",
      currentContribution,
      maxContribution,
      remainingCapacity,
      employerMatchAvailable: 0,
      employerMatchCaptured: 0,
      employerMatchMissed: 0,
      recommendedContribution: remainingCapacity,
      recommendedMonthlyIncrease:
        monthsRemaining > 0
          ? Math.ceil(remainingCapacity / monthsRemaining)
          : 0,
      estimatedTaxSavings: totalSavings,
      effectiveCostAfterTax: remainingCapacity - totalSavings,
      priority,
      reasoning,
      warnings: ["HSA requires a High Deductible Health Plan (HDHP)."],
    };
  }

  /**
   * Analyze SEP IRA contributions (for self-employed)
   */
  private analyzeSEPIRA(
    profile: TaxProfile,
  ): ContributionRecommendation | null {
    if (!profile.isSelfEmployed || profile.selfEmploymentIncome <= 0) {
      return null;
    }

    // SEP limit is 25% of net SE income, up to $69,000
    const netSEIncome = profile.selfEmploymentIncome * 0.9235; // After SE tax adjustment
    const maxContribution = Math.min(
      netSEIncome * CONTRIBUTION_LIMITS_2024.sepIraPercentLimit,
      CONTRIBUTION_LIMITS_2024.sepIra,
    );

    const currentContribution = 0; // Would come from profile
    const remainingCapacity = Math.max(
      0,
      maxContribution - currentContribution,
    );

    const taxSavings = this.taxCalculator.calculateDeductionSavings(
      remainingCapacity,
      profile.grossIncome,
      profile.filingStatus,
      profile.stateOfResidence,
    );

    const priority: ContributionRecommendation["priority"] =
      remainingCapacity > 10000 ? "high" : "medium";
    const reasoning = `As self-employed, you can contribute up to $${maxContribution.toLocaleString()} to a SEP IRA, saving approximately $${taxSavings.totalSavings.toLocaleString()} in taxes.`;

    const monthsRemaining = 12 - new Date().getMonth();

    return {
      accountType: TaxAccountType.SEP_IRA,
      accountName: "SEP IRA",
      currentContribution,
      maxContribution,
      remainingCapacity,
      employerMatchAvailable: 0,
      employerMatchCaptured: 0,
      employerMatchMissed: 0,
      recommendedContribution: remainingCapacity,
      recommendedMonthlyIncrease:
        monthsRemaining > 0
          ? Math.ceil(remainingCapacity / monthsRemaining)
          : 0,
      estimatedTaxSavings: taxSavings.totalSavings,
      effectiveCostAfterTax: remainingCapacity - taxSavings.totalSavings,
      priority,
      reasoning,
      warnings: [
        "SEP IRA deadline is your tax filing deadline (including extensions).",
      ],
    };
  }

  /**
   * Analyze Roth vs Traditional recommendation
   */
  private analyzeRothVsTraditional(profile: TaxProfile): {
    recommendation: "roth" | "traditional" | "split";
    reasoning: string;
  } {
    const marginalRate = this.taxCalculator.getMarginalRate(
      profile.grossIncome,
      profile.filingStatus,
    );

    // General heuristic: Roth if in lower brackets, Traditional if in higher brackets
    if (marginalRate <= 0.22) {
      return {
        recommendation: "roth",
        reasoning: `At your ${(marginalRate * 100).toFixed(0)}% marginal tax rate, Roth contributions are likely better. You'll pay lower taxes now and enjoy tax-free withdrawals in retirement when you may be in a higher bracket.`,
      };
    } else if (marginalRate >= 0.32) {
      return {
        recommendation: "traditional",
        reasoning: `At your ${(marginalRate * 100).toFixed(0)}% marginal tax rate, Traditional contributions are likely better. You'll save significant taxes now and can convert to Roth in lower-income years.`,
      };
    } else {
      return {
        recommendation: "split",
        reasoning: `At your ${(marginalRate * 100).toFixed(0)}% marginal tax rate, a split strategy may be optimal. Contribute enough Traditional to get employer match and reduce AGI, then contribute to Roth for tax diversification.`,
      };
    }
  }

  /**
   * Get optimal contribution priority order
   */
  private getContributionPriorityOrder(profile: TaxProfile): TaxAccountType[] {
    const order: TaxAccountType[] = [];

    // 1. 401(k) up to employer match (always first - free money)
    order.push(TaxAccountType.TRADITIONAL_401K);

    // 2. HSA if eligible (triple tax benefit)
    if (profile.hasHdhp) {
      order.push(TaxAccountType.HSA);
    }

    // 3. 401(k) to max
    // (already added above)

    // 4. IRA (Roth or Traditional based on analysis)
    const rothAnalysis = this.analyzeRothVsTraditional(profile);
    if (rothAnalysis.recommendation === "roth") {
      order.push(TaxAccountType.ROTH_IRA);
      order.push(TaxAccountType.TRADITIONAL_IRA);
    } else {
      order.push(TaxAccountType.TRADITIONAL_IRA);
      order.push(TaxAccountType.ROTH_IRA);
    }

    // 5. SEP IRA if self-employed
    if (profile.isSelfEmployed) {
      order.push(TaxAccountType.SEP_IRA);
    }

    // 6. Taxable brokerage (after all tax-advantaged)
    order.push(TaxAccountType.TAXABLE_BROKERAGE);

    return order;
  }

  /**
   * Check if account type is a retirement account
   */
  private isRetirementAccount(type: TaxAccountType): boolean {
    return [
      TaxAccountType.TRADITIONAL_401K,
      TaxAccountType.ROTH_401K,
      TaxAccountType.TRADITIONAL_IRA,
      TaxAccountType.ROTH_IRA,
      TaxAccountType.SEP_IRA,
      TaxAccountType.SIMPLE_IRA,
    ].includes(type);
  }
}

// Export singleton
export const retirementAccountOptimizer = new RetirementAccountOptimizer();
