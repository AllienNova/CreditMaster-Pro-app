/**
 * ESG (Environmental, Social, Governance) Scoring Service
 *
 * Provides comprehensive ESG analysis for investment portfolios:
 * - ESG score calculation: E, S, G sub-scores (0-100 each)
 * - Company ESG profile lookup (pluggable data provider)
 * - Portfolio ESG screening: score an entire portfolio
 * - ESG trend analysis over time
 * - Sector-level ESG benchmarking
 * - ESG risk flags (controversies, regulatory risks)
 * - Green/sustainable investment recommendations
 * - ESG compliance reporting
 *
 * All scores follow 0-100 scale. Grades: A (>=80), B (>=60), C (>=40), D (>=20), F (<20).
 */

// ============================================================================
// TYPES — ESG Score
// ============================================================================

/** Letter grade for ESG assessments */
type ESGGrade = "A" | "B" | "C" | "D" | "F";

/** Pillar identifier */
type ESGPillar = "environmental" | "social" | "governance";

/** Risk severity level */
type RiskSeverity = "critical" | "high" | "medium" | "low";

/** Trend direction */
type ESGTrend = "improving" | "stable" | "declining";

/** Recommendation priority */
type RecommendationPriority = "high" | "medium" | "low";

/** Individual ESG sub-score for one pillar */
interface ESGPillarScore {
  /** Pillar identifier */
  pillar: ESGPillar;
  /** Score 0-100 */
  score: number;
  /** Letter grade */
  grade: ESGGrade;
  /** Weight used in composite calculation */
  weight: number;
}

/** Composite ESG score with pillar breakdown */
interface ESGScore {
  /** Weighted composite score 0-100 */
  overall: number;
  /** Overall letter grade */
  grade: ESGGrade;
  /** Environmental sub-score */
  environmental: ESGPillarScore;
  /** Social sub-score */
  social: ESGPillarScore;
  /** Governance sub-score */
  governance: ESGPillarScore;
  /** Timestamp of calculation */
  calculatedAt: Date;
}

// ============================================================================
// TYPES — ESG Profile
// ============================================================================

/** Environmental metrics for a company */
interface EnvironmentalMetrics {
  /** Carbon emissions intensity (tonnes CO2e per $M revenue) */
  carbonIntensity: number;
  /** Percentage of energy from renewable sources */
  renewableEnergyPct: number;
  /** Waste diverted from landfill percentage */
  wasteDiversionPct: number;
  /** Water usage efficiency score 0-100 */
  waterEfficiency: number;
  /** Has science-based emission reduction targets */
  hasScienceBasedTargets: boolean;
}

/** Social metrics for a company */
interface SocialMetrics {
  /** Employee satisfaction score 0-100 */
  employeeSatisfaction: number;
  /** Board/leadership diversity percentage */
  diversityPct: number;
  /** Workplace safety incident rate (per 100 employees per year) */
  safetyIncidentRate: number;
  /** Community investment as percentage of revenue */
  communityInvestmentPct: number;
  /** Has strong human rights supply chain policy */
  hasHumanRightsPolicy: boolean;
}

/** Governance metrics for a company */
interface GovernanceMetrics {
  /** Percentage of independent board directors */
  boardIndependencePct: number;
  /** Has split chair/CEO roles */
  hasSplitChairCeo: boolean;
  /** Executive pay ratio (CEO-to-median-worker) */
  executivePayRatio: number;
  /** Anti-corruption policy strength score 0-100 */
  antiCorruptionScore: number;
  /** Audit committee independence score 0-100 */
  auditCommitteeScore: number;
}

/** Full ESG profile for a company or fund */
interface ESGProfile {
  /** Stock ticker or fund symbol */
  symbol: string;
  /** Company or fund name */
  name: string;
  /** Industry sector */
  sector: string;
  /** ESG composite score */
  score: ESGScore;
  /** Environmental metrics */
  environmental: EnvironmentalMetrics;
  /** Social metrics */
  social: SocialMetrics;
  /** Governance metrics */
  governance: GovernanceMetrics;
  /** Active risk flags */
  riskFlags: ESGRiskFlag[];
  /** Date the profile data was last updated */
  lastUpdated: Date;
}

// ============================================================================
// TYPES — ESG Data Provider (pluggable)
// ============================================================================

/** Interface for pluggable ESG data sources */
interface ESGDataProvider {
  /** Fetch ESG profile for a single symbol */
  getProfile(symbol: string): Promise<ESGProfile | null>;
  /** Fetch ESG profiles for multiple symbols */
  getProfiles(symbols: string[]): Promise<Map<string, ESGProfile>>;
  /** Fetch sector benchmark data */
  getSectorBenchmark(sector: string): Promise<SectorBenchmark | null>;
  /** Fetch ESG history for a symbol */
  getHistory(
    symbol: string,
    periods: number,
  ): Promise<ESGHistoryEntry[]>;
}

// ============================================================================
// TYPES — Screening & Portfolio
// ============================================================================

/** A single holding in a portfolio */
interface PortfolioHolding {
  /** Stock ticker or fund symbol */
  symbol: string;
  /** Company or fund name */
  name: string;
  /** Current market value in dollars */
  value: number;
  /** Weight in portfolio as a decimal (0-1) */
  weight: number;
  /** Industry sector */
  sector: string;
}

/** Result of screening a single holding */
interface HoldingESGResult {
  /** The holding */
  holding: PortfolioHolding;
  /** ESG score (null if profile not available) */
  score: ESGScore | null;
  /** Risk flags */
  riskFlags: ESGRiskFlag[];
  /** Whether the holding passes the screening thresholds */
  passesScreening: boolean;
  /** Reasons for failing screening (empty if passes) */
  failureReasons: string[];
}

