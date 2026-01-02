/**
 * Mark Review as Helpful API
 *
 * POST /api/marketplace/reviews/[id]/helpful - Mark review as helpful
 */

import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/lib/marketplace';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review ID is required',
        },
        { status: 400 }
      );
    }

    const success = await reviewService.markHelpful(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to mark review as helpful',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review marked as helpful',
    });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark review as helpful',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
