/**
 * Gamification Leaderboard API
 * GET /api/gamification/leaderboard - Get leaderboard rankings
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import type { LeaderboardResponse } from "@/lib/gamification/types";

export type LeaderboardType =
  | "weekly_xp"
  | "monthly_xp"
  | "streak"
  | "challenge";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  isCurrentUser?: boolean;
}

/**
 * Re-exported from the canonical definition in @/lib/gamification/types.
 *
 * This route previously declared its OWN copy of the shape. Two interfaces for
 * one payload is the same hazard that let the dispute detail page ship broken:
 * the compiler happily checks each side against a different declaration, so a
 * field present in one and absent in the other is invisible until runtime.
 */
export type { LeaderboardResponse } from "@/lib/gamification/types";

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfWeek.toISOString(),
    end: endOfWeek.toISOString(),
  };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  return {
    start: startOfMonth.toISOString(),
    end: endOfMonth.toISOString(),
  };
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Get leaderboard type from query params
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "weekly_xp") as LeaderboardType;

    if (!["weekly_xp", "monthly_xp", "streak", "challenge"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid leaderboard type" },
        { status: 400 },
      );
    }

    // Get period range based on type
    const period = type === "monthly_xp" ? getMonthRange() : getWeekRange();

    // Reads the real leaderboard_snapshots table.
    //
    // This block used to build the entire response from MOCK_LEADERBOARD plus
    // `Math.floor(Math.random() * 50) + 10` for the caller's own rank and a
    // percentile computed against a hardcoded "totalUsers = 100". The user was
    // shown a competitive standing that was invented on each request — a
    // different rank every refresh, all of it presented as fact.
    //
    // leaderboard_snapshots exists for precisely this (leaderboard_type,
    // period_start, period_end, rankings jsonb) and is currently unpopulated:
    // no job writes it yet. An empty leaderboard is the truthful answer until
    // one does. `pending` tells the client to render "not ranked yet" rather
    // than a zero that looks like last place.
    const { data: snapshot, error: snapshotError } = await getServiceRoleClient()
      .from("leaderboard_snapshots")
      // idor-audit: cross-user — a leaderboard is a ranking ACROSS users; that is the feature
      .select("rankings")
      .eq("leaderboard_type", type)
      .gte("period_end", period.start)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // A read failure is NOT an empty leaderboard. Leaving `error` unchecked
    // meant a database outage produced null data, which fell through to
    // `pending: true` and rendered as the cheerful "not ranked yet — earn XP"
    // empty state. Users would read that as "my XP was never counted" and
    // support would get no signal at all. Degrade loudly instead.
    if (snapshotError) {
      console.error("Leaderboard snapshot read failed:", snapshotError);
      return NextResponse.json(
        { error: "Leaderboard temporarily unavailable" },
        { status: 503 },
      );
    }

    const rankings: LeaderboardEntry[] = Array.isArray(snapshot?.rankings)
      ? (snapshot!.rankings as LeaderboardEntry[])
      : [];

    const entries = rankings.map((entry) => ({
      ...entry,
      isCurrentUser: entry.userId === user.id,
    }));

    const mine = entries.find((e) => e.isCurrentUser);
    const userRank = mine?.rank;

    // The denominator is the snapshot's own row count, which is only a valid
    // population size if the snapshot holds EVERY ranked user. No job writes
    // this table yet, so that contract is being set here rather than
    // discovered later: a writer that stores only a top-N would give a user
    // ranked below N a rank greater than entries.length and this would emit a
    // NEGATIVE percentile straight to the UI. The guard makes that case return
    // no percentile instead of a wrong one — a missing number is honest, a
    // negative percentile is not.
    const rankIsWithinSnapshot =
      userRank !== undefined && userRank >= 1 && userRank <= entries.length;
    const userPercentile = rankIsWithinSnapshot
      ? Math.round(((entries.length - userRank!) / entries.length) * 100)
      : undefined;

    const response: LeaderboardResponse = {
      type,
      periodStart: period.start,
      periodEnd: period.end,
      entries: entries.slice(0, 10),
      userRank,
      userPercentile,
      pending: entries.length === 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
});
