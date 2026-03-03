/**
 * Agent Schemas Tests
 *
 * Validates Zod schemas for AI trading agent decision outputs.
 * Tests both valid and invalid inputs for each schema.
 */

import {
  sentimentDecisionSchema,
  regimeConfirmationDecisionSchema,
  earningsDecisionSchema,
  signalExplainerDecisionSchema,
  riskNarrativeDecisionSchema,
  consensusDecisionSchema,
} from "../agent-schemas";

// ============================================================================
// HELPERS
// ============================================================================

function makeBaseDecision(overrides: Record<string, unknown> = {}) {
  return {
    bias: "bullish",
    confidence: 0.85,
    confidenceLevel: "high",
    reasoning: "Strong uptrend with volume confirmation",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// TESTS: sentimentDecisionSchema
// ============================================================================

describe("sentimentDecisionSchema", () => {
  it("should accept valid sentiment decision", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "sentiment",
      sentimentScore: 0.72,
      sources: ["reuters", "bloomberg"],
      keyPhrases: ["strong earnings", "growth outlook"],
    };
    const result = sentimentDecisionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept edge-case sentiment scores", () => {
    const negOne = {
      ...makeBaseDecision(),
      agentType: "sentiment",
      sentimentScore: -1,
      sources: [],
      keyPhrases: [],
    };
    expect(sentimentDecisionSchema.safeParse(negOne).success).toBe(true);

    const posOne = {
      ...makeBaseDecision(),
      agentType: "sentiment",
      sentimentScore: 1,
      sources: [],
      keyPhrases: [],
    };
    expect(sentimentDecisionSchema.safeParse(posOne).success).toBe(true);
  });

  it("should reject sentiment score outside [-1, 1]", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "sentiment",
      sentimentScore: 1.5,
      sources: [],
      keyPhrases: [],
    };
    expect(sentimentDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject wrong agentType", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "regime_confirmation",
      sentimentScore: 0.5,
      sources: [],
      keyPhrases: [],
    };
    expect(sentimentDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject missing required fields", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "sentiment",
      // missing sentimentScore, sources, keyPhrases
    };
    expect(sentimentDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject confidence outside [0, 1]", () => {
    const input = {
      ...makeBaseDecision({ confidence: 1.5 }),
      agentType: "sentiment",
      sentimentScore: 0.5,
      sources: [],
      keyPhrases: [],
    };
    expect(sentimentDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject invalid bias value", () => {
    const input = {
      ...makeBaseDecision({ bias: "sideways" }),
      agentType: "sentiment",
      sentimentScore: 0.5,
      sources: [],
      keyPhrases: [],
    };
    expect(sentimentDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject empty reasoning", () => {
    const input = {
      ...makeBaseDecision({ reasoning: "" }),
      agentType: "sentiment",
      sentimentScore: 0.5,
      sources: [],
      keyPhrases: [],
    };
    expect(sentimentDecisionSchema.safeParse(input).success).toBe(false);
  });
});

// ============================================================================
// TESTS: regimeConfirmationDecisionSchema
// ============================================================================

describe("regimeConfirmationDecisionSchema", () => {
  it("should accept valid regime confirmation decision", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "regime_confirmation",
      confirmedRegime: "bull_trend",
      regimeConfidence: 0.88,
      alternativeRegimes: [
        { regime: "range_bound", probability: 0.08 },
        { regime: "bear_trend", probability: 0.04 },
      ],
    };
    expect(regimeConfirmationDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should accept empty alternative regimes", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "regime_confirmation",
      confirmedRegime: "bull_trend",
      regimeConfidence: 0.95,
      alternativeRegimes: [],
    };
    expect(regimeConfirmationDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should reject regime confidence outside [0, 1]", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "regime_confirmation",
      confirmedRegime: "bull_trend",
      regimeConfidence: 1.5,
      alternativeRegimes: [],
    };
    expect(regimeConfirmationDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject empty confirmedRegime", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "regime_confirmation",
      confirmedRegime: "",
      regimeConfidence: 0.8,
      alternativeRegimes: [],
    };
    expect(regimeConfirmationDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject alternative regimes with invalid probability", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "regime_confirmation",
      confirmedRegime: "bull_trend",
      regimeConfidence: 0.8,
      alternativeRegimes: [{ regime: "bear", probability: 2.0 }],
    };
    expect(regimeConfirmationDecisionSchema.safeParse(input).success).toBe(false);
  });
});

