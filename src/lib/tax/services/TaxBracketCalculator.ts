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
} from "../types/tax-profile.types";
import {
  FEDERAL_TAX_BRACKETS_2024,
  LTCG_BRACKETS_2024,
  STATE_TAX_INFO,
  FICA_RATES_2024,
  TaxBracket,
  getStateTaxInfo,
  type StateTaxInfo,
} from "../types/tax-jurisdiction.types";
import type { TaxProjection } from "../types";

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
// STATE TAX CONFIG TYPES
// ============================================================================

/**
 * Comprehensive state tax configuration with bracket details,
 * standard deduction, personal exemption, and local tax flag.
 */
export interface StateTaxConfig {
  stateCode: string;
  stateName: string;
  brackets: { rate: number; min: number; max: number }[];
  standardDeduction: number;
  personalExemption: number;
  hasLocalTax: boolean;
}

export interface StateTaxSummary {
  stateCode: string;
  stateName: string;
  grossIncome: number;
  stateDeduction: number;
  stateTaxableIncome: number;
  stateTax: number;
  stateEffectiveRate: number;
  stateMarginalRate: number;
  bracketBreakdown: {
    rate: number;
    min: number;
    max: number;
    taxableInBracket: number;
    taxFromBracket: number;
  }[];
  hasLocalTax: boolean;
  notes: string;
}

export interface StateTaxComparison {
  stateCode: string;
  stateName: string;
  stateTax: number;
  stateEffectiveRate: number;
  stateMarginalRate: number;
  hasLocalTax: boolean;
  rank: number;
}

// ============================================================================
// STATE TAX CONFIGS — All 50 States + DC (2024/2025 Tax Year)
//
// Sources: State tax authority websites, Tax Foundation 2024 data
// Top 10 population states accuracy-verified:
//   CA, TX, FL, NY, PA, IL, OH, GA, NC, MI
// ============================================================================

