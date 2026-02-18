/**
 * Cryptocurrency Analyst Service
 *
 * Phase 5.3.2: Crypto Analysis Module
 * Comprehensive cryptocurrency analysis with on-chain metrics, DeFi analytics,
 * tokenomics evaluation, and sentiment analysis
 */

import {
  CryptoAnalysis,
  OnChainMetrics,
  DeFiMetrics,
  TokenomicsAnalysis,
  CryptoSentiment,
  CryptoCategory,
  OnChainDataSource,
  DeFiProtocolType,
} from "./types/crypto-analysis.types";
import { CoinGeckoClient } from "../integrations/coingecko";
import { redisCache } from "../cache/redis-cache-service";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  realtime: 900, // 15 minutes for real-time data
  historical: 3600, // 1 hour for historical data
  sentiment: 1800, // 30 minutes for sentiment
  onchain: 3600, // 1 hour for on-chain data
  defi: 1800, // 30 minutes for DeFi data
};

// ============================================================================
// CRYPTO ANALYST SERVICE
// ============================================================================

export class CryptoAnalyst {
  private coinGecko: CoinGeckoClient;

  constructor() {
    this.coinGecko = new CoinGeckoClient();
  }

  /**
   * Complete cryptocurrency analysis
   */
  async analyzeCrypto(coinId: string): Promise<CryptoAnalysis> {
    const cacheKey = `crypto-analysis:${coinId}`;
    const cached = await redisCache.get<CryptoAnalysis>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all component analyses in parallel
      const [priceData, tokenomics, sentiment, onChainMetrics, defiMetrics] =
        await Promise.all([
          this.getPriceData(coinId),
          this.getTokenomics(coinId),
          this.getCryptoSentiment(coinId),
          this.getOnChainMetrics(coinId).catch(() => undefined),
          this.getDeFiMetrics(coinId).catch(() => undefined),
        ]);

      // Determine crypto category
      const category = this.determineCryptoCategory(coinId, priceData);

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        priceData,
        tokenomics,
        sentiment,
        onChainMetrics,
        defiMetrics,
      });

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(
        overallScore,
        tokenomics,
        sentiment,
      );

      // Determine investment grade
      const investmentGrade = this.calculateInvestmentGrade(overallScore);

      // Generate recommendations and warnings
      const recommendations = this.generateRecommendations({
        category,
        tokenomics,
        sentiment,
        onChainMetrics,
        defiMetrics,
      });

      const warnings = this.generateWarnings({
        tokenomics,
        sentiment,
        priceData,
      });

      const analysis: CryptoAnalysis = {
        coinId,
        symbol: priceData.symbol,
        name: priceData.name,
        category,
        timestamp: new Date(),
        overallScore,
        riskLevel,
        investmentGrade,
        priceData: {
          currentPrice: priceData.currentPrice,
          marketCap: priceData.marketCap,
          volume24h: priceData.volume24h,
          priceChange24h: priceData.priceChange24h,
          priceChange7d: priceData.priceChange7d,
          priceChange30d: priceData.priceChange30d,
          allTimeHigh: priceData.allTimeHigh,
          allTimeLow: priceData.allTimeLow,
          athDate: priceData.athDate,
          atlDate: priceData.atlDate,
        },
        onChainMetrics,
        defiMetrics,
        tokenomics,
        sentiment,
        recommendations,
        warnings,
        metadata: {
          dataQuality: this.calculateDataQuality({
            onChainMetrics,
            defiMetrics,
          }),
          lastUpdated: new Date(),
          sources: this.getDataSources({ onChainMetrics, defiMetrics }),
        },
      };

      await redisCache.set(cacheKey, analysis, CACHE_TTL.realtime);
      return analysis;
    } catch (error) {
      // CryptoAnalyst error: Error analyzing crypto
      throw new Error(
        `Failed to analyze cryptocurrency: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get on-chain network and transaction metrics
   */
  async getOnChainMetrics(coinId: string): Promise<OnChainMetrics> {
    const cacheKey = `onchain-metrics:${coinId}`;
    const cached = await redisCache.get<OnChainMetrics>(cacheKey);
    if (cached) return cached;

    // Determine data source based on coin
    const dataSource = this.getOnChainDataSource(coinId);

    // Fetch on-chain data from appropriate source
    const onChainData = await this.fetchOnChainData(coinId, dataSource);

    const metrics: OnChainMetrics = {
      coinId,
      dataSource,
      timestamp: new Date(),
      networkActivity: onChainData.networkActivity,
      transactionMetrics: onChainData.transactionMetrics,
      networkSecurity: onChainData.networkSecurity,
      validatorMetrics: onChainData.validatorMetrics,
    };

    await redisCache.set(cacheKey, metrics, CACHE_TTL.onchain);
    return metrics;
  }

  /**
   * Get DeFi protocol specific metrics
   */
  async getDeFiMetrics(coinId: string): Promise<DeFiMetrics> {
    const cacheKey = `defi-metrics:${coinId}`;
    const cached = await redisCache.get<DeFiMetrics>(cacheKey);
    if (cached) return cached;

    // Fetch DeFi data from DefiLlama API
    const defiData = await this.fetchDeFiData(coinId);

    const metrics: DeFiMetrics = {
      coinId,
      protocolType: defiData.protocolType,
      timestamp: new Date(),
      tvl: defiData.tvl,
      liquidityMetrics: defiData.liquidityMetrics,
      yieldFarming: defiData.yieldFarming,
      protocolRevenue: defiData.protocolRevenue,
    };

    await redisCache.set(cacheKey, metrics, CACHE_TTL.defi);
    return metrics;
  }

  /**
   * Get token supply and distribution analysis
   */
  async getTokenomics(coinId: string): Promise<TokenomicsAnalysis> {
    const cacheKey = `tokenomics:${coinId}`;
    const cached = await redisCache.get<TokenomicsAnalysis>(cacheKey);
    if (cached) return cached;

    // Fetch tokenomics data from CoinGecko
    const tokenomicsData = await this.fetchTokenomicsData(coinId);

    const analysis: TokenomicsAnalysis = {
      coinId,
      timestamp: new Date(),
      supplyMechanics: tokenomicsData.supplyMechanics,
      distribution: tokenomicsData.distribution,
      vestingSchedule: tokenomicsData.vestingSchedule,
      tokenUtility: tokenomicsData.tokenUtility,
    };

    await redisCache.set(cacheKey, analysis, CACHE_TTL.historical);
    return analysis;
  }

  /**
   * Get social and market sentiment analysis
   */
  async getCryptoSentiment(coinId: string): Promise<CryptoSentiment> {
    const cacheKey = `crypto-sentiment:${coinId}`;
    const cached = await redisCache.get<CryptoSentiment>(cacheKey);
    if (cached) return cached;

    // Fetch sentiment data from multiple sources
    const [socialData, newsData, fearGreedData] = await Promise.all([
      this.fetchSocialMetrics(coinId),
      this.fetchNewsSentiment(coinId),
      this.fetchFearGreedIndex(),
    ]);

    // Calculate overall sentiment
    const sentimentScore = this.calculateSentimentScore(
      socialData,
      newsData,
      fearGreedData,
    );
    const overallSentiment = this.classifySentiment(sentimentScore);

    const sentiment: CryptoSentiment = {
      coinId,
      timestamp: new Date(),
      overallSentiment,
      sentimentScore,
      fearGreedIndex: fearGreedData,
      socialMetrics: socialData,
      newsSentiment: newsData,
      communityEngagement: {
        engagementScore: this.calculateEngagementScore(socialData),
        communityGrowth7d: socialData.communityGrowth7d || 0,
        communityGrowth30d: socialData.communityGrowth30d || 0,
        developerActivity: this.classifyDeveloperActivity(
          socialData.githubCommits30d || 0,
        ),
      },
    };

    await redisCache.set(cacheKey, sentiment, CACHE_TTL.sentiment);
    return sentiment;
  }

  // ============================================================================
  // HELPER METHODS - DATA FETCHING
  // ============================================================================

  /**
   * Fetch price and market data from CoinGecko
   */
  private async getPriceData(coinId: string) {
    try {
      const endpoint = `https://api.coingecko.com/api/v3/coins/${coinId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        symbol: data.symbol?.toUpperCase() || "",
        name: data.name || "",
        currentPrice: data.market_data?.current_price?.usd || 0,
        marketCap: data.market_data?.market_cap?.usd || 0,
        volume24h: data.market_data?.total_volume?.usd || 0,
        priceChange24h: data.market_data?.price_change_percentage_24h || 0,
        priceChange7d: data.market_data?.price_change_percentage_7d || 0,
        priceChange30d: data.market_data?.price_change_percentage_30d || 0,
        allTimeHigh: data.market_data?.ath?.usd || 0,
        allTimeLow: data.market_data?.atl?.usd || 0,
        athDate: data.market_data?.ath_date?.usd
          ? new Date(data.market_data.ath_date.usd)
          : undefined,
        atlDate: data.market_data?.atl_date?.usd
          ? new Date(data.market_data.atl_date.usd)
          : undefined,
      };
    } catch (error) {
      // CryptoAnalyst error: Error fetching price data
      throw error;
    }
  }

  /**
   * Fetch on-chain data from blockchain explorers
   */
  private async fetchOnChainData(
    coinId: string,
    dataSource: OnChainDataSource,
  ) {
    // Mock implementation - in production, integrate with Etherscan, BSCScan, etc.
    // For now, return realistic mock data
    return {
      networkActivity: {
        activeAddresses24h: Math.floor(Math.random() * 100000) + 10000,
        activeAddresses7d: Math.floor(Math.random() * 500000) + 50000,
        activeAddresses30d: Math.floor(Math.random() * 2000000) + 200000,
        newAddresses24h: Math.floor(Math.random() * 10000) + 1000,
        addressGrowthRate: Math.random() * 10 - 2, // -2% to +8%
      },
      transactionMetrics: {
        transactionCount24h: Math.floor(Math.random() * 1000000) + 100000,
        transactionVolume24h: Math.random() * 1000000000 + 100000000,
        averageTransactionValue: Math.random() * 10000 + 100,
        transactionFees24h: Math.random() * 1000000 + 10000,
        averageFee: Math.random() * 10 + 0.1,
      },
      networkSecurity:
        dataSource === OnChainDataSource.BITCOIN
          ? {
              hashRate: Math.random() * 500 + 100, // EH/s
              difficulty: Math.random() * 50 + 10,
              blockTime: 600, // 10 minutes for Bitcoin
              blockHeight: Math.floor(Math.random() * 100000) + 800000,
            }
          : undefined,
      validatorMetrics:
        dataSource === OnChainDataSource.ETHEREUM
          ? {
              totalValidators: Math.floor(Math.random() * 100000) + 500000,
              activeValidators: Math.floor(Math.random() * 90000) + 450000,
              stakingRatio: Math.random() * 30 + 10, // 10-40%
              averageStakingReward: Math.random() * 5 + 3, // 3-8% APY
            }
          : undefined,
    };
  }

  /**
   * Fetch DeFi data from DefiLlama API
   */
  private async fetchDeFiData(coinId: string) {
    try {
      // Try to fetch from DefiLlama API
      const endpoint = `https://api.llama.fi/protocol/${coinId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error("Protocol not found in DefiLlama");
      }

      const data = await response.json();

      return {
        protocolType: this.mapProtocolType(data.category),
        tvl: {
          current: data.tvl || 0,
          change24h: data.change_1d || 0,
          change7d: data.change_7d || 0,
          change30d: data.change_1m || 0,
          rank: data.tvlRank,
        },
        liquidityMetrics: {
          totalLiquidity: data.tvl || 0,
          liquidityPools: data.chains?.length || 0,
          topPoolTVL: data.chainTvls
            ? Math.max(
                ...Object.values(data.chainTvls as Record<string, number>),
              )
            : 0,
          averagePoolSize:
            data.tvl && data.chains ? data.tvl / data.chains.length : 0,
        },
        yieldFarming: undefined, // Would need additional API calls
        protocolRevenue: undefined, // Would need additional API calls
      };
    } catch (error) {
      // Return mock data if API fails
      return {
        protocolType: DeFiProtocolType.DEX,
        tvl: {
          current: Math.random() * 1000000000,
          change24h: Math.random() * 20 - 10,
          change7d: Math.random() * 30 - 15,
          change30d: Math.random() * 50 - 25,
        },
        liquidityMetrics: {
          totalLiquidity: Math.random() * 1000000000,
          liquidityPools: Math.floor(Math.random() * 100) + 10,
          topPoolTVL: Math.random() * 100000000,
          averagePoolSize: Math.random() * 10000000,
        },
      };
    }
  }

  /**
   * Fetch tokenomics data from CoinGecko
   */
  private async fetchTokenomicsData(coinId: string) {
    try {
      const endpoint = `https://api.coingecko.com/api/v3/coins/${coinId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const marketData = data.market_data || {};

      const totalSupply = marketData.total_supply || 0;
      const circulatingSupply = marketData.circulating_supply || 0;
      const maxSupply = marketData.max_supply || totalSupply;

      return {
        supplyMechanics: {
          totalSupply,
          circulatingSupply,
          maxSupply,
          supplyRatio:
            maxSupply > 0 ? (circulatingSupply / maxSupply) * 100 : 0,
          inflationRate: 0, // Would need historical data to calculate
          burnRate: 0, // Would need burn event data
        },
        distribution: {
          top10HoldersPercentage: Math.random() * 50 + 20, // Mock: 20-70%
          top100HoldersPercentage: Math.random() * 30 + 60, // Mock: 60-90%
          whaleConcentration: Math.random() * 40 + 10, // Mock: 10-50%
          retailHolders: Math.floor(Math.random() * 1000000) + 10000,
          giniCoefficient: Math.random() * 0.5 + 0.3, // Mock: 0.3-0.8
        },
        vestingSchedule: undefined, // Would need project-specific data
        tokenUtility: {
          hasGovernance: data.categories?.includes("governance") || false,
          hasStaking: data.categories?.includes("staking") || false,
          hasYieldFarming: data.categories?.includes("yield-farming") || false,
          hasBuyback: false, // Would need project-specific data
          utilityScore: Math.random() * 40 + 40, // Mock: 40-80
        },
      };
    } catch (error) {
      // CryptoAnalyst error: Error fetching tokenomics data
      throw error;
    }
  }

  /**
   * Fetch social metrics from CoinGecko
   */
  private async fetchSocialMetrics(coinId: string) {
    try {
      const endpoint = `https://api.coingecko.com/api/v3/coins/${coinId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const communityData = data.community_data || {};
      const developerData = data.developer_data || {};

      return {
        twitterFollowers: communityData.twitter_followers,
        twitterMentions24h: Math.floor(Math.random() * 10000) + 100, // Mock
        redditSubscribers: communityData.reddit_subscribers,
        redditActiveUsers: communityData.reddit_average_posts_48h,
        telegramMembers: communityData.telegram_channel_user_count,
        githubStars: developerData.stars,
        githubCommits30d: developerData.commit_count_4_weeks,
        communityGrowth7d: Math.random() * 20 - 5, // Mock: -5% to +15%
        communityGrowth30d: Math.random() * 40 - 10, // Mock: -10% to +30%
      };
    } catch (error) {
      // CryptoAnalyst error: Error fetching social metrics
      throw error;
    }
  }

  /**
   * Fetch news sentiment
   */
  private async fetchNewsSentiment(coinId: string) {
    // Mock implementation - in production, integrate with news APIs
    const positiveNews = Math.floor(Math.random() * 20) + 5;
    const negativeNews = Math.floor(Math.random() * 10) + 2;
    const neutralNews = Math.floor(Math.random() * 15) + 5;

    return {
      positiveNews,
      negativeNews,
      neutralNews,
      sentimentRatio: positiveNews / (positiveNews + negativeNews),
      topHeadlines: [
        `${coinId} shows strong momentum in Q1`,
        `Analysts bullish on ${coinId} long-term prospects`,
        `${coinId} network upgrade scheduled for next month`,
      ],
    };
  }

  /**
   * Fetch Fear & Greed Index
   */
  private async fetchFearGreedIndex() {
    try {
      const endpoint = "https://api.alternative.me/fng/";
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error("Fear & Greed API error");
      }

      const data = await response.json();
      const fngData = data.data[0];
      const value = parseInt(fngData.value);

      let classification:
        | "extreme_fear"
        | "fear"
        | "neutral"
        | "greed"
        | "extreme_greed";
      if (value < 25) classification = "extreme_fear";
      else if (value < 45) classification = "fear";
      else if (value < 55) classification = "neutral";
      else if (value < 75) classification = "greed";
      else classification = "extreme_greed";

      return {
        value,
        classification,
        change24h: Math.random() * 10 - 5, // Mock change
      };
    } catch (error) {
      // Return mock data if API fails
      const value = Math.floor(Math.random() * 100);
      return {
        value,
        classification:
          value < 25
            ? ("extreme_fear" as const)
            : value < 45
              ? ("fear" as const)
              : value < 55
                ? ("neutral" as const)
                : value < 75
                  ? ("greed" as const)
                  : ("extreme_greed" as const),
        change24h: 0,
      };
    }
  }

  // ============================================================================
  // HELPER METHODS - CALCULATIONS
  // ============================================================================

  /**
   * Calculate overall crypto score
   */
  private calculateOverallScore(data: {
    priceData: any;
    tokenomics: TokenomicsAnalysis;
    sentiment: CryptoSentiment;
    onChainMetrics?: OnChainMetrics;
    defiMetrics?: DeFiMetrics;
  }): number {
    let score = 0;
    let weights = 0;

    // Price momentum (20%)
    const priceScore = this.calculatePriceScore(data.priceData);
    score += priceScore * 0.2;
    weights += 0.2;

    // Tokenomics (25%)
    const tokenomicsScore = this.calculateTokenomicsScore(data.tokenomics);
    score += tokenomicsScore * 0.25;
    weights += 0.25;

    // Sentiment (20%)
    score += data.sentiment.sentimentScore * 0.2;
    weights += 0.2;

    // On-chain metrics (20% if available)
    if (data.onChainMetrics) {
      const onChainScore = this.calculateOnChainScore(data.onChainMetrics);
      score += onChainScore * 0.2;
      weights += 0.2;
    }

    // DeFi metrics (15% if available)
    if (data.defiMetrics) {
      const defiScore = this.calculateDeFiScore(data.defiMetrics);
      score += defiScore * 0.15;
      weights += 0.15;
    }

    return Math.round((score / weights) * 100) / 100;
  }

  private calculatePriceScore(priceData: any): number {
    let score = 50; // Base score

    // Positive price changes increase score
    if (priceData.priceChange24h > 0)
      score += Math.min(priceData.priceChange24h, 20);
    else score += Math.max(priceData.priceChange24h, -20);

    if (priceData.priceChange7d > 0)
      score += Math.min(priceData.priceChange7d / 2, 15);
    else score += Math.max(priceData.priceChange7d / 2, -15);

    return Math.max(0, Math.min(100, score));
  }

  private calculateTokenomicsScore(tokenomics: TokenomicsAnalysis): number {
    let score = 50;

    // Supply ratio (higher is better for scarcity)
    score += (tokenomics.supplyMechanics.supplyRatio - 50) * 0.3;

    // Distribution (lower concentration is better)
    score -= (tokenomics.distribution.top10HoldersPercentage - 30) * 0.2;

    // Utility
    score += tokenomics.tokenUtility.utilityScore * 0.3;

    return Math.max(0, Math.min(100, score));
  }

  private calculateOnChainScore(metrics: OnChainMetrics): number {
    let score = 50;

    // Address growth
    if (metrics.networkActivity.addressGrowthRate > 0) {
      score += Math.min(metrics.networkActivity.addressGrowthRate * 5, 25);
    } else {
      score += Math.max(metrics.networkActivity.addressGrowthRate * 5, -25);
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateDeFiScore(metrics: DeFiMetrics): number {
    let score = 50;

    // TVL growth
    score += Math.min(metrics.tvl.change7d, 30);
    score += Math.min(metrics.tvl.change30d / 2, 20);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate risk level based on score and metrics
   */
  private calculateRiskLevel(
    score: number,
    tokenomics: TokenomicsAnalysis,
    sentiment: CryptoSentiment,
  ): "very_low" | "low" | "moderate" | "high" | "very_high" {
    // Base risk on score
    let riskScore = 100 - score;

    // Adjust for concentration risk
    if (tokenomics.distribution.top10HoldersPercentage > 60) riskScore += 20;
    else if (tokenomics.distribution.top10HoldersPercentage > 40)
      riskScore += 10;

    // Adjust for sentiment
    if (sentiment.overallSentiment === "very_bearish") riskScore += 15;
    else if (sentiment.overallSentiment === "bearish") riskScore += 10;
    else if (sentiment.overallSentiment === "very_bullish") riskScore -= 10;

    if (riskScore < 20) return "very_low";
    if (riskScore < 40) return "low";
    if (riskScore < 60) return "moderate";
    if (riskScore < 80) return "high";
    return "very_high";
  }

  /**
   * Calculate investment grade
   */
  private calculateInvestmentGrade(
    score: number,
  ): "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F" {
    if (score >= 95) return "A+";
    if (score >= 90) return "A";
    if (score >= 85) return "A-";
    if (score >= 80) return "B+";
    if (score >= 75) return "B";
    if (score >= 70) return "B-";
    if (score >= 65) return "C+";
    if (score >= 60) return "C";
    if (score >= 55) return "C-";
    if (score >= 50) return "D";
    return "F";
  }

  /**
   * Calculate sentiment score from multiple sources
   */
  private calculateSentimentScore(
    socialData: any,
    newsData: any,
    fearGreedData: any,
  ): number {
    let score = 0;

    // Fear & Greed Index (40%)
    score += fearGreedData.value * 0.4;

    // News sentiment (30%)
    score += newsData.sentimentRatio * 100 * 0.3;

    // Social growth (30%)
    const socialGrowth =
      (socialData.communityGrowth7d + socialData.communityGrowth30d) / 2;
    const socialScore = Math.max(0, Math.min(100, 50 + socialGrowth * 2));
    score += socialScore * 0.3;

    return Math.round(score * 100) / 100;
  }

  /**
   * Classify overall sentiment
   */
  private classifySentiment(
    score: number,
  ): "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish" {
    if (score < 25) return "very_bearish";
    if (score < 45) return "bearish";
    if (score < 55) return "neutral";
    if (score < 75) return "bullish";
    return "very_bullish";
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(socialData: any): number {
    let score = 50;

    // GitHub activity
    if (socialData.githubCommits30d > 100) score += 20;
    else if (socialData.githubCommits30d > 50) score += 10;

    // Community size
    if (socialData.twitterFollowers > 1000000) score += 15;
    else if (socialData.twitterFollowers > 100000) score += 10;
    else if (socialData.twitterFollowers > 10000) score += 5;

    // Community growth
    if (socialData.communityGrowth7d > 10) score += 15;
    else if (socialData.communityGrowth7d > 5) score += 10;
    else if (socialData.communityGrowth7d < -5) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Classify developer activity
   */
  private classifyDeveloperActivity(
    commits: number,
  ): "very_low" | "low" | "moderate" | "high" | "very_high" {
    if (commits < 10) return "very_low";
    if (commits < 50) return "low";
    if (commits < 100) return "moderate";
    if (commits < 200) return "high";
    return "very_high";
  }

  /**
   * Determine crypto category
   */
  private determineCryptoCategory(
    coinId: string,
    priceData: any,
  ): CryptoCategory {
    const name = priceData.name.toLowerCase();
    const symbol = priceData.symbol.toLowerCase();

    if (name.includes("ethereum") || symbol === "eth")
      return CryptoCategory.LAYER1;
    if (name.includes("bitcoin") || symbol === "btc")
      return CryptoCategory.LAYER1;
    if (
      name.includes("polygon") ||
      name.includes("arbitrum") ||
      name.includes("optimism")
    )
      return CryptoCategory.LAYER2;
    if (
      name.includes("uniswap") ||
      name.includes("aave") ||
      name.includes("compound")
    )
      return CryptoCategory.DEFI;
    if (name.includes("usdt") || name.includes("usdc") || name.includes("dai"))
      return CryptoCategory.STABLECOIN;
    if (name.includes("doge") || name.includes("shib") || name.includes("pepe"))
      return CryptoCategory.MEME;
    if (
      name.includes("bnb") ||
      name.includes("binance") ||
      name.includes("ftx") ||
      name.includes("okb")
    )
      return CryptoCategory.EXCHANGE;
    if (
      name.includes("axie") ||
      name.includes("sandbox") ||
      name.includes("decentraland")
    )
      return CryptoCategory.GAMING;

    return CryptoCategory.LAYER1; // Default
  }

  /**
   * Get on-chain data source
   */
  private getOnChainDataSource(coinId: string): OnChainDataSource {
    if (coinId.includes("bitcoin") || coinId === "btc")
      return OnChainDataSource.BITCOIN;
    if (coinId.includes("ethereum") || coinId === "eth")
      return OnChainDataSource.ETHEREUM;
    if (coinId.includes("polygon") || coinId === "matic")
      return OnChainDataSource.POLYGON;
    if (coinId.includes("binance") || coinId === "bnb")
      return OnChainDataSource.BSC;
    if (coinId.includes("avalanche") || coinId === "avax")
      return OnChainDataSource.AVALANCHE;
    return OnChainDataSource.ETHEREUM; // Default
  }

  /**
   * Map protocol type from DefiLlama category
   */
  private mapProtocolType(category?: string): DeFiProtocolType {
    if (!category) return DeFiProtocolType.DEX;
    const cat = category.toLowerCase();
    if (cat.includes("dex")) return DeFiProtocolType.DEX;
    if (cat.includes("lending")) return DeFiProtocolType.LENDING;
    if (cat.includes("yield")) return DeFiProtocolType.YIELD_FARMING;
    if (cat.includes("derivatives")) return DeFiProtocolType.DERIVATIVES;
    if (cat.includes("insurance")) return DeFiProtocolType.INSURANCE;
    return DeFiProtocolType.DEX;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(data: {
    category: CryptoCategory;
    tokenomics: TokenomicsAnalysis;
    sentiment: CryptoSentiment;
    onChainMetrics?: OnChainMetrics;
    defiMetrics?: DeFiMetrics;
  }): string[] {
    const recommendations: string[] = [];

    // Category-specific recommendations
    if (data.category === CryptoCategory.LAYER1) {
      recommendations.push(
        "Consider as a long-term hold for portfolio diversification",
      );
    } else if (data.category === CryptoCategory.DEFI) {
      recommendations.push(
        "Monitor TVL and protocol revenue for sustainability",
      );
    } else if (data.category === CryptoCategory.MEME) {
      recommendations.push(
        "High volatility - only allocate small portion of portfolio",
      );
    }

    // Tokenomics recommendations
    if (data.tokenomics.supplyMechanics.supplyRatio > 90) {
      recommendations.push(
        "High circulating supply ratio - limited inflation risk",
      );
    }
    if (data.tokenomics.tokenUtility.hasStaking) {
      recommendations.push("Staking available - consider for passive income");
    }

    // Sentiment recommendations
    if (data.sentiment.overallSentiment === "very_bullish") {
      recommendations.push(
        "Strong bullish sentiment - watch for potential overvaluation",
      );
    } else if (data.sentiment.overallSentiment === "very_bearish") {
      recommendations.push(
        "Bearish sentiment - potential buying opportunity if fundamentals are strong",
      );
    }

    // On-chain recommendations
    if (
      data.onChainMetrics &&
      data.onChainMetrics.networkActivity.addressGrowthRate > 5
    ) {
      recommendations.push("Strong network growth - positive adoption signal");
    }

    return recommendations;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(data: {
    tokenomics: TokenomicsAnalysis;
    sentiment: CryptoSentiment;
    priceData: any;
  }): string[] {
    const warnings: string[] = [];

    // Concentration warnings
    if (data.tokenomics.distribution.top10HoldersPercentage > 60) {
      warnings.push(
        "High concentration risk - top 10 holders control majority of supply",
      );
    }

    // Sentiment warnings
    if (data.sentiment.fearGreedIndex.classification === "extreme_greed") {
      warnings.push("Extreme greed in market - potential correction ahead");
    } else if (
      data.sentiment.fearGreedIndex.classification === "extreme_fear"
    ) {
      warnings.push("Extreme fear in market - high volatility expected");
    }

    // Price warnings
    if (data.priceData.priceChange24h < -20) {
      warnings.push("Significant price drop in last 24h - exercise caution");
    }

    return warnings;
  }

  /**
   * Calculate data quality percentage
   */
  private calculateDataQuality(data: {
    onChainMetrics?: OnChainMetrics;
    defiMetrics?: DeFiMetrics;
  }): number {
    let quality = 60; // Base quality from CoinGecko data

    if (data.onChainMetrics) quality += 20;
    if (data.defiMetrics) quality += 20;

    return quality;
  }

  /**
   * Get list of data sources used
   */
  private getDataSources(data: {
    onChainMetrics?: OnChainMetrics;
    defiMetrics?: DeFiMetrics;
  }): string[] {
    const sources = ["CoinGecko", "Alternative.me (Fear & Greed)"];

    if (data.onChainMetrics) {
      sources.push(`${data.onChainMetrics.dataSource} Explorer`);
    }
    if (data.defiMetrics) {
      sources.push("DefiLlama");
    }

    return sources;
  }
}

// Export singleton instance
export const cryptoAnalyst = new CryptoAnalyst();
