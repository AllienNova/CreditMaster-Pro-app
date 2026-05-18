/**
 * Commission Calculator Service
 *
 * Handles commission calculation, payout processing, and commission reporting.
 */

import { createClient } from "@supabase/supabase-js";
import {
  CommissionReport,
  CommissionType,
  Conversion,
  ConversionStatus,
  ConversionType,
  DateRange,
  Partner,
} from "./types";

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// Commission Rules
// =============================================================================

interface CommissionRule {
  partnerId: string;
  conversionType: ConversionType;
  minValue?: number;
  maxValue?: number;
  commissionType: CommissionType;
  commissionRate?: number;
  commissionFixed?: number;
  bonusRate?: number;
  bonusThreshold?: number;
}

interface PayoutRequest {
  partnerId: string;
  amount: number;
  conversionIds: string[];
  paymentMethod: "stripe" | "bank_transfer" | "check";
  stripeAccountId?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
}

interface PayoutResult {
  id: string;
  partnerId: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  paymentMethod: string;
  transactionId?: string;
  processedAt?: Date;
  error?: string;
}

// =============================================================================
// Commission Calculator Service
// =============================================================================

class CommissionCalculatorService {
  // ===========================================================================
  // Commission Calculation
  // ===========================================================================

  /**
   * Calculate commission for a conversion
   */
  async calculateCommission(
    partnerId: string,
    conversionType: ConversionType,
    value: number,
  ): Promise<number> {
    // Get partner settings
    const partner = await this.getPartner(partnerId);
    if (!partner) return 0;

    // Check for custom rules
    const rule = await this.getCommissionRule(partnerId, conversionType, value);

    const commissionType = rule?.commissionType || partner.commissionType;
    const commissionRate = rule?.commissionRate ?? partner.commissionRate;
    const commissionFixed = rule?.commissionFixed ?? partner.commissionFixed;

    let commission = 0;

    switch (commissionType) {
      case "cpa":
        commission = commissionFixed || 0;
        break;

      case "cpl":
        if (["lead", "signup", "application"].includes(conversionType)) {
          commission = commissionFixed || 0;
        }
        break;

      case "revenue_share":
        commission = value * ((commissionRate || 0) / 100);
        break;

      case "hybrid":
        commission =
          (commissionFixed || 0) + value * ((commissionRate || 0) / 100);
        break;
    }

    // Apply bonus if applicable
    if (
      rule?.bonusThreshold &&
      value >= rule.bonusThreshold &&
      rule.bonusRate
    ) {
      commission += value * (rule.bonusRate / 100);
    }

    return Math.round(commission * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate tiered commission based on volume
   */
  async calculateTieredCommission(
    partnerId: string,
    conversionType: ConversionType,
    value: number,
    monthlyVolume: number,
  ): Promise<number> {
    // Get tier based on monthly volume
    const tiers = await this.getCommissionTiers(partnerId);
    let appliedTier = tiers[0]; // Default to first tier

    for (const tier of tiers) {
      if (monthlyVolume >= tier.minVolume) {
        appliedTier = tier;
      }
    }

    // Apply tier rate
    const baseCommission = await this.calculateCommission(
      partnerId,
      conversionType,
      value,
    );

    return baseCommission * (appliedTier?.multiplier || 1);
  }

  /**
   * Recalculate commission for a conversion (e.g., after value adjustment)
   */
  async recalculateCommission(conversionId: string): Promise<number> {
    const { data: conversion, error } = await supabase
      .from("affiliate_conversions")
      .select("*")
      .eq("id", conversionId)
      .single();

    if (error || !conversion) {
      throw new Error(`Conversion not found: ${conversionId}`);
    }

    const newCommission = await this.calculateCommission(
      conversion.partner_id,
      conversion.type,
      conversion.value || 0,
    );

    // Update the conversion
    await supabase
      .from("affiliate_conversions")
      .update({ commission_earned: newCommission })
      .eq("id", conversionId);

    return newCommission;
  }

  // ===========================================================================
  // Commission Reporting
  // ===========================================================================

  /**
   * Get commission report for a partner
   */
  async getCommissionReport(
    partnerId: string,
    dateRange: DateRange,
  ): Promise<CommissionReport> {
    const { data: conversions, error } = await supabase
      .from("affiliate_conversions")
      .select("*")
      .eq("partner_id", partnerId)
      .gte("converted_at", dateRange.from.toISOString())
      .lte("converted_at", dateRange.to.toISOString());

    if (error) {
      throw new Error(`Failed to get commission report: ${error.message}`);
    }

    const conversionList = conversions || [];

    // Calculate totals by status
    let pendingCommission = 0;
    let confirmedCommission = 0;
    let paidCommission = 0;

    conversionList.forEach((conv) => {
      const commission = conv.commission_earned || 0;
      switch (conv.status) {
        case "pending":
          pendingCommission += commission;
          break;
        case "confirmed":
        case "qualified":
          confirmedCommission += commission;
          break;
        case "paid":
          paidCommission += commission;
          break;
      }
    });

    return {
      partnerId,
      period: dateRange,
      pendingCommission,
      confirmedCommission,
      paidCommission,
      totalCommission: pendingCommission + confirmedCommission + paidCommission,
      conversions: conversionList.map((conv) => ({
        conversionId: conv.id,
        type: conv.type,
        value: conv.value || 0,
        commission: conv.commission_earned || 0,
        status: conv.status,
        convertedAt: new Date(conv.converted_at),
      })),
    };
  }

  /**
   * Get pending payout amount for a partner
   */
  async getPendingPayout(partnerId: string): Promise<{
    amount: number;
    conversionsCount: number;
    eligibleForPayout: boolean;
    minPayoutRequired: number;
  }> {
    // Get confirmed but unpaid conversions
    const { data: conversions, error } = await supabase
      .from("affiliate_conversions")
      .select("id, commission_earned")
      .eq("partner_id", partnerId)
      .in("status", ["confirmed", "qualified"]);

    if (error) {
      throw new Error(`Failed to get pending payout: ${error.message}`);
    }

    const partner = await this.getPartner(partnerId);
    const minPayout = partner?.minPayout || 50;

    const totalAmount = (conversions || []).reduce(
      (sum, c) => sum + (c.commission_earned || 0),
      0,
    );

    return {
      amount: totalAmount,
      conversionsCount: (conversions || []).length,
      eligibleForPayout: totalAmount >= minPayout,
      minPayoutRequired: minPayout,
    };
  }

  /**
   * Get historical payouts for a partner
   */
  async getPayoutHistory(
    partnerId: string,
    dateRange?: DateRange,
  ): Promise<PayoutResult[]> {
    let query = supabase
      .from("affiliate_payouts")
      .select("*")
      .eq("partner_id", partnerId);

    if (dateRange) {
      query = query
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw new Error(`Failed to get payout history: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      partnerId: row.partner_id,
      amount: row.amount,
      status: row.status,
      paymentMethod: row.payment_method,
      transactionId: row.transaction_id,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      error: row.error,
    }));
  }

  // ===========================================================================
  // Payout Processing
  // ===========================================================================

  /**
   * Initiate a payout to a partner
   */
  async initiatePayout(request: PayoutRequest): Promise<PayoutResult> {
    // Validate payout eligibility
    const pending = await this.getPendingPayout(request.partnerId);
    if (!pending.eligibleForPayout) {
      throw new Error(
        `Minimum payout of $${pending.minPayoutRequired} not reached. Current: $${pending.amount}`,
      );
    }

    if (request.amount > pending.amount) {
      throw new Error(
        `Requested payout $${request.amount} exceeds available $${pending.amount}`,
      );
    }

    // Create payout record
    const payoutRecord = {
      partner_id: request.partnerId,
      amount: request.amount,
      status: "pending",
      payment_method: request.paymentMethod,
      stripe_account_id: request.stripeAccountId,
      conversion_ids: request.conversionIds,
      created_at: new Date().toISOString(),
    };

    const { data: payout, error } = await supabase
      .from("affiliate_payouts")
      .insert(payoutRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payout: ${error.message}`);
    }

    // Process the payout based on method
    try {
      let transactionId: string | undefined;

      if (request.paymentMethod === "stripe" && request.stripeAccountId) {
        transactionId = await this.processStripePayout(
          request.stripeAccountId,
          request.amount,
          payout.id,
        );
      } else if (
        request.paymentMethod === "bank_transfer" &&
        request.bankDetails
      ) {
        transactionId = await this.processBankTransfer(
          request.bankDetails,
          request.amount,
        );
      }

      // Update payout status
      await supabase
        .from("affiliate_payouts")
        .update({
          status: "completed",
          transaction_id: transactionId,
          processed_at: new Date().toISOString(),
        })
        .eq("id", payout.id);

      // Mark conversions as paid
      await supabase
        .from("affiliate_conversions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .in("id", request.conversionIds);

      return {
        id: payout.id,
        partnerId: request.partnerId,
        amount: request.amount,
        status: "completed",
        paymentMethod: request.paymentMethod,
        transactionId,
        processedAt: new Date(),
      };
    } catch (err) {
      // Update payout as failed
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("affiliate_payouts")
        .update({ status: "failed", error: errorMessage })
        .eq("id", payout.id);

      return {
        id: payout.id,
        partnerId: request.partnerId,
        amount: request.amount,
        status: "failed",
        paymentMethod: request.paymentMethod,
        error: errorMessage,
      };
    }
  }

  /**
   * Process automatic payouts based on schedule
   */
  async processScheduledPayouts(): Promise<PayoutResult[]> {
    // Get partners eligible for payout
    const { data: partners, error } = await supabase
      .from("affiliate_partners")
      .select("id, payout_frequency, payment_method, stripe_account_id")
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to get partners: ${error.message}`);
    }

    const results: PayoutResult[] = [];
    const now = new Date();

    for (const partner of partners || []) {
      // Check if payout is due based on frequency
      const isDue = await this.isPayoutDue(
        partner.id,
        partner.payout_frequency,
      );
      if (!isDue) continue;

      // Get pending payout
      const pending = await this.getPendingPayout(partner.id);
      if (!pending.eligibleForPayout) continue;

      // Get eligible conversions
      const { data: conversions } = await supabase
        .from("affiliate_conversions")
        .select("id")
        .eq("partner_id", partner.id)
        .in("status", ["confirmed", "qualified"]);

      const conversionIds = (conversions || []).map((c) => c.id);

      // Initiate payout
      try {
        const result = await this.initiatePayout({
          partnerId: partner.id,
          amount: pending.amount,
          conversionIds,
          paymentMethod: partner.payment_method,
          stripeAccountId: partner.stripe_account_id,
        });
        results.push(result);
      } catch (_err) {
        // CommissionCalculator error: Failed to process payout for partner
        void _err;
      }
    }

    return results;
  }

  // ===========================================================================
  // Commission Rules
  // ===========================================================================

  /**
   * Create a custom commission rule
   */
  async createCommissionRule(rule: CommissionRule): Promise<CommissionRule> {
    const ruleRecord = {
      partner_id: rule.partnerId,
      conversion_type: rule.conversionType,
      min_value: rule.minValue,
      max_value: rule.maxValue,
      commission_type: rule.commissionType,
      commission_rate: rule.commissionRate,
      commission_fixed: rule.commissionFixed,
      bonus_rate: rule.bonusRate,
      bonus_threshold: rule.bonusThreshold,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("commission_rules")
      .insert(ruleRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create commission rule: ${error.message}`);
    }

    return this.mapCommissionRule(data);
  }

  /**
   * Get commission rule for a specific conversion
   */
  async getCommissionRule(
    partnerId: string,
    conversionType: ConversionType,
    value: number,
  ): Promise<CommissionRule | null> {
    const { data, error } = await supabase
      .from("commission_rules")
      .select()
      .eq("partner_id", partnerId)
      .eq("conversion_type", conversionType)
      .or(`min_value.is.null,min_value.lte.${value}`)
      .or(`max_value.is.null,max_value.gte.${value}`)
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      // Don't throw for "no rows" error, just return null
      return null;
    }

    return this.mapCommissionRule(data);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Get partner by ID
   */
  private async getPartner(partnerId: string): Promise<Partner | null> {
    const { data, error } = await supabase
      .from("affiliate_partners")
      .select()
      .eq("id", partnerId)
      .single();

    if (error) return null;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      type: data.type,
      description: data.description,
      logoUrl: data.logo_url,
      websiteUrl: data.website_url,
      apiEndpoint: data.api_endpoint,
      commissionType: data.commission_type,
      commissionRate: data.commission_rate,
      commissionFixed: data.commission_fixed,
      minPayout: data.min_payout,
      payoutFrequency: data.payout_frequency,
      paymentMethod: data.payment_method,
      stripeAccountId: data.stripe_account_id,
      regions: data.regions,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      metadata: data.metadata,
    };
  }

