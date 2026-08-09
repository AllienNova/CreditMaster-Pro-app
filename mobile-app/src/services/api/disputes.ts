/**
 * Fynvita Mobile Disputes API Service
 * Handles all dispute-related API calls including AI-powered letter generation
 */

import { api } from "./client";
import type {
  Dispute,
  DisputeStatus,
  DisputeTemplate,
  DisputeStrategy,
  DisputeReason,
  StrategyRecommendation,
  ApiResponse,
  PaginatedResponse,
} from "./types";

// Dispute Types
export interface DisputeCreateInput {
  bureau: "experian" | "equifax" | "transunion";
  itemType: string;
  creditorName: string;
  accountNumber?: string;
  disputeReason: string;
  documents?: string[];
}

export interface DisputeUpdateInput {
  status?: Dispute["status"];
  letterContent?: string;
  documents?: string[];
  outcome?: Dispute["outcome"];
  responseDetails?: string;
  followUpDate?: string;
}

// --- Web -> mobile adapter ---------------------------------------------------
// The web GET /api/disputes route (src/app/api/disputes/route.ts, backed by
// disputeServiceDB.mapToDispute) returns items shaped with `itemDescription`
// and `reason` and NO `updatedAt`, whereas the mobile Dispute type expects
// `creditorName`, `disputeReason`, and a required `updatedAt`. Left unmapped
// those fields are `undefined` at runtime — which is why the disputes list
// renders an empty description. This adapter bridges the two shapes.

const MOBILE_DISPUTE_STATUSES: readonly DisputeStatus[] = [
  "draft",
  "pending",
  "in_progress",
  "ready",
  "sent",
  "under_review",
  "resolved",
  "rejected",
  "deleted",
];

/** Raw dispute item as returned by the web API (tolerant of both field names). */
export interface WebDispute {
  id: string;
  userId?: string;
  bureau: Dispute["bureau"];
  status?: string;
  itemType?: string;
  itemDescription?: string;
  creditorName?: string;
  accountNumber?: string;
  reason?: string;
  disputeReason?: string;
  letterContent?: string;
  documents?: string[];
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  resolvedAt?: string;
  outcome?: Dispute["outcome"];
  responseDetails?: string;
  followUpDate?: string;
}

function normalizeDisputeStatus(status: string | undefined): DisputeStatus {
  return status &&
    (MOBILE_DISPUTE_STATUSES as readonly string[]).includes(status)
    ? (status as DisputeStatus)
    : "pending";
}

/**
 * Map a web dispute payload onto the mobile Dispute shape. Web uses
 * `itemDescription`/`reason` and omits `updatedAt`; mobile uses
 * `creditorName`/`disputeReason` and requires `updatedAt` (fall back to
 * `createdAt`, the best available timestamp). No values are fabricated —
 * absent optional fields stay undefined.
 */
export function mapWebDispute(raw: WebDispute): Dispute {
  return {
    id: raw.id,
    userId: raw.userId ?? "",
    bureau: raw.bureau,
    status: normalizeDisputeStatus(raw.status),
    itemType: raw.itemType ?? "",
    creditorName: raw.creditorName ?? raw.itemDescription ?? "",
    accountNumber: raw.accountNumber,
    disputeReason: raw.disputeReason ?? raw.reason ?? "",
    letterContent: raw.letterContent,
    documents: raw.documents,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    sentAt: raw.sentAt,
    resolvedAt: raw.resolvedAt,
    outcome: raw.outcome,
    responseDetails: raw.responseDetails,
    followUpDate: raw.followUpDate,
  };
}

