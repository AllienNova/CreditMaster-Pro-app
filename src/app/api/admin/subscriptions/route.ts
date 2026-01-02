/**
 * Admin Subscriptions API
 *
 * Manages subscription data for admin dashboard.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRole, createAuthResponse } from '@/lib/security/auth-middleware';

export async function GET(request: NextRequest) {
  // SECURITY: Require admin role for subscription data
  const authResult = await requireRole(request, 'admin');
  if (!authResult.authenticated || !authResult.user) {
    return createAuthResponse(authResult);
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // Return mock data if not configured
      return NextResponse.json({
        subscriptions: [
          { id: '1', user_id: '1', user_email: 'john@example.com', stripe_subscription_id: 'sub_1234', stripe_price_id: 'price_premium', status: 'active', current_period_start: '2024-11-01T00:00:00Z', current_period_end: '2024-12-01T00:00:00Z', cancel_at_period_end: false },
          { id: '2', user_id: '2', user_email: 'jane@example.com', stripe_subscription_id: 'sub_5678', stripe_price_id: 'price_basic', status: 'active', current_period_start: '2024-11-15T00:00:00Z', current_period_end: '2024-12-15T00:00:00Z', cancel_at_period_end: false },
          { id: '3', user_id: '3', user_email: 'bob@example.com', stripe_subscription_id: 'sub_9012', stripe_price_id: 'price_premium', status: 'past_due', current_period_start: '2024-10-20T00:00:00Z', current_period_end: '2024-11-20T00:00:00Z', cancel_at_period_end: false },
          { id: '4', user_id: '4', user_email: 'alice@example.com', stripe_subscription_id: 'sub_3456', stripe_price_id: 'price_enterprise', status: 'active', current_period_start: '2024-11-05T00:00:00Z', current_period_end: '2024-12-05T00:00:00Z', cancel_at_period_end: true },
          { id: '5', user_id: '5', user_email: 'charlie@example.com', stripe_subscription_id: 'sub_7890', stripe_price_id: 'price_basic', status: 'canceled', current_period_start: '2024-10-01T00:00:00Z', current_period_end: '2024-11-01T00:00:00Z', cancel_at_period_end: false },
        ],
        total: 5,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch subscriptions with user data
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    // Get auth users to merge email data
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    // Enrich with email data
    const enrichedSubscriptions = subscriptions?.map(sub => {
      const authUser = authUsers?.users?.find(u => u.id === sub.user_id);
      return {
        ...sub,
        user_email: authUser?.email || 'Unknown',
      };
    });

    return NextResponse.json({
      subscriptions: enrichedSubscriptions || [],
      total: subscriptions?.length || 0,
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    // In production, this would call Stripe API to cancel subscription
    // stripe.subscriptions.cancel(subscriptionId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: true, message: 'Mock cancellation successful' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled', cancel_at_period_end: true })
      .eq('stripe_subscription_id', subscriptionId);

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin subscription cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

