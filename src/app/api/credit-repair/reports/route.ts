/**
 * Credit Reports API Route
 * Handles GET and POST requests for credit reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

const VALID_BUREAUS = ['experian', 'equifax', 'transunion'];

/**
 * GET /api/credit-repair/reports
 * Get credit reports for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await jwtValidation.validateFromHeaders(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    const { searchParams } = request.nextUrl;
    const bureau = searchParams.get('bureau');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get reports based on filters
    let reports;
    if (bureau && VALID_BUREAUS.includes(bureau)) {
      reports = await db.creditReports.getCreditReportsByBureau(
        user.id,
        bureau as 'experian' | 'equifax' | 'transunion',
        limit
      );
    } else {
      reports = await db.creditReports.getCreditReportsByUser(user.id, {
        limit,
      });
    }

    // Get latest report for summary (check all bureaus and get the most recent)
    const bureaus: ('experian' | 'equifax' | 'transunion')[] = [
      'experian',
      'equifax',
      'transunion',
    ];
    const latestReports = await Promise.all(
      bureaus.map((b) => db.creditReports.getLatestCreditReport(user.id, b))
    );
    const latestReport =
      latestReports
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort(
          (a, b) =>
            new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
        )[0] || null;

    // Log access
    auditLogger.logAIInteraction({
      userId: authResult.user.id,
      action: 'credit_reports_viewed',
      input: { bureau },
      output: { count: reports.length },
      success: true,
    });

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
    return NextResponse.json(
      { error: 'Failed to get credit reports' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credit-repair/reports
 * Upload a new credit report
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await jwtValidation.validateFromHeaders(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bureau, reportDate, score, reportData } = body;

    // Validate required fields
    if (!bureau || !reportDate || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate bureau
    if (!VALID_BUREAUS.includes(bureau)) {
      return NextResponse.json({ error: 'Invalid bureau' }, { status: 400 });
    }

    // Validate score range (300-850)
    if (score < 300 || score > 850) {
      return NextResponse.json(
        { error: 'Invalid score. Must be between 300 and 850' },
        { status: 400 }
      );
    }

    // Create the report
    const report = await db.creditReports.createCreditReport({
      userId: authResult.user.id,
      bureau,
      reportDate: new Date(reportDate),
      score,
      reportData: reportData || {},
    });

    // Log upload
    auditLogger.logAIInteraction({
      userId: authResult.user.id,
      action: 'credit_report_uploaded',
      input: { bureau, score },
      output: { reportId: report.id },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading credit report:', error);
    return NextResponse.json(
      { error: 'Failed to upload credit report' },
      { status: 500 }
    );
  }
}
