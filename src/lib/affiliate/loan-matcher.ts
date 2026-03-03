/**
 * Loan Recommendation Engine
 *
 * Specialized matcher for loan products. Extends the generic product
 * matcher with loan-specific scoring: APR evaluation, term appropriateness,
 * amount fit, fee analysis, and monthly payment estimation via standard
 * amortization.
 *
 * Part of AFF-03.
 */

import type { MoneyLionProduct, UserMatchProfile } from "./types";
import { productMatcher } from "./product-matcher";
import { offerCache, OfferCache } from "./offer-cache";

// =============================================================================
// Types
// =============================================================================

export type LoanType = "personal" | "auto" | "student" | "mortgage" | "home_equity";

export interface LoanRecommendation {
  product: MoneyLionProduct;
  matchScore: number;
  loanType: LoanType;
  eligible: boolean;
  eligibilityReasons: string[];
  highlights: string[];
  estimatedMonthlyPayment?: number;
  aprScore: number;
  termScore: number;
  amountScore: number;
  feeScore: number;
}

export interface LoanComparison {
  products: LoanRecommendation[];
  bestApr: string;
  bestTerms: string;
  bestOverall: string;
  lowestPayment: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Weights for the composite match score (must sum to 100) */
const COMPOSITE_WEIGHTS = {
  apr: 35,
  term: 20,
  amount: 25,
  fee: 20,
} as const;

/** Cache TTL for loan recommendations (10 minutes) */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Loan categories for product catalog retrieval */
const LOAN_CATEGORIES = [
  "personal_loan",
  "auto_loan",
  "mortgage",
  "student_loan",
] as const;

// =============================================================================
// Loan Type Detection Keywords
// =============================================================================

const LOAN_TYPE_KEYWORDS: Record<LoanType, string[]> = {
  personal: ["personal", "unsecured", "cash advance"],
  auto: ["auto", "car", "vehicle"],
  student: ["student", "education", "tuition"],
  mortgage: ["mortgage", "home loan", "house"],
  home_equity: ["home equity", "heloc", "equity line"],
};

// =============================================================================
// Loan Matcher
// =============================================================================

class LoanMatcher {
  constructor(
    private _productMatcher: typeof productMatcher,
    private _cache: OfferCache,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get ranked loan recommendations for a user profile.
   */
  getRecommendations(
    profile: UserMatchProfile,
    loanType?: LoanType,
    limit?: number,
  ): LoanRecommendation[] {
    const cacheKey = this.buildCacheKey("loan-recs", profile, loanType, limit);
    const cached = this._cache.get<LoanRecommendation[]>(cacheKey);
    if (cached) return cached;

    const products = this.getLoanProducts();

    const matches = this._productMatcher.matchProducts(products, profile, {
      categories: [...LOAN_CATEGORIES],
      includeIneligible: false,
    });

    let recommendations: LoanRecommendation[] = matches.map((match) => {
      const type = this.categorizeLoan(match.product);
      const aprScore = this.calculateAprScore(match.product);
      const termScore = this.calculateTermScore(match.product, profile);
      const amountScore = this.calculateAmountScore(match.product, profile);
      const feeScore = this.calculateFeeScore(match.product);

      const compositeScore = Math.round(
        aprScore * (COMPOSITE_WEIGHTS.apr / 100) +
          termScore * (COMPOSITE_WEIGHTS.term / 100) +
          amountScore * (COMPOSITE_WEIGHTS.amount / 100) +
          feeScore * (COMPOSITE_WEIGHTS.fee / 100),
      );

      const eligibility = this._productMatcher.checkEligibility(match.product, profile);
      const highlights = this._productMatcher.generateHighlights(match.product, profile);
      const estimatedPayment = this.estimatePaymentForProduct(match.product, profile);

      return {
        product: match.product,
        matchScore: Math.max(0, Math.min(100, compositeScore)),
        loanType: type,
        eligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons,
        highlights,
        estimatedMonthlyPayment: estimatedPayment,
        aprScore,
        termScore,
        amountScore,
        feeScore,
      };
    });

    // Filter by loan type if specified
    if (loanType) {
      recommendations = recommendations.filter(
        (r) => r.loanType === loanType,
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
   * Return the single top-pick loan for a user, or null if none qualify.
   */
  getTopPick(
    profile: UserMatchProfile,
    loanType?: LoanType,
  ): LoanRecommendation | null {
    const results = this.getRecommendations(profile, loanType, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Compare specific loan products side-by-side.
   */
  compareLoans(productIds: string[]): LoanComparison {
    const allProducts = this.getLoanProducts();
    const selected = allProducts.filter((p) => productIds.includes(p.productId));

    const defaultProfile: UserMatchProfile = { userId: "comparison" };

    const recommendations: LoanRecommendation[] = selected.map((product) => {
      const type = this.categorizeLoan(product);
      const aprScore = this.calculateAprScore(product);
      const termScore = this.calculateTermScore(product, defaultProfile);
      const amountScore = this.calculateAmountScore(product, defaultProfile);
      const feeScore = this.calculateFeeScore(product);

      const compositeScore = Math.round(
        aprScore * (COMPOSITE_WEIGHTS.apr / 100) +
          termScore * (COMPOSITE_WEIGHTS.term / 100) +
          amountScore * (COMPOSITE_WEIGHTS.amount / 100) +
          feeScore * (COMPOSITE_WEIGHTS.fee / 100),
      );

      const eligibility = this._productMatcher.checkEligibility(product, defaultProfile);
      const highlights = this._productMatcher.generateHighlights(product, defaultProfile);

      return {
        product,
        matchScore: Math.max(0, Math.min(100, compositeScore)),
        loanType: type,
        eligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons,
        highlights,
        aprScore,
        termScore,
        amountScore,
        feeScore,
      };
    });

    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    const bestApr = this.findBestByField(recommendations, "aprScore");
    const bestTerms = this.findBestByField(recommendations, "termScore");
    const bestOverall = recommendations.length > 0 ? recommendations[0].product.productId : "";
    const lowestPayment = this.findLowestPayment(recommendations);

    return {
      products: recommendations,
      bestApr,
      bestTerms,
      bestOverall,
      lowestPayment,
    };
  }

  // ---------------------------------------------------------------------------
  // Scoring Methods
  // ---------------------------------------------------------------------------

  /**
   * Score APR competitiveness (0-100). Lower APR = higher score.
   */
  calculateAprScore(product: MoneyLionProduct): number {
    if (!product.terms.apr) {
      return 50; // no APR info = neutral
    }

    const avgApr = (product.terms.apr.min + product.terms.apr.max) / 2;

    // Scale: 0% = 100, 30% = 0
    let score = 100 - (avgApr / 30) * 100;

    // Bonus for fixed rate (more predictable)
    if (product.terms.apr.type === "fixed") {
      score = Math.min(100, score + 5);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Score term appropriateness (0-100). Appropriate term length for the user.
   */
  calculateTermScore(product: MoneyLionProduct, profile: UserMatchProfile): number {
    if (!product.terms.term) {
      return 50; // no term info = neutral
    }

    let score = 60; // baseline

    const { min, max, unit } = product.terms.term;
    const minMonths = unit === "years" ? min * 12 : min;
    const maxMonths = unit === "years" ? max * 12 : max;
    const termRange = maxMonths - minMonths;

    // Wider range of terms = more flexibility = higher score
    if (termRange >= 48) score += 20;
    else if (termRange >= 24) score += 15;
    else if (termRange >= 12) score += 10;
    else if (termRange > 0) score += 5;

    // Younger borrowers benefit from longer available terms
    if (profile.age !== undefined) {
      if (profile.age < 35 && maxMonths >= 60) {
        score += 10;
      } else if (profile.age >= 55 && minMonths <= 24) {
        score += 10; // shorter terms available for older borrowers
      }
    }

    // Very long max terms (e.g., 30-year mortgage) are good for high-value loans
    if (maxMonths >= 360) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Score amount fit (0-100). How well the loan amount range fits the user's needs.
   */
  calculateAmountScore(product: MoneyLionProduct, profile: UserMatchProfile): number {
    if (!product.terms.loanAmount) {
      return 50; // no amount info = neutral
    }

    let score = 50; // baseline

    const { min, max } = product.terms.loanAmount;

    // Higher max = more borrowing power = generally better
    if (max >= 500000) score += 25;
    else if (max >= 100000) score += 20;
    else if (max >= 50000) score += 15;
    else if (max >= 25000) score += 10;
    else if (max >= 10000) score += 5;

    // Lower minimum = more accessible
    if (min <= 1000) score += 10;
    else if (min <= 5000) score += 5;

    // If income is available, check if loan amount range makes sense
    if (profile.annualIncome !== undefined && profile.annualIncome > 0) {
      // Reasonable debt-to-income: loan max shouldn't exceed 5x annual income
      const ratio = max / profile.annualIncome;
      if (ratio <= 5) score += 10;
      else if (ratio <= 10) score += 5;
      // Over 10x income is risky, no bonus
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Score fee structure (0-100). Lower fees = higher score.
   */
  calculateFeeScore(product: MoneyLionProduct): number {
    let score = 100; // start perfect, deduct for fees

    // Annual fee / origination fee
    const fee = product.terms.annualFee ?? 0;
    if (fee > 0) {
      // $0 fee = 100, $500+ fee = 50
      const feePenalty = Math.min(50, (fee / 500) * 50);
      score -= feePenalty;
    }

    // If signup bonus exists, it can offset fees
    if (product.terms.signupBonus) {
      score = Math.min(100, score + 5);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate monthly payment using standard amortization formula:
   * P * (r * (1+r)^n) / ((1+r)^n - 1)
   *
   * @param principal - Loan amount in dollars
   * @param apr - Annual percentage rate (e.g., 5.5 for 5.5%)
   * @param termMonths - Loan term in months
   * @returns Monthly payment amount in dollars, rounded to 2 decimal places
   */
  estimateMonthlyPayment(principal: number, apr: number, termMonths: number): number {
    if (principal <= 0 || termMonths <= 0) return 0;

    // 0% APR = simple division
    if (apr === 0) {
      return Math.round((principal / termMonths) * 100) / 100;
    }

    const monthlyRate = apr / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const payment = principal * (monthlyRate * factor) / (factor - 1);

    return Math.round(payment * 100) / 100;
  }

  /**
   * Categorize a loan product based on its name, description, and terms.
   */
  categorizeLoan(product: MoneyLionProduct): LoanType {
    const text =
      `${product.name} ${product.description} ${product.terms.rewards ?? ""} ${product.terms.signupBonus ?? ""}`.toLowerCase();

    // Check more specific types first (home_equity before mortgage to avoid "home" false positive)
    const orderedTypes: LoanType[] = ["home_equity", "auto", "student", "mortgage", "personal"];

    for (const type of orderedTypes) {
      for (const keyword of LOAN_TYPE_KEYWORDS[type]) {
        if (text.includes(keyword)) {
          return type;
        }
      }
    }

    // Also check the category field for direct mapping
    switch (product.category) {
      case "auto_loan":
        return "auto";
      case "student_loan":
        return "student";
      case "mortgage":
        return "mortgage";
      case "personal_loan":
      default:
        return "personal";
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Retrieve all active loan products from cache.
   */
  private getLoanProducts(): MoneyLionProduct[] {
    const cacheKey = "loan-catalog";
    const cached = this._cache.get<MoneyLionProduct[]>(cacheKey);
    if (cached) return cached;

    // In production this would call moneyLionClient.getProductCatalog()
    // with loan categories. For now, return an empty array.
    return [];
  }

  /**
   * Estimate monthly payment for a product based on its terms and user profile.
   */
  private estimatePaymentForProduct(
    product: MoneyLionProduct,
    profile: UserMatchProfile,
  ): number | undefined {
    if (!product.terms.apr || !product.terms.loanAmount || !product.terms.term) {
      return undefined;
    }

    // Use average APR for estimation
    const avgApr = (product.terms.apr.min + product.terms.apr.max) / 2;

    // Use a reasonable loan amount — midpoint or based on income
    let principal: number;
    if (profile.annualIncome !== undefined && profile.annualIncome > 0) {
      // Assume they want about 1x their annual income, capped to product range
      principal = Math.max(
        product.terms.loanAmount.min,
        Math.min(product.terms.loanAmount.max, profile.annualIncome),
      );
    } else {
      // Use midpoint of range
      principal = (product.terms.loanAmount.min + product.terms.loanAmount.max) / 2;
    }

    // Use the midpoint term
    const { min, max, unit } = product.terms.term;
    const minMonths = unit === "years" ? min * 12 : min;
    const maxMonths = unit === "years" ? max * 12 : max;
    const termMonths = Math.round((minMonths + maxMonths) / 2);

    if (termMonths <= 0) return undefined;

    return this.estimateMonthlyPayment(principal, avgApr, termMonths);
  }

  /**
   * Build a deterministic cache key.
   */
  private buildCacheKey(
    prefix: string,
    profile: UserMatchProfile,
    loanType?: LoanType,
    limit?: number,
  ): string {
    const parts = [
      prefix,
      profile.userId,
      profile.creditScore ?? "na",
      profile.annualIncome ?? "na",
      profile.age ?? "na",
      profile.state ?? "na",
      loanType ?? "all",
      limit ?? "nolimit",
    ];
    return parts.join(":");
  }

  /**
   * Find the product with the highest value for a given numeric field.
   */
  private findBestByField(
    recommendations: LoanRecommendation[],
    field: "aprScore" | "termScore" | "amountScore" | "feeScore",
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

  /**
   * Find the product with the lowest estimated monthly payment.
   */
  private findLowestPayment(recommendations: LoanRecommendation[]): string {
    if (recommendations.length === 0) return "";

    const withPayments = recommendations.filter(
      (r) => r.estimatedMonthlyPayment !== undefined,
    );

    if (withPayments.length === 0) {
      return recommendations[0].product.productId;
    }

    let lowest = withPayments[0];
    for (let i = 1; i < withPayments.length; i++) {
      if (withPayments[i].estimatedMonthlyPayment! < lowest.estimatedMonthlyPayment!) {
        lowest = withPayments[i];
      }
    }
    return lowest.product.productId;
  }
}

// =============================================================================
// Exports
// =============================================================================

export { LoanMatcher };
export const loanMatcher = new LoanMatcher(productMatcher, offerCache);
export default loanMatcher;
