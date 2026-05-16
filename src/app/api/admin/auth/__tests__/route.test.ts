/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

// Route wrapped in withRole("admin") (TASK-AUTH-03a); guard resolves auth via
// jwtValidation.validateFromHeaders + resolveRoleFromDb. The handler trusts the
// guard's AuthedUser and performs no second auth pass, so the guard mocks are
// the only auth dependency.
const mockValidate = jest.fn();
const mockResolveRole = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: any[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: any[]) => mockResolveRole(...args),
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────

import { GET } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(url?: string): NextRequest {
  return new NextRequest(
    url || "http://localhost:3000/api/admin/auth",
    { method: "GET" } as never,
  );
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: auth passes (admin)
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "admin@fynvita.com" },
  });
  mockResolveRole.mockResolvedValue("admin");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/auth
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Auth API – GET /api/admin/auth", () => {
  describe("negative-auth", () => {
    it("should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
    });
  });

  it("should return isAdmin=true with the guard-resolved user for an admin", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(true);
    expect(body.user).toEqual({
      id: "user-1",
      email: "admin@fynvita.com",
      role: "admin",
    });
  });

  it("should return isAdmin=true for a super_admin", async () => {
    mockResolveRole.mockResolvedValue("super_admin");

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isAdmin).toBe(true);
    expect(body.user.role).toBe("super_admin");
  });

  // FND-003 / FND-004: the role is sourced solely from resolveRoleFromDb
  // (profiles.role). A formerly-whitelisted email or an enterprise
  // subscription tier carries no authorization weight — the guard 403s any
  // non-admin role before the handler runs, so admin status can never be
  // manufactured from email or tier.
  it("should 403 a formerly-whitelisted email whose DB role is not admin", async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "khonour@yahoo.com" },
    });
    mockResolveRole.mockResolvedValue("user");

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
