/**
 * @jest-environment node
 *
 * Negative-auth and input-clamping coverage for /api/admin/audit
 * (TASK-AUTH-03a FND-049; TASK-ADM-03 FND-055).
 * Both GET and POST are wrapped in withRole("admin"); the guard resolves auth
 * via jwtValidation.validateFromHeaders + resolveRoleFromDb.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));

// Supabase builder mock — the GET query chains: from().select().eq().gte().lte().range().order()
const mockOrder = jest.fn();
const mockInsert = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { GET, POST } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/audit");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: "GET" } as never);
}

function makePostRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/audit", {
    method: "POST",
  } as never);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: admin auth passes
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: "admin-1", email: "admin@fynvita.com" },
  });
  mockResolveRole.mockResolvedValue("admin");

  // Build a self-referential query builder so any filter chain works.
  // The terminal async call is order(), which resolves with the result.
  mockOrder.mockResolvedValue({ data: [], count: 0, error: null });
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    range: jest.fn(),
    order: mockOrder,
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.lte.mockReturnValue(builder);
  builder.range.mockReturnValue(builder);

  mockFrom.mockReturnValue({ ...builder, insert: mockInsert });
  mockCreateClient.mockReturnValue({ from: mockFrom });

  mockInsert.mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: { id: "log-1" }, error: null }),
    }),
  });

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Negative-auth (FND-049 verification)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Audit API – /api/admin/audit", () => {
  describe("negative-auth (FND-049 verification)", () => {
    it("GET should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });

    it("GET should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(403);
    });

    it("POST should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await POST(makePostRequest());
      expect(res.status).toBe(401);
    });

    it("POST should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await POST(makePostRequest());
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  limit/page clamping (FND-055)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("limit/page clamping (FND-055)", () => {
    it("clamps an oversized limit (100000) to MAX_LIMIT", async () => {
      const res = await GET(makeGetRequest({ limit: "100000", page: "1" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      // Returned limit must not exceed MAX_LIMIT (100)
      expect(body.limit).toBeLessThanOrEqual(100);
      expect(body.limit).toBeGreaterThanOrEqual(1);
    });

    it("clamps a negative limit to 1", async () => {
      const res = await GET(makeGetRequest({ limit: "-5", page: "1" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBe(1);
    });

    it("clamps a non-numeric limit (NaN) to the default floor", async () => {
      const res = await GET(makeGetRequest({ limit: "abc", page: "1" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBeGreaterThanOrEqual(1);
      expect(body.limit).toBeLessThanOrEqual(100);
    });

    it("clamps a negative page to 1 (non-negative offset)", async () => {
      const res = await GET(makeGetRequest({ limit: "10", page: "-3" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.page).toBeGreaterThanOrEqual(1);
    });

    it("clamps a non-numeric page (NaN) to 1", async () => {
      const res = await GET(makeGetRequest({ limit: "10", page: "xyz" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.page).toBeGreaterThanOrEqual(1);
    });

    it("passes valid limit and page through unchanged", async () => {
      const res = await GET(makeGetRequest({ limit: "25", page: "3" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBe(25);
      expect(body.page).toBe(3);
    });
  });
});
