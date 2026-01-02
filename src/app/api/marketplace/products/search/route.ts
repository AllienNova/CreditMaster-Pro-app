/**
 * Marketplace Product Search API
 *
 * GET /api/marketplace/products/search?q=query - Search products
 */

import { NextRequest, NextResponse } from 'next/server';
import { marketplaceService } from '@/lib/marketplace';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    const products = await marketplaceService.searchProducts(query.trim());

    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        count: products.length,
        query: query.trim(),
      },
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search products',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
