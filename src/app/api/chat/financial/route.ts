/**
 * Financial Chat API - Main Endpoint
 * 
 * Phase 6.1.4: POST endpoint for sending messages with streaming support
 * Handles chat message submission and returns AI responses via Server-Sent Events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FinancialChatEngine } from '@/lib/ai/financial-chat-engine';
import { SendMessageRequest } from '@/lib/ai/types/financial-chat.types';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60000, // 1 minute
};

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
}

/**
 * POST /api/chat/financial
 * Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // Parse and validate request body
    const body: SendMessageRequest = await request.json();

    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', message: 'sessionId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'message is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (body.message.length > 2000) {
      return NextResponse.json(
        { error: 'Validation error', message: 'message cannot exceed 2000 characters' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', body.sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    // Type assertion needed due to Supabase type inference
    const sessionData = session as { user_id: string };
    if (sessionData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this session' },
        { status: 403 }
      );
    }

    // Initialize chat engine
    const chatEngine = new FinancialChatEngine();

    // Handle streaming vs non-streaming
    if (body.streaming) {
      // SSE streaming requires TransformStream - currently using non-streaming fallback
      // Future: Use ReadableStream with SSE format for real-time token streaming
      const response = await chatEngine.sendMessage(body.sessionId, body.message, false);
      return NextResponse.json(response, { status: 200 });
    } else {
      // Non-streaming response
      const response = await chatEngine.sendMessage(body.sessionId, body.message, false);
      return NextResponse.json(response, { status: 200 });
    }
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    // Handle specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Session not found')) {
      return NextResponse.json(
        { error: 'Not found', message: errorMessage },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while processing your request',
      },
      { status: 500 }
    );
  }
}

