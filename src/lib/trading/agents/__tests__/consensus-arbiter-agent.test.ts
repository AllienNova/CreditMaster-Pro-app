/**
 * Tests for ConsensusArbiterAgent
 */

import type { AgentContext, AgentType, BaseAgentDecision } from "../agent-types";
import { consensusDecisionSchema } from "../agent-schemas";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({ from: mockFrom });

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  ConsensusArbiterAgent,
  createConsensusArbiterAgent,
  buildAgentVotes,
  CONSENSUS_ARBITER_CONFIG,
} from "../consensus-arbiter-agent";

// ============================================================================
// HELPERS
// ============================================================================

function makeContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "NVDA",
    userId: "user-321",
    operatingMode: "autonomous",
    currentPrice: 890.0,
    priceChange24h: 5.2,
    signalType: "buy",
    signalStrength: 82,
    additionalContext: {
      agentVotes: [
        { agentType: "sentiment", bias: "bullish", confidence: 0.78, weight: 0.2 },
        { agentType: "regime_confirmation", bias: "bullish", confidence: 0.85, weight: 0.2 },
        { agentType: "earnings_analysis", bias: "bullish", confidence: 0.82, weight: 0.15 },
      ],
      agentReasonings: {
        sentiment: "Strong positive market sentiment",
        regime_confirmation: "Confirmed uptrend",
        earnings_analysis: "Recent earnings beat expectations",
      },
    },
    ...overrides,
  };
}

function makeLLMResponse(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    agentType: "consensus_arbiter",
    bias: "bullish",
    confidence: 0.83,
    confidenceLevel: "very_high",
    reasoning: "Strong consensus among all agents with bullish bias",
    timestamp: "2026-02-26T10:00:00Z",
    agentVotes: [
      { agentType: "sentiment", bias: "bullish", confidence: 0.78, weight: 0.2 },
      { agentType: "regime_confirmation", bias: "bullish", confidence: 0.85, weight: 0.2 },
      { agentType: "earnings_analysis", bias: "bullish", confidence: 0.82, weight: 0.15 },
    ],
    consensusBias: "bullish",
    consensusStrength: 0.88,
    dissent: false,
    dissentingAgents: [],
    recommendation: "buy",
    ...overrides,
  });
}

