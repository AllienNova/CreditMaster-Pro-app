/**
 * MoneyLion Affiliate Engine Types
 *
 * Type definitions for the MoneyLion product marketplace integration.
 */

// =============================================================================
// Product Categories & Core Types
// =============================================================================

export type MoneyLionProductCategory =
  | "credit_card"
  | "personal_loan"
  | "auto_loan"
  | "mortgage"
  | "student_loan"
  | "insurance"
  | "savings"
  | "checking"
  | "investment";

export interface MoneyLionProduct {
  productId: string;
  name: string;
  category: MoneyLionProductCategory;
  partner: string;
  description: string;
  terms: MoneyLionProductTerms;
  eligibility: MoneyLionEligibility;
  commission: MoneyLionCommission;
  clickUrl: string;
  logoUrl: string;
  featured: boolean;
  active: boolean;
}

export interface MoneyLionProductTerms {
  apr?: { min: number; max: number; type: "fixed" | "variable" };
  annualFee?: number;
  creditLimit?: { min: number; max: number };
  loanAmount?: { min: number; max: number };
  term?: { min: number; max: number; unit: "months" | "years" };
  rewards?: string;
  signupBonus?: string;
}

export interface MoneyLionEligibility {
  minCreditScore?: number;
  maxCreditScore?: number;
  minIncome?: number;
  allowedStates?: string[];
  blockedStates?: string[];
  minAge?: number;
}

export interface MoneyLionCommission {
  type: "cpa" | "cpl" | "revenue_share" | "hybrid";
  amount: number;
  currency: string;
}

// =============================================================================
// User Profile & Matching
// =============================================================================

export interface UserMatchProfile {
  userId: string;
  creditScore?: number;
  annualIncome?: number;
  monthlyIncome?: number;
  age?: number;
  state?: string;
  zipCode?: string;
  employmentStatus?:
    | "employed"
    | "self_employed"
    | "unemployed"
    | "retired"
    | "student";
  housingStatus?: "own" | "rent" | "other";
  preferences?: {
    categories?: MoneyLionProductCategory[];
    prioritize?:
      | "rewards"
      | "low_apr"
      | "cashback"
      | "no_fee"
      | "approval_odds";
  };
}

export interface ProductMatch {
  product: MoneyLionProduct;
  matchScore: number;
  eligible: boolean;
  eligibilityReasons: string[];
  highlights: string[];
  estimatedApprovalOdds?: "high" | "medium" | "low";
}

export interface MatchOptions {
  limit?: number;
  categories?: MoneyLionProductCategory[];
  minScore?: number;
  includeIneligible?: boolean;
}

// =============================================================================
// Click Tracking & Conversions
// =============================================================================

export interface ClickEvent {
  clickId: string;
  userId: string;
  productId: string;
  partnerId: string;
  timestamp: Date;
  referrerUrl?: string;
  metadata?: Record<string, string>;
}

export interface PreQualResult {
  userId: string;
  productId: string;
  qualified: boolean;
  offeredTerms?: Partial<MoneyLionProductTerms>;
  expiresAt: Date;
}

// =============================================================================
// Cache
// =============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// =============================================================================
// API Error
// =============================================================================

export interface MoneyLionApiError {
  status: number;
  message: string;
  code?: string;
  retryable: boolean;
}
