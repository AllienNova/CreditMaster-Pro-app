/**
 * Tests for /api/financial/goals/[id]
 *
 * Coverage:
 * - GET endpoint (fetch specific goal with detailed progress, recommendations, history)
 * - PATCH endpoint (update goal with Zod validation, ownership verification, progress tracking)
 * - DELETE endpoint (soft delete with ownership verification)
 * - JWT + RBAC auth
 * - Module-level getSupabase() mock with chainable query builder
 * - Dynamic [id] route params via Promise
 * - Zod updateGoalSchema validation
 * - Supabase ownership verification (eq id + eq user_id + single)
 * - Supabase update chain (update/eq/eq/select/single)
 * - Error handling
 */

import { NextRequest } from "next/server";

// Module-level supabase mock - must be set up BEFORE route import
// because `const supabase = getSupabase()` runs at module load time
const mockSingleResult = jest.fn();
const mockQueryChain = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: jest.fn(() => mockQueryChain),
}));

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/goal-tracker");

import { GET, PATCH, DELETE } from "../route";
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

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
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
  updated_at: "2025-06-01T00:00:00Z",
};

const mockProgress = {
  progressPercentage: 30,
  velocity: { monthlyVelocity: 500 },
  performanceScore: { grade: "B", status: "on_track" },
  predictions: { projectedCompletionDate: "2026-06-01" },
  risks: [{ type: "timeline", description: "Slightly behind schedule" }],
};

const mockRecommendations = [
  {
    type: "increase_contribution",
    title: "Increase Monthly Savings",
    description: "Boost your monthly contribution by $100",
    priority: "medium",
    expectedImpact: "Reach goal 2 months earlier",
  },
];

const mockHistory = [
  { date: "2025-01-01", amount: 1000, progressPercentage: 10 },
  { date: "2025-03-01", amount: 2000, progressPercentage: 20 },
  { date: "2025-06-01", amount: 3000, progressPercentage: 30 },
];

const mockUpdatedGoalRow = {
  ...mockGoalRow,
  name: "Updated Emergency Fund",
  target_amount: 15000,
  updated_at: "2025-07-01T00:00:00Z",
};

