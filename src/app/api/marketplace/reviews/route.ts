/**
 * Reviews API
 *
 * GET /api/marketplace/reviews - Get reviews for a product or provider
 * POST /api/marketplace/reviews - Create a new review (authenticated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { reviewService, type CreateReviewInput } from '@/lib/marketplace';
import { createClient } from '@supabase/supabase-js';

// Helper to get user from auth header
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const productId = searchParams.get('productId');
    const providerId = searchParams.get('providerId');
    const userId = searchParams.get('userId');

    // Must have at least one filter
    if (!productId && !providerId && !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide productId, providerId, or userId',
        },
        { status: 400 }
      );
    }

    let reviews: Awaited<
      ReturnType<typeof reviewService.getReviewsForProduct>
    > = [];
    let meta: Record<string, unknown> = {};

    if (productId) {
      reviews = await reviewService.getReviewsForProduct(productId);
      const avgRating = await reviewService.getAverageRating(productId);
      meta = { productId, averageRating: avgRating };
    } else if (providerId) {
      reviews = await reviewService.getReviewsForProvider(providerId);
      const avgRating = await reviewService.getAverageRating(
        undefined,
        providerId
      );
      meta = { providerId, averageRating: avgRating };
    } else if (userId) {
      reviews = await reviewService.getUserReviews(userId);
      meta = { userId };
    }

    return NextResponse.json({
      success: true,
      data: reviews,
      meta: {
        count: reviews?.length || 0,
        ...meta,
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reviews',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const { productId, providerId, rating, title, content } = body;

    if (!productId && !providerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide productId or providerId',
        },
        { status: 400 }
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rating must be a number between 1 and 5',
        },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review content must be at least 10 characters',
        },
        { status: 400 }
      );
    }

    const input: CreateReviewInput = {
      productId,
      providerId,
      rating,
      title: title?.trim(),
      content: content.trim(),
    };

    const review = await reviewService.createReview(user.id, input);

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create review',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create review',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