/** Result of screening an entire portfolio */
interface ESGScreeningResult {
  /** Portfolio-level weighted ESG score */
  portfolioScore: ESGScore;
  /** Per-holding ESG results */
  holdings: HoldingESGResult[];
  /** Holdings that passed screening */
  passedCount: number;
  /** Holdings that failed screening */
  failedCount: number;
  /** Holdings with no ESG data */
  noDataCount: number;
  /** Overall portfolio grade */
  portfolioGrade: ESGGrade;
  /** Screening thresholds used */
  thresholds: ESGScreeningThresholds;
  /** Timestamp */
  screenedAt: Date;
}

/** Configurable screening thresholds */
interface ESGScreeningThresholds {
  /** Minimum overall ESG score (0-100) */
  minOverallScore: number;
  /** Minimum environmental score (0-100) */
  minEnvironmentalScore: number;
  /** Minimum social score (0-100) */
  minSocialScore: number;
  /** Minimum governance score (0-100) */
  minGovernanceScore: number;
  /** Exclude holdings with critical risk flags */
  excludeCriticalRisks: boolean;
}

// ============================================================================
// TYPES — Trend Analysis
// ============================================================================

/** A single historical ESG data point */
interface ESGHistoryEntry {
  /** Period date */
  date: Date;
  /** Overall ESG score at this point */
  overall: number;
  /** Environmental score */
  environmental: number;
  /** Social score */
  social: number;
  /** Governance score */
  governance: number;
}

/** Result of analyzing ESG trends */
interface ESGTrendAnalysis {
  /** Symbol analyzed */
  symbol: string;
  /** Overall trend direction */
  overallTrend: ESGTrend;
  /** Per-pillar trend directions */
  pillarTrends: {
    environmental: ESGTrend;
    social: ESGTrend;
    governance: ESGTrend;
  };
  /** Score change from oldest to newest period */
  scoreChange: number;
  /** Percentage change */
  scoreChangePct: number;
  /** Number of periods analyzed */
  periodsAnalyzed: number;
  /** History data points */
  history: ESGHistoryEntry[];
}

// ============================================================================
// TYPES — Sector Benchmarking
// ============================================================================

/** Sector-level ESG benchmark */
interface SectorBenchmark {
  /** Sector name */
  sector: string;
  /** Average overall ESG score for the sector */
  averageOverall: number;
  /** Average environmental score */
  averageEnvironmental: number;
  /** Average social score */
  averageSocial: number;
  /** Average governance score */
  averageGovernance: number;
  /** Number of companies in the benchmark */
  companyCount: number;
  /** Best-in-class score */
  bestInClass: number;
  /** Worst-in-class score */
  worstInClass: number;
}

/** Comparison of a company against its sector */
interface SectorComparison {
  /** The company symbol */
  symbol: string;
  /** The sector */
  sector: string;
  /** Company overall score */
  companyScore: number;
  /** Sector average overall score */
  sectorAverage: number;
  /** Delta (company - sector average) */
  delta: number;
  /** Percentile rank within sector */
  percentileRank: number;
  /** Per-pillar comparisons */
  pillarComparisons: {
    pillar: ESGPillar;
    companyScore: number;
    sectorAverage: number;
    delta: number;
  }[];
  /** Sector benchmark data */
  benchmark: SectorBenchmark;
}

// ============================================================================
// TYPES — Risk Flags
// ============================================================================

/** An ESG risk flag for a company */
interface ESGRiskFlag {
  /** Unique identifier */
  id: string;
  /** Which pillar this risk relates to */
  pillar: ESGPillar;
  /** Severity */
  severity: RiskSeverity;
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Date the risk was identified */
  identifiedDate: Date;
  /** Whether the risk is currently active */
  isActive: boolean;
}

// ============================================================================
// TYPES — Recommendations
// ============================================================================

/** A green/sustainable investment recommendation */
interface ESGRecommendation {
  /** Recommended symbol */
  symbol: string;
  /** Company or fund name */
  name: string;
  /** Sector */
  sector: string;
  /** ESG score */
  score: ESGScore;
  /** Priority of recommendation */
  priority: RecommendationPriority;
  /** Reason for recommendation */
  rationale: string;
  /** Which holding(s) this could replace */
  replacesSymbols: string[];
}

// ============================================================================
// TYPES — Compliance Reporting
// ============================================================================

/** ESG compliance report for a portfolio */
interface ESGComplianceReport {
  /** Report title */
  title: string;
  /** Report generation date */
  generatedAt: Date;
  /** Portfolio-level ESG score */
  portfolioScore: ESGScore;
  /** Percentage of portfolio with ESG data */
  coveragePct: number;
  /** Holdings meeting minimum thresholds */
  compliantHoldings: number;
  /** Holdings failing minimum thresholds */
  nonCompliantHoldings: number;
  /** Total holdings */
  totalHoldings: number;
  /** Active risk flags across portfolio */
  activeRiskFlags: ESGRiskFlag[];
  /** Sector distribution with ESG averages */
  sectorBreakdown: SectorBreakdownEntry[];
  /** Summary narrative */
  summary: string;
  /** Thresholds used */
  thresholds: ESGScreeningThresholds;
}

