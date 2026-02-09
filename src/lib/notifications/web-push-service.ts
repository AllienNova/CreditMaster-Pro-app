/**
 * Web Push Notification Service
 *
 * Handles Web Push API integration for browser notifications:
 * - Permission management
 * - Push subscription handling
 * - Service worker registration
 * - Notification delivery via VAPID
 */

import * as webPush from 'web-push';

// VAPID keys for Web Push
// Generate new keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@fynvita.com';

// Configure web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export type PushNotificationType =
  | 'credit_score_change'
  | 'dispute_update'
  | 'payment_reminder'
  | 'payment_success'
  | 'payment_failed'
  | 'security_alert'
  | 'new_account'
  | 'document_uploaded'
  | 'general';

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
    payload: PushNotificationPayload
  ): Promise<WebPushResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        subscriptionId: subscription.id,
        error: 'Web Push not configured',
      };
    }

    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      const notificationPayload = JSON.stringify({
        ...payload,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        timestamp: Date.now(),
      });

      await webPush.sendNotification(pushSubscription, notificationPayload);

      return {
        success: true,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // WebPushService error: Failed to send push notification

      // Check if subscription is expired/invalid
      const isExpired =
        errorMessage.includes('expired') ||
        errorMessage.includes('unsubscribed') ||
        (error as { statusCode?: number }).statusCode === 410;

      return {
        success: false,
        subscriptionId: subscription.id,
        error: isExpired ? 'subscription_expired' : errorMessage,
      };
    }
  }

  /**
   * Send push notifications to multiple subscriptions
   */
  async sendToMultiple(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload
  ): Promise<WebPushResult[]> {
    const results = await Promise.all(
      subscriptions.map((sub) => this.sendNotification(sub, payload))
    );
    return results;
  }

  /**
   * Send notification to all user's devices
   */
  async sendToUser(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload
  ): Promise<{
    sent: number;
    failed: number;
    expiredSubscriptions: string[];
  }> {
    const results = await this.sendToMultiple(subscriptions, payload);

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const expiredSubscriptions = results
      .filter((r) => r.error === 'subscription_expired')
      .map((r) => r.subscriptionId);

    return { sent, failed, expiredSubscriptions };
  }

  /**
   * Create notification payload for credit score change
   */
  createCreditScoreNotification(
    oldScore: number,
    newScore: number,
    bureau?: string
  ): PushNotificationPayload {
    const change = newScore - oldScore;
    const isIncrease = change > 0;

    return {
      type: 'credit_score_change',
      title: isIncrease
        ? `Credit Score Up ${change} Points!`
        : 'Credit Score Update',
      body: isIncrease
        ? `Great news! Your ${bureau || 'credit'} score increased to ${newScore}.`
        : `Your ${bureau || 'credit'} score is now ${newScore} (${change} points).`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      url: '/dashboard',
      tag: 'credit-score',
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
    itemDescription: string
  ): PushNotificationPayload {
    const statusMessages: Record<string, { title: string; body: string }> = {
      sent: {
        title: 'Dispute Sent',
        body: `Your dispute for "${itemDescription}" has been sent to the credit bureau.`,
      },
      under_review: {
        title: 'Dispute Under Review',
        body: `The credit bureau is now reviewing your dispute for "${itemDescription}".`,
      },
      resolved: {
        title: 'Dispute Resolved!',
        body: `Your dispute for "${itemDescription}" has been resolved. Check the results!`,
      },
      rejected: {
        title: 'Dispute Update',
        body: `Your dispute for "${itemDescription}" requires attention.`,
      },
    };

    const message = statusMessages[status] || {
      title: 'Dispute Update',
      body: `Status update for your dispute: ${status}`,
    };

    return {
      type: 'dispute_update',
      title: message.title,
      body: message.body,
      url: `/disputes/${disputeId}`,
      tag: `dispute-${disputeId}`,
      data: { disputeId, status },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };
  }

  /**
   * Create notification payload for payment reminder
   */
  createPaymentReminderNotification(
    amount: number,
    dueDate: string,
    billName?: string
  ): PushNotificationPayload {
    return {
      type: 'payment_reminder',
      title: 'Payment Due Soon',
      body: billName
        ? `${billName} payment of $${amount.toFixed(2)} is due on ${dueDate}.`
        : `Payment of $${amount.toFixed(2)} is due on ${dueDate}.`,
      url: '/financial/bills',
      tag: 'payment-reminder',
      data: { amount, dueDate, billName },
      actions: [
        { action: 'pay', title: 'Pay Now' },
        { action: 'snooze', title: 'Remind Later' },
      ],
    };
  }

  /**
   * Create notification payload for security alert
   */
  createSecurityAlertNotification(
    alertType: string,
    description: string
  ): PushNotificationPayload {
    return {
      type: 'security_alert',
      title: 'Security Alert',
      body: description,
      url: '/settings/security',
      tag: 'security-alert',
      data: { alertType },
      requireInteraction: true,
      actions: [
        { action: 'review', title: 'Review' },
        { action: 'dismiss', title: 'Dismiss' },
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
    options?: Partial<PushNotificationPayload>
  ): PushNotificationPayload {
    return {
      type: 'general',
      title,
      body,
      url: url || '/dashboard',
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
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }
    return await Notification.requestPermission();
  },

  /**
   * Register service worker and subscribe to push
   */
  async subscribe(vapidPublicKey: string): Promise<PushSubscriptionJSON | null> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
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
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  },
};
