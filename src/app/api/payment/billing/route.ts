import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { getBillingData } from "@/lib/payment/billing-data";
import { SUBSCRIPTION_PLANS } from "@/lib/payment/stripe-service";

export const GET = withPermission(
  "billing:read",
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const billing = await getBillingData(user.id);
    return NextResponse.json({
      plans: SUBSCRIPTION_PLANS,
      subscription: billing.subscription,
      paymentMethods: billing.paymentMethods,
      invoices: billing.invoices,
    });
  } catch (error) {
    console.error("Billing data error:", error);
    return NextResponse.json(
      { error: "Failed to load billing profile" },
      { status: 500 },
    );
  }
},
);