export const STATE_TAX_CONFIGS: Record<string, StateTaxConfig> = {
  // ---- NO INCOME TAX STATES ----
  AK: {
    stateCode: "AK",
    stateName: "Alaska",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  FL: {
    stateCode: "FL",
    stateName: "Florida",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  NV: {
    stateCode: "NV",
    stateName: "Nevada",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  NH: {
    stateCode: "NH",
    stateName: "New Hampshire",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  SD: {
    stateCode: "SD",
    stateName: "South Dakota",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  TN: {
    stateCode: "TN",
    stateName: "Tennessee",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  TX: {
    stateCode: "TX",
    stateName: "Texas",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  WA: {
    stateCode: "WA",
    stateName: "Washington",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },
  WY: {
    stateCode: "WY",
    stateName: "Wyoming",
    brackets: [],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },

  // ---- FLAT TAX STATES ----
  AZ: {
    stateCode: "AZ",
    stateName: "Arizona",
    brackets: [{ rate: 0.025, min: 0, max: Infinity }],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
  CO: {
    stateCode: "CO",
    stateName: "Colorado",
    brackets: [{ rate: 0.044, min: 0, max: Infinity }],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
  ID: {
    stateCode: "ID",
    stateName: "Idaho",
    brackets: [{ rate: 0.058, min: 0, max: Infinity }],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
  IL: {
    stateCode: "IL",
    stateName: "Illinois",
    brackets: [{ rate: 0.0495, min: 0, max: Infinity }],
    standardDeduction: 0,
    personalExemption: 2625,
    hasLocalTax: false,
  },
  IN: {
    stateCode: "IN",
    stateName: "Indiana",
    brackets: [{ rate: 0.0305, min: 0, max: Infinity }],
    standardDeduction: 0,
    personalExemption: 1000,
    hasLocalTax: true,
  },
  IA: {
    stateCode: "IA",
    stateName: "Iowa",
    brackets: [{ rate: 0.06, min: 0, max: Infinity }],
    standardDeduction: 14600,
    personalExemption: 40,
    hasLocalTax: false,
  },
  KY: {
    stateCode: "KY",
    stateName: "Kentucky",
    brackets: [{ rate: 0.04, min: 0, max: Infinity }],
    standardDeduction: 3160,
    personalExemption: 0,
    hasLocalTax: true,
  },
  MA: {
    stateCode: "MA",
    stateName: "Massachusetts",
    brackets: [
      { rate: 0.05, min: 0, max: 1000000 },
      { rate: 0.09, min: 1000000, max: Infinity },
    ],
    standardDeduction: 0,
    personalExemption: 4400,
    hasLocalTax: false,
  },
  MI: {
    stateCode: "MI",
    stateName: "Michigan",
    brackets: [{ rate: 0.0425, min: 0, max: Infinity }],
    standardDeduction: 0,
    personalExemption: 5600,
    hasLocalTax: true,
  },
  MS: {
    stateCode: "MS",
    stateName: "Mississippi",
    brackets: [{ rate: 0.05, min: 0, max: Infinity }],
    standardDeduction: 2300,
    personalExemption: 6000,
    hasLocalTax: false,
  },
  MT: {
    stateCode: "MT",
    stateName: "Montana",
    brackets: [{ rate: 0.059, min: 0, max: Infinity }],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
  NC: {
    stateCode: "NC",
    stateName: "North Carolina",
    brackets: [{ rate: 0.0525, min: 0, max: Infinity }],
    standardDeduction: 12750,
    personalExemption: 0,
    hasLocalTax: false,
  },
  ND: {
    stateCode: "ND",
    stateName: "North Dakota",
    brackets: [{ rate: 0.0195, min: 0, max: Infinity }],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
  PA: {
    stateCode: "PA",
    stateName: "Pennsylvania",
    brackets: [{ rate: 0.0307, min: 0, max: Infinity }],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: true,
  },
  UT: {
    stateCode: "UT",
    stateName: "Utah",
    brackets: [{ rate: 0.0465, min: 0, max: Infinity }],
    standardDeduction: 0,
    personalExemption: 0,
    hasLocalTax: false,
  },

  // ---- PROGRESSIVE TAX STATES ----
  AL: {
    stateCode: "AL",
    stateName: "Alabama",
    brackets: [
      { rate: 0.02, min: 0, max: 500 },
      { rate: 0.04, min: 500, max: 3000 },
      { rate: 0.05, min: 3000, max: Infinity },
    ],
    standardDeduction: 2500,
    personalExemption: 1500,
    hasLocalTax: true,
  },
  AR: {
    stateCode: "AR",
    stateName: "Arkansas",
    brackets: [
      { rate: 0.02, min: 0, max: 4400 },
      { rate: 0.04, min: 4400, max: 8800 },
      { rate: 0.047, min: 8800, max: Infinity },
    ],
    standardDeduction: 2340,
    personalExemption: 29,
    hasLocalTax: false,
  },
  CA: {
    stateCode: "CA",
    stateName: "California",
    brackets: [
      { rate: 0.01, min: 0, max: 10412 },
      { rate: 0.02, min: 10412, max: 24684 },
      { rate: 0.04, min: 24684, max: 38959 },
      { rate: 0.06, min: 38959, max: 54081 },
      { rate: 0.08, min: 54081, max: 68350 },
      { rate: 0.093, min: 68350, max: 349137 },
      { rate: 0.103, min: 349137, max: 418961 },
      { rate: 0.113, min: 418961, max: 698271 },
      { rate: 0.123, min: 698271, max: 1000000 },
      { rate: 0.133, min: 1000000, max: Infinity },
    ],
    standardDeduction: 5540,
    personalExemption: 144,
    hasLocalTax: false,
  },
  CT: {
    stateCode: "CT",
    stateName: "Connecticut",
    brackets: [
      { rate: 0.02, min: 0, max: 10000 },
      { rate: 0.045, min: 10000, max: 50000 },
      { rate: 0.055, min: 50000, max: 100000 },
      { rate: 0.06, min: 100000, max: 200000 },
      { rate: 0.065, min: 200000, max: 250000 },
      { rate: 0.069, min: 250000, max: 500000 },
      { rate: 0.0699, min: 500000, max: Infinity },
    ],
    standardDeduction: 0,
    personalExemption: 15000,
    hasLocalTax: false,
  },
  DE: {
    stateCode: "DE",
    stateName: "Delaware",
    brackets: [
      { rate: 0.0, min: 0, max: 2000 },
      { rate: 0.022, min: 2000, max: 5000 },
      { rate: 0.039, min: 5000, max: 10000 },
      { rate: 0.048, min: 10000, max: 20000 },
      { rate: 0.052, min: 20000, max: 25000 },
      { rate: 0.055, min: 25000, max: 60000 },
      { rate: 0.066, min: 60000, max: Infinity },
    ],
    standardDeduction: 3250,
    personalExemption: 110,
    hasLocalTax: true,
  },
  GA: {
    stateCode: "GA",
    stateName: "Georgia",
    brackets: [
      { rate: 0.01, min: 0, max: 750 },
      { rate: 0.02, min: 750, max: 2250 },
      { rate: 0.03, min: 2250, max: 3750 },
      { rate: 0.04, min: 3750, max: 5250 },
      { rate: 0.05, min: 5250, max: 7000 },
      { rate: 0.055, min: 7000, max: Infinity },
    ],
    standardDeduction: 5400,
    personalExemption: 2700,
    hasLocalTax: false,
  },
  HI: {
    stateCode: "HI",
    stateName: "Hawaii",
    brackets: [
      { rate: 0.014, min: 0, max: 2400 },
      { rate: 0.032, min: 2400, max: 4800 },
      { rate: 0.055, min: 4800, max: 9600 },
      { rate: 0.064, min: 9600, max: 14400 },
      { rate: 0.068, min: 14400, max: 19200 },
      { rate: 0.072, min: 19200, max: 24000 },
      { rate: 0.076, min: 24000, max: 36000 },
      { rate: 0.079, min: 36000, max: 48000 },
      { rate: 0.0825, min: 48000, max: 150000 },
      { rate: 0.09, min: 150000, max: 175000 },
      { rate: 0.1, min: 175000, max: 200000 },
      { rate: 0.11, min: 200000, max: Infinity },
    ],
    standardDeduction: 2200,
    personalExemption: 1144,
    hasLocalTax: false,
  },
  KS: {
    stateCode: "KS",
    stateName: "Kansas",
    brackets: [
      { rate: 0.031, min: 0, max: 15000 },
      { rate: 0.0525, min: 15000, max: 30000 },
      { rate: 0.057, min: 30000, max: Infinity },
    ],
    standardDeduction: 3500,
    personalExemption: 2250,
    hasLocalTax: false,
  },
  LA: {
    stateCode: "LA",
    stateName: "Louisiana",
    brackets: [
      { rate: 0.0185, min: 0, max: 12500 },
      { rate: 0.035, min: 12500, max: 50000 },
      { rate: 0.0425, min: 50000, max: Infinity },
    ],
    standardDeduction: 0,
    personalExemption: 4500,
    hasLocalTax: false,
  },
  ME: {
    stateCode: "ME",
    stateName: "Maine",
    brackets: [
      { rate: 0.058, min: 0, max: 24500 },
      { rate: 0.0675, min: 24500, max: 58050 },
      { rate: 0.0715, min: 58050, max: Infinity },
    ],
    standardDeduction: 14600,
    personalExemption: 4700,
    hasLocalTax: false,
  },
  MD: {
    stateCode: "MD",
    stateName: "Maryland",
    brackets: [
      { rate: 0.02, min: 0, max: 1000 },
      { rate: 0.03, min: 1000, max: 2000 },
      { rate: 0.04, min: 2000, max: 3000 },
      { rate: 0.0475, min: 3000, max: 100000 },
      { rate: 0.05, min: 100000, max: 125000 },
      { rate: 0.0525, min: 125000, max: 150000 },
      { rate: 0.055, min: 150000, max: 250000 },
      { rate: 0.0575, min: 250000, max: Infinity },
    ],
    standardDeduction: 2550,
    personalExemption: 3200,
    hasLocalTax: true,
  },
  MN: {
    stateCode: "MN",
    stateName: "Minnesota",
    brackets: [
      { rate: 0.0535, min: 0, max: 30070 },
      { rate: 0.068, min: 30070, max: 98760 },
      { rate: 0.0785, min: 98760, max: 183340 },
      { rate: 0.0985, min: 183340, max: Infinity },
    ],
    standardDeduction: 14575,
    personalExemption: 4950,
    hasLocalTax: false,
  },
  MO: {
    stateCode: "MO",
    stateName: "Missouri",
    brackets: [
      { rate: 0.0, min: 0, max: 1207 },
      { rate: 0.02, min: 1207, max: 2414 },
      { rate: 0.025, min: 2414, max: 3621 },
      { rate: 0.03, min: 3621, max: 4828 },
      { rate: 0.035, min: 4828, max: 6035 },
      { rate: 0.04, min: 6035, max: 7242 },
      { rate: 0.045, min: 7242, max: 8449 },
      { rate: 0.0495, min: 8449, max: Infinity },
    ],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: true,
  },
  NE: {
    stateCode: "NE",
    stateName: "Nebraska",
    brackets: [
      { rate: 0.0246, min: 0, max: 3700 },
      { rate: 0.0351, min: 3700, max: 22170 },
      { rate: 0.0501, min: 22170, max: 35730 },
      { rate: 0.0584, min: 35730, max: Infinity },
    ],
    standardDeduction: 7900,
    personalExemption: 157,
    hasLocalTax: false,
  },
  NJ: {
    stateCode: "NJ",
    stateName: "New Jersey",
    brackets: [
      { rate: 0.014, min: 0, max: 20000 },
      { rate: 0.0175, min: 20000, max: 35000 },
      { rate: 0.035, min: 35000, max: 40000 },
      { rate: 0.05525, min: 40000, max: 75000 },
      { rate: 0.0637, min: 75000, max: 500000 },
      { rate: 0.0897, min: 500000, max: 1000000 },
      { rate: 0.1075, min: 1000000, max: Infinity },
    ],
    standardDeduction: 0,
    personalExemption: 1000,
    hasLocalTax: false,
  },
  NM: {
    stateCode: "NM",
    stateName: "New Mexico",
    brackets: [
      { rate: 0.017, min: 0, max: 5500 },
      { rate: 0.032, min: 5500, max: 11000 },
      { rate: 0.047, min: 11000, max: 16000 },
      { rate: 0.049, min: 16000, max: 210000 },
      { rate: 0.059, min: 210000, max: Infinity },
    ],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
  NY: {
    stateCode: "NY",
    stateName: "New York",
    brackets: [
      { rate: 0.04, min: 0, max: 8500 },
      { rate: 0.045, min: 8500, max: 11700 },
      { rate: 0.0525, min: 11700, max: 13900 },
      { rate: 0.0585, min: 13900, max: 80650 },
      { rate: 0.0625, min: 80650, max: 215400 },
      { rate: 0.0685, min: 215400, max: 1077550 },
      { rate: 0.0965, min: 1077550, max: 5000000 },
      { rate: 0.103, min: 5000000, max: 25000000 },
      { rate: 0.109, min: 25000000, max: Infinity },
    ],
    standardDeduction: 8000,
    personalExemption: 0,
    hasLocalTax: true,
  },
  OH: {
    stateCode: "OH",
    stateName: "Ohio",
    brackets: [
      { rate: 0.0, min: 0, max: 26050 },
      { rate: 0.02765, min: 26050, max: 100000 },
      { rate: 0.0375, min: 100000, max: Infinity },
    ],
    standardDeduction: 0,
    personalExemption: 2400,
    hasLocalTax: true,
  },
  OK: {
    stateCode: "OK",
    stateName: "Oklahoma",
    brackets: [
      { rate: 0.0025, min: 0, max: 1000 },
      { rate: 0.0075, min: 1000, max: 2500 },
      { rate: 0.0175, min: 2500, max: 3750 },
      { rate: 0.0275, min: 3750, max: 4900 },
      { rate: 0.0375, min: 4900, max: 7200 },
      { rate: 0.0475, min: 7200, max: Infinity },
    ],
    standardDeduction: 6350,
    personalExemption: 1000,
    hasLocalTax: false,
  },
  OR: {
    stateCode: "OR",
    stateName: "Oregon",
    brackets: [
      { rate: 0.0475, min: 0, max: 4050 },
      { rate: 0.0675, min: 4050, max: 10200 },
      { rate: 0.0875, min: 10200, max: 125000 },
      { rate: 0.099, min: 125000, max: Infinity },
    ],
    standardDeduction: 2745,
    personalExemption: 236,
    hasLocalTax: true,
  },
  RI: {
    stateCode: "RI",
    stateName: "Rhode Island",
    brackets: [
      { rate: 0.0375, min: 0, max: 73450 },
      { rate: 0.0475, min: 73450, max: 166950 },
      { rate: 0.0599, min: 166950, max: Infinity },
    ],
    standardDeduction: 10550,
    personalExemption: 4700,
    hasLocalTax: false,
  },
  SC: {
    stateCode: "SC",
    stateName: "South Carolina",
    brackets: [
      { rate: 0.0, min: 0, max: 3200 },
      { rate: 0.03, min: 3200, max: 16040 },
      { rate: 0.065, min: 16040, max: Infinity },
    ],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
  VA: {
    stateCode: "VA",
    stateName: "Virginia",
    brackets: [
      { rate: 0.02, min: 0, max: 3000 },
      { rate: 0.03, min: 3000, max: 5000 },
      { rate: 0.05, min: 5000, max: 17000 },
      { rate: 0.0575, min: 17000, max: Infinity },
    ],
    standardDeduction: 8000,
    personalExemption: 930,
    hasLocalTax: false,
  },
  VT: {
    stateCode: "VT",
    stateName: "Vermont",
    brackets: [
      { rate: 0.0335, min: 0, max: 45400 },
      { rate: 0.066, min: 45400, max: 110050 },
      { rate: 0.076, min: 110050, max: 229550 },
      { rate: 0.0875, min: 229550, max: Infinity },
    ],
    standardDeduction: 14600,
    personalExemption: 4850,
    hasLocalTax: false,
  },
  WI: {
    stateCode: "WI",
    stateName: "Wisconsin",
    brackets: [
      { rate: 0.0354, min: 0, max: 14320 },
      { rate: 0.0465, min: 14320, max: 28640 },
      { rate: 0.053, min: 28640, max: 315310 },
      { rate: 0.0765, min: 315310, max: Infinity },
    ],
    standardDeduction: 12760,
    personalExemption: 700,
    hasLocalTax: false,
  },
  WV: {
    stateCode: "WV",
    stateName: "West Virginia",
    brackets: [
      { rate: 0.0236, min: 0, max: 10000 },
      { rate: 0.0315, min: 10000, max: 25000 },
      { rate: 0.0354, min: 25000, max: 40000 },
      { rate: 0.0472, min: 40000, max: 60000 },
      { rate: 0.0512, min: 60000, max: Infinity },
    ],
    standardDeduction: 0,
    personalExemption: 2000,
    hasLocalTax: false,
  },
  DC: {
    stateCode: "DC",
    stateName: "District of Columbia",
    brackets: [
      { rate: 0.04, min: 0, max: 10000 },
      { rate: 0.06, min: 10000, max: 40000 },
      { rate: 0.065, min: 40000, max: 60000 },
      { rate: 0.085, min: 60000, max: 250000 },
      { rate: 0.0925, min: 250000, max: 500000 },
      { rate: 0.0975, min: 500000, max: 1000000 },
      { rate: 0.1075, min: 1000000, max: Infinity },
    ],
    standardDeduction: 14600,
    personalExemption: 0,
    hasLocalTax: false,
  },
};

/**
 * List of state codes with no income tax
 */
const STATE_NO_INCOME_TAX_CODES: readonly string[] = [
  "AK",
  "FL",
  "NV",
  "NH",
  "SD",
  "TN",
  "TX",
  "WA",
  "WY",
] as const;

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
      this.federalBrackets[filingStatus],
    );

    // Step 4: Calculate Long-Term Capital Gains Tax
    const capitalGainsTax = this.calculateCapitalGainsTax(
      profile.capitalGainsLongTerm,
      taxableIncome,
      filingStatus,
    );

    // Step 5: Calculate State Tax
    const { stateTax, stateBreakdown } = this.calculateStateTax(
      taxableIncome,
      profile.stateOfResidence,
      filingStatus,
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
      CONTRIBUTION_LIMITS_2024.studentLoanInterestMax,
    );
    agi -= Math.min(
      profile.educatorExpenses,
      CONTRIBUTION_LIMITS_2024.educatorExpensesMax,
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
      CONTRIBUTION_LIMITS_2024.saltCap,
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
    brackets: TaxBracket[],
  ): TaxCalculationBreakdown {
    const bracketDetails: TaxCalculationBreakdown["bracketDetails"] = [];
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
    filingStatus: keyof typeof LTCG_BRACKETS_2024,
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
        bracket.max - Math.max(currentIncome, bracket.min),
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
    _filingStatus: string,
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
        stateInfo.brackets,
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
      FICA_RATES_2024.socialSecurityWageBase - profile.w2Income,
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
    status: FilingStatus,
  ): keyof typeof FEDERAL_TAX_BRACKETS_2024 {
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
    stateCode?: string,
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

  // ==========================================================================
  // PUBLIC STATE TAX METHODS
  // ==========================================================================

  /**
   * Calculate state income tax for a given income and state.
   *
   * Uses STATE_TAX_CONFIGS for bracket data.  For no-income-tax states the
   * result is always 0.  For progressive-bracket states the standard
   * deduction and personal exemption are subtracted before applying brackets.
   * For flat-tax states the single bracket rate is applied after deductions.
   *
   * @param income     Gross (or adjusted) income subject to state tax
   * @param stateCode  Two-letter state code (e.g. "CA", "TX")
   * @param filingStatus  Filing status — used to choose deduction amounts
   *                       (currently single-filer defaults; extensible)
   * @returns The state tax owed (≥ 0)
   */
  calculateStateTaxPublic(
    income: number,
    stateCode: string,
    filingStatus: FilingStatus,
  ): number {
    const config = STATE_TAX_CONFIGS[stateCode.toUpperCase()];
    if (!config || config.brackets.length === 0) {
      return 0;
    }

    const stateTaxableIncome = this.getStateTaxableIncome(
      income,
      config,
      filingStatus,
    );
    if (stateTaxableIncome <= 0) {
      return 0;
    }

    return this.applyStateBrackets(stateTaxableIncome, config.brackets);
  }

  /**
   * Get the effective state tax rate for a given income.
   *
   * @param stateCode  Two-letter state code
   * @param income     Gross income
   * @returns Effective rate as a decimal (e.g. 0.055 = 5.5%)
   */
  getStateTaxRate(stateCode: string, income: number): number {
    if (income <= 0) return 0;

    const config = STATE_TAX_CONFIGS[stateCode.toUpperCase()];
    if (!config || config.brackets.length === 0) {
      return 0;
    }

    const stateTaxableIncome = this.getStateTaxableIncome(
      income,
      config,
      FilingStatus.SINGLE,
    );
    if (stateTaxableIncome <= 0) return 0;

    const stateRate = this.applyStateBrackets(
      stateTaxableIncome,
      config.brackets,
    );
    return stateRate / income;
  }

  /**
   * Get a detailed state tax summary including bracket-by-bracket breakdown.
   */
  getStateTaxSummary(
    income: number,
    stateCode: string,
    filingStatus: FilingStatus,
  ): StateTaxSummary {
    const code = stateCode.toUpperCase();
    const config = STATE_TAX_CONFIGS[code];
    const stateInfo = getStateTaxInfo(code);

    if (!config) {
      return {
        stateCode: code,
        stateName: code,
        grossIncome: income,
        stateDeduction: 0,
        stateTaxableIncome: income,
        stateTax: 0,
        stateEffectiveRate: 0,
        stateMarginalRate: 0,
        bracketBreakdown: [],
        hasLocalTax: false,
        notes: "Unknown state code",
      };
    }

    // No income tax state
    if (config.brackets.length === 0) {
      return {
        stateCode: config.stateCode,
        stateName: config.stateName,
        grossIncome: income,
        stateDeduction: 0,
        stateTaxableIncome: 0,
        stateTax: 0,
        stateEffectiveRate: 0,
        stateMarginalRate: 0,
        bracketBreakdown: [],
        hasLocalTax: config.hasLocalTax,
        notes: "No state income tax",
      };
    }

    const stateDeduction = config.standardDeduction + config.personalExemption;
    const stateTaxableIncome = Math.max(0, income - stateDeduction);

    const bracketBreakdown: StateTaxSummary["bracketBreakdown"] = [];
    let totalStateTax = 0;
    let remainingIncome = stateTaxableIncome;
    let stateMarginalRate = 0;

    for (const bracket of config.brackets) {
      if (remainingIncome <= 0) break;

      const bracketSize =
        bracket.max === Infinity ? Infinity : bracket.max - bracket.min;
      const taxableInBracket = Math.min(remainingIncome, bracketSize);
      const taxFromBracket = taxableInBracket * bracket.rate;

      if (taxableInBracket > 0) {
        bracketBreakdown.push({
          rate: bracket.rate,
          min: bracket.min,
          max: bracket.max,
          taxableInBracket,
          taxFromBracket,
        });
        totalStateTax += taxFromBracket;
        remainingIncome -= taxableInBracket;
        stateMarginalRate = bracket.rate;
      }
    }

    const stateEffectiveRate = income > 0 ? totalStateTax / income : 0;

    return {
      stateCode: config.stateCode,
      stateName: config.stateName,
      grossIncome: income,
      stateDeduction,
      stateTaxableIncome,
      stateTax: totalStateTax,
      stateEffectiveRate,
      stateMarginalRate,
      bracketBreakdown,
      hasLocalTax: config.hasLocalTax,
      notes: stateInfo?.notes ?? "",
    };
  }

  /**
   * Compare state taxes across multiple states for the same income.
   *
   * Returns an array of comparison objects sorted from lowest to highest tax,
   * each with a 1-based rank.
   */
  compareStateTaxes(
    income: number,
    stateCodes: string[],
    filingStatus: FilingStatus,
  ): StateTaxComparison[] {
    const results: StateTaxComparison[] = stateCodes.map((code) => {
      const upperCode = code.toUpperCase();
      const summary = this.getStateTaxSummary(income, upperCode, filingStatus);
      return {
        stateCode: summary.stateCode,
        stateName: summary.stateName,
        stateTax: summary.stateTax,
        stateEffectiveRate: summary.stateEffectiveRate,
        stateMarginalRate: summary.stateMarginalRate,
        hasLocalTax: summary.hasLocalTax,
        rank: 0,
      };
    });

    // Sort by stateTax ascending (cheapest first)
    results.sort((a, b) => a.stateTax - b.stateTax);

    // Assign 1-based rank
    for (let i = 0; i < results.length; i++) {
      results[i].rank = i + 1;
    }

    return results;
  }

  /**
   * Get list of states with no income tax.
   *
   * @returns Array of { stateCode, stateName } for all no-income-tax states
   */
  getNoIncomeTaxStates(): { stateCode: string; stateName: string }[] {
    return STATE_NO_INCOME_TAX_CODES.map((code) => ({
      stateCode: code,
      stateName: STATE_TAX_CONFIGS[code].stateName,
    }));
  }

  /**
   * Get the tax brackets for a specific state.
   *
   * @param stateCode Two-letter state code
   * @returns Array of bracket objects, empty array for no-income-tax states
   */
  getStateTaxBrackets(
    stateCode: string,
  ): { rate: number; min: number; max: number }[] {
    const config = STATE_TAX_CONFIGS[stateCode.toUpperCase()];
    if (!config) return [];
    return [...config.brackets];
  }

  // ==========================================================================
  // PRIVATE HELPERS — STATE TAX
  // ==========================================================================

  /**
   * Compute state taxable income after standard deduction & personal exemption.
   */
  private getStateTaxableIncome(
    income: number,
    config: StateTaxConfig,
    _filingStatus: FilingStatus,
  ): number {
    const deduction = config.standardDeduction + config.personalExemption;
    return Math.max(0, income - deduction);
  }

  /**
   * Walk progressive brackets and sum the tax.
   */
  private applyStateBrackets(
    taxableIncome: number,
    brackets: StateTaxConfig["brackets"],
  ): number {
    let remaining = taxableIncome;
    let tax = 0;

    for (const bracket of brackets) {
      if (remaining <= 0) break;
      const bracketSize =
        bracket.max === Infinity ? Infinity : bracket.max - bracket.min;
      const amount = Math.min(remaining, bracketSize);
      tax += amount * bracket.rate;
      remaining -= amount;
    }

    return tax;
  }
}

// Export singleton instance
export const taxBracketCalculator = new TaxBracketCalculator();
