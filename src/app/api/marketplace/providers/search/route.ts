/**
 * Provider Search API
 *
 * GET /api/marketplace/providers/search?q=query - Search providers
 */

import { NextRequest, NextResponse } from "next/server";
import { providerService } from "@/lib/marketplace";
import {
  enforcePublicCatalogRateLimit,
  methodNotAllowed,
} from "@/lib/api/public-route-guard";

export async function GET(request: NextRequest) {
  const rateLimit = await enforcePublicCatalogRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("query");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Search query must be at least 2 characters",
        },
        { status: 400 },
      );
    }

    const providers = await providerService.searchProviders(query.trim());

    return rateLimit.withHeaders(
      NextResponse.json({
        success: true,
        data: providers,
        meta: {
          count: providers.length,
          query: query.trim(),
        },
      }),
    );
  } catch (error) {
    console.error("Error searching providers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search providers",
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
