/**
 * News Impact Agent
 *
 * Analyzes the impact of recent news events on a trading symbol.
 * Returns an impact score (-1 to 1), timeframe, catalysts, and risks
 * derived from the headlines and market context passed in.
 */

import { TradingAgent } from "./base-agent";
import type {
  AgentConfig,
  AgentContext,
  NewsImpactDecision,
} from "./agent-types";
import { getConfidenceLevel } from "./agent-types";
import { newsImpactDecisionSchema } from "./agent-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const NEWS_IMPACT_AGENT_CONFIG: AgentConfig = {
  agentType: "news_impact",
  name: "News Impact Analyst",
  description:
    "Analyzes the impact of recent news events on a trading symbol",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 15_000,
  maxRetries: 2,
  requiredForConsensus: true,
  consensusWeight: 0.2,
  responseSchema: newsImpactDecisionSchema,
};

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class NewsImpactAgent extends TradingAgent<NewsImpactDecision> {
  constructor(config: AgentConfig = NEWS_IMPACT_AGENT_CONFIG) {
    super(config);
  }

  protected buildPrompt(context: AgentContext): string {
    const parts = [
      `Analyze the news impact on ${context.symbol}.`,
      "",
      "Market Data:",
      `- Symbol: ${context.symbol}`,
      `- Current Price: $${context.currentPrice.toFixed(2)}`,
    ];

    if (context.priceChange24h !== undefined) {
      parts.push(
        `- 24h Price Change: ${context.priceChange24h >= 0 ? "+" : ""}${context.priceChange24h.toFixed(2)}%`,
      );
    }
    if (context.volume24h !== undefined) {
      parts.push(`- 24h Volume: ${context.volume24h.toLocaleString()}`);
    }
    if (context.regimeType) {
      parts.push(`- Current Regime: ${context.regimeType}`);
    }
    if (context.signalType) {
      parts.push(
        `- PCTT Signal: ${context.signalType} (strength: ${context.signalStrength ?? "N/A"})`,
      );
    }

    const headlines = context.additionalContext?.["newsHeadlines"] as
      | string[]
      | undefined;
    if (headlines && headlines.length > 0) {
      parts.push("");
      parts.push("Recent News Headlines:");
      headlines.forEach((h) => parts.push(`- ${h}`));
    } else {
      parts.push("");
      parts.push(
        "No specific headlines provided — assess based on market context.",
      );
    }

    parts.push("");
    parts.push(
      "Evaluate the aggregate news impact on this symbol. Identify catalysts (positive drivers) and risks (negative drivers). Determine the primary timeframe of the impact.",
    );
    parts.push("");
    parts.push("Respond with a JSON object matching this exact schema:");
    parts.push(
      JSON.stringify({
        agentType: "news_impact",
        bias: "bullish | bearish | neutral",
        confidence: "number 0-1",
        confidenceLevel: "very_low | low | medium | high | very_high",
        reasoning: "string explaining the news impact analysis",
        timestamp: "ISO 8601 string",
        impactScore:
          "number -1 (strongly negative) to 1 (strongly positive news impact)",
        impactTimeframe:
          "immediate | short_term | medium_term | long_term",
        catalysts: ["array of positive news drivers"],
        risks: ["array of negative news risks"],
      }),
    );

    return parts.join("\n");
  }

  protected parseResponse(
    raw: string,
    _context: AgentContext,
  ): NewsImpactDecision {
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const confidence = Number(parsed["confidence"]) || 0;

    const rawTimeframe = String(parsed["impactTimeframe"] || "short_term");
    const validTimeframes = [
      "immediate",
      "short_term",
      "medium_term",
      "long_term",
    ] as const;
    const impactTimeframe = validTimeframes.includes(
      rawTimeframe as (typeof validTimeframes)[number],
    )
      ? (rawTimeframe as NewsImpactDecision["impactTimeframe"])
      : "short_term";

    return {
      agentType: "news_impact",
      bias: (parsed["bias"] as NewsImpactDecision["bias"]) || "neutral",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning: String(parsed["reasoning"] || "No reasoning provided"),
      timestamp: String(parsed["timestamp"] || new Date().toISOString()),
      impactScore: Math.max(-1, Math.min(1, Number(parsed["impactScore"]) || 0)),
      impactTimeframe,
      catalysts: Array.isArray(parsed["catalysts"])
        ? (parsed["catalysts"] as string[])
        : [],
      risks: Array.isArray(parsed["risks"]) ? (parsed["risks"] as string[]) : [],
    };
  }
}

/** Factory function for creating a NewsImpactAgent */
export function createNewsImpactAgent(
  configOverrides?: Partial<AgentConfig>,
): NewsImpactAgent {
  const config = configOverrides
    ? { ...NEWS_IMPACT_AGENT_CONFIG, ...configOverrides }
    : NEWS_IMPACT_AGENT_CONFIG;
  return new NewsImpactAgent(config);
}
