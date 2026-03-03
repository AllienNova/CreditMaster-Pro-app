/**
 * Credit Card Recommendation Engine
 *
 * Specialized matcher for credit card products. Extends the generic product
 * matcher with credit-card-specific scoring: rewards value estimation, cost
 * scoring, approval likelihood, signup-bonus valuation, and card categorization.
 *
 * Part of AFF-02.
 */

import type { MoneyLionProduct, UserMatchProfile } from "./types";
import { productMatcher } from "./product-matcher";
import { offerCache, OfferCache } from "./offer-cache";

// =============================================================================
// Types
// =============================================================================

export interface CreditCardScore {
  /** 0-100 composite score */
  overall: number;
  /** Estimated annual rewards value in $ */
  rewardsValue: number;
  /** APR + annual fee cost efficiency (0-100) */
  costScore: number;
  /** Likelihood of approval (0-100) */
  approvalScore: number;
  /** Signup bonus estimated value in $ */
  bonusValue: number;
  /** Human-readable reasons this card matches the user */
  matchReasons: string[];
}

export type CreditCardCategory =
  | "cashback"
  | "travel"
  | "balance_transfer"
  | "business"
  | "student"
  | "secured"
  | "general";

export interface CreditCardRecommendation {
  product: MoneyLionProduct;
  scores: CreditCardScore;
  rank: number;
  category: CreditCardCategory;
  /** How this card compares to alternatives */
  comparisonHighlights: string[];
}

export interface SpendingProfile {
  monthlySpend: number;
  topCategories?: string[];
}

export interface CreditCardMatchOptions {
  limit?: number;
  cardCategory?: CreditCardCategory;
  minApprovalScore?: number;
  spendingProfile?: SpendingProfile;
  balanceTransferAmount?: number;
  preferNonAnnualFee?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Weights for the composite overall score (must sum to 100) */
const COMPOSITE_WEIGHTS = {
  rewards: 30,
  cost: 25,
  approval: 25,
  bonus: 20,
} as const;

/** Default monthly spend when no spending profile is provided */
const DEFAULT_MONTHLY_SPEND = 1500;

/** Assumed baseline cashback rate when rewards string contains "cash back" */
const CASHBACK_REGEX = /(\d+(?:\.\d+)?)\s*%/;

/** Regex to extract dollar amounts from signup bonus strings */
const BONUS_DOLLAR_REGEX = /\$\s*([\d,]+)/;

/** Regex to extract point amounts from signup bonus strings */
const BONUS_POINTS_REGEX = /([\d,]+)\s*(?:points|miles)/i;

/** Assumed value per point/mile in dollars */
const POINT_VALUE_USD = 0.01;

/** Cache TTL for credit card recommendations (10 minutes) */
const CACHE_TTL_MS = 10 * 60 * 1000;

// =============================================================================
// Category Detection Keywords
// =============================================================================

const CATEGORY_KEYWORDS: Record<CreditCardCategory, string[]> = {
  cashback: ["cash back", "cashback", "cash rewards"],
  travel: ["travel", "miles", "airline", "hotel", "lounge", "points on travel"],
  balance_transfer: ["balance transfer", "0% intro", "bt offer"],
  business: ["business", "corporate", "commercial"],
  student: ["student", "college", "university"],
  secured: ["secured", "deposit", "builder", "credit builder"],
  general: [],
};

// =============================================================================
// Credit Card Matcher
// =============================================================================

class CreditCardMatcher {
  constructor(
    private _productMatcher: typeof productMatcher,
    private _cache: OfferCache,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get ranked credit card recommendations for a user profile.
   */
  async getRecommendations(
    profile: UserMatchProfile,
    options?: CreditCardMatchOptions,
  ): Promise<CreditCardRecommendation[]> {
    const cacheKey = this.buildCacheKey("recs", profile, options);
    const cached = this._cache.get<CreditCardRecommendation[]>(cacheKey);
    if (cached) return cached;

    // Get credit-card products from the generic matcher
    const matches = this._productMatcher.matchProducts(
      await this.getCreditCardProducts(),
      profile,
      {
        categories: ["credit_card"],
        includeIneligible: false,
      },
    );

    const monthlySpend =
      options?.spendingProfile?.monthlySpend ?? DEFAULT_MONTHLY_SPEND;

    let recommendations = matches.map((match) => {
      const scores = this.scoreCard(match.product, profile, monthlySpend);
      const category = this.categorizeCard(match.product);
      return {
        product: match.product,
        scores,
        rank: 0, // will be assigned after sorting
        category,
        comparisonHighlights: [] as string[],
      };
    });

    // Apply filters
    if (options?.cardCategory) {
      recommendations = recommendations.filter(
        (r) => r.category === options.cardCategory,
      );
    }

    if (options?.minApprovalScore !== undefined) {
      recommendations = recommendations.filter(
        (r) => r.scores.approvalScore >= options.minApprovalScore!,
      );
    }

    if (options?.preferNonAnnualFee) {
      recommendations = recommendations.map((r) => {
        const fee = r.product.terms.annualFee ?? 0;
        if (fee === 0) {
          return {
            ...r,
            scores: {
              ...r.scores,
              overall: Math.min(100, r.scores.overall + 10),
              matchReasons: [
                ...r.scores.matchReasons,
                "No annual fee (preferred)",
              ],
            },
          };
        }
        return r;
      });
    }

    if (options?.balanceTransferAmount && options.balanceTransferAmount > 0) {
      recommendations = recommendations.map((r) => {
        if (this.categorizeCard(r.product) === "balance_transfer") {
          return {
            ...r,
            scores: {
              ...r.scores,
              overall: Math.min(100, r.scores.overall + 15),
              matchReasons: [
                ...r.scores.matchReasons,
                "Good balance transfer option",
              ],
            },
          };
        }
        return r;
      });
    }

    // Sort by overall score descending
    recommendations.sort((a, b) => b.scores.overall - a.scores.overall);

    // Assign ranks
    recommendations = recommendations.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));

