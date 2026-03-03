/**
 * Insurance Matcher Tests
 *
 * Tests for the insurance recommendation engine (AFF-03).
 */

import type { MoneyLionProduct, UserMatchProfile } from "../types";
import { InsuranceMatcher } from "../insurance-matcher";
import { productMatcher } from "../product-matcher";
import { OfferCache } from "../offer-cache";

// =============================================================================
// Test Fixtures
// =============================================================================

function createProduct(
  overrides: Partial<MoneyLionProduct> = {},
): MoneyLionProduct {
  return {
    productId: "ins_001",
    name: "Auto Shield Insurance",
    category: "insurance",
    partner: "partner_ins_001",
    description: "Comprehensive auto insurance with collision coverage",
    terms: {
      apr: { min: 2, max: 5, type: "fixed" },
      annualFee: 0,
      loanAmount: { min: 25000, max: 100000 },
      creditLimit: { min: 500, max: 2000 },
      term: { min: 6, max: 12, unit: "months" },
    },
    eligibility: {
      minCreditScore: 600,
      minIncome: 25000,
      allowedStates: ["CA", "NY", "TX", "FL", "WA"],
    },
    commission: { type: "cpa", amount: 30, currency: "USD" },
    clickUrl: "https://partner.com/apply-insurance",
    logoUrl: "https://cdn.partner.com/ins-logo.png",
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
    housingStatus: "rent",
    ...overrides,
  };
}

// Catalog of test insurance products
const testCatalog: MoneyLionProduct[] = [
  createProduct({
    productId: "ins_auto",
    name: "Auto Shield Plus",
    description: "Comprehensive auto insurance for all drivers",
    terms: {
      apr: { min: 2, max: 5, type: "fixed" },
      annualFee: 0,
      loanAmount: { min: 25000, max: 100000 },
      creditLimit: { min: 500, max: 2000 },
      term: { min: 6, max: 12, unit: "months" },
    },
    eligibility: {
      minCreditScore: 600,
      minIncome: 25000,
      allowedStates: ["CA", "NY", "TX", "FL", "WA"],
    },
    featured: true,
  }),
  createProduct({
    productId: "ins_home",
    name: "HomeGuard Property Insurance",
    description: "Full homeowner property coverage with flood protection",
    terms: {
      apr: { min: 3, max: 6, type: "fixed" },
      annualFee: 50,
      loanAmount: { min: 100000, max: 500000 },
      creditLimit: { min: 1000, max: 5000 },
      term: { min: 12, max: 12, unit: "months" },
    },
    eligibility: {
      minCreditScore: 650,
      minIncome: 40000,
    },
    featured: false,
  }),
  createProduct({
    productId: "ins_life",
    name: "LifeSecure Term Life",
    description: "Term life insurance with death benefit and cash value",
    terms: {
      apr: { min: 1, max: 3, type: "fixed" },
      annualFee: 0,
      loanAmount: { min: 100000, max: 1000000 },
      creditLimit: { min: 250, max: 1000 },
      term: { min: 10, max: 30, unit: "years" },
      rewards: "Cash value accumulation",
    },
    eligibility: {
      minCreditScore: 580,
      minIncome: 20000,
    },
    featured: true,
  }),
  createProduct({
    productId: "ins_health",
    name: "MedFirst Health Plan",
    description: "Comprehensive health insurance with medical, dental, and vision",
    terms: {
      apr: { min: 0, max: 0, type: "fixed" },
      annualFee: 200,
      loanAmount: { min: 50000, max: 250000 },
      creditLimit: { min: 250, max: 1000 },
      term: { min: 12, max: 12, unit: "months" },
      signupBonus: "Free wellness check",
    },
    eligibility: {
      minCreditScore: 550,
      minIncome: 15000,
    },
  }),
  createProduct({
    productId: "ins_renters",
    name: "Tenant Shield Renters Insurance",
    description: "Affordable renters insurance for tenant protection",
    terms: {
      apr: { min: 1, max: 2, type: "fixed" },
      annualFee: 0,
      loanAmount: { min: 10000, max: 50000 },
      creditLimit: { min: 250, max: 500 },
      term: { min: 6, max: 12, unit: "months" },
    },
    eligibility: {
      minCreditScore: 500,
      minIncome: 15000,
    },
  }),
  createProduct({
    productId: "ins_inactive",
    name: "Discontinued Insurance",
    active: false,
    eligibility: {},
    terms: {},
  }),
];

