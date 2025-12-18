/**
 * CPFI Mobile API Service Layer
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
export { investmentsApi } from './investments';

// Type exports
export * from './types';

// Default exports for convenience
import creditApi from './credit';
import disputesApi from './disputes';
import financialApi from './financial';
import userApi from './user';
import investmentsApi from './investments';

/**
 * Unified API object for easy access to all services
 */
export const cpfiApi = {
  // Credit services
  credit: creditApi,

  // Dispute services
  disputes: disputesApi,

  // Financial services
  financial: financialApi,

  // User services
  user: userApi,

  // Investment services
  investments: investmentsApi,
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
