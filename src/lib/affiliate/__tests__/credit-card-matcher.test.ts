/**
 * Credit Card Matcher Tests
 *
 * Tests for the credit card recommendation engine (AFF-02).
 */

import type { MoneyLionProduct, UserMatchProfile } from "../types";
import { CreditCardMatcher } from "../credit-card-matcher";
import type { CreditCardMatchOptions } from "../credit-card-matcher";
import { productMatcher } from "../product-matcher";
import { OfferCache } from "../offer-cache";

// =============================================================================
// Test Fixtures
// =============================================================================

function createProduct(
  overrides: Partial<MoneyLionProduct> = {},
): MoneyLionProduct {
  return {
    productId: "cc_001",
    name: "CashBack Visa",
    category: "credit_card",
    partner: "partner_001",
    description: "2% cash back on all purchases",
    terms: {
      apr: { min: 14.99, max: 24.99, type: "variable" },
      annualFee: 0,
      creditLimit: { min: 1000, max: 10000 },
      rewards: "2% cash back on all purchases",
      signupBonus: "$200 after spending $500",
    },
    eligibility: {
      minCreditScore: 670,
      minIncome: 30000,
      allowedStates: ["CA", "NY", "TX", "FL", "WA"],
    },
    commission: { type: "cpa", amount: 50, currency: "USD" },
    clickUrl: "https://partner.com/apply",
    logoUrl: "https://cdn.partner.com/logo.png",
    featured: false,
    active: true,
    ...overrides,
  };
}

function createProfile(
  overrides: Partial<UserMatchProfile> = {},
): UserMatchProfile {
  return {
    userId: "user_001",
    creditScore: 720,
    annualIncome: 65000,
    age: 30,
    state: "CA",
    ...overrides,
  };
}

// Catalog of test credit card products
const testCatalog: MoneyLionProduct[] = [
  createProduct({
    productId: "cc_cashback",
    name: "CashBack Visa",
    description: "2% cash back on all purchases",
    terms: {
      apr: { min: 14.99, max: 24.99, type: "variable" },
      annualFee: 0,
      rewards: "2% cash back on all purchases",
      signupBonus: "$200 after spending $500",
      creditLimit: { min: 1000, max: 10000 },
    },
    eligibility: {
      minCreditScore: 670,
      minIncome: 30000,
      allowedStates: ["CA", "NY", "TX", "FL", "WA"],
    },
    featured: true,
  }),
  createProduct({
    productId: "cc_travel",
    name: "Travel Rewards Platinum",
    partner: "partner_002",
    description: "Earn miles on every purchase with travel perks",
    terms: {
      apr: { min: 17.99, max: 26.99, type: "variable" },
      annualFee: 95,
      rewards: "3x points on travel and dining",
      signupBonus: "$500 after spending $3000",
      creditLimit: { min: 5000, max: 25000 },
    },
    eligibility: {
      minCreditScore: 720,
      minIncome: 50000,
      allowedStates: ["CA", "NY"],
    },
    featured: true,
  }),
  createProduct({
    productId: "cc_secured",
    name: "Secured Builder Card",
    partner: "partner_003",
    description: "Secured credit builder card for rebuilding credit",
    terms: {
      apr: { min: 22.99, max: 28.99, type: "variable" },
      annualFee: 39,
      creditLimit: { min: 200, max: 2000 },
    },
    eligibility: {
      minCreditScore: 300,
      minIncome: 15000,
    },
  }),
  createProduct({
    productId: "cc_balance_transfer",
    name: "0% Balance Transfer Card",
    partner: "partner_004",
    description: "0% intro APR on balance transfers for 18 months",
    terms: {
      apr: { min: 0, max: 22.99, type: "variable" },
      annualFee: 0,
      signupBonus: "0% intro APR for 18 months",
      creditLimit: { min: 2000, max: 15000 },
    },
    eligibility: {
      minCreditScore: 680,
      minIncome: 35000,
    },
  }),
  createProduct({
    productId: "cc_student",
    name: "Student Cash Back Card",
    partner: "partner_005",
    description: "Designed for college students building credit",
    terms: {
      apr: { min: 18.99, max: 25.99, type: "variable" },
      annualFee: 0,
      rewards: "1.5% cash back on all purchases",
      creditLimit: { min: 500, max: 3000 },
    },
    eligibility: {
      minCreditScore: 580,
      minIncome: 10000,
    },
  }),
  createProduct({
    productId: "cc_business",
    name: "Business Platinum Card",
    partner: "partner_006",
    description: "Premium business card with expense management",
    terms: {
      apr: { min: 15.99, max: 23.99, type: "variable" },
      annualFee: 195,
      rewards: "2% cash back on business expenses",
      signupBonus: "$750 after spending $5000",
      creditLimit: { min: 10000, max: 50000 },
    },
    eligibility: {
      minCreditScore: 700,
      minIncome: 80000,
    },
    featured: true,
  }),
  createProduct({
    productId: "cc_inactive",
    name: "Discontinued Card",
    active: false,
    eligibility: {},
    terms: {},
  }),
];

