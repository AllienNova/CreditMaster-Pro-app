/**
 * Disputes API Route
 *
 * GET /api/credit-repair/disputes - Get all disputes for user
 * POST /api/credit-repair/disputes - Create new dispute
 *
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - Filtering and pagination
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { disputeService } from '@/lib/credit-repair';
import type { DisputeItem } from '@/lib/credit-repair';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';
import type { DisputeStrategy, DisputeStatus, Bureau } from '@/lib/credit-repair/db/types';

/**
 * GET /api/credit-repair/disputes
 * Get all disputes for authenticated user with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const bureauParam = searchParams.get('bureau');
    const strategyParam = searchParams.get('strategy');
    const status = statusParam ? (statusParam as DisputeStatus) : undefined;
    const bureau = bureauParam ? (bureauParam as Bureau) : undefined;
    const strategy = strategyParam ? (strategyParam as DisputeStrategy) : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. Get disputes from database
    let disputes;
    let total = 0;
    if (status) {
      disputes = await db.disputes.getDisputesByStatus(user.id, status, limit);
      total = disputes.length;
    } else if (bureau) {
      disputes = await db.disputes.getDisputesByBureau(user.id, bureau, limit);
      total = disputes.length;
    } else {
      const { disputes: userDisputes, total: userTotal } = await db.disputes.getDisputesByUser(
        user.id,
        { status, bureau, strategy, limit, offset }
      );
      disputes = userDisputes;
      total = userTotal;
    }

    // 4. Get statistics
    const stats = await db.disputes.getDisputeStats(user.id);

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'get_disputes',
      input: { status, bureau, strategy, limit, offset },
      output: { count: disputes.length },
      success: true,
    });

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        disputes,
        stats,
        pagination: {
          limit,
          offset,
          total,
        },
      },
    });
  } catch (error) {
    console.error('Error getting disputes:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to get disputes: ${(error as Error).message}`,
        severity: 'medium',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to get disputes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credit-repair/disputes
 * Create new dispute with AI-generated letter
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;

    // 2. Parse and validate input
    const body = await request.json();
    const {
      itemType,
      itemDescription,
      creditorName,
      accountNumber,
      balance,
      inaccuracyType,
      strategy,
      bureau,
      generateLetter = true,
    } = body;

    // Validate required fields
    if (!itemType || !itemDescription || !inaccuracyType || !strategy || !bureau) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['itemType', 'itemDescription', 'inaccuracyType', 'strategy', 'bureau'],
        },
        { status: 400 }
      );
    }

    // Validate enum values
    const validStrategies: DisputeStrategy[] = [
      'basic_dispute',
      'debt_validation',
      'method_of_verification',
      'procedural_violation',
      'statute_of_limitations',
      'identity_theft',
      'mixed_file',
      'creditor_direct',
      'goodwill',
      'pay_for_delete',
    ];

    if (!validStrategies.includes(strategy)) {
      return NextResponse.json(
        { error: 'Invalid strategy', validStrategies },
        { status: 400 }
      );
    }

    const validBureaus: Bureau[] = ['experian', 'equifax', 'transunion'];
    if (!validBureaus.includes(bureau)) {
      return NextResponse.json(
        { error: 'Invalid bureau', validBureaus },
        { status: 400 }
      );
    }

    const letterInput: DisputeItem = {
      id: 'temp_dispute',
      userId: user.id,
      itemType: (itemType as DisputeItem['itemType']) || 'account',
      bureau,
      itemDescription,
      inaccuracyType,
      strategy,
      letter: '',
      status: 'draft',
    };

    // 3. Generate letter if requested
    let letterContent: string | undefined;
    if (generateLetter) {
      const letterResult = await disputeService.generateDisputeLetter(
        letterInput,
        strategy,
        inaccuracyType,
        { name: user.name, accountNumber }
      );
      letterContent = letterResult.letter;
    }

    // 4. Save dispute to database
    const dispute = await db.disputes.createDispute({
      userId: user.id,
      itemType,
      itemDescription,
      creditorName,
      accountNumber,
      balance,
      inaccuracyType,
      strategy,
      letterContent,
      status: 'draft',
      bureau,
    });

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'create_dispute',
      input: { itemType, strategy, bureau },
      output: { disputeId: dispute.id },
      success: true,
    });

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: dispute,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating dispute:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to create dispute: ${(error as Error).message}`,
        severity: 'high',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to create dispute' },
      { status: 500 }
    );
  }
}
