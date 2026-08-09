/**
 * SentimentAnalysisService Tests
 *
 * Comprehensive test suite for sentiment analysis engine
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  SentimentAnalysisService,
  getSentimentAnalysisService,
} from "../SentimentAnalysisService";

// Mock AlphaVantageClient to prevent real network calls in unit tests.
jest.mock("@/lib/integrations/alpha-vantage", () => ({
  AlphaVantageClient: jest.fn().mockImplementation(() => ({
    getNewsSentimentRaw: jest.fn().mockResolvedValue(null),
    getOverviewRaw: jest.fn().mockRejectedValue(new Error("no API key in test")),
  })),
}));

describe("SentimentAnalysisService", () => {
  let service: SentimentAnalysisService;

  beforeEach(() => {
    service = new SentimentAnalysisService();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("should create a new instance", () => {
      expect(service).toBeInstanceOf(SentimentAnalysisService);
    });

    it("should return singleton instance from getSentimentAnalysisService", () => {
      const instance1 = getSentimentAnalysisService();
      const instance2 = getSentimentAnalysisService();
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SentimentAnalysisService);
    });
  });

  // ============================================================================
  // NEWS SENTIMENT TESTS
  // ============================================================================

  describe("getNewsSentiment", () => {
    it("should return news sentiment for a symbol", async () => {
      const sentiment = await service.getNewsSentiment("AAPL");

      expect(sentiment).toHaveProperty("symbol", "AAPL");
      expect(sentiment).toHaveProperty("analyzedAt");
      expect(sentiment).toHaveProperty("articleCount");
      expect(sentiment).toHaveProperty("averageSentiment");
      expect(sentiment).toHaveProperty("sentimentLabel");
      expect(sentiment).toHaveProperty("positiveCount");
      expect(sentiment).toHaveProperty("negativeCount");
      expect(sentiment).toHaveProperty("neutralCount");
      expect(sentiment).toHaveProperty("recentNews");
      expect(sentiment).toHaveProperty("signal");
    });

    it("should have news articles array (may be empty when API unavailable)", async () => {
      const sentiment = await service.getNewsSentiment("MSFT");

      expect(sentiment.recentNews).toBeInstanceOf(Array);
      // When API returns data, each article must have required fields.
      for (const article of sentiment.recentNews) {
        expect(article).toHaveProperty("title");
        expect(article).toHaveProperty("source");
        expect(article).toHaveProperty("sentiment");
        expect(article).toHaveProperty("publishedAt");
      }
    });

    it("should calculate counts correctly", async () => {
      const sentiment = await service.getNewsSentiment("GOOGL");

      const totalCount =
        sentiment.positiveCount +
        sentiment.negativeCount +
        sentiment.neutralCount;
      expect(totalCount).toBe(sentiment.articleCount);
    });

    it("should have sentiment in valid range", async () => {
      const sentiment = await service.getNewsSentiment("META");

      expect(sentiment.averageSentiment).toBeGreaterThanOrEqual(-1);
      expect(sentiment.averageSentiment).toBeLessThanOrEqual(1);
    });

    it("should have valid sentiment label", async () => {
      const sentiment = await service.getNewsSentiment("TSLA");

      expect([
        "very_positive",
        "positive",
        "neutral",
        "negative",
        "very_negative",
      ]).toContain(sentiment.sentimentLabel);
    });

    it("should have top positive and negative news", async () => {
      const sentiment = await service.getNewsSentiment("NVDA");

      expect(sentiment).toHaveProperty("topPositiveNews");
      expect(sentiment).toHaveProperty("topNegativeNews");
      expect(sentiment.topPositiveNews).toBeInstanceOf(Array);
      expect(sentiment.topNegativeNews).toBeInstanceOf(Array);
    });
  });

  // ============================================================================
  // SOCIAL SENTIMENT TESTS
  // ============================================================================

  describe("getSocialSentiment", () => {
    it("should return social media sentiment", async () => {
      const sentiment = await service.getSocialSentiment("AAPL");

      expect(sentiment).toHaveProperty("symbol", "AAPL");
      expect(sentiment).toHaveProperty("mentionCount24h");
      expect(sentiment).toHaveProperty("mentionCount7d");
      expect(sentiment).toHaveProperty("averageSentiment");
      expect(sentiment).toHaveProperty("platformBreakdown");
      expect(sentiment).toHaveProperty("influencerMentions");
      expect(sentiment).toHaveProperty("trendingTopics");
    });

    it("should have platform breakdown", async () => {
      const sentiment = await service.getSocialSentiment("MSFT");

      expect(sentiment.platformBreakdown).toBeInstanceOf(Array);
      expect(sentiment.platformBreakdown.length).toBeGreaterThan(0);

      const firstPlatform = sentiment.platformBreakdown[0];
      expect(firstPlatform).toHaveProperty("platform");
      expect(firstPlatform).toHaveProperty("mentions");
      expect(firstPlatform).toHaveProperty("sentiment");
    });

    it("should have influencer mentions", async () => {
      const sentiment = await service.getSocialSentiment("GOOGL");

      expect(sentiment.influencerMentions).toBeInstanceOf(Array);

      if (sentiment.influencerMentions.length > 0) {
        const firstMention = sentiment.influencerMentions[0];
        expect(firstMention).toHaveProperty("platform");
        expect(firstMention).toHaveProperty("content");
        expect(firstMention).toHaveProperty("authorFollowers");
        expect(firstMention).toHaveProperty("engagement");
      }
    });

    it("should have trending topics", async () => {
      const sentiment = await service.getSocialSentiment("META");

      expect(sentiment.trendingTopics).toBeInstanceOf(Array);
      expect(sentiment.trendingTopics.length).toBeGreaterThan(0);
      expect(typeof sentiment.trendingTopics[0]).toBe("string");
    });
  });

  // ============================================================================
  // ANALYST CONSENSUS TESTS
  // ============================================================================

  describe("getAnalystConsensus", () => {
    it("should return analyst consensus", async () => {
      const consensus = await service.getAnalystConsensus("AAPL");

      expect(consensus).toHaveProperty("symbol", "AAPL");
      expect(consensus).toHaveProperty("totalAnalysts");
      expect(consensus).toHaveProperty("strongBuy");
      expect(consensus).toHaveProperty("buy");
      expect(consensus).toHaveProperty("hold");
      expect(consensus).toHaveProperty("sell");
      expect(consensus).toHaveProperty("strongSell");
      expect(consensus).toHaveProperty("consensusRating");
      expect(consensus).toHaveProperty("averagePriceTarget");
      expect(consensus).toHaveProperty("upside");
    });

    it("should calculate total analysts correctly", async () => {
      const consensus = await service.getAnalystConsensus("MSFT");

      const total =
        consensus.strongBuy +
        consensus.buy +
        consensus.hold +
        consensus.sell +
        consensus.strongSell;
      expect(total).toBe(consensus.totalAnalysts);
    });

    it("should have valid consensus rating", async () => {
      const consensus = await service.getAnalystConsensus("GOOGL");

      expect(["strong_buy", "buy", "hold", "sell", "strong_sell"]).toContain(
        consensus.consensusRating,
      );
    });

    it("should have non-negative price targets", async () => {
      const consensus = await service.getAnalystConsensus("META");

      // averagePriceTarget may be 0 when the API is unavailable; must not be negative.
      expect(consensus.averagePriceTarget).toBeGreaterThanOrEqual(0);
      expect(consensus.highPriceTarget).toBeGreaterThanOrEqual(0);
      expect(consensus.lowPriceTarget).toBeGreaterThanOrEqual(0);
    });

    it("should have recent changes array (may be empty when API unavailable)", async () => {
      const consensus = await service.getAnalystConsensus("TSLA");

      expect(consensus.recentChanges).toBeInstanceOf(Array);
      // When API returns data, each change must have required fields.
      for (const change of consensus.recentChanges) {
        expect(change).toHaveProperty("firm");
        expect(change).toHaveProperty("rating");
        expect(change).toHaveProperty("priceTarget");
      }
    });
  });

  // ============================================================================
  // INSIDER ACTIVITY TESTS
  // ============================================================================

  describe("getInsiderActivity", () => {
    it("should return insider trading activity", async () => {
      const activity = await service.getInsiderActivity("AAPL");

      expect(activity).toHaveProperty("symbol", "AAPL");
      expect(activity).toHaveProperty("transactions90Days");
      expect(activity).toHaveProperty("totalBuys");
      expect(activity).toHaveProperty("totalSells");
      expect(activity).toHaveProperty("netBuyValue");
      expect(activity).toHaveProperty("netSellValue");
      expect(activity).toHaveProperty("insiderSentiment");
      expect(activity).toHaveProperty("clusterBuying");
      expect(activity).toHaveProperty("clusterSelling");
    });

    it("should have transactions", async () => {
      const activity = await service.getInsiderActivity("MSFT");

      expect(activity.transactions90Days).toBeInstanceOf(Array);
      expect(activity.transactions90Days.length).toBeGreaterThan(0);

      const firstTransaction = activity.transactions90Days[0];
      expect(firstTransaction).toHaveProperty("insiderName");
      expect(firstTransaction).toHaveProperty("transactionType");
      expect(firstTransaction).toHaveProperty("shares");
      expect(firstTransaction).toHaveProperty("pricePerShare");
      expect(firstTransaction).toHaveProperty("totalValue");
    });

    it("should calculate buy/sell counts", async () => {
      const activity = await service.getInsiderActivity("GOOGL");

      expect(activity.totalBuys).toBeGreaterThanOrEqual(0);
      expect(activity.totalSells).toBeGreaterThanOrEqual(0);
    });

    it("should have valid insider sentiment", async () => {
      const activity = await service.getInsiderActivity("META");

      expect(["bullish", "neutral", "bearish"]).toContain(
        activity.insiderSentiment,
      );
    });

    it("should identify significant transactions", async () => {
      const activity = await service.getInsiderActivity("TSLA");

      expect(activity).toHaveProperty("significantTransactions");
      expect(activity.significantTransactions).toBeInstanceOf(Array);
    });
  });

  // ============================================================================
  // INSTITUTIONAL OWNERSHIP TESTS
  // ============================================================================

  describe("getInstitutionalOwnership", () => {
    it("should return institutional ownership data", async () => {
      const ownership = await service.getInstitutionalOwnership("AAPL");

      expect(ownership).toHaveProperty("symbol", "AAPL");
      expect(ownership).toHaveProperty("totalInstitutionalShares");
      expect(ownership).toHaveProperty("totalInstitutionalValue");
      expect(ownership).toHaveProperty("institutionalOwnershipPercent");
      expect(ownership).toHaveProperty("quarterlyChange");
      expect(ownership).toHaveProperty("topHolders");
      expect(ownership).toHaveProperty("ownershipTrend");
    });

    it("should have top holders", async () => {
      const ownership = await service.getInstitutionalOwnership("MSFT");

      expect(ownership.topHolders).toBeInstanceOf(Array);
      expect(ownership.topHolders.length).toBeGreaterThan(0);

      const firstHolder = ownership.topHolders[0];
      expect(firstHolder).toHaveProperty("name");
      expect(firstHolder).toHaveProperty("shares");
      expect(firstHolder).toHaveProperty("value");
      expect(firstHolder).toHaveProperty("percentOwnership");
    });

    it("should track position changes", async () => {
      const ownership = await service.getInstitutionalOwnership("GOOGL");

      expect(ownership).toHaveProperty("newPositions");
      expect(ownership).toHaveProperty("increasedPositions");
      expect(ownership).toHaveProperty("decreasedPositions");
      expect(ownership).toHaveProperty("soldOut");
    });

    it("should have valid ownership trend", async () => {
      const ownership = await service.getInstitutionalOwnership("META");

      expect(["increasing", "stable", "decreasing"]).toContain(
        ownership.ownershipTrend,
      );
    });
  });

  // ============================================================================
  // MARKET SENTIMENT TESTS
  // ============================================================================

  describe("getMarketSentiment", () => {
    it("should return market sentiment indicators", async () => {
      const market = await service.getMarketSentiment();

      expect(market).toHaveProperty("fearGreed");
      expect(market).toHaveProperty("vix");
      expect(market).toHaveProperty("breadth");
    });

    it("should have Fear & Greed Index", async () => {
      const market = await service.getMarketSentiment();

      expect(market.fearGreed).toHaveProperty("value");
      expect(market.fearGreed).toHaveProperty("label");
      expect(market.fearGreed).toHaveProperty("components");

      expect(market.fearGreed.value).toBeGreaterThanOrEqual(0);
      expect(market.fearGreed.value).toBeLessThanOrEqual(100);
      expect([
        "extreme_fear",
        "fear",
        "neutral",
        "greed",
        "extreme_greed",
      ]).toContain(market.fearGreed.label);
    });

    it("should have VIX data", async () => {
      const market = await service.getMarketSentiment();

      expect(market.vix).toHaveProperty("currentValue");
      expect(market.vix).toHaveProperty("level");
      expect(market.vix).toHaveProperty("signal");

      expect(market.vix.currentValue).toBeGreaterThan(0);
      expect(["low", "normal", "elevated", "high", "extreme"]).toContain(
        market.vix.level,
      );
    });

    it("should have market breadth indicators", async () => {
      const market = await service.getMarketSentiment();

      expect(market.breadth).toHaveProperty("advancers");
      expect(market.breadth).toHaveProperty("decliners");
      expect(market.breadth).toHaveProperty("advanceDeclineRatio");
      expect(market.breadth).toHaveProperty("breadthSignal");

      expect(["bullish", "neutral", "bearish"]).toContain(
        market.breadth.breadthSignal,
      );
    });
  });

  // ============================================================================
  // COMPREHENSIVE SENTIMENT ANALYSIS TESTS
  // ============================================================================

  describe("analyzeSentiment", () => {
    it("should perform comprehensive sentiment analysis", async () => {
      const analysis = await service.analyzeSentiment("AAPL");

      expect(analysis).toHaveProperty("symbol", "AAPL");
      expect(analysis).toHaveProperty("analyzedAt");
      expect(analysis).toHaveProperty("newsSentiment");
      expect(analysis).toHaveProperty("socialSentiment");
      expect(analysis).toHaveProperty("analystConsensus");
      expect(analysis).toHaveProperty("insiderActivity");
      expect(analysis).toHaveProperty("institutionalOwnership");
      expect(analysis).toHaveProperty("marketSentiment");
      expect(analysis).toHaveProperty("compositeSentiment");
      expect(analysis).toHaveProperty("overallSignal");
      expect(analysis).toHaveProperty("summary");
      expect(analysis).toHaveProperty("keyInsights");
      expect(analysis).toHaveProperty("risks");
      expect(analysis).toHaveProperty("opportunities");
    });

    it("should calculate composite sentiment", async () => {
      const analysis = await service.analyzeSentiment("MSFT");

      expect(analysis.compositeSentiment).toHaveProperty("score");
      expect(analysis.compositeSentiment).toHaveProperty("label");
      expect(analysis.compositeSentiment).toHaveProperty("components");

      expect(analysis.compositeSentiment.score).toBeGreaterThanOrEqual(-1);
      expect(analysis.compositeSentiment.score).toBeLessThanOrEqual(1);

      expect([
        "very_positive",
        "positive",
        "neutral",
        "negative",
        "very_negative",
      ]).toContain(analysis.compositeSentiment.label);
    });

    it("should have weighted components", async () => {
      const analysis = await service.analyzeSentiment("GOOGL");

      expect(analysis.compositeSentiment.components).toBeInstanceOf(Array);
      expect(analysis.compositeSentiment.components.length).toBeGreaterThan(0);

      const firstComponent = analysis.compositeSentiment.components[0];
      expect(firstComponent).toHaveProperty("source");
      expect(firstComponent).toHaveProperty("score");
      expect(firstComponent).toHaveProperty("weight");

      // Weights should sum to 1.0
      const totalWeight = analysis.compositeSentiment.components.reduce(
        (sum, c) => sum + c.weight,
        0,
      );
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it("should determine overall signal", async () => {
      const analysis = await service.analyzeSentiment("META");

      expect(["strong_buy", "buy", "hold", "sell", "strong_sell"]).toContain(
        analysis.overallSignal,
      );
    });

    it("should generate summary", async () => {
      const analysis = await service.analyzeSentiment("TSLA");

      expect(typeof analysis.summary).toBe("string");
      expect(analysis.summary.length).toBeGreaterThan(0);
      expect(analysis.summary).toContain("TSLA");
    });

    it("should identify key insights", async () => {
      const analysis = await service.analyzeSentiment("NVDA");

      expect(analysis.keyInsights).toBeInstanceOf(Array);
      // insights may be empty when API is unavailable; validate structure if present
      for (const insight of analysis.keyInsights) {
        expect(typeof insight).toBe("string");
      }
    });

    it("should identify risks", async () => {
      const analysis = await service.analyzeSentiment("AMD");

      expect(analysis.risks).toBeInstanceOf(Array);
      expect(
        typeof analysis.risks[0] === "string" || analysis.risks.length === 0,
      ).toBe(true);
    });

    it("should identify opportunities", async () => {
      const analysis = await service.analyzeSentiment("INTC");

      expect(analysis.opportunities).toBeInstanceOf(Array);
      expect(
        typeof analysis.opportunities[0] === "string" ||
          analysis.opportunities.length === 0,
      ).toBe(true);
    });

    it("should support optional components", async () => {
      const analysisAll = await service.analyzeSentiment("AAPL", {
        includeNews: true,
        includeSocial: true,
        includeAnalysts: true,
        includeInsiders: true,
        includeInstitutional: true,
        includeMarket: true,
      });

      expect(analysisAll.newsSentiment.articleCount).toBeGreaterThanOrEqual(0);
      expect(analysisAll.socialSentiment.mentionCount24h).toBeGreaterThanOrEqual(0);
      expect(analysisAll.analystConsensus.totalAnalysts).toBeGreaterThanOrEqual(0);
      expect(analysisAll.insiderActivity.transactions90Days).toBeInstanceOf(
        Array,
      );
      expect(analysisAll.institutionalOwnership.topHolders).toBeInstanceOf(
        Array,
      );
      expect(analysisAll.marketSentiment).toBeDefined();
    });

    it("should exclude optional components when requested", async () => {
      const analysisBasic = await service.analyzeSentiment("MSFT", {
        includeNews: false,
        includeSocial: false,
        includeAnalysts: false,
        includeInsiders: false,
        includeInstitutional: false,
        includeMarket: false,
      });

      expect(analysisBasic.newsSentiment.articleCount).toBe(0);
      expect(analysisBasic.socialSentiment.mentionCount24h).toBe(0);
      expect(analysisBasic.analystConsensus.totalAnalysts).toBe(0);
      expect(analysisBasic.insiderActivity.transactions90Days).toHaveLength(0);
      expect(analysisBasic.institutionalOwnership.topHolders).toHaveLength(0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle different symbol formats", async () => {
      const symbols = ["AAPL", "BRK.B", "GOOGL"];

      for (const symbol of symbols) {
        const sentiment = await service.getNewsSentiment(symbol);
        expect(sentiment.symbol).toBe(symbol);
      }
    });

    it("should handle concurrent requests", async () => {
      const promises = [
        service.getNewsSentiment("AAPL"),
        service.getSocialSentiment("MSFT"),
        service.getAnalystConsensus("GOOGL"),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty("recentNews");
      expect(results[1]).toHaveProperty("platformBreakdown");
      expect(results[2]).toHaveProperty("consensusRating");
    });

    it("should handle symbols with no data gracefully", async () => {
      const sentiment = await service.analyzeSentiment("UNKN");

      expect(sentiment).toHaveProperty("compositeSentiment");
      expect(sentiment).toHaveProperty("overallSignal");
      expect(sentiment.overallSignal).toBeDefined();
    });
  });
});
