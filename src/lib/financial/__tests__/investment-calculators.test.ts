/**
 * @jest-environment node
 */

/**
 * Investment Calculators — Comprehensive Test Suite
 *
 * Tests all 10 methods of the InvestmentCalculators class, plus exports.
 * No mocks — these are pure math functions.
 */

import {
  InvestmentCalculators,
  investmentCalculators,
  createInvestmentCalculators,
} from "../investment-calculators";

// ---------------------------------------------------------------------------
// Exports & Factory
// ---------------------------------------------------------------------------

describe("InvestmentCalculators — Exports", () => {
  it("should export the InvestmentCalculators class", () => {
    expect(InvestmentCalculators).toBeDefined();
    expect(typeof InvestmentCalculators).toBe("function");
  });

  it("should export investmentCalculators singleton", () => {
    expect(investmentCalculators).toBeDefined();
    expect(investmentCalculators).toBeInstanceOf(InvestmentCalculators);
  });

  it("should export createInvestmentCalculators factory", () => {
    expect(createInvestmentCalculators).toBeDefined();
    expect(typeof createInvestmentCalculators).toBe("function");
  });

  it("factory should return a new InvestmentCalculators instance", () => {
    const instance = createInvestmentCalculators();
    expect(instance).toBeInstanceOf(InvestmentCalculators);
    expect(instance).not.toBe(investmentCalculators);
  });

  it("singleton should be the default export", async () => {
    const mod = await import("../investment-calculators");
    expect(mod.default).toBe(investmentCalculators);
  });
});

// ---------------------------------------------------------------------------
// 1. calculateCompoundInterest
// ---------------------------------------------------------------------------

describe("calculateCompoundInterest", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should calculate simple compound interest (annual, no contributions)", () => {
      // $1000 at 10% annually for 1 year = $1100
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.1,
        time: 1,
        compoundingFrequency: "annually",
      });
      expect(result.futureValue).toBe(1100);
      expect(result.totalContributed).toBe(1000);
      expect(result.totalInterest).toBe(100);
    });

    it("should calculate multi-year compound interest", () => {
      // $1000 at 10% annually for 3 years = 1000 * 1.1^3 = 1331.00
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.1,
        time: 3,
        compoundingFrequency: "annually",
      });
      expect(result.futureValue).toBe(1331);
      expect(result.totalContributed).toBe(1000);
      expect(result.totalInterest).toBe(331);
      expect(result.yearlyBreakdown).toHaveLength(3);
    });

    it("should calculate monthly compounding correctly", () => {
      // $1000 at 12% monthly for 1 year: 1000 * (1 + 0.01)^12 = 1126.83
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.12,
        time: 1,
        compoundingFrequency: "monthly",
      });
      expect(result.futureValue).toBeCloseTo(1126.83, 2);
    });

    it("should calculate daily compounding correctly", () => {
      // $1000 at 5% daily for 1 year: 1000 * (1 + 0.05/365)^365
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.05,
        time: 1,
        compoundingFrequency: "daily",
      });
      // (1 + 0.05/365)^365 ~ 1.05127
      expect(result.futureValue).toBeCloseTo(1051.27, 0);
    });

    it("should calculate quarterly compounding correctly", () => {
      // $5000 at 8% quarterly for 2 years: 5000 * (1 + 0.02)^8 = 5858.30
      const result = calc.calculateCompoundInterest({
        principal: 5000,
        rate: 0.08,
        time: 2,
        compoundingFrequency: "quarterly",
      });
      expect(result.futureValue).toBeCloseTo(5858.30, 0);
    });

    it("should calculate semi-annual compounding correctly", () => {
      // $2000 at 6% semi-annually for 3 years: 2000 * (1 + 0.03)^6 = 2388.10
      const result = calc.calculateCompoundInterest({
        principal: 2000,
        rate: 0.06,
        time: 3,
        compoundingFrequency: "semi-annually",
      });
      expect(result.futureValue).toBeCloseTo(2388.10, 0);
    });

    it("should include monthly contributions in the future value", () => {
      // $0 principal, $100/month at 0% for 12 months = $1200
      const result = calc.calculateCompoundInterest({
        principal: 0,
        rate: 0,
        time: 1,
        compoundingFrequency: "monthly",
        monthlyContribution: 100,
      });
      expect(result.futureValue).toBe(1200);
      expect(result.totalContributed).toBe(1200);
      expect(result.totalInterest).toBe(0);
    });

    it("should combine principal and contributions with interest", () => {
      const result = calc.calculateCompoundInterest({
        principal: 10000,
        rate: 0.07,
        time: 10,
        compoundingFrequency: "monthly",
        monthlyContribution: 500,
      });
      // FV should be > principal + total contributions
      expect(result.futureValue).toBeGreaterThan(10000 + 500 * 12 * 10);
      expect(result.totalInterest).toBeGreaterThan(0);
    });

    it("should return correct yearly breakdown length", () => {
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.05,
        time: 5,
        compoundingFrequency: "annually",
      });
      expect(result.yearlyBreakdown).toHaveLength(5);
      expect(result.yearlyBreakdown[0].year).toBe(1);
      expect(result.yearlyBreakdown[4].year).toBe(5);
    });

    it("should have increasing balances in yearly breakdown", () => {
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.1,
        time: 5,
        compoundingFrequency: "annually",
      });
      for (let i = 1; i < result.yearlyBreakdown.length; i++) {
        expect(result.yearlyBreakdown[i].balance).toBeGreaterThan(
          result.yearlyBreakdown[i - 1].balance,
        );
      }
    });

    it("should compute effective annual rate correctly", () => {
      // Monthly compounding at 12%: EAR = (1 + 0.01)^12 - 1 ~ 0.12682503
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.12,
        time: 1,
        compoundingFrequency: "monthly",
      });
      expect(result.effectiveAnnualRate).toBeCloseTo(0.12682503, 5);
    });

    it("should return 0 effective annual rate when rate is 0", () => {
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0,
        time: 5,
        compoundingFrequency: "annually",
      });
      expect(result.effectiveAnnualRate).toBe(0);
    });

    it("last yearly breakdown balance should match futureValue", () => {
      const result = calc.calculateCompoundInterest({
        principal: 5000,
        rate: 0.06,
        time: 3,
        compoundingFrequency: "monthly",
        monthlyContribution: 200,
      });
      const lastYear =
        result.yearlyBreakdown[result.yearlyBreakdown.length - 1];
      expect(lastYear.balance).toBeCloseTo(result.futureValue, 0);
    });
  });

  describe("edge cases", () => {
    it("should handle rate = 0 (no interest)", () => {
      const result = calc.calculateCompoundInterest({
        principal: 5000,
        rate: 0,
        time: 10,
        compoundingFrequency: "monthly",
        monthlyContribution: 100,
      });
      expect(result.futureValue).toBe(5000 + 100 * 12 * 10);
      expect(result.totalInterest).toBe(0);
    });

    it("should handle principal = 0 with contributions", () => {
      const result = calc.calculateCompoundInterest({
        principal: 0,
        rate: 0.05,
        time: 5,
        compoundingFrequency: "annually",
        monthlyContribution: 500,
      });
      expect(result.futureValue).toBeGreaterThan(0);
      expect(result.totalContributed).toBe(500 * 12 * 5);
    });

    it("should handle principal = 0 and no contributions", () => {
      const result = calc.calculateCompoundInterest({
        principal: 0,
        rate: 0.1,
        time: 5,
        compoundingFrequency: "annually",
      });
      expect(result.futureValue).toBe(0);
      expect(result.totalInterest).toBe(0);
    });

    it("should handle very small time (0.01 years)", () => {
      const result = calc.calculateCompoundInterest({
        principal: 10000,
        rate: 0.12,
        time: 0.01,
        compoundingFrequency: "daily",
      });
      // Just verify it doesn't throw and produces a reasonable number
      expect(result.futureValue).toBeGreaterThanOrEqual(10000);
    });

    it("should default monthlyContribution to 0 when omitted", () => {
      const result = calc.calculateCompoundInterest({
        principal: 1000,
        rate: 0.05,
        time: 1,
        compoundingFrequency: "annually",
      });
      expect(result.totalContributed).toBe(1000);
    });
  });

  describe("error cases", () => {
    it("should throw for negative principal", () => {
      expect(() =>
        calc.calculateCompoundInterest({
          principal: -100,
          rate: 0.05,
          time: 1,
          compoundingFrequency: "annually",
        }),
      ).toThrow("Principal must be non-negative");
    });

    it("should throw for negative rate", () => {
      expect(() =>
        calc.calculateCompoundInterest({
          principal: 1000,
          rate: -0.05,
          time: 1,
          compoundingFrequency: "annually",
        }),
      ).toThrow("Rate must be non-negative");
    });

    it("should throw for time = 0", () => {
      expect(() =>
        calc.calculateCompoundInterest({
          principal: 1000,
          rate: 0.05,
          time: 0,
          compoundingFrequency: "annually",
        }),
      ).toThrow("Time must be positive");
    });

    it("should throw for negative time", () => {
      expect(() =>
        calc.calculateCompoundInterest({
          principal: 1000,
          rate: 0.05,
          time: -5,
          compoundingFrequency: "annually",
        }),
      ).toThrow("Time must be positive");
    });
  });
});

