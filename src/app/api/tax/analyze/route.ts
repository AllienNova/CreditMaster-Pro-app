/**
 * Tax Analysis API Route
 *
 * POST /api/tax/analyze
 * Runs comprehensive tax optimization analysis for the authenticated user.
 *
 * SECURITY:
 * - Requires authentication
 * - Rate limited
 * - All actions logged for audit
 * - No PII in logs
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import { taxOptimizationEngine } from "@/lib/tax";
import {
  FilingStatus,
  OptimizationGoal,
  BusinessType,
} from "@/lib/tax/types/tax-profile.types";
import type { TaxProfile } from "@/lib/tax/types/tax-profile.types";
import {
  fetchTaxProfile,
  createDefaultProfile,
  ACCOUNT_LEVEL_DATA_AVAILABLE,
} from "@/lib/tax/tax-profile-repository";

// Rate limiting (simple in-memory for demo; use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();

    // 2. Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          error: "Rate limited",
          message: "Too many requests. Please try again later.",
        },
        { status: 429 },
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const taxYear = body.taxYear || new Date().getFullYear();

    // 4. Fetch or create tax profile
    let profile = await fetchTaxProfile(supabase, user.id, taxYear);

    if (!profile) {
      // Create a basic profile if none exists
      profile = createDefaultProfile(user.id, taxYear, body);
    } else if (body.updates) {
      // Merge any updates from the request
      profile = { ...profile, ...body.updates };
    }

    // 5. Run tax optimization analysis
    const result = await taxOptimizationEngine.analyzeAndRecommend(
      user.id,
      profile!,
    );

    // 6. Return results with disclaimers
    return NextResponse.json({
      success: true,
      data: result,
      disclaimers: taxOptimizationEngine.getDisclaimers(),
      metadata: {
        taxYear,
        analyzedAt: new Date().toISOString(),
        profileComplete: Boolean(profile?.accounts?.length),
        accountLevelDataAvailable: ACCOUNT_LEVEL_DATA_AVAILABLE,
      },
    });
  } catch (error) {
    console.error("Tax analysis error:", error);
    return NextResponse.json(
      {
        error: "Analysis failed",
        message: "Unable to complete tax analysis. Please try again.",
      },
      { status: 500 },
    );
  }
});

