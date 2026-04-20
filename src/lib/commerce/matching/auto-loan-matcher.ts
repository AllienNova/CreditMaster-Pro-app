/**
 * Auto Loan Matcher
 *
 * Recommends the best auto loan lenders based on user credit profile,
 * vehicle details, and affordability. Follows the credit-card-matcher pattern.
 */

import {
  calculateAutoLoan,
} from "../calculators/auto-loan-calculator";
import {
  calculatePreApprovalOdds,
  type PreApprovalOdds,
} from "./pre-approval-calculator";
import { calculateDTI } from "../calculators/dti-calculator";

// =============================================================================
// Types
// =============================================================================

export interface AutoLoanMatcherInput {
  creditScore: number;
  monthlyIncome: number;
  currentMonthlyDebt: number;
  vehiclePrice: number;
  downPayment: number;
  preferredTerm?: number; // months
  vehicleYear?: number;
  isNewVehicle?: boolean;
}

export interface AutoLoanRecommendation {
  offerId: string;
  lenderName: string;
  matchScore: number; // 0-100
  preApprovalOdds: PreApprovalOdds;
  estimatedAPR: { min: number; max: number; likely: number };
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  termMonths: number;
  highlights: string[];
  features: string[];
}

// =============================================================================
// Lender Data
// =============================================================================

interface AprTier {
  minScore: number;
  maxScore: number;
  minAPR: number; // decimal
  maxAPR: number; // decimal
}

interface LenderConfig {
  id: string;
  name: string;
  minCreditScore: number;
  aprTiers: AprTier[];
  newVehicleDiscount: number; // APR reduction for new vehicles, as decimal
  termsOffered: number[]; // available term lengths in months
  maxLTV: number; // max loan-to-value ratio
  features: string[];
  tags: string[];
}

