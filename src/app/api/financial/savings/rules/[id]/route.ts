/**
 * Savings Rule API Routes
 * GET /api/financial/savings/rules/[id] - Get a specific rule
 * PATCH /api/financial/savings/rules/[id] - Update a rule
 * DELETE /api/financial/savings/rules/[id] - Delete a rule
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { savingsAutomationService } from "@/lib/financial/savings-automation-service";


export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {


    const id = request.nextUrl.pathname.split("/").pop() as string;
    const rule = await savingsAutomationService.getRule(user.id, id);

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { rule } });
  } catch (_error) {
    // SavingsRulesRoute error: Failed to fetch savings rule
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch savings rule" },
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

    // Handle toggle action
    if (body.action === "toggle") {
      const rule = await savingsAutomationService.toggleRuleStatus(
        user.id,
        id,
      );
      return NextResponse.json({ success: true, data: { rule } });
    }

    // Regular update
    const rule = await savingsAutomationService.updateRule(
      user.id,
      id,
      {
        name: body.name,
        status: body.status,
        config: body.config,
        goalId: body.goalId,
        sourceAccountId: body.sourceAccountId,
        destinationAccountId: body.destinationAccountId,
      },
    );

    return NextResponse.json({ success: true, data: { rule } });
  } catch (_error) {
    // SavingsRulesRoute error: Failed to update savings rule
    void _error;
    return NextResponse.json(
      { error: "Failed to update savings rule" },
      { status: 500 },
    );
  }
},
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {


    const id = request.nextUrl.pathname.split("/").pop() as string;
    const success = await savingsAutomationService.deleteRule(
      user.id,
      id,
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete rule" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    // SavingsRulesRoute error: Failed to delete savings rule
    void _error;
    return NextResponse.json(
      { error: "Failed to delete savings rule" },
      { status: 500 },
    );
  }
},
);
