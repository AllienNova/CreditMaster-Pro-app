/**
 * Alternative Asset Scanner Service
 *
 * Comprehensive alternative asset portfolio management:
 * - Asset types: art, wine, watches, crypto, real estate, collectibles, precious metals
 * - Portfolio tracking: add/update/remove alternative assets
 * - Valuation estimation using market data patterns
 * - Diversification analysis (correlation with traditional assets)
 * - Risk assessment for illiquid assets
 * - Historical performance tracking
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type AlternativeAssetType =
  | "art"
  | "wine"
  | "watches"
  | "crypto"
  | "real_estate"
  | "collectibles"
  | "precious_metals";

export type AssetCondition =
  | "mint"
  | "excellent"
  | "good"
  | "fair"
  | "poor";

export type LiquidityRating =
  | "high"
  | "medium"
  | "low"
  | "very_low";

export type RiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "very_high";

export interface AlternativeAsset {
  id: string;
  userId: string;
  name: string;
  type: AlternativeAssetType;
  description?: string;

  // Valuation
  purchasePrice: number;
  purchaseDate: Date;
  currentValue: number;
  lastValuationDate: Date;
  valuationSource: "manual" | "market_data" | "appraisal" | "auction_comparable";
  currency: string;

  // Details
  condition?: AssetCondition;
  provenance?: string;
  authenticityCertified: boolean;
  storageLocation?: string;
  insuranceValue?: number;
  insuranceProvider?: string;

  // Metadata
  imageUrls?: string[];
  documents?: AssetDocument[];
  tags?: string[];
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface AssetDocument {
  id: string;
  name: string;
  type: "certificate" | "appraisal" | "receipt" | "insurance" | "provenance" | "other";
  url: string;
  uploadedAt: Date;
}

export interface AssetValuation {
  id: string;
  assetId: string;
  date: Date;
  value: number;
  source: "manual" | "market_data" | "appraisal" | "auction_comparable";
  notes?: string;
}

export interface PortfolioSummary {
  totalAssets: number;
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  byType: AssetTypeAllocation[];
  topHoldings: AlternativeAsset[];
  averageLiquidityScore: number;
  overallRiskLevel: RiskLevel;
}

export interface AssetTypeAllocation {
  type: AlternativeAssetType;
  count: number;
  totalValue: number;
  percentage: number;
  averageReturn: number;
}

export interface DiversificationAnalysis {
  userId: string;
  alternativeAllocationPercent: number;
  traditionalAllocationPercent: number;
  correlationWithStocks: number;
  correlationWithBonds: number;
  correlationWithRealEstate: number;
  diversificationScore: number;
  recommendations: string[];
}

export interface RiskAssessment {
  assetId: string;
  assetType: AlternativeAssetType;
  liquidityRating: LiquidityRating;
  volatilityScore: number;
  marketRiskScore: number;
  concentrationRisk: number;
  overallRiskLevel: RiskLevel;
  estimatedLiquidationTimeWeeks: number;
  riskFactors: string[];
  mitigationStrategies: string[];
}

export interface PerformanceRecord {
  assetId: string;
  period: string;
  startValue: number;
  endValue: number;
  returnPercent: number;
  annualizedReturn: number;
}

// ============================================================================
// MARKET DATA (reference data for valuation estimation)
// ============================================================================

const ASSET_TYPE_BENCHMARKS: Record<
  AlternativeAssetType,
  {
    avgAnnualReturn: number;
    volatility: number;
    stockCorrelation: number;
    bondCorrelation: number;
    realEstateCorrelation: number;
    liquidityRating: LiquidityRating;
    avgLiquidationWeeks: number;
  }
> = {
  art: {
    avgAnnualReturn: 7.5,
    volatility: 15.0,
    stockCorrelation: 0.12,
    bondCorrelation: 0.05,
    realEstateCorrelation: 0.18,
    liquidityRating: "very_low",
    avgLiquidationWeeks: 12,
  },
  wine: {
    avgAnnualReturn: 8.2,
    volatility: 10.0,
    stockCorrelation: 0.08,
    bondCorrelation: 0.03,
    realEstateCorrelation: 0.10,
    liquidityRating: "low",
    avgLiquidationWeeks: 8,
  },
  watches: {
    avgAnnualReturn: 5.0,
    volatility: 12.0,
    stockCorrelation: 0.15,
    bondCorrelation: 0.02,
    realEstateCorrelation: 0.08,
    liquidityRating: "low",
    avgLiquidationWeeks: 6,
  },
  crypto: {
    avgAnnualReturn: 25.0,
    volatility: 65.0,
    stockCorrelation: 0.45,
    bondCorrelation: -0.10,
    realEstateCorrelation: 0.20,
    liquidityRating: "high",
    avgLiquidationWeeks: 0.1,
  },
  real_estate: {
    avgAnnualReturn: 8.0,
    volatility: 12.0,
    stockCorrelation: 0.35,
    bondCorrelation: 0.15,
    realEstateCorrelation: 1.0,
    liquidityRating: "very_low",
    avgLiquidationWeeks: 16,
  },
  collectibles: {
    avgAnnualReturn: 6.0,
    volatility: 18.0,
    stockCorrelation: 0.10,
    bondCorrelation: 0.04,
    realEstateCorrelation: 0.12,
    liquidityRating: "low",
    avgLiquidationWeeks: 10,
  },
  precious_metals: {
    avgAnnualReturn: 5.5,
    volatility: 15.0,
    stockCorrelation: -0.05,
    bondCorrelation: 0.30,
    realEstateCorrelation: 0.10,
    liquidityRating: "medium",
    avgLiquidationWeeks: 1,
  },
};

// ============================================================================
// SERVICE
// ============================================================================

export class AlternativeAssetService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // ASSET MANAGEMENT (CRUD)
  // ==========================================================================

  async addAsset(
    asset: Omit<AlternativeAsset, "id" | "createdAt" | "updatedAt">,
  ): Promise<AlternativeAsset> {
    const now = new Date();
    const newAsset: AlternativeAsset = {
      ...asset,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("alternative_assets")
      .insert(this.assetToDb(newAsset))
      .select()
      .single();

    if (error) throw error;
    return this.assetFromDb(data);
  }

  async updateAsset(
    assetId: string,
    updates: Partial<AlternativeAsset>,
  ): Promise<AlternativeAsset> {
    const { data, error } = await this.supabase
      .from("alternative_assets")
      .update({
        ...this.assetToDb(updates),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)
      .select()
      .single();

    if (error) throw error;
    return this.assetFromDb(data);
  }

  async getAsset(assetId: string): Promise<AlternativeAsset | null> {
    const { data } = await this.supabase
      .from("alternative_assets")
      .select("*")
      .eq("id", assetId)
      .single();

    return data ? this.assetFromDb(data) : null;
  }

  async getUserAssets(userId: string): Promise<AlternativeAsset[]> {
    const { data, error } = await this.supabase
      .from("alternative_assets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.assetFromDb);
  }

  async getUserAssetsByType(
    userId: string,
    type: AlternativeAssetType,
  ): Promise<AlternativeAsset[]> {
    const { data, error } = await this.supabase
      .from("alternative_assets")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .order("current_value", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.assetFromDb);
  }

  async removeAsset(assetId: string): Promise<void> {
    // Delete valuation history first
    await this.supabase
      .from("alternative_asset_valuations")
      .delete()
      .eq("asset_id", assetId);

    const { error } = await this.supabase
      .from("alternative_assets")
      .delete()
      .eq("id", assetId);

    if (error) throw error;
  }

  // ==========================================================================
  // VALUATION
  // ==========================================================================

  async updateValuation(
    assetId: string,
    value: number,
    source: AssetValuation["source"],
    notes?: string,
  ): Promise<AlternativeAsset> {
    const now = new Date();

    // Store valuation history
    await this.supabase.from("alternative_asset_valuations").insert({
      id: crypto.randomUUID(),
      asset_id: assetId,
      value,
      source,
      date: now.toISOString(),
      notes: notes ?? null,
    });

    // Update current value
    return this.updateAsset(assetId, {
      currentValue: value,
      lastValuationDate: now,
      valuationSource: source,
    });
  }

  async getValuationHistory(assetId: string): Promise<AssetValuation[]> {
    const { data, error } = await this.supabase
      .from("alternative_asset_valuations")
      .select("*")
      .eq("asset_id", assetId)
      .order("date", { ascending: false });

    if (error) throw error;
    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      assetId: row.asset_id as string,
      date: new Date(row.date as string),
      value: row.value as number,
      source: row.source as AssetValuation["source"],
      notes: row.notes as string | undefined,
    }));
  }

  estimateCurrentValue(
    asset: AlternativeAsset,
  ): { estimate: number; range: { low: number; high: number }; confidence: number } {
    const benchmark = ASSET_TYPE_BENCHMARKS[asset.type];
    const yearsHeld =
      (Date.now() - asset.purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // Compound growth from purchase price using type benchmark return
    const annualReturn = benchmark.avgAnnualReturn / 100;
    const estimatedValue = asset.purchasePrice * Math.pow(1 + annualReturn, yearsHeld);

    // Range based on volatility
    const volatilityFactor = benchmark.volatility / 100;
    const confidenceInterval = volatilityFactor * Math.sqrt(yearsHeld);
    const low = estimatedValue * (1 - confidenceInterval);
    const high = estimatedValue * (1 + confidenceInterval);

    // Confidence decreases with time since last valuation
    const daysSinceValuation =
      (Date.now() - asset.lastValuationDate.getTime()) / (24 * 60 * 60 * 1000);
    const confidence = Math.max(0.1, Math.min(1.0, 1.0 - daysSinceValuation / 365));

    return {
      estimate: Math.round(estimatedValue * 100) / 100,
      range: {
        low: Math.max(0, Math.round(low * 100) / 100),
        high: Math.round(high * 100) / 100,
      },
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // ==========================================================================
  // PORTFOLIO SUMMARY
  // ==========================================================================

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const assets = await this.getUserAssets(userId);

    let totalValue = 0;
    let totalCostBasis = 0;
    const typeMap = new Map<
      AlternativeAssetType,
      { count: number; totalValue: number; totalReturn: number }
    >();

    for (const asset of assets) {
      totalValue += asset.currentValue;
      totalCostBasis += asset.purchasePrice;

      const existing = typeMap.get(asset.type) || {
        count: 0,
        totalValue: 0,
        totalReturn: 0,
      };
      existing.count++;
      existing.totalValue += asset.currentValue;
      const assetReturn =
        asset.purchasePrice > 0
          ? ((asset.currentValue - asset.purchasePrice) / asset.purchasePrice) * 100
          : 0;
      existing.totalReturn += assetReturn;
      typeMap.set(asset.type, existing);
    }

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent =
      totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    const byType: AssetTypeAllocation[] = Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        totalValue: data.totalValue,
        percentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0,
        averageReturn: data.count > 0 ? data.totalReturn / data.count : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const topHoldings = [...assets]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 10);

    // Calculate average liquidity score (1=high, 4=very_low)
    const liquidityScores: Record<LiquidityRating, number> = {
      high: 1,
      medium: 2,
      low: 3,
      very_low: 4,
    };
    let liquiditySum = 0;
    for (const asset of assets) {
      const benchmark = ASSET_TYPE_BENCHMARKS[asset.type];
      liquiditySum += liquidityScores[benchmark.liquidityRating];
    }
    const averageLiquidityScore =
      assets.length > 0 ? liquiditySum / assets.length : 0;

    // Overall risk level based on concentration and liquidity
    const overallRiskLevel = this.calculateOverallRiskLevel(
      byType,
      averageLiquidityScore,
    );

    return {
      totalAssets: assets.length,
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      byType,
      topHoldings,
      averageLiquidityScore,
      overallRiskLevel,
    };
  }

  // ==========================================================================
  // DIVERSIFICATION ANALYSIS
  // ==========================================================================

  analyzeDiversification(
    alternativeAssets: AlternativeAsset[],
    traditionalPortfolioValue: number,
  ): DiversificationAnalysis {
    const altTotal = alternativeAssets.reduce(
      (sum, a) => sum + a.currentValue,
      0,
    );
    const combinedTotal = altTotal + traditionalPortfolioValue;

    const alternativeAllocationPercent =
      combinedTotal > 0 ? (altTotal / combinedTotal) * 100 : 0;
    const traditionalAllocationPercent =
      combinedTotal > 0
        ? (traditionalPortfolioValue / combinedTotal) * 100
        : 0;

    // Weighted average correlations based on asset values
    let weightedStockCorr = 0;
    let weightedBondCorr = 0;
    let weightedRealEstateCorr = 0;

    for (const asset of alternativeAssets) {
      const weight = altTotal > 0 ? asset.currentValue / altTotal : 0;
      const benchmark = ASSET_TYPE_BENCHMARKS[asset.type];
      weightedStockCorr += benchmark.stockCorrelation * weight;
      weightedBondCorr += benchmark.bondCorrelation * weight;
      weightedRealEstateCorr += benchmark.realEstateCorrelation * weight;
    }

    // Diversification score: 0-100
    // Higher = better diversified. Low correlation + balanced allocation = higher score
    const avgCorrelation =
      (Math.abs(weightedStockCorr) +
        Math.abs(weightedBondCorr) +
        Math.abs(weightedRealEstateCorr)) /
      3;
    const correlationScore = (1 - avgCorrelation) * 50;

    // Allocation balance: penalize extremes (0% or 100% alternative)
    const allocationBalance =
      1 - Math.abs(alternativeAllocationPercent - 20) / 80;
    const allocationScore = Math.max(0, allocationBalance * 50);

    const diversificationScore = Math.round(
      Math.min(100, Math.max(0, correlationScore + allocationScore)),
    );

    const recommendations = this.generateDiversificationRecommendations(
      alternativeAllocationPercent,
      alternativeAssets,
      diversificationScore,
    );

    return {
      userId: alternativeAssets.length > 0 ? alternativeAssets[0].userId : "",
      alternativeAllocationPercent:
        Math.round(alternativeAllocationPercent * 100) / 100,
      traditionalAllocationPercent:
        Math.round(traditionalAllocationPercent * 100) / 100,
      correlationWithStocks: Math.round(weightedStockCorr * 1000) / 1000,
      correlationWithBonds: Math.round(weightedBondCorr * 1000) / 1000,
      correlationWithRealEstate:
        Math.round(weightedRealEstateCorr * 1000) / 1000,
      diversificationScore,
      recommendations,
    };
  }

  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================

  assessRisk(
    asset: AlternativeAsset,
    portfolioTotalValue: number,
  ): RiskAssessment {
    const benchmark = ASSET_TYPE_BENCHMARKS[asset.type];

    // Concentration risk: asset value as % of total portfolio
    const concentrationRisk =
      portfolioTotalValue > 0
        ? (asset.currentValue / portfolioTotalValue) * 100
        : 100;

    // Volatility score: 0-100 based on benchmark volatility
    const volatilityScore = Math.min(100, benchmark.volatility * 1.5);

    // Market risk: combination of volatility and correlation
    const marketRiskScore = Math.min(
      100,
      volatilityScore * 0.6 + Math.abs(benchmark.stockCorrelation) * 100 * 0.4,
    );

    // Overall risk level
    const riskScore =
      volatilityScore * 0.3 +
      marketRiskScore * 0.3 +
      concentrationRisk * 0.2 +
      (benchmark.avgLiquidationWeeks / 16) * 100 * 0.2;

    let overallRiskLevel: RiskLevel;
    if (riskScore < 25) {
      overallRiskLevel = "low";
    } else if (riskScore < 50) {
      overallRiskLevel = "moderate";
    } else if (riskScore < 75) {
      overallRiskLevel = "high";
    } else {
      overallRiskLevel = "very_high";
    }

    const riskFactors = this.identifyRiskFactors(
      asset,
      benchmark,
      concentrationRisk,
    );
    const mitigationStrategies = this.generateMitigationStrategies(
      asset,
      riskFactors,
    );

    return {
      assetId: asset.id,
      assetType: asset.type,
      liquidityRating: benchmark.liquidityRating,
      volatilityScore: Math.round(volatilityScore * 100) / 100,
      marketRiskScore: Math.round(marketRiskScore * 100) / 100,
      concentrationRisk: Math.round(concentrationRisk * 100) / 100,
      overallRiskLevel,
      estimatedLiquidationTimeWeeks: benchmark.avgLiquidationWeeks,
      riskFactors,
      mitigationStrategies,
    };
  }

  // ==========================================================================
  // HISTORICAL PERFORMANCE
  // ==========================================================================

  async getPerformanceHistory(
    assetId: string,
  ): Promise<PerformanceRecord[]> {
    const valuations = await this.getValuationHistory(assetId);

    if (valuations.length < 2) {
      return [];
    }

    // Sort chronologically (oldest first)
    const sorted = [...valuations].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    const records: PerformanceRecord[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const returnPercent =
        prev.value > 0
          ? ((curr.value - prev.value) / prev.value) * 100
          : 0;

      const daysHeld =
        (curr.date.getTime() - prev.date.getTime()) / (24 * 60 * 60 * 1000);
      const yearsHeld = daysHeld / 365.25;
      const annualizedReturn =
        yearsHeld > 0 && prev.value > 0
          ? (Math.pow(curr.value / prev.value, 1 / yearsHeld) - 1) * 100
          : 0;

      const periodLabel = `${prev.date.toISOString().slice(0, 10)} to ${curr.date.toISOString().slice(0, 10)}`;

      records.push({
        assetId,
        period: periodLabel,
        startValue: prev.value,
        endValue: curr.value,
        returnPercent: Math.round(returnPercent * 100) / 100,
        annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      });
    }

    return records;
  }

  // ==========================================================================
  // HELPERS (private)
  // ==========================================================================

  private calculateOverallRiskLevel(
    byType: AssetTypeAllocation[],
    averageLiquidity: number,
  ): RiskLevel {
    // High concentration in one type increases risk
    const maxConcentration = byType.reduce(
      (max, t) => Math.max(max, t.percentage),
      0,
    );

    const riskScore =
      (maxConcentration / 100) * 40 + (averageLiquidity / 4) * 60;

    if (riskScore < 25) return "low";
    if (riskScore < 50) return "moderate";
    if (riskScore < 75) return "high";
    return "very_high";
  }

  private generateDiversificationRecommendations(
    alternativePercent: number,
    assets: AlternativeAsset[],
    score: number,
  ): string[] {
    const recommendations: string[] = [];

    if (alternativePercent > 30) {
      recommendations.push(
        "Consider reducing alternative asset allocation below 30% of total portfolio",
      );
    } else if (alternativePercent < 5) {
      recommendations.push(
        "Consider increasing alternative asset allocation to 5-15% for better diversification",
      );
    }

    // Check type concentration
    const typeCount = new Set(assets.map((a) => a.type)).size;
    if (typeCount < 3 && assets.length >= 3) {
      recommendations.push(
        "Diversify across more alternative asset types to reduce concentration risk",
      );
    }

    if (score < 40) {
      recommendations.push(
        "Your diversification score is low. Consider adding assets with low correlation to traditional markets",
      );
    }

    // Check for precious metals (hedge)
    const hasPreciousMetals = assets.some((a) => a.type === "precious_metals");
    if (!hasPreciousMetals && assets.length > 0) {
      recommendations.push(
        "Consider adding precious metals as a hedge against market volatility",
      );
    }

    return recommendations;
  }

  private identifyRiskFactors(
    asset: AlternativeAsset,
    benchmark: (typeof ASSET_TYPE_BENCHMARKS)[AlternativeAssetType],
    concentrationRisk: number,
  ): string[] {
    const factors: string[] = [];

    if (benchmark.liquidityRating === "very_low") {
      factors.push("Very low liquidity - difficult to sell quickly");
    } else if (benchmark.liquidityRating === "low") {
      factors.push("Low liquidity - may take weeks to find a buyer");
    }

    if (benchmark.volatility > 30) {
      factors.push("High price volatility");
    }

    if (concentrationRisk > 25) {
      factors.push("High portfolio concentration risk");
    }

    if (!asset.authenticityCertified) {
      factors.push("Not authenticated - risk of counterfeit");
    }

    if (!asset.insuranceValue) {
      factors.push("No insurance coverage reported");
    }

    if (asset.type === "art" || asset.type === "collectibles") {
      factors.push("Value highly subjective and dependent on market trends");
    }

    if (asset.type === "crypto") {
      factors.push("Regulatory uncertainty in cryptocurrency markets");
    }

    return factors;
  }

  private generateMitigationStrategies(
    asset: AlternativeAsset,
    riskFactors: string[],
  ): string[] {
    const strategies: string[] = [];

    if (riskFactors.some((f) => f.includes("liquidity"))) {
      strategies.push(
        "Maintain adequate cash reserves for emergencies instead of relying on this asset",
      );
    }

    if (riskFactors.some((f) => f.includes("volatility"))) {
      strategies.push("Consider dollar-cost averaging for future purchases");
    }

    if (riskFactors.some((f) => f.includes("concentration"))) {
      strategies.push(
        "Reduce position size or diversify into other asset classes",
      );
    }

    if (riskFactors.some((f) => f.includes("authenticated"))) {
      strategies.push(
        "Obtain professional authentication and certification",
      );
    }

    if (riskFactors.some((f) => f.includes("insurance"))) {
      strategies.push(
        "Obtain appropriate insurance coverage for the asset",
      );
    }

    if (asset.type === "crypto") {
      strategies.push(
        "Use cold storage for long-term holdings and enable multi-factor authentication",
      );
    }

    if (
      asset.type === "art" ||
      asset.type === "wine" ||
      asset.type === "watches"
    ) {
      strategies.push(
        "Get regular professional appraisals to track market value accurately",
      );
    }

    return strategies;
  }

  // ==========================================================================
  // DB MAPPING
  // ==========================================================================

  private assetToDb(
    asset: Partial<AlternativeAsset>,
  ): Record<string, unknown> {
    return {
      id: asset.id,
      user_id: asset.userId,
      name: asset.name,
      type: asset.type,
      description: asset.description,
      purchase_price: asset.purchasePrice,
      purchase_date: asset.purchaseDate instanceof Date
        ? asset.purchaseDate.toISOString()
        : asset.purchaseDate,
      current_value: asset.currentValue,
      last_valuation_date: asset.lastValuationDate instanceof Date
        ? asset.lastValuationDate.toISOString()
        : asset.lastValuationDate,
      valuation_source: asset.valuationSource,
      currency: asset.currency,
      condition: asset.condition,
      provenance: asset.provenance,
      authenticity_certified: asset.authenticityCertified,
      storage_location: asset.storageLocation,
      insurance_value: asset.insuranceValue,
      insurance_provider: asset.insuranceProvider,
      image_urls: asset.imageUrls,
      documents: asset.documents,
      tags: asset.tags,
      notes: asset.notes,
      created_at: asset.createdAt instanceof Date
        ? asset.createdAt.toISOString()
        : asset.createdAt,
      updated_at: asset.updatedAt instanceof Date
        ? asset.updatedAt.toISOString()
        : asset.updatedAt,
    };
  }

  private assetFromDb(data: Record<string, unknown>): AlternativeAsset {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      type: data.type as AlternativeAssetType,
      description: data.description as string | undefined,
      purchasePrice: data.purchase_price as number,
      purchaseDate: new Date(data.purchase_date as string),
      currentValue: data.current_value as number,
      lastValuationDate: new Date(data.last_valuation_date as string),
      valuationSource: data.valuation_source as AlternativeAsset["valuationSource"],
      currency: data.currency as string,
      condition: data.condition as AssetCondition | undefined,
      provenance: data.provenance as string | undefined,
      authenticityCertified: data.authenticity_certified as boolean,
      storageLocation: data.storage_location as string | undefined,
      insuranceValue: data.insurance_value as number | undefined,
      insuranceProvider: data.insurance_provider as string | undefined,
      imageUrls: data.image_urls as string[] | undefined,
      documents: data.documents as AssetDocument[] | undefined,
      tags: data.tags as string[] | undefined,
      notes: data.notes as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let alternativeAssetServiceInstance: AlternativeAssetService | null = null;

export function getAlternativeAssetService(): AlternativeAssetService {
  if (!alternativeAssetServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    alternativeAssetServiceInstance = new AlternativeAssetService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return alternativeAssetServiceInstance;
}
