/**
 * TaxBracketCalculator Unit Tests
 *
 * Tests for the main tax calculation service.
 */

// Using Jest - no explicit imports needed for describe, it, expect, beforeEach
import { TaxBracketCalculator } from "../services/TaxBracketCalculator";
import { FilingStatus, BusinessType, OptimizationGoal } from "../types";
import type { TaxProfile } from "../types";

describe("TaxBracketCalculator", () => {
  let calculator: TaxBracketCalculator;

  beforeEach(() => {
    calculator = new TaxBracketCalculator(2024);
  });

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

  describe("calculateTaxes", () => {
    it("calculates taxes for a basic single filer", () => {
      const profile = createMockProfile({ grossIncome: 100000 });
      const result = calculator.calculateTaxes(profile);

      expect(result.grossIncome).toBe(100000);
      expect(result.federalTax).toBeGreaterThan(0);
      expect(result.stateTax).toBeGreaterThan(0);
      expect(result.totalTax).toBeGreaterThan(0);
      expect(result.takeHomePay).toBeLessThan(100000);
      expect(result.effectiveRate).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeLessThan(0.5);
    });

    it("reduces taxable income with 401k contributions", () => {
      const baseProfile = createMockProfile({ grossIncome: 100000 });
      const optimizedProfile = createMockProfile({
        grossIncome: 100000,
        ytd401kContribution: 23000,
      });

      const baseResult = calculator.calculateTaxes(baseProfile);
      const optimizedResult = calculator.calculateTaxes(optimizedProfile);

      expect(optimizedResult.adjustedGrossIncome).toBeLessThan(
        baseResult.adjustedGrossIncome,
      );
      expect(optimizedResult.totalTax).toBeLessThan(baseResult.totalTax);
      expect(optimizedResult.takeHomePay).toBeGreaterThan(
        baseResult.takeHomePay - 23000,
      );
    });

    it("calculates FICA taxes correctly", () => {
      const profile = createMockProfile({ grossIncome: 100000 });
      const result = calculator.calculateTaxes(profile);

      // Social Security: 6.2% of wages up to cap
      // Medicare: 1.45% of all wages
      expect(result.fica.socialSecurityTax).toBeCloseTo(6200, -1);
      expect(result.fica.medicareTax).toBeCloseTo(1450, -1);
      expect(result.fica.totalFICA).toBe(
        result.fica.socialSecurityTax +
          result.fica.medicareTax +
          result.fica.additionalMedicareTax,
      );
    });

    it("applies Additional Medicare Tax for high earners", () => {
      const profile = createMockProfile({
        grossIncome: 300000,
        w2Income: 300000,
      });
      const result = calculator.calculateTaxes(profile);

      // Additional Medicare Tax: 0.9% on wages over $200,000
      expect(result.fica.additionalMedicareTax).toBeGreaterThan(0);
    });

    it("returns zero state tax for no-income-tax states", () => {
      const profile = createMockProfile({
        grossIncome: 100000,
        stateOfResidence: "TX",
      });
      const result = calculator.calculateTaxes(profile);

      expect(result.stateTax).toBe(0);
    });

    it("calculates monthly take-home correctly", () => {
      const profile = createMockProfile({ grossIncome: 120000 });
      const result = calculator.calculateTaxes(profile);

      expect(result.monthlyTakeHome).toBe(result.takeHomePay / 12);
    });

    it("handles zero income", () => {
      const profile = createMockProfile({ grossIncome: 0, w2Income: 0 });
      const result = calculator.calculateTaxes(profile);

      expect(result.totalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
      expect(result.takeHomePay).toBe(0);
    });

    it("calculates higher taxes for high earners", () => {
      const lowEarner = createMockProfile({ grossIncome: 50000 });
      const highEarner = createMockProfile({ grossIncome: 500000 });

      const lowResult = calculator.calculateTaxes(lowEarner);
      const highResult = calculator.calculateTaxes(highEarner);

      expect(highResult.effectiveRate).toBeGreaterThan(lowResult.effectiveRate);
      expect(highResult.marginalRate).toBeGreaterThan(lowResult.marginalRate);
    });

    it("calculates capital gains tax for long-term gains", () => {
      const profile = createMockProfile({
        grossIncome: 100000,
        capitalGainsLongTerm: 50000,
      });
      const result = calculator.calculateTaxes(profile);

      expect(result.capitalGainsTax).toBeGreaterThan(0);
    });

    it("respects HSA contribution deductions", () => {
      const baseProfile = createMockProfile({
        grossIncome: 100000,
        hasHdhp: true,
      });
      const withHSA = createMockProfile({
        grossIncome: 100000,
        hasHdhp: true,
        ytdHsaContribution: 4150,
      });

      const baseResult = calculator.calculateTaxes(baseProfile);
      const hsaResult = calculator.calculateTaxes(withHSA);

      expect(hsaResult.adjustedGrossIncome).toBeLessThan(
        baseResult.adjustedGrossIncome,
      );
    });
  });
});
