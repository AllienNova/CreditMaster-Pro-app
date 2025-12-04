/**
 * Cron Job: Dispute Follow-ups
 * 
 * Runs daily to send automated follow-up emails for pending disputes
 * Configure in Vercel Cron: 0 9 * * * (daily at 9 AM UTC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processFollowups } from '@/lib/automation/dispute-followups';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting dispute follow-up processing...');
    
    const stats = await processFollowups();
    
    console.log('Follow-up processing complete:', stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    console.error('Dispute follow-up cron error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Vercel Cron configuration - use Node.js runtime for Supabase compatibility
export const runtime = 'nodejs';

