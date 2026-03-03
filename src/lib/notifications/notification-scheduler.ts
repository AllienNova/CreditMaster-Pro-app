/**
 * Notification Scheduler Service
 *
 * Handles scheduling notifications for future delivery and enforcing user
 * preferences (quiet hours, channel opt-out) before sending.
 *
 * Responsibilities:
 * - Schedule notifications for future delivery
 * - Enforce quiet hours (delay delivery until window opens)
 * - Enforce per-channel opt-out preferences
 * - Manage scheduled notification lifecycle (create, cancel, list)
 * - Template system for common notification types
 */

import type {
  PushNotificationPayload,
  PushNotificationType,
} from "./web-push-service";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledNotification {
  id: string;
  userId: string;
  payload: PushNotificationPayload;
  scheduledAt: Date;
  status: ScheduledNotificationStatus;
  createdAt: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  error?: string;
}

export type ScheduledNotificationStatus =
  | "pending"
  | "delivered"
  | "cancelled"
  | "failed";

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // HH:MM (24h format)
  end: string; // HH:MM (24h format)
  timezone: string; // IANA timezone, e.g. "America/New_York"
}

export interface ChannelPreferences {
  credit_score_change: boolean;
  dispute_update: boolean;
  payment_reminder: boolean;
  payment_success: boolean;
  payment_failed: boolean;
  security_alert: boolean;
  new_account: boolean;
  document_uploaded: boolean;
  bill_reminder: boolean;
  score_change: boolean;
  goal_milestone: boolean;
  subscription_renewal: boolean;
  general: boolean;
}

export interface UserNotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  quietHours: QuietHoursConfig;
  channels: ChannelPreferences;
}

export interface NotificationTemplate {
  type: PushNotificationType;
  title: string;
  bodyTemplate: string;
  icon?: string;
  url?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export interface ScheduleResult {
  scheduled: boolean;
  notificationId: string;
  scheduledAt: Date;
  error?: string;
}

export interface PreferenceCheckResult {
  allowed: boolean;
  reason?: string;
  delayUntil?: Date;
}

// ── Default Preferences ──────────────────────────────────────────────────────

export const DEFAULT_CHANNEL_PREFERENCES: ChannelPreferences = {
  credit_score_change: true,
  dispute_update: true,
  payment_reminder: true,
  payment_success: true,
  payment_failed: true,
  security_alert: true,
  new_account: true,
  document_uploaded: true,
  bill_reminder: true,
  score_change: true,
  goal_milestone: true,
  subscription_renewal: true,
  general: true,
};

export const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
  enabled: false,
  start: "22:00",
  end: "08:00",
  timezone: "UTC",
};

// ── Built-in Templates ───────────────────────────────────────────────────────

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  bill_reminder: {
    type: "bill_reminder",
    title: "Bill Due Soon",
    bodyTemplate:
      "Your {{billName}} bill of ${{amount}} is due on {{dueDate}}.",
    icon: "/icons/icon-192x192.png",
    url: "/financial/bills",
    actions: [
      { action: "pay", title: "Pay Now" },
      { action: "snooze", title: "Remind Later" },
    ],
  },
  payment_success: {
    type: "payment_success",
    title: "Payment Confirmed",
    bodyTemplate:
      "Your payment of ${{amount}} for {{description}} was successful.",
    icon: "/icons/icon-192x192.png",
    url: "/financial/transactions",
  },
  score_change: {
    type: "score_change",
    title: "Credit Score Update",
    bodyTemplate:
      "Your credit score changed from {{oldScore}} to {{newScore}} ({{direction}}{{change}} points).",
    icon: "/icons/icon-192x192.png",
    url: "/dashboard",
    requireInteraction: true,
  },
  goal_milestone: {
    type: "goal_milestone",
    title: "Goal Milestone Reached!",
    bodyTemplate:
      "You've reached {{percentage}}% of your {{goalName}} goal! Keep it up!",
    icon: "/icons/icon-192x192.png",
    url: "/financial/goals",
    requireInteraction: true,
  },
  subscription_renewal: {
    type: "subscription_renewal",
    title: "Subscription Renewal",
    bodyTemplate:
      "Your {{planName}} subscription (${{amount}}/{{interval}}) will renew on {{renewalDate}}.",
    icon: "/icons/icon-192x192.png",
    url: "/settings/billing",
    actions: [
      { action: "manage", title: "Manage Plan" },
      { action: "dismiss", title: "Dismiss" },
    ],
  },
};

