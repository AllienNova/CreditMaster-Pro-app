/**
 * Gamification Achievements API
 * GET /api/gamification/achievements - List achievements with optional filters
 * POST /api/gamification/achievements - Award an achievement or update progress
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import {
  getAchievementService,
  type AchievementCategory,
  type BadgeTier,
  type AchievementStatus,
} from "@/lib/gamification";

// Restored from the state immediately before deletion (b6f6efe^), not from
// backup/pre-wipe. The backup copy was older and still used a bare
// supabase.auth.getUser() cookie read; the live version had already been moved
// onto withAuth. Restoring the backup silently reverted that, and eight other
// modules lost more than a comment — see docs/specs/deleted-feature-audit.md.
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as AchievementCategory | null;
    const tier = searchParams.get("tier") as BadgeTier | null;
    const status = searchParams.get("status") as AchievementStatus | null;
    const statsOnly = searchParams.get("stats") === "true";

    const service = getAchievementService();

    // If stats requested, return stats
    if (statsOnly) {
      const stats = await service.getStats(user.id);
      return NextResponse.json({ success: true, data: stats });
    }

    // Get user achievements with filters
    const achievements = await service.getUserAchievements(
      user.id,
      category ?? undefined,
      status ?? undefined,
    );

    // Apply tier filter if provided (service doesn't support tier filter on user achievements)
    const filtered = tier
      ? achievements.filter((a) => a.achievement.tier === tier)
      : achievements;

    return NextResponse.json({
      success: true,
      data: {
        achievements: filtered,
        total: filtered.length,
        filters: {
          category: category ?? "all",
          tier: tier ?? "all",
          status: status ?? "all",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (_request: NextRequest, _user: AuthedUser) => {
  // ───────────────────────────────────────────────────────────────────────
  //  DISABLED — this endpoint let any authenticated user mint achievements.
  //
  //  Every action took its input from the request body and wrote it straight
  //  through to user_achievements / xp_transactions with no server-side
  //  corroboration:
  //
  //    {"action":"award","achievementCode":"SAVINGS_100000"} -> granted
  //    {"action":"update_progress","progress":999}           -> accepted
  //    {"action":"check"|"batch_update","metrics":{...}}     -> attacker-set
  //
  //  So a user could award themselves any achievement and the XP attached to
  //  it. Same class as FND-016/017 — fabricated input treated as real — and it
  //  went live the moment this route was wired.
  //
  //  An achievement must be earned from a verified server-side event (a real
  //  debt payment, a real savings deposit) with metrics computed from the
  //  user's own rows, never from a number the client sent. That event path does
  //  not exist yet — see docs/specs/remediation-plan.md slice S1 — so the
  //  endpoint is closed rather than left exploitable.
  //
  //  The award/check/progress logic still lives in achievement-service.ts and
  //  is unit-tested; only the client-facing trigger is removed. The previous
  //  handler body is in git history at b1e993a if needed as a starting point.
  //
  //  GET is unaffected: it reads only the caller's own progress.
  // ───────────────────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "Achievements are awarded from verified server-side events, not from client requests.",
    },
    { status: 501 },
  );
});
