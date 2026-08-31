/**
 * Tax Scenario Comparison API
 *
 * POST /api/tax/scenarios/compare
 * Runs several what-ifs against the caller's stored profile and names the one
 * with the lowest total tax.
 *
 * Shares the scenario mapping with /calculate via @/lib/tax/scenario, so the
 * two endpoints cannot disagree about what `rothConversion` means.
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

/**
 * Ceiling on scenarios per request.
 *
 * Each one is a full tax computation, so an unbounded array turns a single
 * authenticated request into arbitrary server work.
 */
const MAX_SCENARIOS = 20;

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  let body: { scenarios?: ScenarioInput[] };
  try {
    body = (await request.json()) as { scenarios?: ScenarioInput[] };
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const scenarios = body?.scenarios;
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return NextResponse.json(
      { error: "scenarios must be a non-empty array" },
      { status: 400 },
    );
  }
  if (scenarios.length > MAX_SCENARIOS) {
    return NextResponse.json(
      { error: `At most ${MAX_SCENARIOS} scenarios may be compared at once` },
      { status: 400 },
    );
  }

  // Validate ALL of them before computing any. Silently dropping an invalid
  // entry would compare a different set than the user asked about and still
  // present the winner as "best".
  for (const [index, scenario] of scenarios.entries()) {
    const invalid = validateScenario(scenario);
    if (invalid) {
      return NextResponse.json(
        { error: `scenarios[${index}]: ${invalid}` },
        { status: 400 },
      );
    }
  }

  try {
    const supabase = await createClient();
    const taxYear = new Date().getFullYear();
    const profile = await fetchTaxProfile(user.id, taxYear);

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "No tax profile found. Create a tax profile before comparing scenarios.",
        },
        { status: 409 },
      );
    }

    const calculator = new TaxBracketCalculator(taxYear);

    // Each scenario starts from the STORED profile, never from the previous
    // scenario's output. Compounding them would rank a modest option as the
    // best available by crediting it with every earlier change too.
    const results = scenarios.map((scenario) => {
      const outcome = calculator.calculateTaxes(applyScenario(profile, scenario));
      return {
        name: scenario.name as string,
        taxableIncome: outcome.taxableIncome,
        federalTax: outcome.federalTax,
        stateTax: outcome.stateTax,
        totalTax: outcome.totalTax,
        effectiveRate: outcome.effectiveRate,
        marginalRate: outcome.marginalRate,
        takeHomePay: outcome.takeHomePay,
      };
    });

    // Strict `<` keeps the FIRST of equally good scenarios, so a tie resolves
    // the same way on every identical request rather than by iteration
    // accident.
    const best = results.reduce((lowest, candidate) =>
      candidate.totalTax < lowest.totalTax ? candidate : lowest,
    );

    return NextResponse.json({
      success: true,
      data: { results, bestScenario: best.name },
    });
  } catch (error) {
    console.error("Tax scenario comparison failed:", error);
    return NextResponse.json(
      { error: "Failed to compare tax scenarios" },
      { status: 500 },
    );
  }
});