// ── Utility Functions ────────────────────────────────────────────────────────

/**
 * Parse a time string (HH:MM) into hours and minutes
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: "${timeStr}". Expected HH:MM`);
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(
      `Invalid time values: hours=${hours}, minutes=${minutes}`,
    );
  }

  return { hours, minutes };
}

/**
 * Check whether a given Date falls within quiet hours.
 *
 * Quiet hours can span midnight (e.g. 22:00 - 08:00).
 * When start > end, the quiet window wraps around midnight.
 */
export function isWithinQuietHours(
  date: Date,
  quietHours: QuietHoursConfig,
): boolean {
  if (!quietHours.enabled) return false;

  const start = parseTime(quietHours.start);
  const end = parseTime(quietHours.end);

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 09:00 - 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g. 22:00 - 08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Calculate when quiet hours end (the next available send time).
 *
 * If currently in quiet hours, returns the next end-of-quiet-hours timestamp.
 * If not in quiet hours, returns the provided date unchanged.
 */
export function getNextAvailableTime(
  date: Date,
  quietHours: QuietHoursConfig,
): Date {
  if (!isWithinQuietHours(date, quietHours)) {
    return date;
  }

  const end = parseTime(quietHours.end);
  const result = new Date(date);

  result.setHours(end.hours, end.minutes, 0, 0);

  // If the end time is before the current time, it must be tomorrow
  if (result <= date) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Render a template string by replacing {{key}} placeholders with values.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Generate a unique notification ID
 */
function generateId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ── Notification Scheduler Class ─────────────────────────────────────────────

class NotificationScheduler {
  /** In-memory store for scheduled notifications (would be database in production) */
  private scheduledNotifications: Map<string, ScheduledNotification> =
    new Map();

  /** In-memory store for user preferences (would be database in production) */
  private userPreferences: Map<string, UserNotificationPreferences> =
    new Map();

  /**
   * Schedule a notification for future delivery.
   *
   * If the scheduled time falls within the user's quiet hours,
   * the delivery is delayed to when quiet hours end.
   */
  scheduleNotification(
    userId: string,
    payload: PushNotificationPayload,
    scheduledAt: Date,
  ): ScheduleResult {
    const id = generateId();

    // Validate scheduled time is in the future
    if (scheduledAt <= new Date()) {
      return {
        scheduled: false,
        notificationId: id,
        scheduledAt,
        error: "Scheduled time must be in the future",
      };
    }

    // Check user preferences
    const preferences = this.getUserPreferences(userId);
    const preferenceCheck = this.checkPreferences(
      preferences,
      payload.type,
      scheduledAt,
    );

    if (!preferenceCheck.allowed && !preferenceCheck.delayUntil) {
      return {
        scheduled: false,
        notificationId: id,
        scheduledAt,
        error: preferenceCheck.reason ?? "Notification blocked by user preferences",
      };
    }

    // Adjust delivery time if within quiet hours
    const effectiveTime = preferenceCheck.delayUntil ?? scheduledAt;

    const notification: ScheduledNotification = {
      id,
      userId,
      payload,
      scheduledAt: effectiveTime,
      status: "pending",
      createdAt: new Date(),
    };

    this.scheduledNotifications.set(id, notification);

    return {
      scheduled: true,
      notificationId: id,
      scheduledAt: effectiveTime,
    };
  }

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(notificationId: string): boolean {
    const notification = this.scheduledNotifications.get(notificationId);
    if (!notification) return false;

    if (notification.status !== "pending") {
      return false;
    }

    notification.status = "cancelled";
    notification.cancelledAt = new Date();
    return true;
  }

  /**
   * Get a scheduled notification by ID
   */
  getScheduledNotification(
    notificationId: string,
  ): ScheduledNotification | null {
    return this.scheduledNotifications.get(notificationId) ?? null;
  }

  /**
   * Get all scheduled notifications for a user
   */
  getUserScheduledNotifications(
    userId: string,
    status?: ScheduledNotificationStatus,
  ): ScheduledNotification[] {
    const notifications: ScheduledNotification[] = [];

    for (const notification of this.scheduledNotifications.values()) {
      if (notification.userId === userId) {
        if (!status || notification.status === status) {
          notifications.push(notification);
        }
      }
    }

    return notifications.sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );
  }

  /**
   * Get all notifications that are due for delivery (past their scheduled time)
   */
  getDueNotifications(): ScheduledNotification[] {
    const now = new Date();
    const due: ScheduledNotification[] = [];

    for (const notification of this.scheduledNotifications.values()) {
      if (
        notification.status === "pending" &&
        notification.scheduledAt <= now
      ) {
        due.push(notification);
      }
    }

    return due.sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );
  }

  /**
   * Mark a notification as delivered
   */
  markDelivered(notificationId: string): boolean {
    const notification = this.scheduledNotifications.get(notificationId);
    if (!notification || notification.status !== "pending") return false;

    notification.status = "delivered";
    notification.deliveredAt = new Date();
    return true;
  }

  /**
   * Mark a notification as failed
   */
  markFailed(notificationId: string, error: string): boolean {
    const notification = this.scheduledNotifications.get(notificationId);
    if (!notification || notification.status !== "pending") return false;

    notification.status = "failed";
    notification.error = error;
    return true;
  }

  /**
   * Check whether a notification is allowed by user preferences.
   *
   * Returns:
   * - { allowed: true } if the notification can be sent immediately
   * - { allowed: false, delayUntil: Date } if the notification should be delayed (quiet hours)
   * - { allowed: false, reason: string } if the notification is permanently blocked
   */
  checkPreferences(
    preferences: UserNotificationPreferences,
    notificationType: PushNotificationType,
    sendTime: Date = new Date(),
  ): PreferenceCheckResult {
    // Check if push is globally disabled
    if (!preferences.pushEnabled) {
      return {
        allowed: false,
        reason: "Push notifications disabled by user",
      };
    }

    // Check channel preference
    const channelKey =
      notificationType as keyof ChannelPreferences;
    if (
      channelKey in preferences.channels &&
      !preferences.channels[channelKey]
    ) {
      return {
        allowed: false,
        reason: `Channel "${notificationType}" is disabled by user`,
      };
    }

    // Check quiet hours
    if (isWithinQuietHours(sendTime, preferences.quietHours)) {
      // Security alerts bypass quiet hours
      if (notificationType === "security_alert") {
        return { allowed: true };
      }

      const nextAvailable = getNextAvailableTime(
        sendTime,
        preferences.quietHours,
      );
      return {
        allowed: false,
        delayUntil: nextAvailable,
        reason: "Within quiet hours",
      };
    }

    return { allowed: true };
  }

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId: string): UserNotificationPreferences {
    const stored = this.userPreferences.get(userId);
    if (stored) return stored;

    // Return defaults
    return {
      userId,
      pushEnabled: true,
      quietHours: { ...DEFAULT_QUIET_HOURS },
      channels: { ...DEFAULT_CHANNEL_PREFERENCES },
    };
  }

  /**
   * Update user notification preferences
   */
  updateUserPreferences(
    userId: string,
    update: Partial<Omit<UserNotificationPreferences, "userId">>,
  ): UserNotificationPreferences {
    const current = this.getUserPreferences(userId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...update,
      userId,
      channels: {
        ...current.channels,
        ...(update.channels ?? {}),
      },
      quietHours: {
        ...current.quietHours,
        ...(update.quietHours ?? {}),
      },
    };

    this.userPreferences.set(userId, updated);
    return updated;
  }

  /**
   * Create a notification payload from a built-in template
   */
  createFromTemplate(
    templateKey: string,
    variables: Record<string, string | number>,
    overrides?: Partial<PushNotificationPayload>,
  ): PushNotificationPayload | null {
    const template = NOTIFICATION_TEMPLATES[templateKey];
    if (!template) return null;

    const body = renderTemplate(template.bodyTemplate, variables);

    return {
      type: template.type,
      title: template.title,
      body,
      icon: template.icon,
      url: template.url,
      requireInteraction: template.requireInteraction,
      actions: template.actions,
      ...overrides,
    };
  }

  /**
   * Clear all scheduled notifications (for testing)
   */
  clearAll(): void {
    this.scheduledNotifications.clear();
    this.userPreferences.clear();
  }

  /**
   * Get count of scheduled notifications by status
   */
  getStatusCounts(): Record<ScheduledNotificationStatus, number> {
    const counts: Record<ScheduledNotificationStatus, number> = {
      pending: 0,
      delivered: 0,
      cancelled: 0,
      failed: 0,
    };

    for (const notification of this.scheduledNotifications.values()) {
      counts[notification.status]++;
    }

    return counts;
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();
export default notificationScheduler;
