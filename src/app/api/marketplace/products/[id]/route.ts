/**
 * Marketplace Product Detail API
 *
 * GET /api/marketplace/products/[id] - Get product by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { marketplaceService } from "@/lib/marketplace";
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
          error: "Product ID is required",
        },
        { status: 400 },
      );
    }

    const product = await marketplaceService.getProductById(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 },
      );
    }

    return rateLimit.withHeaders(
      NextResponse.json({
        success: true,
        data: product,
      }),
    );
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch product",
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
