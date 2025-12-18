/**
 * CPFI Credit Store
 * Manages credit scores, monitoring alerts, and credit reports
 * Enhanced with real-time updates and background sync
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  creditScoreApi,
  creditMonitoringApi,
  creditReportApi,
} from '../services/api';
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

  // Monitoring
  monitoringStatus: MonitoringStatus | null;
  alerts: CreditMonitoringAlert[];
  unreadAlertCount: number;
  lastAlertFetch: string | null;

  // Real-time sync
  isBackgroundSyncEnabled: boolean;
  backgroundSyncInterval: number; // in milliseconds
  lastBackgroundSync: string | null;

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
  fetchFactors: (bureau?: string) => Promise<void>;
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

  // Actions - Real-time Updates
  enableBackgroundSync: (intervalMs?: number) => void;
  disableBackgroundSync: () => void;
  performBackgroundSync: () => Promise<void>;
  handleScoreChange: (newScores: CreditScore[], oldScores: CreditScore[]) => Promise<void>;
  handleNewAlert: (alert: CreditMonitoringAlert) => Promise<void>;

  // Actions - Utility
  clearErrors: () => void;
  resetStore: () => void;
}

const initialState = {
  scores: [],
  scoreHistory: null,
  factors: [],
  lastScoreUpdate: null,
  lastScoreFetch: null,
  monitoringStatus: null,
  alerts: [],
  unreadAlertCount: 0,
  lastAlertFetch: null,
  isBackgroundSyncEnabled: false,
  backgroundSyncInterval: 5 * 60 * 1000, // 5 minutes default
  lastBackgroundSync: null,
  isLoadingScores: false,
  isLoadingAlerts: false,
  isRefreshing: false,
  isSyncingInBackground: false,
  scoreError: null,
  alertError: null,
};

// Background sync timer
let backgroundSyncTimer: NodeJS.Timeout | null = null;

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
            const newScores = response.data.scores;
            const now = new Date().toISOString();
            set({
              scores: newScores,
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
              scoreError: response.error?.message || 'Failed to fetch scores',
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
          const response = await creditScoreApi.getHistory({ months });
          if (response.success && response.data) {
            set({ scoreHistory: response.data, isLoadingScores: false });
          } else {
            set({ isLoadingScores: false });
          }
        } catch {
          set({ isLoadingScores: false });
        }
      },

      fetchFactors: async (bureau) => {
        try {
          const response = await creditScoreApi.getFactors(bureau);
          if (response.success && response.data) {
            set({ factors: response.data.factors });
          }
        } catch (error) {
          console.error('Failed to fetch factors:', error);
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
          console.error('Failed to fetch monitoring status:', error);
        }
      },

      fetchAlerts: async (params) => {
        set({ isLoadingAlerts: true, alertError: null });
        try {
          const oldAlerts = get().alerts;
          const response = await creditMonitoringApi.getAlerts(params);
          if (response.success && response.data) {
            const alerts = response.data.items;
            const now = new Date().toISOString();
            set({
              alerts,
              unreadAlertCount: alerts.filter((a) => !a.acknowledged).length,
              lastAlertFetch: now,
              isLoadingAlerts: false,
            });

            // Check for new alerts and notify
            if (oldAlerts.length > 0) {
              const newAlerts = alerts.filter(
                (alert) => !oldAlerts.some((old) => old.id === alert.id)
              );
              for (const alert of newAlerts) {
                await get().handleNewAlert(alert);
              }
            }
          } else {
            set({
              alertError: response.error?.message,
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
          console.error('Failed to acknowledge alert:', error);
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
          console.error('Failed to acknowledge all alerts:', error);
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
          console.error('Failed to toggle bureau monitoring:', error);
        }
      },

      // Real-time update methods
      enableBackgroundSync: (intervalMs = 5 * 60 * 1000) => {
        // Clear existing timer
        if (backgroundSyncTimer) {
          clearInterval(backgroundSyncTimer);
        }

        set({
          isBackgroundSyncEnabled: true,
          backgroundSyncInterval: intervalMs,
        });

        // Start background sync
        backgroundSyncTimer = setInterval(() => {
          get().performBackgroundSync();
        }, intervalMs);

        console.log(`📡 Background sync enabled (interval: ${intervalMs}ms)`);
      },

      disableBackgroundSync: () => {
        if (backgroundSyncTimer) {
          clearInterval(backgroundSyncTimer);
          backgroundSyncTimer = null;
        }

        set({ isBackgroundSyncEnabled: false });
        console.log('📡 Background sync disabled');
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

          console.log('📡 Background sync completed');
        } catch (error) {
          console.error('Background sync failed:', error);
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

            console.log(
              `📊 Score change detected: ${newScore.bureau} ${oldScore.score} → ${newScore.score} (${change > 0 ? '+' : ''}${change})`
            );
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

        console.log(`🔔 New alert notification sent: ${alert.title}`);
      },

      clearErrors: () => set({ scoreError: null, alertError: null }),

      resetStore: () => {
        // Clean up background sync
        if (backgroundSyncTimer) {
          clearInterval(backgroundSyncTimer);
          backgroundSyncTimer = null;
        }
        set(initialState);
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
