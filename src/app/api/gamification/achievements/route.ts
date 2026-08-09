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

// Restored 2026-08-09. It previously did a bare cookie-session read via
// supabase.auth.getUser(), which meant it accepted neither the Bearer tokens
// every other route takes nor the project's standard guard — audit:auth
// flagged it as "CSV requires withAuth but the route has an unwrapped HTTP
// verb". Now on withAuth like the other 304 routes.
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

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { action, achievementCode, metrics, achievementId, progress } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required (award, check, update_progress, batch_update)" },
        { status: 400 },
      );
    }

    const service = getAchievementService();

    switch (action) {
      case "award": {
        if (!achievementCode) {
          return NextResponse.json(
            { error: "achievementCode is required for award action" },
            { status: 400 },
          );
        }

        const result = await service.awardAchievement(user.id, achievementCode);

        if (!result.success) {
          const statusCode = result.alreadyEarned ? 409 : 400;
          return NextResponse.json(
            { error: result.error, alreadyEarned: result.alreadyEarned },
            { status: statusCode },
          );
        }

        // Create notification for awarded achievement
        if (result.achievement && result.xpEarned !== undefined) {
          await service.createNotification(
            user.id,
            result.achievement,
            result.xpEarned,
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            achievement: result.achievement,
            xpEarned: result.xpEarned,
          },
        });
      }

      case "check": {
        if (!metrics || typeof metrics !== "object") {
          return NextResponse.json(
            { error: "metrics object is required for check action" },
            { status: 400 },
          );
        }

        const results = await service.checkAchievements(user.id, metrics);
        const met = results.filter((r) => r.met);
        const unmet = results.filter((r) => !r.met);

        return NextResponse.json({
          success: true,
          data: {
            results,
            summary: {
              total: results.length,
              met: met.length,
              unmet: unmet.length,
            },
          },
        });
      }

      case "update_progress": {
        if (!achievementId && !achievementCode) {
          return NextResponse.json(
            { error: "achievementId or achievementCode is required for update_progress action" },
            { status: 400 },
          );
        }

        if (progress === undefined || typeof progress !== "number") {
          return NextResponse.json(
            { error: "progress (number) is required for update_progress action" },
            { status: 400 },
          );
        }

        let update;
        if (achievementCode) {
          update = await service.updateProgressByCode(
            user.id,
            achievementCode,
            progress,
          );
        } else {
          update = await service.updateProgress(
            user.id,
            achievementId,
            progress,
          );
        }

        return NextResponse.json({
          success: true,
          data: update,
        });
      }

      case "batch_update": {
        if (!metrics || typeof metrics !== "object") {
          return NextResponse.json(
            { error: "metrics object is required for batch_update action" },
            { status: 400 },
          );
        }

        const updates = await service.batchUpdateProgress(user.id, metrics);
        const completedUpdates = updates.filter((u) => u.completed);

        return NextResponse.json({
          success: true,
          data: {
            updates,
            summary: {
              total: updates.length,
              completed: completedUpdates.length,
            },
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: award, check, update_progress, batch_update` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error processing achievement action:", error);
    return NextResponse.json(
      { error: "Failed to process achievement action" },
      { status: 500 },
    );
  }
});
