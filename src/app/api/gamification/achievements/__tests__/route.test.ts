/**
 * Tests for Gamification Achievements API Route
 * GET /api/gamification/achievements
 * POST /api/gamification/achievements
 */

import { NextRequest } from "next/server";

// Route wrapped in withAuth (TASK-AUTH-03f); auth resolves via
// jwtValidation.validateFromHeaders + resolveRoleFromDb.
const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));

// Mock Achievement Service
const mockGetUserAchievements = jest.fn();
const mockGetStats = jest.fn();
const mockAwardAchievement = jest.fn();
const mockCheckAchievements = jest.fn();
const mockUpdateProgressByCode = jest.fn();
const mockUpdateProgress = jest.fn();
const mockBatchUpdateProgress = jest.fn();
const mockCreateNotification = jest.fn();

jest.mock("@/lib/gamification", () => ({
  getAchievementService: () => ({
    getUserAchievements: mockGetUserAchievements,
    getStats: mockGetStats,
    awardAchievement: mockAwardAchievement,
    checkAchievements: mockCheckAchievements,
    updateProgressByCode: mockUpdateProgressByCode,
    updateProgress: mockUpdateProgress,
    batchUpdateProgress: mockBatchUpdateProgress,
    createNotification: mockCreateNotification,
  }),
}));

import { GET, POST } from "../route";

const mockUser = { id: "user-123", email: "test@example.com" };

function makeRequest(
  url: string,
  method: string = "GET",
  body?: Record<string, unknown>,
) {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  const parsedUrl = new URL(absoluteUrl);
  const req = {
    url: absoluteUrl,
    method,
    headers: new Headers({ "Content-Type": "application/json" }),
    nextUrl: parsedUrl,
    json: jest.fn().mockResolvedValue(body ?? {}),
  } as unknown as NextRequest;
  return req;
}

function mockAuth(authenticated: boolean) {
  if (authenticated) {
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
  } else {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  }
}

