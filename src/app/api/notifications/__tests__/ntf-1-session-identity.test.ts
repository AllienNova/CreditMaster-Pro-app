/**
 * @jest-environment node
 *
 * TASK-NTF-01 — Regression lock: session-scoped identity on notification routes
 *
 * Findings: FND-041, FND-042, FND-043, FND-044
 * Severity: CRITICAL (original finding); AUTH-03 already remediated.
 * This file LOCKS the verified-clean state and prevents future regressions.
 *
 * What is tested here
 * -------------------
 * For EVERY HTTP verb on EVERY notification route the genuine security
 * property is:
 *
 *   (a) No token → 401 (auth guard rejects the request before any handler
 *       logic runs).
 *   (b) Authenticated as user A → the DB/service call that performs the
 *       effect is keyed to A's id — NOT to any value the caller supplied
 *       in the body, query-string, or a header such as `x-user-id`.
 *
 * Per-verb inventory (CLEAN = withAuth-wrapped + session-keyed)
 * ─────────────────────────────────────────────────────────────
 * Route file                               Verb     Status
 * notifications/route.ts                   GET      CLEAN
 * notifications/route.ts                   POST     CLEAN
 * notifications/route.ts                   PATCH    CLEAN
 * notifications/route.ts                   DELETE   CLEAN
 * notifications/preferences/route.ts       GET      CLEAN
 * notifications/preferences/route.ts       PUT      CLEAN
 * notifications/preferences/route.ts       POST     REMOVED (NTF-4: stub deleted, subscribe in push/subscribe)
 * notifications/push/send/route.ts         POST     CLEAN
 * notifications/push/subscribe/route.ts    POST     CLEAN
 * notifications/push/subscribe/route.ts    DELETE   CLEAN
 * notifications/push/subscribe/route.ts    GET      CLEAN
 *
 * NOTE: preferences/route.ts POST was a no-op stub (NTF-4 task). NTF-4 deleted
 * the stub entirely — subscribe/unsubscribe lives in push/subscribe/route.ts.
 * This file no longer imports or tests prefsPost.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Environment ───────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-key";

// ── Auth guard mocks ──────────────────────────────────────────────────────────

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

// ── Route-dependency mocks ────────────────────────────────────────────────────

// notifications/route.ts → notification-service-db (DB-backed, NTF-03)
const mockGetUserNotifications = jest.fn().mockResolvedValue([]);
const mockGetUnreadCount = jest.fn().mockResolvedValue(0);
const mockCreateNotification = jest.fn().mockResolvedValue({ id: "n1" });
const mockMarkAsRead = jest.fn().mockResolvedValue(true);
const mockMarkAllAsRead = jest.fn().mockResolvedValue(0);
const mockDeleteNotification = jest.fn().mockResolvedValue(true);

jest.mock("@/lib/notifications/notification-service-db", () => ({
  notificationServiceDB: {
    getUserNotifications: mockGetUserNotifications,
    getUnreadCount: mockGetUnreadCount,
    createNotification: mockCreateNotification,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
  },
}));

// push routes → @supabase/supabase-js
const mockFrom = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// push/send → web-push-service
const mockIsEnabled = jest.fn().mockReturnValue(false);
const mockSendToMultiple = jest.fn().mockResolvedValue([]);
jest.mock("@/lib/notifications/web-push-service", () => ({
  webPushService: {
    isEnabled: (...args: unknown[]) => mockIsEnabled(...args),
    sendToMultiple: (...args: unknown[]) => mockSendToMultiple(...args),
  },
}));

// ── Route imports (after mocks) ───────────────────────────────────────────────

import {
  GET as notifGet,
  POST as notifPost,
  PATCH as notifPatch,
  DELETE as notifDelete,
} from "../route";
import {
  GET as prefsGet,
  PUT as prefsPut,
} from "../../notifications/preferences/route";
// POST was removed from preferences/route.ts in NTF-4; subscribe/unsubscribe
// lives in /api/notifications/push/subscribe/route.ts.
import { POST as sendPost } from "../../notifications/push/send/route";
import {
  POST as subPost,
  DELETE as subDelete,
  GET as subGet,
} from "../../notifications/push/subscribe/route";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTH_USER_ID = "session-user-ntf1";
const OTHER_USER_ID = "other-user-ntf1";

function makeRequest(
  url: string,
  init?: { method?: string; body?: Record<string, unknown> },
): NextRequest {
  const abs = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const reqInit: RequestInit = { method: init?.method ?? "GET" };
  if (init?.body) {
    reqInit.method = init.method ?? "POST";
    reqInit.body = JSON.stringify(init.body);
    reqInit.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(abs, reqInit as never);
}

/** Returns a Supabase builder chain that resolves with the given value. */
function chain(resolved: unknown): any {
  const c: any = {};
  const chainMethods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "in",
    "single",
    "maybeSingle",
  ];
  for (const m of chainMethods) c[m] = jest.fn().mockReturnValue(c);
  c.then = (res: (v: unknown) => unknown) =>
    Promise.resolve(resolved).then(res);
  return c;
}

