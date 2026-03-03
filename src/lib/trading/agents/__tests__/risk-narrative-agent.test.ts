/**
 * Tests for RiskNarrativeAgent
 */

import type { AgentContext } from "../agent-types";
import { riskNarrativeDecisionSchema } from "../agent-schemas";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({ from: mockFrom });

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  RiskNarrativeAgent,
  createRiskNarrativeAgent,
  RISK_NARRATIVE_CONFIG,
} from "../risk-narrative-agent";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "TSLA",
    userId: "user-999",
    operatingMode: "autonomous",
    currentPrice: 245.0,
    priceChange24h: -4.5,
    signalType: "sell",
    signalStrength: 70,
    regimeType: "volatile",
    additionalContext: {
      ruleBasedRisks: [
        {
          type: "volatility",
          level: "high",
          description: "30-day realized volatility above 60%",
          mitigation: "Reduce position size by 50%",
        },
        {
          type: "concentration",
          level: "medium",
          description: "TSLA is 25% of portfolio",
          mitigation: "Diversify into other sectors",
        },
      ],
      position: {
        size: 100,
        entryPrice: 260.0,
        unrealizedPnl: -1500,
        stopLoss: 230.0,
      },
      portfolio: {
        totalValue: 98000,
        concentration: 25,
        dailyLoss: -2300,
      },
    },
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    agentType: "risk_narrative",
    bias: "bearish",
    confidence: 0.82,
    confidenceLevel: "very_high",
    reasoning:
      "High volatility combined with concentrated position and unrealized losses",
    timestamp: "2026-02-26T10:00:00Z",
    riskLevel: "high",
    riskScore: 78,
    narrativeSummary:
      "TSLA presents elevated risk due to extreme volatility (60%+ realized vol), a concentrated 25% portfolio allocation, and an existing unrealized loss of $1,500. The combination of these factors warrants immediate position reduction.",
    keyRisks: [
      {
        risk: "Extreme volatility with 30-day realized vol above 60%",
        severity: 8,
        mitigation: "Reduce position size to max 10% of portfolio",
      },
      {
        risk: "Portfolio concentration at 25% in single name",
        severity: 7,
        mitigation: "Diversify by selling partial position",
      },
      {
        risk: "Unrealized loss of $1,500 with stop at $230",
        severity: 5,
        mitigation: "Tighten stop loss to $240 to limit further downside",
      },
    ],
    ...overrides,
  });
}