/** Sector breakdown entry in compliance report */
interface SectorBreakdownEntry {
  sector: string;
  holdingCount: number;
  portfolioWeightPct: number;
  averageESGScore: number;
  averageGrade: ESGGrade;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PILLAR_WEIGHTS: Record<ESGPillar, number> = {
  environmental: 0.35,
  social: 0.30,
  governance: 0.35,
};

const GRADE_THRESHOLDS: { min: number; grade: ESGGrade }[] = [
  { min: 80, grade: "A" },
  { min: 60, grade: "B" },
  { min: 40, grade: "C" },
  { min: 20, grade: "D" },
  { min: 0, grade: "F" },
];

const DEFAULT_SCREENING_THRESHOLDS: ESGScreeningThresholds = {
  minOverallScore: 50,
  minEnvironmentalScore: 40,
  minSocialScore: 40,
  minGovernanceScore: 40,
  excludeCriticalRisks: true,
};

/** Trend threshold -- score changes within +/-2 are considered stable */
const TREND_THRESHOLD = 2;

// ============================================================================
// MOCK DATA PROVIDER
// ============================================================================

/**
 * Built-in mock ESG data provider for development and testing.
 * In production, replace with a real data source (e.g., MSCI, Sustainalytics).
 */
class MockESGDataProvider implements ESGDataProvider {
  private readonly profiles: Map<string, ESGProfile>;
  private readonly benchmarks: Map<string, SectorBenchmark>;

  constructor() {
    this.profiles = new Map();
    this.benchmarks = new Map();
    this.seedData();
  }

  async getProfile(symbol: string): Promise<ESGProfile | null> {
    return this.profiles.get(symbol.toUpperCase()) ?? null;
  }

  async getProfiles(symbols: string[]): Promise<Map<string, ESGProfile>> {
    const results = new Map<string, ESGProfile>();
    for (const symbol of symbols) {
      const profile = this.profiles.get(symbol.toUpperCase());
      if (profile) {
        results.set(symbol.toUpperCase(), profile);
      }
    }
    return results;
  }

  async getSectorBenchmark(sector: string): Promise<SectorBenchmark | null> {
    return this.benchmarks.get(sector.toLowerCase()) ?? null;
  }

  async getHistory(
    symbol: string,
    periods: number,
  ): Promise<ESGHistoryEntry[]> {
    const profile = this.profiles.get(symbol.toUpperCase());
    if (!profile) return [];

    const entries: ESGHistoryEntry[] = [];
    const baseScore = profile.score.overall;

    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      // Simulate slight improvement over time: older entries have lower scores
      const variation = i * 0.5;
      entries.push({
        date,
        overall: Math.min(100, Math.max(0, baseScore - variation)),
        environmental: Math.min(
          100,
          Math.max(0, profile.score.environmental.score - variation),
        ),
        social: Math.min(
          100,
          Math.max(0, profile.score.social.score - variation),
        ),
        governance: Math.min(
          100,
          Math.max(0, profile.score.governance.score - variation),
        ),
      });
    }
    return entries;
  }

  private seedData(): void {
    const now = new Date();

    // Technology sector
    this.addProfile({
      symbol: "AAPL",
      name: "Apple Inc.",
      sector: "Technology",
      environmental: {
        carbonIntensity: 15,
        renewableEnergyPct: 95,
        wasteDiversionPct: 80,
        waterEfficiency: 85,
        hasScienceBasedTargets: true,
      },
      social: {
        employeeSatisfaction: 82,
        diversityPct: 45,
        safetyIncidentRate: 0.3,
        communityInvestmentPct: 1.2,
        hasHumanRightsPolicy: true,
      },
      governance: {
        boardIndependencePct: 88,
        hasSplitChairCeo: true,
        executivePayRatio: 256,
        antiCorruptionScore: 90,
        auditCommitteeScore: 92,
      },
      riskFlags: [],
      lastUpdated: now,
    });

    this.addProfile({
      symbol: "MSFT",
      name: "Microsoft Corporation",
      sector: "Technology",
      environmental: {
        carbonIntensity: 12,
        renewableEnergyPct: 100,
        wasteDiversionPct: 90,
        waterEfficiency: 88,
        hasScienceBasedTargets: true,
      },
      social: {
        employeeSatisfaction: 85,
        diversityPct: 50,
        safetyIncidentRate: 0.2,
        communityInvestmentPct: 1.5,
        hasHumanRightsPolicy: true,
      },
      governance: {
        boardIndependencePct: 92,
        hasSplitChairCeo: true,
        executivePayRatio: 289,
        antiCorruptionScore: 92,
        auditCommitteeScore: 95,
      },
      riskFlags: [],
      lastUpdated: now,
    });

    // Energy sector (mixed ESG)
    this.addProfile({
      symbol: "XOM",
      name: "Exxon Mobil Corporation",
      sector: "Energy",
      environmental: {
        carbonIntensity: 450,
        renewableEnergyPct: 5,
        wasteDiversionPct: 40,
        waterEfficiency: 35,
        hasScienceBasedTargets: false,
      },
      social: {
        employeeSatisfaction: 65,
        diversityPct: 30,
        safetyIncidentRate: 1.8,
        communityInvestmentPct: 0.5,
        hasHumanRightsPolicy: false,
      },
      governance: {
        boardIndependencePct: 75,
        hasSplitChairCeo: false,
        executivePayRatio: 312,
        antiCorruptionScore: 60,
        auditCommitteeScore: 70,
      },
      riskFlags: [
        {
          id: "XOM-ENV-001",
          pillar: "environmental",
          severity: "critical",
          title: "Major Oil Spill Litigation",
          description:
            "Ongoing litigation related to environmental damage from drilling operations",
          identifiedDate: new Date("2025-06-15"),
          isActive: true,
        },
        {
          id: "XOM-GOV-001",
          pillar: "governance",
          severity: "high",
          title: "Climate Disclosure Concerns",
          description:
            "Insufficient climate risk disclosure per TCFD framework",
          identifiedDate: new Date("2025-09-01"),
          isActive: true,
        },
      ],
      lastUpdated: now,
    });

    // Healthcare
    this.addProfile({
      symbol: "JNJ",
      name: "Johnson & Johnson",
      sector: "Healthcare",
      environmental: {
        carbonIntensity: 35,
        renewableEnergyPct: 60,
        wasteDiversionPct: 70,
        waterEfficiency: 72,
        hasScienceBasedTargets: true,
      },
      social: {
        employeeSatisfaction: 78,
        diversityPct: 48,
        safetyIncidentRate: 0.5,
        communityInvestmentPct: 2.0,
        hasHumanRightsPolicy: true,
      },
      governance: {
        boardIndependencePct: 85,
        hasSplitChairCeo: true,
        executivePayRatio: 220,
        antiCorruptionScore: 82,
        auditCommitteeScore: 88,
      },
      riskFlags: [
        {
          id: "JNJ-SOC-001",
          pillar: "social",
          severity: "medium",
          title: "Product Safety Recall",
          description:
            "Minor product recall affecting a limited batch of consumer products",
          identifiedDate: new Date("2025-11-20"),
          isActive: true,
        },
      ],
      lastUpdated: now,
    });

    // Clean Energy
    this.addProfile({
      symbol: "NEE",
      name: "NextEra Energy Inc.",
      sector: "Utilities",
      environmental: {
        carbonIntensity: 8,
        renewableEnergyPct: 85,
        wasteDiversionPct: 88,
        waterEfficiency: 90,
        hasScienceBasedTargets: true,
      },
      social: {
        employeeSatisfaction: 80,
        diversityPct: 40,
        safetyIncidentRate: 0.4,
        communityInvestmentPct: 1.0,
        hasHumanRightsPolicy: true,
      },
      governance: {
        boardIndependencePct: 90,
        hasSplitChairCeo: true,
        executivePayRatio: 180,
        antiCorruptionScore: 88,
        auditCommitteeScore: 91,
      },
      riskFlags: [],
      lastUpdated: now,
    });

    // Sector benchmarks
    this.benchmarks.set("technology", {
      sector: "Technology",
      averageOverall: 72,
      averageEnvironmental: 70,
      averageSocial: 68,
      averageGovernance: 78,
      companyCount: 150,
      bestInClass: 92,
      worstInClass: 35,
    });

    this.benchmarks.set("energy", {
      sector: "Energy",
      averageOverall: 42,
      averageEnvironmental: 30,
      averageSocial: 45,
      averageGovernance: 55,
      companyCount: 80,
      bestInClass: 75,
      worstInClass: 15,
    });

    this.benchmarks.set("healthcare", {
      sector: "Healthcare",
      averageOverall: 65,
      averageEnvironmental: 60,
      averageSocial: 70,
      averageGovernance: 68,
      companyCount: 120,
      bestInClass: 88,
      worstInClass: 30,
    });

    this.benchmarks.set("utilities", {
      sector: "Utilities",
      averageOverall: 68,
      averageEnvironmental: 65,
      averageSocial: 62,
      averageGovernance: 75,
      companyCount: 60,
      bestInClass: 90,
      worstInClass: 28,
    });
  }

