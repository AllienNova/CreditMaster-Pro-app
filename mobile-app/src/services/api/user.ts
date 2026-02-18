/**
 * Fynvita Mobile User API Service
 * Handles user profile, subscriptions, notifications, and settings
 */

import { api } from './client';
import { offlineSyncService } from '../offline-sync';
import type {
  UserProfile,
  Subscription,
  SubscriptionPlan,
  Notification,
  NotificationPreferences,
  Recommendation,
  IdentityProtectionStatus,
  IdentityAlert,
  Document,
  ApiResponse,
  PaginatedResponse,
} from './types';

// User Profile Endpoints
export const userProfileApi = {
  /**
   * Get current user profile
   */
  getProfile: () =>
    api.get<UserProfile>('/user/profile'),

  /**
   * Update user profile
   */
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>>) =>
    api.patch<UserProfile>('/user/profile', updates),

  /**
   * Upload avatar.
   * If the device is offline, the upload is queued for sync.
   */
  uploadAvatar: async (file: { uri: string; name: string; type: string }): Promise<ApiResponse<{ avatarUrl: string }>> => {
    if (!offlineSyncService.getIsOnline()) {
      await offlineSyncService.addToQueue({
        endpoint: '/user/avatar',
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileUri: file.uri, fileType: file.type }),
        entity: 'profile',
        operationType: 'upload',
        priority: 'low',
        conflictStrategy: 'last_write_wins',
        metadata: { fileName: file.name },
      });
      return {
        success: false,
        error: { code: 'OFFLINE_QUEUED', message: 'Upload queued for when online', retryable: true },
        message: 'You appear to be offline. This upload will be processed when you reconnect.',
      } as ApiResponse<{ avatarUrl: string }>;
    }

    const { supabase } = await import('../supabase');
    const { data: { session } } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append('avatar', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://cpfi.com/api'}/user/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: formData,
    });

    return response.json() as Promise<ApiResponse<{ avatarUrl: string }>>;
  },

  /**
   * Delete account
   */
  deleteAccount: (confirmation: string) =>
    api.post<{ success: boolean }>('/user/delete-account', { confirmation }),

  /**
   * Get onboarding status
   */
  getOnboardingStatus: () =>
    api.get<{
      completed: boolean;
      steps: { step: string; completed: boolean }[];
      currentStep: string;
    }>('/user/onboarding'),

  /**
   * Update onboarding progress
   */
  updateOnboarding: (step: string, data?: Record<string, unknown>) =>
    api.patch<{ nextStep: string; completed: boolean }>('/user/onboarding', { step, data }),

  /**
   * Complete onboarding
   */
  completeOnboarding: () =>
    api.post<{ success: boolean }>('/user/onboarding/complete'),
};

// Subscription Endpoints
export const subscriptionApi = {
  /**
   * Get current subscription
   */
  getCurrent: () =>
    api.get<Subscription>('/user/subscription'),

  /**
   * Get available plans
   */
  getPlans: () =>
    api.get<{ plans: SubscriptionPlan[] }>('/subscription/plans', { enableCache: true, cacheTime: 60 * 60 * 1000 }),

  /**
   * Create checkout session
   */
  createCheckout: (priceId: string) =>
    api.post<{ sessionId: string; url: string }>('/payment/checkout', { priceId }),

  /**
   * Upgrade subscription
   */
  upgrade: (planId: string) =>
    api.post<{ success: boolean; newPlan: string }>('/user/subscription/upgrade', { planId }),

  /**
   * Cancel subscription
   */
  cancel: () =>
    api.post<{ success: boolean; cancelAt: string }>('/user/subscription/cancel'),

  /**
   * Reactivate subscription
   */
  reactivate: () =>
    api.post<{ success: boolean }>('/user/subscription/reactivate'),

  /**
   * Get billing history
   */
  getBillingHistory: () =>
    api.get<{
      invoices: {
        id: string;
        amount: number;
        status: string;
        date: string;
        pdfUrl?: string;
      }[];
    }>('/user/billing/history'),

  /**
   * Update payment method
   */
  updatePaymentMethod: (paymentMethodId: string) =>
    api.post<{ success: boolean }>('/user/billing/payment-method', { paymentMethodId }),
};

// Notification Endpoints
export const notificationApi = {
  /**
   * Get all notifications
   */
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unread', 'true');
    const query = queryParams.toString();
    return api.get<PaginatedResponse<Notification>>(`/notifications${query ? `?${query}` : ''}`);
  },

  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) =>
    api.patch<Notification>(`/notifications/${notificationId}/read`),

  /**
   * Mark all as read
   */
  markAllAsRead: () =>
    api.post<{ updated: number }>('/notifications/read-all'),

  /**
   * Get notification preferences
   */
  getPreferences: () =>
    api.get<NotificationPreferences>('/notifications/preferences'),

  /**
   * Update notification preferences
   */
  updatePreferences: (preferences: Partial<NotificationPreferences>) =>
    api.patch<NotificationPreferences>('/notifications/preferences', preferences),

  /**
   * Register push token
   */
  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    api.post<{ success: boolean }>('/notifications/push-token', { token, platform }),

  /**
   * Delete notification
   */
  delete: (notificationId: string) =>
    api.delete<{ success: boolean }>(`/notifications/${notificationId}`),
};

