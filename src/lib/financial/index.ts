/**
 * Financial Services - Public API
 *
 * Centralized exports for all financial services
 */

// Auto-Save Rules
export {
  AutoSaveRulesService,
  getAutoSaveRulesService,
  type AutoSaveRule,
  type RuleType,
  type RuleStatus,
  type RuleFrequency,
  type TriggerType,
  type RuleConfig,
  type RoundUpConfig,
  type PercentageConfig,
  type FixedAmountConfig,
  type GoalContributionConfig,
  type PaycheckSplitConfig,
  type SurplusSweepConfig,
  type WindfallCaptureConfig,
  type SaveTransfer,
  type RuleSummary,
} from './auto-save-rules-service';

// Spending Limit Alerts
export {
  SpendingLimitAlertsService,
  getSpendingLimitAlertsService,
  type SpendingLimit,
  type SpendingAlert,
  type SpendingAnalysis,
  type LimitPeriod,
  type AlertSeverity,
  type AlertStatus,
  type LimitType,
  type LimitSummary,
} from './spending-limit-alerts-service';

// Manual Account Entry
export {
  ManualAccountService,
  getManualAccountService,
  type ManualAccount,
  type ManualAccountType,
  type AccountCategory,
  type AccountDetails,
  type RealEstateDetails,
  type VehicleDetails,
  type CryptoDetails,
  type CollectibleDetails,
  type LoanDetails,
  type GenericDetails,
  type ValueHistoryEntry,
  type NetWorthSummary,
} from './manual-account-service';

// Bill Calendar
export { BillCalendarService } from './bill-calendar-service';

// Budget Service
export { BudgetService } from './budget-service';

// Debt Payoff
export { DebtPayoffService } from './debt-payoff-service';

// Goal Tracker
export { GoalTracker } from './goal-tracker';

// Income Tracking
export { incomeTrackingService } from './income-tracking-service';

// Recommendation Engine
export { RecommendationEngine } from './recommendation-engine';

// Savings Automation
export { savingsAutomationService } from './savings-automation-service';

// Spending Analysis
export { spendingAnalysisService } from './spending-analysis-service';

// Subscription Cancellation
export { subscriptionCancellationService } from './subscription-cancellation-service';

// Vitality Score
export { vitalityScoreService } from './vitality-score-service';

// Health Score Calculator
export { HealthScoreCalculator } from './health-score-calculator';
export { HealthScoreCalculatorV2 } from './health-score-calculator-v2';

// Financial Aggregation
export { FinancialAggregationService } from './financial-aggregation-service';

// Smart Budget Engine
export { SmartBudgetEngine } from './smart-budget-engine';

// Spending Analyzer
export { SpendingAnalyzer } from './spending-analyzer';

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
} from './real-estate-tracking-service';

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
} from './crypto-wallet-service';
