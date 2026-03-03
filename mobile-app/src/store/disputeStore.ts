/**
 * Fynvita Dispute Store
 * Manages disputes, templates, strategies, and AI letter generation
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  disputeApi,
  disputeLetterApi,
  disputeResourcesApi,
} from "../services/api";
import type {
  Dispute,
  DisputeTemplate,
  DisputeStrategy,
  DisputeReason,
} from "../services/api/types";
import { seedDisputes, seedDisputeTemplates, seedDisputeStrategies, seedDisputeReasons } from "../data/dev-seed";

interface DisputeState {
  // Disputes
  disputes: Dispute[];
  currentDispute: Dispute | null;
  totalDisputes: number;

  // Templates & Strategies
  templates: DisputeTemplate[];
  strategies: DisputeStrategy[];
  reasons: DisputeReason[];

  // AI Letter Generation
  generatedLetter: string | null;
  isGeneratingLetter: boolean;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isSending: boolean;

  // Errors
  error: string | null;

  // Filters
  statusFilter: Dispute["status"] | "all";
  bureauFilter: string | "all";

  // Actions - Disputes
  fetchDisputes: (params?: { page?: number; status?: string }) => Promise<void>;
  fetchDisputeById: (id: string) => Promise<void>;
  createDispute: (
    dispute: Omit<Dispute, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => Promise<Dispute | null>;
  updateDispute: (id: string, updates: Partial<Dispute>) => Promise<boolean>;
  deleteDispute: (id: string) => Promise<boolean>;
  sendDispute: (id: string) => Promise<boolean>;

  // Actions - AI Letters
  generateAILetter: (params: {
    disputeType: string;
    bureau: string;
    accountInfo: Record<string, unknown>;
    tone?: "professional" | "assertive" | "legal";
    includeStatutes?: boolean;
  }) => Promise<string | null>;
  clearGeneratedLetter: () => void;

  // Actions - Resources
  fetchTemplates: () => Promise<void>;
  fetchStrategies: () => Promise<void>;
  fetchReasons: () => Promise<void>;
  getStrategyRecommendations: (
    disputeType: string,
  ) => Promise<DisputeStrategy[]>;

  // Actions - Filters
  setStatusFilter: (status: Dispute["status"] | "all") => void;
  setBureauFilter: (bureau: string | "all") => void;

  // Actions - Utility
  clearError: () => void;
  resetStore: () => void;

  // Direct setters for hooks
  setDisputes: (disputes: Dispute[]) => void;
}

const initialState = {
  disputes: [],
  currentDispute: null,
  totalDisputes: 0,
  templates: [],
  strategies: [],
  reasons: [],
  generatedLetter: null,
  isGeneratingLetter: false,
  isLoading: false,
  isCreating: false,
  isSending: false,
  error: null,
  statusFilter: "all" as const,
  bureauFilter: "all" as const,
};

export const useDisputeStore = create<DisputeState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchDisputes: async (params) => {
        set({ isLoading: true, error: null });
        if (__DEV__) {
          set({ disputes: seedDisputes, totalDisputes: seedDisputes.length, isLoading: false });
          return;
        }
        try {
          const { statusFilter, bureauFilter } = get();
          const response = await disputeApi.getAll({
            ...params,
            status: statusFilter !== "all" ? statusFilter : undefined,
            bureau: bureauFilter !== "all" ? bureauFilter : undefined,
          });
          if (response.success && response.data) {
            set({
              disputes: response.data.items,
              totalDisputes: response.data.total,
              isLoading: false,
            });
          } else {
            set({ error: response.error?.message, isLoading: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch disputes",
            isLoading: false,
          });
        }
      },

      fetchDisputeById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await disputeApi.getById(id);
          if (response.success && response.data) {
            set({ currentDispute: response.data, isLoading: false });
          } else {
            set({ error: response.error?.message, isLoading: false });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch dispute",
            isLoading: false,
          });
        }
      },

      createDispute: async (dispute) => {
        set({ isCreating: true, error: null });
        try {
          const response = await disputeApi.create(dispute);
          if (response.success && response.data) {
            set((state) => ({
              disputes: [response.data!, ...state.disputes],
              totalDisputes: state.totalDisputes + 1,
              isCreating: false,
            }));
            return response.data;
          }
          set({ error: response.error?.message, isCreating: false });
          return null;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to create dispute",
            isCreating: false,
          });
          return null;
        }
      },

      updateDispute: async (id, updates) => {
        try {
          const response = await disputeApi.update(id, updates);
          if (response.success && response.data) {
            set((state) => ({
              disputes: state.disputes.map((d) =>
                d.id === id ? response.data! : d,
              ),
              currentDispute:
                state.currentDispute?.id === id
                  ? response.data
                  : state.currentDispute,
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      deleteDispute: async (id) => {
        try {
          const response = await disputeApi.delete(id);
          if (response.success) {
            set((state) => ({
              disputes: state.disputes.filter((d) => d.id !== id),
              totalDisputes: state.totalDisputes - 1,
              currentDispute:
                state.currentDispute?.id === id ? null : state.currentDispute,
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      sendDispute: async (id) => {
        set({ isSending: true, error: null });
        try {
          const response = await disputeApi.send(id);
          if (response.success && response.data) {
            set((state) => ({
              disputes: state.disputes.map((d) =>
                d.id === id ? response.data! : d,
              ),
              currentDispute:
                state.currentDispute?.id === id
                  ? response.data
                  : state.currentDispute,
              isSending: false,
            }));
            return true;
          }
          set({ error: response.error?.message, isSending: false });
          return false;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to send dispute",
            isSending: false,
          });
          return false;
        }
      },

      generateAILetter: async (params) => {
        set({ isGeneratingLetter: true, error: null, generatedLetter: null });
        try {
          // Get current dispute ID or use the disputeType to find/create one
          const currentDispute = get().currentDispute;
          const disputeId = currentDispute?.id;

          if (!disputeId) {
            // If no current dispute, create a temporary one or use template generation
            const response = await disputeLetterApi.generateFromTemplate(
              params.disputeType,
              {
                bureau: params.bureau,
                ...(params.accountInfo as Record<string, string>),
              },
            );
            if (response.success && response.data) {
              set({
                generatedLetter: response.data.letter,
                isGeneratingLetter: false,
              });
              return response.data.letter;
            }
          } else {
            const response = await disputeLetterApi.generateAILetter(disputeId);
            if (response.success && response.data) {
              set({
                generatedLetter: response.data.letter,
                isGeneratingLetter: false,
              });
              return response.data.letter;
            }
          }
          set({
            error: "Failed to generate letter",
            isGeneratingLetter: false,
          });
          return null;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to generate letter",
            isGeneratingLetter: false,
          });
          return null;
        }
      },

      clearGeneratedLetter: () => set({ generatedLetter: null }),

      fetchTemplates: async () => {
        if (__DEV__) { set({ templates: seedDisputeTemplates }); return; }
        try {
          const response = await disputeResourcesApi.getTemplates();
          if (response.success && response.data) {
            set({ templates: response.data.templates });
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to fetch templates:", error);
        }
      },

      fetchStrategies: async () => {
        if (__DEV__) { set({ strategies: seedDisputeStrategies }); return; }
        try {
          const response = await disputeResourcesApi.getStrategies();
          if (response.success && response.data) {
            set({ strategies: response.data.strategies });
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to fetch strategies:", error);
        }
      },

      fetchReasons: async () => {
        if (__DEV__) { set({ reasons: seedDisputeReasons }); return; }
        try {
          const response = await disputeResourcesApi.getReasons();
          if (response.success && response.data) {
            set({ reasons: response.data.reasons });
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to fetch reasons:", error);
        }
      },

      getStrategyRecommendations: async (disputeType) => {
        try {
          const response = await disputeLetterApi.getStrategyRecommendations({
            disputeType,
          });
          if (response.success && response.data) {
            // Map recommendations to strategies
            const strategies = get().strategies;
            return response.data.recommendations
              .map((rec) => strategies.find((s) => s.id === rec.strategyId))
              .filter((s): s is DisputeStrategy => s !== undefined);
          }
          return [];
        } catch {
          return [];
        }
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status });
        get().fetchDisputes();
      },

      setBureauFilter: (bureau) => {
        set({ bureauFilter: bureau });
        get().fetchDisputes();
      },

      clearError: () => set({ error: null }),

      resetStore: () => set(initialState),

      setDisputes: (disputes) =>
        set({ disputes, totalDisputes: disputes.length }),
    }),
    {
      name: "cpfi-dispute-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        templates: state.templates,
        strategies: state.strategies,
        reasons: state.reasons,
      }),
    },
  ),
);

// Selectors
export const selectDisputes = (state: DisputeState) => state.disputes;
export const selectDisputesByStatus =
  (status: Dispute["status"]) => (state: DisputeState) =>
    state.disputes.filter((d) => d.status === status);
export const selectActiveDisputes = (state: DisputeState) =>
  state.disputes.filter((d) =>
    ["pending", "in_progress", "under_review"].includes(d.status),
  );
export const selectResolvedDisputes = (state: DisputeState) =>
  state.disputes.filter((d) => d.status === "resolved");
export const selectDisputeStats = (state: DisputeState) => ({
  total: state.totalDisputes,
  pending: state.disputes.filter((d) => d.status === "pending").length,
  inProgress: state.disputes.filter((d) => d.status === "in_progress").length,
  resolved: state.disputes.filter((d) => d.status === "resolved").length,
  rejected: state.disputes.filter((d) => d.status === "rejected").length,
});
