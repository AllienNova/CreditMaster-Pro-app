/**
 * Tests for RegimeConfirmationAgent
 */

import type { AgentContext } from "../agent-types";
import { regimeConfirmationDecisionSchema } from "../agent-schemas";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({ from: mockFrom });

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  RegimeConfirmationAgent,
  createRegimeConfirmationAgent,
  REGIME_CONFIRMATION_AGENT_CONFIG,
} from "../regime-confirmation-agent";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "TSLA",
    userId: "user-456",
    operatingMode: "watch",
    currentPrice: 245.0,
    priceChange24h: -1.5,
    volume24h: 80_000_000,
    regimeType: "trending_up",
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    agentType: "regime_confirmation",
    bias: "bullish",
    confidence: 0.82,
    confidenceLevel: "very_high",
    reasoning: "Price action confirms uptrend with higher highs and higher lows",
    timestamp: "2026-02-26T10:00:00Z",
    confirmedRegime: "trending_up",
    regimeConfidence: 0.85,
    alternativeRegimes: [
      { regime: "breakout", probability: 0.1 },
      { regime: "ranging", probability: 0.05 },
    ],
    ...overrides,
  });
}

function mockSuccessfulFetch(responseText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: responseText } }],
      usage: { prompt_tokens: 180, completion_tokens: 120 },
    }),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("RegimeConfirmationAgent", () => {
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
      expect(REGIME_CONFIRMATION_AGENT_CONFIG.agentType).toBe(
        "regime_confirmation",
      );
    });

    it("is required for consensus", () => {
      expect(REGIME_CONFIRMATION_AGENT_CONFIG.requiredForConsensus).toBe(true);
    });

    it("has consensus weight of 0.2", () => {
      expect(REGIME_CONFIRMATION_AGENT_CONFIG.consensusWeight).toBe(0.2);
    });

    it("uses regimeConfirmationDecisionSchema", () => {
      expect(REGIME_CONFIRMATION_AGENT_CONFIG.responseSchema).toBe(
        regimeConfirmationDecisionSchema,
      );
    });
  });

  // ─── Factory ────────────────────────────────────────────────

  describe("createRegimeConfirmationAgent", () => {
    it("creates agent with default config", () => {
      const agent = createRegimeConfirmationAgent();
      expect(agent).toBeInstanceOf(RegimeConfirmationAgent);
      expect(agent.getAgentType()).toBe("regime_confirmation");
    });

    it("creates agent with custom overrides", () => {
      const agent = createRegimeConfirmationAgent({ maxLatencyMs: 30_000 });
      expect(agent.getAgentConfig().maxLatencyMs).toBe(30_000);
    });
  });

  // ─── Prompt Building ────────────────────────────────────────

  describe("Prompt Building", () => {
    it("includes symbol, price, and detected regime", () => {
      const agent = new RegimeConfirmationAgent();
      const ctx = makeContext();
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("TSLA");
      expect(prompt).toContain("245.00");
      expect(prompt).toContain("trending_up");
    });

    it("includes technical indicators from additional context", () => {
      const agent = new RegimeConfirmationAgent();
      const ctx = makeContext({
        additionalContext: {
          indicators: { RSI: 65, MACD: "bullish crossover", ATR: 3.2 },
        },
      });
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("RSI: 65");
      expect(prompt).toContain("MACD: bullish crossover");
      expect(prompt).toContain("ATR: 3.2");
    });

    it("includes recent candles from additional context", () => {
      const agent = new RegimeConfirmationAgent();
      const ctx = makeContext({
        additionalContext: {
          recentCandles: [
            { open: 240, high: 246, low: 239, close: 245 },
            { open: 245, high: 248, low: 244, close: 247 },
          ],
        },
      });
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("O: 240");
      expect(prompt).toContain("C: 247");
    });
  });

  // ─── Response Parsing ───────────────────────────────────────

  describe("Response Parsing", () => {
    it("parses valid response correctly", () => {
      const agent = new RegimeConfirmationAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);

      expect(result).toMatchObject({
        agentType: "regime_confirmation",
        confirmedRegime: "trending_up",
        regimeConfidence: 0.85,
        alternativeRegimes: [
          { regime: "breakout", probability: 0.1 },
          { regime: "ranging", probability: 0.05 },
        ],
      });
    });

    it("handles markdown-wrapped JSON", () => {
      const agent = new RegimeConfirmationAgent();
      const ctx = makeContext();
      const raw = "```json\n" + makeLLMResponse() + "\n```";
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);
      expect(result).toHaveProperty("agentType", "regime_confirmation");
    });

    it("defaults to empty array for alternativeRegimes when not array", () => {
      const agent = new RegimeConfirmationAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ alternativeRegimes: "not-array" });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["alternativeRegimes"]).toEqual([]);
    });

    it("defaults to 'unknown' for missing confirmedRegime", () => {
      const agent = new RegimeConfirmationAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ confirmedRegime: undefined });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["confirmedRegime"]).toBe("unknown");
    });
  });

  // ─── Schema Validation ──────────────────────────────────────

  describe("Schema Validation", () => {
    it("validates a correct decision", () => {
      const decision = {
        agentType: "regime_confirmation" as const,
        bias: "bullish" as const,
        confidence: 0.82,
        confidenceLevel: "very_high" as const,
        reasoning: "Uptrend confirmed",
        timestamp: "2026-02-26T10:00:00Z",
        confirmedRegime: "trending_up",
        regimeConfidence: 0.85,
        alternativeRegimes: [{ regime: "breakout", probability: 0.1 }],
      };
      const result = regimeConfirmationDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("rejects regime confidence outside 0-1 range", () => {
      const decision = {
        agentType: "regime_confirmation" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        confirmedRegime: "ranging",
        regimeConfidence: 1.5,
        alternativeRegimes: [],
      };
      const result = regimeConfirmationDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects empty confirmedRegime", () => {
      const decision = {
        agentType: "regime_confirmation" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        confirmedRegime: "",
        regimeConfidence: 0.5,
        alternativeRegimes: [],
      };
      const result = regimeConfirmationDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ─── Execute (Integration) ──────────────────────────────────

  describe("Execute", () => {
    it("returns successful result on valid LLM response", async () => {
      const agent = createRegimeConfirmationAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.success).toBe(true);
      expect(result.decision?.agentType).toBe("regime_confirmation");
      expect(result.decision?.confirmedRegime).toBe("trending_up");
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("returns failure when API returns error", async () => {
      const agent = createRegimeConfirmationAgent({ maxRetries: 0 });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns failure when API key missing", async () => {
      delete process.env.AIML_API_KEY;
      const agent = createRegimeConfirmationAgent({ maxRetries: 0 });
      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
    });

    it("records metrics correctly", async () => {
      const agent = createRegimeConfirmationAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());
      expect(result.metrics.tokenCount).toBe(300);
      expect(result.metrics.provider).toBe("aiml");
    });
  });
});
