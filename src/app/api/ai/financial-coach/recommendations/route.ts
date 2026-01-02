/**
 * AI Financial Coach - Recommendations API
 *
 * GET /api/ai/financial-coach/recommendations - Get personalized recommendations
 * POST /api/ai/financial-coach/recommendations - Generate new recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { recommendationEngine } from '@/lib/financial/recommendation-engine';
import { RecommendationType } from '@/lib/financial/types/ai-coach.types';

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
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
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
