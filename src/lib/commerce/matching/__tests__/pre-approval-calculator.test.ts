/**
 * Pre-Approval Calculator Tests
 */

import {
  calculatePreApprovalOdds,
  type PreApprovalInput,
} from "../pre-approval-calculator";

// ===========================================================================
// Helpers
// ===========================================================================

function makeInput(overrides: Partial<PreApprovalInput> = {}): PreApprovalInput {
  return {
    creditScore: 720,
    dtiRatio: 0.25,
    accountAgeYears: 5,
    recentInquiries: 1,
    paymentHistory: "good",
    ...overrides,
  };
}

// ===========================================================================
// Likelihood bands
// ===========================================================================

describe("calculatePreApprovalOdds — likelihood bands", () => {
  it("returns excellent when all factors are best-in-class (probability > 75)", () => {
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 780,
        dtiRatio: 0.1,
        accountAgeYears: 10,
        recentInquiries: 0,
        paymentHistory: "excellent",
      }),
    );
    // Max possible: 40 + 25 + 15 + 10 + 10 = 100
    expect(result.probability).toBe(100);
    expect(result.likelihood).toBe("excellent");
  });

  it("returns good for probability in 55–75 range", () => {
    // creditScore=720 (30) + dti=25% (20) + age=5yr (12) + inquiries=1 (8) + history=good (7) = 77 → excellent
    // Adjust to land in good: reduce credit score to 650-699 band (20pts) → 20+20+12+8+7 = 67
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 670,
        dtiRatio: 0.22,
        accountAgeYears: 5,
        recentInquiries: 1,
        paymentHistory: "good",
      }),
    );
    expect(result.probability).toBe(67);
    expect(result.likelihood).toBe("good");
  });

  it("returns fair for probability in 35–55 range", () => {
    // creditScore < 600 (0) + dti=40% (10) + age=3yr (8) + inquiries=3 (4) + history=fair (4) = 26 → poor
    // creditScore=640 (10) + dti=40% (10) + age=3yr (8) + inquiries=3 (4) + history=fair (4) = 36 → fair
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 640,
        dtiRatio: 0.4,
        accountAgeYears: 3,
        recentInquiries: 3,
        paymentHistory: "fair",
      }),
    );
    expect(result.probability).toBe(36);
    expect(result.likelihood).toBe("fair");
  });

  it("returns poor for probability < 35", () => {
    // creditScore < 600 (0) + dti>43% (0) + age<2yr (4) + inquiries>4 (0) + history=poor (0) = 4
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 580,
        dtiRatio: 0.55,
        accountAgeYears: 1,
        recentInquiries: 6,
        paymentHistory: "poor",
      }),
    );
    expect(result.probability).toBe(4);
    expect(result.likelihood).toBe("poor");
  });
});

// ===========================================================================
// Factor scoring
// ===========================================================================

