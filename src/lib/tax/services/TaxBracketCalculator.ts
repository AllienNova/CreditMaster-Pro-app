/**
 * Tax Bracket Calculator Service
 *
 * Calculates federal and state income taxes with support for:
 * - Progressive tax brackets (federal and state)
 * - Multiple filing statuses
 * - FICA taxes (Social Security, Medicare, Additional Medicare)
 * - Net Investment Income Tax (NIIT)
 * - Self-employment tax
 *
 * ARCHITECTURE NOTES:
 * - Tax tables are loaded from configuration, not hardcoded
 * - Designed for easy updates when legislation changes
 * - All calculations are auditable with breakdown details
 *
 * @module TaxBracketCalculator
 */

import {
  FilingStatus,
  TaxProfile,
  CONTRIBUTION_LIMITS_2024,
  INCOME_THRESHOLDS_2024,
} from '../types/tax-profile.types';
import {
  FEDERAL_TAX_BRACKETS_2024,
  LTCG_BRACKETS_2024,
  STATE_TAX_INFO,
  FICA_RATES_2024,
  TaxBracket,
  getStateTaxInfo,
} from '../types/tax-jurisdiction.types';
import type { TaxProjection } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface TaxCalculationBreakdown {
  bracketDetails: {
    bracket: number;
    rate: number;
    taxableInBracket: number;
    taxFromBracket: number;
  }[];
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
}

interface FICABreakdown {
  socialSecurityTax: number;
  socialSecurityWages: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalFICA: number;
}

export interface TaxCalculationResult {
  // Income
  grossIncome: number;
  adjustedGrossIncome: number;
  taxableIncome: number;

  // Federal
  federalTax: number;
  federalBreakdown: TaxCalculationBreakdown;

  // State
  stateTax: number;
  stateBreakdown?: TaxCalculationBreakdown;

  // FICA
  fica: FICABreakdown;
  selfEmploymentTax: number;

  // Additional Taxes
  niit: number;
  capitalGainsTax: number;

  // Credits (placeholders for now)
  totalCredits: number;

  // Totals
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  takeHomePay: number;
  monthlyTakeHome: number;
}

// ============================================================================
// TAX BRACKET CALCULATOR CLASS
// ============================================================================

export class TaxBracketCalculator {
  private taxYear: number;
  private federalBrackets: typeof FEDERAL_TAX_BRACKETS_2024;
  private ltcgBrackets: typeof LTCG_BRACKETS_2024;

  constructor(taxYear: number = new Date().getFullYear()) {
    this.taxYear = taxYear;
    this.federalBrackets = FEDERAL_TAX_BRACKETS_2024;
    this.ltcgBrackets = LTCG_BRACKETS_2024;
  }

  /**
   * Calculate complete tax liability for a user profile
   */
  calculateTaxes(profile: TaxProfile): TaxCalculationResult {
    const filingStatus = this.mapFilingStatus(profile.filingStatus);

    // Step 1: Calculate Adjusted Gross Income (AGI)
    const agi = this.calculateAGI(profile);

    // Step 2: Calculate Taxable Income
    const taxableIncome = this.calculateTaxableIncome(agi, profile);

    // Step 3: Calculate Federal Income Tax on Ordinary Income
    const ordinaryIncome = taxableIncome - profile.capitalGainsLongTerm;
    const federalBreakdown = this.calculateProgressiveTax(
      Math.max(0, ordinaryIncome),
      this.federalBrackets[filingStatus]
    );

    // Step 4: Calculate Long-Term Capital Gains Tax
    const capitalGainsTax = this.calculateCapitalGainsTax(
      profile.capitalGainsLongTerm,
      taxableIncome,
      filingStatus
    );

    // Step 5: Calculate State Tax
    const { stateTax, stateBreakdown } = this.calculateStateTax(
      taxableIncome,
      profile.stateOfResidence,
      filingStatus
    );

    // Step 6: Calculate FICA Taxes
    const fica = this.calculateFICA(profile);

    // Step 7: Calculate Self-Employment Tax
    const selfEmploymentTax = this.calculateSelfEmploymentTax(profile);

    // Step 8: Calculate NIIT
    const niit = this.calculateNIIT(profile);

    // Step 9: Sum total taxes
    const totalFederalTax = federalBreakdown.totalTax + capitalGainsTax + niit;
    const totalTax =
      totalFederalTax + stateTax + fica.totalFICA + selfEmploymentTax;

    // Step 10: Calculate take-home
    const takeHomePay = profile.grossIncome - totalTax;

    return {
      grossIncome: profile.grossIncome,
      adjustedGrossIncome: agi,
      taxableIncome,

      federalTax: totalFederalTax,
      federalBreakdown,

      stateTax,
      stateBreakdown,

      fica,
      selfEmploymentTax,

      niit,
      capitalGainsTax,

      totalCredits: 0,

      totalTax,
      effectiveRate:
        profile.grossIncome > 0 ? totalTax / profile.grossIncome : 0,
      marginalRate: federalBreakdown.marginalRate,
      takeHomePay,
      monthlyTakeHome: takeHomePay / 12,
    };
  }

