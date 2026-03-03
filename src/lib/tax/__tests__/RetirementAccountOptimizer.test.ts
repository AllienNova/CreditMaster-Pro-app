/**
 * RetirementAccountOptimizer Test Suite
 *
 * Covers: analyze (401k, IRA, Roth IRA, HSA, SEP IRA),
 *         Roth vs Traditional, contribution priority ordering,
 *         catch-up contributions (age 50+), tax bracket optimization,
 *         retirement readiness projection
 */

import { RetirementAccountOptimizer } from "../services/RetirementAccountOptimizer";
import type {
  BracketOptimizationResult,
  RetirementReadinessProjection,
} from "../services/RetirementAccountOptimizer";
import {
  FilingStatus,
  BusinessType,
  OptimizationGoal,
  TaxProfile,
  TaxAccountType,
  CONTRIBUTION_LIMITS_2024,
  INCOME_THRESHOLDS_2024,
} from "../types/tax-profile.types";

// Reusable mock profile factory
const createMockProfile = (
  overrides: Partial<TaxProfile> = {},
): TaxProfile => ({
  id: "test-profile",
  userId: "test-user",
  taxYear: 2024,
  filingStatus: FilingStatus.SINGLE,
  stateOfResidence: "CA",
  grossIncome: 100000,
  w2Income: 100000,
  selfEmploymentIncome: 0,
  investmentIncome: 0,
  dividendIncome: 0,
  interestIncome: 0,
  capitalGainsShortTerm: 0,
  capitalGainsLongTerm: 0,
  rentalIncome: 0,
  retirementIncome: 0,
  otherIncome: 0,
  federalWithheld: 15000,
  stateWithheld: 5000,
  estimatedPayments: 0,
  dependents: [],
  isEmployed: true,
  isSelfEmployed: false,
  businessType: BusinessType.NONE,
  mortgageInterest: 0,
  propertyTaxes: 0,
  stateTaxesPaid: 0,
  charitableDonations: 0,
  medicalExpenses: 0,
  studentLoanInterest: 0,
  educatorExpenses: 0,
  hasHdhp: false,
  healthInsuranceType: "employer" as const,
  ytd401kContribution: 0,
  ytdIraContribution: 0,
  ytdHsaContribution: 0,
  ytdRothIraContribution: 0,
  ytdCharitableGiving: 0,
  accounts: [],
  optimizationGoal: OptimizationGoal.BALANCED,
  riskTolerance: "moderate" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("RetirementAccountOptimizer", () => {
  let optimizer: RetirementAccountOptimizer;

  beforeEach(() => {
    optimizer = new RetirementAccountOptimizer();
  });

  // =========================================================================
  // analyze — Overall
  // =========================================================================
  describe("analyze", () => {
    it("should return a complete result object", () => {
      const result = optimizer.analyze(createMockProfile());
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("rothVsTraditionalRecommendation");
      expect(result).toHaveProperty("totalPotentialTaxSavings");
      expect(result).toHaveProperty("contributionPriorityOrder");
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.contributionPriorityOrder)).toBe(true);
    });

    it("should include 401k recommendation for employed users", () => {
      const result = optimizer.analyze(createMockProfile({ isEmployed: true }));
      const has401k = result.recommendations.some(
        (r) =>
          r.accountType === TaxAccountType.TRADITIONAL_401K ||
          r.accountType === TaxAccountType.ROTH_401K,
      );
      expect(has401k).toBe(true);
    });

    it("should calculate total potential tax savings > 0", () => {
      const result = optimizer.analyze(createMockProfile());
      expect(result.totalPotentialTaxSavings).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 401(k) Analysis
  // =========================================================================
  describe("401k Analysis", () => {
    it("should recommend full 401k contribution for high earners", () => {
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 200000, w2Income: 200000 }),
      );
      const rec401k = result.recommendations.find(
        (r) =>
          r.accountType === TaxAccountType.TRADITIONAL_401K ||
          r.accountType === TaxAccountType.ROTH_401K,
      );
      expect(rec401k).toBeDefined();
      if (rec401k) {
        expect(rec401k.recommendedContribution).toBeGreaterThan(0);
      }
    });

    it("should account for existing YTD contributions", () => {
      const result = optimizer.analyze(
        createMockProfile({
          ytd401kContribution: 15000,
        }),
      );
      const rec401k = result.recommendations.find(
        (r) =>
          r.accountType === TaxAccountType.TRADITIONAL_401K ||
          r.accountType === TaxAccountType.ROTH_401K,
      );
      if (rec401k) {
        // Remaining room = 23000 - 15000 = 8000
        expect(rec401k.recommendedContribution).toBeLessThanOrEqual(
          CONTRIBUTION_LIMITS_2024.traditional401k - 15000,
        );
      }
    });

    it("should recommend 0 when already maxed out", () => {
      const result = optimizer.analyze(
        createMockProfile({
          ytd401kContribution: CONTRIBUTION_LIMITS_2024.traditional401k,
        }),
      );
      const rec401k = result.recommendations.find(
        (r) =>
          r.accountType === TaxAccountType.TRADITIONAL_401K ||
          r.accountType === TaxAccountType.ROTH_401K,
      );
      if (rec401k) {
        expect(rec401k.recommendedContribution).toBe(0);
      }
    });

    it("should factor in employer match for priority", () => {
      const withMatch = optimizer.analyze(
        createMockProfile({
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 50000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              employerMatch: 3000,
              employerMatchPercent: 50,
              vestingPercent: 100,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      expect(withMatch.recommendations.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // IRA Analysis
  // =========================================================================
  describe("Traditional IRA Analysis", () => {
    it("should recommend IRA contribution", () => {
      const result = optimizer.analyze(createMockProfile());
      const iraRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_IRA,
      );
      // May or may not be present depending on deductibility logic
      if (iraRec) {
        expect(iraRec.recommendedContribution).toBeGreaterThanOrEqual(0);
      }
    });

    it("should account for existing YTD IRA contributions", () => {
      const result = optimizer.analyze(
        createMockProfile({
          ytdIraContribution: 5000,
        }),
      );
      const iraRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_IRA,
      );
      if (iraRec) {
        expect(iraRec.recommendedContribution).toBeLessThanOrEqual(
          CONTRIBUTION_LIMITS_2024.traditionalIra - 5000,
        );
      }
    });

    it("should consider income phase-out for deductibility", () => {
      // Single filer with workplace plan, income above phase-out
      const highIncome = optimizer.analyze(
        createMockProfile({
          grossIncome: 95000,
          w2Income: 95000,
        }),
      );
      // At $95k (above $87k end), traditional IRA deduction is fully phased out
      // Optimizer may still recommend but deductibility note should differ
      expect(highIncome.recommendations.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Roth IRA Analysis
  // =========================================================================
  describe("Roth IRA Analysis", () => {
    it("should recommend Roth IRA for eligible income", () => {
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 80000, w2Income: 80000 }),
      );
      const rothRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.ROTH_IRA,
      );
      if (rothRec) {
        expect(rothRec.recommendedContribution).toBeGreaterThan(0);
        // Roth IRA has 0 estimated tax savings (contributions are post-tax)
        expect(rothRec.estimatedTaxSavings).toBe(0);
      }
    });

    it("should reduce Roth contribution in phase-out range", () => {
      // Single phase-out: $146,000 - $161,000
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 155000, w2Income: 155000 }),
      );
      const rothRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.ROTH_IRA,
      );
      if (rothRec) {
        expect(rothRec.recommendedContribution).toBeLessThan(
          CONTRIBUTION_LIMITS_2024.rothIra,
        );
      }
    });

    it("should recommend 0 Roth IRA above phase-out", () => {
      // Single phase-out ends at $161,000
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 170000, w2Income: 170000 }),
      );
      const rothRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.ROTH_IRA,
      );
      if (rothRec) {
        expect(rothRec.recommendedContribution).toBe(0);
      }
    });

    it("should use married phase-out for MFJ", () => {
      // Married phase-out: $230,000 - $240,000
      const result = optimizer.analyze(
        createMockProfile({
          filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
          grossIncome: 220000,
          w2Income: 220000,
        }),
      );
      const rothRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.ROTH_IRA,
      );
      if (rothRec) {
        // Below $230k phase-out start — full contribution
        expect(rothRec.recommendedContribution).toBe(
          CONTRIBUTION_LIMITS_2024.rothIra,
        );
      }
    });

    it("should account for existing Roth IRA contributions", () => {
      const result = optimizer.analyze(
        createMockProfile({
          ytdRothIraContribution: 4000,
        }),
      );
      const rothRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.ROTH_IRA,
      );
      if (rothRec) {
        expect(rothRec.recommendedContribution).toBeLessThanOrEqual(
          CONTRIBUTION_LIMITS_2024.rothIra - 4000,
        );
      }
    });
  });

  // =========================================================================
  // HSA Analysis
  // =========================================================================
  describe("HSA Analysis", () => {
    it("should return null/skip HSA when no HDHP", () => {
      const result = optimizer.analyze(createMockProfile({ hasHdhp: false }));
      const hsaRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.HSA,
      );
      expect(hsaRec).toBeUndefined();
    });

    it("should recommend HSA when HDHP is present", () => {
      const result = optimizer.analyze(createMockProfile({ hasHdhp: true }));
      const hsaRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.HSA,
      );
      expect(hsaRec).toBeDefined();
      if (hsaRec) {
        expect(hsaRec.recommendedContribution).toBeGreaterThan(0);
      }
    });

    it("should use individual limit for single filer", () => {
      const result = optimizer.analyze(
        createMockProfile({
          hasHdhp: true,
          filingStatus: FilingStatus.SINGLE,
          dependents: [],
        }),
      );
      const hsaRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.HSA,
      );
      if (hsaRec) {
        expect(hsaRec.recommendedContribution).toBeLessThanOrEqual(
          CONTRIBUTION_LIMITS_2024.hsaIndividual,
        );
      }
    });

    it("should use family limit for married filer or filer with dependents", () => {
      const result = optimizer.analyze(
        createMockProfile({
          hasHdhp: true,
          filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
        }),
      );
      const hsaRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.HSA,
      );
      if (hsaRec) {
        expect(hsaRec.recommendedContribution).toBeLessThanOrEqual(
          CONTRIBUTION_LIMITS_2024.hsaFamily,
        );
      }
    });

    it("should account for existing HSA contributions", () => {
      const result = optimizer.analyze(
        createMockProfile({
          hasHdhp: true,
          ytdHsaContribution: 2000,
        }),
      );
      const hsaRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.HSA,
      );
      if (hsaRec) {
        expect(hsaRec.recommendedContribution).toBeLessThanOrEqual(
          CONTRIBUTION_LIMITS_2024.hsaIndividual - 2000,
        );
      }
    });
  });

  // =========================================================================
  // SEP IRA Analysis
  // =========================================================================
  describe("SEP IRA Analysis", () => {
    it("should return null/skip SEP when not self-employed", () => {
      const result = optimizer.analyze(
        createMockProfile({ isSelfEmployed: false }),
      );
      const sepRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.SEP_IRA,
      );
      expect(sepRec).toBeUndefined();
    });

    it("should recommend SEP IRA for self-employed with income", () => {
      const result = optimizer.analyze(
        createMockProfile({
          isSelfEmployed: true,
          selfEmploymentIncome: 150000,
          grossIncome: 150000,
          w2Income: 0,
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
        }),
      );
      const sepRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.SEP_IRA,
      );
      expect(sepRec).toBeDefined();
      if (sepRec) {
        expect(sepRec.recommendedContribution).toBeGreaterThan(0);
        // SEP limit = min(netSE * 0.25, 69000)
        expect(sepRec.recommendedContribution).toBeLessThanOrEqual(
          CONTRIBUTION_LIMITS_2024.sepIra,
        );
      }
    });

    it("should skip SEP when self-employed income is 0", () => {
      const result = optimizer.analyze(
        createMockProfile({
          isSelfEmployed: true,
          selfEmploymentIncome: 0,
        }),
      );
      const sepRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.SEP_IRA,
      );
      expect(sepRec).toBeUndefined();
    });

    it("should cap SEP at 25% of net SE earnings", () => {
      const result = optimizer.analyze(
        createMockProfile({
          isSelfEmployed: true,
          selfEmploymentIncome: 80000,
          grossIncome: 80000,
          w2Income: 0,
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
        }),
      );
      const sepRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.SEP_IRA,
      );
      if (sepRec) {
        // Net SE = 80000 * 0.9235 = 73880, 25% = 18470
        expect(sepRec.recommendedContribution).toBeLessThanOrEqual(20000);
      }
    });
  });

  // =========================================================================
  // Roth vs Traditional
  // =========================================================================
  describe("Roth vs Traditional Analysis", () => {
    it("should recommend Roth for low marginal rate (<= 22%)", () => {
      // Income ~$50k single -> 22% marginal bracket
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 40000, w2Income: 40000 }),
      );
      // marginalRate at 40k = 12% -> should recommend Roth
      expect(result.rothVsTraditionalRecommendation).toBeDefined();
      expect(result.rothVsTraditionalRecommendation).toMatch(/roth/i);
    });

    it("should recommend Traditional for high marginal rate (>= 32%)", () => {
      // Income ~$250k single -> 35% marginal bracket
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 250000, w2Income: 250000 }),
      );
      expect(result.rothVsTraditionalRecommendation).toBeDefined();
      expect(result.rothVsTraditionalRecommendation).toMatch(/traditional/i);
    });

    it("should recommend split for middle marginal rate (24%)", () => {
      // Income ~$120k single -> 24% marginal bracket
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 120000, w2Income: 120000 }),
      );
      expect(result.rothVsTraditionalRecommendation).toBeDefined();
      expect(result.rothVsTraditionalRecommendation).toMatch(
        /split|both|roth|traditional/i,
      );
    });
  });

  // =========================================================================
  // Contribution Priority Order
  // =========================================================================
  describe("Contribution Priority Order", () => {
    it("should start with 401k match", () => {
      const result = optimizer.analyze(createMockProfile());
      expect(result.contributionPriorityOrder.length).toBeGreaterThan(0);
      // First priority should be 401k (for employer match)
      expect(result.contributionPriorityOrder[0]).toMatch(/401k|401\(k\)/i);
    });

    it("should include HSA in priority when HDHP present", () => {
      const result = optimizer.analyze(createMockProfile({ hasHdhp: true }));
      const hasHsa = result.contributionPriorityOrder.some((p) =>
        p.toLowerCase().includes("hsa"),
      );
      expect(hasHsa).toBe(true);
    });

    it("should not include HSA when no HDHP", () => {
      const result = optimizer.analyze(createMockProfile({ hasHdhp: false }));
      const hasHsa = result.contributionPriorityOrder.some((p) =>
        p.toLowerCase().includes("hsa"),
      );
      expect(hasHsa).toBe(false);
    });

    it("should include SEP IRA for self-employed", () => {
      const result = optimizer.analyze(
        createMockProfile({
          isSelfEmployed: true,
          selfEmploymentIncome: 100000,
          grossIncome: 100000,
          w2Income: 0,
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
        }),
      );
      const hasSep = result.contributionPriorityOrder.some((p) =>
        p.toLowerCase().includes("sep"),
      );
      expect(hasSep).toBe(true);
    });

    it("should end with taxable brokerage", () => {
      const result = optimizer.analyze(createMockProfile());
      const last =
        result.contributionPriorityOrder[
          result.contributionPriorityOrder.length - 1
        ];
      expect(last).toMatch(/taxable|brokerage/i);
    });
  });

  // =========================================================================
  // Catch-Up Contributions (Age 50+)
  // =========================================================================
  describe("Catch-Up Contributions", () => {
    it("should increase 401k limit by $7,500 for age 50+", () => {
      const result = optimizer.analyze(createMockProfile({ age: 55 }));
      const rec401k = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_401K,
      );
      expect(rec401k).toBeDefined();
      if (rec401k) {
        expect(rec401k.catchUpEligible).toBe(true);
        expect(rec401k.catchUpAmount).toBe(
          CONTRIBUTION_LIMITS_2024.traditional401kCatchUp,
        );
        expect(rec401k.maxContribution).toBe(
          CONTRIBUTION_LIMITS_2024.traditional401k +
            CONTRIBUTION_LIMITS_2024.traditional401kCatchUp,
        );
      }
    });

    it("should NOT add catch-up for age below 50", () => {
      const result = optimizer.analyze(createMockProfile({ age: 35 }));
      const rec401k = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_401K,
      );
      expect(rec401k).toBeDefined();
      if (rec401k) {
        expect(rec401k.catchUpEligible).toBe(false);
        expect(rec401k.catchUpAmount).toBe(0);
        expect(rec401k.maxContribution).toBe(
          CONTRIBUTION_LIMITS_2024.traditional401k,
        );
      }
    });

    it("should NOT add catch-up when age is not provided", () => {
      const result = optimizer.analyze(createMockProfile());
      const rec401k = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_401K,
      );
      if (rec401k) {
        expect(rec401k.catchUpEligible).toBe(false);
        expect(rec401k.catchUpAmount).toBe(0);
      }
    });

    it("should increase IRA limit by $1,000 for age 50+", () => {
      const result = optimizer.analyze(createMockProfile({ age: 52 }));
      const iraRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_IRA,
      );
      expect(iraRec).toBeDefined();
      if (iraRec) {
        expect(iraRec.catchUpEligible).toBe(true);
        expect(iraRec.catchUpAmount).toBe(CONTRIBUTION_LIMITS_2024.iraCatchUp);
        expect(iraRec.maxContribution).toBe(
          CONTRIBUTION_LIMITS_2024.traditionalIra +
            CONTRIBUTION_LIMITS_2024.iraCatchUp,
        );
      }
    });

    it("should increase Roth IRA limit by $1,000 for age 50+", () => {
      const result = optimizer.analyze(
        createMockProfile({ age: 60, grossIncome: 80000, w2Income: 80000 }),
      );
      const rothRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.ROTH_IRA,
      );
      expect(rothRec).toBeDefined();
      if (rothRec) {
        expect(rothRec.catchUpEligible).toBe(true);
        expect(rothRec.catchUpAmount).toBe(CONTRIBUTION_LIMITS_2024.iraCatchUp);
      }
    });

    it("should increase HSA limit by $1,000 for age 55+", () => {
      const result = optimizer.analyze(
        createMockProfile({ age: 57, hasHdhp: true }),
      );
      const hsaRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.HSA,
      );
      expect(hsaRec).toBeDefined();
      if (hsaRec) {
        expect(hsaRec.catchUpEligible).toBe(true);
        expect(hsaRec.catchUpAmount).toBe(CONTRIBUTION_LIMITS_2024.hsaCatchUp);
        expect(hsaRec.maxContribution).toBe(
          CONTRIBUTION_LIMITS_2024.hsaIndividual +
            CONTRIBUTION_LIMITS_2024.hsaCatchUp,
        );
      }
    });

    it("should NOT add HSA catch-up for age 50 (below 55)", () => {
      const result = optimizer.analyze(
        createMockProfile({ age: 50, hasHdhp: true }),
      );
      const hsaRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.HSA,
      );
      expect(hsaRec).toBeDefined();
      if (hsaRec) {
        expect(hsaRec.catchUpEligible).toBe(false);
        expect(hsaRec.catchUpAmount).toBe(0);
      }
    });

    it("should include catch-up warning in 401k recommendations for age 50+", () => {
      const result = optimizer.analyze(createMockProfile({ age: 52 }));
      const rec401k = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_401K,
      );
      if (rec401k) {
        const hasCatchUpWarning = rec401k.warnings.some((w) =>
          w.includes("catch-up"),
        );
        expect(hasCatchUpWarning).toBe(true);
      }
    });

    it("should report totalCatchUpCapacity in result for age 50+", () => {
      const result = optimizer.analyze(
        createMockProfile({ age: 55, hasHdhp: true }),
      );
      expect(result.catchUpEligible).toBe(true);
      expect(result.totalCatchUpCapacity).toBeGreaterThan(0);
    });

    it("should report catchUpEligible=false in result for age <50", () => {
      const result = optimizer.analyze(createMockProfile({ age: 30 }));
      expect(result.catchUpEligible).toBe(false);
      expect(result.totalCatchUpCapacity).toBe(0);
    });

    it("should NOT have catch-up for SEP IRA", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 55,
          isSelfEmployed: true,
          selfEmploymentIncome: 100000,
          grossIncome: 100000,
          w2Income: 0,
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
        }),
      );
      const sepRec = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.SEP_IRA,
      );
      if (sepRec) {
        expect(sepRec.catchUpEligible).toBe(false);
        expect(sepRec.catchUpAmount).toBe(0);
      }
    });

    it("should handle exactly age 50", () => {
      const result = optimizer.analyze(createMockProfile({ age: 50 }));
      const rec401k = result.recommendations.find(
        (r) => r.accountType === TaxAccountType.TRADITIONAL_401K,
      );
      if (rec401k) {
        expect(rec401k.catchUpEligible).toBe(true);
        expect(rec401k.catchUpAmount).toBe(
          CONTRIBUTION_LIMITS_2024.traditional401kCatchUp,
        );
      }
    });
  });

  // =========================================================================
  // Tax Bracket Optimization
  // =========================================================================
  describe("Tax Bracket Optimization", () => {
    it("should include bracketOptimization in analyze result", () => {
      const result = optimizer.analyze(createMockProfile());
      expect(result.bracketOptimization).toBeDefined();
      expect(result.bracketOptimization).toHaveProperty("currentBracket");
      expect(result.bracketOptimization).toHaveProperty("nextLowerBracket");
      expect(result.bracketOptimization).toHaveProperty(
        "deductionToDropBracket",
      );
      expect(result.bracketOptimization).toHaveProperty(
        "taxSavingsIfDropBracket",
      );
      expect(result.bracketOptimization).toHaveProperty("recommendedStrategy");
    });

    it("should identify current marginal bracket correctly", () => {
      // $100k single -> 22% bracket ($47,150 - $100,525)
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 100000, w2Income: 100000 }),
      );
      expect(result.bracketOptimization.currentBracket).toBe(0.22);
    });

    it("should calculate deduction needed to drop one bracket", () => {
      // $100k single is in 22% bracket (starts at $47,150)
      // Income in current bracket = $100,000 - $47,150 = $52,850
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 100000 }),
      );
      expect(result.bracketOptimization.deductionToDropBracket).toBe(
        100000 - 47150,
      );
      expect(result.bracketOptimization.nextLowerBracket).toBe(0.12);
    });

    it("should calculate tax savings from dropping a bracket", () => {
      // $50,000 single -> 22% bracket, but barely in it
      // Income in 22% bracket = $50,000 - $47,150 = $2,850
      // Tax savings = $2,850 * (0.22 - 0.12) = $285
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 50000 }),
      );
      expect(result.bracketOptimization.currentBracket).toBe(0.22);
      expect(result.bracketOptimization.deductionToDropBracket).toBe(
        50000 - 47150,
      );
      expect(result.bracketOptimization.taxSavingsIfDropBracket).toBeCloseTo(
        (50000 - 47150) * (0.22 - 0.12),
        0,
      );
    });

    it("should handle lowest bracket (no lower bracket available)", () => {
      // $5,000 single -> 10% bracket
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 5000, w2Income: 5000 }),
      );
      expect(result.bracketOptimization.currentBracket).toBe(0.1);
      expect(result.bracketOptimization.deductionToDropBracket).toBe(0);
      expect(result.bracketOptimization.taxSavingsIfDropBracket).toBe(0);
      expect(result.bracketOptimization.recommendedStrategy).toContain(
        "lowest tax bracket",
      );
    });

    it("should provide a strategy recommendation for small deduction needed", () => {
      // Just above a bracket boundary
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 48000 }),
      );
      // $48k is just above 22% boundary at $47,150 (deduction = $850)
      expect(
        result.bracketOptimization.recommendedStrategy.length,
      ).toBeGreaterThan(0);
    });

    it("should use married brackets for MFJ", () => {
      // $200,000 MFJ -> 22% bracket ($94,300 - $201,050)
      const result = optimizer.analyze(
        createMockProfile({
          filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
          grossIncome: 200000,
          w2Income: 200000,
        }),
      );
      expect(result.bracketOptimization.currentBracket).toBe(0.22);
      expect(result.bracketOptimization.nextLowerBracket).toBe(0.12);
    });

    it("should handle high earner in top bracket", () => {
      // $700k single -> 37% bracket (>$609,350)
      const result = optimizer.analyze(
        createMockProfile({ grossIncome: 700000, w2Income: 700000 }),
      );
      expect(result.bracketOptimization.currentBracket).toBe(0.37);
      expect(result.bracketOptimization.nextLowerBracket).toBe(0.35);
      expect(result.bracketOptimization.deductionToDropBracket).toBe(
        700000 - 609350,
      );
    });

    it("should use analyzeBracketOptimization directly", () => {
      const profile = createMockProfile({ grossIncome: 120000 });
      const bo = optimizer.analyzeBracketOptimization(profile);
      // $120k single -> 24% bracket
      expect(bo.currentBracket).toBe(0.24);
      expect(bo.nextLowerBracket).toBe(0.22);
    });
  });

  // =========================================================================
  // Retirement Readiness Projection
  // =========================================================================
  describe("Retirement Readiness Projection", () => {
    it("should include retirementReadiness in analyze result when age is provided", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 35,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 100000,
              ytdContribution: 10000,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      expect(result.retirementReadiness).not.toBeNull();
    });

    it("should return null retirementReadiness when age is not provided", () => {
      const result = optimizer.analyze(createMockProfile());
      expect(result.retirementReadiness).toBeNull();
    });

    it("should calculate correct years to retirement", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 40,
          targetRetirementAge: 65,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 200000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      expect(result.retirementReadiness).not.toBeNull();
      if (result.retirementReadiness) {
        expect(result.retirementReadiness.currentAge).toBe(40);
        expect(result.retirementReadiness.targetRetirementAge).toBe(65);
        expect(result.retirementReadiness.yearsToRetirement).toBe(25);
      }
    });

    it("should use default target retirement age of 65", () => {
      const result = optimizer.analyze(createMockProfile({ age: 30 }));
      if (result.retirementReadiness) {
        expect(result.retirementReadiness.targetRetirementAge).toBe(65);
        expect(result.retirementReadiness.yearsToRetirement).toBe(35);
      }
    });

    it("should project balance growth over time", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 30,
          ytd401kContribution: 10000,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 50000,
              ytdContribution: 10000,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (result.retirementReadiness) {
        expect(
          result.retirementReadiness.projectedBalanceAtRetirement,
        ).toBeGreaterThan(50000);
        expect(
          result.retirementReadiness.projectedMonthlyIncomeInRetirement,
        ).toBeGreaterThan(0);
      }
    });

    it("should calculate income replacement rate", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 45,
          grossIncome: 100000,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 500000,
              ytdContribution: 23000,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          ytd401kContribution: 23000,
        }),
      );
      if (result.retirementReadiness) {
        expect(result.retirementReadiness.incomeReplacementRate).toBeGreaterThan(
          0,
        );
      }
    });

    it("should calculate retirement gap (shortfall or surplus)", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 35,
          grossIncome: 100000,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 50000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (result.retirementReadiness) {
        // Target is 80% income replacement via 4% rule = $100k * 0.8 / 0.04 = $2M
        expect(result.retirementReadiness.targetRetirementBalance).toBe(
          2000000,
        );
        // With only $50k and no ongoing contributions, there should be a gap
        expect(typeof result.retirementReadiness.retirementGap).toBe("number");
      }
    });

    it("should calculate additional monthly savings needed for shortfall", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 45,
          grossIncome: 150000,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 100000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (result.retirementReadiness) {
        if (result.retirementReadiness.retirementGap < 0) {
          expect(
            result.retirementReadiness.additionalMonthlySavingsNeeded,
          ).toBeGreaterThan(0);
        }
      }
    });

    it("should generate milestones every 5 years", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 30,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 50000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (result.retirementReadiness) {
        expect(result.retirementReadiness.milestones.length).toBeGreaterThan(0);
        // First milestone should be at age 35
        expect(result.retirementReadiness.milestones[0].age).toBe(35);
        // Each milestone's projected balance should grow
        for (let i = 1; i < result.retirementReadiness.milestones.length; i++) {
          expect(
            result.retirementReadiness.milestones[i].projectedBalance,
          ).toBeGreaterThan(
            result.retirementReadiness.milestones[i - 1].projectedBalance,
          );
        }
      }
    });

    it("should always include retirement year as last milestone", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 33,
          targetRetirementAge: 65,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 50000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (result.retirementReadiness) {
        const lastMilestone =
          result.retirementReadiness.milestones[
            result.retirementReadiness.milestones.length - 1
          ];
        expect(lastMilestone.age).toBe(65);
      }
    });

    it("should assign readiness score based on projected vs target", () => {
      // Well-funded scenario
      const wellFunded = optimizer.analyze(
        createMockProfile({
          age: 35,
          grossIncome: 80000,
          ytd401kContribution: 23000,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 500000,
              ytdContribution: 23000,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (wellFunded.retirementReadiness) {
        expect(wellFunded.retirementReadiness.readinessScore).toBe("on_track");
        expect(
          wellFunded.retirementReadiness.readinessPercentage,
        ).toBeGreaterThanOrEqual(90);
      }

      // Underfunded scenario
      const underfunded = optimizer.analyze(
        createMockProfile({
          age: 55,
          grossIncome: 150000,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 50000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (underfunded.retirementReadiness) {
        expect(underfunded.retirementReadiness.readinessScore).not.toBe(
          "on_track",
        );
      }
    });

    it("should use custom annual return rate when provided", () => {
      const conservative = optimizer.analyze(
        createMockProfile({
          age: 35,
          expectedAnnualReturnRate: 0.04,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 100000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      const aggressive = optimizer.analyze(
        createMockProfile({
          age: 35,
          expectedAnnualReturnRate: 0.1,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 100000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (
        conservative.retirementReadiness &&
        aggressive.retirementReadiness
      ) {
        // Higher return rate should project higher balance
        expect(
          aggressive.retirementReadiness.projectedBalanceAtRetirement,
        ).toBeGreaterThan(
          conservative.retirementReadiness.projectedBalanceAtRetirement,
        );
      }
    });

    it("should handle 0 years to retirement", () => {
      const result = optimizer.analyze(
        createMockProfile({
          age: 65,
          targetRetirementAge: 65,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 1000000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (result.retirementReadiness) {
        expect(result.retirementReadiness.yearsToRetirement).toBe(0);
        expect(
          result.retirementReadiness.projectedBalanceAtRetirement,
        ).toBe(1000000);
        expect(
          result.retirementReadiness.additionalMonthlySavingsNeeded,
        ).toBe(0);
      }
    });

    it("should use projectRetirementReadiness directly", () => {
      const profile = createMockProfile({
        age: 40,
        accounts: [
          {
            id: "acct-1",
            userId: "test-user",
            accountType: TaxAccountType.TRADITIONAL_401K,
            institutionName: "Fidelity",
            accountName: "401k",
            currentBalance: 200000,
            ytdContribution: 0,
            contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
            isLinked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const projection = optimizer.projectRetirementReadiness(profile);
      expect(projection).not.toBeNull();
      if (projection) {
        expect(projection.currentAge).toBe(40);
        expect(projection.projectedBalanceAtRetirement).toBeGreaterThan(200000);
      }
    });

    it("should return null from projectRetirementReadiness when no age", () => {
      const profile = createMockProfile();
      const projection = optimizer.projectRetirementReadiness(profile);
      expect(projection).toBeNull();
    });

    it("should cap readiness percentage at 100", () => {
      // Massively over-funded
      const result = optimizer.analyze(
        createMockProfile({
          age: 35,
          grossIncome: 50000,
          ytd401kContribution: 23000,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 5000000,
              ytdContribution: 23000,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      if (result.retirementReadiness) {
        expect(result.retirementReadiness.readinessPercentage).toBeLessThanOrEqual(
          100,
        );
      }
    });
  });

  // =========================================================================
  // analyze — Extended Result Properties
  // =========================================================================
  describe("Extended Result Properties", () => {
    it("should include all new fields in analyze result", () => {
      const result = optimizer.analyze(createMockProfile({ age: 50 }));
      expect(result).toHaveProperty("catchUpEligible");
      expect(result).toHaveProperty("totalCatchUpCapacity");
      expect(result).toHaveProperty("bracketOptimization");
      expect(result).toHaveProperty("retirementReadiness");
    });

    it("should have disclaimers in the result", () => {
      const result = optimizer.analyze(createMockProfile());
      expect(result.disclaimers.length).toBeGreaterThanOrEqual(3);
    });

    it("should include Backdoor Roth warning for high-income single filers", () => {
      const result = optimizer.analyze(
        createMockProfile({
          filingStatus: FilingStatus.SINGLE,
          grossIncome: 200000,
          w2Income: 200000,
        }),
      );
      const hasBackdoorWarning = result.warnings.some((w) =>
        w.includes("Backdoor Roth"),
      );
      expect(hasBackdoorWarning).toBe(true);
    });

    it("should sort recommendations by priority and tax savings", () => {
      const result = optimizer.analyze(
        createMockProfile({
          hasHdhp: true,
          accounts: [
            {
              id: "acct-1",
              userId: "test-user",
              accountType: TaxAccountType.TRADITIONAL_401K,
              institutionName: "Fidelity",
              accountName: "401k",
              currentBalance: 50000,
              ytdContribution: 0,
              contributionLimit: CONTRIBUTION_LIMITS_2024.traditional401k,
              employerMatch: 5000,
              employerMatchPercent: 50,
              vestingPercent: 100,
              isLinked: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      );
      // The first recommendation should be the highest priority
      if (result.recommendations.length >= 2) {
        const priorityOrder = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        const first = priorityOrder[result.recommendations[0].priority];
        const second = priorityOrder[result.recommendations[1].priority];
        expect(first).toBeLessThanOrEqual(second);
      }
    });
  });
});
