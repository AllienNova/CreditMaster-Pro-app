/**
 * Law Applicability Checker
 *
 * Determines which of the 30 laws apply to a given signal context.
 * Not all laws apply to every signal -- e.g., exit laws don't apply to entries.
 */

import type {
  ComplianceContext,
  LawDefinition,
  LawId,
} from "./compliance-types";
import { TRADING_LAWS } from "./law-definitions";

export interface ApplicabilityResult {
  applicableLaws: LawId[];
  skippedLaws: Array<{ lawId: LawId; reason: string }>;
  totalApplicable: number;
  totalSkipped: number;
}

/**
 * Determine which laws apply to the given context.
 */
export function checkApplicability(
  context: ComplianceContext,
): ApplicabilityResult {
  const applicableLaws: LawId[] = [];
  const skippedLaws: Array<{ lawId: LawId; reason: string }> = [];

  for (const [lawId, law] of Object.entries(TRADING_LAWS) as [
    LawId,
    LawDefinition,
  ][]) {
    // Check signal type applicability
    if (law.applicableTo !== "all") {
      if (!law.applicableTo.includes(context.signalType)) {
        skippedLaws.push({
          lawId,
          reason: `Not applicable to ${context.signalType} signals`,
        });
        continue;
      }
    }

    // Check operating mode applicability
    if (law.applicableModes !== "all") {
      if (!law.applicableModes.includes(context.operatingMode)) {
        skippedLaws.push({
          lawId,
          reason: `Not applicable in ${context.operatingMode} mode`,
        });
        continue;
      }
    }

    // Additional context-dependent applicability checks
    if (hasInsufficientData(lawId, context)) {
      skippedLaws.push({
        lawId,
        reason: "Insufficient data to evaluate",
      });
      continue;
    }

    applicableLaws.push(lawId);
  }

  return {
    applicableLaws,
    skippedLaws,
    totalApplicable: applicableLaws.length,
    totalSkipped: skippedLaws.length,
  };
}

/** Check if we have enough data to evaluate a specific law */
function hasInsufficientData(
  lawId: LawId,
  context: ComplianceContext,
): boolean {
  switch (lawId) {
    case "LAW-07": // ATR-Based Sizing
      return context.atr === undefined;
    case "LAW-08": // Risk/Reward Minimum
      return context.riskRewardRatio === undefined;
    case "LAW-10": // Concentration Limit
    case "LAW-05": // Portfolio Heat
      return (
        context.portfolioValue === undefined ||
        context.positionSize === undefined
      );
    case "LAW-13": // Volume Confirmation
      return context.relativeVolume === undefined;
    case "LAW-25": // Sector Diversification
      return (
        context.sector === undefined ||
        context.existingSectors === undefined
      );
    case "LAW-26": // Correlation Check
      return context.portfolioCorrelation === undefined;
    case "LAW-28": // Cooldown Period
      return context.daysSinceLastTrade === undefined;
    default:
      return false;
  }
}
