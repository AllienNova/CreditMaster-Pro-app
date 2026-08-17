/**
 * Dispute Strategies API
 * GET /api/disputes/strategies - Get available dispute strategies
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { ALL_ADVANCED_STRATEGIES } from "@/lib/disputes/advanced-strategies";
import { toDisputeStrategyDTO } from "@/lib/disputes/strategy-dto";

/**
 * The inline DISPUTE_STRATEGIES array that used to live here is gone.
 *
 * It was a SECOND catalogue of seven strategies whose ids did not overlap the
 * library's by even one entry, so /api/disputes/recommend-strategy could return
 * `debt_validation` while this list only ever offered `validation_request`. The
 * library wins: it is already used by /disputes/generate and
 * /disputes/recommend-strategy, and it carries riskLevel, which the client's
 * DisputeStrategy type requires and the inline copy did not have.
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");

    const all = ALL_ADVANCED_STRATEGIES.map(toDisputeStrategyDTO);
    const strategies = difficulty
      ? all.filter((s) => s.difficulty === difficulty)
      : all;

    return NextResponse.json({
      success: true,
      data: { strategies },
    });
  } catch (error) {
    console.error("Get dispute strategies error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get strategies" },
      { status: 500 },
    );
  }
});