// ============================================================================
// TESTS: earningsDecisionSchema
// ============================================================================

describe("earningsDecisionSchema", () => {
  it("should accept valid earnings decision", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "earnings_analysis",
      earningsSurprise: 0.15,
      revenueGrowth: 0.08,
      guidanceDirection: "raised",
      keyMetrics: [
        { metric: "EPS", value: "$3.25", vsExpected: "+5%" },
        { metric: "Revenue", value: "$95B", vsExpected: "+2%" },
      ],
    };
    expect(earningsDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should accept null earningsSurprise and revenueGrowth", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "earnings_analysis",
      earningsSurprise: null,
      revenueGrowth: null,
      guidanceDirection: "none",
      keyMetrics: [],
    };
    expect(earningsDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should accept all guidance directions", () => {
    const directions = ["raised", "maintained", "lowered", "withdrawn", "none"] as const;
    for (const dir of directions) {
      const input = {
        ...makeBaseDecision(),
        agentType: "earnings_analysis",
        earningsSurprise: null,
        revenueGrowth: null,
        guidanceDirection: dir,
        keyMetrics: [],
      };
      expect(earningsDecisionSchema.safeParse(input).success).toBe(true);
    }
  });

  it("should reject invalid guidance direction", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "earnings_analysis",
      earningsSurprise: null,
      revenueGrowth: null,
      guidanceDirection: "improved",
      keyMetrics: [],
    };
    expect(earningsDecisionSchema.safeParse(input).success).toBe(false);
  });
});

// ============================================================================
// TESTS: signalExplainerDecisionSchema
// ============================================================================

describe("signalExplainerDecisionSchema", () => {
  it("should accept valid signal explainer decision", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "signal_explainer",
      explanation: "RSI divergence combined with MACD crossover suggests upward momentum",
      factors: [
        { name: "RSI", impact: 0.6, description: "Oversold bounce" },
        { name: "MACD", impact: 0.4, description: "Bullish crossover" },
      ],
      suggestedAction: "buy",
    };
    expect(signalExplainerDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should accept all suggested actions", () => {
    const actions = ["buy", "sell", "hold", "reduce"] as const;
    for (const action of actions) {
      const input = {
        ...makeBaseDecision(),
        agentType: "signal_explainer",
        explanation: "Test explanation",
        factors: [],
        suggestedAction: action,
      };
      expect(signalExplainerDecisionSchema.safeParse(input).success).toBe(true);
    }
  });

  it("should reject impact outside [-1, 1]", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "signal_explainer",
      explanation: "Test",
      factors: [{ name: "RSI", impact: 1.5, description: "Invalid" }],
      suggestedAction: "buy",
    };
    expect(signalExplainerDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject empty explanation", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "signal_explainer",
      explanation: "",
      factors: [],
      suggestedAction: "buy",
    };
    expect(signalExplainerDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject factor with empty name", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "signal_explainer",
      explanation: "Test explanation",
      factors: [{ name: "", impact: 0.5, description: "Missing name" }],
      suggestedAction: "buy",
    };
    expect(signalExplainerDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject invalid suggested action", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "signal_explainer",
      explanation: "Test",
      factors: [],
      suggestedAction: "short",
    };
    expect(signalExplainerDecisionSchema.safeParse(input).success).toBe(false);
  });
});

// ============================================================================
// TESTS: riskNarrativeDecisionSchema
// ============================================================================

