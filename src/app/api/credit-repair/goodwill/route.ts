/**
 * Goodwill Letter API Route
 *
 * GET /api/credit-repair/goodwill - Get all goodwill letters
 * POST /api/credit-repair/goodwill - Create new goodwill letter
 *
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - AI letter generation
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { negotiationService } from '@/lib/credit-repair';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

/**
 * GET /api/credit-repair/goodwill
 * Get all goodwill letters for authenticated user
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
    const validStatuses = [
      'draft',
      'sent',
      'response_received',
      'approved',
      'denied',
    ] as const;
    let status: (typeof validStatuses)[number] | undefined;
    if (statusParam) {
      const normalized = statusParam === 'rejected' ? 'denied' : statusParam;
      if (!(validStatuses as readonly string[]).includes(normalized)) {
        return NextResponse.json(
          { error: 'Invalid status', validStatuses },
          { status: 400 }
        );
      }
      status = normalized as (typeof validStatuses)[number];
    }
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    // 3. Get goodwill letters from database
    const { letters, total } = await db.goodwill.getGoodwillLettersByUser(
      user.id,
      {
        status,
        limit,
        offset,
      }
    );

    // 4. Get statistics
    const stats = await db.goodwill.getGoodwillLetterStats(user.id);

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'get_goodwill_letters',
      input: { status, limit, offset },
      output: { count: letters.length },
      success: true,
    });

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        letters,
        stats,
        pagination: {
          limit,
          offset,
          total,
        },
      },
    });
  } catch (error) {
    console.error('Error getting goodwill letters:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to get goodwill letters: ${(error as Error).message}`,
        severity: 'medium',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to get goodwill letters' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credit-repair/goodwill
 * Create new goodwill letter with AI generation
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
      accountId,
      creditorName,
      latePaymentDate,
      reason,
      accountNumber,
      letterContent: manualLetterContent,
      generateLetter = true,
    } = body;

    // Validate required fields
    if (!accountId || !creditorName || !latePaymentDate || !reason) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['accountId', 'creditorName', 'latePaymentDate', 'reason'],
        },
        { status: 400 }
      );
    }

    // 3. Generate letter if requested
    let letterContent: string | undefined = manualLetterContent;
    if (generateLetter) {
      const letterResult = await negotiationService.generateGoodwillLetter(
        accountId,
        creditorName,
        new Date(latePaymentDate),
        reason,
        { name: user.name || 'User', email: user.email }
      );
      letterContent = letterResult.letter;
    }

    if (!letterContent) {
      return NextResponse.json(
        { error: 'Letter content is required when generateLetter is false' },
        { status: 400 }
      );
    }

    // 4. Save goodwill letter to database
    const letter = await db.goodwill.createGoodwillLetter({
      userId: user.id,
      creditorName,
      accountNumber,
      latePaymentDate: new Date(latePaymentDate),
      reason,
      letterContent,
      status: 'draft',
    });

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'create_goodwill_letter',
      input: { accountId, creditorName },
      output: { letterId: letter.id },
      success: true,
    });

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        data: letter,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating goodwill letter:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to create goodwill letter: ${(error as Error).message}`,
        severity: 'high',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to create goodwill letter' },
      { status: 500 }
    );
  }
}
