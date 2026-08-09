import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ADDON_BUNDLES } from "@/lib/credits/credit-costs";
import { stripeService } from "@/lib/payment/stripe-service";
import type { AddonBundleType } from "@/lib/credits/types";

const VALID_BUNDLE_TYPES: AddonBundleType[] = [
  "ai_trading_boost",
  "credit_repair_pro",
  "family_member",
];

// Map addon types to Stripe Price IDs (configured via env)
function getAddonPriceId(bundleType: AddonBundleType): string {
  const priceMap: Record<AddonBundleType, string> = {
    ai_trading_boost:
      process.env.STRIPE_ADDON_AI_TRADING_PRICE_ID || "price_addon_ai_trading",
    credit_repair_pro:
      process.env.STRIPE_ADDON_CREDIT_REPAIR_PRICE_ID ||
      "price_addon_credit_repair",
    family_member:
      process.env.STRIPE_ADDON_FAMILY_MEMBER_PRICE_ID ||
      "price_addon_family_member",
  };
  return priceMap[bundleType];
}

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { bundleType } = body as { bundleType: unknown };

    if (
      !bundleType ||
      typeof bundleType !== "string" ||
      !VALID_BUNDLE_TYPES.includes(bundleType as AddonBundleType)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid bundleType. Must be: ai_trading_boost, credit_repair_pro, or family_member",
        },
        { status: 400 },
      );
    }

    const bundle = ADDON_BUNDLES.find((b) => b.type === bundleType);
    if (!bundle) {
      return NextResponse.json(
        { error: "Add-on bundle not found" },
        { status: 400 },
      );
    }

    // Get or create Stripe customer ID from profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single();

    let stripeCustomerId: string | undefined = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripeService.createCustomer(
        user.email,
        profile?.full_name || undefined,
        { userId: user.id },
      );
      stripeCustomerId = customer.id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
    }

    const priceId = getAddonPriceId(bundleType as AddonBundleType);
    const subscription = await stripeService.createSubscription(
      stripeCustomerId,
      priceId,
    );

    // Insert into addon_subscriptions table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabaseAdmin as any)
      .from("addon_subscriptions")
      .insert({
        user_id: user.id,
        bundle_type: bundleType,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        credits_per_period: bundle.creditsPerPeriod,
      });

    if (insertError) {
      throw new Error(
        `Failed to save addon subscription: ${insertError.message}`,
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to subscribe to add-on" },
      { status: 500 },
    );
  }
});
