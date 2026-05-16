/**
 * @jest-environment node
 *
 * Covers the push notification routes (TASK-AUTH-03b, FND-041..044):
 *  - /api/notifications/push/vapid-key (PUBLIC — genuinely no auth)
 *  - /api/notifications/push/subscribe (withAuth — scoped to user.id)
 *  - /api/notifications/push/send     (withAuth — scoped to user.id)
 *
 * subscribe/send no longer accept a client-supplied `userId`/`userIds`; the
 * owning user is always the authenticated user. Tests that previously asserted
 * the unauthenticated client-userId behavior were updated to the secure model
 * (they encoded the FND-041..044 IDOR vulnerability).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Environment setup ────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key";

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock @supabase/supabase-js
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Mock web-push-service
const mockIsEnabled = jest.fn();
const mockSendToMultiple = jest.fn();
jest.mock("@/lib/notifications/web-push-service", () => ({
  webPushService: {
    isEnabled: mockIsEnabled,
    sendToMultiple: mockSendToMultiple,
  },
}));

// Mock the auth guard dependencies
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
import { GET as getVapidKey } from "../../notifications/push/vapid-key/route";
import {
  POST as postSubscribe,
  DELETE as deleteSubscribe,
  GET as getSubscriptions,
} from "../../notifications/push/subscribe/route";
import { POST as postSend } from "../../notifications/push/send/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

const AUTH_USER_ID = "auth-user-1";

function makeRequest(
  url: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
  },
) {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  const init: RequestInit = { method: options?.method || "GET" };
  if (options?.body) {
    init.method = options.method || "POST";
    init.body = JSON.stringify(options.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(absoluteUrl, init as never);
}

function authenticate(id: string = AUTH_USER_ID) {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id, email: `${id}@example.com` },
  });
  mockResolveRole.mockResolvedValue("user");
}

// Builds a chainable Supabase mock that resolves with the given result
function createSupabaseChain(resolvedValue: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.delete = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockReturnValue(chain);
  // Make the chain thenable so `await` resolves it
  chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) => {
    return Promise.resolve(resolvedValue).then(resolve, reject);
  };
  return chain;
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateClient.mockReturnValue({ from: mockFrom });
});

// ═══════════════════════════════════════════════════════════════════════════════
// negative-auth — 401 for anonymous callers on guarded routes
// ═══════════════════════════════════════════════════════════════════════════════
describe("Push Routes – negative-auth", () => {
  beforeEach(() => {
    mockValidate.mockResolvedValue({ valid: false, user: null });
  });

  it("POST /push/subscribe returns 401 when not authenticated", async () => {
    const req = makeRequest("/api/notifications/push/subscribe", {
      body: {
        subscription: {
          endpoint: "https://push.example.com",
          keys: { p256dh: "k1", auth: "k2" },
        },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      subscription: {
        endpoint: "https://push.example.com",
        keys: { p256dh: "k1", auth: "k2" },
      },
    });
    const res = await postSubscribe(req);
    expect(res.status).toBe(401);
  });

  it("DELETE /push/subscribe returns 401 when not authenticated", async () => {
    const res = await deleteSubscribe(
      makeRequest("/api/notifications/push/subscribe", { method: "DELETE" }),
    );
    expect(res.status).toBe(401);
  });

  it("GET /push/subscribe returns 401 when not authenticated", async () => {
    const res = await getSubscriptions(
      makeRequest("/api/notifications/push/subscribe"),
    );
    expect(res.status).toBe(401);
  });

  it("POST /push/send returns 401 when not authenticated", async () => {
    const req = makeRequest("/api/notifications/push/send", {
      body: { notification: { title: "Test", body: "body" } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ notification: { title: "Test", body: "body" } });
    const res = await postSend(req);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications/push/vapid-key  (PUBLIC)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Push Routes – GET /api/notifications/push/vapid-key", () => {
  it("should return the VAPID public key without authentication", async () => {
    const res = await getVapidKey();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.publicKey).toBe("test-vapid-public-key");
  });

  it("should return 503 when VAPID key is not configured", async () => {
    const original = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const res = await getVapidKey();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("VAPID public key not configured");

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = original;
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications/push/subscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("Push Routes – POST /api/notifications/push/subscribe", () => {
  beforeEach(() => authenticate());

  it("should return 400 when subscription is missing", async () => {
    const req = makeRequest("/api/notifications/push/subscribe", {
      body: {},
    });
    req.json = jest.fn().mockResolvedValue({});

    const res = await postSubscribe(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("should return 400 when subscription is invalid (no endpoint)", async () => {
    const req = makeRequest("/api/notifications/push/subscribe", {
      body: { subscription: { keys: { p256dh: "key1", auth: "key2" } } },
    });
    req.json = jest.fn().mockResolvedValue({
      subscription: { keys: { p256dh: "key1", auth: "key2" } },
    });

    const res = await postSubscribe(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid subscription object");
  });

  it("should create a new subscription owned by the authenticated user", async () => {
    const checkChain = createSupabaseChain({ data: null, error: null });
    const insertChain = createSupabaseChain({
      data: { id: "sub-1" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? checkChain : insertChain;
    });

    const req = makeRequest("/api/notifications/push/subscribe", {
      body: {
        subscription: {
          endpoint: "https://push.example.com",
          keys: { p256dh: "key1", auth: "key2" },
        },
        userAgent: "TestBrowser/1.0",
      },
    });
    req.json = jest.fn().mockResolvedValue({
      subscription: {
        endpoint: "https://push.example.com",
        keys: { p256dh: "key1", auth: "key2" },
      },
      userAgent: "TestBrowser/1.0",
    });

    const res = await postSubscribe(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Subscription created");
    expect(body.subscriptionId).toBe("sub-1");
    // The insert is scoped to the authenticated user, not a client userId.
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: AUTH_USER_ID }),
    );
  });

  it("ignores a client-supplied userId and uses the authenticated user", async () => {
    const checkChain = createSupabaseChain({ data: null, error: null });
    const insertChain = createSupabaseChain({
      data: { id: "sub-1" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? checkChain : insertChain;
    });

    const req = makeRequest("/api/notifications/push/subscribe", {
      body: {
        userId: "victim-user",
        subscription: {
          endpoint: "https://push.example.com",
          keys: { p256dh: "key1", auth: "key2" },
        },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: "victim-user",
      subscription: {
        endpoint: "https://push.example.com",
        keys: { p256dh: "key1", auth: "key2" },
      },
    });

    await postSubscribe(req);

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: AUTH_USER_ID }),
    );
    expect(insertChain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "victim-user" }),
    );
  });

  it("should update an existing subscription", async () => {
    const checkChain = createSupabaseChain({
      data: { id: "existing-sub" },
      error: null,
    });
    const updateChain = createSupabaseChain({
      data: { id: "existing-sub" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? checkChain : updateChain;
    });

    const req = makeRequest("/api/notifications/push/subscribe", {
      body: {
        subscription: {
          endpoint: "https://push.example.com",
          keys: { p256dh: "newkey1", auth: "newkey2" },
        },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      subscription: {
        endpoint: "https://push.example.com",
        keys: { p256dh: "newkey1", auth: "newkey2" },
      },
    });

    const res = await postSubscribe(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Subscription updated");
    expect(body.subscriptionId).toBe("existing-sub");
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: AUTH_USER_ID }),
    );
  });

  it("should return 500 when Supabase insert throws", async () => {
    const checkChain = createSupabaseChain({ data: null, error: null });
    const insertChain = createSupabaseChain({
      data: null,
      error: { message: "Insert failed" },
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? checkChain : insertChain;
    });

    const req = makeRequest("/api/notifications/push/subscribe", {
      body: {
        subscription: {
          endpoint: "https://push.example.com",
          keys: { p256dh: "key1", auth: "key2" },
        },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      subscription: {
        endpoint: "https://push.example.com",
        keys: { p256dh: "key1", auth: "key2" },
      },
    });

    const res = await postSubscribe(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create push subscription");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/notifications/push/subscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("Push Routes – DELETE /api/notifications/push/subscribe", () => {
  beforeEach(() => authenticate());

  it("should delete a specific subscription by endpoint scoped to the authed user", async () => {
    const chain = createSupabaseChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const res = await deleteSubscribe(
      makeRequest(
        "/api/notifications/push/subscribe?endpoint=https://push.example.com",
        { method: "DELETE" },
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Subscription removed");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
  });

  it("ignores a client-supplied userId in the query and scopes to the authed user", async () => {
    const chain = createSupabaseChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await deleteSubscribe(
      makeRequest(
        "/api/notifications/push/subscribe?userId=victim-user",
        { method: "DELETE" },
      ),
    );

    expect(chain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
    expect(chain.eq).not.toHaveBeenCalledWith("user_id", "victim-user");
  });

  it("should delete all subscriptions when no endpoint is specified", async () => {
    const chain = createSupabaseChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const res = await deleteSubscribe(
      makeRequest("/api/notifications/push/subscribe", { method: "DELETE" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("All subscriptions removed");
  });

  it("should return 500 when Supabase delete throws", async () => {
    const chain = createSupabaseChain({
      error: { message: "Delete failed" },
    });
    mockFrom.mockReturnValue(chain);

    const res = await deleteSubscribe(
      makeRequest("/api/notifications/push/subscribe", { method: "DELETE" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to remove push subscription");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications/push/subscribe
// ═══════════════════════════════════════════════════════════════════════════════
describe("Push Routes – GET /api/notifications/push/subscribe", () => {
  beforeEach(() => authenticate());

  it("should return active subscriptions for the authenticated user", async () => {
    const fakeSubs = [
      {
        id: "sub-1",
        endpoint: "https://push.example.com/sub1",
        user_agent: "TestBrowser/1.0",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        last_used: null,
      },
    ];
    const chain = createSupabaseChain({ data: fakeSubs, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await getSubscriptions(
      makeRequest("/api/notifications/push/subscribe"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subscriptions).toEqual(fakeSubs);
    expect(body.count).toBe(1);
    expect(chain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
  });

  it("ignores a client-supplied userId in the query", async () => {
    const chain = createSupabaseChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await getSubscriptions(
      makeRequest("/api/notifications/push/subscribe?userId=victim-user"),
    );

    expect(chain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
    expect(chain.eq).not.toHaveBeenCalledWith("user_id", "victim-user");
  });

  it("should return empty array when no subscriptions found", async () => {
    const chain = createSupabaseChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const res = await getSubscriptions(
      makeRequest("/api/notifications/push/subscribe"),
    );
    const body = await res.json();

    expect(body.subscriptions).toEqual([]);
    expect(body.count).toBe(0);
  });

  it("should return empty array when data is null", async () => {
    const chain = createSupabaseChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await getSubscriptions(
      makeRequest("/api/notifications/push/subscribe"),
    );
    const body = await res.json();

    expect(body.subscriptions).toEqual([]);
    expect(body.count).toBe(0);
  });

  it("should return 500 when Supabase query fails", async () => {
    const chain = createSupabaseChain({
      error: { message: "Query error" },
    });
    mockFrom.mockReturnValue(chain);

    const res = await getSubscriptions(
      makeRequest("/api/notifications/push/subscribe"),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to get subscriptions");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications/push/send
// ═══════════════════════════════════════════════════════════════════════════════
describe("Push Routes – POST /api/notifications/push/send", () => {
  beforeEach(() => authenticate());

  it("should return 400 when notification title is missing", async () => {
    const req = makeRequest("/api/notifications/push/send", {
      body: { notification: { body: "test body" } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ notification: { body: "test body" } });

    const res = await postSend(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Missing required notification fields");
  });

  it("should return 503 when web push is not enabled", async () => {
    mockIsEnabled.mockReturnValue(false);

    const req = makeRequest("/api/notifications/push/send", {
      body: { notification: { title: "Test", body: "body" } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ notification: { title: "Test", body: "body" } });

    const res = await postSend(req);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain("Web Push is not configured");
  });

  it("should return success with 0 sent when no active subscriptions", async () => {
    mockIsEnabled.mockReturnValue(true);

    const chain = createSupabaseChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const req = makeRequest("/api/notifications/push/send", {
      body: { notification: { title: "Test", body: "body" } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ notification: { title: "Test", body: "body" } });

    const res = await postSend(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.message).toBe("No active subscriptions found");
  });

  it("targets only the authenticated user's subscriptions", async () => {
    mockIsEnabled.mockReturnValue(true);

    const chain = createSupabaseChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const req = makeRequest("/api/notifications/push/send", {
      body: { notification: { title: "Test", body: "body" } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ notification: { title: "Test", body: "body" } });

    await postSend(req);

    // The send is scoped via eq("user_id", authedUser), not an `in()` over a
    // client-supplied list — a caller cannot push to other users.
    expect(chain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
  });

  it("ignores a client-supplied userId and scopes the send to the authed user", async () => {
    mockIsEnabled.mockReturnValue(true);

    const chain = createSupabaseChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const req = makeRequest("/api/notifications/push/send", {
      body: {
        userId: "victim-user",
        userIds: ["victim-a", "victim-b"],
        notification: { title: "Test", body: "body" },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: "victim-user",
      userIds: ["victim-a", "victim-b"],
      notification: { title: "Test", body: "body" },
    });

    await postSend(req);

    expect(chain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
    expect(chain.eq).not.toHaveBeenCalledWith("user_id", "victim-user");
    expect(chain.in).not.toHaveBeenCalled();
  });

  it("should send notifications to active subscriptions and return results", async () => {
    mockIsEnabled.mockReturnValue(true);

    const dbSubs = [
      {
        id: "sub-1",
        user_id: AUTH_USER_ID,
        endpoint: "https://push.example.com/sub1",
        keys_p256dh: "p256dh-key-1",
        keys_auth: "auth-key-1",
        user_agent: "TestBrowser",
        created_at: "2026-01-01T00:00:00Z",
        last_used: null,
        is_active: true,
      },
      {
        id: "sub-2",
        user_id: AUTH_USER_ID,
        endpoint: "https://push.example.com/sub2",
        keys_p256dh: "p256dh-key-2",
        keys_auth: "auth-key-2",
        user_agent: "TestBrowser",
        created_at: "2026-01-01T00:00:00Z",
        last_used: "2026-02-01T00:00:00Z",
        is_active: true,
      },
    ];

    const selectChain = createSupabaseChain({ data: dbSubs, error: null });
    const updateChain = createSupabaseChain({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    mockSendToMultiple.mockResolvedValue([
      { success: true, subscriptionId: "sub-1" },
      { success: true, subscriptionId: "sub-2" },
    ]);

    const req = makeRequest("/api/notifications/push/send", {
      body: {
        notification: { title: "Test", body: "body", type: "general" },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      notification: { title: "Test", body: "body", type: "general" },
    });

    const res = await postSend(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.totalSubscriptions).toBe(2);
    expect(mockSendToMultiple).toHaveBeenCalledTimes(1);
  });

  it("should handle mixed success/failure results", async () => {
    mockIsEnabled.mockReturnValue(true);

    const dbSubs = [
      {
        id: "sub-1",
        user_id: AUTH_USER_ID,
        endpoint: "https://push.example.com/sub1",
        keys_p256dh: "k1",
        keys_auth: "a1",
        user_agent: null,
        created_at: "2026-01-01T00:00:00Z",
        last_used: null,
        is_active: true,
      },
      {
        id: "sub-2",
        user_id: AUTH_USER_ID,
        endpoint: "https://push.example.com/sub2",
        keys_p256dh: "k2",
        keys_auth: "a2",
        user_agent: null,
        created_at: "2026-01-01T00:00:00Z",
        last_used: null,
        is_active: true,
      },
    ];

    const selectChain = createSupabaseChain({ data: dbSubs, error: null });
    const updateChain = createSupabaseChain({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectChain : updateChain;
    });

    mockSendToMultiple.mockResolvedValue([
      { success: true, subscriptionId: "sub-1" },
      {
        success: false,
        subscriptionId: "sub-2",
        error: "subscription_expired",
      },
    ]);

    const req = makeRequest("/api/notifications/push/send", {
      body: {
        notification: { title: "Test", body: "body", type: "general" },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      notification: { title: "Test", body: "body", type: "general" },
    });

    const res = await postSend(req);
    const body = await res.json();

    expect(body.sent).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.expiredSubscriptions).toBe(1);
  });

  it("should return 500 when Supabase throws", async () => {
    mockIsEnabled.mockReturnValue(true);

    mockFrom.mockImplementation(() => {
      throw new Error("Supabase connection failed");
    });

    const req = makeRequest("/api/notifications/push/send", {
      body: {
        notification: { title: "Test", body: "body", type: "general" },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      notification: { title: "Test", body: "body", type: "general" },
    });

    const res = await postSend(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to send push notifications");
  });
});
