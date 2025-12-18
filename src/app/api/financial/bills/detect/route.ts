import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { billDetectionService } from '@/lib/financial/bill-detection-service';
import type { BillDetectionOptions } from '@/lib/financial/types/bill.types';

/**
 * POST /api/financial/bills/detect
 * Detect recurring bills from transactions
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();

    // Build detection options
    const options: BillDetectionOptions = {};

    if (body.startDate) {
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date' },
          { status: 400 }
        );
      }
      options.startDate = startDate;
    }

    if (body.endDate) {
      const endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date' },
          { status: 400 }
        );
      }
      options.endDate = endDate;
    }

    if (body.minOccurrences !== undefined) {
      options.minOccurrences = parseInt(body.minOccurrences);
    }

    if (body.confidenceThreshold !== undefined) {
      options.confidenceThreshold = parseInt(body.confidenceThreshold);
    }

    // Detect bills
    const detectedBills = await billDetectionService.detectBills(
      userId,
      options
    );

    return NextResponse.json({ detectedBills });
  } catch (error) {
    console.error('Error detecting bills:', error);
    return NextResponse.json(
      { error: 'Failed to detect bills' },
      { status: 500 }
    );
  }
}
