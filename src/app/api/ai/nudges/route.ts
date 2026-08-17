/**
 * AI Nudges API
 * GET /api/ai/nudges - Get unread nudges
 * POST /api/ai/nudges - Record nudge response
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getNudgeEngine } from "@/lib/ai-personalization";
import type { NudgeAction } from "@/lib/ai-personalization";

/** A note attached to a nudge response; it lands in nudge_history.context. */
const MAX_FEEDBACK_LENGTH = 1000;

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const engine = getNudgeEngine();
      const unreadNudges = await engine.getUnreadNudges(user.id);

      return NextResponse.json({ nudges: unreadNudges });
    } catch (_error) {
      // NudgesRoute error: Failed to fetch nudges
      void _error;
      return NextResponse.json(
        { error: "Failed to fetch nudges" },
        { status: 500 },
      );
    }
  },
);

/**
 * POST /api/ai/nudges — record what the caller did with one of THEIR nudges.
 *
 * The handler used to take `_user` and never use it, passing the caller's
 * nudgeId straight to an engine that filtered on `.eq("id", nudgeId)` alone.
 * Any authenticated user could stamp action_taken, and arbitrary feedback text
 * into the context jsonb, on any other user's nudge_history row. Both engine
 * methods now require the owner's id and this passes user.id.
 */
export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    let body: { nudgeId?: unknown; action?: unknown; feedback?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { nudgeId, action, feedback } = body;

    if (typeof nudgeId !== "string" || !nudgeId || typeof action !== "string") {
      return NextResponse.json(
        { error: "Nudge ID and action required" },
        { status: 400 },
      );
    }

    const validActions: NudgeAction[] = [
      "accepted",
      "dismissed",
      "snoozed",
      "ignored",
    ];
    if (!validActions.includes(action as NudgeAction)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Free text landing in a jsonb column: bound it rather than accept a
    // caller-sized payload.
    if (feedback !== undefined && typeof feedback !== "string") {
      return NextResponse.json(
        { error: "feedback must be a string" },
        { status: 400 },
      );
    }
    if (typeof feedback === "string" && feedback.length > MAX_FEEDBACK_LENGTH) {
      return NextResponse.json({ error: "feedback is too long" }, { status: 400 });
    }

    try {
      const engine = getNudgeEngine();
      const recorded = await engine.recordNudgeResponse(
        user.id,
        nudgeId,
        action as NudgeAction,
        feedback as string | undefined,
      );

      if (!recorded) {
        // 404 for "no such nudge" and "not yours" alike — distinguishing them
        // would confirm another user's nudge exists to anyone probing uuids.
        return NextResponse.json({ error: "Nudge not found" }, { status: 404 });
      }

      // Responding to a nudge implies having seen it.
      await engine.markNudgeAsOpened(user.id, nudgeId);

      return NextResponse.json({ success: true });
    } catch (error) {
      // Never a false success: the mobile hook removes the nudge from the list
      // optimistically, so a swallowed failure means it returns on next launch
      // with no record of the answer.
      console.error("Failed to record nudge response:", error);
      return NextResponse.json(
        { error: "Failed to record response" },
        { status: 500 },
      );
    }
  },
);
