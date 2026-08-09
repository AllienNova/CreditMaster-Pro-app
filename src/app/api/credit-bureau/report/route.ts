/**
 * Credit Bureau Report API
 *
 * GET /api/credit-bureau/report - Get credit report from specific bureau or all bureaus
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { CreditBureauService } from "@/lib/credit-bureau/credit-bureau-service";
import type { Bureau } from "@/lib/credit-bureau/types";

export const GET = withPermission(
  "credit:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const bureau = searchParams.get("bureau") as Bureau | null;
    const reportType =
      (searchParams.get("type") as "full" | "monitoring" | "score_only") ||
      "full";

    // 4. Get credit report(s)
    let result;

    if (bureau) {
      // Get report from specific bureau
      result = await CreditBureauService.getCreditReport(
        user.id,
        bureau,
        reportType,
      );
    } else {
      // Get reports from all bureaus
      result = await CreditBureauService.getAllCreditReports(user.id);
    }

    // 5. Log action (CreditBureauReportAPI: Credit report retrieved for user)

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // CreditBureauReportAPI error: Credit report API error

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve credit report",
      },
      { status: 500 },
    );
  }
  },
);

export const POST = withPermission(
  "credit:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // 3. Parse request body
    const body = await request.json();
    const { bureau, reportType = "full" } = body;

    if (!bureau) {
      return NextResponse.json(
        { error: "Bureau is required" },
        { status: 400 },
      );
    }

    // 4. Request new credit report
    const result = await CreditBureauService.getCreditReport(
      user.id,
      bureau as Bureau,
      reportType,
    );

    // 5. Log action (CreditBureauReportAPI: Credit report requested for user)

    // 6. Return response
    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    // CreditBureauReportAPI error: Credit report request API error

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to request credit report",
      },
      { status: 500 },
    );
  }
  },
);