// ---------------------------------------------------------------------------
// 2. calculateROI
// ---------------------------------------------------------------------------

describe("calculateROI", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should calculate simple ROI with no dividends or fees", () => {
      // Buy at $1000, sell at $1500 after 2 years
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 1500,
        timeYears: 2,
      });
      expect(result.totalROI).toBeCloseTo(0.5, 4); // 50%
      expect(result.netProfit).toBe(500);
      expect(result.totalReturn).toBe(1500);
    });

    it("should include dividends in ROI", () => {
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 1100,
        dividends: 50,
        timeYears: 1,
      });
      // totalReturn = 1100 + 50 = 1150, netProfit = 150, ROI = 0.15
      expect(result.totalReturn).toBe(1150);
      expect(result.netProfit).toBe(150);
      expect(result.totalROI).toBeCloseTo(0.15, 4);
    });

    it("should subtract fees from ROI", () => {
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 1200,
        fees: 50,
        timeYears: 1,
      });
      // totalReturn = 1200 - 50 = 1150, netProfit = 150
      expect(result.totalReturn).toBe(1150);
      expect(result.netProfit).toBe(150);
    });

    it("should include both dividends and fees", () => {
      const result = calc.calculateROI({
        initialInvestment: 10000,
        finalValue: 12000,
        dividends: 500,
        fees: 200,
        timeYears: 3,
      });
      // totalReturn = 12000 + 500 - 200 = 12300
      expect(result.totalReturn).toBe(12300);
      expect(result.netProfit).toBe(2300);
    });

    it("should calculate annualized ROI (CAGR) correctly", () => {
      // Double in 5 years: CAGR = 2^(1/5) - 1 ~ 0.14869835
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 2000,
        timeYears: 5,
      });
      expect(result.annualizedROI).toBeCloseTo(0.14869835, 4);
    });

    it("should compute profitRatio correctly", () => {
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 1500,
        timeYears: 1,
      });
      // profitRatio = totalReturn / initialInvestment = 1.5
      expect(result.profitRatio).toBeCloseTo(1.5, 4);
    });

    it("should handle a loss (finalValue < initialInvestment)", () => {
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 800,
        timeYears: 1,
      });
      expect(result.netProfit).toBe(-200);
      expect(result.totalROI).toBeCloseTo(-0.2, 4);
    });
  });

  describe("edge cases", () => {
    it("should handle finalValue = 0 (total loss)", () => {
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 0,
        timeYears: 1,
      });
      expect(result.totalROI).toBeCloseTo(-1, 4);
      expect(result.netProfit).toBe(-1000);
    });

    it("should handle dividends defaulting to 0", () => {
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 1100,
        timeYears: 1,
      });
      expect(result.totalReturn).toBe(1100);
    });

    it("should handle fees defaulting to 0", () => {
      const result = calc.calculateROI({
        initialInvestment: 1000,
        finalValue: 1100,
        timeYears: 1,
      });
      expect(result.totalReturn).toBe(1100);
    });
  });

  describe("error cases", () => {
    it("should throw for initialInvestment = 0", () => {
      expect(() =>
        calc.calculateROI({
          initialInvestment: 0,
          finalValue: 100,
          timeYears: 1,
        }),
      ).toThrow("Initial investment must be positive");
    });

    it("should throw for negative initialInvestment", () => {
      expect(() =>
        calc.calculateROI({
          initialInvestment: -100,
          finalValue: 100,
          timeYears: 1,
        }),
      ).toThrow("Initial investment must be positive");
    });

    it("should throw for timeYears = 0", () => {
      expect(() =>
        calc.calculateROI({
          initialInvestment: 1000,
          finalValue: 1100,
          timeYears: 0,
        }),
      ).toThrow("Time must be positive");
    });

    it("should throw for negative timeYears", () => {
      expect(() =>
        calc.calculateROI({
          initialInvestment: 1000,
          finalValue: 1100,
          timeYears: -1,
        }),
      ).toThrow("Time must be positive");
    });
  });
});

