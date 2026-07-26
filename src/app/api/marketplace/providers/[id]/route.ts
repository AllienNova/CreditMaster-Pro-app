/**
 * Provider Detail API
 *
 * GET /api/marketplace/providers/[id] - Get provider by ID
 */

import { NextRequest, NextResponse } from "next/server";
import {
  providerService,
  tradelineService,
  reviewService,
} from "@/lib/marketplace";
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
          error: "Provider ID is required",
        },
        { status: 400 },
      );
    }

    const provider = await providerService.getProviderById(id);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: "Provider not found",
        },
        { status: 404 },
      );
    }

    // Check if client wants extended data
    const searchParams = request.nextUrl.searchParams;
    const includeProducts = searchParams.get("includeProducts") === "true";
    const includeReviews = searchParams.get("includeReviews") === "true";

    const response: Record<string, unknown> = {
      success: true,
      data: provider,
    };

    // Include tradelines/products if requested
    if (includeProducts && provider.category === "tradeline") {
      const tradelines = await tradelineService.getTradelinesByProvider(id);
      response.tradelines = tradelines;
    }

    // Include reviews if requested. This is a PUBLIC route, so reviews are
    // projected through getPublicReviewsForProvider — the reviewer's internal
    // userId is stripped to prevent deanonymisation (see review-service.ts).
    if (includeReviews) {
      const reviews = await reviewService.getPublicReviewsForProvider(id);
      response.reviews = reviews;
    }

    return rateLimit.withHeaders(NextResponse.json(response));
  } catch (error) {
    console.error("Error fetching provider:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch provider",
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
