import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { billingProfileStore } from '@/lib/payment/billing-profile-store';
import { SUBSCRIPTION_PLANS } from '@/lib/payment/stripe-service';

export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!rbac.hasPermission(validation.user, 'billing:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profile = await billingProfileStore.getProfile(validation.user.id);
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
    console.error('Billing profile error:', error);
    return NextResponse.json({ error: 'Failed to load billing profile' }, { status: 500 });
  }
}
