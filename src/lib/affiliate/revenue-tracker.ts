/**
 * Affiliate Revenue Tracker
 *
 * Persistent tracker for affiliate revenue events (clicks, applications,
 * approvals, conversions). Writes through to the `revenue_events` Supabase
 * table so events survive serverless cold starts (FND-025).
 *
 * Part of AFF-02 / TASK-MNY-05.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// =============================================================================
// Supabase client (service role — no end-user RLS policies on revenue_events)
// =============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
// DB row shape
// =============================================================================

interface RevenueEventRow {
  id: string;
  event_id: string;
  user_id: string;
  product_id: string;
  partner_id: string;
  event_type: string;
  commission_amount_cents: number | null;
  commission_currency: string | null;
  metadata: Record<string, string> | null;
  created_at: string;
}

// =============================================================================
// Revenue Tracker
// =============================================================================

class RevenueTracker {
  // ---------------------------------------------------------------------------
  // Event Tracking
  // ---------------------------------------------------------------------------

  /**
   * Record a revenue event. Generates a unique eventId automatically and
   * persists the event to `revenue_events`. Returns the event with its id.
   */
  async trackEvent(event: Omit<RevenueEvent, "eventId">): Promise<RevenueEvent> {
    const fullEvent: RevenueEvent = {
      ...event,
      eventId: `rev_${randomUUID().replace(/-/g, "")}`,
    };

    // Convert dollars → integer cents for storage.
    const commissionAmountCents =
      fullEvent.commissionAmount !== undefined
        ? Math.round(fullEvent.commissionAmount * 100)
        : null;

    const { error: insertError } = await supabase
      .from("revenue_events")
      .insert({
        event_id: fullEvent.eventId,
        user_id: fullEvent.userId,
        product_id: fullEvent.productId,
        partner_id: fullEvent.partnerId,
        event_type: fullEvent.eventType,
        commission_amount_cents: commissionAmountCents,
        commission_currency: fullEvent.commissionCurrency ?? null,
        metadata: fullEvent.metadata ?? null,
        // created_at maps from timestamp — Supabase accepts ISO string.
        created_at: fullEvent.timestamp.toISOString(),
      })
      .select();

    if (insertError) {
      throw new Error(`revenue_events insert failed: ${insertError.message}`);
    }

    return fullEvent;
  }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /**
   * Generate an aggregate revenue report, optionally filtered by date range.
   * Reads from `revenue_events`; convert cents → dollars before returning.
   */
  async getReport(period?: { start: Date; end: Date }): Promise<RevenueReport> {
    const rows = await this.fetchRows(period);
    const events = rows.map(rowToEvent);
    return buildReport(events, period);
  }

  // ---------------------------------------------------------------------------
  // Rankings
  // ---------------------------------------------------------------------------

  /**
   * Top products sorted by revenue descending.
   */
  async getTopProducts(
    limit = 10,
  ): Promise<Array<{ productId: string; revenue: number; conversions: number }>> {
    const report = await this.getReport();
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
  async getTopPartners(
    limit = 10,
  ): Promise<Array<{ partnerId: string; revenue: number; conversions: number }>> {
    const report = await this.getReport();
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
  async getConversionFunnel(productId?: string): Promise<ConversionFunnel> {
    const rows = await this.fetchRows(undefined, productId);
    const events = rows.map(rowToEvent);

    const clicks = events.filter((e) => e.eventType === "click").length;
    const applications = events.filter(
      (e) => e.eventType === "application",
    ).length;
    const approvals = events.filter((e) => e.eventType === "approval").length;
    const conversions = events.filter(
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
   * Get all tracked events from the DB.
   */
  async getEvents(): Promise<RevenueEvent[]> {
    const rows = await this.fetchRows();
    return rows.map(rowToEvent);
  }

  /**
   * Delete all tracked events from the DB.
   */
  async clear(): Promise<void> {
    await supabase.from("revenue_events").delete().not("id", "is", null);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetch rows from `revenue_events`, optionally filtered by period and/or productId.
   */
  private async fetchRows(
    period?: { start: Date; end: Date },
    productId?: string,
  ): Promise<RevenueEventRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase PostgrestFilterBuilder type changes on each chained method; typed at the `as RevenueEventRow[]` boundary
    let query: any = supabase.from("revenue_events").select("*");

    if (period) {
      query = query
        .gte("created_at", period.start.toISOString())
        .lte("created_at", period.end.toISOString());
    }

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`revenue_events fetch failed: ${error.message}`);
    }

    return (data ?? []) as RevenueEventRow[];
  }
}

// =============================================================================
// Pure helpers
// =============================================================================

/** Convert a DB row to a RevenueEvent, returning commission in dollars. */
function rowToEvent(row: RevenueEventRow): RevenueEvent {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    productId: row.product_id,
    partnerId: row.partner_id,
    eventType: row.event_type as RevenueEventType,
    // cents → dollars on read.
    commissionAmount:
      row.commission_amount_cents !== null
        ? row.commission_amount_cents / 100
        : undefined,
    commissionCurrency: row.commission_currency ?? undefined,
    timestamp: new Date(row.created_at),
    metadata: row.metadata ?? undefined,
  };
}

/** Build a RevenueReport from an array of in-memory events (already in dollars). */
function buildReport(
  events: RevenueEvent[],
  period?: { start: Date; end: Date },
): RevenueReport {
  const totalClicks = events.filter((e) => e.eventType === "click").length;
  const totalConversions = events.filter(
    (e) => e.eventType === "conversion",
  ).length;

  const commissionEvents = events.filter(
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

  for (const event of events) {
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

  const reportPeriod = period ?? inferPeriod(events);

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

/** Infer period from event timestamps when no explicit period is given. */
function inferPeriod(events: RevenueEvent[]): { start: Date; end: Date } {
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

// =============================================================================
// Exports
// =============================================================================

export { RevenueTracker };
export const revenueTracker = new RevenueTracker();
export default revenueTracker;
