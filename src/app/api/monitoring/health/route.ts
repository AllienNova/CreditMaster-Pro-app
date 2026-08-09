import { NextRequest, NextResponse } from "next/server";
import { withRole, type AuthedUser } from "@/lib/auth/api-guard";
import { RealtimeMonitoringService } from "@/lib/monitoring/real-time-monitoring";
import { JobScheduler } from "@/lib/automation/job-scheduler";

/**
 * GET /api/monitoring/health
 * Get system health metrics (admin only)
 */
export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
  try {
    // Route is admin-gated by withRole("admin"); detailed metrics are
    // always included for the authenticated admin.
    const isAdmin = true;

    // Get basic health metrics
    const startTime = Date.now();

    const activeJobs = JobScheduler.getActiveJobs();
    const monitoringStats = RealtimeMonitoringService.getStatistics();

    const responseTime = Date.now() - startTime;

    const healthMetrics = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
        percentage:
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
          100,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
      automation: {
        active_jobs: activeJobs.length,
        active_workflows: 0, // Would be fetched from database in production
      },
      monitoring: {
        active_subscriptions: monitoringStats.total_subscriptions,
        total_users: monitoringStats.total_users,
        total_events: monitoringStats.total_events,
      },
      api: {
        response_time_ms: responseTime,
      },
    };

    // If admin, include detailed metrics
    if (isAdmin) {
      return NextResponse.json({
        ...healthMetrics,
        detailed: {
          events_by_type: monitoringStats.events_by_type,
          jobs: activeJobs.map((job) => ({
            id: job.id,
            type: job.job_type,
            next_execution: job.next_execution,
            execution_count: job.execution_count,
          })),
        },
      });
    }

    // Regular users get basic metrics only
    return NextResponse.json(healthMetrics);
  } catch (_error) {
    // HealthRoute error: Failed to fetch health metrics
    void _error;
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Failed to fetch health metrics",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
},
);

/**
 * POST /api/monitoring/health
 * Publish system health update (admin only)
 */
export const POST = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const body = await request.json();

    // Publish health update to all subscribers
    RealtimeMonitoringService.publishSystemHealth({
      timestamp: new Date().toISOString(),
      cpu_usage: body.cpu_usage || 0,
      memory_usage: body.memory_usage || 0,
      active_workflows: body.active_workflows || 0,
      active_jobs: body.active_jobs || 0,
      pending_disputes: body.pending_disputes || 0,
      api_response_time: body.api_response_time || 0,
      error_rate: body.error_rate || 0,
    });

    // HealthRoute: Published system health update

    return NextResponse.json({ success: true });
  } catch (_error) {
    // HealthRoute error: Failed to publish health update
    void _error;
    return NextResponse.json(
      { error: "Failed to publish health update" },
      { status: 500 },
    );
  }
},
);
