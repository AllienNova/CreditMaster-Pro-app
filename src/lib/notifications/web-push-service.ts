/**
 * Web Push Notification Service
 *
 * Handles Web Push API integration for browser notifications:
 * - Permission management
 * - Push subscription handling
 * - Service worker registration
 * - Notification delivery via VAPID
 * - Retry logic with exponential backoff
 * - Subscription validation
 * - Batch sending with concurrency control
 */

import * as webPush from "web-push";

// VAPID keys for Web Push
// Generate new keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@fynvita.com";

// Configure web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export type PushNotificationType =
  | "credit_score_change"
  | "dispute_update"
  | "payment_reminder"
  | "payment_success"
  | "payment_failed"
  | "security_alert"
  | "new_account"
  | "document_uploaded"
  | "bill_reminder"
  | "score_change"
  | "goal_milestone"
  | "subscription_renewal"
  | "general";

export interface PushNotificationPayload {
  type: PushNotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface WebPushResult {
  success: boolean;
  subscriptionId: string;
  error?: string;
  retryCount?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface BatchConfig {
  concurrency: number;
  delayBetweenBatchesMs: number;
}

export interface SubscriptionValidationResult {
  valid: boolean;
  errors: string[];
}

/** Default retry configuration: 3 retries, 1s base delay, 10s max delay */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/** Default batch configuration: 10 concurrent sends, 100ms between batches */
const DEFAULT_BATCH_CONFIG: BatchConfig = {
  concurrency: 10,
  delayBetweenBatchesMs: 100,
};

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelayMs * 0.5;
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Determine whether an error is retryable
 * - 410 Gone (subscription expired) is NOT retryable
 * - 429 Too Many Requests IS retryable
 * - 5xx server errors ARE retryable
 * - Network errors ARE retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const statusCode = (error as { statusCode?: number }).statusCode;

    // 410 Gone — subscription is permanently gone
    if (statusCode === 410) return false;

    // Expired/unsubscribed — not retryable
    if (
      error.message.includes("expired") ||
      error.message.includes("unsubscribed")
    ) {
      return false;
    }

    // 429 or 5xx — retryable
    if (statusCode === 429 || (statusCode !== undefined && statusCode >= 500)) {
      return true;
    }

    // Network errors — retryable
    if (
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("network")
    ) {
      return true;
    }
  }

  // Default: retryable for unknown errors
  return true;
}

/**
 * Validate a push subscription object
 */
