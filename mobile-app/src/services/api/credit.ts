/**
 * Fynvita Mobile Credit API Service
 * Handles all credit score, monitoring, and bureau-related API calls
 */

import { api } from "./client";
import { offlineSyncService } from "../offline-sync";
import type {
  CreditScore,
  CreditScoreHistory,
  CreditFactor,
  CreditMonitoringAlert,
  MonitoringStatus,
  ApiResponse,
  PaginatedResponse,
} from "./types";

// Credit Score Endpoints
export const creditScoreApi = {
  /**
   * Get all current credit scores from connected bureaus
   */
  getScores: () =>
    api.get<CreditScore[]>("/credit/scores", {
      enableCache: true,
      cacheTime: 5 * 60 * 1000,
    }),

  /**
   * Get credit score from specific bureau
   */
  getScoreByBureau: (bureau: "experian" | "equifax" | "transunion") =>
    api.get<CreditScore>(`/credit/scores/${bureau}`),

  /**
   * Get credit score history
   */
  getHistory: (months?: number) =>
    api.get<CreditScore[]>(
      `/credit/scores/history${months ? `?months=${months}` : ""}`,
    ),

  /**
   * Get credit score factors analysis
   */
  getFactors: () =>
    api.get<{ factor: string; impact: number; status: string }[]>(
      "/credit/factors",
    ),

  /**
   * Simulate score impact for potential actions
   */
  simulateImpact: (scenarios: {
    payOffDebt?: number;
    newCreditLine?: number;
    closeAccount?: boolean;
    latePayment?: boolean;
  }) =>
    api.post<{
      currentScore: number;
      projectedScore: number;
      impact: number;
      confidence: "high" | "medium" | "low";
      recommendations: string[];
    }>("/credit/simulate", scenarios),

  /**
   * Request a fresh credit score pull
   */
  refreshScores: () =>
    api.post<{ message: string; estimatedTime: string }>(
      "/credit/scores/refresh",
    ),
};

// Credit Monitoring Endpoints
export const creditMonitoringApi = {
  /**
   * Get monitoring status and connection info
   */
  getStatus: () => api.get<MonitoringStatus>("/credit/monitoring/status"),

  /**
   * Enable/disable monitoring for a bureau
   */
  toggleBureauMonitoring: (bureau: string, enabled: boolean) =>
    api.patch<MonitoringStatus>(`/credit/monitoring/bureaus/${bureau}`, {
      enabled,
    }),

  /**
   * Get all monitoring alerts
   */
  getAlerts: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    severity?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    // The server reads `unreadOnly` (src/app/api/credit-monitoring/alerts/route.ts:17).
    // Sending `unread` meant the filter was silently ignored and every caller
    // asking for unread alerts got all of them.
    if (params?.unreadOnly) queryParams.append("unreadOnly", "true");
    if (params?.severity) queryParams.append("severity", params.severity);
    const query = queryParams.toString();
    return api.get<PaginatedResponse<CreditMonitoringAlert>>(
      `/credit-monitoring/alerts${query ? `?${query}` : ""}`,
    );
  },

  /**
   * Acknowledge one alert.
   *
   * There is no per-alert sub-route. The server exposes a single PATCH on the
   * collection that takes `alertId` or `markAllAsRead` in the BODY
   * (src/app/api/credit-monitoring/alerts/route.ts:50-70). The previous
   * `/alerts/{id}/acknowledge` and `/alerts/acknowledge-all` paths never
   * existed, so acknowledging an alert has always been a 404 — and because the
   * screen swallows the failure, the alert simply stayed unread with no error.
   */
  acknowledgeAlert: (alertId: string) =>
    api.patch<{ success: boolean }>("/credit-monitoring/alerts", { alertId }),

  /**
   * Acknowledge every unread alert. Same collection endpoint, `markAllAsRead`.
   */
  acknowledgeAllAlerts: () =>
    api.patch<{ success: boolean }>("/credit-monitoring/alerts", {
      markAllAsRead: true,
    }),

  /**
   * Update monitoring preferences
   */
  updatePreferences: (preferences: {
    alertTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    threshold?: number;
  }) =>
    api.patch<MonitoringStatus>("/credit/monitoring/preferences", preferences),

  /**
   * Connect to a credit bureau
   */
  connectBureau: (
    bureau: string,
    credentials: { username: string; password: string },
  ) =>
    api.post<{ success: boolean; message: string }>(
      `/credit/monitoring/bureaus/${bureau}/connect`,
      credentials,
    ),

  /**
   * Disconnect from a credit bureau
   */
  disconnectBureau: (bureau: string) =>
    api.delete<{ success: boolean }>(`/credit/monitoring/bureaus/${bureau}`),
};

// Credit Report Endpoints
export const creditReportApi = {
  /**
   * Get list of credit reports
   */
  getReports: () =>
    api.get<{
      reports: { id: string; bureau: string; date: string; status: string }[];
    }>("/credit/reports"),

  /**
   * Get single credit report
   */
  getReport: (reportId: string) =>
    api.get<{
      id: string;
      bureau: string;
      date: string;
      accounts: any[];
      inquiries: any[];
      publicRecords: any[];
      personalInfo: any;
    }>(`/credit/reports/${reportId}`),

  /**
   * Upload and analyze a credit report.
   * If the device is offline, the upload metadata is queued for sync.
   */
  uploadReport: async (file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{ reportId: string; status: string }>> => {
    // Check connectivity via the sync service
    if (!offlineSyncService.getIsOnline()) {
      // Queue the upload intent for when connectivity is restored
      await offlineSyncService.addToQueue({
        endpoint: "/credit/reports/upload",
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileUri: file.uri,
          fileType: file.type,
        }),
        entity: "credit_score",
        operationType: "upload",
        priority: "high",
        conflictStrategy: "client_wins",
        metadata: { fileName: file.name },
      });
      return {
        success: false,
        error: {
          code: "OFFLINE_QUEUED",
          message: "Upload queued for when online",
          retryable: true,
        },
        message:
          "You appear to be offline. This upload will be processed when you reconnect.",
      } as ApiResponse<{ reportId: string; status: string }>;
    }

    const { supabase } = await import("../supabase");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com"}/credit/reports/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      },
    );

    return response.json() as Promise<
      ApiResponse<{ reportId: string; status: string }>
    >;
  },

  /**
   * Request AI analysis of a report
   */
  analyzeReport: (reportId: string) =>
    api.post<{
      summary: string;
      disputableItems: any[];
      recommendations: string[];
      riskAreas: string[];
    }>(`/credit/reports/${reportId}/analyze`),
};

export default {
  scores: creditScoreApi,
  monitoring: creditMonitoringApi,
  reports: creditReportApi,
};
