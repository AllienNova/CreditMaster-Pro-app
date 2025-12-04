/**
 * AI Strategy Orchestration API
 * 
 * Orchestrates multiple strategies in parallel for optimal results
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { studentLoanAIEngine } from '@/lib/student-loan-ai-engine';
import { logAIInteraction } from '@/lib/security/audit-logging';

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'ai:orchestrate_strategies')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = validation.user;

    // Parse request body
    const body = await request.json();
    const { strategies, loans, portfolio_analysis } = body;

    // Validate required fields
    if (!strategies || !Array.isArray(strategies) || strategies.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: strategies (non-empty array)' },
        { status: 400 }
      );
    }

    if (!loans || !Array.isArray(loans)) {
      return NextResponse.json(
        { error: 'Missing required field: loans (array)' },
        { status: 400 }
      );
    }

    // Track timing
    const startTime = Date.now();

    // Orchestrate strategies
    const orchestration = await studentLoanAIEngine.orchestrateStrategies(
      strategies,
      loans
    );

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: 'student-loan-ai-engine',
      prompt: JSON.stringify({ strategies, loans, portfolio_analysis }),
      response: JSON.stringify(orchestration),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      orchestration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Strategy orchestration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to orchestrate strategies' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Strategy Orchestration API',
    method: 'POST',
    endpoint: '/api/ai/orchestrate',
    requiredFields: ['strategies', 'loans'],
    optionalFields: ['portfolio_analysis'],
    description: 'Orchestrates multiple strategies in parallel for optimal results',
  });
}

