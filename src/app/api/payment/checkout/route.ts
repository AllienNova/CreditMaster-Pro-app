import { NextRequest, NextResponse } from 'next/server';
import { createClient, getSupabase } from '@/lib/supabase/client';
import { subscriptionService } from '@/lib/subscriptions/subscription-service';
import { stripeService } from '@/lib/payment/stripe-service';
import type { Database } from '@/lib/supabase/types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Helper to get typed table reference
const profiles = () => getSupabase().from('profiles');

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to continue' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { priceId, successUrl, cancelUrl, trialDays } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing required field: priceId' },
        { status: 400 }
      );
    }

    // Get or create user profile
    const profile = await subscriptionService.getUserProfile(user.id);

    // Get or create Stripe customer
    let stripeCustomerId = profile?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripeService.createCustomer(
        user.email!,
        profile?.fullName || undefined,
        { userId: user.id }
      );

      stripeCustomerId = customer.id;

      // Update profile with Stripe customer ID
      const updateData: ProfileUpdate = {
        stripe_customer_id: stripeCustomerId,
      };
      const query = profiles();
      await query.update(updateData).eq('id', user.id);
    }

    // Create Stripe Checkout session
    const session = await stripeService.createCheckoutSession(
      priceId,
      stripeCustomerId,
      successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      trialDays
    );

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
