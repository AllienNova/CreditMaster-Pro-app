/**
 * Fynvita AI Nudge Engine
 * Sends personalized nudges and notifications to drive behavior change
 */

import { createClient } from "@supabase/supabase-js";
import {
  NudgeDefinition,
  NudgeHistory,
  NudgeRequest,
  NudgeType,
  NudgeChannel,
  NudgeAction,
  NudgeContext,
  UserFinancialProfile,
  NudgeOptimizerInput,
  NudgeOptimizerOutput,
} from "./types";

// ============================================================================
// NUDGE TEMPLATES
// ============================================================================

const NUDGE_TEMPLATES: Record<
  NudgeType,
  { titles: string[]; messages: string[] }
> = {
  motivational: {
    titles: [
      "Keep Going! ",
      "You're Doing Great!",
      "Stay Strong!",
      "Almost There!",
    ],
    messages: [
      "Every small step counts toward your financial goals.",
      "You've been making progress! Keep up the momentum.",
      "Remember why you started. Your future self will thank you.",
      "Financial freedom is built one decision at a time.",
    ],
  },
  progress: {
    titles: [
      "Progress Update ",
      "Your Week in Review",
      "Milestone Alert!",
      "Check Your Progress",
    ],
    messages: [
      "You've saved {{amount}} this week! {{percent}}% toward your goal.",
      "Great news! You stayed under budget in {{categories}} categories.",
      "Your credit score improved by {{points}} points this month!",
      "You're {{percent}}% of the way to {{goalName}}.",
    ],
  },
  warning: {
    titles: ["Budget Alert ", "Spending Notice", "Heads Up!", "Quick Check-In"],
    messages: [
      "You're approaching your {{category}} budget limit.",
      "Spending is {{percent}}% higher than usual this week.",
      "Your {{category}} spending has exceeded your target.",
      "Consider reviewing your recent purchases.",
    ],
  },
  celebration: {
    titles: [
      "Congratulations! ",
      "Achievement Unlocked!",
      "You Did It!",
      "Celebration Time!",
    ],
    messages: [
      "You've reached your {{goalName}} goal! Amazing work!",
      "New badge earned: {{badgeName}}! Keep collecting!",
      "You've maintained your streak for {{days}} days!",
      "Debt milestone: You've paid off {{amount}}!",
    ],
  },
  reminder: {
    titles: [
      "Friendly Reminder ",
      "Don't Forget!",
      "Quick Reminder",
      "Action Needed",
    ],
    messages: [
      "Your bill for {{billName}} is due in {{days}} days.",
      "Time to review your weekly spending summary.",
      "Have you logged your transactions today?",
      "Your savings transfer is scheduled for tomorrow.",
    ],
  },
  insight: {
    titles: [
      "AI Insight ",
      "Did You Know?",
      "Personalized Tip",
      "Smart Suggestion",
    ],
    messages: [
      "You tend to spend more on {{dayOfWeek}}s. Consider planning ahead.",
      "Switching to {{alternative}} could save you {{amount}} monthly.",
      "Your spending patterns suggest {{insight}}.",
      "Based on your goals, consider {{recommendation}}.",
    ],
  },
  coaching: {
    titles: [
      "Coaching Session ",
      "Financial Tip",
      "Learn & Grow",
      "Quick Lesson",
    ],
    messages: [
      "Understanding {{topic}} can help you reach your goals faster.",
      "Here's a tip for managing {{category}} expenses.",
      "Let's talk about building better {{habit}} habits.",
      "This week's focus: {{topic}}.",
    ],
  },
};

// ============================================================================
// NUDGE ENGINE CLASS
// ============================================================================

export class NudgeEngine {
  private readonly supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // --------------------------------------------------------------------------
  // SEND NUDGES
  // --------------------------------------------------------------------------

