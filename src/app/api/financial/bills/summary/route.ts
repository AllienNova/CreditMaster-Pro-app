import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { billDetectionService } from "@/lib/financial/bill-detection-service";

/**
 * GET /api/financial/bills/summary
 * Get bill summary for the authenticated user
 */
export const GET = withPermission(
  "financial:read",
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const userId = user.id;

      // Get bill summary
      const summary = await billDetectionService.getBillSummary(userId);

      return NextResponse.json({ summary });
    } catch (error) {
      console.error("Error fetching bill summary:", error);
      return NextResponse.json(
        { error: "Failed to fetch bill summary" },
        { status: 500 },
      );
    }
  },
);
