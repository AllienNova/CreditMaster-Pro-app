import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }

  return createClient(url, key);
}

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  return timingSafeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const results = { reminders: 0, followUps: 0, scoreUpdates: 0 };

    // 1. Remind users to check dispute status after 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: pendingDisputes } = await supabase
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      .from("disputes")
      .select("id, user_id, bureau, item_type")
      .eq("status", "sent")
      .lt("sent_at", sevenDaysAgo.toISOString())
      .gt("sent_at", new Date(sevenDaysAgo.getTime() - 86400000).toISOString());

    for (const dispute of pendingDisputes || []) {
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      const { error: notifyError } = await supabase.from("notifications").insert({
        user_id: dispute.user_id,
        type: "dispute_reminder",
        title: "Check Your Dispute Status",
        message: `Your ${dispute.bureau} dispute for ${dispute.item_type} was sent 7 days ago. Have you received any correspondence?`,
        data: { dispute_id: dispute.id },
        read: false,
      });
      if (notifyError) {
        // Fire-and-forget here meant a failed insert looked like a delivered
        // notification: the cron reported success and the user was never told.
        console.error("Failed to create notification", notifyError);
      }
      results.reminders++;
    }

    // 2. Follow-up reminders for draft disputes older than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: draftDisputes } = await supabase
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      .from("disputes")
      .select("id, user_id, bureau, item_type")
      .eq("status", "draft")
      .lt("created_at", threeDaysAgo.toISOString());

    for (const dispute of draftDisputes || []) {
      // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
      const { error: notifyError } = await supabase.from("notifications").insert({
        user_id: dispute.user_id,
        type: "draft_reminder",
        title: "Complete Your Dispute",
        message: `You have an unfinished ${dispute.bureau} dispute. Complete and send it to start improving your credit!`,
        data: { dispute_id: dispute.id },
        read: false,
      });
      if (notifyError) {
        // Fire-and-forget here meant a failed insert looked like a delivered
        // notification: the cron reported success and the user was never told.
        console.error("Failed to create notification", notifyError);
      }
      results.followUps++;
    }

    // 3. Monthly credit score check reminder (first Monday of month)
    const today = new Date();
    if (today.getDate() <= 7 && today.getDay() === 1) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .eq("notification_preferences->score_reminders", true);

      for (const user of users || []) {
        // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
        const { error: notifyError } = await supabase.from("notifications").insert({
          user_id: user.id,
          type: "score_reminder",
          title: "Monthly Credit Check",
          message:
            "It's time for your monthly credit score check! Upload your latest credit report to track your progress.",
          data: {},
          read: false,
        });
        if (notifyError) {
          // Fire-and-forget here meant a failed insert looked like a delivered
          // notification: the cron reported success and the user was never told.
          console.error("Failed to create notification", notifyError);
        }
        results.scoreUpdates++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