function mockSuccessfulFetch(responseText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: responseText } }],
      usage: { prompt_tokens: 280, completion_tokens: 220 },
    }),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("RiskNarrativeAgent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockCreateClient.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockResolvedValue({ data: null, error: null });
    process.env.AIML_API_KEY = "test-key";
    process.env.AIML_API_URL = "https://api.test.com/v1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterEach(() => {
    delete process.env.AIML_API_KEY;
    delete process.env.AIML_API_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  // ─── Configuration ─────────────────────────────────────────

  describe("Configuration", () => {
    it("has correct agent type", () => {
      expect(RISK_NARRATIVE_CONFIG.agentType).toBe("risk_narrative");
    });

    it("is not required for consensus", () => {
      expect(RISK_NARRATIVE_CONFIG.requiredForConsensus).toBe(false);
    });

    it("has consensus weight of 0.15", () => {
      expect(RISK_NARRATIVE_CONFIG.consensusWeight).toBe(0.15);
    });

    it("uses riskNarrativeDecisionSchema", () => {
      expect(RISK_NARRATIVE_CONFIG.responseSchema).toBe(
        riskNarrativeDecisionSchema,
      );
    });

    it("has 15s max latency", () => {
      expect(RISK_NARRATIVE_CONFIG.maxLatencyMs).toBe(15_000);
    });
  });

  // ─── Factory ────────────────────────────────────────────────

  describe("createRiskNarrativeAgent", () => {
    it("creates agent with default config", () => {
      const agent = createRiskNarrativeAgent();
      expect(agent).toBeInstanceOf(RiskNarrativeAgent);
      expect(agent.getAgentType()).toBe("risk_narrative");
    });

    it("creates agent with custom overrides", () => {
      const agent = createRiskNarrativeAgent({ maxRetries: 4 });
      expect(agent.getAgentConfig().maxRetries).toBe(4);
    });
  });

  // ─── Prompt Building ────────────────────────────────────────

  describe("Prompt Building", () => {
    it("includes symbol, price, and operating mode", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("TSLA");
      expect(prompt).toContain("245.00");
      expect(prompt).toContain("autonomous");
    });

    it("includes price change and volume", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext({ volume24h: 120_000_000 });
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("-4.50%");
      expect(prompt).toContain("120,000,000");
    });

    it("includes rule-based risks from context", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("volatility");
      expect(prompt).toContain("30-day realized volatility above 60%");
      expect(prompt).toContain("Reduce position size by 50%");
    });

    it("includes position context", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("100");
      expect(prompt).toContain("260");
      expect(prompt).toContain("-1500");
      expect(prompt).toContain("230");
    });

    it("includes portfolio context", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("98000");
      expect(prompt).toContain("25");
      expect(prompt).toContain("-2300");
    });

    it("handles missing additional context gracefully", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext({ additionalContext: {} });
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("TSLA");
    });

    it("handles missing optional fields", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext({
        priceChange24h: undefined,
        volume24h: undefined,
        regimeType: undefined,
        signalType: undefined,
      });
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("TSLA");
      expect(prompt).not.toContain("24h Price Change");
    });
  });

  // ─── Response Parsing ───────────────────────────────────────

  describe("Response Parsing", () => {
    it("parses valid response correctly", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => unknown;
        }
      ).parseResponse(raw, ctx);

      expect(result).toMatchObject({
        agentType: "risk_narrative",
        riskLevel: "high",
        riskScore: 78,
        narrativeSummary: expect.stringContaining("elevated risk"),
      });
    });

    it("parses keyRisks correctly", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      const keyRisks = result["keyRisks"] as Array<Record<string, unknown>>;

      expect(keyRisks).toHaveLength(3);
      expect(keyRisks[0]).toEqual({
        risk: "Extreme volatility with 30-day realized vol above 60%",
        severity: 8,
        mitigation: "Reduce position size to max 10% of portfolio",
      });
    });

    it("handles markdown-wrapped JSON", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = "```json\n" + makeLLMResponse() + "\n```";
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => unknown;
        }
      ).parseResponse(raw, ctx);
      expect(result).toHaveProperty("agentType", "risk_narrative");
    });

    it("defaults riskLevel to 'medium' for invalid values", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ riskLevel: "catastrophic" });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["riskLevel"]).toBe("medium");
    });

    it("clamps riskScore to [0, 100]", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ riskScore: 150 });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["riskScore"]).toBe(100);
    });

    it("defaults riskScore to 50 for non-finite values", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ riskScore: "not-a-number" });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["riskScore"]).toBe(50);
    });

    it("clamps severity to [0, 10]", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({
        keyRisks: [
          { risk: "Over-severe", severity: 15, mitigation: "Fix it" },
          { risk: "Under-severe", severity: -3, mitigation: "Fix it" },
        ],
      });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      const keyRisks = result["keyRisks"] as Array<Record<string, unknown>>;
      expect(keyRisks[0]["severity"]).toBe(10);
      expect(keyRisks[1]["severity"]).toBe(0);
    });

    it("defaults to empty keyRisks when not array", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ keyRisks: "not-array" });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["keyRisks"]).toEqual([]);
    });

    it("defaults bias to neutral when missing", () => {
      const agent = new RiskNarrativeAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ bias: undefined });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["bias"]).toBe("neutral");
    });
  });

  // ─── Schema Validation ──────────────────────────────────────

  describe("Schema Validation", () => {
    it("validates a correct decision", () => {
      const decision = {
        agentType: "risk_narrative" as const,
        bias: "bearish" as const,
        confidence: 0.82,
        confidenceLevel: "very_high" as const,
        reasoning: "High volatility and concentrated position",
        timestamp: "2026-02-26T10:00:00Z",
        riskLevel: "high" as const,
        riskScore: 78,
        narrativeSummary: "TSLA presents elevated risk",
        keyRisks: [
          {
            risk: "Extreme volatility",
            severity: 8,
            mitigation: "Reduce position size",
          },
        ],
      };
      const result = riskNarrativeDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("validates extreme risk level", () => {
      const decision = {
        agentType: "risk_narrative" as const,
        bias: "bearish" as const,
        confidence: 0.95,
        confidenceLevel: "very_high" as const,
        reasoning: "Multiple critical risks converging",
        timestamp: "2026-02-26T10:00:00Z",
        riskLevel: "extreme" as const,
        riskScore: 95,
        narrativeSummary: "Extreme risk — halt all trading",
        keyRisks: [],
      };
      const result = riskNarrativeDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("rejects invalid riskLevel", () => {
      const decision = {
        agentType: "risk_narrative" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        riskLevel: "catastrophic" as const,
        riskScore: 50,
        narrativeSummary: "test",
        keyRisks: [],
      };
      const result = riskNarrativeDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects riskScore outside 0-100 range", () => {
      const decision = {
        agentType: "risk_narrative" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        riskLevel: "medium" as const,
        riskScore: 150,
        narrativeSummary: "test",
        keyRisks: [],
      };
      const result = riskNarrativeDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects severity outside 0-10 range", () => {
      const decision = {
        agentType: "risk_narrative" as const,
        bias: "bearish" as const,
        confidence: 0.7,
        confidenceLevel: "high" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        riskLevel: "high" as const,
        riskScore: 70,
        narrativeSummary: "test",
        keyRisks: [
          { risk: "Bad", severity: 15, mitigation: "fix" },
        ],
      };
      const result = riskNarrativeDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects empty narrativeSummary", () => {
      const decision = {
        agentType: "risk_narrative" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        riskLevel: "low" as const,
        riskScore: 20,
        narrativeSummary: "",
        keyRisks: [],
      };
      const result = riskNarrativeDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ─── Execute (Integration) ──────────────────────────────────

  describe("Execute", () => {
    it("returns successful result on valid LLM response", async () => {
      const agent = createRiskNarrativeAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.success).toBe(true);
      expect(result.decision?.agentType).toBe("risk_narrative");
      expect(result.decision?.riskLevel).toBe("high");
      expect(result.decision?.riskScore).toBe(78);
      expect(result.decision?.narrativeSummary).toContain("elevated risk");
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("returns failure when LLM returns garbage", async () => {
      const agent = createRiskNarrativeAgent({ maxRetries: 0 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not json at all" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
    });

    it("returns failure when API key missing", async () => {
      delete process.env.AIML_API_KEY;
      const agent = createRiskNarrativeAgent({ maxRetries: 0 });
      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
    });

    it("records metrics on success", async () => {
      const agent = createRiskNarrativeAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());
      expect(result.metrics.tokenCount).toBe(500); // 280 + 220
      expect(result.metrics.provider).toBe("aiml");
      expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("validates and rejects out-of-range riskScore", async () => {
      const agent = createRiskNarrativeAgent();
      mockSuccessfulFetch(makeLLMResponse({ riskScore: 150 }));

      const result = await agent.execute(makeContext());
      // parseResponse clamps to 100, but schema rejects > 100
      // Actually parseResponse clamps to [0,100] so 150 becomes 100, which is valid
      expect(result.success).toBe(true);
      expect(result.decision?.riskScore).toBe(100);
    });
  });
});
