/**
 * One user, for admin support.
 *
 * GET /api/admin/users/[id]
 *
 * The collection at /api/admin/users existed; this did not. So the detail
 * screen at app/admin/users/[id]/page.tsx had nothing to call and rendered a
 * hardcoded "John Doe" — the same invented person, with the same invented
 * credit score and payment history, for every ID an admin clicked.
 *
 * WHAT IS DELIBERATELY NOT RETURNED.
 *
 *  - The credit score. `credit_scores` is a real table, but whether support
 *    staff may read a member's score is a privacy decision for the owner, not
 *    a detail to settle while removing a mock. It is absent rather than
 *    guessed at in either direction.
 *  - `disputes.letter_content` and `reason`. A dispute letter is the member's
 *    own account of their finances. The metadata below is enough to answer
 *    "what is happening with this person's disputes"; the letter body is not
 *    needed to answer it.
 *
 * WHAT IS RETURNED AND WHY IT IS TRUSTWORTHY. Every field maps to a column:
 * profile identity from `profiles`, last sign-in from auth (the only place it
 * exists), subscriptions labelled through `lookupPlanByPriceId` so the plan
 * name matches what billing assigned, disputes as metadata, and payments from
 * the money ledger in CENTS, converted once here.
 *
 * ON THE PAYMENTS SHAPE. Two migrations declare `public.payments` and both use
 * CREATE TABLE IF NOT EXISTS, so the earlier one (20260731000020) wins and the
 * provider-agnostic columns from 20260801000010 are not on the live table.
 * This selects `*` and reads `paid_at ?? created_at` rather than naming a
 * column that exists in only one of the two shapes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { lookupPlanByPriceId } from "@/lib/payment/plan-lookup";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Columns of `profiles` this route discloses. `profiles.email` was added by 20260204000001. */
const PROFILE_COLUMNS =
  "id, full_name, email, subscription_tier, subscription_status, stripe_customer_id, created_at";

/** Dispute metadata only — never letter_content or reason. See the note above. */
const DISPUTE_COLUMNS = "id, bureau, status, item_type, outcome, created_at";

const RECENT_LIMIT = 20;

function userIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

export const GET = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    const id = userIdFrom(request);
    if (!UUID.test(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      const { data: profile, error: profileError } = await supabase
        // idor-audit: cross-user — admin support view of one member, gated by withRole("admin")
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (profileError) {
        console.error("[admin/users/:id] profile read failed", profileError);
        return NextResponse.json(
          { error: "Failed to load user" },
          { status: 500 },
        );
      }

      if (!profile) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Each of these is its own failure: one empty section must not be
      // reported as an empty section when the query actually errored, so the
      // errors are surfaced per section rather than collapsed into one 500.
      const [authResult, subsResult, disputesResult, paymentsResult] =
        await Promise.all([
          supabase.auth.admin.getUserById(id),
          supabase
            // idor-audit: cross-user — admin support view, gated by withRole("admin")
            .from("subscriptions")
            .select(
              "id, status, stripe_price_id, current_period_end, cancel_at_period_end, created_at",
            )
            .eq("user_id", id)
            .order("created_at", { ascending: false }),
          supabase
            // idor-audit: cross-user — admin support view, gated by withRole("admin")
            .from("disputes")
            .select(DISPUTE_COLUMNS)
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(RECENT_LIMIT),
          supabase
            // idor-audit: cross-user — admin support view, gated by withRole("admin")
            .from("payments")
            .select("*")
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(RECENT_LIMIT),
        ]);

      const authUser = authResult.data?.user ?? null;

      const subscriptions = (subsResult.data ?? []).map((sub) => {
        const plan = lookupPlanByPriceId(sub.stripe_price_id);
        return {
          id: sub.id,
          status: sub.status,
          stripe_price_id: sub.stripe_price_id,
          // null, not "free" — an unknown price ID is a gap to show, not a
          // silent downgrade (FND-018).
          tier: plan?.tier ?? null,
          plan_name: plan?.name ?? null,
          monthly_list_price: plan?.monthlyListPrice ?? null,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          created_at: sub.created_at,
        };
      });

      const payments = (
        (paymentsResult.data ?? []) as Record<string, unknown>[]
      ).map((payment) => ({
        id: String(payment.id ?? ""),
        // amount_cents is an integer count of cents. Divide once, here.
        amount: Number(payment.amount_cents ?? 0) / 100,
        currency: String(payment.currency ?? "usd"),
        status: String(payment.status ?? ""),
        paid_at: (payment.paid_at ?? payment.created_at ?? null) as
          | string
          | null,
      }));

      return NextResponse.json({
        user: {
          ...profile,
          // auth.users is the authoritative email; profiles.email is a copy.
          email: authUser?.email ?? (profile as { email?: string }).email ?? null,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
        },
        subscriptions,
        disputes: disputesResult.data ?? [],
        payments,
        // Which sections could not be read, so the screen can say "we could
        // not load this" instead of showing an empty list that reads as "none".
        unavailable: [
          subsResult.error ? "subscriptions" : null,
          disputesResult.error ? "disputes" : null,
          paymentsResult.error ? "payments" : null,
          authResult.error ? "auth" : null,
        ].filter((section): section is string => section !== null),
      });
    } catch (error) {
      console.error("[admin/users/:id] failed", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
