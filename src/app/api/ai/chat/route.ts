/**
 * AI Chat API
 *
 * General purpose chat endpoint using AIML API
 * PROTECTED: Requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIMLService, ChatMessage } from "@/lib/aiml-service";
import { createClient } from "@/lib/supabase/server";
import { creditService, CREDIT_COSTS } from "@/lib/credits";

export async function POST(request: NextRequest) {
  try {
    // AUTHENTICATION CHECK - Required for all AI endpoints
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Authentication required",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate required fields
    const { model, messages } = body;

    if (!model || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: model, messages",
        },
        { status: 400 },
      );
    }

    // Credit check before expensive LLM call
    const chatCost = CREDIT_COSTS.chat_message;
    const hasChatCredits = await creditService.checkSufficientCredits(user.id, chatCost);
    if (!hasChatCredits) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient credits",
          code: "INSUFFICIENT_CREDITS",
          required: chatCost,
          action: "chat_message",
        },
        { status: 402 },
      );
    }

    // Get AIML service
    const aiml = getAIMLService();

    // Call chat API
    const response = await aiml.chat(model, messages as ChatMessage[], {
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1000,
    });

    // Deduct credits after successful chat response
    try {
      await creditService.deductCredits(user.id, "chat_message", {
        model,
        tokensUsed: response.usage?.total_tokens,
      });
    } catch (deductErr) {
      console.error("[Credits] Failed to deduct for chat_message:", deductErr);
    }

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
    // Error handled - returning 500

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get chat response",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Chat API",
    method: "POST",
    endpoint: "/api/ai/chat",
    requiredFields: ["model", "messages"],
    optionalFields: ["temperature", "max_tokens"],
  });
}