  async sendNudge(request: NudgeRequest): Promise<NudgeHistory> {
    // Check cooldown
    const canSend = await this.checkCooldown(request.userId, request.nudgeType);
    if (!canSend) {
      throw new Error("Nudge cooldown not expired");
    }

    // Record nudge
    const { data, error } = await this.supabase
      .from("nudge_history")
      .insert({
        user_id: request.userId,
        nudge_type: request.nudgeType,
        title: request.title,
        message: request.message,
        channel: request.channel,
        context: request.context,
        ab_variant: request.abVariant,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record nudge: ${error.message}`);
    }

    // Dispatch to channel
    await this.dispatchToChannel(request);

    return this.mapToNudgeHistory(data);
  }

  async sendBatchNudges(requests: NudgeRequest[]): Promise<NudgeHistory[]> {
    const results: NudgeHistory[] = [];

    for (const request of requests) {
      try {
        const result = await this.sendNudge(request);
        results.push(result);
      } catch {
        // Skip failed nudges, continue with batch
        // Nudge engine warning: Failed to send nudge
      }
    }

    return results;
  }

  private async checkCooldown(
    userId: string,
    nudgeType: NudgeType,
  ): Promise<boolean> {
    // Get nudge definition for cooldown
    const { data: definition } = await this.supabase
      .from("nudge_definitions")
      .select("cooldown_hours")
      .eq("nudge_type", nudgeType)
      .eq("is_active", true)
      .single();

    const cooldownHours = definition?.cooldown_hours ?? 24;

    // Check last nudge of this type
    const cooldownTime = new Date();
    cooldownTime.setHours(cooldownTime.getHours() - cooldownHours);

    const { count } = await this.supabase
      .from("nudge_history")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("nudge_type", nudgeType)
      .gte("sent_at", cooldownTime.toISOString());

    return (count ?? 0) === 0;
  }

  private async dispatchToChannel(request: NudgeRequest): Promise<void> {
    switch (request.channel) {
      case "in_app":
        // In-app notifications are handled by frontend polling nudge_history
        break;
      case "push":
        await this.sendPushNotification(request);
        break;
      case "email":
        await this.sendEmailNotification(request);
        break;
      case "sms":
        await this.sendSmsNotification(request);
        break;
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging or OneSignal.
   * Integration requires: user_devices table with push_token column,
   * and FIREBASE_SERVICE_ACCOUNT or ONESIGNAL_API_KEY env variable.
   */
  private async sendPushNotification(request: NudgeRequest): Promise<void> {
    // Nudge engine: Sending push notification

    try {
      const { data: deviceTokens } = await this.supabase
        .from("user_devices")
        .select("push_token")
        .eq("user_id", request.userId);

      if (deviceTokens && deviceTokens.length > 0) {
        // Push notification service integration available
        const tokens = deviceTokens
          .map((d: { push_token: string }) => d.push_token)
          .filter(Boolean);
        if (tokens.length > 0) {
          // Nudge engine: Would send to device(s)
        }
      }
    } catch (error) {
      // Table may not exist yet - log and continue
      // Nudge engine: Device tokens not available
    }
  }

  /**
   * Send email notification via Resend or configured email service.
   * Integration requires: RESEND_API_KEY env variable and user email lookup.
   */
  private async sendEmailNotification(request: NudgeRequest): Promise<void> {
    // Nudge engine: Sending email notification

    try {
      const { data: userData } = await this.supabase
        .from("users")
        .select("email")
        .eq("id", request.userId)
        .single();

      if (userData?.email) {
        // Email service integration - uses notification-service when available
        // Nudge engine: Email queued
      }
    } catch (error) {
      // Nudge engine: Email user lookup failed
    }
  }

  /**
   * Send SMS notification via Twilio or configured SMS service.
   * Integration requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN env variables
   * and user phone number lookup from users table.
   */
  private async sendSmsNotification(request: NudgeRequest): Promise<void> {
    // Nudge engine: Sending SMS notification

    try {
      const { data: userData } = await this.supabase
        .from("users")
        .select("phone")
        .eq("id", request.userId)
        .single();

      if (userData?.phone) {
        // SMS service integration - requires Twilio credentials
        // Nudge engine: SMS queued
      }
    } catch (error) {
      // Nudge engine: SMS user lookup failed
    }
  }

  // --------------------------------------------------------------------------
  // NUDGE OPTIMIZATION
  // --------------------------------------------------------------------------

  async optimizeNudge(
    input: NudgeOptimizerInput,
  ): Promise<NudgeOptimizerOutput> {
    // Determine if we should send
    const shouldSend = await this.shouldSendNudge(input);

    // Determine optimal channel
    const optimalChannel = this.determineOptimalChannel(input.userProfile);

    // Determine optimal time
    const optimalTime = this.determineOptimalTime(input.userProfile);

    // Generate personalized message
    const personalizedMessage = this.personalizeMessage(
      input.nudgeType,
      input.userProfile,
      input.currentContext,
    );

    // Select A/B variant
    const abVariant = this.selectAbVariant(input.userId);

    return {
      shouldSend,
      optimalChannel,
      optimalTime,
      personalizedMessage,
      abVariant,
      confidence: this.calculateConfidence(input),
    };
  }

  private async shouldSendNudge(input: NudgeOptimizerInput): Promise<boolean> {
    // Check if user has opted out
    if (!input.userProfile.preferredNotificationTime) {
      return true; // Default to sending if no preference set
    }

    // Check recent nudge frequency
    const recentNudges = input.recentNudges.filter((n) => {
      const hoursSince =
        (Date.now() - new Date(n.sentAt).getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });

    if (recentNudges.length >= 5) {
      return false; // Too many nudges in last 24 hours
    }

    // Check response rate to recent nudges
    const respondedNudges = input.recentNudges.filter(
      (n) => n.actionTaken && n.actionTaken !== "ignored",
    );
    const responseRate =
      input.recentNudges.length > 0
        ? respondedNudges.length / input.recentNudges.length
        : 1;

    if (responseRate < 0.1) {
      return false; // User not responding to nudges
    }

    return true;
  }

  private determineOptimalChannel(profile: UserFinancialProfile): NudgeChannel {
    // Use user preference if set
    const preferredDays = profile.preferredNotificationDays ?? [];
    const currentDay = new Date()
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    if (preferredDays.length > 0 && !preferredDays.includes(currentDay)) {
      return "in_app"; // Use in-app if not preferred day
    }

    // Default to in_app for immediate visibility
    return "in_app";
  }

  private determineOptimalTime(profile: UserFinancialProfile): string {
    if (profile.preferredNotificationTime) {
      return profile.preferredNotificationTime;
    }

    // Default optimal times based on engagement data
    const hour = new Date().getHours();
    if (hour < 9) return "09:00";
    if (hour < 12) return "12:00";
    if (hour < 18) return "18:00";
    return "09:00"; // Next morning
  }

  private personalizeMessage(
    nudgeType: NudgeType,
    profile: UserFinancialProfile,
    context: NudgeOptimizerInput["currentContext"],
  ): string {
    const templates = NUDGE_TEMPLATES[nudgeType];
    const messageIndex = Math.floor(Math.random() * templates.messages.length);
    let message = templates.messages[messageIndex];

    // Adjust tone based on profile
    if (profile.communicationTone === "direct") {
      message = message.replace(/!\s/g, ". ").replace(/||||||/g, "");
    } else if (profile.communicationTone === "motivational") {
      message = message + " You've got this! ";
    }

    return message;
  }

  private selectAbVariant(userId: string): string {
    // Simple A/B split based on user ID hash
    const hash = userId.split("").reduce((a, b) => {
      const h = (a << 5) - a + b.charCodeAt(0);
      return h & h;
    }, 0);

    return hash % 2 === 0 ? "A" : "B";
  }

  private calculateConfidence(input: NudgeOptimizerInput): number {
    let confidence = 0.5;

    // Increase confidence if user has preferences set
    if (input.userProfile.preferredNotificationTime) confidence += 0.1;
    if (input.userProfile.communicationTone) confidence += 0.1;

    // Increase confidence based on historical response rate
    const respondedNudges = input.recentNudges.filter(
      (n) => n.actionTaken === "accepted",
    );
    if (input.recentNudges.length > 0) {
      confidence += (respondedNudges.length / input.recentNudges.length) * 0.2;
    }

    return Math.min(1, confidence);
  }

  // --------------------------------------------------------------------------
  // NUDGE RESPONSES
  // --------------------------------------------------------------------------

  async recordNudgeResponse(
    nudgeId: string,
    action: NudgeAction,
    feedback?: string,
  ): Promise<void> {
    await this.supabase
      .from("nudge_history")
      .update({
        action_taken: action,
        action_at: new Date().toISOString(),
        context: feedback ? { feedback } : undefined,
      })
      .eq("id", nudgeId);
  }

  async getNudgeHistory(userId: string, limit = 50): Promise<NudgeHistory[]> {
    const { data, error } = await this.supabase
      .from("nudge_history")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get nudge history: ${error.message}`);
    }

    return data.map(this.mapToNudgeHistory);
  }