  /**
   * Calculate Adjusted Gross Income
   */
  private calculateAGI(profile: TaxProfile): number {
    let agi = profile.grossIncome;

    // Above-the-line deductions
    agi -= Math.min(
      profile.studentLoanInterest,
      CONTRIBUTION_LIMITS_2024.studentLoanInterestMax
    );
    agi -= Math.min(
      profile.educatorExpenses,
      CONTRIBUTION_LIMITS_2024.educatorExpensesMax
    );
    agi -= profile.ytd401kContribution;
    agi -= profile.ytdIraContribution; // Traditional IRA (if deductible)
    agi -= profile.ytdHsaContribution;

    // Self-employment tax deduction (half of SE tax)
    if (profile.isSelfEmployed && profile.selfEmploymentIncome > 0) {
      const seTax = this.calculateSelfEmploymentTax(profile);
      agi -= seTax * FICA_RATES_2024.selfEmploymentDeduction;
    }

    return Math.max(0, agi);
  }

  /**
   * Calculate Taxable Income (AGI - Deductions)
   */
  private calculateTaxableIncome(agi: number, profile: TaxProfile): number {
    const standardDeduction = this.getStandardDeduction(profile.filingStatus);

    // Calculate itemized deductions
    const itemizedDeductions = this.calculateItemizedDeductions(profile);

    // Use higher of standard or itemized
    const deduction = Math.max(standardDeduction, itemizedDeductions);

    return Math.max(0, agi - deduction);
  }

  /**
   * Calculate itemized deductions
   */
  private calculateItemizedDeductions(profile: TaxProfile): number {
    let itemized = 0;

    // SALT (capped at $10,000)
    const salt = Math.min(
      profile.stateOfResidence &&
        getStateTaxInfo(profile.stateOfResidence)?.hasIncomeTax
        ? profile.stateTaxesPaid + profile.propertyTaxes
        : profile.propertyTaxes,
      CONTRIBUTION_LIMITS_2024.saltCap
    );
    itemized += salt;

    // Mortgage interest (no cap for primary residence)
    itemized += profile.mortgageInterest;

    // Charitable donations
    itemized += profile.charitableDonations;

    // Medical expenses (only amount exceeding 7.5% of AGI)
    const agiThreshold = profile.grossIncome * 0.075;
    if (profile.medicalExpenses > agiThreshold) {
      itemized += profile.medicalExpenses - agiThreshold;
    }

    return itemized;
  }

  /**
   * Calculate progressive tax using brackets
   */
  private calculateProgressiveTax(
    income: number,
    brackets: TaxBracket[]
  ): TaxCalculationBreakdown {
    const bracketDetails: TaxCalculationBreakdown['bracketDetails'] = [];
    let totalTax = 0;
    let remainingIncome = income;
    let marginalRate = 0;

    for (let i = 0; i < brackets.length && remainingIncome > 0; i++) {
      const bracket = brackets[i];
      const bracketMax = bracket.max === Infinity ? Infinity : bracket.max;
      const bracketSize = bracketMax - bracket.min;
      const taxableInBracket = Math.min(remainingIncome, bracketSize);
      const taxFromBracket = taxableInBracket * bracket.rate;

      if (taxableInBracket > 0) {
        bracketDetails.push({
          bracket: i + 1,
          rate: bracket.rate,
          taxableInBracket,
          taxFromBracket,
        });

        totalTax += taxFromBracket;
        remainingIncome -= taxableInBracket;
        marginalRate = bracket.rate;
      }
    }

    return {
      bracketDetails,
      totalTax,
      effectiveRate: income > 0 ? totalTax / income : 0,
      marginalRate,
    };
  }

