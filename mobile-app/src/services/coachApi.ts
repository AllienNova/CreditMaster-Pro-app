/**
 * AI Financial Coach API Client
 *
 * Mobile app client for interacting with the AI Financial Coach backend services.
 */

import { api } from "./api";

// Wrapper to extract data from ApiResponse
const apiClient = {
  get: async <T>(url: string): Promise<T> => {
    const response = await api.get<T>(url);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(
      (response.error as { message?: string })?.message || "API request failed",
    );
  },
  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await api.post<T>(url, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(
      (response.error as { message?: string })?.message || "API request failed",
    );
  },
  patch: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await api.patch<T>(url, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(
      (response.error as { message?: string })?.message || "API request failed",
    );
  },
};
import {
  Recommendation,
  RecommendationType,
  FinancialGoalPlan,
  GoalType,
  GoalSimulation,
  BudgetOptimizationResult,
  DebtStrategyAnalysis,
  CoachDashboard,
} from "../types/coach.types";

const BASE_PATH = "/api/ai/financial-coach";

// ============================================================================
// RECOMMENDATIONS API
// ============================================================================

export interface GetRecommendationsParams {
  types?: RecommendationType[];
  limit?: number;
  includeAI?: boolean;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  generatedAt: string;
  processingTimeMs: number;
  aiModelUsed?: string;
}

export const getRecommendations = async (
  params?: GetRecommendationsParams,
): Promise<RecommendationsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.types) queryParams.set("types", params.types.join(","));
  if (params?.limit) queryParams.set("limit", String(params.limit));
  if (params?.includeAI !== undefined)
    queryParams.set("includeAI", String(params.includeAI));

  const query = queryParams.toString();
  return apiClient.get(
    `${BASE_PATH}/recommendations${query ? `?${query}` : ""}`,
  );
};

export const generateRecommendations = async (
  params?: GetRecommendationsParams & { focusArea?: string },
): Promise<RecommendationsResponse> => {
  return apiClient.post(`${BASE_PATH}/recommendations`, params || {});
};

// ============================================================================
// GOALS API
// ============================================================================

export interface CreateGoalParams {
  type: GoalType;
  name: string;
  description?: string;
  targetAmount: number;
  targetDate: string;
  monthlyContribution?: number;
  linkedAccountId?: string;
  autoSaveEnabled?: boolean;
  priority?: number;
}

export interface GoalsResponse {
  goals: FinancialGoalPlan[];
  count: number;
}

export const getGoals = async (): Promise<GoalsResponse> => {
  return apiClient.get(`${BASE_PATH}/goals`);
};

export const createGoal = async (
  params: CreateGoalParams,
): Promise<FinancialGoalPlan> => {
  return apiClient.post(`${BASE_PATH}/goals`, params);
};

export const getGoal = async (
  goalId: string,
): Promise<{ goal: FinancialGoalPlan; adjustments: any[] }> => {
  return apiClient.get(`${BASE_PATH}/goals/${goalId}`);
};

export const updateGoalProgress = async (
  goalId: string,
  currentAmount: number,
): Promise<FinancialGoalPlan> => {
  return apiClient.patch(`${BASE_PATH}/goals/${goalId}`, { currentAmount });
};

export interface SimulateGoalParams {
  scenarios: Array<{
    monthlyContribution: number;
    targetDate?: string;
  }>;
}

export const simulateGoal = async (
  goalId: string,
  params: SimulateGoalParams,
): Promise<GoalSimulation> => {
  return apiClient.post(`${BASE_PATH}/goals/${goalId}/simulate`, params);
};

// ============================================================================
// BUDGET API
// ============================================================================

export interface OptimizeBudgetParams {
  includeTemplates?: boolean;
  includeScenarios?: boolean;
  targetSavingsRate?: number;
}

export const getBudgetOptimization = async (
  params?: OptimizeBudgetParams,
): Promise<BudgetOptimizationResult> => {
  const queryParams = new URLSearchParams();
  if (params?.includeTemplates !== undefined)
    queryParams.set("includeTemplates", String(params.includeTemplates));
  if (params?.includeScenarios !== undefined)
    queryParams.set("includeScenarios", String(params.includeScenarios));
  if (params?.targetSavingsRate)
    queryParams.set("targetSavingsRate", String(params.targetSavingsRate));

  const query = queryParams.toString();
  return apiClient.get(`${BASE_PATH}/budget${query ? `?${query}` : ""}`);
};

export const optimizeBudget = async (
  params?: OptimizeBudgetParams,
): Promise<BudgetOptimizationResult> => {
  return apiClient.post(`${BASE_PATH}/budget`, params || {});
};

// ============================================================================
// DEBT STRATEGY API
// ============================================================================

export interface AnalyzeDebtParams {
  extraMonthlyPayment?: number;
  includeRefinancing?: boolean;
  targetPayoffDate?: string;
}

export const getDebtStrategy = async (
  params?: AnalyzeDebtParams,
): Promise<DebtStrategyAnalysis> => {
  const queryParams = new URLSearchParams();
  if (params?.extraMonthlyPayment)
    queryParams.set("extraPayment", String(params.extraMonthlyPayment));
  if (params?.includeRefinancing !== undefined)
    queryParams.set("includeRefinancing", String(params.includeRefinancing));
  if (params?.targetPayoffDate)
    queryParams.set("targetPayoffDate", params.targetPayoffDate);

  const query = queryParams.toString();
  return apiClient.get(`${BASE_PATH}/debt${query ? `?${query}` : ""}`);
};

export const analyzeDebtStrategy = async (
  params?: AnalyzeDebtParams,
): Promise<DebtStrategyAnalysis> => {
  return apiClient.post(`${BASE_PATH}/debt`, params || {});
};

// ============================================================================
// DASHBOARD API
// ============================================================================

export const getCoachDashboard = async (): Promise<CoachDashboard> => {
  return apiClient.get(`${BASE_PATH}/dashboard`);
};