describe("riskNarrativeDecisionSchema", () => {
  it("should accept valid risk narrative decision", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "risk_narrative",
      riskLevel: "medium",
      riskScore: 45,
      narrativeSummary: "Moderate risk with geopolitical uncertainty",
      keyRisks: [
        {
          risk: "Trade war escalation",
          severity: 7,
          mitigation: "Reduce position size by 50%",
        },
      ],
    };
    expect(riskNarrativeDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should accept all risk levels", () => {
    const levels = ["low", "medium", "high", "extreme"] as const;
    for (const level of levels) {
      const input = {
        ...makeBaseDecision(),
        agentType: "risk_narrative",
        riskLevel: level,
        riskScore: 50,
        narrativeSummary: "Test narrative",
        keyRisks: [],
      };
      expect(riskNarrativeDecisionSchema.safeParse(input).success).toBe(true);
    }
  });

  it("should reject riskScore outside [0, 100]", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "risk_narrative",
      riskLevel: "high",
      riskScore: 150,
      narrativeSummary: "Test",
      keyRisks: [],
    };
    expect(riskNarrativeDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject severity outside [0, 10]", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "risk_narrative",
      riskLevel: "high",
      riskScore: 75,
      narrativeSummary: "Test",
      keyRisks: [{ risk: "Test risk", severity: 15, mitigation: "Hedge" }],
    };
    expect(riskNarrativeDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject empty narrativeSummary", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "risk_narrative",
      riskLevel: "low",
      riskScore: 10,
      narrativeSummary: "",
      keyRisks: [],
    };
    expect(riskNarrativeDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject invalid risk level", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "risk_narrative",
      riskLevel: "catastrophic",
      riskScore: 99,
      narrativeSummary: "Test",
      keyRisks: [],
    };
    expect(riskNarrativeDecisionSchema.safeParse(input).success).toBe(false);
  });
});

// ============================================================================
// TESTS: consensusDecisionSchema
// ============================================================================

describe("consensusDecisionSchema", () => {
  it("should accept valid consensus decision", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "consensus_arbiter",
      agentVotes: [
        { agentType: "sentiment", bias: "bullish", confidence: 0.8, weight: 0.3 },
        { agentType: "regime_confirmation", bias: "bullish", confidence: 0.9, weight: 0.4 },
        { agentType: "risk_narrative", bias: "neutral", confidence: 0.6, weight: 0.3 },
      ],
      consensusBias: "bullish",
      consensusStrength: 0.75,
      dissent: true,
      dissentingAgents: ["risk_narrative"],
      recommendation: "buy",
    };
    expect(consensusDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should accept all recommendation values", () => {
    const recommendations = ["strong_buy", "buy", "hold", "sell", "strong_sell"] as const;
    for (const rec of recommendations) {
      const input = {
        ...makeBaseDecision(),
        agentType: "consensus_arbiter",
        agentVotes: [],
        consensusBias: "neutral",
        consensusStrength: 0.5,
        dissent: false,
        dissentingAgents: [],
        recommendation: rec,
      };
      expect(consensusDecisionSchema.safeParse(input).success).toBe(true);
    }
  });

  it("should accept all valid agent types in votes", () => {
    const agentTypes = [
      "sentiment",
      "regime_confirmation",
      "news_impact",
      "signal_explainer",
      "risk_narrative",
      "earnings_analysis",
      "consensus_arbiter",
    ] as const;

    for (const at of agentTypes) {
      const input = {
        ...makeBaseDecision(),
        agentType: "consensus_arbiter",
        agentVotes: [{ agentType: at, bias: "neutral", confidence: 0.5, weight: 0.5 }],
        consensusBias: "neutral",
        consensusStrength: 0.5,
        dissent: false,
        dissentingAgents: [],
        recommendation: "hold",
      };
      expect(consensusDecisionSchema.safeParse(input).success).toBe(true);
    }
  });

  it("should accept all valid agent types in dissentingAgents", () => {
    const agentTypes = [
      "sentiment",
      "regime_confirmation",
      "news_impact",
      "signal_explainer",
      "risk_narrative",
      "earnings_analysis",
      "consensus_arbiter",
    ] as const;

    const input = {
      ...makeBaseDecision(),
      agentType: "consensus_arbiter",
      agentVotes: [],
      consensusBias: "bearish",
      consensusStrength: 0.3,
      dissent: true,
      dissentingAgents: [...agentTypes],
      recommendation: "strong_sell",
    };
    expect(consensusDecisionSchema.safeParse(input).success).toBe(true);
  });

  it("should reject invalid agent type in votes", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "consensus_arbiter",
      agentVotes: [{ agentType: "unknown_agent", bias: "neutral", confidence: 0.5, weight: 0.5 }],
      consensusBias: "neutral",
      consensusStrength: 0.5,
      dissent: false,
      dissentingAgents: [],
      recommendation: "hold",
    };
    expect(consensusDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject consensusStrength outside [0, 1]", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "consensus_arbiter",
      agentVotes: [],
      consensusBias: "neutral",
      consensusStrength: 1.5,
      dissent: false,
      dissentingAgents: [],
      recommendation: "hold",
    };
    expect(consensusDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should reject invalid recommendation", () => {
    const input = {
      ...makeBaseDecision(),
      agentType: "consensus_arbiter",
      agentVotes: [],
      consensusBias: "neutral",
      consensusStrength: 0.5,
      dissent: false,
      dissentingAgents: [],
      recommendation: "maybe_buy",
    };
    expect(consensusDecisionSchema.safeParse(input).success).toBe(false);
  });

  it("should accept all confidence levels", () => {
    const levels = ["very_low", "low", "medium", "high", "very_high"] as const;
    for (const level of levels) {
      const input = {
        ...makeBaseDecision({ confidenceLevel: level }),
        agentType: "consensus_arbiter",
        agentVotes: [],
        consensusBias: "neutral",
        consensusStrength: 0.5,
        dissent: false,
        dissentingAgents: [],
        recommendation: "hold",
      };
      expect(consensusDecisionSchema.safeParse(input).success).toBe(true);
    }
  });

  it("should reject invalid confidence level", () => {
    const input = {
      ...makeBaseDecision({ confidenceLevel: "moderate" }),
      agentType: "consensus_arbiter",
      agentVotes: [],
      consensusBias: "neutral",
      consensusStrength: 0.5,
      dissent: false,
      dissentingAgents: [],
      recommendation: "hold",
    };
    expect(consensusDecisionSchema.safeParse(input).success).toBe(false);
  });
});

