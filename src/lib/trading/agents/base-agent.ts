/**
 * Trading Agent Base Class
 *
 * Abstract base for all 7 AI trading agents. Provides:
 * - LLM call with provider fallback (via model registry — Task B4)
 * - Zod response validation
 * - Circuit breaker protection
 * - Metrics tracking + DB logging
 * - Retry logic with exponential backoff
 */

import { createClient } from "@supabase/supabase-js";
import type {
  AgentType,
  AIProvider,
  AgentContext,
  BaseAgentDecision,
  AgentResult,
  AgentMetrics,
  AgentConfig,
  AgentCircuitBreaker,
  AgentCircuitBreakerConfig,
  AgentLogEntry,
} from "./agent-types";
import {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  getConfidenceLevel,
} from "./agent-types";

// ============================================================================
// LLM CALL RESULT
// ============================================================================

/** Shape returned by the internal callLLM method */
export interface LLMCallResult {
  text: string;
  provider: AIProvider;
  model: string;
  tokenCount: number;
  costUsd: number;
}

// ============================================================================
// ABSTRACT BASE CLASS
// ============================================================================

/**
 * Abstract base class for all trading agents.
 *
 * Subclasses must implement:
 * - buildPrompt(context): Build the LLM prompt for this agent
 * - parseResponse(raw, context): Parse raw LLM text into a typed decision
 */
export abstract class TradingAgent<T extends BaseAgentDecision> {
  protected config: AgentConfig;
  private circuitBreaker: AgentCircuitBreaker;
  private circuitBreakerConfig: AgentCircuitBreakerConfig;

