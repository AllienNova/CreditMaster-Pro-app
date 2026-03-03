/**
 * Fynvita Mobile Store Layer
 *
 * Comprehensive state management with:
 * - Zustand stores with persistence
 * - Offline support with sync queue
 * - Type-safe selectors
 * - Automatic data synchronization
 * - Modular architecture (split from monolithic financialStore)
 */

// Auth Store
export { useAuthStore } from "./authStore";

// Credit Store
export {
  useCreditStore,
  selectScores,
  selectAverageScore,
  selectScoreByBureau,
  selectUnreadAlerts,
  selectIsMonitoringActive,
} from "./creditStore";

// Dispute Store
export {
  useDisputeStore,
  selectDisputes,
  selectDisputesByStatus,
  selectActiveDisputes,
  selectResolvedDisputes,
  selectDisputeStats,
} from "./disputeStore";

// Dashboard Store (formerly part of financialStore)
export {
  useDashboardStore,
  selectDashboard,
  selectNetWorth,
  selectTotalAssets,
  selectTotalLiabilities,
  selectSavingsRate,
  selectMonthlyIncome,
  selectMonthlyExpenses,
  selectCashFlow,
} from "./dashboardStore";

// Account Store (split from financialStore)
export {
  useAccountStore,
  selectAccounts,
  selectSelectedAccount,
  selectAccountsByType,
  selectTotalBalance,
} from "./accountStore";

// Transaction Store (split from financialStore)
export {
  useTransactionStore,
  selectTransactions,
  selectCategories,
  selectTransactionsByCategory,
  selectTransactionsByAccount,
  selectRecentTransactions,
} from "./transactionStore";

// Budget Store (split from financialStore)
export {
  useBudgetStore,
  selectBudgets,
  selectAlerts as selectBudgetAlerts,
  selectBudgetByCategory,
  selectOverBudgetAlerts,
  selectWarningAlerts,
  selectBudgetProgress,
} from "./budgetStore";

// Goal Store (split from financialStore)
export {
  useGoalStore,
  selectGoals,
  selectActiveGoals,
  selectCompletedGoals,
  selectGoalById,
  selectGoalProgress,
  selectTotalGoalProgress,
} from "./goalStore";

// Debt Store (split from financialStore)
export {
  useDebtStore,
  selectDebtOverview,
  selectTotalDebt,
  selectDebts,
  selectMonthlyPayments,
  selectPayoffCalculation,
  selectDebtsByType,
  selectHighestInterestDebt,
  selectSmallestDebt,
  selectDebtFreeDate,
  selectInterestSavings,
} from "./debtStore";

// Notification Store
export {
  useNotificationStore,
  selectNotifications,
  selectUnreadNotifications,
  selectUnreadCount,
  selectNotificationsByType,
  selectPushEnabled,
} from "./notificationStore";

// Sync Store
export {
  useSyncStore,
  selectIsOnline,
  selectIsSyncing,
  selectPendingCount,
  selectFailedCount,
  selectHasPendingChanges,
} from "./syncStore";

// Investment Store
export {
  useInvestmentStore,
  selectPortfolio,
  selectPortfolioAnalysis,
  selectHoldings,
  selectWatchlist,
  selectCurrentRecommendation,
  selectCurrentPatternScan,
  selectIsLoading as selectInvestmentLoading,
  selectError as selectInvestmentError,
  selectRecommendationForSymbol,
  selectPatternScanForSymbol,
} from "./investmentStore";

// Coach Store
export { useCoachStore } from "./coachStore";

// Student Loan Store
export {
  useStudentLoanStore,
  selectLoans as selectStudentLoans,
  selectSelectedLoan,
  selectPortfolioStats as selectStudentLoanStats,
  selectStrategies as selectRepaymentStrategies,
  selectSelectedStrategy,
  selectFinancialSituation,
  selectEligibilityResults,
  selectTotalDebt as selectStudentLoanTotalDebt,
  selectTotalMonthlyPayment as selectStudentLoanMonthlyPayment,
  selectAverageInterestRate as selectStudentLoanAvgRate,
  selectLoansByType,
  selectLoansByStatus,
  selectFederalLoans,
  selectPrivateLoans,
  selectLoansInRepayment,
  selectHighestInterestLoan,
  selectSmallestBalanceLoan,
  selectRecommendedStrategy,
  selectPSLFEligibleLoans,
  selectIDREligibleLoans,
  selectIsLoading as selectStudentLoanLoading,
  selectError as selectStudentLoanError,
} from "./studentLoanStore";

// Gamification Store
export { useGamificationStore } from "./gamificationStore";

// Tax Store
export {
  useTaxStore,
  selectAnalysis as selectTaxAnalysis,
  selectBrackets as selectTaxBrackets,
  selectRecommendations as selectTaxRecommendations,
  selectPendingRecommendations as selectPendingTaxRecommendations,
  selectCriticalRecommendations as selectCriticalTaxRecommendations,
  selectTotalPotentialSavings,
  selectEffectiveRate as selectTaxEffectiveRate,
  selectMonthlyTakeHome as selectTaxMonthlyTakeHome,
  selectEvents as selectTaxEvents,
  selectUpcomingEvents as selectUpcomingTaxEvents,
  selectCriticalEvents as selectCriticalTaxEvents,
  selectDeductionCategories,
  selectDeductionSummary,
  selectTotalDeductions,
  selectDocuments as selectTaxDocuments,
  selectUnverifiedDocuments as selectUnverifiedTaxDocuments,
  selectTips as selectTaxTips,
  selectYearComparisons,
  selectIsLoading as selectTaxIsLoading,
  selectError as selectTaxError,
} from "./taxStore";

