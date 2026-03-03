/**
 * @jest-environment node
 */

/**
 * Tests for ESGScoringService
 *
 * This service does NOT depend on Supabase. It uses a pluggable ESGDataProvider
 * interface. The default MockESGDataProvider provides seeded data for testing.
 */

import {
  ESGScoringService,
  MockESGDataProvider,
  createESGScoringService,
  esgScoringService,
  type ESGDataProvider,
  type ESGProfile,
  type ESGScore,
  type ESGHistoryEntry,
  type SectorBenchmark,
  type EnvironmentalMetrics,
  type SocialMetrics,
  type GovernanceMetrics,
  type PortfolioHolding,
  type ESGScreeningThresholds,
} from "@/lib/financial/esg-scoring-service";

// ============================================================================
// Test Fixtures
// ============================================================================

function makeHolding(
  symbol: string,
  weight: number,
  sector: string = "Technology",
  name?: string,
): PortfolioHolding {
  return {
    symbol,
    name: name ?? `${symbol} Corp`,
    value: 10000 * weight,
    weight,
    sector,
  };
}

const highEnv: EnvironmentalMetrics = {
  carbonIntensity: 5,
  renewableEnergyPct: 100,
  wasteDiversionPct: 95,
  waterEfficiency: 95,
  hasScienceBasedTargets: true,
};

const lowEnv: EnvironmentalMetrics = {
  carbonIntensity: 500,
  renewableEnergyPct: 2,
  wasteDiversionPct: 10,
  waterEfficiency: 10,
  hasScienceBasedTargets: false,
};

const highSoc: SocialMetrics = {
  employeeSatisfaction: 95,
  diversityPct: 55,
  safetyIncidentRate: 0.1,
  communityInvestmentPct: 3.0,
  hasHumanRightsPolicy: true,
};

const lowSoc: SocialMetrics = {
  employeeSatisfaction: 20,
  diversityPct: 10,
  safetyIncidentRate: 5.0,
  communityInvestmentPct: 0.1,
  hasHumanRightsPolicy: false,
};

const highGov: GovernanceMetrics = {
  boardIndependencePct: 95,
  hasSplitChairCeo: true,
  executivePayRatio: 50,
  antiCorruptionScore: 95,
  auditCommitteeScore: 95,
};

const lowGov: GovernanceMetrics = {
  boardIndependencePct: 20,
  hasSplitChairCeo: false,
  executivePayRatio: 500,
  antiCorruptionScore: 10,
  auditCommitteeScore: 10,
};

// ============================================================================
// Tests
// ============================================================================