function mockSuccessfulFetch(responseText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: responseText } }],
      usage: { prompt_tokens: 300, completion_tokens: 200 },
    }),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("ConsensusArbiterAgent", () => {
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
      expect(CONSENSUS_ARBITER_CONFIG.agentType).toBe("consensus_arbiter");
    });

    it("is not required for consensus (it IS the consensus)", () => {
      expect(CONSENSUS_ARBITER_CONFIG.requiredForConsensus).toBe(false);
    });

    it("has zero consensus weight (doesn't vote for itself)", () => {
      expect(CONSENSUS_ARBITER_CONFIG.consensusWeight).toBe(0);
    });

    it("uses consensusDecisionSchema", () => {
      expect(CONSENSUS_ARBITER_CONFIG.responseSchema).toBe(
        consensusDecisionSchema,
      );
    });

    it("has higher timeout than other agents", () => {
      expect(CONSENSUS_ARBITER_CONFIG.maxLatencyMs).toBe(20_000);
    });
  });

  // ─── Factory ────────────────────────────────────────────────

  describe("createConsensusArbiterAgent", () => {
    it("creates agent with default config", () => {
      const agent = createConsensusArbiterAgent();
      expect(agent).toBeInstanceOf(ConsensusArbiterAgent);
      expect(agent.getAgentType()).toBe("consensus_arbiter");
    });

    it("creates agent with custom overrides", () => {
      const agent = createConsensusArbiterAgent({ maxRetries: 3 });
      expect(agent.getAgentConfig().maxRetries).toBe(3);
    });
  });

  // ─── buildAgentVotes utility ─────────────────────────────────

  describe("buildAgentVotes", () => {
    it("builds votes from agent results map", () => {
      const map = new Map<AgentType, { decision: BaseAgentDecision; weight: number }>();
      map.set("sentiment", {
        decision: {
          agentType: "sentiment",
          bias: "bullish",
          confidence: 0.8,
          confidenceLevel: "very_high",
          reasoning: "Positive",
          timestamp: "2026-02-26T10:00:00Z",
        },
        weight: 0.2,
      });
      map.set("regime_confirmation", {
        decision: {
          agentType: "regime_confirmation",
          bias: "neutral",
          confidence: 0.5,
          confidenceLevel: "medium",
          reasoning: "Unclear",
          timestamp: "2026-02-26T10:00:00Z",
        },
        weight: 0.2,
      });

      const votes = buildAgentVotes(map);
      expect(votes).toHaveLength(2);
      expect(votes[0]).toEqual({
        agentType: "sentiment",
        bias: "bullish",
        confidence: 0.8,
        weight: 0.2,
      });
      expect(votes[1]).toEqual({
        agentType: "regime_confirmation",
        bias: "neutral",
        confidence: 0.5,
        weight: 0.2,
      });
    });

    it("returns empty array for empty map", () => {
      const votes = buildAgentVotes(new Map());
      expect(votes).toEqual([]);
    });
  });

  // ─── Prompt Building ────────────────────────────────────────

  describe("Prompt Building", () => {
    it("includes symbol, price, and operating mode", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("NVDA");
      expect(prompt).toContain("890.00");
      expect(prompt).toContain("autonomous");
    });

    it("includes agent votes from context", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("sentiment: bias=bullish");
      expect(prompt).toContain("regime_confirmation: bias=bullish");
      expect(prompt).toContain("earnings_analysis: bias=bullish");
    });

    it("includes agent reasonings", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("Strong positive market sentiment");
      expect(prompt).toContain("Confirmed uptrend");
    });

    it("handles missing agent votes gracefully", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext({ additionalContext: {} });
      const prompt = (agent as unknown as { buildPrompt: (c: AgentContext) => string }).buildPrompt(ctx);
      expect(prompt).toContain("NVDA");
      // Should not throw even without votes
    });
  });

  // ─── Response Parsing ───────────────────────────────────────

  describe("Response Parsing", () => {
    it("parses valid response correctly", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse();
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);

      expect(result).toMatchObject({
        agentType: "consensus_arbiter",
        consensusBias: "bullish",
        consensusStrength: 0.88,
        dissent: false,
        dissentingAgents: [],
        recommendation: "buy",
      });
    });

    it("handles markdown-wrapped JSON", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const raw = "```json\n" + makeLLMResponse() + "\n```";
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => unknown }).parseResponse(raw, ctx);
      expect(result).toHaveProperty("agentType", "consensus_arbiter");
    });

    it("defaults recommendation to 'hold' for invalid values", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ recommendation: "mega_buy" });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["recommendation"]).toBe("hold");
    });

    it("filters invalid dissenting agent types", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({
        dissent: true,
        dissentingAgents: ["sentiment", "invalid_agent", "earnings_analysis"],
      });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["dissentingAgents"]).toEqual([
        "sentiment",
        "earnings_analysis",
      ]);
    });

    it("extracts votes from context when LLM omits agentVotes", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ agentVotes: "not-array" });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      const votes = result["agentVotes"] as Array<Record<string, unknown>>;
      expect(votes).toHaveLength(3);
      expect(votes[0]["agentType"]).toBe("sentiment");
    });

    it("defaults consensusBias to neutral", () => {
      const agent = new ConsensusArbiterAgent();
      const ctx = makeContext();
      const raw = makeLLMResponse({ consensusBias: undefined });
      const result = (agent as unknown as { parseResponse: (r: string, c: AgentContext) => Record<string, unknown> }).parseResponse(raw, ctx);
      expect(result["consensusBias"]).toBe("neutral");
    });
  });

  // ─── Schema Validation ──────────────────────────────────────

  describe("Schema Validation", () => {
    it("validates a correct decision with dissent", () => {
      const decision = {
        agentType: "consensus_arbiter" as const,
        bias: "bullish" as const,
        confidence: 0.7,
        confidenceLevel: "high" as const,
        reasoning: "Majority bullish with minor dissent",
        timestamp: "2026-02-26T10:00:00Z",
        agentVotes: [
          { agentType: "sentiment" as const, bias: "bullish" as const, confidence: 0.8, weight: 0.2 },
          { agentType: "earnings_analysis" as const, bias: "bearish" as const, confidence: 0.6, weight: 0.15 },
        ],
        consensusBias: "bullish" as const,
        consensusStrength: 0.65,
        dissent: true,
        dissentingAgents: ["earnings_analysis" as const],
        recommendation: "buy" as const,
      };
      const result = consensusDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("validates strong_sell recommendation", () => {
      const decision = {
        agentType: "consensus_arbiter" as const,
        bias: "bearish" as const,
        confidence: 0.9,
        confidenceLevel: "very_high" as const,
        reasoning: "Unanimous bearish consensus",
        timestamp: "2026-02-26T10:00:00Z",
        agentVotes: [],
        consensusBias: "bearish" as const,
        consensusStrength: 0.95,
        dissent: false,
        dissentingAgents: [],
        recommendation: "strong_sell" as const,
      };
      const result = consensusDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it("rejects invalid recommendation", () => {
      const decision = {
        agentType: "consensus_arbiter" as const,
        bias: "bullish" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        agentVotes: [],
        consensusBias: "neutral" as const,
        consensusStrength: 0.5,
        dissent: false,
        dissentingAgents: [],
        recommendation: "ultra_buy" as const,
      };
      const result = consensusDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it("rejects consensusStrength outside 0-1 range", () => {
      const decision = {
        agentType: "consensus_arbiter" as const,
        bias: "neutral" as const,
        confidence: 0.5,
        confidenceLevel: "medium" as const,
        reasoning: "test",
        timestamp: "2026-02-26T10:00:00Z",
        agentVotes: [],
        consensusBias: "neutral" as const,
        consensusStrength: 1.5,
        dissent: false,
        dissentingAgents: [],
        recommendation: "hold" as const,
      };
      const result = consensusDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ─── Execute (Integration) ──────────────────────────────────

  describe("Execute", () => {
    it("returns successful result on valid LLM response", async () => {
      const agent = createConsensusArbiterAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());

      expect(result.success).toBe(true);
      expect(result.decision?.agentType).toBe("consensus_arbiter");
      expect(result.decision?.recommendation).toBe("buy");
      expect(result.decision?.consensusBias).toBe("bullish");
      expect(result.metrics.validationPassed).toBe(true);
    });

    it("returns failure when LLM returns garbage", async () => {
      const agent = createConsensusArbiterAgent({ maxRetries: 0 });
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
      const agent = createConsensusArbiterAgent({ maxRetries: 0 });
      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
    });

    it("records metrics on success", async () => {
      const agent = createConsensusArbiterAgent();
      mockSuccessfulFetch(makeLLMResponse());

      const result = await agent.execute(makeContext());
      expect(result.metrics.tokenCount).toBe(500); // 300 + 200
      expect(result.metrics.provider).toBe("aiml");
      expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("validates and rejects out-of-range consensus strength", async () => {
      const agent = createConsensusArbiterAgent();
      mockSuccessfulFetch(makeLLMResponse({ consensusStrength: 2.0 }));

      const result = await agent.execute(makeContext());
      expect(result.success).toBe(false);
      expect(result.metrics.validationPassed).toBe(false);
    });
  });
});
