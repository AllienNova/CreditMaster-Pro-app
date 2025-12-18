import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { billDetectionService } from '@/lib/financial/bill-detection-service';
import type { BillUpdateInput } from '@/lib/financial/types/bill.types';

/**
 * GET /api/financial/bills/[id]
 * Get a single bill by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate JWT and get user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = validation.user.id;
    const { id } = await params;

    // Get bill
    const bill = await billDetectionService.getBillById(id, userId);

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/financial/bills/[id]
 * Update a bill
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate JWT and get user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = validation.user.id;
    const { id } = await params;

    // Parse request body
    const body = await request.json();

    // Build update input
    const input: BillUpdateInput = {};

    if (body.merchantName !== undefined) input.merchantName = body.merchantName;
    if (body.category !== undefined) input.category = body.category;
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }
      input.amount = amount;
    }
    if (body.frequency !== undefined) input.frequency = body.frequency;
    if (body.nextDueDate !== undefined) {
      const date = new Date(body.nextDueDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due date' },
          { status: 400 }
        );
      }
      input.nextDueDate = date;
    }
    if (body.status !== undefined) input.status = body.status;
    if (body.isAutoPay !== undefined) input.isAutoPay = body.isAutoPay;
    if (body.accountId !== undefined) input.accountId = body.accountId;
    if (body.notes !== undefined) input.notes = body.notes;

    // Update bill
    const bill = await billDetectionService.updateBill(id, userId, input);

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Error updating bill:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial/bills/[id]
 * Delete a bill
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate JWT and get user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'financial:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = validation.user.id;
    const { id } = await params;

    // Delete bill
    await billDetectionService.deleteBill(id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}
