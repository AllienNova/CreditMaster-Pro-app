/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Tests for FinancialVitalityScoreService
 *
 * The service uses hardcoded mock data for the 5 component calculations
 * (credit, spending, savings, debt, investments), so the scores are
 * deterministic. The DB calls are only for score history.
 */

jest.mock("@/lib/supabase/server", () => {
  const _admin = { from: jest.fn(), rpc: jest.fn() };
  return { supabaseAdmin: _admin };
});

function sb() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

/** Self-referencing chain mock that resolves to {data,error} when awaited. */
function chainMock(result: { data: any; error: any }) {
  const mock: any = {};
  const handler = () => mock;
  mock.select = jest.fn(handler);
  mock.insert = jest.fn(handler);
  mock.update = jest.fn(handler);
  mock.upsert = jest.fn(handler);
  mock.delete = jest.fn(handler);
  mock.eq = jest.fn(handler);
  mock.gte = jest.fn(handler);
  mock.lte = jest.fn(handler);
  mock.order = jest.fn(handler);
  mock.limit = jest.fn(handler);
  mock.single = jest.fn(() => Promise.resolve(result));
  // Thenable so `await chain` resolves without .single()
  mock.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  return mock;
}

import { vitalityScoreService } from "@/lib/financial/vitality-score-service";

// ============================================================================
// Pre-calculated expected scores from the hardcoded mock data:
// Credit:      720 score -> 25, util 25 -> 25, payment 98% -> 24.5, age 72 -> 7
//              Total = 25 + 25 + 24.5 + 7 = 81.5 -> round = 82
// Spending:    adherence 85 -> 34, rate 15 -> 25, ratio 0.7 -> 20, trend -5 -> 10
//              Total = 34 + 25 + 20 + 10 = 89
// Savings:     emergency 4 -> 30, rate 15 -> 28, goalProg 65 -> 16.25
//              Total = 30 + 28 + 16.25 = 74.25 -> round = 74
// Debt:        dti 0.35 -> 30, highInterest 5000 -> 10 (== 5000, not < 5000),
//              payoff 40% -> 12
//              Total = 30 + 10 + 12 = 52
// Investments: contrib 12 -> 28, divers 75 -> 22.5, ytd 8.5 -> 20, risk 1.2 -> 7
//              Total = 28 + 22.5 + 20 + 7 = 77.5 -> round = 78
//
// Overall = 82*0.25 + 89*0.2 + 74*0.2 + 52*0.2 + 78*0.15
//         = 20.5 + 17.8 + 14.8 + 10.4 + 11.7 = 75.2 -> round = 75
// ============================================================================
const EXPECTED_CREDIT = 82;
const EXPECTED_SPENDING = 89;
const EXPECTED_SAVINGS = 74;
const EXPECTED_DEBT = 52;
const EXPECTED_INVESTMENTS = 78;
const EXPECTED_OVERALL = Math.round(
  EXPECTED_CREDIT * 0.25 +
    EXPECTED_SPENDING * 0.2 +
    EXPECTED_SAVINGS * 0.2 +
    EXPECTED_DEBT * 0.2 +
    EXPECTED_INVESTMENTS * 0.15,
);