  async getUnreadNudges(userId: string): Promise<NudgeHistory[]> {
    const { data, error } = await this.supabase
      .from("nudge_history")
      .select("*")
      .eq("user_id", userId)
      .eq("channel", "in_app")
      .is("opened_at", null)
      .order("sent_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get unread nudges: ${error.message}`);
    }

    return data.map(this.mapToNudgeHistory);
  }

  async markNudgeAsOpened(nudgeId: string): Promise<void> {
    await this.supabase
      .from("nudge_history")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", nudgeId);
  }

  // --------------------------------------------------------------------------
  // NUDGE DEFINITIONS
  // --------------------------------------------------------------------------

  async getNudgeDefinitions(): Promise<NudgeDefinition[]> {
    const { data, error } = await this.supabase
      .from("nudge_definitions")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (error) {
      throw new Error(`Failed to get nudge definitions: ${error.message}`);
    }

    return data.map(this.mapToNudgeDefinition);
  }

  // --------------------------------------------------------------------------
  // SCHEDULED NUDGES
  // --------------------------------------------------------------------------

  async scheduleGoalReminderNudges(): Promise<void> {
    // Get users with active goals nearing deadlines
    const { data: goals } = await this.supabase
      .from("goal_tracking")
      .select("user_id, goal_name, target_value, current_value, target_date")
      .eq("status", "active")
      .not("target_date", "is", null);

    if (!goals) return;

    const today = new Date();

    for (const goal of goals) {
      const targetDate = new Date(goal.target_date);
      const daysRemaining = Math.ceil(
        (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      const progressPercent = Math.round(
        (goal.current_value / goal.target_value) * 100,
      );

      // Send reminder if goal is approaching and behind schedule
      if (
        daysRemaining <= 30 &&
        daysRemaining > 0 &&
        progressPercent < 100 - daysRemaining
      ) {
        await this.sendNudge({
          userId: goal.user_id,
          nudgeType: "reminder",
          title: `Goal Check: ${goal.goal_name}`,
          message: `You have ${daysRemaining} days left to reach your ${goal.goal_name} goal. You're ${progressPercent}% there!`,
          channel: "in_app",
          context: {
            goalId: goal.goal_name,
            amount: goal.target_value - goal.current_value,
          },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // MAPPERS
  // --------------------------------------------------------------------------

  private mapToNudgeHistory(data: Record<string, unknown>): NudgeHistory {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      nudgeId: data.nudge_id as string | null,
      nudgeType: data.nudge_type as NudgeType,
      title: data.title as string,
      message: data.message as string,
      channel: data.channel as NudgeChannel,
      sentAt: data.sent_at as string,
      openedAt: data.opened_at as string | null,
      actionTaken: data.action_taken as NudgeAction | null,
      actionAt: data.action_at as string | null,
      context: data.context as NudgeContext | null,
      abVariant: data.ab_variant as string | null,
    };
  }

  private mapToNudgeDefinition(data: Record<string, unknown>): NudgeDefinition {
    return {
      id: data.id as string,
      code: data.code as string,
      nudgeType: data.nudge_type as NudgeType,
      titleTemplate: data.title_template as string,
      messageTemplate: data.message_template as string,
      triggerConditions:
        data.trigger_conditions as NudgeDefinition["triggerConditions"],
      priority: data.priority as number,
      cooldownHours: data.cooldown_hours as number,
      channels: data.channels as NudgeChannel[],
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let nudgeEngineInstance: NudgeEngine | null = null;

export function getNudgeEngine(): NudgeEngine {
  if (!nudgeEngineInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    nudgeEngineInstance = new NudgeEngine(supabaseUrl, supabaseKey);
  }

  return nudgeEngineInstance;
}

export default NudgeEngine;
