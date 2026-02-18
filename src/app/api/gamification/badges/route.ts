/**
 * Gamification Badges API
 * GET /api/gamification/badges - Get user's badges
 * POST /api/gamification/badges - Award a badge
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGamificationEngine } from "@/lib/gamification";
import type { BadgesResponse, BadgeCategory } from "@/lib/gamification";

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

    const engine = getGamificationEngine();
    const { earned, inProgress, locked } = await engine.getUserBadges(user.id);

    // Calculate stats by category
    const byCategory: Record<BadgeCategory, number> = {
      savings: 0,
      debt: 0,
      budget: 0,
      credit: 0,
      investing: 0,
      trading: 0,
      streak: 0,
      community: 0,
      special: 0,
      tax: 0,
    };

    for (const badge of earned) {
      byCategory[badge.category]++;
    }

    const response: BadgesResponse = {
      earned: earned.map((b) => ({
        id: "",
        badgeId: b.id,
        badge: b,
        earnedAt: new Date().toISOString(),
        progress: 100,
        isPinned: false,
        userId: user.id,
      })),
      inProgress: inProgress.map((b) => ({
        id: "",
        userId: user.id,
        badgeId: b.id,
        currentValue: 0,
        targetValue: 100,
        progressPercent: 50,
        lastUpdated: new Date().toISOString(),
        badge: b,
      })),
      locked,
      stats: {
        totalEarned: earned.length,
        totalAvailable: earned.length + inProgress.length + locked.length,
        byCategory,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { badgeCode } = body;

    if (!badgeCode) {
      return NextResponse.json(
        { error: "Badge code required" },
        { status: 400 },
      );
    }

    const engine = getGamificationEngine();
    const result = await engine.awardBadge(user.id, badgeCode);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      badge: result.badge,
    });
  } catch (error) {
    console.error("Error awarding badge:", error);
    return NextResponse.json(
      { error: "Failed to award badge" },
      { status: 500 },
    );
  }
}
