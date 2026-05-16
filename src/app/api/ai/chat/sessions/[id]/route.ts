/**
 * Chat Session Detail API Endpoint
 *
 * GET /api/ai/chat/sessions/[id] - Get session by ID
 * PUT /api/ai/chat/sessions/[id] - Update session
 * DELETE /api/ai/chat/sessions/[id] - Delete session
 * PROTECTED: Requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { chatDbService } from "@/lib/ai/chat-db-service";
import type { UpdateSessionRequest } from "@/lib/ai/types/chat.types";

// The guard does not forward Next's route `params`; extract the id from the path.
function sessionIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() as string;
}

// Get session
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const sessionId = sessionIdFrom(request);

    // Get session
    const session = await chatDbService.getSession(sessionId, userId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
  } catch (_error) {
    // ChatSessionDetailRoute error: Failed to get session
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GET_SESSION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Unknown error occurred",
        },
      },
      { status: 500 },
    );
  }
});

// Update session
export const PUT = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const sessionId = sessionIdFrom(request);

    // Parse request body
    const body: UpdateSessionRequest = await request.json();

    // Update session
    const session = await chatDbService.updateSession(sessionId, userId, body);

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (_error) {
    // ChatSessionDetailRoute error: Failed to update session
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPDATE_SESSION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Unknown error occurred",
        },
      },
      { status: 500 },
    );
  }
});

// Delete session
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const userId = user.id;
      const sessionId = sessionIdFrom(request);

      // Delete session
      await chatDbService.deleteSession(sessionId, userId);

      return NextResponse.json({
        success: true,
        data: { deleted: true },
      });
    } catch (_error) {
      // ChatSessionDetailRoute error: Failed to delete session
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DELETE_SESSION_ERROR",
            message:
              _error instanceof Error
                ? _error.message
                : "Unknown error occurred",
          },
        },
        { status: 500 },
      );
    }
  },
);
