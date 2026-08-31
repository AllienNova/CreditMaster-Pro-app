/**
 * Negative-auth tests for /api/monitoring/health (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/monitoring/real-time-monitoring", () => ({ RealtimeMonitoringService: { getStatistics: jest.fn(() => ({})), publishSystemHealth: jest.fn() } }));
jest.mock("@/lib/automation/job-scheduler", () => ({ JobScheduler: { getActiveJobs: jest.fn(() => []) } }));

import { GET, POST } from "../route";

function createMockRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/monitoring/health";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

describe("negative-auth – /api/monitoring/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(401);
  });

  it("GET returns 403 when the role is not admin", async () => {
    mockResolveRoleFromDb.mockResolvedValue("user");
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(403);
  });

  it("POST returns 403 when the role is not admin", async () => {
    mockResolveRoleFromDb.mockResolvedValue("user");
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(403);
  });
});

/**
 * Success-path tests (G-016). These were absent, which is how the endpoint
 * shipped with `status: "healthy"` as a literal sitting in the same object as
 * the memory, CPU and job data it never consulted — it reported healthy at 89%
 * heap. The negative-auth suite above could not catch that: `withRole("admin")`
 * rejects before the handler body runs, so it never executed the code that
 * built the response.
 */
describe("/api/monitoring/health – reported status", () => {
  const setHeap = (used: number, total: number) =>
    jest.spyOn(process, "memoryUsage").mockReturnValue({
      heapUsed: used,
      heapTotal: total,
      rss: 0,
      external: 0,
      arrayBuffers: 0,
    } as NodeJS.MemoryUsage);

  beforeEach(() => {
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "admin-1", email: "admin@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("admin");

    // `resetMocks: true` (jest.config.js:75) strips the implementations set in
    // the module factories at the top of this file. The negative-auth suite
    // never noticed because withRole rejects before the handler body runs — but
    // here the handler executes, and an undefined return makes it throw into
    // its own catch, which answers `status: "unhealthy"`. That produced a test
    // for "unhealthy at extreme heap" that passed for entirely the wrong
    // reason: the catch, not the threshold.
    const { RealtimeMonitoringService } = jest.requireMock(
      "@/lib/monitoring/real-time-monitoring",
    );
    const { JobScheduler } = jest.requireMock("@/lib/automation/job-scheduler");
    RealtimeMonitoringService.getStatistics.mockReturnValue({
      total_subscriptions: 3,
      total_users: 2,
      total_events: 7,
      events_by_type: { system_health_update: 7 },
    });
    JobScheduler.getActiveJobs.mockReturnValue([]);
  });

  it("derives healthy from low heap utilisation", async () => {
    setHeap(10, 100);
    const body = await (await GET(createMockRequest("GET"))).json();
    expect(body.status).toBe("healthy");
  });

  it("derives degraded at the observed 89% heap that used to report healthy", async () => {
    setHeap(89, 100);
    const body = await (await GET(createMockRequest("GET"))).json();
    expect(body.status).toBe("degraded");
    expect(body.memory.percentage).toBeCloseTo(89);
  });

  it("derives unhealthy at extreme heap pressure", async () => {
    setHeap(97, 100);
    const body = await (await GET(createMockRequest("GET"))).json();
    expect(body.status).toBe("unhealthy");
  });

  it("does not report a metric it cannot measure", async () => {
    setHeap(10, 100);
    const body = await (await GET(createMockRequest("GET"))).json();
    // `active_workflows: 0` was reported with the comment "would be fetched
    // from database in production". No workflow table exists in the schema, so
    // 0 was never a measurement.
    expect(body.automation).not.toHaveProperty("active_workflows");
    expect(body.automation).toHaveProperty("active_jobs");
  });

  it("POST refuses to broadcast caller-supplied health as measured", async () => {
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(501);
    await expect(res.json()).resolves.toMatchObject({
      error: "Not implemented",
    });
  });

  it("POST publishes nothing at all", async () => {
    const { RealtimeMonitoringService } = jest.requireMock(
      "@/lib/monitoring/real-time-monitoring",
    );
    await POST(createMockRequest("POST"));
    expect(RealtimeMonitoringService.publishSystemHealth).not.toHaveBeenCalled();
  });
});
