/**
 * @jest-environment node
 *
 * M2-3 / FR-205 - GET /api/activity
 * Real user activity feed over the `notifications` table.
 *
 * These tests drive the REAL withAuth guard (only its two dependencies -
 * jwt-validation and resolve-role - are mocked), so they prove the route is
 * genuinely authenticated and user-scoped (IDOR-safe), not merely that a fake
 * guard was injected. The notification service is mocked to control the data.
 */

const mockValidate = jest.fn();
const mockResolveRole = jest.fn();
const mockGetUserNotifications = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRole(...args),
}));
jest.mock("@/lib/notifications/notification-service-db", () => ({
  notificationServiceDB: {
    getUserNotifications: (...args: unknown[]) =>
      mockGetUserNotifications(...args),
  },
}));

import { GET } from "../route";
import { NextRequest } from "next/server";
import type { Notification } from "@/lib/notifications/notification-service-db";

const AUTHED_USER_ID = "user-activity-1";

/** Arrange a valid session for the given user id. */
function authenticate(userId: string = AUTHED_USER_ID): void {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: userId, email: "owner@example.com" },
  });
  mockResolveRole.mockResolvedValue("user");
}

function makeRequest(
  url: string = "http://localhost:3000/api/activity",
): NextRequest {
  return new NextRequest(url);
}

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    userId: AUTHED_USER_ID,
    type: "dispute_update",
    title: "Dispute updated",
    message: "Your Experian dispute advanced to review.",
    read: false,
    createdAt: new Date("2026-05-18T10:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/activity (M2-3 / FR-205)", () => {
  it("maps the authed user's notifications to the pinned activity shape", async () => {
    authenticate();
    mockGetUserNotifications.mockResolvedValue([
      notification(),
      notification({
        id: "n2",
        type: "payment_success",
        title: "Payment received",
        message: "We received your $99.99 payment.",
        read: true,
        createdAt: new Date("2026-05-17T09:30:00.000Z"),
      }),
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      activities: [
        {
          id: "n1",
          type: "dispute_update",
          title: "Dispute updated",
          message: "Your Experian dispute advanced to review.",
          read: false,
          createdAt: "2026-05-18T10:00:00.000Z",
        },
        {
          id: "n2",
          type: "payment_success",
          title: "Payment received",
          message: "We received your $99.99 payment.",
          read: true,
          createdAt: "2026-05-17T09:30:00.000Z",
        },
      ],
    });
    // createdAt is serialized as an ISO string on the wire, not a Date object.
    expect(typeof body.activities[0].createdAt).toBe("string");
  });

  it("returns an honest empty feed when the user has no notifications", async () => {
    authenticate();
    mockGetUserNotifications.mockResolvedValue([]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ activities: [] });
  });

  it("rejects an unauthenticated request with 401 (real guard) and never hits the service", async () => {
    mockValidate.mockResolvedValue({
      valid: false,
      user: null,
      error: "No authorization token provided",
    });

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockGetUserNotifications).not.toHaveBeenCalled();
  });

  it("is IDOR-safe: scopes to the guard's user.id and ignores a client-supplied id", async () => {
    authenticate("real-owner-42");
    mockGetUserNotifications.mockResolvedValue([]);

    // Attacker appends ?userId=victim - it must be ignored entirely.
    const res = await GET(
      makeRequest("http://localhost:3000/api/activity?userId=victim-999"),
    );

    expect(res.status).toBe(200);
    expect(mockGetUserNotifications).toHaveBeenCalledTimes(1);
    expect(mockGetUserNotifications).toHaveBeenCalledWith("real-owner-42");
    expect(mockGetUserNotifications).not.toHaveBeenCalledWith("victim-999");
  });

  it("returns an honest 503 on infra failure - never a mock fallback", async () => {
    authenticate();
    mockGetUserNotifications.mockRejectedValue(
      new Error("Failed to fetch notifications: connection reset"),
    );

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toHaveProperty("error");
    // No fabricated activities on the error path.
    expect(body).not.toHaveProperty("activities");
  });

  it("returns an honest 503 when the service rejects with a non-Error value", async () => {
    authenticate();
    // A rejection that is not an Error instance exercises the String(error) branch.
    mockGetUserNotifications.mockRejectedValue("connection dropped");

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).not.toHaveProperty("activities");
  });
});
