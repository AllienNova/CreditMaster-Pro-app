/**
 * Recommend dispute strategies for a scenario.
 *
 * WHY IT DID NOT EXIST. mobile-app/src/services/api/disputes.ts:254 has always
 * POSTed here and there was no route, so the call fell through to
 * /api/disputes/[id] with id="recommend-strategy" — a route exporting GET,
 * PATCH and DELETE. Next.js answered 405. Sixth instance of that
 * misnamed-sub-resource shape, all of them found by the verb check.
 *
 * recommendStrategy() in @/lib/disputes/advanced-strategies has been there the
 * whole time and is already used by /api/disputes/generate.
 *
 * WHAT `confidence` ACTUALLY IS, and why this matters. The mobile type
 * (StrategyRecommendation) calls the field `confidence`, but the only number
 * available is AdvancedStrategy.successRate — the strategy's DOCUMENTED general
 * success rate, not a probability computed for this user's scenario. Nothing in
 * this codebase computes the latter. So the field carries the success rate, the
 * response says so in `confidenceBasis`, and the reasoning text states the
 * strategy's stated applicability rather than pretending to a personalised
 * explanation. Presenting a generic rate as "we are 78% confident this will work
 * for you" would be a fabricated claim about someone's credit dispute.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { recommendStrategy } from "@/lib/disputes/advanced-strategies";

/**
 * The client sends disputeType plus optional scenario flags
 * (disputes.ts:246-253). recommendStrategy() requires all six, so the optional
 * ones take the conservative default: no prior attempts, no evidence, not a
 * collection, no existing relationship. Those defaults only ever REMOVE
 * strategies from the result — every branch in the recommender is additive — so
 * an omitted flag can never invent a recommendation the scenario did not earn.
 */
const ScenarioSchema = z.object({
  disputeType: z.string().trim().min(1).max(64),
  previousAttempts: z.number().int().min(0).max(50).default(0),
  hasEvidence: z.boolean().default(false),
  accountAge: z.number().int().min(0).max(1200).default(0),
  isCollection: z.boolean().default(false),
  hasRelationship: z.boolean().default(false),
});

export const POST = withAuth(async (request: NextRequest, _user: AuthedUser) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Validation error", message: "Body must be valid JSON" },
        { status: 400 },
      );
    }

    const parsed = ScenarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: parsed.error.issues[0]?.message ?? "Invalid scenario",
        },
        { status: 400 },
      );
    }

    const strategies = recommendStrategy(parsed.data);

    return NextResponse.json(
      {
        recommendations: strategies.map((s) => ({
          strategyId: s.id,
          name: s.name,
          // The strategy's documented success rate — see the header. Not a
          // per-user probability, and labelled as such below.
          confidence: s.successRate,
          reasoning: s.whenToUse.length
            ? `Suggested for: ${s.whenToUse.join("; ")}.`
            : s.description,
        })),
        confidenceBasis:
          "`confidence` is each strategy's documented general success rate, not a probability calculated for your scenario.",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    // No fallback list. Guessing at dispute strategy for someone's credit file
    // is worse than telling them we could not produce one.
    console.error("Recommend dispute strategy API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Could not produce strategy recommendations",
      },
      { status: 500 },
    );
  }
});
