/**
 * Financial Goals API - Phase 1.5
 *
 * GET /api/financial/goals - Get all goals for authenticated user
 * POST /api/financial/goals - Create a new financial goal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { goalTracker } from "@/lib/financial/goal-tracker";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();
import type { GoalType } from "@/lib/financial/types/ai-coach.types";

// Zod validation schemas
const createGoalSchema = z.object({
  type: z.string().min(1, "Goal type is required"),
  name: z
    .string()
    .min(1, "Goal name is required")
    .max(200, "Goal name too long"),
  targetAmount: z.number().positive("Target amount must be positive"),
  targetDate: z.string().refine((date) => {
    const targetDate = new Date(date);
    return targetDate > new Date();
  }, "Target date must be in the future"),
  priority: z
    .enum(["low", "medium", "high", "urgent"])
    .optional()
    .default("medium"),
  description: z.string().max(1000, "Description too long").optional(),
  currentAmount: z
    .number()
    .min(0, "Current amount cannot be negative")
    .optional()
    .default(0),
});

export const GET = withPermission(
  "financial:create_goals",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {

    const searchParams = request.nextUrl.searchParams;

    // Parse filter parameters
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("type");
    const priorityFilter = searchParams.get("priority");

    // Build query
    let query = supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }
    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }
    if (priorityFilter) {
      query = query.gte("priority", priorityFilter);
    }

    const { data: goals, error } = await query;

    if (error) {
      throw error;
    }

    // Enrich goals with progress metrics
    const enrichedGoals = await Promise.all(
      (goals || []).map(async (goal) => {
        try {
          const progress = await goalTracker.calculateProgressMetrics(
            userId,
            goal.id,
          );
          return {
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
            progress: progress
              ? {
                  percentage: progress.progressPercentage,
                  velocity: progress.velocity.monthlyVelocity,
                  performanceGrade: progress.performanceScore.grade,
                  onTrack:
                    progress.performanceScore.status === "on_track" ||
                    progress.performanceScore.status === "ahead",
                  estimatedCompletion:
                    progress.predictions.projectedCompletionDate,
                }
              : null,
          };
        } catch (err) {
          // If progress calculation fails, return basic goal info
          return {
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
          };
        }
      }),
    );

    return NextResponse.json({
      success: true,
      data: enrichedGoals,
      _meta: {
        count: enrichedGoals.length,
        filters: {
          status: statusFilter,
          type: typeFilter,
          priority: priorityFilter,
        },
      },
    });
  } catch (_error) {
    // FinancialGoalsRoute error: Failed to fetch goals

    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to fetch financial goals";

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

export const POST = withPermission(
  "financial:create_goals",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    // Parse and validate request body
    const body = await request.json();
    const validationResult = createGoalSchema.safeParse(body);

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

    const goalData = validationResult.data;

    // Create goal using goal tracker
    const goal = await goalTracker.createGoal(userId, {
      type: goalData.type as GoalType,
      name: goalData.name,
      targetAmount: goalData.targetAmount,
      targetDate: new Date(goalData.targetDate),
      description: goalData.description,
    });

    // Calculate initial progress metrics
    const progress = await goalTracker.calculateProgressMetrics(
      userId,
      goal.id,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: goal.id,
          type: goal.type,
          name: goal.name,
          description: goal.description,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
          status: goal.status,
          priority: goal.priority,
          createdAt: goal.createdAt,
          progress: progress
            ? {
                percentage: progress.progressPercentage,
                velocity: progress.velocity.monthlyVelocity,
                performanceGrade: progress.performanceScore.grade,
                onTrack:
                  progress.performanceScore.status === "on_track" ||
                  progress.performanceScore.status === "ahead",
                estimatedCompletion:
                  progress.predictions.projectedCompletionDate,
              }
            : null,
        },
        message: "Financial goal created successfully",
      },
      { status: 201 },
    );
  } catch (_error) {
    // FinancialGoalsRoute error: Failed to create goal

    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to create financial goal";

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
