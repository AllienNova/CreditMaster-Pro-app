/**
 * Insurance Recommendation Engine
 *
 * Specialized matcher for insurance products. Extends the generic product
 * matcher with insurance-specific scoring: premium estimation, coverage
 * breadth, deductible evaluation, and insurance type categorization.
 *
 * Part of AFF-03.
 */

import type { MoneyLionProduct, UserMatchProfile } from "./types";
import { productMatcher } from "./product-matcher";
import { offerCache, OfferCache } from "./offer-cache";

// =============================================================================
// Types
// =============================================================================

export type InsuranceType = "auto" | "home" | "life" | "health" | "renters";

export interface InsuranceRecommendation {
  product: MoneyLionProduct;
  matchScore: number;
  insuranceType: InsuranceType;
  eligible: boolean;
  eligibilityReasons: string[];
  highlights: string[];
  estimatedPremium?: { monthly: number; annual: number };
  premiumScore: number;
  coverageScore: number;
  deductibleScore: number;
}

export interface InsuranceComparison {
  products: InsuranceRecommendation[];
  bestPremium: string;
  bestCoverage: string;
  bestOverall: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Weights for the composite match score (must sum to 100) */
const COMPOSITE_WEIGHTS = {
  premium: 35,
  coverage: 30,
  deductible: 20,
  approval: 15,
} as const;

/** Cache TTL for insurance recommendations (10 minutes) */
const CACHE_TTL_MS = 10 * 60 * 1000;

// =============================================================================
// Insurance Type Detection Keywords
// =============================================================================

const INSURANCE_TYPE_KEYWORDS: Record<InsuranceType, string[]> = {
  auto: ["auto", "car", "vehicle", "driver"],
  home: ["home", "house", "property", "homeowner"],
  life: ["life", "term life", "whole life", "death benefit"],
  health: ["health", "medical", "dental", "vision"],
  renters: ["renters", "renter", "tenant"],
};

// =============================================================================
// Premium Estimation Baselines (annual, in USD)
// =============================================================================

const PREMIUM_BASELINES: Record<InsuranceType, { base: number; incomeMultiplier: number; ageMultiplier: number }> = {
  auto: { base: 1200, incomeMultiplier: 0, ageMultiplier: 15 },
  home: { base: 1800, incomeMultiplier: 0.005, ageMultiplier: 0 },
  life: { base: 600, incomeMultiplier: 0.002, ageMultiplier: 20 },
  health: { base: 4800, incomeMultiplier: 0, ageMultiplier: 50 },
  renters: { base: 240, incomeMultiplier: 0, ageMultiplier: 0 },
};

// =============================================================================
// Insurance Matcher
// =============================================================================

class InsuranceMatcher {
  constructor(
    private _productMatcher: typeof productMatcher,
    private _cache: OfferCache,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get ranked insurance recommendations for a user profile.
   */
  getRecommendations(
    profile: UserMatchProfile,
    insuranceType?: InsuranceType,
    limit?: number,
  ): InsuranceRecommendation[] {
    const cacheKey = this.buildCacheKey("ins-recs", profile, insuranceType, limit);
    const cached = this._cache.get<InsuranceRecommendation[]>(cacheKey);
    if (cached) return cached;

    const products = this.getInsuranceProducts();

    const matches = this._productMatcher.matchProducts(products, profile, {
      categories: ["insurance"],
      includeIneligible: false,
    });

    let recommendations: InsuranceRecommendation[] = matches.map((match) => {
      const type = this.categorizeInsurance(match.product);
      const premiumScore = this.calculatePremiumScore(match.product, profile);
      const coverageScore = this.calculateCoverageScore(match.product);
      const deductibleScore = this.calculateDeductibleScore(match.product);
      const approvalScore = this.calculateApprovalScore(match.product, profile);

      const compositeScore = Math.round(
        premiumScore * (COMPOSITE_WEIGHTS.premium / 100) +
          coverageScore * (COMPOSITE_WEIGHTS.coverage / 100) +
          deductibleScore * (COMPOSITE_WEIGHTS.deductible / 100) +
          approvalScore * (COMPOSITE_WEIGHTS.approval / 100),
      );

      const eligibility = this._productMatcher.checkEligibility(match.product, profile);
      const highlights = this._productMatcher.generateHighlights(match.product, profile);
      const estimatedPremium = this.estimatePremium(type, profile);

      return {
        product: match.product,
        matchScore: Math.max(0, Math.min(100, compositeScore)),
        insuranceType: type,
        eligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons,
        highlights,
        estimatedPremium,
        premiumScore,
        coverageScore,
        deductibleScore,
      };
    });

    // Filter by insurance type if specified
    if (insuranceType) {
      recommendations = recommendations.filter(
        (r) => r.insuranceType === insuranceType,
      );
    }

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // Apply limit
    if (limit !== undefined && limit > 0) {
      recommendations = recommendations.slice(0, limit);
    }

    this._cache.set(cacheKey, recommendations, CACHE_TTL_MS);
    return recommendations;
  }

  /**
   * Return the single top-pick insurance product for a user, or null if none qualify.
   */
  getTopPick(
    profile: UserMatchProfile,
    insuranceType?: InsuranceType,
  ): InsuranceRecommendation | null {
    const results = this.getRecommendations(profile, insuranceType, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Compare specific insurance products side-by-side.
   */
  compareProducts(productIds: string[]): InsuranceComparison {
    const allProducts = this.getInsuranceProducts();
    const selected = allProducts.filter((p) => productIds.includes(p.productId));

    const defaultProfile: UserMatchProfile = { userId: "comparison" };

    const recommendations: InsuranceRecommendation[] = selected.map((product) => {
      const type = this.categorizeInsurance(product);
      const premiumScore = this.calculatePremiumScore(product, defaultProfile);
      const coverageScore = this.calculateCoverageScore(product);
      const deductibleScore = this.calculateDeductibleScore(product);
      const approvalScore = this.calculateApprovalScore(product, defaultProfile);

      const compositeScore = Math.round(
        premiumScore * (COMPOSITE_WEIGHTS.premium / 100) +
          coverageScore * (COMPOSITE_WEIGHTS.coverage / 100) +
          deductibleScore * (COMPOSITE_WEIGHTS.deductible / 100) +
          approvalScore * (COMPOSITE_WEIGHTS.approval / 100),
      );

      const eligibility = this._productMatcher.checkEligibility(product, defaultProfile);
      const highlights = this._productMatcher.generateHighlights(product, defaultProfile);

      return {
        product,
        matchScore: Math.max(0, Math.min(100, compositeScore)),
        insuranceType: type,
        eligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons,
        highlights,
        premiumScore,
        coverageScore,
        deductibleScore,
      };
    });

    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    const bestPremium = this.findBestByField(recommendations, "premiumScore");
    const bestCoverage = this.findBestByField(recommendations, "coverageScore");
    const bestOverall = recommendations.length > 0 ? recommendations[0].product.productId : "";

    return {
      products: recommendations,
      bestPremium,
      bestCoverage,
      bestOverall,
    };
  }

  // ---------------------------------------------------------------------------
  // Scoring Methods
  // ---------------------------------------------------------------------------

  /**
   * Score premium affordability (0-100). Lower premium relative to income = higher score.
   */
  calculatePremiumScore(product: MoneyLionProduct, profile: UserMatchProfile): number {
    // Use APR as a proxy for premium cost (lower = better)
    // and loan amount range as a proxy for coverage amount
    let score = 80; // default baseline for insurance

    if (product.terms.apr) {
      const avgApr = (product.terms.apr.min + product.terms.apr.max) / 2;
      // For insurance, APR represents premium rate: lower = better
      // 0% = 100, 30% = 0
      const aprPenalty = Math.min(60, (avgApr / 30) * 60);
      score -= aprPenalty;
    }

    // Annual fee as proxy for premium surcharge
    const fee = product.terms.annualFee ?? 0;
    if (fee > 0) {
      const feePenalty = Math.min(30, (fee / 500) * 30);
      score -= feePenalty;
    }

    // Bonus if user's income can easily cover the estimated premium
    if (profile.annualIncome !== undefined && profile.annualIncome > 0) {
      const type = this.categorizeInsurance(product);
      const estimatedAnnual = PREMIUM_BASELINES[type].base;
      const ratio = profile.annualIncome / (estimatedAnnual * 10);
      if (ratio >= 2) score = Math.min(100, score + 10);
      else if (ratio >= 1) score = Math.min(100, score + 5);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Score coverage breadth (0-100). Broader coverage = higher score.
   */
  calculateCoverageScore(product: MoneyLionProduct): number {
    let score = 50; // baseline

    // Loan amount range as proxy for coverage amount (higher max = broader coverage)
    if (product.terms.loanAmount) {
      const maxCoverage = product.terms.loanAmount.max;
      if (maxCoverage >= 500000) score += 30;
      else if (maxCoverage >= 250000) score += 25;
      else if (maxCoverage >= 100000) score += 20;
      else if (maxCoverage >= 50000) score += 15;
      else if (maxCoverage >= 10000) score += 10;
      else score += 5;
    }

    // Rewards as proxy for additional coverage features
    if (product.terms.rewards) {
      score += 10;
    }

    // Signup bonus as proxy for policy perks
    if (product.terms.signupBonus) {
      score += 5;
    }

    // Term availability indicates flexible coverage periods
    if (product.terms.term) {
      const termRange = product.terms.term.max - product.terms.term.min;
      if (termRange > 0) score += 5;
    }

    if (product.featured) {
      score += 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Score deductible favorability (0-100). Lower deductible = higher score.
   */
  calculateDeductibleScore(product: MoneyLionProduct): number {
    let score = 70; // baseline — no deductible info defaults to decent score

    // Use credit limit range as proxy for deductible tiers
    // (lower min = lower deductible = higher score)
    if (product.terms.creditLimit) {
      const minDeductible = product.terms.creditLimit.min;
      if (minDeductible <= 250) score = 95;
      else if (minDeductible <= 500) score = 85;
      else if (minDeductible <= 1000) score = 70;
      else if (minDeductible <= 2500) score = 55;
      else if (minDeductible <= 5000) score = 40;
      else score = 25;
    }

    // Lower annual fee suggests lower out-of-pocket costs
    const fee = product.terms.annualFee ?? 0;
    if (fee === 0) {
      score = Math.min(100, score + 5);
    } else if (fee > 200) {
      score = Math.max(0, score - 10);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Categorize an insurance product based on its name, description, and terms.
   */
  categorizeInsurance(product: MoneyLionProduct): InsuranceType {
    const text =
      `${product.name} ${product.description} ${product.terms.rewards ?? ""} ${product.terms.signupBonus ?? ""}`.toLowerCase();

    // Check more specific types first (renters before home, since "home" is broad)
    const orderedTypes: InsuranceType[] = ["renters", "auto", "life", "health", "home"];

    for (const type of orderedTypes) {
      for (const keyword of INSURANCE_TYPE_KEYWORDS[type]) {
        if (text.includes(keyword)) {
          return type;
        }
      }
    }

    // Default to auto if no keywords match (most common insurance type)
    return "auto";
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Retrieve all active insurance products from cache.
   */
  private getInsuranceProducts(): MoneyLionProduct[] {
    const cacheKey = "ins-catalog";
    const cached = this._cache.get<MoneyLionProduct[]>(cacheKey);
    if (cached) return cached;

    // In production this would call moneyLionClient.getProductCatalog("insurance").
    // For now, return an empty array which the product matcher will populate
    // via its own catalog integration.
    return [];
  }

  /**
   * Estimate premium based on insurance type and user profile.
   */
  private estimatePremium(
    type: InsuranceType,
    profile: UserMatchProfile,
  ): { monthly: number; annual: number } {
    const baseline = PREMIUM_BASELINES[type];
    let annual = baseline.base;

    // Adjust based on income
    if (profile.annualIncome !== undefined && baseline.incomeMultiplier > 0) {
      annual += profile.annualIncome * baseline.incomeMultiplier;
    }

    // Adjust based on age
    if (profile.age !== undefined && baseline.ageMultiplier > 0) {
      // Age above 25 increases premium, below 25 adds young driver surcharge
      if (profile.age < 25) {
        annual += baseline.ageMultiplier * (25 - profile.age) * 2;
      } else if (profile.age > 50) {
        annual += baseline.ageMultiplier * (profile.age - 50);
      }
    }

    // Housing status can affect home/renters premiums
    if ((type === "home" || type === "renters") && profile.housingStatus === "own") {
      if (type === "home") {
        // Homeowners pay more for home insurance
        annual *= 1.1;
      }
    }

    annual = Math.round(annual * 100) / 100;
    const monthly = Math.round((annual / 12) * 100) / 100;

    return { monthly, annual };
  }

  /**
   * Calculate approval score (reuse the pattern from credit card matcher).
   */
  private calculateApprovalScore(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number {
    let factors = 0;
    let totalScore = 0;

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

    if (factors === 0) return 50;
    return Math.round(totalScore / factors);
  }

  /**
   * Build a deterministic cache key.
   */
  private buildCacheKey(
    prefix: string,
    profile: UserMatchProfile,
    insuranceType?: InsuranceType,
    limit?: number,
  ): string {
    const parts = [
      prefix,
      profile.userId,
      profile.creditScore ?? "na",
      profile.annualIncome ?? "na",
      profile.age ?? "na",
      profile.state ?? "na",
      profile.housingStatus ?? "na",
      insuranceType ?? "all",
      limit ?? "nolimit",
    ];
    return parts.join(":");
  }

  /**
   * Find the product with the highest value for a given numeric field.
   */
  private findBestByField(
    recommendations: InsuranceRecommendation[],
    field: "premiumScore" | "coverageScore" | "deductibleScore",
  ): string {
    if (recommendations.length === 0) return "";

    let best = recommendations[0];
    for (let i = 1; i < recommendations.length; i++) {
      if (recommendations[i][field] > best[field]) {
        best = recommendations[i];
      }
    }
    return best.product.productId;
  }
}

// =============================================================================
// Exports
// =============================================================================

export { InsuranceMatcher };
export const insuranceMatcher = new InsuranceMatcher(productMatcher, offerCache);
export default insuranceMatcher;
