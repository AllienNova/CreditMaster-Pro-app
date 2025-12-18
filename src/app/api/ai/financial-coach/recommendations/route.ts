/**
 * AI Financial Coach - Recommendations API
 * 
 * GET /api/ai/financial-coach/recommendations - Get personalized recommendations
 * POST /api/ai/financial-coach/recommendations - Generate new recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { recommendationEngine } from '@/lib/financial/recommendation-engine';
import { RecommendationType } from '@/lib/financial/types/ai-coach.types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const types = searchParams.get('types')?.split(',') as RecommendationType[] | undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeAI = searchParams.get('includeAI') !== 'false';

    const result = await recommendationEngine.generateRecommendations({
      userId: user.id,
      types,
      limit,
      includeAI,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { types, limit = 10, includeAI = true, focusArea } = body;

    const result = await recommendationEngine.generateRecommendations({
      userId: user.id,
      types,
      limit,
      includeAI,
      focusArea,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

