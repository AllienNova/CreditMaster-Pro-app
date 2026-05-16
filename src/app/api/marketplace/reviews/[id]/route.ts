/**
 * Review Detail API
 *
 * POST /api/marketplace/reviews/[id] - Mark review as helpful
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { reviewService } from "@/lib/marketplace";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // The guard does not forward Next's route `params`; extract the id from
    // the path (the last segment, or the segment before /helpful).
    const segments = request.nextUrl.pathname.split("/");
    const last = segments[segments.length - 1];
    const id = last === "helpful" ? segments[segments.length - 2] : last;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Review ID is required",
        },
        { status: 400 },
      );
    }

    // Check if this is a helpful action
    if (request.nextUrl.pathname.endsWith("/helpful")) {
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
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown action",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error processing review action:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process review action",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
