/**
 * @jest-environment node
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Routes wrapped in withRole("admin") (TASK-AUTH-03a); guard resolves auth via
// jwtValidation.validateFromHeaders + resolveRoleFromDb.
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

// Mock @supabase/supabase-js
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import AFTER mocks
import { GET as getAudit, POST as postAudit } from "../audit/route";
import { GET as getLogs } from "../logs/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(url: string) {
  const absoluteUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  return new NextRequest(absoluteUrl);
}

function makePostRequest(url: string, body: Record<string, unknown>) {
  const absoluteUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const req = new NextRequest(absoluteUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  req.json = jest.fn().mockResolvedValue(body);
  return req;
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

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AUDIT – GET /api/admin/audit
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Audit API – GET /api/admin/audit", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await getAudit(
        makeRequest("http://localhost:3000/api/admin/audit"),
      );
      expect(mockValidate).toHaveBeenCalled();
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await getAudit(
        makeRequest("http://localhost:3000/api/admin/audit"),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Successful retrieval from Supabase", () => {
    const auditRows = [
      {
        id: "a1",
        action: "login",
        user_id: "u1",
        created_at: "2024-11-01T10:00:00Z",
        profiles: { full_name: "User 1", email: "u1@example.com" },
      },
      {
        id: "a2",
        action: "payment_made",
        user_id: "u2",
        created_at: "2024-11-02T10:00:00Z",
        profiles: { full_name: "User 2", email: "u2@example.com" },
      },
    ];

    beforeEach(() => {
      authenticatedAdmin();
    });

    function setupSuccessfulQuery(data: unknown[], count: number) {
      const orderMock = jest.fn().mockResolvedValue({
        data,
        count,
        error: null,
      });
      const rangeMock = jest.fn().mockReturnValue({ order: orderMock });
      const lteMock = jest.fn().mockReturnValue({ range: rangeMock });
      const gteMock = jest.fn().mockReturnValue({ lte: lteMock, range: rangeMock });
      const eqUserId = jest.fn().mockReturnValue({ gte: gteMock, lte: lteMock, range: rangeMock });
      const eqAction = jest.fn().mockReturnValue({
        eq: eqUserId,
        gte: gteMock,
        lte: lteMock,
        range: rangeMock,
      });
      const selectMock = jest.fn().mockReturnValue({
        eq: eqAction,
        gte: gteMock,
        lte: lteMock,
        range: rangeMock,
      });

      mockFrom.mockReturnValue({ select: selectMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });
    }

    it("should return audit logs with pagination metadata", async () => {
      setupSuccessfulQuery(auditRows, 2);

      const res = await getAudit(
        makeRequest("http://localhost:3000/api/admin/audit"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.logs).toBeDefined();
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(50);
      expect(body.totalPages).toBe(1);
    });

    it("should pass page and limit from query params", async () => {
      setupSuccessfulQuery(auditRows, 100);

      const res = await getAudit(
        makeRequest("http://localhost:3000/api/admin/audit?page=2&limit=10"),
      );
      const body = await res.json();

      expect(body.page).toBe(2);
      expect(body.limit).toBe(10);
      expect(body.totalPages).toBe(10);
    });

    it("should default page to 1 and limit to 50", async () => {
      setupSuccessfulQuery([], 0);

      const res = await getAudit(
        makeRequest("http://localhost:3000/api/admin/audit"),
      );
      const body = await res.json();

      expect(body.page).toBe(1);
      expect(body.limit).toBe(50);
    });
  });

  describe("Table does not exist (42P01)", () => {
    it("should return 500 with error when audit_logs table is missing", async () => {
      authenticatedAdmin();

      const orderMock = jest.fn().mockResolvedValue({
        data: null,
        count: null,
        error: { code: "42P01", message: "relation does not exist" },
      });
      const rangeMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ range: rangeMock });
      mockFrom.mockReturnValue({ select: selectMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const res = await getAudit(
        makeRequest("http://localhost:3000/api/admin/audit"),
      );
      const body = await res.json();

      // Route now returns an explicit error — no fabricated mock logs
      expect(res.status).toBe(500);
      expect(body.error).toBeDefined();
      expect(body.logs).toBeUndefined();
    });
  });

  describe("Exception handling", () => {
    it("should return 500 with error on unexpected exception", async () => {
      authenticatedAdmin();
      mockCreateClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          throw new Error("Connection failed");
        }),
      });

      const res = await getAudit(
        makeRequest("http://localhost:3000/api/admin/audit"),
      );
      const body = await res.json();

      // Route returns explicit 500 — no fabricated mock logs
      expect(res.status).toBe(500);
      expect(body.error).toBeDefined();
      expect(body.logs).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AUDIT – POST /api/admin/audit
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Audit API – POST /api/admin/audit", () => {
  // POST is now wrapped in withRole("admin") (TASK-AUTH-03a, FND-050).
  beforeEach(() => {
    authenticatedAdmin();
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const req = makePostRequest("http://localhost:3000/api/admin/audit", {
        action: "login",
        userId: "u1",
      });
      const res = await postAudit(req);
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const req = makePostRequest("http://localhost:3000/api/admin/audit", {
        action: "login",
        userId: "u1",
      });
      const res = await postAudit(req);
      expect(res.status).toBe(403);
    });
  });

  describe("Successful log creation", () => {
    it("should insert an audit log entry and return it", async () => {
      const createdRow = {
        id: "a-new",
        action: "login",
        user_id: "u1",
        details: { success: true },
        ip_address: "192.168.1.1",
        created_at: "2024-11-01T10:00:00Z",
      };

      const singleMock = jest.fn().mockResolvedValue({
        data: createdRow,
        error: null,
      });
      const selectMock = jest.fn().mockReturnValue({ single: singleMock });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      mockFrom.mockReturnValue({ insert: insertMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makePostRequest("http://localhost:3000/api/admin/audit", {
        action: "login",
        userId: "u1",
        details: { success: true },
        ipAddress: "192.168.1.1",
      });

      const res = await postAudit(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.log).toEqual(createdRow);
    });

    it("should pass the correct payload to Supabase insert", async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: { id: "a1" },
        error: null,
      });
      const selectMock = jest.fn().mockReturnValue({ single: singleMock });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      mockFrom.mockReturnValue({ insert: insertMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makePostRequest("http://localhost:3000/api/admin/audit", {
        action: "dispute_created",
        userId: "u5",
        details: { disputeId: "d100" },
        ipAddress: "10.0.0.1",
      });

      await postAudit(req);

      expect(mockFrom).toHaveBeenCalledWith("audit_logs");
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "dispute_created",
          user_id: "u5",
          details: { disputeId: "d100" },
          ip_address: "10.0.0.1",
        }),
      );
    });
  });

  describe("Error handling", () => {
    it("should return 500 when Supabase insert fails", async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });
      const selectMock = jest.fn().mockReturnValue({ single: singleMock });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      mockFrom.mockReturnValue({ insert: insertMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makePostRequest("http://localhost:3000/api/admin/audit", {
        action: "login",
        userId: "u1",
        details: {},
        ipAddress: "1.2.3.4",
      });

      const res = await postAudit(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to create audit log");
    });

    it("should return 500 when request.json() throws", async () => {
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = new NextRequest("http://localhost:3000/api/admin/audit", {
        method: "POST",
      });
      req.json = jest.fn().mockRejectedValue(new Error("Bad JSON"));

      const res = await postAudit(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to create audit log");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  LOGS – GET /api/admin/logs
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Logs API – GET /api/admin/logs", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await getLogs(
        makeRequest("http://localhost:3000/api/admin/logs"),
      );
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      mockValidate.mockResolvedValue({
        valid: true,
        user: { id: "user-1", email: "user@example.com" },
      });
      mockResolveRole.mockResolvedValue("user");
      const res = await getLogs(
        makeRequest("http://localhost:3000/api/admin/logs"),
      );
      expect(res.status).toBe(403);
    });
  });

  // ADM-2 (FND-052/053): system_logs table does not exist. The route now returns
  // an honest-unavailable response (dataAvailable:false) rather than fabricated
  // log entries. Tests below verify the new contract across all call paths.

  describe("Honest-unavailable response", () => {
    beforeEach(() => {
      authenticatedAdmin();
    });

    it("should return dataAvailable:false and empty logs array", async () => {
      const res = await getLogs(
        makeRequest("http://localhost:3000/api/admin/logs"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.dataAvailable).toBe(false);
      expect(body.logs).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("should return dataAvailable:false regardless of page/limit params", async () => {
      const res = await getLogs(
        makeRequest("http://localhost:3000/api/admin/logs?page=3&limit=25"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.dataAvailable).toBe(false);
      expect(body.logs).toEqual([]);
    });

    it("should include an informational message field", async () => {
      const res = await getLogs(
        makeRequest("http://localhost:3000/api/admin/logs"),
      );
      const body = await res.json();

      expect(body.message).toBeDefined();
      expect(typeof body.message).toBe("string");
    });

    it("should NOT query system_logs (table does not exist)", async () => {
      await getLogs(makeRequest("http://localhost:3000/api/admin/logs"));

      // Route returns immediately; Supabase should never be called
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
