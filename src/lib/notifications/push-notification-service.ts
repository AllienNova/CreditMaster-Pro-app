/**
 * Push Notification Service
 * Handles browser push notifications and in-app notifications
 */

export type NotificationType =
  | "dispute_update"
  | "score_change"
  | "payment_reminder"
  | "document_processed"
  | "recommendation"
  | "system"
  | "promotion";

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  channels: {
    dispute_update: boolean;
    score_change: boolean;
    payment_reminder: boolean;
    document_processed: boolean;
    recommendation: boolean;
    system: boolean;
    promotion: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export class PushNotificationService {
  private vapidPublicKey: string | null = null;

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator
    );
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return "denied";
    }
    return Notification.requestPermission();
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isSupported() || !this.vapidPublicKey) {
      return null;
    }

    const permission = await this.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = this.urlBase64ToUint8Array(
        this.vapidPublicKey,
      );
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Save subscription to server
      await this.saveSubscription(userId, subscription);
      return subscription;
    } catch (_error) {
      // PushNotificationService error: Push subscription failed
      void _error;
      return null;
    }
  }

  /**
   * Send a local notification (for testing or in-app use)
   */
  async sendLocalNotification(
    payload: Omit<NotificationPayload, "id" | "createdAt" | "read">,
  ): Promise<void> {
    if (!this.isSupported()) return;

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/icon-192.png",
        data: payload.data,
      });
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // Return default preferences (would fetch from DB in production)
    return {
      userId,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      channels: {
        dispute_update: true,
        score_change: true,
        payment_reminder: true,
        document_processed: true,
        recommendation: true,
        system: true,
        promotion: false,
      },
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
      },
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    return { ...current, ...preferences };
  }

  private async saveSubscription(
    _userId: string,
    _subscription: PushSubscription,
  ): Promise<void> {
    // Save to database - implementation depends on backend
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const pushNotificationService = new PushNotificationService();
