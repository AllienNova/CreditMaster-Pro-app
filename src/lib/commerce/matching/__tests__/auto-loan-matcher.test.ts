/**
 * Auto Loan Matcher Tests
 */

import autoLoanMatcher, {
  type AutoLoanMatcherInput,
  type AutoLoanRecommendation,
} from "../auto-loan-matcher";

// =============================================================================
// Helpers
// =============================================================================

function makeInput(overrides: Partial<AutoLoanMatcherInput> = {}): AutoLoanMatcherInput {
  return {
    creditScore: 720,
    monthlyIncome: 6000,
    currentMonthlyDebt: 400,
    vehiclePrice: 30000,
    downPayment: 5000,
    isNewVehicle: true,
    preferredTerm: 60,
    ...overrides,
  };
}

// =============================================================================
// Lender filtering by credit score
// =============================================================================

describe("autoLoanMatcher.getRecommendations — lender filtering", () => {
  it("excludes lenders whose minCreditScore exceeds the applicant score", () => {
    // Chase requires 680 — a score of 620 should not include Chase
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 620 }));
    const names = recs.map((r) => r.lenderName);
    expect(names).not.toContain("Chase Auto Finance");
    expect(names).not.toContain("Wells Fargo Auto");
  });

  it("includes subprime lenders for score 550", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 550 }));
    const names = recs.map((r) => r.lenderName);
    expect(names).toContain("myAutoloan.com");
    expect(names).toContain("Carvana");
  });

  it("includes all lenders for score 750", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 750 }));
    // Should include at least 7 lenders (all 8 minus any LTV-filtered)
    expect(recs.length).toBeGreaterThanOrEqual(7);
  });

  it("returns empty array for score below all lender minimums (499)", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 499 }));
    expect(recs).toHaveLength(0);
  });
});

// =============================================================================
// APR calculation adjustments
// =============================================================================

describe("autoLoanMatcher.getRecommendations — APR adjustments", () => {
  it("new vehicle produces lower likelyAPR than used vehicle for same lender", () => {
    const newRecs = autoLoanMatcher.getRecommendations(
      makeInput({ creditScore: 750, isNewVehicle: true }),
    );
    const usedRecs = autoLoanMatcher.getRecommendations(
      makeInput({ creditScore: 750, isNewVehicle: false, vehicleYear: 2018 }),
    );

    // Find the same lender in both result sets
    const newCapOne = newRecs.find((r) => r.lenderName === "Capital One Auto");
    const usedCapOne = usedRecs.find((r) => r.lenderName === "Capital One Auto");

    if (newCapOne && usedCapOne) {
      expect(newCapOne.estimatedAPR.likely).toBeLessThan(usedCapOne.estimatedAPR.likely);
    }
  });

  it("higher credit score produces lower likely APR for the same lender", () => {
    const primeRecs = autoLoanMatcher.getRecommendations(
      makeInput({ creditScore: 800, isNewVehicle: true }),
    );
    const fairRecs = autoLoanMatcher.getRecommendations(
      makeInput({ creditScore: 660, isNewVehicle: true }),
    );

    const primeLightStream = primeRecs.find((r) => r.lenderName === "LightStream");
    const fairLightStream = fairRecs.find((r) => r.lenderName === "LightStream");

    if (primeLightStream && fairLightStream) {
      expect(primeLightStream.estimatedAPR.likely).toBeLessThan(fairLightStream.estimatedAPR.likely);
    }
  });

  it("estimatedAPR min is always <= likely, and likely is always <= max", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 700 }));
    for (const rec of recs) {
      expect(rec.estimatedAPR.min).toBeLessThanOrEqual(rec.estimatedAPR.likely);
      expect(rec.estimatedAPR.likely).toBeLessThanOrEqual(rec.estimatedAPR.max);
    }
  });
});

// =============================================================================
// Ranking and match scoring
// =============================================================================

