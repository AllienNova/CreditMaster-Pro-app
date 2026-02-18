import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { RealtimeMonitoringService } from "@/lib/monitoring/real-time-monitoring";
import { JobScheduler } from "@/lib/automation/job-scheduler";

/**
 * GET /api/monitoring/health
 * Get system health metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions
    const isAdmin = rbac.hasPermission(validation.user, "admin:analytics");

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
}

/**
 * POST /api/monitoring/health
 * Publish system health update (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    if (!rbac.hasPermission(validation.user, "admin:analytics")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
}
