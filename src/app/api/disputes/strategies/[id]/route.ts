/**
 * A single dispute strategy.
 *
 * mobile-app/src/services/api/disputes.ts:296 has always called
 * `/disputes/strategies/${strategyId}` and no route existed, so tapping a
 * strategy in the list showed nothing. The gate reported it as
 * `/disputes/strategies/ ` — a detail call resolving against no route, which is
 * deliberately NOT satisfied by the `/disputes/strategies` collection.
 *
 * Serves the same catalogue as the collection and as
 * /api/disputes/recommend-strategy, via getStrategyById(). Before this, those
 * three surfaces did not agree on which strategies exist — see
 * @/lib/disputes/strategy-dto for what that cost.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { getStrategyById } from "@/lib/disputes/advanced-strategies";
import { toDisputeStrategyDTO } from "@/lib/disputes/strategy-dto";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // withAuth does not forward Next's route params; the id is the last segment.
    const id = request.nextUrl.pathname.split("/").pop() ?? "";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Strategy id required" },
        { status: 400 },
      );
    }

    const strategy = getStrategyById(id);
    if (!strategy) {
      // A 404 naming the id, because the most likely cause is a caller holding
      // an id from the catalogue this route replaced.
      return NextResponse.json(
        { success: false, error: `No strategy with id "${id}"` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { strategy: toDisputeStrategyDTO(strategy) },
    });
  } catch (error) {
    console.error("Get dispute strategy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get strategy" },
      { status: 500 },
    );
  }
});
