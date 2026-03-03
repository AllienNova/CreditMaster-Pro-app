/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUserNotifications = jest.fn();
const mockGetUnreadCount = jest.fn();
const mockCreateNotification = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockDeleteNotification = jest.fn();

jest.mock("@/lib/notifications/notification-service", () => ({
  notificationService: {
    getUserNotifications: mockGetUserNotifications,
    getUnreadCount: mockGetUnreadCount,
    createNotification: mockCreateNotification,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
  },
}));

// Import AFTER mocks are registered
import { GET, POST, PATCH, DELETE } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – GET /api/notifications", () => {
  it("should return 400 when userId is missing", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications"),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing userId parameter");
  });

  it("should return notifications and unreadCount for valid userId", async () => {
    const fakeNotifications = [
      {
        id: "n1",
        userId: "user-1",
        type: "welcome",
        title: "Welcome",
        message: "Hello!",
        read: false,
        createdAt: new Date(),
      },
    ];
    mockGetUserNotifications.mockReturnValue(fakeNotifications);
    mockGetUnreadCount.mockReturnValue(1);

    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications?userId=user-1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notifications).toEqual(fakeNotifications);
    expect(body.unreadCount).toBe(1);
    expect(mockGetUserNotifications).toHaveBeenCalledWith("user-1", 50);
    expect(mockGetUnreadCount).toHaveBeenCalledWith("user-1");
  });

  it("should pass custom limit when provided", async () => {
    mockGetUserNotifications.mockReturnValue([]);
    mockGetUnreadCount.mockReturnValue(0);

    await GET(
      makeRequest(
        "http://localhost:3000/api/notifications?userId=user-1&limit=10",
      ),
    );

    expect(mockGetUserNotifications).toHaveBeenCalledWith("user-1", 10);
  });

  it("should default limit to 50 when not specified", async () => {
    mockGetUserNotifications.mockReturnValue([]);
    mockGetUnreadCount.mockReturnValue(0);

    await GET(
      makeRequest("http://localhost:3000/api/notifications?userId=user-1"),
    );

    expect(mockGetUserNotifications).toHaveBeenCalledWith("user-1", 50);
  });

  it("should return 500 when service throws", async () => {
    mockGetUserNotifications.mockImplementation(() => {
      throw new Error("DB error");
    });

    const res = await GET(
      makeRequest("http://localhost:3000/api/notifications?userId=user-1"),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to get notifications");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("Notifications CRUD API – POST /api/notifications", () => {
  it("should return 400 when required fields are missing", async () => {
    const req = makeRequest("http://localhost:3000/api/notifications", {
      body: { userId: "user-1" },
    });
    req.json = jest.fn().mockResolvedValue({ userId: "user-1" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required fields");
  });

  it("should return 400 when userId is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/notifications", {
      body: { type: "welcome", title: "Hi", message: "Hello" },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ type: "welcome", title: "Hi", message: "Hello" });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required fields");
  });

  it("should create notification and return it", async () => {
    const fakeNotification = {
      id: "n1",
      userId: "user-1",
      type: "welcome",
      title: "Welcome",
      message: "Hello!",
      read: false,
      createdAt: new Date(),
    };
    mockCreateNotification.mockReturnValue(fakeNotification);

    const req = makeRequest("http://localhost:3000/api/notifications", {
      body: {
        userId: "user-1",
        type: "welcome",
        title: "Welcome",
        message: "Hello!",
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      type: "welcome",
      title: "Welcome",
      message: "Hello!",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notification).toEqual(fakeNotification);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "user-1",
      "welcome",
      "Welcome",
      "Hello!",
      undefined,
    );
  });

  it("should pass data when provided", async () => {
    mockCreateNotification.mockReturnValue({ id: "n1" });

    const req = makeRequest("http://localhost:3000/api/notifications", {
      body: {
        userId: "user-1",
        type: "welcome",
        title: "Title",
        message: "Msg",
        data: { key: "value" },
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      type: "welcome",
      title: "Title",
      message: "Msg",
      data: { key: "value" },
    });

    await POST(req);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      "user-1",
      "welcome",
      "Title",
      "Msg",
      { key: "value" },
    );
  });

  it("should return 500 when service throws", async () => {
    const req = makeRequest("http://localhost:3000/api/notifications", {
      body: {
        userId: "user-1",
        type: "welcome",
        title: "Hi",
        message: "Hello",
      },
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
  it("should return 400 when userId or action is missing", async () => {
    const req = makeRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      body: { userId: "user-1" },
    });
    req.json = jest.fn().mockResolvedValue({ userId: "user-1" });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required fields");
  });

  it("should mark a single notification as read", async () => {
    mockMarkAsRead.mockReturnValue(true);

    const req = makeRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      body: {
        userId: "user-1",
        notificationId: "n1",
        action: "mark_read",
      },
    });
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      notificationId: "n1",
      action: "mark_read",
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockMarkAsRead).toHaveBeenCalledWith("user-1", "n1");
  });

  it("should mark all notifications as read", async () => {
    mockMarkAllAsRead.mockReturnValue(5);

    const req = makeRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      body: { userId: "user-1", action: "mark_all_read" },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ userId: "user-1", action: "mark_all_read" });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(5);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-1");
  });

  it("should return 400 for invalid action", async () => {
    const req = makeRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      body: { userId: "user-1", action: "invalid_action" },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ userId: "user-1", action: "invalid_action" });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 400 for mark_read without notificationId", async () => {
    const req = makeRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      body: { userId: "user-1", action: "mark_read" },
    });
    req.json = jest
      .fn()
      .mockResolvedValue({ userId: "user-1", action: "mark_read" });

    const res = await PATCH(req);
    const body = await res.json();

    // Without notificationId, mark_read falls through to the else branch
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("should return 500 when service throws", async () => {
    const req = makeRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      body: { userId: "user-1", action: "mark_all_read" },
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
  it("should return 400 when userId is missing", async () => {
    const res = await DELETE(
      makeRequest(
        "http://localhost:3000/api/notifications?notificationId=n1",
        { method: "DELETE" },
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required parameters");
  });

  it("should return 400 when notificationId is missing", async () => {
    const res = await DELETE(
      makeRequest("http://localhost:3000/api/notifications?userId=user-1", {
        method: "DELETE",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required parameters");
  });

  it("should delete notification and return success", async () => {
    mockDeleteNotification.mockReturnValue(true);

    const res = await DELETE(
      makeRequest(
        "http://localhost:3000/api/notifications?userId=user-1&notificationId=n1",
        { method: "DELETE" },
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteNotification).toHaveBeenCalledWith("user-1", "n1");
  });

  it("should return false when notification not found", async () => {
    mockDeleteNotification.mockReturnValue(false);

    const res = await DELETE(
      makeRequest(
        "http://localhost:3000/api/notifications?userId=user-1&notificationId=n999",
        { method: "DELETE" },
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
  });

  it("should return 500 when service throws", async () => {
    mockDeleteNotification.mockImplementation(() => {
      throw new Error("DB error");
    });

    const res = await DELETE(
      makeRequest(
        "http://localhost:3000/api/notifications?userId=user-1&notificationId=n1",
        { method: "DELETE" },
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete notification");
  });
});
