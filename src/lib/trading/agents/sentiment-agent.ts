/**
 * Sentiment Agent
 *
 * Analyzes market sentiment for a given symbol by evaluating
 * news headlines, social media trends, and analyst opinions.
 * Returns a sentiment score (-1 to 1) with key phrases and sources.
 */

import { TradingAgent } from "./base-agent";
import type {
  AgentConfig,
  AgentContext,
  SentimentDecision,
} from "./agent-types";
import { getConfidenceLevel } from "./agent-types";
import { sentimentDecisionSchema } from "./agent-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const SENTIMENT_AGENT_CONFIG: AgentConfig = {
  agentType: "sentiment",
  name: "Sentiment Analyst",
  description:
    "Analyzes market sentiment from news, social media, and analyst opinions",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 15_000,
  maxRetries: 2,
  requiredForConsensus: true,
  consensusWeight: 0.2,
  responseSchema: sentimentDecisionSchema,
};

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class SentimentAgent extends TradingAgent<SentimentDecision> {
  constructor(config: AgentConfig = SENTIMENT_AGENT_CONFIG) {
    super(config);
  }

  protected buildPrompt(context: AgentContext): string {
    const parts = [
      `Analyze the current market sentiment for ${context.symbol}.`,
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
      parts.push(
        `- 24h Volume: ${context.volume24h.toLocaleString()}`,
      );
    }
    if (context.regimeType) {
      parts.push(`- Current Regime: ${context.regimeType}`);
    }
    if (context.signalType) {
      parts.push(`- PCTT Signal: ${context.signalType} (strength: ${context.signalStrength ?? "N/A"})`);
    }

    if (context.additionalContext?.["newsHeadlines"]) {
      parts.push("");
      parts.push("Recent Headlines:");
      const headlines = context.additionalContext["newsHeadlines"] as string[];
      headlines.forEach((h) => parts.push(`- ${h}`));
    }

    parts.push("");
    parts.push("Respond with a JSON object matching this exact schema:");
    parts.push(
      JSON.stringify({
        agentType: "sentiment",
        bias: "bullish | bearish | neutral",
        confidence: "number 0-1",
        confidenceLevel: "very_low | low | medium | high | very_high",
        reasoning: "string explaining your analysis",
        timestamp: "ISO 8601 string",
        sentimentScore: "number -1 (extremely bearish) to 1 (extremely bullish)",
        sources: ["array of sentiment sources analyzed"],
        keyPhrases: ["array of key phrases driving sentiment"],
      }),
    );

    return parts.join("\n");
  }

  protected parseResponse(raw: string, _context: AgentContext): SentimentDecision {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const confidence = Number(parsed["confidence"]) || 0;

    return {
      agentType: "sentiment",
      bias: (parsed["bias"] as SentimentDecision["bias"]) || "neutral",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning: String(parsed["reasoning"] || "No reasoning provided"),
      timestamp: String(parsed["timestamp"] || new Date().toISOString()),
      sentimentScore: Number(parsed["sentimentScore"]) || 0,
      sources: Array.isArray(parsed["sources"])
        ? (parsed["sources"] as string[])
        : [],
      keyPhrases: Array.isArray(parsed["keyPhrases"])
        ? (parsed["keyPhrases"] as string[])
        : [],
    };
  }
}

/** Factory function for creating a SentimentAgent */
export function createSentimentAgent(
  configOverrides?: Partial<AgentConfig>,
): SentimentAgent {
  const config = configOverrides
    ? { ...SENTIMENT_AGENT_CONFIG, ...configOverrides }
    : SENTIMENT_AGENT_CONFIG;
  return new SentimentAgent(config);
}
