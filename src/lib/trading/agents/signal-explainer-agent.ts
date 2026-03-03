/**
 * Signal Explainer Agent
 *
 * LLM-backed agent that generates rich, human-readable explanations
 * of PCTT trading signals. Uses the existing rule-based PCTTExplainableAI
 * module as context for LLM-enhanced analysis.
 *
 * Returns: explanation text, contributing factors with impact scores,
 * and a suggested action (buy/sell/hold/reduce).
 */

import { TradingAgent } from "./base-agent";
import type {
  AgentConfig,
  AgentContext,
  SignalExplainerDecision,
} from "./agent-types";
import { getConfidenceLevel } from "./agent-types";
import { signalExplainerDecisionSchema } from "./agent-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const SIGNAL_EXPLAINER_CONFIG: AgentConfig = {
  agentType: "signal_explainer",
  name: "Signal Explainer",
  description:
    "Generates human-readable explanations of PCTT trading signals with factor analysis",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 15_000,
  maxRetries: 2,
  requiredForConsensus: false,
  consensusWeight: 0.15,
  responseSchema: signalExplainerDecisionSchema,
};

// Valid suggested action values
const VALID_ACTIONS = new Set(["buy", "sell", "hold", "reduce"]);

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class SignalExplainerAgent extends TradingAgent<SignalExplainerDecision> {
  constructor(config: AgentConfig = SIGNAL_EXPLAINER_CONFIG) {
    super(config);
  }

  protected buildPrompt(context: AgentContext): string {
    const parts = [
      `Explain the current trading signal for ${context.symbol} in plain language.`,
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

    // Rule-based explanation context from PCTTExplainableAI
    const ruleExplanation = context.additionalContext?.[
      "ruleBasedExplanation"
    ] as Record<string, unknown> | undefined;
    if (ruleExplanation) {
      parts.push("");
      parts.push("Rule-Based Analysis:");
      if (ruleExplanation["summary"]) {
        parts.push(`- Summary: ${ruleExplanation["summary"]}`);
      }
      if (ruleExplanation["narrative"]) {
        parts.push(`- Narrative: ${ruleExplanation["narrative"]}`);
      }
      const factors = ruleExplanation["factors"] as
        | Array<Record<string, unknown>>
        | undefined;
      if (Array.isArray(factors) && factors.length > 0) {
        parts.push("- Factors:");
        factors.forEach((f) => {
          parts.push(
            `  * ${f["name"]}: ${f["value"]} (impact: ${f["impact"]}, weight: ${f["weight"]})`,
          );
        });
      }
    }

    // Structure context
    const structure = context.additionalContext?.["structure"] as
      | Record<string, unknown>
      | undefined;
    if (structure) {
      parts.push("");
      parts.push("PCTT Structure:");
      if (structure["regime"]) parts.push(`- Regime: ${structure["regime"]}`);
      if (structure["event"]) parts.push(`- Event: ${structure["event"]}`);
      if (structure["qScore"] !== undefined)
        parts.push(`- Q-Score: ${structure["qScore"]}`);
    }

    parts.push("");
    parts.push("Respond with a JSON object matching this exact schema:");
    parts.push(
      JSON.stringify({
        agentType: "signal_explainer",
        bias: "bullish | bearish | neutral",
        confidence: "number 0-1",
        confidenceLevel: "very_low | low | medium | high | very_high",
        reasoning: "string explaining your analysis approach",
        timestamp: "ISO 8601 string",
        explanation:
          "detailed human-readable explanation of the trading signal",
        factors: [
          {
            name: "factor name",
            impact: "number -1 (very negative) to 1 (very positive)",
            description: "description of this factor's influence",
          },
        ],
        suggestedAction: "buy | sell | hold | reduce",
      }),
    );

    return parts.join("\n");
  }

  protected parseResponse(
    raw: string,
    _context: AgentContext,
  ): SignalExplainerDecision {
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const confidence = Number(parsed["confidence"]) || 0;

    const rawAction = String(parsed["suggestedAction"] || "hold");
    const suggestedAction = VALID_ACTIONS.has(rawAction)
      ? (rawAction as SignalExplainerDecision["suggestedAction"])
      : "hold";

    const rawFactors = parsed["factors"];
    const factors: SignalExplainerDecision["factors"] = Array.isArray(
      rawFactors,
    )
      ? (rawFactors as Array<Record<string, unknown>>).map((f) => ({
          name: String(f["name"] || "Unknown"),
          impact: Math.max(-1, Math.min(1, Number(f["impact"]) || 0)),
          description: String(f["description"] || ""),
        }))
      : [];

    return {
      agentType: "signal_explainer",
      bias:
        (parsed["bias"] as SignalExplainerDecision["bias"]) || "neutral",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning: String(parsed["reasoning"] || "No reasoning provided"),
      timestamp: String(parsed["timestamp"] || new Date().toISOString()),
      explanation: String(
        parsed["explanation"] || "No explanation available",
      ),
      factors,
      suggestedAction,
    };
  }
}

/** Factory function for creating a SignalExplainerAgent */
export function createSignalExplainerAgent(
  configOverrides?: Partial<AgentConfig>,
): SignalExplainerAgent {
  const config = configOverrides
    ? { ...SIGNAL_EXPLAINER_CONFIG, ...configOverrides }
    : SIGNAL_EXPLAINER_CONFIG;
  return new SignalExplainerAgent(config);
}
