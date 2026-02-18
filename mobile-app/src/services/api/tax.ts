/**
 * Fynvita Mobile Tax API Service
 * Handles tax optimization, scenarios, calendar, deductions, and documents
 */

import { api } from "./client";
import type { ApiResponse } from "./types";

// Types
export interface TaxRecommendation {
  id: string;
  title: string;
  summary: string;
  estimatedTaxSavings: number;
  priority: "critical" | "high" | "medium" | "low";
  deadline?: string;
  status: "pending" | "in_progress" | "completed";
  category: string;
}

export interface TaxProjection {
  grossIncome: number;
  taxableIncome: number;
  totalTax: number;
  effectiveRate: number;
  federalMarginalRate: number;
  takeHomePay: number;
  monthlyTakeHome: number;
}

export interface TaxAnalysis {
  currentProjection: TaxProjection;
  opportunities: {
    strategyName: string;
    potentialTaxSavings: number;
    priority: string;
    remainingCapacity: number;
  }[];
  topRecommendations: TaxRecommendation[];
  totalPotentialSavings: number;
  retirementContributionGap: number;
  suggestedMonthlyContribution: number;
  assetLocationScore: number;
}

export interface TaxScenarioInput {
  name: string;
  grossIncome: number;
  additional401k: number;
  additionalIra: number;
  additionalHsa: number;
  additionalCharitable: number;
  capitalGainsRealized: number;
  rothConversion: number;
}

export interface TaxScenarioResult {
  name: string;
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  takeHomePay: number;
}

export interface TaxEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: "deadline" | "reminder" | "recommendation" | "payment";
  priority: "critical" | "high" | "medium" | "low";
  isCompleted: boolean;
  category: string;
}

export interface TaxDeduction {
  id: string;
  category: string;
  name: string;
  amount: number;
  date: string;
  documentId?: string;
  isVerified: boolean;
  notes?: string;
}

export interface DeductionCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxDeductible?: number;
  currentTotal: number;
  items: TaxDeduction[];
}

export interface TaxDocument {
  id: string;
  documentType: string;
  documentName: string;
  taxYear: number;
  extractionConfidence: number;
  isVerified: boolean;
  createdAt: string;
  extractedData?: Record<string, unknown>;
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  taxInBracket: number;
}

export interface TaxBracketVisualization {
  filingStatus: string;
  taxYear: number;
  brackets: TaxBracket[];
  currentBracket: TaxBracket;
  effectiveRate: number;
  marginalRate: number;
}

// Tax Analysis API
export const taxAnalysisApi = {
  /**
   * Get comprehensive tax analysis
   */
  analyze: (params: {
    taxYear: number;
    grossIncome: number;
    filingStatus: string;
    stateOfResidence: string;
    ytd401kContribution?: number;
    ytdIraContribution?: number;
    ytdHsaContribution?: number;
    hasHdhp?: boolean;
  }) => api.post<TaxAnalysis>("/tax/analyze", params),

  /**
   * Get tax bracket visualization
   */
  getBrackets: (params: {
    taxYear: number;
    filingStatus: string;
    taxableIncome: number;
  }) => api.post<TaxBracketVisualization>("/tax/brackets", params),

  /**
   * Get tax optimization recommendations
   */
  getRecommendations: () =>
    api.get<{ recommendations: TaxRecommendation[] }>("/tax/recommendations"),

  /**
   * Mark recommendation as completed
   */
  completeRecommendation: (recommendationId: string) =>
    api.post<{ success: boolean }>(
      `/tax/recommendations/${recommendationId}/complete`,
    ),
};

// Tax Scenarios API
export const taxScenariosApi = {
  /**
   * Calculate tax for a scenario
   */
  calculate: (scenario: TaxScenarioInput) =>
    api.post<TaxScenarioResult>("/tax/scenarios/calculate", scenario),

  /**
   * Compare multiple scenarios
   */
  compare: (scenarios: TaxScenarioInput[]) =>
    api.post<{ results: TaxScenarioResult[]; bestScenario: string }>(
      "/tax/scenarios/compare",
      { scenarios },
    ),

  /**
   * Get saved scenarios
   */
  getSaved: () =>
    api.get<{ scenarios: (TaxScenarioInput & { id: string })[] }>(
      "/tax/scenarios",
    ),

  /**
   * Save a scenario
   */
  save: (scenario: TaxScenarioInput) =>
    api.post<{ id: string }>("/tax/scenarios", scenario),

  /**
   * Delete a saved scenario
   */
  delete: (scenarioId: string) =>
    api.delete<{ success: boolean }>(`/tax/scenarios/${scenarioId}`),
};

