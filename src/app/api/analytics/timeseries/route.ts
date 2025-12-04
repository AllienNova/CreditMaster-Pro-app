import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { AnalyticsEngine } from '@/lib/analytics';

/**
 * GET /api/analytics/timeseries
 * Get time series data for analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = validation.user.id;
    const { searchParams } = new URL(request.url);
    
    const metric = searchParams.get('metric') as 'disputes' | 'workflows' | 'ai_requests' | 'savings';
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const interval = (searchParams.get('interval') || 'day') as 'day' | 'week' | 'month';
    const scope = searchParams.get('scope') || 'user'; // 'user' or 'system'
    
    if (!metric) {
      return NextResponse.json({ error: 'Metric is required' }, { status: 400 });
    }
    
    // Check permissions for system-wide data
    if (scope === 'system' && !rbac.hasPermission(validation.user, 'admin:analytics')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get time series data
    const data = await AnalyticsEngine.getTimeSeriesData(
      metric,
      scope === 'user' ? userId : undefined,
      startDate,
      endDate,
      interval
    );
    
    console.log(`📊 Retrieved ${metric} time series data for ${scope}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time series data' },
      { status: 500 }
    );
  }
}