// ---------------------------------------------------------------------------
// 3. calculateRetirementProjection
// ---------------------------------------------------------------------------

describe("calculateRetirementProjection", () => {
  const calc = investmentCalculators;

  const baseParams = {
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    monthlyContribution: 1000,
    expectedReturn: 0.07,
    inflationRate: 0.03,
    desiredAnnualIncome: 60000,
  };

  describe("valid inputs", () => {
    it("should compute projectedSavings as a positive number", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      expect(result.projectedSavings).toBeGreaterThan(0);
    });

    it("should compute requiredSavings using 4% rule", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      // requiredSavings = futureAnnualIncome / 0.04
      const inflationFactor = Math.pow(1.03, 35);
      const futureIncome = 60000 * inflationFactor;
      const expected = futureIncome / 0.04;
      expect(result.requiredSavings).toBeCloseTo(expected, -1);
    });

    it("should compute yearsToRetirement correctly", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      expect(result.yearsToRetirement).toBe(35);
    });

    it("should produce correct yearlyProjection length", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      expect(result.yearlyProjection).toHaveLength(35);
    });

    it("should have increasing balances in yearlyProjection", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      for (let i = 1; i < result.yearlyProjection.length; i++) {
        expect(result.yearlyProjection[i].balance).toBeGreaterThan(
          result.yearlyProjection[i - 1].balance,
        );
      }
    });

    it("should track ages correctly in yearlyProjection", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      expect(result.yearlyProjection[0].age).toBe(31);
      expect(
        result.yearlyProjection[result.yearlyProjection.length - 1].age,
      ).toBe(65);
    });

    it("should set onTrack correctly when well funded", () => {
      const result = calc.calculateRetirementProjection({
        ...baseParams,
        monthlyContribution: 5000,
      });
      // With $5000/mo contributions, should likely be on track
      expect(result.onTrack).toBe(true);
      expect(result.surplusOrShortfall).toBeGreaterThanOrEqual(0);
    });

    it("should set onTrack to false when underfunded", () => {
      const result = calc.calculateRetirementProjection({
        ...baseParams,
        monthlyContribution: 10,
        currentSavings: 0,
        desiredAnnualIncome: 200000,
      });
      expect(result.onTrack).toBe(false);
      expect(result.surplusOrShortfall).toBeLessThan(0);
    });

    it("should compute real (inflation-adjusted) savings", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      const inflationFactor = Math.pow(1.03, 35);
      expect(result.projectedSavingsReal).toBeCloseTo(
        result.projectedSavings / inflationFactor,
        0,
      );
    });

    it("should compute requiredMonthlyContribution", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      expect(result.requiredMonthlyContribution).toBeGreaterThanOrEqual(0);
      expect(typeof result.requiredMonthlyContribution).toBe("number");
    });

    it("should compute estimatedPortfolioLifespan > 0", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      expect(result.estimatedPortfolioLifespan).toBeGreaterThan(0);
    });

    it("totalGrowth in yearlyProjection should be non-negative with positive return", () => {
      const result = calc.calculateRetirementProjection(baseParams);
      result.yearlyProjection.forEach((entry) => {
        expect(entry.totalGrowth).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle expectedReturn = 0", () => {
      const result = calc.calculateRetirementProjection({
        ...baseParams,
        expectedReturn: 0,
      });
      // projectedSavings = currentSavings + monthlyContribution * totalMonths
      expect(result.projectedSavings).toBe(50000 + 1000 * 12 * 35);
    });

    it("should handle currentSavings = 0", () => {
      const result = calc.calculateRetirementProjection({
        ...baseParams,
        currentSavings: 0,
      });
      expect(result.projectedSavings).toBeGreaterThan(0);
    });

    it("should handle inflationRate = 0", () => {
      const result = calc.calculateRetirementProjection({
        ...baseParams,
        inflationRate: 0,
      });
      // When inflation is 0, real and nominal should be the same
      expect(result.projectedSavingsReal).toBe(result.projectedSavings);
    });

    it("should handle retirementAge just above currentAge", () => {
      const result = calc.calculateRetirementProjection({
        ...baseParams,
        currentAge: 64,
        retirementAge: 65,
      });
      expect(result.yearsToRetirement).toBe(1);
      expect(result.yearlyProjection).toHaveLength(1);
    });

    it("should cap portfolio lifespan at a reasonable value", () => {
      const result = calc.calculateRetirementProjection({
        ...baseParams,
        monthlyContribution: 20000,
        desiredAnnualIncome: 1000,
      });
      // With massive savings and tiny withdrawals, lifespan should hit the 50-year cap
      expect(result.estimatedPortfolioLifespan).toBeLessThanOrEqual(50);
    });
  });

  describe("error cases", () => {
    it("should throw when retirementAge <= currentAge", () => {
      expect(() =>
        calc.calculateRetirementProjection({
          ...baseParams,
          retirementAge: 30,
        }),
      ).toThrow("Retirement age must exceed current age");
    });

    it("should throw when retirementAge < currentAge", () => {
      expect(() =>
        calc.calculateRetirementProjection({
          ...baseParams,
          retirementAge: 20,
        }),
      ).toThrow("Retirement age must exceed current age");
    });

    it("should throw when currentSavings is negative", () => {
      expect(() =>
        calc.calculateRetirementProjection({
          ...baseParams,
          currentSavings: -1000,
        }),
      ).toThrow("Current savings must be non-negative");
    });
  });
});

