/**
 * Send Dispute API
 * PATCH /api/disputes/[id]/send - Mark dispute as sent
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { disputeService } from '@/lib/disputes/dispute-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existingDispute = disputeService.getDispute(id);
    if (!existingDispute) {
      return NextResponse.json(
        { success: false, error: 'Dispute not found' },
        { status: 404 }
      );
    }

    if (existingDispute.userId !== validation.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const dispute = disputeService.sendDispute(id);

    if (!dispute) {
      return NextResponse.json(
        { success: false, error: 'Failed to send dispute' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: dispute });
  } catch (error) {
    console.error('Send dispute error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send dispute' },
      { status: 500 }
    );
  }
}
