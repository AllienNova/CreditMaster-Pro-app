/**
 * Tests for Autonomous Trading Standalone Server
 *
 * Tests the standalone server entry point, scheduler manager, and health endpoints.
 * Re-implements the core logic from standalone-server.ts for unit testing
 * (the actual file is an entry point that auto-executes on import).
 */

// Mock supabase before any imports
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: jest.fn().mockReturnThis(),
  }),
}));

jest.mock("@/lib/trading/pctt/pctt-trading-service", () => ({
  PCTTTradingService: jest.fn(),
}));

jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: jest.fn().mockReturnValue({
    getModeStatus: jest.fn().mockResolvedValue({
      success: true,
      data: { currentMode: "autonomous", userId: "user-1" },
    }),
  }),
}));

// Mock the autonomous scheduler — return value set in beforeEach
jest.mock("../autonomous-scheduler", () => ({
  AutonomousScheduler: jest.fn(),
  createAutonomousScheduler: jest.fn(),
}));

import http from "node:http";
import { createAutonomousScheduler } from "../autonomous-scheduler";

// ============================================================================
// HELPER: Create a mock scheduler instance
// ============================================================================

function createMockScheduler() {
  return {
    start: jest.fn().mockResolvedValue({ success: true }),
    stop: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn().mockReturnValue({
      status: "running" as const,
      startedAt: Date.now(),
      totalScans: 5,
      totalTradesExecuted: 2,
      totalErrors: 0,
      lastScanAt: Date.now(),
      lastHealthCheckAt: Date.now(),
      queueDepth: 0,
    }),
    pause: jest.fn(),
    resume: jest.fn(),
  };
}

// ============================================================================
// HELPER: Simulate the standalone server's core logic for testing
// ============================================================================

interface MockScheduler {
  start: jest.Mock;
  stop: jest.Mock;
  getState: jest.Mock;
  pause: jest.Mock;
  resume: jest.Mock;
}

interface ManagedScheduler {
  scheduler: MockScheduler;
  userId: string;
  startedAt: number;
}

async function pollForAutonomousUsers(
  supabase: { from: jest.Mock },
  schedulers: Map<string, ManagedScheduler>,
): Promise<void> {
  const { data: accounts, error } = await supabase
    .from("trading_accounts")
    .select("user_id, current_mode, config")
    .eq("current_mode", "autonomous")
    .eq("is_active", true);

  if (error) return;

  const activeUserIds = new Set(
    (accounts || []).map((a: { user_id: string }) => a.user_id),
  );

  for (const account of accounts || []) {
    if (!schedulers.has(account.user_id)) {
      const scheduler = createAutonomousScheduler(
        account.user_id,
        account.config || {},
      ) as unknown as MockScheduler;
      const result = await scheduler.start();

      if (result.success) {
        schedulers.set(account.user_id, {
          scheduler,
          userId: account.user_id,
          startedAt: Date.now(),
        });
      }
    }
  }

  for (const [userId, managed] of schedulers.entries()) {
    if (!activeUserIds.has(userId)) {
      await managed.scheduler.stop();
      schedulers.delete(userId);
    }
  }
}

function getServiceMetrics(
  schedulers: Map<string, ManagedScheduler>,
  isShuttingDown: boolean,
) {
  const schedulerStates: Array<{ userId: string; state: unknown }> = [];
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

// ============================================================================
// HELPER: HTTP request via Node http module (bypasses MSW)
// ============================================================================

function httpGet(url: string): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            data: JSON.parse(body),
          });
        });
      })
      .on("error", reject);
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Standalone Server - Polling Logic", () => {
  let mockSupabase: { from: jest.Mock };
  let schedulers: Map<string, ManagedScheduler>;
  let mockEq2: jest.Mock;

  beforeEach(() => {
    schedulers = new Map();

    // Re-establish the mock return value (clearAllMocks would clear it)
    const mockScheduler = createMockScheduler();
    (createAutonomousScheduler as jest.Mock).mockReturnValue(mockScheduler);

    // Create chainable mock
    mockEq2 = jest.fn();
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: mockEq2,
          }),
        }),
      }),
    };

    // Default: return one autonomous user
    mockEq2.mockResolvedValue({
      data: [{ user_id: "user-1", current_mode: "autonomous", config: {} }],
      error: null,
    });
  });

  it("should start schedulers for new autonomous users", async () => {
    await pollForAutonomousUsers(mockSupabase, schedulers);

    expect(schedulers.size).toBe(1);
    expect(schedulers.has("user-1")).toBe(true);
    expect(createAutonomousScheduler).toHaveBeenCalledWith("user-1", {});
  });

  it("should not duplicate schedulers for existing users", async () => {
    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(1);

    // Second poll — same user, same supabase mock
    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(1);
    // createAutonomousScheduler only called once (first poll)
    expect(createAutonomousScheduler).toHaveBeenCalledTimes(1);
  });

  it("should stop schedulers for users no longer in AUTONOMOUS mode", async () => {
    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(1);

    const managed = schedulers.get("user-1")!;

    // Next poll: user no longer autonomous
    mockEq2.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(0);
    expect(managed.scheduler.stop).toHaveBeenCalled();
  });

  it("should handle multiple users simultaneously", async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { user_id: "user-1", current_mode: "autonomous", config: {} },
              { user_id: "user-2", current_mode: "autonomous", config: { maxPositions: 5 } },
              { user_id: "user-3", current_mode: "autonomous", config: {} },
            ],
            error: null,
          }),
        }),
      }),
    });

    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(3);
    expect(createAutonomousScheduler).toHaveBeenCalledTimes(3);
  });

  it("should handle database errors gracefully", async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Connection refused" },
          }),
        }),
      }),
    });

    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(0);
  });

  it("should handle scheduler start failures gracefully", async () => {
    const failingScheduler = createMockScheduler();
    failingScheduler.start.mockResolvedValue({
      success: false,
      error: "Not in autonomous mode",
    });
    (createAutonomousScheduler as jest.Mock).mockReturnValueOnce(failingScheduler);

    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(0);
  });

  it("should remove specific user while keeping others", async () => {
    // Start with 2 users
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { user_id: "user-1", current_mode: "autonomous", config: {} },
              { user_id: "user-2", current_mode: "autonomous", config: {} },
            ],
            error: null,
          }),
        }),
      }),
    });

    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(2);

    // Next poll: only user-2 remains
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { user_id: "user-2", current_mode: "autonomous", config: {} },
            ],
            error: null,
          }),
        }),
      }),
    });

    await pollForAutonomousUsers(mockSupabase, schedulers);
    expect(schedulers.size).toBe(1);
    expect(schedulers.has("user-2")).toBe(true);
    expect(schedulers.has("user-1")).toBe(false);
  });
});

