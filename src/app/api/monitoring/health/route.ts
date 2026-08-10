import { NextRequest, NextResponse } from "next/server";
import { withRole, type AuthedUser } from "@/lib/auth/api-guard";
import { RealtimeMonitoringService } from "@/lib/monitoring/real-time-monitoring";
import { JobScheduler } from "@/lib/automation/job-scheduler";

/**
 * Heap pressure thresholds. Named rather than inlined so the numbers are
 * arguable in review instead of buried in a conditional.
 *
 * These are heuristics on V8 heap utilisation, deliberately conservative:
 * heapTotal grows on demand, so a high ratio means the process is close to what
 * it has currently reserved, not necessarily close to the container limit. That
 * makes this a useful early signal and a poor hard failure, which is why the
 * ceiling reports `degraded` rather than `unhealthy` until it is extreme.
 */
const HEAP_DEGRADED_PCT = 75;
const HEAP_UNHEALTHY_PCT = 95;

function heapStatus(percentage: number): "healthy" | "degraded" | "unhealthy" {
  if (percentage >= HEAP_UNHEALTHY_PCT) return "unhealthy";
  if (percentage >= HEAP_DEGRADED_PCT) return "degraded";
  return "healthy";
}

/**
 * GET /api/monitoring/health
 * Get system health metrics (admin only)
 */
export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
  try {
    const startTime = Date.now();

    const activeJobs = JobScheduler.getActiveJobs();
    const monitoringStats = RealtimeMonitoringService.getStatistics();

    const responseTime = Date.now() - startTime;
    const mem = process.memoryUsage();
    const heapPercentage = (mem.heapUsed / mem.heapTotal) * 100;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      // DERIVED, not asserted. This field used to be the literal string
      // "healthy", sitting in the same object as the real memory, CPU and job
      // data it ignored — so the endpoint reported healthy while heap sat at
      // 99%. Same defect class as gap-analysis.md G-012, admin-gated instead of
      // public. If you add a signal below, it belongs in this calculation too,
      // or the status is a decoration again.
      status: heapStatus(heapPercentage),
      uptime: process.uptime(),
      memory: {
        used: mem.heapUsed / 1024 / 1024, // MB
        total: mem.heapTotal / 1024 / 1024, // MB
        percentage: heapPercentage,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // seconds
      },
      automation: {
        active_jobs: activeJobs.length,
        // `active_workflows: 0` was reported here with the comment "Would be
        // fetched from database in production". There is no workflow table in
        // the schema at all, so the field had no source and 0 was not a
        // measurement. Removed rather than left as a plausible number.
      },
      monitoring: {
        active_subscriptions: monitoringStats.total_subscriptions,
        total_users: monitoringStats.total_users,
        total_events: monitoringStats.total_events,
      },
      api: {
        response_time_ms: responseTime,
      },
      // The route is admin-gated by withRole("admin"), so there is no
      // non-admin caller to withhold this from. It used to sit behind
      // `const isAdmin = true` with an unreachable "regular users get basic
      // metrics only" branch below it.
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
  async (_request: NextRequest, _user: AuthedUser) => {
    // ───────────────────────────────────────────────────────────────────────
    //  DISABLED — this endpoint broadcast whatever numbers the caller sent as
    //  measured system health.
    //
    //  Every field came straight off the request body with a `|| 0` fallback —
    //  cpu_usage, memory_usage, active_workflows, active_jobs,
    //  pending_disputes, api_response_time, error_rate — and went to
    //  RealtimeMonitoringService.publishSystemHealth(), which fans out a
    //  `system_health_update` event to every subscribed user. So the "system
    //  health" subscribers saw was authored by the caller, not measured. An
    //  operator watching a dashboard would have had no way to tell.
    //
    //  Same class as gap-analysis.md G-012 and G-016: a surface reporting a
    //  state nothing observed. Treated the same way POST
    //  /api/gamification/achievements was — closed rather than left live —
    //  because the honest version is not a smaller version of this one.
    //
    //  What a real implementation needs, and why it is not a two-line fix:
    //  cpu/memory/active_jobs/api_response_time are all measurable server-side
    //  (GET above already does it), but `error_rate` has no source in this
    //  codebase and `active_workflows` has no backing table at all. Publishing
    //  measured values for some fields and 0 for the rest reproduces the
    //  defect in a quieter form, and narrowing SystemHealthMetrics touches
    //  every subscriber.
    //
    //  GET is unaffected and now derives its status from real measurements.
    // ───────────────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        error: "Not implemented",
        message:
          "System health is published from server-side measurements, not from client-supplied values.",
      },
      { status: 501 },
    );
  },
);
