/**
 * Fynvita Mobile API Service Layer
 *
 * Comprehensive API service with:
 * - Type-safe API calls
 * - Automatic authentication
 * - Retry logic with exponential backoff
 * - Offline support with request queuing
 * - Response caching
 * - Error handling
 */

// Core client
export {
  api,
  api as apiClient, // Alias for backward compatibility
  apiRequest,
  initializeApiClient,
  processOfflineQueue,
} from './client';

// API modules
export { creditScoreApi, creditMonitoringApi, creditReportApi } from './credit';
export { disputeApi, disputeLetterApi, disputeResourcesApi } from './disputes';
export {
  financialOverviewApi,
  bankAccountApi,
  transactionApi,
  budgetApi,
  financialGoalsApi,
  debtApi,
  billsApi,
  type PlaidLinkToken,
  type PlaidExchangeResult,
} from './financial';
export {
  userProfileApi,
  subscriptionApi,
  notificationApi,
  recommendationApi,
  identityProtectionApi,
  documentApi,
  settingsApi,
} from './user';
export {
  investmentsApi,
  type AssetType,
  type Holding,
  type PortfolioSummary,
  type AllocationItem,
  type PerformancePoint,
  type PortfolioResponse,
  type StockAnalysis,
  type StockAnalysisApiResponse,
  type CreateHoldingInput,
  type UpdateHoldingInput,
  type PortfolioAnalysisResponse,
} from './investments';
export {
  studentLoansApi,
  type StudentLoan,
  type PortfolioStats as StudentLoanPortfolioStats,
  type AIStrategyRecommendation,
  type CreateLoanInput,
  type UpdateLoanInput,
  type FinancialSituation,
  type LoanType,
  type LoanStatus,
} from './studentLoans';
export {
  gamificationApi,
  type GamificationProgress,
  type Badge,
  type UserBadge,
  type BadgeProgress,
  type BadgesResponse,
  type DailyQuest,
  type UserQuestProgress,
  type QuestsResponse,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type LeaderboardType,
  type BadgeCategory,
  type BadgeRarity,
} from './gamification';
export {
  taxAnalysisApi,
  taxScenariosApi,
  taxCalendarApi,
  taxDeductionsApi,
  taxDocumentsApi,
  taxTipsApi,
  taxComparisonApi,
  type TaxAnalysis,
  type TaxRecommendation,
  type TaxProjection,
  type TaxScenarioInput,
  type TaxScenarioResult,
  type TaxEvent,
  type TaxDeduction,
  type DeductionCategory,
  type TaxDocument,
  type TaxBracket,
  type TaxBracketVisualization,
} from './tax';

// Type exports
export * from './types';

// Default exports for convenience
import creditApiDefault from './credit';
import disputesApiDefault from './disputes';
import financialApiDefault from './financial';
import userApiDefault from './user';
import investmentsApiDefault from './investments';
import { studentLoansApi } from './studentLoans';
import { gamificationApi } from './gamification';
import {
  taxAnalysisApi,
  taxScenariosApi,
  taxCalendarApi,
  taxDeductionsApi,
  taxDocumentsApi,
  taxTipsApi,
  taxComparisonApi,
} from './tax';

/**
 * Unified API object for easy access to all services
 */
export const cpfiApi = {
  // Credit services
  credit: creditApiDefault,

  // Dispute services
  disputes: disputesApiDefault,

  // Financial services
  financial: financialApiDefault,

  // User services
  user: userApiDefault,

  // Investment services
  investments: investmentsApiDefault,

  // Student loans services
  studentLoans: studentLoansApi,

  // Gamification services
  gamification: gamificationApi,

  // Tax services
  tax: {
    analysis: taxAnalysisApi,
    scenarios: taxScenariosApi,
    calendar: taxCalendarApi,
    deductions: taxDeductionsApi,
    documents: taxDocumentsApi,
    tips: taxTipsApi,
    comparison: taxComparisonApi,
  },
};

export default cpfiApi;

/**
 * API Service initialization
 * Call this on app startup to initialize offline queue and other features
 */
export async function initializeServices(): Promise<void> {
  const { initializeApiClient } = await import('./client');
  await initializeApiClient();
}

/**
 * Hook to sync offline requests when connectivity is restored
 */
export async function syncOfflineData(): Promise<{
  processed: number;
  failed: number;
}> {
  const { processOfflineQueue } = await import('./client');
  return processOfflineQueue();
}
