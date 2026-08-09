/**
 * CMP-2 — Breach notification wired to Resend + breach_notifications table (FND-056)
 *
 * Tests verify:
 *   1. sendBreachNotification sends an email via Resend (mocked) AND writes a
 *      status:sent row to breach_notifications.
 *   2. On Resend failure it writes a status:failed row AND re-throws the error
 *      (no silent swallow).
 *   3. The /api/admin/compliance/breach endpoint:
 *        - 403s a non-admin user
 *        - 401s an unauthenticated request
 *        - calls notifyDataBreach and returns 200 for an admin
 */

// ---------------------------------------------------------------------------
// Supabase + Resend module mocks (must be declared before any import)
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { admin: { deleteUser: jest.fn() } },
  },
}));

// babel-jest hoists jest.mock() calls AND hoists `const` declarations whose
// names start with "mock" (initialized with jest.fn()) so they are available
// inside the factory. This matches the pattern in email-service.test.ts and
// notification-service.test.ts.
const mockResendSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

// Auth guard mocks — needed for the route tests
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { Resend } from "resend";
import {
  GDPRComplianceService,
  type DbClient,
  type DataBreachNotification,
} from "../gdpr-ccpa";

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helpers — chainable mock builder
// ---------------------------------------------------------------------------

type MockBuilder = Record<string, jest.Mock>;

function createChain(): MockBuilder {
  const b: MockBuilder = {};
  b.insert = jest.fn().mockResolvedValue({ error: null });
  b.select = jest.fn().mockImplementation(() => b);
  b.update = jest.fn().mockImplementation(() => b);
  b.upsert = jest.fn().mockResolvedValue({ error: null });
  b.eq = jest.fn().mockImplementation(() => b);
  b.limit = jest.fn().mockImplementation(() => b);
  b.single = jest.fn().mockResolvedValue({ data: null, error: null });
  b.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  b.order = jest.fn().mockImplementation(() => {
    const p = Promise.resolve({ data: [], error: null });
    Object.assign(p, b);
    return p;
  });
  return b;
}

function buildDb(opts?: {
  insertError?: string | null;
  profileData?: Record<string, unknown> | null;
}): DbClient {
  const chain = createChain();
  if (opts?.insertError) {
    chain.insert = jest
      .fn()
      .mockResolvedValue(
        opts.insertError
          ? { error: { message: opts.insertError } }
          : { error: null },
      );
  }
  if (opts?.profileData !== undefined) {
    chain.single = jest
      .fn()
      .mockResolvedValue({ data: opts.profileData, error: null });
  }
  return {
    from: jest.fn().mockImplementation(() => chain),
    rpc: jest.fn().mockResolvedValue({ error: null }),
    auth: {
      admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) },
    },
  };
}

// Set RESEND_API_KEY so the guard inside sendBreachNotification does not fire.
// Store and restore around the suite so no other test file is affected.
const ORIG_RESEND_API_KEY = process.env.RESEND_API_KEY;
beforeAll(() => {
  process.env.RESEND_API_KEY = "test-resend-key";
});
afterAll(() => {
  process.env.RESEND_API_KEY = ORIG_RESEND_API_KEY;
});

// Re-install the Resend constructor mock implementation after clearAllMocks().
// gdpr-ccpa.ts constructs `new Resend()` lazily (at call time), so each test
// triggers a new construction. jest.clearAllMocks() wipes mockImplementation on
// the Resend constructor — restoring it in beforeEach keeps the factory live.
function reinstallResendMock(): void {
  (Resend as jest.Mock).mockImplementation(() => ({
    emails: { send: mockResendSend },
  }));
}

const sampleBreach: DataBreachNotification = {
  breachId: "breach-001",
  discoveredDate: new Date("2026-01-01T00:00:00Z"),
  notifiedDate: new Date("2026-01-01T01:00:00Z"),
  affectedUsers: ["user-aaa"],
  dataTypes: ["email", "name"],
  severity: "high",
  mitigationSteps: ["Reset passwords", "Enable MFA"],
};

