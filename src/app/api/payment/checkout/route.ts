import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/payment/stripe-service';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { billingProfileStore } from '@/lib/payment/billing-profile-store';

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, customerId, successUrl, cancelUrl, trialDays } = body;
    const effectiveCustomerId =
      customerId ||
      (await billingProfileStore.getProfile(validation.user.id)).customerId;

    if (!priceId || !effectiveCustomerId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId and customerId' },
        { status: 400 }
      );
    }
    
    const session = await stripeService.createCheckoutSession(
      priceId,
      effectiveCustomerId,
      successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      trialDays
    );
    
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

