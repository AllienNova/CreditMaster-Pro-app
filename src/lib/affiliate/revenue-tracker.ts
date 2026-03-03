/**
 * Affiliate Revenue Tracker
 *
 * In-memory tracker for affiliate revenue events (clicks, applications,
 * approvals, conversions). Provides reporting, funnel analysis, and
 * top-performer ranking.
 *
 * Part of AFF-02.
 */

import { randomUUID } from "crypto";

// =============================================================================
// Types
// =============================================================================

export type RevenueEventType =
  | "click"
  | "application"
  | "approval"
  | "conversion";

export interface RevenueEvent {
  eventId: string;
  userId: string;
  productId: string;
  partnerId: string;
  eventType: RevenueEventType;
  commissionAmount?: number;
  commissionCurrency?: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

export interface PartnerStats {
  revenue: number;
  clicks: number;
  conversions: number;
}

export interface ProductStats {
  revenue: number;
  clicks: number;
  conversions: number;
}

export interface RevenueReport {
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  averageCommission: number;
  byPartner: Map<string, PartnerStats>;
  byProduct: Map<string, ProductStats>;
  period: { start: Date; end: Date };
}

export interface ConversionFunnel {
  clicks: number;
  applications: number;
  approvals: number;
  conversions: number;
  clickToConversionRate: number;
}

// =============================================================================
// Revenue Tracker
// =============================================================================

class RevenueTracker {
  private events: RevenueEvent[] = [];

  // ---------------------------------------------------------------------------
  // Event Tracking
  // ---------------------------------------------------------------------------

  /**
   * Record a revenue event. Generates a unique eventId automatically.
   */
  trackEvent(event: Omit<RevenueEvent, "eventId">): RevenueEvent {
    const fullEvent: RevenueEvent = {
      ...event,
      eventId: `rev_${randomUUID().replace(/-/g, "")}`,
    };
    this.events.push(fullEvent);
    return fullEvent;
  }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /**
   * Generate an aggregate revenue report, optionally filtered by date range.
   */
  getReport(period?: { start: Date; end: Date }): RevenueReport {
    const filtered = this.filterByPeriod(period);

    const totalClicks = filtered.filter((e) => e.eventType === "click").length;
    const totalConversions = filtered.filter(
      (e) => e.eventType === "conversion",
    ).length;

    const commissionEvents = filtered.filter(
      (e) => e.commissionAmount !== undefined && e.commissionAmount > 0,
    );
    const totalRevenue = commissionEvents.reduce(
      (sum, e) => sum + (e.commissionAmount ?? 0),
      0,
    );
    const averageCommission =
      commissionEvents.length > 0
        ? totalRevenue / commissionEvents.length
        : 0;

    const conversionRate =
      totalClicks > 0 ? totalConversions / totalClicks : 0;

    const byPartner = new Map<string, PartnerStats>();
    const byProduct = new Map<string, ProductStats>();

    for (const event of filtered) {
      // By partner
      const partnerEntry = byPartner.get(event.partnerId) ?? {
        revenue: 0,
        clicks: 0,
        conversions: 0,
      };
      if (event.eventType === "click") partnerEntry.clicks++;
      if (event.eventType === "conversion") partnerEntry.conversions++;
      if (event.commissionAmount) partnerEntry.revenue += event.commissionAmount;
      byPartner.set(event.partnerId, partnerEntry);

      // By product
      const productEntry = byProduct.get(event.productId) ?? {
        revenue: 0,
        clicks: 0,
        conversions: 0,
      };
      if (event.eventType === "click") productEntry.clicks++;
      if (event.eventType === "conversion") productEntry.conversions++;
      if (event.commissionAmount)
        productEntry.revenue += event.commissionAmount;
      byProduct.set(event.productId, productEntry);
    }

    const reportPeriod = period ?? this.inferPeriod(filtered);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 10000) / 10000,
      averageCommission: Math.round(averageCommission * 100) / 100,
      byPartner,
      byProduct,
      period: reportPeriod,
    };
  }

  // ---------------------------------------------------------------------------
  // Rankings
  // ---------------------------------------------------------------------------

  /**
   * Top products sorted by revenue descending.
   */
  getTopProducts(
    limit = 10,
  ): Array<{ productId: string; revenue: number; conversions: number }> {
    const report = this.getReport();
    const entries: Array<{
      productId: string;
      revenue: number;
      conversions: number;
    }> = [];

    for (const [productId, stats] of report.byProduct.entries()) {
      entries.push({
        productId,
        revenue: stats.revenue,
        conversions: stats.conversions,
      });
    }

    entries.sort((a, b) => b.revenue - a.revenue);
    return entries.slice(0, limit);
  }

  /**
   * Top partners sorted by revenue descending.
   */
  getTopPartners(
    limit = 10,
  ): Array<{ partnerId: string; revenue: number; conversions: number }> {
    const report = this.getReport();
    const entries: Array<{
      partnerId: string;
      revenue: number;
      conversions: number;
    }> = [];

    for (const [partnerId, stats] of report.byPartner.entries()) {
      entries.push({
        partnerId,
        revenue: stats.revenue,
        conversions: stats.conversions,
      });
    }

    entries.sort((a, b) => b.revenue - a.revenue);
    return entries.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Funnel Analysis
  // ---------------------------------------------------------------------------

  /**
   * Get the conversion funnel. Optionally filter to a single product.
   */
  getConversionFunnel(productId?: string): ConversionFunnel {
    let filtered = this.events;
    if (productId) {
      filtered = filtered.filter((e) => e.productId === productId);
    }

    const clicks = filtered.filter((e) => e.eventType === "click").length;
    const applications = filtered.filter(
      (e) => e.eventType === "application",
    ).length;
    const approvals = filtered.filter(
      (e) => e.eventType === "approval",
    ).length;
    const conversions = filtered.filter(
      (e) => e.eventType === "conversion",
    ).length;

    return {
      clicks,
      applications,
      approvals,
      conversions,
      clickToConversionRate: clicks > 0 ? conversions / clicks : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Get all tracked events (read-only copy).
   */
  getEvents(): ReadonlyArray<RevenueEvent> {
    return [...this.events];
  }

  /**
   * Clear all tracked events.
   */
  clear(): void {
    this.events = [];
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Filter events by an optional date range.
   */
  private filterByPeriod(
    period?: { start: Date; end: Date },
  ): RevenueEvent[] {
    if (!period) return this.events;

    return this.events.filter((e) => {
      const t = e.timestamp.getTime();
      return t >= period.start.getTime() && t <= period.end.getTime();
    });
  }

  /**
   * Infer period from event timestamps when no explicit period is given.
   */
  private inferPeriod(events: RevenueEvent[]): { start: Date; end: Date } {
    if (events.length === 0) {
      const now = new Date();
      return { start: now, end: now };
    }

    let earliest = events[0].timestamp.getTime();
    let latest = events[0].timestamp.getTime();

    for (const event of events) {
      const t = event.timestamp.getTime();
      if (t < earliest) earliest = t;
      if (t > latest) latest = t;
    }

    return { start: new Date(earliest), end: new Date(latest) };
  }
}

// =============================================================================
// Exports
// =============================================================================

export { RevenueTracker };
export const revenueTracker = new RevenueTracker();
export default revenueTracker;
