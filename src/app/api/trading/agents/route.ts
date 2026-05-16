/**
 * Trading Agents API Route
 *
 * Handles AI trading agent operations:
 * - GET: Retrieve agent execution logs
 * - POST: Execute an AI trading agent
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import type { AgentType, AgentContext } from "@/lib/trading/agents/agent-types";
import {
  createSentimentAgent,
  createRegimeConfirmationAgent,
  createEarningsAgent,
  createSignalExplainerAgent,
  createRiskNarrativeAgent,
  createConsensusArbiterAgent,
  createNewsImpactAgent,
} from "@/lib/trading/agents";
import type { OperatingMode } from "@/lib/trading/modes/mode-types";

// ============================================================================
// VALID AGENT TYPES
// ============================================================================

const VALID_AGENT_TYPES = new Set<AgentType>([
  "sentiment",
  "regime_confirmation",
  "news_impact",
  "earnings_analysis",
  "signal_explainer",
  "risk_narrative",
  "consensus_arbiter",
]);

// ============================================================================
// AGENT FACTORY MAP
// ============================================================================

function createAgentByType(agentType: AgentType) {
  switch (agentType) {
    case "sentiment":
      return createSentimentAgent();
    case "regime_confirmation":
      return createRegimeConfirmationAgent();
    case "earnings_analysis":
      return createEarningsAgent();
    case "signal_explainer":
      return createSignalExplainerAgent();
    case "risk_narrative":
      return createRiskNarrativeAgent();
    case "news_impact":
      return createNewsImpactAgent();
    case "consensus_arbiter":
      return createConsensusArbiterAgent();
    default:
      return null;
  }
}

// ============================================================================
// GET - Retrieve Agent Logs
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const agentType = searchParams.get("agentType");
    const symbol = searchParams.get("symbol");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("trading_agent_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentType) {
      query = query.eq("agent_type", agentType);
    }
    if (symbol) {
      query = query.eq("symbol", symbol);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to retrieve agent logs" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: data || [],
        count: (data || []).length,
        offset,
        limit,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve agent logs" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Execute Agent
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const agentType = body.agentType as string | undefined;
    if (!agentType || !VALID_AGENT_TYPES.has(agentType as AgentType)) {
      return NextResponse.json(
        {
          error: `Invalid agentType. Must be one of: ${Array.from(VALID_AGENT_TYPES).join(", ")}`,
        },
        { status: 400 },
      );
    }

    const symbol = body.symbol as string | undefined;
    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required" },
        { status: 400 },
      );
    }

    const currentPrice = Number(body.currentPrice);
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return NextResponse.json(
        { error: "currentPrice must be a positive number" },
        { status: 400 },
      );
    }

    const operatingMode = (body.operatingMode as OperatingMode) || "watch";

    // Build agent context
    const context: AgentContext = {
      symbol,
      userId: user.id,
      operatingMode,
      currentPrice,
      signalId: (body.signalId as string) || undefined,
      priceChange24h:
        body.priceChange24h !== undefined
          ? Number(body.priceChange24h)
          : undefined,
      volume24h:
        body.volume24h !== undefined ? Number(body.volume24h) : undefined,
      signalType: (body.signalType as AgentContext["signalType"]) || undefined,
      signalStrength:
        body.signalStrength !== undefined
          ? Number(body.signalStrength)
          : undefined,
      regimeType: (body.regimeType as string) || undefined,
      additionalContext:
        (body.additionalContext as Record<string, unknown>) || undefined,
    };

    // Create and execute the agent
    const agent = createAgentByType(agentType as AgentType);
    if (!agent) {
      return NextResponse.json(
        { error: `Agent type "${agentType}" is not available` },
        { status: 400 },
      );
    }

    const result = await agent.execute(context);

    return NextResponse.json({
      success: result.success,
      data: {
        decision: result.decision || null,
        metrics: result.metrics,
        error: result.error || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to execute agent" },
      { status: 500 },
    );
  }
});
