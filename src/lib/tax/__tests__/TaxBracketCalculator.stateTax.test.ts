/**
 * TaxBracketCalculator — State Tax Methods Test Suite
 *
 * Covers: calculateStateTaxPublic, getStateTaxRate, getStateTaxSummary,
 *         compareStateTaxes, getNoIncomeTaxStates, getStateTaxBrackets
 */

import { TaxBracketCalculator } from '../services/TaxBracketCalculator';
import { FilingStatus } from '../types/tax-profile.types';

describe('TaxBracketCalculator — State Tax Methods', () => {
  let calculator: TaxBracketCalculator;

  beforeEach(() => {
    calculator = new TaxBracketCalculator();
  });

  // =========================================================================
  // calculateStateTaxPublic
  // =========================================================================
  describe('calculateStateTaxPublic', () => {
    it('should return 0 for no-income-tax states', () => {
      const noTaxStates = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];
      for (const state of noTaxStates) {
        const tax = calculator.calculateStateTaxPublic(100000, state, FilingStatus.SINGLE);
        expect(tax).toBe(0);
      }
    });

    it('should calculate flat-rate state tax for IL', () => {
      // IL: 4.95% flat, personalExemption: 2625, standardDeduction: 0
      // taxable = 100000 - 2625 = 97375
      // tax = 97375 * 0.0495 = 4820.0625
      const tax = calculator.calculateStateTaxPublic(100000, 'IL', FilingStatus.SINGLE);
      expect(tax).toBeGreaterThan(4000);
      expect(tax).toBeLessThan(5500);
    });

    it('should calculate flat-rate state tax for PA', () => {
      // PA: 3.07% flat, no deduction, no exemption
      // tax = 100000 * 0.0307 = 3070
      const tax = calculator.calculateStateTaxPublic(100000, 'PA', FilingStatus.SINGLE);
      expect(tax).toBeCloseTo(3070, -1);
    });

    it('should calculate progressive state tax for CA', () => {
      // CA has 10 brackets, progressive rates from 1% to 13.3%
      const tax = calculator.calculateStateTaxPublic(100000, 'CA', FilingStatus.SINGLE);
      expect(tax).toBeGreaterThan(3000);
      expect(tax).toBeLessThan(10000);
    });

    it('should calculate progressive state tax for NY', () => {
      const tax = calculator.calculateStateTaxPublic(150000, 'NY', FilingStatus.SINGLE);
      expect(tax).toBeGreaterThan(5000);
      expect(tax).toBeLessThan(15000);
    });

    it('should return 0 for zero income', () => {
      const tax = calculator.calculateStateTaxPublic(0, 'CA', FilingStatus.SINGLE);
      expect(tax).toBe(0);
    });

    it('should return 0 for negative income', () => {
      const tax = calculator.calculateStateTaxPublic(-50000, 'CA', FilingStatus.SINGLE);
      expect(tax).toBe(0);
    });

    it('should handle married filing jointly for CA', () => {
      const singleTax = calculator.calculateStateTaxPublic(100000, 'CA', FilingStatus.SINGLE);
      const marriedTax = calculator.calculateStateTaxPublic(100000, 'CA', FilingStatus.MARRIED_FILING_JOINTLY);
      // Married filing jointly typically has wider brackets / larger deductions
      expect(marriedTax).toBeLessThanOrEqual(singleTax);
    });

    it('should handle unknown state code gracefully', () => {
      const tax = calculator.calculateStateTaxPublic(100000, 'ZZ', FilingStatus.SINGLE);
      expect(tax).toBe(0);
    });

    it('should handle high income for CA (top bracket 13.3%)', () => {
      const tax = calculator.calculateStateTaxPublic(2000000, 'CA', FilingStatus.SINGLE);
      // At $2M, significant portion at 13.3%
      expect(tax).toBeGreaterThan(150000);
    });

    it('should handle income below standard deduction', () => {
      // CA standard deduction is 5540 for single
      const tax = calculator.calculateStateTaxPublic(3000, 'CA', FilingStatus.SINGLE);
      expect(tax).toBe(0);
    });
  });

  // =========================================================================
  // getStateTaxRate
  // =========================================================================
  describe('getStateTaxRate', () => {
    it('should return 0 for no-income-tax states', () => {
      expect(calculator.getStateTaxRate('TX', 100000)).toBe(0);
      expect(calculator.getStateTaxRate('FL', 100000)).toBe(0);
      expect(calculator.getStateTaxRate('WA', 100000)).toBe(0);
    });

    it('should return effective rate for flat-tax states', () => {
      // IL: 4.95% flat, personalExemption: 2625
      // taxable = 100000 - 2625 = 97375, tax = 97375 * 0.0495 = 4820.06
      // effective rate = 4820.06 / 100000 = ~0.0482
      const rate = calculator.getStateTaxRate('IL', 100000);
      expect(rate).toBeGreaterThan(0.045);
      expect(rate).toBeLessThan(0.05);
    });

    it('should return effective rate for progressive states', () => {
      const rate = calculator.getStateTaxRate('CA', 100000);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(0.133); // Less than top marginal rate
    });

    it('should return 0 for zero income', () => {
      const rate = calculator.getStateTaxRate('CA', 0);
      expect(rate).toBe(0);
    });

    it('should return 0 for unknown state', () => {
      const rate = calculator.getStateTaxRate('XX', 100000);
      expect(rate).toBe(0);
    });

    it('should return higher effective rate for higher income in progressive states', () => {
      const lowRate = calculator.getStateTaxRate('CA', 50000);
      const highRate = calculator.getStateTaxRate('CA', 500000);
      expect(highRate).toBeGreaterThan(lowRate);
    });
  });

  // =========================================================================
  // getStateTaxSummary
  // =========================================================================
  describe('getStateTaxSummary', () => {
    it('should return complete summary for CA', () => {
      const summary = calculator.getStateTaxSummary(100000, 'CA', FilingStatus.SINGLE);
      expect(summary).toHaveProperty('stateCode', 'CA');
      expect(summary).toHaveProperty('stateName');
      expect(summary).toHaveProperty('stateTax');
      expect(summary).toHaveProperty('stateEffectiveRate');
      expect(summary).toHaveProperty('stateMarginalRate');
      expect(summary).toHaveProperty('bracketBreakdown');
      expect(summary.stateTax).toBeGreaterThan(0);
      expect(summary.stateEffectiveRate).toBeGreaterThan(0);
      expect(summary.stateEffectiveRate).toBeLessThan(1);
    });

    it('should return zero summary for no-tax states', () => {
      const summary = calculator.getStateTaxSummary(100000, 'TX', FilingStatus.SINGLE);
      expect(summary.stateCode).toBe('TX');
      expect(summary.stateTax).toBe(0);
      expect(summary.stateEffectiveRate).toBe(0);
    });

    it('should return summary for flat-tax state IL', () => {
      const summary = calculator.getStateTaxSummary(100000, 'IL', FilingStatus.SINGLE);
      expect(summary.stateCode).toBe('IL');
      expect(summary.stateTax).toBeGreaterThan(0);
      // IL flat rate ~4.95%, effective ~4.82% after personal exemption
      expect(summary.stateEffectiveRate).toBeGreaterThan(0.03);
      expect(summary.stateEffectiveRate).toBeLessThan(0.06);
    });

    it('should handle zero income', () => {
      const summary = calculator.getStateTaxSummary(0, 'CA', FilingStatus.SINGLE);
      expect(summary.stateTax).toBe(0);
      expect(summary.stateEffectiveRate).toBe(0);
    });

    it('should handle married filing jointly', () => {
      const summary = calculator.getStateTaxSummary(200000, 'NY', FilingStatus.MARRIED_FILING_JOINTLY);
      expect(summary.stateTax).toBeGreaterThan(0);
      expect(summary.stateCode).toBe('NY');
    });

    it('should include bracket breakdown', () => {
      const summary = calculator.getStateTaxSummary(100000, 'CA', FilingStatus.SINGLE);
      expect(Array.isArray(summary.bracketBreakdown)).toBe(true);
      expect(summary.bracketBreakdown.length).toBeGreaterThan(0);
    });

    it('should handle unknown state gracefully', () => {
      const summary = calculator.getStateTaxSummary(100000, 'ZZ', FilingStatus.SINGLE);
      expect(summary.stateTax).toBe(0);
    });
  });

  // =========================================================================
  // compareStateTaxes
  // =========================================================================
  describe('compareStateTaxes', () => {
    it('should compare multiple states', () => {
      const comparisons = calculator.compareStateTaxes(
        100000,
        ['CA', 'TX', 'NY', 'FL'],
        FilingStatus.SINGLE,
      );
      expect(comparisons).toHaveLength(4);
    });

    it('should show TX and FL as zero-tax states', () => {
      const comparisons = calculator.compareStateTaxes(
        100000,
        ['TX', 'FL'],
        FilingStatus.SINGLE,
      );
      for (const comp of comparisons) {
        expect(comp.stateTax).toBe(0);
      }
    });

    it('should show CA higher than TX', () => {
      const comparisons = calculator.compareStateTaxes(
        100000,
        ['CA', 'TX'],
        FilingStatus.SINGLE,
      );
      const ca = comparisons.find(c => c.stateCode === 'CA');
      const tx = comparisons.find(c => c.stateCode === 'TX');
      expect(ca!.stateTax).toBeGreaterThan(tx!.stateTax);
    });

    it('should handle empty state list', () => {
      const comparisons = calculator.compareStateTaxes(100000, [], FilingStatus.SINGLE);
      expect(comparisons).toHaveLength(0);
    });

    it('should handle single state', () => {
      const comparisons = calculator.compareStateTaxes(100000, ['IL'], FilingStatus.SINGLE);
      expect(comparisons).toHaveLength(1);
      expect(comparisons[0].stateCode).toBe('IL');
    });

    it('should include all required fields in comparison', () => {
      const comparisons = calculator.compareStateTaxes(
        100000,
        ['CA'],
        FilingStatus.SINGLE,
      );
      expect(comparisons[0]).toHaveProperty('stateCode');
      expect(comparisons[0]).toHaveProperty('stateTax');
      expect(comparisons[0]).toHaveProperty('stateEffectiveRate');
    });
  });

  // =========================================================================
  // getNoIncomeTaxStates
  // =========================================================================
  describe('getNoIncomeTaxStates', () => {
    it('should return all 9 no-income-tax states', () => {
      const noTaxStates = calculator.getNoIncomeTaxStates();
      expect(noTaxStates.length).toBe(9);
    });

    it('should include expected states', () => {
      const noTaxStates = calculator.getNoIncomeTaxStates();
      const codes = noTaxStates.map(s => s.stateCode);
      expect(codes).toContain('AK');
      expect(codes).toContain('FL');
      expect(codes).toContain('NV');
      expect(codes).toContain('TX');
      expect(codes).toContain('WA');
      expect(codes).toContain('WY');
      expect(codes).toContain('SD');
      expect(codes).toContain('NH');
      expect(codes).toContain('TN');
    });

    it('should include state names', () => {
      const noTaxStates = calculator.getNoIncomeTaxStates();
      for (const state of noTaxStates) {
        expect(state.stateName).toBeTruthy();
        expect(typeof state.stateName).toBe('string');
      }
    });

    it('should not include states with income tax', () => {
      const noTaxStates = calculator.getNoIncomeTaxStates();
      const codes = noTaxStates.map(s => s.stateCode);
      expect(codes).not.toContain('CA');
      expect(codes).not.toContain('NY');
      expect(codes).not.toContain('IL');
    });
  });

  // =========================================================================
  // getStateTaxBrackets
  // =========================================================================
  describe('getStateTaxBrackets', () => {
    it('should return empty brackets for no-tax states', () => {
      const brackets = calculator.getStateTaxBrackets('TX');
      expect(brackets).toHaveLength(0);
    });

    it('should return single bracket for flat-tax states', () => {
      const brackets = calculator.getStateTaxBrackets('IL');
      expect(brackets.length).toBe(1);
      expect(brackets[0].rate).toBeCloseTo(0.0495, 3);
    });

    it('should return multiple brackets for progressive states', () => {
      const brackets = calculator.getStateTaxBrackets('CA');
      expect(brackets.length).toBeGreaterThan(1);
    });

    it('should have ascending rates for progressive states', () => {
      const brackets = calculator.getStateTaxBrackets('CA');
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].rate).toBeGreaterThanOrEqual(brackets[i - 1].rate);
      }
    });

    it('should return empty for unknown state', () => {
      const brackets = calculator.getStateTaxBrackets('ZZ');
      expect(brackets).toHaveLength(0);
    });

    it('should have min and max for each bracket', () => {
      const brackets = calculator.getStateTaxBrackets('CA');
      for (const bracket of brackets) {
        expect(typeof bracket.rate).toBe('number');
        expect(typeof bracket.min).toBe('number');
        expect(typeof bracket.max).toBe('number');
        expect(bracket.max).toBeGreaterThan(bracket.min);
      }
    });

    it('should return PA bracket at 3.07%', () => {
      const brackets = calculator.getStateTaxBrackets('PA');
      expect(brackets.length).toBe(1);
      expect(brackets[0].rate).toBeCloseTo(0.0307, 3);
    });
  });
});
