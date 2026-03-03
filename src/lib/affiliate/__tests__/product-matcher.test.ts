/**
 * Product Matcher Tests
 */

import { productMatcher } from "../product-matcher";
import type {
  MoneyLionProduct,
  UserMatchProfile,
  MoneyLionProductCategory,
} from "../types";

// =============================================================================
// Test Fixtures
// =============================================================================

function createProduct(
  overrides: Partial<MoneyLionProduct> = {},
): MoneyLionProduct {
  return {
    productId: "prod_001",
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

const products: MoneyLionProduct[] = [
  createProduct({
    productId: "prod_001",
    name: "CashBack Visa",
    category: "credit_card",
    featured: true,
    eligibility: {
      minCreditScore: 670,
      minIncome: 30000,
      allowedStates: ["CA", "NY", "TX"],
    },
  }),
  createProduct({
    productId: "prod_002",
    name: "Secured Builder Card",
    category: "credit_card",
    eligibility: {
      minCreditScore: 300,
      minIncome: 15000,
    },
    terms: {
      apr: { min: 22.99, max: 28.99, type: "variable" },
      annualFee: 39,
    },
  }),
  createProduct({
    productId: "prod_003",
    name: "Personal Loan",
    category: "personal_loan",
    eligibility: {
      minCreditScore: 640,
      minIncome: 25000,
      blockedStates: ["NY"],
    },
    terms: {
      loanAmount: { min: 1000, max: 50000 },
      term: { min: 12, max: 60, unit: "months" },
      apr: { min: 6.99, max: 19.99, type: "fixed" },
    },
  }),
  createProduct({
    productId: "prod_004",
    name: "Premium Rewards Card",
    category: "credit_card",
    featured: true,
    eligibility: {
      minCreditScore: 750,
      minIncome: 75000,
      allowedStates: ["CA", "NY"],
    },
    terms: {
      apr: { min: 17.99, max: 26.99, type: "variable" },
      annualFee: 95,
      rewards: "3x points on dining and travel",
      signupBonus: "$500 after spending $3000",
    },
  }),
  createProduct({
    productId: "prod_005",
    name: "Inactive Product",
    category: "savings",
    active: false,
    eligibility: {},
    terms: {},
  }),
];

// =============================================================================
// Tests
// =============================================================================

describe("ProductMatcher", () => {
  // ===========================================================================
  // matchProducts
  // ===========================================================================

  describe("matchProducts", () => {
    it("should return matched products sorted by score descending", () => {
      const profile = createProfile();
      const results = productMatcher.matchProducts(products, profile);

      expect(results.length).toBeGreaterThan(0);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(
          results[i].matchScore,
        );
      }
    });

    it("should exclude inactive products", () => {
      const profile = createProfile();
      const results = productMatcher.matchProducts(products, profile, {
        includeIneligible: true,
      });

      const inactiveFound = results.find(
        (r) => r.product.productId === "prod_005",
      );
      expect(inactiveFound).toBeUndefined();
    });

    it("should filter by category", () => {
      const profile = createProfile();
      const results = productMatcher.matchProducts(products, profile, {
        categories: ["personal_loan"],
        includeIneligible: true,
      });

      expect(results.every((r) => r.product.category === "personal_loan")).toBe(
        true,
      );
    });

    it("should filter by multiple categories", () => {
      const profile = createProfile();
      const categories: MoneyLionProductCategory[] = [
        "credit_card",
        "personal_loan",
      ];
      const results = productMatcher.matchProducts(products, profile, {
        categories,
        includeIneligible: true,
      });

      expect(
        results.every((r) => categories.includes(r.product.category)),
      ).toBe(true);
    });

    it("should respect limit option", () => {
      const profile = createProfile();
      const results = productMatcher.matchProducts(products, profile, {
        limit: 2,
        includeIneligible: true,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should filter by minScore", () => {
      const profile = createProfile();
      const results = productMatcher.matchProducts(products, profile, {
        minScore: 60,
        includeIneligible: true,
      });

      expect(results.every((r) => r.matchScore >= 60)).toBe(true);
    });

    it("should exclude ineligible by default", () => {
      const profile = createProfile({ creditScore: 500, annualIncome: 10000 });
      const results = productMatcher.matchProducts(products, profile);

      expect(results.every((r) => r.eligible)).toBe(true);
    });

    it("should include ineligible when option is set", () => {
      const profile = createProfile({ creditScore: 200 });
      const results = productMatcher.matchProducts(products, profile, {
        includeIneligible: true,
      });

      const hasIneligible = results.some((r) => !r.eligible);
      expect(hasIneligible).toBe(true);
    });

    it("should return empty array when no products match", () => {
      const profile = createProfile();
      const results = productMatcher.matchProducts(products, profile, {
        categories: ["insurance"],
      });

      expect(results).toEqual([]);
    });
  });

  // ===========================================================================
  // scoreProduct
  // ===========================================================================

  describe("scoreProduct", () => {
    it("should return score between 0 and 100", () => {
      const profile = createProfile();
      const product = createProduct();
      const score = productMatcher.scoreProduct(product, profile);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should give higher score to perfect match", () => {
      const profile = createProfile({
        creditScore: 800,
        annualIncome: 100000,
        state: "CA",
        preferences: { categories: ["credit_card"] },
      });
      const product = createProduct({
        featured: true,
        eligibility: {
          minCreditScore: 670,
          minIncome: 30000,
          allowedStates: ["CA"],
        },
      });

      const score = productMatcher.scoreProduct(product, profile);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it("should give lower score to partial match", () => {
      const profile = createProfile({
        creditScore: 680,
        annualIncome: 31000,
        state: "CA",
      });
      const product = createProduct({
        eligibility: {
          minCreditScore: 670,
          minIncome: 30000,
          allowedStates: ["CA"],
        },
      });

      const score = productMatcher.scoreProduct(product, profile);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    it("should give zero for fully ineligible user", () => {
      const profile = createProfile({
        creditScore: 300,
        annualIncome: 10000,
        state: "ZZ",
      });
      const product = createProduct({
        eligibility: {
          minCreditScore: 750,
          minIncome: 100000,
          allowedStates: ["CA"],
        },
      });

      const score = productMatcher.scoreProduct(product, profile);
      expect(score).toBe(0);
    });

    it("should add category preference bonus", () => {
      const profile = createProfile({
        preferences: { categories: ["credit_card"] },
      });
      const profileNoPrefs = createProfile();

      const product = createProduct({ category: "credit_card" });

      const scoreWithPref = productMatcher.scoreProduct(product, profile);
      const scoreWithoutPref = productMatcher.scoreProduct(
        product,
        profileNoPrefs,
      );

      expect(scoreWithPref).toBeGreaterThan(scoreWithoutPref);
    });

    it("should add featured product bonus", () => {
      const profile = createProfile();
      const featuredProduct = createProduct({ featured: true });
      const normalProduct = createProduct({ featured: false });

      const featuredScore = productMatcher.scoreProduct(
        featuredProduct,
        profile,
      );
      const normalScore = productMatcher.scoreProduct(normalProduct, profile);

      expect(featuredScore).toBeGreaterThan(normalScore);
    });

    it("should give half credit when profile data is missing", () => {
      const profile = createProfile({
        creditScore: undefined,
        annualIncome: undefined,
        state: undefined,
      });
      const product = createProduct();

      const score = productMatcher.scoreProduct(product, profile);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });

  // ===========================================================================
  // Credit Score Scoring
  // ===========================================================================

  describe("credit score scoring", () => {
    const product = createProduct({
      eligibility: { minCreditScore: 670 },
    });

    it("should give max credit score points when well above minimum", () => {
      const highProfile = createProfile({ creditScore: 800 });
      const lowProfile = createProfile({ creditScore: 680 });

      const highScore = productMatcher.scoreProduct(product, highProfile);
      const lowScore = productMatcher.scoreProduct(product, lowProfile);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it("should give some points when just at minimum", () => {
      const profile = createProfile({ creditScore: 670 });
      const score = productMatcher.scoreProduct(product, profile);
      expect(score).toBeGreaterThan(0);
    });

    it("should give zero credit points when below minimum", () => {
      const profile = createProfile({ creditScore: 500 });
      const aboveProfile = createProfile({ creditScore: 750 });

      const belowScore = productMatcher.scoreProduct(product, profile);
      const aboveScore = productMatcher.scoreProduct(product, aboveProfile);

      expect(belowScore).toBeLessThan(aboveScore);
    });
  });

  // ===========================================================================
  // Income Scoring
  // ===========================================================================

  describe("income scoring", () => {
    const product = createProduct({
      eligibility: { minIncome: 50000 },
    });

    it("should give max income points when income is 2x minimum", () => {
      const richProfile = createProfile({ annualIncome: 100000 });
      const barelyProfile = createProfile({ annualIncome: 50000 });

      const richScore = productMatcher.scoreProduct(product, richProfile);
      const barelyScore = productMatcher.scoreProduct(product, barelyProfile);

      expect(richScore).toBeGreaterThan(barelyScore);
    });

    it("should give zero income points when below minimum", () => {
      const profile = createProfile({ annualIncome: 30000 });
      const aboveProfile = createProfile({ annualIncome: 100000 });

      const belowScore = productMatcher.scoreProduct(product, profile);
      const aboveScore = productMatcher.scoreProduct(product, aboveProfile);

      expect(belowScore).toBeLessThan(aboveScore);
    });
  });

  // ===========================================================================
  // checkEligibility
  // ===========================================================================

  describe("checkEligibility", () => {
    it("should return eligible when all criteria met", () => {
      const product = createProduct({
        eligibility: {
          minCreditScore: 670,
          minIncome: 30000,
          allowedStates: ["CA"],
          minAge: 18,
        },
      });
      const profile = createProfile({
        creditScore: 720,
        annualIncome: 65000,
        state: "CA",
        age: 30,
      });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(true);
      expect(result.reasons).toContain(
        "You meet all eligibility requirements",
      );
    });

    it("should return ineligible when credit score too low", () => {
      const product = createProduct({
        eligibility: { minCreditScore: 750 },
      });
      const profile = createProfile({ creditScore: 650 });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("credit score"))).toBe(
        true,
      );
    });

    it("should return ineligible when credit score too high", () => {
      const product = createProduct({
        eligibility: { maxCreditScore: 700 },
      });
      const profile = createProfile({ creditScore: 750 });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("Maximum credit score"))).toBe(true);
    });

    it("should return ineligible when income too low", () => {
      const product = createProduct({
        eligibility: { minIncome: 100000 },
      });
      const profile = createProfile({ annualIncome: 50000 });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("income"))).toBe(true);
    });

    it("should return ineligible when in blocked state", () => {
      const product = createProduct({
        eligibility: { blockedStates: ["NY"] },
      });
      const profile = createProfile({ state: "NY" });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("NY"))).toBe(true);
    });

    it("should return ineligible when not in allowed states", () => {
      const product = createProduct({
        eligibility: { allowedStates: ["CA", "NY"] },
      });
      const profile = createProfile({ state: "TX" });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("TX"))).toBe(true);
    });

    it("should return ineligible when below minimum age", () => {
      const product = createProduct({
        eligibility: { minAge: 21 },
      });
      const profile = createProfile({ age: 18 });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("age"))).toBe(true);
    });

    it("should return eligible when no eligibility criteria defined", () => {
      const product = createProduct({ eligibility: {} });
      const profile = createProfile();

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(true);
    });

    it("should return eligible when profile data is missing but criteria exist", () => {
      const product = createProduct({
        eligibility: { minCreditScore: 670 },
      });
      const profile = createProfile({ creditScore: undefined });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(true);
    });

    it("should collect multiple ineligibility reasons", () => {
      const product = createProduct({
        eligibility: {
          minCreditScore: 750,
          minIncome: 100000,
          blockedStates: ["NY"],
        },
      });
      const profile = createProfile({
        creditScore: 600,
        annualIncome: 30000,
        state: "NY",
      });

      const result = productMatcher.checkEligibility(product, profile);
      expect(result.eligible).toBe(false);
      expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ===========================================================================
  // generateHighlights
  // ===========================================================================

  describe("generateHighlights", () => {
    it("should include APR highlight for low APR", () => {
      const product = createProduct({
        terms: { apr: { min: 5.99, max: 19.99, type: "fixed" } },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("APR"))).toBe(true);
    });

    it("should include 0% intro APR highlight", () => {
      const product = createProduct({
        terms: { apr: { min: 0, max: 24.99, type: "variable" } },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("0%"))).toBe(true);
    });

    it("should include no annual fee highlight", () => {
      const product = createProduct({
        terms: { annualFee: 0 },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("No annual fee"))).toBe(true);
    });

    it("should include rewards highlight", () => {
      const product = createProduct({
        terms: { rewards: "3x points on dining" },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("3x points"))).toBe(true);
    });

    it("should include signup bonus highlight", () => {
      const product = createProduct({
        terms: { signupBonus: "$500 welcome bonus" },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("$500"))).toBe(true);
    });

    it("should include loan amount highlight", () => {
      const product = createProduct({
        terms: { loanAmount: { min: 1000, max: 50000 } },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("50,000"))).toBe(true);
    });

    it("should include term highlight", () => {
      const product = createProduct({
        terms: { term: { min: 12, max: 60, unit: "months" } },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("months"))).toBe(true);
    });

    it("should include featured highlight", () => {
      const product = createProduct({ featured: true, terms: {} });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.some((h) => h.includes("Featured"))).toBe(true);
    });

    it("should limit to 5 highlights", () => {
      const product = createProduct({
        featured: true,
        terms: {
          apr: { min: 5.99, max: 19.99, type: "fixed" },
          annualFee: 0,
          rewards: "3x points",
          signupBonus: "$500 bonus",
          loanAmount: { min: 1000, max: 50000 },
          creditLimit: { min: 500, max: 25000 },
          term: { min: 6, max: 72, unit: "months" },
        },
      });
      const profile = createProfile();

      const highlights = productMatcher.generateHighlights(product, profile);
      expect(highlights.length).toBeLessThanOrEqual(5);
    });
  });

  // ===========================================================================
  // estimateApprovalOdds
  // ===========================================================================

  describe("estimateApprovalOdds", () => {
    it('should return "high" for strong profile', () => {
      const product = createProduct({
        eligibility: {
          minCreditScore: 670,
          minIncome: 30000,
          allowedStates: ["CA"],
        },
      });
      const profile = createProfile({
        creditScore: 800,
        annualIncome: 100000,
        state: "CA",
      });

      const odds = productMatcher.estimateApprovalOdds(product, profile);
      expect(odds).toBe("high");
    });

    it('should return "medium" for borderline profile', () => {
      const product = createProduct({
        eligibility: {
          minCreditScore: 700,
          minIncome: 50000,
        },
      });
      const profile = createProfile({
        creditScore: 720,
        annualIncome: 55000,
      });

      const odds = productMatcher.estimateApprovalOdds(product, profile);
      expect(odds).toBe("medium");
    });

    it('should return "low" for weak profile', () => {
      const product = createProduct({
        eligibility: {
          minCreditScore: 750,
          minIncome: 100000,
        },
      });
      const profile = createProfile({
        creditScore: 600,
        annualIncome: 30000,
      });

      const odds = productMatcher.estimateApprovalOdds(product, profile);
      expect(odds).toBe("low");
    });

    it('should return "medium" when no eligibility criteria defined', () => {
      const product = createProduct({ eligibility: {} });
      const profile = createProfile({ creditScore: undefined, annualIncome: undefined, state: undefined });

      const odds = productMatcher.estimateApprovalOdds(product, profile);
      expect(odds).toBe("medium");
    });
  });

  // ===========================================================================
  // Sorting
  // ===========================================================================

  describe("sorting", () => {
    it("should sort results by matchScore descending", () => {
      const profile = createProfile({ creditScore: 720, annualIncome: 65000 });
      const results = productMatcher.matchProducts(products, profile, {
        includeIneligible: true,
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(
          results[i].matchScore,
        );
      }
    });
  });
});
