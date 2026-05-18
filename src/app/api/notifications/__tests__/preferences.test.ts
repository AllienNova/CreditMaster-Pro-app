/**
 * @jest-environment node
 *
 * Covers /api/notifications/preferences (TASK-AUTH-03b, FND-041..044).
 * Handlers are wrapped in withAuth. The preferences owner is the authenticated
 * user (`user.id`); the previously trusted `x-user-id` header is gone, so a
 * caller cannot read or mutate another user's preferences.
 *
 * NTF-4: preferences are now persisted via Supabase (notification_preferences
 * table) — not a module-level Record. POST is removed; subscribe/unsubscribe
 * lives in /api/notifications/push/subscribe.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateClient = jest.fn();
const mockFrom = jest.fn();

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

// Import AFTER mocks
import { GET, PUT } from "../../notifications/preferences/route";
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
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  if (options?.body) {
    init.method = options.method || "PUT";
    init.body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  init.headers = headers;
  return new NextRequest(absoluteUrl, init as never);
}

function authenticate(id: string) {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id, email: `${id}@example.com` },
  });
  mockResolveRole.mockResolvedValue("user");
}

// ── Supabase chain helper ─────────────────────────────────────────────────────

function createChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.upsert = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockReturnValue(chain);
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return chain;
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateClient.mockReturnValue({ from: mockFrom });
  // Default: no existing row in DB
  mockFrom.mockReturnValue(createChain({ data: null, error: null }));
});

// ═══════════════════════════════════════════════════════════════════════════════
// negative-auth — 401 for anonymous callers
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – negative-auth", () => {
  beforeEach(() => {
    mockValidate.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when not authenticated", async () => {
    const res = await GET(makeRequest("/api/notifications/preferences"));
    expect(res.status).toBe(401);
  });

  it("PUT returns 401 when not authenticated", async () => {
    const res = await PUT(
      makeRequest("/api/notifications/preferences", {
        method: "PUT",
        body: { smsEnabled: true },
      }),
    );
    expect(res.status).toBe(401);
  });

  // POST was removed (NTF-4) — subscribe/unsubscribe lives in
  // /api/notifications/push/subscribe/route.ts
});

// ═══════════════════════════════════════════════════════════════════════════════
// ownership — preferences are scoped to the authed user, not x-user-id
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – ownership scoping", () => {
  it("GET scopes to the authed user and ignores an x-user-id header", async () => {
    authenticate("owner-user");

    const res = await GET(
      makeRequest("/api/notifications/preferences", {
        headers: { "x-user-id": "victim-user" },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences.userId).toBe("owner-user");
  });

  it("PUT writes preferences for the authed user, ignoring x-user-id and body userId", async () => {
    authenticate("writer-user");

    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { userId: "victim-user", smsEnabled: true },
      headers: { "x-user-id": "victim-user" },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ userId: "victim-user", smsEnabled: true });

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences.userId).toBe("writer-user");
    expect(body.preferences.smsEnabled).toBe(true);
  });

  it("a second user cannot read the first user's stored preferences", async () => {
    // user-a: PUT with emailEnabled:false. mockFrom returns no-row for the
    // existing-check and then accepts the upsert (all via default null chain).
    authenticate("user-a");
    const putReq = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { emailEnabled: false },
    });
    putReq.json = jest.fn().mockResolvedValue({ emailEnabled: false });
    await PUT(putReq);

    // user-b: GET returns no stored row → default preferences (emailEnabled=true).
    // mockFrom is still returning { data: null, error: null } from beforeEach default.
    authenticate("user-b");
    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(body.preferences.userId).toBe("user-b");
    expect(body.preferences.emailEnabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications/preferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – GET", () => {
  beforeEach(() => authenticate("get-user"));

  it("should return default preferences when none are stored", async () => {
    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences).toBeDefined();
    expect(body.preferences.pushEnabled).toBe(true);
    expect(body.preferences.emailEnabled).toBe(true);
    expect(body.preferences.smsEnabled).toBe(false);
  });

  it("should return default channel settings", async () => {
    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(body.preferences.channels.dispute_update).toBe(true);
    expect(body.preferences.channels.score_change).toBe(true);
    expect(body.preferences.channels.payment_reminder).toBe(true);
    expect(body.preferences.channels.document_processed).toBe(true);
    expect(body.preferences.channels.recommendation).toBe(true);
    expect(body.preferences.channels.system).toBe(true);
    expect(body.preferences.channels.promotion).toBe(false);
  });

  it("should return default quiet hours settings", async () => {
    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(body.preferences.quietHours.enabled).toBe(false);
    expect(body.preferences.quietHours.start).toBe("22:00");
    expect(body.preferences.quietHours.end).toBe("08:00");
  });

  it("should key preferences off the authenticated user id", async () => {
    authenticate("custom-user-42");
    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(body.preferences.userId).toBe("custom-user-42");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/notifications/preferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – PUT", () => {
  it("should update top-level preference fields", async () => {
    authenticate("put-user-1");
    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { smsEnabled: true },
    });
    req.json = jest.fn().mockResolvedValue({ smsEnabled: true });

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.preferences.smsEnabled).toBe(true);
    expect(body.preferences.pushEnabled).toBe(true);
    expect(body.preferences.emailEnabled).toBe(true);
  });

  it("should deep-merge channel updates", async () => {
    authenticate("put-user-2");
    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { channels: { promotion: true } },
    });
    req.json = jest.fn().mockResolvedValue({ channels: { promotion: true } });

    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences.channels.promotion).toBe(true);
    expect(body.preferences.channels.dispute_update).toBe(true);
    expect(body.preferences.channels.system).toBe(true);
  });

  it("should deep-merge quietHours updates", async () => {
    authenticate("put-user-3");
    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { quietHours: { enabled: true } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ quietHours: { enabled: true } });

    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences.quietHours.enabled).toBe(true);
    expect(body.preferences.quietHours.start).toBe("22:00");
    expect(body.preferences.quietHours.end).toBe("08:00");
  });

  it("should prevent userId from being overridden by the request body", async () => {
    authenticate("put-user-4");
    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { userId: "hacker-user" },
    });
    req.json = jest.fn().mockResolvedValue({ userId: "hacker-user" });

    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences.userId).toBe("put-user-4");
  });

  it("should persist preferences across requests for the same user", async () => {
    authenticate("persist-user");

    // PUT: existing=null → merges defaults → upserts
    const req1 = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { emailEnabled: false },
    });
    req1.json = jest.fn().mockResolvedValue({ emailEnabled: false });
    await PUT(req1);

    // After PUT, simulate the DB now having the stored row
    mockFrom.mockReturnValue(
      createChain({
        data: {
          user_id: "persist-user",
          push_enabled: true,
          email_enabled: false,
          sms_enabled: false,
          channels: {
            dispute_update: true,
            score_change: true,
            payment_reminder: true,
            document_processed: true,
            recommendation: true,
            system: true,
            promotion: false,
          },
          quiet_hours: { enabled: false, start: "22:00", end: "08:00" },
        },
        error: null,
      }),
    );

    const res = await GET(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(body.preferences.emailEnabled).toBe(false);
    expect(body.preferences.userId).toBe("persist-user");
  });

  it("should return 500 when request.json() throws", async () => {
    authenticate("put-user-err");
    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
    });
    req.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update preferences");
  });
});

// NTF-4: POST (/subscribe/unsubscribe) was removed from this route.
// Real push subscribe/unsubscribe lives in /api/notifications/push/subscribe/route.ts.
// POST tests are covered there; see push-routes.test.ts.
