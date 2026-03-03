/**
 * State Tax Calculation Engine
 *
 * Comprehensive state tax calculation supporting top 20 US states by population,
 * with multi-state income allocation, state-specific deductions and credits,
 * and filing recommendations including reciprocity agreements.
 *
 * Supported states (top 20 by population):
 *   CA, TX, FL, NY, PA, IL, OH, GA, NC, MI,
 *   NJ, VA, WA, AZ, MA, TN, IN, MO, MD, WI
 *
 * @module StateTaxEngine
 */

import { FilingStatus } from "../types/tax-profile.types";
import {
  STATE_TAX_CONFIGS,
  type StateTaxConfig,
} from "./TaxBracketCalculator";

// ============================================================================
// TYPES
// ============================================================================

/** Filing status variants the engine recognizes for state-level adjustments. */
export type StateFilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household";

/** Income allocation for a single state in a multi-state scenario. */
export interface StateIncomeAllocation {
  stateCode: string;
  /** Days physically worked in this state (for days-worked method). */
  daysWorked: number;
  /** Income directly sourced to this state (for income-sourced method). */
  incomeSourced: number;
}

/** Allocation method used to split income across states. */
export type AllocationMethod = "days_worked" | "income_sourced";

/** Result of calculating tax for a single state. */
export interface SingleStateTaxResult {
  stateCode: string;
  stateName: string;
  grossIncome: number;
  allocatedIncome: number;
  standardDeduction: number;
  personalExemption: number;
  totalDeduction: number;
  taxableIncome: number;
  taxBeforeCredits: number;
  credits: StateCreditResult[];
  totalCredits: number;
  netTax: number;
  effectiveRate: number;
  marginalRate: number;
  bracketBreakdown: BracketDetail[];
  hasLocalTax: boolean;
  taxType: "none" | "flat" | "progressive";
}

/** A single bracket in the tax calculation breakdown. */
export interface BracketDetail {
  rate: number;
  min: number;
  max: number;
  taxableInBracket: number;
  taxFromBracket: number;
}

/** A state-specific credit applied to the tax. */
export interface StateCreditResult {
  creditName: string;
  amount: number;
  description: string;
}

/** Result of multi-state income allocation and tax calculation. */
export interface MultiStateTaxResult {
  totalIncome: number;
  allocationMethod: AllocationMethod;
  stateResults: SingleStateTaxResult[];
  totalStateTax: number;
  totalEffectiveRate: number;
  recommendations: FilingRecommendation[];
}

/** A filing recommendation for the taxpayer. */
export interface FilingRecommendation {
  type:
    | "reciprocity"
    | "credit_for_taxes_paid"
    | "domicile_advantage"
    | "filing_requirement"
    | "general";
  title: string;
  description: string;
  estimatedSavings: number;
  priority: "high" | "medium" | "low";
  applicableStates: string[];
}

// ============================================================================
// STATE-SPECIFIC CREDIT DEFINITIONS
// ============================================================================

interface StateCreditDefinition {
  creditName: string;
  description: string;
  /** Returns the credit amount based on income, filing status, and dependents. */
  calculate: (
    income: number,
    filingStatus: StateFilingStatus,
    dependents: number,
  ) => number;
}

/**
 * State-specific credits for the top 20 states.
 * Simplified models of real-world credits for MVP.
 */
