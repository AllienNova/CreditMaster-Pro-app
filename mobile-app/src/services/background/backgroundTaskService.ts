/**
 * Fynvita Background Task Service
 * Cross-platform background tasks for iOS and Android parity
 * Handles credit monitoring, data sync, and silent push notifications
 */

import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { api } from "../api/client";
import {
  toCreditCheckResult,
  type ApiMonitoringDashboard,
  type CreditCheckResult,
} from "../api/creditCheckAdapter";

// Task names
export const BACKGROUND_TASKS = {
  CREDIT_MONITOR: "FYNVITA_CREDIT_MONITOR",
  DATA_SYNC: "FYNVITA_DATA_SYNC",
  SILENT_PUSH: "FYNVITA_SILENT_PUSH",
  PRICE_ALERT: "FYNVITA_PRICE_ALERT",
} as const;

// Storage keys
const STORAGE_KEYS = {
  LAST_CREDIT_CHECK: "@fynvita_last_credit_check",
  LAST_SYNC: "@fynvita_last_sync",
  BACKGROUND_ENABLED: "@fynvita_background_enabled",
  PRICE_ALERTS: "@fynvita_price_alerts",
};

// Task intervals (in seconds)
const TASK_INTERVALS = {
  CREDIT_MONITOR: 60 * 60, // 1 hour
  DATA_SYNC: 15 * 60, // 15 minutes
};


interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  active: boolean;
}

/**
 * Background Task Service
 * Manages all background operations for the app
 */
class BackgroundTaskService {
  private isInitialized = false;