  private addProfile(
    data: Omit<ESGProfile, "score"> & {
      environmental: EnvironmentalMetrics;
      social: SocialMetrics;
      governance: GovernanceMetrics;
      riskFlags: ESGRiskFlag[];
      lastUpdated: Date;
    },
  ): void {
    const envScore = ESGScoringService.calculateEnvironmentalScore(
      data.environmental,
    );
    const socScore = ESGScoringService.calculateSocialScore(data.social);
    const govScore = ESGScoringService.calculateGovernanceScore(
      data.governance,
    );

    const score = ESGScoringService.computeCompositeScore(
      envScore,
      socScore,
      govScore,
    );

    this.profiles.set(data.symbol.toUpperCase(), {
      symbol: data.symbol,
      name: data.name,
      sector: data.sector,
      score,
      environmental: data.environmental,
      social: data.social,
      governance: data.governance,
      riskFlags: data.riskFlags,
      lastUpdated: data.lastUpdated,
    });
  }
}

// ============================================================================
// ESG SCORING SERVICE
// ============================================================================

class ESGScoringService {
  private dataProvider: ESGDataProvider;

  constructor(dataProvider?: ESGDataProvider) {
    this.dataProvider = dataProvider ?? new MockESGDataProvider();
  }

  // --------------------------------------------------------------------------
  // Static scoring helpers (used by both the service and the mock data provider)
  // --------------------------------------------------------------------------

