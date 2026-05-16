/**
 * Student Loan Strategy API
 *
 * Generates optimal student loan repayment strategies using AIML API
 * (DeepSeek V3.1 Terminus for advanced mathematical reasoning)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { getAIOrchestrator, LoanStrategyInput } from "@/lib/ai-orchestrator";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Validate required fields
    const { loanData, financialSituation } = body;

    if (!loanData || !financialSituation) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: loanData, financialSituation",
        },
        { status: 400 },
      );
    }

    // Validate loanData fields
    if (
      !loanData.totalBalance ||
      !loanData.interestRate ||
      !loanData.loanType
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "loanData must include totalBalance, interestRate, and loanType",
        },
        { status: 400 },
      );
    }

    // Validate financialSituation fields
    if (
      !financialSituation.income ||
      !financialSituation.familySize ||
      !financialSituation.state
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "financialSituation must include income, familySize, and state",
        },
        { status: 400 },
      );
    }

    const input: LoanStrategyInput = {
      loanData,
      financialSituation,
      goals: body.goals,
    };

    // Generate loan strategy using AI Orchestrator
    const orchestrator = getAIOrchestrator();
    const strategy = await orchestrator.generateLoanStrategy(input);

    return NextResponse.json({
      success: true,
      data: {
        strategy,
        model: "deepseek/deepseek-v3.1-terminus",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Loan strategy generation error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate loan strategy",
      },
      { status: 500 },
    );
  }
});

export const GET = withAuth(async () => {
  return NextResponse.json({
    message: "Student Loan Strategy API",
    method: "POST",
    endpoint: "/api/student-loans/strategy",
    requiredFields: ["loanData", "financialSituation"],
    optionalFields: ["goals"],
    model: "deepseek/deepseek-v3.1-terminus",
  });
});
