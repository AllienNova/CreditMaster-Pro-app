/**
 * Fynvita Credit Store
 * Manages credit scores, monitoring alerts, and credit reports
 * Enhanced with real-time updates and background sync
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { creditScoreApi, creditMonitoringApi } from '../services/api';
import type {
  CreditScore,
  CreditFactor,
  CreditScoreHistory,
  CreditMonitoringAlert,
  MonitoringStatus,
} from '../services/api/types';
import { pushNotificationService } from '../services/notifications/pushNotificationService';

interface CreditState {
  // Credit Scores
  scores: CreditScore[];
  scoreHistory: CreditScoreHistory | null;
  factors: CreditFactor[];
  lastScoreUpdate: string | null;
  lastScoreFetch: string | null;
  currentScore: number | null; // Computed from scores

  // Monitoring
  monitoringStatus: MonitoringStatus | null;
  alerts: CreditMonitoringAlert[];
  unreadAlertCount: number;
  lastAlertFetch: string | null;

  // Real-time sync
  isBackgroundSyncEnabled: boolean;
  backgroundSyncInterval: number; // in milliseconds
  lastBackgroundSync: string | null;
  _backgroundSyncTimer: NodeJS.Timeout | null; // MEMORY LEAK FIX: Moved to instance scope

  // Loading states
  isLoadingScores: boolean;
  isLoadingAlerts: boolean;
  isRefreshing: boolean;
  isSyncingInBackground: boolean;

  // Errors
  scoreError: string | null;
  alertError: string | null;

  // Actions - Scores
  fetchScores: () => Promise<void>;
  fetchScoreHistory: (months?: number) => Promise<void>;
  fetchFactors: () => Promise<void>;
  refreshScores: () => Promise<void>;
  simulateImpact: (scenarios: {
    payOffDebt?: number;
    newCreditLine?: number;
    closeAccount?: boolean;
    latePayment?: boolean;
  }) => Promise<{
    currentScore: number;
    projectedScore: number;
    impact: number;
  } | null>;

  // Actions - Monitoring
  fetchMonitoringStatus: () => Promise<void>;
  fetchAlerts: (params?: { unreadOnly?: boolean }) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  acknowledgeAllAlerts: () => Promise<void>;
  toggleBureauMonitoring: (bureau: string, enabled: boolean) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  updateAlertPreferences: (preferences: Record<string, boolean>) => Promise<void>;
  toggleMonitoring: (enabled: boolean) => Promise<void>;

  // Actions - Real-time Updates
  enableBackgroundSync: (intervalMs?: number) => void;
  disableBackgroundSync: () => void;
  performBackgroundSync: () => Promise<void>;
  handleScoreChange: (newScores: CreditScore[], oldScores: CreditScore[]) => Promise<void>;
  handleNewAlert: (alert: CreditMonitoringAlert) => Promise<void>;

  // Actions - Utility
  clearErrors: () => void;
  resetStore: () => void;

  // Actions - Direct setters for hooks
  setScores: (scores: CreditScore[]) => void;
  updateScore: (bureau: string, score: number) => void;
}

export type { CreditState };

const initialState = {
  scores: [] as CreditScore[],
  scoreHistory: null as CreditScoreHistory | null,
  factors: [] as CreditFactor[],
  lastScoreUpdate: null as string | null,
  lastScoreFetch: null as string | null,
  currentScore: null as number | null,
  monitoringStatus: null as MonitoringStatus | null,
  alerts: [] as CreditMonitoringAlert[],
  unreadAlertCount: 0,
  lastAlertFetch: null as string | null,
  isBackgroundSyncEnabled: false,
  backgroundSyncInterval: 5 * 60 * 1000, // 5 minutes default
  lastBackgroundSync: null as string | null,
  _backgroundSyncTimer: null as NodeJS.Timeout | null, // MEMORY LEAK FIX: Timer in state
  isLoadingScores: false,
  isLoadingAlerts: false,
  isRefreshing: false,
  isSyncingInBackground: false,
  scoreError: null as string | null,
  alertError: null as string | null,
};

export const useCreditStore = create<CreditState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchScores: async () => {
        set({ isLoadingScores: true, scoreError: null });
        try {
          const oldScores = get().scores;
          const response = await creditScoreApi.getScores();
          if (response.success && response.data) {
            const newScores = response.data;
            const now = new Date().toISOString();
            // Calculate average score
            const avgScore = newScores.length > 0
              ? Math.round(newScores.reduce((sum, s) => sum + s.score, 0) / newScores.length)
              : null;
            set({
              scores: newScores,
              currentScore: avgScore,
              lastScoreUpdate: now,
              lastScoreFetch: now,
              isLoadingScores: false,
            });

            // Check for score changes and notify
            if (oldScores.length > 0) {
              await get().handleScoreChange(newScores, oldScores);
            }
          } else {
            set({
              scoreError: (response.error as { message?: string })?.message || 'Failed to fetch scores',
              isLoadingScores: false,
            });
          }
        } catch (error) {
          set({
            scoreError:
              error instanceof Error ? error.message : 'Unknown error',
            isLoadingScores: false,
          });
        }
      },

      fetchScoreHistory: async (months = 6) => {
        set({ isLoadingScores: true });
        try {
          const response = await creditScoreApi.getHistory(months);
          if (response.success && response.data) {
            // Convert array to history format
            const scores = response.data;
            const history: CreditScoreHistory = {
              history: scores.map(s => ({ date: s.date, score: s.score, bureau: s.bureau })),
              averageScore: scores.reduce((sum, s) => sum + s.score, 0) / (scores.length || 1),
              highestScore: Math.max(...scores.map(s => s.score), 0),
              lowestScore: Math.min(...scores.map(s => s.score), 850),
              trend: 'stable',
              periodStart: scores[scores.length - 1]?.date || new Date().toISOString(),
              periodEnd: scores[0]?.date || new Date().toISOString(),
            };
            set({ scoreHistory: history, isLoadingScores: false });
          } else {
            set({ isLoadingScores: false });
          }
        } catch {
          set({ isLoadingScores: false });
        }
      },

      fetchFactors: async () => {
        try {
          const response = await creditScoreApi.getFactors();
          if (response.success && response.data) {
            // Transform API response to CreditFactor[]
            const factors: CreditFactor[] = response.data.map((f, index) => ({
              id: `factor-${index}`,
              name: f.factor,
              impact: f.impact > 0 ? 'positive' : f.impact < 0 ? 'negative' : 'neutral',
              category: 'payment_history' as const,
              description: f.status,
            }));
            set({ factors });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch factors:', error);
        }
      },

      refreshScores: async () => {
        set({ isRefreshing: true, scoreError: null });
        try {
          const response = await creditScoreApi.refreshScores();
          if (response.success) {
            // Wait a moment then fetch updated scores
            setTimeout(() => get().fetchScores(), 2000);
          }
          set({ isRefreshing: false });
        } catch (error) {
          set({
            scoreError:
              error instanceof Error ? error.message : 'Refresh failed',
            isRefreshing: false,
          });
        }
      },

      simulateImpact: async (scenarios) => {
        try {
          const response = await creditScoreApi.simulateImpact(scenarios);
          if (response.success && response.data) {
            return {
              currentScore: response.data.currentScore,
              projectedScore: response.data.projectedScore,
              impact: response.data.impact,
            };
          }
          return null;
        } catch {
          return null;
        }
      },

      fetchMonitoringStatus: async () => {
        try {
          const response = await creditMonitoringApi.getStatus();
          if (response.success && response.data) {
            set({ monitoringStatus: response.data });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch monitoring status:', error);
        }
      },

      fetchAlerts: async (params) => {
        set({ isLoadingAlerts: true, alertError: null });
        try {
          const oldAlerts = get().alerts;
          const response = await creditMonitoringApi.getAlerts(params);
          if (response.success && response.data) {
            const paginatedData = response.data;
            const alerts = paginatedData.items;
            const now = new Date().toISOString();
            set({
              alerts,
              unreadAlertCount: alerts.filter((a: CreditMonitoringAlert) => !a.acknowledged).length,
              lastAlertFetch: now,
              isLoadingAlerts: false,
            });

            // Check for new alerts and notify
            if (oldAlerts.length > 0) {
              const newAlerts = alerts.filter(
                (alert: CreditMonitoringAlert) => !oldAlerts.some((old) => old.id === alert.id)
              );
              for (const alert of newAlerts) {
                await get().handleNewAlert(alert);
              }
            }
          } else {
            set({
              alertError: (response.error as { message?: string })?.message || 'Failed to fetch alerts',
              isLoadingAlerts: false,
            });
          }
        } catch (error) {
          set({
            alertError:
              error instanceof Error ? error.message : 'Failed to fetch alerts',
            isLoadingAlerts: false,
          });
        }
      },

      acknowledgeAlert: async (alertId) => {
        try {
          const response = await creditMonitoringApi.acknowledgeAlert(alertId);
          if (response.success) {
            set((state) => ({
              alerts: state.alerts.map((a) =>
                a.id === alertId ? { ...a, acknowledged: true } : a
              ),
              unreadAlertCount: Math.max(0, state.unreadAlertCount - 1),
            }));
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to acknowledge alert:', error);
        }
      },

      acknowledgeAllAlerts: async () => {
        try {
          const response = await creditMonitoringApi.acknowledgeAllAlerts();
          if (response.success) {
            set((state) => ({
              alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })),
              unreadAlertCount: 0,
            }));
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to acknowledge all alerts:', error);
        }
      },

      toggleBureauMonitoring: async (bureau, enabled) => {
        try {
          const response = await creditMonitoringApi.toggleBureauMonitoring(
            bureau,
            enabled
          );
          if (response.success) {
            get().fetchMonitoringStatus();
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to toggle bureau monitoring:', error);
        }
      },

      // Real-time update methods
      enableBackgroundSync: (intervalMs = 5 * 60 * 1000) => {
        // MEMORY LEAK FIX: Clear existing timer from state
        const currentTimer = get()._backgroundSyncTimer;
        if (currentTimer) {
          clearInterval(currentTimer);
        }

        // Start background sync timer
        const timer = setInterval(() => {
          get().performBackgroundSync();
        }, intervalMs);

        set({
          isBackgroundSyncEnabled: true,
          backgroundSyncInterval: intervalMs,
          _backgroundSyncTimer: timer, // MEMORY LEAK FIX: Store in state
        });

        if (__DEV__) {
          console.log(`📡 Background sync enabled (interval: ${intervalMs}ms)`);
        }
      },

      disableBackgroundSync: () => {
        // MEMORY LEAK FIX: Clear timer from state
        const currentTimer = get()._backgroundSyncTimer;
        if (currentTimer) {
          clearInterval(currentTimer);
        }

        set({
          isBackgroundSyncEnabled: false,
          _backgroundSyncTimer: null, // MEMORY LEAK FIX: Clear state reference
        });
        if (__DEV__) {
          console.log('📡 Background sync disabled');
        }
      },

      performBackgroundSync: async () => {
        const { isSyncingInBackground, isLoadingScores, isLoadingAlerts } = get();

        // Skip if already syncing or loading
        if (isSyncingInBackground || isLoadingScores || isLoadingAlerts) {
          return;
        }

        set({ isSyncingInBackground: true });

        try {
          // Fetch scores and alerts in parallel
          await Promise.all([
            get().fetchScores(),
            get().fetchAlerts(),
          ]);

          set({
            lastBackgroundSync: new Date().toISOString(),
            isSyncingInBackground: false,
          });

          if (__DEV__) {
            console.log('📡 Background sync completed');
          }
        } catch (error) {
          if (__DEV__) console.error('Background sync failed:', error);
          set({ isSyncingInBackground: false });
        }
      },

      handleScoreChange: async (newScores, oldScores) => {
        // Detect significant score changes
        for (const newScore of newScores) {
          const oldScore = oldScores.find((s) => s.bureau === newScore.bureau);

          if (oldScore && oldScore.score !== newScore.score) {
            const change = newScore.score - oldScore.score;
            const direction = change > 0 ? 'increased' : 'decreased';
            const absChange = Math.abs(change);

            // Send notification for significant changes (5+ points)
            if (absChange >= 5) {
              await pushNotificationService.scheduleLocalNotification(
                `Credit Score ${direction === 'increased' ? '📈' : '📉'}`,
                `Your ${newScore.bureau} score ${direction} by ${absChange} points to ${newScore.score}`,
                {
                  screen: '/credit/score-detail',
                  params: { bureau: newScore.bureau },
                }
              );
            }

            if (__DEV__) {
              console.log(
                `📊 Score change detected: ${newScore.bureau} ${oldScore.score} → ${newScore.score} (${change > 0 ? '+' : ''}${change})`
              );
            }
          }
        }
      },

      handleNewAlert: async (alert) => {
        // Send push notification for new alert
        const severityEmoji = {
          critical: '🚨',
          high: '⚠️',
          medium: 'ℹ️',
          low: '📋',
        }[alert.severity] || '📢';

        await pushNotificationService.scheduleLocalNotification(
          `${severityEmoji} ${alert.title}`,
          alert.description,
          {
            screen: '/monitoring/alerts',
            id: alert.id,
          }
        );

        if (__DEV__) {
          console.log(`🔔 New alert notification sent: ${alert.title}`);
        }
      },

      deleteAlert: async (alertId: string) => {
        try {
          const response = await creditMonitoringApi.acknowledgeAlert(alertId);
          if (response.success) {
            set((state) => ({
              alerts: state.alerts.filter((a) => a.id !== alertId),
            }));
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to delete alert:', error);
        }
      },

      updateAlertPreferences: async (preferences: Record<string, boolean>) => {
        try {
          const response = await creditMonitoringApi.updatePreferences(preferences);
          if (response.success) {
            // Refresh monitoring status to get updated preferences
            await get().fetchMonitoringStatus();
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to update alert preferences:', error);
        }
      },

      toggleMonitoring: async (enabled: boolean) => {
        try {
          // Toggle all bureaus
          const bureaus = ['experian', 'equifax', 'transunion'];
          for (const bureau of bureaus) {
            await get().toggleBureauMonitoring(bureau, enabled);
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to toggle monitoring:', error);
        }
      },

      clearErrors: () => set({ scoreError: null, alertError: null }),

      resetStore: () => {
        // MEMORY LEAK FIX: Clean up background sync timer from state
        const currentTimer = get()._backgroundSyncTimer;
        if (currentTimer) {
          clearInterval(currentTimer);
        }
        set(initialState);
      },

      setScores: (scores) => {
        const currentScore = scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
          : null;
        set({ scores, currentScore, lastScoreUpdate: new Date().toISOString() });
      },

      updateScore: (bureau, score) => {
        const scores = get().scores.map(s =>
          s.bureau.toLowerCase() === bureau.toLowerCase()
            ? { ...s, score, change: score - s.score }
            : s
        );
        const currentScore = scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
          : null;
        set({ scores, currentScore, lastScoreUpdate: new Date().toISOString() });
      },
    }),
    {
      name: 'cpfi-credit-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        scores: state.scores,
        lastScoreUpdate: state.lastScoreUpdate,
        monitoringStatus: state.monitoringStatus,
      }),
    }
  )
);

// Selectors
export const selectScores = (state: CreditState) => state.scores;
export const selectAverageScore = (state: CreditState) => {
  if (state.scores.length === 0) return 0;
  return Math.round(
    state.scores.reduce((sum, s) => sum + s.score, 0) / state.scores.length
  );
};
export const selectScoreByBureau = (bureau: string) => (state: CreditState) =>
  state.scores.find((s) => s.bureau.toLowerCase() === bureau.toLowerCase());
export const selectUnreadAlerts = (state: CreditState) =>
  state.alerts.filter((a) => !a.acknowledged);
export const selectIsMonitoringActive = (state: CreditState) =>
  state.monitoringStatus?.isActive ?? false;
export const selectLastScoreFetch = (state: CreditState) => state.lastScoreFetch;
export const selectLastAlertFetch = (state: CreditState) => state.lastAlertFetch;
export const selectIsBackgroundSyncEnabled = (state: CreditState) => state.isBackgroundSyncEnabled;
export const selectLastBackgroundSync = (state: CreditState) => state.lastBackgroundSync;
