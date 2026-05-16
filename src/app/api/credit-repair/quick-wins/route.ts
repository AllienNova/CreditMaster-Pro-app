/**
 * Quick Wins API Route
 *
 * GET /api/credit-repair/quick-wins - Get 30-day quick win actions
 *
 * Features:
 * - Database integration
 * - Authentication required
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { creditRepairService } from "@/lib/credit-repair";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";
import type { ActionType } from "@/lib/credit-repair/db/types";

const QUICK_WIN_ACTION_MAP: Record<string, ActionType> = {
  pay_down_utilization: "pay_down_utilization",
  remove_inquiries: "remove_inquiry",
  dispute_errors: "dispute_inaccuracy",
  optimize_payment_timing: "optimize_payment_timing",
};

const mapQuickWinToActionType = (id: string): ActionType =>
  QUICK_WIN_ACTION_MAP[id] ?? "other";

/**
 * GET /api/credit-repair/quick-wins
 * Get 30-day quick win actions from database or calculate new ones
 */
export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    // 2. Get quick wins from service
    const quickWins = await creditRepairService.getQuickWins(user.id);

    // 3. Save actions to database if they don't exist
    for (const quickWin of quickWins) {
      // Check if action already exists
      const existingActions = await db.creditRepair.getActions(user.id, {
        status: "pending",
        limit: 100,
      });

      const exists = existingActions.some(
        (action) =>
          typeof action.actionData?.description === "string" &&
          action.actionData.description === quickWin.description,
      );

      if (!exists) {
        const actionType = mapQuickWinToActionType(quickWin.id);

        // Create new action
        await db.creditRepair.createAction({
          userId: user.id,
          actionType,
          actionData: {
            title: quickWin.title,
            description: quickWin.description,
            steps: quickWin.steps,
            successRate: quickWin.successRate,
            cost: quickWin.cost,
          },
          status: "pending",
          impact: quickWin.impact,
          timeline: quickWin.timeline,
          successRate: quickWin.successRate,
        });
      }
    }

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "get_quick_wins",
      input: { userId: user.id },
      output: { actionCount: quickWins.length },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: quickWins,
    });
  } catch (error) {
    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: "api_error",
        message: `Failed to get quick wins: ${(error as Error).message}`,
        severity: "medium",
      });
    } catch (_auditError) {
      // Audit error silently caught
    }

    return NextResponse.json(
      { error: "Failed to get quick wins" },
      { status: 500 },
    );
  }
});