const STATE_CREDITS: Record<string, StateCreditDefinition[]> = {
  CA: [
    {
      creditName: "CA Renter's Credit",
      description:
        "California renter's credit for qualifying renters with AGI under threshold",
      calculate: (income, filingStatus) => {
        const threshold =
          filingStatus === "married_filing_jointly" ? 101460 : 50730;
        if (income > threshold) return 0;
        return filingStatus === "married_filing_jointly" ? 120 : 60;
      },
    },
    {
      creditName: "CA EITC (CalEITC)",
      description: "California Earned Income Tax Credit for low-income workers",
      calculate: (income) => {
        if (income > 30950) return 0;
        if (income <= 7000) return Math.round(income * 0.085);
        return 0;
      },
    },
  ],
  NY: [
    {
      creditName: "NY EITC",
      description:
        "New York State Earned Income Tax Credit (30% of federal EITC)",
      calculate: (income) => {
        // Simplified: phase out above certain income
        if (income > 59187) return 0;
        if (income <= 16480) return Math.round(income * 0.0765 * 0.3);
        return 0;
      },
    },
    {
      creditName: "NY Child and Dependent Care Credit",
      description: "Credit for child and dependent care expenses in New York",
      calculate: (income, _filingStatus, dependents) => {
        if (dependents <= 0 || income > 150000) return 0;
        return Math.min(dependents * 100, 400);
      },
    },
  ],
  NJ: [
    {
      creditName: "NJ Property Tax Deduction/Credit",
      description: "New Jersey property tax credit for qualifying residents",
      calculate: (income) => {
        if (income > 150000) return 0;
        return 50;
      },
    },
  ],
  MA: [
    {
      creditName: "MA No-Tax Status Credit",
      description:
        "Massachusetts no-tax status for income below filing threshold",
      calculate: (income, filingStatus) => {
        const threshold =
          filingStatus === "married_filing_jointly" ? 16400 : 8000;
        if (income <= threshold) return Infinity; // Entire tax eliminated
        return 0;
      },
    },
  ],
  MD: [
    {
      creditName: "MD Poverty Level Credit",
      description: "Maryland poverty level credit for low-income filers",
      calculate: (income, filingStatus) => {
        const threshold =
          filingStatus === "married_filing_jointly" ? 30575 : 15288;
        if (income > threshold) return 0;
        return Math.round(income * 0.05 * 0.2);
      },
    },
  ],
  VA: [
    {
      creditName: "VA Low Income Credit",
      description:
        "Virginia low-income credit for filers below poverty threshold",
      calculate: (income) => {
        if (income > 23000) return 0;
        return Math.round(income * 0.03);
      },
    },
  ],
  GA: [
    {
      creditName: "GA Low Income Credit",
      description:
        "Georgia low-income credit for individual earners under threshold",
      calculate: (income) => {
        if (income > 20000) return 0;
        return Math.round(income * 0.025);
      },
    },
  ],
  WI: [
    {
      creditName: "WI Homestead Credit",
      description:
        "Wisconsin homestead credit for low-income renters and homeowners",
      calculate: (income) => {
        if (income > 24680) return 0;
        return Math.min(Math.round(income * 0.03), 1168);
      },
    },
  ],
  IN: [
    {
      creditName: "IN Unified Tax Credit",
      description:
        "Indiana unified tax credit for residents below income threshold",
      calculate: (income) => {
        if (income > 40000) return 0;
        return Math.round(income * 0.02);
      },
    },
  ],
  OH: [
    {
      creditName: "OH Personal/Dependent Exemption Credit",
      description:
        "Ohio personal exemption credit based on income and dependents",
      calculate: (income, _filingStatus, dependents) => {
        if (income > 100000) return 0;
        const exemptionAmount = income <= 40000 ? 2400 : 1850;
        return Math.round(exemptionAmount * 0.01 * Math.max(1, dependents));
      },
    },
  ],
};

// ============================================================================
// RECIPROCITY AGREEMENTS
// ============================================================================

/**
 * State reciprocity agreements. When two states have a reciprocity agreement,
 * a resident of one state working in the other only pays tax to their home state.
 */
interface ReciprocityAgreement {
  states: [string, string];
  description: string;
}

