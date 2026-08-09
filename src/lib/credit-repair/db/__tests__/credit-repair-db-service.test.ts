/**
 * @jest-environment node
 */

/**
 * Tests for CreditRepairDbService
 *
 * Covers: credit repair scores, actions, and progress operations.
 * Requires mocking: @/lib/supabase/client
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/service-role", () => {
  const _client = { from: jest.fn() };
  return { getServiceRoleClient: () => _client };
});

function sb() {
  return require("@/lib/supabase/service-role").getServiceRoleClient();
}

function chainMock(result: { data: unknown; error: unknown; count?: number }) {
  const obj: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "is",
    "in",
    "not",
    "order",
    "limit",
    "range",
    "gte",
    "lte",
    "ilike",
    "single",
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) =>
    Promise.resolve({ ...result, count: result.count ?? 0 }).then(
      resolve,
      reject,
    );
  return obj;
}

function mockFrom(result: { data: unknown; error: unknown; count?: number }) {
  const mock = chainMock(result);
  sb().from.mockReturnValue(mock);
  return mock;
}

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { creditRepairDbService } from "../credit-repair-db-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const sampleScoreRow = {
  id: "score-1",
  user_id: "u-1",
  score: 72,
  factors: { payment_history: 35, credit_utilization: 30 },
  opportunities: [
    { type: "pay_down_balance", impact: 15, timeline: "1-2 months" },
    { type: "dispute_error", impact: 10, timeline: null },
  ],
  estimated_impact: 25,
  timeline: "3-6 months",
  created_at: now,
  updated_at: now,
};

const sampleActionRow = {
  id: "act-1",
  user_id: "u-1",
  action_type: "dispute_inaccuracy" as const,
  action_data: { bureau: "experian", item: "Late payment" },
  status: "pending" as const,
  impact: 15,
  success_rate: 70,
  timeline: "30 days",
  started_at: null,
  completed_at: null,
  created_at: now,
  updated_at: now,
};

const sampleProgressRow = {
  id: "prog-1",
  user_id: "u-1",
  milestone_type: "score_increase",
  milestone_data: { description: "Score increased by 10 points" },
  achieved_at: now,
  score_before: 650,
  score_after: 660,
  impact: 10,
  created_at: now,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreditRepairDbService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // SCORE OPERATIONS
  // ==========================================================================

  describe("getCreditRepairScore", () => {
    it("should return the latest score when found", async () => {
      mockFrom({ data: sampleScoreRow, error: null });

      const result = await creditRepairDbService.getCreditRepairScore("u-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("score-1");
      expect(result!.userId).toBe("u-1");
      expect(result!.score).toBe(72);
      expect(result!.factors).toEqual({
        payment_history: 35,
        credit_utilization: 30,
      });
      expect(result!.opportunities).toHaveLength(2);
      expect(result!.opportunities[0].type).toBe("pay_down_balance");
      expect(result!.opportunities[1].timeline).toBeUndefined();
      expect(result!.estimatedImpact).toBe(25);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(sb().from).toHaveBeenCalledWith("credit_repair_scores");
    });

    it("should return null when no score found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await creditRepairDbService.getCreditRepairScore("u-1");
      expect(result).toBeNull();
    });

    it("should return null when data is null without error", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditRepairDbService.getCreditRepairScore("u-1");
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "Connection lost" } });

      await expect(
        creditRepairDbService.getCreditRepairScore("u-1"),
      ).rejects.toThrow("Failed to get credit repair score");
    });
  });

  describe("saveCreditRepairScore", () => {
    it("should save a score and return mapped result", async () => {
      mockFrom({ data: sampleScoreRow, error: null });

      const result = await creditRepairDbService.saveCreditRepairScore({
        userId: "u-1",
        score: 72,
        factors: { payment_history: 35, credit_utilization: 30 },
        opportunities: [{ type: "pay_down_balance", impact: 15 }],
        estimatedImpact: 25,
        timeline: "3-6 months",
      });

      expect(result.id).toBe("score-1");
      expect(result.score).toBe(72);
      expect(sb().from).toHaveBeenCalledWith("credit_repair_scores");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        creditRepairDbService.saveCreditRepairScore({
          userId: "u-1",
          score: 72,
          factors: {},
          opportunities: [],
        }),
      ).rejects.toThrow("Failed to save credit repair score");
    });
  });

  describe("getCreditRepairHistory", () => {
    it("should return score history array", async () => {
      mockFrom({
        data: [sampleScoreRow, { ...sampleScoreRow, id: "score-2", score: 65 }],
        error: null,
      });

      const result = await creditRepairDbService.getCreditRepairHistory("u-1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("score-1");
      expect(result[1].score).toBe(65);
    });

    it("should use default limit of 30", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditRepairDbService.getCreditRepairHistory("u-1");
      expect(mock.limit).toHaveBeenCalledWith(30);
    });

    it("should use custom limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditRepairDbService.getCreditRepairHistory("u-1", 10);
      expect(mock.limit).toHaveBeenCalledWith(10);
    });

    it("should return empty array when no data", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditRepairDbService.getCreditRepairHistory("u-1");
      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditRepairDbService.getCreditRepairHistory("u-1"),
      ).rejects.toThrow("Failed to get credit repair history");
    });
  });

  describe("cleanupOldScores", () => {
    it("should delete old scores and return deleted count", async () => {
      // First call: select IDs to keep
      const selectMock = chainMock({
        data: [{ id: "s-1" }, { id: "s-2" }],
        error: null,
      });
      // Second call: delete old records
      const deleteMock = chainMock({
        data: null,
        error: null,
        count: 5,
      });

      sb().from
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(deleteMock);

      const result = await creditRepairDbService.cleanupOldScores("u-1", 2);
      expect(result).toBe(5);
      expect(sb().from).toHaveBeenCalledTimes(2);
    });

    it("should return 0 when no records exist", async () => {
      const selectMock = chainMock({ data: [], error: null });
      sb().from.mockReturnValueOnce(selectMock);

      const result = await creditRepairDbService.cleanupOldScores("u-1");
      expect(result).toBe(0);
    });

    it("should return 0 when keep records is null", async () => {
      const selectMock = chainMock({ data: null, error: null });
      sb().from.mockReturnValueOnce(selectMock);

      const result = await creditRepairDbService.cleanupOldScores("u-1");
      expect(result).toBe(0);
    });

    it("should use default keepLast of 100", async () => {
      const selectMock = chainMock({ data: [], error: null });
      sb().from.mockReturnValueOnce(selectMock);

      await creditRepairDbService.cleanupOldScores("u-1");
      expect(selectMock.limit).toHaveBeenCalledWith(100);
    });

    it("should throw on select error", async () => {
      const selectMock = chainMock({
        data: null,
        error: { message: "Select failed" },
      });
      sb().from.mockReturnValueOnce(selectMock);

      await expect(
        creditRepairDbService.cleanupOldScores("u-1"),
      ).rejects.toThrow("Failed to cleanup old scores");
    });

    it("should throw on delete error", async () => {
      const selectMock = chainMock({
        data: [{ id: "s-1" }],
        error: null,
      });
      const deleteMock = chainMock({
        data: null,
        error: { message: "Delete failed" },
      });

      sb().from
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(deleteMock);

      await expect(
        creditRepairDbService.cleanupOldScores("u-1", 1),
      ).rejects.toThrow("Failed to cleanup old scores");
    });

    it("should return 0 when count is null after delete", async () => {
      const selectMock = chainMock({
        data: [{ id: "s-1" }],
        error: null,
      });
      const deleteMock = chainMock({
        data: null,
        error: null,
        count: 0,
      });

      sb().from
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(deleteMock);

      const result = await creditRepairDbService.cleanupOldScores("u-1", 1);
      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // ACTION OPERATIONS
  // ==========================================================================

  describe("getActions", () => {
    it("should return actions array for user", async () => {
      mockFrom({ data: [sampleActionRow], error: null });

      const result = await creditRepairDbService.getActions("u-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("act-1");
      expect(result[0].actionType).toBe("dispute_inaccuracy");
      expect(result[0].status).toBe("pending");
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it("should apply status filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditRepairDbService.getActions("u-1", {
        status: "completed",
      });
      expect(mock.eq).toHaveBeenCalledWith("status", "completed");
    });

    it("should apply actionType filter when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditRepairDbService.getActions("u-1", {
        actionType: "goodwill_letter",
      });
      expect(mock.eq).toHaveBeenCalledWith("action_type", "goodwill_letter");
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditRepairDbService.getActions("u-1", { limit: 5 });
      expect(mock.limit).toHaveBeenCalledWith(5);
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditRepairDbService.getActions("u-1");
      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditRepairDbService.getActions("u-1"),
      ).rejects.toThrow("Failed to get actions");
    });
  });

  describe("getAction", () => {
    it("should return mapped action when found", async () => {
      mockFrom({ data: sampleActionRow, error: null });

      const result = await creditRepairDbService.getAction("act-1", "u-1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("act-1");
      expect(result!.impact).toBe(15);
      expect(result!.successRate).toBe(70);
    });

    it("should return null when not found (PGRST116)", async () => {
      mockFrom({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await creditRepairDbService.getAction("nope", "u-1");
      expect(result).toBeNull();
    });

    it("should throw on general database error", async () => {
      mockFrom({ data: null, error: { message: "DB error" } });

      await expect(
        creditRepairDbService.getAction("act-1", "u-1"),
      ).rejects.toThrow("Failed to get action");
    });

    it("should map optional date fields when present", async () => {
      const rowWithDates = {
        ...sampleActionRow,
        started_at: "2026-01-15T10:00:00.000Z",
        completed_at: "2026-02-15T10:00:00.000Z",
      };
      mockFrom({ data: rowWithDates, error: null });

      const result = await creditRepairDbService.getAction("act-1", "u-1");
      expect(result!.startedAt).toBeInstanceOf(Date);
      expect(result!.completedAt).toBeInstanceOf(Date);
    });

    it("should map optional fields as undefined when null", async () => {
      const rowNulls = {
        ...sampleActionRow,
        impact: null,
        success_rate: null,
        timeline: null,
        action_data: null,
      };
      mockFrom({ data: rowNulls, error: null });

      const result = await creditRepairDbService.getAction("act-1", "u-1");
      expect(result!.impact).toBeUndefined();
      expect(result!.successRate).toBeUndefined();
      expect(result!.timeline).toBeUndefined();
      expect(result!.actionData).toEqual({});
    });
  });

  describe("createAction", () => {
    it("should create an action and return mapped result", async () => {
      mockFrom({ data: sampleActionRow, error: null });

      const result = await creditRepairDbService.createAction({
        userId: "u-1",
        actionType: "dispute_inaccuracy",
        actionData: { bureau: "experian" },
      });

      expect(result.id).toBe("act-1");
      expect(result.actionType).toBe("dispute_inaccuracy");
      expect(sb().from).toHaveBeenCalledWith("credit_repair_actions");
    });

    it("should default status to pending when not provided", async () => {
      const mock = mockFrom({ data: sampleActionRow, error: null });

      await creditRepairDbService.createAction({
        userId: "u-1",
        actionType: "dispute_inaccuracy",
        actionData: {},
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });

    it("should use provided status when specified", async () => {
      const mock = mockFrom({ data: sampleActionRow, error: null });

      await creditRepairDbService.createAction({
        userId: "u-1",
        actionType: "dispute_inaccuracy",
        actionData: {},
        status: "in_progress",
      });

      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "in_progress" }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        creditRepairDbService.createAction({
          userId: "u-1",
          actionType: "dispute_inaccuracy",
          actionData: {},
        }),
      ).rejects.toThrow("Failed to create action");
    });
  });

  describe("updateAction", () => {
    it("should update an action and return mapped result", async () => {
      const updatedRow = { ...sampleActionRow, status: "completed" as const };
      mockFrom({ data: updatedRow, error: null });

      const result = await creditRepairDbService.updateAction(
        "act-1",
        "u-1",
        { status: "completed" },
      );

      expect(result.status).toBe("completed");
    });

    it("should convert date fields to ISO strings", async () => {
      const mock = mockFrom({ data: sampleActionRow, error: null });
      const startDate = new Date("2026-01-15T10:00:00Z");
      const endDate = new Date("2026-02-15T10:00:00Z");

      await creditRepairDbService.updateAction("act-1", "u-1", {
        startedAt: startDate,
        completedAt: endDate,
      });

      expect(mock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          started_at: startDate.toISOString(),
          completed_at: endDate.toISOString(),
        }),
      );
    });

    it("should map all update fields correctly", async () => {
      const mock = mockFrom({ data: sampleActionRow, error: null });

      await creditRepairDbService.updateAction("act-1", "u-1", {
        status: "in_progress",
        actionData: { key: "value" },
        impact: 20,
      });

      expect(mock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "in_progress",
          action_data: { key: "value" },
          impact: 20,
        }),
      );
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Update failed" } });

      await expect(
        creditRepairDbService.updateAction("act-1", "u-1", {
          status: "completed",
        }),
      ).rejects.toThrow("Failed to update action");
    });
  });

  describe("deleteAction", () => {
    it("should delete an action and return true", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditRepairDbService.deleteAction("act-1", "u-1");
      expect(result).toBe(true);
      expect(sb().from).toHaveBeenCalledWith("credit_repair_actions");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Delete failed" } });

      await expect(
        creditRepairDbService.deleteAction("act-1", "u-1"),
      ).rejects.toThrow("Failed to delete action");
    });
  });

  // ==========================================================================
  // PROGRESS OPERATIONS
  // ==========================================================================

  describe("getProgress", () => {
    it("should return progress milestones array", async () => {
      mockFrom({ data: [sampleProgressRow], error: null });

      const result = await creditRepairDbService.getProgress("u-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("prog-1");
      expect(result[0].milestoneType).toBe("score_increase");
      expect(result[0].achievedAt).toBeInstanceOf(Date);
      expect(result[0].scoreBefore).toBe(650);
      expect(result[0].scoreAfter).toBe(660);
    });

    it("should apply milestoneType filter", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditRepairDbService.getProgress("u-1", {
        milestoneType: "dispute_resolved",
      });
      expect(mock.eq).toHaveBeenCalledWith(
        "milestone_type",
        "dispute_resolved",
      );
    });

    it("should apply startDate filter", async () => {
      const mock = mockFrom({ data: [], error: null });
      const start = new Date("2026-01-01T00:00:00Z");

      await creditRepairDbService.getProgress("u-1", { startDate: start });
      expect(mock.gte).toHaveBeenCalledWith(
        "achieved_at",
        start.toISOString(),
      );
    });

    it("should apply endDate filter", async () => {
      const mock = mockFrom({ data: [], error: null });
      const end = new Date("2026-02-28T23:59:59Z");

      await creditRepairDbService.getProgress("u-1", { endDate: end });
      expect(mock.lte).toHaveBeenCalledWith(
        "achieved_at",
        end.toISOString(),
      );
    });

    it("should apply limit when provided", async () => {
      const mock = mockFrom({ data: [], error: null });

      await creditRepairDbService.getProgress("u-1", { limit: 10 });
      expect(mock.limit).toHaveBeenCalledWith(10);
    });

    it("should return empty array when data is null", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditRepairDbService.getProgress("u-1");
      expect(result).toEqual([]);
    });

    it("should map null optional fields as undefined", async () => {
      const nullRow = {
        ...sampleProgressRow,
        score_before: null,
        score_after: null,
        impact: null,
        milestone_data: null,
      };
      mockFrom({ data: [nullRow], error: null });

      const result = await creditRepairDbService.getProgress("u-1");
      expect(result[0].scoreBefore).toBeUndefined();
      expect(result[0].scoreAfter).toBeUndefined();
      expect(result[0].impact).toBeUndefined();
      expect(result[0].milestoneData).toEqual({});
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Query failed" } });

      await expect(
        creditRepairDbService.getProgress("u-1"),
      ).rejects.toThrow("Failed to get progress");
    });
  });

  describe("createProgress", () => {
    it("should create a progress milestone and return mapped result", async () => {
      mockFrom({ data: sampleProgressRow, error: null });

      const result = await creditRepairDbService.createProgress({
        userId: "u-1",
        milestoneType: "score_increase",
        milestoneData: { description: "Score increased by 10 points" },
        scoreBefore: 650,
        scoreAfter: 660,
        impact: 10,
      });

      expect(result.id).toBe("prog-1");
      expect(result.milestoneType).toBe("score_increase");
      expect(sb().from).toHaveBeenCalledWith("credit_repair_progress");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Insert failed" } });

      await expect(
        creditRepairDbService.createProgress({
          userId: "u-1",
          milestoneType: "score_increase",
          milestoneData: {},
        }),
      ).rejects.toThrow("Failed to create progress");
    });
  });

  describe("deleteProgress", () => {
    it("should delete a progress milestone and return true", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditRepairDbService.deleteProgress(
        "prog-1",
        "u-1",
      );
      expect(result).toBe(true);
      expect(sb().from).toHaveBeenCalledWith("credit_repair_progress");
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Delete failed" } });

      await expect(
        creditRepairDbService.deleteProgress("prog-1", "u-1"),
      ).rejects.toThrow("Failed to delete progress");
    });
  });

  describe("getProgressStats", () => {
    it("should compute stats from progress data", async () => {
      const milestones = [
        {
          ...sampleProgressRow,
          id: "p-1",
          milestone_type: "score_increase",
          score_before: 650,
          score_after: 680,
          impact: 30,
        },
        {
          ...sampleProgressRow,
          id: "p-2",
          milestone_type: "dispute_resolved",
          score_before: 640,
          score_after: 650,
          impact: 10,
        },
        {
          ...sampleProgressRow,
          id: "p-3",
          milestone_type: "score_increase",
          score_before: 630,
          score_after: 640,
          impact: 10,
        },
      ];
      mockFrom({ data: milestones, error: null });

      const result = await creditRepairDbService.getProgressStats("u-1");

      expect(result.totalMilestones).toBe(3);
      expect(result.totalImpact).toBe(50);
      expect(result.averageImpact).toBeCloseTo(16.67, 1);
      // scoreImprovement = milestones[0].scoreAfter - milestones[last].scoreBefore
      // = 680 - 630 = 50
      expect(result.scoreImprovement).toBe(50);
      expect(result.milestonesByType).toEqual({
        score_increase: 2,
        dispute_resolved: 1,
      });
    });

    it("should return zeros when no milestones exist", async () => {
      mockFrom({ data: [], error: null });

      const result = await creditRepairDbService.getProgressStats("u-1");
      expect(result.totalMilestones).toBe(0);
      expect(result.totalImpact).toBe(0);
      expect(result.averageImpact).toBe(0);
      expect(result.scoreImprovement).toBe(0);
      expect(result.milestonesByType).toEqual({});
    });

    it("should apply date filters when provided", async () => {
      const mock = mockFrom({ data: [], error: null });
      const start = new Date("2026-01-01");
      const end = new Date("2026-02-28");

      await creditRepairDbService.getProgressStats("u-1", start, end);
      expect(mock.gte).toHaveBeenCalledWith(
        "achieved_at",
        start.toISOString(),
      );
      expect(mock.lte).toHaveBeenCalledWith(
        "achieved_at",
        end.toISOString(),
      );
    });

    it("should handle null data gracefully", async () => {
      mockFrom({ data: null, error: null });

      const result = await creditRepairDbService.getProgressStats("u-1");
      expect(result.totalMilestones).toBe(0);
    });

    it("should handle milestones with null impact values", async () => {
      const milestones = [
        {
          ...sampleProgressRow,
          impact: null,
          score_before: null,
          score_after: null,
        },
      ];
      mockFrom({ data: milestones, error: null });

      const result = await creditRepairDbService.getProgressStats("u-1");
      expect(result.totalImpact).toBe(0);
      expect(result.scoreImprovement).toBe(0);
    });

    it("should throw on database error", async () => {
      mockFrom({ data: null, error: { message: "Stats failed" } });

      await expect(
        creditRepairDbService.getProgressStats("u-1"),
      ).rejects.toThrow("Failed to get progress stats");
    });
  });
});
