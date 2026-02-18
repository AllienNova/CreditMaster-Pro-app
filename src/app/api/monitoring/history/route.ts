import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import {
  RealtimeMonitoringService,
  type EventType,
} from "@/lib/monitoring/real-time-monitoring";

/**
 * GET /api/monitoring/history
 * Get event history for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = validation.user.id;
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const eventTypesParam = searchParams.get("event_types");
    const limitParam = searchParams.get("limit");

    const eventTypes: EventType[] | undefined = eventTypesParam
      ? (eventTypesParam.split(",") as EventType[])
      : undefined;

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // Get event history
    const events = RealtimeMonitoringService.getEventHistory(
      userId,
      eventTypes,
      limit,
    );

    // MonitoringHistoryAPI: Retrieved events for user

    return NextResponse.json({ events });
  } catch (_error) {
    // MonitoringHistoryAPI error: Error fetching event history
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch event history" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/monitoring/history
 * Clear event history for authenticated user
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = validation.user.id;

    // Clear event history
    RealtimeMonitoringService.clearEventHistory(userId);

    // MonitoringHistoryAPI: Cleared event history for user

    return NextResponse.json({ success: true });
  } catch (_error) {
    // MonitoringHistoryAPI error: Error clearing event history
    void _error;
    return NextResponse.json(
      { error: "Failed to clear event history" },
      { status: 500 },
    );
  }
}
