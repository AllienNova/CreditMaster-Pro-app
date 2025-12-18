/**
 * CPFI Mobile Credit API Service
 * Handles all credit score, monitoring, and bureau-related API calls
 */

import { api } from './client';
import type {
  CreditScore,
  CreditScoreHistory,
  CreditFactor,
  CreditMonitoringAlert,
  MonitoringStatus,
  ApiResponse,
  PaginatedResponse,
} from './types';

// Credit Score Endpoints
export const creditScoreApi = {
  /**
   * Get all current credit scores from connected bureaus
   */
  getScores: () =>
    api.get<CreditScore[]>('/credit/scores', { enableCache: true, cacheTime: 5 * 60 * 1000 }),

  /**
   * Get credit score from specific bureau
   */
  getScoreByBureau: (bureau: 'experian' | 'equifax' | 'transunion') =>
    api.get<CreditScore>(`/credit/scores/${bureau}`),

  /**
   * Get credit score history
   */
  getHistory: (months?: number) =>
    api.get<CreditScore[]>(`/credit/scores/history${months ? `?months=${months}` : ''}`),

  /**
   * Get credit score factors analysis
   */
  getFactors: () =>
    api.get<{ factor: string; impact: number; status: string }[]>('/credit/factors'),

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
      confidence: 'high' | 'medium' | 'low';
      recommendations: string[];
    }>('/credit/simulate', scenarios),

  /**
   * Request a fresh credit score pull
   */
  refreshScores: () =>
    api.post<{ message: string; estimatedTime: string }>('/credit/scores/refresh'),
};

// Credit Monitoring Endpoints
export const creditMonitoringApi = {
  /**
   * Get monitoring status and connection info
   */
  getStatus: () =>
    api.get<MonitoringStatus>('/credit/monitoring/status'),

  /**
   * Enable/disable monitoring for a bureau
   */
  toggleBureauMonitoring: (bureau: string, enabled: boolean) =>
    api.patch<MonitoringStatus>(`/credit/monitoring/bureaus/${bureau}`, { enabled }),

  /**
   * Get all monitoring alerts
   */
  getAlerts: (params?: { page?: number; limit?: number; unreadOnly?: boolean; severity?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unread', 'true');
    if (params?.severity) queryParams.append('severity', params.severity);
    const query = queryParams.toString();
    return api.get<PaginatedResponse<CreditMonitoringAlert>>(`/credit/monitoring/alerts${query ? `?${query}` : ''}`);
  },

  /**
   * Get single alert by ID
   */
  getAlert: (alertId: string) =>
    api.get<CreditMonitoringAlert>(`/credit/monitoring/alerts/${alertId}`),

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert: (alertId: string) =>
    api.patch<CreditMonitoringAlert>(`/credit/monitoring/alerts/${alertId}/acknowledge`),

  /**
   * Acknowledge all alerts
   */
  acknowledgeAllAlerts: () =>
    api.post<{ acknowledged: number }>('/credit/monitoring/alerts/acknowledge-all'),

  /**
   * Update monitoring preferences
   */
  updatePreferences: (preferences: {
    alertTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    threshold?: number;
  }) =>
    api.patch<MonitoringStatus>('/credit/monitoring/preferences', preferences),

  /**
   * Connect to a credit bureau
   */
  connectBureau: (bureau: string, credentials: { username: string; password: string }) =>
    api.post<{ success: boolean; message: string }>(`/credit/monitoring/bureaus/${bureau}/connect`, credentials),

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
    api.get<{ reports: { id: string; bureau: string; date: string; status: string }[] }>('/credit/reports'),

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
   * Upload and analyze a credit report
   */
  uploadReport: async (file: { uri: string; name: string; type: string }) => {
    const { supabase } = await import('../supabase');
    const { data: { session } } = await supabase.auth.getSession();
    
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://cpfi.com/api'}/credit/reports/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: formData,
    });

    return response.json() as Promise<ApiResponse<{ reportId: string; status: string }>>;
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