  /**
   * Calculate environmental pillar score from metrics.
   * Returns score 0-100.
   */
  static calculateEnvironmentalScore(metrics: EnvironmentalMetrics): number {
    let score = 0;

    // Carbon intensity (0-30 points) — lower is better
    if (metrics.carbonIntensity <= 10) score += 30;
    else if (metrics.carbonIntensity <= 50) score += 25;
    else if (metrics.carbonIntensity <= 100) score += 18;
    else if (metrics.carbonIntensity <= 300) score += 10;
    else score += 3;

    // Renewable energy percentage (0-25 points)
    score += (metrics.renewableEnergyPct / 100) * 25;

    // Waste diversion (0-15 points)
    score += (metrics.wasteDiversionPct / 100) * 15;

    // Water efficiency (0-15 points)
    score += (metrics.waterEfficiency / 100) * 15;

    // Science-based targets (0-15 points)
    score += metrics.hasScienceBasedTargets ? 15 : 0;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate social pillar score from metrics.
   * Returns score 0-100.
   */
  static calculateSocialScore(metrics: SocialMetrics): number {
    let score = 0;

    // Employee satisfaction (0-30 points)
    score += (metrics.employeeSatisfaction / 100) * 30;

    // Diversity (0-20 points) — target >= 50%
    score += Math.min(20, (metrics.diversityPct / 50) * 20);

    // Safety (0-20 points) — lower incident rate is better
    if (metrics.safetyIncidentRate <= 0.3) score += 20;
    else if (metrics.safetyIncidentRate <= 0.5) score += 16;
    else if (metrics.safetyIncidentRate <= 1.0) score += 10;
    else if (metrics.safetyIncidentRate <= 2.0) score += 5;
    else score += 2;

    // Community investment (0-15 points) — target >= 2%
    score += Math.min(15, (metrics.communityInvestmentPct / 2) * 15);

    // Human rights policy (0-15 points)
    score += metrics.hasHumanRightsPolicy ? 15 : 0;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate governance pillar score from metrics.
   * Returns score 0-100.
   */
  static calculateGovernanceScore(metrics: GovernanceMetrics): number {
    let score = 0;

    // Board independence (0-25 points) — target >= 75%
    score += Math.min(25, (metrics.boardIndependencePct / 75) * 25);

    // Chair/CEO split (0-15 points)
    score += metrics.hasSplitChairCeo ? 15 : 0;

    // Executive pay ratio (0-20 points) — lower ratio is better
    if (metrics.executivePayRatio <= 100) score += 20;
    else if (metrics.executivePayRatio <= 200) score += 15;
    else if (metrics.executivePayRatio <= 300) score += 10;
    else score += 5;

    // Anti-corruption (0-20 points)
    score += (metrics.antiCorruptionScore / 100) * 20;

    // Audit committee (0-20 points)
    score += (metrics.auditCommitteeScore / 100) * 20;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Compute the composite ESGScore from pillar scores.
   */
  static computeCompositeScore(
    envScore: number,
    socScore: number,
    govScore: number,
    weights: Record<ESGPillar, number> = DEFAULT_PILLAR_WEIGHTS,
  ): ESGScore {
    const overall = Math.round(
      envScore * weights.environmental +
        socScore * weights.social +
        govScore * weights.governance,
    );

    return {
      overall,
      grade: ESGScoringService.getGrade(overall),
      environmental: {
        pillar: "environmental",
        score: envScore,
        grade: ESGScoringService.getGrade(envScore),
        weight: weights.environmental,
      },
      social: {
        pillar: "social",
        score: socScore,
        grade: ESGScoringService.getGrade(socScore),
        weight: weights.social,
      },
      governance: {
        pillar: "governance",
        score: govScore,
        grade: ESGScoringService.getGrade(govScore),
        weight: weights.governance,
      },
      calculatedAt: new Date(),
    };
  }

  /**
   * Convert a 0-100 score to a letter grade.
   */
  static getGrade(score: number): ESGGrade {
    for (const threshold of GRADE_THRESHOLDS) {
      if (score >= threshold.min) {
        return threshold.grade;
      }
    }
    return "F";
  }

  // --------------------------------------------------------------------------
  // Data provider management
  // --------------------------------------------------------------------------

  /**
   * Replace the active data provider (e.g., swap mock for production source).
   */
  setDataProvider(provider: ESGDataProvider): void {
    this.dataProvider = provider;
  }

  /**
   * Get the active data provider.
   */
  getDataProvider(): ESGDataProvider {
    return this.dataProvider;
  }

  // --------------------------------------------------------------------------
  // Company ESG Profile
  // --------------------------------------------------------------------------

  /**
   * Fetch the ESG profile for a single company by symbol.
   */
  async getCompanyProfile(symbol: string): Promise<ESGProfile | null> {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error("Symbol must not be empty");
    }
    return this.dataProvider.getProfile(symbol.trim().toUpperCase());
  }

  /**
   * Calculate ESG score for raw metrics (without requiring a stored profile).
   */
  calculateScore(
    environmental: EnvironmentalMetrics,
    social: SocialMetrics,
    governance: GovernanceMetrics,
    weights?: Record<ESGPillar, number>,
  ): ESGScore {
    const envScore =
      ESGScoringService.calculateEnvironmentalScore(environmental);
    const socScore = ESGScoringService.calculateSocialScore(social);
    const govScore = ESGScoringService.calculateGovernanceScore(governance);

    return ESGScoringService.computeCompositeScore(
      envScore,
      socScore,
      govScore,
      weights,
    );
  }

  // --------------------------------------------------------------------------
  // Portfolio ESG Screening
  // --------------------------------------------------------------------------

  /**
   * Screen an entire portfolio for ESG compliance.
   */
  async screenPortfolio(
    holdings: PortfolioHolding[],
    thresholds?: Partial<ESGScreeningThresholds>,
  ): Promise<ESGScreeningResult> {
    if (holdings.length === 0) {
      throw new Error("Portfolio must have at least one holding");
    }

    const mergedThresholds: ESGScreeningThresholds = {
      ...DEFAULT_SCREENING_THRESHOLDS,
      ...thresholds,
    };

    // Fetch all ESG profiles
    const symbols = holdings.map((h) => h.symbol);
    const profiles = await this.dataProvider.getProfiles(symbols);

    // Evaluate each holding
    const holdingResults: HoldingESGResult[] = [];
    let totalWeightedEnv = 0;
    let totalWeightedSoc = 0;
    let totalWeightedGov = 0;
    let totalScoredWeight = 0;
    let passedCount = 0;
    let failedCount = 0;
    let noDataCount = 0;

    for (const holding of holdings) {
      const profile = profiles.get(holding.symbol.toUpperCase());

      if (!profile) {
        noDataCount++;
        holdingResults.push({
          holding,
          score: null,
          riskFlags: [],
          passesScreening: false,
          failureReasons: ["No ESG data available"],
        });
        continue;
      }

      const { passesScreening, failureReasons } = this.evaluateHolding(
        profile,
        mergedThresholds,
      );

      if (passesScreening) {
        passedCount++;
      } else {
        failedCount++;
      }

      holdingResults.push({
        holding,
        score: profile.score,
        riskFlags: profile.riskFlags.filter((f) => f.isActive),
        passesScreening,
        failureReasons,
      });

      // Accumulate weighted scores for portfolio-level calculation
      totalWeightedEnv +=
        profile.score.environmental.score * holding.weight;
      totalWeightedSoc += profile.score.social.score * holding.weight;
      totalWeightedGov += profile.score.governance.score * holding.weight;
      totalScoredWeight += holding.weight;
    }

    // Compute portfolio-level score (using only holdings with data)
    let portfolioScore: ESGScore;
    if (totalScoredWeight > 0) {
      const normEnv = Math.round(totalWeightedEnv / totalScoredWeight);
      const normSoc = Math.round(totalWeightedSoc / totalScoredWeight);
      const normGov = Math.round(totalWeightedGov / totalScoredWeight);
      portfolioScore = ESGScoringService.computeCompositeScore(
        normEnv,
        normSoc,
        normGov,
      );
    } else {
      portfolioScore = ESGScoringService.computeCompositeScore(0, 0, 0);
    }

    return {
      portfolioScore,
      holdings: holdingResults,
      passedCount,
      failedCount,
      noDataCount,
      portfolioGrade: portfolioScore.grade,
      thresholds: mergedThresholds,
      screenedAt: new Date(),
    };
  }

  /**
   * Evaluate a single holding against screening thresholds.
   */
  private evaluateHolding(
    profile: ESGProfile,
    thresholds: ESGScreeningThresholds,
  ): { passesScreening: boolean; failureReasons: string[] } {
    const failureReasons: string[] = [];

    if (profile.score.overall < thresholds.minOverallScore) {
      failureReasons.push(
        `Overall ESG score ${profile.score.overall} below minimum ${thresholds.minOverallScore}`,
      );
    }
    if (
      profile.score.environmental.score < thresholds.minEnvironmentalScore
    ) {
      failureReasons.push(
        `Environmental score ${profile.score.environmental.score} below minimum ${thresholds.minEnvironmentalScore}`,
      );
    }
    if (profile.score.social.score < thresholds.minSocialScore) {
      failureReasons.push(
        `Social score ${profile.score.social.score} below minimum ${thresholds.minSocialScore}`,
      );
    }
    if (profile.score.governance.score < thresholds.minGovernanceScore) {
      failureReasons.push(
        `Governance score ${profile.score.governance.score} below minimum ${thresholds.minGovernanceScore}`,
      );
    }

    if (thresholds.excludeCriticalRisks) {
      const criticalFlags = profile.riskFlags.filter(
        (f) => f.severity === "critical" && f.isActive,
      );
      if (criticalFlags.length > 0) {
        failureReasons.push(
          `Has ${criticalFlags.length} active critical risk flag(s): ${criticalFlags.map((f) => f.title).join(", ")}`,
        );
      }
    }

    return {
      passesScreening: failureReasons.length === 0,
      failureReasons,
    };
  }

  // --------------------------------------------------------------------------
  // ESG Trend Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze ESG score trends for a symbol over time.
   */
  async analyzeTrend(
    symbol: string,
    periods: number = 12,
  ): Promise<ESGTrendAnalysis> {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error("Symbol must not be empty");
    }
    if (periods < 2) {
      throw new Error("At least 2 periods are required for trend analysis");
    }

    const history = await this.dataProvider.getHistory(
      symbol.trim().toUpperCase(),
      periods,
    );

    if (history.length < 2) {
      return {
        symbol: symbol.toUpperCase(),
        overallTrend: "stable",
        pillarTrends: {
          environmental: "stable",
          social: "stable",
          governance: "stable",
        },
        scoreChange: 0,
        scoreChangePct: 0,
        periodsAnalyzed: history.length,
        history,
      };
    }

    const oldest = history[0];
    const newest = history[history.length - 1];

    const scoreChange = newest.overall - oldest.overall;
    const scoreChangePct =
      oldest.overall === 0
        ? 0
        : Math.round((scoreChange / oldest.overall) * 10000) / 100;

    return {
      symbol: symbol.toUpperCase(),
      overallTrend: this.determineTrend(scoreChange),
      pillarTrends: {
        environmental: this.determineTrend(
          newest.environmental - oldest.environmental,
        ),
        social: this.determineTrend(newest.social - oldest.social),
        governance: this.determineTrend(
          newest.governance - oldest.governance,
        ),
      },
      scoreChange: Math.round(scoreChange * 100) / 100,
      scoreChangePct,
      periodsAnalyzed: history.length,
      history,
    };
  }

  /**
   * Determine trend direction from a score delta.
   */
  private determineTrend(delta: number): ESGTrend {
    if (delta > TREND_THRESHOLD) return "improving";
    if (delta < -TREND_THRESHOLD) return "declining";
    return "stable";
  }

  // --------------------------------------------------------------------------
  // Sector Benchmarking
  // --------------------------------------------------------------------------

  /**
   * Compare a company's ESG score against its sector benchmark.
   */
  async compareSectorBenchmark(
    symbol: string,
  ): Promise<SectorComparison | null> {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error("Symbol must not be empty");
    }

    const profile = await this.dataProvider.getProfile(
      symbol.trim().toUpperCase(),
    );
    if (!profile) return null;

    const benchmark = await this.dataProvider.getSectorBenchmark(
      profile.sector,
    );
    if (!benchmark) return null;

    const delta = profile.score.overall - benchmark.averageOverall;

    // Estimate percentile rank within sector
    const range = benchmark.bestInClass - benchmark.worstInClass;
    const percentileRank =
      range > 0
        ? Math.round(
            ((profile.score.overall - benchmark.worstInClass) / range) * 100,
          )
        : 50;

    return {
      symbol: symbol.toUpperCase(),
      sector: profile.sector,
      companyScore: profile.score.overall,
      sectorAverage: benchmark.averageOverall,
      delta,
      percentileRank: Math.min(100, Math.max(0, percentileRank)),
      pillarComparisons: [
        {
          pillar: "environmental",
          companyScore: profile.score.environmental.score,
          sectorAverage: benchmark.averageEnvironmental,
          delta:
            profile.score.environmental.score -
            benchmark.averageEnvironmental,
        },
        {
          pillar: "social",
          companyScore: profile.score.social.score,
          sectorAverage: benchmark.averageSocial,
          delta: profile.score.social.score - benchmark.averageSocial,
        },
        {
          pillar: "governance",
          companyScore: profile.score.governance.score,
          sectorAverage: benchmark.averageGovernance,
          delta:
            profile.score.governance.score - benchmark.averageGovernance,
        },
      ],
      benchmark,
    };
  }

