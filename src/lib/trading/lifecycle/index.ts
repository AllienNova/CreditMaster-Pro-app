export { PromotionManager, promotionManager } from "./promotion-manager";
export type {
  StrategyLifecycleRecord,
  PromotionResult,
  CanTradeResult,
} from "./promotion-manager";

export {
  evaluateGates,
  fetchStrategyMetrics,
  getNextStage,
  getPreviousStage,
  stageIndex,
} from "./promotion-gates";
export type {
  GateScore,
  GateEvaluation,
  StrategyMetrics,
} from "./promotion-gates";

export { checkDemotionTriggers } from "./demotion-rules";
export type {
  DemotionTrigger,
  DemotionResult,
} from "./demotion-rules";
