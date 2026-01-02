/**
 * Bill Market Analysis API
 * GET /api/financial/bills/analysis - Get market analysis and savings potential
 *
 * Phase 2.4: Bill Negotiation Assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBillNegotiator } from '@/lib/financial/bill-negotiator';
import { applyFinancialAPIMiddleware, finalizeResponse } from '@/lib/api/middleware/financial-api-middleware';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const analysisQuerySchema = z.object({
  billType: z.enum(['telecom', 'utilities', 'insurance', 'subscription', 'internet', 'cable', 'mobile', 'electricity', 'gas', 'water', 'home_insurance', 'auto_insurance', 'streaming']).optional(),
  provider: z.string().optional(),
  location: z.string().optional(),
  includeSavingsEstimate: z.coerce.boolean().default(true),
});

// ============================================================================
// GET /api/financial/bills/analysis
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Apply middleware (auth, RBAC, rate limiting, etc.)
    const middlewareResult = await applyFinancialAPIMiddleware(request, {
      requiredPermission: 'financial:manage_bills',
      rateLimit: { maxRequests: 50, windowMs: 60000 }, // 50 req/min
    });

    if (middlewareResult.error) {
      return middlewareResult.response!;
    }

    const { userId } = middlewareResult;

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      billType: searchParams.get('billType'),
      provider: searchParams.get('provider'),
      location: searchParams.get('location'),
      includeSavingsEstimate: searchParams.get('includeSavingsEstimate'),
    };

    const validatedParams = analysisQuerySchema.parse(queryParams);

    // Get bill negotiator
    const billNegotiator = getBillNegotiator();

    // Get savings estimate
    const savingsEstimate = validatedParams.includeSavingsEstimate
      ? await billNegotiator.calculatePotentialSavings(userId)
      : null;

    // Get market analysis if specific bill type and provider are provided
    let marketAnalysis = null;
    if (validatedParams.billType && validatedParams.provider) {
      marketAnalysis = await billNegotiator.analyzeMarketRates(
        validatedParams.billType,
        validatedParams.provider,
        validatedParams.location
      );
    }

    // Get negotiation history
    const history = await billNegotiator.getBillNegotiationHistory(userId);

    // Calculate success metrics
    const totalNegotiations = history.reduce((sum, h) => sum + h.attempts.length, 0);
    const successfulNegotiations = history.reduce(
      (sum, h) => sum + h.attempts.filter(a => a.outcome === 'success').length,
      0
    );
    const overallSuccessRate = totalNegotiations > 0 
      ? (successfulNegotiations / totalNegotiations) * 100 
      : 0;
    const totalHistoricalSavings = history.reduce((sum, h) => sum + h.totalSavings, 0);

    return finalizeResponse(
      NextResponse.json({
        success: true,
        data: {
          savingsEstimate: savingsEstimate ? {
            totalPotentialSavings: savingsEstimate.totalPotentialSavings,
            monthlyPotentialSavings: savingsEstimate.monthlyPotentialSavings,
            annualPotentialSavings: savingsEstimate.annualPotentialSavings,
            billCount: savingsEstimate.billCount,
            highPotentialBills: savingsEstimate.highPotentialBills.map(b => ({
              id: b.id,
              provider: b.provider,
              serviceName: b.serviceName,
              currentAmount: b.currentAmount,
              estimatedSavings: b.estimatedSavings,
              negotiationPotential: b.negotiationPotential,
              difficulty: b.difficulty,
            })),
            confidenceScore: savingsEstimate.confidenceScore,
          } : null,
          marketAnalysis,
          negotiationHistory: {
            totalNegotiations,
            successfulNegotiations,
            overallSuccessRate,
            totalHistoricalSavings,
            annualHistoricalSavings: totalHistoricalSavings * 12,
            recentAttempts: history.slice(0, 5).map(h => ({
              billId: h.billId,
              provider: h.provider,
              billType: h.billType,
              totalSavings: h.totalSavings,
              successRate: h.successRate,
              lastAttemptDate: h.lastAttemptDate,
            })),
          },
        },
        meta: {
          userId,
          filters: {
            billType: validatedParams.billType,
            provider: validatedParams.provider,
            location: validatedParams.location,
          },
          generatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      }),
      startTime
    );
  } catch (error) {
    console.error('Error in GET /api/financial/bills/analysis:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

