/** @jest-environment node */

/**
 * Route-level authz + wiring for GET /api/admin/health. Drives the REAL
 * `withRole("admin", …)` guard (rbac/roles unmocked) via a mocked JWT + a
 * mocked DB role, exactly as the api-guard suite does, so a forged admin claim
 * with a `user` DB role is denied. `probeAllServices` is mocked — this file
 * asserts the guard + payload wiring, not the probes themselves.
 */

import { jwtValidation } from "@/lib/auth/jwt-validation";
jest.mock("@/lib/auth/jwt-validation");

const mockResolve = jest.fn();
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolve(...args),
}));

const mockProbeAll = jest.fn();
jest.mock("@/lib/monitoring/service-probes", () => ({
  probeAllServices: (...args: unknown[]) => mockProbeAll(...args),
}));

import { GET } from "../route";

const req = () => new Request("http://t/api/admin/health") as never;

const SAMPLE = {
  status: "degraded",
  checkedAt: "2026-07-25T00:00:00.000Z",
  services: [
    { service: "Supabase", status: "healthy" },
    { service: "Stripe", status: "unknown", detail: "not configured" },
  ],
};

describe("GET /api/admin/health", () => {
  beforeEach(() => {
    mockProbeAll.mockResolvedValue(SAMPLE);
  });

  it("returns 403 for a forged admin claim whose DB role is 'user'", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "admin" },
    });
    mockResolve.mockResolvedValue("user");
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(mockProbeAll).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mockProbeAll).not.toHaveBeenCalled();
  });

  it("returns 200 with the probe payload for an admin", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "u1", email: "e", role: "user" },
    });
    mockResolve.mockResolvedValue("admin");
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SAMPLE);
    expect(mockProbeAll).toHaveBeenCalledTimes(1);
  });
});