describe("GET /api/financial/goals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    // Reset query chain for ownership verification
    mockQueryChain.from.mockReturnThis();
    mockQueryChain.select.mockReturnThis();
    mockQueryChain.eq.mockReturnThis();
    mockQueryChain.single.mockResolvedValue({ data: mockGoalRow, error: null });

    (goalTracker.calculateProgressMetrics as jest.Mock).mockResolvedValue(mockProgress);
    (goalTracker.getGoalRecommendations as jest.Mock).mockResolvedValue(mockRecommendations);
    (goalTracker.getProgressHistory as jest.Mock).mockResolvedValue(mockHistory);
  });

  it("should return goal with detailed progress, recommendations, and history", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await GET(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe("goal-1");
    expect(data.data.name).toBe("Emergency Fund");
    expect(data.data.targetAmount).toBe(10000);
    expect(data.data.currentAmount).toBe(3000);
    expect(data.data.progress).toBeDefined();
    expect(data.data.progress.percentage).toBe(30);
    expect(data.data.progress.velocity).toEqual({ monthlyVelocity: 500 });
    expect(data.data.progress.risks).toBeDefined();
    expect(data.data.recommendations).toHaveLength(1);
    expect(data.data.recommendations[0].type).toBe("increase_contribution");
    expect(data.data.history).toHaveLength(3);
    expect(goalTracker.calculateProgressMetrics).toHaveBeenCalledWith("user-123", "goal-1");
    expect(goalTracker.getGoalRecommendations).toHaveBeenCalledWith("user-123", "goal-1");
    expect(goalTracker.getProgressHistory).toHaveBeenCalledWith("user-123", "goal-1");
  });

  it("should return null progress when calculateProgressMetrics returns null", async () => {
    (goalTracker.calculateProgressMetrics as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await GET(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.progress).toBeNull();
  });

  it("should return 404 when goal not found", async () => {
    mockQueryChain.single.mockResolvedValue({ data: null, error: { message: "Not found" } });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-nonexistent",
    );
    const response = await GET(request, createParams("goal-nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Goal not found");
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await GET(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await GET(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on unexpected error", async () => {
    mockQueryChain.single.mockRejectedValue(new Error("DB crashed"));

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await GET(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("DB crashed");
  });
});

describe("PATCH /api/financial/goals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    // Reset query chain - first call is ownership verification, second call is update
    mockQueryChain.from.mockReturnThis();
    mockQueryChain.select.mockReturnThis();
    mockQueryChain.update.mockReturnThis();
    mockQueryChain.eq.mockReturnThis();
    // First single() call: ownership check, second: update result
    mockQueryChain.single
      .mockResolvedValueOnce({ data: mockGoalRow, error: null })
      .mockResolvedValueOnce({ data: mockUpdatedGoalRow, error: null });

    (goalTracker.calculateProgressMetrics as jest.Mock).mockResolvedValue(mockProgress);
    (goalTracker.updateGoalProgress as jest.Mock).mockResolvedValue(undefined);
  });

  it("should update goal properties", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: {
          name: "Updated Emergency Fund",
          targetAmount: 15000,
        },
      },
    );
    const response = await PATCH(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Updated Emergency Fund");
    expect(data.data.targetAmount).toBe(15000);
    expect(data.message).toBe("Goal updated successfully");
  });

  it("should call updateGoalProgress when currentAmount is updated", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: {
          currentAmount: 5000,
        },
      },
    );
    await PATCH(request, createParams("goal-1"));

    expect(goalTracker.updateGoalProgress).toHaveBeenCalledWith(
      "user-123",
      "goal-1",
      5000,
    );
  });

  it("should not call updateGoalProgress when currentAmount is not updated", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: {
          name: "New Name",
        },
      },
    );
    await PATCH(request, createParams("goal-1"));

    expect(goalTracker.updateGoalProgress).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid update data", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: {
          targetAmount: -100,
        },
      },
    );
    const response = await PATCH(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("should return 400 for invalid status value", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: {
          status: "invalid_status",
        },
      },
    );
    const response = await PATCH(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Validation failed");
  });

  it("should return 404 when goal not found for update", async () => {
    mockQueryChain.single.mockReset();
    mockQueryChain.single.mockResolvedValue({ data: null, error: { message: "Not found" } });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-nonexistent",
      {
        method: "PATCH",
        body: { name: "Update" },
      },
    );
    const response = await PATCH(request, createParams("goal-nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Goal not found");
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: { name: "Test" },
      },
    );
    const response = await PATCH(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: { name: "Test" },
      },
    );
    const response = await PATCH(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on update error", async () => {
    mockQueryChain.single.mockReset();
    // First call: ownership check succeeds
    mockQueryChain.single
      .mockResolvedValueOnce({ data: mockGoalRow, error: null })
      // Second call: update fails
      .mockResolvedValueOnce({ data: null, error: { message: "Update failed" } });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
      {
        method: "PATCH",
        body: { name: "Test" },
      },
    );
    const response = await PATCH(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe("DELETE /api/financial/goals/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    // Reset query chain for ownership verification
    mockQueryChain.from.mockReturnThis();
    mockQueryChain.select.mockReturnThis();
    mockQueryChain.eq.mockReturnThis();
    mockQueryChain.single.mockResolvedValue({ data: mockGoalRow, error: null });

    (goalTracker.deleteGoal as jest.Mock).mockResolvedValue(undefined);
  });

  it("should soft delete a goal", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await DELETE(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Goal deleted successfully");
    expect(data._meta.goalId).toBe("goal-1");
    expect(data._meta.deletedAt).toBeDefined();
    expect(goalTracker.deleteGoal).toHaveBeenCalledWith("user-123", "goal-1");
  });

  it("should return 404 when goal not found for delete", async () => {
    mockQueryChain.single.mockResolvedValue({ data: null, error: { message: "Not found" } });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-nonexistent",
    );
    const response = await DELETE(request, createParams("goal-nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Goal not found");
  });

  it("should return 401 for invalid JWT", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await DELETE(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await DELETE(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 500 on delete error", async () => {
    (goalTracker.deleteGoal as jest.Mock).mockRejectedValue(
      new Error("Delete failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/goals/goal-1",
    );
    const response = await DELETE(request, createParams("goal-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Delete failed");
  });
});
