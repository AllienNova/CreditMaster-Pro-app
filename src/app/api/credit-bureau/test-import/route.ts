/**
 * Test Credit Report Import API
 * 
 * POST /api/credit-bureau/test-import - Test importing a mock credit report
 * 
 * This endpoint is for testing purposes only and should be removed in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateMockCreditReport } from '@/lib/credit-bureau/mock-credit-report-generator';
import type { Bureau } from '@/types/credit-bureau';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { 
      userId, 
      bureau = 'experian',
      creditScore,
      includeNegativeItems = false 
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // TestImport: Testing credit report import

    // 2. Generate mock credit report
    const mockReport = generateMockCreditReport({
      bureau: bureau as Bureau,
      creditScore,
      accountCount: 10,
      inquiryCount: 3,
      publicRecordCount: includeNegativeItems ? 1 : 0,
      includeNegativeItems,
    });

    // TestImport: Mock credit report generated

    // 3. Save credit report to database
    const reportDate = new Date().toISOString().split('T')[0];
    
    const { data: creditReportData, error: reportError } = await supabase
      .from('credit_reports')
      .insert({
        user_id: userId,
        bureau,
        report_date: reportDate,
        credit_score: mockReport.creditScore,
        score_factors: mockReport.scoreFactors,
        raw_data: { mock: true, generated_at: new Date().toISOString() },
        parsed_data: mockReport,
      })
      .select()
      .single();

    if (reportError) {
      // TestImport error: Error saving credit report
      return NextResponse.json(
        { error: 'Failed to save credit report', details: reportError.message },
        { status: 500 }
      );
    }

    // TestImport: Credit report saved to database

    // 4. Save credit accounts
    const accountsToInsert = mockReport.accounts.map(account => ({
      report_id: creditReportData.id,
      user_id: userId,
      account_type: account.accountType,
      account_number: account.accountNumber,
      creditor_name: account.creditorName,
      balance: account.balance,
      credit_limit: account.creditLimit,
      payment_status: account.paymentStatus,
      opened_date: account.openedDate,
      closed_date: account.closedDate,
      last_payment_date: account.lastPaymentDate,
      payment_history: account.paymentHistory,
      is_disputed: false,
    }));

    const { data: accountsData, error: accountsError } = await supabase
      .from('credit_accounts')
      .insert(accountsToInsert)
      .select();

    if (accountsError) {
      // TestImport error: Error saving credit accounts
      return NextResponse.json(
        { error: 'Failed to save credit accounts', details: accountsError.message },
        { status: 500 }
      );
    }

    // TestImport: credit accounts saved

    // 5. Save credit inquiries
    const inquiriesToInsert = mockReport.inquiries.map(inquiry => ({
      report_id: creditReportData.id,
      user_id: userId,
      inquiry_type: inquiry.inquiryType,
      creditor_name: inquiry.creditorName,
      inquiry_date: inquiry.inquiryDate,
      is_disputed: false,
    }));

    const { data: inquiriesData, error: inquiriesError } = await supabase
      .from('credit_inquiries')
      .insert(inquiriesToInsert)
      .select();

    if (inquiriesError) {
      // TestImport error: Error saving credit inquiries
      return NextResponse.json(
        { error: 'Failed to save credit inquiries', details: inquiriesError.message },
        { status: 500 }
      );
    }

    // TestImport: credit inquiries saved

    // 6. Save public records (if any)
    if (mockReport.publicRecords.length > 0) {
      const recordsToInsert = mockReport.publicRecords.map(record => ({
        report_id: creditReportData.id,
        user_id: userId,
        record_type: record.recordType,
        filing_date: record.filingDate,
        status: record.status,
        amount: record.amount,
        court_name: record.courtName,
        case_number: record.caseNumber,
        is_disputed: false,
      }));

      const { data: recordsData, error: recordsError } = await supabase
        .from('public_records')
        .insert(recordsToInsert)
        .select();

      if (recordsError) {
        // TestImport error: Error saving public records
        return NextResponse.json(
          { error: 'Failed to save public records', details: recordsError.message },
          { status: 500 }
        );
      }

      // TestImport: public records saved
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      message: 'Mock credit report imported successfully',
      data: {
        reportId: creditReportData.id,
        bureau,
        creditScore: mockReport.creditScore,
        reportDate,
        stats: {
          accounts: accountsData.length,
          inquiries: inquiriesData.length,
          publicRecords: mockReport.publicRecords.length,
        },
      },
    });

  } catch (_error) {
    // TestImport error: Test import error

    return NextResponse.json(
      {
        success: false,
        error: _error instanceof Error ? _error.message : 'Failed to import test credit report'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve test reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all credit reports for user
    const { data: reports, error: reportsError } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false });

    if (reportsError) {
      // TestImport error: Error fetching credit reports
      return NextResponse.json(
        { error: 'Failed to fetch credit reports', details: reportsError.message },
        { status: 500 }
      );
    }

    // Get accounts, inquiries, and public records for each report
    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const [accountsResult, inquiriesResult, recordsResult] = await Promise.all([
          supabase.from('credit_accounts').select('*').eq('report_id', report.id),
          supabase.from('credit_inquiries').select('*').eq('report_id', report.id),
          supabase.from('public_records').select('*').eq('report_id', report.id),
        ]);

        return {
          ...report,
          accounts: accountsResult.data || [],
          inquiries: inquiriesResult.data || [],
          publicRecords: recordsResult.data || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: reportsWithDetails,
    });

  } catch (_error) {
    // TestImport error: Test fetch error

    return NextResponse.json(
      {
        success: false,
        error: _error instanceof Error ? _error.message : 'Failed to fetch test credit reports'
      },
      { status: 500 }
    );
  }
}