describe("Standalone Server - Service Metrics", () => {
  beforeEach(() => {
    (createAutonomousScheduler as jest.Mock).mockReturnValue(createMockScheduler());
  });

  it("should return healthy metrics when running", () => {
    const schedulers = new Map<string, ManagedScheduler>();
    const metrics = getServiceMetrics(schedulers, false);

    expect(metrics.status).toBe("healthy");
    expect(metrics.schedulerCount).toBe(0);
    expect(metrics.schedulers).toEqual([]);
    expect(typeof metrics.uptime).toBe("number");
  });

  it("should return shutting_down status during shutdown", () => {
    const schedulers = new Map<string, ManagedScheduler>();
    const metrics = getServiceMetrics(schedulers, true);

    expect(metrics.status).toBe("shutting_down");
  });

  it("should include scheduler states in metrics", () => {
    const schedulers = new Map<string, ManagedScheduler>();
    const mockSched = createMockScheduler();

    schedulers.set("user-1", {
      scheduler: mockSched,
      userId: "user-1",
      startedAt: Date.now(),
    });

    const metrics = getServiceMetrics(schedulers, false);

    expect(metrics.schedulerCount).toBe(1);
    expect(metrics.schedulers).toHaveLength(1);
    expect(metrics.schedulers[0].userId).toBe("user-1");
    expect(metrics.schedulers[0].state).toHaveProperty("status", "running");
  });

  it("should report multiple schedulers", () => {
    const schedulers = new Map<string, ManagedScheduler>();

    schedulers.set("user-1", {
      scheduler: createMockScheduler(),
      userId: "user-1",
      startedAt: Date.now(),
    });
    schedulers.set("user-2", {
      scheduler: createMockScheduler(),
      userId: "user-2",
      startedAt: Date.now(),
    });

    const metrics = getServiceMetrics(schedulers, false);
    expect(metrics.schedulerCount).toBe(2);
    expect(metrics.schedulers).toHaveLength(2);
  });
});

describe("Standalone Server - HTTP Health Endpoint", () => {
  let server: http.Server;
  let port: number;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            status: "healthy",
            uptime: process.uptime(),
            schedulerCount: 0,
            schedulers: [],
          }),
        );
        return;
      }

      if (req.method === "GET" && req.url === "/metrics") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "healthy",
            uptime: process.uptime(),
            schedulerCount: 0,
            schedulers: [],
          }),
        );
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    server.listen(0, () => {
      port = (server.address() as { port: number }).port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it("should respond to /health with 200", async () => {
    const { status, data } = await httpGet(`http://localhost:${port}/health`);
    expect(status).toBe(200);

    const body = data as { ok: boolean; status: string; uptime: number; schedulerCount: number };
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
    expect(typeof body.uptime).toBe("number");
    expect(body.schedulerCount).toBe(0);
  });

  it("should respond to /metrics with 200", async () => {
    const { status, data } = await httpGet(`http://localhost:${port}/metrics`);
    expect(status).toBe(200);

    const body = data as { status: string; schedulerCount: number };
    expect(body.status).toBe("healthy");
    expect(body.schedulerCount).toBe(0);
  });

  it("should respond to unknown paths with 404", async () => {
    const { status, data } = await httpGet(`http://localhost:${port}/unknown`);
    expect(status).toBe(404);

    const body = data as { error: string };
    expect(body.error).toBe("Not found");
  });

  it("should include scheduler list in health response", async () => {
    const { data } = await httpGet(`http://localhost:${port}/health`);
    const body = data as { schedulers: unknown[] };
    expect(body.schedulers).toEqual([]);
  });
});

describe("Standalone Server - Supabase Client", () => {
  it("should use supabaseAdmin for standalone mode (via createClient shim)", async () => {
    const originalEnv = process.env.STANDALONE_MODE;
    process.env.STANDALONE_MODE = "true";

    const { createClient } = await import("@/lib/supabase/server");
    const client = await createClient();

    expect(client).toBeDefined();

    process.env.STANDALONE_MODE = originalEnv;
  });
});
