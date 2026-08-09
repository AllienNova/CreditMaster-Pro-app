/**
 * Savings Goal API Routes
 * GET /api/financial/savings/goals/[id] - Get a specific goal
 * PATCH /api/financial/savings/goals/[id] - Update a goal
 * DELETE /api/financial/savings/goals/[id] - Delete a goal
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { savingsAutomationService } from "@/lib/financial/savings-automation-service";


export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {


    const id = request.nextUrl.pathname.split("/").pop() as string;
    const goal = await savingsAutomationService.getGoal(user.id, id);

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { goal } });
  } catch (_error) {
    // SavingsGoalsRoute error: Failed to fetch savings goal
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch savings goal" },
      { status: 500 },
    );
  }
},
);

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {


    const id = request.nextUrl.pathname.split("/").pop() as string;
    const body = await request.json();

    // Handle contribution action
    if (body.action === "contribute") {
      const contribution = await savingsAutomationService.addContribution(
        user.id,
        {
          goalId: id,
          amount: body.amount,
          source: body.source || "manual",
          note: body.note,
        },
      );
      const goal = await savingsAutomationService.getGoal(
        user.id,
        id,
      );
      return NextResponse.json({ success: true, data: { goal, contribution } });
    }

    // Regular update
    const goal = await savingsAutomationService.updateGoal(
      user.id,
      id,
      {
        name: body.name,
        category: body.category,
        status: body.status,
        targetAmount: body.targetAmount,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        priority: body.priority,
        autoSaveEnabled: body.autoSaveEnabled,
        icon: body.icon,
        color: body.color,
        notes: body.notes,
      },
    );

    return NextResponse.json({ success: true, data: { goal } });
  } catch (_error) {
    // SavingsGoalsRoute error: Failed to update savings goal
    void _error;
    return NextResponse.json(
      { error: "Failed to update savings goal" },
      { status: 500 },
    );
  }
},
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {


    const id = request.nextUrl.pathname.split("/").pop() as string;
    const success = await savingsAutomationService.deleteGoal(
      user.id,
      id,
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete goal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    // SavingsGoalsRoute error: Failed to delete savings goal
    void _error;
    return NextResponse.json(
      { error: "Failed to delete savings goal" },
      { status: 500 },
    );
  }
},
);
