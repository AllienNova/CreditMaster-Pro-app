/**
 * Credit Factors API Route
 *
 * GET /api/credit/factors - Get credit score factors analysis
 *
 * Returns the 5 key factors that affect credit scores:
 * - Payment History (35%)
 * - Credit Utilization (30%)
 * - Credit Age (15%)
 * - Credit Mix (10%)
 * - New Credit (10%)
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';

export interface CreditFactorResponse {
  id: string;
  name: string;
  impact:
    | 'high_positive'
    | 'positive'
    | 'neutral'
    | 'negative'
    | 'high_negative';
  category:
    | 'payment_history'
    | 'credit_utilization'
    | 'credit_age'
    | 'credit_mix'
    | 'new_credit';
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  value?: string;
  description: string;
  recommendation?: string;
  percentImpact: number;
}

/**
 * GET /api/credit/factors
 * Get credit score factors analysis
 */
export async function GET(request: NextRequest) {
  try {
    // TEMPORARY: Skip authentication for development testing
    // TODO: Re-enable authentication before production deployment
    // const validation = await jwtValidation.validateFromHeaders(request);
    // if (!validation.valid || !validation.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // TODO: In production, fetch actual user data from database
    // For now, return mock data that matches the mobile app structure
    const factors: CreditFactorResponse[] = [
      {
        id: 'payment_history',
        name: 'Payment History',
        impact: 'positive',
        category: 'payment_history',
        status: 'good',
        value: '98% on-time payments',
        description:
          'You have a strong payment history with very few late payments.',
        recommendation:
          'Continue making all payments on time to maintain this excellent factor.',
        percentImpact: 35,
      },
      {
        id: 'credit_utilization',
        name: 'Credit Utilization',
        impact: 'neutral',
        category: 'credit_utilization',
        status: 'fair',
        value: '32% utilization',
        description:
          'Your credit utilization is slightly above the recommended 30% threshold.',
        recommendation:
          'Pay down balances to get below 30% utilization for maximum score impact.',
        percentImpact: 30,
      },
      {
        id: 'credit_age',
        name: 'Credit Age',
        impact: 'positive',
        category: 'credit_age',
        status: 'good',
        value: '5.2 years average',
        description:
          'Your average account age shows good credit history length.',
        recommendation:
          'Keep your oldest accounts open and active to maintain this factor.',
        percentImpact: 15,
      },
      {
        id: 'credit_mix',
        name: 'Credit Mix',
        impact: 'high_positive',
        category: 'credit_mix',
        status: 'excellent',
        value: '4 account types',
        description:
          'You have an excellent mix of credit cards, loans, and other credit types.',
        recommendation:
          'Your credit mix is optimal. Continue managing your diverse accounts responsibly.',
        percentImpact: 10,
      },
      {
        id: 'new_credit',
        name: 'New Credit',
        impact: 'neutral',
        category: 'new_credit',
        status: 'fair',
        value: '2 inquiries (6 months)',
        description: 'You have a moderate number of recent credit inquiries.',
        recommendation:
          'Limit new credit applications for the next 6 months to improve this factor.',
        percentImpact: 10,
      },
    ];

    return NextResponse.json({
      success: true,
      data: factors,
    });
  } catch (error) {
    console.error('Error fetching credit factors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit factors' },
      { status: 500 }
    );
  }
}
