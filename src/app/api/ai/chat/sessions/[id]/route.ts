/**
 * Chat Session Detail API Endpoint
 *
 * GET /api/ai/chat/sessions/[id] - Get session by ID
 * PUT /api/ai/chat/sessions/[id] - Update session
 * DELETE /api/ai/chat/sessions/[id] - Delete session
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatDbService } from '@/lib/ai/chat-db-service';
import type { UpdateSessionRequest } from '@/lib/ai/types/chat.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    // TODO: Add authentication middleware
    const userId = request.headers.get('x-user-id') || 'user_mock';
    const sessionId = id;

    // Get session
    const session = await chatDbService.getSession(sessionId, userId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get messages for this session
    const messages = await chatDbService.listMessages(sessionId, userId, 50);

    return NextResponse.json({
      success: true,
      data: {
        session,
        messages: messages.items,
      },
    });
  } catch (error) {
    console.error('Get session API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_SESSION_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}

// Update session
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    // TODO: Add authentication middleware
    const userId = request.headers.get('x-user-id') || 'user_mock';
    const sessionId = id;

    // Parse request body
    const body: UpdateSessionRequest = await request.json();

    // Update session
    const session = await chatDbService.updateSession(sessionId, userId, body);

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Update session API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_SESSION_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}

// Delete session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    // TODO: Add authentication middleware
    const userId = request.headers.get('x-user-id') || 'user_mock';
    const sessionId = id;

    // Delete session
    await chatDbService.deleteSession(sessionId, userId);

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Delete session API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_SESSION_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}