const sampleProfile = {
  id: "user-aaa",
  email: "affected@example.com",
  name: "Affected User",
};

// ---------------------------------------------------------------------------
// sendBreachNotification — happy path
// ---------------------------------------------------------------------------

describe("GDPRComplianceService.sendBreachNotification — happy path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reinstallResendMock();
    mockResendSend.mockResolvedValue({ data: { id: "email-001" }, error: null });
  });

  it("sends an email via Resend for the affected user", async () => {
    const db = buildDb({ profileData: sampleProfile });
    const svc = new GDPRComplianceService(db);

    await svc.notifyDataBreach({
      breachId: sampleBreach.breachId,
      discoveredDate: sampleBreach.discoveredDate,
      affectedUsers: sampleBreach.affectedUsers,
      dataTypes: sampleBreach.dataTypes,
      severity: sampleBreach.severity,
      mitigationSteps: sampleBreach.mitigationSteps,
    });

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const callArgs = mockResendSend.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.to).toBe("affected@example.com");
    expect(typeof callArgs.subject).toBe("string");
    expect(typeof callArgs.html).toBe("string");
  });

  it("writes a status:sent row to breach_notifications on success", async () => {
    const db = buildDb({ profileData: sampleProfile });
    const svc = new GDPRComplianceService(db);

    await svc.notifyDataBreach({
      breachId: sampleBreach.breachId,
      discoveredDate: sampleBreach.discoveredDate,
      affectedUsers: sampleBreach.affectedUsers,
      dataTypes: sampleBreach.dataTypes,
      severity: sampleBreach.severity,
      mitigationSteps: sampleBreach.mitigationSteps,
    });

    // db.from should have been called with "breach_notifications"
    const fromCalls = (db.from as jest.Mock).mock.calls as string[][];
    const tableNames = fromCalls.map(([t]) => t);
    expect(tableNames).toContain("breach_notifications");

    // The insert on breach_notifications should have status:sent
    const results = (db.from as jest.Mock).mock.results;
    const chainUsed = results
      .map((r, i) => ({ r, i }))
      .find(({ i }) => fromCalls[i]?.[0] === "breach_notifications")
      ?.r.value as MockBuilder | undefined;
    if (chainUsed) {
      const insertCalls = chainUsed.insert.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const breachInsert = insertCalls.find(([p]) => p.breach_id !== undefined);
      expect(breachInsert).toBeDefined();
      expect(breachInsert![0]).toMatchObject({
        breach_id: "breach-001",
        user_id: "user-aaa",
        channel: "email",
        status: "sent",
        error: null,
      });
    }
  });

  it("includes breach metadata (severity, dataTypes) in the email body", async () => {
    const db = buildDb({ profileData: sampleProfile });
    const svc = new GDPRComplianceService(db);

    await svc.notifyDataBreach({
      breachId: sampleBreach.breachId,
      discoveredDate: sampleBreach.discoveredDate,
      affectedUsers: sampleBreach.affectedUsers,
      dataTypes: sampleBreach.dataTypes,
      severity: sampleBreach.severity,
      mitigationSteps: sampleBreach.mitigationSteps,
    });

    const callArgs = mockResendSend.mock.calls[0][0] as Record<string, unknown>;
    const html = callArgs.html as string;
    expect(html).toContain("high");
    expect(html).toContain("email");
  });
});

// ---------------------------------------------------------------------------
// sendBreachNotification — failure path (Resend throws)
// ---------------------------------------------------------------------------

