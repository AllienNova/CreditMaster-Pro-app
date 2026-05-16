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
  TaxAccountType,
} from "@/lib/tax/types/tax-profile.types";
import type { TaxProfile } from "@/lib/tax/types/tax-profile.types";

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

function createDefaultProfile(
  userId: string,
  taxYear: number,
  body: Record<string, unknown>,
): TaxProfile {
  const now = new Date();

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

    isEmployed: true,
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

    optimizationGoal: OptimizationGoal.BALANCED,
    riskTolerance: "moderate",

    createdAt: now,
    updatedAt: now,
  };
}