// Recommendations Endpoints
export const recommendationApi = {
  /**
   * Get personalized recommendations
   */
  getAll: () =>
    api.get<{ recommendations: Recommendation[] }>('/user/recommendations'),

  /**
   * Get recommendations by type
   */
  getByType: (type: Recommendation['type']) =>
    api.get<{ recommendations: Recommendation[] }>(`/user/recommendations?type=${type}`),

  /**
   * Dismiss recommendation
   */
  dismiss: (recommendationId: string) =>
    api.patch<{ success: boolean }>(`/user/recommendations/${recommendationId}/dismiss`),

  /**
   * Track recommendation click
   */
  trackClick: (recommendationId: string) =>
    api.post<{ success: boolean }>(`/user/recommendations/${recommendationId}/click`),
};

// Identity Protection Endpoints
export const identityProtectionApi = {
  /**
   * Get identity protection status
   */
  getStatus: () =>
    api.get<IdentityProtectionStatus>('/identity/status'),

  /**
   * Enable dark web monitoring
   */
  enableDarkWebMonitoring: (personalInfo: {
    email: string;
    phone?: string;
    ssn?: string;
  }) =>
    api.post<{ success: boolean; nextScan: string }>('/identity/dark-web/enable', personalInfo),

  /**
   * Disable dark web monitoring
   */
  disableDarkWebMonitoring: () =>
    api.post<{ success: boolean }>('/identity/dark-web/disable'),

  /**
   * Get identity alerts
   */
  getAlerts: () =>
    api.get<{ alerts: IdentityAlert[] }>('/identity/alerts'),

  /**
   * Mark alert as resolved
   */
  resolveAlert: (alertId: string) =>
    api.patch<IdentityAlert>(`/identity/alerts/${alertId}/resolve`),

  /**
   * Request manual scan
   */
  requestScan: () =>
    api.post<{ success: boolean; scanId: string }>('/identity/scan'),
};

// Document Endpoints
export const documentApi = {
  /**
   * Get all documents
   */
  getAll: () =>
    api.get<{ documents: Document[] }>('/documents'),

  /**
   * Get document by ID
   */
  getById: (documentId: string) =>
    api.get<Document>(`/documents/${documentId}`),

  /**
   * Upload document.
   * If the device is offline, the upload metadata is queued for sync.
   */
  upload: async (file: { uri: string; name: string; type: string }, docType: Document['type']): Promise<ApiResponse<Document>> => {
    if (!offlineSyncService.getIsOnline()) {
      await offlineSyncService.addToQueue({
        endpoint: '/documents/upload',
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileUri: file.uri, fileType: file.type, docType }),
        entity: 'document',
        operationType: 'upload',
        priority: 'normal',
        conflictStrategy: 'client_wins',
        metadata: { fileName: file.name, docType },
      });
      return {
        success: false,
        error: { code: 'OFFLINE_QUEUED', message: 'Upload queued for when online', retryable: true },
        message: 'You appear to be offline. This upload will be processed when you reconnect.',
      } as ApiResponse<Document>;
    }

    const { supabase } = await import('../supabase');
    const { data: { session } } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    formData.append('type', docType);

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://cpfi.com/api'}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: formData,
    });

    return response.json() as Promise<ApiResponse<Document>>;
  },

  /**
   * Analyze document
   */
  analyze: (documentId: string) =>
    api.post<Document>(`/documents/${documentId}/analyze`),

  /**
   * Delete document
   */
  delete: (documentId: string) =>
    api.delete<{ success: boolean }>(`/documents/${documentId}`),

  /**
   * Get document download URL
   */
  getDownloadUrl: (documentId: string) =>
    api.get<{ url: string; expiresAt: string }>(`/documents/${documentId}/download`),
};

// Settings Endpoints
export const settingsApi = {
  /**
   * Get user settings
   */
  getAll: () =>
    api.get<{
      theme: 'light' | 'dark' | 'system';
      language: string;
      biometricEnabled: boolean;
      twoFactorEnabled: boolean;
      dataSharing: boolean;
    }>('/user/settings'),

  /**
   * Update settings
   */
  update: (settings: Partial<{
    theme: 'light' | 'dark' | 'system';
    language: string;
    biometricEnabled: boolean;
    twoFactorEnabled: boolean;
    dataSharing: boolean;
  }>) =>
    api.patch<{ success: boolean }>('/user/settings', settings),

  /**
   * Enable two-factor authentication
   */
  enable2FA: () =>
    api.post<{ secret: string; qrCode: string }>('/user/settings/2fa/enable'),

  /**
   * Verify two-factor authentication
   */
  verify2FA: (code: string) =>
    api.post<{ success: boolean; backupCodes: string[] }>('/user/settings/2fa/verify', { code }),

  /**
   * Disable two-factor authentication
   */
  disable2FA: (code: string) =>
    api.post<{ success: boolean }>('/user/settings/2fa/disable', { code }),

  /**
   * Export user data
   */
  exportData: () =>
    api.post<{ downloadUrl: string; expiresAt: string }>('/user/data-export'),
};

export default {
  profile: userProfileApi,
  subscription: subscriptionApi,
  notifications: notificationApi,
  recommendations: recommendationApi,
  identityProtection: identityProtectionApi,
  documents: documentApi,
  settings: settingsApi,
};
