/**
 * Tax Strategy Types
 *
 * Defines tax optimization strategies, recommendations, and their metadata.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum StrategyCategory {
  RETIREMENT = "retirement",
  INVESTMENT = "investment",
  DEDUCTION = "deduction",
  TIMING = "timing",
  BUSINESS = "business",
  CREDITS = "credits",
  ESTATE = "estate",
}

export enum StrategyComplexity {
  BASIC = "basic",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

export enum RecommendationPriority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum RecommendationStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DISMISSED = "dismissed",
  EXPIRED = "expired",
}

// ============================================================================
// STRATEGY DEFINITIONS
// ============================================================================

export interface TaxStrategy {
  id: string;
  code: string;
  name: string;
  category: StrategyCategory;
  description: string;
  detailedExplanation: string;

  // Eligibility
  applicableFilingStatuses: string[];
  minIncome?: number;
  maxIncome?: number;
  requiresSelfEmployment?: boolean;
  requiresBusinessOwnership?: boolean;

  // Complexity and Risk
  complexity: StrategyComplexity;
  requiresProfessional: boolean;
  auditRisk: "low" | "medium" | "high";

  // IRS References
  irsFormReference?: string;
  irsPublicationReference?: string;
  irsRulingReference?: string;

  // Temporal
  effectiveDate?: Date;
  expirationDate?: Date;
  isActive: boolean;

  // Metadata
  tags: string[];
  relatedStrategies: string[];
}

export interface ActionStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime?: string;
  link?: string;
  isOptional: boolean;
}

export interface TaxRecommendation {
  id: string;
  userId: string;
  taxYear: number;
  strategyId: string;
  strategy?: TaxStrategy;

  // Recommendation Details
  title: string;
  summary: string;
  description: string;
  actionSteps: ActionStep[];

  // Financial Impact
  estimatedTaxSavings: number;
  estimatedImplementationCost: number;
  netBenefit: number;
  confidenceLevel: number; // 0-1

  // Urgency & Priority
  priority: RecommendationPriority;
  deadline?: Date;
  daysUntilDeadline?: number;

  // Status
  status: RecommendationStatus;
  completedAt?: Date;
  dismissedReason?: string;

  // AI Analysis
  aiReasoning: string;
  aiModelVersion: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BUILT-IN STRATEGY LIBRARY
// ============================================================================

export const TAX_STRATEGIES: Omit<TaxStrategy, "id">[] = [
  // RETIREMENT STRATEGIES
  {
    code: "MAX_401K",
    name: "Maximize 401(k) Contributions",
    category: StrategyCategory.RETIREMENT,
    description:
      "Contribute the maximum allowed to your employer 401(k) to reduce taxable income.",
    detailedExplanation: `Contributing to a traditional 401(k) reduces your taxable income dollar-for-dollar. 
    For 2024, you can contribute up to $23,000 ($30,500 if age 50+). If you're in the 32% tax bracket, 
    maxing out saves you approximately $7,360 in federal taxes alone.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
    ],
    complexity: StrategyComplexity.BASIC,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Form W-2 Box 12",
    irsPublicationReference: "Publication 560",
    isActive: true,
    tags: ["retirement", "401k", "tax-deferred", "employer-plan"],
    relatedStrategies: [
      "EMPLOYER_MATCH",
      "BACKDOOR_ROTH",
      "MEGA_BACKDOOR_ROTH",
    ],
  },
  {
    code: "EMPLOYER_MATCH",
    name: "Capture Full Employer Match",
    category: StrategyCategory.RETIREMENT,
    description:
      "Contribute enough to your 401(k) to get the full employer match - it's free money.",
    detailedExplanation: `Many employers match a percentage of your 401(k) contributions. Common matches 
    are 50% up to 6% of salary or 100% up to 3%. Not capturing this is leaving money on the table. 
    For a $300,000 salary with 50% match up to 6%, that's $9,000/year in free money.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
    ],
    complexity: StrategyComplexity.BASIC,
    requiresProfessional: false,
    auditRisk: "low",
    isActive: true,
    tags: ["retirement", "401k", "employer-match", "free-money"],
    relatedStrategies: ["MAX_401K"],
  },
  {
    code: "BACKDOOR_ROTH",
    name: "Backdoor Roth IRA",
    category: StrategyCategory.RETIREMENT,
    description:
      "Convert Traditional IRA contributions to Roth for tax-free growth when income exceeds Roth limits.",
    detailedExplanation: `If your income exceeds Roth IRA limits ($161,000 single / $240,000 married for 2024), 
    you can still contribute to a Roth by: 1) Contributing to a non-deductible Traditional IRA, 
    2) Converting to Roth shortly after. Warning: Be aware of the pro-rata rule if you have existing 
    Traditional IRA balances.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    minIncome: 146000,
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Form 8606",
    irsPublicationReference: "Publication 590-A",
    isActive: true,
    tags: ["retirement", "roth", "high-income", "tax-free-growth"],
    relatedStrategies: ["MAX_401K", "MEGA_BACKDOOR_ROTH"],
  },
  {
    code: "MEGA_BACKDOOR_ROTH",
    name: "Mega Backdoor Roth",
    category: StrategyCategory.RETIREMENT,
    description:
      "Contribute after-tax dollars to 401(k) and convert to Roth for massive tax-free savings.",
    detailedExplanation: `If your employer plan allows after-tax contributions and in-service distributions, 
    you can contribute up to $69,000 total (including employer match) and convert the after-tax portion 
    to Roth. This allows high earners to shelter significantly more in tax-free accounts. 
    For a $300k earner in the 32% bracket, this could mean $15,000+ in tax-free growth annually.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    minIncome: 150000,
    complexity: StrategyComplexity.ADVANCED,
    requiresProfessional: true,
    auditRisk: "low",
    irsPublicationReference: "Publication 560",
    isActive: true,
    tags: ["retirement", "roth", "high-income", "advanced", "mega-backdoor"],
    relatedStrategies: ["BACKDOOR_ROTH", "MAX_401K"],
  },
  {
    code: "HSA_TRIPLE_TAX",
    name: "HSA Triple Tax Advantage",
    category: StrategyCategory.RETIREMENT,
    description:
      "Maximize HSA contributions for tax-deductible contributions, tax-free growth, and tax-free withdrawals.",
    detailedExplanation: `The HSA is the only account with triple tax benefits: 
    1) Contributions are tax-deductible (or pre-tax via payroll), 
    2) Investments grow tax-free, 
    3) Withdrawals for medical expenses are tax-free. 
    For 2024, limits are $4,150 (individual) or $8,300 (family), plus $1,000 catch-up if 55+. 
    Strategy: Pay medical expenses out-of-pocket now, let HSA grow, reimburse yourself decades later.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    complexity: StrategyComplexity.BASIC,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Form 8889",
    irsPublicationReference: "Publication 969",
    isActive: true,
    tags: ["retirement", "hsa", "healthcare", "triple-tax", "hdhp"],
    relatedStrategies: ["MAX_401K"],
  },
  {
    code: "SEP_IRA",
    name: "SEP IRA for Self-Employed",
    category: StrategyCategory.RETIREMENT,
    description:
      "Contribute up to 25% of net self-employment income (max $69,000) to a SEP IRA.",
    detailedExplanation: `If you have self-employment income, a SEP IRA allows contributions of up to 25% 
    of net self-employment earnings, up to $69,000 for 2024. This is one of the highest contribution 
    limits available and can be established and funded up until your tax filing deadline.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    requiresSelfEmployment: true,
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Form 5498",
    irsPublicationReference: "Publication 560",
    isActive: true,
    tags: ["retirement", "self-employed", "sep-ira", "high-contribution"],
    relatedStrategies: ["SOLO_401K"],
  },

  // INVESTMENT STRATEGIES
  {
    code: "TAX_LOSS_HARVESTING",
    name: "Tax-Loss Harvesting",
    category: StrategyCategory.INVESTMENT,
    description:
      "Sell investments at a loss to offset capital gains and reduce taxable income.",
    detailedExplanation: `Strategically selling investments with unrealized losses can offset capital gains. 
    Additionally, you can deduct up to $3,000 of net capital losses against ordinary income annually, 
    with excess losses carrying forward. Warning: Avoid wash sale rule by not repurchasing 
    "substantially identical" securities within 30 days before/after the sale.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
    ],
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "medium",
    irsFormReference: "Schedule D, Form 8949",
    irsPublicationReference: "Publication 550",
    isActive: true,
    tags: ["investment", "capital-gains", "loss-harvesting", "wash-sale"],
    relatedStrategies: ["LONG_TERM_GAINS", "ASSET_LOCATION"],
  },
  {
    code: "LONG_TERM_GAINS",
    name: "Long-Term Capital Gains Optimization",
    category: StrategyCategory.INVESTMENT,
    description:
      "Hold investments for over one year to qualify for preferential long-term capital gains rates.",
    detailedExplanation: `Short-term capital gains (held < 1 year) are taxed as ordinary income (up to 37%). 
    Long-term gains enjoy preferential rates: 0% (up to $47,025 single), 15% (up to $518,900 single), 
    or 20% above that. For a $300k earner selling $50k in gains, the difference between short-term 
    and long-term could be $6,000+ in savings.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
    ],
    complexity: StrategyComplexity.BASIC,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Schedule D",
    irsPublicationReference: "Publication 550",
    isActive: true,
    tags: ["investment", "capital-gains", "holding-period", "long-term"],
    relatedStrategies: ["TAX_LOSS_HARVESTING", "ASSET_LOCATION"],
  },
  {
    code: "ASSET_LOCATION",
    name: "Asset Location Optimization",
    category: StrategyCategory.INVESTMENT,
    description:
      "Place assets in the most tax-efficient account types to minimize lifetime taxes.",
    detailedExplanation: `Different assets have different tax profiles. Optimal location: 
    - Tax-deferred (401k, IRA): Bonds, REITs, high-dividend stocks (taxed at ordinary income anyway)
    - Tax-free (Roth): High-growth stocks, small caps (maximize tax-free growth)
    - Taxable: Index funds, municipal bonds, tax-efficient ETFs (lower turnover, qualified dividends)
    This can add 0.5-1% annually to after-tax returns.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    complexity: StrategyComplexity.ADVANCED,
    requiresProfessional: false,
    auditRisk: "low",
    isActive: true,
    tags: ["investment", "asset-allocation", "tax-efficiency", "multi-account"],
    relatedStrategies: ["TAX_LOSS_HARVESTING", "LONG_TERM_GAINS"],
  },
  {
    code: "QUALIFIED_DIVIDENDS",
    name: "Qualified Dividend Optimization",
    category: StrategyCategory.INVESTMENT,
    description:
      "Favor investments with qualified dividends for preferential tax treatment.",
    detailedExplanation: `Qualified dividends are taxed at long-term capital gains rates (0%, 15%, or 20%) 
    rather than ordinary income rates (up to 37%). Most US company dividends qualify if you hold the 
    stock for 60+ days. For a $300k earner receiving $20k in dividends, qualified treatment saves ~$3,400.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    complexity: StrategyComplexity.BASIC,
    requiresProfessional: false,
    auditRisk: "low",
    irsPublicationReference: "Publication 550",
    isActive: true,
    tags: ["investment", "dividends", "qualified", "holding-period"],
    relatedStrategies: ["LONG_TERM_GAINS", "ASSET_LOCATION"],
  },

  // DEDUCTION STRATEGIES
  {
    code: "CHARITABLE_BUNCHING",
    name: "Charitable Contribution Bunching",
    category: StrategyCategory.DEDUCTION,
    description:
      "Bunch multiple years of charitable donations into one year to exceed standard deduction.",
    detailedExplanation: `If your itemized deductions are close to the standard deduction ($14,600 single, 
    $29,200 married for 2024), consider "bunching" 2-3 years of charitable giving into one year. 
    This allows you to itemize in the bunching year and take standard deduction in off years. 
    Donor-Advised Funds (DAFs) are perfect for this - get the deduction now, distribute to charities later.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Schedule A",
    irsPublicationReference: "Publication 526",
    isActive: true,
    tags: ["deduction", "charitable", "bunching", "daf", "itemized"],
    relatedStrategies: ["QCD", "APPRECIATED_STOCK_DONATION"],
  },
  {
    code: "APPRECIATED_STOCK_DONATION",
    name: "Donate Appreciated Stock",
    category: StrategyCategory.DEDUCTION,
    description:
      "Donate appreciated securities directly to charity to avoid capital gains and get full deduction.",
    detailedExplanation: `Instead of selling stock, paying capital gains tax, and donating cash, 
    donate the appreciated stock directly. You get a deduction for the full fair market value AND 
    avoid capital gains tax entirely. For $10k of stock with $7k gain, you save ~$1,050 in LTCG tax 
    plus get the $10k charitable deduction.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Form 8283",
    irsPublicationReference: "Publication 526",
    isActive: true,
    tags: ["deduction", "charitable", "stock", "capital-gains", "appreciated"],
    relatedStrategies: ["CHARITABLE_BUNCHING", "QCD"],
  },
  {
    code: "QCD",
    name: "Qualified Charitable Distribution",
    category: StrategyCategory.DEDUCTION,
    description:
      "If 70½+, donate up to $105,000 directly from IRA to charity, excluding it from income.",
    detailedExplanation: `For those 70½ or older, you can transfer up to $105,000 (2024) directly from 
    your IRA to qualified charities. This counts toward your Required Minimum Distribution (RMD) 
    and is completely excluded from taxable income. Unlike regular donations, you don't need to itemize.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    minIncome: 0,
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "low",
    irsFormReference: "Form 1099-R",
    irsPublicationReference: "Publication 590-B",
    isActive: true,
    tags: ["deduction", "charitable", "qcd", "ira", "rmd", "age-70"],
    relatedStrategies: ["CHARITABLE_BUNCHING"],
  },
  {
    code: "HOME_OFFICE",
    name: "Home Office Deduction",
    category: StrategyCategory.BUSINESS,
    description:
      "Deduct home office expenses if you use part of your home exclusively for business.",
    detailedExplanation: `Self-employed individuals can deduct home office expenses using either: 
    1) Simplified method: $5/sq ft, up to 300 sq ft ($1,500 max), or 
    2) Regular method: Actual expenses × business use percentage. 
    The space must be used regularly and exclusively for business. W-2 employees no longer qualify.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    requiresSelfEmployment: true,
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "medium",
    irsFormReference: "Form 8829, Schedule C",
    irsPublicationReference: "Publication 587",
    isActive: true,
    tags: ["business", "self-employed", "home-office", "deduction"],
    relatedStrategies: ["SEP_IRA", "QBI_DEDUCTION"],
  },
  {
    code: "QBI_DEDUCTION",
    name: "Qualified Business Income Deduction",
    category: StrategyCategory.BUSINESS,
    description:
      "Deduct up to 20% of qualified business income from pass-through entities.",
    detailedExplanation: `The Section 199A deduction allows eligible self-employed individuals and 
    pass-through business owners to deduct up to 20% of qualified business income. For a $100k 
    net business profit, this could mean a $20k deduction, saving $6,400+ at the 32% bracket. 
    Phase-outs apply for high earners in specified service trades.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    requiresSelfEmployment: true,
    complexity: StrategyComplexity.ADVANCED,
    requiresProfessional: true,
    auditRisk: "medium",
    irsFormReference: "Form 8995 or 8995-A",
    irsPublicationReference: "Publication 535",
    isActive: true,
    tags: ["business", "qbi", "section-199a", "pass-through", "deduction"],
    relatedStrategies: ["HOME_OFFICE", "SEP_IRA"],
  },

  // TIMING STRATEGIES
  {
    code: "INCOME_DEFERRAL",
    name: "Income Deferral",
    category: StrategyCategory.TIMING,
    description:
      "Defer income to the next tax year if expecting lower income or tax rates.",
    detailedExplanation: `If you expect to be in a lower tax bracket next year (job change, retirement, 
    sabbatical), consider deferring bonuses, self-employment income, or capital gains to January. 
    Conversely, accelerate deductions into the current year. This is especially powerful near 
    bracket boundaries.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    complexity: StrategyComplexity.INTERMEDIATE,
    requiresProfessional: false,
    auditRisk: "low",
    isActive: true,
    tags: ["timing", "deferral", "brackets", "year-end"],
    relatedStrategies: ["INCOME_ACCELERATION", "ROTH_CONVERSION"],
  },
  {
    code: "ROTH_CONVERSION",
    name: "Roth Conversion",
    category: StrategyCategory.TIMING,
    description:
      "Convert Traditional IRA/401k to Roth in low-income years to lock in lower tax rates.",
    detailedExplanation: `Converting Traditional retirement accounts to Roth triggers income tax now, 
    but all future growth is tax-free. Best done in low-income years (early retirement, sabbatical, 
    gap year). For those expecting higher future tax rates or large RMDs, strategic conversions 
    can save significantly over a lifetime.`,
    applicableFilingStatuses: [
      "single",
      "married_filing_jointly",
      "head_of_household",
    ],
    complexity: StrategyComplexity.ADVANCED,
    requiresProfessional: true,
    auditRisk: "low",
    irsFormReference: "Form 8606",
    irsPublicationReference: "Publication 590-B",
    isActive: true,
    tags: ["timing", "roth", "conversion", "retirement", "tax-free"],
    relatedStrategies: ["BACKDOOR_ROTH", "INCOME_DEFERRAL"],
  },
];

export type TaxStrategyCode = (typeof TAX_STRATEGIES)[number]["code"];
