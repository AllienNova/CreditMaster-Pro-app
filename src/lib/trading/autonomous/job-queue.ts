/**
 * Job Queue for Autonomous Trading Service
 *
 * In-memory job queue with concurrency control. In production with Fly.io,
 * this can be swapped for BullMQ + Redis by providing a redisUrl in config.
 * The interface remains the same either way.
 */

import type {
  JobType,
  JobPayload,
  AutonomousConfig,
} from "./autonomous-types";

// ============================================================================
// TYPES
// ============================================================================

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "timeout";

export interface QueuedJob {
  id: string;
  payload: JobPayload;
  status: JobStatus;
  attempts: number;
  maxRetries: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  result: unknown;
}

export type JobHandler = (payload: JobPayload) => Promise<unknown>;

// ============================================================================
// IN-MEMORY JOB QUEUE
// ============================================================================

export class JobQueue {
  private queue: QueuedJob[] = [];
  private processing: Set<string> = new Set();
  private handlers: Map<JobType, JobHandler> = new Map();
  private maxConcurrent: number;
  private jobTimeoutMs: number;
  private maxRetries: number;
  private isProcessing: boolean = false;
  private jobCounter: number = 0;

  constructor(config: AutonomousConfig) {
    this.maxConcurrent = config.maxConcurrentExecutions;
    this.jobTimeoutMs = config.jobTimeoutMs;
    this.maxRetries = config.maxJobRetries;
  }

  /**
   * Register a handler for a specific job type.
   */
  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Add a job to the queue.
   */
  enqueue(payload: JobPayload): string {
    const id = `job_${Date.now()}_${++this.jobCounter}`;
    const job: QueuedJob = {
      id,
      payload,
      status: "pending",
      attempts: 0,
      maxRetries: this.maxRetries,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
    };
    this.queue.push(job);
    this.processNext();
    return id;
  }

  /**
   * Process the next available job(s) up to concurrency limit.
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.processing.size < this.maxConcurrent) {
        const nextJob = this.queue.find(
          (j) => j.status === "pending" && !this.processing.has(j.id),
        );
        if (!nextJob) break;

        nextJob.status = "processing";
        nextJob.startedAt = Date.now();
        nextJob.attempts++;
        this.processing.add(nextJob.id);

        // Fire and forget — process in background
        this.executeJob(nextJob).catch(() => {
          // Error already handled inside executeJob
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single job with timeout and retry logic.
   */
  private async executeJob(job: QueuedJob): Promise<void> {
    const handler = this.handlers.get(job.payload.type);
    if (!handler) {
      job.status = "failed";
      job.error = `No handler registered for job type: ${job.payload.type}`;
      job.completedAt = Date.now();
      this.processing.delete(job.id);
      this.processNext();
      return;
    }

    try {
      const result = await Promise.race([
        handler(job.payload),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Job timeout after ${this.jobTimeoutMs}ms`)),
            this.jobTimeoutMs,
          ),
        ),
      ]);

      job.status = "completed";
      job.result = result;
      job.completedAt = Date.now();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (job.attempts < job.maxRetries) {
        // Retry with exponential backoff
        job.status = "pending";
        job.error = errorMsg;
        const backoffMs = Math.min(1000 * Math.pow(2, job.attempts - 1), 16000);
        setTimeout(() => {
          this.processing.delete(job.id);
          this.processNext();
        }, backoffMs);
        return;
      }

      job.status = "failed";
      job.error = errorMsg;
      job.completedAt = Date.now();
    }

    this.processing.delete(job.id);
    this.processNext();
  }

  /**
   * Get current queue stats.
   */
  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const counts = { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    for (const job of this.queue) {
      counts.total++;
      if (job.status === "pending") counts.pending++;
      else if (job.status === "processing") counts.processing++;
      else if (job.status === "completed") counts.completed++;
      else if (job.status === "failed" || job.status === "timeout") counts.failed++;
    }
    return counts;
  }

  /**
   * Get a specific job by ID.
   */
  getJob(id: string): QueuedJob | undefined {
    return this.queue.find((j) => j.id === id);
  }

  /**
   * Get recent jobs (last N).
   */
  getRecentJobs(limit: number = 50): QueuedJob[] {
    return this.queue.slice(-limit);
  }

  /**
   * Clear completed and failed jobs older than the given age.
   */
  prune(maxAgeMs: number = 3600_000): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.queue.length;
    this.queue = this.queue.filter(
      (j) =>
        j.status === "pending" ||
        j.status === "processing" ||
        (j.completedAt && j.completedAt > cutoff),
    );
    return before - this.queue.length;
  }

  /**
   * Drain all pending jobs (used during graceful shutdown).
   */
  drain(): void {
    for (const job of this.queue) {
      if (job.status === "pending") {
        job.status = "failed";
        job.error = "Queue drained during shutdown";
        job.completedAt = Date.now();
      }
    }
  }

  /**
   * Number of active (processing) jobs.
   */
  get activeCount(): number {
    return this.processing.size;
  }
}