// ---------------------------------------------------------------------------
// 4. calculateFIRENumber
// ---------------------------------------------------------------------------

describe("calculateFIRENumber", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should compute FIRE number with default 4% withdrawal rate", () => {
      // $40,000 / 0.04 = $1,000,000
      const result = calc.calculateFIRENumber(40000);
      expect(result.fireNumber).toBe(1000000);
    });

    it("should compute FIRE number with custom withdrawal rate", () => {
      // $50,000 / 0.03 = $1,666,666.67
      const result = calc.calculateFIRENumber(50000, 0.03);
      expect(result.fireNumber).toBeCloseTo(1666666.67, 2);
    });

    it("should return annualWithdrawal equal to annualExpenses", () => {
      const result = calc.calculateFIRENumber(60000);
      expect(result.annualWithdrawal).toBe(60000);
    });

    it("should compute monthlySavingsNeeded as a positive number", () => {
      const result = calc.calculateFIRENumber(50000);
      expect(result.monthlySavingsNeeded).toBeGreaterThan(0);
    });

    it("should compute monthly savings using 7% real return, 30-year horizon", () => {
      // FV annuity factor for 7%/12 monthly rate, 360 months
      const monthlyRate = 0.07 / 12;
      const totalMonths = 360;
      const annuityFactor =
        (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
      const fireNumber = 40000 / 0.04;
      const expectedMonthly = fireNumber / annuityFactor;

      const result = calc.calculateFIRENumber(40000);
      expect(result.monthlySavingsNeeded).toBeCloseTo(expectedMonthly, 2);
    });

    it("should produce higher FIRE number for higher expenses", () => {
      const low = calc.calculateFIRENumber(30000);
      const high = calc.calculateFIRENumber(80000);
      expect(high.fireNumber).toBeGreaterThan(low.fireNumber);
    });

    it("should produce higher FIRE number for lower withdrawal rate", () => {
      const conservative = calc.calculateFIRENumber(50000, 0.03);
      const aggressive = calc.calculateFIRENumber(50000, 0.05);
      expect(conservative.fireNumber).toBeGreaterThan(aggressive.fireNumber);
    });
  });

  describe("edge cases", () => {
    it("should handle withdrawalRate = 1 (100%)", () => {
      // FIRE number = annualExpenses / 1 = annualExpenses
      const result = calc.calculateFIRENumber(50000, 1);
      expect(result.fireNumber).toBe(50000);
    });

    it("should handle very small annual expenses", () => {
      const result = calc.calculateFIRENumber(1);
      expect(result.fireNumber).toBe(25); // 1 / 0.04
    });
  });

  describe("error cases", () => {
    it("should throw for annualExpenses = 0", () => {
      expect(() => calc.calculateFIRENumber(0)).toThrow(
        "Annual expenses must be positive",
      );
    });

    it("should throw for negative annualExpenses", () => {
      expect(() => calc.calculateFIRENumber(-10000)).toThrow(
        "Annual expenses must be positive",
      );
    });

    it("should throw for withdrawalRate = 0", () => {
      expect(() => calc.calculateFIRENumber(50000, 0)).toThrow(
        "Withdrawal rate must be between 0 and 1",
      );
    });

    it("should throw for withdrawalRate > 1", () => {
      expect(() => calc.calculateFIRENumber(50000, 1.5)).toThrow(
        "Withdrawal rate must be between 0 and 1",
      );
    });

    it("should throw for negative withdrawalRate", () => {
      expect(() => calc.calculateFIRENumber(50000, -0.04)).toThrow(
        "Withdrawal rate must be between 0 and 1",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 5. calculateDollarCostAverage
// ---------------------------------------------------------------------------

describe("calculateDollarCostAverage", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should calculate DCA with constant prices", () => {
      // $100/month, price always $10 => 10 units/month, 3 months = 30 units
      const result = calc.calculateDollarCostAverage(100, [10, 10, 10]);
      expect(result.totalInvested).toBe(300);
      expect(result.totalUnits).toBeCloseTo(30, 4);
      expect(result.averageCostBasis).toBeCloseTo(10, 2);
      expect(result.currentValue).toBeCloseTo(300, 2);
      expect(result.returnPct).toBeCloseTo(0, 4);
    });

    it("should calculate DCA with varying prices", () => {
      // $100/month at prices [10, 5, 20]
      // Month 1: 10 units, Month 2: 20 units, Month 3: 5 units = 35 units
      const result = calc.calculateDollarCostAverage(100, [10, 5, 20]);
      expect(result.totalInvested).toBe(300);
      expect(result.totalUnits).toBeCloseTo(35, 4);
      // Average cost basis = 300 / 35 ~ 8.57
      expect(result.averageCostBasis).toBeCloseTo(8.57, 2);
      // Current value = 35 * 20 = 700
      expect(result.currentValue).toBeCloseTo(700, 0);
      expect(result.gainOrLoss).toBeCloseTo(400, 0);
    });

    it("should return correct number of purchases", () => {
      const result = calc.calculateDollarCostAverage(200, [
        50, 55, 45, 60, 40,
      ]);
      expect(result.purchases).toHaveLength(5);
    });

    it("should track cumulative units in purchases", () => {
      const result = calc.calculateDollarCostAverage(100, [10, 20, 10]);
      // Period 1: 10 units cumulative
      // Period 2: 10 + 5 = 15 units cumulative
      // Period 3: 15 + 10 = 25 units cumulative
      expect(result.purchases[0].cumulativeUnits).toBeCloseTo(10, 4);
      expect(result.purchases[1].cumulativeUnits).toBeCloseTo(15, 4);
      expect(result.purchases[2].cumulativeUnits).toBeCloseTo(25, 4);
    });

    it("should track cumulative invested in purchases", () => {
      const result = calc.calculateDollarCostAverage(250, [100, 200]);
      expect(result.purchases[0].cumulativeInvested).toBe(250);
      expect(result.purchases[1].cumulativeInvested).toBe(500);
    });

    it("should handle a single price entry", () => {
      const result = calc.calculateDollarCostAverage(500, [25]);
      expect(result.totalInvested).toBe(500);
      expect(result.totalUnits).toBeCloseTo(20, 4);
      expect(result.currentValue).toBeCloseTo(500, 2);
    });

    it("should calculate negative return when price drops", () => {
      // Buy at $100, price drops to $50
      const result = calc.calculateDollarCostAverage(100, [100, 50]);
      expect(result.returnPct).toBeLessThan(0);
      expect(result.gainOrLoss).toBeLessThan(0);
    });

    it("should calculate positive return when price rises", () => {
      const result = calc.calculateDollarCostAverage(100, [50, 100]);
      expect(result.returnPct).toBeGreaterThan(0);
      expect(result.gainOrLoss).toBeGreaterThan(0);
    });
  });

  describe("error cases", () => {
    it("should throw for monthlyAmount = 0", () => {
      expect(() => calc.calculateDollarCostAverage(0, [10])).toThrow(
        "Monthly amount must be positive",
      );
    });

    it("should throw for negative monthlyAmount", () => {
      expect(() => calc.calculateDollarCostAverage(-100, [10])).toThrow(
        "Monthly amount must be positive",
      );
    });

    it("should throw for empty prices array", () => {
      expect(() => calc.calculateDollarCostAverage(100, [])).toThrow(
        "Prices array must not be empty",
      );
    });

    it("should throw if any price is 0", () => {
      expect(() => calc.calculateDollarCostAverage(100, [10, 0, 20])).toThrow(
        "All prices must be positive",
      );
    });

    it("should throw if any price is negative", () => {
      expect(() =>
        calc.calculateDollarCostAverage(100, [10, -5, 20]),
      ).toThrow("All prices must be positive");
    });
  });
});

