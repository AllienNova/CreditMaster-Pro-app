/**
 * Spending Anomalies API Endpoint
 *
 * GET /api/financial/spending/anomalies
 * Detect unusual spending behavior and anomalies
 *
 * Phase 2.3: Spending Intelligence
 */

import { NextRequest, NextResponse } from "next/server";
import { getSpendingAnalyzer } from "@/lib/financial/spending-analyzer";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const AnomaliesQuerySchema = z.object({
  sensitivity: z.enum(["low", "medium", "high"]).optional().default("medium"),
  timeframe: z.coerce.number().min(7).max(365).optional().default(30),
});

// ============================================================================
// GET - Detect Spending Anomalies
// ============================================================================

/**
 * @swagger
 * /api/financial/spending/anomalies:
 *   get:
 *     summary: Detect spending anomalies
 *     description: Detect unusual spending behavior using z-score, IQR, and AI-powered anomaly detection
 *     tags: [Spending Intelligence]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sensitivity
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *         description: Detection sensitivity level
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: integer
 *           minimum: 7
 *           maximum: 365
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Anomalies detected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Detected anomalies with severity levels and action recommendations
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  // Apply middleware (rate limiting, CORS, logging). Auth is enforced by withAuth.
  const middleware = await applyFinancialAPIMiddleware(request, {
    requireAuth: true,
    rateLimit: true,
    cors: true,
    logging: true,
  });

  if (middleware.error) {
    return middleware.error;
  }

  const { userId, startTime: middlewareStartTime } = middleware;

  try {
    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      sensitivity: searchParams.get("sensitivity") || "medium",
      timeframe: searchParams.get("timeframe") || "30",
    };

    const validatedParams = AnomaliesQuerySchema.parse(queryParams);

    // Get spending analyzer
    const analyzer = getSpendingAnalyzer();

    // Detect anomalies
    const result = await analyzer.detectAnomalies(
      userId!,
      validatedParams.sensitivity as "low" | "medium" | "high",
      validatedParams.timeframe,
    );

    return finalizeResponse(
      request,
      NextResponse.json({
        success: true,
        data: result,
        meta: {
          userId,
          sensitivity: validatedParams.sensitivity,
          timeframe: validatedParams.timeframe,
          anomaliesDetected: result.anomalies.length,
          requiresAction: result.summary.requiresImmediateAction,
          generatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - middlewareStartTime,
        },
      }),
      middlewareStartTime,
      userId,
    );
  } catch (error) {
    console.error("Error detecting spending anomalies:", error);

    return finalizeResponse(
      request,
      NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to detect spending anomalies",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        },
        { status: 500 },
      ),
      middlewareStartTime,
      userId,
    );
  }
},
);