// Re-export student loan types
export type {
  StudentLoan,
  PortfolioStats as StudentLoanPortfolioStats,
  AIStrategyRecommendation,
  CreateLoanInput,
  UpdateLoanInput,
  FinancialSituation,
  LoanStatus,
  LoanType,
} from "./studentLoanStore";

// DEPRECATED: For backward compatibility only - remove in next major version
export { useDashboardStore as useFinancialStore } from "./dashboardStore";

/**
 * Initialize all stores and listeners
 * Call this on app startup
 */
export async function initializeStores(): Promise<void> {
  const { useAuthStore } = await import("./authStore");
  const { useSyncStore } = await import("./syncStore");

  // Initialize auth
  await useAuthStore.getState().initialize();

  // Initialize network listener
  const unsubscribe = useSyncStore.getState().initializeNetworkListener();

  // Store cleanup function for later use
  (globalThis as Record<string, unknown>).__storeCleanup = unsubscribe;
}

/**
 * Reset all stores (for logout)
 * Updated to include new modular stores
 */
export async function resetAllStores(): Promise<void> {
  const { useCreditStore } = await import("./creditStore");
  const { useDisputeStore } = await import("./disputeStore");
  const { useDashboardStore } = await import("./dashboardStore");
  const { useAccountStore } = await import("./accountStore");
  const { useTransactionStore } = await import("./transactionStore");
  const { useBudgetStore } = await import("./budgetStore");
  const { useGoalStore } = await import("./goalStore");
  const { useDebtStore } = await import("./debtStore");
  const { useNotificationStore } = await import("./notificationStore");
  const { useSyncStore } = await import("./syncStore");
  const { useInvestmentStore } = await import("./investmentStore");
  const { useStudentLoanStore } = await import("./studentLoanStore");
  const { useGamificationStore } = await import("./gamificationStore");
  const { useTaxStore } = await import("./taxStore");

  // Reset all stores
  useCreditStore.getState().resetStore();
  useDisputeStore.getState().resetStore();
  useDashboardStore.getState().resetStore();
  useAccountStore.getState().resetStore();
  useTransactionStore.getState().resetStore();
  useBudgetStore.getState().resetStore();
  useGoalStore.getState().resetStore();
  useDebtStore.getState().resetStore();
  useNotificationStore.getState().resetStore();
  useSyncStore.getState().resetStore();
  useInvestmentStore.getState().reset();
  useStudentLoanStore.getState().resetStore();
  useGamificationStore.getState().resetStore();
  useTaxStore.getState().resetStore();
}

/**
 * Fetch all initial data after login
 * Updated to use new modular stores
 */
export async function fetchInitialData(): Promise<void> {
  const { useCreditStore } = await import("./creditStore");
  const { useDisputeStore } = await import("./disputeStore");
  const { useDashboardStore } = await import("./dashboardStore");
  const { useAccountStore } = await import("./accountStore");
  const { useTransactionStore } = await import("./transactionStore");
  const { useBudgetStore } = await import("./budgetStore");
  const { useGoalStore } = await import("./goalStore");
  const { useDebtStore } = await import("./debtStore");
  const { useNotificationStore } = await import("./notificationStore");
  const { useInvestmentStore } = await import("./investmentStore");
  const { useStudentLoanStore } = await import("./studentLoanStore");
  const { useGamificationStore } = await import("./gamificationStore");
  const { useTaxStore } = await import("./taxStore");

  // Fetch data in parallel
  await Promise.all([
    // Credit data
    useCreditStore.getState().fetchScores(),
    useCreditStore.getState().fetchMonitoringStatus(),

    // Dispute data
    useDisputeStore.getState().fetchDisputes(),
    useDisputeStore.getState().fetchTemplates(),

    // Financial data (modular)
    useDashboardStore.getState().fetchDashboard(),
    useAccountStore.getState().fetchAccounts(),
    useTransactionStore.getState().fetchTransactions(),
    useBudgetStore.getState().fetchBudgets(),
    useGoalStore.getState().fetchGoals(),
    useDebtStore.getState().fetchOverview(),

    // Investment data
    useInvestmentStore.getState().fetchPortfolio(),

    // Student loan data
    useStudentLoanStore.getState().fetchLoans(),

    // Gamification data
    useGamificationStore.getState().fetchProgress(),
    useGamificationStore.getState().fetchBadges(),
    useGamificationStore.getState().fetchQuests(),

    // Tax data
    useTaxStore.getState().fetchEvents(),
    useTaxStore.getState().fetchDeductionCategories(),
    useTaxStore.getState().fetchTips(),

    // Notifications
    useNotificationStore.getState().fetchNotifications(),
    useNotificationStore.getState().fetchPreferences(),
  ]);
}

/**
 * Sync all offline data
 */
export async function syncOfflineData(): Promise<{
  success: number;
  failed: number;
}> {
  const { useSyncStore } = await import("./syncStore");
  return useSyncStore.getState().syncAll();
}
