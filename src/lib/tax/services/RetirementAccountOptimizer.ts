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
  TaxAccountType,
  FilingStatus,
  CONTRIBUTION_LIMITS_2024,
  INCOME_THRESHOLDS_2024,
} from "../types/tax-profile.types";
import {
  FEDERAL_TAX_BRACKETS_2024,
  type TaxBracket,
} from "../types/tax-jurisdiction.types";
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

  // Catch-up (age 50+)
  catchUpEligible: boolean;
  catchUpAmount: number;

  // Priority & Reasoning
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  warnings: string[];
}

export interface BracketOptimizationResult {
  currentBracket: number; // Current marginal rate
  nextLowerBracket: number; // Next lower bracket rate
  amountToFillCurrentBracket: number; // Room left in current bracket
  deductionToDropBracket: number; // Additional deduction to drop to lower bracket
  taxSavingsIfDropBracket: number; // Tax saved by dropping a bracket
  recommendedStrategy: string;
}

export interface RetirementReadinessProjection {
  currentAge: number;
  targetRetirementAge: number;
  yearsToRetirement: number;

  // Current State
  currentRetirementBalance: number;
  currentAnnualContributions: number;

  // Projections
  projectedBalanceAtRetirement: number;
  projectedMonthlyIncomeInRetirement: number;
  incomeReplacementRate: number; // As % of current income

  // Gap Analysis
  targetRetirementBalance: number; // Based on 80% income replacement
  retirementGap: number; // Negative = shortfall, positive = surplus
  additionalMonthlySavingsNeeded: number;

  // Milestones
  milestones: {
    age: number;
    year: number;
    projectedBalance: number;
  }[];

  // Rating
  readinessScore: "on_track" | "slightly_behind" | "significantly_behind" | "critical";
  readinessPercentage: number; // 0-100
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

  // Catch-up Contribution Summary (age 50+)
  catchUpEligible: boolean;
  totalCatchUpCapacity: number;

  // Tax Bracket Optimization
  bracketOptimization: BracketOptimizationResult;

  // Retirement Readiness Projection
  retirementReadiness: RetirementReadinessProjection | null;

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

    // Catch-up contribution summary
    const isCatchUpEligible = (profile.age ?? 0) >= 50;
    const totalCatchUpCapacity = recommendations.reduce(
      (sum, r) => sum + r.catchUpAmount,
      0,
    );

    // Tax bracket optimization
    const bracketOptimization = this.analyzeBracketOptimization(profile);

    // Retirement readiness projection
    const retirementReadiness = this.projectRetirementReadiness(profile);

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

      catchUpEligible: isCatchUpEligible,
      totalCatchUpCapacity,

      bracketOptimization,

      retirementReadiness,

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
    const isCatchUpEligible = (profile.age ?? 0) >= 50;
    const catchUpAmount = isCatchUpEligible
      ? CONTRIBUTION_LIMITS_2024.traditional401kCatchUp
      : 0;
    const maxContribution =
      CONTRIBUTION_LIMITS_2024.traditional401k + catchUpAmount;
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

