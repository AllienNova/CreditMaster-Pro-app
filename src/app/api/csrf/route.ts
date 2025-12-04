/**
 * CSRF Token API Route
 * Returns a new CSRF token for client-side use
 */

import { NextResponse } from 'next/server';
import { setCSRFCookie } from '@/lib/security/csrf';

export async function GET() {
  try {
    const token = await setCSRFCookie();
    
    return NextResponse.json({ 
      csrfToken: token,
      expiresIn: 3600 // 1 hour in seconds
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