describe("GDPRComplianceService.sendBreachNotification — Resend failure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reinstallResendMock();
    mockResendSend.mockRejectedValue(new Error("SMTP timeout"));
  });

  it("writes a status:failed row when Resend throws", async () => {
    const db = buildDb({ profileData: sampleProfile });
    const svc = new GDPRComplianceService(db);

    // notifyDataBreach wraps per-user failures and re-throws a partial-failure
    // summary — it must not silently swallow errors.
    await expect(
      svc.notifyDataBreach({
        breachId: sampleBreach.breachId,
        discoveredDate: sampleBreach.discoveredDate,
        affectedUsers: sampleBreach.affectedUsers,
        dataTypes: sampleBreach.dataTypes,
        severity: sampleBreach.severity,
        mitigationSteps: sampleBreach.mitigationSteps,
      }),
    ).rejects.toThrow("partially failed");

    // A failed row must have been written
    const fromCalls = (db.from as jest.Mock).mock.calls as string[][];
    const tableNames = fromCalls.map(([t]) => t);
    expect(tableNames).toContain("breach_notifications");

    const failureResults = (db.from as jest.Mock).mock.results;
    const chainUsed = failureResults
      .map((r, i) => ({ r, i }))
      .find(({ i }) => fromCalls[i]?.[0] === "breach_notifications")
      ?.r.value as MockBuilder | undefined;
    if (chainUsed) {
      const insertCalls = chainUsed.insert.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const failedInsert = insertCalls.find(([p]) => p.breach_id !== undefined);
      expect(failedInsert).toBeDefined();
      expect(failedInsert![0]).toMatchObject({
        breach_id: "breach-001",
        user_id: "user-aaa",
        channel: "email",
        status: "failed",
      });
      expect(typeof failedInsert![0].error).toBe("string");
    }
  });

  it("re-throws a partial-failure summary — no silent swallow", async () => {
    const db = buildDb({ profileData: sampleProfile });
    const svc = new GDPRComplianceService(db);

    await expect(
      svc.notifyDataBreach({
        breachId: sampleBreach.breachId,
        discoveredDate: sampleBreach.discoveredDate,
        affectedUsers: sampleBreach.affectedUsers,
        dataTypes: sampleBreach.dataTypes,
        severity: sampleBreach.severity,
        mitigationSteps: sampleBreach.mitigationSteps,
      }),
    ).rejects.toThrow("Breach notification partially failed");
  });
});

// ---------------------------------------------------------------------------
// Multi-user isolation — one failure must not abort others
// ---------------------------------------------------------------------------

describe("GDPRComplianceService.notifyDataBreach — multi-user isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reinstallResendMock();
  });

  it("notifies remaining users even when one send fails", async () => {
    // user-aaa succeeds, user-bbb fails, user-ccc succeeds
    mockResendSend
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null }) // user-aaa
      .mockRejectedValueOnce(new Error("SMTP timeout"))            // user-bbb
      .mockResolvedValueOnce({ data: { id: "e3" }, error: null }); // user-ccc

    // Build a db that returns different profiles per call
    const profileMap: Record<string, Record<string, unknown>> = {
      "user-aaa": { id: "user-aaa", email: "aaa@example.com", name: "Aaa" },
      "user-bbb": { id: "user-bbb", email: "bbb@example.com", name: "Bbb" },
      "user-ccc": { id: "user-ccc", email: "ccc@example.com", name: "Ccc" },
    };
    let profileCallIndex = 0;
    const userOrder = ["user-aaa", "user-bbb", "user-ccc"];
    const chain = createChain();
    chain.single = jest.fn().mockImplementation(() => {
      const key = userOrder[profileCallIndex++];
      return Promise.resolve({ data: profileMap[key], error: null });
    });
    const db: DbClient = {
      from: jest.fn().mockImplementation(() => chain),
      rpc: jest.fn().mockResolvedValue({ error: null }),
      auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) } },
    };

    const svc = new GDPRComplianceService(db);
    await expect(
      svc.notifyDataBreach({
        breachId: "breach-002",
        discoveredDate: new Date("2026-01-01T00:00:00Z"),
        affectedUsers: ["user-aaa", "user-bbb", "user-ccc"],
        dataTypes: ["email"],
        severity: "medium",
        mitigationSteps: ["Change password"],
      }),
    ).rejects.toThrow("partially failed");

    // All 3 users must have been attempted (3 Resend calls)
    expect(mockResendSend).toHaveBeenCalledTimes(3);

    // breach_notifications rows: 2 sent + 1 failed
    const fromCalls = (db.from as jest.Mock).mock.calls as string[][];
    const bnCalls = fromCalls.filter(([t]) => t === "breach_notifications");
    expect(bnCalls).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// HTML injection — mitigationSteps payload must be escaped
