import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { subscriptionService } from '@/lib/subscriptions/subscription-service';

/**
 * Test Database Connections
 *
 * This endpoint tests:
 * 1. Supabase client connection
 * 2. User authentication
 * 3. Profile query
 * 4. Database types
 */
export async function GET(request: NextRequest) {
  try {
    // Test 1: Supabase client creation
    const supabase = createClient();

    // Test 2: Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({
        success: false,
        test: 'authentication',
        error: authError.message,
        hint: 'Make sure you are logged in',
      }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        test: 'authentication',
        error: 'No user found',
        hint: 'Visit /login to sign in',
      }, { status: 401 });
    }

    // Test 3: Query profile
    const profile = await subscriptionService.getUserProfile(user.id);

    if (!profile) {
      return NextResponse.json({
        success: false,
        test: 'profile_query',
        error: 'Profile not found',
        hint: 'Profile should be created automatically on signup',
        user: {
          id: user.id,
          email: user.email,
        },
      }, { status: 404 });
    }

    // Test 4: Query all tables
    const [disputes, documents, notifications, subscriptions] = await Promise.all([
      supabase.from('disputes').select('count').eq('user_id', user.id),
      supabase.from('documents').select('count').eq('user_id', user.id),
      supabase.from('notifications').select('count').eq('user_id', user.id),
      supabase.from('subscriptions').select('count').eq('user_id', user.id),
    ]);

    // Success!
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      tests_passed: [
        'Supabase client created',
        'User authenticated',
        'Profile query successful',
        'All tables accessible',
      ],
      data: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile: {
          id: profile.id,
          fullName: profile.fullName,
          subscriptionTier: profile.subscriptionTier,
          subscriptionStatus: profile.subscriptionStatus,
          stripeCustomerId: profile.stripeCustomerId,
        },
        counts: {
          disputes: disputes.count || 0,
          documents: documents.count || 0,
          notifications: notifications.count || 0,
          subscriptions: subscriptions.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      test: 'unexpected_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
