/**
 * Fynvita Mobile Credit API Service
 * Handles all credit score, monitoring, and bureau-related API calls
 */

import { api } from "./client";
import { offlineSyncService } from "../offline-sync";
import type {
  CreditScore,
  CreditScoreHistory,
  CreditFactor,
  CreditMonitoringAlert,
  MonitoringStatus,
  ApiResponse,
  PaginatedResponse,
} from "./types";

/**
 * One bureau's connection state, as GET /api/credit-bureau/connect returns it
 * (CreditBureauService.getBureauConnectionStatuses). Snake_case because that
 * is what the route serialises — the service reads the bureau_connections
 * columns straight through without renaming them.
 */
export type BureauName = "experian" | "equifax" | "transunion";

/** GET /api/credit-monitoring/history -> creditMonitoringService.getScoreHistory. */
export interface ScoreHistoryPoint {
  /** ISO 8601 — a Date over HTTP. */
  date: string;
  score: number;
}

export interface ScoreHistoryResponse {
  bureau: string;
  scores: ScoreHistoryPoint[];
}

export interface BureauConnection {
  bureau: "experian" | "equifax" | "transunion";
  connected: boolean;
  /** ISO 8601, or null when this bureau has never been pulled. */
  last_pull_date: string | null;
  last_score: number | null;
  /** "sandbox" | "production" — which bureau API the server is pointed at. */
  environment: string;
}

// Credit Score Endpoints

/**
 * GET /api/credit/factors, as it actually arrives.
 *
 * The previous declaration was `{ factor, impact: number, status }[]` — three
 * field names the route has never returned, and an array where it sends an
 * object. Nothing caught it because both consumers cast around the type: the
 * screen through `as unknown as`, the store not at all (it called .map on a
 * non-array and swallowed the TypeError in a catch).
 *
 * `impact` is a STRING band, not a number, so the store's `f.impact > 0` was
 * comparing a string to zero. Always false, so every factor it did manage to
 * read would have rendered "neutral".
 *
 * CreditFactor is reused from ./types rather than redeclared here — its union
 * already matches the route's.
 */
export interface UnavailableCreditFactor {
  id: string;
  name: string;
  percentImpact: number;
  /** What would have to exist for this factor to be computed. */
  blockedBy: string;
}

export interface CreditFactorsResponse {
  factors: CreditFactor[];
  unavailable: UnavailableCreditFactor[];
}

export const creditScoreApi = {
  /**
   * Get all current credit scores from connected bureaus
   */
  getScores: () =>
    api.get<CreditScore[]>("/credit-monitoring/scores", {
      enableCache: true,
      cacheTime: 5 * 60 * 1000,
    }),

  /**
   * Get credit score from a specific bureau.
   *
   * There is no per-bureau route; /credit-monitoring/scores returns every
   * connected bureau in one response ("Get current credit scores for all
   * bureaus", scores/route.ts:8). Selecting one is a client concern, so it is
   * done here rather than by asking the server for a path that has never
   * existed — the previous `/credit/scores/${bureau}` 404'd for all three.
   */
  getScoreByBureau: async (bureau: "experian" | "equifax" | "transunion") => {
    const res = await api.get<CreditScore[]>("/credit-monitoring/scores");
    return {
      ...res,
      data: res.data?.find((s) => s.bureau === bureau),
    };
  },

  /**
   * Credit score history for ONE bureau.
   *
   * TWO THINGS WERE WRONG HERE. The route requires `bureau` and answers
   * `400 Bureau is required` without it (credit-monitoring/history/route.ts:22);
   * this sent `?months=` instead, which the route does not read at all. So
   * every call 400'd, and creditStore.fetchScoreHistory swallowed it.
   *
   * And the shape was wrong even had it worked: the route returns
   * `{ bureau, scores: [{ date, score }] }`, not a CreditScore[].
   *
   * `days`, not months — again what the route actually reads.
   */
  getHistory: (bureau: BureauName, days = 365) =>
    api.get<ScoreHistoryResponse>(
      `/credit-monitoring/history?bureau=${bureau}&days=${days}`,
    ),

  /**
   * Get credit score factors analysis
   */
  getFactors: () => api.get<CreditFactorsResponse>("/credit/factors"),

  /**
   * Simulate score impact for potential actions
   */
  simulateImpact: (scenarios: {
    payOffDebt?: number;
    newCreditLine?: number;
    closeAccount?: boolean;
    latePayment?: boolean;
  }) =>
    api.post<{
      currentScore: number;
      projectedScore: number;
      impact: number;
      confidence: "high" | "medium" | "low";
      recommendations: string[];
    }>("/credit/simulate", scenarios),

  /**
   * Request a fresh credit score pull
   */
  refreshScores: () =>
    api.post<{ message: string; estimatedTime: string }>(
      "/credit/scores/refresh",
    ),
};

