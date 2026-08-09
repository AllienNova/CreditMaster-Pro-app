import type { NextRequest } from "next/server";
import { GET } from "../route";

// Mock dependencies
// Route wrapped in withRole("admin") (TASK-AUTH-03a); guard resolves auth via
// jwtValidation.validateFromHeaders + resolveRoleFromDb.
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: jest.fn(),
  },
}));

jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn(),
}));

jest.mock("@/lib/affiliate/revenue-tracker", () => ({
  revenueTracker: {
    getReport: jest.fn().mockResolvedValue({
      totalRevenue: 1500,
      totalClicks: 200,
      totalConversions: 15,
      conversionRate: 7.5,
      period: { start: new Date("2026-01-01"), end: new Date("2026-01-31") },
    }),
    getTopProducts: jest.fn().mockResolvedValue([
      { productId: "p-1", name: "Card A", revenue: 800, clicks: 100 },
    ]),
    getTopPartners: jest.fn().mockResolvedValue([
      { partnerId: "partner-1", name: "MoneyLion", revenue: 1500 },
    ]),
  },
}));

jest.mock("@/lib/affiliate/compliance-checker", () => ({
  complianceChecker: {
    check: jest.fn(),
  },
  revenueDashboardService: {
    getMetrics: jest.fn().mockReturnValue({
      totalAuditEntries: 50,
      complianceRate: 98.5,
      violationCount: 1,
    }),
    getAuditLog: jest.fn().mockReturnValue([
      { id: "audit-1", action: "compliance_check", timestamp: new Date() },
    ]),
    getComplianceTimeline: jest.fn().mockReturnValue([
      { date: "2026-01-15", checks: 10, violations: 0 },
    ]),
    getViolationsByRegulation: jest.fn().mockReturnValue({
      FTC: 0,
      CFPB: 1,
      TILA: 0,
    }),
  },
}));

import { jwtValidation } from "@/lib/auth/jwt-validation";
import { resolveRoleFromDb } from "@/lib/auth/resolve-role";
import { revenueTracker } from "@/lib/affiliate/revenue-tracker";
import { revenueDashboardService } from "@/lib/affiliate/compliance-checker";

const mockJwt = jwtValidation.validateFromHeaders as jest.Mock;
const mockResolveRole = resolveRoleFromDb as jest.Mock;

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const adminUser = {
  valid: true,
  user: { id: "admin-1", email: "admin@example.com" },
};

const regularUser = {
  valid: true,
  user: { id: "user-1", email: "user@example.com" },
};

describe("GET /api/admin/affiliate/revenue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.mockResolvedValue(adminUser);
    mockResolveRole.mockResolvedValue("admin");
    // Restore revenue tracker mock returns cleared by clearAllMocks.
    (revenueTracker.getReport as jest.Mock).mockResolvedValue({
      totalRevenue: 1500,
      totalClicks: 200,
      totalConversions: 15,
      conversionRate: 7.5,
      period: { start: new Date("2026-01-01"), end: new Date("2026-01-31") },
    });
    (revenueTracker.getTopProducts as jest.Mock).mockResolvedValue([
      { productId: "p-1", name: "Card A", revenue: 800, clicks: 100 },
    ]);
    (revenueTracker.getTopPartners as jest.Mock).mockResolvedValue([
      { partnerId: "partner-1", name: "MoneyLion", revenue: 1500 },
    ]);
  });

  describe("negative-auth", () => {
    it("returns 401 when not authenticated", async () => {
      mockJwt.mockResolvedValue({ valid: false, user: null });

      const req = createMockRequest(
        "http://localhost:3000/api/admin/affiliate/revenue",
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when authenticated user is not an admin", async () => {
      mockJwt.mockResolvedValue(regularUser);
      mockResolveRole.mockResolvedValue("user");

      const req = createMockRequest(
        "http://localhost:3000/api/admin/affiliate/revenue",
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Forbidden");
    });
  });

  it("returns all views by default", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("metrics");
    expect(json.data).toHaveProperty("audit");
    expect(json.data).toHaveProperty("compliance");
    expect(json.meta.view).toBe("all");
  });

  it("returns only metrics when view=metrics", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=metrics",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("metrics");
    expect(json.data).not.toHaveProperty("audit");
    expect(json.data).not.toHaveProperty("compliance");
  });

  it("returns only audit log when view=audit", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=audit",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("audit");
    expect(json.data).not.toHaveProperty("metrics");
    expect(json.data).not.toHaveProperty("compliance");
  });

  it("returns only compliance data when view=compliance", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=compliance",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty("compliance");
    expect(json.data.compliance).toHaveProperty("timeline");
    expect(json.data.compliance).toHaveProperty("violations");
    expect(json.data).not.toHaveProperty("metrics");
  });

  it("passes period parameter for metrics calculation", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=metrics&period=week",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(revenueTracker.getReport).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date),
      }),
    );
    expect(json.meta.period).toBe("week");
  });

  it("passes days parameter for compliance timeline", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=compliance&days=90",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(revenueDashboardService.getComplianceTimeline).toHaveBeenCalledWith(
      90,
    );
  });

  it("caps days at 365", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=compliance&days=999",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.meta.days).toBe(365);
  });

  it("passes limit parameter for audit log", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=audit&limit=25",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(revenueDashboardService.getAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 }),
    );
  });

  it("caps limit at 500", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=audit&limit=1000",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(revenueDashboardService.getAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 500 }),
    );
  });

  it("includes top products and partners in metrics", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=metrics",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.metrics).toHaveProperty("topProducts");
    expect(json.data.metrics).toHaveProperty("topPartners");
    expect(json.data.metrics).toHaveProperty("dashboard");
    expect(revenueTracker.getTopProducts).toHaveBeenCalledWith(10);
    expect(revenueTracker.getTopPartners).toHaveBeenCalledWith(10);
  });

  it("serialises awaited report data into the response (not a Promise {})", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=metrics",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // If getReport/getTopProducts/getTopPartners were not awaited, these would
    // serialize as `{}` because JSON.stringify coerces Promises to empty objects.
    expect(json.data.metrics.report.totalRevenue).toBe(1500);
    expect(json.data.metrics.topProducts[0].productId).toBe("p-1");
    expect(json.data.metrics.topPartners[0].partnerId).toBe("partner-1");
  });

  it("handles service errors gracefully", async () => {
    (revenueTracker.getReport as jest.Mock).mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to fetch affiliate revenue data");
  });

  it("defaults period to month (30 days)", async () => {
    const req = createMockRequest(
      "http://localhost:3000/api/admin/affiliate/revenue?view=metrics",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.meta.period).toBe("month");

    const call = (revenueTracker.getReport as jest.Mock).mock.calls[0][0];
    const daysDiff =
      (call.end.getTime() - call.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(daysDiff)).toBe(30);
  });
});
