import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

// Lazy initialization to avoid build-time errors
function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }

  return createClient(url, key);
}

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  return timingSafeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(request: Request) {
  // Verify this is a legitimate cron request
  if (process.env.NODE_ENV === "production" && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find disputes sent more than 30 days ago still pending
    const { data: overdueDisputes, error } = await supabase
      .from("disputes")
      .select("id, user_id, bureau, item_type, sent_at")
      .eq("status", "sent")
      .lt("sent_at", thirtyDaysAgo.toISOString());

    if (error) throw error;

    const results = {
      checked: overdueDisputes?.length || 0,
      updated: 0,
      notifications: 0,
    };

    // Update overdue disputes and notify users
    for (const dispute of overdueDisputes || []) {
      // Update status to "no_response" after 30 days
      await supabase
        .from("disputes")
        .update({
          status: "no_response",
          updated_at: new Date().toISOString(),
          notes:
            "Auto-updated: No response received within 30 days (FCRA violation)",
        })
        .eq("id", dispute.id);

      results.updated++;

      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: dispute.user_id,
        type: "dispute_overdue",
        title: "Dispute Response Overdue",
        message: `Your ${dispute.bureau} dispute for ${dispute.item_type} has not received a response in 30 days. This may be an FCRA violation.`,
        data: { dispute_id: dispute.id },
        read: false,
      });

      results.notifications++;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to check dispute status" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
