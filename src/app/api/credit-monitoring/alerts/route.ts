import { NextRequest, NextResponse } from "next/server";
import { creditMonitoringService } from "@/lib/credit-monitoring/credit-monitoring-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-monitoring/alerts
 * Get credit monitoring alerts
 */
export const GET = withPermission(
  "credit:alerts",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const severity = searchParams.get("severity") as
      | "low"
      | "medium"
      | "high"
      | "critical"
      | null;

    const alerts = await creditMonitoringService.getAlerts(userId, {
      unreadOnly,
      limit,
      severity: severity || undefined,
    });

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 },
    );
  }
  },
);

/**
 * PATCH /api/credit-monitoring/alerts
 * Mark alert(s) as read
 */
export const PATCH = withPermission(
  "credit:alerts",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    const body = await request.json();
    const { alertId, markAllAsRead } = body;

    let success = false;

    if (markAllAsRead) {
      success = await creditMonitoringService.markAllAlertsAsRead(userId);
    } else if (alertId) {
      success = await creditMonitoringService.markAlertAsRead(alertId, userId);
    } else {
      return NextResponse.json(
        { error: "Either alertId or markAllAsRead must be provided" },
        { status: 400 },
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark alert(s) as read" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to mark alerts as read" },
      { status: 500 },
    );
  }
  },
);
