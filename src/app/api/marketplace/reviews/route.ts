/**
 * Reviews API
 *
 * GET /api/marketplace/reviews - Get reviews for a product or provider
 * POST /api/marketplace/reviews - Create a new review (authenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { reviewService, type CreateReviewInput } from "@/lib/marketplace";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    const productId = searchParams.get("productId");
    const providerId = searchParams.get("providerId");
    const userId = searchParams.get("userId");

    // Must have at least one filter
    if (!productId && !providerId && !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Must provide productId, providerId, or userId",
        },
        { status: 400 },
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
        providerId,
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
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reviews",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    // Validate input
    const { productId, providerId, rating, title, content } = body;

    if (!productId && !providerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Must provide productId or providerId",
        },
        { status: 400 },
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Rating must be a number between 1 and 5",
        },
        { status: 400 },
      );
    }

    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Review content must be at least 10 characters",
        },
        { status: 400 },
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
          error: "Failed to create review",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: review,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create review",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
