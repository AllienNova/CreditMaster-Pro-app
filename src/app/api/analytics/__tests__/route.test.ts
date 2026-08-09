/**
 * @jest-environment node
 *
 * Includes data-shape checks plus negative-auth coverage for the
 * withAuth-wrapped /api/analytics handler (TASK-AUTH-03f).
 */
import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/auth/rbac", () => ({
  rbac: { hasPermission: jest.fn(() => false) },
}));
jest.mock("@/lib/analytics", () => ({
  AnalyticsEngine: {
    getUserAnalytics: jest.fn(),
    getDisputeAnalytics: jest.fn(),
    getWorkflowAnalytics: jest.fn(),
    getAIUsageAnalytics: jest.fn(),
    getFinancialImpact: jest.fn(),
    getDashboardMetrics: jest.fn(),
  },
}));

import { GET } from "../route";

describe("negative-auth – /api/analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    const url = "http://localhost:3000/api/analytics";
    const req = {
      url,
      method: "GET",
      headers: new Headers(),
      nextUrl: new URL(url),
      json: jest.fn().mockResolvedValue({}),
    } as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("Analytics API Routes", () => {
  describe("Event Tracking", () => {
    it("should have all event types", () => {
      const events = [
        { name: "page_view", category: "navigation" },
        { name: "button_click", category: "interaction" },
        { name: "form_submit", category: "conversion" },
        { name: "error", category: "system" },
        { name: "purchase", category: "revenue" },
      ];
      expect(events.length).toBe(5);
    });

    it("should categorize events correctly", () => {
      const events = [
        { name: "page_view", category: "navigation" },
        { name: "button_click", category: "interaction" },
        { name: "form_submit", category: "conversion" },
        { name: "error", category: "system" },
        { name: "purchase", category: "revenue" },
      ];
      const categories = Array.from(new Set(events.map((e) => e.category)));
      expect(categories).toContain("navigation");
      expect(categories).toContain("interaction");
      expect(categories).toContain("conversion");
    });

    it("should create event with timestamp", () => {
      const createEvent = (name: string, data: Record<string, unknown>) => ({
        id: `evt_${Date.now()}`,
        name,
        data,
        timestamp: new Date().toISOString(),
        sessionId: "sess_123",
      });

      const event = createEvent("page_view", { path: "/dashboard" });
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("timestamp");
      expect(event.name).toBe("page_view");
    });
  });

  describe("Metrics Aggregation", () => {
    const dailyMetrics = [
      { date: "2024-01-01", users: 100, sessions: 150, pageViews: 500 },
      { date: "2024-01-02", users: 120, sessions: 180, pageViews: 600 },
      { date: "2024-01-03", users: 90, sessions: 130, pageViews: 450 },
    ];

    it("should calculate total users", () => {
      const totalUsers = dailyMetrics.reduce((sum, d) => sum + d.users, 0);
      expect(totalUsers).toBe(310);
    });

    it("should calculate average sessions per user", () => {
      const totalUsers = dailyMetrics.reduce((sum, d) => sum + d.users, 0);
      const totalSessions = dailyMetrics.reduce(
        (sum, d) => sum + d.sessions,
        0,
      );
      const avgSessions = totalSessions / totalUsers;
      expect(avgSessions).toBeCloseTo(1.48, 1);
    });

    it("should calculate page views per session", () => {
      const totalSessions = dailyMetrics.reduce(
        (sum, d) => sum + d.sessions,
        0,
      );
      const totalPageViews = dailyMetrics.reduce(
        (sum, d) => sum + d.pageViews,
        0,
      );
      const pvPerSession = totalPageViews / totalSessions;
      expect(pvPerSession).toBeCloseTo(3.37, 1);
    });
  });

  describe("Cohort Analysis", () => {
    const cohorts = [
      { week: "W1", users: 100, retained: [100, 80, 60, 50] },
      { week: "W2", users: 120, retained: [120, 90, 70] },
      { week: "W3", users: 90, retained: [90, 75] },
    ];

    it("should calculate retention rates", () => {
      const calculateRetention = (cohort: (typeof cohorts)[0]) => {
        return cohort.retained.map((r) => Math.round((r / cohort.users) * 100));
      };

      const w1Retention = calculateRetention(cohorts[0]);
      expect(w1Retention).toEqual([100, 80, 60, 50]);
    });

    it("should calculate average retention by period", () => {
      const period1Retention = cohorts.map((c) => c.retained[1] / c.users);
      const avgRetention =
        period1Retention.reduce((a, b) => a + b, 0) / period1Retention.length;
      expect(avgRetention).toBeCloseTo(0.79, 1);
    });
  });

  describe("Revenue Analytics", () => {
    const revenueData = [
      { month: "2024-01", mrr: 10000, newMrr: 2000, churnedMrr: 500 },
      { month: "2024-02", mrr: 11500, newMrr: 2500, churnedMrr: 1000 },
      { month: "2024-03", mrr: 13000, newMrr: 2000, churnedMrr: 500 },
    ];

    it("should calculate MRR growth", () => {
      const growth = revenueData.map((d, i) => {
        if (i === 0) return 0;
        return Math.round(
          ((d.mrr - revenueData[i - 1].mrr) / revenueData[i - 1].mrr) * 100,
        );
      });
      expect(growth).toEqual([0, 15, 13]);
    });

    it("should calculate net MRR change", () => {
      const netChange = revenueData.map((d) => d.newMrr - d.churnedMrr);
      expect(netChange).toEqual([1500, 1500, 1500]);
    });

    it("should calculate churn rate", () => {
      const churnRates = revenueData.map((d) =>
        Math.round((d.churnedMrr / d.mrr) * 100),
      );
      expect(churnRates[0]).toBe(5);
    });
  });

  describe("Funnel Analysis", () => {
    const funnel = [
      { step: "Visit", count: 10000 },
      { step: "Signup", count: 2000 },
      { step: "Activate", count: 1000 },
      { step: "Subscribe", count: 200 },
    ];

    it("should calculate conversion rates", () => {
      const conversionRates = funnel.map((step, i) => {
        if (i === 0) return 100;
        return Math.round((step.count / funnel[i - 1].count) * 100);
      });
      expect(conversionRates).toEqual([100, 20, 50, 20]);
    });

    it("should calculate overall conversion", () => {
      const overallConversion =
        (funnel[funnel.length - 1].count / funnel[0].count) * 100;
      expect(overallConversion).toBe(2);
    });

    it("should identify biggest drop-off", () => {
      const dropOffs = funnel.slice(1).map((step, i) => ({
        from: funnel[i].step,
        to: step.step,
        dropOff: funnel[i].count - step.count,
      }));
      const biggest = dropOffs.reduce((max, d) =>
        d.dropOff > max.dropOff ? d : max,
      );
      expect(biggest.from).toBe("Visit");
      expect(biggest.dropOff).toBe(8000);
    });
  });

  describe("Time Series", () => {
    it("should group data by time period", () => {
      const data = [
        { timestamp: "2024-01-01T10:00:00Z", value: 10 },
        { timestamp: "2024-01-01T11:00:00Z", value: 15 },
        { timestamp: "2024-01-02T10:00:00Z", value: 20 },
      ];

      const groupByDay = (items: typeof data) => {
        return items.reduce(
          (acc, item) => {
            const day = item.timestamp.split("T")[0];
            if (!acc[day]) acc[day] = [];
            acc[day].push(item);
            return acc;
          },
          {} as Record<string, typeof data>,
        );
      };

      const grouped = groupByDay(data);
      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped["2024-01-01"]).toHaveLength(2);
    });
  });
});
