/**
 * 30-Law Compliance Engine Tests
 *
 * Comprehensive test suite covering law definitions, applicability,
 * individual law scoring, composite scoring, mode-dependent behavior,
 * and DB persistence.
 */

import type {
  ComplianceContext,
  LawId,
  LawCategory,
} from "../compliance-types";
import {
  LAW_PASS_THRESHOLD,
  MIN_COMPOSITE_SCORE,
  MIN_AUTONOMOUS_SCORE,
} from "../compliance-types";
import {
  TRADING_LAWS,
  TRADING_LAWS_LIST,
  ALL_LAW_IDS,
  LAWS_BY_CATEGORY,
} from "../law-definitions";
import { checkApplicability } from "../law-applicability";
import {
  ComplianceScorer,
  createComplianceScorer,
  resetComplianceScorer,
} from "../compliance-scorer";

// ============================================================================
// MOCK: @supabase/supabase-js
// ============================================================================

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

jest.mock("@supabase/supabase-js", () => ({
  __esModule: true,
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

/** Build a full compliance context with defaults */
function makeContext(
  overrides: Partial<ComplianceContext> = {},
): ComplianceContext {
  return {
    userId: "user-test-001",
    signalId: "signal-001",
    symbol: "AAPL",
    signalType: "buy",
    operatingMode: "guided",
    signalStrength: 75,
    currentPrice: 180.0,
    stopLossPrice: 175.0,
    takeProfitPrice: 195.0,
    positionSize: 1800,
    portfolioValue: 100000,
    openPositions: 3,
    maxPositions: 20,
    dailyPnlPct: 0.5,
    maxDailyLossPct: 2.0,
    regimeType: "trend_up",
    relativeVolume: 1.2,
    atr: 3.5,
    extendedHours: false,
    riskRewardRatio: 2.0,
    portfolioCorrelation: 0.2,
    sector: "Technology",
    existingSectors: ["Technology", "Healthcare", "Finance"],
    daysSinceLastTrade: 3,
    ...overrides,
  };
}

/** Build a minimal context (few optional fields) */
function makeMinimalContext(
  overrides: Partial<ComplianceContext> = {},
): ComplianceContext {
  return {
    userId: "user-test-002",
    symbol: "TSLA",
    signalType: "buy",
    operatingMode: "watch",
    signalStrength: 60,
    currentPrice: 250.0,
    ...overrides,
  };
}

// ============================================================================
// TESTS: Law Definitions
// ============================================================================

describe("Law Definitions", () => {
  it("should define exactly 30 laws", () => {
    expect(ALL_LAW_IDS).toHaveLength(30);
    expect(TRADING_LAWS_LIST).toHaveLength(30);
  });

  it("should have all required fields on every law", () => {
    for (const law of TRADING_LAWS_LIST) {
      expect(law.id).toMatch(/^LAW-\d{2}$/);
      expect(law.name).toBeTruthy();
      expect(law.description).toBeTruthy();
      expect(law.category).toBeTruthy();
      expect(typeof law.weight).toBe("number");
      expect(law.weight).toBeGreaterThan(0);
      expect(law.weight).toBeLessThanOrEqual(1);
      expect(typeof law.canBlock).toBe("boolean");
      expect(law.violationSeverity).toBeTruthy();
      expect(law.applicableTo).toBeTruthy();
      expect(law.applicableModes).toBeTruthy();
    }
  });

  it("should have weights that sum to a reasonable total", () => {
    const totalWeight = TRADING_LAWS_LIST.reduce(
      (sum, law) => sum + law.weight,
      0,
    );
    // 30 laws * avg weight ~0.65 = ~19.5 total; sanity check range 10-30
    expect(totalWeight).toBeGreaterThan(10);
    expect(totalWeight).toBeLessThan(30);
  });

  it("should cover all 8 law categories", () => {
    const categories = new Set(TRADING_LAWS_LIST.map((l) => l.category));
    const expectedCategories: LawCategory[] = [
      "risk_management",
      "position_sizing",
      "entry_criteria",
      "exit_criteria",
      "market_structure",
      "portfolio_management",
      "behavioral",
      "execution",
    ];
    for (const cat of expectedCategories) {
      expect(categories.has(cat)).toBe(true);
    }
    expect(Object.keys(LAWS_BY_CATEGORY)).toHaveLength(8);
  });

  it("should only have blocking capability on critical/blocking severity laws", () => {
    const blockingLaws = TRADING_LAWS_LIST.filter((l) => l.canBlock);
    for (const law of blockingLaws) {
      expect(["critical", "blocking"]).toContain(law.violationSeverity);
    }
  });
});

// ============================================================================
// TESTS: Applicability
// ============================================================================

describe("Applicability Checker", () => {
  it("should apply most laws for a buy signal with full context", () => {
    const ctx = makeContext();
    const result = checkApplicability(ctx);
    // Most laws should apply to buy signals with full data
    expect(result.totalApplicable).toBeGreaterThan(20);
    expect(result.totalApplicable + result.totalSkipped).toBe(30);
  });

  it("should skip exit-only laws for buy signals", () => {
    const ctx = makeContext({ signalType: "buy" });
    const result = checkApplicability(ctx);
    // LAW-17 (Trailing Stop) and LAW-18 (Time-Based Exit) are hold-only
    const skippedIds = result.skippedLaws.map((s) => s.lawId);
    expect(skippedIds).toContain("LAW-17");
    expect(skippedIds).toContain("LAW-18");
  });

  it("should skip entry-only laws for hold signals", () => {
    const ctx = makeContext({ signalType: "hold" });
    const result = checkApplicability(ctx);
    // Many entry/buy laws should be skipped for hold
    const skippedIds = result.skippedLaws.map((s) => s.lawId);
    expect(skippedIds).toContain("LAW-01"); // Position Size Limit (buy only)
    expect(skippedIds).toContain("LAW-04"); // Max Open Positions (buy only)
    expect(skippedIds).toContain("LAW-13"); // Volume Confirmation (buy only)
  });

  it("should skip laws when data is insufficient", () => {
    const ctx = makeMinimalContext(); // No ATR, no R:R, no volume, etc.
    const result = checkApplicability(ctx);
    const skippedIds = result.skippedLaws.map((s) => s.lawId);
    // LAW-07 requires ATR
    expect(skippedIds).toContain("LAW-07");
    // LAW-08 requires riskRewardRatio
    expect(skippedIds).toContain("LAW-08");
    // LAW-13 requires relativeVolume
    expect(skippedIds).toContain("LAW-13");
    // LAW-25 requires sector + existingSectors
    expect(skippedIds).toContain("LAW-25");
    // LAW-26 requires portfolioCorrelation
    expect(skippedIds).toContain("LAW-26");
    // LAW-28 requires daysSinceLastTrade
    expect(skippedIds).toContain("LAW-28");
  });

  it("should skip mode-specific laws in wrong mode", () => {
    // LAW-14 is only for guided/autonomous
    const ctx = makeContext({ operatingMode: "watch" });
    const result = checkApplicability(ctx);
    const skippedIds = result.skippedLaws.map((s) => s.lawId);
    expect(skippedIds).toContain("LAW-14");
  });

  it("should apply LAW-14 in guided mode", () => {
    const ctx = makeContext({ operatingMode: "guided" });
    const result = checkApplicability(ctx);
    expect(result.applicableLaws).toContain("LAW-14");
  });

  it("should return correct total counts", () => {
    const ctx = makeContext();
    const result = checkApplicability(ctx);
    expect(result.totalApplicable).toBe(result.applicableLaws.length);
    expect(result.totalSkipped).toBe(result.skippedLaws.length);
    expect(result.totalApplicable + result.totalSkipped).toBe(30);
  });

  it("should apply sell-applicable laws for sell signals", () => {
    const ctx = makeContext({ signalType: "sell" });
    const result = checkApplicability(ctx);
    // LAW-02 (Stop Loss Required) applies to buy + sell
    expect(result.applicableLaws).toContain("LAW-02");
    // LAW-11 (Regime Alignment) applies to buy + sell
    expect(result.applicableLaws).toContain("LAW-11");
    // LAW-21 (Market Hours) applies to buy + sell
    expect(result.applicableLaws).toContain("LAW-21");
  });

  it("should apply all-mode laws in every operating mode", () => {
    for (const mode of ["watch", "guided", "autonomous"] as const) {
      const ctx = makeContext({ operatingMode: mode });
      const result = checkApplicability(ctx);
      // LAW-02 (Stop Loss) and LAW-03 (Daily Loss) apply to all modes
      expect(result.applicableLaws).toContain("LAW-02");
      expect(result.applicableLaws).toContain("LAW-03");
    }
  });

  it("should skip portfolio-data-dependent laws when portfolio data missing", () => {
    const ctx = makeContext({
      positionSize: undefined,
      portfolioValue: undefined,
    });
    const result = checkApplicability(ctx);
    const skippedIds = result.skippedLaws.map((s) => s.lawId);
    // LAW-05 (Portfolio Heat) and LAW-10 (Concentration) need portfolio data
    expect(skippedIds).toContain("LAW-05");
    expect(skippedIds).toContain("LAW-10");
  });
});

// ============================================================================
// TESTS: Individual Law Scoring
// ============================================================================

describe("Individual Law Scoring", () => {
  let scorer: ComplianceScorer;

  beforeEach(() => {
    resetComplianceScorer();
    scorer = createComplianceScorer();
    jest.clearAllMocks();
  });

  it("LAW-01: returns 100 when position risk <= 2%", () => {
    const ctx = makeContext({ positionSize: 1500, portfolioValue: 100000 });
    const result = scorer.evaluateSignal(ctx);
    const lawScore = result.lawScores["LAW-01"];
    expect(lawScore.score).toBe(100);
    expect(lawScore.passed).toBe(true);
  });

  it("LAW-01: returns 40 when position risk is 3-5%", () => {
    const ctx = makeContext({ positionSize: 4000, portfolioValue: 100000 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-01"].score).toBe(40);
    expect(result.lawScores["LAW-01"].passed).toBe(false);
  });

  it("LAW-01: returns 10 when position risk > 5%", () => {
    const ctx = makeContext({ positionSize: 8000, portfolioValue: 100000 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-01"].score).toBe(10);
  });

  it("LAW-02: returns 0 when no stop loss is set", () => {
    const ctx = makeContext({ stopLossPrice: undefined });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-02"].score).toBe(0);
    expect(result.lawScores["LAW-02"].passed).toBe(false);
  });

  it("LAW-02: returns 100 when stop loss is present", () => {
    const ctx = makeContext({ stopLossPrice: 175.0 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-02"].score).toBe(100);
    expect(result.lawScores["LAW-02"].passed).toBe(true);
  });

  it("LAW-03: returns 0 when daily loss exceeds limit", () => {
    const ctx = makeContext({ dailyPnlPct: -3.0, maxDailyLossPct: 2.0 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-03"].score).toBe(0);
  });

  it("LAW-03: returns 100 when not losing", () => {
    const ctx = makeContext({ dailyPnlPct: 1.5, maxDailyLossPct: 2.0 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-03"].score).toBe(100);
  });

  it("LAW-04: returns 100 when within position limit", () => {
    const ctx = makeContext({ openPositions: 5, maxPositions: 20 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-04"].score).toBe(100);
    expect(result.lawScores["LAW-04"].passed).toBe(true);
  });

  it("LAW-04: returns 0 when over position limit", () => {
    const ctx = makeContext({ openPositions: 21, maxPositions: 20 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-04"].score).toBe(0);
    expect(result.lawScores["LAW-04"].passed).toBe(false);
  });

  it("LAW-08: returns 100 for R:R >= 2.0", () => {
    const ctx = makeContext({ riskRewardRatio: 2.5 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-08"].score).toBe(100);
  });

  it("LAW-08: returns 70 for R:R >= 1.5 but < 2.0", () => {
    const ctx = makeContext({ riskRewardRatio: 1.6 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-08"].score).toBe(70);
  });

  it("LAW-08: returns 0 for R:R < 1.0", () => {
    const ctx = makeContext({ riskRewardRatio: 0.8 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-08"].score).toBe(0);
  });

  it("LAW-10: returns 100 when concentration under 15%", () => {
    const ctx = makeContext({ positionSize: 10000, portfolioValue: 100000 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-10"].score).toBe(100);
  });

  it("LAW-10: returns 0 when concentration over 25%", () => {
    const ctx = makeContext({ positionSize: 30000, portfolioValue: 100000 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-10"].score).toBe(0);
  });

  it("LAW-11: returns 100 when regime aligns (buy in uptrend)", () => {
    const ctx = makeContext({ signalType: "buy", regimeType: "trend_up" });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-11"].score).toBe(100);
  });

  it("LAW-11: returns low score when regime misaligned (buy in downtrend)", () => {
    const ctx = makeContext({ signalType: "buy", regimeType: "trend_down" });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-11"].score).toBe(20);
  });

  it("LAW-11: returns 50 when regime type is neutral/unknown", () => {
    const ctx = makeContext({ signalType: "buy", regimeType: "unknown" });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-11"].score).toBe(50);
  });

  it("LAW-12: returns proportional score based on signal strength", () => {
    const ctx80 = makeContext({ signalStrength: 85 });
    const ctx40 = makeContext({ signalStrength: 40 });
    const ctx10 = makeContext({ signalStrength: 10 });

    const result80 = scorer.evaluateSignal(ctx80);
    const result40 = scorer.evaluateSignal(ctx40);
    const result10 = scorer.evaluateSignal(ctx10);

    expect(result80.lawScores["LAW-12"].score).toBe(100);
    expect(result40.lawScores["LAW-12"].score).toBe(50);
    expect(result10.lawScores["LAW-12"].score).toBe(10);
  });

  it("LAW-21: returns 0 during extended hours when not allowed", () => {
    const ctx = makeContext({ extendedHours: true });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-21"].score).toBe(0);
  });

  it("LAW-21: returns 100 during regular hours", () => {
    const ctx = makeContext({ extendedHours: false });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-21"].score).toBe(100);
  });

  it("LAW-25: returns score based on sector concentration", () => {
    // 1 existing tech out of 3, adding 1 more = 2/4 = 50% -> low score
    const ctxHigh = makeContext({
      sector: "Technology",
      existingSectors: ["Technology", "Technology", "Technology"],
    });
    const resultHigh = scorer.evaluateSignal(ctxHigh);
    expect(resultHigh.lawScores["LAW-25"].score).toBeLessThanOrEqual(40);

    // Diverse sectors = high score
    const ctxLow = makeContext({
      sector: "Energy",
      existingSectors: [
        "Technology",
        "Healthcare",
        "Finance",
        "Consumer",
        "Industrial",
      ],
    });
    const resultLow = scorer.evaluateSignal(ctxLow);
    expect(resultLow.lawScores["LAW-25"].score).toBe(100);
  });

  it("LAW-28: returns 100 when cooldown period has elapsed", () => {
    const ctx = makeContext({ daysSinceLastTrade: 5 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-28"].score).toBe(100);
  });

  it("LAW-28: returns 20 when trading same symbol same day", () => {
    const ctx = makeContext({ daysSinceLastTrade: 0 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.lawScores["LAW-28"].score).toBe(20);
  });
});

// ============================================================================
// TESTS: Composite Score
// ============================================================================

describe("Composite Score", () => {
  let scorer: ComplianceScorer;

  beforeEach(() => {
    resetComplianceScorer();
    scorer = createComplianceScorer();
    jest.clearAllMocks();
  });

  it("computes a weighted average correctly", () => {
    const ctx = makeContext();
    const result = scorer.evaluateSignal(ctx);
    // Composite should be between 0 and 100
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
    // With all good context, score should be high
    expect(result.compositeScore).toBeGreaterThan(70);
  });

  it("all laws passing results in score near 100", () => {
    const ctx = makeContext({
      signalStrength: 90,
      riskRewardRatio: 3.0,
      positionSize: 1000,
      portfolioValue: 100000,
      dailyPnlPct: 1.0,
      extendedHours: false,
      regimeType: "trend_up",
      relativeVolume: 2.0,
      portfolioCorrelation: 0.1,
      daysSinceLastTrade: 5,
      openPositions: 2,
      maxPositions: 20,
      sector: "Energy",
      existingSectors: [
        "Technology",
        "Healthcare",
        "Finance",
        "Consumer",
        "Industrial",
      ],
    });
    const result = scorer.evaluateSignal(ctx);
    expect(result.compositeScore).toBeGreaterThan(90);
    expect(result.failingLaws).toBe(0);
  });

  it("mix of passing/failing laws gives proportional score", () => {
    // Some bad conditions
    const ctx = makeContext({
      signalStrength: 30, // Low signal
      riskRewardRatio: 0.5, // Bad R:R
      extendedHours: true, // After hours
      positionSize: 5000, // 5% = borderline
      regimeType: "trend_down", // Counter-trend buy
    });
    const result = scorer.evaluateSignal(ctx);
    expect(result.compositeScore).toBeLessThan(70);
    expect(result.failingLaws).toBeGreaterThan(0);
    expect(result.passingLaws).toBeGreaterThan(0);
  });

  it("sets hasCriticalViolation when a blocking law is violated", () => {
    // No stop loss triggers LAW-02 (blocking severity)
    const ctx = makeContext({ stopLossPrice: undefined });
    const result = scorer.evaluateSignal(ctx);
    expect(result.hasCriticalViolation).toBe(true);
    const law02Violation = result.violations.find(
      (v) => v.lawId === "LAW-02",
    );
    expect(law02Violation).toBeDefined();
    expect(law02Violation?.severity).toBe("blocking");
  });

  it("sets shouldBlock when score is below minimum or critical violation exists", () => {
    // Extended hours + no stop loss + bad R:R = should block
    const ctx = makeContext({
      stopLossPrice: undefined,
      extendedHours: true,
      riskRewardRatio: 0.3,
      signalStrength: 15,
      regimeType: "trend_down",
      positionSize: 10000,
    });
    const result = scorer.evaluateSignal(ctx);
    expect(result.shouldBlock).toBe(true);
  });
});

// ============================================================================
// TESTS: Mode-Dependent Behavior
// ============================================================================

describe("Mode-Dependent Behavior", () => {
  let scorer: ComplianceScorer;

  beforeEach(() => {
    resetComplianceScorer();
    scorer = createComplianceScorer();
    jest.clearAllMocks();
  });

  it("autonomous mode requires higher minimum score", () => {
    // Context that produces a score between MIN_COMPOSITE (50) and MIN_AUTONOMOUS (70)
    const ctx = makeContext({
      operatingMode: "autonomous",
      signalStrength: 35,
      riskRewardRatio: 1.1,
      extendedHours: true,
      regimeType: "range",
      relativeVolume: 0.6,
    });
    const result = scorer.evaluateSignal(ctx);
    // In autonomous mode with a mediocre score, it should be blocked
    if (result.compositeScore < MIN_AUTONOMOUS_SCORE) {
      expect(result.shouldBlock).toBe(true);
    }
    // Verify the threshold constant is correct
    expect(MIN_AUTONOMOUS_SCORE).toBe(70);
  });

  it("watch mode uses standard threshold", () => {
    const ctx = makeContext({ operatingMode: "watch" });
    const result = scorer.evaluateSignal(ctx);
    // With good context and standard threshold, should not be blocked
    if (
      result.compositeScore >= MIN_COMPOSITE_SCORE &&
      !result.hasCriticalViolation
    ) {
      expect(result.shouldBlock).toBe(false);
    }
    expect(MIN_COMPOSITE_SCORE).toBe(50);
  });

  it("guided mode uses standard threshold", () => {
    const ctx = makeContext({ operatingMode: "guided" });
    const result = scorer.evaluateSignal(ctx);
    // Good context = good score = not blocked in guided
    if (
      result.compositeScore >= MIN_COMPOSITE_SCORE &&
      !result.hasCriticalViolation
    ) {
      expect(result.shouldBlock).toBe(false);
    }
  });
});

// ============================================================================
// TESTS: DB Persistence
// ============================================================================

describe("DB Persistence", () => {
  let scorer: ComplianceScorer;

  beforeEach(() => {
    resetComplianceScorer();

    // Re-establish mock chain (resetMocks: true in jest.config wipes implementations)
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const supabaseMod = require("@supabase/supabase-js");
    supabaseMod.createClient.mockReturnValue({ from: mockFrom });

    scorer = createComplianceScorer();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("saves result to compliance_scores table", async () => {
    const ctx = makeContext();
    const result = scorer.evaluateSignal(ctx);

    await scorer.persistResult(
      ctx.userId,
      ctx.signalId ?? null,
      result,
    );

    expect(mockFrom).toHaveBeenCalledWith("compliance_scores");
    expect(mockInsert).toHaveBeenCalled();

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.user_id).toBe("user-test-001");
    expect(insertArg.signal_id).toBe("signal-001");
    expect(insertArg.symbol).toBe("AAPL");
    expect(insertArg.signal_type).toBe("buy");
    expect(insertArg.operating_mode).toBe("guided");
    expect(typeof insertArg.composite_score).toBe("number");
    expect(typeof insertArg.applicable_laws).toBe("number");
    expect(typeof insertArg.passing_laws).toBe("number");
    expect(typeof insertArg.failing_laws).toBe("number");
    expect(typeof insertArg.has_critical_violation).toBe("boolean");
    expect(insertArg.law_scores).toBeDefined();
    expect(Array.isArray(insertArg.violations)).toBe(true);
  });

  it("handles missing env vars gracefully", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    mockFrom.mockClear();
    mockInsert.mockClear();

    const ctx = makeContext();
    // Should not throw
    const result = scorer.evaluateSignal(ctx);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);

    await new Promise((resolve) => setTimeout(resolve, 50));
    // When no env vars, persistResult should bail early
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("includes all required DB fields in insert payload", async () => {
    const ctx = makeContext();
    const result = scorer.evaluateSignal(ctx);

    // Directly call persistResult and await it
    await scorer.persistResult(
      ctx.userId,
      ctx.signalId ?? null,
      result,
    );

    expect(mockInsert).toHaveBeenCalled();
    const payload = mockInsert.mock.calls[0][0];

    // Verify all required fields from the DB schema exist
    const requiredFields = [
      "user_id",
      "signal_id",
      "composite_score",
      "law_scores",
      "applicable_laws",
      "passing_laws",
      "failing_laws",
      "violations",
      "has_critical_violation",
      "symbol",
      "signal_type",
      "operating_mode",
    ];

    for (const field of requiredFields) {
      expect(payload).toHaveProperty(field);
    }
  });
});

// ============================================================================
// TESTS: Factory / Singleton
// ============================================================================

describe("Factory / Singleton", () => {
  it("createComplianceScorer returns the same instance", () => {
    resetComplianceScorer();
    const a = createComplianceScorer();
    const b = createComplianceScorer();
    expect(a).toBe(b);
  });

  it("resetComplianceScorer creates a new instance", () => {
    const a = createComplianceScorer();
    resetComplianceScorer();
    const b = createComplianceScorer();
    expect(a).not.toBe(b);
  });
});

// ============================================================================
// TESTS: Result Structure
// ============================================================================

describe("Result Structure", () => {
  let scorer: ComplianceScorer;

  beforeEach(() => {
    resetComplianceScorer();
    scorer = createComplianceScorer();
    jest.clearAllMocks();
  });

  it("returns a valid ComplianceResult with all required fields", () => {
    const ctx = makeContext();
    const result = scorer.evaluateSignal(ctx);

    expect(typeof result.compositeScore).toBe("number");
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
    expect(typeof result.applicableLaws).toBe("number");
    expect(typeof result.passingLaws).toBe("number");
    expect(typeof result.failingLaws).toBe("number");
    expect(result.applicableLaws).toBe(result.passingLaws + result.failingLaws);
    expect(Array.isArray(result.violations)).toBe(true);
    expect(typeof result.hasCriticalViolation).toBe("boolean");
    expect(typeof result.shouldBlock).toBe("boolean");
    expect(typeof result.summary).toBe("string");
    expect(result.context.symbol).toBe("AAPL");
    expect(result.context.signalType).toBe("buy");
    expect(result.context.operatingMode).toBe("guided");
  });

  it("violations have required fields with correct types", () => {
    // Force some violations
    const ctx = makeContext({
      stopLossPrice: undefined,
      signalStrength: 10,
      extendedHours: true,
    });
    const result = scorer.evaluateSignal(ctx);

    expect(result.violations.length).toBeGreaterThan(0);
    for (const v of result.violations) {
      expect(v.lawId).toMatch(/^LAW-\d{2}$/);
      expect(typeof v.lawName).toBe("string");
      expect(typeof v.severity).toBe("string");
      expect(typeof v.score).toBe("number");
      expect(typeof v.threshold).toBe("number");
      expect(typeof v.details).toBe("string");
      expect(typeof v.remediation).toBe("string");
      expect(v.remediation.length).toBeGreaterThan(0);
    }
  });

  it("lawScores object contains entries for all 30 laws", () => {
    const ctx = makeContext();
    const result = scorer.evaluateSignal(ctx);
    // Should have entries for all 30 laws (applicable + non-applicable)
    expect(Object.keys(result.lawScores)).toHaveLength(30);
    for (const lawId of ALL_LAW_IDS) {
      const ls = result.lawScores[lawId];
      expect(ls).toBeDefined();
      expect(ls.lawId).toBe(lawId);
      expect(typeof ls.score).toBe("number");
      expect(typeof ls.applicable).toBe("boolean");
      expect(typeof ls.weight).toBe("number");
      expect(typeof ls.passed).toBe("boolean");
      expect(typeof ls.details).toBe("string");
    }
  });

  it("summary contains key information", () => {
    const ctx = makeContext();
    const result = scorer.evaluateSignal(ctx);

    expect(result.summary).toContain("AAPL");
    expect(result.summary).toContain("BUY");
    expect(result.summary).toContain("guided");
    expect(result.summary).toContain("/100");
  });
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  let scorer: ComplianceScorer;

  beforeEach(() => {
    resetComplianceScorer();
    scorer = createComplianceScorer();
    jest.clearAllMocks();
  });

  it("handles hold signal type correctly", () => {
    const ctx = makeContext({ signalType: "hold" });
    const result = scorer.evaluateSignal(ctx);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    // Hold signals should have many buy-only laws skipped
    const nonApplicable = Object.values(result.lawScores).filter(
      (ls) => !ls.applicable,
    );
    expect(nonApplicable.length).toBeGreaterThan(0);
  });

  it("handles sell signal type correctly", () => {
    const ctx = makeContext({ signalType: "sell" });
    const result = scorer.evaluateSignal(ctx);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.context.signalType).toBe("sell");
  });

  it("handles zero signal strength gracefully", () => {
    const ctx = makeContext({ signalStrength: 0 });
    const result = scorer.evaluateSignal(ctx);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.lawScores["LAW-12"].score).toBeLessThan(LAW_PASS_THRESHOLD);
  });

  it("handles extremely large portfolio values", () => {
    const ctx = makeContext({
      portfolioValue: 1_000_000_000,
      positionSize: 100_000,
    });
    const result = scorer.evaluateSignal(ctx);
    // Small relative to portfolio = good scores
    expect(result.lawScores["LAW-01"].score).toBe(100);
    expect(result.lawScores["LAW-10"].score).toBe(100);
  });
});
