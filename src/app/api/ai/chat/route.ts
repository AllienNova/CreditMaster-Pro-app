/**
 * AI Chat API
 * 
 * General purpose chat endpoint using AIML API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAIMLService, ChatMessage } from '@/lib/aiml-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { model, messages } = body;
    
    if (!model || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: model, messages',
        },
        { status: 400 }
      );
    }

    // Get AIML service
    const aiml = getAIMLService();

    // Call chat API
    const response = await aiml.chat(
      model,
      messages as ChatMessage[],
      {
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 1000,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        content: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get chat response',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Chat API',
    method: 'POST',
    endpoint: '/api/ai/chat',
    requiredFields: ['model', 'messages'],
    optionalFields: ['temperature', 'max_tokens'],
  });
}

