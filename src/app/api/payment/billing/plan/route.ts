import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { billingProfileStore } from "@/lib/payment/billing-profile-store";

export const POST = withPermission(
  "billing:update",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const { planId, cancelSubscription } = await request.json();

    const profile = cancelSubscription
      ? await billingProfileStore.cancelSubscription(user.id)
      : await billingProfileStore.updatePlan(user.id, planId);

    return NextResponse.json({
      subscription: {
        planId: profile.currentPlanId,
        status: profile.status,
        cancelAtPeriodEnd: profile.cancelAtPeriodEnd,
        currentPeriodStart: profile.currentPeriodStart,
        currentPeriodEnd: profile.currentPeriodEnd,
      },
      invoices: profile.invoices,
    });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 },
    );
  }
},
);
