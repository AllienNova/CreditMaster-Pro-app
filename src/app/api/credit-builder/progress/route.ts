import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { creditBuilderService } from '@/lib/credit-builder/credit-builder-service';

/**
 * GET /api/credit-builder/progress
 *
 * Returns user's credit building progress and milestones
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const progress = await creditBuilderService.getProgress(user.id);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Error fetching credit builder progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