export function validateSubscription(
  subscription: Partial<PushSubscription>,
): SubscriptionValidationResult {
  const errors: string[] = [];

  if (!subscription.id) {
    errors.push("Missing subscription id");
  }

  if (!subscription.userId) {
    errors.push("Missing userId");
  }

  if (!subscription.endpoint) {
    errors.push("Missing endpoint");
  } else if (
    !subscription.endpoint.startsWith("https://") &&
    !subscription.endpoint.startsWith("http://localhost")
  ) {
    errors.push("Endpoint must use HTTPS");
  }

  if (!subscription.keys) {
    errors.push("Missing keys object");
  } else {
    if (!subscription.keys.p256dh) {
      errors.push("Missing p256dh key");
    }
    if (!subscription.keys.auth) {
      errors.push("Missing auth key");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Web Push Service Class
 * Server-side push notification handling
 */
class WebPushService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    if (!this.isConfigured) {
      // WebPushService warning: VAPID keys not configured. Push notifications will not work.
    }
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Check if Web Push is properly configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Send a push notification to a single subscription
   */
  async sendNotification(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<WebPushResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        subscriptionId: subscription.id,
        error: "Web Push not configured",
      };
    }

    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      const notificationPayload = JSON.stringify({
        ...payload,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: payload.badge || "/icons/badge-72x72.png",
        timestamp: Date.now(),
      });

      await webPush.sendNotification(pushSubscription, notificationPayload);

      return {
        success: true,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      // WebPushService error: Failed to send push notification

      // Check if subscription is expired/invalid
      const isExpired =
        errorMessage.includes("expired") ||
        errorMessage.includes("unsubscribed") ||
        (error as { statusCode?: number }).statusCode === 410;

      return {
        success: false,
        subscriptionId: subscription.id,
        error: isExpired ? "subscription_expired" : errorMessage,
      };
    }
  }

  /**
   * Send a push notification with retry logic (exponential backoff)
   *
   * Retries on transient errors (network, 429, 5xx) up to maxRetries.
   * Does NOT retry on permanent errors (410 Gone, subscription expired).
   */
  async sendNotificationWithRetry(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  ): Promise<WebPushResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        subscriptionId: subscription.id,
        error: "Web Push not configured",
        retryCount: 0,
      };
    }

    // Validate subscription before attempting send
    const validation = validateSubscription(subscription);
    if (!validation.valid) {
      return {
        success: false,
        subscriptionId: subscription.id || "unknown",
        error: `Invalid subscription: ${validation.errors.join(", ")}`,
        retryCount: 0,
      };
    }

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        };

        const notificationPayload = JSON.stringify({
          ...payload,
          icon: payload.icon || "/icons/icon-192x192.png",
          badge: payload.badge || "/icons/badge-72x72.png",
          timestamp: Date.now(),
        });

        await webPush.sendNotification(pushSubscription, notificationPayload);

        return {
          success: true,
          subscriptionId: subscription.id,
          retryCount: attempt,
        };
      } catch (error) {
        lastError = error;

        // If error is not retryable, stop immediately
        if (!isRetryableError(error)) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const isExpired =
            errorMessage.includes("expired") ||
            errorMessage.includes("unsubscribed") ||
            (error as { statusCode?: number }).statusCode === 410;

          return {
            success: false,
            subscriptionId: subscription.id,
            error: isExpired ? "subscription_expired" : errorMessage,
            retryCount: attempt,
          };
        }

        // If we have retries left, wait with exponential backoff
        if (attempt < retryConfig.maxRetries) {
          const delay = calculateBackoffDelay(
            attempt,
            retryConfig.baseDelayMs,
            retryConfig.maxDelayMs,
          );
          await sleep(delay);
        }
      }
    }

    // All retries exhausted
    const errorMessage =
      lastError instanceof Error ? lastError.message : "Unknown error";
    return {
      success: false,
      subscriptionId: subscription.id,
      error: errorMessage,
      retryCount: retryConfig.maxRetries,
    };
  }

  /**
   * Send push notifications to multiple subscriptions
   */
  async sendToMultiple(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload,
  ): Promise<WebPushResult[]> {
    const results = await Promise.all(
      subscriptions.map((sub) => this.sendNotification(sub, payload)),
    );
    return results;
  }

  /**
   * Send push notifications to multiple subscriptions with retry logic
   */
  async sendToMultipleWithRetry(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  ): Promise<WebPushResult[]> {
    const results = await Promise.all(
      subscriptions.map((sub) =>
        this.sendNotificationWithRetry(sub, payload, retryConfig),
      ),
    );
    return results;
  }

  /**
   * Send push notifications in batches with concurrency control
   *
   * Processes subscriptions in batches to avoid overwhelming push services.
   * Supports retry logic per notification.
   */
  async sendBatch(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload,
    options?: {
      retryConfig?: RetryConfig;
      batchConfig?: BatchConfig;
    },
  ): Promise<{
    results: WebPushResult[];
    sent: number;
    failed: number;
    expiredSubscriptions: string[];
    totalRetries: number;
  }> {
    const retryConfig = options?.retryConfig ?? DEFAULT_RETRY_CONFIG;
    const batchConfig = options?.batchConfig ?? DEFAULT_BATCH_CONFIG;
    const allResults: WebPushResult[] = [];

    // Process in batches
    for (let i = 0; i < subscriptions.length; i += batchConfig.concurrency) {
      const batch = subscriptions.slice(i, i + batchConfig.concurrency);

      const batchResults = await Promise.all(
        batch.map((sub) =>
          this.sendNotificationWithRetry(sub, payload, retryConfig),
        ),
      );

      allResults.push(...batchResults);

      // Delay between batches (skip after last batch)
      if (
        i + batchConfig.concurrency < subscriptions.length &&
        batchConfig.delayBetweenBatchesMs > 0
      ) {
        await sleep(batchConfig.delayBetweenBatchesMs);
      }
    }

    const sent = allResults.filter((r) => r.success).length;
    const failed = allResults.filter((r) => !r.success).length;
    const expiredSubscriptions = allResults
      .filter((r) => r.error === "subscription_expired")
      .map((r) => r.subscriptionId);
    const totalRetries = allResults.reduce(
      (sum, r) => sum + (r.retryCount ?? 0),
      0,
    );

    return {
      results: allResults,
      sent,
      failed,
      expiredSubscriptions,
      totalRetries,
    };
  }

  /**
   * Send notification to all user's devices
   */
  async sendToUser(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload,
  ): Promise<{
    sent: number;
    failed: number;
    expiredSubscriptions: string[];
  }> {
    const results = await this.sendToMultiple(subscriptions, payload);

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const expiredSubscriptions = results
      .filter((r) => r.error === "subscription_expired")
      .map((r) => r.subscriptionId);

    return { sent, failed, expiredSubscriptions };
  }

  /**
   * Create notification payload for credit score change
   */
  createCreditScoreNotification(
    oldScore: number,
    newScore: number,
    bureau?: string,
  ): PushNotificationPayload {
    const change = newScore - oldScore;
    const isIncrease = change > 0;

    return {
      type: "credit_score_change",
      title: isIncrease
        ? `Credit Score Up ${change} Points!`
        : "Credit Score Update",
      body: isIncrease
        ? `Great news! Your ${bureau || "credit"} score increased to ${newScore}.`
        : `Your ${bureau || "credit"} score is now ${newScore} (${change} points).`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      url: "/dashboard",
      tag: "credit-score",
      data: { oldScore, newScore, bureau },
      requireInteraction: isIncrease,
    };
  }

  /**
   * Create notification payload for dispute update
   */
  createDisputeNotification(
    disputeId: string,
    status: string,
    itemDescription: string,
  ): PushNotificationPayload {
    const statusMessages: Record<string, { title: string; body: string }> = {
      sent: {
        title: "Dispute Sent",
        body: `Your dispute for "${itemDescription}" has been sent to the credit bureau.`,
      },
      under_review: {
        title: "Dispute Under Review",
        body: `The credit bureau is now reviewing your dispute for "${itemDescription}".`,
      },
      resolved: {
        title: "Dispute Resolved!",
        body: `Your dispute for "${itemDescription}" has been resolved. Check the results!`,
      },
      rejected: {
        title: "Dispute Update",
        body: `Your dispute for "${itemDescription}" requires attention.`,
      },
    };

    const message = statusMessages[status] || {
      title: "Dispute Update",
      body: `Status update for your dispute: ${status}`,
    };

    return {
      type: "dispute_update",
      title: message.title,
      body: message.body,
      url: `/disputes/${disputeId}`,
      tag: `dispute-${disputeId}`,
      data: { disputeId, status },
      actions: [
        { action: "view", title: "View Details" },
        { action: "dismiss", title: "Dismiss" },
      ],
    };
  }

  /**
   * Create notification payload for payment reminder
   */
  createPaymentReminderNotification(
    amount: number,
    dueDate: string,
    billName?: string,
  ): PushNotificationPayload {
    return {
      type: "payment_reminder",
      title: "Payment Due Soon",
      body: billName
        ? `${billName} payment of $${amount.toFixed(2)} is due on ${dueDate}.`
        : `Payment of $${amount.toFixed(2)} is due on ${dueDate}.`,
      url: "/financial/bills",
      tag: "payment-reminder",
      data: { amount, dueDate, billName },
      actions: [
        { action: "pay", title: "Pay Now" },
        { action: "snooze", title: "Remind Later" },
      ],
    };
  }

  /**
   * Create notification payload for security alert
   */
  createSecurityAlertNotification(
    alertType: string,
    description: string,
  ): PushNotificationPayload {
    return {
      type: "security_alert",
      title: "Security Alert",
      body: description,
      url: "/settings/security",
      tag: "security-alert",
      data: { alertType },
      requireInteraction: true,
      actions: [
        { action: "review", title: "Review" },
        { action: "dismiss", title: "Dismiss" },
      ],
    };
  }

  /**
   * Create a general notification payload
   */
  createGeneralNotification(
    title: string,
    body: string,
    url?: string,
    options?: Partial<PushNotificationPayload>,
  ): PushNotificationPayload {
    return {
      type: "general",
      title,
      body,
      url: url || "/dashboard",
      ...options,
    };
  }
}

// Export singleton instance
export const webPushService = new WebPushService();
export default webPushService;

/**
 * Client-side Web Push utilities
 * These functions run in the browser
 */
export const webPushClient = {
  /**
   * Check if browser supports Web Push
   */
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission | "unsupported" {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  },

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error("Push notifications not supported");
    }
    return await Notification.requestPermission();
  },

  /**
   * Register service worker and subscribe to push
   */
  async subscribe(
    vapidPublicKey: string,
  ): Promise<PushSubscriptionJSON | null> {
    if (!this.isSupported()) {
      throw new Error("Push notifications not supported");
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // Convert VAPID key to Uint8Array
    const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    return subscription.toJSON();
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      return await subscription.unsubscribe();
    }

    return false;
  },

  /**
   * Get current push subscription
   */
  async getSubscription(): Promise<PushSubscriptionJSON | null> {
    if (!this.isSupported()) return null;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription?.toJSON() || null;
  },

  /**
   * Convert URL-safe base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  },
};
