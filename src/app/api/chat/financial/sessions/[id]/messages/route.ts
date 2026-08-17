/**
 * Financial Chat API - Session Messages Endpoint
 *
 * GET reads a session's message history. POST sends a message and returns both
 * the persisted user message and the assistant's reply.
 *
 * WHY POST EXISTS NOW. This module exported GET alone, so `useSendChatMessage`
 * in src/hooks/use-chat-queries.ts POSTed here and Next.js answered 405 — every
 * send, for every user, since the chat shipped. No gate noticed: audit:web-api
 * only checked that a handler file existed at the path. It checks the verb now,
 * which is how this was found.
 *
 * AND THE READ WAS BROKEN TOO, which I only learned by trying to verify the new
 * POST against a session I had just created. Both handlers answered "Session not
 * found" for a session that provably existed, because the ownership check used a
 * cookie-scoped client against an RLS policy of `auth.uid() = user_id` while the
 * caller authenticated with a bearer token. The check now lives in
 * src/lib/ai/chat-session-access.ts, shared with the sibling route that had the
 * same defect. My
 * first draft of this comment claimed "reading worked"; it did not, for any
 * bearer-token client, which is every mobile user.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { FinancialChatEngine } from "@/lib/ai/financial-chat-engine";
import { MessageRole } from "@/lib/ai/types/financial-chat.types";
import {
  denyUnlessSessionOwned,
  SESSION_UUID_REGEX,
} from "@/lib/ai/chat-session-access";

/**
 * A chat turn goes to a language model, so its length is a cost and a prompt
 * surface, not just a column width. 4,000 characters is a long question and a
 * short essay; anything past it is a document, which this endpoint is not for.
 */
const MAX_MESSAGE_CHARS = 4000;


/**
 * GET /api/chat/financial/sessions/[id]/messages
 * Get session message history
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // The guard does not forward Next's route `params`; the path ends in
    // /sessions/[id]/messages, so the id is the second-to-last segment.
    const segments = request.nextUrl.pathname.split("/");
    const sessionId = segments[segments.length - 2];

    // Validate session ID format (UUID)
    if (!SESSION_UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid session ID format" },
        { status: 400 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const beforeTimestamp = searchParams.get("beforeTimestamp");

    // Validate parameters
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "limit must be between 1 and 200",
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

    // Same ownership check POST uses, and the same 404/403 contract as before —
    // now via the shared helper, so the cookie-versus-bearer fix documented
    // there applies to reads too. This inline copy was the bug: it 404'd every
    // real session for any bearer-token caller, mobile included.
    const denied = await denyUnlessSessionOwned(sessionId, user.id);
    if (denied) return denied;

    // Initialize chat engine
    const chatEngine = new FinancialChatEngine();

    // Get session history
    const messages = await chatEngine.getSessionHistory(
      sessionId,
      limit + offset,
    );

    // Apply offset and limit
    const paginatedMessages = messages.slice(offset, offset + limit);

    // Filter by beforeTimestamp if provided
    let filteredMessages = paginatedMessages;
    if (beforeTimestamp) {
      const beforeDate = new Date(beforeTimestamp);
      if (isNaN(beforeDate.getTime())) {
        return NextResponse.json(
          {
            error: "Validation error",
            message: "Invalid beforeTimestamp format",
          },
          { status: 400 },
        );
      }
      filteredMessages = paginatedMessages.filter(
        (msg) => msg.timestamp < beforeDate,
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
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Get messages API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while fetching messages",
      },
      { status: 500 },
    );
  }
});

/**
 * POST /api/chat/financial/sessions/[id]/messages
 * Send a message and get the assistant's reply.
 *
 * WHAT IT RETURNS AND WHY. useSendChatMessage does an optimistic update: it
 * appends a temporary user message immediately, then reconciles against the
 * server. So it needs BOTH persisted rows back — the real user message (to
 * replace its optimistic stand-in, with the real id and timestamp) and the
 * assistant's reply (to append). `{ userMessage, assistantMessage }` is the
 * shape the hook already reads.
 *
 * The engine's sendMessage() persists both but returns neither — it answers a
 * ChatResponse carrying the reply TEXT plus intent and metadata. So the two rows
 * are read back after the call. Deliberately read straight from chat_messages
 * rather than through getSessionHistory(): that method's cache branch returns
 * `cached.slice(0, limit)` with no `.reverse()`, while its database branch
 * reverses — so which end of the array is "most recent" depends on whether the
 * cache is warm. Ordering that changes with cache state is not something to
 * build a reply on.
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const segments = request.nextUrl.pathname.split("/");
    const sessionId = segments[segments.length - 2];

    if (!SESSION_UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid session ID format" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Validation error", message: "Body must be valid JSON" },
        { status: 400 },
      );
    }

    const content = (body as { content?: unknown })?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "content is required and must be a non-empty string",
        },
        { status: 400 },
      );
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `content must be ${MAX_MESSAGE_CHARS} characters or fewer`,
        },
        { status: 400 },
      );
    }

    // Ownership BEFORE the engine call: sendMessage() writes rows and bills a
    // model call, so it must not run for a session the caller does not own.
    const denied = await denyUnlessSessionOwned(sessionId, user.id);
    if (denied) return denied;

    const chatEngine = new FinancialChatEngine();
    const response = await chatEngine.sendMessage(sessionId, content.trim());

    // Read back the two rows sendMessage just wrote. Service role, for the
    // same cookie-versus-bearer reason as the ownership check above.
    const { data: recent, error: readError } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: false })
      .limit(2);

    if (readError) {
      // The message WAS sent and the reply WAS stored — only reading them back
      // failed. Saying "failed to send" would be false and would invite the
      // user to send it again, duplicating the turn. Report the reply text we
      // hold and tell the client to refetch.
      console.error("Send message read-back failed:", readError);
      return NextResponse.json(
        {
          sent: true,
          reply: response.message,
          warning:
            "Your message was sent and answered, but the stored copies could not be read back. Refresh to see the full conversation.",
        },
        { status: 200 },
      );
    }

    const rows = (recent ?? []) as Array<{
      id: string;
      session_id: string;
      role: string;
      content: string;
      timestamp: string;
      metadata: Record<string, unknown> | null;
    }>;

    const toMessage = (r: (typeof rows)[number]) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
      metadata: r.metadata ?? undefined,
    });

    // Identified by ROLE, not by position — position assumes the assistant row
    // sorted after the user row, and two rows written in the same millisecond
    // have no guaranteed order under `timestamp`.
    const assistantRow = rows.find((r) => r.role === MessageRole.ASSISTANT);
    const userRow = rows.find((r) => r.role === MessageRole.USER);

    return NextResponse.json(
      {
        userMessage: userRow ? toMessage(userRow) : null,
        assistantMessage: assistantRow ? toMessage(assistantRow) : null,
        intent: response.intent,
        suggestedActions: response.suggestedActions,
        educationalContent: response.educationalContent,
        // Financial advice ships with a disclaimer or it should not ship. The
        // engine generates one; dropping it here because the client's current
        // type has no field for it would be the wrong way round.
        disclaimer: response.metadata?.disclaimer,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Send message API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while sending the message",
      },
      { status: 500 },
    );
  }
});