const RECIPROCITY_AGREEMENTS: ReciprocityAgreement[] = [
  {
    states: ["NJ", "PA"],
    description:
      "New Jersey and Pennsylvania have a reciprocal tax agreement. Residents only pay tax to their home state.",
  },
  {
    states: ["VA", "DC"],
    description:
      "Virginia and DC have a reciprocal agreement. VA residents working in DC are only taxed by VA.",
  },
  {
    states: ["VA", "MD"],
    description:
      "Virginia and Maryland have a reciprocal agreement for commuters.",
  },
  {
    states: ["MD", "DC"],
    description:
      "Maryland and DC have a reciprocal agreement. MD residents working in DC are only taxed by MD.",
  },
  {
    states: ["VA", "WV"],
    description:
      "Virginia and West Virginia have a reciprocal tax agreement for cross-border workers.",
  },
  {
    states: ["IN", "OH"],
    description:
      "Indiana and Ohio have a reciprocal tax agreement for border-state workers.",
  },
  {
    states: ["IN", "MI"],
    description:
      "Indiana and Michigan have a reciprocal tax agreement for cross-border commuters.",
  },
  {
    states: ["IN", "PA"],
    description:
      "Indiana and Pennsylvania have a reciprocal tax agreement.",
  },
  {
    states: ["IN", "WI"],
    description:
      "Indiana and Wisconsin have a reciprocal tax agreement for workers crossing state lines.",
  },
  {
    states: ["OH", "MI"],
    description:
      "Ohio and Michigan have a reciprocal tax agreement for border commuters.",
  },
  {
    states: ["OH", "PA"],
    description:
      "Ohio and Pennsylvania have a reciprocal tax agreement.",
  },
  {
    states: ["OH", "WV"],
    description:
      "Ohio and West Virginia have a reciprocal tax agreement.",
  },
  {
    states: ["WI", "MI"],
    description:
      "Wisconsin and Michigan have a reciprocal tax agreement.",
  },
  {
    states: ["WI", "IL"],
    description:
      "Wisconsin and Illinois have a reciprocal tax agreement for commuters.",
  },
  {
    states: ["MD", "PA"],
    description:
      "Maryland and Pennsylvania have a reciprocal tax agreement.",
  },
  {
    states: ["MD", "VA"],
    description:
      "Maryland and Virginia have a reciprocal tax agreement.",
  },
  {
    states: ["MD", "WV"],
    description:
      "Maryland and West Virginia have a reciprocal tax agreement.",
  },
  {
    states: ["IL", "IA"],
    description:
      "Illinois and Iowa have a reciprocal tax agreement for cross-border workers.",
  },
  {
    states: ["IL", "MI"],
    description:
      "Illinois and Michigan have a reciprocal tax agreement.",
  },
];

// ============================================================================
// TOP 20 STATES BY POPULATION
// ============================================================================

/** The top 20 US states by population that this engine supports. */
export const TOP_20_STATES = [
  "CA",
  "TX",
  "FL",
  "NY",
  "PA",
  "IL",
  "OH",
  "GA",
  "NC",
  "MI",
  "NJ",
  "VA",
  "WA",
  "AZ",
  "MA",
  "TN",
  "IN",
  "MO",
  "MD",
  "WI",
] as const;

export type Top20StateCode = (typeof TOP_20_STATES)[number];

// ============================================================================
// STATE TAX ENGINE CLASS
// ============================================================================

export class StateTaxEngine {
  private taxYear: number;

  constructor(taxYear: number = new Date().getFullYear()) {
    this.taxYear = taxYear;
  }

  /**
   * Get the tax year this engine instance is configured for.
   */
  getTaxYear(): number {
    return this.taxYear;
  }

  /**
   * Check whether a state code is among the top 20 supported states.
   */
  isSupportedState(stateCode: string): boolean {
    return (TOP_20_STATES as readonly string[]).includes(
      stateCode.toUpperCase(),
    );
  }

  /**
   * Get the list of supported (top 20) state codes.
   */
  getSupportedStates(): readonly string[] {
    return TOP_20_STATES;
  }

  // ==========================================================================
  // SINGLE-STATE CALCULATION
  // ==========================================================================

  /**
   * Calculate state tax for a single state.
   *
   * @param income        Gross income subject to state tax
   * @param stateCode     Two-letter state code
   * @param filingStatus  Filing status
   * @param dependents    Number of dependents (default 0)
   * @returns Detailed single-state tax result
   */
  calculateStateTax(
    income: number,
    stateCode: string,
    filingStatus: FilingStatus,
    dependents: number = 0,
  ): SingleStateTaxResult {
    const code = stateCode.toUpperCase();
    const config = STATE_TAX_CONFIGS[code];

    if (!config) {
      return this.buildEmptyResult(code, code, income, income);
    }

    return this.calculateForState(
      income,
      income,
      config,
      this.mapFilingStatus(filingStatus),
      dependents,
    );
  }

