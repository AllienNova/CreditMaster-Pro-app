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

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { getRequestLogs, getRequestStats } from '@/lib/api/financial-api-middleware';

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', _meta: { timestamp: new Date().toISOString() } },
        { status: 401 }
      );
    }

    // Check admin permission
    if (!rbac.hasPermission(validation.user, 'admin:read')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required', _meta: { timestamp: new Date().toISOString() } },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

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
    console.error('Monitoring endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve monitoring data',
        _meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

