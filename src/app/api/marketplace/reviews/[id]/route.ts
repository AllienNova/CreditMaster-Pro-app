/**
 * Review Detail API
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

    // Check if this is a helpful action
    const url = new URL(request.url);
    if (url.pathname.endsWith('/helpful')) {
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
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unknown action',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing review action:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process review action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
