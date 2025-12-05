/**
 * Admin Users API
 * 
 * CRUD operations for user management in admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // Return mock data if not configured
      return NextResponse.json({
        users: [
          { id: '1', email: 'john@example.com', full_name: 'John Doe', subscription_tier: 'premium', subscription_status: 'active', created_at: '2024-01-15T10:00:00Z' },
          { id: '2', email: 'jane@example.com', full_name: 'Jane Smith', subscription_tier: 'basic', subscription_status: 'active', created_at: '2024-02-20T14:30:00Z' },
          { id: '3', email: 'bob@example.com', full_name: 'Bob Wilson', subscription_tier: 'free', subscription_status: null, created_at: '2024-03-10T09:15:00Z' },
          { id: '4', email: 'alice@example.com', full_name: 'Alice Brown', subscription_tier: 'enterprise', subscription_status: 'active', created_at: '2024-01-05T16:45:00Z' },
          { id: '5', email: 'charlie@example.com', full_name: 'Charlie Davis', subscription_tier: 'premium', subscription_status: 'past_due', created_at: '2024-02-28T11:20:00Z' },
        ],
        total: 5,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') || '';

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (tier && tier !== 'all') {
      query = query.eq('subscription_tier', tier);
    }

    const { data: users, count, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get auth users to merge email data
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    // Merge profile data with auth data
    const enrichedUsers = users?.map(profile => {
      const authUser = authUsers?.users?.find(u => u.id === profile.id);
      return {
        ...profile,
        email: authUser?.email || 'Unknown',
      };
    });

    return NextResponse.json({
      users: enrichedUsers || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Missing userId or updates' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: true, message: 'Mock update successful' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

