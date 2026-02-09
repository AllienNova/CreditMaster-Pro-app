/**
 * Email Unsubscribe Fynvita API Route
 * Handles one-click unsubscribe for CAN-SPAM compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Email types that can be unsubscribed
const EMAIL_TYPES = [
  'marketing',
  'disputes',
  'scores',
  'payments',
  'all',
] as const;
type EmailType = (typeof EMAIL_TYPES)[number];

/**
 * GET - Show unsubscribe confirmation page
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const userId = searchParams.get('user');
  const type = searchParams.get('type') as EmailType;

  if (!token || !userId || !type) {
    return new NextResponse(renderPage('error', 'Invalid unsubscribe link'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!verifyUnsubscribeToken(token, userId)) {
    return new NextResponse(renderPage('error', 'Invalid or expired link'), {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new NextResponse(renderPage('confirm', type), {
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * POST - Process unsubscribe request
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { token, userId, type } = body;

    if (!token || !userId || !type || !EMAIL_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!verifyUnsubscribeToken(token, userId)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Update user notification preferences
    const updates: Record<string, boolean> = {};

    if (type === 'all') {
      updates.email_marketing = false;
      updates.email_disputes = false;
      updates.email_scores = false;
    } else if (type === 'marketing') {
      updates.email_marketing = false;
    } else if (type === 'disputes') {
      updates.email_disputes = false;
    } else if (type === 'scores') {
      updates.email_scores = false;
    }

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      notifications: updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Log unsubscribe event
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'email_unsubscribe',
      details: { type },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

/**
 * Render simple HTML page
 */
function renderPage(
  status: 'confirm' | 'success' | 'error',
  message: string
): string {
  const title =
    status === 'error'
      ? 'Error'
      : status === 'confirm'
        ? 'Confirm Unsubscribe'
        : 'Unsubscribed';

  return `<!DOCTYPE html>
<html><head><title>${title} - Fynvita</title>
<style>body{font-family:system-ui;max-width:500px;margin:50px auto;padding:20px;text-align:center}
.btn{background:#10b981;color:white;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;font-size:16px}
.btn:hover{background:#059669}.error{color:#dc2626}</style></head>
<body><h1>${title}</h1><p>${message}</p>
${status === 'confirm' ? '<button class="btn" onclick="unsubscribe()">Confirm Unsubscribe</button>' : ''}
${status === 'success' ? '<p>You have been unsubscribed.</p><a href="/">Return to Fynvita</a>' : ''}
<script>function unsubscribe(){fetch(location.href,{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({token:new URLSearchParams(location.search).get('token'),
userId:new URLSearchParams(location.search).get('user'),
type:new URLSearchParams(location.search).get('type')})}).then(r=>r.json())
.then(d=>{if(d.success)location.reload()})}</script></body></html>`;
}