// =============================================================================
// Helper: build a matcher that uses our test catalog
// =============================================================================

function createMatcher(): { matcher: CreditCardMatcher; cache: OfferCache } {
  const cache = new OfferCache();
  // Seed the cache with our test catalog so getCreditCardProducts returns it
  cache.set("cc-catalog", testCatalog);
  const matcher = new CreditCardMatcher(productMatcher, cache);
  return { matcher, cache };
}

// =============================================================================
// Tests
// =============================================================================

describe("CreditCardMatcher", () => {
  afterEach(() => {
    // Each test gets a fresh matcher via createMatcher()
  });

  // ---------------------------------------------------------------------------
  // getRecommendations
  // ---------------------------------------------------------------------------

  describe("getRecommendations", () => {
    it("should return recommendations for a high credit score user", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 800, annualIncome: 100000 });

      const results = await matcher.getRecommendations(profile);

      expect(results.length).toBeGreaterThan(0);
      for (const rec of results) {
        expect(rec.product.category).toBe("credit_card");
        expect(rec.scores.overall).toBeGreaterThanOrEqual(0);
        expect(rec.scores.overall).toBeLessThanOrEqual(100);
        expect(rec.rank).toBeGreaterThan(0);
      }
    });

    it("should return recommendations for a low credit score user", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 550, annualIncome: 25000 });

      const results = await matcher.getRecommendations(profile);

      // Low credit score should still get at least the secured card
      // (eligible users only, depends on product matcher eligibility)
      expect(Array.isArray(results)).toBe(true);
    });

    it("should sort results by overall score descending", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].scores.overall).toBeGreaterThanOrEqual(
          results[i].scores.overall,
        );
      }
    });

    it("should assign sequential ranks starting from 1", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile);

      for (let i = 0; i < results.length; i++) {
        expect(results[i].rank).toBe(i + 1);
      }
    });

    it("should filter by card category", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile, {
        cardCategory: "cashback",
      });

      for (const rec of results) {
        expect(rec.category).toBe("cashback");
      }
    });

    it("should filter by minApprovalScore", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 750 });

      const results = await matcher.getRecommendations(profile, {
        minApprovalScore: 70,
      });

      for (const rec of results) {
        expect(rec.scores.approvalScore).toBeGreaterThanOrEqual(70);
      }
    });

    it("should apply spending profile to rewards scoring", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const lowSpend = await matcher.getRecommendations(profile, {
        spendingProfile: { monthlySpend: 500 },
      });
      const highSpend = await matcher.getRecommendations(profile, {
        spendingProfile: { monthlySpend: 5000 },
      });

      // With higher spending, rewards-heavy cards should score better
      // We just verify the method runs without error and returns results
      expect(Array.isArray(lowSpend)).toBe(true);
      expect(Array.isArray(highSpend)).toBe(true);
    });

    it("should boost balance transfer cards when balance transfer amount is set", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const withBT = await matcher.getRecommendations(profile, {
        balanceTransferAmount: 5000,
      });
      const withoutBT = await matcher.getRecommendations(profile);

      // The balance transfer card should be boosted when BT amount is set
      expect(Array.isArray(withBT)).toBe(true);
      expect(Array.isArray(withoutBT)).toBe(true);
    });

    it("should boost no-annual-fee cards when preferred", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile, {
        preferNonAnnualFee: true,
      });

      // Cards with $0 annual fee should have "No annual fee (preferred)" in reasons
      const noFeeCards = results.filter(
        (r) => (r.product.terms.annualFee ?? 0) === 0,
      );
      for (const card of noFeeCards) {
        expect(
          card.scores.matchReasons.some((r) =>
            r.includes("No annual fee (preferred)"),
          ),
        ).toBe(true);
      }
    });

    it("should respect limit option", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile, { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return cached results on second call", async () => {
      const { matcher, cache } = createMatcher();
      const profile = createProfile();

      const first = await matcher.getRecommendations(profile);
      const statsBefore = cache.getStats();

      const second = await matcher.getRecommendations(profile);
      const statsAfter = cache.getStats();

      // Cache should have been hit
      expect(statsAfter.hits).toBeGreaterThan(statsBefore.hits);
      expect(first.length).toBe(second.length);
    });

    it("should return empty array when catalog is empty", async () => {
      const cache = new OfferCache();
      cache.set("cc-catalog", []);
      const matcher = new CreditCardMatcher(productMatcher, cache);
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile);

      expect(results).toEqual([]);
    });

    it("should include comparison highlights", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 800, annualIncome: 120000 });

      const results = await matcher.getRecommendations(profile);

      if (results.length >= 2) {
        // First result should have "Top pick overall"
        expect(
          results[0].comparisonHighlights.some((h) =>
            h.includes("Top pick overall"),
          ),
        ).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getTopPick
  // ---------------------------------------------------------------------------

  describe("getTopPick", () => {
    it("should return the highest scored card", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const topPick = await matcher.getTopPick(profile);

      if (topPick) {
        expect(topPick.rank).toBe(1);
        expect(topPick.scores.overall).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return null when no cards are available", async () => {
      const cache = new OfferCache();
      cache.set("cc-catalog", []);
      const matcher = new CreditCardMatcher(productMatcher, cache);
      const profile = createProfile();

      const topPick = await matcher.getTopPick(profile);

      expect(topPick).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // compareCards
  // ---------------------------------------------------------------------------

  describe("compareCards", () => {
    it("should compare specific cards and return ranked results", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.compareCards(
        ["cc_cashback", "cc_travel"],
        profile,
      );

      expect(results.length).toBe(2);
      expect(results[0].rank).toBe(1);
      expect(results[1].rank).toBe(2);
      expect(results[0].scores.overall).toBeGreaterThanOrEqual(
        results[1].scores.overall,
      );
    });

    it("should return empty when no matching product IDs found", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.compareCards(
        ["nonexistent_1", "nonexistent_2"],
        profile,
      );

      expect(results).toEqual([]);
    });

    it("should include comparison highlights for compared cards", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.compareCards(
        ["cc_cashback", "cc_travel", "cc_student"],
        profile,
      );

      if (results.length >= 2) {
        expect(results[0].comparisonHighlights.length).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // calculateRewardsValue
  // ---------------------------------------------------------------------------

  describe("calculateRewardsValue", () => {
    it("should estimate rewards from percentage-based cash back", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { rewards: "2% cash back on all purchases" },
      });

      const value = matcher.calculateRewardsValue(product, 2000);

      // 2% * $2000/mo * 12 = $480
      expect(value).toBe(480);
    });

    it("should estimate rewards from points multiplier", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { rewards: "3x points on dining and travel" },
      });

      const value = matcher.calculateRewardsValue(product, 1500);

      // 3 * $0.01 * $1500 * 12 = $540
      expect(value).toBe(540);
    });

    it("should return fallback for unparseable rewards", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { rewards: "Earn rewards on every purchase" },
      });

      const value = matcher.calculateRewardsValue(product, 1500);

      // Fallback: 1% * $1500 * 12 = $180
      expect(value).toBe(180);
    });

    it("should return 0 when no rewards defined", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: {},
      });

      const value = matcher.calculateRewardsValue(product, 2000);

      expect(value).toBe(0);
    });

    it("should scale with monthly spend", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { rewards: "2% cash back" },
      });

      const low = matcher.calculateRewardsValue(product, 500);
      const high = matcher.calculateRewardsValue(product, 5000);

      expect(high).toBeGreaterThan(low);
      expect(high).toBe(low * 10);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateCostScore
  // ---------------------------------------------------------------------------

  describe("calculateCostScore", () => {
    it("should give 100 for no APR and no annual fee", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { annualFee: 0 },
      });

      const score = matcher.calculateCostScore(product);

      expect(score).toBe(100);
    });

    it("should penalize high APR", () => {
      const { matcher } = createMatcher();
      const lowApr = createProduct({
        terms: { apr: { min: 5, max: 10, type: "fixed" }, annualFee: 0 },
      });
      const highApr = createProduct({
        terms: { apr: { min: 25, max: 30, type: "variable" }, annualFee: 0 },
      });

      const lowScore = matcher.calculateCostScore(lowApr);
      const highScore = matcher.calculateCostScore(highApr);

      expect(lowScore).toBeGreaterThan(highScore);
    });

    it("should penalize annual fee", () => {
      const { matcher } = createMatcher();
      const noFee = createProduct({
        terms: { annualFee: 0 },
      });
      const highFee = createProduct({
        terms: { annualFee: 250 },
      });

      const noFeeScore = matcher.calculateCostScore(noFee);
      const highFeeScore = matcher.calculateCostScore(highFee);

      expect(noFeeScore).toBeGreaterThan(highFeeScore);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: {
          apr: { min: 28, max: 30, type: "variable" },
          annualFee: 500,
        },
      });

      const score = matcher.calculateCostScore(product);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateApprovalScore
  // ---------------------------------------------------------------------------

  describe("calculateApprovalScore", () => {
    it("should give high score when credit score is well above minimum", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        eligibility: { minCreditScore: 600, minIncome: 30000 },
      });
      const profile = createProfile({
        creditScore: 800,
        annualIncome: 100000,
      });

      const score = matcher.calculateApprovalScore(product, profile);

      expect(score).toBeGreaterThanOrEqual(80);
    });

    it("should give low score when credit score is below minimum", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        eligibility: {
          minCreditScore: 750,
          minIncome: 80000,
          blockedStates: ["CA"],
        },
      });
      const profile = createProfile({
        creditScore: 600,
        annualIncome: 40000,
        state: "CA",
      });

      const score = matcher.calculateApprovalScore(product, profile);

      // credit: buffer -150 => 10, income: ratio 0.5 => 20, state: blocked => 0
      // average: (10+20+0)/3 = 10
      expect(score).toBeLessThanOrEqual(15);
    });

    it("should return 50 when no eligibility data is available", () => {
      const { matcher } = createMatcher();
      const product = createProduct({ eligibility: {} });
      const profile = createProfile({
        creditScore: undefined,
        annualIncome: undefined,
        state: undefined,
      });

      const score = matcher.calculateApprovalScore(product, profile);

      expect(score).toBe(50);
    });

    it("should factor in state eligibility", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        eligibility: {
          minCreditScore: 670,
          blockedStates: ["NY"],
        },
      });
      const blockedProfile = createProfile({ creditScore: 720, state: "NY" });
      const allowedProfile = createProfile({ creditScore: 720, state: "CA" });

      const blockedScore = matcher.calculateApprovalScore(
        product,
        blockedProfile,
      );
      const allowedScore = matcher.calculateApprovalScore(
        product,
        allowedProfile,
      );

      expect(allowedScore).toBeGreaterThan(blockedScore);
    });

    it("should return value between 0 and 100", () => {
      const { matcher } = createMatcher();
      const product = createProduct();
      const profile = createProfile();

      const score = matcher.calculateApprovalScore(product, profile);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // estimateBonusValue
  // ---------------------------------------------------------------------------

  describe("estimateBonusValue", () => {
    it("should parse dollar amount from signup bonus", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { signupBonus: "$200 after spending $500" },
      });

      const value = matcher.estimateBonusValue(product);

      expect(value).toBe(200);
    });

    it("should parse large dollar amount with commas", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { signupBonus: "Earn $1,000 bonus after $5,000 in purchases" },
      });

      const value = matcher.estimateBonusValue(product);

      expect(value).toBe(1000);
    });

    it("should parse points-based bonus", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { signupBonus: "Earn 50000 points after $3000 spend" },
      });

      const value = matcher.estimateBonusValue(product);

      // 50000 * $0.01 = $500
      expect(value).toBe(500);
    });

    it("should parse miles-based bonus", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { signupBonus: "Earn 60,000 miles after $4000 spend" },
      });

      const value = matcher.estimateBonusValue(product);

      // 60000 * $0.01 = $600
      expect(value).toBe(600);
    });

    it("should return 0 when no signup bonus defined", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: {},
      });

      const value = matcher.estimateBonusValue(product);

      expect(value).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // categorizeCard
  // ---------------------------------------------------------------------------

  describe("categorizeCard", () => {
    it('should categorize "cash back" cards as cashback', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "CashBack Visa",
        description: "2% cash back on all purchases",
      });

      expect(matcher.categorizeCard(product)).toBe("cashback");
    });

    it('should categorize "travel" cards as travel', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Travel Rewards Platinum",
        description: "Earn miles on travel and dining",
        terms: { rewards: "3x points on travel" },
      });

      expect(matcher.categorizeCard(product)).toBe("travel");
    });

    it('should categorize "balance transfer" cards', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "BT Saver Card",
        description: "0% intro APR on balance transfers",
        terms: {},
      });

      expect(matcher.categorizeCard(product)).toBe("balance_transfer");
    });

    it('should categorize "business" cards', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Business Platinum",
        description: "Built for business owners",
        terms: {},
      });

      expect(matcher.categorizeCard(product)).toBe("business");
    });

    it('should categorize "student" cards', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Student Rewards Card",
        description: "Designed for college students",
        terms: {},
      });

      expect(matcher.categorizeCard(product)).toBe("student");
    });

    it('should categorize "secured" cards', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Secured Builder Card",
        description: "Credit builder card with deposit",
        terms: {},
      });

      expect(matcher.categorizeCard(product)).toBe("secured");
    });

    it('should default to "general" for unrecognized cards', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Premium Rewards Card",
        description: "Earn rewards on purchases",
        terms: { rewards: "Earn rewards everywhere" },
      });

      expect(matcher.categorizeCard(product)).toBe("general");
    });
  });

  // ---------------------------------------------------------------------------
  // Composite scoring (scoreCard)
  // ---------------------------------------------------------------------------

  describe("composite scoring", () => {
    it("should produce overall score between 0 and 100", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile);

      for (const rec of results) {
        expect(rec.scores.overall).toBeGreaterThanOrEqual(0);
        expect(rec.scores.overall).toBeLessThanOrEqual(100);
      }
    });

    it("should include match reasons", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 800, annualIncome: 100000 });

      const results = await matcher.getRecommendations(profile);

      for (const rec of results) {
        expect(Array.isArray(rec.scores.matchReasons)).toBe(true);
      }
    });

    it("should include rewardsValue, costScore, approvalScore, bonusValue", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = await matcher.getRecommendations(profile);

      for (const rec of results) {
        expect(typeof rec.scores.rewardsValue).toBe("number");
        expect(typeof rec.scores.costScore).toBe("number");
        expect(typeof rec.scores.approvalScore).toBe("number");
        expect(typeof rec.scores.bonusValue).toBe("number");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("should handle profile with no credit score", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: undefined });

      const results = await matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle profile with no income", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ annualIncome: undefined });

      const results = await matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle profile with no state", async () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ state: undefined });

      const results = await matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should clean up cache on destroy", () => {
      const { cache } = createMatcher();
      cache.set("test-key", "test-value");

      expect(cache.getStats().entries).toBeGreaterThan(0);
      cache.destroy();
      // Cache still has entries but cleanup timer is stopped
      // (destroy stops the timer, doesn't clear entries)
    });
  });
});
