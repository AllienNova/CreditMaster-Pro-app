/**
 * Offer System Types
 *
 * Type definitions for financial product offers and disclosures.
 */

// =============================================================================
// Offer Types
// =============================================================================

export type OfferCategory =
  | 'credit_card'
  | 'personal_loan'
  | 'mortgage'
  | 'student_loan'
  | 'auto_loan'
  | 'insurance'
  | 'investment'
  | 'savings'
  | 'checking'
  | 'debt_consolidation';

export type OfferStatus = 'active' | 'paused' | 'expired' | 'archived';

export type EligibilityResult = 'eligible' | 'ineligible' | 'needs_review';

export interface Offer {
  id: string;
  partnerId: string;
  partnerName: string;
  category: OfferCategory;
  name: string;
  headline: string;
  description: string;
  imageUrl?: string;
  destinationUrl: string;

  // Financial terms
  apr?: AprInfo;
  fees?: FeeInfo;
  rewards?: RewardInfo;
  creditLimit?: CreditLimitInfo;
  loanAmount?: LoanAmountInfo;

  // Eligibility
  minCreditScore?: number;
  maxCreditScore?: number;
  minIncome?: number;
  residencyRequirements?: string[];
  ageRequirement?: { min: number; max?: number };

  // Tracking
  affiliateOfferId?: string;
  commissionType: 'cpa' | 'cpl' | 'revenue_share';
  commissionValue: number;

  // Display
  rank: number;
  featured: boolean;
  badge?: string;
  tags?: string[];

  // Compliance
  disclosureId: string;
  legalDisclaimer?: string;
  sponsoredContent: boolean;

  // Status
  status: OfferStatus;
  startDate?: Date;
  endDate?: Date;
  regions: string[];

  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AprInfo {
  type: 'fixed' | 'variable';
  min: number;
  max?: number;
  introRate?: number;
  introPeriodMonths?: number;
}

export interface FeeInfo {
  annual?: number;
  monthlyMaintenance?: number;
  originationPercent?: number;
  originationFixed?: number;
  latePayment?: number;
  balanceTransfer?: number;
  foreignTransaction?: number;
  noFees?: boolean;
}

export interface RewardInfo {
  type: 'cashback' | 'points' | 'miles' | 'none';
  earnRate: number; // Percentage or points per dollar
  signupBonus?: number;
  signupBonusSpend?: number;
  signupBonusPeriodMonths?: number;
  categories?: Array<{
    category: string;
    rate: number;
  }>;
}

export interface CreditLimitInfo {
  min?: number;
  max?: number;
  typical?: number;
  prequalification: boolean;
}

export interface LoanAmountInfo {
  min: number;
  max: number;
  termMonths: number[];
}

// =============================================================================
// Disclosure Types
// =============================================================================

export type DisclosureType =
  | 'advertiser_disclosure'
  | 'affiliate_disclosure'
  | 'rate_disclosure'
  | 'terms_conditions'
  | 'privacy_policy'
  | 'fcra_disclosure'
  | 'ecoa_disclosure'
  | 'tila_disclosure';

export interface Disclosure {
  id: string;
  type: DisclosureType;
  title: string;
  shortText: string;
  fullText: string;
  version: string;
  effectiveDate: Date;
  isActive: boolean;
  regions: string[];
  categories?: OfferCategory[];
  partnerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferDisclosure {
  offerId: string;
  disclosureId: string;
  disclosureType: DisclosureType;
  shortText: string;
  fullText: string;
  mustDisplay: boolean;
  displayLocation: 'top' | 'bottom' | 'inline' | 'modal';
}

// =============================================================================
// Matching Types
// =============================================================================

export interface UserProfile {
  creditScore?: number;
  income?: number;
  age?: number;
  residency?: string;
  existingProducts?: string[];
  preferences?: {
    rewardsType?: 'cashback' | 'points' | 'miles';
    noAnnualFee?: boolean;
    lowApr?: boolean;
    signupBonus?: boolean;
  };
}

export interface MatchResult {
  offer: Offer;
  matchScore: number; // 0-100
  eligibility: EligibilityResult;
  eligibilityReasons: string[];
  highlights: string[];
  disclosures: OfferDisclosure[];
}

export interface MatchRequest {
  userId?: string;
  category: OfferCategory;
  profile: UserProfile;
  limit?: number;
  includeSponsored?: boolean;
  excludePartners?: string[];
  region?: string;
}

// =============================================================================
// Comparison Types
// =============================================================================

export interface ComparisonField {
  key: string;
  label: string;
  type: 'number' | 'percentage' | 'currency' | 'text' | 'boolean';
  higherIsBetter?: boolean;
}

export interface OfferComparison {
  offers: Offer[];
  fields: ComparisonField[];
  values: Record<string, Record<string, unknown>>;
  winner?: {
    offerId: string;
    reason: string;
  };
}

// =============================================================================
// Impression & Click Types
// =============================================================================

export interface Impression {
  id: string;
  offerId: string;
  userId?: string;
  sessionId?: string;
  page: string;
  position: number;
  impressedAt: Date;
}

export interface OfferClick {
  id: string;
  offerId: string;
  userId?: string;
  sessionId?: string;
  clickId: string;
  sourcePage: string;
  clickedAt: Date;
}

// =============================================================================
// API Types
// =============================================================================

export interface CreateOfferInput {
  partnerId: string;
  category: OfferCategory;
  name: string;
  headline: string;
  description: string;
  imageUrl?: string;
  destinationUrl: string;
  apr?: AprInfo;
  fees?: FeeInfo;
  rewards?: RewardInfo;
  creditLimit?: CreditLimitInfo;
  loanAmount?: LoanAmountInfo;
  minCreditScore?: number;
  maxCreditScore?: number;
  minIncome?: number;
  residencyRequirements?: string[];
  ageRequirement?: { min: number; max?: number };
  affiliateOfferId?: string;
  commissionType: 'cpa' | 'cpl' | 'revenue_share';
  commissionValue: number;
  rank?: number;
  featured?: boolean;
  badge?: string;
  tags?: string[];
  disclosureId: string;
  legalDisclaimer?: string;
  sponsoredContent?: boolean;
  startDate?: Date;
  endDate?: Date;
  regions?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateOfferInput {
  name?: string;
  headline?: string;
  description?: string;
  imageUrl?: string;
  destinationUrl?: string;
  apr?: AprInfo;
  fees?: FeeInfo;
  rewards?: RewardInfo;
  creditLimit?: CreditLimitInfo;
  loanAmount?: LoanAmountInfo;
  minCreditScore?: number;
  maxCreditScore?: number;
  minIncome?: number;
  residencyRequirements?: string[];
  ageRequirement?: { min: number; max?: number };
  affiliateOfferId?: string;
  commissionType?: 'cpa' | 'cpl' | 'revenue_share';
  commissionValue?: number;
  rank?: number;
  featured?: boolean;
  badge?: string;
  tags?: string[];
  disclosureId?: string;
  legalDisclaimer?: string;
  sponsoredContent?: boolean;
  status?: OfferStatus;
  startDate?: Date;
  endDate?: Date;
  regions?: string[];
  metadata?: Record<string, unknown>;
}
