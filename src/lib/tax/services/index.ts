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