  // ==========================================================================
  // MULTI-STATE ALLOCATION
  // ==========================================================================

  /**
   * Calculate taxes across multiple states with income allocation.
   *
   * Supports two allocation methods:
   *   - "days_worked": splits total income by the ratio of days worked in each state
   *   - "income_sourced": uses the income amount directly sourced to each state
   *
   * @param totalIncome     Total gross income
   * @param allocations     Per-state allocation details
   * @param filingStatus    Filing status
   * @param method          Allocation method
   * @param dependents      Number of dependents
   * @returns Multi-state tax result with recommendations
   */
  calculateMultiStateTax(
    totalIncome: number,
    allocations: StateIncomeAllocation[],
    filingStatus: FilingStatus,
    method: AllocationMethod = "days_worked",
    dependents: number = 0,
  ): MultiStateTaxResult {
    if (allocations.length === 0) {
      return {
        totalIncome,
        allocationMethod: method,
        stateResults: [],
        totalStateTax: 0,
        totalEffectiveRate: 0,
        recommendations: [],
      };
    }

    const stateFilingStatus = this.mapFilingStatus(filingStatus);
    const totalDays = allocations.reduce((s, a) => s + a.daysWorked, 0);

    const stateResults: SingleStateTaxResult[] = allocations.map(
      (allocation) => {
        const code = allocation.stateCode.toUpperCase();
        const config = STATE_TAX_CONFIGS[code];

        let allocatedIncome: number;
        if (method === "days_worked") {
          allocatedIncome =
            totalDays > 0
              ? (allocation.daysWorked / totalDays) * totalIncome
              : 0;
        } else {
          allocatedIncome = allocation.incomeSourced;
        }

        if (!config) {
          return this.buildEmptyResult(code, code, totalIncome, allocatedIncome);
        }

        return this.calculateForState(
          totalIncome,
          allocatedIncome,
          config,
          stateFilingStatus,
          dependents,
        );
      },
    );

    const totalStateTax = stateResults.reduce((s, r) => s + r.netTax, 0);
    const totalEffectiveRate =
      totalIncome > 0 ? totalStateTax / totalIncome : 0;

    const stateCodes = allocations.map((a) => a.stateCode.toUpperCase());
    const recommendations = this.generateRecommendations(
      stateCodes,
      stateResults,
      totalIncome,
      stateFilingStatus,
    );

    return {
      totalIncome,
      allocationMethod: method,
      stateResults,
      totalStateTax,
      totalEffectiveRate,
      recommendations,
    };
  }

  // ==========================================================================
  // STATE DEDUCTIONS
  // ==========================================================================

  /**
   * Get the standard deduction and personal exemption for a state.
   *
   * @param stateCode     Two-letter state code
   * @param filingStatus  Filing status (currently single-filer defaults)
   * @returns Object with standardDeduction, personalExemption, and total
   */
  getStateDeductions(
    stateCode: string,
    filingStatus: FilingStatus,
  ): {
    standardDeduction: number;
    personalExemption: number;
    total: number;
    filingStatus: string;
  } {
    const code = stateCode.toUpperCase();
    const config = STATE_TAX_CONFIGS[code];

    if (!config) {
      return {
        standardDeduction: 0,
        personalExemption: 0,
        total: 0,
        filingStatus: this.mapFilingStatus(filingStatus),
      };
    }

    return {
      standardDeduction: config.standardDeduction,
      personalExemption: config.personalExemption,
      total: config.standardDeduction + config.personalExemption,
      filingStatus: this.mapFilingStatus(filingStatus),
    };
  }

  // ==========================================================================
  // STATE CREDITS
  // ==========================================================================

