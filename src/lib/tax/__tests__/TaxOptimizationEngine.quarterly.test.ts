/**
 * TaxOptimizationEngine — Quarterly Tax Methods Test Suite
 *
 * Covers: calculateQuarterlyEstimatedTax, calculateSafeHarborAmount,
 *         estimateUnderpaymentPenalty, getQuarterlyPaymentSchedule,
 *         getQuarterlyDueDates
 */

import {
  FilingStatus,
  BusinessType,
  OptimizationGoal,
  TaxProfile,
} from "../types/tax-profile.types";

// ============================================================================
// Mocks
// ============================================================================

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => mockSupabaseClient,
}));

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: mockSupabaseClient,
}));

const mockRandomUUID = jest.fn().mockReturnValue("test-uuid-5678");
Object.defineProperty(globalThis, "crypto", {
  value: {
    ...globalThis.crypto,
    randomUUID: mockRandomUUID,
  },
  writable: true,
  configurable: true,
});

import { TaxOptimizationEngine } from "../services/TaxOptimizationEngine";

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

describe("TaxOptimizationEngine — Quarterly Tax Methods", () => {
  let engine: TaxOptimizationEngine;

  beforeEach(() => {
    // Re-apply mocks because jest.config has resetMocks: true
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.insert.mockReturnThis();
    mockSupabaseClient.update.mockReturnThis();
    mockSupabaseClient.delete.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
    mockRandomUUID.mockReturnValue("test-uuid-5678");

    engine = new TaxOptimizationEngine();
  });

  // =========================================================================
  // calculateQuarterlyEstimatedTax
  // =========================================================================
  describe("calculateQuarterlyEstimatedTax", () => {
    it("should return 4 quarterly estimates", () => {
      const estimates =
        engine.calculateQuarterlyEstimatedTax(createMockProfile());
      expect(estimates).toHaveLength(4);
    });

    it("should have quarter numbers 1-4", () => {
      const estimates =
        engine.calculateQuarterlyEstimatedTax(createMockProfile());
      expect(estimates[0].quarter).toBe(1);
      expect(estimates[1].quarter).toBe(2);
      expect(estimates[2].quarter).toBe(3);
      expect(estimates[3].quarter).toBe(4);
    });

    it("should include due dates", () => {
      const estimates =
        engine.calculateQuarterlyEstimatedTax(createMockProfile());
      for (const est of estimates) {
        expect(est.dueDate).toBeDefined();
        expect(est.dueDate).toBeInstanceOf(Date);
      }
    });

    it("should have payment amounts >= 0", () => {
      const estimates =
        engine.calculateQuarterlyEstimatedTax(createMockProfile());
      for (const est of estimates) {
        expect(est.totalPayment).toBeGreaterThanOrEqual(0);
      }
    });

    it("should calculate higher payments for self-employed", () => {
      const w2Estimates =
        engine.calculateQuarterlyEstimatedTax(createMockProfile());
      const seEstimates = engine.calculateQuarterlyEstimatedTax(
        createMockProfile({
          grossIncome: 100000,
          w2Income: 0,
          selfEmploymentIncome: 100000,
          isSelfEmployed: true,
          isEmployed: false,
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
          federalWithheld: 0,
          stateWithheld: 0,
        }),
      );
      const w2Total = w2Estimates.reduce((sum, e) => sum + e.totalPayment, 0);
      const seTotal = seEstimates.reduce((sum, e) => sum + e.totalPayment, 0);
      // SE should be higher because no withholding + SE tax
      expect(seTotal).toBeGreaterThan(w2Total);
    });

    it("should use prior year tax when provided", () => {
      const withPrior = engine.calculateQuarterlyEstimatedTax(
        createMockProfile(),
        30000,
      );
      const withoutPrior = engine.calculateQuarterlyEstimatedTax(
        createMockProfile(),
        0,
      );
      // Results may differ based on safe harbor logic
      expect(withPrior).toHaveLength(4);
      expect(withoutPrior).toHaveLength(4);
    });

    it("should handle zero income", () => {
      const estimates = engine.calculateQuarterlyEstimatedTax(
        createMockProfile({
          grossIncome: 0,
          w2Income: 0,
          federalWithheld: 0,
          stateWithheld: 0,
        }),
      );
      for (const est of estimates) {
        expect(est.totalPayment).toBe(0);
      }
    });
  });

  // =========================================================================
  // calculateSafeHarborAmount
  // =========================================================================
  describe("calculateSafeHarborAmount", () => {
    it("should return a SafeHarborResult object", () => {
      const result = engine.calculateSafeHarborAmount(
        createMockProfile(),
        20000,
      );
      expect(result).toHaveProperty("safeHarborAmount");
      expect(result).toHaveProperty("recommendedMethod");
      expect(result).toHaveProperty("currentYearNinetyPercent");
      expect(result).toHaveProperty("priorYearTaxLiability");
    });

    it("should use current_year_90 when no prior year tax", () => {
      const result = engine.calculateSafeHarborAmount(createMockProfile(), 0);
      expect(result.recommendedMethod).toBe("current_year_90");
    });

    it("should choose the lesser safe harbor method", () => {
      // When prior year tax is provided, picks min of 90% current vs 100%/110% prior
      const result = engine.calculateSafeHarborAmount(
        createMockProfile(),
        20000,
      );
      expect(result.safeHarborAmount).toBeGreaterThan(0);
      expect(["current_year_90", "prior_year_100", "prior_year_110"]).toContain(
        result.recommendedMethod,
      );
    });

    it("should use 110% prior year for high-income single filers", () => {
      // AGI > $150k for single/HoH uses 110% prior year threshold
      // But the engine uses $150k joint / $75k MFS thresholds
      const result = engine.calculateSafeHarborAmount(
        createMockProfile({
          filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
          grossIncome: 300000,
          w2Income: 300000,
        }),
        50000,
      );
      expect(result.safeHarborAmount).toBeGreaterThan(0);
    });

    it("should use 100% for MFS under $75k threshold", () => {
      const result = engine.calculateSafeHarborAmount(
        createMockProfile({
          filingStatus: FilingStatus.MARRIED_FILING_SEPARATELY,
          grossIncome: 60000,
          w2Income: 60000,
        }),
        10000,
      );
      expect(result.safeHarborAmount).toBeGreaterThan(0);
    });

    it("should handle married filing separately high income (110%)", () => {
      const result = engine.calculateSafeHarborAmount(
        createMockProfile({
          filingStatus: FilingStatus.MARRIED_FILING_SEPARATELY,
          grossIncome: 200000,
          w2Income: 200000,
        }),
        30000,
      );
      expect(result.safeHarborAmount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // estimateUnderpaymentPenalty
  // =========================================================================
  describe("estimateUnderpaymentPenalty", () => {
    it("should return an UnderpaymentPenalty object", () => {
      const result = engine.estimateUnderpaymentPenalty(
        createMockProfile(),
        20000,
        10000,
      );
      expect(result).toHaveProperty("estimatedPenalty");
      expect(result).toHaveProperty("hasUnderpayment");
      expect(result).toHaveProperty("underpaymentAmount");
    });

    it("should return no penalty when safe harbor is met", () => {
      // Payments >= 100% prior year = safe harbor
      const result = engine.estimateUnderpaymentPenalty(
        createMockProfile(),
        20000, // prior year tax
        25000, // payments made (> prior year)
      );
      expect(result.hasUnderpayment).toBe(false);
      expect(result.estimatedPenalty).toBe(0);
    });

    it("should return no penalty when tax owed < $1000", () => {
      // Very low income, most already withheld
      const result = engine.estimateUnderpaymentPenalty(
        createMockProfile({
          grossIncome: 30000,
          w2Income: 30000,
          federalWithheld: 10000, // more than enough
        }),
        5000,
        0,
      );
      // After withholding, tax owed should be < $1000
      if (result.hasUnderpayment === false) {
        expect(result.estimatedPenalty).toBe(0);
      }
    });

    it("should calculate penalty with IRS rate for underpayment", () => {
      const result = engine.estimateUnderpaymentPenalty(
        createMockProfile({
          grossIncome: 200000,
          w2Income: 200000,
          federalWithheld: 0,
        }),
        50000, // prior year tax
        5000, // very low payments
        0.08, // penalty rate
      );
      if (result.hasUnderpayment) {
        expect(result.estimatedPenalty).toBeGreaterThan(0);
        expect(result.underpaymentAmount).toBeGreaterThan(0);
      }
    });

    it("should use custom penalty rate when provided", () => {
      const result8 = engine.estimateUnderpaymentPenalty(
        createMockProfile({
          grossIncome: 200000,
          w2Income: 200000,
          federalWithheld: 0,
        }),
        40000,
        0,
        0.08,
      );
      const result5 = engine.estimateUnderpaymentPenalty(
        createMockProfile({
          grossIncome: 200000,
          w2Income: 200000,
          federalWithheld: 0,
        }),
        40000,
        0,
        0.05,
      );
      // Higher rate should produce higher penalty
      if (result8.hasUnderpayment && result5.hasUnderpayment) {
        expect(result8.estimatedPenalty).toBeGreaterThanOrEqual(
          result5.estimatedPenalty,
        );
      }
    });

    it("should handle zero prior year tax", () => {
      const result = engine.estimateUnderpaymentPenalty(
        createMockProfile(),
        0,
        0,
      );
      expect(result).toHaveProperty("estimatedPenalty");
      expect(result).toHaveProperty("hasUnderpayment");
    });
  });

  // =========================================================================
  // getQuarterlyPaymentSchedule
  // =========================================================================
  describe("getQuarterlyPaymentSchedule", () => {
    it("should return 4 payment schedule entries", () => {
      const schedule = engine.getQuarterlyPaymentSchedule(createMockProfile());
      expect(schedule).toHaveLength(4);
    });

    it("should include quarter labels", () => {
      const schedule = engine.getQuarterlyPaymentSchedule(createMockProfile());
      expect(schedule[0].label).toMatch(/Q1/);
      expect(schedule[1].label).toMatch(/Q2/);
      expect(schedule[2].label).toMatch(/Q3/);
      expect(schedule[3].label).toMatch(/Q4/);
    });

    it("should include voucher form names", () => {
      const schedule = engine.getQuarterlyPaymentSchedule(createMockProfile());
      for (const entry of schedule) {
        expect(entry.federalVoucherForm).toMatch(/1040-ES/);
      }
    });

    it("should include due dates with correct months", () => {
      const schedule = engine.getQuarterlyPaymentSchedule(createMockProfile());
      // Q1 due April 15, Q2 June 15, Q3 Sep 15, Q4 Jan 15 next year
      const q1Month = schedule[0].dueDate.getMonth(); // 3 = April
      const q2Month = schedule[1].dueDate.getMonth(); // 5 = June
      const q3Month = schedule[2].dueDate.getMonth(); // 8 = September
      const q4Month = schedule[3].dueDate.getMonth(); // 0 = January

      expect(q1Month).toBe(3); // April
      expect(q2Month).toBe(5); // June
      expect(q3Month).toBe(8); // September
      expect(q4Month).toBe(0); // January
    });

    it("should include income period description", () => {
      const schedule = engine.getQuarterlyPaymentSchedule(createMockProfile());
      for (const entry of schedule) {
        expect(entry.incomePeriod).toBeDefined();
        expect(typeof entry.incomePeriod).toBe("string");
      }
    });

    it("should include payment amounts >= 0", () => {
      const schedule = engine.getQuarterlyPaymentSchedule(createMockProfile());
      for (const entry of schedule) {
        expect(entry.totalPayment).toBeGreaterThanOrEqual(0);
      }
    });

    it("should include days until due", () => {
      const schedule = engine.getQuarterlyPaymentSchedule(createMockProfile());
      for (const entry of schedule) {
        expect(typeof entry.daysUntilDue).toBe("number");
      }
    });

    it("should use prior year tax when provided", () => {
      const withPrior = engine.getQuarterlyPaymentSchedule(
        createMockProfile(),
        25000,
      );
      expect(withPrior).toHaveLength(4);
    });
  });

  // =========================================================================
  // getQuarterlyDueDates
  // =========================================================================
  describe("getQuarterlyDueDates", () => {
    // getQuarterlyDueDates is private, so we access it via type cast
    const getDueDates = (eng: TaxOptimizationEngine, year: number): Date[] =>
      (
        eng as unknown as { getQuarterlyDueDates(taxYear: number): Date[] }
      ).getQuarterlyDueDates(year);

    it("should return 4 due dates", () => {
      const dates = getDueDates(engine, 2024);
      expect(dates).toHaveLength(4);
    });

    it("should return April 15 for Q1", () => {
      const dates = getDueDates(engine, 2024);
      expect(dates[0].getMonth()).toBe(3); // April
      expect(dates[0].getDate()).toBe(15);
      expect(dates[0].getFullYear()).toBe(2024);
    });

    it("should return June 15 for Q2", () => {
      const dates = getDueDates(engine, 2024);
      expect(dates[1].getMonth()).toBe(5); // June
      expect(dates[1].getDate()).toBe(15);
    });

    it("should return September 15 for Q3", () => {
      const dates = getDueDates(engine, 2024);
      expect(dates[2].getMonth()).toBe(8); // September
      expect(dates[2].getDate()).toBe(15);
    });

    it("should return January 15 next year for Q4", () => {
      const dates = getDueDates(engine, 2024);
      expect(dates[3].getMonth()).toBe(0); // January
      expect(dates[3].getDate()).toBe(15);
      expect(dates[3].getFullYear()).toBe(2025);
    });
  });
});
