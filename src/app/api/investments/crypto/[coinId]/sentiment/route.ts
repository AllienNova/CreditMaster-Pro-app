/**
 * Cryptocurrency Sentiment Analysis API Endpoint
 *
 * GET /api/investments/crypto/[coinId]/sentiment
 * Detailed sentiment analysis for specific cryptocurrency
 */

import { NextRequest, NextResponse } from "next/server";
import { cryptoAnalyst } from "@/lib/investments/crypto-analyst";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { rateLimit } from "@/lib/security/redis-rate-limiting";
import { z } from "zod";

// Rate limiter: 75 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Query parameters schema
const SentimentQuerySchema = z.object({
  timeframe: z.enum(["24h", "7d", "30d"]).default("7d").optional(),
});

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Rate limiting
    try {
      await limiter.check(75, user.id);
    } catch {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 75 requests per hour.",
          retryAfter: "1 hour",
        },
        { status: 429 },
      );
    }

    // Get and validate parameters
    // Path is .../crypto/[coinId]/sentiment — coinId is the segment before "sentiment".
    const segments = request.nextUrl.pathname.split("/");
    const coinId = segments[segments.length - 2] ?? "";

    if (!coinId || typeof coinId !== "string") {
      return NextResponse.json(
        { error: "Invalid coin ID. Please provide a valid CoinGecko coin ID." },
        { status: 400 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const validationResult = SentimentQuerySchema.safeParse({
      timeframe: searchParams.get("timeframe") || "7d",
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    // Get sentiment analysis
    const sentiment = await cryptoAnalyst.getCryptoSentiment(coinId);

    // Enrich with additional context
    const enrichedSentiment = {
      ...sentiment,
      analysis: {
        summary: generateSentimentSummary(sentiment),
        strengths: identifyStrengths(sentiment),
        concerns: identifyConcerns(sentiment),
        recommendation: generateRecommendation(sentiment),
      },
      timeframe: validationResult.data.timeframe,
    };

    return NextResponse.json({
      success: true,
      data: enrichedSentiment,
      timestamp: new Date().toISOString(),
      metadata: {
        coinId,
        timeframe: validationResult.data.timeframe,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Sentiment analysis API error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("404")
      ) {
        return NextResponse.json(
          {
            error: "Cryptocurrency not found",
            message:
              "The requested cryptocurrency could not be found. Please check the coin ID.",
          },
          { status: 404 },
        );
      }

      if (
        error.message.includes("rate limit") ||
        error.message.includes("429")
      ) {
        return NextResponse.json(
          {
            error: "External API rate limit exceeded",
            message: "Please try again in a few moments.",
          },
          { status: 429 },
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          "An error occurred while analyzing sentiment. Please try again later.",
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSentimentSummary(sentiment: any): string {
  const { overallSentiment, sentimentScore, fearGreedIndex } = sentiment;

  if (overallSentiment === "very_bullish") {
    return `Extremely positive sentiment (${sentimentScore}/100) with ${fearGreedIndex.classification} market conditions.`;
  } else if (overallSentiment === "bullish") {
    return `Positive sentiment (${sentimentScore}/100) indicating optimistic market outlook.`;
  } else if (overallSentiment === "neutral") {
    return `Neutral sentiment (${sentimentScore}/100) with balanced market conditions.`;
  } else if (overallSentiment === "bearish") {
    return `Negative sentiment (${sentimentScore}/100) suggesting cautious market outlook.`;
  } else {
    return `Very negative sentiment (${sentimentScore}/100) with ${fearGreedIndex.classification} market conditions.`;
  }
}

function identifyStrengths(sentiment: any): string[] {
  const strengths: string[] = [];

  if (sentiment.communityEngagement.engagementScore > 70) {
    strengths.push("Strong community engagement and activity");
  }
  if (
    sentiment.communityEngagement.developerActivity === "high" ||
    sentiment.communityEngagement.developerActivity === "very_high"
  ) {
    strengths.push("Active development and regular code commits");
  }
  if (sentiment.newsSentiment.sentimentRatio > 0.7) {
    strengths.push("Predominantly positive news coverage");
  }
  if (sentiment.communityEngagement.communityGrowth7d > 5) {
    strengths.push("Rapid community growth");
  }

  return strengths.length > 0
    ? strengths
    : ["No significant strengths identified"];
}

function identifyConcerns(sentiment: any): string[] {
  const concerns: string[] = [];

  if (sentiment.fearGreedIndex.classification === "extreme_greed") {
    concerns.push(
      "Market showing signs of extreme greed - potential correction risk",
    );
  }
  if (sentiment.fearGreedIndex.classification === "extreme_fear") {
    concerns.push("Market in extreme fear - high volatility expected");
  }
  if (sentiment.communityEngagement.communityGrowth7d < -5) {
    concerns.push("Declining community engagement");
  }
  if (sentiment.newsSentiment.sentimentRatio < 0.3) {
    concerns.push("Predominantly negative news coverage");
  }
  if (
    sentiment.communityEngagement.developerActivity === "very_low" ||
    sentiment.communityEngagement.developerActivity === "low"
  ) {
    concerns.push("Low developer activity may indicate stagnant development");
  }

  return concerns.length > 0 ? concerns : ["No major concerns identified"];
}

function generateRecommendation(sentiment: any): string {
  if (
    sentiment.overallSentiment === "very_bullish" &&
    sentiment.fearGreedIndex.classification === "extreme_greed"
  ) {
    return "Exercise caution - strong sentiment but potential for correction";
  } else if (sentiment.overallSentiment === "very_bullish") {
    return "Positive outlook - consider for growth-oriented portfolios";
  } else if (sentiment.overallSentiment === "bullish") {
    return "Favorable conditions - suitable for moderate risk tolerance";
  } else if (sentiment.overallSentiment === "neutral") {
    return "Wait and watch - monitor for clearer signals";
  } else if (sentiment.overallSentiment === "bearish") {
    return "Cautious approach recommended - consider reducing exposure";
  } else {
    return "High risk - avoid or minimize exposure";
  }
}
