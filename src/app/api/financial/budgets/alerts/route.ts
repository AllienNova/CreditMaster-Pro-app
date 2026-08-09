/**
 * Budget Alerts API Routes
 *
 * GET /api/financial/budgets/alerts - Get budget alerts
 * PATCH /api/financial/budgets/alerts - Mark alerts as read or dismissed
 */

import { NextRequest, NextResponse } from "next/server";
import { budgetService } from "@/lib/financial/budget-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/budgets/alerts
 * Get budget alerts for the authenticated user
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const alerts = await budgetService.getAlerts(userId, { unreadOnly });

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Error fetching budget alerts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch budget alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);

/**
 * PATCH /api/financial/budgets/alerts
 * Mark alerts as read or dismissed
 */
export const PATCH = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const body = await request.json();
    const { alertIds, action } = body;

    // Validate required fields
    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: "alertIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (!action || !["read", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: 'action must be either "read" or "dismiss"' },
        { status: 400 },
      );
    }

    // Process each alert
    if (action === "read") {
      await Promise.all(
        alertIds.map((alertId) =>
          budgetService.markAlertAsRead(alertId, userId),
        ),
      );
    } else {
      await Promise.all(
        alertIds.map((alertId) => budgetService.dismissAlert(alertId, userId)),
      );
    }

    return NextResponse.json({
      success: true,
      message: `Alerts ${action === "read" ? "marked as read" : "dismissed"} successfully`,
    });
  } catch (error) {
    console.error("Error updating budget alerts:", error);
    return NextResponse.json(
      {
        error: "Failed to update budget alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);
