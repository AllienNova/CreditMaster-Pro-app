/**
 * Fynvita Tax Store Unit Tests
 */

import { act } from "@testing-library/react-native";
import {
  useTaxStore,
  selectAnalysis,
  selectTotalPotentialSavings,
  selectEffectiveRate,
  selectPendingRecommendations,
  selectIsLoading,
  selectError,
} from "../taxStore";

jest.mock("../../services/api/tax", () => ({
  taxAnalysisApi: {
    analyze: jest.fn(),
    getBrackets: jest.fn(),
    getRecommendations: jest.fn(),
    completeRecommendation: jest.fn(),
  },
  taxScenariosApi: {
    calculate: jest.fn(),
    compare: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    getSaved: jest.fn(),
  },
  taxCalendarApi: {
    getEvents: jest.fn(),
    createReminder: jest.fn(),
    completeEvent: jest.fn(),
    deleteEvent: jest.fn(),
  },
  taxDeductionsApi: {
    getCategories: jest.fn(),
    getSummary: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  taxDocumentsApi: {
    getAll: jest.fn(),
    getMissingChecklist: jest.fn(),
    delete: jest.fn(),
  },
  taxTipsApi: {
    getTips: jest.fn(),
    dismissTip: jest.fn(),
  },
  taxComparisonApi: {
    compare: jest.fn(),
  },
}));

const { taxAnalysisApi, taxCalendarApi, taxDocumentsApi } = require("../../services/api/tax");

const mockAnalysis = {
  totalPotentialSavings: 3500,
  currentProjection: { effectiveRate: 22.5, monthlyTakeHome: 5200 },
};

describe("Tax Store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTaxStore.getState().resetStore();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useTaxStore.getState();
      expect(state.analysis).toBeNull();
      expect(state.recommendations).toEqual([]);
      expect(state.events).toEqual([]);
      expect(state.documents).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchAnalysis", () => {
    it("should fetch analysis successfully", async () => {
      taxAnalysisApi.analyze.mockResolvedValue({ success: true, data: mockAnalysis });

      await act(async () => {
        await useTaxStore.getState().fetchAnalysis({
          taxYear: 2025, grossIncome: 85000,
          filingStatus: "single", stateOfResidence: "CA",
        });
      });

      const state = useTaxStore.getState();
      expect(state.analysis).toEqual(mockAnalysis);
      expect(state.isLoadingAnalysis).toBe(false);
    });

    it("should handle API error", async () => {
      taxAnalysisApi.analyze.mockResolvedValue({
        success: false,
        error: { message: "Invalid input" },
      });

      await act(async () => {
        await useTaxStore.getState().fetchAnalysis({
          taxYear: 2025, grossIncome: 0,
          filingStatus: "single", stateOfResidence: "CA",
        });
      });

      expect(useTaxStore.getState().error).toBe("Invalid input");
    });

    it("should handle thrown exception", async () => {
      taxAnalysisApi.analyze.mockRejectedValue(new Error("Timeout"));

      await act(async () => {
        await useTaxStore.getState().fetchAnalysis({
          taxYear: 2025, grossIncome: 85000,
          filingStatus: "single", stateOfResidence: "CA",
        });
      });

      expect(useTaxStore.getState().error).toBe("Timeout");
    });
  });

  describe("fetchEvents", () => {
    it("should fetch all events", async () => {
      const mockEvents = [
        { id: "e-1", title: "Q1 Estimated Tax", date: "2025-04-15", priority: "critical", isCompleted: false },
      ];
      taxCalendarApi.getEvents.mockResolvedValue({ success: true, data: { events: mockEvents } });

      await act(async () => {
        await useTaxStore.getState().fetchEvents(2025, false);
      });

      expect(useTaxStore.getState().events).toEqual(mockEvents);
    });

    it("should fetch upcoming events only", async () => {
      const mockUpcoming = [{ id: "e-2", title: "File Extension", date: "2025-10-15" }];
      taxCalendarApi.getEvents.mockResolvedValue({ success: true, data: { events: mockUpcoming } });

      await act(async () => {
        await useTaxStore.getState().fetchEvents(2025, true);
      });

      expect(useTaxStore.getState().upcomingEvents).toEqual(mockUpcoming);
    });
  });

  describe("fetchDocuments", () => {
    it("should fetch documents successfully", async () => {
      const mockDocs = [{ id: "d-1", name: "W-2", isVerified: true }];
      taxDocumentsApi.getAll.mockResolvedValue({ success: true, data: { documents: mockDocs } });

      await act(async () => {
        await useTaxStore.getState().fetchDocuments(2025);
      });

      expect(useTaxStore.getState().documents).toEqual(mockDocs);
    });

    it("should handle error", async () => {
      taxDocumentsApi.getAll.mockRejectedValue(new Error("Fetch failed"));

      await act(async () => {
        await useTaxStore.getState().fetchDocuments(2025);
      });

      expect(useTaxStore.getState().error).toBe("Fetch failed");
    });
  });

  describe("setSelectedYear", () => {
    it("should update selected year", () => {
      useTaxStore.getState().setSelectedYear(2024);
      expect(useTaxStore.getState().selectedYear).toBe(2024);
    });
  });

  describe("Selectors", () => {
    it("selectAnalysis returns analysis", () => {
      useTaxStore.setState({ analysis: mockAnalysis as never });
      expect(selectAnalysis(useTaxStore.getState())).toEqual(mockAnalysis);
    });

    it("selectTotalPotentialSavings returns savings", () => {
      useTaxStore.setState({ analysis: mockAnalysis as never });
      expect(selectTotalPotentialSavings(useTaxStore.getState())).toBe(3500);
    });

    it("selectEffectiveRate returns rate", () => {
      useTaxStore.setState({ analysis: mockAnalysis as never });
      expect(selectEffectiveRate(useTaxStore.getState())).toBe(22.5);
    });

    it("selectPendingRecommendations filters non-completed", () => {
      useTaxStore.setState({
        recommendations: [
          { id: "r-1", status: "pending", priority: "high" },
          { id: "r-2", status: "completed", priority: "medium" },
        ] as never[],
      });
      expect(selectPendingRecommendations(useTaxStore.getState())).toHaveLength(1);
    });

    it("selectIsLoading returns loading state", () => {
      expect(selectIsLoading(useTaxStore.getState())).toBe(false);
    });

    it("selectError returns error", () => {
      useTaxStore.setState({ error: "err" });
      expect(selectError(useTaxStore.getState())).toBe("err");
    });

    it("returns defaults when analysis is null", () => {
      expect(selectTotalPotentialSavings(useTaxStore.getState())).toBe(0);
      expect(selectEffectiveRate(useTaxStore.getState())).toBe(0);
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useTaxStore.setState({ error: "some error" });
      useTaxStore.getState().clearError();
      expect(useTaxStore.getState().error).toBeNull();
    });
  });

  describe("resetStore", () => {
    it("should reset to initial state", () => {
      useTaxStore.setState({ analysis: mockAnalysis as never, error: "err" });
      useTaxStore.getState().resetStore();
      expect(useTaxStore.getState().analysis).toBeNull();
      expect(useTaxStore.getState().error).toBeNull();
    });
  });
});
