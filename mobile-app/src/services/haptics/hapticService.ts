/**
 * Fynvita Haptic Feedback Service
 * Cross-platform haptic feedback for iOS and Android parity
 * Provides consistent tactile feedback across both platforms
 */

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HAPTICS_ENABLED_KEY = "@fynvita_haptics_enabled";

// Haptic feedback types
export enum HapticFeedbackType {
  // Light feedback for subtle interactions
  Light = "light",
  // Medium feedback for standard interactions
  Medium = "medium",
  // Heavy feedback for important actions
  Heavy = "heavy",
  // Success feedback for positive outcomes
  Success = "success",
  // Warning feedback for cautionary actions
  Warning = "warning",
  // Error feedback for failures or problems
  Error = "error",
  // Selection feedback for picker/toggle changes
  Selection = "selection",
}

// Context-specific haptic patterns
export enum HapticContext {
  // Button press
  ButtonPress = "buttonPress",
  // Toggle switch
  Toggle = "toggle",
  // Tab change
  TabChange = "tabChange",
  // Pull to refresh
  PullToRefresh = "pullToRefresh",
  // Item deletion
  Delete = "delete",
  // Successful action
  Success = "success",
  // Error action
  Error = "error",
  // Score change (credit score updates)
  ScoreChange = "scoreChange",
  // Payment processed
  Payment = "payment",
  // Dispute filed
  DisputeFiled = "disputeFiled",
  // Goal achieved
  GoalAchieved = "goalAchieved",
}

/**
 * Haptic Feedback Service
 * Provides platform-appropriate haptic feedback
 */
class HapticService {
  private isEnabled = true;
  private isInitialized = false;

  /**
   * Initialize haptic service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const enabled = await AsyncStorage.getItem(HAPTICS_ENABLED_KEY);
      this.isEnabled = enabled !== "false";
      this.isInitialized = true;
    } catch {
      this.isEnabled = true;
      this.isInitialized = true;
    }
  }

  /**
   * Check if haptics are enabled
   */
  async isHapticsEnabled(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.isEnabled;
  }

  /**
   * Enable or disable haptics
   */
  async setHapticsEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
  }

  /**
   * Trigger haptic feedback by type
   */
  async trigger(type: HapticFeedbackType): Promise<void> {
    if (!this.isEnabled) return;

    try {
      switch (type) {
        case HapticFeedbackType.Light:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case HapticFeedbackType.Medium:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case HapticFeedbackType.Heavy:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case HapticFeedbackType.Success:
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          break;
        case HapticFeedbackType.Warning:
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          );
          break;
        case HapticFeedbackType.Error:
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
          break;
        case HapticFeedbackType.Selection:
          await Haptics.selectionAsync();
          break;
      }
    } catch (error) {
      // Haptics not available on this device
      if (__DEV__) {
        console.log("Haptics not available:", error);
      }
    }
  }

  /**
   * Trigger haptic feedback for a specific context
   */
  async triggerForContext(context: HapticContext): Promise<void> {
    if (!this.isEnabled) return;

    try {
      switch (context) {
        case HapticContext.ButtonPress:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case HapticContext.Toggle:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case HapticContext.TabChange:
          await Haptics.selectionAsync();
          break;

        case HapticContext.PullToRefresh:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case HapticContext.Delete:
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          );
          break;

        case HapticContext.Success:
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          break;

        case HapticContext.Error:
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
          break;

        case HapticContext.ScoreChange:
          // Special pattern for score changes
          await this.playPattern([
            { type: "impact", style: "medium", delay: 0 },
            { type: "impact", style: "light", delay: 100 },
          ]);
          break;

        case HapticContext.Payment:
          // Confirmation pattern for payments
          await this.playPattern([
            { type: "impact", style: "medium", delay: 0 },
            { type: "notification", style: "success", delay: 200 },
          ]);
          break;

        case HapticContext.DisputeFiled:
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          break;

        case HapticContext.GoalAchieved:
          // Celebration pattern
          await this.playPattern([
            { type: "impact", style: "heavy", delay: 0 },
            { type: "impact", style: "medium", delay: 100 },
            { type: "notification", style: "success", delay: 200 },
          ]);
          break;
      }
    } catch (error) {
      if (__DEV__) {
        console.log("Haptics not available:", error);
      }
    }
  }

  /**
   * Play a custom haptic pattern
   */
  private async playPattern(
    pattern: Array<{
      type: "impact" | "notification" | "selection";
      style?: string;
      delay: number;
    }>,
  ): Promise<void> {
    for (const step of pattern) {
      if (step.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
      }

      switch (step.type) {
        case "impact":
          await Haptics.impactAsync(
            step.style === "heavy"
              ? Haptics.ImpactFeedbackStyle.Heavy
              : step.style === "light"
                ? Haptics.ImpactFeedbackStyle.Light
                : Haptics.ImpactFeedbackStyle.Medium,
          );
          break;

        case "notification":
          await Haptics.notificationAsync(
            step.style === "error"
              ? Haptics.NotificationFeedbackType.Error
              : step.style === "warning"
                ? Haptics.NotificationFeedbackType.Warning
                : Haptics.NotificationFeedbackType.Success,
          );
          break;

        case "selection":
          await Haptics.selectionAsync();
          break;
      }
    }
  }

  /**
   * Quick convenience methods
   */

  // Light impact
  async light(): Promise<void> {
    await this.trigger(HapticFeedbackType.Light);
  }

  // Medium impact
  async medium(): Promise<void> {
    await this.trigger(HapticFeedbackType.Medium);
  }

  // Heavy impact
  async heavy(): Promise<void> {
    await this.trigger(HapticFeedbackType.Heavy);
  }

  // Success notification
  async success(): Promise<void> {
    await this.trigger(HapticFeedbackType.Success);
  }

  // Warning notification
  async warning(): Promise<void> {
    await this.trigger(HapticFeedbackType.Warning);
  }

  // Error notification
  async error(): Promise<void> {
    await this.trigger(HapticFeedbackType.Error);
  }

  // Selection change
  async selection(): Promise<void> {
    await this.trigger(HapticFeedbackType.Selection);
  }
}

export const hapticService = new HapticService();
export default hapticService;
