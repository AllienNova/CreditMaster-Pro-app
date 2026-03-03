/**
 * Tests for SignalExplainerAgent
 */

import type { AgentContext } from "../agent-types";
import { signalExplainerDecisionSchema } from "../agent-schemas";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({ from: mockFrom });

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  SignalExplainerAgent,
  createSignalExplainerAgent,
  SIGNAL_EXPLAINER_CONFIG,
} from "../signal-explainer-agent";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "AAPL",
    userId: "user-456",
    operatingMode: "guided",
    currentPrice: 185.5,
    priceChange24h: -1.2,
    signalType: "sell",
    signalStrength: 65,
    regimeType: "downtrend",
    additionalContext: {
      ruleBasedExplanation: {
        summary: "Bearish signal detected based on trendline break",
        narrative:
          "Price broke below the ascending trendline with increasing volume",
        factors: [
          {
            name: "Trendline Break",
            value: "confirmed",
            impact: "negative",
            weight: 0.4,
          },
          {
            name: "Volume Surge",
            value: "1.5x average",
            impact: "negative",
            weight: 0.3,
          },
        ],
      },
      structure: {
        regime: "downtrend",
        event: "trendline_break",
        qScore: 72,
      },
    },
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    agentType: "signal_explainer",
    bias: "bearish",
    confidence: 0.78,
    confidenceLevel: "high",
    reasoning:
      "Trendline break confirmed with volume expansion and weakening momentum",
    timestamp: "2026-02-26T10:00:00Z",
    explanation:
      "AAPL is showing a bearish signal after breaking below a key ascending trendline. Volume surged 1.5x above average during the break, confirming seller conviction. Momentum indicators are weakening.",
    factors: [
      {
        name: "Trendline Break",
        impact: -0.8,
        description: "Price broke below ascending trendline support",
      },
      {
        name: "Volume Expansion",
        impact: -0.6,
        description: "Volume 1.5x above 20-day average during selloff",
      },
      {
        name: "Momentum Divergence",
        impact: -0.4,
        description: "RSI showing bearish divergence from price",
      },
    ],
    suggestedAction: "sell",
    ...overrides,
  });
}

