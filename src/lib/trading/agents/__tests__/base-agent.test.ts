/**
 * Tests for TradingAgent base class and agent-types utilities.
 *
 * Uses a concrete TestAgent subclass to exercise the abstract base.
 * Mocks: global.fetch (LLM calls), @supabase/supabase-js (DB logging),
 *        process.env (API keys).
 */

import { z } from "zod";
import { TradingAgent } from "../base-agent";
import type {
  AgentConfig,
  AgentContext,
  AgentCircuitBreakerConfig,
  BaseAgentDecision,
  AgentResult,
} from "../agent-types";
import {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  getConfidenceLevel,
  CONFIDENCE_THRESHOLDS,
} from "../agent-types";

// ============================================================================
// TEST AGENT — concrete subclass for testing
// ============================================================================

const testDecisionSchema = z.object({
  agentType: z.literal("sentiment"),
  bias: z.enum(["bullish", "bearish", "neutral"]),
  confidence: z.number().min(0).max(1),
  confidenceLevel: z.enum(["very_low", "low", "medium", "high", "very_high"]),
  reasoning: z.string(),
  timestamp: z.string(),
  testField: z.string(),
});

interface TestDecision extends BaseAgentDecision {
  agentType: "sentiment";
  testField: string;
}

const DEFAULT_TEST_CONFIG: AgentConfig = {
  agentType: "sentiment",
  name: "Test Agent",
  description: "A test agent for unit testing",
  defaultModel: "gpt-4o-mini",
  defaultProvider: "aiml",
  maxLatencyMs: 5000,
  maxRetries: 2,
  requiredForConsensus: true,
  consensusWeight: 0.5,
  responseSchema: testDecisionSchema,
};

class TestAgent extends TradingAgent<TestDecision> {
  public buildPromptCalls: AgentContext[] = [];
  public parseResponseCalls: Array<{ raw: string; context: AgentContext }> = [];
  public customParseResponse: ((raw: string, context: AgentContext) => TestDecision) | null = null;

  protected buildPrompt(context: AgentContext): string {
    this.buildPromptCalls.push(context);
    return `Analyze ${context.symbol} at $${context.currentPrice}`;
  }

  protected parseResponse(raw: string, context: AgentContext): TestDecision {
    this.parseResponseCalls.push({ raw, context });
    if (this.customParseResponse) {
      return this.customParseResponse(raw, context);
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      agentType: "sentiment",
      bias: (parsed.bias as TestDecision["bias"]) || "neutral",
      confidence: (parsed.confidence as number) || 0.7,
      confidenceLevel: getConfidenceLevel(
        (parsed.confidence as number) || 0.7,
      ),
      reasoning: (parsed.reasoning as string) || "Test reasoning",
      timestamp: new Date().toISOString(),
      testField: (parsed.testField as string) || "test-value",
    };
  }
}

// ============================================================================
// MOCKS
// ============================================================================

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
const mockCreateClient = jest.fn().mockReturnValue({
  from: mockFrom,
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Flush all pending microtasks (resolved promises) so fire-and-forget logging completes.
 * Temporarily switches to real timers to ensure microtasks run, then restores fake timers.
 */
async function flushPromises(): Promise<void> {
  // Switch to real timers so microtask queue flushes normally
  jest.useRealTimers();
  // Multiple rounds + small real delay to ensure nested promise chains resolve
  await new Promise((resolve) => setTimeout(resolve, 10));
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  // Restore fake timers
  jest.useFakeTimers({ advanceTimers: true });
}

function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    symbol: "AAPL",
    userId: "user-123",
    operatingMode: "watch",
    currentPrice: 175.5,
    ...overrides,
  };
}

function mockFetchSuccess(
  body: Record<string, unknown> = {},
  tokenCount = 150,
): void {
  const responseBody = {
    bias: "bullish",
    confidence: 0.75,
    reasoning: "Strong momentum",
    testField: "test-value",
    ...body,
  };

  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(responseBody) } }],
      usage: { prompt_tokens: 100, completion_tokens: tokenCount - 100 },
    }),
  });
}

function mockFetchFailure(status = 500, statusText = "Internal Server Error"): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
  });
}

