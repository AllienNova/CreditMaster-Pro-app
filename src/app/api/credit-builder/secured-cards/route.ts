import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { creditBuilderService } from '@/lib/credit-builder/credit-builder-service';

/**
 * GET /api/credit-builder/secured-cards
 *
 * Returns recommended secured credit cards based on user's profile
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

    const cards = await creditBuilderService.getSecuredCards(user.id);

    return NextResponse.json({
      success: true,
      cards,
    });
  } catch (error) {
    console.error('Error fetching secured cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch secured cards' },
      { status: 500 }
    );
  }
}
