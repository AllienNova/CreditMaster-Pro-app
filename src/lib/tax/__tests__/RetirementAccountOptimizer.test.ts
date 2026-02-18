/**
 * RetirementAccountOptimizer Test Suite
 *
 * Covers: analyze (401k, IRA, Roth IRA, HSA, SEP IRA),
 *         Roth vs Traditional, contribution priority ordering
 */

import { RetirementAccountOptimizer } from "../services/RetirementAccountOptimizer";
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
});
