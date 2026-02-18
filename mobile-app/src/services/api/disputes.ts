/**
 * Fynvita Mobile Disputes API Service
 * Handles all dispute-related API calls including AI-powered letter generation
 */

import { api } from "./client";
import type {
  Dispute,
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

// Dispute CRUD Endpoints
export const disputeApi = {
  /**
   * Get all disputes for current user
   */
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    bureau?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.bureau) queryParams.append("bureau", params.bureau);
    const query = queryParams.toString();
    return api.get<PaginatedResponse<Dispute>>(
      `/disputes${query ? `?${query}` : ""}`,
    );
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
