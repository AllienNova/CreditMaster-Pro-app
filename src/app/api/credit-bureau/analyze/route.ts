/**
 * Credit Bureau Analysis API
 * 
 * POST /api/credit-bureau/analyze - Analyze credit report and provide recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { CreditBureauService } from '@/lib/credit-bureau/credit-bureau-service';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const validation = await jwtValidation.validateFromHeaders(request.headers);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = validation.user;

    // 2. Check permission
    if (!rbac.hasPermission(user, 'credit:analyze')) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // 4. Get credit report from database
    const { data: creditReport, error: dbError } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single();

    if (dbError || !creditReport) {
      return NextResponse.json(
        { error: 'Credit report not found' },
        { status: 404 }
      );
    }

    // 5. Analyze credit report
    const analysis = await CreditBureauService.analyzeCreditReport(creditReport);

    // 6. Log action
    console.log(`Credit report analyzed for user ${user.id}, report: ${reportId}, score: ${creditReport.credit_score}`);

    // 7. Return response
    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ Credit analysis API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze credit report'
      },
      { status: 500 }
    );
  }
}

