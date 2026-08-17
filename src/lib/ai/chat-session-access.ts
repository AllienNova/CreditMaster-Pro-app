import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Does this caller own this chat session?
 *
 * WHY THIS IS SHARED AND WHY IT USES THE SERVICE-ROLE CLIENT.
 *
 * Three route handlers across two files needed the identical check, and each
 * had its own copy reading chat_sessions through `createClient()`. That client
 * is COOKIE-scoped (@supabase/ssr over next/headers), while chat_sessions is
 * under RLS with `auth.uid() = user_id` and `withAuth` accepts BEARER tokens.
 * For a bearer caller there is no cookie, so auth.uid() is NULL, the policy
 * matches nothing, `.single()` errors, and every copy reported that as
 * "Session not found".
 *
 * Measured, with a clean control — the same session id, the same token, one
 * route already converted and one not:
 *
 *   GET /api/chat/financial/sessions/:id            404 Session not found
 *   GET /api/chat/financial/sessions/:id/messages   200
 *
 * mobile-app/app/financial-intelligence/chat.tsx reads chat this way, so the
 * whole surface has been dead for every mobile user. The guard verified a JWT
 * while the data client looked for a cookie nobody sent.
 *
 * Ownership is therefore established in code against the JWT-verified user id.
 * That is a stronger guarantee than RLS-plus-cookie because it does not depend
 * on which transport the caller used — and it is the pattern the rest of this
 * codebase uses for privileged tables.
 *
 * @returns a NextResponse to return immediately (404 or 403), or null when the
 *          caller owns the session and the handler should proceed.
 */
export async function denyUnlessSessionOwned(
  sessionId: string,
  userId: string,
): Promise<NextResponse | null> {
  // idor-audit: pk-owner-checked — selects only user_id for the express purpose
  // of comparing it with the JWT-verified caller below; a mismatch is a 403 and
  // no other column is read.
  const { data: session, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: "Not found", message: "Session not found" },
      { status: 404 },
    );
  }

  if ((session as { user_id: string }).user_id !== userId) {
    return NextResponse.json(
      { error: "Forbidden", message: "Access denied to this session" },
      { status: 403 },
    );
  }

  return null;
}

/** Session ids are UUIDs; anything else cannot be one and is rejected early. */
export const SESSION_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
