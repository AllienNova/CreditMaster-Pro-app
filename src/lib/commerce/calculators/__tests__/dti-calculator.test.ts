/**
 * DTI Calculator Tests
 */

import { calculateDTI, type DTIResult } from "../dti-calculator";

describe("calculateDTI", () => {
  // ===========================================================================
  // Rating bands
  // ===========================================================================

  describe("rating bands", () => {
    it("rates <20% as excellent", () => {
      const result = calculateDTI(10_000, [{ category: "Housing", amount: 1_500 }]);
      expect(result.ratio).toBeCloseTo(0.15);
      expect(result.rating).toBe("excellent");
    });

    it("rates exactly 20% as good (boundary is exclusive on excellent side)", () => {
      const result = calculateDTI(5_000, [{ category: "Housing", amount: 1_000 }]);
      expect(result.ratio).toBeCloseTo(0.2);
      expect(result.rating).toBe("good");
    });

    it("rates 20–35% as good", () => {
      const result = calculateDTI(5_000, [{ category: "Housing", amount: 1_400 }]);
      expect(result.ratio).toBeCloseTo(0.28);
      expect(result.rating).toBe("good");
    });

    it("rates exactly 35% as fair", () => {
      const result = calculateDTI(4_000, [{ category: "Housing", amount: 1_400 }]);
      expect(result.ratio).toBeCloseTo(0.35);
      expect(result.rating).toBe("fair");
    });

    it("rates 35–43% as fair", () => {
      const result = calculateDTI(5_000, [{ category: "Housing", amount: 2_000 }]);
      expect(result.ratio).toBeCloseTo(0.4);
      expect(result.rating).toBe("fair");
    });

    it("rates exactly 43% as high", () => {
      const result = calculateDTI(10_000, [{ category: "Housing", amount: 4_300 }]);
      expect(result.ratio).toBeCloseTo(0.43);
      expect(result.rating).toBe("high");
    });

    it("rates 43–50% as high", () => {
      const result = calculateDTI(10_000, [{ category: "Housing", amount: 4_700 }]);
      expect(result.ratio).toBeCloseTo(0.47);
      expect(result.rating).toBe("high");
    });

    it("rates exactly 50% as high (boundary inclusive)", () => {
      const result = calculateDTI(10_000, [{ category: "Housing", amount: 5_000 }]);
      expect(result.ratio).toBeCloseTo(0.5);
      expect(result.rating).toBe("high");
    });

    it("rates >50% as very_high", () => {
      const result = calculateDTI(10_000, [{ category: "Housing", amount: 6_000 }]);
      expect(result.ratio).toBeCloseTo(0.6);
      expect(result.rating).toBe("very_high");
    });
  });

  // ===========================================================================
  // Zero income edge case
  // ===========================================================================

  describe("edge cases", () => {
    it("handles zero income gracefully", () => {
      const result = calculateDTI(0, [{ category: "Housing", amount: 500 }]);
      expect(result.rating).toBe("very_high");
      expect(result.ratio).toBe(1);
      expect(result.monthlyIncome).toBe(0);
    });

    it("handles negative income the same as zero", () => {
      const result = calculateDTI(-1_000, [{ category: "Housing", amount: 500 }]);
      expect(result.rating).toBe("very_high");
    });

    it("returns zero ratio when all debts are zero", () => {
      const result = calculateDTI(5_000, [
        { category: "Housing", amount: 0 },
        { category: "Auto", amount: 0 },
      ]);
      expect(result.ratio).toBe(0);
      expect(result.rating).toBe("excellent");
      expect(result.breakdown).toHaveLength(0);
    });

    it("filters out zero-amount debt entries from breakdown", () => {
      const result = calculateDTI(5_000, [
        { category: "Housing", amount: 1_000 },
        { category: "Auto", amount: 0 },
        { category: "Student Loans", amount: 200 },
      ]);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown.map((d) => d.category)).toEqual(
        expect.arrayContaining(["Housing", "Student Loans"]),
      );
    });
  });

  // ===========================================================================
  // Breakdown calculation
  // ===========================================================================

  describe("breakdown calculation", () => {
    it("correctly sums multiple debt categories", () => {
      const debts = [
        { category: "Housing", amount: 1_200 },
        { category: "Auto", amount: 400 },
        { category: "Student Loans", amount: 300 },
      ];
      const result = calculateDTI(8_000, debts);
      expect(result.totalMonthlyDebt).toBe(1_900);
      expect(result.ratio).toBeCloseTo(1_900 / 8_000);
    });

    it("returns correct breakdown entries", () => {
      const debts = [
        { category: "Housing", amount: 1_500 },
        { category: "Auto", amount: 350 },
      ];
      const result = calculateDTI(10_000, debts);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0]).toEqual({ category: "Housing", amount: 1_500 });
      expect(result.breakdown[1]).toEqual({ category: "Auto", amount: 350 });
    });

    it("preserves monthlyIncome in the result", () => {
      const result = calculateDTI(7_500, [{ category: "Housing", amount: 1_000 }]);
      expect(result.monthlyIncome).toBe(7_500);
    });
  });

  // ===========================================================================
  // Recommendation text
  // ===========================================================================

  describe("recommendation text", () => {
    it.each<[DTIResult["rating"], number, number]>([
      ["excellent", 10_000, 1_000],
      ["good", 5_000, 1_200],
      ["fair", 5_000, 2_000],
      ["high", 10_000, 4_600],
      ["very_high", 10_000, 6_000],
    ])("provides a recommendation for %s rating", (expectedRating, income, debt) => {
      const result = calculateDTI(income, [{ category: "Housing", amount: debt }]);
      expect(result.rating).toBe(expectedRating);
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });
});
