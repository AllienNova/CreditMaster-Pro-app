import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import {
  RealtimeMonitoringService,
  type EventType,
} from "@/lib/monitoring/real-time-monitoring";

/**
 * GET /api/monitoring/history
 * Get event history for authenticated user
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
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
});

/**
 * DELETE /api/monitoring/history
 * Clear event history for authenticated user
 */
export const DELETE = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

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
},
);
