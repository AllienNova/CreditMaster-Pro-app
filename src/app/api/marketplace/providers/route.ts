/**
 * Providers API
 *
 * GET /api/marketplace/providers - Get providers with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { providerService, type ProviderFilters } from '@/lib/marketplace';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const filters: ProviderFilters = {};

    const category = searchParams.get('category');
    if (category) filters.category = category;

    const minRating = searchParams.get('minRating');
    if (minRating) filters.minRating = parseFloat(minRating);

    const verified = searchParams.get('verified');
    if (verified !== null) filters.verified = verified !== 'false';

    const search = searchParams.get('search');
    if (search) filters.search = search;

    // Check for special queries
    const top = searchParams.get('top');
    if (top === 'true') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const providers = await providerService.getTopProviders(limit);
      return NextResponse.json({
        success: true,
        data: providers,
        meta: {
          count: providers.length,
          top: true,
        },
      });
    }

    // Get by category
    if (category && !search && minRating === null && verified === null) {
      const providers = await providerService.getProvidersByCategory(category);
      return NextResponse.json({
        success: true,
        data: providers,
        meta: {
          count: providers.length,
          category,
        },
      });
    }

    // Get filtered providers
    const providers = await providerService.getProviders(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json({
      success: true,
      data: providers,
      meta: {
        count: providers.length,
        filters,
      },
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch providers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
