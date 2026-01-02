/**
 * AI Financial Coach - Action Plan API
 *
 * POST /api/ai/financial-coach/plan - Generate personalized action plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { financialCoach } from '@/lib/ai/financial-coach';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PlanRequestSchema = z.object({
  goals: z.array(z.string()).min(1, 'At least one goal is required').max(5, 'Maximum 5 goals allowed'),
  timeframe: z.enum(['short_term', 'medium_term', 'long_term']).default('medium_term'),
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
    const validation = PlanRequestSchema.safeParse(body);

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

    const { goals, timeframe } = validation.data;

    // Map timeframe to readable string
    const timeframeMap = {
      short_term: '0-1 year',
      medium_term: '1-5 years',
      long_term: '5+ years',
    };

    // Generate action plan
    const plan = await financialCoach.generateActionPlan(
      user.id,
      goals,
      timeframeMap[timeframe]
    );

    return NextResponse.json({
      success: true,
      data: {
        plan,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating action plan:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate action plan',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

