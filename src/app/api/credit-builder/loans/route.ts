import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { creditBuilderService } from '@/lib/credit-builder/credit-builder-service';

/**
 * GET /api/credit-builder/loans
 *
 * Returns recommended credit builder loans based on user's profile
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

    const loans = await creditBuilderService.getCreditBuilderLoans(user.id);

    return NextResponse.json({
      success: true,
      loans,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}
