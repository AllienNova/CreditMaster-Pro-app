/**
 * Push Notification Service
 *
 * Handles push notifications for the Fynvita mobile app including:
 * - Credit score changes
 * - Bill payment reminders
 * - Budget alerts
 * - Security alerts
 * - Market updates
 * - AI insights
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | "credit_score_change"
  | "bill_reminder"
  | "bill_due_today"
  | "bill_overdue"
  | "budget_warning"
  | "budget_exceeded"
  | "security_alert"
  | "transaction_alert"
  | "market_update"
  | "price_alert"
  | "goal_milestone"
  | "ai_insight"
  | "subscription_renewal"
  | "weekly_summary"
  | "system";

export type NotificationPriority = "low" | "default" | "high" | "critical";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  badge?: number;
  sound?: string;
  categoryId?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: Record<NotificationType, boolean>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
  frequency: {
    billReminders: "daily" | "day_before" | "week_before" | "all";
    budgetAlerts: "always" | "daily_summary" | "weekly_summary";
    marketUpdates: "realtime" | "daily" | "weekly" | "off";
  };
}

export interface ScheduledNotification {
  id: string;
  type: NotificationType;
  scheduledFor: Date;
  payload: NotificationPayload;
  recurring?: {
    interval: "daily" | "weekly" | "monthly";
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
}

export interface NotificationHistory {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  receivedAt: Date;
  read: boolean;
  actionTaken?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PUSH_TOKEN_KEY = "@fynvita_push_token";
const NOTIFICATION_PREFS_KEY = "@fynvita_notification_prefs";
const NOTIFICATION_HISTORY_KEY = "@fynvita_notification_history";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  types: {
    credit_score_change: true,
    bill_reminder: true,
    bill_due_today: true,
    bill_overdue: true,
    budget_warning: true,
    budget_exceeded: true,
    security_alert: true,
    transaction_alert: true,
    market_update: false,
    price_alert: true,
    goal_milestone: true,
    ai_insight: true,
    subscription_renewal: true,
    weekly_summary: true,
    system: true,
  },
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
  },
  frequency: {
    billReminders: "day_before",
    budgetAlerts: "always",
    marketUpdates: "daily",
  },
};

const NOTIFICATION_CHANNELS = {
  credit: {
    id: "credit-alerts",
    name: "Credit Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  },
  bills: {
    id: "bill-reminders",
    name: "Bill Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  },
  budget: {
    id: "budget-alerts",
    name: "Budget Alerts",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  },
  security: {
    id: "security-alerts",
    name: "Security Alerts",
    importance: Notifications.AndroidImportance.MAX,
    sound: "alarm",
  },
  market: {
    id: "market-updates",
    name: "Market Updates",
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
  },
  general: {
    id: "general",
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  },
};

// ============================================================================
// PUSH NOTIFICATION SERVICE CLASS
// ============================================================================

class PushNotificationService {
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Initialize push notification service
   */
  async initialize(): Promise<string | null> {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Set up Android notification channels
    if (Platform.OS === "android") {
      await this.setupAndroidChannels();
    }

    // Load saved preferences
    await this.loadPreferences();

    // Register for push notifications
    const token = await this.registerForPushNotifications();

    // Set up notification listeners
    this.setupListeners();

    return token;
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      if (__DEV__) {
        console.log("Push notifications require a physical device");
      }
      return null;
    }

    // Check existing permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      if (__DEV__) {
        console.log("Push notification permission denied");
      }
      return null;
    }

    // Get Expo push token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      });

      this.pushToken = tokenData.data;
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.pushToken);

      return this.pushToken;
    } catch (error) {
      if (__DEV__) console.error("Failed to get push token:", error);
      return null;
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(
    payload: NotificationPayload,
  ): Promise<string | null> {
    // Check if notifications are enabled for this type
    if (!this.shouldSendNotification(payload.type)) {
      return null;
    }

    // Check quiet hours
    if (this.isQuietHours() && payload.priority !== "critical") {
      return null;
    }

    const channelId = this.getChannelForType(payload.type);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: {
          type: payload.type,
          ...payload.data,
        },
        badge: payload.badge,
        sound: payload.sound || "default",
        categoryIdentifier: payload.categoryId,
      },
      trigger: null, // Immediate
    });

    // Save to history
    await this.addToHistory({
      id: notificationId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      receivedAt: new Date(),
      read: false,
    });

    return notificationId;
  }

  /**
   * Schedule a notification for later
   */
  async scheduleNotification(
    payload: NotificationPayload,
    trigger:
      | Date
      | { seconds: number }
      | { repeats: boolean; hour: number; minute: number },
  ): Promise<string | null> {
    if (!this.shouldSendNotification(payload.type)) {
      return null;
    }

    let notificationTrigger: Notifications.NotificationTriggerInput;

    if (trigger instanceof Date) {
      notificationTrigger = { date: trigger };
    } else if ("seconds" in trigger) {
      notificationTrigger = { seconds: trigger.seconds };
    } else {
      notificationTrigger = {
        hour: trigger.hour,
        minute: trigger.minute,
        repeats: trigger.repeats,
      };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: {
          type: payload.type,
          ...payload.data,
        },
        sound: payload.sound || "default",
      },
      trigger: notificationTrigger,
    });

    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  // ==========================================================================
  // NOTIFICATION TEMPLATES
  // ==========================================================================

  /**
   * Send credit score change notification
   */
  async notifyCreditScoreChange(
    previousScore: number,
    newScore: number,
    changeReason?: string,
  ): Promise<void> {
    const change = newScore - previousScore;
    const direction = change > 0 ? "increased" : "decreased";
    const emoji = change > 0 ? "📈" : "📉";

    await this.sendLocalNotification({
      type: "credit_score_change",
      title: `${emoji} Credit Score ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
      body: `Your score ${direction} by ${Math.abs(change)} points to ${newScore}${changeReason ? `. ${changeReason}` : ""}`,
      priority: Math.abs(change) >= 20 ? "high" : "default",
      data: { previousScore, newScore, change },
    });
  }

  /**
   * Send bill reminder notification
   */
  async notifyBillReminder(
    billName: string,
    amount: number,
    dueDate: Date,
    daysUntilDue: number,
  ): Promise<void> {
    let title: string;
    let type: NotificationType;
    let priority: NotificationPriority = "default";

    if (daysUntilDue < 0) {
      type = "bill_overdue";
      title = "⚠️ Bill Overdue";
      priority = "high";
    } else if (daysUntilDue === 0) {
      type = "bill_due_today";
      title = "📅 Bill Due Today";
      priority = "high";
    } else {
      type = "bill_reminder";
      title = "💳 Upcoming Bill";
    }

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

    const body =
      daysUntilDue < 0
        ? `${billName} (${formattedAmount}) is overdue by ${Math.abs(daysUntilDue)} days`
        : daysUntilDue === 0
          ? `${billName} (${formattedAmount}) is due today`
          : `${billName} (${formattedAmount}) is due in ${daysUntilDue} days`;

    await this.sendLocalNotification({
      type,
      title,
      body,
      priority,
      data: { billName, amount, dueDate: dueDate.toISOString(), daysUntilDue },
    });
  }

  /**
   * Send budget alert notification
   */
  async notifyBudgetAlert(
    category: string,
    percentUsed: number,
    remaining: number,
  ): Promise<void> {
    const type: NotificationType =
      percentUsed >= 100 ? "budget_exceeded" : "budget_warning";
    const emoji = percentUsed >= 100 ? "🚨" : "⚠️";

    const formattedRemaining = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(remaining));

    const title =
      percentUsed >= 100
        ? `${emoji} Budget Exceeded`
        : `${emoji} Budget Warning`;

    const body =
      percentUsed >= 100
        ? `You've exceeded your ${category} budget by ${formattedRemaining}`
        : `You've used ${percentUsed.toFixed(0)}% of your ${category} budget. ${formattedRemaining} remaining`;

    await this.sendLocalNotification({
      type,
      title,
      body,
      priority: percentUsed >= 100 ? "high" : "default",
      data: { category, percentUsed, remaining },
    });
  }

  /**
   * Send security alert notification
   */
  async notifySecurityAlert(
    alertType: "new_device" | "password_change" | "suspicious_activity",
    details: string,
  ): Promise<void> {
    const titles: Record<string, string> = {
      new_device: "🔐 New Device Sign-in",
      password_change: "🔑 Password Changed",
      suspicious_activity: "🚨 Suspicious Activity Detected",
    };

    await this.sendLocalNotification({
      type: "security_alert",
      title: titles[alertType],
      body: details,
      priority: "critical",
      data: { alertType },
    });
  }

  /**
   * Send AI insight notification
   */
  async notifyAIInsight(insight: string, category: string): Promise<void> {
    await this.sendLocalNotification({
      type: "ai_insight",
      title: "💡 Financial Insight",
      body: insight,
      priority: "low",
      data: { category },
    });
  }

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences {
    return this.preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    updates: Partial<NotificationPreferences>,
  ): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    await AsyncStorage.setItem(
      NOTIFICATION_PREFS_KEY,
      JSON.stringify(this.preferences),
    );
  }

  /**
   * Toggle notification type
   */
  async toggleNotificationType(
    type: NotificationType,
    enabled: boolean,
  ): Promise<void> {
    this.preferences.types[type] = enabled;
    await this.updatePreferences({ types: this.preferences.types });
  }

  // ==========================================================================
  // HISTORY
  // ==========================================================================

  /**
   * Get notification history
   */
  async getHistory(limit: number = 50): Promise<NotificationHistory[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
      if (stored) {
        const history: NotificationHistory[] = JSON.parse(stored);
        return history.slice(0, limit);
      }
    } catch (error) {
      if (__DEV__) console.error("Failed to get notification history:", error);
    }
    return [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const history = await this.getHistory(100);
      const index = history.findIndex((n) => n.id === notificationId);
      if (index >= 0) {
        history[index].read = true;
        await AsyncStorage.setItem(
          NOTIFICATION_HISTORY_KEY,
          JSON.stringify(history),
        );
      }
    } catch (error) {
      if (__DEV__) console.error("Failed to mark notification as read:", error);
    }
  }

  /**
   * Clear notification history
   */
  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(NOTIFICATION_HISTORY_KEY);
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async setupAndroidChannels(): Promise<void> {
    for (const channel of Object.values(NOTIFICATION_CHANNELS)) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: channel.importance,
        sound: channel.sound,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3B82F6",
      });
    }
  }

  private setupListeners(): void {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log("Notification received:", notification);
        }
      },
    );

    // Handle notification taps
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (__DEV__) {
          console.log("Notification tapped:", data);
        }
        // Handle navigation based on notification type
        this.handleNotificationTap(data);
      });
  }

  private handleNotificationTap(data: Record<string, unknown>): void {
    const type = data.type as NotificationType;

    // Navigation would be handled here based on notification type
    // This would typically use a navigation ref or event emitter
    if (__DEV__) {
      console.log(`Handle tap for notification type: ${type}`);
    }
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      if (__DEV__)
        console.error("Failed to load notification preferences:", error);
    }
  }

  private shouldSendNotification(type: NotificationType): boolean {
    return this.preferences.enabled && this.preferences.types[type];
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const { start, end } = this.preferences.quietHours;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= start || currentTime <= end;
    }
  }

  private getChannelForType(type: NotificationType): string {
    const channelMap: Record<NotificationType, string> = {
      credit_score_change: NOTIFICATION_CHANNELS.credit.id,
      bill_reminder: NOTIFICATION_CHANNELS.bills.id,
      bill_due_today: NOTIFICATION_CHANNELS.bills.id,
      bill_overdue: NOTIFICATION_CHANNELS.bills.id,
      budget_warning: NOTIFICATION_CHANNELS.budget.id,
      budget_exceeded: NOTIFICATION_CHANNELS.budget.id,
      security_alert: NOTIFICATION_CHANNELS.security.id,
      transaction_alert: NOTIFICATION_CHANNELS.security.id,
      market_update: NOTIFICATION_CHANNELS.market.id,
      price_alert: NOTIFICATION_CHANNELS.market.id,
      goal_milestone: NOTIFICATION_CHANNELS.general.id,
      ai_insight: NOTIFICATION_CHANNELS.general.id,
      subscription_renewal: NOTIFICATION_CHANNELS.bills.id,
      weekly_summary: NOTIFICATION_CHANNELS.general.id,
      system: NOTIFICATION_CHANNELS.general.id,
    };

    return channelMap[type] || NOTIFICATION_CHANNELS.general.id;
  }

  private async addToHistory(notification: NotificationHistory): Promise<void> {
    try {
      const history = await this.getHistory(100);
      history.unshift(notification);

      // Keep only last 100 notifications
      const trimmed = history.slice(0, 100);
      await AsyncStorage.setItem(
        NOTIFICATION_HISTORY_KEY,
        JSON.stringify(trimmed),
      );
    } catch (error) {
      if (__DEV__)
        console.error("Failed to add notification to history:", error);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
