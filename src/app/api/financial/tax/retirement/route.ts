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
import { retirementAccountOptimizer } from "@/lib/tax/services/RetirementAccountOptimizer";
import {
  FilingStatus,
  OptimizationGoal,
  BusinessType,
  TaxAccountType,
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

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Please sign in to access retirement optimization.",
        },
        { status: 401 },
      );
    }

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
    const profile = await fetchTaxProfile(supabase, user.id, taxYear);

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
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Please sign in to access retirement optimization.",
        },
        { status: 401 },
      );
    }

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
    const storedProfile = await fetchTaxProfile(supabase, user.id, taxYear);
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
}

// ============================================================================
// HELPERS
// ============================================================================

async function fetchTaxProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taxYear: number,
): Promise<TaxProfile | null> {
  const { data, error } = await supabase
    .from("tax_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("tax_year", taxYear)
    .single();

  if (error || !data) {
    return null;
  }

  // Fetch associated accounts
  const { data: accounts } = await supabase
    .from("tax_accounts")
    .select("*")
    .eq("user_id", userId);

  return mapDatabaseToProfile(data, accounts || []);
}

function mapDatabaseToProfile(
  dbProfile: Record<string, unknown>,
  dbAccounts: Record<string, unknown>[],
): TaxProfile {
  return {
    id: dbProfile.id as string,
    userId: dbProfile.user_id as string,
    taxYear: dbProfile.tax_year as number,

    filingStatus:
      (dbProfile.filing_status as FilingStatus) || FilingStatus.SINGLE,
    stateOfResidence: (dbProfile.state_of_residence as string) || "CA",

    grossIncome: Number(dbProfile.gross_income) || 0,
    w2Income: Number(dbProfile.w2_income) || 0,
    selfEmploymentIncome: Number(dbProfile.self_employment_income) || 0,
    investmentIncome: Number(dbProfile.investment_income) || 0,
    dividendIncome: Number(dbProfile.dividend_income) || 0,
    interestIncome: Number(dbProfile.interest_income) || 0,
    capitalGainsShortTerm: Number(dbProfile.capital_gains_short_term) || 0,
    capitalGainsLongTerm: Number(dbProfile.capital_gains_long_term) || 0,
    rentalIncome: Number(dbProfile.rental_income) || 0,
    retirementIncome: Number(dbProfile.retirement_income) || 0,
    otherIncome: Number(dbProfile.other_income) || 0,

    federalWithheld: Number(dbProfile.federal_withheld) || 0,
    stateWithheld: Number(dbProfile.state_withheld) || 0,
    estimatedPayments: Number(dbProfile.estimated_payments) || 0,

    dependents: (dbProfile.dependents_data as TaxProfile["dependents"]) || [],

    isEmployed: (dbProfile.is_employed as boolean) ?? true,
    isSelfEmployed: (dbProfile.is_self_employed as boolean) ?? false,
    businessType:
      (dbProfile.business_type as BusinessType) || BusinessType.NONE,
    homeOfficeSqft: dbProfile.home_office_sqft as number,
    totalHomeSqft: dbProfile.total_home_sqft as number,

    mortgageInterest: Number(dbProfile.mortgage_interest) || 0,
    propertyTaxes: Number(dbProfile.property_taxes) || 0,
    stateTaxesPaid: Number(dbProfile.state_taxes_paid) || 0,
    charitableDonations: Number(dbProfile.charitable_donations) || 0,
    medicalExpenses: Number(dbProfile.medical_expenses) || 0,
    studentLoanInterest: Number(dbProfile.student_loan_interest) || 0,
    educatorExpenses: Number(dbProfile.educator_expenses) || 0,

    hasHdhp: (dbProfile.has_hdhp as boolean) ?? false,
    healthInsuranceType:
      (dbProfile.health_insurance_type as TaxProfile["healthInsuranceType"]) ||
      "employer",

    accounts: dbAccounts.map((acc) => ({
      id: acc.id as string,
      userId: acc.user_id as string,
      accountType: acc.account_type as TaxAccountType,
      institutionName: acc.institution_name as string,
      accountName: acc.account_name as string,
      currentBalance: Number(acc.current_balance) || 0,
      ytdContribution: Number(acc.ytd_contribution) || 0,
      contributionLimit: Number(acc.contribution_limit) || 0,
      employerMatch: Number(acc.employer_match) || 0,
      employerMatchPercent: Number(acc.employer_match_percent),
      vestingPercent: Number(acc.vesting_percent) || 100,
      isLinked: (acc.is_linked as boolean) ?? false,
      plaidAccountId: acc.plaid_account_id as string,
      createdAt: new Date(acc.created_at as string),
      updatedAt: new Date(acc.updated_at as string),
    })),

    ytd401kContribution: Number(dbProfile.ytd_401k_contribution) || 0,
    ytdIraContribution: Number(dbProfile.ytd_ira_contribution) || 0,
    ytdRothIraContribution: Number(dbProfile.ytd_roth_ira_contribution) || 0,
    ytdHsaContribution: Number(dbProfile.ytd_hsa_contribution) || 0,
    ytdCharitableGiving: Number(dbProfile.ytd_charitable_giving) || 0,

    age: dbProfile.age as number | undefined,
    targetRetirementAge: dbProfile.target_retirement_age as number | undefined,
    expectedAnnualReturnRate: dbProfile.expected_annual_return_rate as number | undefined,

    optimizationGoal:
      (dbProfile.optimization_goal as OptimizationGoal) ||
      OptimizationGoal.BALANCED,
    riskTolerance:
      (dbProfile.risk_tolerance as TaxProfile["riskTolerance"]) || "moderate",

    createdAt: new Date(dbProfile.created_at as string),
    updatedAt: new Date(dbProfile.updated_at as string),
    lastAnalyzedAt: dbProfile.last_analyzed_at
      ? new Date(dbProfile.last_analyzed_at as string)
      : undefined,
  };
}

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
