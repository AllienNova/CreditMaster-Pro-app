/**
 * AI Financial Coach - Analysis API
 *
 * POST /api/ai/financial-coach/analyze - Analyze user's financial situation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { financialCoach } from '@/lib/ai/financial-coach';
import { FocusArea } from '@/lib/ai/types/financial-coach.types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AnalyzeRequestSchema = z.object({
  focusArea: z.enum([
    'debt_elimination',
    'emergency_fund',
    'budgeting',
    'savings',
    'investment',
    'retirement',
    'income_increase',
    'expense_reduction',
    'overall',
  ]).optional().default('overall'),
});

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
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
    // Reset rate limit (10 requests per minute)
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + 60000, // 1 minute
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
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again in a minute.',
          },
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = AnalyzeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request parameters',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { focusArea } = validation.data;

    // Analyze financial situation
    const analysis = await financialCoach.analyzeFinancialSituation(
      user.id,
      focusArea as any
    );

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error analyzing financial situation:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to analyze financial situation',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

