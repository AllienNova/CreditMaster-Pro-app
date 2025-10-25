/**
 * Enhanced Dispute Generation API
 * 
 * Generates professional credit dispute letters using AIML API's best models
 * (Claude 4.5 Sonnet for legal writing quality)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAIOrchestrator, DisputeGenerationInput } from '@/lib/ai-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { creditReport, disputeReason, userInfo } = body;
    
    if (!creditReport || !disputeReason || !userInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: creditReport, disputeReason, userInfo',
        },
        { status: 400 }
      );
    }

    // Validate userInfo fields
    if (!userInfo.name || !userInfo.address) {
      return NextResponse.json(
        {
          success: false,
          error: 'userInfo must include name and address',
        },
        { status: 400 }
      );
    }

    const input: DisputeGenerationInput = {
      creditReport,
      disputeReason,
      userInfo,
      additionalContext: body.additionalContext,
    };

    // Generate dispute using AI Orchestrator
    const orchestrator = getAIOrchestrator();
    const disputeLetter = await orchestrator.generateDispute(input);

    // Optional: Review for legal compliance
    let complianceReview;
    if (body.reviewCompliance) {
      complianceReview = await orchestrator.reviewCompliance(
        disputeLetter,
        'dispute_letter'
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        disputeLetter,
        model: 'anthropic/claude-4.5-sonnet',
        complianceReview,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Dispute generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate dispute',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Dispute Generation API',
    method: 'POST',
    endpoint: '/api/disputes/generate',
    requiredFields: ['creditReport', 'disputeReason', 'userInfo'],
    optionalFields: ['additionalContext', 'reviewCompliance'],
    model: 'anthropic/claude-4.5-sonnet',
  });
}

