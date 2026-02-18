/**
 * Marketplace Categories API
 *
 * GET /api/marketplace/products/categories - Get all product categories
 */

import { NextRequest, NextResponse } from "next/server";
import { marketplaceService } from "@/lib/marketplace";

export async function GET(request: NextRequest) {
  try {
    const categories = await marketplaceService.getCategories();

    return NextResponse.json({
      success: true,
      data: categories,
      meta: {
        count: categories.length,
      },
    });
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
