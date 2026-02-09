/**
 * Credit Bureau Report API
 * 
 * GET /api/credit-bureau/report - Get credit report from specific bureau or all bureaus
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { CreditBureauService } from '@/lib/credit-bureau/credit-bureau-service';
import type { Bureau } from '@/lib/credit-bureau/types';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = validation.user;

    // 2. Check permission
    if (!rbac.hasPermission(user, 'credit:read')) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const bureau = searchParams.get('bureau') as Bureau | null;
    const reportType = searchParams.get('type') as 'full' | 'monitoring' | 'score_only' || 'full';

    // 4. Get credit report(s)
    let result;
    
    if (bureau) {
      // Get report from specific bureau
      result = await CreditBureauService.getCreditReport(user.id, bureau, reportType);
    } else {
      // Get reports from all bureaus
      result = await CreditBureauService.getAllCreditReports(user.id);
    }

    // 5. Log action (CreditBureauReportAPI: Credit report retrieved for user)

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    // CreditBureauReportAPI error: Credit report API error

    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve credit report'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = validation.user;

    // 2. Check permission
    if (!rbac.hasPermission(user, 'credit:read')) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { bureau, reportType = 'full' } = body;

    if (!bureau) {
      return NextResponse.json(
        { error: 'Bureau is required' },
        { status: 400 }
      );
    }

    // 4. Request new credit report
    const result = await CreditBureauService.getCreditReport(
      user.id,
      bureau as Bureau,
      reportType
    );

    // 5. Log action (CreditBureauReportAPI: Credit report requested for user)

    // 6. Return response
    return NextResponse.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    // CreditBureauReportAPI error: Credit report request API error

    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request credit report'
      },
      { status: 500 }
    );
  }
}

