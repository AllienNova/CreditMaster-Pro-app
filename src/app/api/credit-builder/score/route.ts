import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";

/**
 * GET /api/credit-builder/score
 *
 * Returns user's credit builder score and category breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const score = await creditBuilderService.calculateCreditBuilderScore(
      user.id,
    );

    return NextResponse.json({
      success: true,
      score,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch score" },
      { status: 500 },
    );
  }
}