describe("calculatePreApprovalOdds — factor scoring", () => {
  it("includes exactly 5 factors", () => {
    const result = calculatePreApprovalOdds(makeInput());
    expect(result.factors).toHaveLength(5);
  });

  it("assigns correct weights per factor", () => {
    const result = calculatePreApprovalOdds(makeInput());
    const weights = Object.fromEntries(result.factors.map((f) => [f.name, f.weight]));
    expect(weights["Credit Score"]).toBe(40);
    expect(weights["Debt-to-Income Ratio"]).toBe(25);
    expect(weights["Credit History Length"]).toBe(15);
    expect(weights["Recent Credit Inquiries"]).toBe(10);
    expect(weights["Payment History"]).toBe(10);
  });

  describe("credit score factor", () => {
    it.each([
      [780, 40, "positive"],
      [720, 30, "positive"],
      [670, 20, "neutral"],
      [620, 10, "negative"],
      [580, 0, "negative"],
    ])("score %d → %d pts, impact %s", (score, expectedPoints, expectedImpact) => {
      const result = calculatePreApprovalOdds(makeInput({ creditScore: score }));
      const factor = result.factors.find((f) => f.name === "Credit Score")!;
      expect(factor.score).toBe(expectedPoints);
      expect(factor.impact).toBe(expectedImpact);
    });
  });

  describe("DTI factor", () => {
    it.each([
      [0.15, 25, "positive"],
      [0.25, 20, "positive"],
      [0.39, 10, "neutral"],
      [0.50, 0, "negative"],
    ])("dti %.2f → %d pts, impact %s", (dti, expectedPoints, expectedImpact) => {
      const result = calculatePreApprovalOdds(makeInput({ dtiRatio: dti }));
      const factor = result.factors.find((f) => f.name === "Debt-to-Income Ratio")!;
      expect(factor.score).toBe(expectedPoints);
      expect(factor.impact).toBe(expectedImpact);
    });
  });

  describe("account age factor", () => {
    it.each([
      [8, 15, "positive"],
      [5, 12, "positive"],
      [3, 8, "neutral"],
      [1, 4, "negative"],
    ])("age %d years → %d pts, impact %s", (age, expectedPoints, expectedImpact) => {
      const result = calculatePreApprovalOdds(makeInput({ accountAgeYears: age }));
      const factor = result.factors.find((f) => f.name === "Credit History Length")!;
      expect(factor.score).toBe(expectedPoints);
      expect(factor.impact).toBe(expectedImpact);
    });
  });

  describe("inquiries factor", () => {
    it.each([
      [0, 10, "positive"],
      [2, 8, "positive"],
      [4, 4, "neutral"],
      [5, 0, "negative"],
    ])("%d inquiries → %d pts, impact %s", (inquiries, expectedPoints, expectedImpact) => {
      const result = calculatePreApprovalOdds(makeInput({ recentInquiries: inquiries }));
      const factor = result.factors.find((f) => f.name === "Recent Credit Inquiries")!;
      expect(factor.score).toBe(expectedPoints);
      expect(factor.impact).toBe(expectedImpact);
    });
  });

  describe("payment history factor", () => {
    it.each([
      ["excellent" as const, 10, "positive"],
      ["good" as const, 7, "positive"],
      ["fair" as const, 4, "neutral"],
      ["poor" as const, 0, "negative"],
    ])("history %s → %d pts, impact %s", (history, expectedPoints, expectedImpact) => {
      const result = calculatePreApprovalOdds(makeInput({ paymentHistory: history }));
      const factor = result.factors.find((f) => f.name === "Payment History")!;
      expect(factor.score).toBe(expectedPoints);
      expect(factor.impact).toBe(expectedImpact);
    });
  });
});

// ===========================================================================
// Product-specific caps
// ===========================================================================

describe("calculatePreApprovalOdds — product-specific caps", () => {
  it("caps likelihood at fair when credit score is below productMinScore", () => {
    // Without cap: score=720 would yield excellent; cap forces fair
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 720,
        dtiRatio: 0.1,
        accountAgeYears: 10,
        recentInquiries: 0,
        paymentHistory: "excellent",
        productMinScore: 750,
      }),
    );
    expect(result.likelihood).toBe("fair");
    expect(result.probability).toBeLessThanOrEqual(54);
  });

  it("does not cap when credit score meets productMinScore", () => {
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 760,
        dtiRatio: 0.1,
        accountAgeYears: 10,
        recentInquiries: 0,
        paymentHistory: "excellent",
        productMinScore: 750,
      }),
    );
    expect(result.likelihood).toBe("excellent");
  });

  it("caps likelihood at poor when DTI exceeds productMaxDTI", () => {
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 780,
        dtiRatio: 0.5,
        productMaxDTI: 0.43,
      }),
    );
    expect(result.likelihood).toBe("poor");
    expect(result.probability).toBeLessThanOrEqual(34);
  });

  it("does not cap when DTI is within productMaxDTI", () => {
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 780,
        dtiRatio: 0.3,
        productMaxDTI: 0.43,
      }),
    );
    expect(result.likelihood).not.toBe("poor");
  });

  it("productMaxDTI cap takes precedence and forces poor even if score cap would allow fair", () => {
    const result = calculatePreApprovalOdds(
      makeInput({
        creditScore: 700,
        dtiRatio: 0.55,
        productMinScore: 750,
        productMaxDTI: 0.43,
      }),
    );
    expect(result.likelihood).toBe("poor");
  });
});

// ===========================================================================
// Disclaimer
// ===========================================================================

describe("calculatePreApprovalOdds — disclaimer", () => {
  it("always includes a non-empty disclaimer", () => {
    const result = calculatePreApprovalOdds(makeInput());
    expect(result.disclaimer).toBeTruthy();
    expect(result.disclaimer.length).toBeGreaterThan(0);
  });

  it("disclaimer contains expected text about lender decisions", () => {
    const result = calculatePreApprovalOdds(makeInput());
    expect(result.disclaimer).toContain("lender");
  });

  it("always marks creditImpact as hardInquiry: true", () => {
    const result = calculatePreApprovalOdds(makeInput());
    expect(result.creditImpact.hardInquiry).toBe(true);
  });

  it("always includes an estimated score drop", () => {
    const result = calculatePreApprovalOdds(makeInput());
    expect(result.creditImpact.estimatedScoreDrop).toBeGreaterThan(0);
  });
});
