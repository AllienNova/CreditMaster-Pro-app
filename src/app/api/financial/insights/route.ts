/**
 * Financial Insights API
 *
 * GET /api/financial/insights - Get AI-powered financial insights
 * POST /api/financial/insights/dismiss - Dismiss an insight
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { smartInsightsEngine } from '@/lib/financial/smart-insights-engine';
import {
  InsightType,
  InsightCategory,
  InsightPriority,
  InsightGenerationOptions,
} from '@/lib/financial/types/insight.types';

/**
 * GET /api/financial/insights
 * Returns AI-powered financial insights for the authenticated user
 *
 * Query Parameters:
 * - types: comma-separated insight types to include
 * - categories: comma-separated categories to include
 * - minPriority: minimum priority level (critical, high, medium, low, info)
 * - limit: maximum number of insights to return (default: 20)
 * - includeAI: include AI-generated recommendations (default: true)
 * - includeDismissed: include dismissed insights (default: false)
 * - stored: get stored insights from database instead of generating new ones
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (
      !rbac.hasPermission(
        validation.user as Parameters<typeof rbac.hasPermission>[0],
        'financial:read'
      )
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse options from query params
    const options: InsightGenerationOptions = {};

    const typesParam = searchParams.get('types');
    if (typesParam) {
      options.types = typesParam.split(',') as InsightType[];
    }

    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      options.categories = categoriesParam.split(',') as InsightCategory[];
    }

    const minPriority = searchParams.get('minPriority');
    if (minPriority) {
      options.minPriority = minPriority as InsightPriority;
    }

    const limit = searchParams.get('limit');
    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    options.includeAI = searchParams.get('includeAI') !== 'false';
    options.includeDismissed = searchParams.get('includeDismissed') === 'true';

    // Check if requesting stored insights or generating new ones
    const useStored = searchParams.get('stored') === 'true';

    if (useStored) {
      const insights = await smartInsightsEngine.getStoredInsights(
        validation.user.id,
        options
      );
      return NextResponse.json({
        success: true,
        data: insights,
        _meta: { source: 'stored' },
      });
    }

    // Generate new insights
    const result = await smartInsightsEngine.generateInsights(
      validation.user.id,
      options
    );

    return NextResponse.json({
      success: true,
      data: result.insights,
      _meta: {
        source: 'generated',
        generatedAt: result.generatedAt,
        processingTimeMs: result.processingTimeMs,
        aiModelUsed: result.aiModelUsed,
        dataSourcesUsed: result.dataSourcesUsed,
      },
    });
  } catch (error) {
    console.error('Error fetching financial insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial insights' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/insights
 * Dismiss an insight or record an action
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !rbac.hasPermission(
        validation.user as Parameters<typeof rbac.hasPermission>[0],
        'financial:write'
      )
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { insightId, action } = body;

    if (!insightId) {
      return NextResponse.json(
        { error: 'insightId is required' },
        { status: 400 }
      );
    }

    if (action === 'dismiss') {
      const success = await smartInsightsEngine.dismissInsight(
        insightId,
        validation.user.id
      );
      return NextResponse.json({ success });
    }

    if (action) {
      const success = await smartInsightsEngine.recordAction(
        insightId,
        validation.user.id,
        action
      );
      return NextResponse.json({ success });
    }

    return NextResponse.json(
      { error: 'action is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing insight action:', error);
    return NextResponse.json(
      { error: 'Failed to process insight action' },
      { status: 500 }
    );
  }
}

