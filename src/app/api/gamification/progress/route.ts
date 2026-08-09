/**
 * Gamification Progress API
 * GET /api/gamification/progress - Get user's gamification progress
 * POST /api/gamification/progress - Update streak (daily check-in)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getGamificationEngine } from "@/lib/gamification";
import type { GamificationProgressResponse } from "@/lib/gamification";

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const engine = getGamificationEngine();
    const progress = await engine.getUserProgress(user.id);

    if (!progress) {
      // Initialize progress for new user
      await engine.initializeUserProgress(user.id);
      const newProgress = await engine.getUserProgress(user.id);

      if (!newProgress) {
        return NextResponse.json(
          { error: "Failed to initialize progress" },
          { status: 500 },
        );
      }

      const response: GamificationProgressResponse = {
        xp: {
          current: newProgress.currentXp,
          toNextLevel: newProgress.xpToNextLevel,
          totalEarned: newProgress.totalXpEarned,
        },
        level: {
          current: newProgress.currentLevel,
          title: newProgress.levelInfo.title,
          progress: newProgress.levelProgress,
        },
        streak: {
          days: newProgress.currentStreak,
          multiplier: newProgress.streakMultiplier,
          longestStreak: newProgress.longestStreak,
        },
      };

      return NextResponse.json(response);
    }

    const response: GamificationProgressResponse = {
      xp: {
        current: progress.currentXp,
        toNextLevel: progress.xpToNextLevel,
        totalEarned: progress.totalXpEarned,
      },
      level: {
        current: progress.currentLevel,
        title: progress.levelInfo.title,
        progress: progress.levelProgress,
      },
      streak: {
        days: progress.currentStreak,
        multiplier: progress.streakMultiplier,
        longestStreak: progress.longestStreak,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching gamification progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
},
);

export const POST = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const engine = getGamificationEngine();

    // Update streak (daily check-in)
    const streakInfo = await engine.updateStreak(user.id);

    // Award daily login XP
    const xpResult = await engine.awardXp(
      user.id,
      10,
      "Daily login",
      "daily_login",
    );

    return NextResponse.json({
      streak: streakInfo,
      xpEarned: xpResult.xpEarned,
      levelUp: xpResult.levelUp,
      newLevel: xpResult.newLevel,
      newTitle: xpResult.newTitle,
    });
  } catch (error) {
    console.error("Error updating streak:", error);
    return NextResponse.json(
      { error: "Failed to update streak" },
      { status: 500 },
    );
  }
},
);
