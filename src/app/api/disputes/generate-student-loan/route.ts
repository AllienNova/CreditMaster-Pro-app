/**
 * Student Loan Dispute Generation API
 * 
 * Generates dispute letters for student loan errors using Advanced Dispute Engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { advancedDisputeEngine } from '@/lib/advanced-dispute-engine';
import { logAIInteraction } from '@/lib/security/audit-logging';
import { validateInput } from '@/lib/security/input-validation';
import { validateOutput } from '@/lib/security/output-validation';

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'disputes:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = validation.user;

    // Parse request body
    const body = await request.json();
    const { loan, error_type, evidence } = body;

    // Validate required fields
    if (!loan || !error_type) {
      return NextResponse.json(
        { error: 'Missing required fields: loan, error_type' },
        { status: 400 }
      );
    }

    // Validate input
    const inputValidation = validateInput(
      JSON.stringify(body),
      {
        maxLength: 50000,
        checkPromptInjection: true,
        checkPII: false,
      }
    );

    if (!inputValidation.isValid) {
      return NextResponse.json(
        { error: inputValidation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Track timing
    const startTime = Date.now();

    // Generate dispute letter
    const dispute = await advancedDisputeEngine.generateStudentLoanDispute(
      loan,
      error_type,
      evidence
    );

    // Validate output
    const outputCheck = validateOutput(
      dispute.letter_content,
      {
        checkHarmfulContent: true,
        checkPII: false,
      }
    );

    if (!outputCheck.isValid) {
      throw new Error('Generated dispute failed validation');
    }

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: 'advanced-dispute-engine',
      prompt: JSON.stringify({ loan, error_type, evidence }),
      response: JSON.stringify(dispute),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: inputValidation.isValid,
      outputValid: outputCheck.isValid,
    });

    return NextResponse.json({
      success: true,
      dispute: {
        ...dispute,
        letter_content: outputCheck.sanitized,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dispute generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate dispute' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Student Loan Dispute Generation API',
    method: 'POST',
    endpoint: '/api/disputes/generate-student-loan',
    requiredFields: ['loan', 'error_type'],
    optionalFields: ['evidence'],
    description: 'Generates dispute letters for student loan errors',
  });
}

