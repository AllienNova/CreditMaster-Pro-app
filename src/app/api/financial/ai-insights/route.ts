/**
 * AI Insights Panel API
 * Combines insights, predictions, and health score for dashboard display
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { smartInsightsEngine } from '@/lib/financial/smart-insights-engine';

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

    const userId = validation.user.id;

    // Fetch insights
    const insightsResult = await smartInsightsEngine.generateInsights(userId, {
      limit: 4,
      includeAI: true,
      minPriority: 'medium',
    });

    // Transform insights to match panel format
    const insights = insightsResult.insights.map((insight: any) => ({
      id: insight.id,
      type: mapInsightType(insight.type),
      title: insight.title,
      description: insight.description,
      impact: insight.priority === 'critical' ? 'high' : 
              insight.priority === 'high' ? 'high' :
              insight.priority === 'medium' ? 'medium' : 'low',
      actionable: !!insight.actionUrl,
      actionUrl: insight.actionUrl,
      actionLabel: insight.actionLabel,
    }));

    // Create predictive metrics
    // Mock predictions for now (TODO: integrate with actual forecasting service)
    const predictions = [
      {
        metric: 'Monthly Spending',
        currentValue: 3200,
        predictedValue: 3050,
        timeframe: 'Next Month',
        confidence: 82,
        trend: 'down' as const,
      },
      {
        metric: 'Savings Rate',
        currentValue: 15,
        predictedValue: 18,
        timeframe: '3 Months',
        confidence: 75,
        trend: 'up' as const,
      },
      {
        metric: 'Cash Flow',
        currentValue: 1200,
        predictedValue: 1350,
        timeframe: 'Next Month',
        confidence: 78,
        trend: 'up' as const,
      },
    ];

    // Mock health score data (TODO: integrate with actual health score calculator)
    const healthScore = 78;
    const healthTrend = 'improving' as const;

    // Get top recommendation
    const topRecommendation = insights.length > 0
      ? insights[0].title
      : 'Keep up the great work! Your finances are on track.';

    return NextResponse.json({
      success: true,
      data: {
        insights,
        predictions,
        healthScore,
        healthTrend,
        topRecommendation,
      },
      _meta: {
        generatedAt: new Date().toISOString(),
        dataSourcesUsed: ['insights', 'predictions'],
      },
    });
  } catch (error) {
    console.error('Error fetching AI insights panel data:', error);
    
    // Return fallback data instead of error for better UX
    return NextResponse.json({
      success: true,
      data: {
        insights: [],
        predictions: [],
        healthScore: 0,
        healthTrend: 'stable',
        topRecommendation: 'Connect your accounts to get personalized AI insights',
      },
      _meta: {
        generatedAt: new Date().toISOString(),
        fallback: true,
      },
    });
  }
}

// Helper function to map insight types
function mapInsightType(type: string): 'opportunity' | 'warning' | 'tip' | 'prediction' {
  switch (type) {
    case 'opportunity':
    case 'savings_opportunity':
      return 'opportunity';
    case 'warning':
    case 'overspending':
    case 'budget_alert':
      return 'warning';
    case 'tip':
    case 'recommendation':
      return 'tip';
    case 'prediction':
    case 'forecast':
      return 'prediction';
    default:
      return 'tip';
  }
}

