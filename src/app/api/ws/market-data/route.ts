/**
 * Market Data WebSocket API Route
 *
 * Provides real-time market data updates via Server-Sent Events (SSE)
 * Note: Next.js doesn't natively support WebSocket in API routes,
 * so we use SSE as an alternative for real-time updates
 */

import { NextRequest } from "next/server";
import { getMarketDataService } from "@/lib/investments/services/MarketDataService";

/**
 * GET /api/ws/market-data
 *
 * Establishes a Server-Sent Events connection for real-time market data
 *
 * Query Parameters:
 * - symbols: Comma-separated list of symbols to subscribe to (e.g., "AAPL,MSFT,GOOGL")
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");

  if (!symbolsParam) {
    return new Response("Missing symbols parameter", { status: 400 });
  }

  const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", symbols })}\n\n`,
        ),
      );

      const marketDataService = getMarketDataService();

      // Function to fetch and send price updates
      const sendPriceUpdates = async () => {
        try {
          for (const symbol of symbols) {
            try {
              // Fetch latest quote
              const quote = await marketDataService.getQuote(symbol);

              if (quote) {
                const update = {
                  type: "price_update",
                  symbol: quote.symbol,
                  price: quote.price,
                  change: quote.change,
                  changePercent: quote.changePercent,
                  volume: quote.volume,
                  timestamp: new Date().toISOString(),
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(update)}\n\n`),
                );
              }
            } catch (error) {
              console.error(`Error fetching quote for ${symbol}:`, error);
            }
          }
        } catch (error) {
          console.error("Error in sendPriceUpdates:", error);
        }
      };

      // Send initial price updates
      await sendPriceUpdates();

      // Set up interval to send updates every 5 seconds
      const interval = setInterval(async () => {
        await sendPriceUpdates();
      }, 5000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * GET /api/ws/market-data/status
 *
 * Returns the status of the WebSocket service
 */
export async function POST(request: NextRequest) {
  return Response.json({
    success: true,
    data: {
      status: "operational",
      protocol: "SSE",
      updateInterval: 5000,
      message: "Market data streaming service is operational",
    },
  });
}
