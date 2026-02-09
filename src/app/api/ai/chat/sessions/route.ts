/**
 * Chat Sessions API Endpoint
 *
 * GET /api/ai/chat/sessions - List chat sessions
 * POST /api/ai/chat/sessions - Create a new chat session
 * PROTECTED: Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatDbService } from '@/lib/ai/chat-db-service';
import type {
  CreateSessionRequest,
  ListSessionsRequest,
  SessionType,
} from '@/lib/ai/types/chat.types';

// List sessions
export async function GET(request: NextRequest) {
  try {
    // AUTHENTICATION CHECK - Required for all AI endpoints
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const listRequest: ListSessionsRequest = {
      status: (searchParams.get('status') as any) || undefined,
      sessionType:
        (searchParams.get('sessionType') as SessionType) || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: (searchParams.get('sortBy') as any) || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    };

    // Get sessions
    const sessions = await chatDbService.listSessions(userId, listRequest);

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (_error) {
    // ChatSessionsRoute error: Failed to list sessions

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LIST_SESSIONS_ERROR',
          message:
            _error instanceof Error ? _error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}

// Create session
export async function POST(request: NextRequest) {
  try {
    // AUTHENTICATION CHECK - Required for all AI endpoints
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse request body
    const body: CreateSessionRequest = await request.json();

    // Validate required fields
    if (!body.sessionType) {
      return NextResponse.json(
        { error: 'sessionType is required' },
        { status: 400 }
      );
    }

    // Validate session type
    const validTypes: SessionType[] = [
      'general',
      'budget',
      'goals',
      'debt',
      'investing',
      'credit_repair',
      'tax_planning',
    ];

    if (!validTypes.includes(body.sessionType)) {
      return NextResponse.json(
        {
          error: `Invalid sessionType. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create session
    const session = await chatDbService.createSession(userId, body);

    // If initial message provided, send it
    let initialResponse = null;
    if (body.initialMessage) {
      const chatEngine = (await import('@/lib/ai/chat-engine')).getChatEngine();
      try {
        initialResponse = await chatEngine.sendMessage(
          userId,
          {
            sessionId: session.id,
            message: body.initialMessage,
          },
          { includeContext: false }
        );
      } catch (_err) {
        // ChatSessionsRoute: Failed to send initial message
        void _err;
        // Don't fail the session creation if initial message fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        session,
        initialResponse,
      },
    });
  } catch (_error) {
    // ChatSessionsRoute error: Create session failed

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_SESSION_ERROR',
          message:
            _error instanceof Error ? _error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}
