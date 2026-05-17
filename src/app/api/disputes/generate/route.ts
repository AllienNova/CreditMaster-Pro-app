/**
 * Enhanced Dispute Generation API
 *
 * Generates professional credit dispute letters using AIML API's best models
 * (Claude 4.5 Sonnet for legal writing quality)
 *
 * Supports:
 * - AI-generated custom letters
 * - Template-based letter generation (10 templates)
 * - Advanced strategy-based letters (7 strategies)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAIOrchestrator,
  DisputeGenerationInput,
} from "@/lib/ai-orchestrator";
import {
  ALL_DISPUTE_TEMPLATES,
  getTemplateById,
} from "@/lib/prompts/dispute-templates";
import {
  ALL_ADVANCED_STRATEGIES,
  getStrategyById,
  recommendStrategy,
} from "@/lib/disputes/advanced-strategies";
import { disputeServiceDB } from "@/lib/disputes/dispute-service-db";
import type { Bureau } from "@/lib/disputes/dispute-service-db";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { creditService, CREDIT_COSTS } from "@/lib/credits";

// ============================================================================
// MAIN POST HANDLER
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { mode = "ai" } = body;

    // Credit check for AI-powered modes (template mode is free — no AI call)
    if (mode === "ai" || mode === "strategy") {
      const allBureaus = Boolean(body.allBureaus);
      const disputeAction = allBureaus ? "dispute_letter_all" as const : "dispute_letter_single" as const;
      const disputeCost = CREDIT_COSTS[disputeAction];
      const hasDisputeCredits = await creditService.checkSufficientCredits(user.id, disputeCost);
      if (!hasDisputeCredits) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            required: disputeCost,
            action: disputeAction,
          },
          { status: 402 },
        );
      }

      // Store credit context for deduction after success
      body._creditContext = { userId: user.id, action: disputeAction };
    }

    // Route to appropriate handler based on mode.
    // `await` is required so handler rejections are caught by the outer
    // try/catch and returned as 500 instead of escaping as unhandled rejections.
    switch (mode) {
      case "template":
        return await handleTemplateGeneration(body, user.id);
      case "strategy":
        return await handleStrategyGeneration(body, user.id);
      case "ai":
      default:
        return await handleAIGeneration(body, user.id);
    }
  } catch (error) {
    console.error("Dispute generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate dispute",
      },
      { status: 500 },
    );
  }
});

// ============================================================================
// AI-POWERED GENERATION (Original)
// ============================================================================

async function handleAIGeneration(body: Record<string, unknown>, userId: string) {
  const { creditReport, disputeReason, userInfo } = body;

  if (!creditReport || !disputeReason || !userInfo) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields: creditReport, disputeReason, userInfo",
      },
      { status: 400 },
    );
  }

  const userInfoObj = userInfo as { name?: string; address?: string };
  if (!userInfoObj.name || !userInfoObj.address) {
    return NextResponse.json(
      {
        success: false,
        error: "userInfo must include name and address",
      },
      { status: 400 },
    );
  }

  // Parse creditReport - it can be a string (raw report text) or an object
  let parsedCreditReport: import("@/lib/ai-orchestrator").CreditReport;
  if (typeof creditReport === "string") {
    // If it's a string, wrap it in a CreditReport structure with raw text in remarks
    parsedCreditReport = {
      accounts: [
        {
          remarks: creditReport,
        },
      ],
    };
  } else {
    parsedCreditReport =
      creditReport as import("@/lib/ai-orchestrator").CreditReport;
  }

  const input: DisputeGenerationInput = {
    creditReport: parsedCreditReport,
    disputeReason: disputeReason as string,
    userInfo: userInfoObj as {
      name: string;
      address: string;
      ssn?: string;
      accountNumber?: string;
    },
    additionalContext: body.additionalContext as string | undefined,
  };

  const orchestrator = getAIOrchestrator();
  const disputeLetter = await orchestrator.generateDispute(input);

  let complianceReview;
  if (body.reviewCompliance) {
    complianceReview = await orchestrator.reviewCompliance(
      disputeLetter,
      "dispute_letter",
    );
  }

  // Deduct credits after successful AI dispute generation
  const creditCtx = body._creditContext as { userId: string; action: "dispute_letter_single" | "dispute_letter_all" } | undefined;
  if (creditCtx) {
    try {
      await creditService.deductCredits(creditCtx.userId, creditCtx.action, {
        mode: "ai",
        disputeReason: body.disputeReason,
      });
    } catch (deductErr) {
      console.error("[Credits] Failed to deduct for dispute generation:", deductErr);
    }
  }

  // Persist the generated dispute to the database (TASK-CRD-3 gap fix).
  // Best-effort: a DB failure should not surface as an error to the caller —
  // the letter is already generated and the user has been charged.
  let savedDisputeId: string | undefined;
  try {
    const bureau = (body.bureau as Bureau | undefined) ?? "experian";
    const saved = await disputeServiceDB.createDispute(
      userId,
      bureau,
      "ai_generated",
      String(disputeReason),
      String(disputeReason),
      typeof disputeLetter === "string" ? disputeLetter : JSON.stringify(disputeLetter),
    );
    savedDisputeId = saved.id;
  } catch (persistErr) {
    console.error("[Disputes] Failed to persist AI-generated dispute:", persistErr);
  }

  return NextResponse.json({
    success: true,
    data: {
      disputeLetter,
      mode: "ai",
      model: "anthropic/claude-4.5-sonnet",
      complianceReview,
      disputeId: savedDisputeId,
      persistenceWarning: savedDisputeId === undefined ? true : undefined,
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================================================
// TEMPLATE-BASED GENERATION
// ============================================================================

async function handleTemplateGeneration(body: Record<string, unknown>, userId: string) {
  const { templateId, placeholders } = body;

  if (!templateId) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required field: templateId",
        availableTemplates: ALL_DISPUTE_TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          scenario: t.scenario,
          successRate: t.successRate,
        })),
      },
      { status: 400 },
    );
  }

  const template = getTemplateById(templateId as string);
  if (!template) {
    return NextResponse.json(
      {
        success: false,
        error: `Template not found: ${templateId}`,
        availableTemplates: ALL_DISPUTE_TEMPLATES.map((t) => t.id),
      },
      { status: 404 },
    );
  }

  // Replace placeholders in template
  let letterContent = template.template;
  const placeholderValues = (placeholders || {}) as Record<string, string>;

  for (const [key, value] of Object.entries(placeholderValues)) {
    letterContent = letterContent.replace(
      new RegExp(`\\[${key}\\]`, "g"),
      value,
    );
  }

  // Find missing placeholders
  const missingPlaceholders = template.placeholders.filter((p) =>
    letterContent.includes(p),
  );

  // Persist the generated dispute to the database (Fix 1 — template mode was missing this).
  // Best-effort: a DB failure must not block letter delivery.
  let savedDisputeId: string | undefined;
  try {
    const bureau = (body.bureau as Bureau | undefined) ?? "experian";
    const saved = await disputeServiceDB.createDispute(
      userId,
      bureau,
      "template",
      template.name,
      template.scenario,
      letterContent,
    );
    savedDisputeId = saved.id;
  } catch (persistErr) {
    console.error("[Disputes] Failed to persist template dispute:", persistErr);
  }

  return NextResponse.json({
    success: true,
    data: {
      disputeLetter: letterContent,
      mode: "template",
      template: {
        id: template.id,
        name: template.name,
        successRate: template.successRate,
        tone: template.tone,
        fcraSection: template.fcraSection,
        requiredDocuments: template.requiredDocuments,
        bestPractices: template.bestPractices,
      },
      missingPlaceholders:
        missingPlaceholders.length > 0 ? missingPlaceholders : undefined,
      disputeId: savedDisputeId,
      persistenceWarning: savedDisputeId === undefined ? true : undefined,
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================================================
// STRATEGY-BASED GENERATION
// ============================================================================

async function handleStrategyGeneration(body: Record<string, unknown>, userId: string) {
  const { strategyId, variables, scenario } = body;

  // If no strategyId, recommend strategies based on scenario
  if (!strategyId && scenario) {
    const scenarioObj = scenario as {
      disputeType: string;
      previousAttempts: number;
      hasEvidence: boolean;
      accountAge: number;
      isCollection: boolean;
      hasRelationship: boolean;
    };

    const recommended = recommendStrategy(scenarioObj);
    return NextResponse.json({
      success: true,
      data: {
        recommendedStrategies: recommended.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          successRate: s.successRate,
          difficulty: s.difficulty,
          riskLevel: s.riskLevel,
          timeline: s.timeline,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (!strategyId) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required field: strategyId or scenario",
        availableStrategies: ALL_ADVANCED_STRATEGIES.map((s) => ({
          id: s.id,
          name: s.name,
          successRate: s.successRate,
        })),
      },
      { status: 400 },
    );
  }

  const strategy = getStrategyById(strategyId as string);
  if (!strategy) {
    return NextResponse.json(
      {
        success: false,
        error: `Strategy not found: ${strategyId}`,
        availableStrategies: ALL_ADVANCED_STRATEGIES.map((s) => s.id),
      },
      { status: 404 },
    );
  }

  // Generate AI prompt with variables
  let aiPrompt = strategy.aiPrompt;
  const variableValues = (variables || {}) as Record<string, string>;

  for (const [key, value] of Object.entries(variableValues)) {
    aiPrompt = aiPrompt.replace(`{${key}}`, value);
  }

  // Use AI to generate letter based on strategy prompt
  const orchestrator = getAIOrchestrator();
  const disputeDetails = variableValues.DISPUTE_DETAILS || "";
  const disputeLetter = await orchestrator.generateDispute({
    creditReport: disputeDetails
      ? {
          accounts: [
            {
              remarks: disputeDetails,
            },
          ],
        }
      : { accounts: [] },
    disputeReason: strategy.name,
    userInfo: {
      name: variableValues.YOUR_NAME || "[YOUR_NAME]",
      address: variableValues.YOUR_ADDRESS || "[YOUR_ADDRESS]",
    },
    additionalContext: aiPrompt,
  });

  // Deduct credits after successful strategy-based dispute generation
  const stratCreditCtx = body._creditContext as { userId: string; action: "dispute_letter_single" | "dispute_letter_all" } | undefined;
  if (stratCreditCtx) {
    try {
      await creditService.deductCredits(stratCreditCtx.userId, stratCreditCtx.action, {
        mode: "strategy",
        strategyId: body.strategyId,
        strategyName: strategy.name,
      });
    } catch (deductErr) {
      console.error("[Credits] Failed to deduct for strategy dispute generation:", deductErr);
    }
  }

  // Persist the generated dispute to the database (TASK-CRD-3 gap fix).
  // Best-effort: a DB failure should not surface as an error to the caller.
  let savedDisputeId: string | undefined;
  try {
    const bureau = (body.bureau as Bureau | undefined) ?? "experian";
    const saved = await disputeServiceDB.createDispute(
      userId,
      bureau,
      "strategy",
      strategy.name,
      strategy.name,
      typeof disputeLetter === "string" ? disputeLetter : JSON.stringify(disputeLetter),
    );
    savedDisputeId = saved.id;
  } catch (persistErr) {
    console.error("[Disputes] Failed to persist strategy dispute:", persistErr);
  }

  return NextResponse.json({
    success: true,
    data: {
      disputeLetter,
      mode: "strategy",
      strategy: {
        id: strategy.id,
        name: strategy.name,
        successRate: strategy.successRate,
        difficulty: strategy.difficulty,
        riskLevel: strategy.riskLevel,
        legalBasis: strategy.legalBasis,
        steps: strategy.steps,
        timeline: strategy.timeline,
        expectedOutcomes: strategy.expectedOutcomes,
      },
      disputeId: savedDisputeId,
      persistenceWarning: savedDisputeId === undefined ? true : undefined,
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================================================
// GET HANDLER - API Documentation
// ============================================================================

export const GET = withAuth(async () => {
  return NextResponse.json({
    message: "Enhanced Dispute Generation API",
    version: "2.0.0",
    modes: {
      ai: {
        description: "AI-powered custom letter generation",
        requiredFields: ["creditReport", "disputeReason", "userInfo"],
        optionalFields: ["additionalContext", "reviewCompliance"],
      },
      template: {
        description: "Template-based letter generation",
        requiredFields: ["templateId"],
        optionalFields: ["placeholders"],
        availableTemplates: ALL_DISPUTE_TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          scenario: t.scenario,
          successRate: t.successRate,
          tone: t.tone,
          placeholders: t.placeholders,
        })),
      },
      strategy: {
        description: "Advanced strategy-based letter generation",
        requiredFields: ["strategyId OR scenario"],
        optionalFields: ["variables"],
        availableStrategies: ALL_ADVANCED_STRATEGIES.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          successRate: s.successRate,
          difficulty: s.difficulty,
          riskLevel: s.riskLevel,
        })),
      },
    },
    model: "anthropic/claude-4.5-sonnet",
  });
});