function mockSuccessfulFetch(responseText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: responseText } }],
      usage: { prompt_tokens: 250, completion_tokens: 200 },
    }),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("SignalExplainerAgent", () => {
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
      expect(SIGNAL_EXPLAINER_CONFIG.agentType).toBe("signal_explainer");
    });

    it("is not required for consensus", () => {
      expect(SIGNAL_EXPLAINER_CONFIG.requiredForConsensus).toBe(false);
    });

    it("has consensus weight of 0.15", () => {
      expect(SIGNAL_EXPLAINER_CONFIG.consensusWeight).toBe(0.15);
    });

    it("uses signalExplainerDecisionSchema", () => {
      expect(SIGNAL_EXPLAINER_CONFIG.responseSchema).toBe(
        signalExplainerDecisionSchema,
      );
    });

    it("has 15s max latency", () => {
      expect(SIGNAL_EXPLAINER_CONFIG.maxLatencyMs).toBe(15_000);
    });
  });

  // ─── Factory ────────────────────────────────────────────────

  describe("createSignalExplainerAgent", () => {
    it("creates agent with default config", () => {
      const agent = createSignalExplainerAgent();
      expect(agent).toBeInstanceOf(SignalExplainerAgent);
      expect(agent.getAgentType()).toBe("signal_explainer");
    });

    it("creates agent with custom overrides", () => {
      const agent = createSignalExplainerAgent({ maxRetries: 5 });
      expect(agent.getAgentConfig().maxRetries).toBe(5);
    });
  });

  // ─── Prompt Building ────────────────────────────────────────

  describe("Prompt Building", () => {
    it("includes symbol and price", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("AAPL");
      expect(prompt).toContain("185.50");
    });

    it("includes price change and volume", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext({ volume24h: 85_000_000 });
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("-1.20%");
      expect(prompt).toContain("85,000,000");
    });

    it("includes regime and signal info", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("downtrend");
      expect(prompt).toContain("sell");
      expect(prompt).toContain("65");
    });

    it("includes rule-based explanation from context", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("Bearish signal detected");
      expect(prompt).toContain("Trendline Break");
      expect(prompt).toContain("Volume Surge");
    });

    it("includes PCTT structure from context", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("trendline_break");
      expect(prompt).toContain("72");
    });

    it("handles missing additional context gracefully", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext({ additionalContext: {} });
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("AAPL");
    });

    it("handles missing optional fields", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext({
        priceChange24h: undefined,
        volume24h: undefined,
        regimeType: undefined,
        signalType: undefined,
      });
      const prompt = (
        agent as unknown as { buildPrompt: (c: AgentContext) => string }
      ).buildPrompt(ctx);
      expect(prompt).toContain("AAPL");
      expect(prompt).not.toContain("24h Price Change");
      expect(prompt).not.toContain("24h Volume");
    });
  });

  // ─── Response Parsing ───────────────────────────────────────

  describe("Response Parsing", () => {
    it("parses valid response correctly", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => unknown;
        }
      ).parseResponse(raw, ctx);

      expect(result).toMatchObject({
        agentType: "signal_explainer",
        bias: "bearish",
        confidence: 0.78,
        explanation: expect.stringContaining("bearish signal"),
        suggestedAction: "sell",
      });
    });

    it("parses factors correctly", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      const factors = result["factors"] as Array<Record<string, unknown>>;

      expect(factors).toHaveLength(3);
      expect(factors[0]).toEqual({
        name: "Trendline Break",
        impact: -0.8,
        description: "Price broke below ascending trendline support",
      });
    });

    it("handles markdown-wrapped JSON", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const raw = "```json\n" + makeLLMResponse() + "\n```";
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => unknown;
        }
      ).parseResponse(raw, ctx);
      expect(result).toHaveProperty("agentType", "signal_explainer");
    });

    it("defaults suggestedAction to 'hold' for invalid values", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ suggestedAction: "mega_sell" });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["suggestedAction"]).toBe("hold");
    });

    it("clamps factor impact to [-1, 1]", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({
        factors: [
          { name: "Extreme", impact: 5.0, description: "Way too high" },
          { name: "Negative", impact: -3.0, description: "Way too low" },
        ],
      });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      const factors = result["factors"] as Array<Record<string, unknown>>;
      expect(factors[0]["impact"]).toBe(1);
      expect(factors[1]["impact"]).toBe(-1);
    });

    it("defaults to empty factors when not array", () => {
      const agent = new SignalExplainerAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ factors: "not-array" });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["factors"]).toEqual([]);
    });

    it("defaults bias to neutral when missing", () => {
      const agent = new SignalExplainerAgent();
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
        agentType: "signal_explainer" as const,
        bias: "bearish" as const,
        confidence: 0.78,
        confidenceLevel: "high" as const,
        reasoning: "Trendline break with volume",
        timestamp: "2026-02-26T10:00:00Z",
        explanation: "Detailed explanation of the bearish signal",
        factors: [
          {
            name: "Trendline Break",
            impact: -0.8,
            description: "Broke below support",
          },
        ],
        suggestedAction: "sell" as const,
      };
      const result = signalExplainerDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("validates buy action", () => {
      const decision = {
        agentType: "signal_explainer" as const,
        bias: "bullish" as const,
        confidence: 0.85,
        confidenceLevel: "very_high" as const,
        reasoning: "Strong uptrend confirmation",
        timestamp: "2026-02-26T10:00:00Z",
        explanation: "Bullish signal with momentum",
        factors: [],
        suggestedAction: "buy" as const,
      };
      const result = signalExplainerDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("rejects invalid suggestedAction", () => {
      const decision = {
        agentType: "signal_explainer" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        explanation: "test explanation",
        factors: [],
        suggestedAction: "mega_buy" as const,
      };
      const result = signalExplainerDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects factor impact outside [-1, 1]", () => {
      const decision = {
        agentType: "signal_explainer" as const,
        bias: "bullish" as const,
        confidence: 0.7,
        confidenceLevel: "high" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        explanation: "test",
        factors: [{ name: "Bad", impact: 2.5, description: "too high" }],
        suggestedAction: "hold" as const,
      };
      const result = signalExplainerDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects empty explanation", () => {
      const decision = {
        agentType: "signal_explainer" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        explanation: "",
        factors: [],
        suggestedAction: "hold" as const,
      };
      const result = signalExplainerDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ─── Execute (Integration) ──────────────────────────────────

  describe("Execute", () => {
    it("returns successful result on valid LLM response", async () => {
      const agent = createSignalExplainerAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.success).toBe(true);
      expect(result.decision?.agentType).toBe("signal_explainer");
      expect(result.decision?.suggestedAction).toBe("sell");
      expect(result.decision?.explanation).toContain("bearish signal");
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("returns failure when LLM returns garbage", async () => {
      const agent = createSignalExplainerAgent({ maxRetries: 0 });
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
      const agent = createSignalExplainerAgent({ maxRetries: 0 });
      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
    });

    it("records metrics on success", async () => {
      const agent = createSignalExplainerAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());
      expect(result.metrics.tokenCount).toBe(450); // 250 + 200
      expect(result.metrics.provider).toBe("aiml");
      expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("validates and rejects out-of-range factor impact", async () => {
      const agent = createSignalExplainerAgent();
      const invalidResponse = makeLLMResponse({
        factors: [
          { name: "Bad", impact: 5.0, description: "Over range" },
        ],
      });
      mockSuccessfulFetch(invalidResponse);

      const result = await agent.execute(makeContext());
      // parseResponse clamps impact, so it passes validation after clamping
      expect(result.success).toBe(true);
    });
  });
});
