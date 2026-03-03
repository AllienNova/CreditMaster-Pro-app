/**
 * Tax Services Index
 *
 * Central export for all tax optimization services.
 */

export {
  TaxBracketCalculator,
  taxBracketCalculator,
} from "./TaxBracketCalculator";
export type { TaxCalculationResult } from "./TaxBracketCalculator";

export {
  RetirementAccountOptimizer,
  retirementAccountOptimizer,
} from "./RetirementAccountOptimizer";
export type {
  ContributionRecommendation,
  RetirementOptimizationResult,
  BracketOptimizationResult,
  RetirementReadinessProjection,
} from "./RetirementAccountOptimizer";

export {
  TaxOptimizationEngine,
  taxOptimizationEngine,
} from "./TaxOptimizationEngine";
export type {
  QuarterlyEstimate,
  SafeHarborResult,
  UnderpaymentPenalty,
  PaymentScheduleEntry,
} from "./TaxOptimizationEngine";

export { StateTaxEngine, stateTaxEngine, TOP_20_STATES } from "./StateTaxEngine";
export type {
  StateFilingStatus,
  StateIncomeAllocation,
  AllocationMethod,
  SingleStateTaxResult,
  BracketDetail,
  StateCreditResult,
  MultiStateTaxResult,
  FilingRecommendation,
  Top20StateCode,
} from "./StateTaxEngine";
