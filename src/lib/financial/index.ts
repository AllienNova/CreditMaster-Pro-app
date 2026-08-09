/**
 * Financial Services - Public API
 *
 * Centralized exports for all financial services
 */

// Manual Account Entry: deleted (Wave 7 remediation, trading/assets cluster).
// Queried the phantom "manual_accounts" table (never migrated) and had zero
// importers of this barrel from outside src/lib/financial itself, confirmed
// via repo-wide grep before deletion — same orphaned-service pattern as
// crypto-wallet-service.ts and real-estate-tracking-service.ts. See
// docs/qa/triage-trading.md.

// Bill Calendar: deleted (Wave 7 remediation, alerts/bills/spending cluster).
// scheduleReminders() wrote bill_reminders rows keyed off a `bills` row shaped
// with columns that were never migrated (name, payee, due_day,
// autopay_enabled, autopay_account_id, reminder_days_before, reminder_types,
// website_url, account_number, is_active) — every read/write against those
// columns was a phantom-column bug. git log --follow showed no real feature
// history (reformat/bulk-authorship commits only) and grep confirmed zero
// importers outside this barrel and its own test. The only other writer of
// `bills`, bill-detection-service.ts, uses exclusively the real columns
// (merchant_name, category, amount, frequency, next_due_date, last_paid_date,
// last_paid_amount, status, is_auto_pay, account_id, notes), so deleting this
// service removes the bug along with its only source — nothing is left
// unexplained. See docs/qa/phantom-table-inventory.md.

// Budget Service
export { BudgetService } from "./budget-service";

// Debt Payoff
export { DebtPayoffService } from "./debt-payoff-service";

// Goal Tracker
export { GoalTracker } from "./goal-tracker";

// Income Tracking
export { incomeTrackingService } from "./income-tracking-service";

// Recommendation Engine
export { RecommendationEngine } from "./recommendation-engine";

// Savings Automation
export { savingsAutomationService } from "./savings-automation-service";

// Spending Analysis
export { spendingAnalysisService } from "./spending-analysis-service";

// Subscription Cancellation
export { subscriptionCancellationService } from "./subscription-cancellation-service";

// Vitality Score
export { vitalityScoreService } from "./vitality-score-service";

// Health Score Calculator
export { HealthScoreCalculator } from "./health-score-calculator";
export { HealthScoreCalculatorV2 } from "./health-score-calculator-v2";

// Financial Aggregation
export { FinancialAggregationService } from "./financial-aggregation-service";

// Smart Budget Engine
export { SmartBudgetEngine } from "./smart-budget-engine";

// Spending Analyzer
export { SpendingAnalyzer } from "./spending-analyzer";

// Real Estate Tracking
export {
  RealEstateTrackingService,
  getRealEstateTrackingService,
  type Property,
  type PropertyType,
  type PropertyStatus,
  type PropertyAddress,
  type PropertyDetails,
  type Mortgage,
  type MortgageType,
  type RentalInfo,
  type PropertyValuation,
  type PortfolioSummary,
  type PropertyAnalytics,
  type AmortizationEntry,
} from "./real-estate-tracking-service";

// Investment Calculators
export {
  InvestmentCalculators,
  investmentCalculators,
  createInvestmentCalculators,
  type CompoundingFrequency,
  type CompoundInterestParams,
  type CompoundInterestResult,
  type YearlyBreakdownEntry,
  type ROIParams,
  type ROIResult,
  type RetirementProjectionParams,
  type RetirementProjectionResult,
  type RetirementYearEntry,
  type FIREResult,
  type DCAResult,
  type DCAPurchase,
  type BreakEvenResult,
  type MortgagePaymentResult,
  type LoanAmortizationEntry,
  type LoanAmortizationResult,
  type RiskAdjustedReturnResult,
} from "./investment-calculators";

// ESG Scoring and Screening
export {
  ESGScoringService,
  esgScoringService,
  createESGScoringService,
  MockESGDataProvider,
  type ESGGrade,
  type ESGPillar,
  type RiskSeverity,
  type ESGTrend,
  type RecommendationPriority,
  type ESGPillarScore,
  type ESGScore,
  type EnvironmentalMetrics,
  type SocialMetrics,
  type GovernanceMetrics,
  type ESGProfile,
  type ESGDataProvider,
  type PortfolioHolding,
  type HoldingESGResult,
  type ESGScreeningResult,
  type ESGScreeningThresholds,
  type ESGHistoryEntry,
  type ESGTrendAnalysis,
  type SectorBenchmark,
  type SectorComparison,
  type ESGRiskFlag,
  type ESGRecommendation,
  type ESGComplianceReport,
  type SectorBreakdownEntry,
} from "./esg-scoring-service";

// Crypto Wallet Tracking
export {
  CryptoWalletService,
  getCryptoWalletService,
  type CryptoWallet,
  type CryptoHolding,
  type CryptoTransaction,
  type CryptoPortfolioSummary,
  type WalletType,
  type NetworkType,
  type ExchangeType,
  type PriceAlert,
} from "./crypto-wallet-service";
