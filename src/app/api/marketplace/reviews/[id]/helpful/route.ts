/**
 * Mark Review as Helpful API
 *
 * POST /api/marketplace/reviews/[id]/helpful - Mark review as helpful
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { reviewService } from "@/lib/marketplace";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // The guard does not forward Next's route `params`; the path ends in
    // /reviews/[id]/helpful, so the id is the second-to-last segment.
    const segments = request.nextUrl.pathname.split("/");
    const id = segments[segments.length - 2];

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Review ID is required",
        },
        { status: 400 },
      );
    }

    const success = await reviewService.markHelpful(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to mark review as helpful",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Review marked as helpful",
    });
  } catch (error) {
    console.error("Error marking review as helpful:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to mark review as helpful",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
