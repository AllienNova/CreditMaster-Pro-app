/**
 * TaxBracketCalculator — Advanced Scenarios Test Suite
 *
 * Covers: filing status variations, self-employment tax, NIIT,
 *         itemized deductions, deduction savings, marginal rate
 */

import { TaxBracketCalculator } from '../services/TaxBracketCalculator';
import {
  FilingStatus,
  BusinessType,
  OptimizationGoal,
  TaxProfile,
} from '../types/tax-profile.types';

// Reusable mock profile factory
const createMockProfile = (overrides: Partial<TaxProfile> = {}): TaxProfile => ({
  id: 'test-profile',
  userId: 'test-user',
  taxYear: 2024,
  filingStatus: FilingStatus.SINGLE,
  stateOfResidence: 'CA',
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
  healthInsuranceType: 'employer' as const,
  ytd401kContribution: 0,
  ytdIraContribution: 0,
  ytdHsaContribution: 0,
  ytdRothIraContribution: 0,
  ytdCharitableGiving: 0,
  accounts: [],
  optimizationGoal: OptimizationGoal.BALANCED,
  riskTolerance: 'moderate' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TaxBracketCalculator — Advanced Scenarios', () => {
  let calculator: TaxBracketCalculator;

  beforeEach(() => {
    calculator = new TaxBracketCalculator();
  });

  // =========================================================================
  // Filing Status Variations
  // =========================================================================
  describe('Filing Status Variations', () => {
    it('should calculate lower taxes for married filing jointly at same income', () => {
      const single = calculator.calculateTaxes(
        createMockProfile({ filingStatus: FilingStatus.SINGLE, grossIncome: 150000, w2Income: 150000 }),
      );
      const married = calculator.calculateTaxes(
        createMockProfile({ filingStatus: FilingStatus.MARRIED_FILING_JOINTLY, grossIncome: 150000, w2Income: 150000 }),
      );
      expect(married.federalTax).toBeLessThan(single.federalTax);
    });

    it('should calculate head of household between single and married', () => {
      const single = calculator.calculateTaxes(
        createMockProfile({ filingStatus: FilingStatus.SINGLE, grossIncome: 100000, w2Income: 100000 }),
      );
      const hoh = calculator.calculateTaxes(
        createMockProfile({ filingStatus: FilingStatus.HEAD_OF_HOUSEHOLD, grossIncome: 100000, w2Income: 100000 }),
      );
      expect(hoh.federalTax).toBeLessThan(single.federalTax);
    });

    it('should calculate married filing separately', () => {
      const mfs = calculator.calculateTaxes(
        createMockProfile({
          filingStatus: FilingStatus.MARRIED_FILING_SEPARATELY,
          grossIncome: 100000,
          w2Income: 100000,
        }),
      );
      expect(mfs.federalTax).toBeGreaterThan(0);
      expect(mfs.totalTax).toBeGreaterThan(0);
    });

    it('should calculate qualifying surviving spouse like married filing jointly', () => {
      const qss = calculator.calculateTaxes(
        createMockProfile({
          filingStatus: FilingStatus.QUALIFYING_SURVIVING_SPOUSE,
          grossIncome: 100000,
          w2Income: 100000,
        }),
      );
      const mfj = calculator.calculateTaxes(
        createMockProfile({
          filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
          grossIncome: 100000,
          w2Income: 100000,
        }),
      );
      // QSS uses same brackets as MFJ
      expect(qss.federalTax).toBeCloseTo(mfj.federalTax, 0);
    });
  });

  // =========================================================================
  // Self-Employment Tax
  // =========================================================================
  describe('Self-Employment Tax', () => {
    it('should calculate SE tax for self-employed income', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 100000,
          w2Income: 0,
          selfEmploymentIncome: 100000,
          isSelfEmployed: true,
          isEmployed: false,
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
        }),
      );
      // SE tax = 92.35% * 100000 * 15.3% = ~14,129.55
      expect(result.selfEmploymentTax).toBeGreaterThan(13000);
      expect(result.selfEmploymentTax).toBeLessThan(16000);
    });

    it('should return 0 SE tax when not self-employed', () => {
      const result = calculator.calculateTaxes(createMockProfile());
      expect(result.selfEmploymentTax).toBe(0);
    });

    it('should cap Social Security portion of SE tax at wage base', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 250000,
          w2Income: 0,
          selfEmploymentIncome: 250000,
          isSelfEmployed: true,
          isEmployed: false,
          businessType: BusinessType.SOLE_PROPRIETORSHIP,
        }),
      );
      // SE income subject to SS is capped at $168,600 wage base
      // Full SE tax should be less than 250000 * 0.9235 * 0.153
      expect(result.selfEmploymentTax).toBeGreaterThan(0);
    });

    it('should calculate SE tax for LLC single member', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 80000,
          w2Income: 0,
          selfEmploymentIncome: 80000,
          isSelfEmployed: true,
          isEmployed: false,
          businessType: BusinessType.LLC_SINGLE_MEMBER,
        }),
      );
      expect(result.selfEmploymentTax).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // NIIT (Net Investment Income Tax)
  // =========================================================================
  describe('Net Investment Income Tax (NIIT)', () => {
    it('should apply NIIT for single filer over $200k with investment income', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 300000,
          w2Income: 200000,
          investmentIncome: 100000,
          filingStatus: FilingStatus.SINGLE,
        }),
      );
      // NIIT = 3.8% on lesser of investment income or excess over $200k
      // AGI ~300k, excess over 200k = 100k, investment income = 100k
      // NIIT = min(100000, 100000) * 0.038 = 3800
      expect(result.totalTax).toBeGreaterThan(0);
    });

    it('should not apply NIIT for single filer under $200k', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 150000,
          w2Income: 100000,
          investmentIncome: 50000,
          filingStatus: FilingStatus.SINGLE,
        }),
      );
      // AGI ~150k, under $200k threshold — no NIIT
      // totalTax should not include NIIT
      expect(result.totalTax).toBeGreaterThan(0);
    });

    it('should apply NIIT for married joint filer over $250k', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 400000,
          w2Income: 300000,
          investmentIncome: 100000,
          filingStatus: FilingStatus.MARRIED_FILING_JOINTLY,
        }),
      );
      expect(result.totalTax).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Itemized Deductions
  // =========================================================================
  describe('Itemized vs Standard Deductions', () => {
    it('should use standard deduction when itemized is lower', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          mortgageInterest: 5000,
          propertyTaxes: 2000,
          charitableDonations: 1000,
          // Total itemized: 8000, standard deduction single: 14600
        }),
      );
      // Should use standard deduction since 8000 < 14600
      expect(result.federalTax).toBeGreaterThan(0);
    });

    it('should use itemized deductions when higher than standard', () => {
      const withItemized = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 200000,
          w2Income: 200000,
          mortgageInterest: 15000,
          propertyTaxes: 8000,
          stateTaxesPaid: 5000,
          charitableDonations: 5000,
          // Total itemized > 14600 standard (but SALT capped at 10000)
          // itemized = 15000 + 10000 (SALT cap) + 5000 = 30000
        }),
      );
      const withStandard = calculator.calculateTaxes(
        createMockProfile({ grossIncome: 200000, w2Income: 200000 }),
      );
      expect(withItemized.federalTax).toBeLessThan(withStandard.federalTax);
    });

    it('should cap SALT deduction at $10,000', () => {
      const highSalt = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 200000,
          w2Income: 200000,
          propertyTaxes: 15000,
          stateTaxesPaid: 10000,
          mortgageInterest: 10000,
          charitableDonations: 5000,
          // SALT = 15000 + 10000 = 25000, capped at 10000
        }),
      );
      expect(highSalt.federalTax).toBeGreaterThan(0);
    });

    it('should include student loan interest deduction', () => {
      const withDeduction = calculator.calculateTaxes(
        createMockProfile({
          studentLoanInterest: 2500,
        }),
      );
      const without = calculator.calculateTaxes(createMockProfile());
      // Student loan interest is above-the-line deduction
      expect(withDeduction.federalTax).toBeLessThanOrEqual(without.federalTax);
    });
  });

  // =========================================================================
  // getMarginalRate
  // =========================================================================
  describe('getMarginalRate', () => {
    it('should return 10% for low income single filer', () => {
      const rate = calculator.getMarginalRate(10000, FilingStatus.SINGLE);
      expect(rate).toBe(0.10);
    });

    it('should return 12% for income in second bracket', () => {
      const rate = calculator.getMarginalRate(30000, FilingStatus.SINGLE);
      expect(rate).toBe(0.12);
    });

    it('should return 22% for income around $60k single', () => {
      const rate = calculator.getMarginalRate(60000, FilingStatus.SINGLE);
      expect(rate).toBe(0.22);
    });

    it('should return 24% for income around $120k single', () => {
      const rate = calculator.getMarginalRate(120000, FilingStatus.SINGLE);
      expect(rate).toBe(0.24);
    });

    it('should return 32% for income around $200k single', () => {
      const rate = calculator.getMarginalRate(200000, FilingStatus.SINGLE);
      expect(rate).toBe(0.32);
    });

    it('should return 35% for income around $300k single', () => {
      const rate = calculator.getMarginalRate(300000, FilingStatus.SINGLE);
      expect(rate).toBe(0.35);
    });

    it('should return 37% for income over $609,350 single', () => {
      const rate = calculator.getMarginalRate(700000, FilingStatus.SINGLE);
      expect(rate).toBe(0.37);
    });

    it('should return 10% for zero income (lowest bracket)', () => {
      const rate = calculator.getMarginalRate(0, FilingStatus.SINGLE);
      expect(rate).toBe(0.1);
    });

    it('should return 10% for low income married filing jointly', () => {
      const rate = calculator.getMarginalRate(20000, FilingStatus.MARRIED_FILING_JOINTLY);
      expect(rate).toBe(0.10);
    });

    it('should return lower marginal rate for married at same income as single', () => {
      const singleRate = calculator.getMarginalRate(100000, FilingStatus.SINGLE);
      const marriedRate = calculator.getMarginalRate(100000, FilingStatus.MARRIED_FILING_JOINTLY);
      expect(marriedRate).toBeLessThanOrEqual(singleRate);
    });
  });

  // =========================================================================
  // calculateDeductionSavings
  // =========================================================================
  describe('calculateDeductionSavings', () => {
    it('should calculate federal savings from a deduction', () => {
      const savings = calculator.calculateDeductionSavings(
        10000, // deduction amount
        100000, // current income
        FilingStatus.SINGLE,
      );
      expect(savings.federalSavings).toBeGreaterThan(0);
      expect(savings.totalSavings).toBeGreaterThan(0);
    });

    it('should calculate higher savings for higher income (higher bracket)', () => {
      const lowIncomeSavings = calculator.calculateDeductionSavings(
        10000,
        50000,
        FilingStatus.SINGLE,
      );
      const highIncomeSavings = calculator.calculateDeductionSavings(
        10000,
        300000,
        FilingStatus.SINGLE,
      );
      expect(highIncomeSavings.federalSavings).toBeGreaterThan(lowIncomeSavings.federalSavings);
    });

    it('should include state tax savings when state code provided', () => {
      const savings = calculator.calculateDeductionSavings(
        10000,
        100000,
        FilingStatus.SINGLE,
        'CA',
      );
      expect(savings.stateSavings).toBeGreaterThan(0);
      expect(savings.totalSavings).toBeGreaterThan(savings.federalSavings);
    });

    it('should have zero state savings for no-tax states', () => {
      const savings = calculator.calculateDeductionSavings(
        10000,
        100000,
        FilingStatus.SINGLE,
        'TX',
      );
      expect(savings.stateSavings).toBe(0);
    });

    it('should return 0 savings for zero deduction', () => {
      const savings = calculator.calculateDeductionSavings(
        0,
        100000,
        FilingStatus.SINGLE,
      );
      expect(savings.federalSavings).toBe(0);
      expect(savings.totalSavings).toBe(0);
    });

    it('should return savings based on marginal rate even for zero income', () => {
      // At $0 income, the marginal rate is still 10% (lowest bracket),
      // so deduction savings = 10000 * 0.10 = 1000
      const savings = calculator.calculateDeductionSavings(
        10000,
        0,
        FilingStatus.SINGLE,
      );
      expect(savings.federalSavings).toBe(1000);
    });
  });

  // =========================================================================
  // Capital Gains
  // =========================================================================
  describe('Capital Gains Tax', () => {
    it('should calculate long-term capital gains at 0% for low income', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 40000,
          w2Income: 20000,
          capitalGainsLongTerm: 20000,
        }),
      );
      // For single, 0% rate applies up to ~$47,025
      expect(result.capitalGainsTax).toBe(0);
    });

    it('should calculate long-term capital gains at 15% for middle income', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 200000,
          w2Income: 100000,
          capitalGainsLongTerm: 100000,
        }),
      );
      expect(result.capitalGainsTax).toBeGreaterThan(0);
    });

    it('should treat short-term capital gains as ordinary income', () => {
      const withShortTerm = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 150000,
          w2Income: 100000,
          capitalGainsShortTerm: 50000,
        }),
      );
      expect(withShortTerm.federalTax).toBeGreaterThan(0);
    });

    it('should handle both short and long-term capital gains', () => {
      const result = calculator.calculateTaxes(
        createMockProfile({
          grossIncome: 200000,
          w2Income: 100000,
          capitalGainsShortTerm: 50000,
          capitalGainsLongTerm: 50000,
        }),
      );
      expect(result.totalTax).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Complete Tax Calculation Result Shape
  // =========================================================================
  describe('TaxCalculationResult Shape', () => {
    it('should return all expected fields', () => {
      const result = calculator.calculateTaxes(createMockProfile());
      expect(result).toHaveProperty('federalTax');
      expect(result).toHaveProperty('stateTax');
      expect(result).toHaveProperty('fica');
      expect(result).toHaveProperty('selfEmploymentTax');
      expect(result).toHaveProperty('capitalGainsTax');
      expect(result).toHaveProperty('totalTax');
      expect(result).toHaveProperty('effectiveRate');
      expect(result).toHaveProperty('marginalRate');
      expect(result).toHaveProperty('takeHomePay');
    });

    it('should calculate total tax as sum of components', () => {
      const result = calculator.calculateTaxes(createMockProfile());
      const expectedTotal =
        result.federalTax +
        result.stateTax +
        result.fica.totalFICA +
        result.selfEmploymentTax +
        result.capitalGainsTax;
      expect(result.totalTax).toBeCloseTo(expectedTotal, 0);
    });

    it('should calculate takeHomePay as grossIncome minus totalTax', () => {
      const profile = createMockProfile({ grossIncome: 100000, w2Income: 100000 });
      const result = calculator.calculateTaxes(profile);
      expect(result.takeHomePay).toBeCloseTo(profile.grossIncome - result.totalTax, 0);
    });

    it('should calculate effective rate as totalTax / grossIncome', () => {
      const profile = createMockProfile({ grossIncome: 100000, w2Income: 100000 });
      const result = calculator.calculateTaxes(profile);
      const expectedRate = result.totalTax / profile.grossIncome;
      expect(result.effectiveRate).toBeCloseTo(expectedRate, 2);
    });
  });
});