  /**
   * Calculate Long-Term Capital Gains Tax
   */
  private calculateCapitalGainsTax(
    ltcg: number,
    totalTaxableIncome: number,
    filingStatus: keyof typeof LTCG_BRACKETS_2024
  ): number {
    if (ltcg <= 0) return 0;

    const brackets = this.ltcgBrackets[filingStatus];
    let tax = 0;
    let remainingGains = ltcg;

    // Start from where ordinary income ends
    const ordinaryIncome = totalTaxableIncome - ltcg;
    let currentIncome = ordinaryIncome;

    for (const bracket of brackets) {
      if (remainingGains <= 0) break;

      if (currentIncome >= bracket.max) {
        currentIncome = bracket.max;
        continue;
      }

      const roomInBracket = Math.max(
        0,
        bracket.max - Math.max(currentIncome, bracket.min)
      );
      const gainsInBracket = Math.min(remainingGains, roomInBracket);

      if (gainsInBracket > 0) {
        tax += gainsInBracket * bracket.rate;
        remainingGains -= gainsInBracket;
        currentIncome += gainsInBracket;
      }
    }

    return tax;
  }

  /**
   * Calculate State Income Tax
   */
  private calculateStateTax(
    taxableIncome: number,
    stateCode: string,
    _filingStatus: string
  ): { stateTax: number; stateBreakdown?: TaxCalculationBreakdown } {
    const stateInfo = getStateTaxInfo(stateCode);

    if (!stateInfo || !stateInfo.hasIncomeTax) {
      return { stateTax: 0 };
    }

    // Flat tax states
    if (stateInfo.isFlat && stateInfo.flatRate) {
      const stateTax = taxableIncome * stateInfo.flatRate;
      return {
        stateTax,
        stateBreakdown: {
          bracketDetails: [
            {
              bracket: 1,
              rate: stateInfo.flatRate,
              taxableInBracket: taxableIncome,
              taxFromBracket: stateTax,
            },
          ],
          totalTax: stateTax,
          effectiveRate: stateInfo.flatRate,
          marginalRate: stateInfo.flatRate,
        },
      };
    }

    // Progressive tax states
    if (stateInfo.brackets && stateInfo.brackets.length > 0) {
      const breakdown = this.calculateProgressiveTax(
        taxableIncome,
        stateInfo.brackets
      );
      return {
        stateTax: breakdown.totalTax,
        stateBreakdown: breakdown,
      };
    }

    return { stateTax: 0 };
  }

  /**
   * Calculate FICA Taxes (Social Security + Medicare)
   */
  private calculateFICA(profile: TaxProfile): FICABreakdown {
    // FICA only applies to W-2 income
    const w2Income = profile.w2Income;

    // Social Security (6.2% up to wage base)
    const ssWages = Math.min(w2Income, FICA_RATES_2024.socialSecurityWageBase);
    const socialSecurityTax = ssWages * FICA_RATES_2024.socialSecurityEmployee;

    // Medicare (1.45% on all wages)
    const medicareTax = w2Income * FICA_RATES_2024.medicareEmployee;

    // Additional Medicare Tax (0.9% on income over threshold)
    const threshold =
      profile.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY
        ? FICA_RATES_2024.additionalMedicareThresholdMarried
        : FICA_RATES_2024.additionalMedicareThresholdSingle;

    const additionalMedicareTax =
      w2Income > threshold
        ? (w2Income - threshold) * FICA_RATES_2024.additionalMedicareRate
        : 0;

    return {
      socialSecurityTax,
      socialSecurityWages: ssWages,
      medicareTax,
      additionalMedicareTax,
      totalFICA: socialSecurityTax + medicareTax + additionalMedicareTax,
    };
  }

  /**
   * Calculate Self-Employment Tax
   */
  private calculateSelfEmploymentTax(profile: TaxProfile): number {
    if (!profile.isSelfEmployed || profile.selfEmploymentIncome <= 0) {
      return 0;
    }

    // Net self-employment income (92.35% of gross)
    const netSE = profile.selfEmploymentIncome * 0.9235;

    // Social Security portion (12.4% up to wage base, minus W-2 wages)
    const remainingSSWageBase = Math.max(
      0,
      FICA_RATES_2024.socialSecurityWageBase - profile.w2Income
    );
    const ssTaxableIncome = Math.min(netSE, remainingSSWageBase);
    const ssTax = ssTaxableIncome * 0.124;

    // Medicare portion (2.9% on all SE income)
    const medicareTax = netSE * 0.029;

    // Additional Medicare (0.9% over threshold, considering W-2 income)
    const threshold =
      profile.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY
        ? FICA_RATES_2024.additionalMedicareThresholdMarried
        : FICA_RATES_2024.additionalMedicareThresholdSingle;

    const totalWages = profile.w2Income + netSE;
    const additionalMedicare =
      totalWages > threshold && profile.w2Income < threshold
        ? Math.min(netSE, totalWages - threshold) * 0.009
        : 0;

    return ssTax + medicareTax + additionalMedicare;
  }

