/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Routes wrapped in withRole("admin") (TASK-AUTH-03a); guard resolves auth via
// jwtValidation.validateFromHeaders + resolveRoleFromDb.
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

const mockFrom = jest.fn();
const mockAuth = {
  admin: {
    listUsers: jest.fn(),
  },
};
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import AFTER mocks
import { GET, DELETE } from "../../admin/subscriptions/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(
  url: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
) {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method || "GET" };
  const headers: Record<string, string> = {};
  if (options?.headers) Object.assign(headers, options.headers);
  if (options?.body) {
    init.method = options.method || "POST";
    init.body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  init.headers = headers;
  return new NextRequest(absoluteUrl, init as never);
}

function makeDeleteRequest(body: Record<string, unknown>) {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
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

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/subscriptions
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Subscriptions API – GET /api/admin/subscriptions", () => {
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/subscriptions"),
      );
      expect(mockValidate).toHaveBeenCalled();
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      authenticatedNonAdmin();
      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/subscriptions"),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Database not configured (honest 503, never mock)", () => {
    beforeEach(() => {
      authenticatedAdmin();
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    it("returns 503 with no fabricated subscriptions when Supabase is not configured", async () => {
      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/subscriptions"),
      );
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toMatch(/database not configured/i);
      expect(body.subscriptions).toBeUndefined();
    });
  });

  describe("Live data (with Supabase)", () => {
    const subscriptionRows = [
      {
        id: "s1",
        user_id: "u1",
        stripe_subscription_id: "sub_abc",
        status: "active",
        created_at: "2024-11-01",
      },
      {
        id: "s2",
        user_id: "u2",
        stripe_subscription_id: "sub_def",
        status: "canceled",
        created_at: "2024-10-15",
      },
    ];

    beforeEach(() => {
      authenticatedAdmin();
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it("should return enriched subscriptions from Supabase", async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: subscriptionRows,
        error: null,
      });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({ select: selectMock });

      mockAuth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            { id: "u1", email: "user1@example.com" },
            { id: "u2", email: "user2@example.com" },
          ],
        },
      });

      mockCreateClient.mockReturnValue({
        from: mockFrom,
        auth: mockAuth,
      });

      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/subscriptions"),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.subscriptions).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.subscriptions[0].user_email).toBe("user1@example.com");
      expect(body.subscriptions[1].user_email).toBe("user2@example.com");
    });

    it("should return 'Unknown' for users not found in auth", async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: subscriptionRows,
        error: null,
      });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({ select: selectMock });

      mockAuth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
      });

      mockCreateClient.mockReturnValue({
        from: mockFrom,
        auth: mockAuth,
      });

      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/subscriptions"),
      );
      const body = await res.json();

      expect(body.subscriptions[0].user_email).toBe("Unknown");
      expect(body.subscriptions[1].user_email).toBe("Unknown");
    });

    it("should return 500 when Supabase query returns error", async () => {
      const orderMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({ select: selectMock });

      mockCreateClient.mockReturnValue({
        from: mockFrom,
        auth: mockAuth,
      });

      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/subscriptions"),
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to fetch subscriptions");
    });
  });

  describe("Exception handling", () => {
    it("should return 500 on unexpected throw", async () => {
      authenticatedAdmin();
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      mockCreateClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          throw new Error("Connection failed");
        }),
      });

      const res = await GET(
        makeRequest("http://localhost:3000/api/admin/subscriptions"),
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/admin/subscriptions
// ═══════════════════════════════════════════════════════════════════════════════
describe("Admin Subscriptions API – DELETE /api/admin/subscriptions", () => {
  // DELETE is wrapped in withRole("admin") (TASK-AUTH-03a, FND-050).
  beforeEach(() => {
    authenticatedAdmin();
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      unauthenticated();
      const req = makeDeleteRequest({ subscriptionId: "sub_1234" });
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it("should return 403 when authenticated user is not admin", async () => {
      authenticatedNonAdmin();
      const req = makeDeleteRequest({ subscriptionId: "sub_1234" });
      const res = await DELETE(req);
      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    it("should return 400 when subscriptionId is missing", async () => {
      const req = makeDeleteRequest({});
      const res = await DELETE(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing subscriptionId");
    });

    it("should return 400 when subscriptionId is empty string", async () => {
      const req = makeDeleteRequest({ subscriptionId: "" });
      const res = await DELETE(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Missing subscriptionId");
    });
  });

  describe("Cancellation with no DB configured (honest 503, never mock)", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    it("returns 503 (never a fabricated success) when Supabase is not configured", async () => {
      const req = makeDeleteRequest({ subscriptionId: "sub_1234" });
      const res = await DELETE(req);
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.error).toMatch(/database not configured/i);
      expect(body.success).toBeUndefined();
    });
  });

  describe("Live cancellation (with Supabase)", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it("should cancel subscription and return success", async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ update: updateMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makeDeleteRequest({ subscriptionId: "sub_1234" });
      const res = await DELETE(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should update status to 'canceled' and cancel_at_period_end to true", async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ update: updateMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makeDeleteRequest({ subscriptionId: "sub_5678" });
      await DELETE(req);

      expect(updateMock).toHaveBeenCalledWith({
        status: "canceled",
        cancel_at_period_end: true,
      });
      expect(eqMock).toHaveBeenCalledWith(
        "stripe_subscription_id",
        "sub_5678",
      );
    });

    it("should return 500 when Supabase update fails", async () => {
      const eqMock = jest.fn().mockResolvedValue({
        error: { message: "Update failed" },
      });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      mockFrom.mockReturnValue({ update: updateMock });
      mockCreateClient.mockReturnValue({ from: mockFrom });

      const req = makeDeleteRequest({ subscriptionId: "sub_1234" });
      const res = await DELETE(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to cancel subscription");
    });
  });

  describe("Exception handling", () => {
    it("should return 500 when request.json() throws", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("Parse error")),
      } as unknown as NextRequest;

      const res = await DELETE(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });
});