  /**
   * Initialize background services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      if (__DEV__) {
        console.log("Background services already initialized");
      }
      return;
    }

    try {
      // Register all task handlers
      this.registerTaskHandlers();

      // Request background fetch permissions (iOS)
      if (Platform.OS === "ios") {
        await this.requestIOSBackgroundPermissions();
      }

      // Register background fetch tasks
      await this.registerBackgroundFetch();

      this.isInitialized = true;
      if (__DEV__) {
        console.log("Background services initialized successfully");
      }
    } catch (error) {
      if (__DEV__)
        console.error("Failed to initialize background services:", error);
    }
  }

  /**
   * Register task handlers with TaskManager
   */
  private registerTaskHandlers(): void {
    // Credit monitoring task
    TaskManager.defineTask(BACKGROUND_TASKS.CREDIT_MONITOR, async () => {
      try {
        if (__DEV__) {
          console.log("[Background] Running credit monitor task");
        }
        const result = await this.performCreditCheck();

        // A failed read is reported as a failed run, not recorded as a
        // successful check with nothing to say.
        if (!result) {
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        if (result.alerts.length > 0) {
          await this.notifyCreditAlerts(result);
        }

        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_CREDIT_CHECK,
          new Date().toISOString(),
        );

        return result.alerts.length > 0
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        if (__DEV__)
          console.error("[Background] Credit monitor failed:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Data sync task
    TaskManager.defineTask(BACKGROUND_TASKS.DATA_SYNC, async () => {
      try {
        if (__DEV__) {
          console.log("[Background] Running data sync task");
        }
        const { useSyncStore } = await import("../../store/syncStore");
        const store = useSyncStore.getState();

        if (store.pendingActions.length > 0) {
          await store.syncAll();
        }

        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_SYNC,
          new Date().toISOString(),
        );

        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        if (__DEV__) console.error("[Background] Data sync failed:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Price alert task
    TaskManager.defineTask(BACKGROUND_TASKS.PRICE_ALERT, async () => {
      try {
        if (__DEV__) {
          console.log("[Background] Running price alert task");
        }
        await this.checkPriceAlerts();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        if (__DEV__)
          console.error("[Background] Price alert check failed:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Request iOS background permissions
   */
  private async requestIOSBackgroundPermissions(): Promise<void> {
    // iOS requires explicit background refresh permission
    const status = await BackgroundFetch.getStatusAsync();

    if (__DEV__) {
      switch (status) {
        case BackgroundFetch.BackgroundFetchStatus.Restricted:
          console.log("Background fetch is restricted");
          break;
        case BackgroundFetch.BackgroundFetchStatus.Denied:
          console.log("Background fetch is denied");
          break;
        case BackgroundFetch.BackgroundFetchStatus.Available:
          console.log("Background fetch is available");
          break;
      }
    }
  }

  /**
   * Register background fetch tasks
   */
  async registerBackgroundFetch(): Promise<void> {
    const isEnabled = await this.isBackgroundEnabled();
    if (!isEnabled) {
      if (__DEV__) {
        console.log("Background tasks are disabled");
      }
      return;
    }

    try {
      // Register credit monitoring
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASKS.CREDIT_MONITOR, {
        minimumInterval: TASK_INTERVALS.CREDIT_MONITOR,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      // Register data sync
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASKS.DATA_SYNC, {
        minimumInterval: TASK_INTERVALS.DATA_SYNC,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      if (__DEV__) {
        console.log("Background fetch tasks registered");
      }
    } catch (error) {
      if (__DEV__) console.error("Failed to register background fetch:", error);
    }
  }

  /**
   * Unregister all background fetch tasks
   */
  async unregisterBackgroundFetch(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(
        BACKGROUND_TASKS.CREDIT_MONITOR,
      );
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASKS.DATA_SYNC);
      if (__DEV__) {
        console.log("Background fetch tasks unregistered");
      }
    } catch (error) {
      if (__DEV__)
        console.error("Failed to unregister background fetch:", error);
    }
  }

  /**
   * Perform credit check
   */
  /**
   * Read the caller's credit position, or null when it cannot be read.
   *
   * Was `api.get("/api/credit/check")`. The client's base URL already ends in
   * /api, so that resolved to /api/api/credit/check and 404'd on every run.
   * The client returns { success: false } rather than throwing, so the catch
   * below never fired: `response.data` was undefined, and the caller's
   * `result.alerts.length` threw a TypeError. This task has never completed.
   *
   * The catch used to return { score: 720, change: 0, alerts: [] } as "mock
   * data for development". Never again: a monitor that cannot read a score
   * reports that it could not, rather than inventing one and pushing
   * notifications derived from it.
   */
  private async performCreditCheck(): Promise<CreditCheckResult | null> {
    const response = await api.get<ApiMonitoringDashboard>(
      "/credit-monitoring",
    );

    if (!response.success || !response.data) {
      if (__DEV__) {
        console.warn(
          "[Background] Credit check could not be read:",
          response.error?.message,
        );
      }
      return null;
    }

    // The route wraps its payload as { success, data }; the client unwraps one
    // layer, so the dashboard may still be nested.
    const payload =
      (response.data as { data?: ApiMonitoringDashboard }).data ??
      response.data;

    return toCreditCheckResult(payload);
  }

  /**
   * Notify user of credit alerts
   */
  private async notifyCreditAlerts(result: CreditCheckResult): Promise<void> {
    for (const alert of result.alerts) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: this.getAlertTitle(alert.type),
          body: alert.message,
          data: {
            notificationType: "credit_alert",
            alertType: alert.type,
            ...alert,
          },
          sound: alert.severity === "critical" ? "default" : undefined,
        },
        trigger: null, // Send immediately
      });
    }
  }

  /**
   * Get alert title based on type
   */
  private getAlertTitle(type: string): string {
    const titles: Record<string, string> = {
      score_change: "📊 Credit Score Update",
      new_account: "🆕 New Account Detected",
      inquiry: "🔍 New Credit Inquiry",
      delinquency: "⚠️ Payment Alert",
      balance_change: "💳 Balance Change",
      default: "📢 Credit Alert",
    };
    return titles[type] || titles.default;
  }

  /**
   * Check price alerts for investments
   */
  private async checkPriceAlerts(): Promise<void> {
    try {
      const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRICE_ALERTS);
      if (!alertsJson) return;

      const alerts: PriceAlert[] = JSON.parse(alertsJson);
      const activeAlerts = alerts.filter((a) => a.active);

      if (activeAlerts.length === 0) return;

      // Get current prices for all symbols
      const symbols = [...new Set(activeAlerts.map((a) => a.symbol))];
      const response = await api.get(
        `/api/investments/prices?symbols=${symbols.join(",")}`,
      );
      const prices = response.data as Record<string, number>;

      // Check each alert
      for (const alert of activeAlerts) {
        const currentPrice = prices[alert.symbol];
        if (!currentPrice) continue;

        const triggered =
          (alert.condition === "above" && currentPrice >= alert.targetPrice) ||
          (alert.condition === "below" && currentPrice <= alert.targetPrice);

        if (triggered) {
          // Notify user
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "📈 Price Alert Triggered",
              body: `${alert.symbol} is now ${alert.condition === "above" ? "above" : "below"} $${alert.targetPrice.toFixed(2)} (Current: $${currentPrice.toFixed(2)})`,
              data: { type: "price_alert", symbol: alert.symbol },
            },
            trigger: null,
          });

          // Mark alert as inactive
          const updatedAlerts = alerts.map((a) =>
            a.id === alert.id ? { ...a, active: false } : a,
          );
          await AsyncStorage.setItem(
            STORAGE_KEYS.PRICE_ALERTS,
            JSON.stringify(updatedAlerts),
          );
        }
      }
    } catch (error) {
      if (__DEV__) console.error("Failed to check price alerts:", error);
    }
  }

  /**
   * Add a price alert
   */
  async addPriceAlert(alert: Omit<PriceAlert, "id" | "active">): Promise<void> {
    try {
      const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRICE_ALERTS);
      const alerts: PriceAlert[] = alertsJson ? JSON.parse(alertsJson) : [];

      const newAlert: PriceAlert = {
        ...alert,
        id: `alert_${Date.now()}`,
        active: true,
      };

      alerts.push(newAlert);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PRICE_ALERTS,
        JSON.stringify(alerts),
      );
    } catch (error) {
      if (__DEV__) console.error("Failed to add price alert:", error);
    }
  }

  /**
   * Remove a price alert
   */
  async removePriceAlert(alertId: string): Promise<void> {
    try {
      const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRICE_ALERTS);
      if (!alertsJson) return;

      const alerts: PriceAlert[] = JSON.parse(alertsJson);
      const filtered = alerts.filter((a) => a.id !== alertId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PRICE_ALERTS,
        JSON.stringify(filtered),
      );
    } catch (error) {
      if (__DEV__) console.error("Failed to remove price alert:", error);
    }
  }

  /**
   * Get all price alerts
   */
  async getPriceAlerts(): Promise<PriceAlert[]> {
    try {
      const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRICE_ALERTS);
      return alertsJson ? JSON.parse(alertsJson) : [];
    } catch (error) {
      if (__DEV__) console.error("Failed to get price alerts:", error);
      return [];
    }
  }

