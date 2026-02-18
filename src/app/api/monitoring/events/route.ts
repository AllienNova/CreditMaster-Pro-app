import { NextRequest } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import {
  RealtimeMonitoringService,
  type EventType,
} from "@/lib/monitoring/real-time-monitoring";

/**
 * GET /api/monitoring/events
 * Server-Sent Events (SSE) endpoint for real-time updates
 */
export async function GET(request: NextRequest) {
  // Validate JWT token
  const validation = await jwtValidation.validateFromHeaders(request);

  if (!validation.valid || !validation.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = validation.user.id;

  // Get event types from query params
  const { searchParams } = new URL(request.url);
  const eventTypesParam = searchParams.get("event_types");
  const eventTypes: EventType[] = eventTypesParam
    ? (eventTypesParam.split(",") as EventType[])
    : [
        "workflow_started",
        "workflow_completed",
        "workflow_failed",
        "job_started",
        "job_completed",
        "job_failed",
        "dispute_created",
        "dispute_updated",
        "dispute_resolved",
        "document_uploaded",
        "ai_processing_completed",
        "notification_received",
      ];

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", userId })}\n\n`,
        ),
      );

      // Subscribe to events
      const subscriptionId = RealtimeMonitoringService.subscribe(
        userId,
        eventTypes,
        (event) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch {
            // MonitoringEventsAPI error: Error sending SSE event
          }
        },
      );

      // MonitoringEventsAPI: SSE connection established for user

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // MonitoringEventsAPI error: Error sending heartbeat
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        RealtimeMonitoringService.unsubscribe(subscriptionId);
        // MonitoringEventsAPI: SSE connection closed for user
        try {
          controller.close();
        } catch {
          // Connection already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
