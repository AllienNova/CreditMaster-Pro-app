/**
 * Affiliate Service
 *
 * Manages affiliate partners, referral codes, and user attribution.
 */

import { createClient } from "@supabase/supabase-js";
import {
  Partner,
  CreatePartnerInput,
  UpdatePartnerInput,
  ReferralCode,
  CreateReferralCodeInput,
  ReferralValidation,
  Attribution,
} from "./types";

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Referral code expiration (30 days default)
const DEFAULT_REFERRAL_EXPIRATION_DAYS = 30;

// Attribution window (30 days)
const ATTRIBUTION_WINDOW_DAYS = 30;

// =============================================================================
// Affiliate Service
// =============================================================================

class AffiliateService {
  // ===========================================================================
  // Partner Management
  // ===========================================================================

  /**
   * Create a new affiliate partner
   */
  async createPartner(input: CreatePartnerInput): Promise<Partner> {
    const now = new Date();

    const partnerData = {
      name: input.name,
      slug: input.slug,
      type: input.type,
      description: input.description,
      logo_url: input.logoUrl,
      website_url: input.websiteUrl,
      api_endpoint: input.apiEndpoint,
      commission_type: input.commissionType,
      commission_rate: input.commissionRate,
      commission_fixed: input.commissionFixed,
      min_payout: input.minPayout || 50,
      payout_frequency: input.payoutFrequency || "monthly",
      payment_method: input.paymentMethod || "stripe",
      stripe_account_id: input.stripeAccountId,
      regions: input.regions || ["US"],
      is_active: true,
      metadata: input.metadata,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data, error } = await supabase
      .from("affiliate_partners")
      .insert(partnerData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create partner: ${error.message}`);
    }

    return this.mapPartner(data);
  }

  /**
   * Update an existing partner
   */
  async updatePartner(id: string, input: UpdatePartnerInput): Promise<Partner> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl;
    if (input.websiteUrl !== undefined)
      updateData.website_url = input.websiteUrl;
    if (input.apiEndpoint !== undefined)
      updateData.api_endpoint = input.apiEndpoint;
    if (input.commissionType !== undefined)
      updateData.commission_type = input.commissionType;
    if (input.commissionRate !== undefined)
      updateData.commission_rate = input.commissionRate;
    if (input.commissionFixed !== undefined)
      updateData.commission_fixed = input.commissionFixed;
    if (input.minPayout !== undefined) updateData.min_payout = input.minPayout;
    if (input.payoutFrequency !== undefined)
      updateData.payout_frequency = input.payoutFrequency;
    if (input.paymentMethod !== undefined)
      updateData.payment_method = input.paymentMethod;
    if (input.stripeAccountId !== undefined)
      updateData.stripe_account_id = input.stripeAccountId;
    if (input.regions !== undefined) updateData.regions = input.regions;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const { data, error } = await supabase
      .from("affiliate_partners")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update partner: ${error.message}`);
    }

