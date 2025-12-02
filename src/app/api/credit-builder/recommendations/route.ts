import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { creditBuilderService } from '@/lib/credit-builder/credit-builder-service';

/**
 * GET /api/credit-builder/recommendations
 *
 * Returns AI-powered personalized recommendations for credit building
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

    const recommendations = await creditBuilderService.getRecommendedActions(user.id);

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