function mockFetchReject(error: Error): void {
  (global.fetch as jest.Mock).mockRejectedValueOnce(error);
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("TradingAgent Base Class", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.AIML_API_KEY = "test-api-key";
    process.env.AIML_API_URL = "https://test-api.example.com/v1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    mockCreateClient.mockClear();
    mockCreateClient.mockReturnValue({ from: mockFrom });
    mockFrom.mockClear();
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockClear();
    mockInsert.mockResolvedValue({ data: null, error: null });
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.useRealTimers();
  });

  // ──────────────────────────────────────────────────────────────
  // 1. Constructor & Config
  // ──────────────────────────────────────────────────────────────

  describe("Constructor & Config", () => {
    it("creates agent with provided config", () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      expect(agent.getAgentConfig()).toEqual(DEFAULT_TEST_CONFIG);
    });

    it("uses default circuit breaker config when none provided", () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      const state = agent.getCircuitBreakerState();
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
      expect(state.lastFailureTime).toBeNull();
      expect(state.lastSuccessTime).toBeNull();
      expect(state.halfOpenAttempts).toBe(0);
    });

    it("accepts custom circuit breaker config", () => {
      const customCbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 5,
        failureWindowMs: 120_000,
        resetTimeoutMs: 60_000,
        halfOpenMaxAttempts: 2,
      };
      const agent = new TestAgent(DEFAULT_TEST_CONFIG, customCbConfig);
      // The custom config affects behavior, not state — state starts the same
      expect(agent.getCircuitBreakerState().isOpen).toBe(false);
      expect(agent.getAgentType()).toBe("sentiment");
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 2. Execute — Success Path
  // ──────────────────────────────────────────────────────────────

  describe("Execute — Success Path", () => {
    it("executes successfully and returns decision", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchSuccess();

      const context = createTestContext();
      const resultPromise = agent.execute(context);
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.decision).toBeDefined();
      expect(result.decision?.agentType).toBe("sentiment");
      expect(result.error).toBeUndefined();
    });

    it("returns correct decision type and fields", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchSuccess({
        bias: "bearish",
        confidence: 0.9,
        reasoning: "Earnings miss",
        testField: "custom-value",
      });

      const context = createTestContext();
      const resultPromise = agent.execute(context);
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.decision?.bias).toBe("bearish");
      expect(result.decision?.confidence).toBe(0.9);
      expect(result.decision?.testField).toBe("custom-value");
    });

    it("populates metrics correctly on success", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchSuccess({}, 200);

      const context = createTestContext();
      const resultPromise = agent.execute(context);
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.metrics.provider).toBe("aiml");
      expect(result.metrics.model).toBe("gpt-4o-mini");
      expect(result.metrics.tokenCount).toBe(200);
      expect(result.metrics.costUsd).toBeCloseTo(200 * 0.000002, 8);
      expect(result.metrics.fallbackUsed).toBe(false);
      expect(result.metrics.validationPassed).toBe(true);
      expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("logs successful result to database", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchSuccess();

      const context = createTestContext({ symbol: "GOOG", signalId: "sig-1" });
      const resultPromise = agent.execute(context);
      jest.advanceTimersByTime(100);
      await resultPromise;

      // Flush fire-and-forget logging promises
      await flushPromises();

      expect(mockFrom).toHaveBeenCalledWith("trading_agent_logs");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          signal_id: "sig-1",
          agent_type: "sentiment",
          symbol: "GOOG",
          validation_passed: true,
        }),
      );
    });

    it("calls buildPrompt with the provided context", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchSuccess();

      const context = createTestContext({ symbol: "TSLA", currentPrice: 250 });
      const resultPromise = agent.execute(context);
      jest.advanceTimersByTime(100);
      await resultPromise;

      expect(agent.buildPromptCalls).toHaveLength(1);
      expect(agent.buildPromptCalls[0].symbol).toBe("TSLA");
      expect(agent.buildPromptCalls[0].currentPrice).toBe(250);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 3. Execute — Validation
  // ──────────────────────────────────────────────────────────────

  describe("Execute — Validation", () => {
    it("fails when Zod validation fails", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      // Return invalid decision (missing testField, wrong agentType)
      agent.customParseResponse = () =>
        ({
          agentType: "sentiment",
          bias: "bullish",
          confidence: 2.0, // Out of range (> 1)
          confidenceLevel: "high",
          reasoning: "test",
          timestamp: new Date().toISOString(),
          testField: "ok",
        }) as TestDecision;

      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
    });

    it("includes validation errors in metrics when validation fails", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      agent.customParseResponse = () =>
        ({
          agentType: "sentiment",
          bias: "bullish",
          confidence: 5.0, // Invalid
          confidenceLevel: "high",
          reasoning: "test",
          timestamp: new Date().toISOString(),
          testField: "ok",
        }) as TestDecision;

      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.metrics.validationPassed).toBe(false);
      expect(result.metrics.validationErrors).toBeDefined();
      expect(result.metrics.validationErrors!.length).toBeGreaterThan(0);
    });

    it("records failure in circuit breaker on validation failure", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      agent.customParseResponse = () =>
        ({
          agentType: "sentiment",
          bias: "bullish",
          confidence: 99, // Out of range
          confidenceLevel: "high",
          reasoning: "test",
          timestamp: new Date().toISOString(),
          testField: "ok",
        }) as TestDecision;

      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await resultPromise;

      const state = agent.getCircuitBreakerState();
      expect(state.failureCount).toBe(1);
    });

    it("logs failed validation to database", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      agent.customParseResponse = () =>
        ({
          agentType: "sentiment",
          bias: "bullish",
          confidence: 99,
          confidenceLevel: "high",
          reasoning: "test",
          timestamp: new Date().toISOString(),
          testField: "ok",
        }) as TestDecision;

      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await resultPromise;
      await flushPromises();

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          validation_passed: false,
        }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 4. Execute — LLM Errors
  // ──────────────────────────────────────────────────────────────

  describe("Execute — LLM Errors", () => {
    it("retries on LLM failure", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      // First call fails, second succeeds
      mockFetchFailure(500);
      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      // Advance past the first backoff (1s)
      await jest.advanceTimersByTimeAsync(1500);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.metrics.fallbackUsed).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("applies exponential backoff between retries", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      // All calls fail
      mockFetchFailure(500);
      mockFetchFailure(500);
      mockFetchFailure(500);

      const resultPromise = agent.execute(createTestContext());

      // First retry after 1s
      await jest.advanceTimersByTimeAsync(1100);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Second retry after 2s
      await jest.advanceTimersByTimeAsync(2100);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      const result = await resultPromise;
      expect(result.success).toBe(false);
    });

    it("records failure after max retries exhausted", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchFailure(500);
      mockFetchFailure(500);
      mockFetchFailure(500);

      const resultPromise = agent.execute(createTestContext());
      await jest.advanceTimersByTimeAsync(10_000);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      const state = agent.getCircuitBreakerState();
      expect(state.failureCount).toBe(1);
    });

    it("returns error message from failed LLM call", async () => {
      const agent = new TestAgent({
        ...DEFAULT_TEST_CONFIG,
        maxRetries: 0,
      });
      mockFetchFailure(429, "Too Many Requests");

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("429");
      expect(result.error).toContain("Too Many Requests");
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 5. Execute — Timeout
  // ──────────────────────────────────────────────────────────────

  describe("Execute — Timeout", () => {
    it("throws when AIML_API_KEY is not configured", async () => {
      delete process.env.AIML_API_KEY;
      const agent = new TestAgent({
        ...DEFAULT_TEST_CONFIG,
        maxRetries: 0,
      });

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("AIML_API_KEY not configured");
    });

    it("records failure on network error", async () => {
      const agent = new TestAgent({
        ...DEFAULT_TEST_CONFIG,
        maxRetries: 0,
      });
      mockFetchReject(new Error("Network timeout"));

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network timeout");
      const state = agent.getCircuitBreakerState();
      expect(state.failureCount).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 6. Circuit Breaker
  // ──────────────────────────────────────────────────────────────

  describe("Circuit Breaker", () => {
    it("starts in closed state", () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      expect(agent.isCircuitOpen()).toBe(false);
      expect(agent.getCircuitBreakerState().isOpen).toBe(false);
    });

    it("opens after threshold failures", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 2,
        failureWindowMs: 60_000,
        resetTimeoutMs: 30_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Failure 1
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;
      expect(agent.getCircuitBreakerState().isOpen).toBe(false);

      // Failure 2 — should open
      mockFetchFailure(500);
      const r2Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r2Promise;
      expect(agent.getCircuitBreakerState().isOpen).toBe(true);
    });

    it("blocks execution when open", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 1,
        failureWindowMs: 60_000,
        resetTimeoutMs: 30_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Trip the breaker
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;

      // Should be blocked immediately
      const r2Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await r2Promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Circuit breaker open");
      // fetch should only have been called once (the first failure)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("transitions to half-open after reset timeout", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 1,
        failureWindowMs: 60_000,
        resetTimeoutMs: 5_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Trip the breaker
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;
      expect(agent.isCircuitOpen()).toBe(true);

      // Advance past reset timeout
      jest.advanceTimersByTime(5_100);

      // Should allow one half-open attempt
      expect(agent.isCircuitOpen()).toBe(false);
    });

    it("allows one attempt in half-open state", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 1,
        failureWindowMs: 60_000,
        resetTimeoutMs: 5_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Trip the breaker
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;

      // Advance past reset timeout
      jest.advanceTimersByTime(5_100);

      // Half-open: first call should be allowed
      mockFetchSuccess();
      const r2Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await r2Promise;

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("re-opens on half-open failure when max attempts exceeded", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 1,
        failureWindowMs: 60_000,
        resetTimeoutMs: 5_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Trip the breaker
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;

      // Advance past reset timeout
      jest.advanceTimersByTime(5_100);

      // Half-open attempt fails
      mockFetchFailure(500);
      const r2Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r2Promise;

      // Should be blocked again (halfOpenAttempts exhausted)
      expect(agent.isCircuitOpen()).toBe(true);
    });

    it("closes on half-open success", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 1,
        failureWindowMs: 60_000,
        resetTimeoutMs: 5_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Trip the breaker
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;

      // Advance past reset timeout
      jest.advanceTimersByTime(5_100);

      // Half-open attempt succeeds
      mockFetchSuccess();
      const r2Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r2Promise;

      // Circuit should be fully closed now
      const state = agent.getCircuitBreakerState();
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
      expect(state.halfOpenAttempts).toBe(0);
    });

    it("resets manually via resetCircuitBreaker()", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 1,
        failureWindowMs: 60_000,
        resetTimeoutMs: 30_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Trip the breaker
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;
      expect(agent.getCircuitBreakerState().isOpen).toBe(true);

      // Manual reset
      agent.resetCircuitBreaker();
      const state = agent.getCircuitBreakerState();
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
      expect(state.lastFailureTime).toBeNull();
      expect(state.lastSuccessTime).toBeNull();
      expect(state.halfOpenAttempts).toBe(0);
    });

    it("resets failure count when outside failure window", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 3,
        failureWindowMs: 2_000, // 2 second window
        resetTimeoutMs: 30_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Failure 1
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;
      expect(agent.getCircuitBreakerState().failureCount).toBe(1);

      // Advance past failure window
      jest.advanceTimersByTime(3_000);

      // Failure 2 — should reset count first, then count as 1
      mockFetchFailure(500);
      const r2Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r2Promise;

      // Count should be 1 (not 2), because the window expired
      expect(agent.getCircuitBreakerState().failureCount).toBe(1);
      expect(agent.getCircuitBreakerState().isOpen).toBe(false);
    });

    it("getCircuitBreakerState returns a copy", () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      const state1 = agent.getCircuitBreakerState();
      state1.isOpen = true;
      state1.failureCount = 999;

      const state2 = agent.getCircuitBreakerState();
      expect(state2.isOpen).toBe(false);
      expect(state2.failureCount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 7. Confidence Level
  // ──────────────────────────────────────────────────────────────

  describe("Confidence Level", () => {
    it("maps 0 to very_low", () => {
      expect(getConfidenceLevel(0)).toBe("very_low");
      expect(getConfidenceLevel(0.1)).toBe("very_low");
      expect(getConfidenceLevel(0.19)).toBe("very_low");
    });

    it("maps 0.2-0.39 to low", () => {
      expect(getConfidenceLevel(0.2)).toBe("low");
      expect(getConfidenceLevel(0.3)).toBe("low");
      expect(getConfidenceLevel(0.39)).toBe("low");
    });

    it("maps 0.4-0.59 to medium", () => {
      expect(getConfidenceLevel(0.4)).toBe("medium");
      expect(getConfidenceLevel(0.5)).toBe("medium");
      expect(getConfidenceLevel(0.59)).toBe("medium");
    });

    it("maps 0.6-0.79 to high", () => {
      expect(getConfidenceLevel(0.6)).toBe("high");
      expect(getConfidenceLevel(0.7)).toBe("high");
      expect(getConfidenceLevel(0.79)).toBe("high");
    });

    it("maps 0.8-1.0 to very_high", () => {
      expect(getConfidenceLevel(0.8)).toBe("very_high");
      expect(getConfidenceLevel(0.9)).toBe("very_high");
      expect(getConfidenceLevel(1.0)).toBe("very_high");
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 8. DB Logging
  // ──────────────────────────────────────────────────────────────

  describe("DB Logging", () => {
    it("logs successful execution to database", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchSuccess();

      const context = createTestContext({ symbol: "MSFT" });
      const resultPromise = agent.execute(context);
      jest.advanceTimersByTime(100);
      await resultPromise;
      await flushPromises();

      expect(mockFrom).toHaveBeenCalledWith("trading_agent_logs");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          agent_type: "sentiment",
          symbol: "MSFT",
          validation_passed: true,
          fallback_used: false,
        }),
      );
    });

    it("logs failed execution to database", async () => {
      const agent = new TestAgent({
        ...DEFAULT_TEST_CONFIG,
        maxRetries: 0,
      });
      mockFetchFailure(500);

      const context = createTestContext();
      const resultPromise = agent.execute(context);
      jest.advanceTimersByTime(100);
      await resultPromise;
      await flushPromises();

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_type: "sentiment",
          validation_passed: false,
        }),
      );
    });

    it("silently skips logging when env vars are missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      // Should still succeed — logging is fire-and-forget
      expect(result.success).toBe(true);
      // createClient should not have been called
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 9. Constants & Type Guards
  // ──────────────────────────────────────────────────────────────

  describe("Constants & Type Guards", () => {
    it("DEFAULT_CIRCUIT_BREAKER_CONFIG has correct values", () => {
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBe(3);
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureWindowMs).toBe(60_000);
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs).toBe(30_000);
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.halfOpenMaxAttempts).toBe(1);
    });

    it("CONFIDENCE_THRESHOLDS covers full 0-1 range", () => {
      expect(CONFIDENCE_THRESHOLDS.very_low).toEqual([0, 0.2]);
      expect(CONFIDENCE_THRESHOLDS.low).toEqual([0.2, 0.4]);
      expect(CONFIDENCE_THRESHOLDS.medium).toEqual([0.4, 0.6]);
      expect(CONFIDENCE_THRESHOLDS.high).toEqual([0.6, 0.8]);
      expect(CONFIDENCE_THRESHOLDS.very_high).toEqual([0.8, 1.0]);
    });

    it("getAgentType returns configured agent type", () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      expect(agent.getAgentType()).toBe("sentiment");
    });

    it("getAgentConfig returns the full config object", () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      const config = agent.getAgentConfig();
      expect(config.name).toBe("Test Agent");
      expect(config.description).toBe("A test agent for unit testing");
      expect(config.maxLatencyMs).toBe(5000);
      expect(config.maxRetries).toBe(2);
      expect(config.requiredForConsensus).toBe(true);
      expect(config.consensusWeight).toBe(0.5);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 10. Edge Cases
  // ──────────────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("handles zero maxRetries (no retries)", async () => {
      const agent = new TestAgent({
        ...DEFAULT_TEST_CONFIG,
        maxRetries: 0,
      });
      mockFetchFailure(500);

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("handles parseResponse throwing an error", async () => {
      const agent = new TestAgent({
        ...DEFAULT_TEST_CONFIG,
        maxRetries: 0,
      });
      agent.customParseResponse = () => {
        throw new Error("JSON parse error");
      };
      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("JSON parse error");
    });

    it("handles empty LLM response gracefully", async () => {
      const agent = new TestAgent({
        ...DEFAULT_TEST_CONFIG,
        maxRetries: 0,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "" } }],
          usage: { prompt_tokens: 50, completion_tokens: 0 },
        }),
      });

      // parseResponse will try JSON.parse("") which throws
      const resultPromise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await resultPromise;

      expect(result.success).toBe(false);
    });

    it("records fallback chain when retries succeed", async () => {
      const agent = new TestAgent(DEFAULT_TEST_CONFIG);
      // First two fail, third succeeds
      mockFetchFailure(500);
      mockFetchFailure(502);
      mockFetchSuccess();

      const resultPromise = agent.execute(createTestContext());
      // Advance past backoffs: 1s + 2s
      await jest.advanceTimersByTimeAsync(4_000);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.metrics.fallbackUsed).toBe(true);
      expect(result.metrics.fallbackChain).toEqual(["aiml", "aiml"]);
    });

    it("logs circuit breaker open result to database", async () => {
      const cbConfig: AgentCircuitBreakerConfig = {
        failureThreshold: 1,
        failureWindowMs: 60_000,
        resetTimeoutMs: 30_000,
        halfOpenMaxAttempts: 1,
      };
      const agent = new TestAgent(
        { ...DEFAULT_TEST_CONFIG, maxRetries: 0 },
        cbConfig,
      );

      // Trip the breaker
      mockFetchFailure(500);
      const r1Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      await r1Promise;

      mockInsert.mockClear();
      mockFrom.mockClear();
      mockFrom.mockReturnValue({ insert: mockInsert });
      mockCreateClient.mockClear();
      mockCreateClient.mockReturnValue({ from: mockFrom });

      // This call should be blocked by circuit breaker
      const r2Promise = agent.execute(createTestContext());
      jest.advanceTimersByTime(100);
      const result = await r2Promise;
      await flushPromises();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Circuit breaker open");
      // Should still log the blocked attempt
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
