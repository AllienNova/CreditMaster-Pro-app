/**
 * Financial Chat API - Individual Session Endpoint
 *
 * Phase 6.1.4: GET and DELETE endpoints for individual sessions
 * Handles retrieving session details and archiving sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import { FinancialChatEngine } from "@/lib/ai/financial-chat-engine";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The guard does not forward Next's route `params`; extract the id from the path.
function sessionIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() as string;
}

/**
 * GET /api/chat/financial/sessions/[id]
 * Get session details
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const sessionId = sessionIdFrom(request);

    // Validate session ID format (UUID)
    if (!UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid session ID format" },
        { status: 400 },
      );
    }

    // Get session from database
    const supabase = await createClient();
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Not found", message: "Session not found" },
        { status: 404 },
      );
    }

    // Type assertion needed due to Supabase type inference
    const sessionData = session as {
      id: string;
      user_id: string;
      created_at: string;
      updated_at: string;
      title?: string;
      metadata?: Record<string, unknown>;
      message_count?: number;
      last_message_at?: string;
    };

    // Verify session belongs to user (ownership check preserved)
    if (sessionData.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "Access denied to this session" },
        { status: 403 },
      );
    }

    // Map database session to response format
    const sessionResponse = {
      id: sessionData.id,
      userId: sessionData.user_id,
      createdAt: sessionData.created_at,
      updatedAt: sessionData.updated_at,
      title: sessionData.title,
      metadata: sessionData.metadata,
      messageCount: sessionData.message_count,
      lastMessageAt: sessionData.last_message_at,
    };

    return NextResponse.json({ session: sessionResponse }, { status: 200 });
  } catch (error: unknown) {
    console.error("Get session API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while fetching the session",
      },
      { status: 500 },
    );
  }
});

/**
 * DELETE /api/chat/financial/sessions/[id]
 * Archive a session
 */
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const sessionId = sessionIdFrom(request);

      // Validate session ID format (UUID)
      if (!UUID_REGEX.test(sessionId)) {
        return NextResponse.json(
          { error: "Validation error", message: "Invalid session ID format" },
          { status: 400 },
        );
      }

      // Verify session exists and belongs to user (ownership check preserved)
      const supabase = await createClient();
      const { data: session, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("user_id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: "Not found", message: "Session not found" },
          { status: 404 },
        );
      }

      // Type assertion needed due to Supabase type inference
      const sessionData = session as { user_id: string };
      if (sessionData.user_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden", message: "Access denied to this session" },
          { status: 403 },
        );
      }

      // Initialize chat engine and delete session
      const chatEngine = new FinancialChatEngine();
      await chatEngine.deleteSession(sessionId);

      return NextResponse.json(
        { message: "Session archived successfully" },
        { status: 200 },
      );
    } catch (error: unknown) {
      console.error("Delete session API error:", error);

      return NextResponse.json(
        {
          error: "Internal server error",
          message: "An error occurred while deleting the session",
        },
        { status: 500 },
      );
    }
  },
);
