/**
 * AI Chat API
 *
 * General purpose chat endpoint using AIML API.
 * The server selects the model via ModelRouter — clients cannot override it.
 * PROTECTED: Requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getModelRouter, TaskType } from "@/lib/model-router";
import type { ChatMessage } from "@/lib/aiml-service";
import { creditService, CREDIT_COSTS } from "@/lib/credits";

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    // model is intentionally NOT accepted from the client — the server selects
    // via ModelRouter (FND-059 / CMP-6).
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: messages",
        },
        { status: 400 },
      );
    }

    // Credit check before expensive LLM call
    const chatCost = CREDIT_COSTS.chat_message;
    const hasChatCredits = await creditService.checkSufficientCredits(
      user.id,
      chatCost,
    );
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

    // Route via ModelRouter — model selection is server-authoritative
    const router = getModelRouter();
    const response = await router.complete(
      TaskType.GENERAL_CHAT,
      messages as ChatMessage[],
      {
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 1000,
      },
    );

    // Deduct credits after successful chat response
    try {
      await creditService.deductCredits(user.id, "chat_message", {
        model: response.model,
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
});

export const GET = withAuth(async () => {
  return NextResponse.json({
    message: "AI Chat API",
    method: "POST",
    endpoint: "/api/ai/chat",
    requiredFields: ["messages"],
    optionalFields: ["temperature", "max_tokens"],
  });
});
