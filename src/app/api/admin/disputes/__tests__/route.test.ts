/**
 * @jest-environment node
 *
 * Negative-auth coverage for /api/admin/disputes (TASK-AUTH-03a, FND-049, FND-051).
 * Both GET and PATCH are wrapped in withRole("admin"); the guard resolves auth
 * via jwtValidation.validateFromHeaders + resolveRoleFromDb.
 *
 * ADM-1: field whitelist tests — PATCH must only pass whitelisted columns to
 * Supabase .update(). Non-whitelisted fields (user_id, id) must be stripped.
 * Invalid status values must be rejected with 400.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { GET, PATCH } from "../route";
import { NextRequest } from "next/server";

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/disputes", {
    method: "GET",
  } as never);
}

/** Creates a PATCH mock request — mocks request.json() directly (NextRequest
 *  body is not parseable in the node test environment). */
function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEq.mockResolvedValue({ data: {}, error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
  mockCreateClient.mockReturnValue({ from: mockFrom });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("Admin Disputes API – /api/admin/disputes", () => {
  describe("negative-auth", () => {
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

    it("PATCH should return 401 when the request is not authenticated", async () => {
      mockValidate.mockResolvedValue({ valid: false, user: null });

      const res = await PATCH(makePatchRequest({}));
      expect(res.status).toBe(401);
    });

    it("PATCH should return 403 when the authenticated user is not an admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");

      const res = await PATCH(makePatchRequest({}));
      expect(res.status).toBe(403);
    });
  });

  describe("ADM-1: field whitelist on PATCH (FND-051/054)", () => {
    beforeEach(() => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "admin-1", email: "admin@example.com" },
      });
      mockResolveRole.mockResolvedValue("admin");
    });

    it("PATCH strips non-whitelisted fields (user_id, id) from the .update() payload", async () => {
      const req = makePatchRequest({
        disputeId: "dispute-42",
        updates: {
          status: "resolved",
          user_id: "attacker-uid",
          id: "some-other-id",
          notes: "Admin note",
        },
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const payload = mockUpdate.mock.calls[0][0] as Record<string, unknown>;

      // Whitelisted fields present
      expect(payload).toHaveProperty("status", "resolved");
      expect(payload).toHaveProperty("notes", "Admin note");

      // Non-whitelisted fields MUST be absent
      expect(payload).not.toHaveProperty("user_id");
      expect(payload).not.toHaveProperty("id");
    });

    it("PATCH with only a valid whitelisted status field writes status to DB", async () => {
      const req = makePatchRequest({
        disputeId: "dispute-99",
        updates: { status: "under_review" },
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const payload = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).toHaveProperty("status", "under_review");
    });

    it("PATCH with an invalid status value returns 400 without calling .update()", async () => {
      const req = makePatchRequest({
        disputeId: "dispute-99",
        updates: { status: "not_a_real_status" },
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("PATCH with only non-whitelisted fields returns 400 (empty payload)", async () => {
      const req = makePatchRequest({
        disputeId: "dispute-99",
        updates: { user_id: "evil", id: "evil", created_at: "evil" },
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("PATCH passes resolved_at and sent_at through the whitelist", async () => {
      const req = makePatchRequest({
        disputeId: "dispute-77",
        updates: {
          resolved_at: "2026-05-18T12:00:00Z",
          sent_at: "2026-05-17T10:00:00Z",
          outcome: "removed",
        },
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      const payload = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).toHaveProperty("resolved_at", "2026-05-18T12:00:00Z");
      expect(payload).toHaveProperty("sent_at", "2026-05-17T10:00:00Z");
      expect(payload).toHaveProperty("outcome", "removed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  database-not-configured (QA-residual: "mock-fallback fabrication in
  //  admin/subscriptions + admin/disputes when Supabase env unset" —
  //  docs/ssot/gap_analysis.md)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("database-not-configured (honest 503, never mock)", () => {
    beforeEach(() => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "admin-1", email: "admin@example.com" },
      });
      mockResolveRole.mockResolvedValue("admin");
    });

    it("GET returns 503 when env vars are missing (never fabricated dispute data)", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toMatch(/database not configured/i);
      expect(body.disputes).toBeUndefined();
    });

    it("PATCH returns 503 when env vars are missing (never a fabricated success)", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const req = makePatchRequest({
        disputeId: "dispute-1",
        updates: { status: "resolved" },
      });

      const res = await PATCH(req);
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toMatch(/database not configured/i);
      expect(body.success).toBeUndefined();
    });
  });
});