// Credit Monitoring Endpoints
export const creditMonitoringApi = {
  /**
   * Get monitoring status and connection info
   */
  getStatus: () => api.get<MonitoringStatus>("/credit-monitoring"),

  /**
   * Enable/disable monitoring for a bureau
   */
  toggleBureauMonitoring: (bureau: string, enabled: boolean) =>
    // One endpoint governs all three bureau operations:
    // POST /credit-bureau/connect { bureau, action: "connect" | "disconnect" }
    // (connect/route.ts:4-5). There are no per-bureau sub-routes.
    api.post<MonitoringStatus>("/credit-bureau/connect", {
      bureau,
      action: enabled ? "connect" : "disconnect",
    }),

  /**
   * Get all monitoring alerts
   */
  getAlerts: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    severity?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    // The server reads `unreadOnly` (src/app/api/credit-monitoring/alerts/route.ts:17).
    // Sending `unread` meant the filter was silently ignored and every caller
    // asking for unread alerts got all of them.
    if (params?.unreadOnly) queryParams.append("unreadOnly", "true");
    if (params?.severity) queryParams.append("severity", params.severity);
    const query = queryParams.toString();
    return api.get<PaginatedResponse<CreditMonitoringAlert>>(
      `/credit-monitoring/alerts${query ? `?${query}` : ""}`,
    );
  },

  /**
   * Acknowledge one alert.
   *
   * There is no per-alert sub-route. The server exposes a single PATCH on the
   * collection that takes `alertId` or `markAllAsRead` in the BODY
   * (src/app/api/credit-monitoring/alerts/route.ts:50-70). The previous
   * `/alerts/{id}/acknowledge` and `/alerts/acknowledge-all` paths never
   * existed, so acknowledging an alert has always been a 404 — and because the
   * screen swallows the failure, the alert simply stayed unread with no error.
   */
  acknowledgeAlert: (alertId: string) =>
    api.patch<{ success: boolean }>("/credit-monitoring/alerts", { alertId }),

  /**
   * Acknowledge every unread alert. Same collection endpoint, `markAllAsRead`.
   */
  acknowledgeAllAlerts: () =>
    api.patch<{ success: boolean }>("/credit-monitoring/alerts", {
      markAllAsRead: true,
    }),

  /**
   * Update monitoring preferences
   */
  updatePreferences: (preferences: {
    alertTypes?: string[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    threshold?: number;
  }) =>
    // /credit-monitoring/settings exports GET and PUT — there is no PATCH, so a
    // PATCH here would 405 even once the path was right.
    api.put<MonitoringStatus>("/credit-monitoring/settings", preferences),

  /**
   * Which bureaus the caller has connected, and when each was last pulled.
   *
   * GET on the same collection the connect/disconnect POSTs use
   * (src/app/api/credit-bureau/connect/route.ts:19). The service answers for
   * ALL THREE bureaus every time — a bureau with no row comes back
   * `connected: false` rather than being omitted — so the caller never has to
   * decide what an absent bureau means.
   *
   * There was no getter here at all, which is why the Connected Accounts
   * screen showed Experian, Equifax and TransUnion as hardcoded "connected"
   * cards: the real answer was one route away and nothing asked for it.
   */
  getBureauConnections: () =>
    api.get<BureauConnection[]>("/credit-bureau/connect"),

  /**
   * Connect to a credit bureau.
   *
   * Takes no credentials. It used to accept { username, password } and forward
   * them, but the route destructures only { bureau, action } and calls
   * CreditBureauService.connectBureau(user.id, bureau) — the credentials were
   * read by nothing. Prompting for a bureau password to send somewhere that
   * discards it is a credential-harvesting surface with no purpose, so the
   * parameter is gone rather than left for a caller to fill in.
   */
  connectBureau: (bureau: string) =>
    api.post<{ success: boolean; message: string }>("/credit-bureau/connect", {
      bureau,
      action: "connect",
    }),

  /**
   * Disconnect from a credit bureau
   */
  disconnectBureau: (bureau: string) =>
    api.post<{ success: boolean }>("/credit-bureau/connect", {
      bureau,
      action: "disconnect",
    }),
};