function authenticate(id = AUTH_USER_ID): void {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id, email: `${id}@example.com` },
  });
  mockResolveRole.mockResolvedValue("user");
}

function unauthenticate(): void {
  mockValidate.mockResolvedValue({ valid: false, user: null });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateClient.mockReturnValue({ from: mockFrom });
});

// =============================================================================
// (a) No token → 401 on every guarded verb
// =============================================================================
describe("TASK-NTF-01 negative-auth — every verb returns 401 without a token", () => {
  beforeEach(unauthenticate);

  it("notifications GET → 401", async () => {
    const res = await notifGet(makeRequest("/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("notifications POST → 401", async () => {
    const req = makeRequest("/api/notifications", {
      body: { type: "welcome", title: "Hi", message: "Hello" },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ type: "welcome", title: "Hi", message: "Hello" });
    const res = await notifPost(req);
    expect(res.status).toBe(401);
  });

  it("notifications PATCH → 401", async () => {
    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { action: "mark_all_read" },
    });
    req.json = jest.fn().mockResolvedValue({ action: "mark_all_read" });
    const res = await notifPatch(req);
    expect(res.status).toBe(401);
  });

  it("notifications DELETE → 401", async () => {
    const res = await notifDelete(
      makeRequest("/api/notifications?notificationId=n1", { method: "DELETE" }),
    );
    expect(res.status).toBe(401);
  });

  it("preferences GET → 401", async () => {
    const res = await prefsGet(
      makeRequest("/api/notifications/preferences"),
    );
    expect(res.status).toBe(401);
  });

  it("preferences PUT → 401", async () => {
    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { smsEnabled: true },
    });
    req.json = jest.fn().mockResolvedValue({ smsEnabled: true });
    const res = await prefsPut(req);
    expect(res.status).toBe(401);
  });

  // preferences POST removed in NTF-4 — subscribe lives in push/subscribe route.

  it("push/send POST → 401", async () => {
    const req = makeRequest("/api/notifications/push/send", {
      body: { notification: { title: "T", body: "B" } },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ notification: { title: "T", body: "B" } });
    const res = await sendPost(req);
    expect(res.status).toBe(401);
  });

  it("push/subscribe POST → 401", async () => {
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
    const res = await subPost(req);
    expect(res.status).toBe(401);
  });

  it("push/subscribe DELETE → 401", async () => {
    const res = await subDelete(
      makeRequest("/api/notifications/push/subscribe", { method: "DELETE" }),
    );
    expect(res.status).toBe(401);
  });

  it("push/subscribe GET → 401", async () => {
    const res = await subGet(
      makeRequest("/api/notifications/push/subscribe"),
    );
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// (b) Authenticated → every effect is keyed to the session user, not
//     a caller-supplied id in the body / query / header.
// =============================================================================
describe("TASK-NTF-01 session-keyed effects — handler uses session user.id, never caller-supplied id", () => {
  // ── notifications/route.ts ──────────────────────────────────────────────────

  it("notifications GET — getUserNotifications called with session user.id", async () => {
    authenticate();
    mockGetUserNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    await notifGet(
      makeRequest("/api/notifications?userId=" + OTHER_USER_ID),
    );

    expect(mockGetUserNotifications).toHaveBeenCalledWith(AUTH_USER_ID, 50);
    expect(mockGetUserNotifications).not.toHaveBeenCalledWith(
      OTHER_USER_ID,
      expect.anything(),
    );
  });

  it("notifications POST — createNotification called with session user.id", async () => {
    authenticate();
    const req = makeRequest("/api/notifications", {
      body: {
        userId: OTHER_USER_ID,
        type: "welcome",
        title: "Hi",
        message: "Hello",
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: OTHER_USER_ID,
      type: "welcome",
      title: "Hi",
      message: "Hello",
    });

    await notifPost(req);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      AUTH_USER_ID,
      "welcome",
      "Hi",
      "Hello",
    );
    expect(mockCreateNotification).not.toHaveBeenCalledWith(
      OTHER_USER_ID,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("notifications PATCH mark_read — markAsRead called with session user.id", async () => {
    authenticate();
    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { userId: OTHER_USER_ID, notificationId: "n1", action: "mark_read" },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: OTHER_USER_ID,
      notificationId: "n1",
      action: "mark_read",
    });

    await notifPatch(req);

    expect(mockMarkAsRead).toHaveBeenCalledWith("n1", AUTH_USER_ID);
    expect(mockMarkAsRead).not.toHaveBeenCalledWith("n1", OTHER_USER_ID);
  });

  it("notifications PATCH mark_all_read — markAllAsRead called with session user.id", async () => {
    authenticate();
    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { userId: OTHER_USER_ID, action: "mark_all_read" },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ userId: OTHER_USER_ID, action: "mark_all_read" });

    await notifPatch(req);

    expect(mockMarkAllAsRead).toHaveBeenCalledWith(AUTH_USER_ID);
    expect(mockMarkAllAsRead).not.toHaveBeenCalledWith(OTHER_USER_ID);
  });

  it("notifications DELETE — deleteNotification called with session user.id", async () => {
    authenticate();

    await notifDelete(
      makeRequest(
        `/api/notifications?notificationId=n1&userId=${OTHER_USER_ID}`,
        { method: "DELETE" },
      ),
    );

    expect(mockDeleteNotification).toHaveBeenCalledWith("n1", AUTH_USER_ID);
    expect(mockDeleteNotification).not.toHaveBeenCalledWith("n1", OTHER_USER_ID);
  });

  // ── notifications/preferences/route.ts ──────────────────────────────────────

  it("preferences GET — returns preferences keyed to session user.id", async () => {
    authenticate();
    // preferences/route.ts now reads Supabase — return no existing row so
    // the handler falls back to defaults keyed to the session user.id.
    mockFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await prefsGet(makeRequest("/api/notifications/preferences"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences.userId).toBe(AUTH_USER_ID);
    expect(body.preferences.userId).not.toBe(OTHER_USER_ID);
  });

  it("preferences PUT — writes preferences keyed to session user.id, body userId ignored", async () => {
    authenticate();
    // preferences/route.ts reads existing row then upserts — return no
    // existing row so merge starts from defaults.
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    const req = makeRequest("/api/notifications/preferences", {
      method: "PUT",
      body: { userId: OTHER_USER_ID, smsEnabled: true },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ userId: OTHER_USER_ID, smsEnabled: true });

    const res = await prefsPut(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preferences.userId).toBe(AUTH_USER_ID);
    expect(body.preferences.smsEnabled).toBe(true);
  });

  // NTF-4: preferences POST removed — the no-op subscribe/unsubscribe stub is
  // gone. Real push subscribe/unsubscribe is in push/subscribe/route.ts,
  // already tested in the push/subscribe tests above.

  // ── push/send/route.ts ───────────────────────────────────────────────────────

  it("push/send POST — DB query is scoped to session user.id", async () => {
    authenticate();
    // Enable push so the handler reaches the DB query (not short-circuits at 503).
    mockIsEnabled.mockReturnValue(true);
    const subChain = chain({ data: [], error: null });
    mockFrom.mockReturnValue(subChain);

    const req = makeRequest("/api/notifications/push/send", {
      body: {
        userId: OTHER_USER_ID,
        notification: { title: "T", body: "B" },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: OTHER_USER_ID,
      notification: { title: "T", body: "B" },
    });

    await sendPost(req);

    // The Supabase query for subscriptions is filtered by session user.id
    expect(subChain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
    expect(subChain.eq).not.toHaveBeenCalledWith("user_id", OTHER_USER_ID);
  });

  // ── push/subscribe/route.ts ──────────────────────────────────────────────────

  it("push/subscribe POST — insert is keyed to session user.id", async () => {
    authenticate();
    const checkChain = chain({ data: null, error: null });
    const insertChain = chain({ data: { id: "sub-1" }, error: null });

    let call = 0;
    mockFrom.mockImplementation(() => (++call === 1 ? checkChain : insertChain));

    const req = makeRequest("/api/notifications/push/subscribe", {
      body: {
        userId: OTHER_USER_ID,
        subscription: {
          endpoint: "https://push.example.com",
          keys: { p256dh: "k1", auth: "k2" },
        },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: OTHER_USER_ID,
      subscription: {
        endpoint: "https://push.example.com",
        keys: { p256dh: "k1", auth: "k2" },
      },
    });

    await subPost(req);

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: AUTH_USER_ID }),
    );
    expect(insertChain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: OTHER_USER_ID }),
    );
  });

  it("push/subscribe DELETE — delete is scoped to session user.id", async () => {
    authenticate();
    const delChain = chain({ error: null });
    mockFrom.mockReturnValue(delChain);

    await subDelete(
      makeRequest(
        `/api/notifications/push/subscribe?userId=${OTHER_USER_ID}`,
        { method: "DELETE" },
      ),
    );

    expect(delChain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
    expect(delChain.eq).not.toHaveBeenCalledWith("user_id", OTHER_USER_ID);
  });

  it("push/subscribe GET — select is scoped to session user.id", async () => {
    authenticate();
    const selChain = chain({ data: [], error: null });
    mockFrom.mockReturnValue(selChain);

    await subGet(makeRequest("/api/notifications/push/subscribe"));

    expect(selChain.eq).toHaveBeenCalledWith("user_id", AUTH_USER_ID);
    expect(selChain.eq).not.toHaveBeenCalledWith("user_id", OTHER_USER_ID);
  });
});
