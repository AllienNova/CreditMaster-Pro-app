/**
 * Tax Jurisdiction Types
 *
 * Federal and state tax brackets, rates, and jurisdiction-specific rules.
 */

// ============================================================================
// FEDERAL TAX BRACKETS (2024)
// ============================================================================

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface FederalTaxBrackets {
  single: TaxBracket[];
  married_filing_jointly: TaxBracket[];
  married_filing_separately: TaxBracket[];
  head_of_household: TaxBracket[];
}

export const FEDERAL_TAX_BRACKETS_2024: FederalTaxBrackets = {
  single: [
    { min: 0, max: 11600, rate: 0.1 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married_filing_jointly: [
    { min: 0, max: 23200, rate: 0.1 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  married_filing_separately: [
    { min: 0, max: 11600, rate: 0.1 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 16550, rate: 0.1 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

// ============================================================================
// LONG-TERM CAPITAL GAINS BRACKETS (2024)
// ============================================================================

export const LTCG_BRACKETS_2024 = {
  single: [
    { min: 0, max: 47025, rate: 0.0 },
    { min: 47025, max: 518900, rate: 0.15 },
    { min: 518900, max: Infinity, rate: 0.2 },
  ],
  married_filing_jointly: [
    { min: 0, max: 94050, rate: 0.0 },
    { min: 94050, max: 583750, rate: 0.15 },
    { min: 583750, max: Infinity, rate: 0.2 },
  ],
  married_filing_separately: [
    { min: 0, max: 47025, rate: 0.0 },
    { min: 47025, max: 291850, rate: 0.15 },
    { min: 291850, max: Infinity, rate: 0.2 },
  ],
  head_of_household: [
    { min: 0, max: 63000, rate: 0.0 },
    { min: 63000, max: 551350, rate: 0.15 },
    { min: 551350, max: Infinity, rate: 0.2 },
  ],
};

// ============================================================================
// STATE TAX INFORMATION
// ============================================================================

export interface StateTaxInfo {
  stateCode: string;
  stateName: string;
  hasIncomeTax: boolean;
  isFlat: boolean;
  flatRate?: number;
  brackets?: TaxBracket[];
  standardDeduction?: number;
  personalExemption?: number;
  notes?: string;
}

export const STATE_TAX_INFO: Record<string, StateTaxInfo> = {
  // No Income Tax States
  AK: {
    stateCode: 'AK',
    stateName: 'Alaska',
    hasIncomeTax: false,
    isFlat: false,
  },
  FL: {
    stateCode: 'FL',
    stateName: 'Florida',
    hasIncomeTax: false,
    isFlat: false,
  },
  NV: {
    stateCode: 'NV',
    stateName: 'Nevada',
    hasIncomeTax: false,
    isFlat: false,
  },
  SD: {
    stateCode: 'SD',
    stateName: 'South Dakota',
    hasIncomeTax: false,
    isFlat: false,
  },
  TX: {
    stateCode: 'TX',
    stateName: 'Texas',
    hasIncomeTax: false,
    isFlat: false,
  },
  WA: {
    stateCode: 'WA',
    stateName: 'Washington',
    hasIncomeTax: false,
    isFlat: false,
    notes: 'Has capital gains tax starting at 7% for gains over $262,000',
  },
  WY: {
    stateCode: 'WY',
    stateName: 'Wyoming',
    hasIncomeTax: false,
    isFlat: false,
  },
  NH: {
    stateCode: 'NH',
    stateName: 'New Hampshire',
    hasIncomeTax: false,
    isFlat: false,
    notes: 'Interest and dividends tax being phased out',
  },
  TN: {
    stateCode: 'TN',
    stateName: 'Tennessee',
    hasIncomeTax: false,
    isFlat: false,
  },

  // Flat Tax States
  AZ: {
    stateCode: 'AZ',
    stateName: 'Arizona',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.025,
  },
  CO: {
    stateCode: 'CO',
    stateName: 'Colorado',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.044,
  },
  ID: {
    stateCode: 'ID',
    stateName: 'Idaho',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.058,
  },
  IL: {
    stateCode: 'IL',
    stateName: 'Illinois',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.0495,
  },
  IN: {
    stateCode: 'IN',
    stateName: 'Indiana',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.0305,
  },
  KY: {
    stateCode: 'KY',
    stateName: 'Kentucky',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.04,
  },
  MA: {
    stateCode: 'MA',
    stateName: 'Massachusetts',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.05,
    notes: '4% surtax on income over $1M',
  },
  MI: {
    stateCode: 'MI',
    stateName: 'Michigan',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.0425,
  },
  MS: {
    stateCode: 'MS',
    stateName: 'Mississippi',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.05,
    notes: 'Rate decreasing to 4% by 2026',
  },
  NC: {
    stateCode: 'NC',
    stateName: 'North Carolina',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.0525,
  },
  ND: {
    stateCode: 'ND',
    stateName: 'North Dakota',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.0195,
  },
  PA: {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.0307,
  },
  UT: {
    stateCode: 'UT',
    stateName: 'Utah',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.0465,
  },

  // Progressive Tax States (Major ones with brackets)
  CA: {
    stateCode: 'CA',
    stateName: 'California',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 10412, rate: 0.01 },
      { min: 10412, max: 24684, rate: 0.02 },
      { min: 24684, max: 38959, rate: 0.04 },
      { min: 38959, max: 54081, rate: 0.06 },
      { min: 54081, max: 68350, rate: 0.08 },
      { min: 68350, max: 349137, rate: 0.093 },
      { min: 349137, max: 418961, rate: 0.103 },
      { min: 418961, max: 698271, rate: 0.113 },
      { min: 698271, max: 1000000, rate: 0.123 },
      { min: 1000000, max: Infinity, rate: 0.133 },
    ],
    notes: 'Mental Health Services Tax adds 1% on income over $1M',
  },
  NY: {
    stateCode: 'NY',
    stateName: 'New York',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 8500, rate: 0.04 },
      { min: 8500, max: 11700, rate: 0.045 },
      { min: 11700, max: 13900, rate: 0.0525 },
      { min: 13900, max: 80650, rate: 0.0585 },
      { min: 80650, max: 215400, rate: 0.0625 },
      { min: 215400, max: 1077550, rate: 0.0685 },
      { min: 1077550, max: 5000000, rate: 0.0965 },
      { min: 5000000, max: 25000000, rate: 0.103 },
      { min: 25000000, max: Infinity, rate: 0.109 },
    ],
    notes: 'NYC has additional 3.078% - 3.876% local tax',
  },
  NJ: {
    stateCode: 'NJ',
    stateName: 'New Jersey',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 20000, rate: 0.014 },
      { min: 20000, max: 35000, rate: 0.0175 },
      { min: 35000, max: 40000, rate: 0.035 },
      { min: 40000, max: 75000, rate: 0.05525 },
      { min: 75000, max: 500000, rate: 0.0637 },
      { min: 500000, max: 1000000, rate: 0.0897 },
      { min: 1000000, max: Infinity, rate: 0.1075 },
    ],
  },
  CT: {
    stateCode: 'CT',
    stateName: 'Connecticut',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 10000, rate: 0.02 },
      { min: 10000, max: 50000, rate: 0.045 },
      { min: 50000, max: 100000, rate: 0.055 },
      { min: 100000, max: 200000, rate: 0.06 },
      { min: 200000, max: 250000, rate: 0.065 },
      { min: 250000, max: 500000, rate: 0.069 },
      { min: 500000, max: Infinity, rate: 0.0699 },
    ],
  },
  GA: {
    stateCode: 'GA',
    stateName: 'Georgia',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 750, rate: 0.01 },
      { min: 750, max: 2250, rate: 0.02 },
      { min: 2250, max: 3750, rate: 0.03 },
      { min: 3750, max: 5250, rate: 0.04 },
      { min: 5250, max: 7000, rate: 0.05 },
      { min: 7000, max: Infinity, rate: 0.055 },
    ],
    notes: 'Moving to 5.39% flat rate in 2024',
  },
  MN: {
    stateCode: 'MN',
    stateName: 'Minnesota',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 30070, rate: 0.0535 },
      { min: 30070, max: 98760, rate: 0.068 },
      { min: 98760, max: 183340, rate: 0.0785 },
      { min: 183340, max: Infinity, rate: 0.0985 },
    ],
  },
  OR: {
    stateCode: 'OR',
    stateName: 'Oregon',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 4050, rate: 0.0475 },
      { min: 4050, max: 10200, rate: 0.0675 },
      { min: 10200, max: 125000, rate: 0.0875 },
      { min: 125000, max: Infinity, rate: 0.099 },
    ],
  },
  VA: {
    stateCode: 'VA',
    stateName: 'Virginia',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 3000, rate: 0.02 },
      { min: 3000, max: 5000, rate: 0.03 },
      { min: 5000, max: 17000, rate: 0.05 },
      { min: 17000, max: Infinity, rate: 0.0575 },
    ],
  },
  WI: {
    stateCode: 'WI',
    stateName: 'Wisconsin',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 14320, rate: 0.0354 },
      { min: 14320, max: 28640, rate: 0.0465 },
      { min: 28640, max: 315310, rate: 0.053 },
      { min: 315310, max: Infinity, rate: 0.0765 },
    ],
  },
  OH: {
    stateCode: 'OH',
    stateName: 'Ohio',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 26050, rate: 0 },
      { min: 26050, max: 100000, rate: 0.02765 },
      { min: 100000, max: Infinity, rate: 0.0375 },
    ],
  },

  // Additional States with simpler structures
  AL: {
    stateCode: 'AL',
    stateName: 'Alabama',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 500, rate: 0.02 },
      { min: 500, max: 3000, rate: 0.04 },
      { min: 3000, max: Infinity, rate: 0.05 },
    ],
  },
  AR: {
    stateCode: 'AR',
    stateName: 'Arkansas',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 4400, rate: 0.02 },
      { min: 4400, max: 8800, rate: 0.04 },
      { min: 8800, max: Infinity, rate: 0.047 },
    ],
  },
  DE: {
    stateCode: 'DE',
    stateName: 'Delaware',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 2000, rate: 0 },
      { min: 2000, max: 5000, rate: 0.022 },
      { min: 5000, max: 10000, rate: 0.039 },
      { min: 10000, max: 20000, rate: 0.048 },
      { min: 20000, max: 25000, rate: 0.052 },
      { min: 25000, max: 60000, rate: 0.055 },
      { min: 60000, max: Infinity, rate: 0.066 },
    ],
  },
  HI: {
    stateCode: 'HI',
    stateName: 'Hawaii',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 2400, rate: 0.014 },
      { min: 2400, max: 4800, rate: 0.032 },
      { min: 4800, max: 9600, rate: 0.055 },
      { min: 9600, max: 14400, rate: 0.064 },
      { min: 14400, max: 19200, rate: 0.068 },
      { min: 19200, max: 24000, rate: 0.072 },
      { min: 24000, max: 36000, rate: 0.076 },
      { min: 36000, max: 48000, rate: 0.079 },
      { min: 48000, max: 150000, rate: 0.0825 },
      { min: 150000, max: 175000, rate: 0.09 },
      { min: 175000, max: 200000, rate: 0.1 },
      { min: 200000, max: Infinity, rate: 0.11 },
    ],
  },
  IA: {
    stateCode: 'IA',
    stateName: 'Iowa',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.06,
    notes: 'Moving to flat tax',
  },
  KS: {
    stateCode: 'KS',
    stateName: 'Kansas',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 15000, rate: 0.031 },
      { min: 15000, max: 30000, rate: 0.0525 },
      { min: 30000, max: Infinity, rate: 0.057 },
    ],
  },
  LA: {
    stateCode: 'LA',
    stateName: 'Louisiana',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 12500, rate: 0.0185 },
      { min: 12500, max: 50000, rate: 0.035 },
      { min: 50000, max: Infinity, rate: 0.0425 },
    ],
  },
  MD: {
    stateCode: 'MD',
    stateName: 'Maryland',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 1000, rate: 0.02 },
      { min: 1000, max: 2000, rate: 0.03 },
      { min: 2000, max: 3000, rate: 0.04 },
      { min: 3000, max: 100000, rate: 0.0475 },
      { min: 100000, max: 125000, rate: 0.05 },
      { min: 125000, max: 150000, rate: 0.0525 },
      { min: 150000, max: 250000, rate: 0.055 },
      { min: 250000, max: Infinity, rate: 0.0575 },
    ],
    notes: 'Local taxes can add 2.25% - 3.2%',
  },
  ME: {
    stateCode: 'ME',
    stateName: 'Maine',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 24500, rate: 0.058 },
      { min: 24500, max: 58050, rate: 0.0675 },
      { min: 58050, max: Infinity, rate: 0.0715 },
    ],
  },
  MO: {
    stateCode: 'MO',
    stateName: 'Missouri',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 1207, rate: 0 },
      { min: 1207, max: 2414, rate: 0.02 },
      { min: 2414, max: 3621, rate: 0.025 },
      { min: 3621, max: 4828, rate: 0.03 },
      { min: 4828, max: 6035, rate: 0.035 },
      { min: 6035, max: 7242, rate: 0.04 },
      { min: 7242, max: 8449, rate: 0.045 },
      { min: 8449, max: Infinity, rate: 0.0495 },
    ],
  },
  MT: {
    stateCode: 'MT',
    stateName: 'Montana',
    hasIncomeTax: true,
    isFlat: true,
    flatRate: 0.059,
    notes: 'Moving to flat tax in 2024',
  },
  NE: {
    stateCode: 'NE',
    stateName: 'Nebraska',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 3700, rate: 0.0246 },
      { min: 3700, max: 22170, rate: 0.0351 },
      { min: 22170, max: 35730, rate: 0.0501 },
      { min: 35730, max: Infinity, rate: 0.0584 },
    ],
  },
  NM: {
    stateCode: 'NM',
    stateName: 'New Mexico',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 5500, rate: 0.017 },
      { min: 5500, max: 11000, rate: 0.032 },
      { min: 11000, max: 16000, rate: 0.047 },
      { min: 16000, max: 210000, rate: 0.049 },
      { min: 210000, max: Infinity, rate: 0.059 },
    ],
  },
  OK: {
    stateCode: 'OK',
    stateName: 'Oklahoma',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 1000, rate: 0.0025 },
      { min: 1000, max: 2500, rate: 0.0075 },
      { min: 2500, max: 3750, rate: 0.0175 },
      { min: 3750, max: 4900, rate: 0.0275 },
      { min: 4900, max: 7200, rate: 0.0375 },
      { min: 7200, max: Infinity, rate: 0.0475 },
    ],
  },
  RI: {
    stateCode: 'RI',
    stateName: 'Rhode Island',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 73450, rate: 0.0375 },
      { min: 73450, max: 166950, rate: 0.0475 },
      { min: 166950, max: Infinity, rate: 0.0599 },
    ],
  },
  SC: {
    stateCode: 'SC',
    stateName: 'South Carolina',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 3200, rate: 0 },
      { min: 3200, max: 16040, rate: 0.03 },
      { min: 16040, max: Infinity, rate: 0.065 },
    ],
    notes: 'Top rate decreasing to 6% by 2027',
  },
  VT: {
    stateCode: 'VT',
    stateName: 'Vermont',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 45400, rate: 0.0335 },
      { min: 45400, max: 110050, rate: 0.066 },
      { min: 110050, max: 229550, rate: 0.076 },
      { min: 229550, max: Infinity, rate: 0.0875 },
    ],
  },
  WV: {
    stateCode: 'WV',
    stateName: 'West Virginia',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 10000, rate: 0.0236 },
      { min: 10000, max: 25000, rate: 0.0315 },
      { min: 25000, max: 40000, rate: 0.0354 },
      { min: 40000, max: 60000, rate: 0.0472 },
      { min: 60000, max: Infinity, rate: 0.0512 },
    ],
  },
  DC: {
    stateCode: 'DC',
    stateName: 'District of Columbia',
    hasIncomeTax: true,
    isFlat: false,
    brackets: [
      { min: 0, max: 10000, rate: 0.04 },
      { min: 10000, max: 40000, rate: 0.06 },
      { min: 40000, max: 60000, rate: 0.065 },
      { min: 60000, max: 250000, rate: 0.085 },
      { min: 250000, max: 500000, rate: 0.0925 },
      { min: 500000, max: 1000000, rate: 0.0975 },
      { min: 1000000, max: Infinity, rate: 0.1075 },
    ],
  },
};

