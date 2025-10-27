import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/payment/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, customerId, successUrl, cancelUrl, trialDays } = body;
    
    if (!priceId || !customerId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId and customerId' },
        { status: 400 }
      );
    }
    
    const session = await stripeService.createCheckoutSession(
      priceId,
      customerId,
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