const LENDERS: LenderConfig[] = [
  {
    id: "capital-one-auto",
    name: "Capital One Auto",
    minCreditScore: 600,
    aprTiers: [
      { minScore: 750, maxScore: 850, minAPR: 0.0449, maxAPR: 0.0699 },
      { minScore: 700, maxScore: 749, minAPR: 0.0599, maxAPR: 0.0899 },
      { minScore: 650, maxScore: 699, minAPR: 0.0849, maxAPR: 0.1199 },
      { minScore: 600, maxScore: 649, minAPR: 0.1099, maxAPR: 0.1599 },
    ],
    newVehicleDiscount: 0.005,
    termsOffered: [36, 48, 60, 72, 84],
    maxLTV: 1.1,
    features: ["Pre-qualify with no hard inquiry", "Online application", "Quick decisions"],
    tags: ["no_hard_inquiry_prequalify"],
  },
  {
    id: "wells-fargo-auto",
    name: "Wells Fargo Auto",
    minCreditScore: 660,
    aprTiers: [
      { minScore: 750, maxScore: 850, minAPR: 0.0399, maxAPR: 0.0649 },
      { minScore: 700, maxScore: 749, minAPR: 0.0549, maxAPR: 0.0849 },
      { minScore: 660, maxScore: 699, minAPR: 0.0799, maxAPR: 0.1099 },
    ],
    newVehicleDiscount: 0.0025,
    termsOffered: [24, 36, 48, 60, 72],
    maxLTV: 1.05,
    features: ["Existing customer discount", "Dealer network", "Rate lock available"],
    tags: ["existing_customer_discount"],
  },
  {
    id: "chase-auto-finance",
    name: "Chase Auto Finance",
    minCreditScore: 680,
    aprTiers: [
      { minScore: 750, maxScore: 850, minAPR: 0.0349, maxAPR: 0.0599 },
      { minScore: 720, maxScore: 749, minAPR: 0.0499, maxAPR: 0.0749 },
      { minScore: 680, maxScore: 719, minAPR: 0.0699, maxAPR: 0.0999 },
    ],
    newVehicleDiscount: 0.005,
    termsOffered: [36, 48, 60, 72],
    maxLTV: 1.0,
    features: ["Lowest rates for prime borrowers", "Large dealer network", "Relationship discount"],
    tags: ["prime_rates", "dealer_network"],
  },
  {
    id: "bank-of-america-auto",
    name: "Bank of America Auto",
    minCreditScore: 650,
    aprTiers: [
      { minScore: 750, maxScore: 850, minAPR: 0.0379, maxAPR: 0.0629 },
      { minScore: 700, maxScore: 749, minAPR: 0.0529, maxAPR: 0.0829 },
      { minScore: 650, maxScore: 699, minAPR: 0.0779, maxAPR: 0.1129 },
    ],
    newVehicleDiscount: 0.0025,
    termsOffered: [24, 36, 48, 60, 72, 84],
    maxLTV: 1.1,
    features: ["Preferred Rewards discount up to 0.5%", "Apply in branch or online", "No application fee"],
    tags: ["preferred_rewards"],
  },
  {
    id: "lightstream",
    name: "LightStream",
    minCreditScore: 660,
    aprTiers: [
      { minScore: 750, maxScore: 850, minAPR: 0.0299, maxAPR: 0.0549 },
      { minScore: 700, maxScore: 749, minAPR: 0.0449, maxAPR: 0.0699 },
      { minScore: 660, maxScore: 699, minAPR: 0.0599, maxAPR: 0.0899 },
    ],
    newVehicleDiscount: 0.0,
    termsOffered: [24, 36, 48, 60, 72, 84],
    maxLTV: 1.0,
    features: ["No fees of any kind", "Rate Beat Program", "Same-day funding"],
    tags: ["no_fees", "rate_beat"],
  },
  {
    id: "carvana",
    name: "Carvana",
    minCreditScore: 500,
    aprTiers: [
      { minScore: 700, maxScore: 850, minAPR: 0.0599, maxAPR: 0.0999 },
      { minScore: 600, maxScore: 699, minAPR: 0.0999, maxAPR: 0.1599 },
      { minScore: 500, maxScore: 599, minAPR: 0.1499, maxAPR: 0.2499 },
    ],
    newVehicleDiscount: 0.0,
    termsOffered: [36, 48, 60, 72],
    maxLTV: 1.2,
    features: ["Online-only buying experience", "7-day return policy", "All credit types considered"],
    tags: ["all_credit_types", "online_only", "return_policy"],
  },
  {
    id: "myautoloan",
    name: "myAutoloan.com",
    minCreditScore: 550,
    aprTiers: [
      { minScore: 700, maxScore: 850, minAPR: 0.0549, maxAPR: 0.0899 },
      { minScore: 620, maxScore: 699, minAPR: 0.0899, maxAPR: 0.1399 },
      { minScore: 550, maxScore: 619, minAPR: 0.1299, maxAPR: 0.1999 },
    ],
    newVehicleDiscount: 0.0025,
    termsOffered: [24, 36, 48, 60, 72, 84],
    maxLTV: 1.15,
    features: ["Multiple lender network", "Subprime options available", "Quick pre-approval"],
    tags: ["subprime", "multi_lender"],
  },
  {
    id: "penfed-credit-union",
    name: "PenFed Credit Union",
    minCreditScore: 620,
    aprTiers: [
      { minScore: 750, maxScore: 850, minAPR: 0.0299, maxAPR: 0.0499 },
      { minScore: 700, maxScore: 749, minAPR: 0.0449, maxAPR: 0.0649 },
      { minScore: 650, maxScore: 699, minAPR: 0.0649, maxAPR: 0.0899 },
      { minScore: 620, maxScore: 649, minAPR: 0.0849, maxAPR: 0.1149 },
    ],
    newVehicleDiscount: 0.005,
    termsOffered: [36, 48, 60, 72, 84],
    maxLTV: 1.1,
    features: ["Credit union rates — among the lowest available", "No prepayment penalty", "Gap insurance available"],
    tags: ["credit_union", "low_rates"],
  },
];

