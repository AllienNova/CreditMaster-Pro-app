import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { RealtimeMonitoringService, type EventType } from '@/lib/monitoring/real-time-monitoring';

/**
 * GET /api/monitoring/history
 * Get event history for authenticated user
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
    
    // Get query parameters
    const eventTypesParam = searchParams.get('event_types');
    const limitParam = searchParams.get('limit');
    
    const eventTypes: EventType[] | undefined = eventTypesParam
      ? (eventTypesParam.split(',') as EventType[])
      : undefined;
    
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    // Get event history
    const events = RealtimeMonitoringService.getEventHistory(
      userId,
      eventTypes,
      limit
    );
    
    console.log(`📡 Retrieved ${events.length} events for user ${userId}`);
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching event history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event history' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitoring/history
 * Clear event history for authenticated user
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = validation.user.id;
    
    // Clear event history
    RealtimeMonitoringService.clearEventHistory(userId);
    
    console.log(`📡 Cleared event history for user ${userId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing event history:', error);
    return NextResponse.json(
      { error: 'Failed to clear event history' },
      { status: 500 }
    );
  }
}

