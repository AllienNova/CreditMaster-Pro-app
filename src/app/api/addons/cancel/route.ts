import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stripeService } from "@/lib/payment/stripe-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId } = body as { subscriptionId: unknown };

    if (!subscriptionId || typeof subscriptionId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: subscriptionId" },
        { status: 400 },
      );
    }

    // Verify the addon subscription belongs to this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: addon, error: fetchError } = await (supabaseAdmin as any)
      .from("addon_subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !addon) {
      return NextResponse.json(
        { error: "Add-on subscription not found" },
        { status: 404 },
      );
    }

    // Cancel the Stripe subscription at period end
    await stripeService.cancelSubscription(subscriptionId, false);

    // Update addon_subscriptions status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabaseAdmin as any)
      .from("addon_subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscriptionId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(
        `Failed to update addon subscription: ${updateError.message}`,
      );
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to cancel add-on subscription" },
      { status: 500 },
    );
  }
}