  /**
   * Check if background tasks are enabled
   */
  async isBackgroundEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(
        STORAGE_KEYS.BACKGROUND_ENABLED,
      );
      return enabled !== "false";
    } catch {
      return true;
    }
  }

  /**
   * Enable/disable background tasks
   */
  async setBackgroundEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.BACKGROUND_ENABLED,
      String(enabled),
    );
    if (enabled) {
      await this.registerBackgroundFetch();
    } else {
      await this.unregisterBackgroundFetch();
    }
  }

  /**
   * Get last credit check time
   */
  async getLastCreditCheck(): Promise<Date | null> {
    const timestamp = await AsyncStorage.getItem(
      STORAGE_KEYS.LAST_CREDIT_CHECK,
    );
    return timestamp ? new Date(timestamp) : null;
  }

  /**
   * Get last sync time
   */
  async getLastSync(): Promise<Date | null> {
    const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return timestamp ? new Date(timestamp) : null;
  }

  /**
   * Get background fetch status
   */
  async getStatus(): Promise<{
    available: boolean;
    enabled: boolean;
    lastCreditCheck: Date | null;
    lastSync: Date | null;
  }> {
    const status = await BackgroundFetch.getStatusAsync();
    const enabled = await this.isBackgroundEnabled();
    const lastCreditCheck = await this.getLastCreditCheck();
    const lastSync = await this.getLastSync();

    return {
      available: status === BackgroundFetch.BackgroundFetchStatus.Available,
      enabled,
      lastCreditCheck,
      lastSync,
    };
  }

  /**
   * Manually trigger a background task for testing
   */
  async triggerTask(taskName: string): Promise<void> {
    if (__DEV__) {
      switch (taskName) {
        case BACKGROUND_TASKS.CREDIT_MONITOR:
          await this.performCreditCheck();
          break;
        case BACKGROUND_TASKS.PRICE_ALERT:
          await this.checkPriceAlerts();
          break;
        default:
          if (__DEV__) {
            console.warn(`Unknown task: ${taskName}`);
          }
      }
    }
  }
}

export const backgroundTaskService = new BackgroundTaskService();
export default backgroundTaskService;
