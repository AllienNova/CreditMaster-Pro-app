/**
 * Autonomous Trading Standalone Server
 *
 * Entry point for the Fly.io autonomous trading service.
 * Polls for users in AUTONOMOUS mode and manages per-user scheduler instances.
 * Runs independently of the Next.js app as a standalone Node.js process.
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (bypasses RLS)
 *   STANDALONE_MODE           — Must be "true" (set by Dockerfile)
 *   PORT                      — HTTP port for health/metrics (default: 8080)
 *   POLL_INTERVAL_MS          — User poll interval in ms (default: 60000)
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import http from "node:http";
import {
  AutonomousScheduler,
  createAutonomousScheduler,
} from "./autonomous-scheduler";
import type { ServiceState } from "./autonomous-types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || "8080", 10);
const POLL_INTERVAL_MS = parseInt(
  process.env.POLL_INTERVAL_MS || "60000",
  10,
);

// ============================================================================
// SUPABASE ADMIN CLIENT (standalone — no cookies)
// ============================================================================

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================================
// SCHEDULER MANAGER
// ============================================================================

interface ManagedScheduler {
  scheduler: AutonomousScheduler;
  userId: string;
  startedAt: number;
}

const schedulers = new Map<string, ManagedScheduler>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isShuttingDown = false;

/**
 * Poll trading_accounts for users in AUTONOMOUS mode.
 * Start schedulers for new users, stop schedulers for users no longer in AUTONOMOUS.
 */
async function pollForAutonomousUsers(): Promise<void> {
  if (isShuttingDown) return;

  try {
    const supabase = getSupabaseAdmin();

    // The column is `operating_mode` ('watch' | 'guided' | 'autonomous', see
    // 20260226_trading_modes_compliance.sql:17); `current_mode` has never
    // existed. Naming it errored the whole query, so this poll found zero
    // autonomous users on every tick and NO scheduler was ever started — the
    // autonomous loop was completely inert, and the only symptom was a log
    // line. `config` does not exist either: AutonomousConfig is scheduler
    // tuning (cron expressions, scan limits) and is deliberately optional, so
    // the scheduler falls back to its own defaults.
    const { data: accounts, error } = await supabase
      .from("trading_accounts")
      .select("user_id, operating_mode")
      .eq("operating_mode", "autonomous")
      .eq("is_active", true);

    if (error) {
      console.error("[poll] Failed to fetch trading accounts:", error.message);
      return;
    }

    const activeUserIds = new Set((accounts || []).map((a) => a.user_id));

    // Start schedulers for new AUTONOMOUS users
    for (const account of accounts || []) {
      if (!schedulers.has(account.user_id)) {
        console.log(`[poll] Starting scheduler for user ${account.user_id}`);
        // No per-user scheduler config is persisted anywhere; createAutonomous
        // Scheduler's `config` param is optional and defaults are applied
        // internally. Passing `account.config` read a column that does not
        // exist and always evaluated to `{}` regardless.
        const scheduler = createAutonomousScheduler(account.user_id);
        const result = await scheduler.start();

        if (result.success) {
          schedulers.set(account.user_id, {
            scheduler,
            userId: account.user_id,
            startedAt: Date.now(),
          });
          console.log(`[poll] Scheduler started for user ${account.user_id}`);
        } else {
          console.error(
            `[poll] Failed to start scheduler for ${account.user_id}: ${result.error}`,
          );
        }
      }
    }

    // Stop schedulers for users no longer in AUTONOMOUS mode
    for (const [userId, managed] of schedulers.entries()) {
      if (!activeUserIds.has(userId)) {
        console.log(
          `[poll] User ${userId} no longer in AUTONOMOUS mode, stopping scheduler`,
        );
        await managed.scheduler.stop();
        schedulers.delete(userId);
      }
    }
  } catch (err) {
    console.error("[poll] Unexpected error:", err);
  }
}

// ============================================================================
// HEALTH CHECK HTTP SERVER
// ============================================================================

function getServiceMetrics(): {
  status: string;
  uptime: number;
  schedulerCount: number;
  schedulers: Array<{ userId: string; state: ServiceState }>;
} {
  const schedulerStates: Array<{ userId: string; state: ServiceState }> = [];
  for (const [userId, managed] of schedulers.entries()) {
    schedulerStates.push({
      userId,
      state: managed.scheduler.getState(),
    });
  }

  return {
    status: isShuttingDown ? "shutting_down" : "healthy",
    uptime: process.uptime(),
    schedulerCount: schedulers.size,
    schedulers: schedulerStates,
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    const metrics = getServiceMetrics();
    const statusCode = metrics.status === "healthy" ? 200 : 503;
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: statusCode === 200, ...metrics }));
    return;
  }

  if (req.method === "GET" && req.url === "/metrics") {
    const metrics = getServiceMetrics();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(metrics));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ============================================================================
// LIFECYCLE
// ============================================================================

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[shutdown] Received ${signal}, stopping gracefully...`);

  // Stop polling
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // Stop all schedulers
  const stopPromises = Array.from(schedulers.values()).map(async (managed) => {
    console.log(`[shutdown] Stopping scheduler for user ${managed.userId}`);
    await managed.scheduler.stop();
  });

  await Promise.allSettled(stopPromises);
  schedulers.clear();

  // Close HTTP server
  server.close(() => {
    console.log("[shutdown] HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error("[shutdown] Forced exit after timeout");
    process.exit(1);
  }, 10_000).unref();
}

async function main(): Promise<void> {
  console.log("=== Fynvita Autonomous Trading Service ===");
  console.log(`Port: ${PORT}`);
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // Validate env
  getSupabaseAdmin();

  // Start HTTP health server
  server.listen(PORT, () => {
    console.log(`[server] Health check listening on :${PORT}`);
  });

  // Initial poll
  await pollForAutonomousUsers();

  // Schedule recurring polls
  pollTimer = setInterval(pollForAutonomousUsers, POLL_INTERVAL_MS);

  console.log("[server] Autonomous trading service started");
}

// Signal handlers
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Start
main().catch((err) => {
  console.error("[fatal] Failed to start:", err);
  process.exit(1);
});
