/**
 * Marketplace Products API
 *
 * GET /api/marketplace/products - Get products with filters
 * POST /api/marketplace/products - Create a new product (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { marketplaceService, type ProductFilters } from "@/lib/marketplace";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const filters: ProductFilters = {};

    const category = searchParams.get("category");
    if (category) filters.category = category;

    const minPrice = searchParams.get("minPrice");
    if (minPrice) filters.minPrice = parseFloat(minPrice);

    const maxPrice = searchParams.get("maxPrice");
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

    const minRating = searchParams.get("minRating");
    if (minRating) filters.minRating = parseFloat(minRating);

    const providerId = searchParams.get("providerId");
    if (providerId) filters.providerId = providerId;

    const search = searchParams.get("search");
    if (search) filters.search = search;

    // Check if featured products requested
    const featured = searchParams.get("featured");
    if (featured === "true") {
      const limit = parseInt(searchParams.get("limit") || "6");
      const products = await marketplaceService.getFeaturedProducts(limit);
      return NextResponse.json({
        success: true,
        data: products,
        meta: {
          count: products.length,
          featured: true,
        },
      });
    }

    // Get filtered products
    const products = await marketplaceService.getProducts(
      Object.keys(filters).length > 0 ? filters : undefined,
    );

    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        count: products.length,
        filters,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, return not implemented
    // In production, this would require admin authentication
    return NextResponse.json(
      {
        success: false,
        error: "Product creation not implemented",
        message: "Contact admin to add products",
      },
      { status: 501 },
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create product",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
