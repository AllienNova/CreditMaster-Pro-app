/**
 * Cron Job: Dispute Follow-ups
 *
 * Runs daily to send automated follow-up emails for pending disputes
 * Configure in Vercel Cron: 0 9 * * * (daily at 9 AM UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { processFollowups } from "@/lib/automation/dispute-followups";
import { verifyCronRequest } from "@/lib/security/cron-auth";

export async function GET(request: NextRequest) {
  // Previously `if (CRON_SECRET && !timingSafeEqual(...))`, which skipped the
  // check entirely when the secret was unset — the route rejected nobody, no
  // header required. It also read the env var at module load, so the value was
  // frozen at cold start. verifyCronRequest fails closed and reads at call time.
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // CronDisputeFollowups: Starting dispute follow-up processing

    const stats = await processFollowups();

    // CronDisputeFollowups: Follow-up processing complete

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    // CronDisputeFollowups error: Dispute follow-up cron error

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Vercel Cron configuration - use Node.js runtime for Supabase compatibility
export const runtime = "nodejs";
