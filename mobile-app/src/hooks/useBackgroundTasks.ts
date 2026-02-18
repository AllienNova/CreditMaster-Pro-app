/**
 * Fynvita Background Tasks Hook
 * Easy-to-use hook for managing background services in components
 */

import { useState, useEffect, useCallback } from "react";
import {
  backgroundTaskService,
  BACKGROUND_TASKS,
} from "../services/background";

interface BackgroundStatus {
  available: boolean;
  enabled: boolean;
  lastCreditCheck: Date | null;
  lastSync: Date | null;
}

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  active: boolean;
}

interface UseBackgroundTasksReturn {
  // Status
  status: BackgroundStatus | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;

  // Price alerts
  priceAlerts: PriceAlert[];
  addPriceAlert: (alert: Omit<PriceAlert, "id" | "active">) => Promise<void>;
  removePriceAlert: (alertId: string) => Promise<void>;

  // Debug
  triggerTask: (taskName: string) => Promise<void>;
}

export function useBackgroundTasks(): UseBackgroundTasksReturn {
  const [status, setStatus] = useState<BackgroundStatus | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const currentStatus = await backgroundTaskService.getStatus();
      setStatus(currentStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get status");
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const alerts = await backgroundTaskService.getPriceAlerts();
      setPriceAlerts(alerts);
    } catch (e) {
      console.error("Failed to get price alerts:", e);
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await backgroundTaskService.initialize();
      await refreshStatus();
      await refreshAlerts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initialize");
    } finally {
      setLoading(false);
    }
  }, [refreshStatus, refreshAlerts]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      try {
        setError(null);
        await backgroundTaskService.setBackgroundEnabled(enabled);
        await refreshStatus();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update settings");
      }
    },
    [refreshStatus],
  );

  const addPriceAlert = useCallback(
    async (alert: Omit<PriceAlert, "id" | "active">) => {
      try {
        await backgroundTaskService.addPriceAlert(alert);
        await refreshAlerts();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add alert");
      }
    },
    [refreshAlerts],
  );

  const removePriceAlert = useCallback(
    async (alertId: string) => {
      try {
        await backgroundTaskService.removePriceAlert(alertId);
        await refreshAlerts();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove alert");
      }
    },
    [refreshAlerts],
  );

  const triggerTask = useCallback(async (taskName: string) => {
    try {
      await backgroundTaskService.triggerTask(taskName);
    } catch (e) {
      console.error("Failed to trigger task:", e);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    status,
    loading,
    error,
    initialize,
    setEnabled,
    refreshStatus,
    priceAlerts,
    addPriceAlert,
    removePriceAlert,
    triggerTask,
  };
}

// Export task names for convenience
export { BACKGROUND_TASKS };
