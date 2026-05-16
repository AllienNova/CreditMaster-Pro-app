/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Must be defined BEFORE imports

// Route wrapped in withRole("admin") (TASK-AUTH-03a); guard resolves auth via
// jwtValidation.validateFromHeaders + resolveRoleFromDb. The handler trusts the
// guard's AuthedUser and performs no second auth pass — no cookie read, no
// supabase getUser, no profile re-query — so the guard mocks are the only auth
// dependency.
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

// Import AFTER mocks
import { GET } from "../../admin/auth/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(
  url: string = "http://localhost:3000/api/admin/auth",
): NextRequest {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  return new NextRequest(absoluteUrl, { method: "GET" } as never);
}

function authenticatedAdmin() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "admin-1", email: "admin@fynvita.com" },
  });
  mockResolveRole.mockResolvedValue("admin");
}

function unauthenticated() {
  mockValidate.mockResolvedValue({ valid: false, user: null });
}

function authenticatedNonAdmin() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "user-1", email: "user@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("Admin Auth API – GET /api/admin/auth", () => {
  describe("Authentication gate (withRole)", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await GET(makeRequest());
      expect(mockValidate).toHaveBeenCalled();
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      authenticatedNonAdmin();
      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
    });
  });

  // FND-003 / FND-004: admin status comes solely from the guard's
  // resolveRoleFromDb (profiles.role). A formerly-whitelisted email or an
  // enterprise subscription tier carries no authorization weight — the guard
  // 403s any non-admin role before the handler runs, so admin status can never
  // be manufactured from email or tier.
  describe("Admin role check", () => {
    it("should return isAdmin=true when the DB-resolved role is admin", async () => {
      authenticatedAdmin();

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.isAdmin).toBe(true);
      expect(body.user.role).toBe("admin");
      expect(body.user.email).toBe("admin@fynvita.com");
    });

    it("should return isAdmin=true when the DB-resolved role is super_admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "admin-2", email: "owner@fynvita.com" },
      });
      mockResolveRole.mockResolvedValue("super_admin");

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.isAdmin).toBe(true);
      expect(body.user.role).toBe("super_admin");
    });

    it("should 403 a formerly-whitelisted email whose DB role is not admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-2", email: "kimhons@gmail.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
    });

    it("should 403 a premium (enterprise-tier) user — tier never grants admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-4", email: "enterprise@corp.com" },
      });
      mockResolveRole.mockResolvedValue("premium");

      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
    });
  });

  describe("Response shape", () => {
    it("should return the guard-resolved AuthedUser (id, email, role)", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-7", email: "admin@fynvita.com" },
      });
      mockResolveRole.mockResolvedValue("admin");

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.user).toEqual({
        id: "user-7",
        email: "admin@fynvita.com",
        role: "admin",
      });
    });
  });
});
