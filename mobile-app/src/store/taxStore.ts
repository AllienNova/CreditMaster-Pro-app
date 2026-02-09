/**
 * Fynvita Mobile Tax Store
 * Manages tax optimization, scenarios, calendar, deductions, and documents state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  taxAnalysisApi,
  taxScenariosApi,
  taxCalendarApi,
  taxDeductionsApi,
  taxDocumentsApi,
  taxTipsApi,
  taxComparisonApi,
  type TaxAnalysis,
  type TaxRecommendation,
  type TaxScenarioInput,
  type TaxScenarioResult,
  type TaxEvent,
  type TaxDeduction,
  type DeductionCategory,
  type TaxDocument,
  type TaxBracketVisualization,
} from '../services/api/tax';

interface TaxTip {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  actionSteps: string[];
}

interface DeductionSummary {
  totalDeductions: number;
  itemizedVsStandard: {
    itemizedTotal: number;
    standardDeduction: number;
    recommendation: 'itemize' | 'standard';
    savings: number;
  };
  byCategory: { category: string; amount: number; percentage: number }[];
}

interface YearComparison {
  year: number;
  grossIncome: number;
  taxableIncome: number;
  totalTax: number;
  effectiveRate: number;
  refundOrOwed: number;
}

interface TaxState {
  // Analysis
  analysis: TaxAnalysis | null;
  brackets: TaxBracketVisualization | null;
  recommendations: TaxRecommendation[];

  // Scenarios
  savedScenarios: (TaxScenarioInput & { id: string })[];
  scenarioResults: TaxScenarioResult[];

  // Calendar
  events: TaxEvent[];
  upcomingEvents: TaxEvent[];

  // Deductions
  deductionCategories: DeductionCategory[];
  deductionSummary: DeductionSummary | null;

  // Documents
  documents: TaxDocument[];
  missingDocuments: {
    required: { type: string; label: string; received: boolean }[];
    optional: { type: string; label: string; received: boolean }[];
  } | null;

  // Tips
  tips: TaxTip[];

  // Comparison
  yearComparisons: YearComparison[];

  // UI State
  selectedYear: number;
  isLoading: boolean;
  isLoadingAnalysis: boolean;
  isLoadingScenarios: boolean;
  isLoadingCalendar: boolean;
  isLoadingDeductions: boolean;
  isLoadingDocuments: boolean;
  error: string | null;

  // Actions - Analysis
  fetchAnalysis: (params: {
    taxYear: number;
    grossIncome: number;
    filingStatus: string;
    stateOfResidence: string;
    ytd401kContribution?: number;
    ytdIraContribution?: number;
    ytdHsaContribution?: number;
    hasHdhp?: boolean;
  }) => Promise<void>;
  fetchBrackets: (params: {
    taxYear: number;
    filingStatus: string;
    taxableIncome: number;
  }) => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  completeRecommendation: (id: string) => Promise<boolean>;

  // Actions - Scenarios
  calculateScenario: (scenario: TaxScenarioInput) => Promise<TaxScenarioResult | null>;
  compareScenarios: (scenarios: TaxScenarioInput[]) => Promise<void>;
  saveScenario: (scenario: TaxScenarioInput) => Promise<boolean>;
  deleteScenario: (id: string) => Promise<boolean>;
  fetchSavedScenarios: () => Promise<void>;
  clearScenarioResults: () => void;

  // Actions - Calendar
  fetchEvents: (year?: number, upcomingOnly?: boolean) => Promise<void>;
  createReminder: (event: Omit<TaxEvent, 'id'>) => Promise<boolean>;
  completeEvent: (id: string) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;

  // Actions - Deductions
  fetchDeductionCategories: (year?: number) => Promise<void>;
  fetchDeductionSummary: (year?: number) => Promise<void>;
  addDeduction: (deduction: Omit<TaxDeduction, 'id' | 'isVerified'>) => Promise<boolean>;
  updateDeduction: (id: string, updates: Partial<TaxDeduction>) => Promise<boolean>;
  deleteDeduction: (id: string) => Promise<boolean>;

  // Actions - Documents
  fetchDocuments: (year?: number) => Promise<void>;
  fetchMissingDocuments: (year?: number) => Promise<void>;
  deleteDocument: (id: string) => Promise<boolean>;

  // Actions - Tips
  fetchTips: () => Promise<void>;
  dismissTip: (id: string) => Promise<boolean>;

  // Actions - Comparison
  compareYears: (years: number[]) => Promise<void>;

  // Actions - Utility
  setSelectedYear: (year: number) => void;
  clearError: () => void;
  resetStore: () => void;
}

const currentYear = new Date().getFullYear();

const initialState = {
  analysis: null,
  brackets: null,
  recommendations: [],
  savedScenarios: [],
  scenarioResults: [],
  events: [],
  upcomingEvents: [],
  deductionCategories: [],
  deductionSummary: null,
  documents: [],
  missingDocuments: null,
  tips: [],
  yearComparisons: [],
  selectedYear: currentYear,
  isLoading: false,
  isLoadingAnalysis: false,
  isLoadingScenarios: false,
  isLoadingCalendar: false,
  isLoadingDeductions: false,
  isLoadingDocuments: false,
  error: null,
};

export const useTaxStore = create<TaxState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Analysis Actions
      fetchAnalysis: async (params) => {
        set({ isLoadingAnalysis: true, error: null });
        try {
          const response = await taxAnalysisApi.analyze(params);
          if (response.success && response.data) {
            set({ analysis: response.data, isLoadingAnalysis: false });
          } else {
            set({ error: response.error?.message || 'Failed to fetch analysis', isLoadingAnalysis: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch analysis',
            isLoadingAnalysis: false,
          });
        }
      },

      fetchBrackets: async (params) => {
        try {
          const response = await taxAnalysisApi.getBrackets(params);
          if (response.success && response.data) {
            set({ brackets: response.data });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch brackets:', error);
        }
      },

      fetchRecommendations: async () => {
        try {
          const response = await taxAnalysisApi.getRecommendations();
          if (response.success && response.data) {
            set({ recommendations: response.data.recommendations });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch recommendations:', error);
        }
      },

      completeRecommendation: async (id) => {
        try {
          const response = await taxAnalysisApi.completeRecommendation(id);
          if (response.success) {
            set((state) => ({
              recommendations: state.recommendations.map((r) =>
                r.id === id ? { ...r, status: 'completed' as const } : r
              ),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Scenarios Actions
      calculateScenario: async (scenario) => {
        set({ isLoadingScenarios: true });
        try {
          const response = await taxScenariosApi.calculate(scenario);
          if (response.success && response.data) {
            set((state) => ({
              scenarioResults: [...state.scenarioResults, response.data!],
              isLoadingScenarios: false,
            }));
            return response.data;
          }
          set({ isLoadingScenarios: false });
          return null;
        } catch {
          set({ isLoadingScenarios: false });
          return null;
        }
      },

      compareScenarios: async (scenarios) => {
        set({ isLoadingScenarios: true, error: null });
        try {
          const response = await taxScenariosApi.compare(scenarios);
          if (response.success && response.data) {
            set({ scenarioResults: response.data.results, isLoadingScenarios: false });
          } else {
            set({ error: response.error?.message, isLoadingScenarios: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to compare scenarios',
            isLoadingScenarios: false,
          });
        }
      },

      saveScenario: async (scenario) => {
        try {
          const response = await taxScenariosApi.save(scenario);
          if (response.success && response.data) {
            set((state) => ({
              savedScenarios: [...state.savedScenarios, { ...scenario, id: response.data!.id }],
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      deleteScenario: async (id) => {
        try {
          const response = await taxScenariosApi.delete(id);
          if (response.success) {
            set((state) => ({
              savedScenarios: state.savedScenarios.filter((s) => s.id !== id),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      fetchSavedScenarios: async () => {
        try {
          const response = await taxScenariosApi.getSaved();
          if (response.success && response.data) {
            set({ savedScenarios: response.data.scenarios });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch saved scenarios:', error);
        }
      },

      clearScenarioResults: () => set({ scenarioResults: [] }),

      // Calendar Actions
      fetchEvents: async (year, upcomingOnly) => {
        set({ isLoadingCalendar: true, error: null });
        try {
          const response = await taxCalendarApi.getEvents({ year, upcoming: upcomingOnly });
          if (response.success && response.data) {
            if (upcomingOnly) {
              set({ upcomingEvents: response.data.events, isLoadingCalendar: false });
            } else {
              set({ events: response.data.events, isLoadingCalendar: false });
            }
          } else {
            set({ error: response.error?.message, isLoadingCalendar: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch events',
            isLoadingCalendar: false,
          });
        }
      },

      createReminder: async (event) => {
        try {
          const response = await taxCalendarApi.createReminder(event);
          if (response.success && response.data) {
            set((state) => ({ events: [...state.events, response.data!] }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      completeEvent: async (id) => {
        try {
          const response = await taxCalendarApi.completeEvent(id);
          if (response.success) {
            set((state) => ({
              events: state.events.map((e) =>
                e.id === id ? { ...e, isCompleted: true } : e
              ),
              upcomingEvents: state.upcomingEvents.filter((e) => e.id !== id),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      deleteEvent: async (id) => {
        try {
          const response = await taxCalendarApi.deleteEvent(id);
          if (response.success) {
            set((state) => ({
              events: state.events.filter((e) => e.id !== id),
              upcomingEvents: state.upcomingEvents.filter((e) => e.id !== id),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Deductions Actions
      fetchDeductionCategories: async (year) => {
        set({ isLoadingDeductions: true, error: null });
        try {
          const response = await taxDeductionsApi.getCategories(year);
          if (response.success && response.data) {
            set({ deductionCategories: response.data.categories, isLoadingDeductions: false });
          } else {
            set({ error: response.error?.message, isLoadingDeductions: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch deductions',
            isLoadingDeductions: false,
          });
        }
      },

      fetchDeductionSummary: async (year) => {
        try {
          const response = await taxDeductionsApi.getSummary(year);
          if (response.success && response.data) {
            set({ deductionSummary: response.data });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch deduction summary:', error);
        }
      },

      addDeduction: async (deduction) => {
        try {
          const response = await taxDeductionsApi.add(deduction);
          if (response.success && response.data) {
            // Refresh categories to get updated totals
            await get().fetchDeductionCategories(get().selectedYear);
            await get().fetchDeductionSummary(get().selectedYear);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      updateDeduction: async (id, updates) => {
        try {
          const response = await taxDeductionsApi.update(id, updates);
          if (response.success) {
            await get().fetchDeductionCategories(get().selectedYear);
            await get().fetchDeductionSummary(get().selectedYear);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      deleteDeduction: async (id) => {
        try {
          const response = await taxDeductionsApi.delete(id);
          if (response.success) {
            await get().fetchDeductionCategories(get().selectedYear);
            await get().fetchDeductionSummary(get().selectedYear);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Documents Actions
      fetchDocuments: async (year) => {
        set({ isLoadingDocuments: true, error: null });
        try {
          const response = await taxDocumentsApi.getAll(year);
          if (response.success && response.data) {
            set({ documents: response.data.documents, isLoadingDocuments: false });
          } else {
            set({ error: response.error?.message, isLoadingDocuments: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch documents',
            isLoadingDocuments: false,
          });
        }
      },

      fetchMissingDocuments: async (year) => {
        try {
          const response = await taxDocumentsApi.getMissingChecklist(year);
          if (response.success && response.data) {
            set({ missingDocuments: response.data });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch missing documents:', error);
        }
      },

      deleteDocument: async (id) => {
        try {
          const response = await taxDocumentsApi.delete(id);
          if (response.success) {
            set((state) => ({
              documents: state.documents.filter((d) => d.id !== id),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Tips Actions
      fetchTips: async () => {
        try {
          const response = await taxTipsApi.getTips();
          if (response.success && response.data) {
            set({ tips: response.data.tips });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch tips:', error);
        }
      },

      dismissTip: async (id) => {
        try {
          const response = await taxTipsApi.dismissTip(id);
          if (response.success) {
            set((state) => ({
              tips: state.tips.filter((t) => t.id !== id),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Comparison Actions
      compareYears: async (years) => {
        set({ isLoading: true, error: null });
        try {
          const response = await taxComparisonApi.compare(years);
          if (response.success && response.data) {
            set({ yearComparisons: response.data.comparisons, isLoading: false });
          } else {
            set({ error: response.error?.message, isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to compare years',
            isLoading: false,
          });
        }
      },

      // Utility Actions
      setSelectedYear: (year) => set({ selectedYear: year }),
      clearError: () => set({ error: null }),
      resetStore: () => set(initialState),
    }),
    {
      name: 'fynvita-tax-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedYear: state.selectedYear,
        savedScenarios: state.savedScenarios,
      }),
    }
  )
);

// Selectors
export const selectAnalysis = (state: TaxState) => state.analysis;
export const selectBrackets = (state: TaxState) => state.brackets;
export const selectRecommendations = (state: TaxState) => state.recommendations;
export const selectPendingRecommendations = (state: TaxState) =>
  state.recommendations.filter((r) => r.status !== 'completed');
export const selectCriticalRecommendations = (state: TaxState) =>
  state.recommendations.filter((r) => r.priority === 'critical');
export const selectTotalPotentialSavings = (state: TaxState) =>
  state.analysis?.totalPotentialSavings ?? 0;
export const selectEffectiveRate = (state: TaxState) =>
  state.analysis?.currentProjection.effectiveRate ?? 0;
export const selectMonthlyTakeHome = (state: TaxState) =>
  state.analysis?.currentProjection.monthlyTakeHome ?? 0;

export const selectEvents = (state: TaxState) => state.events;
export const selectUpcomingEvents = (state: TaxState) => state.upcomingEvents;
export const selectCriticalEvents = (state: TaxState) =>
  state.events.filter((e) => e.priority === 'critical' && !e.isCompleted);

export const selectDeductionCategories = (state: TaxState) => state.deductionCategories;
export const selectDeductionSummary = (state: TaxState) => state.deductionSummary;
export const selectTotalDeductions = (state: TaxState) =>
  state.deductionSummary?.totalDeductions ?? 0;

export const selectDocuments = (state: TaxState) => state.documents;
export const selectUnverifiedDocuments = (state: TaxState) =>
  state.documents.filter((d) => !d.isVerified);

export const selectTips = (state: TaxState) => state.tips;
export const selectYearComparisons = (state: TaxState) => state.yearComparisons;

export const selectIsLoading = (state: TaxState) => state.isLoading;
export const selectError = (state: TaxState) => state.error;
