/**
 * AI Financial Coach - Recommendations API
 *
 * GET /api/ai/financial-coach/recommendations - Get personalized recommendations
 * POST /api/ai/financial-coach/recommendations - Generate new recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { recommendationEngine } from "@/lib/financial/recommendation-engine";
import { RecommendationType } from "@/lib/financial/types/ai-coach.types";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const types = searchParams.get("types")?.split(",") as
      | RecommendationType[]
      | undefined;
    const limit = parseInt(searchParams.get("limit") || "10");
    const includeAI = searchParams.get("includeAI") !== "false";

    const result = await recommendationEngine.generateRecommendations({
      userId: user.id,
      types,
      limit,
      includeAI,
    });

    return NextResponse.json(result);
  } catch (_error) {
    // RecommendationsRoute error: Failed to fetch
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { types, limit = 10, includeAI = true, focusArea } = body;

    const result = await recommendationEngine.generateRecommendations({
      userId: user.id,
      types,
      limit,
      includeAI,
      focusArea,
    });

    return NextResponse.json(result);
  } catch (_error) {
    // RecommendationsRoute error: Generation failed
    void _error;
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }
});
