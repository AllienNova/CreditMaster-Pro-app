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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const session = await stripeService.createCreditPackCheckoutSession({
      customerId: stripeCustomerId,
      userId: user.id,
      packType: pack.type,
      credits: pack.credits,
      priceCents: pack.priceCents,
      successUrl: `${appUrl}/settings/credits?purchase=success`,
      cancelUrl: `${appUrl}/settings/credits?purchase=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const { logger } = await import("@/lib/monitoring/logger");
    logger.error(
      "Failed to create credit purchase",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Failed to create credit purchase" },
      { status: 500 },
    );
  }
}
