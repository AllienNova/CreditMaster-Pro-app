/**
 * Credit Analysis API
 *
 * Analyzes credit reports using AIML API's reasoning models
 * (DeepSeek R1 for advanced analysis)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIOrchestrator, CreditAnalysisInput } from "@/lib/ai-orchestrator";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  try {
    const body = await request.json();

    // Validate required fields
    const { creditReport } = body;

    if (!creditReport) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: creditReport",
        },
        { status: 400 },
      );
    }

    const input: CreditAnalysisInput = {
      creditReport,
      creditScore: body.creditScore,
      goals: body.goals,
    };

    // Analyze credit report using AI Orchestrator
    const orchestrator = getAIOrchestrator();
    const analysis = await orchestrator.analyzeCreditReport(input);

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        model: "deepseek/deepseek-r1",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      {
        success: false,
        error:
          _error instanceof Error
            ? _error.message
            : "Failed to analyze credit report",
      },
      { status: 500 },
    );
  }
});

export const GET = withAuth(
  async (_request: NextRequest, _user: AuthedUser) => {
    return NextResponse.json({
      message: "Credit Analysis API",
      method: "POST",
      endpoint: "/api/credit/analyze",
      requiredFields: ["creditReport"],
      optionalFields: ["creditScore", "goals"],
      model: "deepseek/deepseek-r1",
    });
  },
);
