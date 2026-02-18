/**
 * Fynvita Push Notification Service
 * FCM/APNs registration, background handling, deep linking
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api as apiClient } from "../api/client";

const PUSH_TOKEN_KEY = "@cpfi_push_token";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationPayload {
  type: "alert" | "score_change" | "dispute_update" | "payment" | "promo";
  title: string;
  body: string;
  data?: {
    screen?: string;
    id?: string;
    params?: Record<string, string>;
  };
}

class PushNotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private pushToken: string | null = null;

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    if (!Device.isDevice) {
      if (__DEV__) {
        console.log("Push notifications require a physical device");
      }
      return false;
    }

    try {
      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        if (__DEV__) {
          console.log("Push notification permission denied");
        }
        return false;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        await this.registerTokenWithServer(token);
      }

      // Set up listeners
      this.setupListeners();

      // Configure Android channel
      if (Platform.OS === "android") {
        await this.setupAndroidChannel();
      }

      return true;
    } catch (error) {
      if (__DEV__)
        console.error("Failed to initialize push notifications:", error);
      return false;
    }
  }

  /**
   * Get the Expo push token
   */
  private async getPushToken(): Promise<string | null> {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID,
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
   * Register push token with backend
   */
  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      await apiClient.post("/api/notifications/register", {
        token,
        platform: Platform.OS,
        deviceId: Device.deviceName || "unknown",
      });
    } catch (error) {
      if (__DEV__) console.error("Failed to register push token:", error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log("Notification received:", notification);
        }
        this.handleNotification(notification);
      },
    );

    // Handle notification taps
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        if (__DEV__) {
          console.log("Notification tapped:", response);
        }
        this.handleNotificationResponse(response);
      });
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(notification: Notifications.Notification): void {
    const data = notification.request.content
      .data as PushNotificationPayload["data"];
    // Could update badge count, show in-app notification, etc.
    if (__DEV__) {
      console.log("Processing notification data:", data);
    }
  }

  /**
   * Handle notification tap - deep linking
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse,
  ): void {
    const data = response.notification.request.content
      .data as PushNotificationPayload["data"];

    if (data?.screen) {
      // Navigate to the specified screen
      const route = data.id ? `${data.screen}/${data.id}` : data.screen;
      router.push(route as never);
    }
  }

  /**
   * Set up Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Fynvita Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
    });

    await Notifications.setNotificationChannelAsync("credit-alerts", {
      name: "Credit Alerts",
      description: "Important credit score and monitoring alerts",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationPayload["data"],
    trigger?: Notifications.NotificationTriggerInput,
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: "default",
      },
      trigger: trigger || null,
    });
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
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Unregister push token from server
   */
  async unregister(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) {
        await apiClient.post("/api/notifications/unregister", { token });
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      }
    } catch (error) {
      if (__DEV__) console.error("Failed to unregister push token:", error);
    }
  }

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

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  }
}

export const pushNotificationService = new PushNotificationService();
