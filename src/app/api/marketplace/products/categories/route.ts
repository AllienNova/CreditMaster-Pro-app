/**
 * Marketplace Categories API
 *
 * GET /api/marketplace/products/categories - Get all product categories
 */

import { NextRequest, NextResponse } from "next/server";
import { marketplaceService } from "@/lib/marketplace";
import {
  enforcePublicCatalogRateLimit,
  methodNotAllowed,
} from "@/lib/api/public-route-guard";

export async function GET(request: NextRequest) {
  const rateLimit = await enforcePublicCatalogRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const categories = await marketplaceService.getCategories();

    return rateLimit.withHeaders(
      NextResponse.json({
        success: true,
        data: categories,
        meta: {
          count: categories.length,
        },
      }),
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch categories",
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
