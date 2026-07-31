/**
 * Tax Profile Types
 *
 * Defines the user's tax situation including income, filing status,
 * dependents, and tax-advantaged accounts.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum FilingStatus {
  SINGLE = "single",
  MARRIED_FILING_JOINTLY = "married_filing_jointly",
  MARRIED_FILING_SEPARATELY = "married_filing_separately",
  HEAD_OF_HOUSEHOLD = "head_of_household",
  QUALIFYING_SURVIVING_SPOUSE = "qualifying_surviving_spouse",
}

export enum BusinessType {
  NONE = "none",
  SOLE_PROPRIETORSHIP = "sole_proprietorship",
  LLC_SINGLE_MEMBER = "llc_single_member",
  LLC_MULTI_MEMBER = "llc_multi_member",
  S_CORPORATION = "s_corporation",
  C_CORPORATION = "c_corporation",
  PARTNERSHIP = "partnership",
}

export enum TaxAccountType {
  TRADITIONAL_401K = "traditional_401k",
  ROTH_401K = "roth_401k",
  TRADITIONAL_IRA = "traditional_ira",
  ROTH_IRA = "roth_ira",
  SEP_IRA = "sep_ira",
  SIMPLE_IRA = "simple_ira",
  HSA = "hsa",
  FSA = "fsa",
  DCFSA = "dcfsa",
  PLAN_529 = "529",
  TAXABLE_BROKERAGE = "taxable_brokerage",
  ESPP = "espp",
}

export enum OptimizationGoal {
  MINIMIZE_CURRENT_YEAR = "minimize_current_year",
  MINIMIZE_LIFETIME = "minimize_lifetime",
  BALANCED = "balanced",
  MAXIMIZE_RETIREMENT = "maximize_retirement",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Dependent {
  id: string;
  name: string;
  relationship: "child" | "parent" | "other";
  dateOfBirth: Date;
  isStudent: boolean;
  livesWithUser: boolean;
  hasDisability: boolean;
}

export interface IncomeSource {
  id: string;
  type:
    | "w2"
    | "self_employment"
    | "investment"
    | "rental"
    | "retirement"
    | "other";
  name: string;
  annualAmount: number;
  isRecurring: boolean;
  taxWithheld?: number;
}

export interface TaxAccount {
  id: string;
  userId: string;
  accountType: TaxAccountType;
  institutionName: string;
  accountName: string;
  currentBalance: number;
  ytdContribution: number;
  contributionLimit: number;
  employerMatch?: number;
  employerMatchPercent?: number;
  vestingPercent?: number;
  isLinked: boolean;
  plaidAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxProfile {
  id: string;
  userId: string;
  taxYear: number;

  // Filing Information
  filingStatus: FilingStatus;
  stateOfResidence: string; // 2-letter state code
  cityOfResidence?: string; // For city taxes (NYC, etc.)

  // Income Information
  grossIncome: number;
  w2Income: number;
  selfEmploymentIncome: number;
  investmentIncome: number;
  dividendIncome: number;
  interestIncome: number;
  capitalGainsShortTerm: number;
  capitalGainsLongTerm: number;
  rentalIncome: number;
  retirementIncome: number;
  otherIncome: number;

  // Tax Withholding
  federalWithheld: number;
  stateWithheld: number;
  estimatedPayments: number;

  // Dependents
  dependents: Dependent[];

  // Employment & Business
  isEmployed: boolean;
  isSelfEmployed: boolean;
  businessType: BusinessType;
  homeOfficeSqft?: number;
  totalHomeSqft?: number;

  // Deductions
  mortgageInterest: number;
  propertyTaxes: number;
  stateTaxesPaid: number;
  charitableDonations: number;
  medicalExpenses: number;
  studentLoanInterest: number;
  educatorExpenses: number;

  // Health Insurance
  hasHdhp: boolean; // High Deductible Health Plan (for HSA eligibility)
  healthInsuranceType:
    | "employer"
    | "marketplace"
    | "private"
    | "medicare"
    | "medicaid"
    | "none";

  // Retirement Accounts.
  // NOTE: no account-level linkage table exists in the schema yet (no
  // institution, balance, employer-match, vesting, or Plaid data source) —
  // this is always [] today. That is a structural gap, not a per-user empty
  // state; see ACCOUNT_LEVEL_DATA_AVAILABLE in the tax API routes that build
  // TaxProfile from the database.
  accounts: TaxAccount[];

  // Current Year Contributions
  ytd401kContribution: number;
  ytdIraContribution: number;
  ytdRothIraContribution: number;
  ytdHsaContribution: number;
  ytdCharitableGiving: number;

  // Age & Retirement
  age?: number; // Current age (for catch-up contribution eligibility)
  targetRetirementAge?: number; // Target retirement age (default: 65)
  expectedAnnualReturnRate?: number; // Expected annual investment return (default: 0.07)

  // Preferences
  optimizationGoal: OptimizationGoal;
  riskTolerance: "conservative" | "moderate" | "aggressive";

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastAnalyzedAt?: Date;
}

export interface CreateTaxProfileInput {
  taxYear?: number;
  filingStatus: FilingStatus;
  stateOfResidence: string;
  grossIncome: number;
  w2Income?: number;
  selfEmploymentIncome?: number;
  investmentIncome?: number;
  dependents?: Dependent[];
  isSelfEmployed?: boolean;
  businessType?: BusinessType;
  hasHdhp?: boolean;
  optimizationGoal?: OptimizationGoal;
}

export type UpdateTaxProfileInput = Partial<
  Omit<TaxProfile, "id" | "userId" | "createdAt" | "updatedAt">
>;

// ============================================================================
// CONTRIBUTION LIMITS (2024)
// ============================================================================

export const CONTRIBUTION_LIMITS_2024 = {
  // 401(k) / 403(b) / 457
  traditional401k: 23000,
  traditional401kCatchUp: 7500, // Age 50+
  total401kLimit: 69000, // Including employer contributions

  // IRA
  traditionalIra: 7000,
  rothIra: 7000,
  iraCatchUp: 1000, // Age 50+

  // HSA
  hsaIndividual: 4150,
  hsaFamily: 8300,
  hsaCatchUp: 1000, // Age 55+

  // FSA
  fsaHealthcare: 3200,
  fsaDependentCare: 5000,

  // SEP IRA
  sepIra: 69000, // Or 25% of compensation
  sepIraPercentLimit: 0.25,

  // SIMPLE IRA
  simpleIra: 16000,
  simpleIraCatchUp: 3500,

  // Social Security
  socialSecurityWageBase: 168600,

  // Standard Deduction
  standardDeductionSingle: 14600,
  standardDeductionMarriedJoint: 29200,
  standardDeductionMarriedSeparate: 14600,
  standardDeductionHeadOfHousehold: 21900,

  // SALT Cap
  saltCap: 10000,

  // Student Loan Interest
  studentLoanInterestMax: 2500,

  // Educator Expenses
  educatorExpensesMax: 300,
} as const;

// ============================================================================
// INCOME THRESHOLDS (2024)
// ============================================================================

export const INCOME_THRESHOLDS_2024 = {
  // Roth IRA Phase-out
  rothIraPhaseOutSingle: { start: 146000, end: 161000 },
  rothIraPhaseOutMarried: { start: 230000, end: 240000 },

  // Traditional IRA Deduction Phase-out (if covered by workplace plan)
  traditionalIraPhaseOutSingle: { start: 77000, end: 87000 },
  traditionalIraPhaseOutMarried: { start: 123000, end: 143000 },

  // Net Investment Income Tax (NIIT)
  niitThresholdSingle: 200000,
  niitThresholdMarried: 250000,
  niitRate: 0.038,

  // Additional Medicare Tax
  additionalMedicareSingle: 200000,
  additionalMedicareMarried: 250000,
  additionalMedicareRate: 0.009,

  // Child Tax Credit Phase-out
  childTaxCreditPhaseOutSingle: 200000,
  childTaxCreditPhaseOutMarried: 400000,

  // EITC Max Income (no children)
  eitcMaxIncomeSingle: 17640,
  eitcMaxIncomeMarried: 24210,
} as const;
