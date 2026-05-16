import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { billingProfileStore } from "@/lib/payment/billing-profile-store";
import { SUBSCRIPTION_PLANS } from "@/lib/payment/stripe-service";

export const GET = withPermission(
  "billing:read",
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const profile = await billingProfileStore.getProfile(user.id);
    return NextResponse.json({
      plans: SUBSCRIPTION_PLANS,
      subscription: {
        planId: profile.currentPlanId,
        status: profile.status,
        currentPeriodStart: profile.currentPeriodStart,
        currentPeriodEnd: profile.currentPeriodEnd,
        cancelAtPeriodEnd: profile.cancelAtPeriodEnd,
      },
      paymentMethods: profile.paymentMethods,
      invoices: profile.invoices,
    });
  } catch (error) {
    console.error("Billing profile error:", error);
    return NextResponse.json(
      { error: "Failed to load billing profile" },
      { status: 500 },
    );
  }
},
);
