/**
 * Fynvita Mobile Admin API Service
 *
 * Admin-only platform analytics backed by the real, admin-guarded web route
 * (GET /api/admin/analytics — withRole("admin") in
 * src/app/api/admin/analytics/route.ts). The route returns live Supabase
 * aggregates; the shared api client attaches the Bearer token from the Supabase
 * session, so an admin's session authorises the request exactly like every other
 * mobile API call. A non-admin session is rejected by the route (403) and surfaces
 * as an honest error state on the screen.
 *
 * No web -> mobile adapter is needed here: every element shape below matches the
 * web AdminAnalyticsPage's AnalyticsData one-for-one (verified against route.ts
 * L169-176 and src/app/admin/analytics/page.tsx L6-12), so the screen renders these
 * fields directly with no field/enum/unit transformation. topFeatures usage values
 * are whatever the route returns (only "Dispute Letters" is currently a real count;
 * the others are 0) — rendered honestly, never fabricated on the client.
 */

import { api } from "./client";
import type { ApiResponse } from "./types";

// Time windows accepted by GET /api/admin/analytics. The route maps 7d->7, 30d->30,
// 90d->90 days and anything else (here "1y") -> 365 (route.ts L26-27). Mirrors the
// four options the web admin analytics page offers (page.tsx L63-66).
export type AnalyticsRange = "7d" | "30d" | "90d" | "1y";

export const ANALYTICS_RANGES: readonly AnalyticsRange[] = [
  "7d",
  "30d",
  "90d",
  "1y",
];

export interface UserGrowthPoint {
  date: string;
  count: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface DisputeStatusCount {
  status: string;
  count: number;
}

export interface SubscriptionTierCount {
  tier: string;
  count: number;
}

export interface FeatureUsage {
  feature: string;
  usage: number;
}

export interface AdminAnalytics {
  userGrowth: UserGrowthPoint[];
  revenueByMonth: RevenuePoint[];
  disputesByStatus: DisputeStatusCount[];
  subscriptionsByTier: SubscriptionTierCount[];
  topFeatures: FeatureUsage[];
  timeRange: string;
}

export const adminAnalyticsApi = {
  /**
   * Fetch platform analytics for the given time range from the real admin route.
   * Never fabricates on failure — the api client's error is passed straight
   * through so the screen can show an honest error state.
   */
  getAnalytics: (range: AnalyticsRange): Promise<ApiResponse<AdminAnalytics>> =>
    api.get<AdminAnalytics>(`/admin/analytics?range=${range}`),
};

// ---------------------------------------------------------------------------
// Admin disputes
// ---------------------------------------------------------------------------
//
// Platform-wide dispute oversight, backed by the real, admin-guarded route
// (GET /api/admin/disputes — withRole("admin") in
// src/app/api/admin/disputes/route.ts). That route runs
// `supabase.from("disputes").select("*")` (ordered newest-first) and enriches
// each row with the account owner's `user_email`, returning `{ disputes, total }`.
//
// Every field the screen renders is a real column of the disputes table
// (authoritative migration 20250204000000_credit_repair_schema.sql: bureau,
// status, item_type, created_at) or the route's `user_email` enrichment —
// nothing is fabricated. The adapter only reshapes for display: it prettifies
// the bureau label, trims the timestamp to a date, and passes the real status
// enum straight through. A non-admin session is rejected by the route (403)
// and surfaces as an honest error state on the screen.

// The disputes-table status CHECK constraint, verbatim from
// 20250204000000_credit_repair_schema.sql. These are the real statuses the
// admin list filters by — the screen no longer invents "pending"/"processing".
export const ADMIN_DISPUTE_STATUSES = [
  "draft",
  "sent",
  "under_review",
  "resolved",
  "rejected",
  "escalated",
] as const;

export type AdminDisputeStatus = (typeof ADMIN_DISPUTE_STATUSES)[number];

// The disputes-table bureau CHECK values -> brand display labels. Presentation
// only: the underlying value is still the real `bureau` column.
const BUREAU_LABELS: Record<string, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

/**
 * Raw disputes row as returned by the admin route. Only the fields the screen
 * consumes are typed; the route returns the full row (`select *`) but extra
 * columns are simply ignored here. Fields are optional to stay tolerant of a
 * partial row — the adapter substitutes an empty value, never a fabricated one.
 */
export interface AdminDisputeRow {
  id: string;
  user_email?: string; // route enrichment (server-side "Unknown" fallback)
  bureau?: string; // experian | equifax | transunion (DB CHECK)
  status?: string; // draft|sent|under_review|resolved|rejected|escalated
  item_type?: string; // kind of item disputed (NOT NULL free text in DB)
  created_at?: string; // ISO timestamp
}

export interface AdminDisputesResponse {
  disputes: AdminDisputeRow[];
  total: number;
}

/** Mobile display model — every field sourced from a real column/enrichment. */
export interface AdminDispute {
  id: string;
  user: string; // user_email
  bureau: string; // pretty bureau label
  status: string; // real DB status, passed through honestly
  type: string; // item_type
  created: string; // YYYY-MM-DD (date part of created_at)
}

function prettyBureau(raw: string | undefined): string {
  const key = (raw ?? "").toLowerCase();
  if (BUREAU_LABELS[key]) return BUREAU_LABELS[key];
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
}

function dateOnly(iso: string | undefined): string {
  if (!iso) return "";
  const t = iso.indexOf("T");
  return t === -1 ? iso : iso.slice(0, t);
}

/**
 * Reshape one raw disputes row onto the mobile display model. No fabrication:
 * a missing field becomes an empty string (or "Unknown" user), never an
 * invented value; the real status enum is passed straight through.
 */
export function mapAdminDispute(row: AdminDisputeRow): AdminDispute {
  return {
    id: row.id,
    user: row.user_email ?? "Unknown",
    bureau: prettyBureau(row.bureau),
    status: row.status ?? "",
    type: row.item_type ?? "",
    created: dateOnly(row.created_at),
  };
}

export const adminDisputesApi = {
  /**
   * Fetch every platform dispute from the real admin route and adapt each row
   * onto the mobile display model. A failed request is passed straight through
   * (no fabricated fallback) so the screen can show an honest error state.
   */
  getDisputes: async (): Promise<ApiResponse<AdminDispute[]>> => {
    const res = await api.get<AdminDisputesResponse>("/admin/disputes");
    if (res.success && res.data) {
      const rows = Array.isArray(res.data.disputes) ? res.data.disputes : [];
      return {
        success: true,
        data: rows.map(mapAdminDispute),
        timestamp: res.timestamp,
      };
    }
    return {
      success: false,
      error: res.error,
      message: res.message,
      timestamp: res.timestamp,
    };
  },
};

export default adminAnalyticsApi;
