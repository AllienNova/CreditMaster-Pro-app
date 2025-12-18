/**
 * Pay-for-Delete Negotiation API Route
 *
 * GET /api/credit-repair/negotiate - Get all negotiations
 * POST /api/credit-repair/negotiate - Create new negotiation
 *
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - AI script generation
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { negotiationService } from '@/lib/credit-repair';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

interface NegotiationScripts {
  phoneScript: string;
  emailScript: string;
  letterScript: string;
}

interface SettlementSummary {
  settlementAmount: number;
  percentage: number;
  savings: number;
}

/**
 * GET /api/credit-repair/negotiate
 * Get all negotiations for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const statusMap: Record<
      string,
      'pending' | 'negotiating' | 'agreed' | 'paid' | 'completed' | 'failed'
    > = {
      pending: 'pending',
      draft: 'pending',
      sent: 'pending',
      negotiating: 'negotiating',
      accepted: 'agreed',
      agreed: 'agreed',
      paid: 'paid',
      completed: 'completed',
      failed: 'failed',
      rejected: 'failed',
    };
    let statusFilter:
      | 'pending'
      | 'negotiating'
      | 'agreed'
      | 'paid'
      | 'completed'
      | 'failed'
      | undefined;
    if (statusParam) {
      statusFilter = statusMap[statusParam];
      if (!statusFilter) {
        return NextResponse.json(
          { error: 'Invalid status', validStatuses: Object.keys(statusMap) },
          { status: 400 }
        );
      }
    }
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    // 3. Get negotiations from database
    const { negotiations, total } = await db.negotiations.getNegotiationsByUser(
      user.id,
      {
        status: statusFilter,
        limit,
        offset,
      }
    );

    // 4. Get statistics
    const stats = await db.negotiations.getNegotiationStats(user.id);

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'get_negotiations',
      input: { status: statusParam, limit, offset },
      output: { count: negotiations.length },
      success: true,
    });

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        negotiations,
        stats,
        pagination: {
          limit,
          offset,
          total,
        },
      },
    });
  } catch (error) {
    console.error('Error getting negotiations:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to get negotiations: ${(error as Error).message}`,
        severity: 'medium',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to get negotiations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credit-repair/negotiate
 * Create new negotiation with AI script generation
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
    const {
      collectionId,
      collectionAgency,
      originalCreditor,
      accountNumber,
      originalBalance,
      currentBalance,
      targetSettlement,
      generateScript = true,
      notes,
    } = body;

    // Validate required fields
    if (!collectionId || !collectionAgency || !currentBalance) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['collectionId', 'collectionAgency', 'currentBalance'],
        },
        { status: 400 }
      );
    }

    // 3. Generate negotiation scripts if requested
    let scripts: NegotiationScripts | undefined;
    const settlementPercentage = targetSettlement ?? 40;
    const settlement: SettlementSummary =
      negotiationService.calculateSettlement(
        currentBalance,
        settlementPercentage
      );
    if (generateScript) {
      const result = await negotiationService.generateNegotiationScript(
        collectionId,
        collectionAgency,
        originalCreditor || 'Unknown',
        originalBalance || currentBalance,
        currentBalance,
        { name: user.name || 'User', email: user.email }
      );
      // result contains phoneScript, emailScript, letterScript directly
      scripts = result;
    }

    // 4. Save negotiation to database
    const scriptRecord: Record<string, string> | undefined = scripts
      ? {
          phoneScript: scripts.phoneScript,
          emailScript: scripts.emailScript,
          letterScript: scripts.letterScript,
        }
      : undefined;

    const negotiation = await db.negotiations.createNegotiation({
      userId: user.id,
      collectionAgency,
      originalCreditor,
      accountNumber,
      originalBalance: originalBalance ?? currentBalance,
      currentBalance,
      settlementPercentage,
      settlementAmount: settlement.settlementAmount,
      scripts: scriptRecord,
      status: 'pending',
      notes,
    });

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'create_negotiation',
      input: { collectionId, collectionAgency },
      output: { negotiationId: negotiation.id },
      success: true,
    });

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        data: {
          negotiation,
          settlement,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating negotiation:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to create negotiation: ${(error as Error).message}`,
        severity: 'high',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to create negotiation' },
      { status: 500 }
    );
  }
}
