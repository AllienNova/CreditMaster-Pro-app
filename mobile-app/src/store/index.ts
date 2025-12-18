/**
 * CPFI Mobile Store Layer
 * 
 * Comprehensive state management with:
 * - Zustand stores with persistence
 * - Offline support with sync queue
 * - Type-safe selectors
 * - Automatic data synchronization
 */

// Auth Store
export { useAuthStore } from './authStore';

// Credit Store
export { 
  useCreditStore,
  selectScores,
  selectAverageScore,
  selectScoreByBureau,
  selectUnreadAlerts,
  selectIsMonitoringActive,
} from './creditStore';

// Dispute Store
export {
  useDisputeStore,
  selectDisputes,
  selectDisputesByStatus,
  selectActiveDisputes,
  selectResolvedDisputes,
  selectDisputeStats,
} from './disputeStore';

// Financial Store
export {
  useFinancialStore,
  selectNetWorth,
  selectTotalAssets,
  selectTotalLiabilities,
  selectSavingsRate,
  selectAccountsByType,
  selectTotalBalance,
  selectBudgetProgress,
  selectGoalProgress,
} from './financialStore';

// Notification Store
export {
  useNotificationStore,
  selectNotifications,
  selectUnreadNotifications,
  selectUnreadCount,
  selectNotificationsByType,
  selectPushEnabled,
} from './notificationStore';

// Sync Store
export {
  useSyncStore,
  selectIsOnline,
  selectIsSyncing,
  selectPendingCount,
  selectFailedCount,
  selectHasPendingChanges,
} from './syncStore';

/**
 * Initialize all stores and listeners
 * Call this on app startup
 */
export async function initializeStores(): Promise<void> {
  const { useAuthStore } = await import('./authStore');
  const { useSyncStore } = await import('./syncStore');
  
  // Initialize auth
  await useAuthStore.getState().initialize();
  
  // Initialize network listener
  const unsubscribe = useSyncStore.getState().initializeNetworkListener();
  
  // Store cleanup function for later use
  (globalThis as Record<string, unknown>).__storeCleanup = unsubscribe;
}

/**
 * Reset all stores (for logout)
 */
export async function resetAllStores(): Promise<void> {
  const { useCreditStore } = await import('./creditStore');
  const { useDisputeStore } = await import('./disputeStore');
  const { useFinancialStore } = await import('./financialStore');
  const { useNotificationStore } = await import('./notificationStore');
  const { useSyncStore } = await import('./syncStore');
  
  useCreditStore.getState().resetStore();
  useDisputeStore.getState().resetStore();
  useFinancialStore.getState().resetStore();
  useNotificationStore.getState().resetStore();
  useSyncStore.getState().resetStore();
}

/**
 * Fetch all initial data after login
 */
export async function fetchInitialData(): Promise<void> {
  const { useCreditStore } = await import('./creditStore');
  const { useDisputeStore } = await import('./disputeStore');
  const { useFinancialStore } = await import('./financialStore');
  const { useNotificationStore } = await import('./notificationStore');
  
  // Fetch data in parallel
  await Promise.all([
    useCreditStore.getState().fetchScores(),
    useCreditStore.getState().fetchMonitoringStatus(),
    useDisputeStore.getState().fetchDisputes(),
    useDisputeStore.getState().fetchTemplates(),
    useFinancialStore.getState().fetchDashboard(),
    useFinancialStore.getState().fetchAccounts(),
    useNotificationStore.getState().fetchNotifications(),
    useNotificationStore.getState().fetchPreferences(),
  ]);
}

/**
 * Sync all offline data
 */
export async function syncOfflineData(): Promise<{ success: number; failed: number }> {
  const { useSyncStore } = await import('./syncStore');
  return useSyncStore.getState().syncAll();
}
