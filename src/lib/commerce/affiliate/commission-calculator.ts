/**
 * Commission Calculator Service
 *
 * Handles commission calculation and commission reporting.
 *
 * Payout EXECUTION (Stripe transfers, bank transfers, scheduled runs) lives
 * exclusively in `@/lib/commerce/payouts/payout-service.ts` — this file must
 * never write to `affiliate_payouts` or call a payment provider directly.
 * Two independent payout rails with separate idempotency-key namespaces would
 * let a double-trigger slip past both guards (FND-026).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Cents, fromDollars, toDollars } from "@/lib/money";
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

// Lazily constructed so `next build` page-data-collection (no runtime env)
// does not abort on createClient's "supabaseUrl is required".
let _supabase: SupabaseClient | null = null;
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, recv) {
    if (!_supabase) _supabase = createClient(supabaseUrl, supabaseServiceKey);
    const v = Reflect.get(_supabase, prop, recv);
    return typeof v === "function" ? v.bind(_supabase) : v;
  },
});

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
    // Get partner settings. A commission that cannot be resolved must fail
    // loudly (the caller's webhook handler 5xxs and the sender retries) —
    // silently recording a $0 commission for a missing/errored lookup is the
    // defect this fixes (see 20260731000005_affiliate_partners_commission_rules.sql).
    const partner = await this.getPartner(partnerId);
    if (!partner) {
      throw new Error(
        `Cannot calculate commission: affiliate partner not found (${partnerId})`,
      );
    }

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

    // Accumulate in integer cents to avoid IEEE-754 float drift (FND-029).
    // Convert once to dollars at the return boundary.
    let pendingCents = 0;
    let confirmedCents = 0;
    let paidCents = 0;

    conversionList.forEach((conv) => {
      const commissionCents = fromDollars(conv.commission_earned || 0);
      switch (conv.status) {
        case "pending":
          pendingCents += commissionCents;
          break;
        case "confirmed":
        case "qualified":
          confirmedCents += commissionCents;
          break;
        case "paid":
          paidCents += commissionCents;
          break;
      }
    });

    const pendingCommission = toDollars(pendingCents as Cents);
    const confirmedCommission = toDollars(confirmedCents as Cents);
    const paidCommission = toDollars(paidCents as Cents);

    return {
      partnerId,
      period: dateRange,
      pendingCommission,
      confirmedCommission,
      paidCommission,
      totalCommission: toDollars((pendingCents + confirmedCents + paidCents) as Cents),
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
      // No matching custom rule is a legitimate business case — the caller
      // falls back to the partner's default commission settings.
      if (error.code === "PGRST116") return null;
      // Any other error (missing table, connection failure, etc.) must not
      // be silently treated the same as "no custom rule" — that masked a
      // broken commission_rules lookup as a normal, ruleless commission.
      throw new Error(
        `Failed to look up commission rule for partner ${partnerId}: ${error.message}`,
      );
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

    if (error) {
      // No matching row is a legitimate "this partner doesn't exist" answer.
      if (error.code === "PGRST116") return null;
      // Any other error (missing table, connection failure, etc.) must
      // surface — calculateCommission throws on a null partner rather than
      // recording a fake $0 commission, so this must not be conflated with
      // "not found".
      throw new Error(
        `Failed to look up affiliate partner ${partnerId}: ${error.message}`,
      );
    }

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
    const { data, error } = await supabase
      .from("commission_tiers")
      .select("min_volume, multiplier")
      .eq("partner_id", partnerId)
      .order("min_volume", { ascending: true });

    // `error` was not destructured at all, so a failed lookup returned [] and
    // calculateTieredCommission silently applied NO tier multiplier — every
    // high-volume partner paid at the base rate, with nothing to indicate the
    // tiers had not been read. A partner with no tiers configured is a
    // legitimate empty result; a failed query is not, and the two must not look
    // the same on a path that decides what someone is paid.
    if (error) {
      throw new Error(
        `Failed to load commission tiers for partner ${partnerId}: ${error.message}`,
      );
    }

    return (data || []).map((row) => ({
      minVolume: row.min_volume,
      multiplier: row.multiplier,
    }));
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
