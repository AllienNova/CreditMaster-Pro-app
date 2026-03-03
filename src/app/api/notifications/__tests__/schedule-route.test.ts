/**
 * @jest-environment node
 */

/**
 * Tests for the Push Notification Schedule API Route
 *
 * Covers:
 * - POST: Direct notification scheduling
 * - POST: Template-based notification scheduling
 * - GET: Listing scheduled notifications
 * - DELETE: Cancelling scheduled notifications
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock the notification-scheduler module
const mockScheduleNotification = jest.fn();
const mockCreateFromTemplate = jest.fn();
const mockGetUserScheduledNotifications = jest.fn();
const mockCancelNotification = jest.fn();

jest.mock("@/lib/notifications/notification-scheduler", () => ({
  notificationScheduler: {
    scheduleNotification: mockScheduleNotification,
    createFromTemplate: mockCreateFromTemplate,
    getUserScheduledNotifications: mockGetUserScheduledNotifications,
    cancelNotification: mockCancelNotification,
  },
}));

// Import AFTER mocks
import {
  POST as postSchedule,
  GET as getSchedule,
  DELETE as deleteSchedule,
} from "../../notifications/push/schedule/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  const init: RequestInit = { method: options?.method ?? "GET" };
  if (options?.body) {
    init.method = options.method ?? "POST";
    init.body = JSON.stringify(options.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(absoluteUrl, init as never);
}

function makeFutureISO(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications/push/schedule — Direct scheduling
// ═══════════════════════════════════════════════════════════════════════════════
describe("Schedule Routes – POST (direct scheduling)", () => {
  it("should schedule a notification and return success", async () => {
    const futureTime = makeFutureISO(30);
    mockScheduleNotification.mockReturnValue({
      scheduled: true,
      notificationId: "sched_123",
      scheduledAt: new Date(futureTime),
    });

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          notification: { title: "Test", body: "Test body", type: "general" },
          scheduledAt: futureTime,
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      notification: { title: "Test", body: "Test body", type: "general" },
      scheduledAt: futureTime,
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.notificationId).toBe("sched_123");
    expect(body.scheduledAt).toBeDefined();
    expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
  });

  it("should return 400 when userId is missing", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          notification: { title: "Test", body: "Test body" },
          scheduledAt: makeFutureISO(30),
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      notification: { title: "Test", body: "Test body" },
      scheduledAt: makeFutureISO(30),
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("userId");
  });

  it("should return 400 when notification title is missing", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          notification: { body: "Test body" },
          scheduledAt: makeFutureISO(30),
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      notification: { body: "Test body" },
      scheduledAt: makeFutureISO(30),
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("title and body");
  });

  it("should return 400 when notification body is missing", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          notification: { title: "Test" },
          scheduledAt: makeFutureISO(30),
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      notification: { title: "Test" },
      scheduledAt: makeFutureISO(30),
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("title and body");
  });

  it("should return 400 when scheduledAt is missing", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          notification: { title: "Test", body: "body" },
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      notification: { title: "Test", body: "body" },
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("scheduledAt");
  });

  it("should return 400 for invalid date format", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          notification: { title: "Test", body: "body" },
          scheduledAt: "not-a-date",
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      notification: { title: "Test", body: "body" },
      scheduledAt: "not-a-date",
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid scheduledAt");
  });

  it("should return 422 when scheduler rejects (e.g., past date)", async () => {
    mockScheduleNotification.mockReturnValue({
      scheduled: false,
      notificationId: "sched_456",
      scheduledAt: new Date(),
      error: "Scheduled time must be in the future",
    });

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          notification: { title: "Test", body: "body" },
          scheduledAt: makeFutureISO(30),
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      notification: { title: "Test", body: "body" },
      scheduledAt: makeFutureISO(30),
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("must be in the future");
    expect(body.notificationId).toBe("sched_456");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notifications/push/schedule — Template-based scheduling
// ═══════════════════════════════════════════════════════════════════════════════
describe("Schedule Routes – POST (template scheduling)", () => {
  it("should schedule from template and return success", async () => {
    const futureTime = makeFutureISO(30);
    mockCreateFromTemplate.mockReturnValue({
      type: "bill_reminder",
      title: "Bill Due Soon",
      body: "Your Netflix bill of $14.99 is due on 2026-03-01.",
    });
    mockScheduleNotification.mockReturnValue({
      scheduled: true,
      notificationId: "sched_tpl_1",
      scheduledAt: new Date(futureTime),
    });

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          templateKey: "bill_reminder",
          variables: { billName: "Netflix", amount: 14.99, dueDate: "2026-03-01" },
          scheduledAt: futureTime,
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      templateKey: "bill_reminder",
      variables: { billName: "Netflix", amount: 14.99, dueDate: "2026-03-01" },
      scheduledAt: futureTime,
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.notificationId).toBe("sched_tpl_1");
    expect(body.template).toBe("bill_reminder");
    expect(mockCreateFromTemplate).toHaveBeenCalledWith(
      "bill_reminder",
      { billName: "Netflix", amount: 14.99, dueDate: "2026-03-01" },
      undefined,
    );
  });

  it("should return 400 when userId is missing (template)", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          templateKey: "bill_reminder",
          variables: {},
          scheduledAt: makeFutureISO(30),
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      templateKey: "bill_reminder",
      variables: {},
      scheduledAt: makeFutureISO(30),
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("userId");
  });

  it("should return 400 for unknown template key", async () => {
    mockCreateFromTemplate.mockReturnValue(null);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          templateKey: "nonexistent_template",
          variables: {},
          scheduledAt: makeFutureISO(30),
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      templateKey: "nonexistent_template",
      variables: {},
      scheduledAt: makeFutureISO(30),
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Unknown template");
    expect(body.error).toContain("nonexistent_template");
  });

  it("should return 400 when scheduledAt is missing (template)", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          templateKey: "bill_reminder",
          variables: {},
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      templateKey: "bill_reminder",
      variables: {},
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("scheduledAt");
  });

  it("should return 400 for invalid date format (template)", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          templateKey: "bill_reminder",
          variables: {},
          scheduledAt: "invalid-date",
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      templateKey: "bill_reminder",
      variables: {},
      scheduledAt: "invalid-date",
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid scheduledAt");
  });

  it("should pass overrides to createFromTemplate", async () => {
    const futureTime = makeFutureISO(30);
    mockCreateFromTemplate.mockReturnValue({
      type: "bill_reminder",
      title: "Custom Title",
      body: "Custom body",
    });
    mockScheduleNotification.mockReturnValue({
      scheduled: true,
      notificationId: "sched_ovr_1",
      scheduledAt: new Date(futureTime),
    });

    const overrides = { title: "Custom Title", url: "/custom" };

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          templateKey: "bill_reminder",
          variables: { billName: "Hulu" },
          scheduledAt: futureTime,
          overrides,
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-1",
      templateKey: "bill_reminder",
      variables: { billName: "Hulu" },
      scheduledAt: futureTime,
      overrides,
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCreateFromTemplate).toHaveBeenCalledWith(
      "bill_reminder",
      { billName: "Hulu" },
      overrides,
    );
  });

  it("should return 422 when scheduler rejects template notification", async () => {
    const futureTime = makeFutureISO(30);
    mockCreateFromTemplate.mockReturnValue({
      type: "bill_reminder",
      title: "Bill Due",
      body: "Your bill is due",
    });
    mockScheduleNotification.mockReturnValue({
      scheduled: false,
      notificationId: "sched_rej_1",
      scheduledAt: new Date(futureTime),
      error: "Push notifications disabled by user",
    });

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-disabled",
          templateKey: "bill_reminder",
          variables: { billName: "Spotify" },
          scheduledAt: futureTime,
        },
      },
    );
    req.json = jest.fn().mockResolvedValue({
      userId: "user-disabled",
      templateKey: "bill_reminder",
      variables: { billName: "Spotify" },
      scheduledAt: futureTime,
    });

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("disabled by user");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Error handling
// ═══════════════════════════════════════════════════════════════════════════════
describe("Schedule Routes – POST (error handling)", () => {
  it("should return 500 when an unexpected error occurs", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      {
        body: {
          userId: "user-1",
          notification: { title: "Test", body: "body" },
          scheduledAt: makeFutureISO(30),
        },
      },
    );
    // Simulate JSON parsing failure
    req.json = jest.fn().mockRejectedValue(new Error("Invalid JSON"));

    const res = await postSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Failed to schedule notification");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notifications/push/schedule
// ═══════════════════════════════════════════════════════════════════════════════
describe("Schedule Routes – GET", () => {
  it("should return 400 when userId is missing", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
    );

    const res = await getSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("userId");
  });

  it("should return scheduled notifications for a user", async () => {
    const now = new Date();
    const future = new Date(Date.now() + 3600000);
    mockGetUserScheduledNotifications.mockReturnValue([
      {
        id: "sched_1",
        userId: "user-1",
        payload: { type: "general", title: "Test", body: "body" },
        scheduledAt: future,
        status: "pending",
        createdAt: now,
        deliveredAt: undefined,
        cancelledAt: undefined,
        error: undefined,
      },
    ]);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule?userId=user-1",
    );

    const res = await getSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].id).toBe("sched_1");
    expect(body.notifications[0].status).toBe("pending");
    expect(body.count).toBe(1);
    expect(mockGetUserScheduledNotifications).toHaveBeenCalledWith(
      "user-1",
      undefined,
    );
  });

  it("should filter by status when provided", async () => {
    mockGetUserScheduledNotifications.mockReturnValue([]);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule?userId=user-1&status=delivered",
    );

    const res = await getSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notifications).toEqual([]);
    expect(body.count).toBe(0);
    expect(mockGetUserScheduledNotifications).toHaveBeenCalledWith(
      "user-1",
      "delivered",
    );
  });

  it("should return empty array when no notifications found", async () => {
    mockGetUserScheduledNotifications.mockReturnValue([]);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule?userId=user-no-notifs",
    );

    const res = await getSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notifications).toEqual([]);
    expect(body.count).toBe(0);
  });

  it("should serialize dates as ISO strings", async () => {
    const scheduledAt = new Date("2026-03-01T12:00:00Z");
    const createdAt = new Date("2026-02-28T10:00:00Z");
    const deliveredAt = new Date("2026-03-01T12:01:00Z");

    mockGetUserScheduledNotifications.mockReturnValue([
      {
        id: "sched_date",
        userId: "user-1",
        payload: { type: "general", title: "Dates", body: "body" },
        scheduledAt,
        status: "delivered",
        createdAt,
        deliveredAt,
        cancelledAt: undefined,
        error: undefined,
      },
    ]);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule?userId=user-1",
    );

    const res = await getSchedule(req);
    const body = await res.json();

    expect(body.notifications[0].scheduledAt).toBe(
      "2026-03-01T12:00:00.000Z",
    );
    expect(body.notifications[0].createdAt).toBe("2026-02-28T10:00:00.000Z");
    expect(body.notifications[0].deliveredAt).toBe(
      "2026-03-01T12:01:00.000Z",
    );
    expect(body.notifications[0].cancelledAt).toBeNull();
    expect(body.notifications[0].error).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/notifications/push/schedule
// ═══════════════════════════════════════════════════════════════════════════════
describe("Schedule Routes – DELETE", () => {
  it("should return 400 when notificationId is missing", async () => {
    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule",
      { method: "DELETE" },
    );

    const res = await deleteSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("notificationId");
  });

  it("should cancel a notification and return success", async () => {
    mockCancelNotification.mockReturnValue(true);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule?notificationId=sched_cancel_1",
      { method: "DELETE" },
    );

    const res = await deleteSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Notification cancelled");
    expect(body.notificationId).toBe("sched_cancel_1");
    expect(mockCancelNotification).toHaveBeenCalledWith("sched_cancel_1");
  });

  it("should return 404 when notification is not found", async () => {
    mockCancelNotification.mockReturnValue(false);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule?notificationId=nonexistent",
      { method: "DELETE" },
    );

    const res = await deleteSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("not found or already processed");
  });

  it("should return 404 when notification is already delivered", async () => {
    mockCancelNotification.mockReturnValue(false);

    const req = makeRequest(
      "http://localhost:3000/api/notifications/push/schedule?notificationId=sched_delivered",
      { method: "DELETE" },
    );

    const res = await deleteSchedule(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("not found or already processed");
  });
});
