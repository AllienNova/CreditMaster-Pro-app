/**
 * 30-Law Compliance Engine
 *
 * Barrel exports for the trading compliance module.
 */

// Types
export type {
  LawId,
  LawCategory,
  ViolationSeverity,
  LawDefinition,
  LawScore,
  ComplianceViolation,
  ComplianceContext,
  ComplianceResult,
  StoredComplianceScore,
} from "./compliance-types";

export {
  LAW_PASS_THRESHOLD,
  MIN_COMPOSITE_SCORE,
  MIN_AUTONOMOUS_SCORE,
} from "./compliance-types";

// Law definitions
export {
  TRADING_LAWS,
  TRADING_LAWS_LIST,
  LAWS_BY_CATEGORY,
  ALL_LAW_IDS,
} from "./law-definitions";

// Applicability checker
export { checkApplicability } from "./law-applicability";
export type { ApplicabilityResult } from "./law-applicability";

// Scorer
export {
  ComplianceScorer,
  createComplianceScorer,
  resetComplianceScorer,
} from "./compliance-scorer";
