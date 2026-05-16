/**
 * Tests for /api/financial/goals
 *
 * Coverage:
 * - GET endpoint (list goals with filters and progress metrics)
 * - POST endpoint (create goal with Zod validation)
 * - JWT + RBAC auth
 * - Module-level getSupabase() mock with chainable query builder
 * - Zod createGoalSchema validation
 * - Filter parameters (status, type, priority)
 * - Error handling
 */

import { NextRequest } from "next/server";

// Module-level supabase mock - must be set up BEFORE route import
// because `const supabase = getSupabase()` runs at module load time
//
// The route builds the query chain as:
//   let query = supabase.from().select().eq("user_id").order()
//   if (filter) { query = query.eq(...) }
//   const { data, error } = await query;
//
// Since order() is mid-chain (not terminal), ALL methods must return `this`.
// The chain object itself must be thenable (have a .then) so `await query` works.
const mockSingleResult = jest.fn();
let mockQueryResult: { data: unknown[] | null; error: unknown } = { data: [], error: null };
const mockQueryChain: Record<string, jest.Mock> & { then?: unknown } = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation((resolve: (val: unknown) => void) => {
    return Promise.resolve(mockQueryResult).then(resolve);
  }),
};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: jest.fn(() => mockQueryChain),
}));

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/goal-tracker");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { goalTracker } from "@/lib/financial/goal-tracker";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

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

const mockGoalRow = {
  id: "goal-1",
  type: "emergency_fund",
  name: "Emergency Fund",
  description: "Save for emergencies",
  target_amount: 10000,
  current_amount: 3000,
  target_date: "2026-01-01",
  status: "active",
  priority: "high",
  created_at: "2025-01-01T00:00:00Z",
};

const mockProgress = {
  progressPercentage: 30,
  velocity: { monthlyVelocity: 500 },
  performanceScore: { grade: "B", status: "on_track" },
  predictions: { projectedCompletionDate: "2026-06-01" },
};

const mockCreatedGoal = {
  id: "goal-new",
  type: "emergency_fund",
  name: "New Emergency Fund",
  description: "New fund",
  targetAmount: 15000,
  currentAmount: 0,
  targetDate: "2027-01-01",
  status: "active",
  priority: "medium",
  createdAt: "2025-02-01T00:00:00Z",
};

describe("GET /api/financial/goals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    // Reset query chain to return goals
    mockQueryChain.from.mockReturnThis();
    mockQueryChain.select.mockReturnThis();
    mockQueryChain.eq.mockReturnThis();
    mockQueryChain.gte.mockReturnThis();
    mockQueryChain.order.mockReturnThis();
    mockQueryResult = { data: [mockGoalRow], error: null };
    (mockQueryChain as Record<string, unknown>).then = jest.fn().mockImplementation(
      (resolve: (val: unknown) => void) => Promise.resolve(mockQueryResult).then(resolve),
    );

    (goalTracker.calculateProgressMetrics as jest.Mock).mockResolvedValue(mockProgress);
  });

  it("should return enriched goals list", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe("goal-1");
    expect(data.data[0].name).toBe("Emergency Fund");
    expect(data.data[0].targetAmount).toBe(10000);
    expect(data.data[0].progress).toBeDefined();
    expect(data.data[0].progress.percentage).toBe(30);
    expect(data.data[0].progress.onTrack).toBe(true);
    expect(data._meta.count).toBe(1);
  });

  it("should return goals without progress when calculation fails", async () => {
    (goalTracker.calculateProgressMetrics as jest.Mock).mockRejectedValue(
      new Error("Progress calc failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data[0].id).toBe("goal-1");
    expect(data.data[0].progress).toBeUndefined();
  });

  it("should apply filter parameters", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals?status=active&type=emergency_fund&priority=high",
    );
    await GET(request);

    // eq is called for user_id, status, and type
    expect(mockQueryChain.eq).toHaveBeenCalledTimes(3);
    // gte is called for priority
    expect(mockQueryChain.gte).toHaveBeenCalledWith("priority", "high");
  });

  it("should include filter metadata in response", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals?status=active&type=savings",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data._meta.filters.status).toBe("active");
    expect(data._meta.filters.type).toBe("savings");
    expect(data._meta.filters.priority).toBeNull();
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on database error", async () => {
    mockQueryResult = { data: null, error: { message: "DB error" } };
    (mockQueryChain as Record<string, unknown>).then = jest.fn().mockImplementation(
      (resolve: (val: unknown) => void) => Promise.resolve(mockQueryResult).then(resolve),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe("POST /api/financial/goals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (goalTracker.createGoal as jest.Mock).mockResolvedValue(mockCreatedGoal);
    (goalTracker.calculateProgressMetrics as jest.Mock).mockResolvedValue(mockProgress);
  });

  it("should create a new goal", async () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
      {
        method: "POST",
        body: {
          type: "emergency_fund",
          name: "New Emergency Fund",
          targetAmount: 15000,
          targetDate: futureDate,
          description: "New fund",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe("goal-new");
    expect(data.data.name).toBe("New Emergency Fund");
    expect(data.data.progress).toBeDefined();
    expect(data.message).toBe("Financial goal created successfully");
    expect(goalTracker.createGoal).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        type: "emergency_fund",
        name: "New Emergency Fund",
        targetAmount: 15000,
      }),
    );
  });

  it("should return 400 for invalid goal data", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
      {
        method: "POST",
        body: {
          type: "",
          name: "",
          targetAmount: -100,
          targetDate: "2020-01-01", // past date
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(data.details.length).toBeGreaterThan(0);
  });

  it("should return 400 for missing required fields", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
      {
        method: "POST",
        body: { name: "Only name" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
      {
        method: "POST",
        body: {
          type: "savings",
          name: "Test",
          targetAmount: 1000,
          targetDate: futureDate,
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
      {
        method: "POST",
        body: {
          type: "savings",
          name: "Test",
          targetAmount: 1000,
          targetDate: futureDate,
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on service error", async () => {
    (goalTracker.createGoal as jest.Mock).mockRejectedValue(
      new Error("Create failed"),
    );

    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals",
      {
        method: "POST",
        body: {
          type: "emergency_fund",
          name: "Test Fund",
          targetAmount: 5000,
          targetDate: futureDate,
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Create failed");
  });
});
