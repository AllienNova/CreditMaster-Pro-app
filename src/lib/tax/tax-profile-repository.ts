/**
 * Shared tax-profile loading for the /api/tax/* routes.
 *
 * Extracted from /api/tax/analyze when /api/tax/recommendations needed the same
 * profile. Two copies of "how do we turn a tax_profiles row into a TaxProfile"
 * is two places for the mapping to drift, and a drifted tax profile produces a
 * plausible wrong number rather than an error.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FilingStatus,
  OptimizationGoal,
  BusinessType,
} from "@/lib/tax/types/tax-profile.types";
import type { TaxProfile } from "@/lib/tax/types/tax-profile.types";

// No account-level linkage table (institution, balance, employer match,
// vesting, Plaid link) exists in the schema — the `tax_accounts` table this
// route used to query was never migrated, so that query always failed and
// was silently swallowed to `[]`. There is no substitute table either:
// `tax_profiles` holds YTD 401k/IRA/HSA contribution totals directly, but no
// per-account detail. `TaxProfile.accounts` is therefore `[]` for every
// profile until that data model is built. This constant surfaces that
// structural gap explicitly in API responses instead of letting it look like
// a user-specific "no accounts" state.
export const ACCOUNT_LEVEL_DATA_AVAILABLE = false;

export async function fetchTaxProfile(
  // Typed as the generic client rather than the route's createClient return,
  // so this module does not depend on which Supabase factory the caller used.
  supabase: SupabaseClient,
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

  return mapDatabaseToProfile(data);
}

export function mapDatabaseToProfile(dbProfile: Record<string, unknown>): TaxProfile {
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

    // See ACCOUNT_LEVEL_DATA_AVAILABLE above — no account-level data source
    // exists, so this is always empty rather than fabricated.
    accounts: [],

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

export function createDefaultProfile(
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
