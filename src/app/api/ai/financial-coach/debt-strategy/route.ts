/**
 * AI Financial Coach - Debt Strategy Optimizer API
 *
 * POST /api/ai/financial-coach/debt-strategy - Calculate and compare debt payoff strategies
 *
 * Provides comprehensive debt payoff strategy analysis including:
 * - Debt Snowball (smallest balance first)
 * - Debt Avalanche (highest interest first)
 * - AI-Optimized Hybrid (behavioral + mathematical)
 * - Strategy comparison with savings and timeline analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { debtStrategyOptimizer } from "@/lib/financial/debt-strategy-optimizer";
import { financialContextEngine } from "@/lib/financial/financial-context-engine";
import type { DebtComparison } from "@/lib/financial/types/debt-strategy.types";
import type { Debt } from "@/lib/financial/types/debt-payoff.types";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const DebtItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Debt name is required"),
  balance: z.number().positive("Balance must be positive"),
  interestRate: z
    .number()
    .min(0, "Interest rate cannot be negative")
    .max(100, "Interest rate cannot exceed 100%"),
  minimumPayment: z.number().positive("Minimum payment must be positive"),
  type: z
    .enum([
      "credit_card",
      "student_loan",
      "mortgage",
      "auto_loan",
      "personal_loan",
      "other",
    ])
    .optional(),
});

const DebtStrategyRequestSchema = z.object({
  debts: z.array(DebtItemSchema).min(1, "At least one debt is required"),
  extraPayment: z
    .number()
    .min(0, "Extra payment cannot be negative")
    .default(0),
  includeAIOptimization: z.boolean().optional().default(true),
});

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset rate limit (5 requests per minute)
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + 60000, // 1 minute
    });
    return true;
  }

  if (userLimit.count >= 5) {
    return false;
  }

  userLimit.count++;
  return true;
}

// ============================================================================
// RESPONSE CACHING
// ============================================================================

interface CachedResponse {
  data: DebtComparison;
  expiresAt: number;
}

const responseCache = new Map<string, CachedResponse>();

function getCachedResponse(cacheKey: string): DebtComparison | null {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    responseCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function setCachedResponse(
  cacheKey: string,
  data: DebtComparison,
  ttlMs: number = 300000,
): void {
  responseCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

interface DebtInput {
  id: string;
  balance: number;
  interestRate: number;
}

function generateCacheKey(
  userId: string,
  debts: DebtInput[],
  extraPayment: number,
): string {
  const debtHash = debts
    .map((d) => `${d.id}:${d.balance}:${d.interestRate}`)
    .sort()
    .join("|");
  return `debt-strategy:${userId}:${debtHash}:${extraPayment}`;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 },
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again in a minute.",
            retryAfter: 60,
          },
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = DebtStrategyRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid request parameters",
            details: validation.error.errors,
          },
        },
        { status: 400 },
      );
    }

    const { debts, extraPayment, includeAIOptimization } = validation.data;

    // Check cache
    const cacheKey = generateCacheKey(user.id, debts, extraPayment);
    const cachedResult = getCachedResponse(cacheKey);

    if (cachedResult) {
      const responseTime = Date.now() - startTime;
      return NextResponse.json(
        {
          success: true,
          data: cachedResult,
          _meta: {
            cached: true,
            responseTime,
            timestamp: new Date().toISOString(),
          },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
          },
        },
      );
    }

    // Get financial context for AI optimization
    let financialContext;
    if (includeAIOptimization) {
      try {
        financialContext = await financialContextEngine.getFinancialContext(
          user.id,
        );
      } catch (_ctxError) {
        // DebtStrategyRoute: Proceeding without AI optimization
        void _ctxError;
      }
    }

    // Calculate strategies
    // Zod-validated debts lack some Debt fields (userId, originalBalance, etc.)
    // but the optimizer only reads id, name, balance, interestRate, minimumPayment
    const typedDebts = debts as unknown as Debt[];
    const snowball = debtStrategyOptimizer.calculateSnowball(
      typedDebts,
      extraPayment,
    );
    const avalanche = debtStrategyOptimizer.calculateAvalanche(
      typedDebts,
      extraPayment,
    );

    let comparison;
    if (includeAIOptimization && financialContext) {
      // Full comparison with AI optimization
      comparison = await debtStrategyOptimizer.compareStrategies(
        typedDebts,
        extraPayment,
        financialContext,
      );
    } else {
      // Basic comparison without AI
      comparison = {
        userId: user.id,
        generatedAt: new Date(),
        strategies: [snowball, avalanche],
        recommendation:
          avalanche.totalInterestPaid < snowball.totalInterestPaid
            ? "avalanche"
            : "snowball",
        reasonForRecommendation:
          avalanche.totalInterestPaid < snowball.totalInterestPaid
            ? "Avalanche method saves more on interest"
            : "Snowball method provides faster psychological wins",
        potentialSavings: {
          snowballVsAvalanche:
            snowball.totalInterestPaid - avalanche.totalInterestPaid,
          aiOptimizedVsSnowball: 0,
          aiOptimizedVsAvalanche: 0,
          bestVsWorst: Math.abs(
            snowball.totalInterestPaid - avalanche.totalInterestPaid,
          ),
        },
        timelineDifferences: {
          snowballVsAvalanche: snowball.totalMonths - avalanche.totalMonths,
          aiOptimizedVsSnowball: 0,
          aiOptimizedVsAvalanche: 0,
          bestVsWorst: Math.abs(snowball.totalMonths - avalanche.totalMonths),
        },
        insights: [
          `Total debt: $${debts.reduce((sum, d) => sum + d.balance, 0).toFixed(2)}`,
          `Average interest rate: ${(debts.reduce((sum, d) => sum + d.interestRate * d.balance, 0) / debts.reduce((sum, d) => sum + d.balance, 0)).toFixed(2)}%`,
        ],
        warnings: [],
      };
    }

    // Cache the result (5 minutes)
    setCachedResponse(cacheKey, comparison as DebtComparison, 300000);

    const responseTime = Date.now() - startTime;

    // Return response with caching headers
    return NextResponse.json(
      {
        success: true,
        data: comparison,
        _meta: {
          cached: false,
          responseTime,
          timestamp: new Date().toISOString(),
          strategiesCalculated: comparison.strategies.length,
          aiOptimizationUsed: includeAIOptimization && !!financialContext,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
        },
      },
    );
  } catch (_error) {
    // DebtStrategyRoute error: Calculation failed

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to calculate debt strategy",
          details: _error instanceof Error ? _error.message : "Unknown error",
        },
        _meta: {
          responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
