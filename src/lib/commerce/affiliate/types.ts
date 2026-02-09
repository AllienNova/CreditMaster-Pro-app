/**
 * Affiliate System Types
 *
 * Type definitions for the affiliate and partner tracking system.
 */

// =============================================================================
// Partner Types
// =============================================================================

export type PartnerType =
  | 'credit_card'
  | 'personal_loan'
  | 'mortgage'
  | 'student_loan'
  | 'auto_loan'
  | 'insurance'
  | 'broker'
  | 'bank'
  | 'other';

export type CommissionType =
  | 'cpa' // Cost per acquisition (fixed amount per conversion)
  | 'cpl' // Cost per lead (fixed amount per qualified lead)
  | 'revenue_share' // Percentage of revenue
  | 'hybrid'; // Combination of fixed + percentage

export interface Partner {
  id: string;
  name: string;
  slug: string;
  type: PartnerType;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  apiEndpoint?: string;
  commissionType: CommissionType;
  commissionRate?: number; // Percentage for revenue share
  commissionFixed?: number; // Fixed amount for CPA/CPL
  minPayout: number;
  payoutFrequency: 'weekly' | 'biweekly' | 'monthly';
  paymentMethod: 'stripe' | 'bank_transfer' | 'check';
  stripeAccountId?: string;
  regions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreatePartnerInput {
  name: string;
  slug: string;
  type: PartnerType;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  apiEndpoint?: string;
  commissionType: CommissionType;
  commissionRate?: number;
  commissionFixed?: number;
  minPayout?: number;
  payoutFrequency?: 'weekly' | 'biweekly' | 'monthly';
  paymentMethod?: 'stripe' | 'bank_transfer' | 'check';
  stripeAccountId?: string;
  regions?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdatePartnerInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  apiEndpoint?: string;
  commissionType?: CommissionType;
  commissionRate?: number;
  commissionFixed?: number;
  minPayout?: number;
  payoutFrequency?: 'weekly' | 'biweekly' | 'monthly';
  paymentMethod?: 'stripe' | 'bank_transfer' | 'check';
  stripeAccountId?: string;
  regions?: string[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Referral Code Types
// =============================================================================

export interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  partnerId?: string;
  campaignId?: string;
  usesCount: number;
  maxUses?: number;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateReferralCodeInput {
  userId: string;
  partnerId?: string;
  campaignId?: string;
  customCode?: string;
  maxUses?: number;
  expiresAt?: Date;
}

export interface ReferralValidation {
  valid: boolean;
  code?: ReferralCode;
  error?: string;
}

// =============================================================================
// Click Tracking Types
// =============================================================================

export interface Click {
  id: string;
  clickId: string;
  userId?: string;
  partnerId: string;
  offerId?: string;
  referralCode?: string;
  sourcePage: string;
  destinationUrl: string;
  userAgent?: string;
  ipHash?: string;
  sessionId?: string;
  clickedAt: Date;
}

export interface ClickData {
  userId?: string;
  partnerId: string;
  offerId?: string;
  referralCode?: string;
  sourcePage: string;
  destinationUrl: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

// =============================================================================
// Conversion Tracking Types
// =============================================================================

export type ConversionType =
  | 'click' // User clicked through
  | 'lead' // User submitted application/form
  | 'signup' // User created account
  | 'application' // Full application submitted
  | 'approval' // Application approved
  | 'funded' // Loan/card funded/issued
  | 'purchase' // User made purchase
  | 'subscription'; // User subscribed

export type ConversionStatus =
  | 'pending' // Awaiting confirmation
  | 'confirmed' // Confirmed by partner
  | 'qualified' // Meets payout criteria
  | 'paid' // Commission paid
  | 'rejected' // Rejected by partner
  | 'chargedback'; // Reversed due to fraud/chargeback

export interface Conversion {
  id: string;
  clickId?: string;
  userId?: string;
  partnerId: string;
  offerId?: string;
  type: ConversionType;
  status: ConversionStatus;
  value: number; // Transaction value (e.g., loan amount)
  commissionEarned: number;
  partnerReference?: string;
  convertedAt: Date;
  confirmedAt?: Date;
  paidAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversionData {
  clickId?: string;
  userId?: string;
  partnerId: string;
  offerId?: string;
  type: ConversionType;
  value?: number;
  partnerReference?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Attribution Types
// =============================================================================

export interface Attribution {
  userId: string;
  referralCode?: string;
  referrerId?: string;
  partnerId?: string;
  campaignId?: string;
  firstClickId?: string;
  lastClickId?: string;
  attributedAt: Date;
  expiresAt?: Date;
}

// =============================================================================
// Reporting Types
// =============================================================================

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ClickStats {
  partnerId: string;
  period: DateRange;
  totalClicks: number;
  uniqueUsers: number;
  clicksBySource: Record<string, number>;
  clicksByDay: Array<{ date: string; count: number }>;
}

export interface ConversionStats {
  partnerId: string;
  period: DateRange;
  totalConversions: number;
  conversionsByType: Record<ConversionType, number>;
  conversionsByStatus: Record<ConversionStatus, number>;
  totalValue: number;
  totalCommission: number;
  conversionRate: number;
  avgOrderValue: number;
  conversionsByDay: Array<{ date: string; count: number; value: number }>;
}

export interface CommissionReport {
  partnerId: string;
  period: DateRange;
  pendingCommission: number;
  confirmedCommission: number;
  paidCommission: number;
  totalCommission: number;
  conversions: Array<{
    conversionId: string;
    type: ConversionType;
    value: number;
    commission: number;
    status: ConversionStatus;
    convertedAt: Date;
  }>;
}

export interface PartnerPerformance {
  partnerId: string;
  partnerName: string;
  period: DateRange;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  commission: number;
  roi: number;
}

// =============================================================================
// Webhook Types
// =============================================================================

export interface PartnerWebhookEvent {
  type: 'conversion' | 'status_update' | 'payout';
  partnerId: string;
  partnerReference: string;
  data: Record<string, unknown>;
  receivedAt: Date;
  signature?: string;
}
