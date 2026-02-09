/**
 * Offer Service
 *
 * Manages financial product offers, matching, and compliance.
 */

import { createClient } from '@supabase/supabase-js';
import {
  Offer,
  OfferCategory,
  OfferStatus,
  CreateOfferInput,
  UpdateOfferInput,
  MatchRequest,
  MatchResult,
  UserProfile,
  EligibilityResult,
  OfferDisclosure,
  Impression,
  OfferClick,
  OfferComparison,
  ComparisonField,
} from './types';
import { trackingService } from '../affiliate/tracking-service';

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// Offer Service
// =============================================================================

class OfferService {
  // ===========================================================================
  // Offer CRUD
  // ===========================================================================

  /**
   * Create a new offer
   */
  async createOffer(input: CreateOfferInput): Promise<Offer> {
    const now = new Date();

    // Get partner name
    const { data: partner } = await supabase
      .from('affiliate_partners')
      .select('name')
      .eq('id', input.partnerId)
      .single();

    const offerData = {
      partner_id: input.partnerId,
      partner_name: partner?.name || 'Unknown Partner',
      category: input.category,
      name: input.name,
      headline: input.headline,
      description: input.description,
      image_url: input.imageUrl,
      destination_url: input.destinationUrl,
      apr: input.apr,
      fees: input.fees,
      rewards: input.rewards,
      credit_limit: input.creditLimit,
      loan_amount: input.loanAmount,
      min_credit_score: input.minCreditScore,
      max_credit_score: input.maxCreditScore,
      min_income: input.minIncome,
      residency_requirements: input.residencyRequirements,
      age_requirement: input.ageRequirement,
      affiliate_offer_id: input.affiliateOfferId,
      commission_type: input.commissionType,
      commission_value: input.commissionValue,
      rank: input.rank || 100,
      featured: input.featured || false,
      badge: input.badge,
      tags: input.tags,
      disclosure_id: input.disclosureId,
      legal_disclaimer: input.legalDisclaimer,
      sponsored_content: input.sponsoredContent || false,
      status: 'active' as OfferStatus,
      start_date: input.startDate?.toISOString(),
      end_date: input.endDate?.toISOString(),
      regions: input.regions || ['US'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      metadata: input.metadata,
    };

    const { data, error } = await supabase
      .from('offers')
      .insert(offerData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create offer: ${error.message}`);
    }

    return this.mapOffer(data);
  }

  /**
   * Update an offer
   */
  async updateOffer(id: string, input: UpdateOfferInput): Promise<Offer> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.headline !== undefined) updateData.headline = input.headline;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
    if (input.destinationUrl !== undefined) updateData.destination_url = input.destinationUrl;
    if (input.apr !== undefined) updateData.apr = input.apr;
    if (input.fees !== undefined) updateData.fees = input.fees;
    if (input.rewards !== undefined) updateData.rewards = input.rewards;
    if (input.creditLimit !== undefined) updateData.credit_limit = input.creditLimit;
    if (input.loanAmount !== undefined) updateData.loan_amount = input.loanAmount;
    if (input.minCreditScore !== undefined) updateData.min_credit_score = input.minCreditScore;
    if (input.maxCreditScore !== undefined) updateData.max_credit_score = input.maxCreditScore;
    if (input.minIncome !== undefined) updateData.min_income = input.minIncome;
    if (input.residencyRequirements !== undefined)
      updateData.residency_requirements = input.residencyRequirements;
    if (input.ageRequirement !== undefined) updateData.age_requirement = input.ageRequirement;
    if (input.affiliateOfferId !== undefined)
      updateData.affiliate_offer_id = input.affiliateOfferId;
    if (input.commissionType !== undefined) updateData.commission_type = input.commissionType;
    if (input.commissionValue !== undefined) updateData.commission_value = input.commissionValue;
    if (input.rank !== undefined) updateData.rank = input.rank;
    if (input.featured !== undefined) updateData.featured = input.featured;
    if (input.badge !== undefined) updateData.badge = input.badge;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.disclosureId !== undefined) updateData.disclosure_id = input.disclosureId;
    if (input.legalDisclaimer !== undefined) updateData.legal_disclaimer = input.legalDisclaimer;
    if (input.sponsoredContent !== undefined) updateData.sponsored_content = input.sponsoredContent;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.startDate !== undefined) updateData.start_date = input.startDate?.toISOString();
    if (input.endDate !== undefined) updateData.end_date = input.endDate?.toISOString();
    if (input.regions !== undefined) updateData.regions = input.regions;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const { data, error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update offer: ${error.message}`);
    }

    return this.mapOffer(data);
  }

