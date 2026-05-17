import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/client";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { subscriptionService } from "@/lib/subscriptions/subscription-service";
import { stripeService, SUBSCRIPTION_PLANS } from "@/lib/payment/stripe-service";
import type { Database } from "@/lib/supabase/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// Helper to get typed table reference
const profiles = () => getSupabase().from("profiles");

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Parse request body — only trust priceId; URLs and trialDays are server-controlled
    const body = await request.json() as Record<string, unknown>;
    const { priceId } = body;

    // Fix 2: assert priceId is a string before any string-specific operations.
    // body is Record<string, unknown> so priceId is unknown — a client could
    // send a number, object, or array; reject those explicitly.
    if (typeof priceId !== "string" || !priceId) {
      return NextResponse.json(
        { error: "Invalid priceId: not a recognised subscription plan" },
        { status: 400 },
      );
    }

    // FND-019: Validate priceId against the server-side plan registry.
    // Reject unknown price IDs — do not forward arbitrary strings to Stripe.
    const knownPlan = SUBSCRIPTION_PLANS.some((p) => p.priceId === priceId);
    if (!knownPlan) {
      return NextResponse.json(
        { error: "Invalid priceId: not a recognised subscription plan" },
        { status: 400 },
      );
    }

    // FND-020: Build success/cancel URLs on the server.
    // Client-supplied successUrl/cancelUrl are intentionally NOT read from the
    // request body. String-concatenating client values opens an open-redirect
    // via payloads like "//evil.com" or "@evil.com". The server owns these paths.
    //
    // Fix 1: NEXT_PUBLIC_APP_URL is authoritative — no fallback to
    // request.nextUrl.origin, which can be influenced by a spoofed Host or
    // X-Forwarded-Host header on reverse-proxied deployments.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("Checkout misconfiguration: NEXT_PUBLIC_APP_URL is not set");
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }
    const successUrl = `${appUrl}/payment/success`;
    const cancelUrl = `${appUrl}/pricing`;

    // Get or create user profile
    const profile = await subscriptionService.getUserProfile(user.id);

    // Get or create Stripe customer
    let stripeCustomerId = profile?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripeService.createCustomer(
        user.email,
        profile?.fullName || undefined,
        { userId: user.id },
      );

      stripeCustomerId = customer.id;

      // Update profile with Stripe customer ID
      const updateData: ProfileUpdate = {
        stripe_customer_id: stripeCustomerId,
      };
      const query = profiles();
      await query.update(updateData).eq("id", user.id);
    }

    // FND-021: Pass no trialDays — SubscriptionPlan has no trial field and the
    // client must not be able to manufacture a free trial period by injecting
    // a trialDays value. Always pass undefined.
    const session = await stripeService.createCheckoutSession(
      priceId,
      stripeCustomerId,
      successUrl,
      cancelUrl,
      undefined,
    );

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    // Log the real error server-side; return a generic message to the client
    // so internal stack traces, host names, or connection details are not leaked.
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
});
