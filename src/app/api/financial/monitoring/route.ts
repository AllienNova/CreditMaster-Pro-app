/**
 * Financial API Monitoring Endpoint
 *
 * Provides monitoring and statistics for financial API endpoints
 * - Request logs
 * - Performance metrics
 * - Rate limit statistics
 * - Error tracking
 *
 * @swagger
 * /api/financial/monitoring:
 *   get:
 *     summary: Get API monitoring statistics
 *     description: Returns comprehensive monitoring data for financial API endpoints
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of recent logs to return
 *     responses:
 *       200:
 *         description: Monitoring statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */

import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  getRequestLogs,
  getRequestStats,
} from "@/lib/api/financial-api-middleware";

// TASK-AUTH-03c: the CSV proposed_guard was `withAuth`, but the route body
// performed an inline `rbac.isAdmin` admin gate. Preserving that authorization
// means promoting to `withRole("admin")`. See AUTH-03c report.
export const GET = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    // Get query parameters
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Get monitoring data
    const logs = getRequestLogs(limit);
    const stats = getRequestStats();

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total: stats.total,
          averageDuration: Math.round(stats.averageDuration),
          errorRate: Math.round(stats.errorRate * 100) / 100,
          byEndpoint: stats.byEndpoint,
          byUser: stats.byUser,
          byStatus: stats.byStatus,
        },
        recentLogs: logs,
      },
      _meta: {
        timestamp: new Date().toISOString(),
        logsReturned: logs.length,
      },
    });
  } catch (error) {
    console.error("Monitoring endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve monitoring data",
        _meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
},
);
