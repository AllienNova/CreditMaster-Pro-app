/**
 * Individual Financial Goal API - Phase 1.5
 *
 * GET /api/financial/goals/[id] - Get specific goal with detailed progress
 * PATCH /api/financial/goals/[id] - Update goal properties
 * DELETE /api/financial/goals/[id] - Delete goal (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { goalTracker } from "@/lib/financial/goal-tracker";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();

// Zod validation schema for PATCH
const updateGoalSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z
    .string()
    .refine((date) => {
      const targetDate = new Date(date);
      return targetDate > new Date();
    }, "Target date must be in the future")
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed", "paused", "cancelled"]).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/financial/goals/[id]
 * Retrieve specific goal with detailed progress metrics
 */
export const GET = withPermission(
  // READ permission for a read. Was "financial:create_goals", which the `user`
  // role does not hold (rbac.ts:106-119 — it starts at premium, :156), so every
  // standard user got 403 "Missing required permission: financial:create_goals"
  // when opening a goal they own. Creating a goal is a premium gate; reading one
  // you already own is not.
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {

    const goalId = request.nextUrl.pathname.split("/").pop() as string;

    // Fetch goal from database
    const { data: goal, error } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (error || !goal) {
      return NextResponse.json(
        {
          success: false,
          error: "Goal not found",
        },
        { status: 404 },
      );
    }

    // Calculate comprehensive progress metrics
    const progress = await goalTracker.calculateProgressMetrics(userId, goalId);
    const recommendations = await goalTracker.getGoalRecommendations(
      userId,
      goalId,
    );
    const history = await goalTracker.getProgressHistory(userId, goalId);

    return NextResponse.json({
      success: true,
      data: {
        id: goal.id,
        type: goal.type,
        name: goal.name,
        description: goal.description,
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount,
        targetDate: goal.target_date,
        status: goal.status,
        priority: goal.priority,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
        progress: progress
          ? {
              percentage: progress.progressPercentage,
              velocity: progress.velocity,
              performance: progress.performanceScore,
              predictions: progress.predictions,
              risks: progress.risks,
            }
          : null,
        recommendations: recommendations.map((rec) => ({
          type: rec.type,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          expectedImpact: rec.expectedImpact,
        })),
        history: history.map((h) => ({
          date: h.date,
          amount: h.amount,
          progress: h.progressPercentage,
        })),
      },
    });
  } catch (_error) {
    // FinancialGoalsRoute error: Failed to fetch goal

    const errorMessage =
      _error instanceof Error ? _error.message : "Failed to fetch goal";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
},
);

/**
 * PATCH /api/financial/goals/[id]
 * Update goal properties (partial updates)
 */
export const PATCH = withPermission(
  // Editing a goal you already own is a write, not a create. Same 403 as GET
  // above for every `user`-role account.
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {

    const goalId = request.nextUrl.pathname.split("/").pop() as string;

    // Verify goal ownership
    const { data: existingGoal, error: fetchError } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingGoal) {
      return NextResponse.json(
        {
          success: false,
          error: "Goal not found",
        },
        { status: 404 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateGoalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const updates = validationResult.data;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.targetAmount !== undefined)
      updateData.target_amount = updates.targetAmount;
    if (updates.currentAmount !== undefined)
      updateData.current_amount = updates.currentAmount;
    if (updates.targetDate !== undefined)
      updateData.target_date = updates.targetDate;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;

    // Update goal in database
    const { data: updatedGoal, error: updateError } = await supabase
      .from("financial_goals")
      .update(updateData)
      .eq("id", goalId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // If currentAmount was updated, update progress
    if (updates.currentAmount !== undefined) {
      await goalTracker.updateGoalProgress(
        userId,
        goalId,
        updates.currentAmount,
      );
    }

    // Calculate updated progress metrics
    const progress = await goalTracker.calculateProgressMetrics(userId, goalId);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedGoal.id,
        type: updatedGoal.type,
        name: updatedGoal.name,
        description: updatedGoal.description,
        targetAmount: updatedGoal.target_amount,
        currentAmount: updatedGoal.current_amount,
        targetDate: updatedGoal.target_date,
        status: updatedGoal.status,
        priority: updatedGoal.priority,
        createdAt: updatedGoal.created_at,
        updatedAt: updatedGoal.updated_at,
        progress: progress
          ? {
              percentage: progress.progressPercentage,
              velocity: progress.velocity.monthlyVelocity,
              performanceGrade: progress.performanceScore.grade,
              onTrack:
                progress.performanceScore.status === "on_track" ||
                progress.performanceScore.status === "ahead",
            }
          : null,
      },
      message: "Goal updated successfully",
    });
  } catch (_error) {
    // FinancialGoalsRoute error: Failed to update goal

    const errorMessage =
      _error instanceof Error ? _error.message : "Failed to update goal";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
},
);

/**
 * DELETE /api/financial/goals/[id]
 * Delete goal (soft delete by setting status to 'cancelled')
 */
export const DELETE = withPermission(
  // Gating deletion on the PREMIUM create permission meant a user who created
  // goals on premium and then downgraded could no longer remove their own data —
  // the one operation that must never be paywalled.
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {

    const goalId = request.nextUrl.pathname.split("/").pop() as string;

    // Verify goal ownership
    const { data: existingGoal, error: fetchError } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingGoal) {
      return NextResponse.json(
        {
          success: false,
          error: "Goal not found",
        },
        { status: 404 },
      );
    }

    // Soft delete using goal tracker
    await goalTracker.deleteGoal(userId, goalId);

    return NextResponse.json({
      success: true,
      message: "Goal deleted successfully",
      _meta: {
        deletedAt: new Date().toISOString(),
        goalId,
      },
    });
  } catch (_error) {
    // FinancialGoalsRoute error: Failed to delete goal

    const errorMessage =
      _error instanceof Error ? _error.message : "Failed to delete goal";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
},
);
