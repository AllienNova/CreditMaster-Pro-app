/**
 * Financial Chat API - Sessions Endpoint
 *
 * Phase 6.1.4: GET and POST endpoints for chat sessions
 * Handles listing user sessions and creating new sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { FinancialChatEngine } from "@/lib/ai/financial-chat-engine";
import { CreateSessionRequest } from "@/lib/ai/types/financial-chat.types";

/**
 * GET /api/chat/financial/sessions
 * List user's chat sessions
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "limit must be between 1 and 100",
        },
        { status: 400 },
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: "Validation error", message: "offset must be non-negative" },
        { status: 400 },
      );
    }

    // Initialize chat engine
    const chatEngine = new FinancialChatEngine();

    // Get user sessions (scoped to the authenticated user)
    const sessions = await chatEngine.getUserSessions(user.id, limit);

    // Apply offset (simple pagination)
    const paginatedSessions = sessions.slice(offset, offset + limit);

    return NextResponse.json(
      {
        sessions: paginatedSessions,
        total: sessions.length,
        limit,
        offset,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Get sessions API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while fetching sessions",
      },
      { status: 500 },
    );
  }
});

/**
 * POST /api/chat/financial/sessions
 * Create a new chat session
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Parse and validate request body
    const body: CreateSessionRequest = await request.json();

    // Validate title if provided
    if (body.title && typeof body.title !== "string") {
      return NextResponse.json(
        { error: "Validation error", message: "title must be a string" },
        { status: 400 },
      );
    }

    if (body.title && body.title.length > 200) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "title cannot exceed 200 characters",
        },
        { status: 400 },
      );
    }

    // Initialize chat engine
    const chatEngine = new FinancialChatEngine();

    // Create session (owned by the authenticated user)
    const session = await chatEngine.createSession(user.id, body.title);

    return NextResponse.json(
      {
        session,
        message: "Session created successfully",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Create session API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while creating the session",
      },
      { status: 500 },
    );
  }
});
