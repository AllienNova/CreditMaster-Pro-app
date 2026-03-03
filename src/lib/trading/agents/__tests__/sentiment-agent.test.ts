/**
 * Tests for SentimentAgent
 */

import type { AgentContext } from "../agent-types";
import { sentimentDecisionSchema } from "../agent-schemas";

// Mock fetch before importing the agent
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Supabase — use module-level variables re-established in beforeEach
// (jest.config has resetMocks: true which wipes inline factory mocks)
const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({ from: mockFrom });

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  SentimentAgent,
  createSentimentAgent,
  SENTIMENT_AGENT_CONFIG,
} from "../sentiment-agent";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "AAPL",
    userId: "user-123",
    operatingMode: "guided",
    currentPrice: 185.5,
    priceChange24h: 2.3,
    volume24h: 54_000_000,
    signalType: "buy",
    signalStrength: 75,
    regimeType: "trending_up",
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    agentType: "sentiment",
    bias: "bullish",
    confidence: 0.78,
    confidenceLevel: "high",
    reasoning: "Strong positive sentiment driven by iPhone sales data",
    timestamp: "2026-02-26T10:00:00Z",
    sentimentScore: 0.65,
    sources: ["Reuters", "Bloomberg", "Twitter/X"],
    keyPhrases: ["record sales", "strong guidance", "AI investment"],
    ...overrides,
  });
}

function mockSuccessfulFetch(responseText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: responseText } }],
      usage: { prompt_tokens: 200, completion_tokens: 150 },
    }),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("SentimentAgent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    // Re-establish Supabase mock chain (resetMocks wipes implementations)
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
      expect(SENTIMENT_AGENT_CONFIG.agentType).toBe("sentiment");
    });

    it("is required for consensus", () => {
      expect(SENTIMENT_AGENT_CONFIG.requiredForConsensus).toBe(true);
    });

    it("has consensus weight of 0.2", () => {
      expect(SENTIMENT_AGENT_CONFIG.consensusWeight).toBe(0.2);
    });

    it("uses sentimentDecisionSchema for validation", () => {
      expect(SENTIMENT_AGENT_CONFIG.responseSchema).toBe(
        sentimentDecisionSchema,
      );
    });
  });

  // ─── Factory ────────────────────────────────────────────────

  describe("createSentimentAgent", () => {
    it("creates agent with default config", () => {
      const agent = createSentimentAgent();
      expect(agent).toBeInstanceOf(SentimentAgent);
      expect(agent.getAgentType()).toBe("sentiment");
    });

    it("creates agent with custom config overrides", () => {
      const agent = createSentimentAgent({ maxRetries: 5 });
      expect(agent.getAgentConfig().maxRetries).toBe(5);
      expect(agent.getAgentType()).toBe("sentiment");
    });
  });

  // ─── Prompt Building ────────────────────────────────────────

  describe("Prompt Building", () => {
    it("includes symbol and price in prompt", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      // Access protected method via any for testing
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("AAPL");
      expect(prompt).toContain("185.50");
    });

    it("includes price change and volume when available", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("+2.30%");
      expect(prompt).toContain("54,000,000");
    });

    it("includes news headlines from additional context", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext({
        additionalContext: {
          newsHeadlines: ["Apple beats earnings", "iPhone sales surge"],
        },
      });
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("Apple beats earnings");
      expect(prompt).toContain("iPhone sales surge");
    });

    it("includes regime and signal info", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("trending_up");
      expect(prompt).toContain("buy");
    });
  });

  // ─── Response Parsing ───────────────────────────────────────

  describe("Response Parsing", () => {
    it("parses valid JSON response correctly", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);

      expect(result).toMatchObject({
        agentType: "sentiment",
        bias: "bullish",
        confidence: 0.78,
        confidenceLevel: "high",
        sentimentScore: 0.65,
        sources: ["Reuters", "Bloomberg", "Twitter/X"],
        keyPhrases: ["record sales", "strong guidance", "AI investment"],
      });
    });

    it("handles markdown-wrapped JSON", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      const raw = "```json\n" + makeLLMResponse() + "\n```";
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);
      expect(result).toHaveProperty("agentType", "sentiment");
    });

    it("defaults to neutral bias when missing", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ bias: undefined });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["bias"]).toBe("neutral");
    });

    it("defaults to empty arrays for sources and keyPhrases", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ sources: "not-an-array", keyPhrases: null });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["sources"]).toEqual([]);
      expect(result["keyPhrases"]).toEqual([]);
    });

    it("computes confidence level from numeric confidence", () => {
      const agent = new SentimentAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ confidence: 0.35 });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["confidenceLevel"]).toBe("low");
    });
  });

  // ─── Schema Validation ──────────────────────────────────────

  describe("Schema Validation", () => {
    it("validates a correct decision", () => {
      const decision = {
        agentType: "sentiment" as const,
        bias: "bullish" as const,
        confidence: 0.78,
        confidenceLevel: "high" as const,
        reasoning: "Strong positive sentiment",
        timestamp: "2026-02-26T10:00:00Z",
        sentimentScore: 0.65,
        sources: ["Reuters"],
        keyPhrases: ["strong guidance"],
      };
      const result = sentimentDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("rejects invalid sentiment score range", () => {
      const decision = {
        agentType: "sentiment" as const,
        bias: "bullish" as const,
        confidence: 0.78,
        confidenceLevel: "high" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        sentimentScore: 2.5,
        sources: [],
        keyPhrases: [],
      };
      const result = sentimentDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects wrong agent type", () => {
      const decision = {
        agentType: "earnings_analysis" as const,
        bias: "bullish" as const,
        confidence: 0.78,
        confidenceLevel: "high" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        sentimentScore: 0.5,
        sources: [],
        keyPhrases: [],
      };
      const result = sentimentDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ─── Execute (Integration) ──────────────────────────────────

  describe("Execute", () => {
    it("returns successful result on valid LLM response", async () => {
      const agent = createSentimentAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.success).toBe(true);
      expect(result.decision).toBeDefined();
      expect(result.decision?.agentType).toBe("sentiment");
      expect(result.decision?.sentimentScore).toBe(0.65);
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("returns failure when LLM returns invalid JSON", async () => {
      const agent = createSentimentAgent();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not valid json" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });
      // Retry attempts
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "still not json" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns failure when API key is missing", async () => {
      delete process.env.AIML_API_KEY;
      const agent = createSentimentAgent({ maxRetries: 0 });
      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
      expect(result.error).toContain("AIML_API_KEY");
    });

    it("returns failure when circuit breaker is open", async () => {
      const agent = createSentimentAgent();
      // Trigger failures to open circuit breaker
      for (let i = 0; i < 3; i++) {
        mockFetch.mockRejectedValueOnce(new Error("API down"));
        mockFetch.mockRejectedValueOnce(new Error("API down")); // retries
        mockFetch.mockRejectedValueOnce(new Error("API down"));
        await agent.execute(makeContext());
      }

      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
      expect(result.error).toContain("Circuit breaker open");
    });

    it("records metrics on successful execution", async () => {
      const agent = createSentimentAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.metrics.tokenCount).toBe(350);
      expect(result.metrics.provider).toBe("aiml");
      expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("handles LLM returning validation-failing data", async () => {
      const agent = createSentimentAgent();
      // sentimentScore out of range will fail Zod validation
      mockSuccessfulFetch(
        makeLLMResponse({ sentimentScore: 5.0 }),
      );

      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
      expect(result.metrics.validationPassed).toBe(false);
    });
  });
});
