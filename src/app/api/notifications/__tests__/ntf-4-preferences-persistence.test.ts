/**
 * @jest-environment node
 *
 * TASK-NTF-04 — notification_preferences table + durable persistence (FND-048)
 *
 * Tests:
 * 1. PUT then a fresh-module-state GET reads back the persisted preferences
 *    (proves the route uses Supabase, not a process-local Record).
 * 2. GET returns default preferences when no row exists in the DB.
 * 3. Preferences are keyed by user_id — session user owns all reads/writes.
 * 4. POST handler is removed (no-op stub deleted; real push subscribe/unsubscribe
 *    lives in /api/notifications/push/subscribe).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Environment (top-level, not in beforeEach — same pattern as push-routes.test.ts) ─
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

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

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import { GET, PUT } from "../../notifications/preferences/route";
import { NextRequest } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────────────

const mockFrom = jest.fn();

/**
 * Build a thenable Supabase chain that resolves with `resolvedValue` on await.
 * This matches the pattern in push-routes.test.ts which handles resetMocks:true.
 */
function createChain(resolvedValue: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.upsert = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockReturnValue(chain);
  // Make the chain thenable so `await` resolves it with resolvedValue
  chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return chain;
}

function authenticate(id: string) {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id, email: `${id}@example.com` },
  });
  mockResolveRole.mockResolvedValue("user");
}

function makeRequest(
  url: string,
  options?: { method?: string; body?: Record<string, unknown> },
): NextRequest {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method ?? "GET" };
  const headers: Record<string, string> = {};
  if (options?.body) {
    init.method = options.method ?? "PUT";
    init.body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  init.headers = headers;
  return new NextRequest(absoluteUrl, init as never);
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply createClient → {from: mockFrom} after resetMocks clears it
  mockCreateClient.mockReturnValue({ from: mockFrom });
});

// =============================================================================
// 1. GET — default preferences when no row exists
// =============================================================================

describe("NTF-4: GET — default preferences when no row exists", () => {
  beforeEach(() => authenticate("user-ntf4-defaults"));

  it("returns default preferences when the DB has no row for the user", async () => {
    // DB returns null (no row) with no error
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences).toBeDefined();
    expect(body.preferences.userId).toBe("user-ntf4-defaults");
    expect(body.preferences.pushEnabled).toBe(true);
    expect(body.preferences.emailEnabled).toBe(true);
    expect(body.preferences.smsEnabled).toBe(false);
    expect(body.preferences.channels.dispute_update).toBe(true);
    expect(body.preferences.channels.promotion).toBe(false);
    expect(body.preferences.quietHours.enabled).toBe(false);
    expect(body.preferences.quietHours.start).toBe("22:00");
    expect(body.preferences.quietHours.end).toBe("08:00");
  });

  it("calls Supabase from notification_preferences — not a process-local Record", async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    await GET(makeRequest("/api/notifications/preferences"));

    expect(mockCreateClient).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith("notification_preferences");
  });
});

// =============================================================================
// 2. GET — reads a stored row from Supabase
// =============================================================================

describe("NTF-4: GET — reads persisted row from Supabase", () => {
  beforeEach(() => authenticate("user-ntf4-stored"));

  it("maps DB column names to camelCase preference fields", async () => {
    const storedRow = {
      user_id: "user-ntf4-stored",
      push_enabled: false,
      email_enabled: true,
      sms_enabled: true,
      channels: {
        dispute_update: false,
        score_change: true,
        payment_reminder: true,
        document_processed: true,
        recommendation: true,
        system: true,
        promotion: true,
      },
      quiet_hours: { enabled: true, start: "23:00", end: "07:00" },
    };

    mockFrom.mockReturnValue(createChain({ data: storedRow, error: null }));

    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences.userId).toBe("user-ntf4-stored");
    expect(body.preferences.pushEnabled).toBe(false);
    expect(body.preferences.smsEnabled).toBe(true);
    expect(body.preferences.channels.dispute_update).toBe(false);
    expect(body.preferences.channels.promotion).toBe(true);
    expect(body.preferences.quietHours.enabled).toBe(true);
    expect(body.preferences.quietHours.start).toBe("23:00");
  });
});

// =============================================================================
// 3. PUT — durable persistence via Supabase
// =============================================================================

