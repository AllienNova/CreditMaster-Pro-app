/**
 * GET /api/investments/quote/[symbol] — a single live quote.
 *
 * useMarketData.ts calls this on every symbol view (hooks/useMarketData.ts:72)
 * and the route did not exist, so every symbol page showed a quote error.
 *
 * Thin: UnifiedMarketDataService already owns the provider, the cache and the
 * rate limiting. I had recorded this as "blocked on a market-data provider
 * decision" — that was wrong, the provider has been integrated all along in
 * src/lib/investments/market-data-service.ts.
 *
 * assetType defaults to STOCK because the hook does not send one and stocks are
 * what the symbol screens show; ?assetType=CRYPTO overrides it. The default is
 * documented rather than silent, since a crypto symbol quoted as a stock would
 * fail at the provider rather than return something wrong.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { marketDataService } from "@/lib/investments/market-data-service";
import { AssetType } from "@/lib/investments/types/market-data.types";

function parseAssetType(raw: string | null): AssetType {
  const wanted = (raw ?? "").toUpperCase();
  return (Object.values(AssetType) as string[]).includes(wanted)
    ? (wanted as AssetType)
    : AssetType.STOCK;
}

export const GET = withAuth(async (request: NextRequest, _user: AuthedUser) => {
  // withAuth does not forward Next's route params, so the symbol comes from the
  // pathname — the same approach the other [id] routes in this app use.
  const symbol = decodeURIComponent(
    request.nextUrl.pathname.split("/").pop() ?? "",
  ).toUpperCase();

  if (!symbol || !/^[A-Z0-9.\-]{1,15}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const data = await marketDataService.getQuote(
      symbol,
      parseAssetType(request.nextUrl.searchParams.get("assetType")),
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(`Quote fetch failed for ${symbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 502 },
    );
  }
});
