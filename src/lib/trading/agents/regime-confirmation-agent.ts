/**
 * Regime Confirmation Agent
 *
 * Validates and confirms the detected market regime (trending,
 * ranging, volatile, etc.) by analyzing price action, volume,
 * and volatility patterns. Provides alternative regime probabilities.
 */

import { TradingAgent } from "./base-agent";
import type {
  AgentConfig,
  AgentContext,
  RegimeConfirmationDecision,
} from "./agent-types";
import { getConfidenceLevel } from "./agent-types";
import { regimeConfirmationDecisionSchema } from "./agent-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const REGIME_CONFIRMATION_AGENT_CONFIG: AgentConfig = {
  agentType: "regime_confirmation",
  name: "Regime Confirmation Analyst",
  description:
    "Validates detected market regime and provides alternative regime probabilities",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 15_000,
  maxRetries: 2,
  requiredForConsensus: true,
  consensusWeight: 0.2,
  responseSchema: regimeConfirmationDecisionSchema,
};

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class RegimeConfirmationAgent extends TradingAgent<RegimeConfirmationDecision> {
  constructor(config: AgentConfig = REGIME_CONFIRMATION_AGENT_CONFIG) {
    super(config);
  }

  protected buildPrompt(context: AgentContext): string {
    const parts = [
      `Confirm or challenge the detected market regime for ${context.symbol}.`,
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
      parts.push(`- Detected Regime: ${context.regimeType}`);
    }

    if (context.additionalContext?.["indicators"]) {
      parts.push("");
      parts.push("Technical Indicators:");
      const indicators = context.additionalContext["indicators"] as Record<
        string,
        unknown
      >;
      for (const [key, value] of Object.entries(indicators)) {
        parts.push(`- ${key}: ${value}`);
      }
    }

    if (context.additionalContext?.["recentCandles"]) {
      parts.push("");
      parts.push("Recent Price Action:");
      const candles = context.additionalContext["recentCandles"] as Array<{
        open: number;
        high: number;
        low: number;
        close: number;
      }>;
      candles.slice(-5).forEach((c, i) => {
        parts.push(
          `  [${i + 1}] O: ${c.open} H: ${c.high} L: ${c.low} C: ${c.close}`,
        );
      });
    }

    parts.push("");
    parts.push(
      "Analyze whether the detected regime is correct. Consider trend strength, volatility, " +
        "volume patterns, and mean reversion characteristics.",
    );
    parts.push("");
    parts.push("Respond with a JSON object matching this exact schema:");
    parts.push(
      JSON.stringify({
        agentType: "regime_confirmation",
        bias: "bullish | bearish | neutral",
        confidence: "number 0-1",
        confidenceLevel: "very_low | low | medium | high | very_high",
        reasoning: "string explaining your analysis",
        timestamp: "ISO 8601 string",
        confirmedRegime:
          "the regime you believe is most accurate (e.g., trending_up, trending_down, ranging, volatile, breakout)",
        regimeConfidence: "number 0-1 for confirmed regime",
        alternativeRegimes: [
          {
            regime: "alternative regime name",
            probability: "number 0-1",
          },
        ],
      }),
    );

    return parts.join("\n");
  }

  protected parseResponse(
    raw: string,
    _context: AgentContext,
  ): RegimeConfirmationDecision {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const confidence = Number(parsed["confidence"]) || 0;

    const alternativeRegimes = Array.isArray(parsed["alternativeRegimes"])
      ? (parsed["alternativeRegimes"] as Array<Record<string, unknown>>).map(
          (r) => ({
            regime: String(r["regime"] || "unknown"),
            probability: Number(r["probability"]) || 0,
          }),
        )
      : [];

    return {
      agentType: "regime_confirmation",
      bias:
        (parsed["bias"] as RegimeConfirmationDecision["bias"]) || "neutral",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning: String(parsed["reasoning"] || "No reasoning provided"),
      timestamp: String(parsed["timestamp"] || new Date().toISOString()),
      confirmedRegime: String(parsed["confirmedRegime"] || "unknown"),
      regimeConfidence: Number(parsed["regimeConfidence"]) || 0,
      alternativeRegimes,
    };
  }
}

/** Factory function for creating a RegimeConfirmationAgent */
export function createRegimeConfirmationAgent(
  configOverrides?: Partial<AgentConfig>,
): RegimeConfirmationAgent {
  const config = configOverrides
    ? { ...REGIME_CONFIRMATION_AGENT_CONFIG, ...configOverrides }
    : REGIME_CONFIRMATION_AGENT_CONFIG;
  return new RegimeConfirmationAgent(config);
}
