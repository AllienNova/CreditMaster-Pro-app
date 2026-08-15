/**
 * Applying a what-if scenario to a stored tax profile.
 *
 * Shared by /api/tax/scenarios/calculate and /api/tax/scenarios/compare.
 * Compare is calculate run N times and ranked, so the mapping lives in one
 * place: two copies of "which field does additional401k land on" is two
 * chances to book a Roth conversion as a deduction in only one of them, and
 * the two endpoints would then disagree about the same scenario.
 */

import type { TaxProfile } from "@/lib/tax/types/tax-profile.types";

/** Shape the mobile client declares as TaxScenarioInput. */
export interface ScenarioInput {
  name?: string;
  grossIncome?: number;
  additional401k?: number;
  additionalIra?: number;
  additionalHsa?: number;
  additionalCharitable?: number;
  capitalGainsRealized?: number;
  rothConversion?: number;
}

export const SCENARIO_AMOUNT_FIELDS = [
  "grossIncome",
  "additional401k",
  "additionalIra",
  "additionalHsa",
  "additionalCharitable",
  "capitalGainsRealized",
  "rothConversion",
] as const;

/** First validation error in `scenario`, or null when it is usable. */
export function validateScenario(scenario: ScenarioInput): string | null {
  if (!scenario?.name || typeof scenario.name !== "string") {
    return "name is required";
  }
  for (const field of SCENARIO_AMOUNT_FIELDS) {
    const value = scenario[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return `${field} must be a non-negative number`;
    }
  }
  return null;
}

/**
 * `profile` with the scenario applied, as a COPY.
 *
 * Contributions ADD to what the user has already put in this year — replacing
 * would silently discard existing contributions and understate the benefit of
 * the action being modelled. A Roth conversion is ordinary INCOME in the
 * conversion year, not a deduction; booking it the other way would tell
 * someone a conversion saves tax in the year they owe most on it.
 */
export function applyScenario(
  profile: TaxProfile,
  scenario: ScenarioInput,
): TaxProfile {
  return {
    ...profile,
    grossIncome: scenario.grossIncome || profile.grossIncome,
    w2Income: scenario.grossIncome ? scenario.grossIncome : profile.w2Income,

    ytd401kContribution:
      profile.ytd401kContribution + (scenario.additional401k ?? 0),
    ytdIraContribution:
      profile.ytdIraContribution + (scenario.additionalIra ?? 0),
    ytdHsaContribution:
      profile.ytdHsaContribution + (scenario.additionalHsa ?? 0),
    charitableDonations:
      profile.charitableDonations + (scenario.additionalCharitable ?? 0),

    capitalGainsLongTerm:
      profile.capitalGainsLongTerm + (scenario.capitalGainsRealized ?? 0),

    otherIncome: profile.otherIncome + (scenario.rothConversion ?? 0),
  };
}