    return this.mapPartner(data);
  }

  /**
   * Get a partner by ID
   */
  async getPartner(id: string): Promise<Partner | null> {
    const { data, error } = await supabase
      .from("affiliate_partners")
      .select()
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to get partner: ${error.message}`);
    }

    return this.mapPartner(data);
  }

  /**
   * Get a partner by slug
   */
  async getPartnerBySlug(slug: string): Promise<Partner | null> {
    const { data, error } = await supabase
      .from("affiliate_partners")
      .select()
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to get partner: ${error.message}`);
    }

    return this.mapPartner(data);
  }

  /**
   * List all partners
   */
  async listPartners(filters?: {
    type?: string;
    isActive?: boolean;
    region?: string;
  }): Promise<Partner[]> {
    let query = supabase.from("affiliate_partners").select();

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }
    if (filters?.region) {
      query = query.contains("regions", [filters.region]);
    }

    const { data, error } = await query.order("name");

    if (error) {
      throw new Error(`Failed to list partners: ${error.message}`);
    }

    return (data || []).map(this.mapPartner);
  }

  /**
   * Delete a partner (soft delete by deactivating)
   */
  async deletePartner(id: string): Promise<void> {
    await this.updatePartner(id, { isActive: false });
  }

  // ===========================================================================
  // Referral Codes
  // ===========================================================================

  /**
   * Generate a unique referral code
   */
  async generateReferralCode(
    input: CreateReferralCodeInput,
  ): Promise<ReferralCode> {
    const code = input.customCode || this.createUniqueCode();
    const expiresAt =
      input.expiresAt ||
      new Date(
        Date.now() + DEFAULT_REFERRAL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      );

    const codeData = {
      code,
      user_id: input.userId,
      partner_id: input.partnerId,
      campaign_id: input.campaignId,
      uses_count: 0,
      max_uses: input.maxUses,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("referral_codes")
      .insert(codeData)
      .select()
      .single();

    if (error) {
      // Handle duplicate code
      if (error.code === "23505") {
        // Retry with new code
        return this.generateReferralCode({
          ...input,
          customCode: this.createUniqueCode(),
        });
      }
      throw new Error(`Failed to create referral code: ${error.message}`);
    }

    return this.mapReferralCode(data);
  }

  /**
   * Validate a referral code
   */
  async validateReferralCode(code: string): Promise<ReferralValidation> {
    const { data, error } = await supabase
      .from("referral_codes")
      .select()
      .eq("code", code.toUpperCase())
      .single();

    if (error || !data) {
      return { valid: false, error: "Invalid referral code" };
    }

    // Check if active
    if (!data.is_active) {
      return { valid: false, error: "Referral code is no longer active" };
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: "Referral code has expired" };
    }

    // Check max uses
    if (data.max_uses && data.uses_count >= data.max_uses) {
      return { valid: false, error: "Referral code has reached maximum uses" };
    }

    return {
      valid: true,
      code: this.mapReferralCode(data),
    };
  }

  /**
   * Apply a referral code (increment usage)
   */
  async applyReferralCode(userId: string, code: string): Promise<void> {
    const validation = await this.validateReferralCode(code);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Increment usage count
    await supabase
      .from("referral_codes")
      .update({ uses_count: (validation.code!.usesCount || 0) + 1 })
      .eq("code", code.toUpperCase());

    // Create attribution record
    await this.createAttribution({
      userId,
      referralCode: code.toUpperCase(),
      referrerId: validation.code!.userId,
      partnerId: validation.code!.partnerId,
      campaignId: validation.code!.campaignId,
    });
  }

  /**
   * Get referral codes for a user
   */
  async getUserReferralCodes(userId: string): Promise<ReferralCode[]> {
    const { data, error } = await supabase
      .from("referral_codes")
      .select()
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get referral codes: ${error.message}`);
    }

    return (data || []).map(this.mapReferralCode);
  }

  /**
   * Deactivate a referral code
   */
  async deactivateReferralCode(code: string): Promise<void> {
    const { error } = await supabase
      .from("referral_codes")
      .update({ is_active: false })
      .eq("code", code.toUpperCase());

    if (error) {
      throw new Error(`Failed to deactivate referral code: ${error.message}`);
    }
  }

  // ===========================================================================
  // Attribution
  // ===========================================================================

  /**
   * Create an attribution record
   */
  async createAttribution(data: {
    userId: string;
    referralCode?: string;
    referrerId?: string;
    partnerId?: string;
    campaignId?: string;
    clickId?: string;
  }): Promise<Attribution> {
    const expiresAt = new Date(
      Date.now() + ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const attributionData = {
      user_id: data.userId,
      referral_code: data.referralCode,
      referrer_id: data.referrerId,
      partner_id: data.partnerId,
      campaign_id: data.campaignId,
      first_click_id: data.clickId,
      last_click_id: data.clickId,
      attributed_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    // Use upsert to handle existing attribution
    const { data: result, error } = await supabase
      .from("user_attributions")
      .upsert(attributionData, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create attribution: ${error.message}`);
    }

    return this.mapAttribution(result);
  }

  /**
   * Get attribution for a user
   */
  async getUserAttribution(userId: string): Promise<Attribution | null> {
    const { data, error } = await supabase
      .from("user_attributions")
      .select()
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to get attribution: ${error.message}`);
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return this.mapAttribution(data);
  }

  /**
   * Update last click for attribution
   */
  async updateLastClick(userId: string, clickId: string): Promise<void> {
    const { error } = await supabase
      .from("user_attributions")
      .update({ last_click_id: clickId })
      .eq("user_id", userId);

    if (error) {
      // AffiliateService error: Failed to update last click
    }
  }

  /**
   * Get referrer user ID for commission calculation
   */
  async getReferrer(userId: string): Promise<string | null> {
    const attribution = await this.getUserAttribution(userId);
    return attribution?.referrerId || null;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Create a unique referral code
   */
  private createUniqueCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Map database row to Partner type
   */
  private mapPartner(row: Record<string, unknown>): Partner {
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      type: row.type as Partner["type"],
      description: row.description as string | undefined,
      logoUrl: row.logo_url as string | undefined,
      websiteUrl: row.website_url as string | undefined,
      apiEndpoint: row.api_endpoint as string | undefined,
      commissionType: row.commission_type as Partner["commissionType"],
      commissionRate: row.commission_rate as number | undefined,
      commissionFixed: row.commission_fixed as number | undefined,
      minPayout: row.min_payout as number,
      payoutFrequency: row.payout_frequency as Partner["payoutFrequency"],
      paymentMethod: row.payment_method as Partner["paymentMethod"],
      stripeAccountId: row.stripe_account_id as string | undefined,
      regions: row.regions as string[],
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      metadata: row.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * Map database row to ReferralCode type
   */
  private mapReferralCode(row: Record<string, unknown>): ReferralCode {
    return {
      id: row.id as string,
      code: row.code as string,
      userId: row.user_id as string,
      partnerId: row.partner_id as string | undefined,
      campaignId: row.campaign_id as string | undefined,
      usesCount: row.uses_count as number,
      maxUses: row.max_uses as number | undefined,
      expiresAt: row.expires_at
        ? new Date(row.expires_at as string)
        : undefined,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
    };
  }

  /**
   * Map database row to Attribution type
   */
  private mapAttribution(row: Record<string, unknown>): Attribution {
    return {
      userId: row.user_id as string,
      referralCode: row.referral_code as string | undefined,
      referrerId: row.referrer_id as string | undefined,
      partnerId: row.partner_id as string | undefined,
      campaignId: row.campaign_id as string | undefined,
      firstClickId: row.first_click_id as string | undefined,
      lastClickId: row.last_click_id as string | undefined,
      attributedAt: new Date(row.attributed_at as string),
      expiresAt: row.expires_at
        ? new Date(row.expires_at as string)
        : undefined,
    };
  }
}

// Export singleton
export const affiliateService = new AffiliateService();
export default affiliateService;
