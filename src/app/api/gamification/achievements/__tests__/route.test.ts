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
    it("should return 401 if user is not authenticated", async () => {
      mockAuth(false);

      const request = makeRequest(
        "/api/gamification/achievements",
        "POST",
        { action: "award" },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if action is missing", async () => {
      mockAuth(true);

      const request = makeRequest(
        "/api/gamification/achievements",
        "POST",
        {},
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Action is required");
    });

    it("should return 400 for unknown action", async () => {
      mockAuth(true);

      const request = makeRequest(
        "/api/gamification/achievements",
        "POST",
        { action: "invalid" },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Unknown action");
    });

    // --- AWARD ---

    describe("action: award", () => {
      it("should return 400 if achievementCode is missing", async () => {
        mockAuth(true);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          { action: "award" },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("achievementCode is required");
      });

      it("should award achievement successfully", async () => {
        mockAuth(true);

        const mockResult = {
          success: true,
          achievement: {
            id: "ach-001",
            code: "SAVINGS_100",
            name: "First $100 Saved",
            tier: "bronze",
            category: "financial",
          },
          xpEarned: 50,
        };

        mockAwardAchievement.mockResolvedValue(mockResult);
        mockCreateNotification.mockResolvedValue({});

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "award",
            achievementCode: "SAVINGS_100",
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.xpEarned).toBe(50);
        expect(mockCreateNotification).toHaveBeenCalled();
      });

      it("should return 409 for already earned achievements", async () => {
        mockAuth(true);

        mockAwardAchievement.mockResolvedValue({
          success: false,
          error: "Achievement already earned",
          alreadyEarned: true,
        });

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "award",
            achievementCode: "SAVINGS_100",
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.alreadyEarned).toBe(true);
      });

      it("should return 400 for award failure", async () => {
        mockAuth(true);

        mockAwardAchievement.mockResolvedValue({
          success: false,
          error: "Achievement not found",
        });

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "award",
            achievementCode: "NONEXISTENT",
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Achievement not found");
      });
    });

    // --- CHECK ---

    describe("action: check", () => {
      it("should return 400 if metrics is missing", async () => {
        mockAuth(true);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          { action: "check" },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("metrics object is required");
      });

      it("should check achievements against metrics", async () => {
        mockAuth(true);

        const mockResults = [
          {
            achievementId: "ach-001",
            achievementCode: "SAVINGS_100",
            met: true,
            currentValue: 150,
            targetValue: 100,
            progressPercent: 100,
          },
          {
            achievementId: "ach-002",
            achievementCode: "STREAK_7",
            met: false,
            currentValue: 3,
            targetValue: 7,
            progressPercent: 42,
          },
        ];

        mockCheckAchievements.mockResolvedValue(mockResults);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "check",
            metrics: { total_savings: 150, current_streak: 3 },
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.results).toHaveLength(2);
        expect(data.data.summary.met).toBe(1);
        expect(data.data.summary.unmet).toBe(1);
      });
    });

    // --- UPDATE_PROGRESS ---

    describe("action: update_progress", () => {
      it("should return 400 if neither achievementId nor achievementCode provided", async () => {
        mockAuth(true);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "update_progress",
            progress: 50,
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain(
          "achievementId or achievementCode is required",
        );
      });

      it("should return 400 if progress is missing", async () => {
        mockAuth(true);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "update_progress",
            achievementCode: "SAVINGS_100",
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("progress (number) is required");
      });

      it("should update progress by code", async () => {
        mockAuth(true);

        const mockUpdate = {
          achievementId: "ach-001",
          previousProgress: 30,
          newProgress: 75,
          completed: false,
        };

        mockUpdateProgressByCode.mockResolvedValue(mockUpdate);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "update_progress",
            achievementCode: "SAVINGS_100",
            progress: 75,
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.newProgress).toBe(75);
        expect(mockUpdateProgressByCode).toHaveBeenCalledWith(
          "user-123",
          "SAVINGS_100",
          75,
        );
      });

      it("should update progress by id", async () => {
        mockAuth(true);

        const mockUpdate = {
          achievementId: "ach-001",
          previousProgress: 0,
          newProgress: 50,
          completed: false,
        };

        mockUpdateProgress.mockResolvedValue(mockUpdate);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "update_progress",
            achievementId: "ach-001",
            progress: 50,
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockUpdateProgress).toHaveBeenCalledWith(
          "user-123",
          "ach-001",
          50,
        );
      });
    });

    // --- BATCH_UPDATE ---

    describe("action: batch_update", () => {
      it("should return 400 if metrics is missing", async () => {
        mockAuth(true);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "batch_update",
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("metrics object is required");
      });

      it("should batch update progress from metrics", async () => {
        mockAuth(true);

        const mockUpdates = [
          {
            achievementId: "ach-001",
            previousProgress: 0,
            newProgress: 150,
            completed: true,
          },
          {
            achievementId: "ach-002",
            previousProgress: 0,
            newProgress: 3,
            completed: false,
          },
        ];

        mockBatchUpdateProgress.mockResolvedValue(mockUpdates);

        const request = makeRequest(
          "/api/gamification/achievements",
          "POST",
          {
            action: "batch_update",
            metrics: { total_savings: 150, current_streak: 3 },
          },
        );
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.updates).toHaveLength(2);
        expect(data.data.summary.completed).toBe(1);
      });
    });

    it("should handle server errors in POST gracefully", async () => {
      mockAuth(true);

      mockAwardAchievement.mockRejectedValue(new Error("Server error"));

      const request = makeRequest(
        "/api/gamification/achievements",
        "POST",
        {
          action: "award",
          achievementCode: "SAVINGS_100",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to process achievement action");
    });
  });
});
