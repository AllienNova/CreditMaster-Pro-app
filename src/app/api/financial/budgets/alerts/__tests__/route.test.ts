/**
 * Tests for /api/financial/budgets/alerts
 *
 * Coverage:
 * - GET endpoint (get budget alerts)
 * - PATCH endpoint (mark alerts as read/dismissed)
 * - Authentication, Authorization, Validation, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/budget-service");

import { GET, PATCH } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { budgetService } from "@/lib/financial/budget-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string, options?: { method?: string; body?: unknown }) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockAlerts = [
  { id: "alert-1", type: "over_budget", category: "dining", read: false },
  { id: "alert-2", type: "approaching_limit", category: "groceries", read: false },
];

describe("GET /api/financial/budgets/alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getAlerts as jest.Mock).mockResolvedValue(mockAlerts);
  });

  it("should return alerts for authenticated user", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.count).toBe(2);
    expect(budgetService.getAlerts).toHaveBeenCalledWith("user-123", { unreadOnly: false });
  });

  it("should filter by unreadOnly query parameter", async () => {
    (budgetService.getAlerts as jest.Mock).mockResolvedValue([mockAlerts[0]]);
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts?unreadOnly=true");
    const res = await GET(req);

    expect(budgetService.getAlerts).toHaveBeenCalledWith("user-123", { unreadOnly: true });
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should return 500 on service error", async () => {
    (budgetService.getAlerts as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch budget alerts");
  });
});

describe("PATCH /api/financial/budgets/alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.markAlertAsRead as jest.Mock).mockResolvedValue(undefined);
    (budgetService.dismissAlert as jest.Mock).mockResolvedValue(undefined);
  });

  it("should mark alerts as read", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { alertIds: ["alert-1", "alert-2"], action: "read" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("marked as read");
    expect(budgetService.markAlertAsRead).toHaveBeenCalledTimes(2);
  });

  it("should dismiss alerts", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { alertIds: ["alert-1"], action: "dismiss" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("dismissed");
    expect(budgetService.dismissAlert).toHaveBeenCalledWith("alert-1", "user-123");
  });

  it("should return 400 for missing alertIds", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { action: "read" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("alertIds must be a non-empty array");
  });

  it("should return 400 for empty alertIds array", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { alertIds: [], action: "read" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("alertIds must be a non-empty array");
  });

  it("should return 400 for invalid action", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { alertIds: ["alert-1"], action: "delete" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('action must be either "read" or "dismiss"');
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { alertIds: ["alert-1"], action: "read" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { alertIds: ["alert-1"], action: "read" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("should return 500 on service error", async () => {
    (budgetService.markAlertAsRead as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/alerts", {
      method: "PATCH",
      body: { alertIds: ["alert-1"], action: "read" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to update budget alerts");
  });
});
