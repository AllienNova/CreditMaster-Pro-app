/**
 * Dismiss a Tax Recommendation
 *
 * POST /api/tax/recommendations/[id]/dismiss
 * Hides one of the caller's own recommendations without marking it done.
 *
 * The sibling of /complete. Dismissing and completing are different answers —
 * "not for me" versus "I did this" — and collapsing them would tell the
 * optimizer that a user acted on advice they rejected.
 *
 * Mobile's "dismiss tip" control used to POST /tax/tips/{id}/dismiss, a route
 * that does not exist, and the screen filtered the tip out of local state
 * regardless, so the dismissal survived exactly until the next launch.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The recommendation id from the path.
 *
 * withAuth does not forward Next's route `params` (api-guard.ts:156 takes the
 * request alone), so the id is read from the pathname. It is the SECOND-to-last
 * segment, because the path ends in /dismiss.
 */
function recommendationIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 2] ?? "";
}

export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = recommendationIdFrom(request);

    // Reject a malformed id before it reaches the database. Postgres would
    // raise a type error on a non-uuid, which surfaces as a 500 and tells a
    // prober that their input reached the query layer.
    if (!UUID.test(id)) {
      return NextResponse.json(
        { error: "Invalid recommendation id" },
        { status: 400 },
      );
    }

    try {
      const supabase = getServiceRoleClient();

      const { data, error } = await supabase
        .from("tax_recommendations")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        // BOTH filters are load-bearing. The service-role client bypasses RLS
        // completely, so `user_id` is the only thing standing between this
        // update and any other user's recommendations.
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        // Never swallow: a failed write with a success response hides the tip
        // in the UI while it stays open on the server, so it returns on the
        // next launch and the user dismisses it again.
        console.error("Failed to dismiss tax recommendation:", error);
        return NextResponse.json(
          { error: "Failed to update recommendation" },
          { status: 500 },
        );
      }

      if (!data) {
        // 404 for both "no such row" and "not yours". Answering 403 for the
        // second would confirm the existence of another user's recommendation
        // to anyone probing uuids.
        return NextResponse.json(
          { error: "Recommendation not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: { id: data.id } });
    } catch (error) {
      console.error("Failed to dismiss tax recommendation:", error);
      return NextResponse.json(
        { error: "Failed to update recommendation" },
        { status: 500 },
      );
    }
  },
);
