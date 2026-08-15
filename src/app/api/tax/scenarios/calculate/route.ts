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
import {
  applyScenario,
  validateScenario,
  type ScenarioInput,
} from "@/lib/tax/scenario";

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

  const invalid = validateScenario(scenario);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
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

    // A COPY. The scenario must not leak into anything else holding this
    // profile reference, and it is never persisted.
    const hypothetical = applyScenario(profile, scenario);

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
