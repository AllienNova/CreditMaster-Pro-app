/**
 * Goal Services
 */

export {
  GoalInvestmentService,
  getGoalInvestmentService,
  goalInvestmentService,
} from "./GoalInvestmentService";

export type {
  GoalType,
  RiskTolerance,
  ContributionFrequency,
  GoalStatus,
  FinancialGoal,
  GoalInvestmentLink,
  ContributionSchedule,
  GoalAllocation,
  GoalProjection,
  GoalProgress,
  GoalMilestone,
  RecommendedAllocation,
} from "./GoalInvestmentService";

export {
  ContributionSchedulerService,
  getContributionScheduler,
  contributionScheduler,
} from "./ContributionSchedulerService";

export type {
  ContributionStatus,
  FailureReason,
  ScheduledContribution,
  ContributionResult,
  SchedulerConfig,
  SchedulerStats,
  ContributionEvent,
} from "./ContributionSchedulerService";

export {
  SmartAllocationService,
  getSmartAllocationService,
  smartAllocationService,
} from "./SmartAllocationService";

export type {
  AssetClass,
  AssetAllocation,
  AllocationRecommendation,
  UserRiskProfile,
  GoalContext,
  MarketConditions,
  GlidePath,
} from "./SmartAllocationService";

export {
  GoalNotificationService,
  getGoalNotificationService,
  goalNotificationService,
} from "./GoalNotificationService";

export type {
  NotificationType,
  NotificationPriority,
  GoalNotification,
  MilestoneEvent,
  AdjustmentRecommendation,
  GoalHealthCheck,
  NotificationPreferences,
} from "./GoalNotificationService";
