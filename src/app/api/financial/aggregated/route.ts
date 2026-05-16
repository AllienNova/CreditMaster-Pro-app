/**
 * Aggregated Financial Context API
 *
 * GET /api/financial/aggregated - Get complete aggregated financial context
 *
 * Query Parameters:
 * - snapshot=true - Include point-in-time snapshot
 * - trends=true - Include trend analysis
 * - dateRange=30d|90d|1y - Date range for trends (default: 30d)
 * - refresh=true - Force cache refresh
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { financialAggregationService } from "@/lib/financial/financial-aggregation-service";
import { TrendPeriod } from "@/lib/financial/types/aggregated-context.types";

/**
 * GET /api/financial/aggregated
 * Returns the complete aggregated financial context for the authenticated user
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const includeSnapshot = searchParams.get("snapshot") === "true";
    const includeTrends = searchParams.get("trends") === "true";
    const dateRange = (searchParams.get("dateRange") || "30d") as TrendPeriod;
    const forceRefresh = searchParams.get("refresh") === "true";

    // Get aggregated context
    const context = await financialAggregationService.getAggregatedContext(
      userId,
      { forceRefresh },
    );

    // Build response
    const response: {
      success: boolean;
      data: {
        context: typeof context;
        snapshot?: Awaited<
          ReturnType<typeof financialAggregationService.getFinancialSnapshot>
        >;
        trends?: Awaited<
          ReturnType<typeof financialAggregationService.getFinancialTrends>
        >;
      };
      meta: {
        cachedAt: Date;
        includesSnapshot: boolean;
        includesTrends: boolean;
        dateRange: string;
      };
    } = {
      success: true,
      data: {
        context,
      },
      meta: {
        cachedAt: context.lastUpdated,
        includesSnapshot: includeSnapshot,
        includesTrends: includeTrends,
        dateRange,
      },
    };

    // Add snapshot if requested
    if (includeSnapshot) {
      response.data.snapshot =
        await financialAggregationService.getFinancialSnapshot(userId);
    }

    // Add trends if requested
    if (includeTrends) {
      response.data.trends =
        await financialAggregationService.getFinancialTrends(userId, {
          period: dateRange,
        });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching aggregated financial context:", error);
    return NextResponse.json(
      { error: "Failed to fetch aggregated financial context" },
      { status: 500 },
    );
  }
},
);

/**
 * DELETE /api/financial/aggregated/cache
 * Clear the aggregated context cache for the user
 */
export const DELETE = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {


    // Clear cache for user
    financialAggregationService.clearCache(user.id);

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 },
    );
  }
},
);
