/**
 * Individual Credit Report API Route
 *
 * GET /api/credit-repair/reports/[id] - Get single credit report
 * DELETE /api/credit-repair/reports/[id] - Delete credit report
 *
 * Features:
 * - Database integration
 * - Authentication required
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

/**
 * GET /api/credit-repair/reports/[id]
 * Get single credit report by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;
    const { id: reportId } = await params;

    // 2. Get credit report from database
    const report = await db.creditReports.getCreditReport(reportId, user.id);

    if (!report) {
      return NextResponse.json(
        { error: 'Credit report not found' },
        { status: 404 }
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'get_credit_report',
      input: { reportId },
      output: { found: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error getting credit report:', error);

    return NextResponse.json(
      { error: 'Failed to get credit report' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credit-repair/reports/[id]
 * Delete credit report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validation.user;
    const { id: reportId } = await params;

    // 2. Delete credit report from database
    const deleted = await db.creditReports.deleteCreditReport(
      reportId,
      user.id
    );

    if (!deleted) {
      return NextResponse.json(
        { error: 'Credit report not found' },
        { status: 404 }
      );
    }

    // 3. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'delete_credit_report',
      input: { reportId },
      output: { deleted: true },
      success: true,
    });

    // 4. Return response
    return NextResponse.json({
      success: true,
      message: 'Credit report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting credit report:', error);

    return NextResponse.json(
      { error: 'Failed to delete credit report' },
      { status: 500 }
    );
  }
}
