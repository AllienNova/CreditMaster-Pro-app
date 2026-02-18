/**
 * Gamification Leaderboard API
 * GET /api/gamification/leaderboard - Get leaderboard rankings
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export interface LeaderboardResponse {
  type: LeaderboardType;
  periodStart: string;
  periodEnd: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  userPercentile?: number;
}

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get mock entries and mark current user
    const entries = MOCK_LEADERBOARD[type].map((entry) => ({
      ...entry,
      isCurrentUser: false,
    }));

    // Simulate current user being on the leaderboard
    // In production, this would query the database
    const mockUserRank = Math.floor(Math.random() * 50) + 10;
    const mockUserValue =
      type === "streak" ? 14 : Math.floor(Math.random() * 1000) + 500;

    // Add current user if not in top 10
    if (mockUserRank > 10) {
      entries.push({
        rank: mockUserRank,
        userId: user.id,
        displayName: "You",
        value: mockUserValue,
        isCurrentUser: true,
      });
    } else {
      // Mark one of the existing entries as current user for demo
      entries[mockUserRank - 1].isCurrentUser = true;
    }

    // Calculate percentile
    const totalUsers = 100; // Mock total users
    const userPercentile = ((totalUsers - mockUserRank) / totalUsers) * 100;

    const response: LeaderboardResponse = {
      type,
      periodStart: period.start,
      periodEnd: period.end,
      entries: entries.slice(0, 11), // Return top 10 + current user if needed
      userRank: mockUserRank,
      userPercentile: Math.round(userPercentile),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
