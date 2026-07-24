/**
 * Achievement Service Tests
 * Comprehensive tests for the achievement and badge system.
 */

import {
  AchievementService,
  BUILT_IN_ACHIEVEMENTS,
  TIER_CONFIG,
  CATEGORY_CONFIG,
  type AchievementDefinition,
  type AchievementCategory,
  type BadgeTier,
  type AchievementCondition,
  type UserAchievement,
} from "../achievement-service";

// Mock @supabase/supabase-js
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

// Helper to build a mock Supabase client with chainable methods
function createMockSupabase() {
  const mockSingle = jest.fn();
  const mockOrder = jest.fn().mockReturnValue({ data: [], error: null });
  const mockEq = jest.fn().mockReturnThis();
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle });
  const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  });

  return {
    from: mockFrom,
    auth: { getUser: jest.fn() },
    _mocks: { mockFrom, mockSelect, mockEq, mockSingle, mockOrder, mockInsert, mockUpdate },
  };
}

// Produce a full AchievementDefinition from a partial
function makeAchievementDef(overrides: Partial<AchievementDefinition> = {}): AchievementDefinition {
  return {
    id: "ach-001",
    code: "SAVINGS_FIRST_100",
    name: "First $100 Saved",
    description: "Save your first $100",
    icon: "piggy-bank",
    category: "financial",
    tier: "bronze",
    xpReward: 50,
    conditions: [
      { metric: "total_savings", operator: "gte", targetValue: 100, description: "Total savings >= $100" },
    ],
    isActive: true,
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Produce a DB row (snake_case) from an AchievementDefinition
function defToDbRow(def: AchievementDefinition) {
  return {
    id: def.id,
    code: def.code,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    tier: def.tier,
    xp_reward: def.xpReward,
    conditions: def.conditions,
    is_active: def.isActive,
    sort_order: def.sortOrder,
    created_at: def.createdAt,
  };
}

function makeUserAchievementRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ua-001",
    user_id: "user-123",
    achievement_id: "ach-001",
    status: "in_progress",
    current_progress: 50,
    target_progress: 100,
    progress_percent: 50,
    completed_at: null,
    notification_sent: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("AchievementService", () => {
  let service: AchievementService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    const { createClient } = require("@supabase/supabase-js");
    createClient.mockReturnValue(mockSupabase);
    service = new AchievementService("http://localhost:54321", "test-key");
  });

  // ========================================================================
  // BUILT-IN ACHIEVEMENTS CONSTANTS
  // ========================================================================

  describe("BUILT_IN_ACHIEVEMENTS", () => {
    it("should contain 32 built-in achievement definitions", () => {
      expect(BUILT_IN_ACHIEVEMENTS.length).toBe(32);
    });

    it("should have unique codes for all achievements", () => {
      const codes = BUILT_IN_ACHIEVEMENTS.map((a) => a.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("should have unique sort orders", () => {
      const orders = BUILT_IN_ACHIEVEMENTS.map((a) => a.sortOrder);
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBe(orders.length);
    });

    it("should include all three categories", () => {
      const categories = new Set(BUILT_IN_ACHIEVEMENTS.map((a) => a.category));
      expect(categories.has("financial")).toBe(true);
      expect(categories.has("usage")).toBe(true);
      expect(categories.has("learning")).toBe(true);
    });

    it("should include all four tiers", () => {
      const tiers = new Set(BUILT_IN_ACHIEVEMENTS.map((a) => a.tier));
      expect(tiers.has("bronze")).toBe(true);
      expect(tiers.has("silver")).toBe(true);
      expect(tiers.has("gold")).toBe(true);
      expect(tiers.has("platinum")).toBe(true);
    });

    it("should have at least one condition per achievement", () => {
      for (const achievement of BUILT_IN_ACHIEVEMENTS) {
        expect(achievement.conditions.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("should have positive xpReward for all achievements", () => {
      for (const achievement of BUILT_IN_ACHIEVEMENTS) {
        expect(achievement.xpReward).toBeGreaterThan(0);
      }
    });

    it("should have all achievements marked active", () => {
      for (const achievement of BUILT_IN_ACHIEVEMENTS) {
        expect(achievement.isActive).toBe(true);
      }
    });

    it("should have valid condition operators", () => {
      const validOps = new Set(["gte", "lte", "eq", "gt", "lt"]);
      for (const achievement of BUILT_IN_ACHIEVEMENTS) {
        for (const condition of achievement.conditions) {
          expect(validOps.has(condition.operator)).toBe(true);
        }
      }
    });
  });

  // ========================================================================
  // TIER_CONFIG
  // ========================================================================

  describe("TIER_CONFIG", () => {
    it("should define four tiers", () => {
      expect(Object.keys(TIER_CONFIG).length).toBe(4);
    });

    it("should have correct xp multipliers", () => {
      expect(TIER_CONFIG.bronze.xpMultiplier).toBe(1.0);
      expect(TIER_CONFIG.silver.xpMultiplier).toBe(1.5);
      expect(TIER_CONFIG.gold.xpMultiplier).toBe(2.5);
      expect(TIER_CONFIG.platinum.xpMultiplier).toBe(4.0);
    });

    it("should have ascending order values", () => {
      expect(TIER_CONFIG.bronze.order).toBe(1);
      expect(TIER_CONFIG.silver.order).toBe(2);
      expect(TIER_CONFIG.gold.order).toBe(3);
      expect(TIER_CONFIG.platinum.order).toBe(4);
    });

    it("should have labels and colors for each tier", () => {
      for (const tier of Object.values(TIER_CONFIG)) {
        expect(tier.label).toBeTruthy();
        expect(tier.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  // ========================================================================
  // CATEGORY_CONFIG
  // ========================================================================

  describe("CATEGORY_CONFIG", () => {
    it("should define three categories", () => {
      expect(Object.keys(CATEGORY_CONFIG).length).toBe(3);
    });

    it("should have labels, descriptions, and icons", () => {
      for (const cat of Object.values(CATEGORY_CONFIG)) {
        expect(cat.label).toBeTruthy();
        expect(cat.description).toBeTruthy();
        expect(cat.icon).toBeTruthy();
      }
    });
  });

  // ========================================================================
  // evaluateCondition
  // ========================================================================

  describe("evaluateCondition", () => {
    const condition = (op: AchievementCondition["operator"], target: number): AchievementCondition => ({
      metric: "test_metric",
      operator: op,
      targetValue: target,
      description: "test",
    });

    it("should evaluate gte correctly", () => {
      expect(service.evaluateCondition(condition("gte", 100), 100)).toBe(true);
      expect(service.evaluateCondition(condition("gte", 100), 101)).toBe(true);
      expect(service.evaluateCondition(condition("gte", 100), 99)).toBe(false);
    });

    it("should evaluate lte correctly", () => {
      expect(service.evaluateCondition(condition("lte", 100), 100)).toBe(true);
      expect(service.evaluateCondition(condition("lte", 100), 99)).toBe(true);
      expect(service.evaluateCondition(condition("lte", 100), 101)).toBe(false);
    });

    it("should evaluate eq correctly", () => {
      expect(service.evaluateCondition(condition("eq", 100), 100)).toBe(true);
      expect(service.evaluateCondition(condition("eq", 100), 99)).toBe(false);
      expect(service.evaluateCondition(condition("eq", 100), 101)).toBe(false);
    });

    it("should evaluate gt correctly", () => {
      expect(service.evaluateCondition(condition("gt", 100), 101)).toBe(true);
      expect(service.evaluateCondition(condition("gt", 100), 100)).toBe(false);
      expect(service.evaluateCondition(condition("gt", 100), 99)).toBe(false);
    });

    it("should evaluate lt correctly", () => {
      expect(service.evaluateCondition(condition("lt", 100), 99)).toBe(true);
      expect(service.evaluateCondition(condition("lt", 100), 100)).toBe(false);
      expect(service.evaluateCondition(condition("lt", 100), 101)).toBe(false);
    });

    it("should return false for unknown operator", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.evaluateCondition(condition("unknown" as any, 100), 100)).toBe(false);
    });

    it("should handle zero values", () => {
      expect(service.evaluateCondition(condition("eq", 0), 0)).toBe(true);
      expect(service.evaluateCondition(condition("gte", 0), 0)).toBe(true);
      expect(service.evaluateCondition(condition("gt", 0), 0)).toBe(false);
    });

    it("should handle negative values", () => {
      expect(service.evaluateCondition(condition("lt", 0), -1)).toBe(true);
      expect(service.evaluateCondition(condition("gte", -10), -5)).toBe(true);
    });
  });

  // ========================================================================
  // checkConditions
  // ========================================================================

  describe("checkConditions", () => {
    it("should check multiple conditions against metrics", () => {
      const conditions: AchievementCondition[] = [
        { metric: "total_savings", operator: "gte", targetValue: 100, description: "Savings check" },
        { metric: "streak_days", operator: "gte", targetValue: 7, description: "Streak check" },
      ];

      const results = service.checkConditions(conditions, { total_savings: 150, streak_days: 5 });

      expect(results).toHaveLength(2);
      expect(results[0].met).toBe(true);
      expect(results[0].currentValue).toBe(150);
      expect(results[0].progressPercent).toBe(100);
      expect(results[1].met).toBe(false);
      expect(results[1].currentValue).toBe(5);
      expect(results[1].progressPercent).toBe(71);
    });

    it("should default missing metrics to 0", () => {
      const conditions: AchievementCondition[] = [
        { metric: "missing_metric", operator: "gte", targetValue: 100, description: "test" },
      ];

      const results = service.checkConditions(conditions, {});
      expect(results[0].currentValue).toBe(0);
      expect(results[0].met).toBe(false);
      expect(results[0].progressPercent).toBe(0);
    });

    it("should cap progress at 100%", () => {
      const conditions: AchievementCondition[] = [
        { metric: "count", operator: "gte", targetValue: 10, description: "test" },
      ];

      const results = service.checkConditions(conditions, { count: 50 });
      expect(results[0].progressPercent).toBe(100);
    });

    it("should handle target value of 0", () => {
      const conditions: AchievementCondition[] = [
        { metric: "debt", operator: "eq", targetValue: 0, description: "test" },
      ];

      const results = service.checkConditions(conditions, { debt: 0 });
      expect(results[0].met).toBe(true);
      expect(results[0].progressPercent).toBe(100);
    });

    it("should return empty array for empty conditions", () => {
      const results = service.checkConditions([], {});
      expect(results).toHaveLength(0);
    });
  });

  // ========================================================================
  // getAchievements
  // ========================================================================

  describe("getAchievements", () => {
    it("should fetch all active achievements", async () => {
      const defs = [makeAchievementDef(), makeAchievementDef({ id: "ach-002", code: "STREAK_7" })];
      const dbRows = defs.map(defToDbRow);

      const mockOrder = jest.fn().mockResolvedValue({ data: dbRows, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getAchievements();
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("SAVINGS_FIRST_100");
    });

    it("should filter by category", async () => {
      const def = makeAchievementDef({ category: "usage" });
      const dbRow = defToDbRow(def);

      // Chain: from().select().eq("is_active").order() -> then .eq("category") is chained
      // .order() must return a chainable object (not a Promise) so .eq("category") can be called on it
      const mockEqCat = jest.fn().mockResolvedValue({ data: [dbRow], error: null });
      const mockOrder = jest.fn().mockReturnValue({ eq: mockEqCat });
      const mockEqActive = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEqActive });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getAchievements("usage");
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("usage");
    });

    it("should throw on database error", async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await expect(service.getAchievements()).rejects.toThrow("Failed to fetch achievements");
    });
  });

  // ========================================================================
  // getAchievementByCode
  // ========================================================================

  describe("getAchievementByCode", () => {
    it("should return achievement definition by code", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);

      const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      const mockEqActive = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEqCode = jest.fn().mockReturnValue({ eq: mockEqActive });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEqCode });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getAchievementByCode("SAVINGS_FIRST_100");
      expect(result).not.toBeNull();
      expect(result!.code).toBe("SAVINGS_FIRST_100");
      expect(result!.xpReward).toBe(50);
    });

    it("should return null if not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getAchievementByCode("NONEXISTENT");
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // getAchievementById
  // ========================================================================

  describe("getAchievementById", () => {
    it("should return achievement definition by id", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);

      const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getAchievementById("ach-001");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("ach-001");
    });

    it("should return null if not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getAchievementById("nonexistent-id");
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // getUserAchievements
  // ========================================================================

  describe("getUserAchievements", () => {
    it("should return user achievements with definitions", async () => {
      const def = makeAchievementDef();
      const dbDefRow = defToDbRow(def);
      const userRow = makeUserAchievementRow();

      // First call: fetch definitions. Second call: fetch user_achievements
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockOrder = jest.fn().mockResolvedValue({ data: [dbDefRow], error: null });
          const mockEqActive = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEqActive });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockEqUser = jest.fn().mockResolvedValue({ data: [userRow], error: null });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEqUser });
          return { select: mockSelect };
        }
        callCount++;
        return { select: jest.fn() };
      });

      const result = await service.getUserAchievements("user-123");
      expect(result).toHaveLength(1);
      expect(result[0].achievement.code).toBe("SAVINGS_FIRST_100");
      expect(result[0].status).toBe("in_progress");
      expect(result[0].currentProgress).toBe(50);
    });

    it("should create default locked entries for untracked achievements", async () => {
      const def = makeAchievementDef();
      const dbDefRow = defToDbRow(def);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockOrder = jest.fn().mockResolvedValue({ data: [dbDefRow], error: null });
          const mockEqActive = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEqActive });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      const result = await service.getUserAchievements("user-123");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("locked");
      expect(result[0].currentProgress).toBe(0);
      expect(result[0].id).toBe("");
    });

    it("should filter by status", async () => {
      const def1 = makeAchievementDef({ id: "ach-001" });
      const def2 = makeAchievementDef({ id: "ach-002", code: "STREAK_7", sortOrder: 2 });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockOrder = jest.fn().mockResolvedValue({
            data: [defToDbRow(def1), defToDbRow(def2)],
            error: null,
          });
          const mockEqActive = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEqActive });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const completedRow = makeUserAchievementRow({ status: "completed", achievement_id: "ach-001" });
          const mockEq = jest.fn().mockResolvedValue({ data: [completedRow], error: null });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      const completed = await service.getUserAchievements("user-123", undefined, "completed");
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe("completed");
    });

    it("should throw on definitions fetch error", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockOrder = jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
          const mockEqActive = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEqActive });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      await expect(service.getUserAchievements("user-123")).rejects.toThrow("Failed to fetch definitions");
    });

    it("should throw on user achievements fetch error", async () => {
      const def = makeAchievementDef();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockOrder = jest.fn().mockResolvedValue({ data: [defToDbRow(def)], error: null });
          const mockEqActive = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEqActive });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockEq = jest.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      await expect(service.getUserAchievements("user-123")).rejects.toThrow("Failed to fetch user achievements");
    });
  });

  // ========================================================================
  // getUserAchievementByCode
  // ========================================================================

  describe("getUserAchievementByCode", () => {
    it("should return null if achievement code not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getUserAchievementByCode("user-123", "NONEXISTENT");
      expect(result).toBeNull();
    });

    it("should return locked default if user has no progress", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);
      const callIndex = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      const result = await service.getUserAchievementByCode("user-123", "SAVINGS_FIRST_100");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("locked");
      expect(result!.currentProgress).toBe(0);
      expect(result!.achievement.code).toBe("SAVINGS_FIRST_100");
    });

    it("should return existing progress if user has tracked data", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);
      const userRow = makeUserAchievementRow({ status: "in_progress", current_progress: 75 });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: userRow, error: null });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      const result = await service.getUserAchievementByCode("user-123", "SAVINGS_FIRST_100");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("in_progress");
      expect(result!.currentProgress).toBe(75);
    });
  });

  // ========================================================================
  // checkAchievements
  // ========================================================================

  describe("checkAchievements", () => {
    it("should check all achievements against provided metrics", async () => {
      const def1 = makeAchievementDef({ id: "ach-001", code: "SAVINGS_FIRST_100" });
      const def2 = makeAchievementDef({
        id: "ach-002",
        code: "STREAK_7",
        conditions: [{ metric: "current_streak", operator: "gte", targetValue: 7, description: "7-day streak" }],
      });

      const mockOrder = jest.fn().mockResolvedValue({
        data: [defToDbRow(def1), defToDbRow(def2)],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const results = await service.checkAchievements("user-123", {
        total_savings: 150,
        current_streak: 3,
      });

      expect(results).toHaveLength(2);
      expect(results[0].met).toBe(true);
      expect(results[0].achievementCode).toBe("SAVINGS_FIRST_100");
      expect(results[1].met).toBe(false);
      expect(results[1].achievementCode).toBe("STREAK_7");
      expect(results[1].progressPercent).toBe(42);
    });
  });

  // ========================================================================
  // updateProgress
  // ========================================================================

  describe("updateProgress", () => {
    it("should create new progress record if none exists", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { select: mockSelect, insert: mockInsert };
        }
        return { select: jest.fn() };
      });

      const result = await service.updateProgress("user-123", "ach-001", 50);
      expect(result.achievementId).toBe("ach-001");
      expect(result.previousProgress).toBe(0);
      expect(result.newProgress).toBe(50);
      expect(result.completed).toBe(false);
    });

    it("should update existing progress record", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);
      const existingRow = makeUserAchievementRow({ status: "in_progress", current_progress: 30 });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: existingRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          const updateEq2 = jest.fn().mockResolvedValue({ data: null, error: null });
          const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
          const mockUpdate = jest.fn().mockReturnValue({ eq: updateEq1 });
          return { select: mockSelect, update: mockUpdate };
        }
        return { select: jest.fn() };
      });

      const result = await service.updateProgress("user-123", "ach-001", 75);
      expect(result.previousProgress).toBe(30);
      expect(result.newProgress).toBe(75);
      expect(result.completed).toBe(false);
    });

    it("should mark as completed when progress reaches target", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);
      const existingRow = makeUserAchievementRow({ status: "in_progress", current_progress: 80 });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: existingRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          const updateEq2 = jest.fn().mockResolvedValue({ data: null, error: null });
          const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
          const mockUpdate = jest.fn().mockReturnValue({ eq: updateEq1 });
          return { select: mockSelect, update: mockUpdate };
        }
        return { select: jest.fn() };
      });

      const result = await service.updateProgress("user-123", "ach-001", 100);
      expect(result.completed).toBe(true);
      expect(result.newProgress).toBe(100);
    });

    it("should not downgrade completed achievements", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);
      const completedRow = makeUserAchievementRow({
        status: "completed",
        current_progress: 100,
        progress_percent: 100,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: completedRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      const result = await service.updateProgress("user-123", "ach-001", 50);
      expect(result.completed).toBe(true);
      expect(result.previousProgress).toBe(100);
      expect(result.newProgress).toBe(100);
    });

    it("should throw when achievement not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await expect(service.updateProgress("user-123", "nonexistent", 50)).rejects.toThrow(
        "Achievement not found",
      );
    });
  });

  // ========================================================================
  // updateProgressByCode
  // ========================================================================

  describe("updateProgressByCode", () => {
    it("should throw if achievement code not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await expect(service.updateProgressByCode("user-123", "NONEXISTENT", 50)).rejects.toThrow(
        "Achievement not found: NONEXISTENT",
      );
    });
  });

  // ========================================================================
  // awardAchievement
  // ========================================================================

  describe("awardAchievement", () => {
    it("should return error if achievement not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.awardAchievement("user-123", "NONEXISTENT");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Achievement not found");
    });

    it("should return already earned error for completed achievements", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);

      const callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({
            data: { status: "completed" },
            error: null,
          });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      const result = await service.awardAchievement("user-123", "SAVINGS_FIRST_100");
      expect(result.success).toBe(false);
      expect(result.alreadyEarned).toBe(true);
    });

    it("should award achievement with correct XP multiplier for bronze", async () => {
      const def = makeAchievementDef({ tier: "bronze", xpReward: 50 });
      const dbRow = defToDbRow(def);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { select: mockSelect, insert: mockInsert };
        }
        if (table === "xp_transactions") {
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { insert: mockInsert };
        }
        return { select: jest.fn() };
      });

      const result = await service.awardAchievement("user-123", "SAVINGS_FIRST_100");
      expect(result.success).toBe(true);
      expect(result.xpEarned).toBe(50); // 50 * 1.0 (bronze)
    });

    it("should apply silver tier multiplier", async () => {
      const def = makeAchievementDef({ tier: "silver", xpReward: 200 });
      const dbRow = defToDbRow(def);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { select: mockSelect, insert: mockInsert };
        }
        if (table === "xp_transactions") {
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { insert: mockInsert };
        }
        return { select: jest.fn() };
      });

      const result = await service.awardAchievement("user-123", "SAVINGS_FIRST_100");
      expect(result.success).toBe(true);
      expect(result.xpEarned).toBe(300); // 200 * 1.5 (silver)
    });

    it("should apply gold tier multiplier", async () => {
      const def = makeAchievementDef({ tier: "gold", xpReward: 500 });
      const dbRow = defToDbRow(def);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { select: mockSelect, insert: mockInsert };
        }
        if (table === "xp_transactions") {
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { insert: mockInsert };
        }
        return { select: jest.fn() };
      });

      const result = await service.awardAchievement("user-123", "SAVINGS_FIRST_100");
      expect(result.success).toBe(true);
      expect(result.xpEarned).toBe(1250); // 500 * 2.5 (gold)
    });

    it("should apply platinum tier multiplier", async () => {
      const def = makeAchievementDef({ tier: "platinum", xpReward: 2000 });
      const dbRow = defToDbRow(def);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { select: mockSelect, insert: mockInsert };
        }
        if (table === "xp_transactions") {
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { insert: mockInsert };
        }
        return { select: jest.fn() };
      });

      const result = await service.awardAchievement("user-123", "SAVINGS_FIRST_100");
      expect(result.success).toBe(true);
      expect(result.xpEarned).toBe(8000); // 2000 * 4.0 (platinum)
    });

    it("should update existing in-progress record when awarding", async () => {
      const def = makeAchievementDef();
      const dbRow = defToDbRow(def);
      const inProgressRow = { status: "in_progress", current_progress: 50 };

      const updateEq2 = jest.fn().mockResolvedValue({ data: null, error: null });
      const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: updateEq1 });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockSingle = jest.fn().mockResolvedValue({ data: dbRow, error: null });
          const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockSingle = jest.fn().mockResolvedValue({ data: inProgressRow, error: null });
          const mockEq3 = jest.fn().mockReturnValue({ single: mockSingle });
          const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
          return { select: mockSelect, update: mockUpdate };
        }
        if (table === "xp_transactions") {
          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
          return { insert: mockInsert };
        }
        return { select: jest.fn() };
      });

      const result = await service.awardAchievement("user-123", "SAVINGS_FIRST_100");
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // createNotification
  // ========================================================================

  describe("createNotification", () => {
    it("should create a notification and mark it sent", async () => {
      const def = makeAchievementDef();
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      const updateEq2 = jest.fn().mockResolvedValue({ data: null, error: null });
      const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: updateEq1 });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "notifications") {
          return { insert: insertMock };
        }
        if (table === "user_achievements") {
          return { update: mockUpdate };
        }
        return {};
      });

      const result = await service.createNotification("user-123", def, 50);
      expect(result.userId).toBe("user-123");
      expect(result.achievementName).toBe("First $100 Saved");
      expect(result.xpEarned).toBe(50);
      expect(result.message).toContain("First $100 Saved");
      expect(result.message).toContain("+50 XP");
      expect(insertMock).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // getPendingNotifications
  // ========================================================================

  describe("getPendingNotifications", () => {
    it("should fetch completed achievements with unsent notifications", async () => {
      const def = makeAchievementDef();
      const row = {
        ...makeUserAchievementRow({ status: "completed" }),
        achievement_definitions: defToDbRow(def),
      };

      const mockEq3 = jest.fn().mockResolvedValue({ data: [row], error: null });
      const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getPendingNotifications("user-123");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("completed");
      expect(result[0].achievement.code).toBe("SAVINGS_FIRST_100");
    });

    it("should throw on fetch error", async () => {
      const mockEq3 = jest.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } });
      const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await expect(service.getPendingNotifications("user-123")).rejects.toThrow(
        "Failed to fetch pending notifications",
      );
    });

    it("should return empty array when no pending notifications", async () => {
      const mockEq3 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await service.getPendingNotifications("user-123");
      expect(result).toHaveLength(0);
    });
  });

  // ========================================================================
  // getStats
  // ========================================================================

  describe("getStats", () => {
    it("should calculate comprehensive stats", async () => {
      const defs = [
        makeAchievementDef({ id: "ach-001", code: "SAVINGS_100", category: "financial", tier: "bronze", xpReward: 50 }),
        makeAchievementDef({ id: "ach-002", code: "STREAK_7", category: "usage", tier: "bronze", xpReward: 100, conditions: [{ metric: "streak", operator: "gte", targetValue: 7, description: "test" }], sortOrder: 2 }),
        makeAchievementDef({ id: "ach-003", code: "ARTICLE_1", category: "learning", tier: "silver", xpReward: 200, conditions: [{ metric: "articles", operator: "gte", targetValue: 1, description: "test" }], sortOrder: 3 }),
      ];

      const completedRow = makeUserAchievementRow({
        achievement_id: "ach-001",
        status: "completed",
        current_progress: 100,
        completed_at: "2026-02-01T00:00:00.000Z",
      });
      const inProgressRow = makeUserAchievementRow({
        id: "ua-002",
        achievement_id: "ach-002",
        status: "in_progress",
        current_progress: 3,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "achievement_definitions") {
          const mockOrder = jest.fn().mockResolvedValue({
            data: defs.map(defToDbRow),
            error: null,
          });
          const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (table === "user_achievements") {
          const mockEq = jest.fn().mockResolvedValue({
            data: [completedRow, inProgressRow],
            error: null,
          });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        return { select: jest.fn() };
      });

      const stats = await service.getStats("user-123");
      expect(stats.totalAchievements).toBe(3);
      expect(stats.completedCount).toBe(1);
      expect(stats.inProgressCount).toBe(1);
      expect(stats.lockedCount).toBe(1);
      expect(stats.completionPercent).toBe(33);
      expect(stats.totalXpEarned).toBe(50); // 50 * 1.0 (bronze)
      expect(stats.byCategory.financial.completed).toBe(1);
      expect(stats.byCategory.usage.inProgress).toBe(1);
      expect(stats.byCategory.learning.total).toBe(1);
      expect(stats.byTier.bronze.total).toBe(2);
      expect(stats.byTier.silver.total).toBe(1);
      expect(stats.recentCompletions).toHaveLength(1);
    });
  });

  // ========================================================================
  // seedAchievements
  // ========================================================================

  describe("seedAchievements", () => {
    it("should seed achievements that do not already exist", async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      const singleCallIndex = 0;

      mockSupabase.from.mockImplementation(() => {
        const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
        const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
        return { select: mockSelect, insert: insertMock };
      });

      const count = await service.seedAchievements();
      expect(count).toBe(32);
      expect(insertMock).toHaveBeenCalledTimes(32);
    });

    it("should skip already existing achievements", async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from.mockImplementation(() => {
        const mockSingle = jest.fn().mockResolvedValue({ data: { id: "existing-id" }, error: null });
        const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq2 });
        return { select: mockSelect, insert: insertMock };
      });

      const count = await service.seedAchievements();
      expect(count).toBe(0);
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Static helpers
  // ========================================================================

  describe("Static helpers", () => {
    it("getBuiltInAchievements should return BUILT_IN_ACHIEVEMENTS", () => {
      expect(service.getBuiltInAchievements()).toBe(BUILT_IN_ACHIEVEMENTS);
    });

    it("getTierConfig should return TIER_CONFIG", () => {
      expect(service.getTierConfig()).toBe(TIER_CONFIG);
    });

    it("getCategoryConfig should return CATEGORY_CONFIG", () => {
      expect(service.getCategoryConfig()).toBe(CATEGORY_CONFIG);
    });

    it("getTierXpMultiplier should return correct values", () => {
      expect(service.getTierXpMultiplier("bronze")).toBe(1.0);
      expect(service.getTierXpMultiplier("silver")).toBe(1.5);
      expect(service.getTierXpMultiplier("gold")).toBe(2.5);
      expect(service.getTierXpMultiplier("platinum")).toBe(4.0);
    });

    it("getCategoryLabel should return correct labels", () => {
      expect(service.getCategoryLabel("financial")).toBe("Financial");
      expect(service.getCategoryLabel("usage")).toBe("Usage");
      expect(service.getCategoryLabel("learning")).toBe("Learning");
    });
  });

  // ========================================================================
  // getAchievementService singleton
  // ========================================================================

  describe("getAchievementService", () => {
    it("should throw if Supabase credentials not configured", () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Use isolateModules to avoid corrupting the module registry for subsequent tests
      jest.isolateModules(() => {
        const { getAchievementService: isolatedGetService } = require("../achievement-service");
        expect(() => isolatedGetService()).toThrow("Supabase credentials not configured");
      });

      // Restore
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
      if (originalAnon) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    });
  });

  // ========================================================================
  // batchUpdateProgress
  // ========================================================================

  describe("batchUpdateProgress", () => {
    it("should update progress for all matching achievements", async () => {
      const def1 = makeAchievementDef({ id: "ach-001", code: "SAVINGS_100" });
      const def2 = makeAchievementDef({
        id: "ach-002",
        code: "STREAK_7",
        conditions: [{ metric: "current_streak", operator: "gte", targetValue: 7, description: "test" }],
        sortOrder: 2,
      });

      const mockOrder = jest.fn().mockResolvedValue({
        data: [defToDbRow(def1), defToDbRow(def2)],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelectDefs = jest.fn().mockReturnValue({ eq: mockEq });

      // For updateProgress calls
      const mockSingle = jest.fn()
        .mockResolvedValueOnce({ data: defToDbRow(def1), error: null }) // getAchievementById for ach-001
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // existing check for ach-001
        .mockResolvedValueOnce({ data: defToDbRow(def2), error: null }) // getAchievementById for ach-002
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }); // existing check for ach-002

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // First call: getAchievements
          return { select: mockSelectDefs };
        }
        // Subsequent calls: getAchievementById, user_achievements checks
        const mockEqChain = jest.fn().mockReturnValue({ single: mockSingle, eq: jest.fn().mockReturnValue({ single: mockSingle }) });
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEqChain });
        const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
        return { select: mockSelect, insert: mockInsert };
      });

      const updates = await service.batchUpdateProgress("user-123", {
        total_savings: 150,
        current_streak: 5,
      });

      expect(updates).toHaveLength(2);
    });

    it("should skip achievements without matching metrics", async () => {
      const def = makeAchievementDef({
        conditions: [{ metric: "total_savings", operator: "gte", targetValue: 100, description: "test" }],
      });

      const mockOrder = jest.fn().mockResolvedValue({
        data: [defToDbRow(def)],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder, eq: jest.fn().mockReturnValue({ order: mockOrder }) });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      // Provide metrics that don't match any achievement condition metric
      const updates = await service.batchUpdateProgress("user-123", {
        unrelated_metric: 999,
      });

      expect(updates).toHaveLength(0);
    });
  });
});
