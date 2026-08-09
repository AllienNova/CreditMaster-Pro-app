import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { subscriptionService } from "@/lib/subscriptions/subscription-service";
import { stripeService, SUBSCRIPTION_PLANS } from "@/lib/payment/stripe-service";

export const POST = withPermission(
  "billing:update",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const { planId, cancelSubscription } = await request.json() as {
      planId?: string;
      cancelSubscription?: boolean;
    };

    // ── Cancel path ──────────────────────────────────────────────────────────
    if (cancelSubscription || planId === "free") {
      const subscription = await subscriptionService.cancelSubscription(user.id);
      return NextResponse.json({ status: "updated", subscription });
    }

    // ── Validate planId ──────────────────────────────────────────────────────
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan id" },
        { status: 400 },
      );
    }

    // ── Check for existing subscription ──────────────────────────────────────
    const existing = await subscriptionService.getUserSubscription(user.id);

    if (existing) {
      // Change plan on existing Stripe subscription
      const subscription = await subscriptionService.changeSubscriptionPlan(
        user.id,
        plan.priceId,
      );
      return NextResponse.json({ status: "updated", subscription });
    }

    // ── New subscription — redirect to Stripe Checkout ────────────────────────
    const profile = await subscriptionService.getUserProfile(user.id);
    if (!profile?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this user" },
        { status: 500 },
      );
    }

    const baseUrl = request.nextUrl.origin;
    const session = await stripeService.createCheckoutSession(
      plan.priceId,
      profile.stripeCustomerId,
      `${baseUrl}/dashboard/billing?success=1`,
      `${baseUrl}/dashboard/billing?canceled=1`,
    );

    return NextResponse.json({ status: "redirect", checkoutUrl: session.url });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 },
    );
  }
},
);