// ============================================================================
// FICA TAX RATES
// ============================================================================

export const FICA_RATES_2024 = {
  socialSecurityEmployee: 0.062,
  socialSecurityEmployer: 0.062,
  socialSecurityWageBase: 168600,
  medicareEmployee: 0.0145,
  medicareEmployer: 0.0145,
  additionalMedicareThresholdSingle: 200000,
  additionalMedicareThresholdMarried: 250000,
  additionalMedicareRate: 0.009,
  selfEmploymentRate: 0.153, // 12.4% SS + 2.9% Medicare (combined)
  selfEmploymentDeduction: 0.5, // Deduct half of SE tax
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getStateTaxInfo(stateCode: string): StateTaxInfo | null {
  return STATE_TAX_INFO[stateCode.toUpperCase()] || null;
}

export function hasStateTax(stateCode: string): boolean {
  const info = getStateTaxInfo(stateCode);
  return info?.hasIncomeTax ?? false;
}

export function getStateTopRate(stateCode: string): number {
  const info = getStateTaxInfo(stateCode);
  if (!info || !info.hasIncomeTax) return 0;
  if (info.isFlat && info.flatRate) return info.flatRate;
  if (info.brackets && info.brackets.length > 0) {
    return info.brackets[info.brackets.length - 1].rate;
  }
  return 0;
}
