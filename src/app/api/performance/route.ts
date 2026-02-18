import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { PerformanceMonitor } from "@/lib/performance/performance-monitor";
import { cache } from "@/lib/cache/cache-service";

/**
 * GET /api/performance
 * Get performance metrics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    if (!rbac.hasPermission(validation.user, "admin:analytics")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
}

/**
 * DELETE /api/performance
 * Clear performance metrics (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    if (!rbac.hasPermission(validation.user, "admin:analytics")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
}
