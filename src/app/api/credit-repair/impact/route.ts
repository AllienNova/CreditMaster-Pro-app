/**
 * Impact Calculator API Route
 *
 * POST /api/credit-repair/impact - Calculate estimated impact of an action
 *
 * Features:
 * - Database integration
 * - Authentication required
 * - Input validation
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { creditRepairService } from '@/lib/credit-repair';
import { auditLogger } from '@/lib/security/audit-logging';
import type { OpportunityType } from '@/lib/credit-repair';

/**
 * POST /api/credit-repair/impact
 * Calculate estimated impact of an action
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;

    // 2. Parse and validate input
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions: OpportunityType[] = [
      'dispute_inaccuracy',
      'pay_down_utilization',
      'goodwill_letter',
      'pay_for_delete',
      'remove_inquiry',
      'optimize_payment_timing',
      'piggybacking',
      'credit_builder_loan',
      'secured_card',
    ];

    if (!validActions.includes(action as OpportunityType)) {
      return NextResponse.json(
        { error: 'Invalid action type', validActions },
        { status: 400 }
      );
    }

    // 3. Calculate impact
    const impact = await creditRepairService.calculateImpact(
      action as OpportunityType,
      user.id,
      data
    );

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'calculate_impact',
      input: { action, data },
      output: { impact },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: {
        action,
        estimatedImpact: impact,
        description: getImpactDescription(impact),
        timeline: getTimeline(action as OpportunityType),
        successRate: getSuccessRate(action as OpportunityType),
      },
    });
  } catch (error) {
    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to calculate impact: ${(error as Error).message}`,
        severity: 'medium',
      });
    } catch (_auditError) {
      // Audit error silently caught
    }

    return NextResponse.json(
      { error: 'Failed to calculate impact' },
      { status: 500 }
    );
  }
}

/**
 * Get impact description based on estimated points
 */
function getImpactDescription(impact: number): string {
  if (impact >= 100) return 'Very High Impact (100+ points)';
  if (impact >= 50) return 'High Impact (50-100 points)';
  if (impact >= 20) return 'Medium Impact (20-50 points)';
  if (impact >= 10) return 'Low Impact (10-20 points)';
  return 'Minimal Impact (<10 points)';
}

/**
 * Get timeline for action type
 */
function getTimeline(action: OpportunityType): string {
  const timelines: Record<OpportunityType, string> = {
    dispute_inaccuracy: '30-45 days',
    pay_down_utilization: '30 days',
    goodwill_letter: '30-60 days',
    pay_for_delete: '30-90 days',
    remove_inquiry: '30-45 days',
    optimize_payment_timing: '30 days',
    piggybacking: '30-60 days',
    credit_builder_loan: '6-12 months',
    secured_card: '6-12 months',
  };
  return timelines[action] || '30-90 days';
}

/**
 * Get success rate for action type
 */
function getSuccessRate(action: OpportunityType): number {
  const successRates: Record<OpportunityType, number> = {
    dispute_inaccuracy: 70,
    pay_down_utilization: 95,
    goodwill_letter: 60,
    pay_for_delete: 80,
    remove_inquiry: 50,
    optimize_payment_timing: 100,
    piggybacking: 90,
    credit_builder_loan: 85,
    secured_card: 90,
  };
  return successRates[action] || 70;
}

