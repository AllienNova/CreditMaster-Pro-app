import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("addon_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch addon subscriptions: ${error.message}`);
    }

    return NextResponse.json({
      subscriptions: (data ?? []).map(
        (row: Record<string, unknown>) => ({
          id: row.id,
          bundleType: row.bundle_type,
          stripeSubscriptionId: row.stripe_subscription_id,
          status: row.status,
          creditsPerPeriod: row.credits_per_period,
          createdAt: row.created_at,
        }),
      ),
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch add-on subscriptions" },
      { status: 500 },
    );
  }
}
