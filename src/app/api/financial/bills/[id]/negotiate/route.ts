/**
 * Bill Negotiation Script Generation API
 * POST /api/financial/bills/[id]/negotiate - Generate personalized negotiation script
 *
 * Phase 2.4: Bill Negotiation Assistant
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBillNegotiator } from "@/lib/financial/bill-negotiator";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const generateScriptSchema = z.object({
  userTenure: z.number().int().positive().optional(),
  paymentHistory: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  loyaltyScore: z.number().min(0).max(100).optional(),
  strategy: z.enum(["aggressive", "balanced", "conservative"]).optional(),
});

// ============================================================================
// POST /api/financial/bills/[id]/negotiate
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();

  try {
    // Apply middleware (auth, RBAC, rate limiting, etc.)
    const middlewareResult = await applyFinancialAPIMiddleware(request, {
      requireAuth: true,
      rateLimit: true,
      cors: true,
      logging: true,
    });

    if (middlewareResult.error) {
      return middlewareResult.error;
    }

    const { userId, startTime: middlewareStartTime } = middlewareResult;
    const { id: billId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = generateScriptSchema.parse(body);

    // Get bill negotiator
    const billNegotiator = getBillNegotiator();

    // Get all negotiable bills for the user
    const bills = await billNegotiator.identifyNegotiableBills(userId!);
    const bill = bills.find((b) => b.id === billId);

    if (!bill) {
      return NextResponse.json(
        {
          success: false,
          error: "Bill not found",
          message: `No negotiable bill found with ID: ${billId}`,
        },
        { status: 404 },
      );
    }

    // Build user profile if provided
    const userProfile =
      validatedBody.userTenure ||
      validatedBody.paymentHistory ||
      validatedBody.loyaltyScore
        ? {
            userId: userId!,
            tenure: validatedBody.userTenure || 0,
            paymentHistory: (validatedBody.paymentHistory || "good") as
              | "excellent"
              | "good"
              | "fair"
              | "poor",
            loyaltyScore: validatedBody.loyaltyScore || 75,
            previousNegotiations: 0,
            successRate: 0,
          }
        : undefined;

    // Generate negotiation script
    const script = await billNegotiator.generateNegotiationScript(
      bill,
      userProfile,
    );

    // Get market analysis for additional context
    const marketAnalysis = await billNegotiator.analyzeMarketRates(
      bill.billType,
      bill.provider,
    );

    return finalizeResponse(
      request,
      NextResponse.json({
        success: true,
        data: {
          script,
          bill: {
            id: bill.id,
            provider: bill.provider,
            serviceName: bill.serviceName,
            currentAmount: bill.currentAmount,
            estimatedSavings: bill.estimatedSavings,
            negotiationPotential: bill.negotiationPotential,
            difficulty: bill.difficulty,
          },
          marketContext: {
            averageMarketRate: marketAnalysis.averageMarketRate,
            savingsPotential: marketAnalysis.savingsPotential,
            marketPosition: marketAnalysis.marketPosition,
            recommendedAction: marketAnalysis.recommendedAction,
            leveragePoints: marketAnalysis.leveragePoints,
          },
        },
        meta: {
          userId,
          billId,
          strategy: script.strategy,
          targetSavings: script.targetSavings,
          minimumAcceptableSavings: script.minimumAcceptableSavings,
          confidence: script.confidence,
          aiModel: script.aiModel,
          generatedAt: script.generatedAt.toISOString(),
          expiresAt: script.expiresAt.toISOString(),
          processingTimeMs: Date.now() - middlewareStartTime,
        },
      }),
      middlewareStartTime,
      userId,
    );
  } catch (error) {
    console.error("Error in POST /api/financial/bills/[id]/negotiate:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
