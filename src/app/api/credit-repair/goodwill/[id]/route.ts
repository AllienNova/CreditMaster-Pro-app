/**
 * Individual Goodwill Letter API Route
 * 
 * GET /api/credit-repair/goodwill/[id] - Get single goodwill letter
 * PUT /api/credit-repair/goodwill/[id] - Update goodwill letter
 * DELETE /api/credit-repair/goodwill/[id] - Delete goodwill letter
 * 
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

interface GoodwillUpdatePayload {
  accountId?: string;
  creditorName?: string;
  accountNumber?: string;
  balance?: number;
  latePaymentDate?: Date;
  reason?: string;
  letterContent?: string;
  status?: 'draft' | 'sent' | 'response_received' | 'approved' | 'denied';
  sentAt?: Date;
  responseReceivedAt?: Date;
  outcome?: 'removed' | 'denied' | 'pending';
  notes?: string;
}

/**
 * GET /api/credit-repair/goodwill/[id]
 * Get single goodwill letter by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;
    const { id: letterId } = await params;

    // 2. Get goodwill letter from database
    const letter = await db.goodwill.getGoodwillLetter(letterId, user.id);

    if (!letter) {
      return NextResponse.json(
        { error: 'Goodwill letter not found' },
        { status: 404 }
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'get_goodwill_letter',
      input: { letterId },
      output: { found: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      data: letter,
    });
  } catch (error) {
    console.error('Error getting goodwill letter:', error);

    return NextResponse.json(
      { error: 'Failed to get goodwill letter' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/credit-repair/goodwill/[id]
 * Update goodwill letter
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;
    const { id: letterId } = await params;

    // 2. Parse and validate input
    const body = await request.json();
    const {
      accountId,
      creditorName,
      accountNumber,
      balance,
      latePaymentDate,
      reason,
      letterContent,
      status,
      sentAt,
      responseReceivedAt,
      outcome,
      notes,
    } = body;

    // Validate status if provided
    let normalizedStatus: GoodwillUpdatePayload['status'] | undefined;
    if (status) {
      const validStatuses: GoodwillUpdatePayload['status'][] = [
        'draft',
        'sent',
        'response_received',
        'approved',
        'denied',
      ];
      normalizedStatus = status === 'rejected' ? 'denied' : status;
      if (!validStatuses.includes(normalizedStatus)) {
        return NextResponse.json(
          { error: 'Invalid status', validStatuses },
          { status: 400 }
        );
      }
    }

    // 3. Update goodwill letter in database
    const updates: GoodwillUpdatePayload = {};
    if (accountId !== undefined) updates.accountId = accountId;
    if (creditorName !== undefined) updates.creditorName = creditorName;
    if (accountNumber !== undefined) updates.accountNumber = accountNumber;
    if (balance !== undefined) updates.balance = balance;
    if (latePaymentDate !== undefined) updates.latePaymentDate = new Date(latePaymentDate);
    if (reason !== undefined) updates.reason = reason;
    if (letterContent !== undefined) updates.letterContent = letterContent;
    let normalizedOutcome: GoodwillUpdatePayload['outcome'] | undefined;
    if (outcome) {
      const validOutcomes: GoodwillUpdatePayload['outcome'][] = ['removed', 'denied', 'pending'];
      if (!validOutcomes.includes(outcome)) {
        return NextResponse.json(
          { error: 'Invalid outcome', validOutcomes },
          { status: 400 }
        );
      }
      normalizedOutcome = outcome;
    }

    if (normalizedStatus !== undefined) updates.status = normalizedStatus;
    if (sentAt !== undefined) updates.sentAt = new Date(sentAt);
    if (responseReceivedAt !== undefined) updates.responseReceivedAt = new Date(responseReceivedAt);
    if (normalizedOutcome !== undefined) updates.outcome = normalizedOutcome;
    if (notes !== undefined) updates.notes = notes;

    const letter = await db.goodwill.updateGoodwillLetter(
      letterId,
      user.id,
      updates
    );

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'update_goodwill_letter',
      input: { letterId, updates: Object.keys(updates) },
      output: { success: true },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: letter,
    });
  } catch (error) {
    console.error('Error updating goodwill letter:', error);

    return NextResponse.json(
      { error: 'Failed to update goodwill letter' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credit-repair/goodwill/[id]
 * Delete goodwill letter
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;
    const { id: letterId } = await params;

    // 2. Delete goodwill letter from database
    const deleted = await db.goodwill.deleteGoodwillLetter(letterId, user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Goodwill letter not found' },
        { status: 404 }
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'delete_goodwill_letter',
      input: { letterId },
      output: { deleted: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      message: 'Goodwill letter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting goodwill letter:', error);

    return NextResponse.json(
      { error: 'Failed to delete goodwill letter' },
      { status: 500 }
    );
  }
}
