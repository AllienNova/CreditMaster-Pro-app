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

// Mock leaderboard data for demonstration
const MOCK_LEADERBOARD: Record<LeaderboardType, LeaderboardEntry[]> = {
  weekly_xp: [
    { rank: 1, userId: "user_1", displayName: "FinanceWhiz", value: 2450 },
    { rank: 2, userId: "user_2", displayName: "BudgetBoss", value: 2100 },
    { rank: 3, userId: "user_3", displayName: "SavingsStar", value: 1890 },
    { rank: 4, userId: "user_4", displayName: "CreditKing", value: 1650 },
    { rank: 5, userId: "user_5", displayName: "DebtDestroyer", value: 1420 },
    { rank: 6, userId: "user_6", displayName: "InvestorPro", value: 1350 },
    { rank: 7, userId: "user_7", displayName: "WealthBuilder", value: 1200 },
    { rank: 8, userId: "user_8", displayName: "MoneyMaven", value: 1100 },
    { rank: 9, userId: "user_9", displayName: "FinanceFit", value: 980 },
    { rank: 10, userId: "user_10", displayName: "BudgetBuddy", value: 850 },
  ],
  monthly_xp: [
    { rank: 1, userId: "user_3", displayName: "SavingsStar", value: 8500 },
    { rank: 2, userId: "user_1", displayName: "FinanceWhiz", value: 7890 },
    { rank: 3, userId: "user_2", displayName: "BudgetBoss", value: 7200 },
    { rank: 4, userId: "user_5", displayName: "DebtDestroyer", value: 6800 },
    { rank: 5, userId: "user_4", displayName: "CreditKing", value: 6200 },
    { rank: 6, userId: "user_7", displayName: "WealthBuilder", value: 5500 },
    { rank: 7, userId: "user_6", displayName: "InvestorPro", value: 5100 },
    { rank: 8, userId: "user_8", displayName: "MoneyMaven", value: 4800 },
    { rank: 9, userId: "user_10", displayName: "BudgetBuddy", value: 4200 },
    { rank: 10, userId: "user_9", displayName: "FinanceFit", value: 3900 },
  ],
  streak: [
    { rank: 1, userId: "user_7", displayName: "WealthBuilder", value: 156 },
    { rank: 2, userId: "user_3", displayName: "SavingsStar", value: 98 },
    { rank: 3, userId: "user_1", displayName: "FinanceWhiz", value: 72 },
    { rank: 4, userId: "user_2", displayName: "BudgetBoss", value: 45 },
    { rank: 5, userId: "user_5", displayName: "DebtDestroyer", value: 38 },
    { rank: 6, userId: "user_4", displayName: "CreditKing", value: 30 },
    { rank: 7, userId: "user_8", displayName: "MoneyMaven", value: 21 },
    { rank: 8, userId: "user_6", displayName: "InvestorPro", value: 14 },
    { rank: 9, userId: "user_9", displayName: "FinanceFit", value: 10 },
    { rank: 10, userId: "user_10", displayName: "BudgetBuddy", value: 7 },
  ],
  challenge: [
    { rank: 1, userId: "user_5", displayName: "DebtDestroyer", value: 5 },
    { rank: 2, userId: "user_1", displayName: "FinanceWhiz", value: 4 },
    { rank: 3, userId: "user_3", displayName: "SavingsStar", value: 4 },
    { rank: 4, userId: "user_2", displayName: "BudgetBoss", value: 3 },
    { rank: 5, userId: "user_7", displayName: "WealthBuilder", value: 3 },
    { rank: 6, userId: "user_4", displayName: "CreditKing", value: 2 },
    { rank: 7, userId: "user_6", displayName: "InvestorPro", value: 2 },
    { rank: 8, userId: "user_8", displayName: "MoneyMaven", value: 1 },
    { rank: 9, userId: "user_9", displayName: "FinanceFit", value: 1 },
    { rank: 10, userId: "user_10", displayName: "BudgetBuddy", value: 0 },
  ],
};

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
    const { data: snapshot } = await getServiceRoleClient()
      .from("leaderboard_snapshots")
      // idor-audit: cross-user — a leaderboard is a ranking ACROSS users; that is the feature
      .select("rankings")
      .eq("leaderboard_type", type)
      .gte("period_end", period.start)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rankings: LeaderboardEntry[] = Array.isArray(snapshot?.rankings)
      ? (snapshot!.rankings as LeaderboardEntry[])
      : [];

    const entries = rankings.map((entry) => ({
      ...entry,
      isCurrentUser: entry.userId === user.id,
    }));

    const mine = entries.find((e) => e.isCurrentUser);
    const userRank = mine?.rank;
    const userPercentile =
      userRank !== undefined && entries.length > 0
        ? Math.round(((entries.length - userRank) / entries.length) * 100)
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