describe("ESGScoringService", () => {
  let service: ESGScoringService;

  beforeEach(() => {
    service = createESGScoringService();
  });

  // ==========================================================================
  // Module exports
  // ==========================================================================
  describe("module exports", () => {
    it("should export singleton instance", () => {
      expect(esgScoringService).toBeInstanceOf(ESGScoringService);
    });

    it("should export factory function that creates new instances", () => {
      const s1 = createESGScoringService();
      const s2 = createESGScoringService();
      expect(s1).not.toBe(s2);
      expect(s1).toBeInstanceOf(ESGScoringService);
    });

    it("should accept a custom data provider via factory", () => {
      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(null),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([]),
      };
      const s = createESGScoringService(customProvider);
      expect(s.getDataProvider()).toBe(customProvider);
    });
  });

  // ==========================================================================
  // Static scoring: Environmental
  // ==========================================================================
  describe("calculateEnvironmentalScore", () => {
    it("should return high score for excellent environmental metrics", () => {
      const score = ESGScoringService.calculateEnvironmentalScore(highEnv);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should return low score for poor environmental metrics", () => {
      const score = ESGScoringService.calculateEnvironmentalScore(lowEnv);
      expect(score).toBeLessThan(20);
    });

    it("should award 30 carbon points for intensity <= 10", () => {
      const base = { ...highEnv, carbonIntensity: 10 };
      const high = ESGScoringService.calculateEnvironmentalScore(base);
      const medium = ESGScoringService.calculateEnvironmentalScore({
        ...base,
        carbonIntensity: 50,
      });
      expect(high).toBeGreaterThan(medium);
    });

    it("should award 25 carbon points for intensity 11-50", () => {
      const a = ESGScoringService.calculateEnvironmentalScore({
        ...highEnv,
        carbonIntensity: 30,
      });
      const b = ESGScoringService.calculateEnvironmentalScore({
        ...highEnv,
        carbonIntensity: 80,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 18 carbon points for intensity 51-100", () => {
      const a = ESGScoringService.calculateEnvironmentalScore({
        ...highEnv,
        carbonIntensity: 80,
      });
      const b = ESGScoringService.calculateEnvironmentalScore({
        ...highEnv,
        carbonIntensity: 200,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 10 carbon points for intensity 101-300", () => {
      const a = ESGScoringService.calculateEnvironmentalScore({
        ...highEnv,
        carbonIntensity: 200,
      });
      const b = ESGScoringService.calculateEnvironmentalScore({
        ...highEnv,
        carbonIntensity: 400,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 15 points for science-based targets", () => {
      const withTargets = ESGScoringService.calculateEnvironmentalScore({
        ...lowEnv,
        hasScienceBasedTargets: true,
      });
      const withoutTargets = ESGScoringService.calculateEnvironmentalScore({
        ...lowEnv,
        hasScienceBasedTargets: false,
      });
      expect(withTargets - withoutTargets).toBe(15);
    });

    it("should clamp score between 0 and 100", () => {
      const score = ESGScoringService.calculateEnvironmentalScore(highEnv);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // Static scoring: Social
  // ==========================================================================
  describe("calculateSocialScore", () => {
    it("should return high score for excellent social metrics", () => {
      const score = ESGScoringService.calculateSocialScore(highSoc);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it("should return low score for poor social metrics", () => {
      const score = ESGScoringService.calculateSocialScore(lowSoc);
      expect(score).toBeLessThan(20);
    });

    it("should scale employee satisfaction up to 30 points", () => {
      const full = ESGScoringService.calculateSocialScore({
        ...highSoc,
        employeeSatisfaction: 100,
      });
      const half = ESGScoringService.calculateSocialScore({
        ...highSoc,
        employeeSatisfaction: 50,
      });
      expect(full).toBeGreaterThan(half);
    });

    it("should cap diversity score at 20 points", () => {
      const at50 = ESGScoringService.calculateSocialScore({
        ...highSoc,
        diversityPct: 50,
      });
      const at80 = ESGScoringService.calculateSocialScore({
        ...highSoc,
        diversityPct: 80,
      });
      // Both should max out the 20 pts for diversity
      expect(at50).toBe(at80);
    });

    it("should award 20 safety points for incident rate <= 0.3", () => {
      const best = ESGScoringService.calculateSocialScore({
        ...highSoc,
        safetyIncidentRate: 0.2,
      });
      const worse = ESGScoringService.calculateSocialScore({
        ...highSoc,
        safetyIncidentRate: 0.6,
      });
      expect(best).toBeGreaterThan(worse);
    });

    it("should award 16 safety points for incident rate 0.31-0.5", () => {
      const a = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        safetyIncidentRate: 0.4,
      });
      const b = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        safetyIncidentRate: 0.8,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 10 safety points for incident rate 0.51-1.0", () => {
      const a = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        safetyIncidentRate: 0.8,
      });
      const b = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        safetyIncidentRate: 1.5,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 5 safety points for incident rate 1.01-2.0", () => {
      const a = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        safetyIncidentRate: 1.5,
      });
      const b = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        safetyIncidentRate: 3.0,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 15 points for human rights policy", () => {
      const withPolicy = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        hasHumanRightsPolicy: true,
      });
      const withoutPolicy = ESGScoringService.calculateSocialScore({
        ...lowSoc,
        hasHumanRightsPolicy: false,
      });
      expect(withPolicy - withoutPolicy).toBe(15);
    });
  });

  // ==========================================================================
  // Static scoring: Governance
  // ==========================================================================
  describe("calculateGovernanceScore", () => {
    it("should return high score for excellent governance metrics", () => {
      const score = ESGScoringService.calculateGovernanceScore(highGov);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it("should return low score for poor governance metrics", () => {
      const score = ESGScoringService.calculateGovernanceScore(lowGov);
      expect(score).toBeLessThan(25);
    });

    it("should cap board independence at 25 points", () => {
      const at75 = ESGScoringService.calculateGovernanceScore({
        ...highGov,
        boardIndependencePct: 75,
      });
      const at100 = ESGScoringService.calculateGovernanceScore({
        ...highGov,
        boardIndependencePct: 100,
      });
      // at75 gives exactly 25, at100 would try to give more but is capped
      expect(at100).toBeGreaterThanOrEqual(at75);
    });

    it("should award 15 points for split chair/CEO", () => {
      const split = ESGScoringService.calculateGovernanceScore({
        ...lowGov,
        hasSplitChairCeo: true,
      });
      const combined = ESGScoringService.calculateGovernanceScore({
        ...lowGov,
        hasSplitChairCeo: false,
      });
      expect(split - combined).toBe(15);
    });

    it("should award 20 pay ratio points for ratio <= 100", () => {
      const low = ESGScoringService.calculateGovernanceScore({
        ...highGov,
        executivePayRatio: 80,
      });
      const high = ESGScoringService.calculateGovernanceScore({
        ...highGov,
        executivePayRatio: 250,
      });
      expect(low).toBeGreaterThan(high);
    });

    it("should award 15 pay ratio points for ratio 101-200", () => {
      const a = ESGScoringService.calculateGovernanceScore({
        ...lowGov,
        executivePayRatio: 150,
      });
      const b = ESGScoringService.calculateGovernanceScore({
        ...lowGov,
        executivePayRatio: 250,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 10 pay ratio points for ratio 201-300", () => {
      const a = ESGScoringService.calculateGovernanceScore({
        ...lowGov,
        executivePayRatio: 250,
      });
      const b = ESGScoringService.calculateGovernanceScore({
        ...lowGov,
        executivePayRatio: 400,
      });
      expect(a).toBeGreaterThan(b);
    });

    it("should award 5 pay ratio points for ratio > 300", () => {
      const score = ESGScoringService.calculateGovernanceScore({
        ...lowGov,
        executivePayRatio: 500,
      });
      // lowGov base without split is low; 500 ratio gives 5
      expect(score).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Composite score
  // ==========================================================================
  describe("computeCompositeScore", () => {
    it("should compute weighted overall score", () => {
      const score = ESGScoringService.computeCompositeScore(80, 70, 90);
      // Default weights: E=0.35, S=0.30, G=0.35
      // 80*0.35 + 70*0.30 + 90*0.35 = 28 + 21 + 31.5 = 80.5 -> 81
      expect(score.overall).toBe(81);
    });

    it("should assign correct grades", () => {
      const score = ESGScoringService.computeCompositeScore(80, 70, 90);
      expect(score.grade).toBe("A"); // 81 >= 80
      expect(score.environmental.grade).toBe("A"); // 80 >= 80
      expect(score.social.grade).toBe("B"); // 70 >= 60
      expect(score.governance.grade).toBe("A"); // 90 >= 80
    });

    it("should include pillar weights in the result", () => {
      const score = ESGScoringService.computeCompositeScore(50, 50, 50);
      expect(score.environmental.weight).toBe(0.35);
      expect(score.social.weight).toBe(0.30);
      expect(score.governance.weight).toBe(0.35);
    });

    it("should accept custom weights", () => {
      const weights = { environmental: 0.5, social: 0.25, governance: 0.25 };
      const score = ESGScoringService.computeCompositeScore(
        100,
        0,
        0,
        weights,
      );
      // 100*0.5 + 0*0.25 + 0*0.25 = 50
      expect(score.overall).toBe(50);
    });

    it("should set calculatedAt to a recent date", () => {
      const before = Date.now();
      const score = ESGScoringService.computeCompositeScore(50, 50, 50);
      const after = Date.now();

      expect(score.calculatedAt).toBeInstanceOf(Date);
      expect(score.calculatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(score.calculatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it("should handle all zeros", () => {
      const score = ESGScoringService.computeCompositeScore(0, 0, 0);
      expect(score.overall).toBe(0);
      expect(score.grade).toBe("F");
    });

    it("should handle all hundreds", () => {
      const score = ESGScoringService.computeCompositeScore(100, 100, 100);
      expect(score.overall).toBe(100);
      expect(score.grade).toBe("A");
    });
  });

  // ==========================================================================
  // getGrade
  // ==========================================================================
  describe("getGrade", () => {
    it("should return A for scores >= 80", () => {
      expect(ESGScoringService.getGrade(80)).toBe("A");
      expect(ESGScoringService.getGrade(100)).toBe("A");
    });

    it("should return B for scores 60-79", () => {
      expect(ESGScoringService.getGrade(60)).toBe("B");
      expect(ESGScoringService.getGrade(79)).toBe("B");
    });

    it("should return C for scores 40-59", () => {
      expect(ESGScoringService.getGrade(40)).toBe("C");
      expect(ESGScoringService.getGrade(59)).toBe("C");
    });

    it("should return D for scores 20-39", () => {
      expect(ESGScoringService.getGrade(20)).toBe("D");
      expect(ESGScoringService.getGrade(39)).toBe("D");
    });

    it("should return F for scores < 20", () => {
      expect(ESGScoringService.getGrade(0)).toBe("F");
      expect(ESGScoringService.getGrade(19)).toBe("F");
    });
  });

  // ==========================================================================
  // Data provider management
  // ==========================================================================
  describe("data provider management", () => {
    it("should use MockESGDataProvider by default", () => {
      expect(service.getDataProvider()).toBeInstanceOf(MockESGDataProvider);
    });

    it("should allow replacing the data provider", () => {
      const custom: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(null),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([]),
      };
      service.setDataProvider(custom);
      expect(service.getDataProvider()).toBe(custom);
    });
  });

  // ==========================================================================
  // getCompanyProfile
  // ==========================================================================
  describe("getCompanyProfile", () => {
    it("should return profile for known symbol", async () => {
      const profile = await service.getCompanyProfile("AAPL");
      expect(profile).not.toBeNull();
      expect(profile!.symbol).toBe("AAPL");
      expect(profile!.name).toBe("Apple Inc.");
      expect(profile!.sector).toBe("Technology");
    });

    it("should be case-insensitive", async () => {
      const profile = await service.getCompanyProfile("aapl");
      expect(profile).not.toBeNull();
      expect(profile!.symbol).toBe("AAPL");
    });

    it("should trim whitespace", async () => {
      const profile = await service.getCompanyProfile("  MSFT  ");
      expect(profile).not.toBeNull();
      expect(profile!.symbol).toBe("MSFT");
    });

    it("should return null for unknown symbol", async () => {
      const profile = await service.getCompanyProfile("UNKNOWN");
      expect(profile).toBeNull();
    });

    it("should throw for empty symbol", async () => {
      await expect(service.getCompanyProfile("")).rejects.toThrow(
        "Symbol must not be empty",
      );
    });

    it("should throw for whitespace-only symbol", async () => {
      await expect(service.getCompanyProfile("   ")).rejects.toThrow(
        "Symbol must not be empty",
      );
    });

    it("should include ESG score in profile", async () => {
      const profile = await service.getCompanyProfile("AAPL");
      expect(profile!.score).toBeDefined();
      expect(profile!.score.overall).toBeGreaterThan(0);
      expect(profile!.score.environmental.pillar).toBe("environmental");
      expect(profile!.score.social.pillar).toBe("social");
      expect(profile!.score.governance.pillar).toBe("governance");
    });

    it("should include risk flags for XOM", async () => {
      const profile = await service.getCompanyProfile("XOM");
      expect(profile).not.toBeNull();
      expect(profile!.riskFlags.length).toBeGreaterThan(0);
      expect(
        profile!.riskFlags.some((f) => f.severity === "critical"),
      ).toBe(true);
    });

    it("should have no risk flags for MSFT", async () => {
      const profile = await service.getCompanyProfile("MSFT");
      expect(profile).not.toBeNull();
      expect(profile!.riskFlags).toHaveLength(0);
    });
  });

  // ==========================================================================
  // calculateScore
  // ==========================================================================
  describe("calculateScore", () => {
    it("should calculate score from raw metrics", () => {
      const score = service.calculateScore(highEnv, highSoc, highGov);
      expect(score.overall).toBeGreaterThanOrEqual(80);
      expect(score.grade).toBe("A");
    });

    it("should accept custom weights", () => {
      const weights = {
        environmental: 1.0,
        social: 0,
        governance: 0,
      };
      const score = service.calculateScore(highEnv, lowSoc, lowGov, weights);
      // Should reflect only environmental
      const envOnly = ESGScoringService.calculateEnvironmentalScore(highEnv);
      expect(score.overall).toBe(envOnly);
    });

    it("should return low score for poor metrics across all pillars", () => {
      const score = service.calculateScore(lowEnv, lowSoc, lowGov);
      expect(score.overall).toBeLessThan(20);
      expect(score.grade).toBe("F");
    });
  });

  // ==========================================================================
  // screenPortfolio
  // ==========================================================================
  describe("screenPortfolio", () => {
    it("should screen portfolio with default thresholds", async () => {
      const holdings = [
        makeHolding("AAPL", 0.4, "Technology"),
        makeHolding("MSFT", 0.3, "Technology"),
        makeHolding("XOM", 0.3, "Energy"),
      ];

      const result = await service.screenPortfolio(holdings);

      expect(result.holdings).toHaveLength(3);
      expect(result.passedCount + result.failedCount + result.noDataCount).toBe(
        3,
      );
      expect(result.portfolioGrade).toBeDefined();
      expect(result.screenedAt).toBeInstanceOf(Date);
    });

    it("should throw for empty portfolio", async () => {
      await expect(service.screenPortfolio([])).rejects.toThrow(
        "Portfolio must have at least one holding",
      );
    });

    it("should flag XOM as failing due to critical risk", async () => {
      const holdings = [makeHolding("XOM", 1.0, "Energy")];

      const result = await service.screenPortfolio(holdings);
      const xomResult = result.holdings[0];

      expect(xomResult.passesScreening).toBe(false);
      expect(xomResult.failureReasons.length).toBeGreaterThan(0);
      expect(
        xomResult.failureReasons.some((r) => r.includes("critical risk")),
      ).toBe(true);
    });

    it("should pass high-scoring holdings", async () => {
      const holdings = [makeHolding("MSFT", 1.0, "Technology")];

      const result = await service.screenPortfolio(holdings);
      const msftResult = result.holdings[0];

      expect(msftResult.passesScreening).toBe(true);
      expect(msftResult.failureReasons).toHaveLength(0);
    });

    it("should report noDataCount for unknown symbols", async () => {
      const holdings = [
        makeHolding("MSFT", 0.5, "Technology"),
        makeHolding("FAKE", 0.5, "Unknown"),
      ];

      const result = await service.screenPortfolio(holdings);

      expect(result.noDataCount).toBe(1);
      const fakeResult = result.holdings.find(
        (h) => h.holding.symbol === "FAKE",
      );
      expect(fakeResult!.score).toBeNull();
      expect(fakeResult!.passesScreening).toBe(false);
      expect(fakeResult!.failureReasons).toContain("No ESG data available");
    });

    it("should use custom thresholds", async () => {
      const holdings = [makeHolding("AAPL", 1.0, "Technology")];

      // Very high thresholds -- should fail
      const result = await service.screenPortfolio(holdings, {
        minOverallScore: 99,
      });

      expect(result.holdings[0].passesScreening).toBe(false);
    });

    it("should not exclude critical risks when excludeCriticalRisks is false", async () => {
      const holdings = [makeHolding("XOM", 1.0, "Energy")];

      const result = await service.screenPortfolio(holdings, {
        excludeCriticalRisks: false,
        minOverallScore: 0,
        minEnvironmentalScore: 0,
        minSocialScore: 0,
        minGovernanceScore: 0,
      });

      const xomResult = result.holdings[0];
      // With all thresholds at 0 and no risk exclusion, should pass
      expect(xomResult.passesScreening).toBe(true);
    });

    it("should compute weighted portfolio score", async () => {
      const holdings = [
        makeHolding("AAPL", 0.5, "Technology"),
        makeHolding("MSFT", 0.5, "Technology"),
      ];

      const result = await service.screenPortfolio(holdings);

      // Portfolio score should be average of AAPL and MSFT scores
      expect(result.portfolioScore.overall).toBeGreaterThan(0);
      expect(result.portfolioScore.overall).toBeLessThanOrEqual(100);
    });

    it("should return zero portfolio score when all holdings lack data", async () => {
      const holdings = [
        makeHolding("FAKE1", 0.5, "Unknown"),
        makeHolding("FAKE2", 0.5, "Unknown"),
      ];

      const result = await service.screenPortfolio(holdings);
      expect(result.portfolioScore.overall).toBe(0);
      expect(result.noDataCount).toBe(2);
    });

    it("should fail holdings below individual pillar thresholds", async () => {
      // XOM likely has low environmental score
      const holdings = [makeHolding("XOM", 1.0, "Energy")];

      const result = await service.screenPortfolio(holdings, {
        minEnvironmentalScore: 90,
        excludeCriticalRisks: false,
      });

      const xomResult = result.holdings[0];
      expect(xomResult.passesScreening).toBe(false);
      expect(
        xomResult.failureReasons.some((r) =>
          r.includes("Environmental score"),
        ),
      ).toBe(true);
    });

    it("should include active risk flags in holding results", async () => {
      const holdings = [makeHolding("XOM", 1.0, "Energy")];

      const result = await service.screenPortfolio(holdings);
      const xomResult = result.holdings[0];

      expect(xomResult.riskFlags.length).toBeGreaterThan(0);
      expect(xomResult.riskFlags.every((f) => f.isActive)).toBe(true);
    });

    it("should include thresholds in result", async () => {
      const holdings = [makeHolding("AAPL", 1.0, "Technology")];
      const customThresholds = { minOverallScore: 75 };

      const result = await service.screenPortfolio(holdings, customThresholds);

      expect(result.thresholds.minOverallScore).toBe(75);
      // Defaults should fill in the rest
      expect(result.thresholds.minEnvironmentalScore).toBe(40);
    });
  });

  // ==========================================================================
  // analyzeTrend
  // ==========================================================================
  describe("analyzeTrend", () => {
    it("should analyze improving trend for a known symbol", async () => {
      const trend = await service.analyzeTrend("AAPL", 6);

      expect(trend.symbol).toBe("AAPL");
      expect(trend.periodsAnalyzed).toBe(6);
      expect(trend.history).toHaveLength(6);
      // Mock data simulates slight improvement over time
      expect(["improving", "stable"]).toContain(trend.overallTrend);
    });

    it("should return stable trend with insufficient data", async () => {
      const trend = await service.analyzeTrend("UNKNOWN", 6);

      expect(trend.overallTrend).toBe("stable");
      expect(trend.scoreChange).toBe(0);
      expect(trend.scoreChangePct).toBe(0);
      expect(trend.periodsAnalyzed).toBe(0);
    });

    it("should throw for empty symbol", async () => {
      await expect(service.analyzeTrend("")).rejects.toThrow(
        "Symbol must not be empty",
      );
    });

    it("should throw for fewer than 2 periods", async () => {
      await expect(service.analyzeTrend("AAPL", 1)).rejects.toThrow(
        "At least 2 periods are required",
      );
    });

    it("should include pillar trends", async () => {
      const trend = await service.analyzeTrend("MSFT", 4);

      expect(trend.pillarTrends).toBeDefined();
      expect(trend.pillarTrends.environmental).toBeDefined();
      expect(trend.pillarTrends.social).toBeDefined();
      expect(trend.pillarTrends.governance).toBeDefined();
    });

    it("should calculate score change percentage", async () => {
      const trend = await service.analyzeTrend("AAPL", 12);

      expect(typeof trend.scoreChange).toBe("number");
      expect(typeof trend.scoreChangePct).toBe("number");
    });

    it("should be case-insensitive", async () => {
      const trend = await service.analyzeTrend("aapl", 4);
      expect(trend.symbol).toBe("AAPL");
    });

    it("should return 0 scoreChangePct when oldest score is 0", async () => {
      // Create a provider that returns history with first score = 0
      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(null),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([
          {
            date: new Date("2025-01-01"),
            overall: 0,
            environmental: 0,
            social: 0,
            governance: 0,
          },
          {
            date: new Date("2025-02-01"),
            overall: 50,
            environmental: 50,
            social: 50,
            governance: 50,
          },
        ]),
      };
      const s = createESGScoringService(customProvider);
      const trend = await s.analyzeTrend("TEST", 2);
      expect(trend.scoreChangePct).toBe(0);
    });
  });

  // ==========================================================================
  // compareSectorBenchmark
  // ==========================================================================
  describe("compareSectorBenchmark", () => {
    it("should compare AAPL against Technology sector", async () => {
      const comparison = await service.compareSectorBenchmark("AAPL");

      expect(comparison).not.toBeNull();
      expect(comparison!.symbol).toBe("AAPL");
      expect(comparison!.sector).toBe("Technology");
      expect(comparison!.sectorAverage).toBe(72);
      expect(comparison!.delta).toBe(
        comparison!.companyScore - comparison!.sectorAverage,
      );
    });

    it("should include percentile rank between 0 and 100", async () => {
      const comparison = await service.compareSectorBenchmark("AAPL");

      expect(comparison!.percentileRank).toBeGreaterThanOrEqual(0);
      expect(comparison!.percentileRank).toBeLessThanOrEqual(100);
    });

    it("should include pillar-level comparisons", async () => {
      const comparison = await service.compareSectorBenchmark("MSFT");

      expect(comparison!.pillarComparisons).toHaveLength(3);

      const envComparison = comparison!.pillarComparisons.find(
        (p) => p.pillar === "environmental",
      );
      expect(envComparison).toBeDefined();
      expect(envComparison!.sectorAverage).toBe(70);
    });

    it("should return null for unknown symbol", async () => {
      const comparison = await service.compareSectorBenchmark("UNKNOWN");
      expect(comparison).toBeNull();
    });

    it("should return null when sector benchmark is unavailable", async () => {
      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue({
          symbol: "TEST",
          sector: "NoSuchSector",
          score: ESGScoringService.computeCompositeScore(50, 50, 50),
        }),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([]),
      };
      const s = createESGScoringService(customProvider);
      const result = await s.compareSectorBenchmark("TEST");
      expect(result).toBeNull();
    });

    it("should throw for empty symbol", async () => {
      await expect(
        service.compareSectorBenchmark(""),
      ).rejects.toThrow("Symbol must not be empty");
    });

    it("should include the benchmark data in the result", async () => {
      const comparison = await service.compareSectorBenchmark("XOM");

      expect(comparison).not.toBeNull();
      expect(comparison!.benchmark).toBeDefined();
      expect(comparison!.benchmark.sector).toBe("Energy");
      expect(comparison!.benchmark.companyCount).toBe(80);
    });
  });

  // ==========================================================================
  // getRiskFlags
  // ==========================================================================
  describe("getRiskFlags", () => {
    it("should return active risk flags for XOM", async () => {
      const flags = await service.getRiskFlags("XOM");

      expect(flags.length).toBeGreaterThan(0);
      expect(flags.every((f) => f.isActive)).toBe(true);
    });

    it("should return empty array for MSFT (no flags)", async () => {
      const flags = await service.getRiskFlags("MSFT");
      expect(flags).toHaveLength(0);
    });

    it("should return empty array for unknown symbol", async () => {
      const flags = await service.getRiskFlags("UNKNOWN");
      expect(flags).toHaveLength(0);
    });

    it("should throw for empty symbol", async () => {
      await expect(service.getRiskFlags("")).rejects.toThrow(
        "Symbol must not be empty",
      );
    });

    it("should include flag details", async () => {
      const flags = await service.getRiskFlags("XOM");
      const critical = flags.find((f) => f.severity === "critical");

      expect(critical).toBeDefined();
      expect(critical!.title).toBeTruthy();
      expect(critical!.description).toBeTruthy();
      expect(critical!.pillar).toBe("environmental");
      expect(critical!.identifiedDate).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // getPortfolioRiskFlags
  // ==========================================================================
  describe("getPortfolioRiskFlags", () => {
    it("should return risk flags sorted by severity", async () => {
      const holdings = [
        makeHolding("AAPL", 0.3, "Technology"),
        makeHolding("XOM", 0.4, "Energy"),
        makeHolding("JNJ", 0.3, "Healthcare"),
      ];

      const results = await service.getPortfolioRiskFlags(holdings);

      // XOM has critical flags, should come first
      expect(results.length).toBeGreaterThan(0);
      if (results.length >= 2) {
        const severityOrder = ["critical", "high", "medium", "low"];
        const firstSev = severityOrder.indexOf(results[0].flags[0].severity);
        const secondSev = severityOrder.indexOf(
          results[1].flags[0].severity,
        );
        expect(firstSev).toBeLessThanOrEqual(secondSev);
      }
    });

    it("should not include holdings with no risk flags", async () => {
      const holdings = [
        makeHolding("MSFT", 0.5, "Technology"),
        makeHolding("XOM", 0.5, "Energy"),
      ];

      const results = await service.getPortfolioRiskFlags(holdings);

      // MSFT has no flags, should not appear
      const msftEntry = results.find((r) => r.symbol === "MSFT");
      expect(msftEntry).toBeUndefined();
    });

    it("should return empty array for portfolio with no risk flags", async () => {
      const holdings = [
        makeHolding("MSFT", 0.5, "Technology"),
        makeHolding("NEE", 0.5, "Utilities"),
      ];

      const results = await service.getPortfolioRiskFlags(holdings);
      expect(results).toHaveLength(0);
    });

    it("should handle unknown symbols gracefully", async () => {
      const holdings = [
        makeHolding("FAKE", 0.5, "Unknown"),
        makeHolding("MSFT", 0.5, "Technology"),
      ];

      const results = await service.getPortfolioRiskFlags(holdings);
      expect(results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getRecommendations
  // ==========================================================================
  describe("getRecommendations", () => {
    it("should return empty array for empty portfolio", async () => {
      const recs = await service.getRecommendations([]);
      expect(recs).toHaveLength(0);
    });

    it("should return empty array when all holdings pass screening", async () => {
      const holdings = [
        makeHolding("MSFT", 0.5, "Technology"),
        makeHolding("NEE", 0.5, "Utilities"),
      ];

      const recs = await service.getRecommendations(holdings);
      expect(recs).toHaveLength(0);
    });

    it("should recommend replacement for failing holdings", async () => {
      const holdings = [makeHolding("XOM", 1.0, "Energy")];

      const recs = await service.getRecommendations(holdings);

      // XOM should fail, and a recommendation should be made
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].replacesSymbols).toContain("XOM");
      expect(recs[0].rationale).toContain("XOM");
    });

    it("should sort recommendations by priority", async () => {
      const holdings = [makeHolding("XOM", 1.0, "Energy")];

      const recs = await service.getRecommendations(holdings);
      if (recs.length >= 2) {
        const priorityOrder = ["high", "medium", "low"];
        const first = priorityOrder.indexOf(recs[0].priority);
        const second = priorityOrder.indexOf(recs[1].priority);
        expect(first).toBeLessThanOrEqual(second);
      }
    });

    it("should include score in recommendation", async () => {
      const holdings = [makeHolding("XOM", 1.0, "Energy")];

      const recs = await service.getRecommendations(holdings);
      if (recs.length > 0) {
        expect(recs[0].score).toBeDefined();
        expect(recs[0].score.overall).toBeGreaterThan(0);
      }
    });

    it("should not recommend holdings already in portfolio", async () => {
      const holdings = [
        makeHolding("XOM", 0.5, "Energy"),
        makeHolding("NEE", 0.5, "Utilities"),
      ];

      const recs = await service.getRecommendations(holdings);
      const symbols = holdings.map((h) => h.symbol.toUpperCase());

      for (const rec of recs) {
        expect(symbols).not.toContain(rec.symbol.toUpperCase());
      }
    });
  });

  // ==========================================================================
  // generateComplianceReport
  // ==========================================================================
  describe("generateComplianceReport", () => {
    it("should generate a comprehensive report", async () => {
      const holdings = [
        makeHolding("AAPL", 0.3, "Technology"),
        makeHolding("MSFT", 0.3, "Technology"),
        makeHolding("XOM", 0.2, "Energy"),
        makeHolding("JNJ", 0.2, "Healthcare"),
      ];

      const report = await service.generateComplianceReport(holdings);

      expect(report.title).toBe("ESG Compliance Report");
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.portfolioScore).toBeDefined();
      expect(report.totalHoldings).toBe(4);
      expect(
        report.compliantHoldings + report.nonCompliantHoldings,
      ).toBeLessThanOrEqual(4);
      expect(report.coveragePct).toBe(100);
    });

    it("should throw for empty portfolio", async () => {
      await expect(
        service.generateComplianceReport([]),
      ).rejects.toThrow("Portfolio must have at least one holding");
    });

    it("should use custom report title", async () => {
      const holdings = [makeHolding("AAPL", 1.0, "Technology")];

      const report = await service.generateComplianceReport(
        holdings,
        undefined,
        "Q1 2026 ESG Report",
      );

      expect(report.title).toBe("Q1 2026 ESG Report");
    });

    it("should calculate coverage percentage", async () => {
      const holdings = [
        makeHolding("AAPL", 0.5, "Technology"),
        makeHolding("FAKE", 0.5, "Unknown"),
      ];

      const report = await service.generateComplianceReport(holdings);

      expect(report.coveragePct).toBe(50);
    });

    it("should include sector breakdown", async () => {
      const holdings = [
        makeHolding("AAPL", 0.3, "Technology"),
        makeHolding("MSFT", 0.3, "Technology"),
        makeHolding("XOM", 0.4, "Energy"),
      ];

      const report = await service.generateComplianceReport(holdings);

      expect(report.sectorBreakdown.length).toBeGreaterThanOrEqual(2);

      const techSector = report.sectorBreakdown.find(
        (s) => s.sector === "Technology",
      );
      expect(techSector).toBeDefined();
      expect(techSector!.holdingCount).toBe(2);
    });

    it("should sort sector breakdown by weight descending", async () => {
      const holdings = [
        makeHolding("AAPL", 0.2, "Technology"),
        makeHolding("XOM", 0.8, "Energy"),
      ];

      const report = await service.generateComplianceReport(holdings);

      if (report.sectorBreakdown.length >= 2) {
        expect(report.sectorBreakdown[0].portfolioWeightPct).toBeGreaterThanOrEqual(
          report.sectorBreakdown[1].portfolioWeightPct,
        );
      }
    });

    it("should include active risk flags from all holdings", async () => {
      const holdings = [
        makeHolding("XOM", 0.5, "Energy"),
        makeHolding("JNJ", 0.5, "Healthcare"),
      ];

      const report = await service.generateComplianceReport(holdings);

      // XOM has 2 risk flags, JNJ has 1
      expect(report.activeRiskFlags.length).toBeGreaterThanOrEqual(2);
    });

    it("should generate meaningful summary text", async () => {
      const holdings = [makeHolding("AAPL", 1.0, "Technology")];

      const report = await service.generateComplianceReport(holdings);

      expect(report.summary).toBeTruthy();
      expect(report.summary).toContain("Portfolio ESG score:");
      expect(report.summary).toContain("ESG data coverage:");
    });

    it("should include thresholds in report", async () => {
      const holdings = [makeHolding("AAPL", 1.0, "Technology")];
      const customThresholds = { minOverallScore: 70 };

      const report = await service.generateComplianceReport(
        holdings,
        customThresholds,
      );

      expect(report.thresholds.minOverallScore).toBe(70);
    });

    it("should note strong ESG alignment for high-scoring portfolios", async () => {
      const holdings = [
        makeHolding("MSFT", 0.5, "Technology"),
        makeHolding("NEE", 0.5, "Utilities"),
      ];

      const report = await service.generateComplianceReport(holdings);

      // Both MSFT and NEE are high ESG
      if (report.portfolioScore.overall >= 80) {
        expect(report.summary).toContain("strong ESG alignment");
      }
    });

    it("should note significant ESG gaps for low-scoring portfolios", async () => {
      // Use custom provider to force low scores
      const lowProfile: ESGProfile = {
        symbol: "LOW",
        name: "Low ESG Corp",
        sector: "Energy",
        score: ESGScoringService.computeCompositeScore(10, 10, 10),
        environmental: lowEnv,
        social: lowSoc,
        governance: lowGov,
        riskFlags: [],
        lastUpdated: new Date(),
      };

      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(lowProfile),
        getProfiles: jest.fn().mockResolvedValue(
          new Map([["LOW", lowProfile]]),
        ),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([]),
      };

      const s = createESGScoringService(customProvider);
      const holdings = [makeHolding("LOW", 1.0, "Energy")];
      const report = await s.generateComplianceReport(holdings);

      expect(report.summary).toContain("significant ESG gaps");
    });

    it("should handle portfolio where all holdings lack ESG data", async () => {
      const holdings = [
        makeHolding("FAKE1", 0.5, "Unknown"),
        makeHolding("FAKE2", 0.5, "Unknown"),
      ];

      const report = await service.generateComplianceReport(holdings);

      expect(report.coveragePct).toBe(0);
      expect(report.compliantHoldings).toBe(0);
      expect(report.portfolioScore.overall).toBe(0);
    });
  });

  // ==========================================================================
  // MockESGDataProvider
  // ==========================================================================
  describe("MockESGDataProvider", () => {
    let provider: MockESGDataProvider;

    beforeEach(() => {
      provider = new MockESGDataProvider();
    });

    it("should return known profiles", async () => {
      const profile = await provider.getProfile("AAPL");
      expect(profile).not.toBeNull();
    });

    it("should return null for unknown symbols", async () => {
      const profile = await provider.getProfile("ZZZZ");
      expect(profile).toBeNull();
    });

    it("should return multiple profiles at once", async () => {
      const profiles = await provider.getProfiles(["AAPL", "MSFT", "FAKE"]);
      expect(profiles.size).toBe(2);
      expect(profiles.has("AAPL")).toBe(true);
      expect(profiles.has("MSFT")).toBe(true);
      expect(profiles.has("FAKE")).toBe(false);
    });

    it("should return sector benchmarks for known sectors", async () => {
      const benchmark = await provider.getSectorBenchmark("technology");
      expect(benchmark).not.toBeNull();
      expect(benchmark!.sector).toBe("Technology");
    });

    it("should return null for unknown sector benchmarks", async () => {
      const benchmark = await provider.getSectorBenchmark("unknown_sector");
      expect(benchmark).toBeNull();
    });

    it("should return history entries for known symbols", async () => {
      const history = await provider.getHistory("AAPL", 6);
      expect(history).toHaveLength(6);
      expect(history[0].date).toBeInstanceOf(Date);
    });

    it("should return empty history for unknown symbols", async () => {
      const history = await provider.getHistory("FAKE", 6);
      expect(history).toHaveLength(0);
    });

    it("should have seeded profiles for AAPL, MSFT, XOM, JNJ, NEE", async () => {
      const symbols = ["AAPL", "MSFT", "XOM", "JNJ", "NEE"];
      const profiles = await provider.getProfiles(symbols);
      expect(profiles.size).toBe(5);
    });

    it("should have seeded benchmarks for technology, energy, healthcare, utilities", async () => {
      const sectors = ["technology", "energy", "healthcare", "utilities"];
      for (const sector of sectors) {
        const benchmark = await provider.getSectorBenchmark(sector);
        expect(benchmark).not.toBeNull();
      }
    });
  });

  // ==========================================================================
  // Edge cases and integration
  // ==========================================================================
  describe("edge cases", () => {
    it("should handle portfolio with single holding", async () => {
      const holdings = [makeHolding("AAPL", 1.0, "Technology")];
      const result = await service.screenPortfolio(holdings);
      expect(result.holdings).toHaveLength(1);
    });

    it("should handle mixed known/unknown holdings in compliance report", async () => {
      const holdings = [
        makeHolding("AAPL", 0.4, "Technology"),
        makeHolding("UNKNOWN1", 0.3, "Unknown"),
        makeHolding("UNKNOWN2", 0.3, "Unknown"),
      ];

      const report = await service.generateComplianceReport(holdings);
      expect(report.totalHoldings).toBe(3);
      expect(report.coveragePct).toBeCloseTo(33.33, 0);
    });

    it("should produce consistent scores for repeated calculations", () => {
      const score1 = service.calculateScore(highEnv, highSoc, highGov);
      const score2 = service.calculateScore(highEnv, highSoc, highGov);

      expect(score1.overall).toBe(score2.overall);
      expect(score1.environmental.score).toBe(score2.environmental.score);
      expect(score1.social.score).toBe(score2.social.score);
      expect(score1.governance.score).toBe(score2.governance.score);
    });

    it("should handle medium-range metrics correctly", () => {
      const midEnv: EnvironmentalMetrics = {
        carbonIntensity: 75,
        renewableEnergyPct: 50,
        wasteDiversionPct: 50,
        waterEfficiency: 50,
        hasScienceBasedTargets: false,
      };
      const midSoc: SocialMetrics = {
        employeeSatisfaction: 50,
        diversityPct: 25,
        safetyIncidentRate: 0.8,
        communityInvestmentPct: 1.0,
        hasHumanRightsPolicy: false,
      };
      const midGov: GovernanceMetrics = {
        boardIndependencePct: 50,
        hasSplitChairCeo: false,
        executivePayRatio: 250,
        antiCorruptionScore: 50,
        auditCommitteeScore: 50,
      };

      const score = service.calculateScore(midEnv, midSoc, midGov);
      expect(score.overall).toBeGreaterThan(20);
      expect(score.overall).toBeLessThan(80);
    });

    it("should handle trend analysis with exactly 2 data points", async () => {
      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(null),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([
          {
            date: new Date("2025-01-01"),
            overall: 50,
            environmental: 50,
            social: 50,
            governance: 50,
          },
          {
            date: new Date("2025-02-01"),
            overall: 60,
            environmental: 55,
            social: 58,
            governance: 65,
          },
        ]),
      };
      const s = createESGScoringService(customProvider);
      const trend = await s.analyzeTrend("TEST", 2);

      expect(trend.overallTrend).toBe("improving");
      expect(trend.scoreChange).toBe(10);
      expect(trend.scoreChangePct).toBe(20);
    });

    it("should handle declining trend", async () => {
      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(null),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([
          {
            date: new Date("2025-01-01"),
            overall: 80,
            environmental: 80,
            social: 80,
            governance: 80,
          },
          {
            date: new Date("2025-02-01"),
            overall: 60,
            environmental: 55,
            social: 58,
            governance: 65,
          },
        ]),
      };
      const s = createESGScoringService(customProvider);
      const trend = await s.analyzeTrend("TEST", 2);

      expect(trend.overallTrend).toBe("declining");
      expect(trend.scoreChange).toBe(-20);
    });

    it("should handle stable trend within threshold", async () => {
      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(null),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(null),
        getHistory: jest.fn().mockResolvedValue([
          {
            date: new Date("2025-01-01"),
            overall: 70,
            environmental: 70,
            social: 70,
            governance: 70,
          },
          {
            date: new Date("2025-02-01"),
            overall: 71,
            environmental: 71,
            social: 71,
            governance: 71,
          },
        ]),
      };
      const s = createESGScoringService(customProvider);
      const trend = await s.analyzeTrend("TEST", 2);

      expect(trend.overallTrend).toBe("stable");
    });

    it("should handle sector benchmark with zero range gracefully", async () => {
      const profile: ESGProfile = {
        symbol: "TEST",
        name: "Test Corp",
        sector: "TestSector",
        score: ESGScoringService.computeCompositeScore(50, 50, 50),
        environmental: highEnv,
        social: highSoc,
        governance: highGov,
        riskFlags: [],
        lastUpdated: new Date(),
      };
      const benchmark: SectorBenchmark = {
        sector: "TestSector",
        averageOverall: 50,
        averageEnvironmental: 50,
        averageSocial: 50,
        averageGovernance: 50,
        companyCount: 1,
        bestInClass: 50, // same as worst -> zero range
        worstInClass: 50,
      };

      const customProvider: ESGDataProvider = {
        getProfile: jest.fn().mockResolvedValue(profile),
        getProfiles: jest.fn().mockResolvedValue(new Map()),
        getSectorBenchmark: jest.fn().mockResolvedValue(benchmark),
        getHistory: jest.fn().mockResolvedValue([]),
      };

      const s = createESGScoringService(customProvider);
      const comparison = await s.compareSectorBenchmark("TEST");

      expect(comparison).not.toBeNull();
      expect(comparison!.percentileRank).toBe(50);
    });
  });
});
