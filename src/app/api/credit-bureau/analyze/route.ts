/**
 * Credit Bureau Analysis API
 *
 * POST /api/credit-bureau/analyze - Analyze credit report and provide recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { CreditBureauService } from "@/lib/credit-bureau/credit-bureau-service";
import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();

export const POST = withPermission(
  "credit:analyze",
  async (request: NextRequest, user: AuthedUser) => {
    try {
    // 3. Parse request body
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 },
      );
    }

    // 4. Get credit report from database
    const { data: creditReport, error: dbError } = await supabase
      .from("credit_reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (dbError || !creditReport) {
      return NextResponse.json(
        { error: "Credit report not found" },
        { status: 404 },
      );
    }

    // 5. Analyze credit report
    const analysis =
      await CreditBureauService.analyzeCreditReport(creditReport);

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: analysis,
    });
    } catch (_error) {
      // Error logged
      return NextResponse.json(
        {
          success: false,
          error:
            _error instanceof Error
              ? _error.message
              : "Failed to analyze credit report",
        },
        { status: 500 },
      );
    }
  },
);