  /**
   * Calculate Net Investment Income Tax (3.8%)
   */
  private calculateNIIT(profile: TaxProfile): number {
    const threshold =
      profile.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY
        ? INCOME_THRESHOLDS_2024.niitThresholdMarried
        : INCOME_THRESHOLDS_2024.niitThresholdSingle;

    if (profile.grossIncome <= threshold) {
      return 0;
    }

    const nii =
      profile.investmentIncome +
      profile.dividendIncome +
      profile.interestIncome +
      profile.capitalGainsLongTerm +
      profile.capitalGainsShortTerm;

    const excessAGI = profile.grossIncome - threshold;
    const niitBase = Math.min(nii, excessAGI);

    return niitBase * INCOME_THRESHOLDS_2024.niitRate;
  }

  /**
   * Get standard deduction for filing status
   */
  private getStandardDeduction(filingStatus: FilingStatus): number {
    switch (filingStatus) {
      case FilingStatus.SINGLE:
        return CONTRIBUTION_LIMITS_2024.standardDeductionSingle;
      case FilingStatus.MARRIED_FILING_JOINTLY:
      case FilingStatus.QUALIFYING_SURVIVING_SPOUSE:
        return CONTRIBUTION_LIMITS_2024.standardDeductionMarriedJoint;
      case FilingStatus.MARRIED_FILING_SEPARATELY:
        return CONTRIBUTION_LIMITS_2024.standardDeductionMarriedSeparate;
      case FilingStatus.HEAD_OF_HOUSEHOLD:
        return CONTRIBUTION_LIMITS_2024.standardDeductionHeadOfHousehold;
      default:
        return CONTRIBUTION_LIMITS_2024.standardDeductionSingle;
    }
  }

  /**
   * Map FilingStatus enum to bracket key
   */
  private mapFilingStatus(
    status: FilingStatus
  ): keyof typeof FEDERAL_TAX_BRACKETS_2024 {
    switch (status) {
      case FilingStatus.SINGLE:
        return 'single';
      case FilingStatus.MARRIED_FILING_JOINTLY:
      case FilingStatus.QUALIFYING_SURVIVING_SPOUSE:
        return 'married_filing_jointly';
      case FilingStatus.MARRIED_FILING_SEPARATELY:
        return 'married_filing_separately';
      case FilingStatus.HEAD_OF_HOUSEHOLD:
        return 'head_of_household';
      default:
        return 'single';
    }
  }

  /**
   * Calculate marginal rate at a given income level
   */
  getMarginalRate(income: number, filingStatus: FilingStatus): number {
    const status = this.mapFilingStatus(filingStatus);
    const brackets = this.federalBrackets[status];

    for (const bracket of brackets) {
      if (income >= bracket.min && income < (bracket.max || Infinity)) {
        return bracket.rate;
      }
    }

    return brackets[brackets.length - 1].rate;
  }

  /**
   * Calculate tax savings from a deduction
   */
  calculateDeductionSavings(
    deductionAmount: number,
    currentIncome: number,
    filingStatus: FilingStatus,
    stateCode?: string
  ): { federalSavings: number; stateSavings: number; totalSavings: number } {
    const marginalRate = this.getMarginalRate(currentIncome, filingStatus);
    const federalSavings = deductionAmount * marginalRate;

    let stateSavings = 0;
    if (stateCode) {
      const stateInfo = getStateTaxInfo(stateCode);
      if (stateInfo?.hasIncomeTax) {
        if (stateInfo.isFlat && stateInfo.flatRate) {
          stateSavings = deductionAmount * stateInfo.flatRate;
        } else if (stateInfo.brackets) {
          // Simplified: use top bracket
          const topRate =
            stateInfo.brackets[stateInfo.brackets.length - 1]?.rate || 0;
          stateSavings = deductionAmount * topRate;
        }
      }
    }

    return {
      federalSavings,
      stateSavings,
      totalSavings: federalSavings + stateSavings,
    };
  }
}

// Export singleton instance
export const taxBracketCalculator = new TaxBracketCalculator();
