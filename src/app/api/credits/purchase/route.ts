import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CREDIT_PACKS } from "@/lib/credits/credit-costs";
import { stripeService } from "@/lib/payment/stripe-service";
import type { CreditPackType } from "@/lib/credits/types";

const VALID_PACK_TYPES: CreditPackType[] = ["starter", "value", "power"];

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
    const { packType } = body as { packType: unknown };

    if (
      !packType ||
      typeof packType !== "string" ||
      !VALID_PACK_TYPES.includes(packType as CreditPackType)
    ) {
      return NextResponse.json(
        { error: "Invalid packType. Must be: starter, value, or power" },
        { status: 400 },
      );
    }

    const pack = CREDIT_PACKS.find((p) => p.type === packType);
    if (!pack) {
      return NextResponse.json(
        { error: "Credit pack not found" },
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
        user.email!,
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

    const paymentIntent = await stripeService.createPaymentIntent(
      pack.priceUsd,
      "usd",
      stripeCustomerId,
      {
        type: "credit_purchase",
        packType: pack.type,
        credits: String(pack.credits),
        userId: user.id,
      },
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: pack.priceCents,
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to create credit purchase" },
      { status: 500 },
    );
  }
}
