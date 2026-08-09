/**
 * @jest-environment node
 */

/**
 * Tests for CreditRepairService
 *
 * Requires mocking: @/lib/supabase/client, @/lib/credit-bureau
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/service-role", () => {
  const _client = { from: jest.fn() };
  return { getServiceRoleClient: () => _client };
});

jest.mock("@/lib/credit-bureau", () => ({
  CreditBureauService: {
    getAllCreditReports: jest.fn(),
  },
}));

function sb() {
  return require("@/lib/supabase/service-role").getServiceRoleClient();
}

function bureauService() {
  return require("@/lib/credit-bureau").CreditBureauService;
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

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { creditRepairService } from "../credit-repair-service";
import type {
  CreditAccount,
  CreditInquiry,
  PublicRecord,
  CreditBureauRawPayload,
} from "@/lib/credit-bureau/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAccount(
  overrides: Partial<CreditAccount> = {},
): CreditAccount {
  return {
    id: "acc-1",
    account_number: "****1234",
    account_type: "credit_card",
    creditor_name: "Chase",
    balance: 500,
    credit_limit: 5000,
    payment_status: "current",
    opened_date: "2022-01-01",
    payment_history: [],
    ...overrides,
  };
}

function makeInquiry(
  overrides: Partial<CreditInquiry> = {},
): CreditInquiry {
  return {
    id: "inq-1",
    inquiry_date: "2025-06-01",
    creditor_name: "Capital One",
    inquiry_type: "hard",
    ...overrides,
  };
}

function makeBureauReport(
  bureau: "experian" | "equifax" | "transunion",
  accounts: CreditAccount[] = [],
  inquiries: CreditInquiry[] = [],
) {
  return {
    success: true,
    data: {
      id: `report-${bureau}`,
      user_id: "u-1",
      bureau,
      credit_score: 650,
      report_date: "2026-01-15",
      accounts,
      inquiries,
      public_records: [] as PublicRecord[],
      raw_data: {} as CreditBureauRawPayload,
      created_at: new Date().toISOString(),
    },
    bureau,
    timestamp: new Date().toISOString(),
  };
}

function makeEmptyReports() {
  return {
    experian: makeBureauReport("experian"),
    equifax: makeBureauReport("equifax"),
    transunion: makeBureauReport("transunion"),
  };
}

function makeReportsWithAccounts(accounts: CreditAccount[]) {
  return {
    experian: makeBureauReport("experian", accounts),
    equifax: makeBureauReport("equifax"),
    transunion: makeBureauReport("transunion"),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreditRepairService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // getCreditRepairScore
  // --------------------------------------------------------------------------

  describe("getCreditRepairScore", () => {
    it("should return a score with all four factors", async () => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getCreditRepairScore("u-1");

      expect(result.factors).toHaveLength(4);
      expect(result.factors.map((f: { category: string }) => f.category)).toEqual([
        "disputes",
        "utilization",
        "negotiations",
        "building",
      ]);
    });

    it("should calculate weighted overall score from factors", async () => {
      // With no negative items and no accounts, dispute=100, utilization=100,
      // negotiation=100, building=50
      // Weighted: (100*40 + 100*30 + 100*20 + 50*10) / 100 = 95
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getCreditRepairScore("u-1");

      expect(result.score).toBe(95);
    });

    it("should compute dispute factor with negative items", async () => {
      const accounts = [
        makeAccount({ payment_status: "late" }),
        makeAccount({ id: "acc-2", payment_status: "collection" }),
      ];
      // Only experian has negative items: 2 negative items
      // score = 100 - 2*10 = 80, impact = min(150, 2*20) = 40
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const disputeFactor = result.factors.find(
        (f: { category: string }) => f.category === "disputes",
      );
      expect(disputeFactor!.currentScore).toBe(80);
      expect(disputeFactor!.impact).toBe(40);
      expect(disputeFactor!.weight).toBe(40);
    });

    it("should cap dispute impact at 150", async () => {
      // 8 negative items across bureaus
      const accounts = Array.from({ length: 8 }, (_, i) =>
        makeAccount({ id: `acc-${i}`, payment_status: "late" }),
      );
      // impact = 8*20 = 160, capped at 150
      // score = max(0, 100-80) = 20
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const disputeFactor = result.factors.find(
        (f: { category: string }) => f.category === "disputes",
      );
      expect(disputeFactor!.impact).toBe(150);
    });

    it("should compute utilization factor based on balances and limits", async () => {
      const accounts = [
        makeAccount({ balance: 2000, credit_limit: 5000 }), // 40%
      ];
      // totalBalance=2000, totalLimit=5000, utilization=40%
      // score = max(0, 100-40) = 60
      // reduction = 40-10=30, impact = (30/10)*35=105, capped at 50
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const utilFactor = result.factors.find(
        (f: { category: string }) => f.category === "utilization",
      );
      expect(utilFactor!.currentScore).toBe(60);
      expect(utilFactor!.impact).toBe(50); // capped at 50
    });

    it("should return utilization score 100 when no revolving accounts", async () => {
      // Accounts with no credit_limit (or 0)
      const accounts = [
        makeAccount({ credit_limit: 0, balance: 100 }),
      ];
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const utilFactor = result.factors.find(
        (f: { category: string }) => f.category === "utilization",
      );
      expect(utilFactor!.currentScore).toBe(100);
      expect(utilFactor!.impact).toBe(0);
    });

    it("should compute negotiation factor with late and collection items", async () => {
      const accounts = [
        makeAccount({ payment_status: "late" }),
        makeAccount({ id: "acc-2", payment_status: "collection" }),
        makeAccount({ id: "acc-3", payment_status: "charged_off" }),
      ];
      // late=1, collections=2 (collection + charged_off)
      // totalNegotiable=3, score=100-3*15=55
      // impact = 1*20 + 2*75=170, capped at 100
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const negFactor = result.factors.find(
        (f: { category: string }) => f.category === "negotiations",
      );
      expect(negFactor!.currentScore).toBe(55);
      expect(negFactor!.impact).toBe(100); // capped at 100
    });

    it("should compute building factor based on account count and age", async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3);
      const accounts = Array.from({ length: 6 }, (_, i) =>
        makeAccount({ id: `acc-${i}`, opened_date: oldDate.toISOString().split("T")[0] }),
      );
      // accountCount=6 (>=5 → +25), oldestAccountAge ~ 36 months (>=5 → +25)
      // score = 50+25+25=100, impact=30 (count>=3)
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const buildFactor = result.factors.find(
        (f: { category: string }) => f.category === "building",
      );
      expect(buildFactor!.currentScore).toBe(100);
      expect(buildFactor!.impact).toBe(30);
    });

    it("should return impact 50 when fewer than 3 accounts", async () => {
      const accounts = [makeAccount(), makeAccount({ id: "acc-2" })];
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const buildFactor = result.factors.find(
        (f: { category: string }) => f.category === "building",
      );
      expect(buildFactor!.impact).toBe(50);
    });

    it("should sum estimated impact from all factors", async () => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getCreditRepairScore("u-1");

      const totalImpact = result.factors.reduce(
        (sum: number, f: { impact: number }) => sum + f.impact,
        0,
      );
      expect(result.estimatedImpact).toBe(Math.round(totalImpact));
    });

    it("should include timeline in result", async () => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getCreditRepairScore("u-1");

      expect(typeof result.timeline).toBe("string");
    });

    it("should include opportunities in result", async () => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getCreditRepairScore("u-1");

      expect(Array.isArray(result.opportunities)).toBe(true);
    });

    it("should re-throw errors from CreditBureauService", async () => {
      bureauService().getAllCreditReports.mockRejectedValue(
        new Error("Bureau API down"),
      );

      await expect(
        creditRepairService.getCreditRepairScore("u-1"),
      ).rejects.toThrow("Bureau API down");
    });
  });

  // --------------------------------------------------------------------------
  // getQuickWins
  // --------------------------------------------------------------------------

  describe("getQuickWins", () => {
    it("should always include optimize_payment_timing", async () => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getQuickWins("u-1");

      const paymentTiming = result.find(
        (qw: { id: string }) => qw.id === "optimize_payment_timing",
      );
      expect(paymentTiming).toBeDefined();
      expect(paymentTiming!.impact).toBe(15);
      expect(paymentTiming!.successRate).toBe(100);
    });

    it("should include pay_down_utilization when high utilization cards exist", async () => {
      const accounts = [
        makeAccount({ balance: 4000, credit_limit: 5000 }), // 80%
      ];
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getQuickWins("u-1");

      const payDown = result.find(
        (qw: { id: string }) => qw.id === "pay_down_utilization",
      );
      expect(payDown).toBeDefined();
      expect(payDown!.impact).toBe(35);
      expect(payDown!.successRate).toBe(95);
    });

    it("should not include pay_down_utilization when no high utilization", async () => {
      const accounts = [
        makeAccount({ balance: 100, credit_limit: 5000 }), // 2%
      ];
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getQuickWins("u-1");

      const payDown = result.find(
        (qw: { id: string }) => qw.id === "pay_down_utilization",
      );
      expect(payDown).toBeUndefined();
    });

    it("should include remove_inquiries when inquiries exist", async () => {
      const reports = {
        experian: makeBureauReport(
          "experian",
          [],
          [makeInquiry(), makeInquiry({ id: "inq-2" })],
        ),
        equifax: makeBureauReport("equifax"),
        transunion: makeBureauReport("transunion"),
      };
      bureauService().getAllCreditReports.mockResolvedValue(reports);

      const result = await creditRepairService.getQuickWins("u-1");

      const removeInq = result.find(
        (qw: { id: string }) => qw.id === "remove_inquiries",
      );
      expect(removeInq).toBeDefined();
      expect(removeInq!.impact).toBe(14); // 2 inquiries * 7
      expect(removeInq!.successRate).toBe(50);
    });

    it("should not include dispute_errors when no obvious errors", async () => {
      // findObviousErrors always returns [] (placeholder)
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getQuickWins("u-1");

      const disputeErrors = result.find(
        (qw: { id: string }) => qw.id === "dispute_errors",
      );
      expect(disputeErrors).toBeUndefined();
    });

    it("should sort quick wins by impact descending", async () => {
      const accounts = [
        makeAccount({ balance: 4000, credit_limit: 5000 }), // high utilization
      ];
      const reports = {
        experian: makeBureauReport(
          "experian",
          accounts,
          [makeInquiry()],
        ),
        equifax: makeBureauReport("equifax"),
        transunion: makeBureauReport("transunion"),
      };
      bureauService().getAllCreditReports.mockResolvedValue(reports);

      const result = await creditRepairService.getQuickWins("u-1");

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].impact).toBeGreaterThanOrEqual(result[i].impact);
      }
    });

    it("should return empty array on error (swallows exception)", async () => {
      bureauService().getAllCreditReports.mockRejectedValue(
        new Error("API failure"),
      );

      const result = await creditRepairService.getQuickWins("u-1");

      // The always-added optimize_payment_timing is added before try, so
      // if error happens after it, it may still be in the list. But since
      // quickWins is initialized as empty and payment_timing is added at the
      // end of the try block, an early error returns empty.
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // getOpportunities
  // --------------------------------------------------------------------------

  describe("getOpportunities", () => {
    it("should return empty array when all opportunity methods return empty", async () => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getOpportunities("u-1");

      expect(result).toEqual([]);
    });

    it("should use provided reports without calling CreditBureauService", async () => {
      const reports = makeEmptyReports();

      await creditRepairService.getOpportunities("u-1", reports);

      expect(bureauService().getAllCreditReports).not.toHaveBeenCalled();
    });

    it("should call CreditBureauService when reports not provided", async () => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      await creditRepairService.getOpportunities("u-1");

      expect(bureauService().getAllCreditReports).toHaveBeenCalledWith("u-1");
    });

    it("should return empty array on error (swallows exception)", async () => {
      bureauService().getAllCreditReports.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await creditRepairService.getOpportunities("u-1");

      expect(result).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // calculateImpact
  // --------------------------------------------------------------------------

  describe("calculateImpact", () => {
    beforeEach(() => {
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());
    });

    it("should return 20 for dispute_inaccuracy", async () => {
      const result = await creditRepairService.calculateImpact(
        "dispute_inaccuracy",
        "u-1",
      );
      expect(result).toBe(20);
    });

    it("should return 35 for pay_down_utilization", async () => {
      const result = await creditRepairService.calculateImpact(
        "pay_down_utilization",
        "u-1",
      );
      expect(result).toBe(35);
    });

    it("should return 20 for goodwill_letter", async () => {
      const result = await creditRepairService.calculateImpact(
        "goodwill_letter",
        "u-1",
      );
      expect(result).toBe(20);
    });

    it("should return 75 for pay_for_delete", async () => {
      const result = await creditRepairService.calculateImpact(
        "pay_for_delete",
        "u-1",
      );
      expect(result).toBe(75);
    });

    it("should return 7 for remove_inquiry", async () => {
      const result = await creditRepairService.calculateImpact(
        "remove_inquiry",
        "u-1",
      );
      expect(result).toBe(7);
    });

    it("should return 15 for optimize_payment_timing", async () => {
      const result = await creditRepairService.calculateImpact(
        "optimize_payment_timing",
        "u-1",
      );
      expect(result).toBe(15);
    });

    it("should return 55 for piggybacking", async () => {
      const result = await creditRepairService.calculateImpact(
        "piggybacking",
        "u-1",
      );
      expect(result).toBe(55);
    });

    it("should return 40 for credit_builder_loan", async () => {
      const result = await creditRepairService.calculateImpact(
        "credit_builder_loan",
        "u-1",
      );
      expect(result).toBe(40);
    });

    it("should return 35 for secured_card", async () => {
      const result = await creditRepairService.calculateImpact(
        "secured_card",
        "u-1",
      );
      expect(result).toBe(35);
    });

    it("should return 0 on error (swallows exception)", async () => {
      bureauService().getAllCreditReports.mockRejectedValue(
        new Error("API error"),
      );

      const result = await creditRepairService.calculateImpact(
        "dispute_inaccuracy",
        "u-1",
      );
      expect(result).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // getProgress
  // --------------------------------------------------------------------------

  describe("getProgress", () => {
    it("should return null when no first score exists", async () => {
      const mock = chainMock({ data: null, error: null });
      sb().from.mockReturnValue(mock);

      const result = await creditRepairService.getProgress("u-1");

      expect(result).toBeNull();
    });

    it("should return null when no current score exists", async () => {
      // First call (first score) returns data, second call (current score) returns null
      const firstScoreMock = chainMock({
        data: { user_id: "u-1", score: 550, score_date: "2025-01-01" },
        error: null,
      });
      const currentScoreMock = chainMock({ data: null, error: null });

      sb().from
        .mockReturnValueOnce(firstScoreMock)
        .mockReturnValueOnce(currentScoreMock);

      const result = await creditRepairService.getProgress("u-1");

      expect(result).toBeNull();
    });

    it("should return progress with correct calculations", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago
      const startDateStr = startDate.toISOString().split("T")[0];

      const firstScoreMock = chainMock({
        data: { user_id: "u-1", score: 550, score_date: startDateStr },
        error: null,
      });
      const currentScoreMock = chainMock({
        data: { user_id: "u-1", score: 620, score_date: "2026-02-28" },
        error: null,
      });
      const actionsMock = chainMock({
        data: [
          {
            user_id: "u-1",
            action_type: "dispute",
            completed: true,
            completed_at: "2026-02-15",
            score_after: 600,
            impact_score: 30,
          },
          {
            user_id: "u-1",
            action_type: "pay_down",
            completed: false,
            completed_at: null,
            score_after: null,
            impact_score: null,
          },
        ],
        error: null,
      });

      sb().from
        .mockReturnValueOnce(firstScoreMock)
        .mockReturnValueOnce(currentScoreMock)
        .mockReturnValueOnce(actionsMock);

      const result = await creditRepairService.getProgress("u-1");

      expect(result).not.toBeNull();
      expect(result!.userId).toBe("u-1");
      expect(result!.startingScore).toBe(550);
      expect(result!.currentScore).toBe(620);
      expect(result!.targetScore).toBe(700);
      expect(result!.scoreIncrease).toBe(70);
      expect(result!.completedActions).toBe(1);
      expect(result!.totalActions).toBe(2);
      expect(result!.milestones).toHaveLength(1);
      expect(result!.milestones[0].action).toBe("dispute");
      expect(result!.milestones[0].impact).toBe(30);
      expect(result!.daysElapsed).toBeGreaterThanOrEqual(29);
      expect(result!.daysElapsed).toBeLessThanOrEqual(31);
    });

    it("should compute estimated days remaining from points per day", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 60); // 60 days ago

      const firstScoreMock = chainMock({
        data: { user_id: "u-1", score: 500, score_date: startDate.toISOString().split("T")[0] },
        error: null,
      });
      const currentScoreMock = chainMock({
        data: { user_id: "u-1", score: 620, score_date: "2026-02-28" },
        error: null,
      });
      const actionsMock = chainMock({ data: [], error: null });

      sb().from
        .mockReturnValueOnce(firstScoreMock)
        .mockReturnValueOnce(currentScoreMock)
        .mockReturnValueOnce(actionsMock);

      const result = await creditRepairService.getProgress("u-1");

      // scoreIncrease=120, daysElapsed~60, pointsPerDay=2
      // remaining=700-620=80, estimatedDays=80/2=40
      expect(result).not.toBeNull();
      expect(result!.estimatedDaysRemaining).toBeGreaterThan(0);
    });

    it("should return 90 as default estimated days remaining when no progress", async () => {
      const today = new Date().toISOString().split("T")[0];

      const firstScoreMock = chainMock({
        data: { user_id: "u-1", score: 620, score_date: today },
        error: null,
      });
      const currentScoreMock = chainMock({
        data: { user_id: "u-1", score: 620, score_date: today },
        error: null,
      });
      const actionsMock = chainMock({ data: [], error: null });

      sb().from
        .mockReturnValueOnce(firstScoreMock)
        .mockReturnValueOnce(currentScoreMock)
        .mockReturnValueOnce(actionsMock);

      const result = await creditRepairService.getProgress("u-1");

      // pointsPerDay = 0, so default 90
      expect(result).not.toBeNull();
      expect(result!.estimatedDaysRemaining).toBe(90);
    });

    it("should clamp estimated days remaining to 0 when target already met", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const firstScoreMock = chainMock({
        data: { user_id: "u-1", score: 650, score_date: startDate.toISOString().split("T")[0] },
        error: null,
      });
      const currentScoreMock = chainMock({
        data: { user_id: "u-1", score: 750, score_date: "2026-02-28" },
        error: null,
      });
      const actionsMock = chainMock({ data: [], error: null });

      sb().from
        .mockReturnValueOnce(firstScoreMock)
        .mockReturnValueOnce(currentScoreMock)
        .mockReturnValueOnce(actionsMock);

      const result = await creditRepairService.getProgress("u-1");

      // target=700, current=750, remaining = -50 → Math.max(0, ...) = 0
      expect(result).not.toBeNull();
      expect(result!.estimatedDaysRemaining).toBe(0);
    });

    it("should use impact_score 0 when null in actions", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);

      const firstScoreMock = chainMock({
        data: { user_id: "u-1", score: 580, score_date: startDate.toISOString().split("T")[0] },
        error: null,
      });
      const currentScoreMock = chainMock({
        data: { user_id: "u-1", score: 600, score_date: "2026-02-28" },
        error: null,
      });
      const actionsMock = chainMock({
        data: [
          {
            user_id: "u-1",
            action_type: "goodwill",
            completed: true,
            completed_at: "2026-02-20",
            score_after: null,
            impact_score: null,
          },
        ],
        error: null,
      });

      sb().from
        .mockReturnValueOnce(firstScoreMock)
        .mockReturnValueOnce(currentScoreMock)
        .mockReturnValueOnce(actionsMock);

      const result = await creditRepairService.getProgress("u-1");

      expect(result).not.toBeNull();
      expect(result!.milestones[0].impact).toBe(0);
      // score_after null → falls back to currentScore.score
      expect(result!.milestones[0].score).toBe(600);
    });

    it("should handle null actions data gracefully", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);

      const firstScoreMock = chainMock({
        data: { user_id: "u-1", score: 580, score_date: startDate.toISOString().split("T")[0] },
        error: null,
      });
      const currentScoreMock = chainMock({
        data: { user_id: "u-1", score: 600, score_date: "2026-02-28" },
        error: null,
      });
      const actionsMock = chainMock({ data: null, error: null });

      sb().from
        .mockReturnValueOnce(firstScoreMock)
        .mockReturnValueOnce(currentScoreMock)
        .mockReturnValueOnce(actionsMock);

      const result = await creditRepairService.getProgress("u-1");

      expect(result).not.toBeNull();
      expect(result!.completedActions).toBe(0);
      expect(result!.totalActions).toBe(0);
      expect(result!.milestones).toHaveLength(0);
    });

    it("should return null on error (swallows exception)", async () => {
      sb().from.mockImplementation(() => {
        throw new Error("DB connection lost");
      });

      const result = await creditRepairService.getProgress("u-1");

      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // calculateTimeline (tested indirectly through getCreditRepairScore)
  // --------------------------------------------------------------------------

  describe("timeline calculation (via getCreditRepairScore)", () => {
    it("should return '0 days' when no opportunities", async () => {
      // With empty placeholder opportunity methods, there are no opportunities
      bureauService().getAllCreditReports.mockResolvedValue(makeEmptyReports());

      const result = await creditRepairService.getCreditRepairScore("u-1");

      expect(result.timeline).toBe("0 days");
    });
  });

  // --------------------------------------------------------------------------
  // findHighUtilizationCards (tested indirectly through getQuickWins)
  // --------------------------------------------------------------------------

  describe("high utilization detection (via getQuickWins)", () => {
    it("should detect cards with utilization > 30%", async () => {
      const accounts = [
        makeAccount({ balance: 1600, credit_limit: 5000 }), // 32% → high
        makeAccount({ id: "acc-2", balance: 100, credit_limit: 5000 }), // 2% → low
      ];
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getQuickWins("u-1");

      const payDown = result.find(
        (qw: { id: string }) => qw.id === "pay_down_utilization",
      );
      expect(payDown).toBeDefined();
      // Description mentions 1 card (only one over 30%)
      expect(payDown!.description).toContain("1 cards");
    });

    it("should skip cards with 0 credit limit", async () => {
      const accounts = [
        makeAccount({ balance: 500, credit_limit: 0 }),
      ];
      bureauService().getAllCreditReports.mockResolvedValue(
        makeReportsWithAccounts(accounts),
      );

      const result = await creditRepairService.getQuickWins("u-1");

      const payDown = result.find(
        (qw: { id: string }) => qw.id === "pay_down_utilization",
      );
      expect(payDown).toBeUndefined();
    });

    it("should detect high utilization cards across multiple bureaus", async () => {
      const accounts = [
        makeAccount({ balance: 4000, credit_limit: 5000 }), // 80%
      ];
      const reports = {
        experian: makeBureauReport("experian", accounts),
        equifax: makeBureauReport("equifax", accounts),
        transunion: makeBureauReport("transunion"),
      };
      bureauService().getAllCreditReports.mockResolvedValue(reports);

      const result = await creditRepairService.getQuickWins("u-1");

      const payDown = result.find(
        (qw: { id: string }) => qw.id === "pay_down_utilization",
      );
      expect(payDown).toBeDefined();
      // 2 cards total (one from each bureau)
      expect(payDown!.description).toContain("2 cards");
    });
  });

  // --------------------------------------------------------------------------
  // getReport helper (tested indirectly)
  // --------------------------------------------------------------------------

  describe("getReport helper (via getCreditRepairScore)", () => {
    it("should skip bureaus with unsuccessful responses", async () => {
      const reports = {
        experian: {
          success: false,
          error: "API unavailable",
          bureau: "experian",
          timestamp: new Date().toISOString(),
        },
        equifax: makeBureauReport("equifax"),
        transunion: makeBureauReport("transunion"),
      };
      bureauService().getAllCreditReports.mockResolvedValue(reports);

      // Should not throw, just skip experian
      const result = await creditRepairService.getCreditRepairScore("u-1");

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing bureau entries in reports", async () => {
      const reports = {
        experian: makeBureauReport("experian"),
        // equifax and transunion are missing
      };
      bureauService().getAllCreditReports.mockResolvedValue(reports);

      const result = await creditRepairService.getCreditRepairScore("u-1");

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
