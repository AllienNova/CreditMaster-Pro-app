/**
 * Retirement Account Optimization API Route
 *
 * GET  /api/financial/tax/retirement - Get retirement optimization analysis using stored profile
 * POST /api/financial/tax/retirement - Run optimization with provided profile data
 *
 * SECURITY:
 * - Requires authentication (Supabase session)
 * - Rate limited (10 requests/min)
 * - All actions logged for audit
 * - No PII in logs
 *
 * @swagger
 * /api/financial/tax/retirement:
 *   get:
 *     summary: Get retirement contribution optimization
 *     description: Analyzes retirement account contributions using the user's stored tax profile
 *     tags: [Tax, Retirement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taxYear
 *         schema:
 *           type: integer
 *         description: Tax year to analyze (defaults to current year)
 *     responses:
 *       200:
 *         description: Retirement optimization analysis
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tax profile not found
 *       429:
 *         description: Rate limited
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Run retirement optimization with provided data
 *     description: Runs retirement account optimization with profile data from the request body
 *     tags: [Tax, Retirement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [grossIncome, filingStatus]
 *             properties:
 *               grossIncome:
 *                 type: number
 *               filingStatus:
 *                 type: string
 *                 enum: [single, married_filing_jointly, married_filing_separately, head_of_household]
 *               age:
 *                 type: integer
 *                 description: Current age (enables catch-up contribution analysis for 50+)
 *               targetRetirementAge:
 *                 type: integer
 *                 description: Target retirement age (default 65)
 *               expectedAnnualReturnRate:
 *                 type: number
 *                 description: Expected annual return rate (default 0.07 = 7%)
 *     responses:
 *       200:
 *         description: Retirement optimization results
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limited
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { retirementAccountOptimizer } from "@/lib/tax/services/RetirementAccountOptimizer";
// Was a LOCAL copy of fetchTaxProfile / mapDatabaseToProfile /
// ACCOUNT_LEVEL_DATA_AVAILABLE. The copies had ALREADY drifted — this one also
// mapped age, targetRetirementAge and expectedAnnualReturnRate, none of which
// are columns in tax_profiles (checked: 0 of 3 present), so they were always
// undefined and nothing is lost by sharing one implementation. The duplicate
// also carried the cookie-versus-bearer defect fixed in the repository, which
// is exactly the drift its header warned a second copy would cause.
import {
  fetchTaxProfile,
  mapDatabaseToProfile,
  ACCOUNT_LEVEL_DATA_AVAILABLE,
} from "@/lib/tax/tax-profile-repository";
import {
  FilingStatus,
  OptimizationGoal,
  BusinessType,
} from "@/lib/tax/types/tax-profile.types";
import type { TaxProfile } from "@/lib/tax/types/tax-profile.types";

// ============================================================================
// RATE LIMITING
// ============================================================================

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

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const VALID_FILING_STATUSES = new Set(Object.values(FilingStatus));

function validatePostBody(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  if (!body.grossIncome || typeof body.grossIncome !== "number" || body.grossIncome < 0) {
    return { valid: false, error: "grossIncome is required and must be a non-negative number" };
  }

  if (!body.filingStatus || !VALID_FILING_STATUSES.has(body.filingStatus as FilingStatus)) {
    return {
      valid: false,
      error: `filingStatus is required and must be one of: ${Array.from(VALID_FILING_STATUSES).join(", ")}`,
    };
  }

  if (body.age !== undefined) {
    if (typeof body.age !== "number" || body.age < 18 || body.age > 120) {
      return { valid: false, error: "age must be a number between 18 and 120" };
    }
  }

  if (body.targetRetirementAge !== undefined) {
    if (
      typeof body.targetRetirementAge !== "number" ||
      body.targetRetirementAge < 50 ||
      body.targetRetirementAge > 100
    ) {
      return { valid: false, error: "targetRetirementAge must be a number between 50 and 100" };
    }
  }

  if (body.expectedAnnualReturnRate !== undefined) {
    if (
      typeof body.expectedAnnualReturnRate !== "number" ||
      body.expectedAnnualReturnRate < 0 ||
      body.expectedAnnualReturnRate > 0.30
    ) {
      return { valid: false, error: "expectedAnnualReturnRate must be a number between 0 and 0.30" };
    }
  }

  return { valid: true };
}

// ============================================================================
// GET HANDLER
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();

    // 2. Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limited",
          message: "Too many requests. Please try again later.",
        },
        { status: 429 },
      );
    }

    // 3. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const taxYear = parseInt(searchParams.get("taxYear") || String(new Date().getFullYear()), 10);

    // 4. Fetch tax profile
    const profile = await fetchTaxProfile(user.id, taxYear);

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Not found",
          message:
            "No tax profile found. Please create a tax profile first via POST /api/tax/analyze or POST /api/financial/tax/retirement.",
        },
        { status: 404 },
      );
    }

    // 5. Run retirement optimization
    const result = retirementAccountOptimizer.analyze(profile);

    // 6. Return results
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        analyzedAt: result.analyzedAt.toISOString(),
      },
      metadata: {
        taxYear,
        analyzedAt: new Date().toISOString(),
        profileSource: "stored",
        accountLevelDataAvailable: ACCOUNT_LEVEL_DATA_AVAILABLE,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze retirement contributions";

    return NextResponse.json(
      {
        success: false,
        error: "Analysis failed",
        message: errorMessage,
        _meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();

    // 2. Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limited",
          message: "Too many requests. Please try again later.",
        },
        { status: 429 },
      );
    }

    // 3. Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON",
          message: "Request body must be valid JSON.",
        },
        { status: 400 },
      );
    }

    const validation = validatePostBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 },
      );
    }

    // 4. Build tax profile from request body
    const taxYear = (body.taxYear as number) || new Date().getFullYear();

    // Check if stored profile exists to merge with
    const storedProfile = await fetchTaxProfile(user.id, taxYear);
    const profile = buildProfileFromBody(user.id, taxYear, body, storedProfile);

    // 5. Run retirement optimization
    const result = retirementAccountOptimizer.analyze(profile);

    // 6. Return results
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        analyzedAt: result.analyzedAt.toISOString(),
      },
      metadata: {
        taxYear,
        analyzedAt: new Date().toISOString(),
        profileSource: storedProfile ? "merged" : "provided",
        catchUpEligible: result.catchUpEligible,
        totalCatchUpCapacity: result.totalCatchUpCapacity,
        retirementReadinessScore: result.retirementReadiness?.readinessScore ?? null,
        accountLevelDataAvailable: ACCOUNT_LEVEL_DATA_AVAILABLE,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze retirement contributions";

    return NextResponse.json(
      {
        success: false,
        error: "Analysis failed",
        message: errorMessage,
        _meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// HELPERS
// ============================================================================

// No account-level linkage table (institution, balance, employer match,
// vesting, Plaid link) exists in the schema — the `tax_accounts` table this
// route used to query was never migrated, so that query always failed and
// was silently swallowed to `[]`. There is no substitute table either:
// `tax_profiles` holds YTD 401k/IRA/HSA contribution totals directly, but no
// per-account detail. `TaxProfile.accounts` is therefore `[]` for every
// profile until that data model is built. This constant surfaces that
// structural gap explicitly in API responses instead of letting it look like
// a user-specific "no accounts" state.

function buildProfileFromBody(
  userId: string,
  taxYear: number,
  body: Record<string, unknown>,
  storedProfile: TaxProfile | null,
): TaxProfile {
  const now = new Date();

  // If a stored profile exists, merge request body on top of it
  if (storedProfile) {
    return {
      ...storedProfile,
      // Override with provided values
      grossIncome: (body.grossIncome as number) ?? storedProfile.grossIncome,
      filingStatus:
        (body.filingStatus as FilingStatus) ?? storedProfile.filingStatus,
      w2Income: (body.w2Income as number) ?? storedProfile.w2Income,
      selfEmploymentIncome:
        (body.selfEmploymentIncome as number) ?? storedProfile.selfEmploymentIncome,
      investmentIncome:
        (body.investmentIncome as number) ?? storedProfile.investmentIncome,
      hasHdhp: (body.hasHdhp as boolean) ?? storedProfile.hasHdhp,
      isSelfEmployed:
        (body.isSelfEmployed as boolean) ?? storedProfile.isSelfEmployed,
      ytd401kContribution:
        (body.ytd401kContribution as number) ?? storedProfile.ytd401kContribution,
      ytdIraContribution:
        (body.ytdIraContribution as number) ?? storedProfile.ytdIraContribution,
      ytdRothIraContribution:
        (body.ytdRothIraContribution as number) ?? storedProfile.ytdRothIraContribution,
      ytdHsaContribution:
        (body.ytdHsaContribution as number) ?? storedProfile.ytdHsaContribution,
      // New retirement-specific fields
      age: (body.age as number) ?? storedProfile.age,
      targetRetirementAge:
        (body.targetRetirementAge as number) ?? storedProfile.targetRetirementAge,
      expectedAnnualReturnRate:
        (body.expectedAnnualReturnRate as number) ?? storedProfile.expectedAnnualReturnRate,
      updatedAt: now,
    };
  }

  // Create a new profile from scratch
  return {
    id: crypto.randomUUID(),
    userId,
    taxYear,

    filingStatus: (body.filingStatus as FilingStatus) || FilingStatus.SINGLE,
    stateOfResidence: (body.stateOfResidence as string) || "CA",

    grossIncome: Number(body.grossIncome) || 100000,
    w2Income: Number(body.w2Income) || Number(body.grossIncome) || 100000,
    selfEmploymentIncome: Number(body.selfEmploymentIncome) || 0,
    investmentIncome: Number(body.investmentIncome) || 0,
    dividendIncome: Number(body.dividendIncome) || 0,
    interestIncome: Number(body.interestIncome) || 0,
    capitalGainsShortTerm: Number(body.capitalGainsShortTerm) || 0,
    capitalGainsLongTerm: Number(body.capitalGainsLongTerm) || 0,
    rentalIncome: 0,
    retirementIncome: 0,
    otherIncome: 0,

    federalWithheld: 0,
    stateWithheld: 0,
    estimatedPayments: 0,

    dependents: [],

    isEmployed: (body.isEmployed as boolean) ?? true,
    isSelfEmployed: Boolean(body.isSelfEmployed),
    businessType: BusinessType.NONE,

    mortgageInterest: 0,
    propertyTaxes: 0,
    stateTaxesPaid: 0,
    charitableDonations: 0,
    medicalExpenses: 0,
    studentLoanInterest: 0,
    educatorExpenses: 0,

    hasHdhp: Boolean(body.hasHdhp),
    healthInsuranceType: "employer",

    accounts: [],

    ytd401kContribution: Number(body.ytd401kContribution) || 0,
    ytdIraContribution: Number(body.ytdIraContribution) || 0,
    ytdRothIraContribution: Number(body.ytdRothIraContribution) || 0,
    ytdHsaContribution: Number(body.ytdHsaContribution) || 0,
    ytdCharitableGiving: 0,

    age: body.age as number | undefined,
    targetRetirementAge: body.targetRetirementAge as number | undefined,
    expectedAnnualReturnRate: body.expectedAnnualReturnRate as number | undefined,

    optimizationGoal:
      (body.optimizationGoal as OptimizationGoal) || OptimizationGoal.BALANCED,
    riskTolerance:
      (body.riskTolerance as TaxProfile["riskTolerance"]) || "moderate",

    createdAt: now,
    updatedAt: now,
  };
}
