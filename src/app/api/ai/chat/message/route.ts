/**
 * Chat Message API Endpoint
 *
 * POST /api/ai/chat/message - Send a message in a chat session
 * PROTECTED: Requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChatEngine } from "@/lib/ai/chat-engine";
import type { SendMessageRequest } from "@/lib/ai/types/chat.types";

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
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Parse request body
    const body: SendMessageRequest = await request.json();

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    // Get chat engine
    const chatEngine = getChatEngine();

    // Send message
    const response = await chatEngine.sendMessage(userId, body, {
      stream: body.stream || false,
      executeAction: body.executeAction || false,
      includeContext: true,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Chat message API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CHAT_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      },
      { status: 500 },
    );
  }
}
