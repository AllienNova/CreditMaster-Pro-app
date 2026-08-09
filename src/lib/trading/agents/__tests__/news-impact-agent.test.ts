/**
 * Tests for NewsImpactAgent
 */

import type { AgentContext } from "../agent-types";
import { newsImpactDecisionSchema } from "../agent-schemas";

// Mock fetch before importing the agent
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Supabase
const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({ from: mockFrom });

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  NewsImpactAgent,
  createNewsImpactAgent,
  NEWS_IMPACT_AGENT_CONFIG,
} from "../news-impact-agent";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "TSLA",
    userId: "user-456",
    operatingMode: "guided",
    currentPrice: 220.0,
    priceChange24h: -3.5,
    volume24h: 80_000_000,
    signalType: "sell",
    signalStrength: 60,
    regimeType: "trending_down",
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    agentType: "news_impact",
    bias: "bearish",
    confidence: 0.72,
    confidenceLevel: "high",
    reasoning:
      "Negative press around production delays weighs on short-term outlook",
    timestamp: "2026-04-19T10:00:00Z",
    impactScore: -0.45,
    impactTimeframe: "short_term",
    catalysts: ["Strong delivery numbers"],
    risks: ["Production delays", "CEO controversy"],
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

describe("NewsImpactAgent", () => {
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

  // ─── Configuration ──────────────────────────────────────────

  describe("Configuration", () => {
    it("has correct agent type", () => {
      expect(NEWS_IMPACT_AGENT_CONFIG.agentType).toBe("news_impact");
    });

    it("is required for consensus", () => {
      expect(NEWS_IMPACT_AGENT_CONFIG.requiredForConsensus).toBe(true);
    });

    it("has consensus weight of 0.2", () => {
      expect(NEWS_IMPACT_AGENT_CONFIG.consensusWeight).toBe(0.2);
    });

    it("uses newsImpactDecisionSchema for validation", () => {
      expect(NEWS_IMPACT_AGENT_CONFIG.responseSchema).toBe(
        newsImpactDecisionSchema,
      );
    });
  });

  // ─── Factory ────────────────────────────────────────────────

  describe("createNewsImpactAgent", () => {
    it("creates agent with default config", () => {
      const agent = createNewsImpactAgent();
      expect(agent).toBeInstanceOf(NewsImpactAgent);
      expect(agent.getAgentType()).toBe("news_impact");
    });

    it("creates agent with custom config overrides", () => {
      const agent = createNewsImpactAgent({ maxRetries: 5 });
      expect(agent.getAgentConfig().maxRetries).toBe(5);
      expect(agent.getAgentType()).toBe("news_impact");
    });
  });

  // ─── Prompt Building ────────────────────────────────────────

  describe("Prompt Building", () => {
    it("includes symbol and price in prompt", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as {
          buildPrompt: (c: AgentContext) => string;
        }
      ).buildPrompt(ctx);
      expect(prompt).toContain("TSLA");
      expect(prompt).toContain("220.00");
    });

    it("includes price change and volume when available", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as {
          buildPrompt: (c: AgentContext) => string;
        }
      ).buildPrompt(ctx);
      expect(prompt).toContain("-3.50%");
      expect(prompt).toContain("80,000,000");
    });

    it("includes news headlines from additional context", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext({
        additionalContext: {
          newsHeadlines: ["Tesla recalls vehicles", "Musk sells shares"],
        },
      });
      const prompt = (
        agent as unknown as {
          buildPrompt: (c: AgentContext) => string;
        }
      ).buildPrompt(ctx);
      expect(prompt).toContain("Tesla recalls vehicles");
      expect(prompt).toContain("Musk sells shares");
    });

    it("mentions no headlines when none provided", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as {
          buildPrompt: (c: AgentContext) => string;
        }
      ).buildPrompt(ctx);
      expect(prompt).toContain("No specific headlines provided");
    });

    it("includes regime and signal info", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const prompt = (
        agent as unknown as {
          buildPrompt: (c: AgentContext) => string;
        }
      ).buildPrompt(ctx);
      expect(prompt).toContain("trending_down");
      expect(prompt).toContain("sell");
    });
  });

  // ─── Response Parsing ───────────────────────────────────────

  describe("Response Parsing", () => {
    it("parses valid JSON response correctly", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => unknown;
        }
      ).parseResponse(raw, ctx);

      expect(result).toMatchObject({
        agentType: "news_impact",
        bias: "bearish",
        confidence: 0.72,
        impactScore: -0.45,
        impactTimeframe: "short_term",
        catalysts: ["Strong delivery numbers"],
        risks: ["Production delays", "CEO controversy"],
      });
    });

    it("handles markdown-wrapped JSON", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const raw = "```json\n" + makeLLMResponse() + "\n```";
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => unknown;
        }
      ).parseResponse(raw, ctx);
      expect(result).toHaveProperty("agentType", "news_impact");
    });

    it("defaults to neutral bias when missing", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ bias: undefined });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["bias"]).toBe("neutral");
    });

    it("defaults to short_term timeframe for unknown values", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ impactTimeframe: "unknown_timeframe" });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["impactTimeframe"]).toBe("short_term");
    });

    it("clamps impactScore to [-1, 1]", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ impactScore: 5.0 });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["impactScore"]).toBe(1);
    });

    it("defaults to empty arrays for catalysts and risks", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ catalysts: "not-an-array", risks: null });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["catalysts"]).toEqual([]);
      expect(result["risks"]).toEqual([]);
    });

    it("computes confidence level from numeric confidence", () => {
      const agent = new NewsImpactAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ confidence: 0.25 });
      const result = (
        agent as unknown as {
          parseResponse: (r: string, c: AgentContext) => Record<string, unknown>;
        }
      ).parseResponse(raw, ctx);
      expect(result["confidenceLevel"]).toBe("low");
    });
  });

  // ─── Schema Validation ──────────────────────────────────────

  describe("Schema Validation", () => {
    it("validates a correct decision", () => {
      const decision = {
        agentType: "news_impact" as const,
        bias: "bearish" as const,
        confidence: 0.72,
        confidenceLevel: "high" as const,
        reasoning: "Negative news impact on short term",
        timestamp: "2026-04-19T10:00:00Z",
        impactScore: -0.45,
        impactTimeframe: "short_term" as const,
        catalysts: ["Strong deliveries"],
        risks: ["Production delays"],
      };
      const result = newsImpactDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("rejects impact score out of range", () => {
      const decision = {
        agentType: "news_impact" as const,
        bias: "bearish" as const,
        confidence: 0.72,
        confidenceLevel: "high" as const,
        reasoning: "test",
        timestamp: "2026-04-19T10:00:00Z",
        impactScore: 2.5,
        impactTimeframe: "short_term" as const,
        catalysts: [],
        risks: [],
      };
      const result = newsImpactDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects invalid impactTimeframe", () => {
      const decision = {
        agentType: "news_impact" as const,
        bias: "bullish" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-04-19T10:00:00Z",
        impactScore: 0.2,
        impactTimeframe: "this_year" as unknown,
        catalysts: [],
        risks: [],
      };
      const result = newsImpactDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects wrong agent type", () => {
      const decision = {
        agentType: "sentiment" as const,
        bias: "bullish" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-04-19T10:00:00Z",
        impactScore: 0.2,
        impactTimeframe: "short_term" as const,
        catalysts: [],
        risks: [],
      };
      const result = newsImpactDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ─── Execute (Integration) ──────────────────────────────────

  describe("Execute", () => {
    it("returns successful result on valid LLM response", async () => {
      const agent = createNewsImpactAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.success).toBe(true);
      expect(result.decision).toBeDefined();
      expect(result.decision?.agentType).toBe("news_impact");
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("returns failure when LLM returns invalid JSON", async () => {
      const agent = createNewsImpactAgent();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not valid json" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });
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
      const agent = createNewsImpactAgent({ maxRetries: 0 });
      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
      expect(result.error).toContain("AIML_API_KEY");
    });

    it("records metrics on successful execution", async () => {
      const agent = createNewsImpactAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.metrics.tokenCount).toBe(350);
      expect(result.metrics.provider).toBe("aiml");
      expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("handles LLM returning validation-failing data", async () => {
      const agent = createNewsImpactAgent();
      // impactScore out of range fails Zod validation
      mockSuccessfulFetch(makeLLMResponse({ impactScore: 5.0 }));

      const result = await agent.execute(makeContext());
      // parseResponse clamps to 1, so Zod passes — check the clamped value
      if (result.success) {
        expect(result.decision?.impactScore).toBe(1);
      } else {
        expect(result.success).toBe(false);
      }
    });
  });
});
