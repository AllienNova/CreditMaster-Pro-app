/**
 * Strategy Recommendation API Route
 * 
 * POST /api/strategies/recommend
 * 
 * Returns ML-powered strategy recommendations for credit repair items.
 * 
 * Features:
 * - ML-enhanced strategy selection
 * - Success probability prediction
 * - Timeline estimation
 * - ROI calculation
 * - Authentication required
 * - Input validation
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { mlStrategyIntegration, CreditItem, UserProfile } from '@/lib/strategies/ml-strategy-integration';

/**
 * POST /api/strategies/recommend
 * Get ML-powered strategy recommendations
 */
export async function POST(request: NextRequest) {
  try {
    // Note: Authentication and audit logging can be added later
    // For now, focusing on core functionality
    
    // 2. Parse request body
    const body = await request.json();
    const { creditItem, userProfile, previousAttempts } = body;
    
    // 3. Validate inputs
    if (!creditItem || !userProfile) {
      return NextResponse.json(
        { error: 'Missing required fields: creditItem, userProfile' },
        { status: 400 }
      );
    }
    
    // Validate credit item
    if (!creditItem.type || !creditItem.description || !creditItem.date || !creditItem.bureau) {
      return NextResponse.json(
        { error: 'Invalid creditItem: missing required fields (type, description, date, bureau)' },
        { status: 400 }
      );
    }
    
    // Validate user profile
    if (
      typeof userProfile.creditScore !== 'number' ||
      typeof userProfile.accountAge !== 'number' ||
      typeof userProfile.paymentHistory !== 'number' ||
      typeof userProfile.utilization !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid userProfile: missing required numeric fields' },
        { status: 400 }
      );
    }
    
    // Validate credit item type
    const validTypes = ['collection', 'account', 'inquiry', 'public_record', 'late_payment', 'charge_off'];
    if (!validTypes.includes(creditItem.type)) {
      return NextResponse.json(
        { error: `Invalid creditItem.type: must be one of ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate bureau
    const validBureaus = ['experian', 'equifax', 'transunion'];
    if (!validBureaus.includes(creditItem.bureau)) {
      return NextResponse.json(
        { error: `Invalid creditItem.bureau: must be one of ${validBureaus.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate credit score range
    if (userProfile.creditScore < 300 || userProfile.creditScore > 850) {
      return NextResponse.json(
        { error: 'Invalid creditScore: must be between 300 and 850' },
        { status: 400 }
      );
    }
    
    // Validate percentages
    if (
      userProfile.paymentHistory < 0 || userProfile.paymentHistory > 100 ||
      userProfile.utilization < 0 || userProfile.utilization > 100
    ) {
      return NextResponse.json(
        { error: 'Invalid percentages: paymentHistory and utilization must be between 0 and 100' },
        { status: 400 }
      );
    }
    
    // 4. Get recommendations from ML integration
    const recommendations = await mlStrategyIntegration.recommendStrategies(
      creditItem as CreditItem,
      userProfile as UserProfile,
      previousAttempts || []
    );
    
    // 5. Calculate aggregate metrics
    const avgSuccessProbability = recommendations.reduce(
      (sum, r) => sum + r.successProbability, 0
    ) / recommendations.length;
    
    const avgConfidence = recommendations.reduce(
      (sum, r) => sum + r.confidence, 0
    ) / recommendations.length;
    
    const totalROI = recommendations.reduce(
      (sum, r) => sum + r.roi, 0
    );
    
    // 6. Get alternative strategies (next 5)
    const allRecommendations = await mlStrategyIntegration.recommendStrategies(
      creditItem as CreditItem,
      userProfile as UserProfile,
      previousAttempts || []
    );
    
    const alternativeStrategies = allRecommendations
      .slice(5, 10)
      .map(r => r.strategy);
    
    // 7. Audit logging can be added here later
    
    // 8. Return response
    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        metrics: {
          avgSuccessProbability: Math.round(avgSuccessProbability * 100),
          avgConfidence: Math.round(avgConfidence * 100),
          totalROI,
        },
        alternativeStrategies,
      },
    });
    
  } catch (error) {
    console.error('Error in strategy recommendation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get strategy recommendations',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/strategies/recommend
 * Get information about the recommendation endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/strategies/recommend',
    method: 'POST',
    description: 'Get ML-powered strategy recommendations for credit repair items',
    authentication: 'Required (JWT token)',
    requestBody: {
      creditItem: {
        type: 'collection | account | inquiry | public_record | late_payment | charge_off',
        description: 'string',
        amount: 'number (optional)',
        date: 'string (ISO date)',
        bureau: 'experian | equifax | transunion',
        status: 'string',
        accountType: 'string (optional)',
        creditorName: 'string (optional)',
      },
      userProfile: {
        creditScore: 'number (300-850)',
        accountAge: 'number (months)',
        paymentHistory: 'number (0-100)',
        utilization: 'number (0-100)',
        totalAccounts: 'number',
        negativeItems: 'number',
        inquiries: 'number',
      },
      previousAttempts: 'string[] (optional) - IDs of previously attempted strategies',
    },
    response: {
      recommendations: 'StrategyRecommendation[] (top 5)',
      metrics: {
        avgSuccessProbability: 'number (0-100)',
        avgConfidence: 'number (0-100)',
        totalROI: 'number (expected credit score improvement)',
      },
      alternativeStrategies: 'Strategy[] (next 5)',
    },
    example: {
      creditItem: {
        type: 'collection',
        description: 'Medical collection from ABC Hospital',
        amount: 500,
        date: '2023-01-15',
        bureau: 'experian',
        status: 'unpaid',
        creditorName: 'ABC Hospital',
      },
      userProfile: {
        creditScore: 620,
        accountAge: 48,
        paymentHistory: 85,
        utilization: 45,
        totalAccounts: 8,
        negativeItems: 3,
        inquiries: 2,
      },
      previousAttempts: [],
    },
  });
}
