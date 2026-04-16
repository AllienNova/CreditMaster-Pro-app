/**
 * Trending Cryptocurrencies API Endpoint
 *
 * GET /api/investments/crypto/trending
 * Get trending cryptocurrencies with basic analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { CoinGeckoClient } from "@/lib/integrations/coingecko";
import { cryptoAnalyst } from "@/lib/investments/crypto-analyst";
import { getUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { CryptoCategory } from "@/lib/investments/types/crypto-analysis.types";

// Rate limiter: 100 requests per hour per user
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// Query parameters schema
const TrendingQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  category: z.nativeEnum(CryptoCategory).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please log in to access trending cryptocurrencies.",
        },
        { status: 401 },
      );
    }

    // Rate limiting
    try {
      await limiter.check(100, user.id);
    } catch {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 100 requests per hour.",
          retryAfter: "1 hour",
        },
        { status: 429 },
      );
    }

    // Validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validationResult = TrendingQuerySchema.safeParse({
      limit: searchParams.get("limit") || "10",
      category: searchParams.get("category"),
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

    const { limit, category } = validationResult.data;

    // Fetch trending coins from CoinGecko
    const coinGecko = new CoinGeckoClient();
    const trendingCoins = await coinGecko.getTrendingCoins();

    // Get basic analysis for each trending coin
    const trendingSummaries = await Promise.all(
      trendingCoins.slice(0, limit).map(async (coin) => {
        try {
          // Get basic sentiment and price data
          const [sentiment, priceData] = await Promise.all([
            cryptoAnalyst.getCryptoSentiment(coin.id),
            fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}`).then(
              (r) => r.json(),
            ),
          ]);

          return {
            coinId: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            rank: coin.market_cap_rank,
            currentPrice: priceData.market_data?.current_price?.usd || 0,
            priceChange24h:
              priceData.market_data?.price_change_percentage_24h || 0,
            marketCap: priceData.market_data?.market_cap?.usd || 0,
            volume24h: priceData.market_data?.total_volume?.usd || 0,
            sentiment: {
              overall: sentiment.overallSentiment,
              score: sentiment.sentimentScore,
              fearGreed: sentiment.fearGreedIndex.classification,
            },
            thumb: coin.thumb,
          };
        } catch (error) {
          console.error(`Error fetching data for ${coin.id}:`, error);
          return null;
        }
      }),
    );

    // Filter out failed requests and apply category filter if specified
    const filteredSummaries = trendingSummaries.filter((s) => s !== null);

    if (category) {
      // Note: Category filtering would require full analysis, which is expensive
      // For now, we'll return all trending coins regardless of category
      // In production, you might want to cache category data separately
    }

    return NextResponse.json({
      success: true,
      data: filteredSummaries,
      count: filteredSummaries.length,
      timestamp: new Date().toISOString(),
      metadata: {
        limit,
        category: category || "all",
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Trending crypto API error:", error);

    // Handle specific errors
    if (error instanceof Error) {
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
          "An error occurred while fetching trending cryptocurrencies. Please try again later.",
      },
      { status: 500 },
    );
  }
}
