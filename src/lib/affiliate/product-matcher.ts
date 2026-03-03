/**
 * Product Matcher
 *
 * Matches user profiles to MoneyLion product offers using a multi-factor
 * scoring algorithm. Inspired by the offer-service matching pattern.
 */

import type {
  MoneyLionProduct,
  UserMatchProfile,
  ProductMatch,
  MatchOptions,
} from "./types";

// =============================================================================
// Scoring Weights
// =============================================================================

const SCORE_WEIGHTS = {
  creditScoreFit: 30,
  incomeRatio: 20,
  categoryPreference: 15,
  approvalOdds: 15,
  stateFit: 10,
  featuredBonus: 10,
} as const;

// =============================================================================
// Product Matcher
// =============================================================================

class ProductMatcher {
  /**
   * Match products to a user profile, returning scored and sorted results
   */
  matchProducts(
    products: MoneyLionProduct[],
    profile: UserMatchProfile,
    options?: MatchOptions,
  ): ProductMatch[] {
    let filtered = products.filter((p) => p.active);

    if (options?.categories && options.categories.length > 0) {
      filtered = filtered.filter((p) =>
        options.categories!.includes(p.category),
      );
    }

    const matches: ProductMatch[] = filtered.map((product) => {
      const matchScore = this.scoreProduct(product, profile);
      const eligibility = this.checkEligibility(product, profile);
      const highlights = this.generateHighlights(product, profile);
      const estimatedApprovalOdds = this.estimateApprovalOdds(product, profile);

      return {
        product,
        matchScore,
        eligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons,
        highlights,
        estimatedApprovalOdds,
      };
    });

    let results = matches;

    if (!options?.includeIneligible) {
      results = results.filter((m) => m.eligible);
    }

    if (options?.minScore !== undefined) {
      results = results.filter((m) => m.matchScore >= options.minScore!);
    }

    results.sort((a, b) => b.matchScore - a.matchScore);

    if (options?.limit !== undefined && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Score a product against a user profile (0-100)
   */
  scoreProduct(product: MoneyLionProduct, profile: UserMatchProfile): number {
    let score = 0;

    score += this.scoreCreditFit(product, profile);
    score += this.scoreIncomeFit(product, profile);
    score += this.scoreCategoryPreference(product, profile);
    score += this.scoreApprovalLikelihood(product, profile);
    score += this.scoreStateFit(product, profile);

    if (product.featured) {
      score += SCORE_WEIGHTS.featuredBonus;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if a user is eligible for a product
   */
  checkEligibility(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): { eligible: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let eligible = true;

    // Credit score check
    if (product.eligibility.minCreditScore !== undefined && profile.creditScore !== undefined) {
      if (profile.creditScore < product.eligibility.minCreditScore) {
        reasons.push(
          `Minimum credit score of ${product.eligibility.minCreditScore} required (yours: ${profile.creditScore})`,
        );
        eligible = false;
      }
    }

    if (product.eligibility.maxCreditScore !== undefined && profile.creditScore !== undefined) {
      if (profile.creditScore > product.eligibility.maxCreditScore) {
        reasons.push(
          `Maximum credit score of ${product.eligibility.maxCreditScore} (yours: ${profile.creditScore})`,
        );
        eligible = false;
      }
    }

    // Income check
    if (product.eligibility.minIncome !== undefined && profile.annualIncome !== undefined) {
      if (profile.annualIncome < product.eligibility.minIncome) {
        reasons.push(
          `Minimum annual income of $${product.eligibility.minIncome.toLocaleString()} required`,
        );
        eligible = false;
      }
    }

    // State check
    if (profile.state) {
      if (
        product.eligibility.blockedStates &&
        product.eligibility.blockedStates.includes(profile.state)
      ) {
        reasons.push(`Not available in ${profile.state}`);
        eligible = false;
      }

      if (
        product.eligibility.allowedStates &&
        product.eligibility.allowedStates.length > 0 &&
        !product.eligibility.allowedStates.includes(profile.state)
      ) {
        reasons.push(`Not available in ${profile.state}`);
        eligible = false;
      }
    }

    // Age check
    if (product.eligibility.minAge !== undefined && profile.age !== undefined) {
      if (profile.age < product.eligibility.minAge) {
        reasons.push(
          `Minimum age of ${product.eligibility.minAge} required`,
        );
        eligible = false;
      }
    }

    if (eligible && reasons.length === 0) {
      reasons.push("You meet all eligibility requirements");
    }

    return { eligible, reasons };
  }

  /**
   * Generate user-facing highlights for a product
   */
  generateHighlights(
    product: MoneyLionProduct,
    _profile: UserMatchProfile,
  ): string[] {
    const highlights: string[] = [];

    // APR highlights
    if (product.terms.apr) {
      if (product.terms.apr.min === 0) {
        highlights.push("0% intro APR available");
      } else if (product.terms.apr.min < 15) {
        highlights.push(`Low APR starting at ${product.terms.apr.min}%`);
      }
    }

    // Fee highlights
    if (product.terms.annualFee === 0) {
      highlights.push("No annual fee");
    }

    // Rewards highlights
    if (product.terms.rewards) {
      highlights.push(product.terms.rewards);
    }

    // Signup bonus
    if (product.terms.signupBonus) {
      highlights.push(product.terms.signupBonus);
    }

    // Loan amount
    if (product.terms.loanAmount) {
      highlights.push(
        `Borrow up to $${product.terms.loanAmount.max.toLocaleString()}`,
      );
    }

    // Credit limit
    if (product.terms.creditLimit) {
      highlights.push(
        `Credit limit up to $${product.terms.creditLimit.max.toLocaleString()}`,
      );
    }

    // Term
    if (product.terms.term) {
      highlights.push(
        `Terms from ${product.terms.term.min} to ${product.terms.term.max} ${product.terms.term.unit}`,
      );
    }

    if (product.featured) {
      highlights.push("Featured product");
    }

    return highlights.slice(0, 5);
  }

  /**
   * Estimate approval odds based on profile vs product requirements
   */
  estimateApprovalOdds(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): "high" | "medium" | "low" {
    let confidence = 0;
    let factors = 0;

    // Credit score factor
    if (product.eligibility.minCreditScore !== undefined && profile.creditScore !== undefined) {
      factors++;
      const buffer = profile.creditScore - product.eligibility.minCreditScore;
      if (buffer >= 80) confidence += 3;
      else if (buffer >= 40) confidence += 2;
      else if (buffer >= 0) confidence += 1;
      // negative buffer = ineligible, low odds
    }

    // Income factor
    if (product.eligibility.minIncome !== undefined && profile.annualIncome !== undefined) {
      factors++;
      const ratio = profile.annualIncome / product.eligibility.minIncome;
      if (ratio >= 2) confidence += 3;
      else if (ratio >= 1.5) confidence += 2;
      else if (ratio >= 1) confidence += 1;
    }

    // State factor
    if (profile.state) {
      factors++;
      const blocked =
        product.eligibility.blockedStates?.includes(profile.state) ?? false;
      const allowed =
        !product.eligibility.allowedStates ||
        product.eligibility.allowedStates.length === 0 ||
        product.eligibility.allowedStates.includes(profile.state);

      if (!blocked && allowed) confidence += 2;
    }

    if (factors === 0) return "medium";

    const avg = confidence / factors;
    if (avg >= 2) return "high";
    if (avg >= 1) return "medium";
    return "low";
  }

  // ===========================================================================
  // Private Scoring Methods
  // ===========================================================================

  private scoreCreditFit(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number {
    if (profile.creditScore === undefined || product.eligibility.minCreditScore === undefined) {
      return SCORE_WEIGHTS.creditScoreFit * 0.5;
    }

    const buffer = profile.creditScore - product.eligibility.minCreditScore;

    if (buffer >= 80) return SCORE_WEIGHTS.creditScoreFit;
    if (buffer >= 40) return SCORE_WEIGHTS.creditScoreFit * 0.8;
    if (buffer >= 0) return SCORE_WEIGHTS.creditScoreFit * 0.5;
    return 0;
  }

  private scoreIncomeFit(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number {
    if (profile.annualIncome === undefined || product.eligibility.minIncome === undefined) {
      return SCORE_WEIGHTS.incomeRatio * 0.5;
    }

    const ratio = profile.annualIncome / product.eligibility.minIncome;

    if (ratio >= 2) return SCORE_WEIGHTS.incomeRatio;
    if (ratio >= 1.5) return SCORE_WEIGHTS.incomeRatio * 0.75;
    if (ratio >= 1) return SCORE_WEIGHTS.incomeRatio * 0.5;
    return 0;
  }

  private scoreCategoryPreference(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number {
    if (!profile.preferences?.categories || profile.preferences.categories.length === 0) {
      return 0;
    }

    if (profile.preferences.categories.includes(product.category)) {
      return SCORE_WEIGHTS.categoryPreference;
    }

    return 0;
  }

  private scoreApprovalLikelihood(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number {
    const odds = this.estimateApprovalOdds(product, profile);

    switch (odds) {
      case "high":
        return SCORE_WEIGHTS.approvalOdds;
      case "medium":
        return SCORE_WEIGHTS.approvalOdds * 0.5;
      case "low":
        return 0;
    }
  }

  private scoreStateFit(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number {
    if (!profile.state) {
      return SCORE_WEIGHTS.stateFit * 0.5;
    }

    if (
      product.eligibility.blockedStates?.includes(profile.state)
    ) {
      return 0;
    }

    if (
      product.eligibility.allowedStates &&
      product.eligibility.allowedStates.length > 0 &&
      !product.eligibility.allowedStates.includes(profile.state)
    ) {
      return 0;
    }

    return SCORE_WEIGHTS.stateFit;
  }
}

// Export singleton
export const productMatcher = new ProductMatcher();
export default productMatcher;
