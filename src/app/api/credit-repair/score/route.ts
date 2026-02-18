/**
 * Credit Repair Score API Route
 *
 * GET /api/credit-repair/score - Get credit repair score
 * POST /api/credit-repair/score - Save credit repair score
 *
 * Features:
 * - Full database integration
 * - Authentication required
 * - Input validation
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { creditRepairService } from "@/lib/credit-repair";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";

const toFactorRecord = (
  factors: Array<{ category: string; currentScore: number }>,
): Record<string, number> =>
  factors.reduce<Record<string, number>>((acc, factor) => {
    acc[factor.category] = factor.currentScore;
    return acc;
  }, {});

/**
 * GET /api/credit-repair/score
 * Get credit repair score from database or calculate new one
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;

    // 2. Try to get score from database first
    let score = await db.creditRepair.getCreditRepairScore(user.id);

    // 3. If no score exists, calculate new one
    if (!score) {
      const calculatedScore = await creditRepairService.getCreditRepairScore(
        user.id,
      );

      // Save to database
      score = await db.creditRepair.saveCreditRepairScore({
        userId: user.id,
        score: calculatedScore.score,
        factors: toFactorRecord(calculatedScore.factors),
        opportunities: calculatedScore.opportunities,
        estimatedImpact: calculatedScore.estimatedImpact,
        timeline: calculatedScore.timeline,
      });
    }

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "get_credit_repair_score",
      input: { userId: user.id },
      output: { score: score.score },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: score,
    });
  } catch (error) {
    // CreditRepairScoreAPI error: Error getting credit repair score

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: "api_error",
        message: `Failed to get credit repair score: ${(error as Error).message}`,
        severity: "medium",
      });
    } catch {
      // CreditRepairScoreAPI error: Failed to log audit event
    }

    return NextResponse.json(
      { error: "Failed to get credit repair score" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/credit-repair/score
 * Calculate and save new credit repair score
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;

    // 2. Calculate new score
    const calculatedScore = await creditRepairService.getCreditRepairScore(
      user.id,
    );

    // 3. Save to database
    const score = await db.creditRepair.saveCreditRepairScore({
      userId: user.id,
      score: calculatedScore.score,
      factors: toFactorRecord(calculatedScore.factors),
      opportunities: calculatedScore.opportunities,
      estimatedImpact: calculatedScore.estimatedImpact,
      timeline: calculatedScore.timeline,
    });

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: "calculate_credit_repair_score",
      input: { userId: user.id },
      output: { score: score.score },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: score,
    });
  } catch (error) {
    // CreditRepairScoreAPI error: Error calculating credit repair score

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: "api_error",
        message: `Failed to calculate credit repair score: ${(error as Error).message}`,
        severity: "medium",
      });
    } catch {
      // CreditRepairScoreAPI error: Failed to log audit event
    }

    return NextResponse.json(
      { error: "Failed to calculate credit repair score" },
      { status: 500 },
    );
  }
}
