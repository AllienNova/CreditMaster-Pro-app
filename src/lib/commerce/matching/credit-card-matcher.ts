/**
 * Credit Card Matcher
 *
 * Intelligent credit card matching engine that recommends the best cards
 * based on user profile, spending habits, and preferences.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { offerService, Offer, UserProfile, MatchResult } from "../offers";

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Lazily constructed so `next build` page-data-collection (no runtime env)
// does not abort on createClient's "supabaseUrl is required".
let _supabase: SupabaseClient | null = null;
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, recv) {
    if (!_supabase) _supabase = createClient(supabaseUrl, supabaseServiceKey);
    const v = Reflect.get(_supabase, prop, recv);
    return typeof v === "function" ? v.bind(_supabase) : v;
  },
});

// =============================================================================
// Types
// =============================================================================

export interface SpendingProfile {
  monthlySpend: {
    total: number;
    categories: {
      groceries?: number;
      dining?: number;
      travel?: number;
      gas?: number;
      entertainment?: number;
      shopping?: number;
      utilities?: number;
      other?: number;
    };
  };
  travelFrequency?: "none" | "occasional" | "frequent" | "very_frequent";
  internationalSpend?: boolean;
  balanceCarrying?: boolean;
  averageBalance?: number;
}

export interface CardPreferences {
  primaryGoal:
    | "cashback"
    | "travel"
    | "balance_transfer"
    | "build_credit"
    | "low_interest";
  wantSignupBonus?: boolean;
  noAnnualFee?: boolean;
  prioritizeRewards?: boolean;
  wantPremiumPerks?: boolean;
  preferredAirlines?: string[];
  preferredHotels?: string[];
}

export interface CardRecommendation extends MatchResult {
  annualValue: number;
  firstYearValue: number;
  valueBreakdown: {
    categoryRewards: number;
    signupBonus: number;
    perksValue: number;
    annualFee: number;
  };
  spendingOptimization: Array<{
    category: string;
    currentSpend: number;
    rewardRate: number;
    annualReward: number;
  }>;
  comparisons: {
    betterThan: string[];
    worseThan: string[];
  };
}

export interface MatcherInput {
  userId?: string;
  creditScore?: number;
  income?: number;
  spending: SpendingProfile;
  preferences: CardPreferences;
  region?: string;
  excludeCards?: string[];
  limit?: number;
}

// =============================================================================
// Credit Card Matcher
// =============================================================================

class CreditCardMatcher {
  // ===========================================================================
  // Main Matching
  // ===========================================================================

  /**
   * Get personalized credit card recommendations
   */
  async getRecommendations(input: MatcherInput): Promise<CardRecommendation[]> {
    // Build user profile for offer matching
    const userProfile: UserProfile = {
      creditScore: input.creditScore,
      income: input.income,
      residency: input.region,
      preferences: {
        rewardsType: this.mapRewardsPreference(input.preferences.primaryGoal),
        noAnnualFee: input.preferences.noAnnualFee,
        lowApr:
          input.preferences.primaryGoal === "balance_transfer" ||
          input.preferences.primaryGoal === "low_interest",
        signupBonus: input.preferences.wantSignupBonus,
      },
    };

    // Get matching offers
    const matchResults = await offerService.matchOffers({
      userId: input.userId,
      category: "credit_card",
      profile: userProfile,
      limit: 50, // Get more for filtering
      includeSponsored: true,
      excludePartners: input.excludeCards,
      region: input.region,
    });

    // Calculate value for each card
    const recommendations = matchResults.map((match) =>
      this.calculateCardValue(match, input.spending, input.preferences),
    );

    // Sort by appropriate metric based on goal
    recommendations.sort((a, b) => {
      if (
        input.preferences.primaryGoal === "cashback" ||
        input.preferences.primaryGoal === "travel"
      ) {
        return b.annualValue - a.annualValue;
      } else if (input.preferences.primaryGoal === "balance_transfer") {
        // Sort by lowest APR
        const aprA = a.offer.apr?.min || 100;
        const aprB = b.offer.apr?.min || 100;
        return aprA - aprB;
      } else if (input.preferences.primaryGoal === "build_credit") {
        // Sort by approval likelihood
        return b.matchScore - a.matchScore;
      }
      return b.firstYearValue - a.firstYearValue;
    });

    // Apply limit
    const limitedResults = recommendations.slice(0, input.limit || 10);

    // Add comparisons
    return this.addComparisons(limitedResults);
  }

  /**
   * Get top card for a specific category
   */
  async getTopCardForCategory(
    category: keyof SpendingProfile["monthlySpend"]["categories"],
    input: MatcherInput,
  ): Promise<CardRecommendation | null> {
    const recommendations = await this.getRecommendations(input);

    // Find card with best rewards for this category
    let bestCard: CardRecommendation | null = null;
    let bestRate = 0;

    for (const rec of recommendations) {
      const categoryRate = this.getCategoryRewardRate(rec.offer, category);
      if (categoryRate > bestRate) {
        bestRate = categoryRate;
        bestCard = rec;
      }
    }

    return bestCard;
  }

  /**
   * Compare two cards
   */
  async compareCards(
    cardId1: string,
    cardId2: string,
    input: MatcherInput,
  ): Promise<{
    card1: CardRecommendation;
    card2: CardRecommendation;
    winner: string;
    comparison: Array<{
      metric: string;
      card1Value: string | number;
      card2Value: string | number;
      winner: string;
    }>;
  }> {
    const offer1 = await offerService.getOffer(cardId1);
    const offer2 = await offerService.getOffer(cardId2);

    if (!offer1 || !offer2) {
      throw new Error("One or both cards not found");
    }

    const userProfile: UserProfile = {
      creditScore: input.creditScore,
      income: input.income,
    };

    const match1: MatchResult = {
      offer: offer1,
      matchScore: offerService.calculateMatchScore(offer1, userProfile),
      eligibility: offerService.checkEligibility(offer1, userProfile).result,
      eligibilityReasons: offerService.checkEligibility(offer1, userProfile)
        .reasons,
      highlights: [],
      disclosures: [],
    };

    const match2: MatchResult = {
      offer: offer2,
      matchScore: offerService.calculateMatchScore(offer2, userProfile),
      eligibility: offerService.checkEligibility(offer2, userProfile).result,
      eligibilityReasons: offerService.checkEligibility(offer2, userProfile)
        .reasons,
      highlights: [],
      disclosures: [],
    };

    const rec1 = this.calculateCardValue(
      match1,
      input.spending,
      input.preferences,
    );
    const rec2 = this.calculateCardValue(
      match2,
      input.spending,
      input.preferences,
    );

    const comparison = [
      {
        metric: "Annual Value",
        card1Value: `$${rec1.annualValue.toFixed(0)}`,
        card2Value: `$${rec2.annualValue.toFixed(0)}`,
        winner: rec1.annualValue > rec2.annualValue ? "card1" : "card2",
      },
      {
        metric: "First Year Value",
        card1Value: `$${rec1.firstYearValue.toFixed(0)}`,
        card2Value: `$${rec2.firstYearValue.toFixed(0)}`,
        winner: rec1.firstYearValue > rec2.firstYearValue ? "card1" : "card2",
      },
      {
        metric: "Annual Fee",
        card1Value: offer1.fees?.annual || 0,
        card2Value: offer2.fees?.annual || 0,
        winner:
          (offer1.fees?.annual || 0) < (offer2.fees?.annual || 0)
            ? "card1"
            : "card2",
      },
      {
        metric: "Signup Bonus",
        card1Value: offer1.rewards?.signupBonus || 0,
        card2Value: offer2.rewards?.signupBonus || 0,
        winner:
          (offer1.rewards?.signupBonus || 0) >
          (offer2.rewards?.signupBonus || 0)
            ? "card1"
            : "card2",
      },
      {
        metric: "Base Rewards Rate",
        card1Value: `${offer1.rewards?.earnRate || 0}%`,
        card2Value: `${offer2.rewards?.earnRate || 0}%`,
        winner:
          (offer1.rewards?.earnRate || 0) > (offer2.rewards?.earnRate || 0)
            ? "card1"
            : "card2",
      },
      {
        metric: "Regular APR",
        card1Value: `${offer1.apr?.min || 0}%`,
        card2Value: `${offer2.apr?.min || 0}%`,
        winner:
          (offer1.apr?.min || 100) < (offer2.apr?.min || 100)
            ? "card1"
            : "card2",
      },
    ];

    // Determine overall winner
    const card1Wins = comparison.filter((c) => c.winner === "card1").length;
    const winner = card1Wins > comparison.length / 2 ? cardId1 : cardId2;

    return {
      card1: rec1,
      card2: rec2,
      winner,
      comparison,
    };
  }

  // ===========================================================================
  // Value Calculation
  // ===========================================================================

  /**
   * Calculate the annual and first-year value of a card
   */
  private calculateCardValue(
    match: MatchResult,
    spending: SpendingProfile,
    preferences: CardPreferences,
  ): CardRecommendation {
    const offer = match.offer;
    const spendingOptimization: CardRecommendation["spendingOptimization"] = [];

    let categoryRewards = 0;

    // Calculate rewards for each spending category
    const categories = spending.monthlySpend.categories;
    for (const [category, monthlyAmount] of Object.entries(categories)) {
      if (monthlyAmount && monthlyAmount > 0) {
        const rewardRate = this.getCategoryRewardRate(offer, category);
        const annualReward = (monthlyAmount * 12 * rewardRate) / 100;
        categoryRewards += annualReward;

        spendingOptimization.push({
          category,
          currentSpend: monthlyAmount * 12,
          rewardRate,
          annualReward,
        });
      }
    }

    // Add base rewards for uncategorized spending
    const categorizedSpend = Object.values(categories).reduce(
      (sum, val) => sum + (val || 0),
      0,
    );
    const uncategorizedSpend = spending.monthlySpend.total - categorizedSpend;
    if (uncategorizedSpend > 0) {
      const baseRate = offer.rewards?.earnRate || 1;
      const annualReward = (uncategorizedSpend * 12 * baseRate) / 100;
      categoryRewards += annualReward;

      spendingOptimization.push({
        category: "other",
        currentSpend: uncategorizedSpend * 12,
        rewardRate: baseRate,
        annualReward,
      });
    }

    // Calculate signup bonus value (prorated if cash, or with points valuation)
    let signupBonusValue = 0;
    if (offer.rewards?.signupBonus) {
      if (offer.rewards.type === "cashback") {
        signupBonusValue = offer.rewards.signupBonus;
      } else if (offer.rewards.type === "points") {
        signupBonusValue = offer.rewards.signupBonus * 0.01; // 1 cent per point
      } else if (offer.rewards.type === "miles") {
        signupBonusValue = offer.rewards.signupBonus * 0.012; // 1.2 cents per mile
      }
    }

    // Calculate perks value
    const perksValue = this.calculatePerksValue(offer, preferences, spending);

    // Annual fee
    const annualFee = offer.fees?.annual || 0;

    // Calculate final values
    const annualValue = categoryRewards + perksValue - annualFee;
    const firstYearValue = annualValue + signupBonusValue;

    // Sort optimization by annual reward
    spendingOptimization.sort((a, b) => b.annualReward - a.annualReward);

    return {
      ...match,
      annualValue,
      firstYearValue,
      valueBreakdown: {
        categoryRewards,
        signupBonus: signupBonusValue,
        perksValue,
        annualFee,
      },
      spendingOptimization,
      comparisons: {
        betterThan: [],
        worseThan: [],
      },
    };
  }

  /**
   * Get reward rate for a spending category
   */
  private getCategoryRewardRate(offer: Offer, category: string): number {
    // Check bonus categories
    if (offer.rewards?.categories) {
      for (const bonusCategory of offer.rewards.categories) {
        if (this.categoryMatches(bonusCategory.category, category)) {
          return bonusCategory.rate;
        }
      }
    }

    // Return base rate
    return offer.rewards?.earnRate || 1;
  }

  /**
   * Check if a bonus category matches a spending category
   */
  private categoryMatches(
    bonusCategory: string,
    spendingCategory: string,
  ): boolean {
    const categoryMappings: Record<string, string[]> = {
      groceries: ["grocery", "supermarket", "groceries"],
      dining: ["restaurant", "dining", "food"],
      travel: ["airline", "hotel", "travel", "transportation"],
      gas: ["gas", "fuel", "petrol"],
      entertainment: ["entertainment", "streaming", "movies"],
      shopping: ["retail", "shopping", "online shopping"],
      utilities: ["utilities", "phone", "internet"],
    };

    const mappings = categoryMappings[spendingCategory.toLowerCase()] || [
      spendingCategory.toLowerCase(),
    ];
    return mappings.some((m) => bonusCategory.toLowerCase().includes(m));
  }

  /**
   * Calculate value of card perks
   */
  private calculatePerksValue(
    offer: Offer,
    preferences: CardPreferences,
    spending: SpendingProfile,
  ): number {
    let perksValue = 0;

    // No foreign transaction fees
    if (offer.fees?.foreignTransaction === 0 && spending.internationalSpend) {
      // Estimate 3% savings on international spend
      const internationalSpend = spending.monthlySpend.total * 0.1 * 12; // Assume 10% of spend is international
      perksValue += internationalSpend * 0.03;
    }

    // Travel perks for travelers
    if (
      preferences.primaryGoal === "travel" &&
      spending.travelFrequency !== "none"
    ) {
      if (offer.tags?.includes("lounge_access")) {
        const loungeVisits =
          spending.travelFrequency === "very_frequent"
            ? 12
            : spending.travelFrequency === "frequent"
              ? 6
              : 2;
        perksValue += loungeVisits * 35; // $35 per lounge visit
      }

      if (offer.tags?.includes("tsa_precheck_credit")) {
        perksValue += 85 / 5; // $85 over 5 years = $17/year
      }

      if (offer.tags?.includes("hotel_status")) {
        perksValue += 100; // Estimated value of hotel status
      }
    }

    // Premium card perks
    if (preferences.wantPremiumPerks) {
      if (offer.tags?.includes("concierge")) {
        perksValue += 50;
      }
      if (offer.tags?.includes("travel_insurance")) {
        perksValue += 75;
      }
      if (offer.tags?.includes("purchase_protection")) {
        perksValue += 50;
      }
    }

    return perksValue;
  }

  // ===========================================================================
  // Comparisons
  // ===========================================================================

  /**
   * Add comparison data to recommendations
   */
  private addComparisons(
    recommendations: CardRecommendation[],
  ): CardRecommendation[] {
    for (let i = 0; i < recommendations.length; i++) {
      const current = recommendations[i];
      const betterThan: string[] = [];
      const worseThan: string[] = [];

      for (let j = 0; j < recommendations.length; j++) {
        if (i === j) continue;
        const other = recommendations[j];

        if (current.annualValue > other.annualValue) {
          betterThan.push(other.offer.name);
        } else if (current.annualValue < other.annualValue) {
          worseThan.push(other.offer.name);
        }
      }

      current.comparisons = { betterThan, worseThan };
    }

    return recommendations;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Map primary goal to rewards preference
   */
  private mapRewardsPreference(
    goal: CardPreferences["primaryGoal"],
  ): "cashback" | "points" | "miles" | undefined {
    switch (goal) {
      case "cashback":
        return "cashback";
      case "travel":
        return "miles";
      default:
        return undefined;
    }
  }

  // ===========================================================================
  // Spending Analysis
  // ===========================================================================

  /**
   * Analyze user transactions to build spending profile
   */
  async analyzeSpending(userId: string): Promise<SpendingProfile> {
    // Get user's transactions from the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, category, merchant_name")
      .eq("user_id", userId)
      .gte("date", threeMonthsAgo.toISOString())
      .eq("type", "expense");

    if (!transactions || transactions.length === 0) {
      return {
        monthlySpend: {
          total: 0,
          categories: {},
        },
      };
    }

    // Categorize spending
    const categoryTotals: Record<string, number> = {
      groceries: 0,
      dining: 0,
      travel: 0,
      gas: 0,
      entertainment: 0,
      shopping: 0,
      utilities: 0,
      other: 0,
    };

    let totalSpend = 0;

    for (const tx of transactions) {
      const amount = Math.abs(tx.amount);
      totalSpend += amount;

      const category = this.mapTransactionCategory(
        tx.category,
        tx.merchant_name,
      );
      categoryTotals[category] += amount;
    }

    // Convert to monthly averages
    const months = 3;

    return {
      monthlySpend: {
        total: totalSpend / months,
        categories: {
          groceries: categoryTotals.groceries / months,
          dining: categoryTotals.dining / months,
          travel: categoryTotals.travel / months,
          gas: categoryTotals.gas / months,
          entertainment: categoryTotals.entertainment / months,
          shopping: categoryTotals.shopping / months,
          utilities: categoryTotals.utilities / months,
          other: categoryTotals.other / months,
        },
      },
    };
  }

  /**
   * Map transaction category to spending category
   */
  private mapTransactionCategory(
    category: string,
    merchantName?: string,
  ): string {
    const categoryLower = category?.toLowerCase() || "";
    const merchantLower = merchantName?.toLowerCase() || "";

    // Groceries
    if (
      categoryLower.includes("grocery") ||
      categoryLower.includes("supermarket") ||
      merchantLower.includes("walmart") ||
      merchantLower.includes("kroger") ||
      merchantLower.includes("safeway")
    ) {
      return "groceries";
    }

    // Dining
    if (
      categoryLower.includes("restaurant") ||
      categoryLower.includes("food") ||
      categoryLower.includes("dining")
    ) {
      return "dining";
    }

    // Travel
    if (
      categoryLower.includes("airline") ||
      categoryLower.includes("hotel") ||
      categoryLower.includes("travel")
    ) {
      return "travel";
    }

    // Gas
    if (categoryLower.includes("gas") || categoryLower.includes("fuel")) {
      return "gas";
    }

    // Entertainment
    if (
      categoryLower.includes("entertainment") ||
      categoryLower.includes("streaming") ||
      categoryLower.includes("movie")
    ) {
      return "entertainment";
    }

    // Shopping
    if (
      categoryLower.includes("shopping") ||
      categoryLower.includes("retail")
    ) {
      return "shopping";
    }

    // Utilities
    if (
      categoryLower.includes("utility") ||
      categoryLower.includes("phone") ||
      categoryLower.includes("internet")
    ) {
      return "utilities";
    }

    return "other";
  }
}

// Export singleton
export const creditCardMatcher = new CreditCardMatcher();
export default creditCardMatcher;
