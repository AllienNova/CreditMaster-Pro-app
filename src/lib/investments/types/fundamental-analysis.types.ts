/**
 * Fundamental Analysis Type Definitions
 *
 * Types for financial statements, valuation models, and fundamental metrics
 */

import { SignalStrength, RiskLevel } from "./investment.types";

// ============================================================================
// FINANCIAL STATEMENTS
// ============================================================================

export interface IncomeStatement {
  fiscalDate: Date;
  period: "annual" | "quarterly";
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTax: number;
  netIncome: number;
  netMargin: number;
  eps: number;
  epsDiluted: number;
  sharesOutstanding: number;
  sharesDiluted: number;
  ebitda: number;
  ebitdaMargin: number;
}

export interface BalanceSheet {
  fiscalDate: Date;
  period: "annual" | "quarterly";
  totalAssets: number;
  currentAssets: number;
  cash: number;
  shortTermInvestments: number;
  receivables: number;
  inventory: number;
  nonCurrentAssets: number;
  propertyPlantEquipment: number;
  goodwill: number;
  intangibleAssets: number;
  totalLiabilities: number;
  currentLiabilities: number;
  accountsPayable: number;
  shortTermDebt: number;
  nonCurrentLiabilities: number;
  longTermDebt: number;
  totalDebt: number;
  shareholdersEquity: number;
  retainedEarnings: number;
  bookValuePerShare: number;
}

export interface CashFlowStatement {
  fiscalDate: Date;
  period: "annual" | "quarterly";
  operatingCashFlow: number;
  netIncome: number;
  depreciation: number;
  changesInWorkingCapital: number;
  investingCashFlow: number;
  capitalExpenditures: number;
  acquisitions: number;
  investments: number;
  financingCashFlow: number;
  dividendsPaid: number;
  stockRepurchases: number;
  debtIssuance: number;
  debtRepayment: number;
  freeCashFlow: number;
  netChangeInCash: number;
}

// ============================================================================
// VALUATION METRICS
// ============================================================================

export interface ValuationMetrics {
  symbol: string;
  calculatedAt: Date;
  // Price Ratios
  peRatio: number;
  forwardPE: number;
  pegRatio: number;
  pbRatio: number;
  psRatio: number;
  pfcfRatio: number;
  evToEbitda: number;
  evToRevenue: number;
  evToFcf: number;
  // Enterprise Value
  enterpriseValue: number;
  marketCap: number;
  // Per Share Values
  eps: number;
  epsGrowth: number;
  bookValue: number;
  revenuePerShare: number;
  fcfPerShare: number;
  // Dividends
  dividendYield: number;
  dividendPerShare: number;
  payoutRatio: number;
  dividendGrowth5Y: number;
}

export interface ProfitabilityMetrics {
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  ebitdaMargin: number;
  returnOnEquity: number;
  returnOnAssets: number;
  returnOnInvestedCapital: number;
  returnOnCapitalEmployed: number;
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
}

export interface GrowthMetrics {
  revenueGrowthYoY: number;
  revenueGrowth3Y: number;
  revenueGrowth5Y: number;
  netIncomeGrowthYoY: number;
  netIncomeGrowth3Y: number;
  netIncomeGrowth5Y: number;
  epsGrowthYoY: number;
  epsGrowth3Y: number;
  epsGrowth5Y: number;
  fcfGrowthYoY: number;
  bookValueGrowth: number;
  dividendGrowth: number;
}

export interface LeverageMetrics {
  debtToEquity: number;
  debtToAssets: number;
  debtToCapital: number;
  netDebtToEbitda: number;
  interestCoverage: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  workingCapital: number;
  operatingCashFlowToDebt: number;
}

export interface EfficiencyMetrics {
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  cashConversionCycle: number;
  daysInventoryOutstanding: number;
  daysSalesOutstanding: number;
  daysPayablesOutstanding: number;
  fixedAssetTurnover: number;
  capitalIntensity: number;
}

// ============================================================================
// VALUATION MODELS
// ============================================================================

