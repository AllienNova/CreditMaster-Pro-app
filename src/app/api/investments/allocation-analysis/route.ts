/**
 * Asset Allocation Analysis API Endpoint
 *
 * POST /api/investments/allocation-analysis
 * Analyzes portfolio asset allocation and provides rebalancing recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAssetAllocationService } from "@/lib/investments/services/AssetAllocationService";
import { RiskTolerance } from "@/lib/investments/types/asset-allocation.types";
import { Portfolio } from "@/lib/investments/types/investment.types";

// Request validation schema
const AllocationAnalysisRequestSchema = z.object({
  portfolio: z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    holdings: z.array(z.any()),
    totalValue: z.number(),
    totalCost: z.number(),
    totalGain: z.number(),
    totalGainPercent: z.number(),
    dayChange: z.number(),
    dayChangePercent: z.number(),
    cashBalance: z.number(),
    assetAllocation: z.array(z.any()),
    sectorAllocation: z.array(z.any()),
    performanceHistory: z.array(z.any()),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
  }),
  riskTolerance: z.enum([
    "very_conservative",
    "conservative",
    "moderate",
    "aggressive",
    "very_aggressive",
  ]),
  constraints: z
    .object({
      minPositionSize: z.number().optional(),
      maxPositionSize: z.number().optional(),
      maxAssetClassConcentration: z.number().optional(),
      allowShortSelling: z.boolean().optional(),
      targetReturn: z.number().optional(),
      maxVolatility: z.number().optional(),
      transactionCostPerTrade: z.number().optional(),
      taxRate: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validationResult = AllocationAnalysisRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { portfolio, riskTolerance, constraints } = validationResult.data;

    // Convert date strings to Date objects
    const portfolioData: Portfolio = {
      ...portfolio,
      createdAt: new Date(portfolio.createdAt),
      updatedAt: new Date(portfolio.updatedAt),
      holdings: portfolio.holdings.map((h: any) => ({
        ...h,
        purchaseDate: new Date(h.purchaseDate),
        lastUpdated: new Date(h.lastUpdated),
      })),
      performanceHistory: portfolio.performanceHistory.map((p: any) => ({
        ...p,
        date: new Date(p.date),
      })),
    };

    // Get asset allocation service
    const allocationService = getAssetAllocationService();

    // Analyze allocation
    const analysis = await allocationService.analyzeAllocation(
      portfolioData,
      riskTolerance as RiskTolerance,
      constraints,
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Asset allocation analysis error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze asset allocation",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve allocation models
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riskTolerance = searchParams.get("riskTolerance");

    const allocationService = getAssetAllocationService();

    if (riskTolerance) {
      // Get specific model
      const model = allocationService.getAllocationModel(
        riskTolerance as RiskTolerance,
      );
      return NextResponse.json({
        success: true,
        data: model,
      });
    }

    // Get all models
    const models = [
      allocationService.getAllocationModel(RiskTolerance.VERY_CONSERVATIVE),
      allocationService.getAllocationModel(RiskTolerance.CONSERVATIVE),
      allocationService.getAllocationModel(RiskTolerance.MODERATE),
      allocationService.getAllocationModel(RiskTolerance.AGGRESSIVE),
      allocationService.getAllocationModel(RiskTolerance.VERY_AGGRESSIVE),
    ];

    return NextResponse.json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error("Get allocation models error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get allocation models",
      },
      { status: 500 },
    );
  }
}
