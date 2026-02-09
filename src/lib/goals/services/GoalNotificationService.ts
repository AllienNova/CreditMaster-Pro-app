/**
 * Goal Notification Service
 *
 * Handles milestone tracking, progress notifications, and
 * generates adjustment recommendations when goals are off track.
 */

import { supabase } from '@/lib/supabase';
import { Subject, BehaviorSubject } from 'rxjs';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | 'milestone_reached'
  | 'goal_on_track'
  | 'goal_behind'
  | 'goal_at_risk'
  | 'contribution_reminder'
  | 'adjustment_recommended'
  | 'goal_completed';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface GoalNotification {
  id: string;
  goalId: string;
  goalName: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface MilestoneEvent {
  goalId: string;
  goalName: string;
  milestonePercent: number;
  currentAmount: number;
  targetAmount: number;
  reachedAt: Date;
}

export interface AdjustmentRecommendation {
  id: string;
  goalId: string;
  goalName: string;
  type:
    | 'increase_contribution'
    | 'extend_timeline'
    | 'reduce_target'
    | 'change_allocation';
  priority: NotificationPriority;
  title: string;
  description: string;
  impact: string;
  suggestedValue?: number;
  currentValue?: number;
  createdAt: Date;
  acceptedAt?: Date;
  dismissedAt?: Date;
}

export interface GoalHealthCheck {
  goalId: string;
  isOnTrack: boolean;
  currentProgress: number;
  expectedProgress: number;
  projectedCompletion: Date | null;
  targetDate: Date;
  shortfallAmount?: number;
  recommendations: AdjustmentRecommendation[];
}

export interface NotificationPreferences {
  milestoneAlerts: boolean;
  progressUpdates: boolean;
  adjustmentRecommendations: boolean;
  contributionReminders: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  frequencySummary: 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MILESTONE_THRESHOLDS = [10, 25, 50, 75, 90, 100];
const BEHIND_SCHEDULE_THRESHOLD = 0.9; // 90% of expected progress
const AT_RISK_THRESHOLD = 0.75; // 75% of expected progress

const DEFAULT_PREFERENCES: NotificationPreferences = {
  milestoneAlerts: true,
  progressUpdates: true,
  adjustmentRecommendations: true,
  contributionReminders: true,
  emailNotifications: false,
  pushNotifications: true,
  frequencySummary: 'weekly',
};

// ============================================================================
// SERVICE
// ============================================================================

export class GoalNotificationService {
  private notificationsSubject = new BehaviorSubject<GoalNotification[]>([]);
  private recommendationsSubject = new BehaviorSubject<
    AdjustmentRecommendation[]
  >([]);
  private milestoneSubject = new Subject<MilestoneEvent>();

  public notifications$ = this.notificationsSubject.asObservable();
  public recommendations$ = this.recommendationsSubject.asObservable();
  public milestones$ = this.milestoneSubject.asObservable();

  // ==========================================================================
  // NOTIFICATION MANAGEMENT
  // ==========================================================================

  /**
   * Get all notifications for a user
   */
  async getNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
    }
  ): Promise<GoalNotification[]> {
    try {
      let query = supabase
        .from('goal_notifications')
        .select(
          `
          *,
          financial_goals(name)
        `
        )
        .eq('user_id', userId)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) {
        query = query.is('read_at', null);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        // GoalNotificationService error: Failed to get notifications
        return [];
      }

      const notifications = (data || []).map((row) => ({
        id: row.id,
        goalId: row.goal_id,
        goalName: row.financial_goals?.name || 'Unknown Goal',
        type: row.type as NotificationType,
        priority: row.priority as NotificationPriority,
        title: row.title,
        message: row.message,
        actionUrl: row.action_url,
        actionLabel: row.action_label,
        createdAt: new Date(row.created_at),
        readAt: row.read_at ? new Date(row.read_at) : undefined,
        dismissedAt: row.dismissed_at ? new Date(row.dismissed_at) : undefined,
        metadata: row.metadata,
      }));

      this.notificationsSubject.next(notifications);
      return notifications;
    } catch {
      return [];
    }
  }

  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    goalId: string,
    data: {
      type: NotificationType;
      priority: NotificationPriority;
      title: string;
      message: string;
      actionUrl?: string;
      actionLabel?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<GoalNotification | null> {
    try {
      const { data: result, error } = await supabase
        .from('goal_notifications')
        .insert({
          user_id: userId,
          goal_id: goalId,
          type: data.type,
          priority: data.priority,
          title: data.title,
          message: data.message,
          action_url: data.actionUrl,
          action_label: data.actionLabel,
          metadata: data.metadata,
          created_at: new Date().toISOString(),
        })
        .select(`*, financial_goals(name)`)
        .single();

      if (error) {
        // GoalNotificationService error: Failed to create notification
        return null;
      }

      const notification: GoalNotification = {
        id: result.id,
        goalId: result.goal_id,
        goalName: result.financial_goals?.name || 'Unknown Goal',
        type: result.type,
        priority: result.priority,
        title: result.title,
        message: result.message,
        actionUrl: result.action_url,
        actionLabel: result.action_label,
        createdAt: new Date(result.created_at),
        metadata: result.metadata,
      };

      // Update observable
      const current = this.notificationsSubject.getValue();
      this.notificationsSubject.next([notification, ...current]);

      return notification;
    } catch {
      return null;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goal_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (!error) {
        const current = this.notificationsSubject.getValue();
        const updated = current.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date() } : n
        );
        this.notificationsSubject.next(updated);
      }

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goal_notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (!error) {
        const current = this.notificationsSubject.getValue();
        this.notificationsSubject.next(
          current.filter((n) => n.id !== notificationId)
        );
      }

      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // MILESTONE TRACKING
  // ==========================================================================

  /**
   * Check and record milestone achievements
   */
  async checkMilestones(
    userId: string,
    goalId: string,
    goalName: string,
    currentAmount: number,
    targetAmount: number
  ): Promise<MilestoneEvent[]> {
    const currentPercent = (currentAmount / targetAmount) * 100;
    const achievedMilestones: MilestoneEvent[] = [];

    // Get previously achieved milestones
    const { data: existing } = await supabase
      .from('goal_milestones')
      .select('milestone_percent')
      .eq('goal_id', goalId);

    const existingMilestones = new Set(
      (existing || []).map((m) => m.milestone_percent)
    );

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (currentPercent >= threshold && !existingMilestones.has(threshold)) {
        // Record the milestone
        await supabase.from('goal_milestones').insert({
          goal_id: goalId,
          milestone_percent: threshold,
          amount_at_milestone: currentAmount,
          reached_at: new Date().toISOString(),
        });

        const event: MilestoneEvent = {
          goalId,
          goalName,
          milestonePercent: threshold,
          currentAmount,
          targetAmount,
          reachedAt: new Date(),
        };

        achievedMilestones.push(event);
        this.milestoneSubject.next(event);

        // Create notification
        await this.createNotification(userId, goalId, {
          type: threshold === 100 ? 'goal_completed' : 'milestone_reached',
          priority: threshold === 100 ? 'high' : 'medium',
          title:
            threshold === 100
              ? `Congratulations! Goal Completed!`
              : `Milestone Reached: ${threshold}%`,
          message:
            threshold === 100
              ? `You've reached your goal of $${targetAmount.toLocaleString()} for "${goalName}"!`
              : `You've reached ${threshold}% of your "${goalName}" goal. Keep it up!`,
          actionUrl: `/goals/${goalId}`,
          actionLabel: 'View Goal',
          metadata: { milestonePercent: threshold },
        });
      }
    }

    return achievedMilestones;
  }

  // ==========================================================================
  // HEALTH CHECKS & RECOMMENDATIONS
  // ==========================================================================

  /**
   * Perform health check on a goal and generate recommendations
   */
  async performHealthCheck(
    userId: string,
    goalId: string,
    data: {
      goalName: string;
      currentAmount: number;
      targetAmount: number;
      targetDate: Date;
      createdAt: Date;
      monthlyContribution: number;
      expectedReturn: number;
    }
  ): Promise<GoalHealthCheck> {
    const now = new Date();
    const totalDuration = data.targetDate.getTime() - data.createdAt.getTime();
    const elapsedDuration = now.getTime() - data.createdAt.getTime();
    const progressRatio = elapsedDuration / totalDuration;

    // Calculate expected progress
    const expectedProgress = Math.min(100, progressRatio * 100);
    const currentProgress = (data.currentAmount / data.targetAmount) * 100;

    // Determine if on track
    const progressRatioVsExpected = currentProgress / expectedProgress;
    let isOnTrack = progressRatioVsExpected >= BEHIND_SCHEDULE_THRESHOLD;

    // Calculate projected completion
    const monthsRemaining = Math.max(
      0,
      (data.targetDate.getFullYear() - now.getFullYear()) * 12 +
        (data.targetDate.getMonth() - now.getMonth())
    );

    const monthlyReturn = data.expectedReturn / 12;
    let projectedAmount = data.currentAmount;
    for (let i = 0; i < monthsRemaining; i++) {
      projectedAmount =
        projectedAmount * (1 + monthlyReturn) + data.monthlyContribution;
    }

    const projectedCompletion =
      projectedAmount >= data.targetAmount
        ? this.estimateCompletionDate(
            data.currentAmount,
            data.targetAmount,
            data.monthlyContribution,
            data.expectedReturn
          )
        : null;

    const shortfallAmount =
      projectedAmount < data.targetAmount
        ? data.targetAmount - projectedAmount
        : undefined;

    // Generate recommendations
    const recommendations: AdjustmentRecommendation[] = [];

    if (progressRatioVsExpected < AT_RISK_THRESHOLD) {
      // Goal is at risk
      const requiredMonthly = this.calculateRequiredContribution(
        data.currentAmount,
        data.targetAmount,
        monthsRemaining,
        data.expectedReturn
      );

      if (requiredMonthly > data.monthlyContribution * 1.5) {
        // Need significant increase
        recommendations.push({
          id: `rec-${goalId}-extend`,
          goalId,
          goalName: data.goalName,
          type: 'extend_timeline',
          priority: 'high',
          title: 'Consider Extending Your Timeline',
          description: `Your goal may be difficult to achieve by ${data.targetDate.toLocaleDateString()}. Consider extending the target date.`,
          impact:
            'Reduces monthly contribution requirement and investment risk',
          suggestedValue: this.estimateRequiredMonths(
            data.currentAmount,
            data.targetAmount,
            data.monthlyContribution,
            data.expectedReturn
          ),
          createdAt: new Date(),
        });

        recommendations.push({
          id: `rec-${goalId}-reduce`,
          goalId,
          goalName: data.goalName,
          type: 'reduce_target',
          priority: 'medium',
          title: 'Adjust Your Target Amount',
          description: `Consider setting a more achievable target based on your current savings rate.`,
          impact: 'Makes goal more achievable with current contributions',
          suggestedValue: Math.round(projectedAmount * 0.95),
          currentValue: data.targetAmount,
          createdAt: new Date(),
        });
      }

      recommendations.push({
        id: `rec-${goalId}-increase`,
        goalId,
        goalName: data.goalName,
        type: 'increase_contribution',
        priority:
          requiredMonthly <= data.monthlyContribution * 1.5 ? 'high' : 'medium',
        title: 'Increase Monthly Contribution',
        description: `Increasing your monthly contribution would help you reach your goal on time.`,
        impact: `Projected to reach ${(((data.currentAmount + requiredMonthly * monthsRemaining) / data.targetAmount) * 100).toFixed(0)}% of goal`,
        suggestedValue: Math.round(requiredMonthly),
        currentValue: data.monthlyContribution,
        createdAt: new Date(),
      });

      // Create notification for at-risk goal
      await this.createNotification(userId, goalId, {
        type: 'goal_at_risk',
        priority: 'urgent',
        title: 'Goal At Risk',
        message: `Your "${data.goalName}" goal is significantly behind schedule. Review your options to get back on track.`,
        actionUrl: `/goals/${goalId}/adjust`,
        actionLabel: 'Review Options',
      });
    } else if (progressRatioVsExpected < BEHIND_SCHEDULE_THRESHOLD) {
      // Goal is behind
      const requiredMonthly = this.calculateRequiredContribution(
        data.currentAmount,
        data.targetAmount,
        monthsRemaining,
        data.expectedReturn
      );

      recommendations.push({
        id: `rec-${goalId}-catchup`,
        goalId,
        goalName: data.goalName,
        type: 'increase_contribution',
        priority: 'medium',
        title: 'Catch-Up Contribution',
        description: `A small increase in contributions can help you get back on track.`,
        impact: 'Gets you back on schedule within 3 months',
        suggestedValue: Math.round(requiredMonthly),
        currentValue: data.monthlyContribution,
        createdAt: new Date(),
      });

      await this.createNotification(userId, goalId, {
        type: 'goal_behind',
        priority: 'medium',
        title: 'Goal Progress Update',
        message: `Your "${data.goalName}" goal is slightly behind schedule. A small adjustment can help.`,
        actionUrl: `/goals/${goalId}`,
        actionLabel: 'View Details',
      });
    }

    // Store recommendations
    if (recommendations.length > 0) {
      const current = this.recommendationsSubject.getValue();
      const filtered = current.filter((r) => r.goalId !== goalId);
      this.recommendationsSubject.next([...filtered, ...recommendations]);
    }

    return {
      goalId,
      isOnTrack,
      currentProgress,
      expectedProgress,
      projectedCompletion,
      targetDate: data.targetDate,
      shortfallAmount,
      recommendations,
    };
  }

  /**
   * Accept a recommendation
   */
  async acceptRecommendation(recommendationId: string): Promise<boolean> {
    try {
      const current = this.recommendationsSubject.getValue();
      const recommendation = current.find((r) => r.id === recommendationId);

      if (!recommendation) return false;

      // Record acceptance
      await supabase.from('recommendation_actions').insert({
        recommendation_id: recommendationId,
        goal_id: recommendation.goalId,
        action: 'accepted',
        acted_at: new Date().toISOString(),
      });

      // Update observable
      const updated = current.map((r) =>
        r.id === recommendationId ? { ...r, acceptedAt: new Date() } : r
      );
      this.recommendationsSubject.next(
        updated.filter((r) => !r.acceptedAt && !r.dismissedAt)
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(recommendationId: string): Promise<boolean> {
    try {
      const current = this.recommendationsSubject.getValue();
      const recommendation = current.find((r) => r.id === recommendationId);

      if (!recommendation) return false;

      // Record dismissal
      await supabase.from('recommendation_actions').insert({
        recommendation_id: recommendationId,
        goal_id: recommendation.goalId,
        action: 'dismissed',
        acted_at: new Date().toISOString(),
      });

      // Update observable
      this.recommendationsSubject.next(
        current.filter((r) => r.id !== recommendationId)
      );

      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!data) return DEFAULT_PREFERENCES;

      return {
        milestoneAlerts: data.milestone_alerts ?? true,
        progressUpdates: data.progress_updates ?? true,
        adjustmentRecommendations: data.adjustment_recommendations ?? true,
        contributionReminders: data.contribution_reminders ?? true,
        emailNotifications: data.email_notifications ?? false,
        pushNotifications: data.push_notifications ?? true,
        frequencySummary: data.frequency_summary ?? 'weekly',
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          milestone_alerts: preferences.milestoneAlerts,
          progress_updates: preferences.progressUpdates,
          adjustment_recommendations: preferences.adjustmentRecommendations,
          contribution_reminders: preferences.contributionReminders,
          email_notifications: preferences.emailNotifications,
          push_notifications: preferences.pushNotifications,
          frequency_summary: preferences.frequencySummary,
          updated_at: new Date().toISOString(),
        });

      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private calculateRequiredContribution(
    current: number,
    target: number,
    months: number,
    annualReturn: number
  ): number {
    if (months <= 0) return target - current;

    const r = annualReturn / 12;
    const compoundFactor = Math.pow(1 + r, months);
    const annuityFactor = (compoundFactor - 1) / r;

    return Math.max(0, (target - current * compoundFactor) / annuityFactor);
  }

  private estimateCompletionDate(
    current: number,
    target: number,
    monthlyContribution: number,
    annualReturn: number
  ): Date | null {
    if (current >= target) return new Date();
    if (monthlyContribution <= 0) return null;

    const r = annualReturn / 12;
    let amount = current;
    let months = 0;
    const maxMonths = 600; // 50 years max

    while (amount < target && months < maxMonths) {
      amount = amount * (1 + r) + monthlyContribution;
      months++;
    }

    if (months >= maxMonths) return null;

    const completion = new Date();
    completion.setMonth(completion.getMonth() + months);
    return completion;
  }

  private estimateRequiredMonths(
    current: number,
    target: number,
    monthlyContribution: number,
    annualReturn: number
  ): number {
    const completion = this.estimateCompletionDate(
      current,
      target,
      monthlyContribution,
      annualReturn
    );
    if (!completion) return 600;

    const now = new Date();
    return Math.ceil(
      (completion.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let notificationServiceInstance: GoalNotificationService | null = null;

export function getGoalNotificationService(): GoalNotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new GoalNotificationService();
  }
  return notificationServiceInstance;
}

export const goalNotificationService = getGoalNotificationService();
