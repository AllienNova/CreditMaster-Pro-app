/**
 * Sentiment Analysis Service
 *
 * Comprehensive sentiment analysis engine:
 * - News sentiment aggregation
 * - Social media sentiment tracking
 * - Analyst consensus analysis
 * - Insider trading activity
 * - Institutional ownership trends
 * - Market sentiment indicators (Fear & Greed, VIX, breadth)
 * - Composite sentiment scoring
 */

import type {
  SentimentAnalysis,
  NewsSentiment,
  SocialSentiment,
  AnalystConsensus,
  InsiderActivity,
  InstitutionalOwnership,
  FearGreedIndex,
  VIXData,
  MarketBreadth,
  NewsArticle,
  SocialMention,
  AnalystRecommendation,
  InsiderTransaction,
  InstitutionalHolder,
  SentimentScore,
  SentimentLabel,
} from '../types/sentiment-analysis.types';
import type { SignalStrength } from '../types/investment.types';

// ============================================================================
// SENTIMENT ANALYSIS SERVICE
// ============================================================================

export class SentimentAnalysisService {
  /**
   * Perform comprehensive sentiment analysis on a symbol
   */
  async analyzeSentiment(
    symbol: string,
    options?: {
      includeNews?: boolean;
      includeSocial?: boolean;
      includeAnalysts?: boolean;
      includeInsiders?: boolean;
      includeInstitutional?: boolean;
      includeMarket?: boolean;
    }
  ): Promise<SentimentAnalysis> {
    const {
      includeNews = true,
      includeSocial = true,
      includeAnalysts = true,
      includeInsiders = true,
      includeInstitutional = true,
      includeMarket = true,
    } = options || {};

    // Fetch all sentiment data in parallel
    const [
      newsSentiment,
      socialSentiment,
      analystConsensus,
      insiderActivity,
      institutionalOwnership,
      marketSentiment,
    ] = await Promise.all([
      includeNews
        ? this.getNewsSentiment(symbol)
        : this.getDefaultNewsSentiment(symbol),
      includeSocial
        ? this.getSocialSentiment(symbol)
        : this.getDefaultSocialSentiment(symbol),
      includeAnalysts
        ? this.getAnalystConsensus(symbol)
        : this.getDefaultAnalystConsensus(symbol),
      includeInsiders
        ? this.getInsiderActivity(symbol)
        : this.getDefaultInsiderActivity(symbol),
      includeInstitutional
        ? this.getInstitutionalOwnership(symbol)
        : this.getDefaultInstitutionalOwnership(symbol),
      includeMarket
        ? this.getMarketSentiment()
        : this.getDefaultMarketSentiment(),
    ]);

    // Calculate composite sentiment
    const compositeSentiment = this.calculateCompositeSentiment(
      newsSentiment,
      socialSentiment,
      analystConsensus,
      insiderActivity,
      institutionalOwnership
    );

    // Determine overall signal
    const overallSignal = this.determineOverallSignal(compositeSentiment.score);

    // Generate summary and insights
    const summary = this.generateSummary(
      symbol,
      compositeSentiment,
      overallSignal
    );
    const keyInsights = this.generateKeyInsights(
      newsSentiment,
      socialSentiment,
      analystConsensus
    );
    const risks = this.identifyRisks(
      newsSentiment,
      insiderActivity,
      institutionalOwnership
    );
    const opportunities = this.identifyOpportunities(
      newsSentiment,
      analystConsensus,
      insiderActivity
    );

    return {
      symbol,
      analyzedAt: new Date(),
      newsSentiment,
      socialSentiment,
      analystConsensus,
      insiderActivity,
      institutionalOwnership,
      marketSentiment: {
        fearGreed: marketSentiment.fearGreed,
        vix: marketSentiment.vix,
        marketBreadth: marketSentiment.breadth,
      },
      compositeSentiment,
      overallSignal,
      summary,
      keyInsights,
      risks,
      opportunities,
    };
  }