// ============================================================================
// TESTS: Cross-schema edge cases
// ============================================================================

describe("Cross-schema edge cases", () => {
  it("should accept zero confidence across all schemas", () => {
    const base = makeBaseDecision({ confidence: 0 });

    expect(
      sentimentDecisionSchema.safeParse({
        ...base,
        agentType: "sentiment",
        sentimentScore: 0,
        sources: [],
        keyPhrases: [],
      }).success,
    ).toBe(true);

    expect(
      regimeConfirmationDecisionSchema.safeParse({
        ...base,
        agentType: "regime_confirmation",
        confirmedRegime: "unknown",
        regimeConfidence: 0,
        alternativeRegimes: [],
      }).success,
    ).toBe(true);
  });

  it("should accept boundary confidence of exactly 1.0", () => {
    const base = makeBaseDecision({ confidence: 1.0 });
    expect(
      sentimentDecisionSchema.safeParse({
        ...base,
        agentType: "sentiment",
        sentimentScore: 0,
        sources: [],
        keyPhrases: [],
      }).success,
    ).toBe(true);
  });

  it("should reject negative confidence", () => {
    const base = makeBaseDecision({ confidence: -0.1 });
    expect(
      sentimentDecisionSchema.safeParse({
        ...base,
        agentType: "sentiment",
        sentimentScore: 0,
        sources: [],
        keyPhrases: [],
      }).success,
    ).toBe(false);
  });

  it("should accept all bias values across schemas", () => {
    const biases = ["bullish", "bearish", "neutral"] as const;
    for (const bias of biases) {
      const base = makeBaseDecision({ bias });
      expect(
        sentimentDecisionSchema.safeParse({
          ...base,
          agentType: "sentiment",
          sentimentScore: 0,
          sources: [],
          keyPhrases: [],
        }).success,
      ).toBe(true);
    }
  });
});
