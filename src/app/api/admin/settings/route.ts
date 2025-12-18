/**
 * Admin Settings API
 * 
 * Manages platform settings.
 */

import { NextResponse } from 'next/server';

// In production, these would be stored in database or environment
let settings = {
  siteName: 'CPFI',
  supportEmail: 'support@CPFI.pro',
  maxDisputesPerMonth: 10,
  aiModelDefault: 'gpt-4',
  maintenanceMode: false,
  signupsEnabled: true,
  stripeTestMode: true,
};

export async function GET() {
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate and update settings
    settings = {
      ...settings,
      ...body,
    };

    // In production, save to database
    // await db.settings.update(settings);

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Admin settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