  /**
   * Get offer by ID
   */
  async getOffer(id: string): Promise<Offer | null> {
    const { data, error } = await supabase.from('offers').select().eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get offer: ${error.message}`);
    }

    return this.mapOffer(data);
  }

  /**
   * List offers with filters
   */
  async listOffers(filters?: {
    category?: OfferCategory;
    status?: OfferStatus;
    partnerId?: string;
    featured?: boolean;
    region?: string;
    limit?: number;
    offset?: number;
  }): Promise<Offer[]> {
    let query = supabase.from('offers').select();

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.partnerId) {
      query = query.eq('partner_id', filters.partnerId);
    }
    if (filters?.featured !== undefined) {
      query = query.eq('featured', filters.featured);
    }
    if (filters?.region) {
      query = query.contains('regions', [filters.region]);
    }

    query = query.order('rank', { ascending: true });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list offers: ${error.message}`);
    }

    return (data || []).map(this.mapOffer);
  }

  /**
   * Archive an offer
   */
  async archiveOffer(id: string): Promise<void> {
    await this.updateOffer(id, { status: 'archived' });
  }

  // ===========================================================================
  // Offer Matching
  // ===========================================================================

  /**
   * Match offers to user profile
   */
  async matchOffers(request: MatchRequest): Promise<MatchResult[]> {
    // Get active offers for the category
    let query = supabase
      .from('offers')
      .select()
      .eq('category', request.category)
      .eq('status', 'active');

    if (request.region) {
      query = query.contains('regions', [request.region]);
    }

    if (request.excludePartners && request.excludePartners.length > 0) {
      query = query.not('partner_id', 'in', `(${request.excludePartners.join(',')})`);
    }

    if (!request.includeSponsored) {
      query = query.eq('sponsored_content', false);
    }

    const { data: offers, error } = await query.order('rank', { ascending: true });

    if (error) {
      throw new Error(`Failed to match offers: ${error.message}`);
    }

    // Score and rank offers
    const results: MatchResult[] = [];

    for (const offerData of offers || []) {
      const offer = this.mapOffer(offerData);
      const eligibility = this.checkEligibility(offer, request.profile);
      const matchScore = this.calculateMatchScore(offer, request.profile);
      const highlights = this.generateHighlights(offer, request.profile);
      const disclosures = await this.getOfferDisclosures(offer.id);

      results.push({
        offer,
        matchScore,
        eligibility: eligibility.result,
        eligibilityReasons: eligibility.reasons,
        highlights,
        disclosures,
      });
    }

    // Sort by score and apply limit
    results.sort((a, b) => b.matchScore - a.matchScore);

    if (request.limit) {
      return results.slice(0, request.limit);
    }

    return results;
  }

  /**
   * Check user eligibility for an offer
   */
  checkEligibility(
    offer: Offer,
    profile: UserProfile
  ): { result: EligibilityResult; reasons: string[] } {
    const reasons: string[] = [];
    let result: EligibilityResult = 'eligible';

    // Credit score check
    if (offer.minCreditScore && profile.creditScore) {
      if (profile.creditScore < offer.minCreditScore) {
        reasons.push(`Minimum credit score ${offer.minCreditScore} required`);
        result = 'ineligible';
      }
    }

    if (offer.maxCreditScore && profile.creditScore) {
      if (profile.creditScore > offer.maxCreditScore) {
        reasons.push(`Maximum credit score ${offer.maxCreditScore}`);
        result = 'ineligible';
      }
    }

    // Income check
    if (offer.minIncome && profile.income) {
      if (profile.income < offer.minIncome) {
        reasons.push(`Minimum income $${offer.minIncome.toLocaleString()} required`);
        result = 'ineligible';
      }
    }

    // Age check
    if (offer.ageRequirement && profile.age) {
      if (profile.age < offer.ageRequirement.min) {
        reasons.push(`Minimum age ${offer.ageRequirement.min} required`);
        result = 'ineligible';
      }
      if (offer.ageRequirement.max && profile.age > offer.ageRequirement.max) {
        reasons.push(`Maximum age ${offer.ageRequirement.max}`);
        result = 'ineligible';
      }
    }

    // Residency check
    if (offer.residencyRequirements && offer.residencyRequirements.length > 0) {
      if (profile.residency && !offer.residencyRequirements.includes(profile.residency)) {
        reasons.push('Not available in your state/country');
        result = 'ineligible';
      }
    }

    // If missing required info, mark for review
    if (result === 'eligible') {
      if (!profile.creditScore && offer.minCreditScore) {
        result = 'needs_review';
        reasons.push('Credit score needed for final eligibility');
      }
      if (!profile.income && offer.minIncome) {
        result = 'needs_review';
        reasons.push('Income verification needed');
      }
    }

    if (result === 'eligible') {
      reasons.push('You meet all eligibility requirements');
    }

    return { result, reasons };
  }

  /**
   * Calculate match score (0-100)
   */
  calculateMatchScore(offer: Offer, profile: UserProfile): number {
    let score = 50; // Base score

    // Credit score fit
    if (profile.creditScore && offer.minCreditScore) {
      const buffer = profile.creditScore - offer.minCreditScore;
      if (buffer >= 50) score += 15;
      else if (buffer >= 20) score += 10;
      else if (buffer >= 0) score += 5;
      else score -= 20; // Below minimum
    }

    // Income fit
    if (profile.income && offer.minIncome) {
      const ratio = profile.income / offer.minIncome;
      if (ratio >= 2) score += 10;
      else if (ratio >= 1.5) score += 7;
      else if (ratio >= 1) score += 3;
      else score -= 15;
    }

    // Preference matching
    if (profile.preferences) {
      // Rewards preference
      if (profile.preferences.rewardsType && offer.rewards) {
        if (offer.rewards.type === profile.preferences.rewardsType) {
          score += 10;
        }
      }

      // No annual fee preference
      if (profile.preferences.noAnnualFee && offer.fees) {
        if (offer.fees.noFees || offer.fees.annual === 0) {
          score += 8;
        } else if (offer.fees.annual && offer.fees.annual > 100) {
          score -= 10;
        }
      }

      // Low APR preference
      if (profile.preferences.lowApr && offer.apr) {
        if (offer.apr.min < 15) score += 8;
        else if (offer.apr.min < 20) score += 4;
      }

      // Signup bonus preference
      if (profile.preferences.signupBonus && offer.rewards?.signupBonus) {
        if (offer.rewards.signupBonus >= 500) score += 10;
        else if (offer.rewards.signupBonus >= 200) score += 5;
      }
    }

    // Featured bonus
    if (offer.featured) score += 5;

    // Normalize to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate offer highlights for a user
   */
  generateHighlights(offer: Offer, profile: UserProfile): string[] {
    const highlights: string[] = [];

    // APR highlight
    if (offer.apr) {
      if (offer.apr.introRate !== undefined && offer.apr.introPeriodMonths) {
        highlights.push(`${offer.apr.introRate}% intro APR for ${offer.apr.introPeriodMonths} months`);
      } else if (offer.apr.min < 15) {
        highlights.push(`Low ${offer.apr.min}% APR`);
      }
    }

    // Rewards highlight
    if (offer.rewards) {
      if (offer.rewards.signupBonus) {
        highlights.push(`Earn ${offer.rewards.signupBonus} bonus after spending $${offer.rewards.signupBonusSpend}`);
      }
      if (offer.rewards.earnRate > 1.5) {
        highlights.push(`Earn ${offer.rewards.earnRate}% ${offer.rewards.type}`);
      }
    }

    // Fee highlight
    if (offer.fees) {
      if (offer.fees.noFees || offer.fees.annual === 0) {
        highlights.push('No annual fee');
      }
      if (offer.fees.foreignTransaction === 0) {
        highlights.push('No foreign transaction fees');
      }
    }

    // Loan amount highlight
    if (offer.loanAmount) {
      highlights.push(`Borrow up to $${offer.loanAmount.max.toLocaleString()}`);
    }

    // Credit limit highlight
    if (offer.creditLimit?.prequalification) {
      highlights.push('Check your rate without affecting credit score');
    }

    // Badge
    if (offer.badge) {
      highlights.push(offer.badge);
    }

    return highlights.slice(0, 4); // Limit to 4 highlights
  }

  // ===========================================================================
  // Comparison
  // ===========================================================================

  /**
   * Compare multiple offers
   */
  async compareOffers(offerIds: string[]): Promise<OfferComparison> {
    const offers: Offer[] = [];

    for (const id of offerIds) {
      const offer = await this.getOffer(id);
      if (offer) offers.push(offer);
    }

    if (offers.length === 0) {
      throw new Error('No valid offers found for comparison');
    }

    // Determine comparison fields based on category
    const category = offers[0].category;
    const fields = this.getComparisonFields(category);

    // Extract values for each offer
    const values: Record<string, Record<string, unknown>> = {};

    for (const offer of offers) {
      values[offer.id] = this.extractComparisonValues(offer, fields);
    }

    // Determine winner
    const winner = this.determineWinner(offers, fields, values);

    return {
      offers,
      fields,
      values,
      winner,
    };
  }

  /**
   * Get comparison fields for a category
   */
  private getComparisonFields(category: OfferCategory): ComparisonField[] {
    const commonFields: ComparisonField[] = [
      { key: 'apr', label: 'APR', type: 'percentage', higherIsBetter: false },
      { key: 'annualFee', label: 'Annual Fee', type: 'currency', higherIsBetter: false },
    ];

    switch (category) {
      case 'credit_card':
        return [
          ...commonFields,
          { key: 'rewardsRate', label: 'Rewards Rate', type: 'percentage', higherIsBetter: true },
          { key: 'signupBonus', label: 'Signup Bonus', type: 'currency', higherIsBetter: true },
          { key: 'foreignTxFee', label: 'Foreign Transaction Fee', type: 'percentage', higherIsBetter: false },
        ];

      case 'personal_loan':
      case 'debt_consolidation':
        return [
          ...commonFields,
          { key: 'minAmount', label: 'Min Loan Amount', type: 'currency' },
          { key: 'maxAmount', label: 'Max Loan Amount', type: 'currency', higherIsBetter: true },
          { key: 'originationFee', label: 'Origination Fee', type: 'percentage', higherIsBetter: false },
        ];

      case 'mortgage':
        return [
          { key: 'apr', label: 'APR', type: 'percentage', higherIsBetter: false },
          { key: 'points', label: 'Points', type: 'number', higherIsBetter: false },
          { key: 'closingCosts', label: 'Closing Costs', type: 'text' },
        ];

      default:
        return commonFields;
    }
  }

  /**
   * Extract comparison values from an offer
   */
  private extractComparisonValues(
    offer: Offer,
    fields: ComparisonField[]
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {};

    for (const field of fields) {
      switch (field.key) {
        case 'apr':
          values[field.key] = offer.apr?.min;
          break;
        case 'annualFee':
          values[field.key] = offer.fees?.annual || 0;
          break;
        case 'rewardsRate':
          values[field.key] = offer.rewards?.earnRate;
          break;
        case 'signupBonus':
          values[field.key] = offer.rewards?.signupBonus;
          break;
        case 'foreignTxFee':
          values[field.key] = offer.fees?.foreignTransaction;
          break;
        case 'minAmount':
          values[field.key] = offer.loanAmount?.min;
          break;
        case 'maxAmount':
          values[field.key] = offer.loanAmount?.max;
          break;
        case 'originationFee':
          values[field.key] = offer.fees?.originationPercent;
          break;
        default:
          values[field.key] = null;
      }
    }

    return values;
  }

  /**
   * Determine the winner in a comparison
   */
  private determineWinner(
    offers: Offer[],
    fields: ComparisonField[],
    values: Record<string, Record<string, unknown>>
  ): { offerId: string; reason: string } | undefined {
    const scores: Record<string, number> = {};

    // Initialize scores
    for (const offer of offers) {
      scores[offer.id] = 0;
    }

    // Score each field
    for (const field of fields) {
      const fieldValues = offers
        .map(o => ({ offerId: o.id, value: values[o.id][field.key] as number }))
        .filter(v => v.value !== null && v.value !== undefined);

      if (fieldValues.length === 0) continue;

      // Sort and assign points
      fieldValues.sort((a, b) =>
        field.higherIsBetter ? b.value - a.value : a.value - b.value
      );

      // Best gets 3 points, second gets 1
      if (fieldValues.length > 0) scores[fieldValues[0].offerId] += 3;
      if (fieldValues.length > 1) scores[fieldValues[1].offerId] += 1;
    }

    // Find winner
    let maxScore = 0;
    let winnerId: string | undefined;

    for (const [offerId, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winnerId = offerId;
      }
    }

    if (!winnerId) return undefined;

    const winner = offers.find(o => o.id === winnerId);
    return {
      offerId: winnerId,
      reason: `${winner?.name} offers the best overall value`,
    };
  }

  // ===========================================================================
  // Tracking
  // ===========================================================================

  /**
   * Track offer impression
   */
  async trackImpression(
    offerId: string,
    page: string,
    position: number,
    userId?: string,
    sessionId?: string
  ): Promise<Impression> {
    const impressionData = {
      offer_id: offerId,
      user_id: userId,
      session_id: sessionId,
      page,
      position,
      impressed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('offer_impressions')
      .insert(impressionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to track impression: ${error.message}`);
    }

    return {
      id: data.id,
      offerId: data.offer_id,
      userId: data.user_id,
      sessionId: data.session_id,
      page: data.page,
      position: data.position,
      impressedAt: new Date(data.impressed_at),
    };
  }

  /**
   * Track offer click and redirect
   */
  async trackClick(
    offerId: string,
    sourcePage: string,
    userId?: string,
    sessionId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ clickId: string; destinationUrl: string }> {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error(`Offer not found: ${offerId}`);
    }

    // Track click through affiliate system
    const click = await trackingService.trackClick({
      userId,
      partnerId: offer.partnerId,
      offerId: offer.id,
      sourcePage,
      destinationUrl: offer.destinationUrl,
      userAgent,
      ipAddress,
      sessionId,
    });

    // Record in offer clicks table
    await supabase.from('offer_clicks').insert({
      offer_id: offerId,
      user_id: userId,
      session_id: sessionId,
      click_id: click.clickId,
      source_page: sourcePage,
      clicked_at: new Date().toISOString(),
    });

    // Build tracking URL
    const destinationUrl = this.buildTrackingUrl(offer.destinationUrl, click.clickId);

    return {
      clickId: click.clickId,
      destinationUrl,
    };
  }

  /**
   * Build tracking URL with click ID
   */
  private buildTrackingUrl(baseUrl: string, clickId: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('fynvita_click', clickId);
    return url.toString();
  }

  // ===========================================================================
  // Disclosures
  // ===========================================================================

  /**
   * Get disclosures for an offer
   */
  async getOfferDisclosures(offerId: string): Promise<OfferDisclosure[]> {
    const { data, error } = await supabase
      .from('offer_disclosures')
      .select(
        `
        offer_id,
        disclosure_id,
        must_display,
        display_location,
        disclosures (
          type,
          short_text,
          full_text
        )
      `
      )
      .eq('offer_id', offerId);

    if (error) {
      throw new Error(`Failed to get disclosures: ${error.message}`);
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      offerId: row.offer_id as string,
      disclosureId: row.disclosure_id as string,
      disclosureType: (row.disclosures as Record<string, unknown>)?.type as OfferDisclosure['disclosureType'],
      shortText: (row.disclosures as Record<string, unknown>)?.short_text as string,
      fullText: (row.disclosures as Record<string, unknown>)?.full_text as string,
      mustDisplay: row.must_display as boolean,
      displayLocation: row.display_location as OfferDisclosure['displayLocation'],
    }));
  }

  /**
   * Get advertiser disclosure for the platform
   */
  async getAdvertiserDisclosure(): Promise<string> {
    const { data } = await supabase
      .from('disclosures')
      .select('full_text')
      .eq('type', 'advertiser_disclosure')
      .eq('is_active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    return (
      data?.full_text ||
      'We may receive compensation from our partners for featured products. This does not influence our editorial content.'
    );
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Map database row to Offer type
   */
  private mapOffer(row: Record<string, unknown>): Offer {
    return {
      id: row.id as string,
      partnerId: row.partner_id as string,
      partnerName: row.partner_name as string,
      category: row.category as OfferCategory,
      name: row.name as string,
      headline: row.headline as string,
      description: row.description as string,
      imageUrl: row.image_url as string | undefined,
      destinationUrl: row.destination_url as string,
      apr: row.apr as Offer['apr'],
      fees: row.fees as Offer['fees'],
      rewards: row.rewards as Offer['rewards'],
      creditLimit: row.credit_limit as Offer['creditLimit'],
      loanAmount: row.loan_amount as Offer['loanAmount'],
      minCreditScore: row.min_credit_score as number | undefined,
      maxCreditScore: row.max_credit_score as number | undefined,
      minIncome: row.min_income as number | undefined,
      residencyRequirements: row.residency_requirements as string[] | undefined,
      ageRequirement: row.age_requirement as Offer['ageRequirement'],
      affiliateOfferId: row.affiliate_offer_id as string | undefined,
      commissionType: row.commission_type as Offer['commissionType'],
      commissionValue: row.commission_value as number,
      rank: row.rank as number,
      featured: row.featured as boolean,
      badge: row.badge as string | undefined,
      tags: row.tags as string[] | undefined,
      disclosureId: row.disclosure_id as string,
      legalDisclaimer: row.legal_disclaimer as string | undefined,
      sponsoredContent: row.sponsored_content as boolean,
      status: row.status as OfferStatus,
      startDate: row.start_date ? new Date(row.start_date as string) : undefined,
      endDate: row.end_date ? new Date(row.end_date as string) : undefined,
      regions: row.regions as string[],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      metadata: row.metadata as Record<string, unknown> | undefined,
    };
  }
}

// Export singleton
export const offerService = new OfferService();
export default offerService;
