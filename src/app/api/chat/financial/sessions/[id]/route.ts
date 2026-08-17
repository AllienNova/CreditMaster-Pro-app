/**
 * Financial Chat API - Individual Session Endpoint
 *
 * GET reads a session, PATCH renames one, DELETE archives one.
 *
 * TWO FIXES LANDED HERE.
 *
 * 1. PATCH did not exist. useUpdateChatSession (src/hooks/use-chat-queries.ts:311)
 *    has always sent one, and Next.js has always answered 405, so a chat session
 *    could never be renamed. FinancialChatEngine.updateSession() was already
 *    there; only the wrapper was missing.
 *
 * 2. GET and DELETE could not see their own table. Both read chat_sessions
 *    through the COOKIE-scoped `createClient()` while chat_sessions is under RLS
 *    with `auth.uid() = user_id` and `withAuth` accepts BEARER tokens. For a
 *    bearer caller auth.uid() is NULL, the policy matches nothing, and both
 *    handlers reported "Session not found" for sessions that exist. Measured
 *    with a control — same session, same token, sibling route already fixed:
 *
 *      GET /api/chat/financial/sessions/:id            404
 *      GET /api/chat/financial/sessions/:id/messages   200
 *
 *    Ownership now goes through denyUnlessSessionOwned(), which establishes it
 *    in code against the JWT-verified user id. See src/lib/ai/chat-session-access.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { FinancialChatEngine } from "@/lib/ai/financial-chat-engine";
import {
  denyUnlessSessionOwned,
  SESSION_UUID_REGEX,
} from "@/lib/ai/chat-session-access";

/** Longest a session title may be. Titles are list-row labels, not content. */
const MAX_TITLE_CHARS = 200;

// The guard does not forward Next's route `params`; extract the id from the path.
function sessionIdFrom(request: NextRequest): string {
  return request.nextUrl.pathname.split("/").pop() as string;
}

function invalidId(): NextResponse {
  return NextResponse.json(
    { error: "Validation error", message: "Invalid session ID format" },
    { status: 400 },
  );
}

/**
 * GET /api/chat/financial/sessions/[id]
 * Get session details
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const sessionId = sessionIdFrom(request);
    if (!SESSION_UUID_REGEX.test(sessionId)) return invalidId();

    const denied = await denyUnlessSessionOwned(sessionId, user.id);
    if (denied) return denied;

    // Ownership is settled above; this read is for the response body.
    // idor-audit: pk-owner-checked — denyUnlessSessionOwned() has already
    // returned 403 unless this row's user_id equals the authenticated caller.
    const { data: session, error: sessionError } = await supabaseAdmin
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
 * PATCH /api/chat/financial/sessions/[id]
 * Rename a session.
 *
 * The client sends `{ title }` and reads a ChatSession back
 * (use-chat-queries.ts:304-324); engine.updateSession() takes `{ title }` and
 * returns a ChatSession. The two agree, which is why this one is a genuine
 * missing handler rather than the contract drift that blocks the other verb
 * mismatches in scripts/web-api-baseline.json.
 *
 * `metadata` is deliberately NOT accepted from the request. updateSession()
 * spreads whatever it is given straight into the row, so taking it from the
 * body would let a caller write arbitrary JSON into a session it happens to
 * own. Renaming is what the client asks for and all this handler grants.
 */
export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const sessionId = sessionIdFrom(request);
      if (!SESSION_UUID_REGEX.test(sessionId)) return invalidId();

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Validation error", message: "Body must be valid JSON" },
          { status: 400 },
        );
      }

      const title = (body as { title?: unknown })?.title;
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          {
            error: "Validation error",
            message: "title is required and must be a non-empty string",
          },
          { status: 400 },
        );
      }
      if (title.length > MAX_TITLE_CHARS) {
        return NextResponse.json(
          {
            error: "Validation error",
            message: `title must be ${MAX_TITLE_CHARS} characters or fewer`,
          },
          { status: 400 },
        );
      }

      // Before the write, not after.
      const denied = await denyUnlessSessionOwned(sessionId, user.id);
      if (denied) return denied;

      const chatEngine = new FinancialChatEngine();
      const session = await chatEngine.updateSession(sessionId, {
        title: title.trim(),
      });

      return NextResponse.json(session, { status: 200 });
    } catch (error: unknown) {
      console.error("Update session API error:", error);

      return NextResponse.json(
        {
          error: "Internal server error",
          message: "An error occurred while updating the session",
        },
        { status: 500 },
      );
    }
  },
);

/**
 * DELETE /api/chat/financial/sessions/[id]
 * Archive a session
 */
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const sessionId = sessionIdFrom(request);
      if (!SESSION_UUID_REGEX.test(sessionId)) return invalidId();

      const denied = await denyUnlessSessionOwned(sessionId, user.id);
      if (denied) return denied;

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
