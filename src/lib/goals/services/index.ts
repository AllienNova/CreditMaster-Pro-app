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
  GoalAllocation,
  GoalProjection,
  RecommendedAllocation,
} from "./GoalInvestmentService";

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
