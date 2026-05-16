/**
 * Dispute Statistics API
 * GET /api/disputes/stats - Get user's dispute statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { disputeService } from "@/lib/disputes/dispute-service";

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const stats = disputeService.getUserDisputeStats(user.id);

    return NextResponse.json({
      success: true,
      data: {
        total: stats.total,
        active: stats.active,
        resolved: stats.resolved,
        successRate: stats.successRate,
        avgResolutionDays: stats.averageResolutionDays,
      },
    });
  } catch (error) {
    console.error("Get dispute stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get dispute statistics" },
      { status: 500 },
    );
  }
},
);