export interface DCFValuation {
  symbol: string;
  calculatedAt: Date;
  // Inputs
  freeCashFlow: number;
  growthRate: number;
  terminalGrowthRate: number;
  discountRate: number;
  projectionYears: number;
  // Projections
  projectedCashFlows: Array<{
    year: number;
    fcf: number;
    discountedFcf: number;
  }>;
  terminalValue: number;
  discountedTerminalValue: number;
  // Results
  enterpriseValue: number;
  equityValue: number;
  fairValue: number;
  currentPrice: number;
  upside: number;
  marginOfSafety: number;
  sensitivity: DCFSensitivity;
}

export interface DCFSensitivity {
  growthRates: number[];
  discountRates: number[];
  fairValues: number[][];
}

export interface ComparableAnalysis {
  symbol: string;
  calculatedAt: Date;
  peers: string[];
  metrics: ComparableMetrics;
  impliedValues: ImpliedValue[];
  averageFairValue: number;
  medianFairValue: number;
  currentPrice: number;
  upside: number;
}

export interface ComparableMetrics {
  subject: FundamentalMetricSet;
  peerAverage: FundamentalMetricSet;
  peerMedian: FundamentalMetricSet;
  percentiles: { [key: string]: number };
}

export interface FundamentalMetricSet {
  peRatio: number;
  pbRatio: number;
  psRatio: number;
  evToEbitda: number;
  evToRevenue: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roic: number;
}

export interface ImpliedValue {
  metric: string;
  peerMultiple: number;
  subjectValue: number;
  impliedPrice: number;
  weight: number;
}

// ============================================================================
// EARNINGS
// ============================================================================

export interface EarningsData {
  symbol: string;
  fiscalQuarter: string;
  reportDate: Date;
  eps: number;
  epsEstimate: number;
  epsSurprise: number;
  epsSurprisePercent: number;
  revenue: number;
  revenueEstimate: number;
  revenueSurprise: number;
  revenueSurprisePercent: number;
  guidance?: EarningsGuidance;
}

export interface EarningsGuidance {
  epsLow?: number;
  epsHigh?: number;
  revenueLow?: number;
  revenueHigh?: number;
  commentary?: string;
}

export interface EarningsHistory {
  symbol: string;
  earnings: EarningsData[];
  beatRate: number;
  avgSurprise: number;
  trend: "improving" | "stable" | "declining";
}

export interface EarningsCalendar {
  symbol: string;
  nextEarningsDate: Date;
  nextEarningsTime: "before_market" | "after_market" | "unknown";
  estimatedEps: number;
  estimatedRevenue: number;
  analystCount: number;
}

// ============================================================================
// SECTOR & INDUSTRY COMPARISON
// ============================================================================

export interface SectorAnalysis {
  symbol: string;
  sector: string;
  industry: string;
  sectorRank: number;
  industryRank: number;
  sectorPeers: number;
  industryPeers: number;
  metrics: {
    metric: string;
    value: number;
    sectorAvg: number;
    industryAvg: number;
    percentileVsSector: number;
    percentileVsIndustry: number;
  }[];
  strengths: string[];
  weaknesses: string[];
}

// ============================================================================
// COMPREHENSIVE FUNDAMENTAL ANALYSIS
// ============================================================================

export interface FundamentalAnalysis {
  symbol: string;
  analyzedAt: Date;
  valuation: ValuationMetrics;
  profitability: ProfitabilityMetrics;
  growth: GrowthMetrics;
  leverage: LeverageMetrics;
  efficiency: EfficiencyMetrics;
  dcfValuation?: DCFValuation;
  comparableAnalysis?: ComparableAnalysis;
  earningsHistory: EarningsHistory;
  sectorAnalysis: SectorAnalysis;
  qualityScore: number;
  valueScore: number;
  growthScore: number;
  financialHealthScore: number;
  overallScore: number;
  signal: SignalStrength;
  fairValueEstimate: number;
  upside: number;
  riskLevel: RiskLevel;
  summary: string;
  keyMetrics: Array<{
    name: string;
    value: number;
    status: "good" | "neutral" | "concern";
  }>;
}
