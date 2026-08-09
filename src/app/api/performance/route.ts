import { NextRequest, NextResponse } from "next/server";
import { withRole, type AuthedUser } from "@/lib/auth/api-guard";
import { PerformanceMonitor } from "@/lib/performance/performance-monitor";
import { cache } from "@/lib/cache/cache-service";

/**
 * GET /api/performance
 * Get performance metrics (admin only)
 */
export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
  try {
    // Get performance report
    const report = PerformanceMonitor.getReport();
    const memoryUsage = PerformanceMonitor.getMemoryUsage();
    const cpuUsage = PerformanceMonitor.getCPUUsage();
    const cacheStats = cache.getStats();

    return NextResponse.json({
      performance: report,
      system: {
        memory: memoryUsage,
        cpu: cpuUsage,
        uptime: process.uptime(),
      },
      cache: cacheStats,
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 },
    );
  }
},
);

/**
 * DELETE /api/performance
 * Clear performance metrics (admin only)
 */
export const DELETE = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
  try {
    // Clear metrics
    PerformanceMonitor.clearMetrics();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to clear performance metrics" },
      { status: 500 },
    );
  }
},
);
