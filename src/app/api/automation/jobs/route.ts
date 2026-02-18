import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { JobScheduler } from "@/lib/automation/job-scheduler";

/**
 * GET /api/automation/jobs
 * Get user's scheduled jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();

    // Get jobs
    const jobs = JobScheduler.getUserJobs(validation.user.id);

    // JobsAPI: Fetched jobs for user
    const duration = Date.now() - startTime;
    void duration;

    return NextResponse.json({ jobs });
  } catch (_error) {
    // JobsAPI error: Error fetching jobs
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/automation/jobs
 * Schedule a new job
 */
export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "automation:jobs:create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startTime = Date.now();
    const body = await request.json();

    const {
      job_type,
      schedule_type,
      next_execution,
      config,
      cron_expression,
      max_executions,
    } = body;

    if (!job_type || !schedule_type || !next_execution) {
      return NextResponse.json(
        { error: "job_type, schedule_type, and next_execution are required" },
        { status: 400 },
      );
    }

    // Schedule job
    const job = await JobScheduler.scheduleJob({
      user_id: validation.user.id,
      job_type,
      schedule_type,
      cron_expression,
      next_execution,
      last_execution: undefined,
      max_executions,
      config: config || {},
      enabled: true,
    });

    // JobsAPI: Scheduled job for user
    const duration = Date.now() - startTime;
    void duration;

    return NextResponse.json({ job });
  } catch (_error) {
    // JobsAPI error: Error scheduling job
    void _error;
    return NextResponse.json(
      { error: "Failed to schedule job" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/automation/jobs
 * Cancel a job
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "automation:jobs:delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json(
        { error: "job_id is required" },
        { status: 400 },
      );
    }

    // Verify job belongs to user
    const job = JobScheduler.getJob(jobId);
    if (!job || job.user_id !== validation.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const startTime = Date.now();

    // Cancel job
    const success = JobScheduler.cancelJob(jobId);

    // JobsAPI: Cancelled job for user
    const duration = Date.now() - startTime;
    void duration;

    return NextResponse.json({ success });
  } catch (_error) {
    // JobsAPI error: Error cancelling job
    void _error;
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 },
    );
  }
}