// Dispute CRUD Endpoints
export const disputeApi = {
  /**
   * Get all disputes for current user
   */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    bureau?: string;
  }): Promise<ApiResponse<PaginatedResponse<Dispute>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.bureau) queryParams.append("bureau", params.bureau);
    const query = queryParams.toString();
    const res = await api.get<PaginatedResponse<WebDispute>>(
      `/disputes${query ? `?${query}` : ""}`,
    );
    // Adapt the web dispute items onto the mobile Dispute shape without
    // fabricating anything; pass failures straight through.
    if (res.success && res.data) {
      const items = Array.isArray(res.data.items)
        ? res.data.items.map(mapWebDispute)
        : [];
      return { success: true, data: { ...res.data, items } };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get single dispute by ID
   */
  getById: (disputeId: string) => api.get<Dispute>(`/disputes/${disputeId}`),

  /**
   * Create a new dispute
   */
  create: (dispute: DisputeCreateInput) =>
    api.post<Dispute>("/disputes", dispute),

  /**
   * Update an existing dispute
   */
  update: (disputeId: string, updates: DisputeUpdateInput) =>
    api.patch<Dispute>(`/disputes/${disputeId}`, updates),

  /**
   * Delete a dispute
   */
  delete: (disputeId: string) =>
    api.delete<{ success: boolean }>(`/disputes/${disputeId}`),

  /**
   * Mark dispute as sent
   */
  markAsSent: (disputeId: string, sentDate?: string) =>
    api.patch<Dispute>(`/disputes/${disputeId}/send`, {
      sentDate: sentDate || new Date().toISOString(),
    }),

  /**
   * Send dispute (alias for markAsSent)
   */
  send: (disputeId: string) =>
    api.patch<Dispute>(`/disputes/${disputeId}/send`, {
      sentDate: new Date().toISOString(),
    }),

  /**
   * Get dispute statistics
   */
  getStats: () =>
    api.get<{
      total: number;
      byStatus: Record<string, number>;
      byBureau: Record<string, number>;
      successRate: number;
      avgResolutionDays: number;
    }>("/disputes/stats"),
};

// AI Letter Generation Endpoints
export const disputeLetterApi = {
  /**
   * Generate AI-powered dispute letter
   */
  generateAILetter: (disputeId: string) =>
    api.post<{ letter: string; confidence: number }>(
      `/disputes/${disputeId}/generate`,
      { mode: "ai" },
    ),

  /**
   * Generate letter from template
   */
  generateFromTemplate: (
    templateId: string,
    placeholders: Record<string, string>,
  ) =>
    api.post<{ letter: string; template: DisputeTemplate }>(
      "/disputes/generate",
      {
        mode: "template",
        templateId,
        placeholders,
      },
    ),

  /**
   * Generate letter using strategy
   */
  generateFromStrategy: (
    strategyId: string,
    variables: Record<string, string>,
  ) =>
    api.post<{
      letter: string;
      strategy: DisputeStrategy;
      nextSteps: string[];
    }>("/disputes/generate", {
      mode: "strategy",
      strategyId,
      variables,
    }),

  /**
   * Get strategy recommendations based on scenario
   */
  getStrategyRecommendations: (scenario: {
    disputeType: string;
    previousAttempts?: number;
    hasEvidence?: boolean;
    accountAge?: number;
    isCollection?: boolean;
    hasRelationship?: boolean;
  }) =>
    api.post<{ recommendations: StrategyRecommendation[] }>(
      "/disputes/recommend-strategy",
      scenario,
    ),

  /**
   * Save generated letter to dispute
   */
  saveLetter: (disputeId: string, letterContent: string) =>
    api.patch<Dispute>(`/disputes/${disputeId}`, { letterContent }),
};

// Templates and Strategies Endpoints
export const disputeResourcesApi = {
  /**
   * Get all available templates
   */
  getTemplates: (category?: string) =>
    api.get<{ templates: DisputeTemplate[] }>(
      `/disputes/templates${category ? `?category=${category}` : ""}`,
      { enableCache: true, cacheTime: 30 * 60 * 1000 }, // Cache for 30 minutes
    ),

  /**
   * Get single template by ID
   */
  getTemplate: (templateId: string) =>
    api.get<DisputeTemplate>(`/disputes/templates/${templateId}`),

  /**
   * Get all available strategies
   */
  getStrategies: (difficulty?: string) =>
    api.get<{ strategies: DisputeStrategy[] }>(
      `/disputes/strategies${difficulty ? `?difficulty=${difficulty}` : ""}`,
      { enableCache: true, cacheTime: 30 * 60 * 1000 },
    ),

  /**
   * Get single strategy by ID
   */
  getStrategy: (strategyId: string) =>
    api.get<DisputeStrategy>(`/disputes/strategies/${strategyId}`),

  /**
   * Get all available dispute reasons
   */
  getReasons: () =>
    api.get<{ reasons: DisputeReason[] }>("/disputes/reasons", {
      enableCache: true,
      cacheTime: 60 * 60 * 1000, // Cache for 1 hour
    }),
};

export default {
  disputes: disputeApi,
  letters: disputeLetterApi,
  resources: disputeResourcesApi,
};
