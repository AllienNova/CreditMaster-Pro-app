/**
 * @jest-environment node
 *
 * Covers /api/notifications/preferences (TASK-AUTH-03b, FND-041..044).
 * Handlers are wrapped in withAuth. The preferences owner is the authenticated
 * user (`user.id`); the previously trusted `x-user-id` header is gone, so a
 * caller cannot read or mutate another user's preferences.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

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
import { GET, PUT, POST } from "../../notifications/preferences/route";
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

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
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

  it("POST returns 401 when not authenticated", async () => {
    const res = await POST(
      makeRequest("/api/notifications/preferences", {
        method: "POST",
        body: { action: "unsubscribe" },
      }),
    );
    expect(res.status).toBe(401);
  });
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
    authenticate("user-a");
    const putReq = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { emailEnabled: false },
    });
    putReq.json = jest.fn().mockResolvedValue({ emailEnabled: false });
    await PUT(putReq);

    // A different authenticated user gets their own defaults, not user-a's.
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

    const req1 = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { emailEnabled: false },
    });
    req1.json = jest.fn().mockResolvedValue({ emailEnabled: false });
    await PUT(req1);

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

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications/preferences (subscribe/unsubscribe)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notification Preferences API – POST", () => {
  beforeEach(() => authenticate("post-user"));

  it("should handle subscribe action with subscription data", async () => {
    const req = makeRequest("/api/notifications/preferences", {
      method: "POST",
      body: {
        action: "subscribe",
        subscription: { endpoint: "https://push.example.com" },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      action: "subscribe",
      subscription: { endpoint: "https://push.example.com" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Subscribed to push notifications");
  });

  it("should handle unsubscribe action", async () => {
    const req = makeRequest("/api/notifications/preferences", {
      method: "POST",
      body: { action: "unsubscribe" },
    });
    req.json = jest.fn().mockResolvedValue({ action: "unsubscribe" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Unsubscribed from push notifications");
  });

  it("should return 400 for invalid action", async () => {
    const req = makeRequest("/api/notifications/preferences", {
      method: "POST",
      body: { action: "unknown_action" },
    });
    req.json = jest.fn().mockResolvedValue({ action: "unknown_action" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 400 for subscribe without subscription data", async () => {
    const req = makeRequest("/api/notifications/preferences", {
      method: "POST",
      body: { action: "subscribe" },
    });
    req.json = jest.fn().mockResolvedValue({ action: "subscribe" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 500 when request.json() throws", async () => {
    const req = makeRequest("/api/notifications/preferences", {
      method: "POST",
    });
    req.json = jest.fn().mockRejectedValue(new Error("Parse error"));

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to process request");
  });
});
