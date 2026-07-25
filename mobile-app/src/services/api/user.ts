/**
 * Fynvita Mobile User API Service
 * Handles user profile, subscriptions, notifications, and settings
 */

import { api } from "./client";
import { offlineSyncService } from "../offline-sync";
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
} from "./types";

// User Profile Endpoints
export const userProfileApi = {
  /**
   * Get current user profile
   */
  getProfile: () => api.get<UserProfile>("/user/profile"),

  /**
   * Update user profile
   */
  updateProfile: (
    updates: Partial<
      Omit<UserProfile, "id" | "email" | "createdAt" | "updatedAt">
    >,
  ) => api.patch<UserProfile>("/user/profile", updates),

  /**
   * Upload avatar.
   * If the device is offline, the upload is queued for sync.
   */
  uploadAvatar: async (file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{ avatarUrl: string }>> => {
    if (!offlineSyncService.getIsOnline()) {
      await offlineSyncService.addToQueue({
        endpoint: "/user/avatar",
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileUri: file.uri,
          fileType: file.type,
        }),
        entity: "profile",
        operationType: "upload",
        priority: "low",
        conflictStrategy: "last_write_wins",
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
      } as ApiResponse<{ avatarUrl: string }>;
    }

    const { supabase } = await import("../supabase");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append("avatar", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com"}/user/avatar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      },
    );

    return response.json() as Promise<ApiResponse<{ avatarUrl: string }>>;
  },

  /**
   * Delete account
   */
  deleteAccount: (confirmation: string) =>
    api.post<{ success: boolean }>("/user/delete-account", { confirmation }),

  /**
   * Get onboarding status
   */
  getOnboardingStatus: () =>
    api.get<{
      completed: boolean;
      steps: { step: string; completed: boolean }[];
      currentStep: string;
    }>("/user/onboarding"),

  /**
   * Update onboarding progress
   */
  updateOnboarding: (step: string, data?: Record<string, unknown>) =>
    api.patch<{ nextStep: string; completed: boolean }>("/user/onboarding", {
      step,
      data,
    }),

  /**
   * Complete onboarding
   */
  completeOnboarding: () =>
    api.post<{ success: boolean }>("/user/onboarding/complete"),
};

// ── Billing overview (real source: GET /api/payment/billing) ──────────────────
// The web billing route (withPermission("billing:read"), Stripe-backed) returns
// plans + subscription + payment methods + invoices in one un-wrapped payload;
// Date fields arrive as ISO strings over JSON. Adapt to a mobile view-model the
// billing overview screen renders directly. No fabrication: a user with no Stripe
// presence yields an empty payment-method list and empty invoices (free plan),
// which the screen empty-states — it never invents a card number or an invoice.
interface WebBillingPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
}

