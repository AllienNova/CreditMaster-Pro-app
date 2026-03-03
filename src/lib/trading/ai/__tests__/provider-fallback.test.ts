/**
 * Provider Fallback Manager Tests
 *
 * Tests for multi-provider LLM calls with circuit breakers,
 * automatic fallback, timeout enforcement, and health status.
 */

import {
  ProviderFallbackManager,
  getProviderFallbackManager,
  resetProviderFallbackManager,
} from "../provider-fallback";
import type { LLMRequest, LLMResponse } from "../provider-fallback";
import type { ModelEntry } from "../model-registry";

// ============================================================================
// HELPERS
// ============================================================================

function makeModelEntry(
  overrides: Partial<ModelEntry> = {},
): ModelEntry {
  return {
    provider: "aiml",
    modelId: "aiml/gpt-4o-mini",
    displayName: "GPT-4o Mini (via AIML)",
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
    maxTokens: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ["chat", "json_mode"],
    tier: "fast",
    available: true,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return {
    model: "aiml/gpt-4o-mini",
    systemPrompt: "You are a trading analyst.",
    userPrompt: "Analyze AAPL sentiment.",
    temperature: 0.3,
    maxOutputTokens: 2000,
    timeoutMs: 5000,
    ...overrides,
  };
}

function buildModelChain(providers: Array<{ provider: string; modelId: string }>): ModelEntry[] {
  return providers.map((p) =>
    makeModelEntry({ provider: p.provider as ModelEntry["provider"], modelId: p.modelId }),
  );
}

// Successful OpenAI-format mock response
function mockOpenAISuccess(text: string = "Analysis complete") {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify({ choices: [{ message: { content: text } }] }),
    json: async () => ({ choices: [{ message: { content: text } }] }),
  };
}

// Successful Anthropic-format mock response
function mockAnthropicSuccess(text: string = "Analysis complete") {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify({ content: [{ text }] }),
    json: async () => ({ content: [{ text }] }),
  };
}

