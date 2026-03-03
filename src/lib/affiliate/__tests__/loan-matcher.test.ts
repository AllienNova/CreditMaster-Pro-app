/**
 * Loan Matcher Tests
 *
 * Tests for the loan recommendation engine (AFF-03).
 */

import type { MoneyLionProduct, UserMatchProfile } from "../types";
import { LoanMatcher } from "../loan-matcher";
import { productMatcher } from "../product-matcher";
import { OfferCache } from "../offer-cache";

// =============================================================================
// Test Fixtures
// =============================================================================

function createProduct(
  overrides: Partial<MoneyLionProduct> = {},
): MoneyLionProduct {
  return {
    productId: "loan_001",
    name: "Personal Quick Loan",
    category: "personal_loan",
    partner: "partner_loan_001",
    description: "Fast personal unsecured loan with flexible terms",
    terms: {
      apr: { min: 5.99, max: 15.99, type: "variable" },
      annualFee: 0,
      loanAmount: { min: 1000, max: 50000 },
      term: { min: 12, max: 60, unit: "months" },
    },
    eligibility: {
      minCreditScore: 640,
      minIncome: 25000,
      allowedStates: ["CA", "NY", "TX", "FL", "WA"],
    },
    commission: { type: "cpa", amount: 75, currency: "USD" },
    clickUrl: "https://partner.com/apply-loan",
    logoUrl: "https://cdn.partner.com/loan-logo.png",
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

// Catalog of test loan products
const testCatalog: MoneyLionProduct[] = [
  createProduct({
    productId: "loan_personal",
    name: "Personal Quick Loan",
    category: "personal_loan",
    description: "Fast personal unsecured loan with flexible terms",
    terms: {
      apr: { min: 5.99, max: 15.99, type: "variable" },
      annualFee: 0,
      loanAmount: { min: 1000, max: 50000 },
      term: { min: 12, max: 60, unit: "months" },
    },
    eligibility: {
      minCreditScore: 640,
      minIncome: 25000,
      allowedStates: ["CA", "NY", "TX", "FL", "WA"],
    },
    featured: true,
  }),
  createProduct({
    productId: "loan_auto",
    name: "AutoDrive Car Loan",
    category: "auto_loan",
    description: "Competitive auto vehicle financing with low rates",
    terms: {
      apr: { min: 3.49, max: 8.99, type: "fixed" },
      annualFee: 0,
      loanAmount: { min: 5000, max: 75000 },
      term: { min: 24, max: 72, unit: "months" },
    },
    eligibility: {
      minCreditScore: 650,
      minIncome: 30000,
    },
    featured: true,
  }),
  createProduct({
    productId: "loan_student",
    name: "EduFund Student Loan",
    category: "student_loan",
    description: "Student education loan for tuition and expenses",
    terms: {
      apr: { min: 4.49, max: 12.99, type: "variable" },
      annualFee: 0,
      loanAmount: { min: 2000, max: 100000 },
      term: { min: 60, max: 180, unit: "months" },
      signupBonus: "0.25% rate reduction with autopay",
    },
    eligibility: {
      minCreditScore: 600,
      minIncome: 15000,
    },
  }),
  createProduct({
    productId: "loan_mortgage",
    name: "Dream Home Mortgage",
    category: "mortgage",
    description: "Home loan with competitive mortgage rates",
    terms: {
      apr: { min: 3.25, max: 6.5, type: "fixed" },
      annualFee: 0,
      loanAmount: { min: 50000, max: 750000 },
      term: { min: 15, max: 30, unit: "years" },
    },
    eligibility: {
      minCreditScore: 680,
      minIncome: 50000,
    },
    featured: true,
  }),
  createProduct({
    productId: "loan_heloc",
    name: "FlexEquity HELOC",
    category: "personal_loan",
    description: "Home equity line of credit for homeowners",
    terms: {
      apr: { min: 4.99, max: 10.99, type: "variable" },
      annualFee: 50,
      loanAmount: { min: 10000, max: 250000 },
      term: { min: 60, max: 240, unit: "months" },
    },
    eligibility: {
      minCreditScore: 700,
      minIncome: 60000,
    },
  }),
  createProduct({
    productId: "loan_highrate",
    name: "QuickCash Advance",
    category: "personal_loan",
    description: "Fast cash advance loan for emergencies",
    terms: {
      apr: { min: 24.99, max: 35.99, type: "variable" },
      annualFee: 99,
      loanAmount: { min: 500, max: 5000 },
      term: { min: 3, max: 12, unit: "months" },
    },
    eligibility: {
      minCreditScore: 500,
      minIncome: 15000,
    },
  }),
  createProduct({
    productId: "loan_zero",
    name: "ZeroRate Promo Loan",
    category: "personal_loan",
    description: "Special personal promotional loan offer",
    terms: {
      apr: { min: 0, max: 0, type: "fixed" },
      annualFee: 0,
      loanAmount: { min: 1000, max: 10000 },
      term: { min: 6, max: 24, unit: "months" },
    },
    eligibility: {
      minCreditScore: 720,
      minIncome: 40000,
    },
  }),
  createProduct({
    productId: "loan_inactive",
    name: "Discontinued Loan",
    category: "personal_loan",
    active: false,
    eligibility: {},
    terms: {},
  }),
];

// =============================================================================
// Helper: build a matcher that uses our test catalog
// =============================================================================

function createMatcher(): { matcher: LoanMatcher; cache: OfferCache } {
  const cache = new OfferCache();
  cache.set("loan-catalog", testCatalog);
  const matcher = new LoanMatcher(productMatcher, cache);
  return { matcher, cache };
}

// =============================================================================
// Tests
// =============================================================================

describe("LoanMatcher", () => {
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

    it("should filter by loan type when specified", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = matcher.getRecommendations(profile, "auto");

      for (const rec of results) {
        expect(rec.loanType).toBe("auto");
      }
    });

    it("should filter by mortgage loan type", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const results = matcher.getRecommendations(profile, "mortgage");

      for (const rec of results) {
        expect(rec.loanType).toBe("mortgage");
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
      cache.set("loan-catalog", []);
      const matcher = new LoanMatcher(productMatcher, cache);
      const profile = createProfile();

      const results = matcher.getRecommendations(profile);

      expect(results).toEqual([]);
    });

    it("should include eligibility reasons", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ creditScore: 800, annualIncome: 100000 });

      const results = matcher.getRecommendations(profile);

      for (const rec of results) {
        expect(Array.isArray(rec.eligibilityReasons)).toBe(true);
        expect(rec.eligibilityReasons.length).toBeGreaterThan(0);
      }
    });

    it("should include estimated monthly payment when product has full terms", () => {
      const { matcher } = createMatcher();
      const profile = createProfile({ annualIncome: 65000 });

      const results = matcher.getRecommendations(profile);

      const withPayment = results.filter(
        (r) => r.estimatedMonthlyPayment !== undefined,
      );

      for (const rec of withPayment) {
        expect(rec.estimatedMonthlyPayment).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getTopPick
  // ---------------------------------------------------------------------------

  describe("getTopPick", () => {
    it("should return the highest scored loan", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const topPick = matcher.getTopPick(profile);

      if (topPick) {
        expect(topPick.matchScore).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return null when no loans are available", () => {
      const cache = new OfferCache();
      cache.set("loan-catalog", []);
      const matcher = new LoanMatcher(productMatcher, cache);
      const profile = createProfile();

      const topPick = matcher.getTopPick(profile);

      expect(topPick).toBeNull();
    });

    it("should filter by loan type for top pick", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const topPick = matcher.getTopPick(profile, "auto");

      if (topPick) {
        expect(topPick.loanType).toBe("auto");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // compareLoans
  // ---------------------------------------------------------------------------

  describe("compareLoans", () => {
    it("should compare specific loans and return ranked results", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareLoans([
        "loan_personal",
        "loan_auto",
      ]);

      expect(comparison.products.length).toBe(2);
      expect(comparison.products[0].matchScore).toBeGreaterThanOrEqual(
        comparison.products[1].matchScore,
      );
    });

    it("should identify bestApr, bestTerms, bestOverall, lowestPayment", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareLoans([
        "loan_personal",
        "loan_auto",
        "loan_mortgage",
      ]);

      expect(comparison.bestApr).toBeTruthy();
      expect(comparison.bestTerms).toBeTruthy();
      expect(comparison.bestOverall).toBeTruthy();
      expect(comparison.lowestPayment).toBeTruthy();
    });

    it("should return empty comparison when no matching IDs", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareLoans([
        "nonexistent_1",
        "nonexistent_2",
      ]);

      expect(comparison.products).toEqual([]);
      expect(comparison.bestApr).toBe("");
      expect(comparison.bestTerms).toBe("");
      expect(comparison.bestOverall).toBe("");
      expect(comparison.lowestPayment).toBe("");
    });

    it("should handle single loan comparison", () => {
      const { matcher } = createMatcher();

      const comparison = matcher.compareLoans(["loan_auto"]);

      expect(comparison.products.length).toBe(1);
      expect(comparison.bestOverall).toBe("loan_auto");
    });
  });

  // ---------------------------------------------------------------------------
  // calculateAprScore
  // ---------------------------------------------------------------------------

  describe("calculateAprScore", () => {
    it("should give perfect score for 0% APR", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { apr: { min: 0, max: 0, type: "fixed" } },
      });

      const score = matcher.calculateAprScore(product);

      // 100 - 0 + 5 (fixed bonus) = 100 (capped)
      expect(score).toBe(100);
    });

    it("should give low score for high APR", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { apr: { min: 28, max: 32, type: "variable" } },
      });

      const score = matcher.calculateAprScore(product);

      expect(score).toBeLessThan(10);
    });

    it("should give bonus for fixed rate", () => {
      const { matcher } = createMatcher();
      const fixed = createProduct({
        terms: { apr: { min: 10, max: 10, type: "fixed" } },
      });
      const variable = createProduct({
        terms: { apr: { min: 10, max: 10, type: "variable" } },
      });

      const fixedScore = matcher.calculateAprScore(fixed);
      const variableScore = matcher.calculateAprScore(variable);

      expect(fixedScore).toBeGreaterThan(variableScore);
    });

    it("should return 50 when no APR data", () => {
      const { matcher } = createMatcher();
      const product = createProduct({ terms: {} });

      const score = matcher.calculateAprScore(product);

      expect(score).toBe(50);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { apr: { min: 15, max: 25, type: "variable" } },
      });

      const score = matcher.calculateAprScore(product);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateTermScore
  // ---------------------------------------------------------------------------

  describe("calculateTermScore", () => {
    it("should give higher score for wider term range", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const wide = createProduct({
        terms: { term: { min: 12, max: 84, unit: "months" } },
      });
      const narrow = createProduct({
        terms: { term: { min: 12, max: 18, unit: "months" } },
      });

      const wideScore = matcher.calculateTermScore(wide, profile);
      const narrowScore = matcher.calculateTermScore(narrow, profile);

      expect(wideScore).toBeGreaterThan(narrowScore);
    });

    it("should benefit young borrowers with longer terms available", () => {
      const { matcher } = createMatcher();

      const product = createProduct({
        terms: { term: { min: 12, max: 60, unit: "months" } },
      });

      const youngScore = matcher.calculateTermScore(
        product,
        createProfile({ age: 25 }),
      );
      const olderScore = matcher.calculateTermScore(
        product,
        createProfile({ age: 60 }),
      );

      expect(youngScore).toBeGreaterThanOrEqual(olderScore);
    });

    it("should benefit older borrowers with shorter terms available", () => {
      const { matcher } = createMatcher();

      const product = createProduct({
        terms: { term: { min: 6, max: 24, unit: "months" } },
      });

      const olderScore = matcher.calculateTermScore(
        product,
        createProfile({ age: 60 }),
      );
      // Older borrower with short term option available gets bonus
      expect(olderScore).toBeGreaterThanOrEqual(60);
    });

    it("should handle year-based terms", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const yearProduct = createProduct({
        terms: { term: { min: 5, max: 30, unit: "years" } },
      });

      const score = matcher.calculateTermScore(yearProduct, profile);

      // 30 years = 360 months, range 300 months (>= 48): +20, +5 for 360
      expect(score).toBeGreaterThan(60);
    });

    it("should return 50 when no term data", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const product = createProduct({ terms: {} });

      const score = matcher.calculateTermScore(product, profile);

      expect(score).toBe(50);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const product = createProduct({
        terms: { term: { min: 12, max: 60, unit: "months" } },
      });

      const score = matcher.calculateTermScore(product, profile);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateAmountScore
  // ---------------------------------------------------------------------------

  describe("calculateAmountScore", () => {
    it("should give higher score for larger max loan amounts", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const large = createProduct({
        terms: { loanAmount: { min: 1000, max: 500000 } },
      });
      const small = createProduct({
        terms: { loanAmount: { min: 1000, max: 5000 } },
      });

      const largeScore = matcher.calculateAmountScore(large, profile);
      const smallScore = matcher.calculateAmountScore(small, profile);

      expect(largeScore).toBeGreaterThan(smallScore);
    });

    it("should give bonus for lower minimum amount", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const lowMin = createProduct({
        terms: { loanAmount: { min: 500, max: 50000 } },
      });
      const highMin = createProduct({
        terms: { loanAmount: { min: 10000, max: 50000 } },
      });

      const lowMinScore = matcher.calculateAmountScore(lowMin, profile);
      const highMinScore = matcher.calculateAmountScore(highMin, profile);

      expect(lowMinScore).toBeGreaterThan(highMinScore);
    });

    it("should consider debt-to-income ratio", () => {
      const { matcher } = createMatcher();

      const product = createProduct({
        terms: { loanAmount: { min: 1000, max: 50000 } },
      });

      // $50K max on $65K income = 0.77x ratio (good)
      const goodRatio = matcher.calculateAmountScore(
        product,
        createProfile({ annualIncome: 65000 }),
      );

      // $50K max on $4K income = 12.5x ratio (risky, no bonus)
      const riskyRatio = matcher.calculateAmountScore(
        product,
        createProfile({ annualIncome: 4000 }),
      );

      expect(goodRatio).toBeGreaterThan(riskyRatio);
    });

    it("should return 50 when no amount data", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const product = createProduct({ terms: {} });

      const score = matcher.calculateAmountScore(product, profile);

      expect(score).toBe(50);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();
      const profile = createProfile();

      const product = createProduct({
        terms: { loanAmount: { min: 1000, max: 100000 } },
      });

      const score = matcher.calculateAmountScore(product, profile);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateFeeScore
  // ---------------------------------------------------------------------------

  describe("calculateFeeScore", () => {
    it("should give perfect score for no fees", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { annualFee: 0 },
      });

      const score = matcher.calculateFeeScore(product);

      expect(score).toBe(100);
    });

    it("should penalize high fees", () => {
      const { matcher } = createMatcher();

      const noFee = createProduct({ terms: { annualFee: 0 } });
      const highFee = createProduct({ terms: { annualFee: 300 } });

      const noFeeScore = matcher.calculateFeeScore(noFee);
      const highFeeScore = matcher.calculateFeeScore(highFee);

      expect(noFeeScore).toBeGreaterThan(highFeeScore);
    });

    it("should give small bonus for signup bonus", () => {
      const { matcher } = createMatcher();

      const withBonus = createProduct({
        terms: { annualFee: 50, signupBonus: "0.25% rate reduction" },
      });
      const noBonus = createProduct({
        terms: { annualFee: 50 },
      });

      const withBonusScore = matcher.calculateFeeScore(withBonus);
      const noBonusScore = matcher.calculateFeeScore(noBonus);

      expect(withBonusScore).toBeGreaterThan(noBonusScore);
    });

    it("should return score between 0 and 100", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        terms: { annualFee: 500 },
      });

      const score = matcher.calculateFeeScore(product);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should handle undefined annual fee as zero", () => {
      const { matcher } = createMatcher();
      const product = createProduct({ terms: {} });

      const score = matcher.calculateFeeScore(product);

      expect(score).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // estimateMonthlyPayment
  // ---------------------------------------------------------------------------

  describe("estimateMonthlyPayment", () => {
    it("should calculate correct payment for a standard loan", () => {
      const { matcher } = createMatcher();

      // $10,000 at 5% APR for 60 months
      const payment = matcher.estimateMonthlyPayment(10000, 5, 60);

      // Expected: ~$188.71 (standard amortization)
      expect(payment).toBeCloseTo(188.71, 0);
    });

    it("should calculate correct payment for a mortgage", () => {
      const { matcher } = createMatcher();

      // $200,000 at 4% APR for 360 months (30 years)
      const payment = matcher.estimateMonthlyPayment(200000, 4, 360);

      // Expected: ~$954.83
      expect(payment).toBeCloseTo(954.83, 0);
    });

    it("should handle 0% APR with simple division", () => {
      const { matcher } = createMatcher();

      const payment = matcher.estimateMonthlyPayment(12000, 0, 12);

      expect(payment).toBe(1000);
    });

    it("should return 0 for zero principal", () => {
      const { matcher } = createMatcher();

      const payment = matcher.estimateMonthlyPayment(0, 5, 60);

      expect(payment).toBe(0);
    });

    it("should return 0 for zero term", () => {
      const { matcher } = createMatcher();

      const payment = matcher.estimateMonthlyPayment(10000, 5, 0);

      expect(payment).toBe(0);
    });

    it("should return 0 for negative principal", () => {
      const { matcher } = createMatcher();

      const payment = matcher.estimateMonthlyPayment(-5000, 5, 60);

      expect(payment).toBe(0);
    });

    it("should return 0 for negative term", () => {
      const { matcher } = createMatcher();

      const payment = matcher.estimateMonthlyPayment(10000, 5, -12);

      expect(payment).toBe(0);
    });

    it("should scale with principal", () => {
      const { matcher } = createMatcher();

      const small = matcher.estimateMonthlyPayment(10000, 5, 60);
      const large = matcher.estimateMonthlyPayment(20000, 5, 60);

      expect(large).toBeCloseTo(small * 2, 0);
    });

    it("should increase with higher APR", () => {
      const { matcher } = createMatcher();

      const lowApr = matcher.estimateMonthlyPayment(10000, 3, 60);
      const highApr = matcher.estimateMonthlyPayment(10000, 15, 60);

      expect(highApr).toBeGreaterThan(lowApr);
    });

    it("should decrease with longer term", () => {
      const { matcher } = createMatcher();

      const short = matcher.estimateMonthlyPayment(10000, 5, 24);
      const long = matcher.estimateMonthlyPayment(10000, 5, 60);

      expect(short).toBeGreaterThan(long);
    });

    it("should round to 2 decimal places", () => {
      const { matcher } = createMatcher();

      const payment = matcher.estimateMonthlyPayment(10000, 5.5, 48);
      const decimals = payment.toString().split(".")[1];

      if (decimals) {
        expect(decimals.length).toBeLessThanOrEqual(2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // categorizeLoan
  // ---------------------------------------------------------------------------

  describe("categorizeLoan", () => {
    it('should categorize "personal" loans', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Personal Quick Loan",
        category: "personal_loan",
        description: "Unsecured personal lending",
      });

      expect(matcher.categorizeLoan(product)).toBe("personal");
    });

    it('should categorize "auto" loans', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "AutoDrive Financing",
        category: "auto_loan",
        description: "Car vehicle loan with low rates",
      });

      expect(matcher.categorizeLoan(product)).toBe("auto");
    });

    it('should categorize "student" loans', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "EduFund Loan",
        category: "student_loan",
        description: "Student education tuition financing",
      });

      expect(matcher.categorizeLoan(product)).toBe("student");
    });

    it('should categorize "mortgage" loans', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Dream Mortgage",
        category: "mortgage",
        description: "Home loan for first-time buyers",
      });

      expect(matcher.categorizeLoan(product)).toBe("mortgage");
    });

    it('should categorize "home equity" loans', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "FlexEquity HELOC",
        category: "personal_loan",
        description: "Home equity line of credit",
      });

      expect(matcher.categorizeLoan(product)).toBe("home_equity");
    });

    it('should categorize "cash advance" as personal', () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "QuickCash",
        category: "personal_loan",
        description: "Fast cash advance for emergencies",
      });

      expect(matcher.categorizeLoan(product)).toBe("personal");
    });

    it("should fall back to category field when no keywords match", () => {
      const { matcher } = createMatcher();

      const autoLoan = createProduct({
        name: "Premium Financing",
        category: "auto_loan",
        description: "Great rates available",
      });
      expect(matcher.categorizeLoan(autoLoan)).toBe("auto");

      const studentLoan = createProduct({
        name: "Learning Loan",
        category: "student_loan",
        description: "Invest in your future",
      });
      expect(matcher.categorizeLoan(studentLoan)).toBe("student");

      const mortgageLoan = createProduct({
        name: "Property Loan",
        category: "mortgage",
        description: "Great rates for qualified buyers",
      });
      expect(matcher.categorizeLoan(mortgageLoan)).toBe("mortgage");
    });

    it("should default to personal for unrecognized products", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Premium Financing",
        category: "personal_loan",
        description: "Great rates available",
      });

      expect(matcher.categorizeLoan(product)).toBe("personal");
    });

    it("should detect keywords in signup bonus field", () => {
      const { matcher } = createMatcher();
      const product = createProduct({
        name: "Smart Loan",
        category: "personal_loan",
        description: "Great lending solution",
        terms: { signupBonus: "Education tuition discount" },
      });

      expect(matcher.categorizeLoan(product)).toBe("student");
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

    it("should handle profile with all undefined optional fields", () => {
      const { matcher } = createMatcher();
      const profile: UserMatchProfile = { userId: "bare_user" };

      const results = matcher.getRecommendations(profile);

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
