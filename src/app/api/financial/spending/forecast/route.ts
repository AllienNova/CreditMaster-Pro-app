/**
 * Spending Forecast API Endpoint
 *
 * GET /api/financial/spending/forecast
 * Returns ML-based spending predictions with confidence intervals
 */

import { NextRequest, NextResponse } from "next/server";
import { spendingForecastService } from "@/lib/financial/spending-forecast-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const months = parseInt(searchParams.get("months") || "3", 10);
    const includeCategories = searchParams.get("includeCategories") !== "false";
    const includeSeasonality =
      searchParams.get("includeSeasonality") !== "false";
    const confidenceLevel = parseFloat(
      searchParams.get("confidenceLevel") || "0.95",
    );
    const historicalMonths = parseInt(
      searchParams.get("historicalMonths") || "12",
      10,
    );

    // Validate parameters
    if (months < 1 || months > 12) {
      return NextResponse.json(
        { error: "months must be between 1 and 12" },
        { status: 400 },
      );
    }

    if (confidenceLevel < 0.5 || confidenceLevel > 0.99) {
      return NextResponse.json(
        { error: "confidenceLevel must be between 0.5 and 0.99" },
        { status: 400 },
      );
    }

    if (historicalMonths < 3 || historicalMonths > 24) {
      return NextResponse.json(
        { error: "historicalMonths must be between 3 and 24" },
        { status: 400 },
      );
    }

    const userId = user.id;

    // Generate forecast
    const forecast = await spendingForecastService.generateForecast(userId, {
      months,
      includeCategories,
      includeSeasonality,
      confidenceLevel,
      historicalMonths,
    });

    // Transform dates to ISO strings for JSON serialization
    const response = {
      ...forecast,
      generatedAt: forecast.generatedAt.toISOString(),
      forecastPeriod: {
        ...forecast.forecastPeriod,
        startDate: forecast.forecastPeriod.startDate.toISOString(),
        endDate: forecast.forecastPeriod.endDate.toISOString(),
      },
      accuracy: {
        ...forecast.accuracy,
        lastValidation: forecast.accuracy.lastValidation?.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Forecast API error:", error);
    return NextResponse.json(
      { error: "Failed to generate spending forecast" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/financial/spending/forecast
 * Returns a simplified forecast summary for dashboard widgets
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "summary") {
      const userId = user.id;

      const summary = await spendingForecastService.getForecastSummary(userId);

      return NextResponse.json(summary);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Forecast API error:", error);
    return NextResponse.json(
      { error: "Failed to process forecast request" },
      { status: 500 },
    );
  }
});