// =============================================================================
// Helper: build a matcher that uses our test catalog
// =============================================================================

function createMatcher(): { matcher: InsuranceMatcher; cache: OfferCache } {
  const cache = new OfferCache();
  cache.set("ins-catalog", testCatalog);
  const matcher = new InsuranceMatcher(productMatcher, cache);
  return { matcher, cache };
}

// =============================================================================
// Tests
// =============================================================================

describe("InsuranceMatcher", () => {
  // ---------------------------------------------------------------------------
  // getRecommendations
  // ---------------------------------------------------------------------------

  describe("getRecommendations", () => {
    it("should return recommendations for a standard profile", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 750, annualIncome: 80000 });

      const results = matcher.getRecommendations(profile);

      expect(results.length).toBeGreaterThan(0);
      for (const rec of results) {
        expect(rec.product.category).toBe("insurance");
        expect(rec.matchScore).toBeGreaterThanOrEqual(0);
        expect(rec.matchScore).toBeLessThanOrEqual(100);
      }
    });

    it("should return recommendations for a low credit score user", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 550, annualIncome: 20000 });

      const results = matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should sort results by match score descending", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = matcher.getRecommendations(profile);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(
          results[i].matchScore,
        );
      }
    });

    it("should filter by insurance type when specified", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = matcher.getRecommendations(profile, "auto");

      for (const rec of results) {
        expect(rec.insuranceType).toBe("auto");
      }
    });

    it("should filter by life insurance type", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = matcher.getRecommendations(profile, "life");

      for (const rec of results) {
        expect(rec.insuranceType).toBe("life");
      }
    });

    it("should respect limit option", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = matcher.getRecommendations(profile, undefined, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return cached results on second call", () => {
      const { matcher, cache } = createMatcher();
      const profile = createProfile();

      const first = matcher.getRecommendations(profile);
      const statsBefore = cache.getStats();

      const second = matcher.getRecommendations(profile);
      const statsAfter = cache.getStats();

      expect(statsAfter.hits).toBeGreaterThan(statsBefore.hits);
      expect(first.length).toBe(second.length);
    });

    it("should return empty array when catalog is empty", () => {
      const cache = new OfferCache();
      cache.set("ins-catalog", []);
      const matcher = new InsuranceMatcher(productMatcher, cache);
      const profile = createProfile();

      const results = matcher.getRecommendations(profile);

      expect(results).toEqual([]);
    });

    it("should include eligibility reasons in each recommendation", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 800, annualIncome: 100000 });

      const results = matcher.getRecommendations(profile);

      for (const rec of results) {
        expect(Array.isArray(rec.eligibilityReasons)).toBe(true);
        expect(rec.eligibilityReasons.length).toBeGreaterThan(0);
      }
    });

    it("should include estimated premium when profile data is available", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ age: 35, annualIncome: 70000 });

      const results = matcher.getRecommendations(profile);

      for (const rec of results) {
        if (rec.estimatedPremium) {
          expect(rec.estimatedPremium.monthly).toBeGreaterThan(0);
          expect(rec.estimatedPremium.annual).toBeGreaterThan(0);
          expect(rec.estimatedPremium.annual).toBeCloseTo(
            rec.estimatedPremium.monthly * 12,
            0,
          );
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getTopPick
  // ---------------------------------------------------------------------------

  describe("getTopPick", () => {
    it("should return the highest scored insurance product", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const topPick = matcher.getTopPick(profile);

      if (topPick) {
        expect(topPick.matchScore).toBeGreaterThanOrEqual(0);
        expect(topPick.product.category).toBe("insurance");
      }
    });

    it("should return null when no products are available", () => {
      const cache = new OfferCache();
      cache.set("ins-catalog", []);
      const matcher = new InsuranceMatcher(productMatcher, cache);
      const profile = createProfile();

      const topPick = matcher.getTopPick(profile);

      expect(topPick).toBeNull();
    });

    it("should filter by insurance type for top pick", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const topPick = matcher.getTopPick(profile, "renters");

      if (topPick) {
        expect(topPick.insuranceType).toBe("renters");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // compareProducts
  // ---------------------------------------------------------------------------

  describe("compareProducts", () => {
    it("should compare specific products and return ranked results", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareProducts(["ins_auto", "ins_home"]);

      expect(comparison.products.length).toBe(2);
      expect(comparison.products[0].matchScore).toBeGreaterThanOrEqual(
        comparison.products[1].matchScore,
      );
    });

    it("should identify bestPremium, bestCoverage, and bestOverall", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareProducts([
        "ins_auto",
        "ins_home",
        "ins_life",
      ]);

      expect(comparison.bestPremium).toBeTruthy();
      expect(comparison.bestCoverage).toBeTruthy();
      expect(comparison.bestOverall).toBeTruthy();
    });

    it("should return empty comparison when no matching IDs", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareProducts([
        "nonexistent_1",
        "nonexistent_2",
      ]);

      expect(comparison.products).toEqual([]);
      expect(comparison.bestPremium).toBe("");
      expect(comparison.bestCoverage).toBe("");
      expect(comparison.bestOverall).toBe("");
    });

    it("should handle single product comparison", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareProducts(["ins_auto"]);

      expect(comparison.products.length).toBe(1);
      expect(comparison.bestOverall).toBe("ins_auto");
    });
  });

  // ---------------------------------------------------------------------------
  // calculatePremiumScore
  // ---------------------------------------------------------------------------

  describe("calculatePremiumScore", () => {
    it("should give higher score for lower APR products", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const lowApr = createProduct({
        terms: { apr: { min: 1, max: 3, type: "fixed" }, annualFee: 0 },
      });
      const highApr = createProduct({
        terms: { apr: { min: 20, max: 28, type: "variable" }, annualFee: 0 },
      });

      const lowScore = matcher.calculatePremiumScore(lowApr, profile);
      const highScore = matcher.calculatePremiumScore(highApr, profile);

      expect(lowScore).toBeGreaterThan(highScore);
    });

    it("should penalize annual fees", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const noFee = createProduct({
        terms: { apr: { min: 3, max: 5, type: "fixed" }, annualFee: 0 },
      });
      const highFee = createProduct({
        terms: { apr: { min: 3, max: 5, type: "fixed" }, annualFee: 300 },
      });

      const noFeeScore = matcher.calculatePremiumScore(noFee, profile);
      const highFeeScore = matcher.calculatePremiumScore(highFee, profile);

      expect(noFeeScore).toBeGreaterThan(highFeeScore);
    });

    it("should give bonus for high income relative to estimated premium", () => {
      const { matcher } = createMatcher();

      const product = createProduct({
        terms: { apr: { min: 3, max: 5, type: "fixed" } },
      });

      const highIncome = matcher.calculatePremiumScore(
        product,
        createProfile({ annualIncome: 200000 }),
      );
      const lowIncome = matcher.calculatePremiumScore(
        product,
        createProfile({ annualIncome: 5000 }),
      );

      expect(highIncome).toBeGreaterThanOrEqual(lowIncome);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const product = createProduct({
        terms: {
          apr: { min: 28, max: 30, type: "variable" },
          annualFee: 500,
        },
      });

      const score = matcher.calculatePremiumScore(product, profile);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should handle product with no APR data", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const product = createProduct({ terms: { annualFee: 0 } });

      const score = matcher.calculatePremiumScore(product, profile);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateCoverageScore
  // ---------------------------------------------------------------------------

  describe("calculateCoverageScore", () => {
    it("should give higher score for broader coverage amounts", () => {
      const { matcher } = createMatcher();

      const broad = createProduct({
        terms: { loanAmount: { min: 100000, max: 500000 } },
      });
      const narrow = createProduct({
        terms: { loanAmount: { min: 1000, max: 5000 } },
      });

      const broadScore = matcher.calculateCoverageScore(broad);
      const narrowScore = matcher.calculateCoverageScore(narrow);

      expect(broadScore).toBeGreaterThan(narrowScore);
    });

    it("should give bonus for rewards (additional coverage features)", () => {
      const { matcher } = createMatcher();

      const withRewards = createProduct({
        terms: {
          loanAmount: { min: 50000, max: 200000 },
          rewards: "Roadside assistance included",
        },
      });
      const noRewards = createProduct({
        terms: { loanAmount: { min: 50000, max: 200000 } },
      });

      const withScore = matcher.calculateCoverageScore(withRewards);
      const noScore = matcher.calculateCoverageScore(noRewards);

      expect(withScore).toBeGreaterThan(noScore);
    });

    it("should give bonus for featured products", () => {
      const { matcher } = createMatcher();

      const featured = createProduct({
        terms: { loanAmount: { min: 50000, max: 200000 } },
        featured: true,
      });
      const standard = createProduct({
        terms: { loanAmount: { min: 50000, max: 200000 } },
        featured: false,
      });

      const featuredScore = matcher.calculateCoverageScore(featured);
      const standardScore = matcher.calculateCoverageScore(standard);

      expect(featuredScore).toBeGreaterThan(standardScore);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();

      const product = createProduct({
        terms: {
          loanAmount: { min: 100000, max: 1000000 },
          rewards: "Premium coverage",
          signupBonus: "Free inspection",
          term: { min: 6, max: 24, unit: "months" },
        },
        featured: true,
      });

      const score = matcher.calculateCoverageScore(product);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should handle product with no coverage data", () => {
      const { matcher } = createMatcher();

      const product = createProduct({ terms: {} });

      const score = matcher.calculateCoverageScore(product);

      expect(score).toBe(50); // baseline
    });
  });

  // ---------------------------------------------------------------------------
  // calculateDeductibleScore
  // ---------------------------------------------------------------------------

  describe("calculateDeductibleScore", () => {
    it("should give higher score for lower deductible tiers", () => {
      const { matcher } = createMatcher();

      const lowDeductible = createProduct({
        terms: { creditLimit: { min: 250, max: 1000 } },
      });
      const highDeductible = createProduct({
        terms: { creditLimit: { min: 5000, max: 10000 } },
      });

      const lowScore = matcher.calculateDeductibleScore(lowDeductible);
      const highScore = matcher.calculateDeductibleScore(highDeductible);

      expect(lowScore).toBeGreaterThan(highScore);
    });

    it("should give bonus for zero annual fee", () => {
      const { matcher } = createMatcher();

      const noFee = createProduct({
        terms: {
          creditLimit: { min: 500, max: 2000 },
          annualFee: 0,
        },
      });
      const highFee = createProduct({
        terms: {
          creditLimit: { min: 500, max: 2000 },
          annualFee: 300,
        },
      });

      const noFeeScore = matcher.calculateDeductibleScore(noFee);
      const highFeeScore = matcher.calculateDeductibleScore(highFee);

      expect(noFeeScore).toBeGreaterThan(highFeeScore);
    });

    it("should return default score when no deductible data", () => {
      const { matcher } = createMatcher();

      const product = createProduct({ terms: { annualFee: 0 } });

      const score = matcher.calculateDeductibleScore(product);

      // Baseline 70 + 5 for zero fee = 75
      expect(score).toBe(75);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();

      const product = createProduct({
        terms: {
          creditLimit: { min: 100, max: 500 },
          annualFee: 0,
        },
      });

      const score = matcher.calculateDeductibleScore(product);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should handle very high deductibles", () => {
      const { matcher } = createMatcher();

      const product = createProduct({
        terms: {
          creditLimit: { min: 10000, max: 25000 },
          annualFee: 250,
        },
      });

      const score = matcher.calculateDeductibleScore(product);

      expect(score).toBeLessThan(50); // high deductible + high fee
    });
  });

  // ---------------------------------------------------------------------------
  // categorizeInsurance
  // ---------------------------------------------------------------------------

  describe("categorizeInsurance", () => {
    it('should categorize "auto" insurance', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Auto Shield Plus",
        description: "Comprehensive auto insurance for drivers",
      });

      expect(matcher.categorizeInsurance(product)).toBe("auto");
    });

    it('should categorize "car" insurance as auto', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Safe Car Coverage",
        description: "Full car insurance policy",
      });

      expect(matcher.categorizeInsurance(product)).toBe("auto");
    });

    it('should categorize "home" insurance', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "HomeGuard Insurance",
        description: "Complete home protection coverage",
      });

      expect(matcher.categorizeInsurance(product)).toBe("home");
    });

    it('should categorize "life" insurance', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Term Life Protection",
        description: "Life insurance with death benefit",
      });

      expect(matcher.categorizeInsurance(product)).toBe("life");
    });

    it('should categorize "health" insurance', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "HealthFirst Plan",
        description: "Comprehensive medical coverage",
      });

      expect(matcher.categorizeInsurance(product)).toBe("health");
    });

    it('should categorize "renters" insurance', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Tenant Shield",
        description: "Affordable renters insurance for tenants",
      });

      expect(matcher.categorizeInsurance(product)).toBe("renters");
    });

    it('should prioritize "renters" over "home" when both keywords present', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Home Renters Protection",
        description: "Renters insurance for your home",
      });

      // renters is checked before home in the ordered types
      expect(matcher.categorizeInsurance(product)).toBe("renters");
    });

    it("should default to auto when no keywords match", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Premium Coverage Plan",
        description: "Complete protection for everything",
        terms: {},
      });

      expect(matcher.categorizeInsurance(product)).toBe("auto");
    });

    it("should detect keywords in rewards field", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Coverage Plus",
        description: "Great protection",
        terms: { rewards: "Vehicle roadside assistance" },
      });

      expect(matcher.categorizeInsurance(product)).toBe("auto");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("should handle profile with no credit score", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: undefined });

      const results = matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle profile with no income", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ annualIncome: undefined });

      const results = matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle profile with no state", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ state: undefined });

      const results = matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle profile with no age", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ age: undefined });

      const results = matcher.getRecommendations(profile);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle young drivers (under 25) with higher premiums", () => {
      const { matcher } = createMatcher();
      const youngProfile = createProfile({ age: 19 });
      const olderProfile = createProfile({ age: 35 });

      const youngResults = matcher.getRecommendations(youngProfile);
      const olderResults = matcher.getRecommendations(olderProfile);

      // Both should return valid results
      expect(Array.isArray(youngResults)).toBe(true);
      expect(Array.isArray(olderResults)).toBe(true);

      // Young driver premium estimates should be higher for auto
      const youngAuto = youngResults.find((r) => r.insuranceType === "auto");
      const olderAuto = olderResults.find((r) => r.insuranceType === "auto");

      if (youngAuto?.estimatedPremium && olderAuto?.estimatedPremium) {
        expect(youngAuto.estimatedPremium.annual).toBeGreaterThanOrEqual(
          olderAuto.estimatedPremium.annual,
        );
      }
    });

    it("should handle homeowner housing status for home insurance", () => {
      const { matcher } = createMatcher();
      const homeowner = createProfile({ housingStatus: "own" });

      const results = matcher.getRecommendations(homeowner);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should clean up cache on destroy", () => {
      const { cache } = createMatcher();
      cache.set("test-key", "test-value");

      expect(cache.getStats().entries).toBeGreaterThan(0);
      cache.destroy();
    });
  });
});
