/**
 * Tradeline Detail API
 *
 * GET /api/marketplace/tradelines/[id] - Get tradeline by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { tradelineService } from "@/lib/marketplace";
import {
  enforcePublicCatalogRateLimit,
  methodNotAllowed,
} from "@/lib/api/public-route-guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimit = await enforcePublicCatalogRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Tradeline ID is required",
        },
        { status: 400 },
      );
    }

    const tradeline = await tradelineService.getTradelineById(id);

    if (!tradeline) {
      return NextResponse.json(
        {
          success: false,
          error: "Tradeline not found",
        },
        { status: 404 },
      );
    }

    return rateLimit.withHeaders(
      NextResponse.json({
        success: true,
        data: {
          ...tradeline,
          valueScore: tradelineService.calculateValueScore(tradeline),
        },
      }),
    );
  } catch (error) {
    console.error("Error fetching tradeline:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tradeline",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
