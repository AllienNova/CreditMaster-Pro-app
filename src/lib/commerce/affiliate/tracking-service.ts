/**
 * Affiliate Tracking Service
 *
 * Handles click tracking, conversion tracking, and analytics for the affiliate system.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';
import {
  Click,
  ClickData,
  ClickStats,
  Conversion,
  ConversionData,
  ConversionStats,
  ConversionStatus,
  DateRange,
  PartnerPerformance,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for tracking operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Click deduplication window (5 minutes)
const CLICK_DEDUP_WINDOW_MS = 5 * 60 * 1000;

// =============================================================================
// Tracking Service
// =============================================================================

class TrackingService {
  // ===========================================================================
  // Click Tracking
  // ===========================================================================

  /**
   * Track a click event
   */
  async trackClick(data: ClickData): Promise<Click> {
    const clickId = this.generateClickId();
    const ipHash = data.ipAddress ? this.hashIp(data.ipAddress) : undefined;

    // Check for duplicate clicks
    const isDuplicate = await this.isDuplicateClick(
      data.userId,
      data.partnerId,
      data.offerId,
      ipHash
    );

    if (isDuplicate) {
      // Return existing click without creating a new one
      const existingClick = await this.getRecentClick(
        data.userId,
        data.partnerId,
        data.offerId,
        ipHash
      );
      if (existingClick) return existingClick;
    }

    const clickRecord = {
      click_id: clickId,
      user_id: data.userId,
      partner_id: data.partnerId,
      offer_id: data.offerId,
      referral_code: data.referralCode,
      source_page: data.sourcePage,
      destination_url: data.destinationUrl,
      user_agent: data.userAgent,
      ip_hash: ipHash,
      session_id: data.sessionId,
      clicked_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('affiliate_clicks')
      .insert(clickRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to track click: ${error.message}`);
    }

    return this.mapClick(result);
  }

  /**
   * Get click by ID
   */
  async getClick(clickId: string): Promise<Click | null> {
    const { data, error } = await supabase
      .from('affiliate_clicks')
      .select()
      .eq('click_id', clickId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get click: ${error.message}`);
    }

    return this.mapClick(data);
  }

  /**
   * Get clicks for a user
   */
  async getUserClicks(
    userId: string,
    dateRange?: DateRange
  ): Promise<Click[]> {
    let query = supabase
      .from('affiliate_clicks')
      .select()
      .eq('user_id', userId);

    if (dateRange) {
      query = query
        .gte('clicked_at', dateRange.from.toISOString())
        .lte('clicked_at', dateRange.to.toISOString());
    }

    const { data, error } = await query.order('clicked_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user clicks: ${error.message}`);
    }

    return (data || []).map(this.mapClick);
  }

  /**
   * Get click statistics for a partner
   */
  async getClickStats(partnerId: string, dateRange: DateRange): Promise<ClickStats> {
    const { data: clicks, error } = await supabase
      .from('affiliate_clicks')
      .select('*')
      .eq('partner_id', partnerId)
      .gte('clicked_at', dateRange.from.toISOString())
      .lte('clicked_at', dateRange.to.toISOString());

    if (error) {
      throw new Error(`Failed to get click stats: ${error.message}`);
    }

    const clickList = clicks || [];
    const uniqueUsers = new Set(clickList.filter(c => c.user_id).map(c => c.user_id));

    // Group by source page
    const clicksBySource: Record<string, number> = {};
    clickList.forEach(click => {
      const source = click.source_page || 'unknown';
      clicksBySource[source] = (clicksBySource[source] || 0) + 1;
    });

    // Group by day
    const clicksByDay = this.groupByDay(
      clickList.map(c => new Date(c.clicked_at))
    );

    return {
      partnerId,
      period: dateRange,
      totalClicks: clickList.length,
      uniqueUsers: uniqueUsers.size,
      clicksBySource,
      clicksByDay,
    };
  }

  // ===========================================================================
  // Conversion Tracking
  // ===========================================================================

  /**
   * Track a conversion event
   */
  async trackConversion(data: ConversionData): Promise<Conversion> {
    // Get commission rate from partner
    const commission = await this.calculateCommission(
      data.partnerId,
      data.type,
      data.value || 0
    );

    const conversionRecord = {
      click_id: data.clickId,
      user_id: data.userId,
      partner_id: data.partnerId,
      offer_id: data.offerId,
      type: data.type,
      status: 'pending' as ConversionStatus,
      value: data.value || 0,
      commission_earned: commission,
      partner_reference: data.partnerReference,
      converted_at: new Date().toISOString(),
      metadata: data.metadata,
    };

    const { data: result, error } = await supabase
      .from('affiliate_conversions')
      .insert(conversionRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to track conversion: ${error.message}`);
    }

    return this.mapConversion(result);
  }

  /**
   * Update conversion status
   */
  async updateConversionStatus(
    conversionId: string,
    status: ConversionStatus,
    rejectionReason?: string
  ): Promise<Conversion> {
    const updateData: Record<string, unknown> = { status };

    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    } else if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    } else if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase
      .from('affiliate_conversions')
      .update(updateData)
      .eq('id', conversionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversion: ${error.message}`);
    }

    return this.mapConversion(data);
  }

  /**
   * Get conversion by ID
   */
  async getConversion(conversionId: string): Promise<Conversion | null> {
    const { data, error } = await supabase
      .from('affiliate_conversions')
      .select()
      .eq('id', conversionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get conversion: ${error.message}`);
    }

    return this.mapConversion(data);
  }

  /**
   * Get conversions for a user
   */
  async getUserConversions(
    userId: string,
    dateRange?: DateRange
  ): Promise<Conversion[]> {
    let query = supabase
      .from('affiliate_conversions')
      .select()
      .eq('user_id', userId);

    if (dateRange) {
      query = query
        .gte('converted_at', dateRange.from.toISOString())
        .lte('converted_at', dateRange.to.toISOString());
    }

    const { data, error } = await query.order('converted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user conversions: ${error.message}`);
    }

    return (data || []).map(this.mapConversion);
  }

  /**
   * Get conversion statistics for a partner
   */
  async getConversionStats(
    partnerId: string,
    dateRange: DateRange
  ): Promise<ConversionStats> {
    const { data: conversions, error: convError } = await supabase
      .from('affiliate_conversions')
      .select('*')
      .eq('partner_id', partnerId)
      .gte('converted_at', dateRange.from.toISOString())
      .lte('converted_at', dateRange.to.toISOString());

    if (convError) {
      throw new Error(`Failed to get conversion stats: ${convError.message}`);
    }

    // Get click count for conversion rate
    const { count: clickCount, error: clickError } = await supabase
      .from('affiliate_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)
      .gte('clicked_at', dateRange.from.toISOString())
      .lte('clicked_at', dateRange.to.toISOString());

    if (clickError) {
      throw new Error(`Failed to get click count: ${clickError.message}`);
    }

    const conversionList = conversions || [];
    const totalClicks = clickCount || 0;

    // Group by type
    const conversionsByType: Record<string, number> = {};
    conversionList.forEach(conv => {
      conversionsByType[conv.type] = (conversionsByType[conv.type] || 0) + 1;
    });

    // Group by status
    const conversionsByStatus: Record<string, number> = {};
    conversionList.forEach(conv => {
      conversionsByStatus[conv.status] = (conversionsByStatus[conv.status] || 0) + 1;
    });

    // Calculate totals
    const totalValue = conversionList.reduce((sum, c) => sum + (c.value || 0), 0);
    const totalCommission = conversionList.reduce(
      (sum, c) => sum + (c.commission_earned || 0),
      0
    );

    // Group by day
    const conversionsByDay = this.groupConversionsByDay(
      conversionList.map(c => ({
        date: new Date(c.converted_at),
        value: c.value || 0,
      }))
    );

    return {
      partnerId,
      period: dateRange,
      totalConversions: conversionList.length,
      conversionsByType: conversionsByType as Record<string, number>,
      conversionsByStatus: conversionsByStatus as Record<string, number>,
      totalValue,
      totalCommission,
      conversionRate: totalClicks > 0 ? conversionList.length / totalClicks : 0,
      avgOrderValue:
        conversionList.length > 0 ? totalValue / conversionList.length : 0,
      conversionsByDay,
    };
  }

  // ===========================================================================
  // Partner Performance
  // ===========================================================================

  /**
   * Get performance metrics for all partners
   */
  async getPartnerPerformance(dateRange: DateRange): Promise<PartnerPerformance[]> {
    // Get all active partners
    const { data: partners, error: partnerError } = await supabase
      .from('affiliate_partners')
      .select('id, name')
      .eq('is_active', true);

    if (partnerError) {
      throw new Error(`Failed to get partners: ${partnerError.message}`);
    }

    const performance: PartnerPerformance[] = [];

    for (const partner of partners || []) {
      const clickStats = await this.getClickStats(partner.id, dateRange);
      const conversionStats = await this.getConversionStats(partner.id, dateRange);

      performance.push({
        partnerId: partner.id,
        partnerName: partner.name,
        period: dateRange,
        clicks: clickStats.totalClicks,
        conversions: conversionStats.totalConversions,
        conversionRate: conversionStats.conversionRate,
        revenue: conversionStats.totalValue,
        commission: conversionStats.totalCommission,
        roi:
          conversionStats.totalCommission > 0
            ? (conversionStats.totalValue - conversionStats.totalCommission) /
              conversionStats.totalCommission
            : 0,
      });
    }

    // Sort by commission descending
    return performance.sort((a, b) => b.commission - a.commission);
  }

  /**
   * Get top performing offers
   */
  async getTopOffers(
    partnerId: string,
    dateRange: DateRange,
    limit = 10
  ): Promise<Array<{ offerId: string; clicks: number; conversions: number; revenue: number }>> {
    const { data: conversions, error } = await supabase
      .from('affiliate_conversions')
      .select('offer_id, value')
      .eq('partner_id', partnerId)
      .not('offer_id', 'is', null)
      .gte('converted_at', dateRange.from.toISOString())
      .lte('converted_at', dateRange.to.toISOString());

    if (error) {
      throw new Error(`Failed to get top offers: ${error.message}`);
    }

    // Group by offer
    const offerStats: Record<
      string,
      { conversions: number; revenue: number }
    > = {};

    (conversions || []).forEach(conv => {
      const offerId = conv.offer_id;
      if (!offerStats[offerId]) {
        offerStats[offerId] = { conversions: 0, revenue: 0 };
      }
      offerStats[offerId].conversions++;
      offerStats[offerId].revenue += conv.value || 0;
    });

    // Get click counts for each offer
    const offerIds = Object.keys(offerStats);
    const results: Array<{
      offerId: string;
      clicks: number;
      conversions: number;
      revenue: number;
    }> = [];

    for (const offerId of offerIds) {
      const { count } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('offer_id', offerId)
        .gte('clicked_at', dateRange.from.toISOString())
        .lte('clicked_at', dateRange.to.toISOString());

      results.push({
        offerId,
        clicks: count || 0,
        conversions: offerStats[offerId].conversions,
        revenue: offerStats[offerId].revenue,
      });
    }

    return results
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ===========================================================================
  // Postback Handling
  // ===========================================================================

  /**
   * Handle postback from partner (server-to-server tracking)
   */
  async handlePostback(
    partnerId: string,
    clickId: string,
    type: string,
    value?: number,
    partnerReference?: string
  ): Promise<Conversion | null> {
    // Get the original click
    const click = await this.getClick(clickId);
    if (!click) {
      // TrackingService error: Postback received for unknown click
      return null;
    }

    // Track the conversion
    return this.trackConversion({
      clickId: click.clickId,
      userId: click.userId,
      partnerId,
      offerId: click.offerId,
      type: type as ConversionData['type'],
      value,
      partnerReference,
    });
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Generate a unique click ID
   */
  private generateClickId(): string {
    return `clk_${randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Hash IP address for privacy
   */
  private hashIp(ipAddress: string): string {
    const salt = process.env.IP_HASH_SALT || 'fynvita';
    return createHash('sha256')
      .update(ipAddress + salt)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check for duplicate clicks
   */
  private async isDuplicateClick(
    userId: string | undefined,
    partnerId: string,
    offerId: string | undefined,
    ipHash: string | undefined
  ): Promise<boolean> {
    const windowStart = new Date(Date.now() - CLICK_DEDUP_WINDOW_MS);

    let query = supabase
      .from('affiliate_clicks')
      .select('id')
      .eq('partner_id', partnerId)
      .gte('clicked_at', windowStart.toISOString())
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (ipHash) {
      query = query.eq('ip_hash', ipHash);
    } else {
      return false; // Can't check for duplicates without user or IP
    }

    if (offerId) {
      query = query.eq('offer_id', offerId);
    }

    const { data } = await query;
    return (data || []).length > 0;
  }

  /**
   * Get recent click for deduplication
   */
  private async getRecentClick(
    userId: string | undefined,
    partnerId: string,
    offerId: string | undefined,
    ipHash: string | undefined
  ): Promise<Click | null> {
    const windowStart = new Date(Date.now() - CLICK_DEDUP_WINDOW_MS);

    let query = supabase
      .from('affiliate_clicks')
      .select()
      .eq('partner_id', partnerId)
      .gte('clicked_at', windowStart.toISOString())
      .order('clicked_at', { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (ipHash) {
      query = query.eq('ip_hash', ipHash);
    }

    if (offerId) {
      query = query.eq('offer_id', offerId);
    }

    const { data } = await query;
    return data && data[0] ? this.mapClick(data[0]) : null;
  }

  /**
   * Calculate commission for a conversion
   */
  private async calculateCommission(
    partnerId: string,
    type: string,
    value: number
  ): Promise<number> {
    // Get partner commission settings
    const { data: partner } = await supabase
      .from('affiliate_partners')
      .select('commission_type, commission_rate, commission_fixed')
      .eq('id', partnerId)
      .single();

    if (!partner) return 0;

    switch (partner.commission_type) {
      case 'cpa':
        return partner.commission_fixed || 0;
      case 'cpl':
        if (['lead', 'signup', 'application'].includes(type)) {
          return partner.commission_fixed || 0;
        }
        return 0;
      case 'revenue_share':
        return value * ((partner.commission_rate || 0) / 100);
      case 'hybrid':
        return (
          (partner.commission_fixed || 0) +
          value * ((partner.commission_rate || 0) / 100)
        );
      default:
        return 0;
    }
  }

  /**
   * Group dates by day
   */
  private groupByDay(dates: Date[]): Array<{ date: string; count: number }> {
    const groups: Record<string, number> = {};

    dates.forEach(date => {
      const day = date.toISOString().split('T')[0];
      groups[day] = (groups[day] || 0) + 1;
    });

    return Object.entries(groups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Group conversions by day with value
   */
  private groupConversionsByDay(
    items: Array<{ date: Date; value: number }>
  ): Array<{ date: string; count: number; value: number }> {
    const groups: Record<string, { count: number; value: number }> = {};

    items.forEach(item => {
      const day = item.date.toISOString().split('T')[0];
      if (!groups[day]) {
        groups[day] = { count: 0, value: 0 };
      }
      groups[day].count++;
      groups[day].value += item.value;
    });

    return Object.entries(groups)
      .map(([date, data]) => ({ date, count: data.count, value: data.value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Map database row to Click type
   */
  private mapClick(row: Record<string, unknown>): Click {
    return {
      id: row.id as string,
      clickId: row.click_id as string,
      userId: row.user_id as string | undefined,
      partnerId: row.partner_id as string,
      offerId: row.offer_id as string | undefined,
      referralCode: row.referral_code as string | undefined,
      sourcePage: row.source_page as string,
      destinationUrl: row.destination_url as string,
      userAgent: row.user_agent as string | undefined,
      ipHash: row.ip_hash as string | undefined,
      sessionId: row.session_id as string | undefined,
      clickedAt: new Date(row.clicked_at as string),
    };
  }

  /**
   * Map database row to Conversion type
   */
  private mapConversion(row: Record<string, unknown>): Conversion {
    return {
      id: row.id as string,
      clickId: row.click_id as string | undefined,
      userId: row.user_id as string | undefined,
      partnerId: row.partner_id as string,
      offerId: row.offer_id as string | undefined,
      type: row.type as Conversion['type'],
      status: row.status as ConversionStatus,
      value: row.value as number,
      commissionEarned: row.commission_earned as number,
      partnerReference: row.partner_reference as string | undefined,
      convertedAt: new Date(row.converted_at as string),
      confirmedAt: row.confirmed_at
        ? new Date(row.confirmed_at as string)
        : undefined,
      paidAt: row.paid_at ? new Date(row.paid_at as string) : undefined,
      rejectionReason: row.rejection_reason as string | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
    };
  }
}

// Export singleton
export const trackingService = new TrackingService();
export default trackingService;
