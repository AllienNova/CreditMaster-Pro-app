/**
 * GET /api/investments/historical/[symbol]?interval=1DAY&limit=90
 *
 * Called by useMarketData.ts:111 for every price chart. The route did not
 * exist, so no chart could load.
 *
 * `interval` is validated against the TimeInterval enum rather than passed
 * through — an unrecognised value would reach the provider and fail there, with
 * an error the user cannot act on. Unknown values fall back to daily.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { marketDataService } from "@/lib/investments/market-data-service";
import {
  AssetType,
  TimeInterval,
} from "@/lib/investments/types/market-data.types";

const MAX_POINTS = 5000;

export const GET = withAuth(async (request: NextRequest, _user: AuthedUser) => {
  const symbol = decodeURIComponent(
    request.nextUrl.pathname.split("/").pop() ?? "",
  ).toUpperCase();

  if (!symbol || !/^[A-Z0-9.\-]{1,15}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const params = request.nextUrl.searchParams;
  const rawInterval = (params.get("interval") ?? "").toUpperCase();
  const interval = (Object.values(TimeInterval) as string[]).includes(rawInterval)
    ? (rawInterval as TimeInterval)
    : TimeInterval.ONE_DAY;

  const rawLimit = Number.parseInt(params.get("limit") ?? "", 10);
  const days =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_POINTS)
      : undefined;

  const rawAsset = (params.get("assetType") ?? "").toUpperCase();
  const assetType = (Object.values(AssetType) as string[]).includes(rawAsset)
    ? (rawAsset as AssetType)
    : AssetType.STOCK;

  try {
    const data = await marketDataService.getHistory(
      symbol,
      assetType,
      interval,
      days,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(`History fetch failed for ${symbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch historical data" },
      { status: 502 },
    );
  }
});
