/**
 * Regression tests for the shallow health check.
 *
 * The defect these guard: `checkDatabase()` and `checkCache()` had their probes
 * commented out and returned a literal `status: "healthy"`, so `/api/health`
 * reported four healthy components it never contacted and `readinessCheck()`
 * could never return false. An orchestrator would have routed traffic to an
 * instance with a dead database — and the endpoint was cited in a verification
 * report as evidence the system worked.
 *
 * Every test below therefore asserts on the UNHAPPY path at least as hard as
 * the happy one. A suite that only checked "returns healthy when everything is
 * fine" would have passed against the broken version.
 */

const mockDbSelect = jest.fn();
const mockPing = jest.fn();

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(),
}));

jest.mock("@/lib/cache/redis-cache-service", () => ({
  // A plain arrow, not a jest.fn: jest.config sets `resetMocks: true`, which
  // wipes the IMPLEMENTATION of any jest.fn declared in a module factory before
  // every test. Delegating to a mock defined here keeps the indirection alive
  // while still letting each test control the return value.
  redisCache: { ping: (...args: unknown[]) => mockPing(...args) },
}));

import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { checkHealth, readinessCheck, livenessCheck } from "../health";

const componentByName = (
  report: Awaited<ReturnType<typeof checkHealth>>,
  name: string,
) => report.components.find((c) => c.name === name);

describe("health check", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Re-established every test because `resetMocks: true` (jest.config.js:75)
    // strips implementations, including the one in the module factory above.
    // Without this the client resolves to undefined, every probe throws, and
    // the suite passes its unhealthy cases for entirely the wrong reason.
    (getServiceRoleClient as jest.Mock).mockReturnValue({
      from: () => ({ select: mockDbSelect }),
    });
    mockDbSelect.mockResolvedValue({ error: null });
    mockPing.mockResolvedValue({ configured: true, ok: true });
  });

  afterEach(() => jest.restoreAllMocks());

  it("reports healthy only when the database query actually succeeds", async () => {
    const report = await checkHealth();

    expect(mockDbSelect).toHaveBeenCalled(); // it must ASK, not assume
    expect(componentByName(report, "database")?.status).toBe("healthy");
    expect(report.status).toBe("healthy");
  });

  it("reports the database unhealthy when the query returns an error", async () => {
    mockDbSelect.mockResolvedValue({ error: new Error("42P01") });

    const report = await checkHealth();

    expect(componentByName(report, "database")?.status).toBe("unhealthy");
    expect(report.status).toBe("unhealthy");
  });

  it("reports the database unhealthy when the query rejects", async () => {
    mockDbSelect.mockRejectedValue(new Error("ECONNREFUSED"));

    const report = await checkHealth();

    expect(componentByName(report, "database")?.status).toBe("unhealthy");
  });

  it("never leaks the underlying error to the caller — this endpoint is public", async () => {
    mockDbSelect.mockRejectedValue(
      new Error('relation "profiles" does not exist at character 8'),
    );

    const report = await checkHealth();
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("does not exist");
    expect(serialized).not.toContain("character 8");
    expect(componentByName(report, "database")?.message).toBe("query failed");
  });

  it("reports the cache degraded — not healthy — when Redis is unconfigured", async () => {
    mockPing.mockResolvedValue({ configured: false, ok: false });

    const report = await checkHealth();

    expect(componentByName(report, "cache")?.status).toBe("degraded");
    expect(report.status).toBe("degraded");
  });

  it("reports the cache degraded when Redis is configured but failing", async () => {
    mockPing.mockResolvedValue({
      configured: true,
      ok: false,
      error: "HTTP 500",
    });

    const report = await checkHealth();

    expect(componentByName(report, "cache")?.status).toBe("degraded");
  });

  it("checks only self-owned dependencies — no outbound vendor probes", async () => {
    // Deep per-vendor probes live behind withRole("admin") in service-probes.ts.
    // Calling them from this public endpoint would let anonymous callers drive
    // credential-bearing outbound requests and disclose which vendors exist.
    const report = await checkHealth();

    expect(report.components.map((c) => c.name).sort()).toEqual([
      "cache",
      "database",
    ]);
  });

  describe("readiness", () => {
    it("is not ready when the database is down", async () => {
      mockDbSelect.mockResolvedValue({ error: new Error("down") });

      await expect(readinessCheck()).resolves.toEqual({
        ready: false,
        reason: "Critical service unavailable",
      });
    });

    it("is ready when merely degraded", async () => {
      mockPing.mockResolvedValue({ configured: false, ok: false });

      await expect(readinessCheck()).resolves.toEqual({ ready: true });
    });

    it("does not leak the error message when the check itself throws", async () => {
      mockPing.mockImplementation(() => {
        throw new Error("postgres://user:pw@host/db unreachable");
      });

      const result = await readinessCheck();

      expect(result.ready).toBe(false);
      expect(result.reason).toBe("Health check failed");
      expect(JSON.stringify(result)).not.toContain("postgres://");
    });
  });

  it("liveness is about the process, not its dependencies", async () => {
    mockDbSelect.mockRejectedValue(new Error("down"));

    // A dead database must NOT make the process look dead — that would cause a
    // restart loop instead of taking the instance out of the load balancer.
    expect(livenessCheck()).toEqual({ alive: true });
  });
});
