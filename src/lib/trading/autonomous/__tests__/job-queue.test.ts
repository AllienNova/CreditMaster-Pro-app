import { JobQueue, type JobHandler, type QueuedJob } from "../job-queue";
import type { AutonomousConfig, JobPayload } from "../autonomous-types";
import { DEFAULT_AUTONOMOUS_CONFIG } from "../autonomous-types";

function makeConfig(overrides: Partial<AutonomousConfig> = {}): AutonomousConfig {
  return { ...DEFAULT_AUTONOMOUS_CONFIG, ...overrides };
}

function makePayload(
  type: JobPayload["type"] = "signal_scan",
  data: Record<string, unknown> = {},
): JobPayload {
  return { type, userId: "user_1", timestamp: Date.now(), data };
}

describe("JobQueue", () => {
  let queue: JobQueue;

  beforeEach(() => {
    jest.useFakeTimers();
    queue = new JobQueue(makeConfig({ maxConcurrentExecutions: 2, maxJobRetries: 2, jobTimeoutMs: 5000 }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ========================================================================
  // BASIC OPERATIONS
  // ========================================================================
  describe("enqueue", () => {
    it("returns a unique job ID", () => {
      const id1 = queue.enqueue(makePayload());
      const id2 = queue.enqueue(makePayload());
      expect(id1).toMatch(/^job_/);
      expect(id2).toMatch(/^job_/);
      expect(id1).not.toBe(id2);
    });

    it("creates a job that is tracked in the queue", () => {
      const id = queue.enqueue(makePayload());
      const job = queue.getJob(id);
      expect(job).toBeDefined();
      expect(job!.payload.type).toBe("signal_scan");
      // Job is processed immediately (no handler → failed, or handler → processing)
      // Without a handler, it transitions to "failed" synchronously
      expect(["pending", "processing", "failed"]).toContain(job!.status);
    });

    it("keeps job pending when maxConcurrent is 0", () => {
      const zeroQueue = new JobQueue(makeConfig({
        maxConcurrentExecutions: 0,
        maxJobRetries: 0,
        jobTimeoutMs: 5000,
      }));
      const id = zeroQueue.enqueue(makePayload());
      const job = zeroQueue.getJob(id);
      expect(job).toBeDefined();
      expect(job!.status).toBe("pending");
      expect(job!.attempts).toBe(0);
    });
  });

  describe("registerHandler", () => {
    it("accepts handlers for job types", () => {
      const handler: JobHandler = async () => "done";
      queue.registerHandler("signal_scan", handler);
      // No error thrown
    });
  });

  describe("getStats", () => {
    it("returns correct total count", () => {
      queue.enqueue(makePayload());
      queue.enqueue(makePayload());

      const stats = queue.getStats();
      expect(stats.total).toBe(2);
    });

    it("returns all zeros for empty queue", () => {
      const stats = queue.getStats();
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      });
    });

    it("tracks pending jobs in a zero-concurrency queue", () => {
      const zeroQueue = new JobQueue(makeConfig({
        maxConcurrentExecutions: 0,
        maxJobRetries: 0,
        jobTimeoutMs: 5000,
      }));
      zeroQueue.enqueue(makePayload());
      zeroQueue.enqueue(makePayload());

      const stats = zeroQueue.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.total).toBe(2);
    });
  });

  describe("getJob", () => {
    it("returns the job by ID", () => {
      const id = queue.enqueue(makePayload("signal_scan", { symbol: "AAPL" }));
      const job = queue.getJob(id);
      expect(job).toBeDefined();
      expect(job!.payload.data).toEqual({ symbol: "AAPL" });
    });

    it("returns undefined for unknown ID", () => {
      expect(queue.getJob("nonexistent")).toBeUndefined();
    });
  });

  describe("getRecentJobs", () => {
    it("returns last N jobs", () => {
      for (let i = 0; i < 10; i++) {
        queue.enqueue(makePayload());
      }
      const recent = queue.getRecentJobs(5);
      expect(recent.length).toBe(5);
    });

    it("returns all jobs if fewer than limit", () => {
      queue.enqueue(makePayload());
      queue.enqueue(makePayload());
      const recent = queue.getRecentJobs(50);
      expect(recent.length).toBe(2);
    });
  });

  // ========================================================================
  // EXECUTION
  // ========================================================================
  describe("job execution", () => {
    it("processes a job through a registered handler", async () => {
      jest.useRealTimers();

      const q = new JobQueue(makeConfig({ maxConcurrentExecutions: 2, maxJobRetries: 0, jobTimeoutMs: 5000 }));
      const handler = jest.fn().mockResolvedValue("result");
      q.registerHandler("signal_scan", handler);

      const id = q.enqueue(makePayload("signal_scan"));

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 50));

      const job = q.getJob(id);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(job!.status).toBe("completed");
      expect(job!.result).toBe("result");
    });

    it("marks job as failed when no handler registered", async () => {
      jest.useRealTimers();

      const q = new JobQueue(makeConfig({ maxConcurrentExecutions: 2, maxJobRetries: 0, jobTimeoutMs: 5000 }));
      // No handler registered for "signal_scan"
      const id = q.enqueue(makePayload("signal_scan"));

      await new Promise((r) => setTimeout(r, 50));

      const job = q.getJob(id);
      expect(job!.status).toBe("failed");
      expect(job!.error).toContain("No handler registered");
    });

    it("marks job as failed after max retries exhausted", async () => {
      jest.useRealTimers();

      const q = new JobQueue(makeConfig({ maxConcurrentExecutions: 2, maxJobRetries: 1, jobTimeoutMs: 5000 }));
      const handler = jest.fn().mockRejectedValue(new Error("boom"));
      q.registerHandler("signal_scan", handler);

      const id = q.enqueue(makePayload("signal_scan"));

      // Wait for first attempt + backoff + retry
      await new Promise((r) => setTimeout(r, 2500));

      const job = q.getJob(id);
      // After 1 attempt + 1 retry = maxRetries reached, should be failed
      expect(job!.status).toBe("failed");
      expect(job!.error).toBe("boom");
    });

    it("respects concurrency limit", async () => {
      jest.useRealTimers();

      let concurrent = 0;
      let maxConcurrent = 0;

      const q = new JobQueue(makeConfig({ maxConcurrentExecutions: 2, maxJobRetries: 0, jobTimeoutMs: 10000 }));

      const handler: JobHandler = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 100));
        concurrent--;
        return "done";
      };
      q.registerHandler("signal_scan", handler);

      // Enqueue 4 jobs — only 2 should run concurrently
      q.enqueue(makePayload());
      q.enqueue(makePayload());
      q.enqueue(makePayload());
      q.enqueue(makePayload());

      await new Promise((r) => setTimeout(r, 500));

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  // ========================================================================
  // DRAIN & PRUNE
  // ========================================================================
  describe("drain", () => {
    it("marks all pending jobs as failed", () => {
      // Use maxConcurrent=0 so jobs stay pending
      const pendingQueue = new JobQueue(makeConfig({
        maxConcurrentExecutions: 0,
        maxJobRetries: 0,
        jobTimeoutMs: 5000,
      }));
      pendingQueue.enqueue(makePayload());
      pendingQueue.enqueue(makePayload());
      pendingQueue.enqueue(makePayload());

      pendingQueue.drain();

      const stats = pendingQueue.getStats();
      expect(stats.failed).toBe(3);
      expect(stats.pending).toBe(0);
    });

    it("sets error message about shutdown", () => {
      const pendingQueue = new JobQueue(makeConfig({
        maxConcurrentExecutions: 0,
        maxJobRetries: 0,
        jobTimeoutMs: 5000,
      }));
      const id = pendingQueue.enqueue(makePayload());
      const job = pendingQueue.getJob(id)!;
      expect(job.status).toBe("pending");

      pendingQueue.drain();

      expect(job.error).toContain("shutdown");
    });
  });

  describe("prune", () => {
    it("removes old completed jobs", () => {
      // Use maxConcurrent=0 so job stays pending, then manually set completed
      const pruneQueue = new JobQueue(makeConfig({
        maxConcurrentExecutions: 0,
        maxJobRetries: 0,
        jobTimeoutMs: 5000,
      }));
      const id = pruneQueue.enqueue(makePayload());
      const job = pruneQueue.getJob(id)!;
      job.status = "completed";
      job.completedAt = Date.now() - 7200_000; // 2 hours ago

      const pruned = pruneQueue.prune(3600_000); // Prune older than 1 hour
      expect(pruned).toBe(1);
    });

    it("preserves pending and processing jobs", () => {
      const pendingQueue = new JobQueue(makeConfig({
        maxConcurrentExecutions: 0,
        maxJobRetries: 0,
        jobTimeoutMs: 5000,
      }));
      pendingQueue.enqueue(makePayload());
      pendingQueue.enqueue(makePayload());

      const pruned = pendingQueue.prune(0); // Prune everything old
      expect(pruned).toBe(0); // Pending jobs should be kept
    });
  });

  // ========================================================================
  // ACTIVE COUNT
  // ========================================================================
  describe("activeCount", () => {
    it("starts at 0", () => {
      expect(queue.activeCount).toBe(0);
    });
  });
});
