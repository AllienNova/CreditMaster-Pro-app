/**
 * AI Nudges API
 * GET /api/ai/nudges - Get unread nudges
 * POST /api/ai/nudges - Record nudge response
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getNudgeEngine } from "@/lib/ai-personalization";
import type { NudgeAction } from "@/lib/ai-personalization";

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

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
    try {
      const body = await request.json();
      const { nudgeId, action, feedback } = body;

      if (!nudgeId || !action) {
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
      if (!validActions.includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }

      const engine = getNudgeEngine();
      await engine.recordNudgeResponse(nudgeId, action, feedback);

      // Also mark as opened if not already
      await engine.markNudgeAsOpened(nudgeId);

      return NextResponse.json({ success: true });
    } catch (_error) {
      // NudgesRoute error: Failed to record response
      void _error;
      return NextResponse.json(
        { error: "Failed to record response" },
        { status: 500 },
      );
    }
  },
);