// =============================================================================
// Auto Loan Matcher
// =============================================================================

class AutoLoanMatcher {
  // ===========================================================================
  // Main Matching
  // ===========================================================================

  /**
   * Get personalized auto loan recommendations ranked by match quality.
   */
  getRecommendations(input: AutoLoanMatcherInput): AutoLoanRecommendation[] {
    const eligible = LENDERS.filter(
      (lender) => input.creditScore >= lender.minCreditScore,
    );

    const scored = eligible
      .map((lender) => this.buildRecommendation(lender, input))
      .filter((rec): rec is AutoLoanRecommendation => rec !== null);

    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored;
  }

  // ===========================================================================
  // Recommendation Builder
  // ===========================================================================

  private buildRecommendation(
    lender: LenderConfig,
    input: AutoLoanMatcherInput,
  ): AutoLoanRecommendation | null {
    const aprRange = this.getAprRange(lender, input);
    if (!aprRange) return null;

    const term = this.selectTerm(lender, input.preferredTerm);
    const calc = calculateAutoLoan(
      input.vehiclePrice,
      input.downPayment,
      aprRange.likely,
      term,
    );

    // Check LTV
    const ltv = calc.principal / input.vehiclePrice;
    if (ltv > lender.maxLTV) return null;

    const preApprovalOdds = this.getPreApprovalOdds(input, lender);
    const matchScore = this.computeMatchScore(lender, input, preApprovalOdds, aprRange.likely);
    const highlights = this.buildHighlights(lender, input, aprRange, calc);

    return {
      offerId: lender.id,
      lenderName: lender.name,
      matchScore,
      preApprovalOdds,
      estimatedAPR: aprRange,
      monthlyPayment: calc.monthlyPayment,
      totalCost: calc.totalCost,
      totalInterest: calc.totalInterest,
      termMonths: term,
      highlights,
      features: lender.features,
    };
  }

  // ===========================================================================
  // APR Calculation
  // ===========================================================================

  private getAprRange(
    lender: LenderConfig,
    input: AutoLoanMatcherInput,
  ): { min: number; max: number; likely: number } | null {
    const tier = lender.aprTiers.find(
      (t) => input.creditScore >= t.minScore && input.creditScore <= t.maxScore,
    );
    if (!tier) return null;

    const newDiscount = input.isNewVehicle ? lender.newVehicleDiscount : 0;

    // Adjust APR for vehicle age (used vehicles typically +0.5-1%)
    const usedPenalty = input.isNewVehicle ? 0 : this.getUsedVehiclePenalty(input.vehicleYear);

    const min = Math.max(0.01, tier.minAPR - newDiscount + usedPenalty);
    const max = tier.maxAPR - newDiscount + usedPenalty;

    // Likely rate: blend based on score position within tier
    const tierRange = tier.maxScore - tier.minScore;
    const scorePosition = tierRange > 0
      ? (input.creditScore - tier.minScore) / tierRange
      : 1;
    const likely = max - scorePosition * (max - min);

    return { min, max, likely };
  }

  private getUsedVehiclePenalty(vehicleYear?: number): number {
    if (!vehicleYear) return 0.005;
    const age = new Date().getFullYear() - vehicleYear;
    if (age <= 2) return 0.0;
    if (age <= 5) return 0.005;
    if (age <= 8) return 0.01;
    return 0.015;
  }

  // ===========================================================================
  // Term Selection
  // ===========================================================================

