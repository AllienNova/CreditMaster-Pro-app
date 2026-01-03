/**
 * Portfolio Comprehensive Analysis API
 *
 * POST /api/investments/portfolio-analysis - Get comprehensive portfolio analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { z } from 'zod';
import { getInvestmentAnalysisEngine } from '@/lib/investments/services/InvestmentAnalysisEngine';
import { getMarketDataService } from '@/lib/investments/services/MarketDataService';
import { getAnalysisCacheService } from '@/lib/investments/services/AnalysisCacheService';
import type { PortfolioHolding } from '@/lib/investments/services/PortfolioAnalysisService';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const HoldingSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  shares: z.number().positive(),
  averageCost: z.number().positive(),
  currentPrice: z.number().positive().optional(),
  assetClass: z.enum(['stock', 'etf', 'bond', 'crypto', 'commodity', 'cash']).optional().default('stock'),
  sector: z.string().optional(),
});

const PortfolioAnalysisRequestSchema = z.object({
  portfolioId: z.string().optional().default('default'),
  holdings: z.array(HoldingSchema).min(1, 'At least one holding required'),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']).optional().default('1d'),
  userProfile: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    investmentHorizon: z.enum(['short_term', 'medium_term', 'long_term']).optional(),
    preferredAssetClasses: z.array(z.string()).optional(),
  }).optional(),
});

type PortfolioAnalysisRequest = z.infer<typeof PortfolioAnalysisRequestSchema>;

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate authentication
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = PortfolioAnalysisRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { portfolioId, holdings, timeframe, userProfile } = validationResult.data;

    // Check cache first
    const cacheService = getAnalysisCacheService();
    const cacheKey = { portfolioId, holdings, timeframe, userProfile };
    const cachedAnalysis = cacheService.get('portfolio-analysis', cacheKey);

    if (cachedAnalysis) {
      return NextResponse.json({
        success: true,
        data: cachedAnalysis,
        meta: {
          cached: true,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get market data service
    const marketDataService = getMarketDataService();

    // Fetch current prices and historical data for all holdings
    const historicalDataMap = new Map<
      string,
      { close: number; high: number; low: number; volume: number; timestamp: Date }[]
    >();

    const updatedHoldings: PortfolioHolding[] = [];

    for (const holding of holdings) {
      try {
        // Fetch current price if not provided
        let currentPrice = holding.currentPrice;
        if (!currentPrice) {
          const quote = await marketDataService.getQuote(holding.symbol);
          currentPrice = quote?.price || holding.averageCost;
        }

        // Fetch historical data
        const historicalData = await marketDataService.getHistoricalData(
          holding.symbol,
          timeframe,
          50 // 50 periods for portfolio analysis
        );

        if (historicalData && historicalData.length > 0) {
          historicalDataMap.set(holding.symbol, historicalData);
        }

        updatedHoldings.push({
          ...holding,
          currentPrice,
        });
      } catch (error) {
        console.error(`Error fetching data for ${holding.symbol}:`, error);
        // Continue with other holdings
        updatedHoldings.push({
          ...holding,
          currentPrice: holding.currentPrice || holding.averageCost,
        });
      }
    }

    // Get investment analysis engine
    const analysisEngine = getInvestmentAnalysisEngine();

    // Perform comprehensive portfolio analysis
    const analysis = await analysisEngine.analyzePortfolio(
      portfolioId,
      updatedHoldings,
      historicalDataMap,
      {
        timeframe,
        userProfile,
      }
    );

    const processingTime = Date.now() - startTime;

    // Convert Map to object for JSON serialization
    const holdingAnalysesObject: Record<string, any> = {};
    analysis.holdingAnalyses.forEach((value, key) => {
      holdingAnalysesObject[key] = {
        ...value,
        analyzedAt: value.analyzedAt.toISOString(),
      };
    });

    const responseData = {
      ...analysis,
      analyzedAt: analysis.analyzedAt.toISOString(),
      holdingAnalyses: holdingAnalysesObject,
    };

    // Cache the result (3 minutes TTL for portfolio analysis)
    cacheService.set('portfolio-analysis', cacheKey, responseData, 3 * 60 * 1000);

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        cached: false,
        processingTime: `${processingTime}ms`,
        holdingsAnalyzed: updatedHoldings.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER - API Documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/investments/portfolio-analysis',
    method: 'POST',
    description: 'Get comprehensive portfolio analysis with individual holding analysis',
    features: [
      'Portfolio metrics (total value, returns, diversification)',
      'Individual holding comprehensive analysis',
      'Portfolio health score',
      'Risk assessment',
      'Position adjustment recommendations',
      'Rebalancing suggestions',
    ],
    requestBody: {
      portfolioId: 'string (optional) - Portfolio identifier',
      holdings: [
        {
          symbol: 'string (required) - Stock symbol',
          shares: 'number (required) - Number of shares',
          averageCost: 'number (required) - Average cost per share',
          currentPrice: 'number (optional) - Current price (auto-fetched if not provided)',
          assetClass: 'stock | etf | bond | crypto | commodity | cash',
          sector: 'string (optional) - Sector classification',
        },
      ],
      timeframe: 'string (optional) - 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M (default: 1d)',
      userProfile: {
        riskTolerance: 'conservative | moderate | aggressive',
        investmentHorizon: 'short_term | medium_term | long_term',
        preferredAssetClasses: 'string[]',
      },
    },
    example: {
      portfolioId: 'my-portfolio',
      holdings: [
        {
          symbol: 'AAPL',
          shares: 10,
          averageCost: 150.0,
          assetClass: 'stock',
          sector: 'Technology',
        },
        {
          symbol: 'MSFT',
          shares: 5,
          averageCost: 250.0,
          assetClass: 'stock',
          sector: 'Technology',
        },
      ],
      timeframe: '1d',
    },
  });
}

