import { NextRequest, NextResponse } from 'next/server';

interface DisputeableItem {
  id: string;
  type: string;
  description: string;
  bureau: string;
  severity: 'high' | 'medium' | 'low';
  estimatedImpact: number;
  recommendation: string;
}

interface AnalysisResult {
  reportId: string;
  bureau: string;
  reportDate: string;
  creditScore?: number;
  summary: {
    totalAccounts: number;
    openAccounts: number;
    closedAccounts: number;
    negativeItems: number;
    inquiries: number;
    collections: number;
  };
  disputeableItems: DisputeableItem[];
  recommendations: string[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bureau = formData.get('bureau') as string || 'unknown';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, JPG, PNG, or TXT' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Upload to secure storage
    // 2. OCR if image/PDF
    // 3. Parse with AI/ML models
    // 4. Store results in database

    // Determine bureau name
    const bureauName = bureau.toLowerCase().includes('experian') ? 'Experian' :
                       bureau.toLowerCase().includes('equifax') ? 'Equifax' :
                       bureau.toLowerCase().includes('transunion') ? 'TransUnion' : 'Unknown';

    // Generate mock analysis result
    const result: AnalysisResult = {
      reportId: `report-${Date.now()}`,
      bureau: bureauName,
      reportDate: new Date().toISOString(),
      creditScore: Math.floor(Math.random() * 150) + 600, // 600-750
      summary: {
        totalAccounts: 15,
        openAccounts: 8,
        closedAccounts: 7,
        negativeItems: 3,
        inquiries: 4,
        collections: 1,
      },
      disputeableItems: [
        {
          id: 'item-1',
          type: 'Late Payment',
          description: 'Capital One - 30 days late March 2023',
          bureau: bureauName,
          severity: 'high',
          estimatedImpact: 35,
          recommendation: 'Send goodwill letter requesting removal due to otherwise good payment history',
        },
        {
          id: 'item-2',
          type: 'Collection',
          description: 'ABC Collections - Medical debt $450',
          bureau: bureauName,
          severity: 'high',
          estimatedImpact: 50,
          recommendation: 'Request debt validation or negotiate pay-for-delete agreement',
        },
        {
          id: 'item-3',
          type: 'Hard Inquiry',
          description: 'XYZ Lender - Unauthorized inquiry Oct 2024',
          bureau: bureauName,
          severity: 'low',
          estimatedImpact: 5,
          recommendation: 'Dispute as unauthorized inquiry if you did not apply',
        },
      ],
      recommendations: [
        'Prioritize disputing the collection account for maximum score improvement',
        'Send goodwill letter to Capital One for late payment removal',
        'Reduce credit utilization below 30% on revolving accounts',
        'Avoid opening new credit accounts for the next 6 months',
        'Consider becoming an authorized user on a well-aged account',
      ],
      overallHealth: 'fair',
    };

    // Fix the self-reference issue
    result.disputeableItems = result.disputeableItems.map(item => ({
      ...item,
      bureau: result.bureau,
    }));

    return NextResponse.json({
      success: true,
      analysis: result,
      message: 'Credit report analyzed successfully',
    });

  } catch (error) {
    console.error('Credit report analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze credit report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Credit Report Analysis API',
    endpoints: {
      'POST /api/credit-report/analyze': 'Upload and analyze a credit report',
    },
    supportedFormats: ['PDF', 'JPG', 'PNG', 'TXT'],
    maxFileSize: '10MB',
  });
}

