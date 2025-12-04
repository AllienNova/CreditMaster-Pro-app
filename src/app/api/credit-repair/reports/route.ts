/**
 * Credit Reports API Route
 * 
 * GET /api/credit-repair/reports - Get all credit reports
 * POST /api/credit-repair/reports - Upload new credit report
 * 
 * Features:
 * - Full CRUD operations
 * - Database integration
 * - Authentication required
 * - Input validation
 * - File upload support
 * - Error handling
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

/**
 * GET /api/credit-repair/reports
 * Get all credit reports for authenticated user
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
    const bureau = searchParams.get('bureau') as 'experian' | 'equifax' | 'transunion' | null;
    const limitParam = Number.parseInt(searchParams.get('limit') || '50', 10);
    const offsetParam = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isNaN(limitParam) ? 50 : Math.max(limitParam, 1);
    const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0);
    const fetchLimit = limit + offset;

    // 3. Get credit reports from database
    const fetchedReports = bureau
      ? await db.creditReports.getCreditReportsByBureau(
          user.id,
          bureau,
          fetchLimit || undefined
        )
      : await db.creditReports.getCreditReportsByUser(user.id, {
          bureau: undefined,
          limit: fetchLimit || undefined,
        });
    const reports = fetchedReports.slice(offset, offset + limit);

    // 4. Get latest report
    const [latestReport] = await db.creditReports.getCreditReportsByUser(user.id, { limit: 1 });

    // 5. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'get_credit_reports',
      input: { bureau, limit, offset },
      output: { count: reports.length },
      success: true,
    });

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        reports,
        latestReport,
        pagination: {
          limit,
          offset,
          total: reports.length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting credit reports:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to get credit reports: ${(error as Error).message}`,
        severity: 'medium',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to get credit reports' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credit-repair/reports
 * Upload new credit report
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
      bureau,
      reportDate,
      score,
      reportData,
    } = body;

    // Validate required fields
    if (!bureau || !reportDate || !score) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['bureau', 'reportDate', 'score'],
        },
        { status: 400 }
      );
    }

    // Validate bureau
    const validBureaus = ['experian', 'equifax', 'transunion'];
    if (!validBureaus.includes(bureau)) {
      return NextResponse.json(
        { error: 'Invalid bureau', validBureaus },
        { status: 400 }
      );
    }

    // Validate score
    if (score < 300 || score > 850) {
      return NextResponse.json(
        { error: 'Invalid score. Must be between 300 and 850' },
        { status: 400 }
      );
    }

    // 3. Save credit report to database
    const report = await db.creditReports.createCreditReport({
      userId: user.id,
      bureau,
      reportDate: new Date(reportDate),
      score,
      reportData,
    });

    // 4. Audit log
    await auditLogger.logAIInteraction({
      userId: user.id,
      action: 'upload_credit_report',
      input: { bureau, score },
      output: { reportId: report.id },
      success: true,
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: report,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading credit report:', error);

    // Audit log error
    try {
      await auditLogger.logSecurityEvent({
        type: 'api_error',
        message: `Failed to upload credit report: ${(error as Error).message}`,
        severity: 'high',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json(
      { error: 'Failed to upload credit report' },
      { status: 500 }
    );
  }
}