  private selectTerm(lender: LenderConfig, preferredTerm?: number): number {
    if (preferredTerm && lender.termsOffered.includes(preferredTerm)) {
      return preferredTerm;
    }
    // Fall back to closest available term
    if (preferredTerm) {
      const closest = lender.termsOffered.reduce((prev, curr) =>
        Math.abs(curr - preferredTerm) < Math.abs(prev - preferredTerm) ? curr : prev,
      );
      return closest;
    }
    // Default to 60 months if offered, otherwise median
    if (lender.termsOffered.includes(60)) return 60;
    const mid = Math.floor(lender.termsOffered.length / 2);
    return lender.termsOffered[mid];
  }

  // ===========================================================================
  // Pre-Approval Odds
  // ===========================================================================

  private getPreApprovalOdds(
    input: AutoLoanMatcherInput,
    lender: LenderConfig,
  ): PreApprovalOdds {
    const dtiResult = calculateDTI(input.monthlyIncome, [
      { category: "existing_debt", amount: input.currentMonthlyDebt },
    ]);

    return calculatePreApprovalOdds({
      creditScore: input.creditScore,
      dtiRatio: dtiResult.ratio,
      accountAgeYears: 4, // conservative default; real data would come from credit report
      recentInquiries: 1,
      paymentHistory: this.inferPaymentHistory(input.creditScore),
      productMinScore: lender.minCreditScore,
      productMaxDTI: 0.45,
    });
  }

  private inferPaymentHistory(
    creditScore: number,
  ): "excellent" | "good" | "fair" | "poor" {
    if (creditScore >= 750) return "excellent";
    if (creditScore >= 700) return "good";
    if (creditScore >= 640) return "fair";
    return "poor";
  }

  // ===========================================================================
  // Match Scoring
  // ===========================================================================

  private computeMatchScore(
    lender: LenderConfig,
    input: AutoLoanMatcherInput,
    odds: PreApprovalOdds,
    likelyAPR: number,
  ): number {
    let score = 0;

    // Pre-approval odds (40 points)
    score += odds.probability * 0.4;

    // APR competitiveness (30 points) — lower is better, benchmark at 7%
    const aprBenchmark = 0.07;
    const aprScore = Math.max(0, 30 - ((likelyAPR - aprBenchmark) / aprBenchmark) * 30);
    score += aprScore;

    // Credit score buffer above minimum (20 points)
    const buffer = input.creditScore - lender.minCreditScore;
    const bufferScore = Math.min(20, (buffer / 100) * 20);
    score += bufferScore;

    // Preferred term availability (10 points)
    if (input.preferredTerm && lender.termsOffered.includes(input.preferredTerm)) {
      score += 10;
    } else {
      score += 5; // partial credit
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  // ===========================================================================
  // Highlights
  // ===========================================================================

  private buildHighlights(
    lender: LenderConfig,
    input: AutoLoanMatcherInput,
    aprRange: { min: number; max: number; likely: number },
    calc: ReturnType<typeof calculateAutoLoan>,
  ): string[] {
    const highlights: string[] = [];

    highlights.push(
      `Est. APR ${(aprRange.min * 100).toFixed(2)}%–${(aprRange.max * 100).toFixed(2)}%`,
    );
    highlights.push(`Monthly payment ~$${calc.monthlyPayment.toFixed(0)}`);

    if (input.isNewVehicle && lender.newVehicleDiscount > 0) {
      highlights.push(
        `${(lender.newVehicleDiscount * 100).toFixed(2)}% new vehicle rate discount`,
      );
    }

    if (lender.tags.includes("no_fees")) {
      highlights.push("No origination or prepayment fees");
    }

    if (lender.tags.includes("credit_union")) {
      highlights.push("Credit union — member-owned, lower rates");
    }

    if (lender.tags.includes("no_hard_inquiry_prequalify")) {
      highlights.push("Pre-qualify without affecting your credit");
    }

    if (lender.tags.includes("all_credit_types")) {
      highlights.push("All credit profiles considered");
    }

    return highlights;
  }
}

// =============================================================================
// Export singleton
// =============================================================================

export const autoLoanMatcher = new AutoLoanMatcher();
export default autoLoanMatcher;