  /**
   * Get news sentiment for a symbol
   */
  async getNewsSentiment(symbol: string): Promise<NewsSentiment> {
    // In production, fetch from news API
    // For now, return mock data structure
    const recentNews: NewsArticle[] = [
      {
        id: '1',
        title: `${symbol} Announces Strong Q4 Earnings Beat`,
        summary:
          'Company exceeds analyst expectations with robust revenue growth.',
        source: 'Financial Times',
        url: 'https://example.com/article1',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        symbols: [symbol],
        sentiment: 0.5,
        sentimentLabel: 'positive',
        relevanceScore: 0.95,
        topics: ['earnings', 'revenue'],
        impactLevel: 'high',
      },
      {
        id: '2',
        title: `${symbol} Faces Regulatory Scrutiny in EU`,
        summary:
          'European regulators launch investigation into business practices.',
        source: 'Reuters',
        url: 'https://example.com/article2',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        symbols: [symbol],
        sentiment: -0.5,
        sentimentLabel: 'negative',
        relevanceScore: 0.88,
        topics: ['regulation', 'legal'],
        impactLevel: 'medium',
      },
    ];

    const positiveCount = recentNews.filter((n) => n.sentiment > 0).length;
    const negativeCount = recentNews.filter((n) => n.sentiment < 0).length;
    const neutralCount = recentNews.filter((n) => n.sentiment === 0).length;
    const articleCount = recentNews.length;

    const averageSentiment =
      recentNews.reduce((sum, n) => sum + n.sentiment, 0) / articleCount;
    const sentimentLabel = this.getSentimentLabel(averageSentiment);

    const topPositiveNews = recentNews
      .filter((n) => n.sentiment > 0)
      .slice(0, 3);
    const topNegativeNews = recentNews
      .filter((n) => n.sentiment < 0)
      .slice(0, 3);

    const sentimentTrend: 'improving' | 'stable' | 'declining' =
      averageSentiment > 0.3
        ? 'improving'
        : averageSentiment < -0.3
          ? 'declining'
          : 'stable';

    const signal = this.sentimentToSignal(averageSentiment);

    return {
      symbol,
      analyzedAt: new Date(),
      articleCount,
      averageSentiment,
      sentimentLabel,
      sentimentChange24h: 0.1,
      sentimentChange7d: 0.15,
      positiveCount,
      negativeCount,
      neutralCount,
      topPositiveNews,
      topNegativeNews,
      recentNews,
      sentimentTrend,
      signal,
    };
  }

  /**
   * Get social media sentiment for a symbol
   */
  async getSocialSentiment(symbol: string): Promise<SocialSentiment> {
    const influencerMentions: SocialMention[] = [
      {
        id: '1',
        platform: 'twitter',
        content: `Bullish on ${symbol}. Strong fundamentals and great management.`,
        author: '@financeguru',
        authorFollowers: 250_000,
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        symbols: [symbol],
        sentiment: 0.5,
        engagement: 1_500,
        reach: 50_000,
        url: 'https://twitter.com/financeguru/status/123',
      },
    ];

    const viralPosts = influencerMentions;

    const platformBreakdown = [
      { platform: 'twitter', mentions: 1_200, sentiment: 0.4 },
      { platform: 'reddit', mentions: 850, sentiment: 0.3 },
      { platform: 'stocktwits', mentions: 650, sentiment: 0.5 },
    ];

    const mentionCount24h = platformBreakdown.reduce(
      (sum, p) => sum + p.mentions,
      0
    );
    const mentionCount7d = mentionCount24h * 7;
    const mentionChange = 15.3;

    const averageSentiment =
      platformBreakdown.reduce((sum, p) => sum + p.sentiment * p.mentions, 0) /
      mentionCount24h;
    const sentimentLabel = this.getSentimentLabel(averageSentiment);

    const trendingTopics = ['earnings', 'innovation', 'AI', 'growth'];
    const sentimentTrend: 'improving' | 'stable' | 'declining' = 'improving';
    const signal = this.sentimentToSignal(averageSentiment);

    return {
      symbol,
      analyzedAt: new Date(),
      mentionCount24h,
      mentionCount7d,
      mentionChange,
      averageSentiment,
      sentimentLabel,
      platformBreakdown,
      influencerMentions,
      viralPosts,
      trendingTopics,
      sentimentTrend,
      signal,
    };
  }

