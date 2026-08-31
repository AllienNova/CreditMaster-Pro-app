/**
 * Multi-Model Consensus API
 *
 * Gets consensus from multiple AI models for critical decisions
 * Uses GPT-5 Pro as meta-model to synthesize responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAIOrchestrator } from '@/lib/ai-orchestrator';
import { TaskType } from '@/lib/model-router';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { rbac } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request.headers);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (premium feature)
    if (!rbac.hasPermission(validation.user, 'ai:consensus')) {
      return NextResponse.json({ error: 'Forbidden - Premium feature' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    const { taskType, prompt } = body;
    
    if (!taskType || !prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: taskType, prompt',
        },
        { status: 400 }
      );
    }

    // Validate taskType
    if (!Object.values(TaskType).includes(taskType as TaskType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid taskType. Must be one of: ${Object.values(TaskType).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get consensus from multiple models
    const orchestrator = getAIOrchestrator();
    const result = await orchestrator.getConsensus(
      taskType as TaskType,
      prompt,
      body.options
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Consensus generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate consensus',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Multi-Model Consensus API',
    method: 'POST',
    endpoint: '/api/ai/consensus',
    requiredFields: ['taskType', 'prompt'],
    optionalFields: ['options'],
    availableTaskTypes: Object.values(TaskType),
    description: 'Get consensus from multiple AI models for critical decisions',
  });
}

