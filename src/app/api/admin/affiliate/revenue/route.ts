import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { revenueTracker } from "@/lib/affiliate/revenue-tracker";
import { revenueDashboardService } from "@/lib/affiliate/compliance-checker";

/**
 * GET /api/admin/affiliate/revenue
 *
 * Admin endpoint for affiliate revenue dashboard.
 * Returns revenue metrics, audit log, and compliance timeline.
 *
 * Query params:
 *   view      - "metrics" | "audit" | "compliance" | "all" (default: "all")
 *   period    - "day" | "week" | "month" | "quarter" | "year" (default: "month")
 *   days      - Number of days for compliance timeline (default: 30)
 *   limit     - Max audit entries (default: 50)
 */
export const GET = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const view = searchParams.get("view") || "all";
      const period = searchParams.get("period") || "month";
      const days = Math.min(
        Math.max(1, Number.parseInt(searchParams.get("days") || "30")),
        365,
      );
      const limit = Math.min(
        Math.max(1, Number.parseInt(searchParams.get("limit") || "50")),
        500,
      );

      const data: Record<string, unknown> = {};

      if (view === "all" || view === "metrics") {
        const now = new Date();
        const periodDays: Record<string, number> = {
          day: 1,
          week: 7,
          month: 30,
          quarter: 90,
          year: 365,
        };
        const daysBack = periodDays[period] ?? 30;
        const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        const report = await revenueTracker.getReport({ start, end: now });
        const topProducts = await revenueTracker.getTopProducts(10);
        const topPartners = await revenueTracker.getTopPartners(10);
        const dashboardMetrics = revenueDashboardService.getMetrics();

        data.metrics = {
          report,
          topProducts,
          topPartners,
          dashboard: dashboardMetrics,
        };
      }

      if (view === "all" || view === "audit") {
        const auditLog = revenueDashboardService.getAuditLog({
          limit,
        });
        data.audit = auditLog;
      }

      if (view === "all" || view === "compliance") {
        const timeline = revenueDashboardService.getComplianceTimeline(days);
        const violations = revenueDashboardService.getViolationsByRegulation();
        data.compliance = { timeline, violations };
      }

      return NextResponse.json({
        success: true,
        data,
        meta: { view, period, days },
      });
    } catch (error) {
      console.error("Error fetching affiliate revenue data:", error);
      return NextResponse.json(
        { error: "Failed to fetch affiliate revenue data" },
        { status: 500 },
      );
    }
  },
);
