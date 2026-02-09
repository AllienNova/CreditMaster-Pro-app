/**
 * WebAuthn Authentication Start API
 *
 * Generates authentication options for signing in with a passkey.
 * Can be used with or without a user ID (for discoverable credentials).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const RP_ID = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : 'localhost';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional email
    const body = await request.json().catch(() => ({}));
    const email = body.email;

    let allowCredentials: { type: 'public-key'; id: string; transports?: string[] }[] = [];
    let userId: string | null = null;

    // If email is provided, get credentials for that user
    if (email) {
      // Get user by email
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1);

      if (users && users.length > 0) {
        userId = users[0].id;

        // Get credentials for this user
        const { data: credentials } = await supabase
          .from('webauthn_credentials')
          .select('credential_id, transports')
          .eq('user_id', userId);

        if (credentials && credentials.length > 0) {
          allowCredentials = credentials.map((cred) => ({
            type: 'public-key' as const,
            id: cred.credential_id,
            transports: cred.transports || ['internal', 'hybrid'],
          }));
        }
      }
    }

    // Generate a secure random challenge
    const challenge = crypto.randomBytes(32).toString('base64url');

    // Store challenge temporarily for verification (expires in 5 minutes)
    const challengeExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Use a session-based key for anonymous challenges
    const sessionId = crypto.randomBytes(16).toString('hex');

    await supabase
      .from('webauthn_challenges')
      .insert({
        user_id: userId || sessionId,
        challenge,
        type: 'authentication',
        is_anonymous: !userId,
        expires_at: challengeExpiry,
        created_at: new Date().toISOString(),
      });

    // Create authentication options
    const authenticationOptions = {
      challenge,
      rpId: RP_ID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      timeout: 60000,
      userVerification: 'preferred' as const,
    };

    return NextResponse.json({
      options: authenticationOptions,
      sessionId: !userId ? sessionId : undefined,
    });
  } catch (error) {
    console.error('WebAuthn authentication start error:', error);
    return NextResponse.json(
      { error: 'Failed to start authentication' },
      { status: 500 }
    );
  }
}
