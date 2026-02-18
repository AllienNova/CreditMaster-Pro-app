import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { billingProfileStore } from "@/lib/payment/billing-profile-store";

export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rbac.hasPermission(validation.user, "billing:update")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { planId, cancelSubscription } = await request.json();

    const profile = cancelSubscription
      ? await billingProfileStore.cancelSubscription(validation.user.id)
      : await billingProfileStore.updatePlan(validation.user.id, planId);

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
}
