/**
 * Zod Schemas for AI Trading Agent Responses
 *
 * Validation schemas for each agent's decision output.
 * Used by the base class to validate LLM responses.
 */

import { z } from "zod";

// ============================================================================
// SHARED
// ============================================================================

const biasSchema = z.enum(["bullish", "bearish", "neutral"]);
const confidenceLevelSchema = z.enum([
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
]);

const baseDecisionSchema = z.object({
  bias: biasSchema,
  confidence: z.number().min(0).max(1),
  confidenceLevel: confidenceLevelSchema,
  reasoning: z.string().min(1),
  timestamp: z.string(),
});

// ============================================================================
// SENTIMENT AGENT
// ============================================================================

export const sentimentDecisionSchema = baseDecisionSchema.extend({
  agentType: z.literal("sentiment"),
  sentimentScore: z.number().min(-1).max(1),
  sources: z.array(z.string()),
  keyPhrases: z.array(z.string()),
});

// ============================================================================
// REGIME CONFIRMATION AGENT
// ============================================================================

export const regimeConfirmationDecisionSchema = baseDecisionSchema.extend({
  agentType: z.literal("regime_confirmation"),
  confirmedRegime: z.string().min(1),
  regimeConfidence: z.number().min(0).max(1),
  alternativeRegimes: z.array(
    z.object({
      regime: z.string(),
      probability: z.number().min(0).max(1),
    }),
  ),
});

// ============================================================================
// EARNINGS AGENT
// ============================================================================

export const earningsDecisionSchema = baseDecisionSchema.extend({
  agentType: z.literal("earnings_analysis"),
  earningsSurprise: z.number().nullable(),
  revenueGrowth: z.number().nullable(),
  guidanceDirection: z.enum([
    "raised",
    "maintained",
    "lowered",
    "withdrawn",
    "none",
  ]),
  keyMetrics: z.array(
    z.object({
      metric: z.string(),
      value: z.string(),
      vsExpected: z.string(),
    }),
  ),
});

// ============================================================================
// CONSENSUS ARBITER
// ============================================================================

// ============================================================================
// SIGNAL EXPLAINER AGENT
// ============================================================================

export const signalExplainerDecisionSchema = baseDecisionSchema.extend({
  agentType: z.literal("signal_explainer"),
  explanation: z.string().min(1),
  factors: z.array(
    z.object({
      name: z.string().min(1),
      impact: z.number().min(-1).max(1),
      description: z.string().min(1),
    }),
  ),
  suggestedAction: z.enum(["buy", "sell", "hold", "reduce"]),
});

// ============================================================================
// NEWS IMPACT AGENT
// ============================================================================

export const newsImpactDecisionSchema = baseDecisionSchema.extend({
  agentType: z.literal("news_impact"),
  impactScore: z.number().min(-1).max(1),
  impactTimeframe: z.enum([
    "immediate",
    "short_term",
    "medium_term",
    "long_term",
  ]),
  catalysts: z.array(z.string()),
  risks: z.array(z.string()),
});

// ============================================================================
// RISK NARRATIVE AGENT
// ============================================================================

export const riskNarrativeDecisionSchema = baseDecisionSchema.extend({
  agentType: z.literal("risk_narrative"),
  riskLevel: z.enum(["low", "medium", "high", "extreme"]),
  riskScore: z.number().min(0).max(100),
  narrativeSummary: z.string().min(1),
  keyRisks: z.array(
    z.object({
      risk: z.string().min(1),
      severity: z.number().min(0).max(10),
      mitigation: z.string().min(1),
    }),
  ),
});

// ============================================================================
// CONSENSUS ARBITER
// ============================================================================

export const consensusDecisionSchema = baseDecisionSchema.extend({
  agentType: z.literal("consensus_arbiter"),
  agentVotes: z.array(
    z.object({
      agentType: z.enum([
        "sentiment",
        "regime_confirmation",
        "news_impact",
        "signal_explainer",
        "risk_narrative",
        "earnings_analysis",
        "consensus_arbiter",
      ]),
      bias: biasSchema,
      confidence: z.number().min(0).max(1),
      weight: z.number().min(0).max(1),
    }),
  ),
  consensusBias: biasSchema,
  consensusStrength: z.number().min(0).max(1),
  dissent: z.boolean(),
  dissentingAgents: z.array(
    z.enum([
      "sentiment",
      "regime_confirmation",
      "news_impact",
      "signal_explainer",
      "risk_narrative",
      "earnings_analysis",
      "consensus_arbiter",
    ]),
  ),
  recommendation: z.enum([
    "strong_buy",
    "buy",
    "hold",
    "sell",
    "strong_sell",
  ]),
});