  /**
   * Get commission tiers for a partner
   */
  private async getCommissionTiers(
    partnerId: string,
  ): Promise<Array<{ minVolume: number; multiplier: number }>> {
    const { data } = await supabase
      .from("commission_tiers")
      .select("min_volume, multiplier")
      .eq("partner_id", partnerId)
      .order("min_volume", { ascending: true });

    return (data || []).map((row) => ({
      minVolume: row.min_volume,
      multiplier: row.multiplier,
    }));
  }

  /**
   * Check if payout is due based on frequency
   */
  private async isPayoutDue(
    partnerId: string,
    frequency: string,
  ): Promise<boolean> {
    // Get last payout date
    const { data } = await supabase
      .from("affiliate_payouts")
      .select("processed_at")
      .eq("partner_id", partnerId)
      .eq("status", "completed")
      .order("processed_at", { ascending: false })
      .limit(1)
      .single();

    if (!data?.processed_at) return true; // Never paid, due now

    const lastPayout = new Date(data.processed_at);
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - lastPayout.getTime()) / (1000 * 60 * 60 * 24),
    );

    switch (frequency) {
      case "weekly":
        return daysSince >= 7;
      case "biweekly":
        return daysSince >= 14;
      case "monthly":
        return daysSince >= 30;
      default:
        return daysSince >= 30;
    }
  }

  /**
   * Process Stripe payout
   */
  private async processStripePayout(
    stripeAccountId: string,
    amount: number,
    payoutId: string,
  ): Promise<string> {
    // Import Stripe service
    const stripe = await import("stripe");
    const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY!);

    // Create a transfer to the connected account
    const transfer = await stripeClient.transfers.create(
      {
        amount: Math.round(amount * 100), // Convert to cents — already correct, do not double-convert
        currency: "usd",
        destination: stripeAccountId,
        description: "Fynvita affiliate commission payout",
      },
      // Idempotency key derived from stable payout row id — prevents double-pay on retry (FND-026)
      { idempotencyKey: `commission-transfer-${payoutId}` },
    );

    return transfer.id;
  }

  /**
   * Process bank transfer payout
   */
  private async processBankTransfer(
    bankDetails: {
      accountName: string;
      accountNumber: string;
      routingNumber: string;
      bankName: string;
    },
    amount: number,
  ): Promise<string> {
    // For now, generate a reference and queue for manual processing
    // In production, integrate with a bank transfer API like Dwolla, Plaid Transfer, etc.
    const reference = `BT-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Log the transfer request for manual processing
    await supabase.from("pending_bank_transfers").insert({
      reference,
      amount,
      account_name: bankDetails.accountName,
      account_number_last4: bankDetails.accountNumber.slice(-4),
      routing_number: bankDetails.routingNumber,
      bank_name: bankDetails.bankName,
      created_at: new Date().toISOString(),
    });

    return reference;
  }

  /**
   * Map database row to CommissionRule type
   */
  private mapCommissionRule(row: Record<string, unknown>): CommissionRule {
    return {
      partnerId: row.partner_id as string,
      conversionType: row.conversion_type as ConversionType,
      minValue: row.min_value as number | undefined,
      maxValue: row.max_value as number | undefined,
      commissionType: row.commission_type as CommissionType,
      commissionRate: row.commission_rate as number | undefined,
      commissionFixed: row.commission_fixed as number | undefined,
      bonusRate: row.bonus_rate as number | undefined,
      bonusThreshold: row.bonus_threshold as number | undefined,
    };
  }
}

// Export singleton
export const commissionCalculator = new CommissionCalculatorService();
export default commissionCalculator;
