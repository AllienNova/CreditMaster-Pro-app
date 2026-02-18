/**
 * AI Financial Coach - Personalized Advice API
 *
 * POST /api/ai/financial-coach/advice - Get personalized financial advice
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { financialCoach } from "@/lib/ai/financial-coach";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AdviceRequestSchema = z.object({
  question: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .max(500, "Question must be less than 500 characters"),
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
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + 60000,
    });
    return true;
  }

  if (userLimit.count >= 10) {
    return false;
  }

  userLimit.count++;
  return true;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
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
          },
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = AdviceRequestSchema.safeParse(body);

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

    const { question } = validation.data;

    // Get personalized advice
    const advice = await financialCoach.getPersonalizedAdvice(
      user.id,
      question,
    );

    return NextResponse.json({
      success: true,
      data: {
        advice,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting personalized advice:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get personalized advice",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 },
    );
  }
}
