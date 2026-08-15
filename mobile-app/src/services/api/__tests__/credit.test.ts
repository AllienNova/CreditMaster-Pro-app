/**
 * Fynvita Credit API Service Tests
 */

import {
  creditScoreApi,
  creditMonitoringApi,
  creditReportApi,
} from "../credit";
import { api } from "../client";

// Mock the API client
jest.mock("../client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("Credit Score API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getScores", () => {
    it("should fetch all credit scores", async () => {
      const mockScores = {
        scores: [
          { bureau: "experian", score: 720 },
          { bureau: "equifax", score: 715 },
        ],
      };

      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockScores,
      });

      const result = await creditScoreApi.getScores();

      expect(api.get).toHaveBeenCalledWith("/credit/scores", {
        enableCache: true,
        cacheTime: 300000,
      });
      expect(result.data).toEqual(mockScores);
    });
  });

  describe("getScoreByBureau", () => {
    it("should fetch score for specific bureau", async () => {
      const mockScore = { bureau: "experian", score: 720 };

      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockScore,
      });

      const result = await creditScoreApi.getScoreByBureau("experian");

      expect(api.get).toHaveBeenCalledWith("/credit/scores/experian");
      expect(result.data).toEqual(mockScore);
    });
  });

  describe("getHistory", () => {
    it("should fetch score history with params", async () => {
      const mockHistory = { dataPoints: [] };

      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockHistory,
      });

      await creditScoreApi.getHistory(6);

      expect(api.get).toHaveBeenCalledWith("/credit/scores/history?months=6");
    });

    it("should fetch score history without params", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ success: true, data: {} });

      await creditScoreApi.getHistory();

      expect(api.get).toHaveBeenCalledWith("/credit/scores/history");
    });
  });

  describe("getFactors", () => {
    it("should fetch credit factors", async () => {
      const mockFactors = [
        { factor: "Payment History", impact: 35, status: "good" },
      ];

      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockFactors,
      });

      const result = await creditScoreApi.getFactors();

      expect(api.get).toHaveBeenCalledWith("/credit/factors");
      expect(result.data).toEqual(mockFactors);
    });
  });

  describe("simulateImpact", () => {
    it("should simulate score impact", async () => {
      const mockResult = { currentScore: 720, projectedScore: 750, impact: 30 };

      (api.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      const result = await creditScoreApi.simulateImpact({ payOffDebt: 5000 });

      expect(api.post).toHaveBeenCalledWith("/credit/simulate", {
        payOffDebt: 5000,
      });
      expect(result.data).toEqual(mockResult);
    });
  });

  describe("refreshScores", () => {
    it("should request score refresh", async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { message: "Refresh initiated" },
      });

      await creditScoreApi.refreshScores();

      expect(api.post).toHaveBeenCalledWith("/credit/scores/refresh");
    });
  });
});

describe("Credit Monitoring API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStatus", () => {
    it("should fetch monitoring status", async () => {
      const mockStatus = { isActive: true, bureaus: ["experian", "equifax"] };

      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockStatus,
      });

      const result = await creditMonitoringApi.getStatus();

      expect(api.get).toHaveBeenCalledWith("/credit/monitoring/status");
      expect(result.data).toEqual(mockStatus);
    });
  });

  describe("getAlerts", () => {
    it("should fetch alerts with filters", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { items: [] },
      });

      await creditMonitoringApi.getAlerts({
        page: 1,
        limit: 10,
        unreadOnly: true,
      });

      // These three assertions previously pinned the paths the client USED
      // rather than the ones the server SERVES, so they passed while every one
      // of these calls 404'd. They now encode the real contract in
      // src/app/api/credit-monitoring/alerts/route.ts.
      expect(api.get).toHaveBeenCalledWith(
        "/credit-monitoring/alerts?page=1&limit=10&unreadOnly=true",
      );
    });
  });

  describe("acknowledgeAlert", () => {
    it("PATCHes the collection with the alert id in the body", async () => {
      (api.patch as jest.Mock).mockResolvedValueOnce({ success: true });

      await creditMonitoringApi.acknowledgeAlert("alert-123");

      // No per-alert sub-route exists; route.ts:63 reads `alertId` from the body.
      expect(api.patch).toHaveBeenCalledWith("/credit-monitoring/alerts", {
        alertId: "alert-123",
      });
    });
  });

  describe("acknowledgeAllAlerts", () => {
    it("PATCHes the collection with markAllAsRead", async () => {
      (api.patch as jest.Mock).mockResolvedValueOnce({ success: true });

      await creditMonitoringApi.acknowledgeAllAlerts();

      // route.ts:61 branches on `markAllAsRead`.
      expect(api.patch).toHaveBeenCalledWith("/credit-monitoring/alerts", {
        markAllAsRead: true,
      });
    });
  });
});

describe("Credit Report API", () => {
  describe("getReports", () => {
    it("should fetch all reports", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { reports: [] },
      });

      await creditReportApi.getReports();

      expect(api.get).toHaveBeenCalledWith("/credit/reports");
    });
  });

  describe("getReport", () => {
    it("should fetch single report", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: "report-1" },
      });

      await creditReportApi.getReport("report-1");

      expect(api.get).toHaveBeenCalledWith("/credit/reports/report-1");
    });
  });

  describe("analyzeReport", () => {
    it("should request AI analysis", async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { summary: "Analysis" },
      });

      await creditReportApi.analyzeReport("report-1");

      expect(api.post).toHaveBeenCalledWith("/credit/reports/report-1/analyze");
    });
  });
});