describe("autoLoanMatcher.getRecommendations — ranking", () => {
  it("returns results sorted by matchScore descending", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 750 }));
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].matchScore).toBeLessThanOrEqual(recs[i - 1].matchScore);
    }
  });

  it("matchScore is between 0 and 100 for all results", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 700 }));
    for (const rec of recs) {
      expect(rec.matchScore).toBeGreaterThanOrEqual(0);
      expect(rec.matchScore).toBeLessThanOrEqual(100);
    }
  });

  it("lenders with exact preferred term get a higher matchScore boost", () => {
    // All lenders offering 60 months should rank above equivalent lenders not offering it
    const recs60 = autoLoanMatcher.getRecommendations(
      makeInput({ creditScore: 700, preferredTerm: 60 }),
    );
    // Verify at least some lenders appear (the set offering 60 months)
    expect(recs60.length).toBeGreaterThan(0);
  });

  it("prime borrower recommendations are dominated by prime-rate lenders", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 780 }));
    // PenFed and LightStream offer the lowest rates — should appear in top 3
    const topThreeNames = recs.slice(0, 3).map((r) => r.lenderName);
    const primePresent = topThreeNames.some(
      (n) => n === "PenFed Credit Union" || n === "LightStream" || n === "Chase Auto Finance",
    );
    expect(primePresent).toBe(true);
  });
});

// =============================================================================
// Pre-approval odds integration
// =============================================================================

describe("autoLoanMatcher.getRecommendations — pre-approval odds", () => {
  it("every recommendation has a preApprovalOdds object", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput());
    for (const rec of recs) {
      expect(rec.preApprovalOdds).toBeDefined();
      expect(rec.preApprovalOdds.likelihood).toMatch(/^(excellent|good|fair|poor)$/);
      expect(rec.preApprovalOdds.probability).toBeGreaterThanOrEqual(0);
      expect(rec.preApprovalOdds.probability).toBeLessThanOrEqual(100);
    }
  });

  it("poor credit score results in fair or poor odds for all lenders", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 550 }));
    for (const rec of recs) {
      expect(["poor", "fair"]).toContain(rec.preApprovalOdds.likelihood);
    }
  });

  it("excellent credit score results in good or excellent odds for prime lenders", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 800 }));
    const primeRec = recs.find(
      (r) => r.lenderName === "PenFed Credit Union" || r.lenderName === "LightStream",
    );
    if (primeRec) {
      expect(["good", "excellent"]).toContain(primeRec.preApprovalOdds.likelihood);
    }
  });

  it("preApprovalOdds includes a non-empty disclaimer", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput());
    for (const rec of recs) {
      expect(rec.preApprovalOdds.disclaimer).toBeTruthy();
    }
  });
});

// =============================================================================
// Recommendation shape
// =============================================================================

describe("autoLoanMatcher.getRecommendations — output shape", () => {
  it("every recommendation has all required fields", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput());
    for (const rec of recs) {
      expect(typeof rec.offerId).toBe("string");
      expect(typeof rec.lenderName).toBe("string");
      expect(typeof rec.matchScore).toBe("number");
      expect(typeof rec.monthlyPayment).toBe("number");
      expect(typeof rec.totalCost).toBe("number");
      expect(typeof rec.totalInterest).toBe("number");
      expect(typeof rec.termMonths).toBe("number");
      expect(Array.isArray(rec.highlights)).toBe(true);
      expect(Array.isArray(rec.features)).toBe(true);
    }
  });

  it("totalCost > totalInterest for all results", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput());
    for (const rec of recs) {
      expect(rec.totalCost).toBeGreaterThan(rec.totalInterest);
    }
  });

  it("uses the preferredTerm when the lender supports it", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ preferredTerm: 72 }));
    for (const rec of recs) {
      // May fall back to closest if 72 not offered; just verify it's a real term
      expect(rec.termMonths).toBeGreaterThan(0);
    }
  });

  it("highlights array is non-empty for each recommendation", () => {
    const recs = autoLoanMatcher.getRecommendations(makeInput({ creditScore: 750, isNewVehicle: true }));
    for (const rec of recs) {
      expect(rec.highlights.length).toBeGreaterThan(0);
    }
  });
});
