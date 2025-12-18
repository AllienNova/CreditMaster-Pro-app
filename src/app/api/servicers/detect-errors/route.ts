/**
 * Servicer Error Detection API
 * 
 * Detects errors in servicer records using pattern matching
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';
import { servicerIntelligenceEngine } from '@/lib/servicer-intelligence-engine';
import { logAIInteraction } from '@/lib/security/audit-logging';

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, 'servicers:detect_errors')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = validation.user;

    // Parse request body
    const body = await request.json();
    const { loan, payment_history, servicer_communications } = body;

    // Validate required fields
    if (!loan) {
      return NextResponse.json(
        { error: 'Missing required field: loan' },
        { status: 400 }
      );
    }

    // Track timing
    const startTime = Date.now();

    // Detect errors using detectErrorPatterns
    const errorPatterns = await servicerIntelligenceEngine.detectErrorPatterns(
      loan.servicer_name,
      [loan]
    );

    const duration = Date.now() - startTime;

    // Audit log
    logAIInteraction({
      userId: user.id,
      model: 'servicer-intelligence-engine',
      prompt: JSON.stringify({ loan, payment_history, servicer_communications }),
      response: JSON.stringify(errorPatterns),
      tokens: 0,
      cost: 0,
      duration,
      inputValid: true,
      outputValid: true,
    });

    return NextResponse.json({
      success: true,
      error_patterns: errorPatterns,
      count: errorPatterns.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error detection error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect errors' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Servicer Error Detection API',
    method: 'POST',
    endpoint: '/api/servicers/detect-errors',
    requiredFields: ['loan'],
    optionalFields: ['payment_history', 'servicer_communications'],
    description: 'Detects errors in servicer records using pattern matching',
  });
}

