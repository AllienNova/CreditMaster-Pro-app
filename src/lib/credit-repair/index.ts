/**
 * Credit Repair Module
 * 
 * Exports all credit repair services and types
 */

// Services
export { creditRepairService } from './credit-repair-service';
export { disputeService } from './dispute-service';
export { negotiationService } from './negotiation-service';

// Types
export type {
  CreditRepairScore,
  ScoreFactor,
  Opportunity,
  QuickWin,
  OpportunityType,
  DisputeItem,
  InaccuracyType,
  DisputeStrategy,
  DisputeStatus,
  DisputeOutcome,
  UtilizationAnalysis,
  UtilizationMetric,
  CardUtilization,
  UtilizationRecommendation,
  GoodwillRequest,
  PayForDeleteNegotiation,
  InquiryRemoval,
  PaymentSchedule,
  CreditBuildingPlan,
  ReadinessAssessment,
  BuildingRecommendation,
  LetterGenerationRequest,
  LetterGenerationResponse,
  CreditRepairProgress,
  Milestone,
  StrategyRecommendation,
} from './types';

