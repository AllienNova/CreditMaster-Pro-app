/**
 * GET /api/investments/quotes?symbols=AAPL,MSFT — batch quotes.
 *
 * useRealTimePrice.ts polls this for every watchlist and holdings screen
 * (hooks/useRealTimePrice.ts:79). The route did not exist, so no price ever
 * updated.
 *
 * The hook reads `result.data` as an array and maps each entry by `symbol`, so
 * order does not matter but the field does.
 *
 * A symbol that fails is OMITTED rather than returned with a null price: the
 * hook writes whatever it receives straight into its price map, and a null
 * price there would render as a real quote of nothing. The response says how
 * many were requested against how many resolved, so a caller can tell a partial
 * result from a complete one.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { marketDataService } from "@/lib/investments/market-data-service";
import { AssetType } from "@/lib/investments/types/market-data.types";

// Bounded so one request cannot fan out into hundreds of provider calls.
const MAX_SYMBOLS = 50;

export const GET = withAuth(async (request: NextRequest, _user: AuthedUser) => {
  const raw = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.\-]{1,15}$/.test(s)),
    ),
  ].slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "No valid symbols supplied" },
      { status: 400 },
    );
  }

  const settled = await Promise.allSettled(
    symbols.map((s) => marketDataService.getQuote(s, AssetType.STOCK)),
  );

  const data = settled
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof marketDataService.getQuote>>> =>
      r.status === "fulfilled",
    )
    .map((r) => r.value);

  const failed = symbols.filter((_, i) => settled[i].status === "rejected");
  if (failed.length > 0) {
    console.error("Batch quote: no data for", failed.join(", "));
  }

  return NextResponse.json({
    success: true,
    data,
    requested: symbols.length,
    resolved: data.length,
  });
});