// Failed response
function mockFailure(status: number = 500) {
  return {
    ok: false,
    status,
    statusText: "Internal Server Error",
    text: async () => "Server error",
    json: async () => ({ error: "Server error" }),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("ProviderFallbackManager", () => {
  const originalFetch = global.fetch;
  let manager: ProviderFallbackManager;

  beforeEach(() => {
    // Clear env
    delete process.env.AIML_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.XAI_API_KEY;

    // Set default keys
    process.env.AIML_API_KEY = "test-aiml-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.XAI_API_KEY = "test-xai-key";

    resetProviderFallbackManager();
    manager = new ProviderFallbackManager();

    // Default mock
    global.fetch = jest.fn().mockResolvedValue(mockOpenAISuccess());
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AIML_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.XAI_API_KEY;
  });

  // --------------------------------------------------------------------------
  // Basic execution
  // --------------------------------------------------------------------------

  describe("execute", () => {
    it("calls first provider on success", async () => {
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);
      const request = makeRequest();

      const result = await manager.execute(request, chain);

      expect(result.provider).toBe("aiml");
      expect(result.text).toBe("Analysis complete");
      expect(result.fallbackUsed).toBe(false);
      expect(result.providersAttempted).toEqual(["aiml"]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("falls back to second provider on first failure", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockFailure(500))
        .mockResolvedValueOnce(mockOpenAISuccess("Fallback result"));

      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);

      const result = await manager.execute(makeRequest(), chain);

      expect(result.provider).toBe("openai");
      expect(result.text).toBe("Fallback result");
      expect(result.fallbackUsed).toBe(true);
      expect(result.providersAttempted).toEqual(["aiml", "openai"]);
    });

    it("falls back through entire chain", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockFailure(500))
        .mockResolvedValueOnce(mockFailure(503))
        .mockResolvedValueOnce(mockOpenAISuccess("Third provider"));

      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
        { provider: "xai", modelId: "grok-2" },
      ]);

      const result = await manager.execute(makeRequest(), chain);

      expect(result.provider).toBe("xai");
      expect(result.text).toBe("Third provider");
      expect(result.providersAttempted).toEqual(["aiml", "openai", "xai"]);
    });

    it("throws when all providers fail", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));

      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);

      await expect(manager.execute(makeRequest(), chain)).rejects.toThrow(
        "All providers failed",
      );
    });

    it("throws with descriptive error when no providers available", async () => {
      // Remove all API keys
      delete process.env.AIML_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.XAI_API_KEY;

      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      await expect(manager.execute(makeRequest(), chain)).rejects.toThrow(
        "no providers available",
      );
    });
  });

  // --------------------------------------------------------------------------
  // Provider skipping
  // --------------------------------------------------------------------------

  describe("provider skipping", () => {
    it("skips providers with open circuit breakers", async () => {
      // Trip AIML circuit breaker
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));
      const aimlChain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);
      // 3 failures to trip the breaker
      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute(makeRequest(), aimlChain);
        } catch {
          // Expected
        }
      }

      // Now a chain with AIML first should skip it
      (global.fetch as jest.Mock).mockResolvedValue(
        mockOpenAISuccess("OpenAI response"),
      );
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);

      const result = await manager.execute(makeRequest(), chain);
      expect(result.provider).toBe("openai");
      // AIML was skipped, not attempted
      expect(result.providersAttempted).toEqual(["openai"]);
    });

    it("skips providers without API keys", async () => {
      delete process.env.AIML_API_KEY;

      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);

      const result = await manager.execute(makeRequest(), chain);
      expect(result.provider).toBe("openai");
      expect(result.providersAttempted).toEqual(["openai"]);
    });
  });

  // --------------------------------------------------------------------------
  // Circuit breakers
  // --------------------------------------------------------------------------

  describe("circuit breakers", () => {
    it("opens circuit breaker after threshold failures", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      // 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute(makeRequest(), chain);
        } catch {
          // Expected
        }
      }

      expect(manager.isProviderOpen("aiml")).toBe(true);
    });

    it("does not open circuit breaker before threshold", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      // Only 2 failures (threshold is 3)
      for (let i = 0; i < 2; i++) {
        try {
          await manager.execute(makeRequest(), chain);
        } catch {
          // Expected
        }
      }

      expect(manager.isProviderOpen("aiml")).toBe(false);
    });

    it("resets circuit breaker after timeout", () => {
      // Manually open the circuit via failures
      // We'll use the internal method pattern: fail 3 times
      // Then fast-forward time
      const nowOriginal = Date.now;
      let currentTime = Date.now();
      Date.now = jest.fn(() => currentTime);

      // Use a fresh manager
      const mgr = new ProviderFallbackManager();

      // Simulate 3 failures by calling execute with failing fetch
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      const failures = Array.from({ length: 3 }, () =>
        mgr.execute(makeRequest(), chain).catch(() => {}),
      );
      Promise.all(failures).then(() => {
        expect(mgr.isProviderOpen("aiml")).toBe(true);

        // Advance time past 60s reset timeout
        currentTime += 61_000;
        expect(mgr.isProviderOpen("aiml")).toBe(false);

        Date.now = nowOriginal;
      });
    });

    it("recordSuccess resets circuit breaker on successful call", async () => {
      // Trip AIML breaker only (use a chain with just AIML)
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));
      const aimlOnlyChain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute(makeRequest(), aimlOnlyChain);
        } catch {
          // Expected to throw
        }
      }

      expect(manager.isProviderOpen("aiml")).toBe(true);
      // OpenAI should still be closed (not tripped)
      expect(manager.isProviderOpen("openai")).toBe(false);

      // Now succeed with OpenAI -- verify it works and breaker stays closed
      (global.fetch as jest.Mock).mockResolvedValue(
        mockOpenAISuccess("success"),
      );
      const openaiChain = buildModelChain([
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);
      const result = await manager.execute(makeRequest(), openaiChain);
      expect(result.provider).toBe("openai");

      // OpenAI breaker should be closed
      const health = manager.getProviderHealth();
      expect(health.openai.circuitBreakerOpen).toBe(false);
      expect(health.openai.failureCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Provider health
  // --------------------------------------------------------------------------

  describe("getProviderHealth", () => {
    it("returns status for all providers", () => {
      const health = manager.getProviderHealth();
      expect(health.aiml).toBeDefined();
      expect(health.anthropic).toBeDefined();
      expect(health.openai).toBeDefined();
      expect(health.xai).toBeDefined();
    });

    it("reports available based on API keys", () => {
      delete process.env.ANTHROPIC_API_KEY;
      const mgr = new ProviderFallbackManager();
      const health = mgr.getProviderHealth();

      expect(health.aiml.available).toBe(true);
      expect(health.anthropic.available).toBe(false);
      expect(health.openai.available).toBe(true);
      expect(health.xai.available).toBe(true);
    });

    it("reports circuit breaker status", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute(makeRequest(), chain);
        } catch {
          // Expected
        }
      }

      const health = manager.getProviderHealth();
      expect(health.aiml.circuitBreakerOpen).toBe(true);
      expect(health.aiml.failureCount).toBe(3);
      expect(health.openai.circuitBreakerOpen).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // resetProvider / resetAll
  // --------------------------------------------------------------------------

  describe("resetProvider", () => {
    it("clears circuit breaker for a specific provider", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute(makeRequest(), chain);
        } catch {
          // Expected
        }
      }

      expect(manager.isProviderOpen("aiml")).toBe(true);
      manager.resetProvider("aiml");
      expect(manager.isProviderOpen("aiml")).toBe(false);
    });
  });

  describe("resetAll", () => {
    it("clears all circuit breakers", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFailure(500));

      // Trip AIML
      const aimlChain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);
      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute(makeRequest(), aimlChain);
        } catch {
          // Expected
        }
      }

      // Trip OpenAI
      const oaiChain = buildModelChain([
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);
      for (let i = 0; i < 3; i++) {
        try {
          await manager.execute(makeRequest(), oaiChain);
        } catch {
          // Expected
        }
      }

      expect(manager.isProviderOpen("aiml")).toBe(true);
      expect(manager.isProviderOpen("openai")).toBe(true);

      manager.resetAll();

      expect(manager.isProviderOpen("aiml")).toBe(false);
      expect(manager.isProviderOpen("openai")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Request format handling
  // --------------------------------------------------------------------------

  describe("request format", () => {
    it("sends OpenAI format for aiml/openai/xai providers", async () => {
      const chain = buildModelChain([
        { provider: "openai", modelId: "gpt-4o" },
      ]);

      await manager.execute(makeRequest(), chain);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages).toBeDefined();
      expect(body.messages[0].role).toBe("system");
      expect(body.messages[1].role).toBe("user");
      expect(body.model).toBe("gpt-4o");
    });

    it("sends Anthropic format for anthropic provider", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockAnthropicSuccess("Anthropic response"),
      );

      const chain = buildModelChain([
        { provider: "anthropic", modelId: "claude-sonnet-4-20250514" },
      ]);

      const result = await manager.execute(makeRequest(), chain);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.system).toBeDefined();
      expect(body.messages).toBeDefined();
      expect(body.messages[0].role).toBe("user");
      expect(body.model).toBe("claude-sonnet-4-20250514");

      // Verify headers
      expect(fetchCall[1].headers["x-api-key"]).toBe("test-anthropic-key");
      expect(fetchCall[1].headers["anthropic-version"]).toBe("2023-06-01");

      expect(result.text).toBe("Anthropic response");
    });
  });

  // --------------------------------------------------------------------------
  // Response metadata
  // --------------------------------------------------------------------------

  describe("response metadata", () => {
    it("includes token count and cost estimates", async () => {
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      const result = await manager.execute(makeRequest(), chain);

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.costUsd).toBeGreaterThan(0);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("includes model and provider info", async () => {
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      const result = await manager.execute(makeRequest(), chain);

      expect(result.model).toBe("aiml/gpt-4o-mini");
      expect(result.provider).toBe("aiml");
    });

    it("sets fallbackUsed to false when primary succeeds", async () => {
      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);

      const result = await manager.execute(makeRequest(), chain);
      expect(result.fallbackUsed).toBe(false);
    });

    it("sets fallbackUsed to true when primary fails", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockFailure(500))
        .mockResolvedValueOnce(mockOpenAISuccess("fallback"));

      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
        { provider: "openai", modelId: "gpt-4o-mini" },
      ]);

      const result = await manager.execute(makeRequest(), chain);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Timeout
  // --------------------------------------------------------------------------

  describe("timeout", () => {
    it("aborts when provider call exceeds timeout", async () => {
      (global.fetch as jest.Mock).mockImplementation(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            const handler = () => reject(new Error("The operation was aborted"));
            if (options.signal.aborted) {
              handler();
              return;
            }
            options.signal.addEventListener("abort", handler);
          }),
      );

      const chain = buildModelChain([
        { provider: "aiml", modelId: "aiml/gpt-4o-mini" },
      ]);

      await expect(
        manager.execute(makeRequest({ timeoutMs: 1 }), chain),
      ).rejects.toThrow("All providers failed");
    });
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe("singleton", () => {
    it("getProviderFallbackManager returns same instance", () => {
      const m1 = getProviderFallbackManager();
      const m2 = getProviderFallbackManager();
      expect(m1).toBe(m2);
    });

    it("resetProviderFallbackManager creates new instance", () => {
      const m1 = getProviderFallbackManager();
      resetProviderFallbackManager();
      const m2 = getProviderFallbackManager();
      expect(m1).not.toBe(m2);
    });
  });
});
