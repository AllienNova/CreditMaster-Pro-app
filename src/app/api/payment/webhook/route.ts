import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/payment/stripe-service';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(body, signature, webhookSecret);
    
    // Handle the event
    await stripeService.handleWebhookEvent(event);
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

