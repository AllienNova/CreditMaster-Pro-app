import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import {
  createRankingService,
  createRotationService,
  createISERiskGating,
  type InstrumentRanking,
  type RotationDecision,
  type UserTier,
  type AssetClass,
} from '@/lib/trading';

// Singleton services (in production, use proper DI)
const rankingService = createRankingService();
const rotationService = createRotationService(5);
const riskGating = createISERiskGating(rotationService, rankingService);

/**
 * GET /api/trading/ise
 * Get current ISE state: rankings, active set, recent events
 */
export async function GET(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const assetClass = searchParams.get('assetClass') as AssetClass | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    switch (action) {
      case 'status':
        return NextResponse.json({
          activeSymbols: rotationService.getActiveSymbols(),
          lastRun: rankingService.getLastRun(),
          summary: rankingService.getSummary(),
          gatingStats: riskGating.getStats(),
        });
        
      case 'rankings':
        let rankings = rankingService.getAllRankings();
        if (assetClass) {
          rankings = rankingService.getByAssetClass(assetClass);
        }
        return NextResponse.json({
          rankings: rankings.slice(0, limit),
          total: rankings.length,
          lastRun: rankingService.getLastRun(),
        });
        
      case 'active':
        return NextResponse.json({
          activeSymbols: rotationService.getActiveSymbols(),
          states: rotationService.getActiveSymbols().map(s => ({
            symbol: s,
            ...rotationService.getInstrumentState(s),
          })),
        });
        
      case 'events':
        return NextResponse.json({
          events: rotationService.getRecentEvents(limit),
        });
        
      case 'canTrade':
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
        }
        return NextResponse.json(riskGating.canOpenNewPosition(symbol));
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ISE GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trading/ise
 * Trigger ranking, rotation, or manual overrides
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'forceAdd': {
        const { symbol, reason } = body;
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
        }
        const success = rotationService.forceAdd(symbol, reason || 'Manual addition via API');
        return NextResponse.json({ success, activeSymbols: rotationService.getActiveSymbols() });
      }
      
      case 'forceRemove': {
        const { symbol, reason } = body;
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
        }
        const success = rotationService.forceRemove(symbol, reason || 'Manual removal via API');
        return NextResponse.json({ success, activeSymbols: rotationService.getActiveSymbols() });
      }
      
      case 'setOverride': {
        const { symbol, enabled } = body;
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
        }
        riskGating.setManualOverride(symbol, enabled);
        return NextResponse.json({ 
          success: true, 
          overrides: riskGating.getManualOverrides() 
        });
      }
      
      case 'updateConfig': {
        const { maxActiveSize, rotationConfig, gatingConfig } = body;
        if (maxActiveSize) {
          rotationService.setMaxActiveSize(maxActiveSize);
        }
        if (rotationConfig) {
          rotationService.updateConfig(rotationConfig);
        }
        if (gatingConfig) {
          riskGating.updateConfig(gatingConfig);
        }
        return NextResponse.json({ success: true });
      }
      
      case 'reset': {
        rotationService.reset();
        riskGating.clearManualOverrides();
        return NextResponse.json({ success: true });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ISE POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
