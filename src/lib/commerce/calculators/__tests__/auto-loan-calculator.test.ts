/**
 * Auto Loan Calculator Tests
 */

import {
  calculateAutoLoan,
  calculateAffordability,
  compareTerms,
  type AutoLoanCalculation,
} from "../auto-loan-calculator";

// =============================================================================
// Helpers
// =============================================================================

/** Round to the nearest cent for floating-point comparisons. */
function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

// =============================================================================
// calculateAutoLoan — payment accuracy
// =============================================================================

describe("calculateAutoLoan — payment accuracy", () => {
  it("calculates correct monthly payment for a standard 60-month loan", () => {
    // $25,000 vehicle, $5,000 down → $20,000 principal, 6.5% APR, 60 months
    // Known amortization: M = 20000 * (0.065/12 * (1+0.065/12)^60) / ((1+0.065/12)^60 - 1)
    // = 20000 * (0.005417 * 1.38237) / (1.38237 - 1)
    // ≈ 20000 * 0.007488 / 0.38237 ≈ $391.32
    const result = calculateAutoLoan(25000, 5000, 0.065, 60);
    expect(cents(result.monthlyPayment)).toBeCloseTo(391.32, 0);
  });

  it("calculates correct monthly payment for a 36-month loan", () => {
    // $15,000 principal, 4.9% APR, 36 months
    // M = 15000 * (0.004083 * 1.15956) / (1.15956 - 1) ≈ $448.86
    const result = calculateAutoLoan(15000, 0, 0.049, 36);
    expect(cents(result.monthlyPayment)).toBeCloseTo(448.86, 0);
  });

  it("returns zero interest for 0% APR loan", () => {
    const result = calculateAutoLoan(20000, 0, 0, 60);
    expect(result.totalInterest).toBe(0);
    expect(cents(result.monthlyPayment)).toBeCloseTo(333.33, 0);
  });

  it("totalCost equals monthlyPayment times termMonths", () => {
    const result = calculateAutoLoan(30000, 3000, 0.07, 72);
    expect(cents(result.totalCost)).toBeCloseTo(cents(result.monthlyPayment * result.termMonths), 1);
  });

  it("totalInterest equals totalCost minus principal", () => {
    const result = calculateAutoLoan(30000, 3000, 0.07, 72);
    expect(cents(result.totalInterest)).toBeCloseTo(cents(result.totalCost - result.principal), 1);
  });

  it("returns correct principal (vehiclePrice minus downPayment)", () => {
    const result = calculateAutoLoan(40000, 8000, 0.055, 60);
    expect(result.principal).toBe(32000);
  });

  it("clamps principal to 0 when down payment exceeds vehicle price", () => {
    const result = calculateAutoLoan(10000, 15000, 0.065, 60);
    expect(result.principal).toBe(0);
    expect(result.monthlyPayment).toBe(0);
    expect(result.totalInterest).toBe(0);
  });

  it("echoes apr and termMonths back in the result", () => {
    const result = calculateAutoLoan(20000, 2000, 0.065, 48);
    expect(result.apr).toBe(0.065);
    expect(result.termMonths).toBe(48);
  });

  it("longer term produces lower monthly payment but higher total interest", () => {
    const short = calculateAutoLoan(25000, 5000, 0.065, 48);
    const long = calculateAutoLoan(25000, 5000, 0.065, 72);
    expect(long.monthlyPayment).toBeLessThan(short.monthlyPayment);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest);
  });
});

// =============================================================================
// calculateAffordability — DTI scenarios
// =============================================================================

describe("calculateAffordability — DTI scenarios", () => {
  it("computes max monthly payment as headroom below maxDTI", () => {
    // income $6000, existing debt $500, maxDTI 0.36 → max total debt $2160
    // headroom = 2160 - 500 = $1660
    const result = calculateAffordability(6000, 500, 0.36);
    expect(cents(result.maxMonthlyPayment)).toBeCloseTo(1660, 0);
  });

  it("maxLoanAmount is > 0 when there is debt headroom", () => {
    const result = calculateAffordability(5000, 200, 0.36, 0.07, 60);
    expect(result.maxLoanAmount).toBeGreaterThan(0);
  });

  it("maxLoanAmount is 0 when existing debt already exceeds maxDTI", () => {
    // income $3000, existing debt $1500, maxDTI 0.36 → max total debt $1080 < existing
    const result = calculateAffordability(3000, 1500, 0.36);
    expect(result.maxLoanAmount).toBe(0);
    expect(result.maxMonthlyPayment).toBe(0);
  });

  it("recommendedMaxPrice is approximately maxLoanAmount / 0.8", () => {
    const result = calculateAffordability(7000, 400, 0.36, 0.065, 60);
    expect(cents(result.recommendedMaxPrice)).toBeCloseTo(result.maxLoanAmount / 0.8, 0);
  });

  it("dtiAfterLoan is at or below maxDTI when within limits", () => {
    const result = calculateAffordability(8000, 1000, 0.36);
    expect(result.dtiAfterLoan).toBeLessThanOrEqual(0.36 + 0.001);
  });

  it("returns all zeros when monthlyIncome is 0", () => {
    const result = calculateAffordability(0, 0);
    expect(result.maxLoanAmount).toBe(0);
    expect(result.maxMonthlyPayment).toBe(0);
    expect(result.recommendedMaxPrice).toBe(0);
  });

  it("uses default maxDTI of 0.36 when not provided", () => {
    const explicit = calculateAffordability(5000, 300, 0.36);
    const defaulted = calculateAffordability(5000, 300);
    expect(explicit.maxMonthlyPayment).toBeCloseTo(defaulted.maxMonthlyPayment, 4);
  });
});

// =============================================================================
// compareTerms — output structure
// =============================================================================

describe("compareTerms — output structure", () => {
  const TERMS = [36, 48, 60, 72, 84];
  let results: AutoLoanCalculation[];

  beforeEach(() => {
    results = compareTerms(30000, 5000, 0.065, TERMS);
  });

  it("returns one result per term", () => {
    expect(results).toHaveLength(TERMS.length);
  });

  it("each result has the correct termMonths", () => {
    TERMS.forEach((term, i) => {
      expect(results[i].termMonths).toBe(term);
    });
  });

  it("monthly payment decreases as term increases", () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i].monthlyPayment).toBeLessThan(results[i - 1].monthlyPayment);
    }
  });

  it("total interest increases as term increases", () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i].totalInterest).toBeGreaterThan(results[i - 1].totalInterest);
    }
  });

  it("all results share the same principal", () => {
    const principal = results[0].principal;
    results.forEach((r) => expect(r.principal).toBe(principal));
  });

  it("returns empty array for empty terms input", () => {
    const empty = compareTerms(30000, 5000, 0.065, []);
    expect(empty).toHaveLength(0);
  });
});