    // Generate comparison highlights
    recommendations = this.addComparisonHighlights(recommendations);

    // Apply limit
    if (options?.limit && options.limit > 0) {
      recommendations = recommendations.slice(0, options.limit);
    }

    this._cache.set(cacheKey, recommendations, CACHE_TTL_MS);
    return recommendations;
  }

  /**
   * Return the single top-pick credit card for a user, or null if none qualify.
   */
  async getTopPick(
    profile: UserMatchProfile,
  ): Promise<CreditCardRecommendation | null> {
    const results = await this.getRecommendations(profile, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Compare specific cards side-by-side, scored for this user.
   */
  async compareCards(
    productIds: string[],
    profile: UserMatchProfile,
  ): Promise<CreditCardRecommendation[]> {
    const allProducts = await this.getCreditCardProducts();
    const selected = allProducts.filter((p) =>
      productIds.includes(p.productId),
    );

    const monthlySpend = DEFAULT_MONTHLY_SPEND;

    let recommendations: CreditCardRecommendation[] = selected.map(
      (product) => {
        const scores = this.scoreCard(product, profile, monthlySpend);
        const category = this.categorizeCard(product);
        return {
          product,
          scores,
          rank: 0,
          category,
          comparisonHighlights: [],
        };
      },
    );

    recommendations.sort((a, b) => b.scores.overall - a.scores.overall);
    recommendations = recommendations.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
    recommendations = this.addComparisonHighlights(recommendations);

    return recommendations;
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Build a full CreditCardScore for one product.
   */
  private scoreCard(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
    monthlySpend: number,
  ): CreditCardScore {
    const rewardsValue = this.calculateRewardsValue(product, monthlySpend);
    const costScore = this.calculateCostScore(product);
    const approvalScore = this.calculateApprovalScore(product, profile);
    const bonusValue = this.estimateBonusValue(product);

    const overall = Math.round(
      (rewardsValue > 0 ? Math.min(100, (rewardsValue / 600) * 100) : 0) *
        (COMPOSITE_WEIGHTS.rewards / 100) +
        costScore * (COMPOSITE_WEIGHTS.cost / 100) +
        approvalScore * (COMPOSITE_WEIGHTS.approval / 100) +
        Math.min(100, (bonusValue / 500) * 100) *
          (COMPOSITE_WEIGHTS.bonus / 100),
    );

    const matchReasons = this.buildMatchReasons(
      product,
      rewardsValue,
      costScore,
      approvalScore,
      bonusValue,
    );

    return {
      overall: Math.max(0, Math.min(100, overall)),
      rewardsValue: Math.round(rewardsValue * 100) / 100,
      costScore,
      approvalScore,
      bonusValue: Math.round(bonusValue * 100) / 100,
      matchReasons,
    };
  }

  /**
   * Estimate annual rewards value in dollars based on the rewards string and
   * monthly spend.
   */
  calculateRewardsValue(
    product: MoneyLionProduct,
    monthlySpend: number,
  ): number {
    const rewards = product.terms.rewards;
    if (!rewards) return 0;

    const percentMatch = CASHBACK_REGEX.exec(rewards);
    if (percentMatch) {
      const rate = parseFloat(percentMatch[1]) / 100;
      return rate * monthlySpend * 12;
    }

    // Points-based rewards: attempt to extract multiplier, assume $0.01/point
    const multiplierMatch = /(\d+)x\s*points/i.exec(rewards);
    if (multiplierMatch) {
      const multiplier = parseInt(multiplierMatch[1], 10);
      return multiplier * POINT_VALUE_USD * monthlySpend * 12;
    }

    // Fallback: assume a modest 1% if rewards are mentioned but not parseable
    return 0.01 * monthlySpend * 12;
  }

  /**
   * Score cost-efficiency (0-100). Lower APR + lower annual fee = higher score.
   */
  calculateCostScore(product: MoneyLionProduct): number {
    let score = 100;

    // Penalise high APR (baseline: 0 % = 100, 30 % = 0)
    if (product.terms.apr) {
      const avgApr = (product.terms.apr.min + product.terms.apr.max) / 2;
      const aprPenalty = Math.min(50, (avgApr / 30) * 50);
      score -= aprPenalty;
    }

    // Penalise annual fee (baseline: $0 = 0 penalty, $500+ = 50 penalty)
    const fee = product.terms.annualFee ?? 0;
    const feePenalty = Math.min(50, (fee / 500) * 50);
    score -= feePenalty;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Score approval likelihood (0-100).
   */
  calculateApprovalScore(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number {
    let factors = 0;
    let totalScore = 0;

    // Credit score factor
    if (
      product.eligibility.minCreditScore !== undefined &&
      profile.creditScore !== undefined
    ) {
      factors++;
      const buffer = profile.creditScore - product.eligibility.minCreditScore;
      if (buffer >= 100) totalScore += 100;
      else if (buffer >= 50) totalScore += 80;
      else if (buffer >= 0) totalScore += 60;
      else if (buffer >= -50) totalScore += 30;
      else totalScore += 10;
    }

    // Income factor
    if (
      product.eligibility.minIncome !== undefined &&
      profile.annualIncome !== undefined
    ) {
      factors++;
      const ratio = profile.annualIncome / product.eligibility.minIncome;
      if (ratio >= 2) totalScore += 100;
      else if (ratio >= 1.5) totalScore += 80;
      else if (ratio >= 1) totalScore += 60;
      else totalScore += 20;
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

      if (!blocked && allowed) totalScore += 100;
      else totalScore += 0;
    }

    if (factors === 0) return 50; // unknown
    return Math.round(totalScore / factors);
  }

  /**
   * Parse signup bonus strings and estimate a dollar value.
   *
   * Checks for points/miles first (since those strings often also contain
   * dollar amounts like "after $3000 spend" which would give a wrong result).
   */
  estimateBonusValue(product: MoneyLionProduct): number {
    const bonus = product.terms.signupBonus;
    if (!bonus) return 0;

    // Try points/miles first (they often co-exist with dollar spend thresholds)
    const pointsMatch = BONUS_POINTS_REGEX.exec(bonus);
    if (pointsMatch) {
      const points = parseFloat(pointsMatch[1].replace(/,/g, ""));
      return points * POINT_VALUE_USD;
    }

    // Try dollar amount
    const dollarMatch = BONUS_DOLLAR_REGEX.exec(bonus);
    if (dollarMatch) {
      return parseFloat(dollarMatch[1].replace(/,/g, ""));
    }

    return 0;
  }

  /**
   * Categorize a credit card product based on its name, description, and terms.
   */
  categorizeCard(product: MoneyLionProduct): CreditCardCategory {
    const text =
      `${product.name} ${product.description} ${product.terms.rewards ?? ""} ${product.terms.signupBonus ?? ""}`.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category === "general") continue;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category as CreditCardCategory;
        }
      }
    }

    return "general";
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Retrieve all active credit card products. Uses cache when available.
   */
  private async getCreditCardProducts(): Promise<MoneyLionProduct[]> {
    const cacheKey = "cc-catalog";
    const cached = this._cache.get<MoneyLionProduct[]>(cacheKey);
    if (cached) return cached;

    // In production this would call moneyLionClient.getProductCatalog("credit_card").
    // For now, return an empty array which the product matcher will populate
    // via its own catalog integration.
    return [];
  }

  /**
   * Build a deterministic cache key from the profile + options.
   */
  private buildCacheKey(
    prefix: string,
    profile: UserMatchProfile,
    options?: CreditCardMatchOptions,
  ): string {
    const parts = [
      prefix,
      profile.userId,
      profile.creditScore ?? "na",
      profile.annualIncome ?? "na",
      profile.state ?? "na",
      options?.cardCategory ?? "all",
      options?.limit ?? "nolimit",
      options?.minApprovalScore ?? "nomin",
      options?.spendingProfile?.monthlySpend ?? "nospend",
      options?.balanceTransferAmount ?? "nobt",
      options?.preferNonAnnualFee ? "nofee" : "anyfee",
    ];
    return parts.join(":");
  }

  /**
   * Build human-readable match reasons.
   */
  private buildMatchReasons(
    product: MoneyLionProduct,
    rewardsValue: number,
    costScore: number,
    approvalScore: number,
    bonusValue: number,
  ): string[] {
    const reasons: string[] = [];

    if (rewardsValue > 300) {
      reasons.push(
        `Strong rewards: ~$${Math.round(rewardsValue)}/year estimated`,
      );
    } else if (rewardsValue > 0) {
      reasons.push(
        `Rewards: ~$${Math.round(rewardsValue)}/year estimated`,
      );
    }

    if (costScore >= 80) {
      reasons.push("Low cost (APR + fees)");
    }

    if (approvalScore >= 70) {
      reasons.push("Good approval odds");
    }

    if (bonusValue >= 200) {
      reasons.push(`Valuable signup bonus (~$${Math.round(bonusValue)})`);
    }

    if ((product.terms.annualFee ?? 0) === 0) {
      reasons.push("No annual fee");
    }

    if (product.featured) {
      reasons.push("Featured product");
    }

    return reasons;
  }

  /**
   * Add comparison highlights that tell the user how each card stacks up
   * relative to the others in the result set.
   */
  private addComparisonHighlights(
    recs: CreditCardRecommendation[],
  ): CreditCardRecommendation[] {
    if (recs.length < 2) {
      return recs.map((r) => ({
        ...r,
        comparisonHighlights: r.rank === 1 ? ["Top pick"] : [],
      }));
    }

    const maxRewards = Math.max(...recs.map((r) => r.scores.rewardsValue));
    const maxBonus = Math.max(...recs.map((r) => r.scores.bonusValue));
    const maxApproval = Math.max(...recs.map((r) => r.scores.approvalScore));
    const maxCost = Math.max(...recs.map((r) => r.scores.costScore));

    return recs.map((r) => {
      const highlights: string[] = [];

      if (r.rank === 1) highlights.push("Top pick overall");

      if (
        r.scores.rewardsValue === maxRewards &&
        maxRewards > 0 &&
        recs.length > 1
      ) {
        highlights.push("Best rewards value");
      }
      if (
        r.scores.bonusValue === maxBonus &&
        maxBonus > 0 &&
        recs.length > 1
      ) {
        highlights.push("Best signup bonus");
      }
      if (r.scores.approvalScore === maxApproval && recs.length > 1) {
        highlights.push("Highest approval odds");
      }
      if (r.scores.costScore === maxCost && recs.length > 1) {
        highlights.push("Lowest cost");
      }

      return { ...r, comparisonHighlights: highlights };
    });
  }
}

// =============================================================================
// Exports
// =============================================================================

export { CreditCardMatcher };
export const creditCardMatcher = new CreditCardMatcher(
  productMatcher,
  offerCache,
);
export default creditCardMatcher;