    if (isCatchUpEligible) {
      warnings.push(
        `You're eligible for catch-up contributions of $${CONTRIBUTION_LIMITS_2024.traditional401kCatchUp.toLocaleString()}/year (age 50+), raising your 401(k) limit to $${maxContribution.toLocaleString()}.`,
      );
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
      catchUpEligible: isCatchUpEligible,
      catchUpAmount,
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
    const isCatchUpEligible = (profile.age ?? 0) >= 50;
    const catchUpAmount = isCatchUpEligible
      ? CONTRIBUTION_LIMITS_2024.iraCatchUp
      : 0;
    const maxContribution =
      CONTRIBUTION_LIMITS_2024.traditionalIra + catchUpAmount;
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

    if (isCatchUpEligible) {
      warnings.push(
        `You're eligible for IRA catch-up contributions of $${CONTRIBUTION_LIMITS_2024.iraCatchUp.toLocaleString()}/year (age 50+), raising your limit to $${maxContribution.toLocaleString()}.`,
      );
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
      catchUpEligible: isCatchUpEligible,
      catchUpAmount,
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
    const isCatchUpEligible = (profile.age ?? 0) >= 50;
    const catchUpAmount = isCatchUpEligible
      ? CONTRIBUTION_LIMITS_2024.iraCatchUp
      : 0;
    const maxContribution =
      CONTRIBUTION_LIMITS_2024.rothIra + catchUpAmount;

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
      catchUpEligible: isCatchUpEligible,
      catchUpAmount,
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
    const isHsaCatchUpEligible = (profile.age ?? 0) >= 55;
    const hsaCatchUpAmount = isHsaCatchUpEligible
      ? CONTRIBUTION_LIMITS_2024.hsaCatchUp
      : 0;

    // Determine limit based on coverage
    const hasFamily =
      profile.dependents.length > 0 ||
      profile.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY;
    const baseLimit = hasFamily
      ? CONTRIBUTION_LIMITS_2024.hsaFamily
      : CONTRIBUTION_LIMITS_2024.hsaIndividual;
    const maxContribution = baseLimit + hsaCatchUpAmount;

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
      catchUpEligible: isHsaCatchUpEligible,
      catchUpAmount: hsaCatchUpAmount,
      priority,
      reasoning,
      warnings: [
        "HSA requires a High Deductible Health Plan (HDHP).",
        ...(isHsaCatchUpEligible
          ? [
              `You're eligible for HSA catch-up contributions of $${CONTRIBUTION_LIMITS_2024.hsaCatchUp.toLocaleString()}/year (age 55+), raising your limit to $${maxContribution.toLocaleString()}.`,
            ]
          : []),
      ],
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
      catchUpEligible: false, // SEP IRA does not have catch-up contributions
      catchUpAmount: 0,
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
   * Analyze tax bracket optimization opportunities
   *
   * Calculates how much additional pre-tax contributions (Traditional 401k, IRA, HSA)
   * would be needed to drop the user into a lower marginal tax bracket.
   */
  analyzeBracketOptimization(profile: TaxProfile): BracketOptimizationResult {
    const currentMarginalRate = this.taxCalculator.getMarginalRate(
      profile.grossIncome,
      profile.filingStatus,
    );

    // Get the brackets for this filing status
    const brackets = this.getBracketsForFilingStatus(profile.filingStatus);

    // Find the current bracket
    let currentBracketIndex = -1;
    for (let i = 0; i < brackets.length; i++) {
      if (
        profile.grossIncome >= brackets[i].min &&
        profile.grossIncome < brackets[i].max
      ) {
        currentBracketIndex = i;
        break;
      }
    }

    // If in the lowest bracket or not found, there's no lower bracket to target
    if (currentBracketIndex <= 0) {
      return {
        currentBracket: currentMarginalRate,
        nextLowerBracket: currentMarginalRate,
        amountToFillCurrentBracket: 0,
        deductionToDropBracket: 0,
        taxSavingsIfDropBracket: 0,
        recommendedStrategy:
          "You are already in the lowest tax bracket. No bracket optimization needed.",
      };
    }

    const currentBracket = brackets[currentBracketIndex];
    const lowerBracket = brackets[currentBracketIndex - 1];

    // How much income is in the current bracket
    const incomeInCurrentBracket = profile.grossIncome - currentBracket.min;

    // How much room remains in the current bracket
    const amountToFillCurrentBracket =
      currentBracket.max === Infinity
        ? 0
        : currentBracket.max - profile.grossIncome;

    // To drop to the lower bracket, need to reduce taxable income below current bracket min
    const deductionToDropBracket = incomeInCurrentBracket;

    // Tax savings from that deduction = difference in rates * the amount moved
    const rateDifference = currentBracket.rate - lowerBracket.rate;
    const taxSavingsIfDropBracket = incomeInCurrentBracket * rateDifference;

    let recommendedStrategy: string;
    if (deductionToDropBracket <= 5000) {
      recommendedStrategy = `A small increase of $${deductionToDropBracket.toLocaleString()} in pre-tax contributions would drop you from the ${(currentBracket.rate * 100).toFixed(0)}% to the ${(lowerBracket.rate * 100).toFixed(0)}% bracket, saving $${taxSavingsIfDropBracket.toLocaleString()} in taxes.`;
    } else if (deductionToDropBracket <= 20000) {
      recommendedStrategy = `Increasing pre-tax contributions by $${deductionToDropBracket.toLocaleString()} would move you from the ${(currentBracket.rate * 100).toFixed(0)}% to the ${(lowerBracket.rate * 100).toFixed(0)}% bracket. Consider maximizing 401(k) and IRA contributions.`;
    } else {
      recommendedStrategy = `You would need $${deductionToDropBracket.toLocaleString()} in additional deductions to drop from the ${(currentBracket.rate * 100).toFixed(0)}% to the ${(lowerBracket.rate * 100).toFixed(0)}% bracket. Focus on maximizing all available pre-tax accounts.`;
    }

    return {
      currentBracket: currentMarginalRate,
      nextLowerBracket: lowerBracket.rate,
      amountToFillCurrentBracket,
      deductionToDropBracket,
      taxSavingsIfDropBracket,
      recommendedStrategy,
    };
  }

  /**
   * Project retirement readiness based on current contributions,
   * balances, age, and target retirement age.
   */
  projectRetirementReadiness(
    profile: TaxProfile,
  ): RetirementReadinessProjection | null {
    const currentAge = profile.age ?? 0;
    if (currentAge <= 0) {
      return null; // Cannot project without knowing age
    }

    const targetRetirementAge = profile.targetRetirementAge ?? 65;
    const yearsToRetirement = Math.max(0, targetRetirementAge - currentAge);
    const annualReturnRate = profile.expectedAnnualReturnRate ?? 0.07;

    // Current retirement balance
    const currentRetirementBalance = profile.accounts
      .filter((a) => this.isRetirementAccount(a.accountType))
      .reduce((sum, a) => sum + a.currentBalance, 0);

    // Current annual contributions (sum of all YTD contributions, annualized)
    const monthsElapsed = Math.max(1, new Date().getMonth() + 1);
    const currentAnnualContributions =
      ((profile.ytd401kContribution +
        profile.ytdIraContribution +
        profile.ytdRothIraContribution +
        profile.ytdHsaContribution) /
        monthsElapsed) *
      12;

    // Future Value calculation
    // FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
    const growthFactor = Math.pow(1 + annualReturnRate, yearsToRetirement);
    const futureValueOfBalance = currentRetirementBalance * growthFactor;
    const futureValueOfContributions =
      annualReturnRate > 0
        ? currentAnnualContributions *
          ((growthFactor - 1) / annualReturnRate)
        : currentAnnualContributions * yearsToRetirement;

    const projectedBalanceAtRetirement =
      futureValueOfBalance + futureValueOfContributions;

    // 4% safe withdrawal rate for monthly income
    const annualWithdrawal = projectedBalanceAtRetirement * 0.04;
    const projectedMonthlyIncomeInRetirement = annualWithdrawal / 12;

    // Income replacement rate (vs current gross income)
    const incomeReplacementRate =
      profile.grossIncome > 0
        ? (annualWithdrawal / profile.grossIncome) * 100
        : 0;

    // Target: 80% income replacement
    const targetAnnualIncome = profile.grossIncome * 0.8;
    const targetRetirementBalance = targetAnnualIncome / 0.04; // 4% rule
    const retirementGap =
      projectedBalanceAtRetirement - targetRetirementBalance;

    // Calculate additional monthly savings needed to close the gap
    let additionalMonthlySavingsNeeded = 0;
    if (retirementGap < 0 && yearsToRetirement > 0) {
      // Solve for PMT: FV = PMT * [((1 + r)^n - 1) / r]
      // PMT = FV / [((1 + r)^n - 1) / r]
      const annuityFactor =
        annualReturnRate > 0
          ? (growthFactor - 1) / annualReturnRate
          : yearsToRetirement;
      const additionalAnnualSavings = Math.abs(retirementGap) / annuityFactor;
      additionalMonthlySavingsNeeded = additionalAnnualSavings / 12;
    }

    // Generate milestones (every 5 years)
    const milestones: RetirementReadinessProjection["milestones"] = [];
    const currentYear = new Date().getFullYear();
    for (let yearOffset = 5; yearOffset <= yearsToRetirement; yearOffset += 5) {
      const gf = Math.pow(1 + annualReturnRate, yearOffset);
      const fvBalance = currentRetirementBalance * gf;
      const fvContrib =
        annualReturnRate > 0
          ? currentAnnualContributions * ((gf - 1) / annualReturnRate)
          : currentAnnualContributions * yearOffset;
      milestones.push({
        age: currentAge + yearOffset,
        year: currentYear + yearOffset,
        projectedBalance: Math.round(fvBalance + fvContrib),
      });
    }
    // Always include the retirement year if not already included
    if (
      yearsToRetirement > 0 &&
      (milestones.length === 0 ||
        milestones[milestones.length - 1].age !== targetRetirementAge)
    ) {
      milestones.push({
        age: targetRetirementAge,
        year: currentYear + yearsToRetirement,
        projectedBalance: Math.round(projectedBalanceAtRetirement),
      });
    }

    // Readiness score
    const readinessPercentage = Math.min(
      100,
      Math.max(
        0,
        (projectedBalanceAtRetirement / targetRetirementBalance) * 100,
      ),
    );

    let readinessScore: RetirementReadinessProjection["readinessScore"];
    if (readinessPercentage >= 90) {
      readinessScore = "on_track";
    } else if (readinessPercentage >= 70) {
      readinessScore = "slightly_behind";
    } else if (readinessPercentage >= 40) {
      readinessScore = "significantly_behind";
    } else {
      readinessScore = "critical";
    }

    return {
      currentAge,
      targetRetirementAge,
      yearsToRetirement,
      currentRetirementBalance,
      currentAnnualContributions: Math.round(currentAnnualContributions),
      projectedBalanceAtRetirement: Math.round(projectedBalanceAtRetirement),
      projectedMonthlyIncomeInRetirement: Math.round(
        projectedMonthlyIncomeInRetirement,
      ),
      incomeReplacementRate: Math.round(incomeReplacementRate * 10) / 10,
      targetRetirementBalance: Math.round(targetRetirementBalance),
      retirementGap: Math.round(retirementGap),
      additionalMonthlySavingsNeeded: Math.round(
        additionalMonthlySavingsNeeded,
      ),
      milestones,
      readinessScore,
      readinessPercentage: Math.round(readinessPercentage * 10) / 10,
    };
  }

  /**
   * Get federal tax brackets for a filing status
   */
  private getBracketsForFilingStatus(filingStatus: FilingStatus): TaxBracket[] {
    switch (filingStatus) {
      case FilingStatus.MARRIED_FILING_JOINTLY:
        return FEDERAL_TAX_BRACKETS_2024.married_filing_jointly;
      case FilingStatus.MARRIED_FILING_SEPARATELY:
        return FEDERAL_TAX_BRACKETS_2024.married_filing_separately;
      case FilingStatus.HEAD_OF_HOUSEHOLD:
        return FEDERAL_TAX_BRACKETS_2024.head_of_household;
      case FilingStatus.SINGLE:
      case FilingStatus.QUALIFYING_SURVIVING_SPOUSE:
      default:
        return FEDERAL_TAX_BRACKETS_2024.single;
    }
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