  /**
   * Get analyst consensus for a symbol
   */
  async getAnalystConsensus(symbol: string): Promise<AnalystConsensus> {
    const recentChanges: AnalystRecommendation[] = [
      {
        id: '1',
        symbol,
        firm: 'Goldman Sachs',
        analyst: 'John Smith',
        rating: 'buy',
        previousRating: 'hold',
        priceTarget: 175.0,
        previousPriceTarget: 160.0,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        summary: 'Upgraded due to strong earnings and positive outlook.',
      },
      {
        id: '2',
        symbol,
        firm: 'Morgan Stanley',
        rating: 'hold',
        priceTarget: 155.0,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    const strongBuy = 5;
    const buy = 12;
    const hold = 8;
    const sell = 2;
    const strongSell = 1;
    const totalAnalysts = strongBuy + buy + hold + sell + strongSell;

    // Calculate consensus rating
    const ratingScore =
      (strongBuy * 5 + buy * 4 + hold * 3 + sell * 2 + strongSell * 1) /
      totalAnalysts;
    let consensusRating:
      | 'strong_buy'
      | 'buy'
      | 'hold'
      | 'sell'
      | 'strong_sell' = 'hold';
    if (ratingScore >= 4.5) consensusRating = 'strong_buy';
    else if (ratingScore >= 3.5) consensusRating = 'buy';
    else if (ratingScore >= 2.5) consensusRating = 'hold';
    else if (ratingScore >= 1.5) consensusRating = 'sell';
    else consensusRating = 'strong_sell';

    const averagePriceTarget = 165.0;
    const highPriceTarget = 185.0;
    const lowPriceTarget = 145.0;
    const medianPriceTarget = 162.5;
    const currentPrice = 152.0;
    const upside = ((averagePriceTarget - currentPrice) / currentPrice) * 100;

    const ratingTrend: 'upgrading' | 'stable' | 'downgrading' = 'upgrading';
    const signal = this.analystRatingToSignal(consensusRating);

    return {
      symbol,
      calculatedAt: new Date(),
      totalAnalysts,
      strongBuy,
      buy,
      hold,
      sell,
      strongSell,
      consensusRating,
      averagePriceTarget,
      highPriceTarget,
      lowPriceTarget,
      medianPriceTarget,
      currentPrice,
      upside,
      recentChanges,
      ratingTrend,
      signal,
    };
  }

  /**
   * Get insider trading activity
   */
  async getInsiderActivity(symbol: string): Promise<InsiderActivity> {
    const transactions90Days: InsiderTransaction[] = [
      {
        id: '1',
        symbol,
        filingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        transactionDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        insiderName: 'John Doe',
        insiderTitle: 'CEO',
        transactionType: 'buy',
        shares: 50_000,
        pricePerShare: 148.5,
        totalValue: 7_425_000,
        sharesOwned: 500_000,
        ownershipChange: 11.1,
      },
      {
        id: '2',
        symbol,
        filingDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        transactionDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
        insiderName: 'Jane Smith',
        insiderTitle: 'CFO',
        transactionType: 'sell',
        shares: 10_000,
        pricePerShare: 152.0,
        totalValue: 1_520_000,
        sharesOwned: 90_000,
        ownershipChange: -10.0,
      },
    ];

    const totalBuys = transactions90Days.filter(
      (t) => t.transactionType === 'buy'
    ).length;
    const totalSells = transactions90Days.filter(
      (t) => t.transactionType === 'sell'
    ).length;

    const netBuyValue = transactions90Days
      .filter((t) => t.transactionType === 'buy')
      .reduce((sum, t) => sum + t.totalValue, 0);

    const netSellValue = transactions90Days
      .filter((t) => t.transactionType === 'sell')
      .reduce((sum, t) => sum + t.totalValue, 0);

    const buyersCount = new Set(
      transactions90Days
        .filter((t) => t.transactionType === 'buy')
        .map((t) => t.insiderName)
    ).size;
    const sellersCount = new Set(
      transactions90Days
        .filter((t) => t.transactionType === 'sell')
        .map((t) => t.insiderName)
    ).size;

    const insiderSentiment: 'bullish' | 'neutral' | 'bearish' =
      netBuyValue > netSellValue * 2
        ? 'bullish'
        : netSellValue > netBuyValue * 2
          ? 'bearish'
          : 'neutral';

    const significantTransactions = transactions90Days.filter(
      (t) => t.totalValue > 5_000_000
    );
    const clusterBuying = totalBuys >= 3 && buyersCount >= 2;
    const clusterSelling = totalSells >= 3 && sellersCount >= 2;

    const signal =
      insiderSentiment === 'bullish'
        ? 'buy'
        : insiderSentiment === 'bearish'
          ? 'sell'
          : 'neutral';

    return {
      symbol,
      analyzedAt: new Date(),
      transactions90Days,
      totalBuys,
      totalSells,
      netBuyValue,
      netSellValue,
      buyersCount,
      sellersCount,
      insiderSentiment,
      significantTransactions,
      clusterBuying,
      clusterSelling,
      signal,
    };
  }

  /**
   * Get institutional ownership data
   */
  async getInstitutionalOwnership(
    symbol: string
  ): Promise<InstitutionalOwnership> {
    const topHolders: InstitutionalHolder[] = [
      {
        name: 'Vanguard Group',
        shares: 85_000_000,
        value: 12_920_000_000,
        percentOwnership: 8.5,
        changeShares: 2_500_000,
        changePercent: 3.03,
        reportDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'BlackRock',
        shares: 72_000_000,
        value: 10_944_000_000,
        percentOwnership: 7.2,
        changeShares: 1_800_000,
        changePercent: 2.56,
        reportDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ];

    const newPositions: InstitutionalHolder[] = [];
    const increasedPositions = topHolders.filter((h) => h.changeShares > 0);
    const decreasedPositions: InstitutionalHolder[] = [];
    const soldOut: InstitutionalHolder[] = [];

    const totalInstitutionalShares = topHolders.reduce(
      (sum, h) => sum + h.shares,
      0
    );
    const totalInstitutionalValue = topHolders.reduce(
      (sum, h) => sum + h.value,
      0
    );
    const institutionalOwnershipPercent = topHolders.reduce(
      (sum, h) => sum + h.percentOwnership,
      0
    );
    const institutionsCount = topHolders.length;

    const quarterlyChange = 2.5; // Percentage increase in institutional ownership

    const ownershipTrend: 'increasing' | 'stable' | 'decreasing' =
      quarterlyChange > 2
        ? 'increasing'
        : quarterlyChange < -2
          ? 'decreasing'
          : 'stable';

    const signal =
      ownershipTrend === 'increasing'
        ? 'buy'
        : ownershipTrend === 'decreasing'
          ? 'sell'
          : 'neutral';

    return {
      symbol,
      totalInstitutionalShares,
      totalInstitutionalValue,
      institutionalOwnershipPercent,
      institutionsCount,
      quarterlyChange,
      topHolders,
      newPositions,
      increasedPositions,
      decreasedPositions,
      soldOut,
      ownershipTrend,
      signal,
    };
  }

  /**
   * Get market sentiment indicators
   */
  async getMarketSentiment(): Promise<{
    fearGreed: FearGreedIndex;
    vix: VIXData;
    breadth: MarketBreadth;
  }> {
    const fearGreed: FearGreedIndex = {
      value: 62,
      label: 'greed',
      previousClose: 58,
      oneWeekAgo: 55,
      oneMonthAgo: 48,
      oneYearAgo: 52,
      components: [
        {
          name: 'Stock Price Momentum',
          value: 65,
          weight: 0.2,
          signal: 'greed',
        },
        {
          name: 'Stock Price Strength',
          value: 70,
          weight: 0.2,
          signal: 'greed',
        },
        {
          name: 'Stock Price Breadth',
          value: 55,
          weight: 0.2,
          signal: 'neutral',
        },
        { name: 'Put/Call Options', value: 60, weight: 0.15, signal: 'greed' },
        {
          name: 'Market Volatility',
          value: 58,
          weight: 0.15,
          signal: 'neutral',
        },
        { name: 'Safe Haven Demand', value: 62, weight: 0.1, signal: 'greed' },
      ],
      updatedAt: new Date(),
    };

    const vix: VIXData = {
      currentValue: 16.5,
      change: -0.8,
      changePercent: -4.6,
      high: 18.2,
      low: 15.8,
      avg30Day: 17.8,
      percentile: 35,
      level: 'normal',
      signal: 'buy',
    };

    const breadth: MarketBreadth = {
      advancers: 2_850,
      decliners: 1_420,
      unchanged: 230,
      advanceDeclineRatio: 2.01,
      advanceDeclineLine: 12_500,
      newHighs: 145,
      newLows: 28,
      highLowRatio: 5.18,
      percentAbove50MA: 68.5,
      percentAbove200MA: 72.3,
      mcclellanOscillator: 85.2,
      mcclellanSummation: 1_250,
      breadthSignal: 'bullish',
    };

    return { fearGreed, vix, breadth };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate composite sentiment score
   */
  private calculateCompositeSentiment(
    news: NewsSentiment,
    social: SocialSentiment,
    analysts: AnalystConsensus,
    insiders: InsiderActivity,
    institutional: InstitutionalOwnership
  ): {
    score: number;
    label: SentimentLabel;
    components: Array<{ source: string; score: number; weight: number }>;
  } {
    const components = [
      { source: 'News', score: news.averageSentiment, weight: 0.25 },
      { source: 'Social Media', score: social.averageSentiment, weight: 0.15 },
      {
        source: 'Analysts',
        score: this.analystRatingToScore(analysts.consensusRating),
        weight: 0.3,
      },
      {
        source: 'Insiders',
        score: this.insiderSentimentToScore(insiders.insiderSentiment),
        weight: 0.2,
      },
      {
        source: 'Institutional',
        score: this.ownershipTrendToScore(institutional.ownershipTrend),
        weight: 0.1,
      },
    ];

    const score = components.reduce((sum, c) => sum + c.score * c.weight, 0);
    const label = this.getSentimentLabel(score);

    return { score, label, components };
  }

  /**
   * Convert sentiment score to label
   */
  private getSentimentLabel(score: number): SentimentLabel {
    if (score >= 0.5) return 'very_positive';
    if (score >= 0.2) return 'positive';
    if (score <= -0.5) return 'very_negative';
    if (score <= -0.2) return 'negative';
    return 'neutral';
  }

  /**
   * Convert sentiment to signal
   */
  private sentimentToSignal(sentiment: number): SignalStrength {
    if (sentiment >= 0.5) return 'strong_buy';
    if (sentiment >= 0.2) return 'buy';
    if (sentiment <= -0.5) return 'strong_sell';
    if (sentiment <= -0.2) return 'sell';
    return 'neutral';
  }

  /**
   * Convert analyst rating to signal
   */
  private analystRatingToSignal(rating: string): SignalStrength {
    const map: Record<string, SignalStrength> = {
      strong_buy: 'strong_buy',
      buy: 'buy',
      hold: 'neutral',
      neutral: 'neutral',
      sell: 'sell',
      strong_sell: 'strong_sell',
    };
    return map[rating] || 'neutral';
  }

  /**
   * Convert analyst rating to score (-1 to 1)
   */
  private analystRatingToScore(rating: string): number {
    const map: Record<string, number> = {
      strong_buy: 1.0,
      buy: 0.5,
      hold: 0.0,
      sell: -0.5,
      strong_sell: -1.0,
    };
    return map[rating] || 0;
  }

  /**
   * Convert insider sentiment to score
   */
  private insiderSentimentToScore(sentiment: string): number {
    const map: Record<string, number> = {
      bullish: 0.7,
      neutral: 0.0,
      bearish: -0.7,
    };
    return map[sentiment] || 0;
  }

  /**
   * Convert ownership trend to score
   */
  private ownershipTrendToScore(trend: string): number {
    const map: Record<string, number> = {
      increasing: 0.6,
      stable: 0.0,
      decreasing: -0.6,
    };
    return map[trend] || 0;
  }

  /**
   * Determine overall signal from composite score
   */
  private determineOverallSignal(score: number): SignalStrength {
    return this.sentimentToSignal(score);
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(
    symbol: string,
    composite: { score: number; label: SentimentLabel },
    signal: SignalStrength
  ): string {
    const sentimentText = composite.label.replace('_', ' ').toUpperCase();
    const signalText = signal.replace('_', ' ').toUpperCase();

    return (
      `Overall sentiment for ${symbol} is ${sentimentText} (score: ${composite.score.toFixed(2)}), ` +
      `resulting in a ${signalText} signal based on analysis of news, social media, ` +
      `analyst ratings, insider activity, and institutional ownership.`
    );
  }

  /**
   * Generate key insights
   */
  private generateKeyInsights(
    news: NewsSentiment,
    social: SocialSentiment,
    analysts: AnalystConsensus
  ): string[] {
    const insights: string[] = [];

    if (news.sentimentTrend === 'improving') {
      insights.push(
        `News sentiment is improving with ${news.positiveCount} positive articles recently`
      );
    }

    if (social.mentionChange > 20) {
      insights.push(
        `Social media mentions increased ${social.mentionChange.toFixed(1)}% in 24h`
      );
    }

    if (analysts.ratingTrend === 'upgrading') {
      insights.push(
        `Analyst consensus is upgrading with ${analysts.strongBuy + analysts.buy} buy ratings out of ${analysts.totalAnalysts} analysts`
      );
    }

    if (analysts.upside > 10) {
      insights.push(
        `Analysts project ${analysts.upside.toFixed(1)}% upside to average price target of $${analysts.averagePriceTarget.toFixed(2)}`
      );
    }

    return insights;
  }

  /**
   * Identify risks from sentiment data
   */
  private identifyRisks(
    news: NewsSentiment,
    insiders: InsiderActivity,
    institutional: InstitutionalOwnership
  ): string[] {
    const risks: string[] = [];

    if (news.sentimentTrend === 'declining') {
      risks.push(
        'News sentiment is declining, indicating potential negative catalysts'
      );
    }

    if (insiders.clusterSelling) {
      risks.push(
        'Cluster selling by insiders may signal concerns about near-term prospects'
      );
    }

    if (institutional.ownershipTrend === 'decreasing') {
      risks.push(
        'Institutional ownership is declining, suggesting reduced confidence from large investors'
      );
    }

    return risks;
  }

  /**
   * Identify opportunities from sentiment data
   */
  private identifyOpportunities(
    news: NewsSentiment,
    analysts: AnalystConsensus,
    insiders: InsiderActivity
  ): string[] {
    const opportunities: string[] = [];

    if (news.sentimentTrend === 'improving') {
      opportunities.push(
        'Improving news sentiment could drive positive price momentum'
      );
    }

    if (analysts.upside > 15) {
      opportunities.push(
        'Significant analyst upside suggests undervalued entry point'
      );
    }

    if (insiders.clusterBuying) {
      opportunities.push(
        'Cluster buying by insiders indicates strong internal confidence'
      );
    }

    return opportunities;
  }

  // ============================================================================
  // DEFAULT DATA METHODS
  // ============================================================================

  private getDefaultNewsSentiment(symbol: string): NewsSentiment {
    return {
      symbol,
      analyzedAt: new Date(),
      articleCount: 0,
      averageSentiment: 0,
      sentimentLabel: 'neutral',
      sentimentChange24h: 0,
      sentimentChange7d: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      topPositiveNews: [],
      topNegativeNews: [],
      recentNews: [],
      sentimentTrend: 'stable',
      signal: 'neutral',
    };
  }

  private getDefaultSocialSentiment(symbol: string): SocialSentiment {
    return {
      symbol,
      analyzedAt: new Date(),
      mentionCount24h: 0,
      mentionCount7d: 0,
      mentionChange: 0,
      averageSentiment: 0,
      sentimentLabel: 'neutral',
      platformBreakdown: [],
      influencerMentions: [],
      viralPosts: [],
      trendingTopics: [],
      sentimentTrend: 'stable',
      signal: 'neutral',
    };
  }

  private getDefaultAnalystConsensus(symbol: string): AnalystConsensus {
    return {
      symbol,
      calculatedAt: new Date(),
      totalAnalysts: 0,
      strongBuy: 0,
      buy: 0,
      hold: 0,
      sell: 0,
      strongSell: 0,
      consensusRating: 'hold',
      averagePriceTarget: 0,
      highPriceTarget: 0,
      lowPriceTarget: 0,
      medianPriceTarget: 0,
      currentPrice: 0,
      upside: 0,
      recentChanges: [],
      ratingTrend: 'stable',
      signal: 'neutral',
    };
  }

  private getDefaultInsiderActivity(symbol: string): InsiderActivity {
    return {
      symbol,
      analyzedAt: new Date(),
      transactions90Days: [],
      totalBuys: 0,
      totalSells: 0,
      netBuyValue: 0,
      netSellValue: 0,
      buyersCount: 0,
      sellersCount: 0,
      insiderSentiment: 'neutral',
      significantTransactions: [],
      clusterBuying: false,
      clusterSelling: false,
      signal: 'neutral',
    };
  }

  private getDefaultInstitutionalOwnership(
    symbol: string
  ): InstitutionalOwnership {
    return {
      symbol,
      totalInstitutionalShares: 0,
      totalInstitutionalValue: 0,
      institutionalOwnershipPercent: 0,
      institutionsCount: 0,
      quarterlyChange: 0,
      topHolders: [],
      newPositions: [],
      increasedPositions: [],
      decreasedPositions: [],
      soldOut: [],
      ownershipTrend: 'stable',
      signal: 'neutral',
    };
  }

  private getDefaultMarketSentiment(): {
    fearGreed: FearGreedIndex;
    vix: VIXData;
    breadth: MarketBreadth;
  } {
    return {
      fearGreed: {
        value: 50,
        label: 'neutral',
        previousClose: 50,
        oneWeekAgo: 50,
        oneMonthAgo: 50,
        oneYearAgo: 50,
        components: [],
        updatedAt: new Date(),
      },
      vix: {
        currentValue: 20,
        change: 0,
        changePercent: 0,
        high: 20,
        low: 20,
        avg30Day: 20,
        percentile: 50,
        level: 'normal',
        signal: 'neutral',
      },
      breadth: {
        advancers: 0,
        decliners: 0,
        unchanged: 0,
        advanceDeclineRatio: 1,
        advanceDeclineLine: 0,
        newHighs: 0,
        newLows: 0,
        highLowRatio: 1,
        percentAbove50MA: 50,
        percentAbove200MA: 50,
        mcclellanOscillator: 0,
        mcclellanSummation: 0,
        breadthSignal: 'neutral',
      },
    };
  }
}

// Singleton instance
let sentimentAnalysisServiceInstance: SentimentAnalysisService | null = null;

/**
 * Get singleton instance of SentimentAnalysisService
 */
export function getSentimentAnalysisService(): SentimentAnalysisService {
  if (!sentimentAnalysisServiceInstance) {
    sentimentAnalysisServiceInstance = new SentimentAnalysisService();
  }
  return sentimentAnalysisServiceInstance;
}

// Export class and singleton
export { SentimentAnalysisService as default };
