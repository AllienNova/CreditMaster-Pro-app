/**
 * AI Financial Coach - Recommendations API
 *
 * GET /api/ai/financial-coach/recommendations - Get personalized recommendations
 * POST /api/ai/financial-coach/recommendations - Generate new recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recommendationEngine } from '@/lib/financial/recommendation-engine';
import { RecommendationType } from '@/lib/financial/types/ai-coach.types';

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const types = searchParams.get('types')?.split(',') as
      | RecommendationType[]
      | undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeAI = searchParams.get('includeAI') !== 'false';

    const result = await recommendationEngine.generateRecommendations({
      userId: user.id,
      types,
      limit,
      includeAI,
    });

    return NextResponse.json(result);
  } catch (_error) {
    // RecommendationsRoute error: Failed to fetch
    void _error;
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
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
  } catch (_error) {
    // RecommendationsRoute error: Generation failed
    void _error;
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
