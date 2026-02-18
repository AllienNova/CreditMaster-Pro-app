/**
 * Savings Rule API Routes
 * GET /api/financial/savings/rules/[id] - Get a specific rule
 * PATCH /api/financial/savings/rules/[id] - Update a rule
 * DELETE /api/financial/savings/rules/[id] - Delete a rule
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { savingsAutomationService } from "@/lib/financial/savings-automation-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rule = await savingsAutomationService.getRule(validation.user.id, id);

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
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle toggle action
    if (body.action === "toggle") {
      const rule = await savingsAutomationService.toggleRuleStatus(
        validation.user.id,
        id,
      );
      return NextResponse.json({ success: true, data: { rule } });
    }

    // Regular update
    const rule = await savingsAutomationService.updateRule(
      validation.user.id,
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
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const success = await savingsAutomationService.deleteRule(
      validation.user.id,
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
}
