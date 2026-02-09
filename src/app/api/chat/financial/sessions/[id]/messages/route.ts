/**
 * Financial Chat API - Session Messages Endpoint
 * 
 * Phase 6.1.4: GET endpoint for session message history
 * Handles retrieving chat messages for a specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FinancialChatEngine } from '@/lib/ai/financial-chat-engine';

/**
 * GET /api/chat/financial/sessions/[id]/messages
 * Get session message history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: sessionId } = await params;

    // Validate session ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const beforeTimestamp = searchParams.get('beforeTimestamp');

    // Validate parameters
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'Validation error', message: 'limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'offset must be non-negative' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', sessionId)
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

    // Get session history
    const messages = await chatEngine.getSessionHistory(sessionId, limit + offset);

    // Apply offset and limit
    const paginatedMessages = messages.slice(offset, offset + limit);

    // Filter by beforeTimestamp if provided
    let filteredMessages = paginatedMessages;
    if (beforeTimestamp) {
      const beforeDate = new Date(beforeTimestamp);
      if (isNaN(beforeDate.getTime())) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Invalid beforeTimestamp format' },
          { status: 400 }
        );
      }
      filteredMessages = paginatedMessages.filter(
        (msg) => msg.timestamp < beforeDate
      );
    }

    return NextResponse.json(
      {
        messages: filteredMessages,
        total: messages.length,
        limit,
        offset,
        hasMore: offset + limit < messages.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Get messages API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while fetching messages',
      },
      { status: 500 }
    );
  }
}