  constructor(
    config: AgentConfig,
    circuitBreakerConfig: AgentCircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
  ) {
    this.config = config;
    this.circuitBreakerConfig = circuitBreakerConfig;
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      halfOpenAttempts: 0,
    };
  }

  // ─── Abstract Methods ─────────────────────────────────────────

  /** Build the prompt for the LLM given the trading context */
  protected abstract buildPrompt(context: AgentContext): string;

  /** Parse raw LLM response text into a typed decision */
  protected abstract parseResponse(raw: string, context: AgentContext): T;

  // ─── Public API ───────────────────────────────────────────────

  /** Get the agent's configuration */
  getAgentConfig(): AgentConfig {
    return this.config;
  }

  /** Get the agent type identifier */
  getAgentType(): AgentType {
    return this.config.agentType;
  }

  /**
   * Execute the agent: build prompt -> call LLM -> validate -> return result.
   *
   * Includes circuit breaker protection, retry with exponential backoff,
   * metrics collection, and fire-and-forget DB logging.
   */
  async execute(context: AgentContext): Promise<AgentResult<T>> {
    const startTime = Date.now();
    const metrics: AgentMetrics = {
      latencyMs: 0,
      tokenCount: 0,
      costUsd: 0,
      provider: this.config.defaultProvider,
      model: this.config.defaultModel,
      fallbackUsed: false,
      validationPassed: false,
    };

    // Circuit breaker check
    if (this.isCircuitOpen()) {
      metrics.latencyMs = Date.now() - startTime;
      const result: AgentResult<T> = {
        success: false,
        metrics,
        error: `Circuit breaker open for ${this.config.agentType} agent`,
      };
      this.logResult(context, result).catch(() => {
        // Fire-and-forget — never fail the agent execution
      });
      return result;
    }

    let lastError: string | undefined;
    let retries = 0;

    while (retries <= this.config.maxRetries) {
      try {
        // Build prompt
        const prompt = this.buildPrompt(context);

        // Call LLM (placeholder — Task B4 will replace with model registry)
        const { text, provider, model, tokenCount, costUsd } =
          await this.callLLM(prompt, retries > 0);

        metrics.provider = provider;
        metrics.model = model;
        metrics.tokenCount = tokenCount;
        metrics.costUsd = costUsd;
        metrics.fallbackUsed = retries > 0;
        if (retries > 0) {
          metrics.fallbackChain = [this.config.defaultProvider, provider];
        }

        // Parse response
        const decision = this.parseResponse(text, context);

        // Validate with Zod schema
        const validation = this.config.responseSchema.safeParse(decision);
        if (!validation.success) {
          const errors = validation.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`,
          );
          metrics.validationPassed = false;
          metrics.validationErrors = errors;
          metrics.latencyMs = Date.now() - startTime;

          this.recordFailure();
          const result: AgentResult<T> = {
            success: false,
            metrics,
            error: `Validation failed: ${errors.join("; ")}`,
          };
          this.logResult(context, result).catch(() => {
            // Fire-and-forget
          });
          return result;
        }

        // Success
        metrics.validationPassed = true;
        metrics.latencyMs = Date.now() - startTime;
        this.recordSuccess();

        const result: AgentResult<T> = {
          success: true,
          decision,
          metrics,
        };
        this.logResult(context, result).catch(() => {
          // Fire-and-forget
        });
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        retries++;

        if (retries <= this.config.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s ...
          await this.sleep(Math.pow(2, retries - 1) * 1000);
        }
      }
    }

    // All retries exhausted
    this.recordFailure();
    metrics.latencyMs = Date.now() - startTime;

    const result: AgentResult<T> = {
      success: false,
      metrics,
      error: lastError || "All retries exhausted",
    };
    this.logResult(context, result).catch(() => {
      // Fire-and-forget
    });
    return result;
  }

  // ─── LLM Integration ─────────────────────────────────────────

  /**
   * Call the LLM. This is a placeholder that will be replaced by the
   * model registry (Task B4) with proper provider fallback. For now
   * it calls the AIML API directly.
   */
  protected async callLLM(
    prompt: string,
    _isFallback: boolean,
  ): Promise<LLMCallResult> {
    const apiKey = process.env.AIML_API_KEY;
    const apiUrl = process.env.AIML_API_URL || "https://api.aimlapi.com/v1";

    if (!apiKey) {
      throw new Error("AIML_API_KEY not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.maxLatencyMs,
    );

    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [
            {
              role: "system",
              content:
                "You are a trading intelligence agent. Respond ONLY with valid JSON matching the requested schema. No markdown, no explanation outside JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `LLM API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content || "";
      const tokenCount =
        (data.usage?.prompt_tokens || 0) +
        (data.usage?.completion_tokens || 0);

      return {
        text,
        provider: this.config.defaultProvider,
        model: this.config.defaultModel,
        tokenCount,
        costUsd: tokenCount * 0.000002, // Rough estimate
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Circuit Breaker ──────────────────────────────────────────

  /** Check if the circuit breaker is currently open (blocking execution) */
  isCircuitOpen(): boolean {
    if (!this.circuitBreaker.isOpen) return false;

    const now = Date.now();
    const lastFailure = this.circuitBreaker.lastFailureTime || 0;

    // Check if reset timeout has passed (transition to half-open)
    if (now - lastFailure >= this.circuitBreakerConfig.resetTimeoutMs) {
      // Half-open: allow one attempt
      if (
        this.circuitBreaker.halfOpenAttempts <
        this.circuitBreakerConfig.halfOpenMaxAttempts
      ) {
        this.circuitBreaker.halfOpenAttempts++;
        return false; // Allow the attempt
      }
    }

    return true;
  }

  /** Record a successful execution — closes the circuit */
  private recordSuccess(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.halfOpenAttempts = 0;
    this.circuitBreaker.lastSuccessTime = Date.now();
  }

  /** Record a failed execution — may open the circuit */
  private recordFailure(): void {
    const now = Date.now();
    const windowStart = now - this.circuitBreakerConfig.failureWindowMs;

    // Reset count if outside the failure window
    if (
      this.circuitBreaker.lastFailureTime &&
      this.circuitBreaker.lastFailureTime < windowStart
    ) {
      this.circuitBreaker.failureCount = 0;
    }

    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = now;

    if (
      this.circuitBreaker.failureCount >=
      this.circuitBreakerConfig.failureThreshold
    ) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.halfOpenAttempts = 0;
    }
  }

  /** Reset the circuit breaker manually */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      halfOpenAttempts: 0,
    };
  }

  /** Get current circuit breaker state (for monitoring). Returns a copy. */
  getCircuitBreakerState(): AgentCircuitBreaker {
    return { ...this.circuitBreaker };
  }

  // ─── DB Logging ───────────────────────────────────────────────

  /** Log agent execution result to the trading_agent_logs table */
  private async logResult(
    context: AgentContext,
    result: AgentResult<T>,
  ): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      const supabase = createClient(supabaseUrl, supabaseKey);

      const entry: AgentLogEntry = {
        userId: context.userId,
        signalId: context.signalId,
        agentType: this.config.agentType,
        decision: (result.decision as unknown as Record<string, unknown>) || {},
        confidence: result.decision?.confidence || 0,
        provider: result.metrics.provider,
        model: result.metrics.model,
        fallbackUsed: result.metrics.fallbackUsed,
        fallbackChain: result.metrics.fallbackChain,
        latencyMs: result.metrics.latencyMs,
        tokenCount: result.metrics.tokenCount,
        costUsd: result.metrics.costUsd,
        validationPassed: result.metrics.validationPassed,
        validationErrors: result.metrics.validationErrors,
        symbol: context.symbol,
        operatingMode: context.operatingMode,
      };

      await supabase.from("trading_agent_logs").insert({
        user_id: entry.userId,
        signal_id: entry.signalId || null,
        agent_type: entry.agentType,
        decision: entry.decision,
        confidence: entry.confidence,
        provider: entry.provider,
        model: entry.model,
        fallback_used: entry.fallbackUsed,
        fallback_chain: entry.fallbackChain || null,
        latency_ms: entry.latencyMs,
        token_count: entry.tokenCount,
        cost_usd: entry.costUsd,
        validation_passed: entry.validationPassed,
        validation_errors: entry.validationErrors || null,
        symbol: entry.symbol || null,
        operating_mode: entry.operatingMode || null,
      });
    } catch {
      // Fire-and-forget logging — never fail the agent execution
      console.error(`Failed to log agent result for ${this.config.agentType}`);
    }
  }

  // ─── Utility ──────────────────────────────────────────────────

  /** Helper to compute confidence level from numeric value */
  protected toConfidenceLevel(confidence: number) {
    return getConfidenceLevel(confidence);
  }

  /** Sleep helper for backoff */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