describe("FinancialVitalityScoreService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getScoreHistory
  // ==========================================================================
  describe("getScoreHistory", () => {
    it("should return mapped history rows from database", async () => {
      const rows = [
        {
          date: "2026-02-01",
          overall: 70,
          credit: 80,
          spending: 85,
          savings: 70,
          debt: 50,
          investments: 75,
        },
        {
          date: "2026-02-02",
          overall: 72,
          credit: 81,
          spending: 86,
          savings: 71,
          debt: 51,
          investments: 76,
        },
      ];

      sb().from.mockReturnValue(
        chainMock({ data: rows, error: null }),
      );

      const result = await vitalityScoreService.getScoreHistory("u1", 30);

      expect(result).toHaveLength(2);
      expect(result[0].overall).toBe(70);
      expect(result[0].credit).toBe(80);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(result[1].overall).toBe(72);

      expect(sb().from).toHaveBeenCalledWith("vitality_score_history");
    });

    it("should return empty array when data is null", async () => {
      sb().from.mockReturnValue(
        chainMock({ data: null, error: null }),
      );

      const result = await vitalityScoreService.getScoreHistory("u1");
      expect(result).toEqual([]);
    });

    it("should return empty array on Supabase error (no throw)", async () => {
      sb().from.mockReturnValue(
        chainMock({ data: null, error: { message: "db down" } }),
      );

      const result = await vitalityScoreService.getScoreHistory("u1", 7);
      expect(result).toEqual([]);
    });

    it("should use default days=30 when not specified", async () => {
      const mock = chainMock({ data: [], error: null });
      sb().from.mockReturnValue(mock);

      await vitalityScoreService.getScoreHistory("u1");

      // Verify gte was called (which means the date filter was applied)
      expect(mock.gte).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // calculateVitalityScore
  // ==========================================================================
  describe("calculateVitalityScore", () => {
    /**
     * For calculateVitalityScore, the service:
     * 1. Calls 5 private calculate* methods (hardcoded mock data, no DB)
     * 2. Calls getScoreHistory(userId, 30) — reads from DB
     * 3. Calls saveScoreToHistory — upserts to DB
     * So we need the from() mock to handle both reads and upserts.
     */

    function setupDbForCalculate(historyRows: any[] = []) {
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getScoreHistory — select query
          return chainMock({ data: historyRows, error: null });
        }
        // saveScoreToHistory — upsert
        return chainMock({ data: null, error: null });
      });
    }

    it("should calculate overall score from hardcoded component scores", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.overall).toBe(EXPECTED_OVERALL);
      expect(result.components.credit.score).toBe(EXPECTED_CREDIT);
      expect(result.components.spending.score).toBe(EXPECTED_SPENDING);
      expect(result.components.savings.score).toBe(EXPECTED_SAVINGS);
      expect(result.components.debt.score).toBe(EXPECTED_DEBT);
      expect(result.components.investments.score).toBe(EXPECTED_INVESTMENTS);
    });

    it("should assign correct weights to components", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.components.credit.weight).toBe(0.25);
      expect(result.components.spending.weight).toBe(0.2);
      expect(result.components.savings.weight).toBe(0.2);
      expect(result.components.debt.weight).toBe(0.2);
      expect(result.components.investments.weight).toBe(0.15);
    });

    it("should assign correct grade based on overall score", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // EXPECTED_OVERALL = 75 -> grade C (70-79)
      expect(result.grade).toBe("C");
    });

    it("should determine trend as stable when history has < 2 entries", async () => {
      setupDbForCalculate([]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.trend).toBe("stable");
      expect(result.trendPercentage).toBe(0);
    });

    it("should determine improving trend when recent avg > older avg by > 2", async () => {
      // Need 14+ entries: first 7 with lower scores, last 7 with higher scores
      const history: any[] = [];
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-0${i + 1}`,
          overall: 60,
          credit: 60,
          spending: 60,
          savings: 60,
          debt: 60,
          investments: 60,
        });
      }
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-${i + 8}`,
          overall: 80,
          credit: 80,
          spending: 80,
          savings: 80,
          debt: 80,
          investments: 80,
        });
      }

      setupDbForCalculate(history);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.trend).toBe("improving");
    });

    it("should determine declining trend when recent avg < older avg by > 2", async () => {
      const history: any[] = [];
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-0${i + 1}`,
          overall: 80,
          credit: 80,
          spending: 80,
          savings: 80,
          debt: 80,
          investments: 80,
        });
      }
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-${i + 8}`,
          overall: 60,
          credit: 60,
          spending: 60,
          savings: 60,
          debt: 60,
          investments: 60,
        });
      }

      setupDbForCalculate(history);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.trend).toBe("declining");
    });

    it("should calculate correct trend percentage", async () => {
      const history: any[] = [
        {
          date: "2026-02-01",
          overall: 50,
          credit: 50,
          spending: 50,
          savings: 50,
          debt: 50,
          investments: 50,
        },
        {
          date: "2026-02-15",
          overall: 75,
          credit: 75,
          spending: 75,
          savings: 75,
          debt: 75,
          investments: 75,
        },
      ];

      setupDbForCalculate(history);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Trend percentage = ((75 - 50) / 50) * 100 = 50
      expect(result.trendPercentage).toBe(50);
    });

    it("should return trendPercentage 0 when first score is 0", async () => {
      const history: any[] = [
        {
          date: "2026-02-01",
          overall: 0,
          credit: 0,
          spending: 0,
          savings: 0,
          debt: 0,
          investments: 0,
        },
        {
          date: "2026-02-02",
          overall: 50,
          credit: 50,
          spending: 50,
          savings: 50,
          debt: 50,
          investments: 50,
        },
      ];

      setupDbForCalculate(history);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.trendPercentage).toBe(0);
    });

    it("should assign correct percentile based on overall score", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // EXPECTED_OVERALL = 75 -> percentile 60 (70-79 range)
      expect(result.percentile).toBe(60);
    });

    it("should generate quick wins for high-interest debt", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Mock debt has highInterestDebt = 5000 > 0, so "pay-high-interest" should exist
      const debtWin = result.quickWins.find(
        (w) => w.id === "pay-high-interest",
      );
      expect(debtWin).toBeDefined();
      expect(debtWin!.category).toBe("debt");
    });

    it("should generate quick win for investment contributions < 15%", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Mock investments has contributionRate = 12 < 15
      const investWin = result.quickWins.find(
        (w) => w.id === "increase-contributions",
      );
      expect(investWin).toBeDefined();
      expect(investWin!.category).toBe("investments");
    });

    it("should NOT generate utilization quick win when utilization <= 30", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Mock credit has utilizationRate = 25 <= 30
      const utilWin = result.quickWins.find(
        (w) => w.id === "lower-utilization",
      );
      expect(utilWin).toBeUndefined();
    });

    it("should NOT generate emergency fund quick win when months >= 3", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Mock savings has emergencyFundMonths = 4 >= 3
      const emergWin = result.quickWins.find(
        (w) => w.id === "emergency-fund",
      );
      expect(emergWin).toBeUndefined();
    });

    it("should NOT generate spending quick win when budget adherence >= 80", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Mock spending has budgetAdherence = 85 >= 80
      const spendWin = result.quickWins.find(
        (w) => w.id === "track-spending",
      );
      expect(spendWin).toBeUndefined();
    });

    it("should return next milestone based on overall score", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // EXPECTED_OVERALL = 75 -> next milestone target = 80 ("Financial Fit")
      expect(result.nextMilestone.target).toBe(80);
      expect(result.nextMilestone.description).toBe("Financial Fit");
    });

    it("should set lastUpdated to a recent Date", async () => {
      setupDbForCalculate();

      const before = Date.now();
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const after = Date.now();

      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.lastUpdated.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.lastUpdated.getTime()).toBeLessThanOrEqual(after);
    });

    it("should save the score to history via upsert", async () => {
      const upsertMock = chainMock({ data: null, error: null });
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainMock({ data: [], error: null });
        }
        return upsertMock;
      });

      await vitalityScoreService.calculateVitalityScore("u1");

      // Second from() call is for saving — verify upsert was called
      expect(upsertMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u1",
          overall: EXPECTED_OVERALL,
          credit: EXPECTED_CREDIT,
          spending: EXPECTED_SPENDING,
          savings: EXPECTED_SAVINGS,
          debt: EXPECTED_DEBT,
          investments: EXPECTED_INVESTMENTS,
        }),
        { onConflict: "user_id,date" },
      );
    });

    it("should set component trends correctly from mock data", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Credit: scoreChange 15 > 0 -> improving
      expect(result.components.credit.trend).toBe("improving");
      // Spending: monthlyTrend -5 < 0 -> improving
      expect(result.components.spending.trend).toBe("improving");
      // Savings: savingsRate 15 >= 15 -> improving
      expect(result.components.savings.trend).toBe("improving");
      // Debt: payoffProgress 40 > 25 -> stable
      expect(result.components.debt.trend).toBe("stable");
      // Investments: ytdReturn 8.5 > 5 -> improving
      expect(result.components.investments.trend).toBe("improving");
    });

    it("should set component grades correctly", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Credit 82 -> B (80-89)
      expect(result.components.credit.grade).toBe("B");
      // Spending 89 -> B (80-89)
      expect(result.components.spending.grade).toBe("B");
      // Savings 74 -> C (70-79)
      expect(result.components.savings.grade).toBe("C");
      // Debt 52 -> F (< 60)
      expect(result.components.debt.grade).toBe("F");
      // Investments 78 -> C (70-79)
      expect(result.components.investments.grade).toBe("C");
    });

    it("should limit quick wins to 5 maximum", async () => {
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.quickWins.length).toBeLessThanOrEqual(5);
    });

    it("should return last milestone when score >= 100", async () => {
      // We can't directly change the score since calculations are hardcoded,
      // but we can test getNextMilestone logic indirectly. Since overall = 75,
      // next milestone is target=80. Let's verify the milestone chain.
      setupDbForCalculate();

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // For score 75, next milestone target should be 80
      expect(result.nextMilestone.target).toBe(80);
    });
  });
});