// Tax Calendar API
export const taxCalendarApi = {
  /**
   * Get tax events/deadlines
   */
  getEvents: (params?: { year?: number; upcoming?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.upcoming) queryParams.append("upcoming", "true");
    const query = queryParams.toString();
    return api.get<{ events: TaxEvent[] }>(
      `/tax/calendar${query ? `?${query}` : ""}`,
    );
  },

  /**
   * Create custom reminder
   */
  createReminder: (event: Omit<TaxEvent, "id">) =>
    api.post<TaxEvent>("/tax/calendar", event),

  /**
   * Mark event as completed
   */
  completeEvent: (eventId: string) =>
    api.post<{ success: boolean }>(`/tax/calendar/${eventId}/complete`),

  /**
   * Delete custom event
   */
  deleteEvent: (eventId: string) =>
    api.delete<{ success: boolean }>(`/tax/calendar/${eventId}`),

  /**
   * Set up reminder notifications
   */
  setReminder: (eventId: string, reminderDays: number[]) =>
    api.post<{ success: boolean }>(`/tax/calendar/${eventId}/reminder`, {
      reminderDays,
    }),
};

// Tax Deductions API
export const taxDeductionsApi = {
  /**
   * Get all deduction categories with items
   */
  getCategories: (taxYear?: number) =>
    api.get<{ categories: DeductionCategory[] }>(
      `/tax/deductions/categories${taxYear ? `?year=${taxYear}` : ""}`,
    ),

  /**
   * Get deductions summary
   */
  getSummary: (taxYear?: number) =>
    api.get<{
      totalDeductions: number;
      itemizedVsStandard: {
        itemizedTotal: number;
        standardDeduction: number;
        recommendation: "itemize" | "standard";
        savings: number;
      };
      byCategory: { category: string; amount: number; percentage: number }[];
    }>(`/tax/deductions/summary${taxYear ? `?year=${taxYear}` : ""}`),

  /**
   * Add a deduction
   */
  add: (deduction: Omit<TaxDeduction, "id" | "isVerified">) =>
    api.post<TaxDeduction>("/tax/deductions", deduction),

  /**
   * Update a deduction
   */
  update: (deductionId: string, updates: Partial<TaxDeduction>) =>
    api.patch<TaxDeduction>(`/tax/deductions/${deductionId}`, updates),

  /**
   * Delete a deduction
   */
  delete: (deductionId: string) =>
    api.delete<{ success: boolean }>(`/tax/deductions/${deductionId}`),

  /**
   * Get deduction recommendations
   */
  getRecommendations: () =>
    api.get<{
      missedDeductions: {
        category: string;
        description: string;
        potentialSavings: number;
      }[];
      optimizations: { description: string; action: string; savings: number }[];
    }>("/tax/deductions/recommendations"),
};

// Tax Documents API
export const taxDocumentsApi = {
  /**
   * Get all tax documents
   */
  getAll: (taxYear?: number) =>
    api.get<{ documents: TaxDocument[] }>(
      `/tax/documents${taxYear ? `?year=${taxYear}` : ""}`,
    ),

  /**
   * Get document by ID
   */
  getById: (documentId: string) =>
    api.get<TaxDocument>(`/tax/documents/${documentId}`),

  /**
   * Upload and process document
   */
  upload: (formData: FormData) =>
    api.post<{
      document: TaxDocument;
      extractedData: Record<string, unknown>;
    }>("/tax/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    } as any),

  /**
   * Verify document extraction
   */
  verify: (documentId: string, corrections?: Record<string, unknown>) =>
    api.post<TaxDocument>(`/tax/documents/${documentId}/verify`, {
      corrections,
    }),

  /**
   * Delete document
   */
  delete: (documentId: string) =>
    api.delete<{ success: boolean }>(`/tax/documents/${documentId}`),

  /**
   * Get missing documents checklist
   */
  getMissingChecklist: (taxYear?: number) =>
    api.get<{
      required: { type: string; label: string; received: boolean }[];
      optional: { type: string; label: string; received: boolean }[];
    }>(`/tax/documents/checklist${taxYear ? `?year=${taxYear}` : ""}`),
};

// Tax Tips API
export const taxTipsApi = {
  /**
   * Get personalized tax-saving tips
   */
  getTips: () =>
    api.get<{
      tips: {
        id: string;
        title: string;
        description: string;
        potentialSavings: number;
        difficulty: "easy" | "medium" | "hard";
        category: string;
        actionSteps: string[];
      }[];
    }>("/tax/tips"),

  /**
   * Dismiss a tip
   */
  dismissTip: (tipId: string) =>
    api.post<{ success: boolean }>(`/tax/tips/${tipId}/dismiss`),
};

// Year-over-Year Comparison API
export const taxComparisonApi = {
  /**
   * Get year-over-year comparison
   */
  compare: (years: number[]) =>
    api.post<{
      comparisons: {
        year: number;
        grossIncome: number;
        taxableIncome: number;
        totalTax: number;
        effectiveRate: number;
        refundOrOwed: number;
      }[];
      trends: {
        incomeChange: number;
        taxChange: number;
        rateChange: number;
      };
    }>("/tax/compare", { years }),
};

// Default export
export default {
  analysis: taxAnalysisApi,
  scenarios: taxScenariosApi,
  calendar: taxCalendarApi,
  deductions: taxDeductionsApi,
  documents: taxDocumentsApi,
  tips: taxTipsApi,
  comparison: taxComparisonApi,
};