  // --------------------------------------------------------------------------
  // ESG Risk Flags
  // --------------------------------------------------------------------------

  /**
   * Get all active ESG risk flags for a symbol.
   */
  async getRiskFlags(symbol: string): Promise<ESGRiskFlag[]> {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error("Symbol must not be empty");
    }

    const profile = await this.dataProvider.getProfile(
      symbol.trim().toUpperCase(),
    );
    if (!profile) return [];

    return profile.riskFlags.filter((f) => f.isActive);
  }

  /**
   * Get all risk flags across a portfolio, sorted by severity.
   */
  async getPortfolioRiskFlags(
    holdings: PortfolioHolding[],
  ): Promise<{ symbol: string; flags: ESGRiskFlag[] }[]> {
    const symbols = holdings.map((h) => h.symbol);
    const profiles = await this.dataProvider.getProfiles(symbols);

    const severityOrder: Record<RiskSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const results: { symbol: string; flags: ESGRiskFlag[] }[] = [];

    for (const holding of holdings) {
      const profile = profiles.get(holding.symbol.toUpperCase());
      if (profile) {
        const activeFlags = profile.riskFlags
          .filter((f) => f.isActive)
          .sort(
            (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
          );
        if (activeFlags.length > 0) {
          results.push({ symbol: holding.symbol, flags: activeFlags });
        }
      }
    }

    // Sort by most severe flag first
    results.sort((a, b) => {
      const aSev = severityOrder[a.flags[0].severity];
      const bSev = severityOrder[b.flags[0].severity];
      return aSev - bSev;
    });

    return results;
  }

  // --------------------------------------------------------------------------
  // Green/Sustainable Investment Recommendations
  // --------------------------------------------------------------------------

  /**
   * Generate green/sustainable investment recommendations based on portfolio analysis.
   * Identifies holdings with poor ESG scores and suggests replacements.
   */
  async getRecommendations(
    holdings: PortfolioHolding[],
    thresholds?: Partial<ESGScreeningThresholds>,
  ): Promise<ESGRecommendation[]> {
    if (holdings.length === 0) {
      return [];
    }

    const mergedThresholds: ESGScreeningThresholds = {
      ...DEFAULT_SCREENING_THRESHOLDS,
      ...thresholds,
    };

    const symbols = holdings.map((h) => h.symbol);
    const profiles = await this.dataProvider.getProfiles(symbols);

    const recommendations: ESGRecommendation[] = [];

    // Find holdings that fail screening
    const failingHoldings: PortfolioHolding[] = [];
    for (const holding of holdings) {
      const profile = profiles.get(holding.symbol.toUpperCase());
      if (!profile) continue;

      const { passesScreening } = this.evaluateHolding(
        profile,
        mergedThresholds,
      );
      if (!passesScreening) {
        failingHoldings.push(holding);
      }
    }

    if (failingHoldings.length === 0) {
      return [];
    }

    // Find potential replacements from the available data
    // (all profiles with scores above thresholds and in similar sectors)
    const allSymbols = ["AAPL", "MSFT", "JNJ", "NEE"];
    const allProfiles = await this.dataProvider.getProfiles(allSymbols);

    for (const failing of failingHoldings) {
      const failProfile = profiles.get(failing.symbol.toUpperCase());
      const failSector = failProfile?.sector ?? failing.sector;

      // Find best replacement in same sector first, then any sector
      let bestMatch: ESGProfile | null = null;
      let bestScore = 0;

      for (const [sym, profile] of allProfiles) {
        // Don't recommend something already in the portfolio
        if (symbols.map((s) => s.toUpperCase()).includes(sym)) continue;

        const { passesScreening } = this.evaluateHolding(
          profile,
          mergedThresholds,
        );
        if (!passesScreening) continue;

        // Prefer same sector
        const sectorBonus =
          profile.sector.toLowerCase() === failSector.toLowerCase() ? 10 : 0;
        const candidateScore = profile.score.overall + sectorBonus;

        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestMatch = profile;
        }
      }

      if (bestMatch) {
        const priority: RecommendationPriority =
          (failProfile?.score.overall ?? 0) < 30
            ? "high"
            : (failProfile?.score.overall ?? 0) < 50
              ? "medium"
              : "low";

        recommendations.push({
          symbol: bestMatch.symbol,
          name: bestMatch.name,
          sector: bestMatch.sector,
          score: bestMatch.score,
          priority,
          rationale: `Replace ${failing.symbol} (ESG: ${failProfile?.score.overall ?? "N/A"}) with ${bestMatch.symbol} (ESG: ${bestMatch.score.overall}) for improved ESG alignment`,
          replacesSymbols: [failing.symbol],
        });
      }
    }

    // Sort by priority
    const priorityOrder: Record<RecommendationPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return recommendations;
  }

  // --------------------------------------------------------------------------
  // ESG Compliance Reporting
  // --------------------------------------------------------------------------

  /**
   * Generate a comprehensive ESG compliance report for a portfolio.
   */
  async generateComplianceReport(
    holdings: PortfolioHolding[],
    thresholds?: Partial<ESGScreeningThresholds>,
    reportTitle?: string,
  ): Promise<ESGComplianceReport> {
    if (holdings.length === 0) {
      throw new Error("Portfolio must have at least one holding");
    }

    const screeningResult = await this.screenPortfolio(
      holdings,
      thresholds,
    );

    // Collect all active risk flags
    const activeRiskFlags: ESGRiskFlag[] = [];
    for (const holdingResult of screeningResult.holdings) {
      for (const flag of holdingResult.riskFlags) {
        activeRiskFlags.push(flag);
      }
    }

    // Calculate sector breakdown
    const sectorMap = new Map<
      string,
      { count: number; totalWeight: number; totalScore: number }
    >();

    for (const holdingResult of screeningResult.holdings) {
      const sector = holdingResult.holding.sector;
      const existing = sectorMap.get(sector) ?? {
        count: 0,
        totalWeight: 0,
        totalScore: 0,
      };

      existing.count++;
      existing.totalWeight += holdingResult.holding.weight;
      if (holdingResult.score) {
        existing.totalScore += holdingResult.score.overall;
      }
      sectorMap.set(sector, existing);
    }

    const sectorBreakdown: SectorBreakdownEntry[] = [];
    for (const [sector, data] of sectorMap) {
      const avgScore =
        data.count > 0 ? Math.round(data.totalScore / data.count) : 0;
      sectorBreakdown.push({
        sector,
        holdingCount: data.count,
        portfolioWeightPct: Math.round(data.totalWeight * 10000) / 100,
        averageESGScore: avgScore,
        averageGrade: ESGScoringService.getGrade(avgScore),
      });
    }

    // Sort sector breakdown by weight descending
    sectorBreakdown.sort(
      (a, b) => b.portfolioWeightPct - a.portfolioWeightPct,
    );

    // Calculate coverage
    const withData = holdings.length - screeningResult.noDataCount;
    const coveragePct =
      holdings.length > 0
        ? Math.round((withData / holdings.length) * 10000) / 100
        : 0;

    // Generate summary narrative
    const summary = this.generateComplianceSummary(
      screeningResult,
      coveragePct,
      activeRiskFlags.length,
    );

    return {
      title: reportTitle ?? "ESG Compliance Report",
      generatedAt: new Date(),
      portfolioScore: screeningResult.portfolioScore,
      coveragePct,
      compliantHoldings: screeningResult.passedCount,
      nonCompliantHoldings: screeningResult.failedCount,
      totalHoldings: holdings.length,
      activeRiskFlags,
      sectorBreakdown,
      summary,
      thresholds: screeningResult.thresholds,
    };
  }

  /**
   * Generate a human-readable compliance summary.
   */
  private generateComplianceSummary(
    result: ESGScreeningResult,
    coveragePct: number,
    riskFlagCount: number,
  ): string {
    const parts: string[] = [];

    parts.push(
      `Portfolio ESG score: ${result.portfolioScore.overall}/100 (Grade ${result.portfolioScore.grade}).`,
    );

    parts.push(
      `ESG data coverage: ${coveragePct}% of holdings.`,
    );

    const total = result.passedCount + result.failedCount + result.noDataCount;
    if (total > 0) {
      const complianceRate =
        result.passedCount > 0
          ? Math.round((result.passedCount / total) * 100)
          : 0;
      parts.push(
        `${result.passedCount} of ${total} holdings (${complianceRate}%) meet ESG screening thresholds.`,
      );
    }

    if (result.failedCount > 0) {
      parts.push(
        `${result.failedCount} holding(s) failed ESG screening and may require review.`,
      );
    }

    if (riskFlagCount > 0) {
      parts.push(
        `${riskFlagCount} active ESG risk flag(s) identified across the portfolio.`,
      );
    }

    if (result.portfolioScore.overall >= 80) {
      parts.push("The portfolio demonstrates strong ESG alignment.");
    } else if (result.portfolioScore.overall >= 60) {
      parts.push(
        "The portfolio shows moderate ESG alignment with room for improvement.",
      );
    } else {
      parts.push(
        "The portfolio has significant ESG gaps that should be addressed.",
      );
    }

    return parts.join(" ");
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Singleton instance for direct import */
const esgScoringService = new ESGScoringService();

/** Factory function matching project convention */
function createESGScoringService(
  dataProvider?: ESGDataProvider,
): ESGScoringService {
  return new ESGScoringService(dataProvider);
}

export {
  ESGScoringService,
  esgScoringService,
  createESGScoringService,
  MockESGDataProvider,
};

export type {
  ESGGrade,
  ESGPillar,
  RiskSeverity,
  ESGTrend,
  RecommendationPriority,
  ESGPillarScore,
  ESGScore,
  EnvironmentalMetrics,
  SocialMetrics,
  GovernanceMetrics,
  ESGProfile,
  ESGDataProvider,
  PortfolioHolding,
  HoldingESGResult,
  ESGScreeningResult,
  ESGScreeningThresholds,
  ESGHistoryEntry,
  ESGTrendAnalysis,
  SectorBenchmark,
  SectorComparison,
  ESGRiskFlag,
  ESGRecommendation,
  ESGComplianceReport,
  SectorBreakdownEntry,
};

export default esgScoringService;