// Credit Report Endpoints
export const creditReportApi = {
  /**
   * Get list of credit reports
   */
  getReports: () =>
    api.get<{
      reports: { id: string; bureau: string; date: string; status: string }[];
    }>("/credit-bureau/report"),

  /*
   * getReport is gone.
   *
   * It fetched /credit/reports/:id, a route that has never existed — the real
   * one is /credit-repair/reports/:id, the '/' vs '-' drift this codebase has
   * hit before. It also had no callers: app/reports/[id].tsx uses
   * creditRepairApi.getReport, which fetches the correct path and adapts the
   * web shape to the mobile one. Two functions for one screen, and the unused
   * one pointed at nothing.
   */

  /**
   * Upload and analyze a credit report.
   * If the device is offline, the upload metadata is queued for sync.
   */
  uploadReport: async (file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{ reportId: string; status: string }>> => {
    // Check connectivity via the sync service
    if (!offlineSyncService.getIsOnline()) {
      // Queue the upload intent for when connectivity is restored
      await offlineSyncService.addToQueue({
        endpoint: "/credit/reports/upload",
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileUri: file.uri,
          fileType: file.type,
        }),
        entity: "credit_score",
        operationType: "upload",
        priority: "high",
        conflictStrategy: "client_wins",
        metadata: { fileName: file.name },
      });
      return {
        success: false,
        error: {
          code: "OFFLINE_QUEUED",
          message: "Upload queued for when online",
          retryable: true,
        },
        message:
          "You appear to be offline. This upload will be processed when you reconnect.",
      } as ApiResponse<{ reportId: string; status: string }>;
    }

    const { supabase } = await import("../supabase");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com"}/credit/reports/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      },
    );

    return response.json() as Promise<
      ApiResponse<{ reportId: string; status: string }>
    >;
  },

  /**
   * Request AI analysis of a report
   */
  analyzeReport: (reportId: string) =>
    api.post<{
      summary: string;
      disputableItems: any[];
      recommendations: string[];
      riskAreas: string[];
    }>("/credit-bureau/analyze", { reportId }),
};

// ---------------------------------------------------------------------------
// Rent reporting — the only payment history this product actually owns
// ---------------------------------------------------------------------------
// Rent reporting is a marketed credit-building feature that had tables
// (rent_reporting_accounts, rent_payments — 20260731000022) and a complete
// service, and no route at all. docs/qa/triage-financial.md graded it
// UNREACHABLE. Meanwhile app/credit-builder/payments.tsx, titled "Payment
// History", rendered a hardcoded Chase Freedom payment, a Capital One payment
// and a Discover payment five days LATE, to every user, with no request.

export type RentPaymentStatus =
  | "pending"
  | "on_time"
  | "late"
  | "missed"
  | "partial";

export interface RentPayment {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  /** ISO 8601 — Date fields serialise to strings over HTTP. */
  dueDate: string;
  paidDate?: string;
  status: RentPaymentStatus;
  reportedToCredit: boolean;
  reportedDate?: string;
  bureausReported: ("equifax" | "experian" | "transunion")[];
  createdAt: string;
}

/** Only the fields the payment screen reads; the row carries more. */
export interface RentReportingAccount {
  id: string;
  provider: string;
  status: string;
  landlordName: string;
  propertyAddress: string;
  monthlyRent: number;
}

export const rentReportingApi = {
  /**
   * The caller's rent payments and the accounts reporting them.
   *
   * Deliberately does NOT carry an estimated score impact. The service can
   * compute one — min(50, monthsReporting * 2) + 10 + 10 — but nothing
   * measures it, and beside real payment rows a user would read it as their
   * actual score change. The route omits it; see its header.
   */
  getPayments: () =>
    api.get<{ payments: RentPayment[]; accounts: RentReportingAccount[] }>(
      "/credit-builder/rent-payments",
    ),
};

export default {
  scores: creditScoreApi,
  monitoring: creditMonitoringApi,
  reports: creditReportApi,
  rentReporting: rentReportingApi,
};
