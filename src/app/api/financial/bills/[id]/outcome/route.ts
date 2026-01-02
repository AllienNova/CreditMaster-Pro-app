/**
 * Bill Negotiation Outcome Tracking API
 * POST /api/financial/bills/[id]/outcome - Record negotiation result
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

const recordOutcomeSchema = z.object({
  success: z.boolean(),
  savingsAchieved: z.number().min(0),
  newMonthlyRate: z.number().positive().optional(),
  previousMonthlyRate: z.number().positive(),
  method: z.enum(['phone', 'chat', 'email', 'in_person']),
  duration: z.number().int().positive().optional(), // minutes
  representative: z.string().optional(),
  notes: z.string().max(1000).optional(),
  requiresFollowup: z.boolean().default(false),
  followupDate: z.string().datetime().optional(),
  followupReason: z.string().max(500).optional(),
});

// ============================================================================
// POST /api/financial/bills/[id]/outcome
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const billId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = recordOutcomeSchema.parse(body);

    // Validate followup requirements
    if (validatedBody.requiresFollowup && !validatedBody.followupDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'followupDate is required when requiresFollowup is true',
        },
        { status: 400 }
      );
    }

    // Get bill negotiator
    const billNegotiator = getBillNegotiator();

    // Track the outcome
    await billNegotiator.trackNegotiationOutcome(billId, {
      billId,
      userId,
      negotiationDate: new Date(),
      success: validatedBody.success,
      savingsAchieved: validatedBody.savingsAchieved,
      newMonthlyRate: validatedBody.newMonthlyRate,
      previousMonthlyRate: validatedBody.previousMonthlyRate,
      method: validatedBody.method,
      duration: validatedBody.duration,
      representative: validatedBody.representative,
      notes: validatedBody.notes,
      requiresFollowup: validatedBody.requiresFollowup,
      followupDate: validatedBody.followupDate ? new Date(validatedBody.followupDate) : undefined,
      followupReason: validatedBody.followupReason,
      recordedAt: new Date(),
    });

    // Calculate updated savings estimate
    const savingsEstimate = await billNegotiator.calculatePotentialSavings(userId);

    return finalizeResponse(
      NextResponse.json({
        success: true,
        data: {
          outcome: {
            billId,
            success: validatedBody.success,
            savingsAchieved: validatedBody.savingsAchieved,
            annualSavings: validatedBody.savingsAchieved * 12,
            method: validatedBody.method,
            requiresFollowup: validatedBody.requiresFollowup,
            followupDate: validatedBody.followupDate,
          },
          updatedSavingsEstimate: {
            totalPotentialSavings: savingsEstimate.totalPotentialSavings,
            monthlyPotentialSavings: savingsEstimate.monthlyPotentialSavings,
            annualPotentialSavings: savingsEstimate.annualPotentialSavings,
          },
        },
        meta: {
          userId,
          billId,
          recordedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      }),
      startTime
    );
  } catch (error) {
    console.error('Error in POST /api/financial/bills/[id]/outcome:', error);

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