  /**
   * Calculate state-specific credits.
   *
   * @param stateCode      Two-letter state code
   * @param income         Gross income
   * @param filingStatus   Filing status
   * @param dependents     Number of dependents
   * @returns Array of applicable credits
   */
  getStateCredits(
    stateCode: string,
    income: number,
    filingStatus: FilingStatus,
    dependents: number = 0,
  ): StateCreditResult[] {
    const code = stateCode.toUpperCase();
    const creditDefs = STATE_CREDITS[code];
    if (!creditDefs || creditDefs.length === 0) return [];

    const stateFilingStatus = this.mapFilingStatus(filingStatus);
    const results: StateCreditResult[] = [];

    for (const def of creditDefs) {
      const amount = def.calculate(income, stateFilingStatus, dependents);
      if (amount > 0) {
        results.push({
          creditName: def.creditName,
          amount: amount === Infinity ? 0 : amount,
          description: def.description,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // FILING RECOMMENDATIONS
  // ==========================================================================

  /**
   * Get filing recommendations for a taxpayer working in multiple states.
   *
   * @param homeState     Resident state code
   * @param workStates    Array of state codes where income is earned
   * @param totalIncome   Total gross income
   * @param filingStatus  Filing status
   * @returns Array of filing recommendations
   */
  getFilingRecommendations(
    homeState: string,
    workStates: string[],
    totalIncome: number,
    filingStatus: FilingStatus,
  ): FilingRecommendation[] {
    const home = homeState.toUpperCase();
    const work = workStates.map((s) => s.toUpperCase());
    const allStates = [...new Set([home, ...work])];
    const stateFilingStatus = this.mapFilingStatus(filingStatus);

    // Calculate single-state results for each state to feed into recommendation generation
    const stateResults = allStates.map((code) => {
      const config = STATE_TAX_CONFIGS[code];
      if (!config) {
        return this.buildEmptyResult(code, code, totalIncome, totalIncome);
      }
      return this.calculateForState(
        totalIncome,
        totalIncome,
        config,
        stateFilingStatus,
        0,
      );
    });

    return this.generateRecommendations(
      allStates,
      stateResults,
      totalIncome,
      stateFilingStatus,
    );
  }

  // ==========================================================================
  // RECIPROCITY LOOKUPS
  // ==========================================================================

  /**
   * Check if two states have a reciprocity agreement.
   *
   * @param stateA Two-letter state code
   * @param stateB Two-letter state code
   * @returns The reciprocity agreement if one exists, otherwise null
   */
  getReciprocityAgreement(
    stateA: string,
    stateB: string,
  ): ReciprocityAgreement | null {
    const a = stateA.toUpperCase();
    const b = stateB.toUpperCase();

    return (
      RECIPROCITY_AGREEMENTS.find(
        (r) =>
          (r.states[0] === a && r.states[1] === b) ||
          (r.states[0] === b && r.states[1] === a),
      ) ?? null
    );
  }

  /**
   * Get all reciprocity agreements involving a specific state.
   *
   * @param stateCode Two-letter state code
   * @returns Array of reciprocity agreements
   */
  getReciprocityAgreementsForState(
    stateCode: string,
  ): ReciprocityAgreement[] {
    const code = stateCode.toUpperCase();
    return RECIPROCITY_AGREEMENTS.filter(
      (r) => r.states[0] === code || r.states[1] === code,
    );
  }

  // ==========================================================================
  // COMPARISON
  // ==========================================================================

  /**
   * Compare the tax burden of a given income across the top 20 states.
   *
   * @param income        Gross income
   * @param filingStatus  Filing status
   * @returns Sorted array of state results (lowest tax first)
   */
  compareTop20States(
    income: number,
    filingStatus: FilingStatus,
  ): SingleStateTaxResult[] {
    const stateFilingStatus = this.mapFilingStatus(filingStatus);

    const results = TOP_20_STATES.map((code) => {
      const config = STATE_TAX_CONFIGS[code];
      if (!config) {
        return this.buildEmptyResult(code, code, income, income);
      }
      return this.calculateForState(
        income,
        income,
        config,
        stateFilingStatus,
        0,
      );
    });

    return results.sort((a, b) => a.netTax - b.netTax);
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Core calculation for a single state given allocated income and config.
   */
  private calculateForState(
    grossIncome: number,
    allocatedIncome: number,
    config: StateTaxConfig,
    filingStatus: StateFilingStatus,
    dependents: number,
  ): SingleStateTaxResult {
    // No-income-tax state
    if (config.brackets.length === 0) {
      return this.buildEmptyResult(
        config.stateCode,
        config.stateName,
        grossIncome,
        allocatedIncome,
      );
    }

    // Compute deductions
    const standardDeduction = config.standardDeduction;
    const personalExemption = config.personalExemption;
    const totalDeduction = standardDeduction + personalExemption;

    // Compute state taxable income
    const taxableIncome = Math.max(0, allocatedIncome - totalDeduction);

    // Walk brackets
    const { tax, marginalRate, bracketBreakdown } = this.applyBrackets(
      taxableIncome,
      config.brackets,
    );

    // Determine tax type
    const taxType: "flat" | "progressive" =
      config.brackets.length === 1 ? "flat" : "progressive";

    // State credits
    const creditDefs = STATE_CREDITS[config.stateCode] ?? [];
    const credits: StateCreditResult[] = [];
    let totalCredits = 0;

    for (const def of creditDefs) {
      const amount = def.calculate(allocatedIncome, filingStatus, dependents);
      if (amount > 0) {
        const effectiveAmount = amount === Infinity ? tax : amount;
        credits.push({
          creditName: def.creditName,
          amount: effectiveAmount,
          description: def.description,
        });
        totalCredits += effectiveAmount;
      }
    }

    const netTax = Math.max(0, tax - totalCredits);
    const effectiveRate = grossIncome > 0 ? netTax / grossIncome : 0;

    return {
      stateCode: config.stateCode,
      stateName: config.stateName,
      grossIncome,
      allocatedIncome,
      standardDeduction,
      personalExemption,
      totalDeduction,
      taxableIncome,
      taxBeforeCredits: tax,
      credits,
      totalCredits,
      netTax,
      effectiveRate,
      marginalRate,
      bracketBreakdown,
      hasLocalTax: config.hasLocalTax,
      taxType,
    };
  }

  /**
   * Walk progressive brackets and compute tax, marginal rate, and breakdown.
   */
  private applyBrackets(
    taxableIncome: number,
    brackets: StateTaxConfig["brackets"],
  ): {
    tax: number;
    marginalRate: number;
    bracketBreakdown: BracketDetail[];
  } {
    let remaining = taxableIncome;
    let tax = 0;
    let marginalRate = 0;
    const bracketBreakdown: BracketDetail[] = [];

    for (const bracket of brackets) {
      if (remaining <= 0) break;
      const bracketSize =
        bracket.max === Infinity ? Infinity : bracket.max - bracket.min;
      const taxableInBracket = Math.min(remaining, bracketSize);
      const taxFromBracket = taxableInBracket * bracket.rate;

      if (taxableInBracket > 0) {
        bracketBreakdown.push({
          rate: bracket.rate,
          min: bracket.min,
          max: bracket.max,
          taxableInBracket,
          taxFromBracket,
        });
        tax += taxFromBracket;
        remaining -= taxableInBracket;
        marginalRate = bracket.rate;
      }
    }

    return { tax, marginalRate, bracketBreakdown };
  }

  /**
   * Build an empty (zero tax) result for a state with no income tax or unknown code.
   */
  private buildEmptyResult(
    stateCode: string,
    stateName: string,
    grossIncome: number,
    allocatedIncome: number,
  ): SingleStateTaxResult {
    return {
      stateCode,
      stateName,
      grossIncome,
      allocatedIncome,
      standardDeduction: 0,
      personalExemption: 0,
      totalDeduction: 0,
      taxableIncome: 0,
      taxBeforeCredits: 0,
      credits: [],
      totalCredits: 0,
      netTax: 0,
      effectiveRate: 0,
      marginalRate: 0,
      bracketBreakdown: [],
      hasLocalTax: false,
      taxType: "none",
    };
  }

  /**
   * Map the FilingStatus enum to a plain string key.
   */
  private mapFilingStatus(status: FilingStatus): StateFilingStatus {
    switch (status) {
      case FilingStatus.SINGLE:
        return "single";
      case FilingStatus.MARRIED_FILING_JOINTLY:
      case FilingStatus.QUALIFYING_SURVIVING_SPOUSE:
        return "married_filing_jointly";
      case FilingStatus.MARRIED_FILING_SEPARATELY:
        return "married_filing_separately";
      case FilingStatus.HEAD_OF_HOUSEHOLD:
        return "head_of_household";
      default:
        return "single";
    }
  }

  /**
   * Generate filing recommendations based on the states involved.
   */
  private generateRecommendations(
    stateCodes: string[],
    stateResults: SingleStateTaxResult[],
    totalIncome: number,
    _filingStatus: StateFilingStatus,
  ): FilingRecommendation[] {
    const recommendations: FilingRecommendation[] = [];

    // 1. Check reciprocity agreements between every pair of states
    for (let i = 0; i < stateCodes.length; i++) {
      for (let j = i + 1; j < stateCodes.length; j++) {
        const agreement = this.getReciprocityAgreement(
          stateCodes[i],
          stateCodes[j],
        );
        if (agreement) {
          recommendations.push({
            type: "reciprocity",
            title: `Reciprocity: ${stateCodes[i]} - ${stateCodes[j]}`,
            description: agreement.description,
            estimatedSavings: 0, // Savings depend on specific allocation
            priority: "high",
            applicableStates: [stateCodes[i], stateCodes[j]],
          });
        }
      }
    }

    // 2. Credit for taxes paid to another state
    if (stateCodes.length > 1) {
      const taxingStates = stateResults.filter((r) => r.netTax > 0);
      if (taxingStates.length > 1) {
        recommendations.push({
          type: "credit_for_taxes_paid",
          title: "Credit for Taxes Paid to Other States",
          description:
            "Most states allow a credit for income taxes paid to another state on the same income. " +
            "File in your home state and claim a credit for taxes paid to the work state to avoid double taxation.",
          estimatedSavings: 0,
          priority: "high",
          applicableStates: taxingStates.map((r) => r.stateCode),
        });
      }
    }

    // 3. No-tax state domicile advantage
    const noTaxStates = stateResults.filter((r) => r.taxType === "none");
    const taxStates = stateResults.filter((r) => r.taxType !== "none");

    if (noTaxStates.length > 0 && taxStates.length > 0) {
      const potentialSavings = taxStates.reduce((s, r) => s + r.netTax, 0);
      recommendations.push({
        type: "domicile_advantage",
        title: `No-Tax State Domicile (${noTaxStates.map((s) => s.stateCode).join(", ")})`,
        description:
          `Establishing domicile in ${noTaxStates.map((s) => s.stateName).join(" or ")} ` +
          `could reduce your state tax burden. Evaluate whether relocating your primary residence ` +
          `is feasible to save on state income tax.`,
        estimatedSavings: potentialSavings,
        priority: potentialSavings > 5000 ? "high" : "medium",
        applicableStates: noTaxStates.map((s) => s.stateCode),
      });
    }

    // 4. Filing requirement warnings
    for (const result of stateResults) {
      if (result.taxType !== "none" && result.allocatedIncome > 0) {
        const config = STATE_TAX_CONFIGS[result.stateCode];
        if (config) {
          const threshold = config.standardDeduction + config.personalExemption;
          if (result.allocatedIncome > threshold) {
            recommendations.push({
              type: "filing_requirement",
              title: `${result.stateCode} Filing Required`,
              description:
                `You likely need to file a state income tax return in ${result.stateName} ` +
                `because your allocated income ($${Math.round(result.allocatedIncome).toLocaleString()}) ` +
                `exceeds the filing threshold of $${threshold.toLocaleString()}.`,
              estimatedSavings: 0,
              priority: "medium",
              applicableStates: [result.stateCode],
            });
          }
        }
      }
    }

    // 5. General recommendation for high-income multi-state filers
    if (stateCodes.length > 1 && totalIncome > 200000) {
      recommendations.push({
        type: "general",
        title: "Consult a Multi-State Tax Professional",
        description:
          "With high income spread across multiple states, consider consulting a CPA " +
          "who specializes in multi-state taxation to ensure you are taking advantage of " +
          "all available credits, deductions, and planning strategies.",
        estimatedSavings: 0,
        priority: "low",
        applicableStates: stateCodes,
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const stateTaxEngine = new StateTaxEngine();