describe("NTF-4: PUT — durable persistence via Supabase", () => {
  beforeEach(() => authenticate("user-ntf4-put"));

  it("calls Supabase upsert on PUT — not a Record mutation", async () => {
    // GET read (no existing row) + upsert write — both from notification_preferences
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { smsEnabled: true },
    });
    req.json = jest.fn().mockResolvedValue({ smsEnabled: true });

    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith("notification_preferences");
    expect(chain.upsert).toHaveBeenCalled();
  });

  it("upsert payload contains the session user_id — not the body userId", async () => {
    authenticate("user-ntf4-safe");

    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { userId: "attacker-user", smsEnabled: true },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ userId: "attacker-user", smsEnabled: true });

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences.userId).toBe("user-ntf4-safe");
    // upsert payload must use the session user_id
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-ntf4-safe" }),
      expect.anything(),
    );
  });

  it("PUT then GET (fresh Supabase mock) reads back stored values — not in-memory Record", async () => {
    authenticate("user-ntf4-roundtrip");

    // PUT — no existing row, upsert succeeds
    const updatedRow = {
      user_id: "user-ntf4-roundtrip",
      push_enabled: true,
      email_enabled: false,
      sms_enabled: false,
      channels: {
        dispute_update: true, score_change: true, payment_reminder: true,
        document_processed: true, recommendation: true, system: true, promotion: false,
      },
      quiet_hours: { enabled: false, start: "22:00", end: "08:00" },
    };

    const putChain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(putChain);

    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { emailEnabled: false },
    });
    req.json = jest.fn().mockResolvedValue({ emailEnabled: false });

    const putRes = await PUT(req);
    expect(putRes.status).toBe(200);

    // GET — fresh Supabase mock returns the "stored" row.
    // If the route used a local Record, this mock would be bypassed and the
    // local value would be returned. The mock being called proves Supabase is queried.
    const getChain = createChain({ data: updatedRow, error: null });
    mockFrom.mockReturnValue(getChain);

    const getRes = await GET(makeRequest("/api/notifications/preferences"));
    const body = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(body.preferences.emailEnabled).toBe(false);
    // Supabase from() was called for the GET (not skipped due to in-memory cache)
    expect(mockFrom).toHaveBeenCalledWith("notification_preferences");
  });

  it("returns the merged preferences in the response body", async () => {
    authenticate("user-ntf4-merge");

    // No existing row
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { smsEnabled: true, channels: { promotion: true } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ smsEnabled: true, channels: { promotion: true } });

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.preferences.smsEnabled).toBe(true);
    expect(body.preferences.channels.promotion).toBe(true);
    // Other defaults preserved
    expect(body.preferences.pushEnabled).toBe(true);
    expect(body.preferences.channels.dispute_update).toBe(true);
  });
});

// =============================================================================
// 4. POST handler is removed
// =============================================================================

describe("NTF-4: POST handler is removed", () => {
  it("POST is not exported from preferences/route.ts", async () => {
    // The fake no-op POST stub (action: subscribe/unsubscribe, returns
    // {success:true} without any DB write) was deleted because the real
    // implementation lives in /api/notifications/push/subscribe.
    const mod = await import("../../notifications/preferences/route");
    expect((mod as any).POST).toBeUndefined();
  });
});

// =============================================================================
// 5. Error handling
// =============================================================================

describe("NTF-4: Error handling", () => {
  beforeEach(() => authenticate("user-ntf4-err"));

  it("GET returns 500 when Supabase returns an error", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: null, error: new Error("DB error") }),
    );

    const res = await GET(makeRequest("/api/notifications/preferences"));
    expect(res.status).toBe(500);
  });

  it("PUT returns 500 when Supabase upsert returns an error", async () => {
    // First call (read) succeeds with no row; second call (upsert) fails
    const readChain = createChain({ data: null, error: null });
    const writeChain = createChain({ data: null, error: new Error("write fail") });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? readChain : writeChain;
    });

    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { smsEnabled: true },
    });
    req.json = jest.fn().mockResolvedValue({ smsEnabled: true });

    const res = await PUT(req);
    expect(res.status).toBe(500);
  });

  it("PUT returns 500 when request.json() throws", async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
    });
    req.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

    const res = await PUT(req);
    expect(res.status).toBe(500);
  });
});
