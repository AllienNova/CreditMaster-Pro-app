/**
 * @jest-environment node
 *
 * Covers /api/notifications (TASK-AUTH-03b, FND-041..044).
 * All four handlers are wrapped in withAuth; the handler scopes every
 * notification-service call to the authenticated user's id — a client-supplied
 * `userId` in the query/body is ignored.
 *
 * NTF-03: Route now uses notificationServiceDB (Supabase-backed).
 * All service methods are async; arg order for markAsRead/deleteNotification
 * is (notificationId, userId) matching the DB service.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUserNotifications = jest.fn();
const mockGetUnreadCount = jest.fn();
const mockCreateNotification = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockDeleteNotification = jest.fn();

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

// Import AFTER mocks are registered
import { GET, POST, PATCH, DELETE } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

const AUTH_USER_ID = "auth-user-1";

function makeRequest(
  url: string,
  options?: { method?: string; body?: Record<string, unknown> },
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

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// negative-auth — 401 for anonymous callers
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – negative-auth", () => {
  beforeEach(() => {
    mockValidate.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when not authenticated", async () => {
    const res = await GET(makeRequest("/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when not authenticated", async () => {
    const res = await POST(
      makeRequest("/api/notifications", {
        body: { type: "welcome", title: "Hi", message: "Hello" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when not authenticated", async () => {
    const res = await PATCH(
      makeRequest("/api/notifications", {
        method: "PATCH",
        body: { action: "mark_all_read" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when not authenticated", async () => {
    const res = await DELETE(
      makeRequest("/api/notifications?notificationId=n1", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ownership — handler uses user.id, ignores a client-supplied userId
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – ownership scoping", () => {
  it("GET ignores a client-supplied userId and scopes to the authed user", async () => {
    authenticate();
    mockGetUserNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    await GET(makeRequest("/api/notifications?userId=victim-user"));

    expect(mockGetUserNotifications).toHaveBeenCalledWith(AUTH_USER_ID, 50);
    expect(mockGetUnreadCount).toHaveBeenCalledWith(AUTH_USER_ID);
    expect(mockGetUserNotifications).not.toHaveBeenCalledWith(
      "victim-user",
      expect.anything(),
    );
  });

  it("POST ignores a client-supplied userId in the body", async () => {
    authenticate();
    mockCreateNotification.mockResolvedValue({ id: "n1" });

    const req = makeRequest("/api/notifications", {
      body: {
        userId: "victim-user",
        type: "welcome",
        title: "Hi",
        message: "Hello",
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: "victim-user",
      type: "welcome",
      title: "Hi",
      message: "Hello",
    });

    await POST(req);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      AUTH_USER_ID,
      "welcome",
      "Hi",
      "Hello",
    );
  });

  it("PATCH mark_read ignores a client-supplied userId", async () => {
    authenticate();
    mockMarkAsRead.mockResolvedValue(true);

    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: {
        userId: "victim-user",
        notificationId: "n1",
        action: "mark_read",
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: "victim-user",
      notificationId: "n1",
      action: "mark_read",
    });

    await PATCH(req);

    // DB service arg order: (notificationId, userId)
    expect(mockMarkAsRead).toHaveBeenCalledWith("n1", AUTH_USER_ID);
  });

  it("DELETE ignores a client-supplied userId in the query", async () => {
    authenticate();
    mockDeleteNotification.mockResolvedValue(true);

    await DELETE(
      makeRequest("/api/notifications?userId=victim-user&notificationId=n1", {
        method: "DELETE",
      }),
    );

    // DB service arg order: (notificationId, userId)
    expect(mockDeleteNotification).toHaveBeenCalledWith("n1", AUTH_USER_ID);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – GET /api/notifications", () => {
  beforeEach(() => authenticate());

  it("should return notifications and unreadCount for the authed user", async () => {
    const fakeNotifications = [
      {
        id: "n1",
        userId: AUTH_USER_ID,
        type: "welcome",
        title: "Welcome",
        message: "Hello!",
        read: false,
        createdAt: new Date(),
      },
    ];
    mockGetUserNotifications.mockResolvedValue(fakeNotifications);
    mockGetUnreadCount.mockResolvedValue(1);

    const res = await GET(makeRequest("/api/notifications"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notifications).toEqual(fakeNotifications);
    expect(body.unreadCount).toBe(1);
    expect(mockGetUserNotifications).toHaveBeenCalledWith(AUTH_USER_ID, 50);
    expect(mockGetUnreadCount).toHaveBeenCalledWith(AUTH_USER_ID);
  });

  it("should pass custom limit when provided", async () => {
    mockGetUserNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    await GET(makeRequest("/api/notifications?limit=10"));

    expect(mockGetUserNotifications).toHaveBeenCalledWith(AUTH_USER_ID, 10);
  });

  it("should default limit to 50 when not specified", async () => {
    mockGetUserNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    await GET(makeRequest("/api/notifications"));

    expect(mockGetUserNotifications).toHaveBeenCalledWith(AUTH_USER_ID, 50);
  });

  it("should return 500 when service throws", async () => {
    mockGetUserNotifications.mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest("/api/notifications"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to get notifications");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – POST /api/notifications", () => {
  beforeEach(() => authenticate());

  it("should return 400 when required fields are missing", async () => {
    const req = makeRequest("/api/notifications", { body: {} });
    req.json = jest.fn().mockResolvedValue({});

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required fields");
  });

  it("should return 400 for unknown notification type", async () => {
    const req = makeRequest("/api/notifications", {
      body: { type: "dispute_created", title: "Hi", message: "Hello" },
    });
    req.json = jest.fn().mockResolvedValue({
      type: "dispute_created",
      title: "Hi",
      message: "Hello",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid notification type");
  });

  it("should create notification and return it", async () => {
    const fakeNotification = {
      id: "n1",
      userId: AUTH_USER_ID,
      type: "welcome",
      title: "Welcome",
      message: "Hello!",
      read: false,
      createdAt: new Date(),
    };
    mockCreateNotification.mockResolvedValue(fakeNotification);

    const req = makeRequest("/api/notifications", {
      body: { type: "welcome", title: "Welcome", message: "Hello!" },
    });
    req.json = jest.fn().mockResolvedValue({
      type: "welcome",
      title: "Welcome",
      message: "Hello!",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notification).toEqual(fakeNotification);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      AUTH_USER_ID,
      "welcome",
      "Welcome",
      "Hello!",
    );
  });

  it("should return 500 when service throws", async () => {
    const req = makeRequest("/api/notifications", {
      body: { type: "welcome", title: "Hi", message: "Hello" },
    });
    req.json = jest.fn().mockRejectedValue(new Error("Parse error"));

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create notification");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – PATCH /api/notifications", () => {
  beforeEach(() => authenticate());

  it("should return 400 when action is missing", async () => {
    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: {},
    });
    req.json = jest.fn().mockResolvedValue({});

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required fields");
  });

  it("should mark a single notification as read", async () => {
    mockMarkAsRead.mockResolvedValue(true);

    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { notificationId: "n1", action: "mark_read" },
    });
    req.json = jest.fn().mockResolvedValue({
      notificationId: "n1",
      action: "mark_read",
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // DB service arg order: (notificationId, userId)
    expect(mockMarkAsRead).toHaveBeenCalledWith("n1", AUTH_USER_ID);
  });

  it("should mark all notifications as read", async () => {
    mockMarkAllAsRead.mockResolvedValue(5);

    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { action: "mark_all_read" },
    });
    req.json = jest.fn().mockResolvedValue({ action: "mark_all_read" });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(5);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith(AUTH_USER_ID);
  });

  it("should return 400 for invalid action", async () => {
    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { action: "invalid_action" },
    });
    req.json = jest.fn().mockResolvedValue({ action: "invalid_action" });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 400 for mark_read without notificationId", async () => {
    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { action: "mark_read" },
    });
    req.json = jest.fn().mockResolvedValue({ action: "mark_read" });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 500 when service throws", async () => {
    const req = makeRequest("/api/notifications", {
      method: "PATCH",
      body: { action: "mark_all_read" },
    });
    req.json = jest.fn().mockRejectedValue(new Error("Parse error"));

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update notification");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – DELETE /api/notifications", () => {
  beforeEach(() => authenticate());

  it("should return 400 when notificationId is missing", async () => {
    const res = await DELETE(
      makeRequest("/api/notifications", { method: "DELETE" }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required parameters");
  });

  it("should delete notification and return success", async () => {
    mockDeleteNotification.mockResolvedValue(true);

    const res = await DELETE(
      makeRequest("/api/notifications?notificationId=n1", {
        method: "DELETE",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // DB service arg order: (notificationId, userId)
    expect(mockDeleteNotification).toHaveBeenCalledWith("n1", AUTH_USER_ID);
  });

  it("should return false when notification not found", async () => {
    mockDeleteNotification.mockResolvedValue(false);

    const res = await DELETE(
      makeRequest("/api/notifications?notificationId=n999", {
        method: "DELETE",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
  });

  it("should return 500 when service throws", async () => {
    mockDeleteNotification.mockRejectedValue(new Error("DB error"));

    const res = await DELETE(
      makeRequest("/api/notifications?notificationId=n1", {
        method: "DELETE",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete notification");
  });
});
