/**
 * @jest-environment node
 */

/**
 * Tests for DisputeService
 *
 * Requires mocking: @/lib/supabase/client + @/lib/ai-orchestrator
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

jest.mock("@/lib/ai-orchestrator", () => ({
  getAIOrchestrator: jest.fn(() => ({
    generateDispute: jest.fn(),
  })),
}));

function sb() {
  return require("@/lib/supabase/client").getSupabase();
}

function orchestrator() {
  return require("@/lib/ai-orchestrator").getAIOrchestrator();
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
  ];
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  obj.single = jest.fn().mockResolvedValue(result);
  obj.then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) => Promise.resolve({ ...result, count: result.count ?? 0 }).then(resolve, reject);
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

import { disputeService } from "../dispute-service";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DisputeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // scanForInaccuracies
  // --------------------------------------------------------------------------

  describe("scanForInaccuracies", () => {
    it("should return empty array for empty credit report", async () => {
      const result = await disputeService.scanForInaccuracies({});
      expect(result).toEqual([]);
    });

    it("should return empty array when no inaccuracies found", async () => {
      const result = await disputeService.scanForInaccuracies({
        accounts: [{ current_balance: 100, payment_status: "current" }],
        inquiries: [],
        public_records: [],
      });
      expect(result).toEqual([]);
    });

    it("should detect negative balance as inaccuracy", async () => {
      const result = await disputeService.scanForInaccuracies({
        accounts: [{ current_balance: -500 }],
      });
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("account");
      expect(result[0].issues).toContain("negative_balance");
    });

    it("should detect incorrect late payment status", async () => {
      const result = await disputeService.scanForInaccuracies({
        accounts: [{ payment_status: "late", days_late: 0 }],
      });
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("account");
      expect(result[0].issues).toContain("incorrect_late_payment");
    });

    it("should detect outdated public records (>7 years old)", async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8);
      const result = await disputeService.scanForInaccuracies({
        public_records: [{ date_filed: oldDate.toISOString().split("T")[0] }],
      });
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("public_record");
      expect(result[0].issues).toContain("outdated");
    });

    it("should not flag public records within 7 years", async () => {
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 3);
      const result = await disputeService.scanForInaccuracies({
        public_records: [{ date_filed: recentDate.toISOString().split("T")[0] }],
      });
      expect(result.length).toBe(0);
    });

    it("should handle multiple inaccuracies across types", async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8);
      const result = await disputeService.scanForInaccuracies({
        accounts: [
          { current_balance: -100 },
          { payment_status: "late", days_late: 0 },
        ],
        public_records: [{ date_filed: oldDate.toISOString().split("T")[0] }],
      });
      expect(result.length).toBe(3);
    });

    it("should handle null/undefined arrays gracefully", async () => {
      const result = await disputeService.scanForInaccuracies({
        accounts: undefined,
        inquiries: undefined,
        public_records: undefined,
      });
      expect(result).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // selectStrategy
  // --------------------------------------------------------------------------

  describe("selectStrategy", () => {
    const dummyItem = { type: "account" as const, issues: ["test"] };

    it("should return identity_theft strategy for not_mine inaccuracy", async () => {
      const result = await disputeService.selectStrategy(dummyItem, "not_mine");
      expect(result.strategy).toBe("identity_theft");
      expect(result.successRate).toBe(85);
    });

    it("should return basic_dispute strategy for incorrect_balance", async () => {
      const result = await disputeService.selectStrategy(
        dummyItem,
        "incorrect_balance",
      );
      expect(result.strategy).toBe("basic_dispute");
      expect(result.successRate).toBe(70);
    });

    it("should return method_of_verification for incorrect_payment_history", async () => {
      const result = await disputeService.selectStrategy(
        dummyItem,
        "incorrect_payment_history",
      );
      expect(result.strategy).toBe("method_of_verification");
      expect(result.successRate).toBe(65);
    });

    it("should return statute_of_limitations for outdated", async () => {
      const result = await disputeService.selectStrategy(dummyItem, "outdated");
      expect(result.strategy).toBe("statute_of_limitations");
      expect(result.successRate).toBe(95);
    });

    it("should return identity_theft strategy for identity_theft", async () => {
      const result = await disputeService.selectStrategy(
        dummyItem,
        "identity_theft",
      );
      expect(result.strategy).toBe("identity_theft");
      expect(result.successRate).toBe(90);
    });

    it("should return basic_dispute for duplicate", async () => {
      const result = await disputeService.selectStrategy(dummyItem, "duplicate");
      expect(result.strategy).toBe("basic_dispute");
      expect(result.successRate).toBe(90);
    });

    it("should return mixed_file strategy for mixed_file", async () => {
      const result = await disputeService.selectStrategy(dummyItem, "mixed_file");
      expect(result.strategy).toBe("mixed_file");
      expect(result.successRate).toBe(85);
    });

    it("should return basic_dispute for other inaccuracy", async () => {
      const result = await disputeService.selectStrategy(dummyItem, "other");
      expect(result.strategy).toBe("basic_dispute");
      expect(result.successRate).toBe(60);
    });

    it("should include legal basis in every strategy", async () => {
      const types = [
        "not_mine",
        "incorrect_balance",
        "incorrect_payment_history",
        "incorrect_date",
        "duplicate",
        "outdated",
        "unauthorized_inquiry",
        "identity_theft",
        "mixed_file",
        "other",
      ] as const;

      for (const type of types) {
        const result = await disputeService.selectStrategy(dummyItem, type);
        expect(result.legalBasis).toBeDefined();
        expect(result.legalBasis.length).toBeGreaterThan(0);
        expect(result.steps).toBeDefined();
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // generateDisputeLetter
  // --------------------------------------------------------------------------

  describe("generateDisputeLetter", () => {
    const dummyItem = { type: "account" as const, issues: ["negative_balance"] };
    const dummyUser = { name: "John Doe", address: "123 Main St" };

    let mockGenerateDispute: jest.Mock;

    beforeEach(() => {
      mockGenerateDispute = jest.fn();
      const { getAIOrchestrator } = require("@/lib/ai-orchestrator");
      getAIOrchestrator.mockReturnValue({ generateDispute: mockGenerateDispute });
    });

    it("should generate letter using AI orchestrator", async () => {
      mockGenerateDispute.mockResolvedValue(
        "Dear Bureau, this item is inaccurate...",
      );

      const result = await disputeService.generateDisputeLetter(
        dummyItem,
        "basic_dispute",
        "incorrect_balance",
        dummyUser,
      );

      expect(result.letter).toBe("Dear Bureau, this item is inaccurate...");
      expect(result.subject).toContain("John Doe");
      expect(result.tips).toBeDefined();
      expect(result.tips.length).toBeGreaterThan(0);
      expect(result.followUpDate).toBeInstanceOf(Date);
    });

    it("should set follow-up date approximately 30 days from now", async () => {
      mockGenerateDispute.mockResolvedValue("Letter content");

      const result = await disputeService.generateDisputeLetter(
        dummyItem,
        "basic_dispute",
        "incorrect_balance",
        dummyUser,
      );

      const now = new Date();
      const diffDays = Math.round(
        (result.followUpDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(32);
    });

    it("should throw when AI orchestrator fails", async () => {
      mockGenerateDispute.mockRejectedValue(
        new Error("AI service unavailable"),
      );

      await expect(
        disputeService.generateDisputeLetter(
          dummyItem,
          "basic_dispute",
          "incorrect_balance",
          dummyUser,
        ),
      ).rejects.toThrow("AI service unavailable");
    });

    it("should pass correct params to orchestrator", async () => {
      mockGenerateDispute.mockResolvedValue("Letter");

      await disputeService.generateDisputeLetter(
        dummyItem,
        "identity_theft",
        "not_mine",
        { name: "Jane", address: "456 Oak" },
      );

      expect(mockGenerateDispute).toHaveBeenCalledWith(
        expect.objectContaining({
          disputeReason: "not_mine",
          userInfo: expect.objectContaining({ name: "Jane" }),
          additionalContext: "Strategy: identity_theft",
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // trackDispute
  // --------------------------------------------------------------------------

  describe("trackDispute", () => {
    it("should return dispute data when found", async () => {
      const disputeData = {
        id: "d-1",
        bureau: "experian",
        itemDescription: "Test item",
        status: "in_progress",
      };
      mockFrom({ data: disputeData, error: null });

      const result = await disputeService.trackDispute("d-1");
      expect(result).toEqual(disputeData);
    });

    it("should return null when dispute not found", async () => {
      mockFrom({ data: null, error: { code: "PGRST116", message: "Not found" } });

      const result = await disputeService.trackDispute("nonexistent");
      expect(result).toBeNull();
    });

    it("should return null on general error", async () => {
      mockFrom({ data: null, error: { message: "DB error" } });

      const result = await disputeService.trackDispute("d-1");
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // generateCFPBComplaint
  // --------------------------------------------------------------------------

  describe("generateCFPBComplaint", () => {
    it("should generate a CFPB complaint string", async () => {
      const dispute = {
        id: "d-1",
        bureau: "experian" as const,
        itemDescription: "Incorrect collection account",
        filedAt: new Date("2025-06-01"),
      };

      const result = await disputeService.generateCFPBComplaint(
        dispute as Parameters<typeof disputeService.generateCFPBComplaint>[0],
      );

      expect(result).toContain("CONSUMER FINANCIAL PROTECTION BUREAU");
      expect(result).toContain("Experian");
      expect(result).toContain("Incorrect collection account");
      expect(result).toContain("FCRA");
    });

    it("should handle equifax bureau", async () => {
      const dispute = {
        id: "d-2",
        bureau: "equifax" as const,
        itemDescription: "Wrong balance",
        filedAt: new Date("2025-07-01"),
      };

      const result = await disputeService.generateCFPBComplaint(
        dispute as Parameters<typeof disputeService.generateCFPBComplaint>[0],
      );

      expect(result).toContain("Equifax");
    });

    it("should handle transunion bureau", async () => {
      const dispute = {
        id: "d-3",
        bureau: "transunion" as const,
        itemDescription: "Duplicate account",
        filedAt: new Date("2025-08-01"),
      };

      const result = await disputeService.generateCFPBComplaint(
        dispute as Parameters<typeof disputeService.generateCFPBComplaint>[0],
      );

      expect(result).toContain("TransUnion");
    });
  });
});
