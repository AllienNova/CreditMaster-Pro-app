/**
 * Tradelines API
 *
 * GET /api/marketplace/tradelines - Get tradelines with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { tradelineService, type TradelineFilters } from "@/lib/marketplace";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const filters: TradelineFilters = {};

    const minCreditLimit = searchParams.get("minCreditLimit");
    if (minCreditLimit) filters.minCreditLimit = parseInt(minCreditLimit);

    const maxCreditLimit = searchParams.get("maxCreditLimit");
    if (maxCreditLimit) filters.maxCreditLimit = parseInt(maxCreditLimit);

    const minAge = searchParams.get("minAge");
    if (minAge) filters.minAge = parseInt(minAge);

    const maxPrice = searchParams.get("maxPrice");
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

    const minScoreImpact = searchParams.get("minScoreImpact");
    if (minScoreImpact) filters.minScoreImpact = parseInt(minScoreImpact);

    const bureaus = searchParams.get("bureaus");
    if (bureaus) filters.bureaus = bureaus.split(",");

    const available = searchParams.get("available");
    if (available !== null) filters.available = available !== "false";

    // Check for special queries
    const top = searchParams.get("top");
    if (top === "true") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const tradelines = await tradelineService.getTopTradelines(limit);
      return NextResponse.json({
        success: true,
        data: tradelines.map((t) => ({
          ...t,
          valueScore: tradelineService.calculateValueScore(t),
        })),
        meta: {
          count: tradelines.length,
          top: true,
        },
      });
    }

    const providerId = searchParams.get("providerId");
    if (providerId) {
      const tradelines =
        await tradelineService.getTradelinesByProvider(providerId);
      return NextResponse.json({
        success: true,
        data: tradelines.map((t) => ({
          ...t,
          valueScore: tradelineService.calculateValueScore(t),
        })),
        meta: {
          count: tradelines.length,
          providerId,
        },
      });
    }

    // Get filtered tradelines
    const tradelines = await tradelineService.getTradelines(
      Object.keys(filters).length > 0 ? filters : { available: true },
    );

    return NextResponse.json({
      success: true,
      data: tradelines.map((t) => ({
        ...t,
        valueScore: tradelineService.calculateValueScore(t),
      })),
      meta: {
        count: tradelines.length,
        filters,
      },
    });
  } catch (error) {
    console.error("Error fetching tradelines:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tradelines",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
