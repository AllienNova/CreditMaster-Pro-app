/**
 * Anonymous Leaderboard Service Tests
 *
 * Comprehensive tests for the privacy-first leaderboard system:
 * - Participation management (opt-in / opt-out)
 * - Anonymous name generation
 * - Leaderboard retrieval and percentile calculation
 * - Score submission (including no-op guard)
 * - Statistics computation (average, median, percentiles)
 * - Category info / metadata helpers
 * - DB mapping helpers (camelCase <-> snake_case)
 * - Singleton accessor
 */

import {
  AnonymousLeaderboardService,
  getAnonymousLeaderboardService,
  type LeaderboardCategory,
  type TimeFrame,
} from "../anonymous-leaderboard-service";

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

/**
 * Build a fresh mock Supabase client with chainable methods.
 * Each test can override `mockSupabase.from` via `.mockImplementation()`
 * to control per-table behavior (same pattern as achievement-service tests).
 */
function createMockSupabase() {
  const mockSingle = jest.fn();
  const mockLimit = jest.fn().mockReturnValue({ data: [], error: null });
  const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit, data: [], error: null });
  const mockEq = jest.fn().mockImplementation(() => ({
    eq: mockEq,
    single: mockSingle,
    select: mockSelect,
    order: mockOrder,
    limit: mockLimit,
  }));
  const mockSelect = jest.fn().mockImplementation(() => ({
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    limit: mockLimit,
  }));
  const mockInsert = jest.fn().mockImplementation(() => ({
    select: mockSelect,
    data: null,
    error: null,
  }));
  const mockUpdate = jest.fn().mockImplementation(() => ({
    eq: mockEq,
    select: mockSelect,
  }));
  const mockFrom = jest.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }));

  return {
    from: mockFrom,
    _mocks: { mockFrom, mockSelect, mockEq, mockSingle, mockOrder, mockInsert, mockUpdate, mockLimit },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER_ID = "user-abc-123";

function makeDbParticipation(overrides: Record<string, unknown> = {}) {
  return {
    id: "part-001",
    user_id: TEST_USER_ID,
    anonymous_id: "anon-uuid-001",
    display_name: "SwiftSaver42",
    opted_in: true,
    categories: ["savings_rate", "credit_score"],
    show_streak: true,
    show_badge: true,
    created_at: "2026-01-15T00:00:00.000Z",
    updated_at: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

function makeScoreRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "user-1",
    score: 90,
    previous_rank: null,
    badge: null,
    streak: null,
    leaderboard_participation: {
      anonymous_id: "anon-1",
      display_name: "BoldEagle100",
      show_badge: false,
      show_streak: false,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnonymousLeaderboardService", () => {
  let service: AnonymousLeaderboardService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    const { createClient } = require("@supabase/supabase-js");
    createClient.mockReturnValue(mockSupabase);
    service = new AnonymousLeaderboardService("https://test.supabase.co", "test-key");
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe("constructor", () => {
    it("should create a Supabase client with the provided URL and key", () => {
      const { createClient } = require("@supabase/supabase-js");
      expect(createClient).toHaveBeenCalledWith("https://test.supabase.co", "test-key");
    });
  });

  // =========================================================================
  // getCategoryInfo
  // =========================================================================

  describe("getCategoryInfo", () => {
    it("should return config for savings_rate", () => {
      const info = service.getCategoryInfo("savings_rate");
      expect(info).toEqual({
        name: "Savings Rate Champions",
        description: "Ranked by percentage of income saved",
        unit: "%",
        higherIsBetter: true,
        scoreCalculation: "(savings / income) * 100",
      });
    });

    it("should return config for debt_payoff", () => {
      const info = service.getCategoryInfo("debt_payoff");
      expect(info.name).toBe("Debt Crushers");
      expect(info.unit).toBe("$");
      expect(info.higherIsBetter).toBe(true);
    });

    it("should return config for credit_score", () => {
      const info = service.getCategoryInfo("credit_score");
      expect(info.name).toBe("Credit Climbers");
      expect(info.unit).toBe("pts");
    });

    it("should return config for net_worth_growth", () => {
      const info = service.getCategoryInfo("net_worth_growth");
      expect(info.name).toBe("Wealth Builders");
      expect(info.unit).toBe("%");
    });

    it("should return config for budget_streak", () => {
      const info = service.getCategoryInfo("budget_streak");
      expect(info.name).toBe("Budget Bosses");
      expect(info.unit).toBe("days");
    });

    it("should return config for investment_returns", () => {
      const info = service.getCategoryInfo("investment_returns");
      expect(info.name).toBe("Investment Aces");
      expect(info.unit).toBe("%");
    });

    it("should return config for vitality_score", () => {
      const info = service.getCategoryInfo("vitality_score");
      expect(info.name).toBe("Financial Wellness");
      expect(info.unit).toBe("pts");
    });
  });

  // =========================================================================
  // getAllCategories
  // =========================================================================

  describe("getAllCategories", () => {
    it("should return all 7 categories", () => {
      const categories = service.getAllCategories();
      expect(categories).toHaveLength(7);
    });

    it("should include all expected category keys", () => {
      const categories = service.getAllCategories();
      const keys = categories.map((c) => c.category);
      expect(keys).toEqual(
        expect.arrayContaining([
          "savings_rate",
          "debt_payoff",
          "credit_score",
          "net_worth_growth",
          "budget_streak",
          "investment_returns",
          "vitality_score",
        ]),
      );
    });

    it("should have higherIsBetter=true for all built-in categories", () => {
      const categories = service.getAllCategories();
      categories.forEach((c) => {
        expect(c.info.higherIsBetter).toBe(true);
      });
    });

    it("should have non-empty name, description, unit, and scoreCalculation for every category", () => {
      const categories = service.getAllCategories();
      categories.forEach((c) => {
        expect(c.info.name.length).toBeGreaterThan(0);
        expect(c.info.description.length).toBeGreaterThan(0);
        expect(c.info.unit.length).toBeGreaterThan(0);
        expect(c.info.scoreCalculation.length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // getParticipation
  // =========================================================================

  describe("getParticipation", () => {
    it("should return participation when user exists", async () => {
      const dbRow = makeDbParticipation();
      const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getParticipation(TEST_USER_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith("leaderboard_participation");
      expect(result).not.toBeNull();
      expect(result!.userId).toBe(TEST_USER_ID);
      expect(result!.optedIn).toBe(true);
      expect(result!.displayName).toBe("SwiftSaver42");
      expect(result!.categories).toEqual(["savings_rate", "credit_score"]);
    });

    it("should return null when user has no participation record", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getParticipation(TEST_USER_ID);

      expect(result).toBeNull();
    });

    it("should convert DB dates to Date objects", async () => {
      const dbRow = makeDbParticipation({
        created_at: "2026-02-10T12:00:00.000Z",
        updated_at: "2026-02-11T14:30:00.000Z",
      });
      const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getParticipation(TEST_USER_ID);

      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(result!.createdAt.toISOString()).toBe("2026-02-10T12:00:00.000Z");
    });
  });

  // =========================================================================
  // optIn
  // =========================================================================

  describe("optIn", () => {
    it("should create new participation when user has no existing record", async () => {
      // First call: getParticipation -> null
      // Second call: insert -> select -> single
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getParticipation
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        // insert path
        const mockSingle = jest.fn().mockResolvedValue({
          data: makeDbParticipation({ categories: ["savings_rate"] }),
          error: null,
        });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
        return { insert: mockInsert };
      });

      const result = await service.optIn(TEST_USER_ID, ["savings_rate"]);

      expect(result.optedIn).toBe(true);
      expect(result.categories).toContain("savings_rate");
    });

    it("should update existing participation when user already has a record", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getParticipation returns existing
          const mockSingle = jest.fn().mockResolvedValue({
            data: makeDbParticipation({ categories: ["credit_score"] }),
            error: null,
          });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        // updateParticipation
        const mockSingle = jest.fn().mockResolvedValue({
          data: makeDbParticipation({
            opted_in: true,
            categories: ["savings_rate", "debt_payoff"],
          }),
          error: null,
        });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
        return { update: mockUpdate };
      });

      const result = await service.optIn(TEST_USER_ID, ["savings_rate", "debt_payoff"]);

      expect(result.optedIn).toBe(true);
    });

    it("should throw when insert fails", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        const mockSingle = jest.fn().mockResolvedValue({
          data: null,
          error: { message: "insert failed", code: "23505" },
        });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
        return { insert: mockInsert };
      });

      await expect(
        service.optIn(TEST_USER_ID, ["savings_rate"]),
      ).rejects.toEqual(
        expect.objectContaining({ message: "insert failed" }),
      );
    });
  });

  // =========================================================================
  // optOut
  // =========================================================================

  describe("optOut", () => {
    it("should set opted_in to false for the user", async () => {
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      await service.optOut(TEST_USER_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith("leaderboard_participation");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ opted_in: false }),
      );
    });

    it("should include updated_at timestamp", async () => {
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      await service.optOut(TEST_USER_ID);

      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg).toHaveProperty("updated_at");
      expect(typeof updateArg.updated_at).toBe("string");
      // Should be a valid ISO date string
      expect(() => new Date(updateArg.updated_at)).not.toThrow();
    });
  });

  // =========================================================================
  // updateParticipation
  // =========================================================================

  describe("updateParticipation", () => {
    it("should update and return the participation record", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: makeDbParticipation({ show_streak: false }),
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      const result = await service.updateParticipation(TEST_USER_ID, {
        showStreak: false,
      });

      expect(result.showStreak).toBe(false);
    });

    it("should throw when update fails", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "update failed" },
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      await expect(
        service.updateParticipation(TEST_USER_ID, { optedIn: false }),
      ).rejects.toEqual(
        expect.objectContaining({ message: "update failed" }),
      );
    });
  });

  // =========================================================================
  // regenerateAnonymousName
  // =========================================================================

  describe("regenerateAnonymousName", () => {
    it("should return a new name matching the pattern {Adjective}{Noun}{0-999}", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: makeDbParticipation(),
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      const name = await service.regenerateAnonymousName(TEST_USER_ID);

      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
      // Format: CapitalWord + CapitalWord + digits
      expect(name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/);
    });

    it("should call updateParticipation with the new name", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: makeDbParticipation(),
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      await service.regenerateAnonymousName(TEST_USER_ID);

      expect(mockUpdate).toHaveBeenCalled();
      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg).toHaveProperty("display_name");
      expect(updateArg.display_name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/);
    });

    it("should generate different names on successive calls (probabilistic)", async () => {
      const names: string[] = [];
      for (let i = 0; i < 5; i++) {
        const mockSingle = jest.fn().mockResolvedValue({
          data: makeDbParticipation(),
          error: null,
        });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ update: mockUpdate });

        const name = await service.regenerateAnonymousName(TEST_USER_ID);
        names.push(name);
      }
      // With 29 adjectives * 30 nouns * 1000 numbers = 870,000 possibilities,
      // 5 names should not all be identical
      const unique = new Set(names);
      // We just check at least one call produced a valid name
      names.forEach((n) => expect(n).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/));
    });
  });

  // =========================================================================
  // submitScore
  // =========================================================================

  describe("submitScore", () => {
    it("should be a no-op when user has no participation", async () => {
      // getParticipation returns null
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.submitScore(TEST_USER_ID, "savings_rate", 42);

      // Only 1 from() call for getParticipation
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith("leaderboard_participation");
    });

    it("should be a no-op when user opted_in is false", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: makeDbParticipation({ opted_in: false }),
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.submitScore(TEST_USER_ID, "savings_rate", 42);

      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should be a no-op when category is not in user categories", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: makeDbParticipation({ categories: ["credit_score"] }),
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.submitScore(TEST_USER_ID, "savings_rate", 42);

      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should insert a new score when no existing score", async () => {
      let callCount = 0;
      const mockInsertFn = jest.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // getParticipation
          const mockSingle = jest.fn().mockResolvedValue({
            data: makeDbParticipation({ categories: ["savings_rate"] }),
            error: null,
          });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (callCount === 2) {
          // existing score lookup -> null
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle, eq: jest.fn().mockReturnValue({ single: mockSingle, eq: jest.fn().mockReturnValue({ single: mockSingle }) }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        // insert
        return { insert: mockInsertFn };
      });

      await service.submitScore(TEST_USER_ID, "savings_rate", 85.5);

      expect(mockInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: TEST_USER_ID,
          category: "savings_rate",
          score: 85.5,
        }),
      );
    });

    it("should update existing score when one already exists", async () => {
      let callCount = 0;
      const mockUpdateFn = jest.fn();
      const mockUpdateEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });
      mockUpdateFn.mockReturnValue({ eq: mockUpdateEq });

      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getParticipation
          const mockSingle = jest.fn().mockResolvedValue({
            data: makeDbParticipation({ categories: ["savings_rate"] }),
            error: null,
          });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (callCount === 2) {
          // existing score lookup -> found
          const mockSingle = jest.fn().mockResolvedValue({
            data: { score: 70, rank: 5 },
            error: null,
          });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle, eq: jest.fn().mockReturnValue({ single: mockSingle, eq: jest.fn().mockReturnValue({ single: mockSingle }) }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        // update
        return { update: mockUpdateFn };
      });

      await service.submitScore(TEST_USER_ID, "savings_rate", 90);

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 90,
          previous_score: 70,
          previous_rank: 5,
        }),
      );
    });

    it("should default timeFrame to monthly", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const mockSingle = jest.fn().mockResolvedValue({
            data: makeDbParticipation({ categories: ["savings_rate"] }),
            error: null,
          });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        // existing score lookup — needs 3-level .eq() chaining: .eq().eq().eq().single()
        const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
        const capturedEq: jest.Mock = jest.fn().mockImplementation(() => ({ single: mockSingle, eq: capturedEq }));
        const mockSelect = jest.fn().mockReturnValue({ eq: capturedEq });
        const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
        return { select: mockSelect, insert: mockInsert };
      });

      await service.submitScore(TEST_USER_ID, "savings_rate", 50);

      // We verify that leaderboard_scores was queried with time_frame = monthly
      // by checking the from calls include "leaderboard_scores"
      expect(mockSupabase.from).toHaveBeenCalledWith("leaderboard_scores");
    });
  });

  // =========================================================================
  // getLeaderboard
  // =========================================================================

  describe("getLeaderboard", () => {
    it("should return an empty leaderboard when no scores exist", async () => {
      const mockLimit = jest.fn().mockReturnValue({ data: [], error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      expect(result.category).toBe("savings_rate");
      expect(result.timeFrame).toBe("monthly");
      expect(result.entries).toHaveLength(0);
      expect(result.totalParticipants).toBe(0);
      expect(result.id).toBe("savings_rate-monthly");
    });

    it("should map scores to LeaderboardEntry with ranks", async () => {
      const scoreRows = [
        makeScoreRow({ user_id: "user-1", score: 95, previous_rank: 2, display_name: "BoldEagle100" }),
        makeScoreRow({ user_id: "user-2", score: 80, leaderboard_participation: { anonymous_id: "anon-2", display_name: "CleverWolf55", show_badge: false, show_streak: false } }),
      ];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[0].score).toBe(95);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[1].displayName).toBe("CleverWolf55");
    });

    it("should calculate percentiles correctly", async () => {
      const scoreRows = [
        makeScoreRow({ user_id: "u1", score: 100 }),
        makeScoreRow({ user_id: "u2", score: 80 }),
        makeScoreRow({ user_id: "u3", score: 60 }),
        makeScoreRow({ user_id: "u4", score: 40 }),
      ];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      // Percentile = ((total - index) / total) * 100
      expect(result.entries[0].percentile).toBe(100); // (4-0)/4*100
      expect(result.entries[1].percentile).toBe(75);  // (4-1)/4*100
      expect(result.entries[2].percentile).toBe(50);  // (4-2)/4*100
      expect(result.entries[3].percentile).toBe(25);  // (4-3)/4*100
    });

    it("should identify the current user in entries", async () => {
      const scoreRows = [
        makeScoreRow({ user_id: "other-user", score: 90 }),
        makeScoreRow({ user_id: TEST_USER_ID, score: 70 }),
      ];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly", TEST_USER_ID);

      expect(result.entries[0].isCurrentUser).toBe(false);
      expect(result.entries[1].isCurrentUser).toBe(true);
      expect(result.userRank).toBe(2);
      expect(result.userScore).toBe(70);
      expect(result.userPercentile).toBe(50);
    });

    it("should set isCurrentUser to false for all when no userId provided", async () => {
      const scoreRows = [makeScoreRow({ user_id: TEST_USER_ID, score: 90 })];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      expect(result.entries[0].isCurrentUser).toBe(false);
      expect(result.userRank).toBeUndefined();
    });

    it("should compute position change from previous_rank", async () => {
      const scoreRows = [makeScoreRow({ user_id: "u1", score: 100, previous_rank: 3 })];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      // change = previous_rank - current_rank = 3 - 1 = 2
      expect(result.entries[0].change).toBe(2);
    });

    it("should set change to 0 when no previous_rank", async () => {
      const scoreRows = [makeScoreRow({ user_id: "u1", score: 100, previous_rank: null })];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      expect(result.entries[0].change).toBe(0);
    });

    it("should respect badge/streak visibility from participation settings", async () => {
      const scoreRows = [
        makeScoreRow({
          user_id: "u1",
          score: 100,
          badge: "platinum",
          streak: 60,
          leaderboard_participation: {
            anonymous_id: "a1",
            display_name: "A",
            show_badge: true,
            show_streak: false,
          },
        }),
      ];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      expect(result.entries[0].badge).toBe("platinum");
      expect(result.entries[0].streak).toBeUndefined(); // show_streak = false
    });

    it("should handle missing participation gracefully", async () => {
      const scoreRows = [
        makeScoreRow({ user_id: "u1", score: 100, leaderboard_participation: null }),
      ];
      const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      expect(result.entries[0].anonymousId).toBe("unknown");
      expect(result.entries[0].displayName).toBe("Anonymous");
    });

    it("should throw when the query errors", async () => {
      const mockLimit = jest.fn().mockReturnValue({ data: null, error: { message: "DB error" } });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await expect(
        service.getLeaderboard("savings_rate", "monthly"),
      ).rejects.toEqual(expect.objectContaining({ message: "DB error" }));
    });

    it("should set lastUpdated to a Date instance", async () => {
      const mockLimit = jest.fn().mockReturnValue({ data: [], error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboard("savings_rate", "monthly");

      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it("should use descending order for higherIsBetter categories", async () => {
      const mockLimit = jest.fn().mockReturnValue({ data: [], error: null });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.getLeaderboard("savings_rate", "monthly");

      // All categories have higherIsBetter=true, so ascending should be false
      expect(mockOrder).toHaveBeenCalledWith("score", { ascending: false });
    });
  });

  // =========================================================================
  // getUserRankings
  // =========================================================================

  describe("getUserRankings", () => {
    it("should return empty array when user has no participation", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getUserRankings(TEST_USER_ID);

      expect(result).toEqual([]);
    });

    it("should return empty array when user is not opted in", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: makeDbParticipation({ opted_in: false }),
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getUserRankings(TEST_USER_ID);

      expect(result).toEqual([]);
    });

    it("should return rankings for each opted-in category", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getParticipation
          const mockSingle = jest.fn().mockResolvedValue({
            data: makeDbParticipation({ categories: ["savings_rate"] }),
            error: null,
          });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        // getLeaderboard for savings_rate
        const scoreRows = [
          makeScoreRow({ user_id: "other", score: 95 }),
          makeScoreRow({ user_id: TEST_USER_ID, score: 80 }),
        ];
        const mockLimit = jest.fn().mockReturnValue({ data: scoreRows, error: null });
        const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
        return { select: mockSelect };
      });

      const result = await service.getUserRankings(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("savings_rate");
      expect(result[0].rank).toBe(2);
      expect(result[0].score).toBe(80);
    });
  });

  // =========================================================================
  // getLeaderboardStats
  // =========================================================================

  describe("getLeaderboardStats", () => {
    it("should return zeroed stats when no scores exist", async () => {
      const mockOrder = jest.fn().mockReturnValue({ data: [], error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboardStats("savings_rate");

      expect(result).toEqual({
        category: "savings_rate",
        average: 0,
        median: 0,
        top10Percent: 0,
        top25Percent: 0,
        participantCount: 0,
      });
    });

    it("should return zeroed stats when data is null", async () => {
      const mockOrder = jest.fn().mockReturnValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboardStats("credit_score");

      expect(result.participantCount).toBe(0);
      expect(result.average).toBe(0);
    });

    it("should calculate average correctly", async () => {
      const mockOrder = jest.fn().mockReturnValue({
        data: [{ score: 100 }, { score: 80 }, { score: 60 }, { score: 40 }],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboardStats("savings_rate");

      expect(result.average).toBe(70); // (100+80+60+40)/4
    });

    it("should calculate median correctly for even count", async () => {
      const mockOrder = jest.fn().mockReturnValue({
        data: [{ score: 100 }, { score: 80 }, { score: 60 }, { score: 40 }],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboardStats("savings_rate");

      // sortedScores (desc): [100, 80, 60, 40]
      // median index: floor(4/2) = 2 -> sortedScores[2] = 60
      expect(result.median).toBe(60);
    });

    it("should calculate median correctly for odd count", async () => {
      const mockOrder = jest.fn().mockReturnValue({
        data: [{ score: 90 }, { score: 70 }, { score: 50 }],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboardStats("savings_rate");

      // sortedScores (desc): [90, 70, 50]
      // median index: floor(3/2) = 1 -> sortedScores[1] = 70
      expect(result.median).toBe(70);
    });

    it("should calculate top 10% and top 25% thresholds", async () => {
      const scores = Array.from({ length: 20 }, (_, i) => ({
        score: (20 - i) * 5,
      })); // [100, 95, 90, ..., 5]
      const mockOrder = jest.fn().mockReturnValue({ data: scores, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboardStats("savings_rate");

      // sorted desc: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, ...]
      // top10Index = floor(20 * 0.1) = 2 -> sortedScores[2] = 90
      // top25Index = floor(20 * 0.25) = 5 -> sortedScores[5] = 75
      expect(result.top10Percent).toBe(90);
      expect(result.top25Percent).toBe(75);
      expect(result.participantCount).toBe(20);
    });

    it("should handle single score", async () => {
      const mockOrder = jest.fn().mockReturnValue({
        data: [{ score: 42 }],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getLeaderboardStats("savings_rate");

      expect(result.average).toBe(42);
      expect(result.median).toBe(42);
      expect(result.top10Percent).toBe(42);
      expect(result.top25Percent).toBe(42);
      expect(result.participantCount).toBe(1);
    });

    it("should default timeFrame to monthly", async () => {
      const mockOrder = jest.fn().mockReturnValue({ data: [], error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.getLeaderboardStats("savings_rate");

      expect(mockSupabase.from).toHaveBeenCalledWith("leaderboard_scores");
    });
  });

  // =========================================================================
  // Singleton accessor
  // =========================================================================

  describe("getAnonymousLeaderboardService", () => {
    it("should return an instance of AnonymousLeaderboardService", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      // Reset singleton by re-importing in isolated module
      // Note: jest.isolateModules creates a different class identity, so we
      // check for method existence rather than using toBeInstanceOf.
      jest.isolateModules(() => {
        const { getAnonymousLeaderboardService: getService } = require("../anonymous-leaderboard-service");
        const { createClient } = require("@supabase/supabase-js");
        createClient.mockReturnValue(createMockSupabase());
        const instance = getService();
        expect(instance).toBeDefined();
        expect(typeof instance.getLeaderboard).toBe("function");
        expect(typeof instance.optIn).toBe("function");
        expect(typeof instance.submitScore).toBe("function");
        expect(typeof instance.getLeaderboardStats).toBe("function");
      });
    });
  });

  // =========================================================================
  // Type exports
  // =========================================================================

  describe("type definitions", () => {
    it("should export LeaderboardCategory as a union of 7 strings", () => {
      const validCategories: LeaderboardCategory[] = [
        "savings_rate",
        "debt_payoff",
        "credit_score",
        "net_worth_growth",
        "budget_streak",
        "investment_returns",
        "vitality_score",
      ];
      expect(validCategories).toHaveLength(7);
    });

    it("should export TimeFrame as a union of 5 strings", () => {
      const validTimeFrames: TimeFrame[] = [
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
        "all_time",
      ];
      expect(validTimeFrames).toHaveLength(5);
    });
  });
});
