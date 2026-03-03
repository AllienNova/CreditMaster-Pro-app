/**
 * Earnings Agent
 *
 * Analyzes recent or upcoming earnings data for a given symbol.
 * Evaluates earnings surprise, revenue growth, forward guidance,
 * and key financial metrics to determine trading bias.
 */

import { TradingAgent } from "./base-agent";
import type {
  AgentConfig,
  AgentContext,
  EarningsDecision,
} from "./agent-types";
import { getConfidenceLevel } from "./agent-types";
import { earningsDecisionSchema } from "./agent-schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const EARNINGS_AGENT_CONFIG: AgentConfig = {
  agentType: "earnings_analysis",
  name: "Earnings Analyst",
  description:
    "Analyzes earnings data including surprise, revenue growth, guidance, and key metrics",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 15_000,
  maxRetries: 2,
  requiredForConsensus: false,
  consensusWeight: 0.15,
  responseSchema: earningsDecisionSchema,
};

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export class EarningsAgent extends TradingAgent<EarningsDecision> {
  constructor(config: AgentConfig = EARNINGS_AGENT_CONFIG) {
    super(config);
  }

  protected buildPrompt(context: AgentContext): string {
    const parts = [
      `Analyze the earnings situation for ${context.symbol}.`,
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

    if (context.additionalContext?.["earningsData"]) {
      parts.push("");
      parts.push("Earnings Data:");
      const data = context.additionalContext["earningsData"] as Record<
        string,
        unknown
      >;
      if (data["reportDate"]) parts.push(`- Report Date: ${data["reportDate"]}`);
      if (data["epsActual"] !== undefined)
        parts.push(`- EPS Actual: $${data["epsActual"]}`);
      if (data["epsEstimate"] !== undefined)
        parts.push(`- EPS Estimate: $${data["epsEstimate"]}`);
      if (data["revenueActual"] !== undefined)
        parts.push(`- Revenue Actual: $${data["revenueActual"]}`);
      if (data["revenueEstimate"] !== undefined)
        parts.push(`- Revenue Estimate: $${data["revenueEstimate"]}`);
      if (data["guidance"]) parts.push(`- Guidance: ${data["guidance"]}`);
    }

    if (context.additionalContext?.["priorQuarters"]) {
      parts.push("");
      parts.push("Prior Quarters:");
      const quarters = context.additionalContext["priorQuarters"] as Array<
        Record<string, unknown>
      >;
      quarters.slice(-4).forEach((q) => {
        parts.push(
          `  ${q["quarter"]}: EPS ${q["eps"]}, Revenue ${q["revenue"]}`,
        );
      });
    }

    parts.push("");
    parts.push(
      "Evaluate the earnings impact on the stock. Consider: beat/miss magnitude, " +
        "revenue trends, guidance direction, and historical reactions.",
    );
    parts.push("");
    parts.push("Respond with a JSON object matching this exact schema:");
    parts.push(
      JSON.stringify({
        agentType: "earnings_analysis",
        bias: "bullish | bearish | neutral",
        confidence: "number 0-1",
        confidenceLevel: "very_low | low | medium | high | very_high",
        reasoning: "string explaining your analysis",
        timestamp: "ISO 8601 string",
        earningsSurprise:
          "number (percentage beat/miss, e.g., 5.2 for 5.2% beat) or null if no data",
        revenueGrowth:
          "number (YoY revenue growth percentage) or null if no data",
        guidanceDirection: "raised | maintained | lowered | withdrawn | none",
        keyMetrics: [
          {
            metric: "metric name",
            value: "actual value",
            vsExpected: "beat | miss | inline",
          },
        ],
      }),
    );

    return parts.join("\n");
  }

  protected parseResponse(
    raw: string,
    _context: AgentContext,
  ): EarningsDecision {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const confidence = Number(parsed["confidence"]) || 0;

    const earningsSurprise =
      parsed["earningsSurprise"] === null || parsed["earningsSurprise"] === undefined
        ? null
        : Number(parsed["earningsSurprise"]);

    const revenueGrowth =
      parsed["revenueGrowth"] === null || parsed["revenueGrowth"] === undefined
        ? null
        : Number(parsed["revenueGrowth"]);

    const validGuidance = [
      "raised",
      "maintained",
      "lowered",
      "withdrawn",
      "none",
    ] as const;
    const guidanceRaw = String(parsed["guidanceDirection"] || "none");
    const guidanceDirection = validGuidance.includes(
      guidanceRaw as (typeof validGuidance)[number],
    )
      ? (guidanceRaw as EarningsDecision["guidanceDirection"])
      : "none";

    const keyMetrics = Array.isArray(parsed["keyMetrics"])
      ? (parsed["keyMetrics"] as Array<Record<string, unknown>>).map((m) => ({
          metric: String(m["metric"] || ""),
          value: String(m["value"] || ""),
          vsExpected: String(m["vsExpected"] || "inline"),
        }))
      : [];

    return {
      agentType: "earnings_analysis",
      bias: (parsed["bias"] as EarningsDecision["bias"]) || "neutral",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning: String(parsed["reasoning"] || "No reasoning provided"),
      timestamp: String(parsed["timestamp"] || new Date().toISOString()),
      earningsSurprise,
      revenueGrowth,
      guidanceDirection,
      keyMetrics,
    };
  }
}

/** Factory function for creating an EarningsAgent */
export function createEarningsAgent(
  configOverrides?: Partial<AgentConfig>,
): EarningsAgent {
  const config = configOverrides
    ? { ...EARNINGS_AGENT_CONFIG, ...configOverrides }
    : EARNINGS_AGENT_CONFIG;
  return new EarningsAgent(config);
}
