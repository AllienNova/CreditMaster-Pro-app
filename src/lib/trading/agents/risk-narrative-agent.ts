/**
 * Risk Narrative Agent
 *
 * LLM-backed agent that generates comprehensive risk narratives
 * for trading decisions. Uses the existing rule-based PCTTExplainableAI
 * risk identification as context for LLM-enhanced risk analysis.
 *
 * Returns: risk level, risk score (0-100), narrative summary,
 * and key risks with severity and mitigation strategies.
 */

import { TradingAgent } from "./base-agent";
import type {
  AgentConfig,
  AgentContext,
  RiskNarrativeDecision,
} from "./agent-types";
import { getConfidenceLevel } from "./agent-types";
import { riskNarrativeDecisionSchema } from "./agent-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const RISK_NARRATIVE_CONFIG: AgentConfig = {
  agentType: "risk_narrative",
  name: "Risk Narrator",
  description:
    "Generates comprehensive risk narratives with severity scores and mitigation strategies",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 15_000,
  maxRetries: 2,
  requiredForConsensus: false,
  consensusWeight: 0.15,
  responseSchema: riskNarrativeDecisionSchema,
};

// Valid risk level values
const VALID_RISK_LEVELS = new Set(["low", "medium", "high", "extreme"]);

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class RiskNarrativeAgent extends TradingAgent<RiskNarrativeDecision> {
  constructor(config: AgentConfig = RISK_NARRATIVE_CONFIG) {
    super(config);
  }

  protected buildPrompt(context: AgentContext): string {
    const parts = [
      `Analyze the trading risks for ${context.symbol} and provide a comprehensive risk narrative.`,
      "",
      "Market Data:",
      `- Symbol: ${context.symbol}`,
      `- Current Price: $${context.currentPrice.toFixed(2)}`,
      `- Operating Mode: ${context.operatingMode}`,
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

    // Rule-based risk analysis from PCTTExplainableAI
    const ruleRisks = context.additionalContext?.["ruleBasedRisks"] as
      | Array<Record<string, unknown>>
      | undefined;
    if (Array.isArray(ruleRisks) && ruleRisks.length > 0) {
      parts.push("");
      parts.push("Rule-Based Risk Analysis:");
      ruleRisks.forEach((r) => {
        parts.push(
          `- [${r["type"]}] ${r["level"]}: ${r["description"]}${r["mitigation"] ? ` (Mitigation: ${r["mitigation"]})` : ""}`,
        );
      });
    }

    // Position context
    const position = context.additionalContext?.["position"] as
      | Record<string, unknown>
      | undefined;
    if (position) {
      parts.push("");
      parts.push("Current Position:");
      if (position["size"]) parts.push(`- Size: ${position["size"]}`);
      if (position["entryPrice"])
        parts.push(`- Entry Price: $${position["entryPrice"]}`);
      if (position["unrealizedPnl"] !== undefined)
        parts.push(`- Unrealized P&L: $${position["unrealizedPnl"]}`);
      if (position["stopLoss"])
        parts.push(`- Stop Loss: $${position["stopLoss"]}`);
    }

    // Portfolio context
    const portfolio = context.additionalContext?.["portfolio"] as
      | Record<string, unknown>
      | undefined;
    if (portfolio) {
      parts.push("");
      parts.push("Portfolio Context:");
      if (portfolio["totalValue"])
        parts.push(`- Total Value: $${portfolio["totalValue"]}`);
      if (portfolio["concentration"])
        parts.push(`- Concentration: ${portfolio["concentration"]}%`);
      if (portfolio["dailyLoss"] !== undefined)
        parts.push(`- Daily Loss: $${portfolio["dailyLoss"]}`);
    }

    parts.push("");
    parts.push("Respond with a JSON object matching this exact schema:");
    parts.push(
      JSON.stringify({
        agentType: "risk_narrative",
        bias: "bullish | bearish | neutral",
        confidence: "number 0-1",
        confidenceLevel: "very_low | low | medium | high | very_high",
        reasoning: "string explaining your risk assessment approach",
        timestamp: "ISO 8601 string",
        riskLevel: "low | medium | high | extreme",
        riskScore: "number 0-100 (overall risk score)",
        narrativeSummary:
          "human-readable summary of the risk landscape",
        keyRisks: [
          {
            risk: "description of the risk",
            severity: "number 0-10 (how severe)",
            mitigation: "how to mitigate this risk",
          },
        ],
      }),
    );

    return parts.join("\n");
  }

  protected parseResponse(
    raw: string,
    _context: AgentContext,
  ): RiskNarrativeDecision {
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const confidence = Number(parsed["confidence"]) || 0;

    const rawLevel = String(parsed["riskLevel"] || "medium");
    const riskLevel = VALID_RISK_LEVELS.has(rawLevel)
      ? (rawLevel as RiskNarrativeDecision["riskLevel"])
      : "medium";

    const rawScore = Number(parsed["riskScore"]);
    const riskScore = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, rawScore))
      : 50;

    const rawKeyRisks = parsed["keyRisks"];
    const keyRisks: RiskNarrativeDecision["keyRisks"] = Array.isArray(
      rawKeyRisks,
    )
      ? (rawKeyRisks as Array<Record<string, unknown>>).map((r) => ({
          risk: String(r["risk"] || "Unknown risk"),
          severity: Math.max(
            0,
            Math.min(10, Number(r["severity"]) || 5),
          ),
          mitigation: String(r["mitigation"] || "No mitigation specified"),
        }))
      : [];

    return {
      agentType: "risk_narrative",
      bias:
        (parsed["bias"] as RiskNarrativeDecision["bias"]) || "neutral",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning: String(parsed["reasoning"] || "No reasoning provided"),
      timestamp: String(parsed["timestamp"] || new Date().toISOString()),
      riskLevel,
      riskScore,
      narrativeSummary: String(
        parsed["narrativeSummary"] || "No risk narrative available",
      ),
      keyRisks,
    };
  }
}

/** Factory function for creating a RiskNarrativeAgent */
export function createRiskNarrativeAgent(
  configOverrides?: Partial<AgentConfig>,
): RiskNarrativeAgent {
  const config = configOverrides
    ? { ...RISK_NARRATIVE_CONFIG, ...configOverrides }
    : RISK_NARRATIVE_CONFIG;
  return new RiskNarrativeAgent(config);
}
