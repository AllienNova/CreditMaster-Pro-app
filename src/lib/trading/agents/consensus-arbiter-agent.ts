/**
 * Consensus Arbiter Agent
 *
 * Aggregates decisions from all other agents, weighs their votes,
 * detects dissent, and produces a final recommendation.
 * This is the final decision-maker in the agent pipeline.
 */

import { TradingAgent } from "./base-agent";
import type {
  AgentConfig,
  AgentContext,
  AgentType,
  AgentBias,
  ConsensusDecision,
  BaseAgentDecision,
} from "./agent-types";
import { getConfidenceLevel } from "./agent-types";
import { consensusDecisionSchema } from "./agent-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const CONSENSUS_ARBITER_CONFIG: AgentConfig = {
  agentType: "consensus_arbiter",
  name: "Consensus Arbiter",
  description:
    "Aggregates all agent decisions and produces a final weighted recommendation",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 20_000,
  maxRetries: 2,
  requiredForConsensus: false,
  consensusWeight: 0,
  responseSchema: consensusDecisionSchema,
};

// ============================================================================
// TYPES
// ============================================================================

interface AgentVoteInput {
  agentType: AgentType;
  bias: AgentBias;
  confidence: number;
  weight: number;
}

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class ConsensusArbiterAgent extends TradingAgent<ConsensusDecision> {
  constructor(config: AgentConfig = CONSENSUS_ARBITER_CONFIG) {
    super(config);
  }

  protected buildPrompt(context: AgentContext): string {
    const parts = [
      `You are the Consensus Arbiter for ${context.symbol}. Aggregate the agent votes below ` +
        `and produce a final recommendation.`,
      "",
      "Market Data:",
      `- Symbol: ${context.symbol}`,
      `- Current Price: $${context.currentPrice.toFixed(2)}`,
      `- Operating Mode: ${context.operatingMode}`,
    ];

    if (context.signalType) {
      parts.push(
        `- PCTT Signal: ${context.signalType} (strength: ${context.signalStrength ?? "N/A"})`,
      );
    }

    const agentVotes = (context.additionalContext?.["agentVotes"] ?? []) as AgentVoteInput[];

    if (agentVotes.length > 0) {
      parts.push("");
      parts.push("Agent Votes:");
      agentVotes.forEach((vote) => {
        parts.push(
          `- ${vote.agentType}: bias=${vote.bias}, confidence=${vote.confidence.toFixed(2)}, weight=${vote.weight.toFixed(2)}`,
        );
      });
    }

    if (context.additionalContext?.["agentReasonings"]) {
      parts.push("");
      parts.push("Agent Reasonings:");
      const reasonings = context.additionalContext["agentReasonings"] as Record<
        string,
        string
      >;
      for (const [agent, reasoning] of Object.entries(reasonings)) {
        parts.push(`- ${agent}: ${reasoning}`);
      }
    }

    parts.push("");
    parts.push(
      "Weigh all agents by their confidence and assigned weight. Identify dissent " +
        "(agents whose bias disagrees with the majority). Produce a final recommendation.",
    );
    parts.push("");
    parts.push("Respond with a JSON object matching this exact schema:");
    parts.push(
      JSON.stringify({
        agentType: "consensus_arbiter",
        bias: "bullish | bearish | neutral",
        confidence: "number 0-1 (your confidence in the consensus)",
        confidenceLevel: "very_low | low | medium | high | very_high",
        reasoning: "string explaining how you weighted and arbitrated",
        timestamp: "ISO 8601 string",
        agentVotes: [
          {
            agentType: "agent type name",
            bias: "bullish | bearish | neutral",
            confidence: "number 0-1",
            weight: "number 0-1",
          },
        ],
        consensusBias: "bullish | bearish | neutral",
        consensusStrength: "number 0-1 (how strong the consensus is)",
        dissent: "boolean (true if any agents disagree)",
        dissentingAgents: ["array of dissenting agent type names"],
        recommendation: "strong_buy | buy | hold | sell | strong_sell",
      }),
    );

    return parts.join("\n");
  }

  protected parseResponse(
    raw: string,
    context: AgentContext,
  ): ConsensusDecision {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const confidence = Number(parsed["confidence"]) || 0;

    const agentVotes = Array.isArray(parsed["agentVotes"])
      ? (parsed["agentVotes"] as Array<Record<string, unknown>>).map((v) => ({
          agentType: String(v["agentType"]) as AgentType,
          bias: (v["bias"] as AgentBias) || "neutral",
          confidence: Number(v["confidence"]) || 0,
          weight: Number(v["weight"]) || 0,
        }))
      : this.extractVotesFromContext(context);

    const validRecommendations = [
      "strong_buy",
      "buy",
      "hold",
      "sell",
      "strong_sell",
    ] as const;
    const recRaw = String(parsed["recommendation"] || "hold");
    const recommendation = validRecommendations.includes(
      recRaw as (typeof validRecommendations)[number],
    )
      ? (recRaw as ConsensusDecision["recommendation"])
      : "hold";

    const dissentingAgents = Array.isArray(parsed["dissentingAgents"])
      ? (parsed["dissentingAgents"] as string[]).filter((a) =>
          [
            "sentiment",
            "regime_confirmation",
            "news_impact",
            "signal_explainer",
            "risk_narrative",
            "earnings_analysis",
            "consensus_arbiter",
          ].includes(a),
        ) as AgentType[]
      : [];

    return {
      agentType: "consensus_arbiter",
      bias: (parsed["bias"] as ConsensusDecision["bias"]) || "neutral",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning: String(parsed["reasoning"] || "No reasoning provided"),
      timestamp: String(parsed["timestamp"] || new Date().toISOString()),
      agentVotes,
      consensusBias:
        (parsed["consensusBias"] as AgentBias) || "neutral",
      consensusStrength: Number(parsed["consensusStrength"]) || 0,
      dissent: Boolean(parsed["dissent"]),
      dissentingAgents,
      recommendation,
    };
  }

  /** Extract votes from context when LLM doesn't return them */
  private extractVotesFromContext(context: AgentContext): ConsensusDecision["agentVotes"] {
    const votes = (context.additionalContext?.["agentVotes"] ?? []) as AgentVoteInput[];
    return votes.map((v) => ({
      agentType: v.agentType,
      bias: v.bias,
      confidence: v.confidence,
      weight: v.weight,
    }));
  }
}

/** Build agent votes from a map of agent results for passing into context */
export function buildAgentVotes(
  agentResults: Map<AgentType, { decision: BaseAgentDecision; weight: number }>,
): AgentVoteInput[] {
  return Array.from(agentResults.entries()).map(([agentType, result]) => ({
    agentType,
    bias: result.decision.bias,
    confidence: result.decision.confidence,
    weight: result.weight,
  }));
}

/** Factory function for creating a ConsensusArbiterAgent */
export function createConsensusArbiterAgent(
  configOverrides?: Partial<AgentConfig>,
): ConsensusArbiterAgent {
  const config = configOverrides
    ? { ...CONSENSUS_ARBITER_CONFIG, ...configOverrides }
    : CONSENSUS_ARBITER_CONFIG;
  return new ConsensusArbiterAgent(config);
}
