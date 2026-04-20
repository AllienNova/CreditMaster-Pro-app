/**
 * Matching Module
 *
 * Intelligent product matching for financial products.
 */

export {
  creditCardMatcher,
  default as creditCardMatcherDefault,
} from "./credit-card-matcher";
export type {
  SpendingProfile,
  CardPreferences,
  CardRecommendation,
  MatcherInput,
} from "./credit-card-matcher";

export { calculatePreApprovalOdds } from "./pre-approval-calculator";
export type {
  PreApprovalInput,
  PreApprovalOdds,
  PreApprovalFactor,
} from "./pre-approval-calculator";