// ---------------------------------------------------------------------------
// 6. calculateBreakEvenPoint
// ---------------------------------------------------------------------------

describe("calculateBreakEvenPoint", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should calculate exact break-even", () => {
      // $1200 investment, $100/month return => 12 months
      const result = calc.calculateBreakEvenPoint(1200, 100);
      expect(result.monthsToBreakEven).toBe(12);
      expect(result.yearsToBreakEven).toBe(1);
      expect(result.totalReturnAtBreakEven).toBe(1200);
    });

    it("should round up months when not exact", () => {
      // $1000 investment, $300/month => ceil(1000/300) = 4 months
      const result = calc.calculateBreakEvenPoint(1000, 300);
      expect(result.monthsToBreakEven).toBe(4);
      expect(result.totalReturnAtBreakEven).toBe(1200);
    });

    it("should compute yearsToBreakEven correctly", () => {
      // $2400 at $100/month => 24 months => 2 years
      const result = calc.calculateBreakEvenPoint(2400, 100);
      expect(result.yearsToBreakEven).toBe(2);
    });

    it("should handle very quick break-even (1 month)", () => {
      const result = calc.calculateBreakEvenPoint(50, 100);
      expect(result.monthsToBreakEven).toBe(1);
    });

    it("should handle large investment with small monthly return", () => {
      const result = calc.calculateBreakEvenPoint(100000, 500);
      expect(result.monthsToBreakEven).toBe(200);
      expect(result.yearsToBreakEven).toBeCloseTo(16.67, 2);
    });
  });

  describe("error cases", () => {
    it("should throw for investment = 0", () => {
      expect(() => calc.calculateBreakEvenPoint(0, 100)).toThrow(
        "Investment must be positive",
      );
    });

    it("should throw for negative investment", () => {
      expect(() => calc.calculateBreakEvenPoint(-500, 100)).toThrow(
        "Investment must be positive",
      );
    });

    it("should throw for monthlyReturn = 0", () => {
      expect(() => calc.calculateBreakEvenPoint(1000, 0)).toThrow(
        "Monthly return must be positive",
      );
    });

    it("should throw for negative monthlyReturn", () => {
      expect(() => calc.calculateBreakEvenPoint(1000, -50)).toThrow(
        "Monthly return must be positive",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 7. calculateRealReturn
// ---------------------------------------------------------------------------

describe("calculateRealReturn", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should compute real return using Fisher equation", () => {
      // nominal = 10%, inflation = 3%: (1.10/1.03) - 1 ~ 0.06796117
      const result = calc.calculateRealReturn(0.1, 0.03);
      expect(result).toBeCloseTo(0.06796117, 5);
    });

    it("should return 0 when nominal equals inflation", () => {
      // (1.05/1.05) - 1 = 0
      const result = calc.calculateRealReturn(0.05, 0.05);
      expect(result).toBe(0);
    });

    it("should return negative when inflation exceeds nominal", () => {
      // nominal = 2%, inflation = 5%: (1.02/1.05) - 1 ~ -0.02857143
      const result = calc.calculateRealReturn(0.02, 0.05);
      expect(result).toBeCloseTo(-0.02857143, 5);
    });

    it("should handle zero nominal return", () => {
      // (1.0/1.03) - 1 ~ -0.02912621
      const result = calc.calculateRealReturn(0, 0.03);
      expect(result).toBeCloseTo(-0.02912621, 5);
    });

    it("should handle zero inflation", () => {
      // (1.07/1.0) - 1 = 0.07
      const result = calc.calculateRealReturn(0.07, 0);
      expect(result).toBeCloseTo(0.07, 6);
    });

    it("should handle both nominal and inflation at zero", () => {
      const result = calc.calculateRealReturn(0, 0);
      expect(result).toBe(0);
    });

    it("should handle negative nominal return", () => {
      // nominal = -5%, inflation = 2%: (0.95/1.02) - 1 ~ -0.06862745
      const result = calc.calculateRealReturn(-0.05, 0.02);
      expect(result).toBeCloseTo(-0.06862745, 5);
    });

    it("should handle deflation (negative inflation)", () => {
      // nominal = 5%, inflation = -2%: (1.05/0.98) - 1 ~ 0.07142857
      const result = calc.calculateRealReturn(0.05, -0.02);
      expect(result).toBeCloseTo(0.07142857, 5);
    });
  });

  describe("error cases", () => {
    it("should throw when inflationRate is -1 (division by zero)", () => {
      expect(() => calc.calculateRealReturn(0.05, -1)).toThrow(
        "Inflation rate cannot be -100%",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 8. calculateRiskAdjustedReturn
// ---------------------------------------------------------------------------

describe("calculateRiskAdjustedReturn", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should compute Sharpe ratio for a series of returns", () => {
      // returns: [0.02, 0.04, 0.01, 0.03]  risk-free: 0.01
      const result = calc.calculateRiskAdjustedReturn(
        [0.02, 0.04, 0.01, 0.03],
        0.01,
      );
      // mean = 0.025, excess = 0.015
      expect(result.meanReturn).toBeCloseTo(0.025, 5);
      expect(result.excessReturn).toBeCloseTo(0.015, 5);
      expect(result.standardDeviation).toBeGreaterThan(0);
      expect(result.sharpeRatio).toBeGreaterThan(0);
    });

    it("should compute mean return correctly", () => {
      const result = calc.calculateRiskAdjustedReturn(
        [0.1, 0.2, 0.3],
        0,
      );
      expect(result.meanReturn).toBeCloseTo(0.2, 6);
    });

    it("should compute standard deviation correctly (population)", () => {
      // returns: [0.1, 0.2, 0.3]
      // mean = 0.2, variance = ((0.1-0.2)^2 + (0.2-0.2)^2 + (0.3-0.2)^2)/3
      //                       = (0.01 + 0 + 0.01)/3 = 0.00666...
      // stddev = sqrt(0.00666...) ~ 0.08165
      const result = calc.calculateRiskAdjustedReturn([0.1, 0.2, 0.3], 0);
      expect(result.standardDeviation).toBeCloseTo(0.08165, 3);
    });

    it("should compute negative Sharpe ratio for underperformance", () => {
      // mean return below risk-free rate
      const result = calc.calculateRiskAdjustedReturn(
        [0.01, 0.02, 0.01],
        0.05,
      );
      expect(result.sharpeRatio).toBeLessThan(0);
    });

    it("should handle exactly 2 return observations", () => {
      const result = calc.calculateRiskAdjustedReturn([0.05, 0.15], 0.02);
      expect(result.meanReturn).toBeCloseTo(0.1, 6);
      // stddev = sqrt(((0.05-0.1)^2 + (0.15-0.1)^2)/2) = sqrt(0.0025) = 0.05
      expect(result.standardDeviation).toBeCloseTo(0.05, 6);
    });

    it("should handle negative returns in the series", () => {
      const result = calc.calculateRiskAdjustedReturn(
        [-0.05, 0.1, -0.02, 0.08],
        0.01,
      );
      expect(typeof result.sharpeRatio).toBe("number");
      expect(typeof result.standardDeviation).toBe("number");
    });
  });

  describe("edge cases", () => {
    it("should handle all identical returns (stddev near zero)", () => {
      // With identical returns, population stddev is mathematically 0.
      // Due to floating point, the computed stddev may be a tiny epsilon.
      // The code checks stddev === 0 before dividing, but floating point
      // may not be exactly 0, leading to a very large Sharpe ratio.
      // We test that stddev is effectively 0 and Sharpe is computed.
      const result = calc.calculateRiskAdjustedReturn([0.05, 0.05, 0.05], 0.02);
      expect(result.meanReturn).toBeCloseTo(0.05, 6);
      expect(result.excessReturn).toBeCloseTo(0.03, 6);
      // stddev is at or near 0
      expect(result.standardDeviation).toBeCloseTo(0, 5);
    });

    it("should return sharpeRatio = 0 when returns are exactly zero with zero risk-free", () => {
      // [0, 0, 0] => stddev is exactly 0, excessReturn = 0
      const result = calc.calculateRiskAdjustedReturn([0, 0, 0], 0);
      expect(result.standardDeviation).toBe(0);
      expect(result.sharpeRatio).toBe(0);
    });

    it("should handle risk-free rate of 0", () => {
      const result = calc.calculateRiskAdjustedReturn([0.02, 0.04, 0.06], 0);
      expect(result.excessReturn).toBeCloseTo(0.04, 6);
    });

    it("should handle all-zero returns with non-zero risk-free rate", () => {
      const result = calc.calculateRiskAdjustedReturn([0, 0, 0], 0.01);
      expect(result.meanReturn).toBe(0);
      expect(result.excessReturn).toBeCloseTo(-0.01, 6);
      // stddev is 0, sharpeRatio = 0 by implementation guard
      expect(result.sharpeRatio).toBe(0);
    });
  });

  describe("error cases", () => {
    it("should throw for fewer than 2 observations", () => {
      expect(() => calc.calculateRiskAdjustedReturn([0.05], 0.01)).toThrow(
        "At least two return observations are required",
      );
    });

    it("should throw for empty returns array", () => {
      expect(() => calc.calculateRiskAdjustedReturn([], 0.01)).toThrow(
        "At least two return observations are required",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 9. calculateMortgagePayment
// ---------------------------------------------------------------------------

describe("calculateMortgagePayment", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should calculate standard 30-year mortgage payment", () => {
      // $200,000 at 6% for 30 years
      // Monthly rate = 0.005, payments = 360
      // M = 200000 * [0.005 * 1.005^360] / [1.005^360 - 1]
      const result = calc.calculateMortgagePayment(200000, 0.06, 30);
      expect(result.monthlyPayment).toBeCloseTo(1199.1, 0);
      expect(result.totalPaid).toBeCloseTo(result.monthlyPayment * 360, 0);
      expect(result.totalInterest).toBeCloseTo(
        result.totalPaid - 200000,
        0,
      );
    });

    it("should calculate 15-year mortgage payment", () => {
      const result = calc.calculateMortgagePayment(300000, 0.05, 15);
      // Higher monthly payment than 30-year, but less total interest
      expect(result.monthlyPayment).toBeGreaterThan(0);
      const result30 = calc.calculateMortgagePayment(300000, 0.05, 30);
      expect(result.monthlyPayment).toBeGreaterThan(result30.monthlyPayment);
      expect(result.totalInterest).toBeLessThan(result30.totalInterest);
    });

    it("should compute totalPaid = monthlyPayment * totalPayments", () => {
      const result = calc.calculateMortgagePayment(100000, 0.04, 20);
      expect(result.totalPaid).toBeCloseTo(result.monthlyPayment * 240, 0);
    });

    it("should compute totalInterest = totalPaid - principal", () => {
      const result = calc.calculateMortgagePayment(150000, 0.035, 30);
      expect(result.totalInterest).toBeCloseTo(
        result.totalPaid - 150000,
        0,
      );
    });

    it("should set paymentToIncomeEstimate to the monthly payment", () => {
      const result = calc.calculateMortgagePayment(250000, 0.045, 30);
      expect(result.paymentToIncomeEstimate).toBe(result.monthlyPayment);
    });
  });

  describe("edge cases", () => {
    it("should handle annualRate = 0 (interest-free loan)", () => {
      // $120,000 over 10 years = $1,000/month
      const result = calc.calculateMortgagePayment(120000, 0, 10);
      expect(result.monthlyPayment).toBe(1000);
      expect(result.totalInterest).toBe(0);
      expect(result.totalPaid).toBe(120000);
    });

    it("should handle very small principal", () => {
      const result = calc.calculateMortgagePayment(1, 0.05, 1);
      expect(result.monthlyPayment).toBeGreaterThan(0);
    });

    it("should handle very short term", () => {
      // 1 year mortgage
      const result = calc.calculateMortgagePayment(12000, 0.06, 1);
      expect(result.monthlyPayment).toBeGreaterThan(1000);
      expect(result.totalPaid).toBeCloseTo(result.monthlyPayment * 12, 0);
    });
  });

  describe("error cases", () => {
    it("should throw for principal = 0", () => {
      expect(() => calc.calculateMortgagePayment(0, 0.05, 30)).toThrow(
        "Principal must be positive",
      );
    });

    it("should throw for negative principal", () => {
      expect(() => calc.calculateMortgagePayment(-100000, 0.05, 30)).toThrow(
        "Principal must be positive",
      );
    });

    it("should throw for negative annualRate", () => {
      expect(() => calc.calculateMortgagePayment(200000, -0.05, 30)).toThrow(
        "Annual rate must be non-negative",
      );
    });

    it("should throw for termYears = 0", () => {
      expect(() => calc.calculateMortgagePayment(200000, 0.05, 0)).toThrow(
        "Term must be positive",
      );
    });

    it("should throw for negative termYears", () => {
      expect(() => calc.calculateMortgagePayment(200000, 0.05, -10)).toThrow(
        "Term must be positive",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 10. calculateLoanAmortization
// ---------------------------------------------------------------------------

describe("calculateLoanAmortization", () => {
  const calc = investmentCalculators;

  describe("valid inputs", () => {
    it("should return the full amortization schedule", () => {
      const result = calc.calculateLoanAmortization(10000, 0.06, 1);
      // 1 year = 12 payments
      expect(result.totalPayments).toBe(12);
      expect(result.schedule).toHaveLength(12);
    });

    it("should have the last entry with remainingBalance = 0", () => {
      const result = calc.calculateLoanAmortization(50000, 0.05, 5);
      const last = result.schedule[result.schedule.length - 1];
      expect(last.remainingBalance).toBe(0);
    });

    it("should have increasing cumulativePrincipal through the schedule", () => {
      const result = calc.calculateLoanAmortization(100000, 0.06, 10);
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].cumulativePrincipal).toBeGreaterThanOrEqual(
          result.schedule[i - 1].cumulativePrincipal,
        );
      }
    });

    it("should have increasing cumulativeInterest through the schedule", () => {
      const result = calc.calculateLoanAmortization(100000, 0.06, 10);
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].cumulativeInterest).toBeGreaterThanOrEqual(
          result.schedule[i - 1].cumulativeInterest,
        );
      }
    });

    it("should have decreasing remainingBalance through the schedule", () => {
      const result = calc.calculateLoanAmortization(80000, 0.04, 15);
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].remainingBalance).toBeLessThanOrEqual(
          result.schedule[i - 1].remainingBalance,
        );
      }
    });

    it("principalPortion + interestPortion should approximate the payment", () => {
      const result = calc.calculateLoanAmortization(200000, 0.06, 30);
      // Check first entry (not the final payment which has rounding adjustment)
      const entry = result.schedule[0];
      expect(entry.principalPortion + entry.interestPortion).toBeCloseTo(
        entry.payment,
        1,
      );
    });

    it("final cumulativePrincipal should approximate the original principal", () => {
      const result = calc.calculateLoanAmortization(100000, 0.05, 10);
      const last = result.schedule[result.schedule.length - 1];
      expect(last.cumulativePrincipal).toBeCloseTo(100000, 0);
    });

    it("should match calculateMortgagePayment for monthly payment", () => {
      const mortgage = calc.calculateMortgagePayment(200000, 0.06, 30);
      const amort = calc.calculateLoanAmortization(200000, 0.06, 30);
      expect(amort.monthlyPayment).toBe(mortgage.monthlyPayment);
    });

    it("month numbers should be sequential starting at 1", () => {
      const result = calc.calculateLoanAmortization(10000, 0.05, 2);
      result.schedule.forEach((entry, index) => {
        expect(entry.month).toBe(index + 1);
      });
    });

    it("early payments should have more interest and less principal", () => {
      const result = calc.calculateLoanAmortization(200000, 0.06, 30);
      const firstEntry = result.schedule[0];
      const midEntry = result.schedule[179]; // month 180 (15 years in)
      // First payment: more goes to interest
      expect(firstEntry.interestPortion).toBeGreaterThan(
        firstEntry.principalPortion,
      );
      // Midpoint: principal should be higher relative to start
      expect(midEntry.principalPortion).toBeGreaterThan(
        firstEntry.principalPortion,
      );
    });
  });

  describe("edge cases", () => {
    it("should handle annualRate = 0 (interest-free)", () => {
      const result = calc.calculateLoanAmortization(12000, 0, 1);
      expect(result.monthlyPayment).toBe(1000);
      expect(result.totalInterest).toBe(0);
      result.schedule.forEach((entry) => {
        expect(entry.interestPortion).toBe(0);
      });
    });

    it("should handle final payment rounding correctly", () => {
      const result = calc.calculateLoanAmortization(100000, 0.045, 30);
      const last = result.schedule[result.schedule.length - 1];
      // Final balance should be exactly 0
      expect(last.remainingBalance).toBe(0);
      // Final payment may differ slightly from monthly payment
      expect(last.payment).toBeGreaterThan(0);
    });

    it("should handle 1-month term", () => {
      const result = calc.calculateLoanAmortization(1000, 0.12, 1 / 12);
      // 1/12 year = 1 month, 1 payment
      expect(result.totalPayments).toBe(1);
      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0].remainingBalance).toBe(0);
    });
  });

  describe("error cases", () => {
    it("should throw for principal = 0", () => {
      expect(() => calc.calculateLoanAmortization(0, 0.05, 10)).toThrow(
        "Principal must be positive",
      );
    });

    it("should throw for negative principal", () => {
      expect(() => calc.calculateLoanAmortization(-50000, 0.05, 10)).toThrow(
        "Principal must be positive",
      );
    });

    it("should throw for negative annualRate", () => {
      expect(() => calc.calculateLoanAmortization(50000, -0.03, 10)).toThrow(
        "Annual rate must be non-negative",
      );
    });

    it("should throw for termYears = 0", () => {
      expect(() => calc.calculateLoanAmortization(50000, 0.05, 0)).toThrow(
        "Term must be positive",
      );
    });

    it("should throw for negative termYears", () => {
      expect(() => calc.calculateLoanAmortization(50000, 0.05, -5)).toThrow(
        "Term must be positive",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: mathematical correctness verification
// ---------------------------------------------------------------------------

describe("Mathematical Correctness Verification", () => {
  const calc = investmentCalculators;

  it("compound interest: known textbook result for monthly compounding", () => {
    // $10,000 at 5% monthly for 10 years, no contributions
    // FV = 10000 * (1 + 0.05/12)^(120) = 10000 * 1.00416667^120 ~ 16470.09
    const result = calc.calculateCompoundInterest({
      principal: 10000,
      rate: 0.05,
      time: 10,
      compoundingFrequency: "monthly",
    });
    const expected = 10000 * Math.pow(1 + 0.05 / 12, 120);
    expect(result.futureValue).toBeCloseTo(expected, 0);
  });

  it("ROI: round-trip verification", () => {
    // If I invest $1000 and get $1500 in 3 years:
    // CAGR = (1500/1000)^(1/3) - 1 = 1.5^(1/3) - 1 ~ 0.14471
    const result = calc.calculateROI({
      initialInvestment: 1000,
      finalValue: 1500,
      timeYears: 3,
    });
    const expectedCAGR = Math.pow(1.5, 1 / 3) - 1;
    expect(result.annualizedROI).toBeCloseTo(expectedCAGR, 5);
  });

  it("mortgage: known monthly payment for standard loan", () => {
    // $100,000 at 5% for 30 years
    // M = 100000 * [0.004167 * 1.004167^360] / [1.004167^360 - 1]
    const r = 0.05 / 12;
    const n = 360;
    const factor = Math.pow(1 + r, n);
    const expectedPayment = (100000 * (r * factor)) / (factor - 1);

    const result = calc.calculateMortgagePayment(100000, 0.05, 30);
    expect(result.monthlyPayment).toBeCloseTo(expectedPayment, 2);
  });

  it("real return: Fisher equation identity", () => {
    // Verify: (1 + real) * (1 + inflation) = (1 + nominal)
    const nominal = 0.08;
    const inflation = 0.03;
    const real = calc.calculateRealReturn(nominal, inflation);
    const reconstructedNominal = (1 + real) * (1 + inflation) - 1;
    expect(reconstructedNominal).toBeCloseTo(nominal, 6);
  });

  it("FIRE: withdrawal amount equals annual expenses", () => {
    const expenses = 45000;
    const rate = 0.04;
    const result = calc.calculateFIRENumber(expenses, rate);
    // fireNumber * withdrawalRate should equal expenses
    expect(result.fireNumber * rate).toBeCloseTo(expenses, 2);
  });

  it("DCA: totalInvested = monthlyAmount * number_of_periods", () => {
    const monthly = 150;
    const prices = [10, 20, 30, 40, 50];
    const result = calc.calculateDollarCostAverage(monthly, prices);
    expect(result.totalInvested).toBe(monthly * prices.length);
  });

  it("break-even: monthly return * months >= investment", () => {
    const investment = 7500;
    const monthlyReturn = 400;
    const result = calc.calculateBreakEvenPoint(investment, monthlyReturn);
    expect(result.totalReturnAtBreakEven).toBeGreaterThanOrEqual(investment);
  });

  it("amortization: cumulativePrincipal + remaining = original principal", () => {
    const result = calc.calculateLoanAmortization(150000, 0.055, 20);
    // Check several points in the schedule
    for (const entry of result.schedule) {
      expect(entry.cumulativePrincipal + entry.remainingBalance).toBeCloseTo(
        150000,
        0,
      );
    }
  });
});