describe("/api/gamification/achievements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockAuth(false);
      const response = await GET(
        makeRequest("/api/gamification/achievements"),
      );
      expect(response.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      mockAuth(false);
      const response = await POST(
        makeRequest("/api/gamification/achievements", "POST", {
          action: "award",
        }),
      );
      expect(response.status).toBe(401);
    });
  });

  // ======================================================================
  // GET - List/Check Achievements
  // ======================================================================

  describe("GET", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockAuth(false);

      const request = makeRequest("/api/gamification/achievements");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return all achievements for authenticated user", async () => {
      mockAuth(true);

      const mockAchievements = [
        {
          id: "ua-001",
          userId: "user-123",
          achievementId: "ach-001",
          status: "completed",
          currentProgress: 100,
          targetProgress: 100,
          progressPercent: 100,
          achievement: {
            id: "ach-001",
            code: "SAVINGS_100",
            name: "First $100 Saved",
            category: "financial",
            tier: "bronze",
          },
        },
      ];

      mockGetUserAchievements.mockResolvedValue(mockAchievements);

      const request = makeRequest("/api/gamification/achievements");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.achievements).toHaveLength(1);
      expect(data.data.total).toBe(1);
    });

    it("should filter by category", async () => {
      mockAuth(true);

      mockGetUserAchievements.mockResolvedValue([]);

      const request = makeRequest(
        "/api/gamification/achievements?category=financial",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetUserAchievements).toHaveBeenCalledWith(
        "user-123",
        "financial",
        undefined,
      );
      expect(data.data.filters.category).toBe("financial");
    });

    it("should filter by status", async () => {
      mockAuth(true);

      mockGetUserAchievements.mockResolvedValue([]);

      const request = makeRequest(
        "/api/gamification/achievements?status=completed",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetUserAchievements).toHaveBeenCalledWith(
        "user-123",
        undefined,
        "completed",
      );
    });

    it("should filter by tier", async () => {
      mockAuth(true);

      const mockAchievements = [
        { achievement: { tier: "bronze" } },
        { achievement: { tier: "gold" } },
      ];
      mockGetUserAchievements.mockResolvedValue(mockAchievements);

      const request = makeRequest(
        "/api/gamification/achievements?tier=gold",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.achievements).toHaveLength(1);
      expect(data.data.achievements[0].achievement.tier).toBe("gold");
    });

    it("should return stats when stats=true", async () => {
      mockAuth(true);

      const mockStatsData = {
        totalAchievements: 32,
        completedCount: 5,
        inProgressCount: 10,
        lockedCount: 17,
        completionPercent: 15,
        totalXpEarned: 500,
        byCategory: {
          financial: {
            total: 15,
            completed: 3,
            inProgress: 5,
            completionPercent: 20,
          },
          usage: {
            total: 10,
            completed: 1,
            inProgress: 3,
            completionPercent: 10,
          },
          learning: {
            total: 7,
            completed: 1,
            inProgress: 2,
            completionPercent: 14,
          },
        },
        byTier: {
          bronze: { total: 10, completed: 3, completionPercent: 30 },
          silver: { total: 8, completed: 1, completionPercent: 12 },
          gold: { total: 8, completed: 1, completionPercent: 12 },
          platinum: { total: 6, completed: 0, completionPercent: 0 },
        },
        recentCompletions: [],
      };

      mockGetStats.mockResolvedValue(mockStatsData);

      const request = makeRequest(
        "/api/gamification/achievements?stats=true",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalAchievements).toBe(32);
      expect(data.data.completedCount).toBe(5);
    });

    it("should handle server errors gracefully", async () => {
      mockAuth(true);
      mockGetUserAchievements.mockRejectedValue(new Error("DB error"));

      const request = makeRequest("/api/gamification/achievements");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch achievements");
    });

    it("should support combined category and status filters", async () => {
      mockAuth(true);
      mockGetUserAchievements.mockResolvedValue([]);

      const request = makeRequest(
        "/api/gamification/achievements?category=usage&status=in_progress",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetUserAchievements).toHaveBeenCalledWith(
        "user-123",
        "usage",
        "in_progress",
      );
    });
  });

  // ======================================================================
  // POST - Award/Check/Update achievements
  // ======================================================================

  describe("POST", () => {
  // The POST contract CHANGED deliberately for security. It used to accept
  // {action, achievementCode, metrics, progress} from the request body and
  // write them through to user_achievements / xp_transactions, so any
  // authenticated user could award themselves any achievement and its XP.
  // The endpoint now refuses. These cases pin that refusal so it cannot be
  // quietly re-opened; the award/check/progress logic itself is still covered
  // by achievement-service's own unit tests.
  beforeEach(() => mockAuth(true));

  it("refuses to award an achievement from a client request", async () => {
    const res = await POST(
      makeRequest("/api/gamification/achievements", "POST", { action: "award", achievementCode: "SAVINGS_100000" }),
    );
    expect(res.status).toBe(501);
    expect(mockAwardAchievement).not.toHaveBeenCalled();
  });

  it("refuses client-supplied progress", async () => {
    const res = await POST(
      makeRequest("/api/gamification/achievements", "POST", { action: "update_progress", achievementId: "a1", progress: 999 }),
    );
    expect(res.status).toBe(501);
    expect(mockUpdateProgress).not.toHaveBeenCalled();
    expect(mockUpdateProgressByCode).not.toHaveBeenCalled();
  });

  it("refuses client-supplied metrics", async () => {
    for (const action of ["check", "batch_update"]) {
      const res = await POST(makeRequest("/api/gamification/achievements", "POST", { action, metrics: { savings: 1e9 } }));
      expect(res.status).toBe(501);
    }
    expect(mockCheckAchievements).not.toHaveBeenCalled();
    expect(mockBatchUpdateProgress).not.toHaveBeenCalled();
  });

  it("still requires authentication", async () => {
    mockAuth(false);
    const res = await POST(makeRequest("/api/gamification/achievements", "POST", { action: "award", achievementCode: "X" }));
    expect(res.status).toBe(401);
  });
});
});