interface WebBillingSubscription {
  planId: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

interface WebBillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface WebBillingInvoice {
  id: string;
  amount: number;
  status: string;
  created: string;
  dueDate?: string;
  pdfUrl?: string;
}

export interface WebBillingResponse {
  plans: WebBillingPlan[];
  subscription: WebBillingSubscription;
  paymentMethods: WebBillingPaymentMethod[];
  invoices: WebBillingInvoice[];
}

/** A real Stripe payment method, reduced to what the overview renders. */
export interface BillingPaymentMethodView {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

/** A real Stripe invoice, reduced to what the overview renders. */
export interface BillingInvoiceView {
  id: string;
  date: string;
  amount: number;
  status: string;
}

/** The mobile billing-overview view-model — every field sourced, none invented. */
export interface BillingOverview {
  planName: string;
  price: number;
  interval: string;
  status: string;
  nextBilling: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: BillingPaymentMethodView | null;
  recentInvoices: BillingInvoiceView[];
}

/** Format an ISO datetime to a YYYY-MM-DD date, or null when absent/invalid. */
function toBillingDate(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function mapWebBilling(res: WebBillingResponse): BillingOverview {
  const plan = res.plans.find((p) => p.id === res.subscription.planId);
  const defaultMethod =
    res.paymentMethods.find((pm) => pm.isDefault) ??
    res.paymentMethods[0] ??
    null;

  return {
    planName: plan?.name ?? "Free",
    price: plan?.price ?? 0,
    interval: plan?.interval ?? "month",
    status: res.subscription.status,
    nextBilling: toBillingDate(res.subscription.currentPeriodEnd),
    cancelAtPeriodEnd: res.subscription.cancelAtPeriodEnd,
    paymentMethod: defaultMethod
      ? {
          brand: defaultMethod.brand,
          last4: defaultMethod.last4,
          expMonth: defaultMethod.expMonth,
          expYear: defaultMethod.expYear,
        }
      : null,
    recentInvoices: res.invoices.slice(0, 3).map((inv) => ({
      id: inv.id,
      date: toBillingDate(inv.created) ?? "",
      amount: inv.amount,
      status: inv.status,
    })),
  };
}

// Subscription Endpoints
export const subscriptionApi = {
  /**
   * Get the real billing overview (current plan, default payment method, and
   * recent invoices) from the Stripe-backed web route GET /api/payment/billing.
   * Adapted to the mobile BillingOverview view-model by mapWebBilling; unsourced
   * fields are omitted so the screen can empty-state rather than fabricate.
   */
  getBillingOverview: async (): Promise<ApiResponse<BillingOverview>> => {
    const res = await api.get<WebBillingResponse>("/payment/billing");
    if (res.success && res.data) {
      return { success: true, data: mapWebBilling(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get current subscription
   */
  getCurrent: () => api.get<Subscription>("/user/subscription"),

  /**
   * Get available plans
   */
  getPlans: () =>
    api.get<{ plans: SubscriptionPlan[] }>("/subscription/plans", {
      enableCache: true,
      cacheTime: 60 * 60 * 1000,
    }),

  /**
   * Create checkout session
   */
  createCheckout: (priceId: string) =>
    api.post<{ sessionId: string; url: string }>("/payment/checkout", {
      priceId,
    }),

  /**
   * Upgrade subscription
   */
  upgrade: (planId: string) =>
    api.post<{ success: boolean; newPlan: string }>(
      "/user/subscription/upgrade",
      { planId },
    ),

  /**
   * Cancel subscription
   */
  cancel: () =>
    api.post<{ success: boolean; cancelAt: string }>(
      "/user/subscription/cancel",
    ),

  /**
   * Reactivate subscription
   */
  reactivate: () =>
    api.post<{ success: boolean }>("/user/subscription/reactivate"),

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
    }>("/user/billing/history"),

  /**
   * Update payment method
   */
  updatePaymentMethod: (paymentMethodId: string) =>
    api.post<{ success: boolean }>("/user/billing/payment-method", {
      paymentMethodId,
    }),
};

// The real web route (/api/notifications) returns notifications with `message`
// and a broader type enum than the mobile Notification type (`body` + a smaller
// enum). Adapt web -> mobile at the boundary so the store/screen see one shape.
interface WebNotification {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const WEB_TO_MOBILE_NOTIFICATION_TYPE: Record<string, Notification["type"]> = {
  dispute_update: "dispute_update",
  dispute_overdue: "dispute_update",
  dispute_reminder: "dispute_update",
  draft_reminder: "dispute_update",
  payment_success: "payment",
  subscription_expiring: "payment",
  score_reminder: "score_change",
  document_uploaded: "alert",
  tip: "recommendation",
  welcome: "system",
  system: "system",
};

export function mapWebNotification(n: WebNotification): Notification {
  return {
    id: n.id,
    userId: n.userId ?? "",
    type: WEB_TO_MOBILE_NOTIFICATION_TYPE[n.type] ?? "system",
    title: n.title,
    body: n.message,
    read: n.read,
    createdAt: n.createdAt,
  };
}

// Notification Endpoints
export const notificationApi = {
  /**
   * Get all notifications
   */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<
    ApiResponse<{ notifications: Notification[]; unreadCount: number }>
  > => {
    // The web route honors ?limit= and returns { notifications, unreadCount } in
    // the web notification shape; adapt each to the mobile Notification shape.
    const query = params?.limit ? `?limit=${params.limit}` : "";
    const res = await api.get<{
      notifications: WebNotification[];
      unreadCount: number;
    }>(`/notifications${query}`);
    if (res.success && res.data) {
      return {
        success: true,
        data: {
          notifications: res.data.notifications.map(mapWebNotification),
          unreadCount: res.data.unreadCount,
        },
      };
    }
    return { success: false, error: res.error };
  },

  /**
   * Mark one notification as read. Web contract: PATCH with an action body.
   */
  markAsRead: (notificationId: string) =>
    api.patch<{ success: boolean }>("/notifications", {
      notificationId,
      action: "mark_read",
    }),

  /**
   * Mark all as read. Web contract: PATCH with action only.
   */
  markAllAsRead: () =>
    api.patch<{ count: number }>("/notifications", { action: "mark_all_read" }),

  /**
   * Get notification preferences
   */
  getPreferences: () =>
    api.get<NotificationPreferences>("/notifications/preferences"),

  /**
   * Update notification preferences
   */
  updatePreferences: (preferences: Partial<NotificationPreferences>) =>
    api.patch<NotificationPreferences>(
      "/notifications/preferences",
      preferences,
    ),

  /**
   * Register push token
   */
  registerPushToken: (token: string, platform: "ios" | "android") =>
    api.post<{ success: boolean }>("/notifications/push-token", {
      token,
      platform,
    }),

  /**
   * Delete notification
   */
  delete: (notificationId: string) =>
    api.delete<{ success: boolean }>(
      `/notifications?notificationId=${encodeURIComponent(notificationId)}`,
    ),
};

// Recommendations Endpoints
export const recommendationApi = {
  /**
   * Get personalized recommendations
   */
  getAll: () =>
    api.get<{ recommendations: Recommendation[] }>("/user/recommendations"),

  /**
   * Get recommendations by type
   */
  getByType: (type: Recommendation["type"]) =>
    api.get<{ recommendations: Recommendation[] }>(
      `/user/recommendations?type=${type}`,
    ),

  /**
   * Dismiss recommendation
   */
  dismiss: (recommendationId: string) =>
    api.patch<{ success: boolean }>(
      `/user/recommendations/${recommendationId}/dismiss`,
    ),

  /**
   * Track recommendation click
   */
  trackClick: (recommendationId: string) =>
    api.post<{ success: boolean }>(
      `/user/recommendations/${recommendationId}/click`,
    ),
};

// Identity Protection Endpoints
export const identityProtectionApi = {
  /**
   * Get identity protection status
   */
  getStatus: () => api.get<IdentityProtectionStatus>("/identity/status"),

  /**
   * Enable dark web monitoring
   */
  enableDarkWebMonitoring: (personalInfo: {
    email: string;
    phone?: string;
    ssn?: string;
  }) =>
    api.post<{ success: boolean; nextScan: string }>(
      "/identity/dark-web/enable",
      personalInfo,
    ),

  /**
   * Disable dark web monitoring
   */
  disableDarkWebMonitoring: () =>
    api.post<{ success: boolean }>("/identity/dark-web/disable"),

  /**
   * Get identity alerts
   */
  getAlerts: () => api.get<{ alerts: IdentityAlert[] }>("/identity/alerts"),

  /**
   * Mark alert as resolved
   */
  resolveAlert: (alertId: string) =>
    api.patch<IdentityAlert>(`/identity/alerts/${alertId}/resolve`),

  /**
   * Request manual scan
   */
  requestScan: () =>
    api.post<{ success: boolean; scanId: string }>("/identity/scan"),
};

// Document Endpoints
export const documentApi = {
  /**
   * Get all documents
   */
  getAll: () => api.get<{ documents: Document[] }>("/documents"),

  /**
   * Get document by ID
   */
  getById: (documentId: string) =>
    api.get<Document>(`/documents/${documentId}`),

  /**
   * Upload document.
   * If the device is offline, the upload metadata is queued for sync.
   */
  upload: async (
    file: { uri: string; name: string; type: string },
    docType: Document["type"],
  ): Promise<ApiResponse<Document>> => {
    if (!offlineSyncService.getIsOnline()) {
      await offlineSyncService.addToQueue({
        endpoint: "/documents/upload",
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileUri: file.uri,
          fileType: file.type,
          docType,
        }),
        entity: "document",
        operationType: "upload",
        priority: "normal",
        conflictStrategy: "client_wins",
        metadata: { fileName: file.name, docType },
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
      } as ApiResponse<Document>;
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
    formData.append("type", docType);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com"}/documents/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      },
    );

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
    api.get<{ url: string; expiresAt: string }>(
      `/documents/${documentId}/download`,
    ),
};

// Settings Endpoints
export const settingsApi = {
  /**
   * Get user settings
   */
  getAll: () =>
    api.get<{
      theme: "light" | "dark" | "system";
      language: string;
      biometricEnabled: boolean;
      twoFactorEnabled: boolean;
      dataSharing: boolean;
    }>("/user/settings"),

  /**
   * Update settings
   */
  update: (
    settings: Partial<{
      theme: "light" | "dark" | "system";
      language: string;
      biometricEnabled: boolean;
      twoFactorEnabled: boolean;
      dataSharing: boolean;
    }>,
  ) => api.patch<{ success: boolean }>("/user/settings", settings),

  /**
   * Enable two-factor authentication
   */
  enable2FA: () =>
    api.post<{ secret: string; qrCode: string }>("/user/settings/2fa/enable"),

  /**
   * Verify two-factor authentication
   */
  verify2FA: (code: string) =>
    api.post<{ success: boolean; backupCodes: string[] }>(
      "/user/settings/2fa/verify",
      { code },
    ),

  /**
   * Disable two-factor authentication
   */
  disable2FA: (code: string) =>
    api.post<{ success: boolean }>("/user/settings/2fa/disable", { code }),

  /**
   * Export user data
   */
  exportData: () =>
    api.post<{ downloadUrl: string; expiresAt: string }>("/user/data-export"),
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
