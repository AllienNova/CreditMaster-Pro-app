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

export default adminAnalyticsApi;
