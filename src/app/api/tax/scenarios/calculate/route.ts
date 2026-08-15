/**
 * Tax Scenario Calculator API
 *
 * POST /api/tax/scenarios/calculate
 * Answers "what if I contributed / converted / realised X?" by applying the
 * scenario to the CALLER'S OWN stored profile and re-running
 * TaxBracketCalculator.
 *
 * The scenario is hypothetical: the stored profile is never written to, and
 * never mutated in memory either.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import { TaxBracketCalculator } from "@/lib/tax/services/TaxBracketCalculator";
import { fetchTaxProfile } from "@/lib/tax/tax-profile-repository";
import type { TaxProfile } from "@/lib/tax/types/tax-profile.types";

/** Shape the mobile client declares as TaxScenarioInput. */
interface ScenarioInput {
  name?: string;
  grossIncome?: number;
  additional401k?: number;
  additionalIra?: number;
  additionalHsa?: number;
  additionalCharitable?: number;
  capitalGainsRealized?: number;
  rothConversion?: number;
}

const ADJUSTMENTS = [
  "grossIncome",
  "additional401k",
  "additionalIra",
  "additionalHsa",
  "additionalCharitable",
  "capitalGainsRealized",
  "rothConversion",
] as const;

/** Reject anything that is present but not a non-negative finite number. */
function invalidAmount(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  return typeof value !== "number" || !Number.isFinite(value) || value < 0;
}

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  let scenario: ScenarioInput;
  try {
    scenario = (await request.json()) as ScenarioInput;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  if (!scenario?.name || typeof scenario.name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }
  for (const field of ADJUSTMENTS) {
    if (invalidAmount(scenario[field])) {
      return NextResponse.json(
        { error: `${field} must be a non-negative number` },
        { status: 400 },
      );
    }
  }

  try {
    const supabase = await createClient();
    const taxYear = new Date().getFullYear();
    const profile = await fetchTaxProfile(supabase, user.id, taxYear);

    if (!profile) {
      // 409 rather than an empty result: a scenario needs a baseline, and
      // computing one from a default income would produce a specific,
      // confident number about someone else's finances.
      return NextResponse.json(
        {
          error:
            "No tax profile found. Create a tax profile before running scenarios.",
        },
        { status: 409 },
      );
    }

    const grossIncome = scenario.grossIncome || profile.grossIncome;

    // A COPY. The scenario must not leak into anything else holding this
    // profile reference, and it is never persisted.
    const hypothetical: TaxProfile = {
      ...profile,
      grossIncome,
      w2Income: scenario.grossIncome ? scenario.grossIncome : profile.w2Income,

      // Contributions ADD to what the user has already put in this year.
      // Replacing would silently discard existing contributions and understate
      // the scenario's benefit.
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

      // A Roth conversion is ordinary INCOME in the year it happens. Treating
      // it as a deduction would invert the answer and tell someone a
      // conversion saves tax in the year they owe most on it.
      otherIncome: profile.otherIncome + (scenario.rothConversion ?? 0),
    };

    const calculator = new TaxBracketCalculator(taxYear);
    const result = calculator.calculateTaxes(hypothetical);

    return NextResponse.json({
      success: true,
      data: {
        name: scenario.name,
        taxableIncome: result.taxableIncome,
        federalTax: result.federalTax,
        stateTax: result.stateTax,
        totalTax: result.totalTax,
        effectiveRate: result.effectiveRate,
        marginalRate: result.marginalRate,
        takeHomePay: result.takeHomePay,
      },
    });
  } catch (error) {
    console.error("Tax scenario calculation failed:", error);
    return NextResponse.json(
      { error: "Failed to calculate tax scenario" },
      { status: 500 },
    );
  }
});