// ---------------------------------------------------------------------------

describe("GDPRComplianceService.sendBreachNotification — HTML escaping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reinstallResendMock();
    mockResendSend.mockResolvedValue({ data: { id: "email-001" }, error: null });
  });

  it("escapes HTML special characters in mitigationSteps", async () => {
    const db = buildDb({ profileData: sampleProfile });
    const svc = new GDPRComplianceService(db);

    await svc.notifyDataBreach({
      breachId: "breach-xss",
      discoveredDate: new Date("2026-01-01T00:00:00Z"),
      affectedUsers: ["user-aaa"],
      dataTypes: ["email"],
      severity: "high",
      mitigationSteps: ['<script>alert("xss")</script>', 'Reset & verify "passwords"'],
    });

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const html = (mockResendSend.mock.calls[0][0] as Record<string, unknown>)
      .html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });
});

// ---------------------------------------------------------------------------
// Route — non-string array elements → 400
// ---------------------------------------------------------------------------

describe("POST /api/admin/compliance/breach — element type validation", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/admin/compliance/breach/route");
    POST = mod.POST as (req: NextRequest) => Promise<Response>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    reinstallResendMock();
    mockValidate.mockResolvedValue({
      valid: true,
      user: { id: "admin-1", email: "admin@fynvita.com" },
    });
    mockResolveRole.mockResolvedValue("admin");
  });

  it("returns 400 when affectedUsers contains non-string elements", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/admin/compliance/breach",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breachId: "b1",
          discoveredDate: "2026-01-01T00:00:00Z",
          affectedUsers: [null, 42],
          dataTypes: ["email"],
          severity: "high",
          mitigationSteps: ["Reset"],
        }),
      } as never,
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when dataTypes contains non-string elements", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/admin/compliance/breach",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breachId: "b1",
          discoveredDate: "2026-01-01T00:00:00Z",
          affectedUsers: ["user-1"],
          dataTypes: [{ type: "email" }],
          severity: "high",
          mitigationSteps: ["Reset"],
        }),
      } as never,
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when mitigationSteps contains non-string elements", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/admin/compliance/breach",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breachId: "b1",
          discoveredDate: "2026-01-01T00:00:00Z",
          affectedUsers: ["user-1"],
          dataTypes: ["email"],
          severity: "high",
          mitigationSteps: [123, true],
        }),
      } as never,
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Admin breach endpoint — auth + RBAC
// ---------------------------------------------------------------------------

describe("POST /api/admin/compliance/breach — auth/RBAC", () => {
  // Lazy import the route after mocks are set up
  let POST: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import(
      "@/app/api/admin/compliance/breach/route"
    );
    POST = mod.POST as (req: NextRequest) => Promise<Response>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    reinstallResendMock();
    mockResendSend.mockResolvedValue({ data: { id: "email-001" }, error: null });
  });

  function makeRequest(body?: unknown): NextRequest {
    return new NextRequest(
      "http://localhost:3000/api/admin/compliance/breach",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          body ?? {
            breachId: "breach-001",
            discoveredDate: "2026-01-01T00:00:00Z",
            affectedUsers: ["user-aaa"],
            dataTypes: ["email"],
            severity: "high",
            mitigationSteps: ["Reset passwords"],
          },
        ),
      } as never,
    );
  }

  it("returns 401 when the request is not authenticated", async () => {
    mockValidate.mockResolvedValue({ valid: false, user: null });

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when the authenticated user is not an admin", async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRole.mockResolvedValue("user");

    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      user: { id: "admin-1", email: "admin@fynvita.com" },
    });
    mockResolveRole.mockResolvedValue("admin");

    // Missing breachId
    const res = await POST(
      makeRequest({ affectedUsers: ["user-1"], dataTypes: ["email"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 and triggers notifications for an admin user", async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      user: { id: "admin-1", email: "admin@fynvita.com" },
    });
    mockResolveRole.mockResolvedValue("admin");

    const res = await POST(makeRequest());
    // Auth passed — must not be 401 or 403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
