// Mock getSupabase before any import — it's called at module level
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => mockSupabase,
}));

import { GoalInvestmentService } from "../GoalInvestmentService";
import type { GoalType, RiskTolerance } from "../GoalInvestmentService";

// ============================================================================
// Helpers
// ============================================================================

function futureDate(yearsAhead: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsAhead);
  return d;
}

// ============================================================================
// Tests
// ============================================================================

describe("GoalInvestmentService", () => {
  let svc: GoalInvestmentService;

  beforeEach(() => {
    svc = new GoalInvestmentService();
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // getRecommendedAllocation
  // --------------------------------------------------------------------------

  describe("getRecommendedAllocation", () => {
    it("returns conservative allocation when yearsToGoal <= 1 and risk is moderate", () => {
      const allocs = svc.getRecommendedAllocation("house", 1, "moderate");
      const bonds = allocs.find((a) => a.assetClass === "bonds");
      expect(bonds).toBeDefined();
      // conservative has 60% bonds
      expect(bonds!.percent).toBe(60);
    });

    it("returns conservative allocation when yearsToGoal <= 1 and risk is aggressive", () => {
      const allocs = svc.getRecommendedAllocation("retirement", 1, "aggressive");
      const stocks = allocs.find((a) => a.assetClass === "stocks");
      // Conservative has 25% stocks not 80%
      expect(stocks!.percent).toBe(25);
    });

    it("returns the explicit conservative allocation when tolerance is conservative", () => {
      const allocs = svc.getRecommendedAllocation("emergency", 3, "conservative");
      const bonds = allocs.find((a) => a.assetClass === "bonds");
      expect(bonds!.percent).toBe(60);
    });

    it("returns moderate allocation for 3-year goal with no risk override", () => {
      const allocs = svc.getRecommendedAllocation("house", 3);
      const stocks = allocs.find((a) => a.assetClass === "stocks");
      // moderate has 50% stocks
      expect(stocks!.percent).toBe(50);
    });

    it("returns conservative allocation for 1-year goal with no risk override", () => {
      const allocs = svc.getRecommendedAllocation("vacation", 1);
      const bonds = allocs.find((a) => a.assetClass === "bonds");
      expect(bonds!.percent).toBe(60);
    });

    it("uses goal type default risk for >5 year goal with no risk override", () => {
      // retirement default = aggressive
      const allocs = svc.getRecommendedAllocation("retirement", 10);
      const stocks = allocs.find((a) => a.assetClass === "stocks");
      expect(stocks!.percent).toBe(80); // aggressive = 80% stocks
    });

    it("returns aggressive allocation when explicitly requested with long timeline", () => {
      const allocs = svc.getRecommendedAllocation("retirement", 20, "aggressive");
      const stocks = allocs.find((a) => a.assetClass === "stocks");
      expect(stocks!.percent).toBe(80);
    });

    it("allocation percentages sum to 100 for all risk levels", () => {
      const risks: RiskTolerance[] = ["conservative", "moderate", "aggressive"];
      for (const risk of risks) {
        const allocs = svc.getRecommendedAllocation("custom", 10, risk);
        const total = allocs.reduce((s, a) => s + a.percent, 0);
        expect(total).toBe(100);
      }
    });

    it("returns non-empty array for all goal types at 5-year horizon", () => {
      const goalTypes: GoalType[] = [
        "retirement", "house", "education", "emergency",
        "vacation", "car", "wedding", "custom",
      ];
      for (const goalType of goalTypes) {
        expect(svc.getRecommendedAllocation(goalType, 5).length).toBeGreaterThan(0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // calculateGlidePath
  // --------------------------------------------------------------------------

  describe("calculateGlidePath", () => {
    it("returns aggressive allocation at start (<25% progress)", () => {
      // currentYear=0, totalYears=20 → 0% progress → aggressive
      const allocs = svc.calculateGlidePath("retirement", 20, 0);
      const stocks = allocs.find((a) => a.assetClass === "stocks");
      expect(stocks!.percent).toBe(80);
    });

    it("returns moderate allocation at 25-50% progress", () => {
      // currentYear=6, totalYears=20 → 30% progress → moderate
      const allocs = svc.calculateGlidePath("retirement", 20, 6);
      const stocks = allocs.find((a) => a.assetClass === "stocks");
      expect(stocks!.percent).toBe(50);
    });

    it("returns blended allocation at 50-75% progress", () => {
      // currentYear=12, totalYears=20 → 60% progress → blend
      const allocs = svc.calculateGlidePath("retirement", 20, 12);
      // blended should have stocks somewhere between 25 and 50
      const stocks = allocs.find((a) => a.assetClass === "stocks");
      expect(stocks!.percent).toBeGreaterThanOrEqual(25);
      expect(stocks!.percent).toBeLessThanOrEqual(50);
    });

    it("returns conservative allocation at >=75% progress", () => {
      // currentYear=16, totalYears=20 → 80% progress → conservative
      const allocs = svc.calculateGlidePath("retirement", 20, 16);
      const bonds = allocs.find((a) => a.assetClass === "bonds");
      expect(bonds!.percent).toBe(60);
    });

    it("returns non-empty array for all goal types at 0 progress", () => {
      const goalTypes: GoalType[] = ["retirement", "house", "education", "emergency"];
      for (const goalType of goalTypes) {
        expect(svc.calculateGlidePath(goalType, 10, 0).length).toBeGreaterThan(0);
      }
    });

    it("handles zero totalYears without throwing", () => {
      // edge: currentYear=0, totalYears=0 → 0/0 → NaN% → falls to aggressive branch
      expect(() => svc.calculateGlidePath("emergency", 0, 0)).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // calculateProjection
  // --------------------------------------------------------------------------

  describe("calculateProjection", () => {
    it("returns isOnTrack=true when projected amount exceeds target", () => {
      // Large contribution relative to small target
      const proj = svc.calculateProjection(
        10_000,
        1_000,
        15_000,
        futureDate(5),
      );
      expect(proj.isOnTrack).toBe(true);
    });

    it("returns isOnTrack=false and provides shortfallAmount when behind", () => {
      // Zero contributions toward a very large target
      const proj = svc.calculateProjection(100, 0, 1_000_000, futureDate(2));
      expect(proj.isOnTrack).toBe(false);
      expect(proj.shortfallAmount).toBeDefined();
      expect(proj.shortfallAmount!).toBeGreaterThan(0);
    });

    it("optimistic scenario is greater than expected which is greater than pessimistic", () => {
      const proj = svc.calculateProjection(5_000, 200, 50_000, futureDate(10));
      expect(proj.scenarios.optimistic).toBeGreaterThan(proj.scenarios.expected);
      expect(proj.scenarios.expected).toBeGreaterThan(proj.scenarios.pessimistic);
    });

    it("confidenceLevel is capped at 100", () => {
      const proj = svc.calculateProjection(
        500_000, 5_000, 1_000, futureDate(10),
      );
      expect(proj.confidenceLevel).toBeLessThanOrEqual(100);
    });

    it("confidenceLevel is >= 0", () => {
      const proj = svc.calculateProjection(0, 0, 1_000_000, futureDate(1));
      expect(proj.confidenceLevel).toBeGreaterThanOrEqual(0);
    });

    it("returns requiredMonthlyContribution as a positive number when on track", () => {
      const proj = svc.calculateProjection(0, 500, 10_000, futureDate(3));
      expect(proj.requiredMonthlyContribution).toBeGreaterThanOrEqual(0);
    });

    it("handles zero monthsRemaining (target date in past) gracefully", () => {
      const past = new Date(Date.now() - 1000);
      const proj = svc.calculateProjection(0, 100, 10_000, past);
      expect(proj.projectedAmount).toBeDefined();
    });

    it("returns projectedDate equal to targetDate", () => {
      const target = futureDate(5);
      const proj = svc.calculateProjection(1000, 100, 50_000, target);
      expect(proj.projectedDate.getTime()).toBe(target.getTime());
    });

    it("returns currentAmount matching input", () => {
      const proj = svc.calculateProjection(12_345, 500, 100_000, futureDate(5));
      expect(proj.currentAmount).toBe(12_345);
    });

    it("returns targetAmount matching input", () => {
      const proj = svc.calculateProjection(0, 100, 75_000, futureDate(5));
      expect(proj.targetAmount).toBe(75_000);
    });

    it("uses custom expectedReturn and volatility", () => {
      const projDefault = svc.calculateProjection(0, 200, 50_000, futureDate(10));
      const projHighReturn = svc.calculateProjection(
        0, 200, 50_000, futureDate(10), 0.12, 0.2,
      );
      expect(projHighReturn.scenarios.expected).toBeGreaterThan(
        projDefault.scenarios.expected,
      );
    });

    it("does not throw for zero currentAmount and zero contribution", () => {
      expect(() =>
        svc.calculateProjection(0, 0, 1000, futureDate(3)),
      ).not.toThrow();
    });

    it("shortfallAmount is undefined when on track", () => {
      const proj = svc.calculateProjection(
        100_000, 1_000, 10_000, futureDate(5),
      );
      expect(proj.shortfallAmount).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // createGoal (DB path — mocked)
  // --------------------------------------------------------------------------

  describe("createGoal", () => {
    it("returns null when supabase insert returns an error", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "db error" },
      });
      const result = await svc.createGoal("user-1", {
        name: "Test Goal",
        type: "retirement",
        targetAmount: 100_000,
        targetDate: futureDate(10),
      });
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // getGoals (DB path — mocked)
  // --------------------------------------------------------------------------

  describe("getGoals", () => {
    it("returns empty array when supabase returns error", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: "db error" },
      });
      const goals = await svc.getGoals("user-1");
      expect(goals).toEqual([]);
    });

    it("returns empty array when supabase returns empty data", async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });
      const goals = await svc.getGoals("user-1");
      expect(goals).toEqual([]);
    });
  });
});
