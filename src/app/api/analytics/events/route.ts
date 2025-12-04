/**
 * Analytics Events API Route
 * Receives and stores user analytics events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: string;
  page?: string;
  referrer?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const { events } = await request.json() as { events: AnalyticsEvent[] };

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    // Transform events for database insertion
    const rows = events.map(event => ({
      event_type: event.event,
      user_id: event.userId || null,
      session_id: event.sessionId,
      properties: event.properties || {},
      page: event.page,
      referrer: event.referrer,
      user_agent: event.userAgent,
      created_at: event.timestamp || new Date().toISOString()
    }));

    // Insert events in batch
    const { error } = await supabase
      .from('analytics_events')
      .insert(rows);

    if (error) {
      console.error('Analytics insert error:', error);
      // Don't fail the request - analytics should be non-blocking
      return NextResponse.json({ success: true, warning: 'Some events may not have been stored' });
    }

    return NextResponse.json({ success: true, count: events.length });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: true }); // Don't fail client requests
  }
}

/**
 * GET - Retrieve analytics summary (admin only)
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('end') || new Date().toISOString();

    // Get event counts by type
    const { data: eventCounts, error: countError } = await supabase
      .from('analytics_events')
      .select('event_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (countError) throw countError;

    // Aggregate counts
    const counts: Record<string, number> = {};
    eventCounts?.forEach(row => {
      counts[row.event_type] = (counts[row.event_type] || 0) + 1;
    });

    // Get unique users
    const { data: uniqueUsers, error: userError } = await supabase
      .from('analytics_events')
      .select('user_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('user_id', 'is', null);

    if (userError) throw userError;

    const uniqueUserIds = new Set(uniqueUsers?.map(r => r.user_id));

    // Get unique sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('analytics_events')
      .select('session_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (sessionError) throw sessionError;

    const uniqueSessions = new Set(sessions?.map(r => r.session_id));

    return NextResponse.json({
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: eventCounts?.length || 0,
        uniqueUsers: uniqueUserIds.size,
        uniqueSessions: uniqueSessions.size,
        eventsByType: counts
      }
    });
  } catch (error) {
    console.error('Analytics query error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

