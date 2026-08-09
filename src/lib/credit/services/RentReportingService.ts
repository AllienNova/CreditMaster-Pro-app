/**
 * Rent Reporting Integration Service
 *
 * Help users report rent payments to credit bureaus:
 * - Integration with rent reporting services
 * - Payment verification and tracking
 * - Historical rent reporting
 * - Impact estimation
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type RentReportingProvider =
  | "boom"
  | "rental_kharma"
  | "rent_reporters"
  | "self_rent"
  | "experian_boost"
  | "level_credit"
  | "piñata";

export type ReportingStatus =
  | "pending"
  | "verified"
  | "reporting"
  | "paused"
  | "cancelled";
export type PaymentStatus =
  | "pending"
  | "on_time"
  | "late"
  | "missed"
  | "partial";

export interface RentReportingService {
  id: string;
  provider: RentReportingProvider;
  name: string;

  // Pricing
  monthlyFee: number;
  setupFee: number;
  historicalReportingFee?: number;

  // Features
  bureausReported: ("equifax" | "experian" | "transunion")[];
  historicalReporting: boolean;
  maxHistoricalMonths: number;
  verificationMethod: "bank" | "landlord" | "both";

  // Requirements
  minRentAmount?: number;
  requiresLandlordApproval: boolean;

  // Metadata
  description: string;
  pros: string[];
  cons: string[];
  estimatedScoreImpact: { min: number; max: number };
  signupUrl: string;
  rating: number;
}

export interface RentReportingAccount {
  id: string;
  userId: string;
  provider: RentReportingProvider;
  status: ReportingStatus;

  // Rental details
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;
  propertyAddress: string;
  monthlyRent: number;
  leaseStartDate: Date;
  leaseEndDate?: Date;

  // Verification
  verificationStatus: "pending" | "verified" | "failed";
  verificationMethod: "bank" | "landlord";
  verifiedAt?: Date;

  // Reporting
  reportingStartDate?: Date;
  historicalMonthsReported: number;

  // Stats
  totalPaymentsReported: number;
  onTimePayments: number;
  latePayments: number;
  missedPayments: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface RentPayment {
  id: string;
  accountId: string;
  userId: string;

  // Payment details
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;

  // Reporting
  reportedToCredit: boolean;
  reportedDate?: Date;
  bureausReported: ("equifax" | "experian" | "transunion")[];

  createdAt: Date;
}

export interface RentReportingRecommendation {
  service: RentReportingService;
  matchScore: number;
  reasons: string[];
  estimatedMonthlyCost: number;
  estimatedScoreImpact: number;
  historicalReportingValue?: number;
}

// ============================================================================
// RENT REPORTING SERVICES DATABASE
// ============================================================================

const RENT_REPORTING_SERVICES: RentReportingService[] = [
  {
    id: "boom-rent",
    provider: "boom",
    name: "Boom Pay",
    monthlyFee: 2,
    setupFee: 0,
    historicalReportingFee: 25,
    bureausReported: ["equifax", "experian", "transunion"],
    historicalReporting: true,
    maxHistoricalMonths: 24,
    verificationMethod: "bank",
    requiresLandlordApproval: false,
    description:
      "Report rent to all 3 bureaus with bank verification. Up to 24 months historical.",
    pros: [
      "Reports to all 3 bureaus",
      "Low monthly cost",
      "Bank verification (no landlord needed)",
    ],
    cons: ["Historical reporting costs extra", "Requires linked bank account"],
    estimatedScoreImpact: { min: 20, max: 50 },
    signupUrl: "https://www.boompay.app",
    rating: 4.5,
  },
  {
    id: "rental-kharma",
    provider: "rental_kharma",
    name: "Rental Kharma",
    monthlyFee: 8.95,
    setupFee: 50,
    historicalReportingFee: 0,
    bureausReported: ["transunion"],
    historicalReporting: true,
    maxHistoricalMonths: 24,
    verificationMethod: "landlord",
    requiresLandlordApproval: true,
    description:
      "One of the original rent reporting services. Reports to TransUnion with landlord verification.",
    pros: ["Up to 24 months historical included", "Established service"],
    cons: [
      "Only reports to TransUnion",
      "Higher setup fee",
      "Requires landlord cooperation",
    ],
    estimatedScoreImpact: { min: 15, max: 40 },
    signupUrl: "https://www.rentalkharma.com",
    rating: 4.0,
  },
  {
    id: "rent-reporters",
    provider: "rent_reporters",
    name: "Rent Reporters",
    monthlyFee: 9.95,
    setupFee: 94.95,
    historicalReportingFee: 0,
    bureausReported: ["transunion", "equifax"],
    historicalReporting: true,
    maxHistoricalMonths: 24,
    verificationMethod: "both",
    requiresLandlordApproval: false,
    description:
      "Reports to TransUnion and Equifax with historical reporting included.",
    pros: [
      "Reports to 2 bureaus",
      "24 months historical included",
      "No landlord required",
    ],
    cons: ["Higher setup fee", "Doesn't report to Experian"],
    estimatedScoreImpact: { min: 20, max: 45 },
    signupUrl: "https://www.rentreporters.com",
    rating: 4.2,
  },
  {
    id: "self-rent-track",
    provider: "self_rent",
    name: "Self Rent Track",
    monthlyFee: 6.95,
    setupFee: 0,
    historicalReportingFee: 0,
    bureausReported: ["equifax", "experian", "transunion"],
    historicalReporting: false,
    maxHistoricalMonths: 0,
    verificationMethod: "bank",
    requiresLandlordApproval: false,
    description:
      "Part of the Self credit building ecosystem. Easy integration if you have Self account.",
    pros: [
      "Reports to all 3 bureaus",
      "No setup fee",
      "Integrates with Self credit builder",
    ],
    cons: ["No historical reporting", "Works best with Self account"],
    estimatedScoreImpact: { min: 15, max: 35 },
    signupUrl: "https://www.self.inc/rent-track",
    rating: 4.3,
  },
  {
    id: "experian-boost",
    provider: "experian_boost",
    name: "Experian Boost",
    monthlyFee: 0,
    setupFee: 0,
    bureausReported: ["experian"],
    historicalReporting: true,
    maxHistoricalMonths: 24,
    verificationMethod: "bank",
    requiresLandlordApproval: false,
    description:
      "Free service from Experian that reports rent, utilities, and streaming payments.",
    pros: [
      "Completely free",
      "Instant score impact",
      "Also reports utilities and streaming",
    ],
    cons: ["Only affects Experian score", "Must link bank account"],
    estimatedScoreImpact: { min: 10, max: 30 },
    signupUrl: "https://www.experian.com/boost",
    rating: 4.7,
  },
  {
    id: "level-credit",
    provider: "level_credit",
    name: "Level Credit (Self)",
    monthlyFee: 6.95,
    setupFee: 0,
    bureausReported: ["equifax", "experian", "transunion"],
    historicalReporting: false,
    maxHistoricalMonths: 0,
    verificationMethod: "bank",
    requiresLandlordApproval: false,
    description:
      "Formerly LevelCredit, now part of Self. Reports rent to all 3 bureaus.",
    pros: ["All 3 bureaus", "No setup fee", "Established track record"],
    cons: ["No historical reporting"],
    estimatedScoreImpact: { min: 15, max: 40 },
    signupUrl: "https://www.self.inc",
    rating: 4.4,
  },
];

// ============================================================================
// SERVICE
// ============================================================================

export class RentReportingIntegrationService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  getRecommendations(
    monthlyRent: number,
    budget: number,
    wantHistorical: boolean,
    prioritizeCost: boolean,
  ): RentReportingRecommendation[] {
    const recommendations: RentReportingRecommendation[] = [];

    for (const service of RENT_REPORTING_SERVICES) {
      const monthlyCost = service.monthlyFee;
      if (monthlyCost > budget) continue;

      let matchScore = 50;
      const reasons: string[] = [];

      // Bureau coverage
      if (service.bureausReported.length === 3) {
        matchScore += 25;
        reasons.push("Reports to all 3 credit bureaus");
      } else if (service.bureausReported.length === 2) {
        matchScore += 15;
        reasons.push(`Reports to ${service.bureausReported.join(" and ")}`);
      }

      // Historical reporting
      if (wantHistorical && service.historicalReporting) {
        matchScore += 20;
        reasons.push(
          `Up to ${service.maxHistoricalMonths} months of historical rent`,
        );
      }

      // Cost consideration
      if (prioritizeCost) {
        if (service.monthlyFee === 0) {
          matchScore += 20;
          reasons.push("Completely free service");
        } else if (service.monthlyFee <= 5) {
          matchScore += 10;
          reasons.push("Very affordable monthly fee");
        }
      }

      // No landlord approval
      if (!service.requiresLandlordApproval) {
        matchScore += 10;
        reasons.push("No landlord approval required");
      }

      // Estimated impact
      const avgImpact =
        (service.estimatedScoreImpact.min + service.estimatedScoreImpact.max) /
        2;

      recommendations.push({
        service,
        matchScore: Math.min(100, matchScore),
        reasons,
        estimatedMonthlyCost: monthlyCost,
        estimatedScoreImpact: avgImpact,
        historicalReportingValue: service.historicalReporting
          ? service.historicalReportingFee || 0
          : undefined,
      });
    }

    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  async createAccount(
    account: Omit<RentReportingAccount, "id" | "createdAt" | "updatedAt">,
  ): Promise<RentReportingAccount> {
    const now = new Date();
    const newAccount: RentReportingAccount = {
      ...account,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("rent_reporting_accounts")
      .insert(this.accountToDb(newAccount))
      .select()
      .single();

    if (error) throw error;
    return this.accountFromDb(data);
  }

  async updateAccount(
    accountId: string,
    userId: string,
    updates: Partial<RentReportingAccount>,
  ): Promise<RentReportingAccount> {
    const { data, error } = await this.supabase
      .from("rent_reporting_accounts")
      .update({
        ...this.accountToDb(updates),
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return this.accountFromDb(data);
  }

  async getUserAccounts(userId: string): Promise<RentReportingAccount[]> {
    const { data, error } = await this.supabase
      .from("rent_reporting_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.accountFromDb);
  }

  // ==========================================================================
  // PAYMENT TRACKING
  // ==========================================================================

  async recordPayment(
    payment: Omit<RentPayment, "id" | "createdAt">,
  ): Promise<RentPayment> {
    const newPayment = {
      ...payment,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("rent_payments")
      .insert({
        id: newPayment.id,
        account_id: newPayment.accountId,
        user_id: newPayment.userId,
        amount: newPayment.amount,
        due_date: newPayment.dueDate.toISOString(),
        paid_date: newPayment.paidDate?.toISOString(),
        status: newPayment.status,
        reported_to_credit: newPayment.reportedToCredit,
        reported_date: newPayment.reportedDate?.toISOString(),
        bureaus_reported: newPayment.bureausReported,
        created_at: newPayment.created_at,
      })
      .select()
      .single();

    if (error) throw error;
    return this.paymentFromDb(data);
  }

  async getPaymentHistory(
    accountId: string,
    userId: string,
  ): Promise<RentPayment[]> {
    const { data, error } = await this.supabase
      .from("rent_payments")
      .select("*")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .order("due_date", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.paymentFromDb);
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getReportingStats(userId: string): Promise<{
    totalPaymentsReported: number;
    onTimePercentage: number;
    estimatedScoreImpact: number;
    monthsReporting: number;
    bureausCovered: string[];
  }> {
    const accounts = await this.getUserAccounts(userId);

    let totalPayments = 0;
    let onTimePayments = 0;
    const bureaus = new Set<string>();
    let earliestStart: Date | null = null;

    for (const account of accounts) {
      totalPayments += account.totalPaymentsReported;
      onTimePayments += account.onTimePayments;

      const service = this.getServiceByProvider(account.provider);
      if (service) {
        service.bureausReported.forEach((b) => bureaus.add(b));
      }

      if (account.reportingStartDate) {
        if (!earliestStart || account.reportingStartDate < earliestStart) {
          earliestStart = account.reportingStartDate;
        }
      }
    }

    const monthsReporting = earliestStart
      ? Math.floor(
          (Date.now() - earliestStart.getTime()) / (30 * 24 * 60 * 60 * 1000),
        )
      : 0;

    const onTimePercentage =
      totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;

    // Estimate score impact based on months and on-time percentage
    let estimatedScoreImpact = Math.min(50, monthsReporting * 2);
    if (onTimePercentage >= 100) estimatedScoreImpact += 10;
    if (bureaus.size === 3) estimatedScoreImpact += 10;

    return {
      totalPaymentsReported: totalPayments,
      onTimePercentage,
      estimatedScoreImpact,
      monthsReporting,
      bureausCovered: Array.from(bureaus),
    };
  }

  // ==========================================================================
  // CATALOG
  // ==========================================================================

  getAllServices(): RentReportingService[] {
    return RENT_REPORTING_SERVICES;
  }

  getServiceByProvider(
    provider: RentReportingProvider,
  ): RentReportingService | undefined {
    return RENT_REPORTING_SERVICES.find((s) => s.provider === provider);
  }

  getFreeServices(): RentReportingService[] {
    return RENT_REPORTING_SERVICES.filter((s) => s.monthlyFee === 0);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private accountToDb(
    account: Partial<RentReportingAccount>,
  ): Record<string, unknown> {
    return {
      id: account.id,
      user_id: account.userId,
      provider: account.provider,
      status: account.status,
      landlord_name: account.landlordName,
      landlord_email: account.landlordEmail,
      landlord_phone: account.landlordPhone,
      property_address: account.propertyAddress,
      monthly_rent: account.monthlyRent,
      lease_start_date: account.leaseStartDate?.toISOString(),
      lease_end_date: account.leaseEndDate?.toISOString(),
      verification_status: account.verificationStatus,
      verification_method: account.verificationMethod,
      verified_at: account.verifiedAt?.toISOString(),
      reporting_start_date: account.reportingStartDate?.toISOString(),
      historical_months_reported: account.historicalMonthsReported,
      total_payments_reported: account.totalPaymentsReported,
      on_time_payments: account.onTimePayments,
      late_payments: account.latePayments,
      missed_payments: account.missedPayments,
      created_at: account.createdAt?.toISOString(),
      updated_at: account.updatedAt?.toISOString(),
    };
  }

  private accountFromDb(data: Record<string, unknown>): RentReportingAccount {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      provider: data.provider as RentReportingProvider,
      status: data.status as ReportingStatus,
      landlordName: data.landlord_name as string,
      landlordEmail: data.landlord_email as string | undefined,
      landlordPhone: data.landlord_phone as string | undefined,
      propertyAddress: data.property_address as string,
      monthlyRent: data.monthly_rent as number,
      leaseStartDate: new Date(data.lease_start_date as string),
      leaseEndDate: data.lease_end_date
        ? new Date(data.lease_end_date as string)
        : undefined,
      verificationStatus: data.verification_status as
        | "pending"
        | "verified"
        | "failed",
      verificationMethod: data.verification_method as "bank" | "landlord",
      verifiedAt: data.verified_at
        ? new Date(data.verified_at as string)
        : undefined,
      reportingStartDate: data.reporting_start_date
        ? new Date(data.reporting_start_date as string)
        : undefined,
      historicalMonthsReported: data.historical_months_reported as number,
      totalPaymentsReported: data.total_payments_reported as number,
      onTimePayments: data.on_time_payments as number,
      latePayments: data.late_payments as number,
      missedPayments: data.missed_payments as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private paymentFromDb(data: Record<string, unknown>): RentPayment {
    return {
      id: data.id as string,
      accountId: data.account_id as string,
      userId: data.user_id as string,
      amount: data.amount as number,
      dueDate: new Date(data.due_date as string),
      paidDate: data.paid_date ? new Date(data.paid_date as string) : undefined,
      status: data.status as PaymentStatus,
      reportedToCredit: data.reported_to_credit as boolean,
      reportedDate: data.reported_date
        ? new Date(data.reported_date as string)
        : undefined,
      bureausReported: data.bureaus_reported as (
        | "equifax"
        | "experian"
        | "transunion"
      )[],
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let rentReportingServiceInstance: RentReportingIntegrationService | null = null;

export function getRentReportingService(): RentReportingIntegrationService {
  if (!rentReportingServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    rentReportingServiceInstance = new RentReportingIntegrationService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return rentReportingServiceInstance;
}
