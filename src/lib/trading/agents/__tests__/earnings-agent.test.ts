/**
 * Tests for EarningsAgent
 */

import type { AgentContext } from "../agent-types";
import { earningsDecisionSchema } from "../agent-schemas";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({ from: mockFrom });

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  EarningsAgent,
  createEarningsAgent,
  EARNINGS_AGENT_CONFIG,
} from "../earnings-agent";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "MSFT",
    userId: "user-789",
    operatingMode: "guided",
    currentPrice: 420.0,
    priceChange24h: 3.8,
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    agentType: "earnings_analysis",
    bias: "bullish",
    confidence: 0.85,
    confidenceLevel: "very_high",
    reasoning: "Strong earnings beat with raised guidance and cloud growth",
    timestamp: "2026-02-26T10:00:00Z",
    earningsSurprise: 8.2,
    revenueGrowth: 12.5,
    guidanceDirection: "raised",
    keyMetrics: [
      { metric: "EPS", value: "$3.22", vsExpected: "beat" },
      { metric: "Revenue", value: "$65.6B", vsExpected: "beat" },
      { metric: "Cloud Revenue", value: "$35.1B", vsExpected: "beat" },
    ],
    ...overrides,
  });
}

function mockSuccessfulFetch(responseText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: responseText } }],
      usage: { prompt_tokens: 220, completion_tokens: 180 },
    }),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("EarningsAgent", () => {
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
      expect(EARNINGS_AGENT_CONFIG.agentType).toBe("earnings_analysis");
    });

    it("is not required for consensus", () => {
      expect(EARNINGS_AGENT_CONFIG.requiredForConsensus).toBe(false);
    });

    it("has consensus weight of 0.15", () => {
      expect(EARNINGS_AGENT_CONFIG.consensusWeight).toBe(0.15);
    });

    it("uses earningsDecisionSchema", () => {
      expect(EARNINGS_AGENT_CONFIG.responseSchema).toBe(
        earningsDecisionSchema,
      );
    });
  });

  // ─── Factory ────────────────────────────────────────────────

  describe("createEarningsAgent", () => {
    it("creates agent with default config", () => {
      const agent = createEarningsAgent();
      expect(agent).toBeInstanceOf(EarningsAgent);
      expect(agent.getAgentType()).toBe("earnings_analysis");
    });

    it("creates agent with custom overrides", () => {
      const agent = createEarningsAgent({ maxRetries: 4 });
      expect(agent.getAgentConfig().maxRetries).toBe(4);
    });
  });

  // ─── Prompt Building ────────────────────────────────────────

  describe("Prompt Building", () => {
    it("includes symbol and price", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext();
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("MSFT");
      expect(prompt).toContain("420.00");
    });

    it("includes earnings data from additional context", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext({
        additionalContext: {
          earningsData: {
            reportDate: "2026-01-28",
            epsActual: 3.22,
            epsEstimate: 2.98,
            revenueActual: "65.6B",
            guidance: "raised FY2026",
          },
        },
      });
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("2026-01-28");
      expect(prompt).toContain("3.22");
      expect(prompt).toContain("2.98");
      expect(prompt).toContain("raised FY2026");
    });

    it("includes prior quarters from additional context", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext({
        additionalContext: {
          priorQuarters: [
            { quarter: "Q3 2025", eps: "$2.95", revenue: "$62.0B" },
            { quarter: "Q2 2025", eps: "$2.79", revenue: "$59.1B" },
          ],
        },
      });
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("Q3 2025");
      expect(prompt).toContain("Q2 2025");
    });
  });

  // ─── Response Parsing ───────────────────────────────────────

  describe("Response Parsing", () => {
    it("parses valid response correctly", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);

      expect(result).toMatchObject({
        agentType: "earnings_analysis",
        earningsSurprise: 8.2,
        revenueGrowth: 12.5,
        guidanceDirection: "raised",
        keyMetrics: [
          { metric: "EPS", value: "$3.22", vsExpected: "beat" },
          { metric: "Revenue", value: "$65.6B", vsExpected: "beat" },
          { metric: "Cloud Revenue", value: "$35.1B", vsExpected: "beat" },
        ],
      });
    });

    it("handles null earningsSurprise and revenueGrowth", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({
        earningsSurprise: null,
        revenueGrowth: null,
      });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["earningsSurprise"]).toBeNull();
      expect(result["revenueGrowth"]).toBeNull();
    });

    it("defaults guidanceDirection to 'none' for invalid values", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ guidanceDirection: "something_weird" });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["guidanceDirection"]).toBe("none");
    });

    it("defaults to empty keyMetrics array when not array", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ keyMetrics: "not-array" });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["keyMetrics"]).toEqual([]);
    });

    it("handles markdown-wrapped JSON", () => {
      const agent = new EarningsAgent();
      const ctx = makeContext();
      const raw = "```json\n" + makeLLMResponse() + "\n```";
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);
      expect(result).toHaveProperty("agentType", "earnings_analysis");
    });
  });

  // ─── Schema Validation ──────────────────────────────────────

  describe("Schema Validation", () => {
    it("validates a correct decision", () => {
      const decision = {
        agentType: "earnings_analysis" as const,
        bias: "bullish" as const,
        confidence: 0.85,
        confidenceLevel: "very_high" as const,
        reasoning: "Strong beat",
        timestamp: "2026-02-26T10:00:00Z",
        earningsSurprise: 8.2,
        revenueGrowth: 12.5,
        guidanceDirection: "raised" as const,
        keyMetrics: [{ metric: "EPS", value: "$3.22", vsExpected: "beat" }],
      };
      const result = earningsDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("allows null earningsSurprise and revenueGrowth", () => {
      const decision = {
        agentType: "earnings_analysis" as const,
        bias: "neutral" as const,
        confidence: 0.3,
        confidenceLevel: "low" as const,
        reasoning: "No earnings data available",
        timestamp: "2026-02-26T10:00:00Z",
        earningsSurprise: null,
        revenueGrowth: null,
        guidanceDirection: "none" as const,
        keyMetrics: [],
      };
      const result = earningsDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("rejects invalid guidanceDirection", () => {
      const decision = {
        agentType: "earnings_analysis" as const,
        bias: "bullish" as const,
        confidence: 0.7,
        confidenceLevel: "high" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        earningsSurprise: 5,
        revenueGrowth: 10,
        guidanceDirection: "improved" as const,
        keyMetrics: [],
      };
      const result = earningsDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ─── Execute (Integration) ──────────────────────────────────

  describe("Execute", () => {
    it("returns successful result on valid LLM response", async () => {
      const agent = createEarningsAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.success).toBe(true);
      expect(result.decision?.agentType).toBe("earnings_analysis");
      expect(result.decision?.earningsSurprise).toBe(8.2);
      expect(result.decision?.guidanceDirection).toBe("raised");
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("returns failure when LLM response is invalid", async () => {
      const agent = createEarningsAgent({ maxRetries: 0 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{broken" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
    });

    it("returns failure when API key missing", async () => {
      delete process.env.AIML_API_KEY;
      const agent = createEarningsAgent({ maxRetries: 0 });
      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
    });

    it("records correct token count", async () => {
      const agent = createEarningsAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());
      expect(result.metrics.tokenCount).toBe(400); // 220 + 180
    });
  });
});
