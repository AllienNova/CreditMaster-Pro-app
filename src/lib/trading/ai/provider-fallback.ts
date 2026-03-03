/**
 * Provider Fallback Manager
 *
 * Manages multi-provider LLM calls with automatic fallback.
 * Chain: AIML -> Anthropic -> OpenAI -> xAI
 * Each provider has an independent circuit breaker.
 *
 * Features:
 * - Per-provider circuit breakers (independent open/close)
 * - Automatic fallback on failure (skips open breakers)
 * - Timeout enforcement per provider call
 * - Metrics tracking (provider, latency, cost, token counts)
 * - Health check for all providers
 */

import type { AIProvider } from "../agents/agent-types";
import type { ModelEntry } from "./model-registry";

// Re-export for convenience
export type { AIProvider };

// ============================================================================
// TYPES
// ============================================================================

export interface ProviderConfig {
  provider: AIProvider;
  apiKeyEnvVar: string;
  baseUrl: string;
  /** Path to chat completions endpoint */
  completionsPath: string;
  /** Auth header format */
  authHeaderFormat: "bearer" | "x-api-key";
  /** Request body format differences */
  requestFormat: "openai" | "anthropic";
}

export interface LLMRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface LLMResponse {
  text: string;
  provider: AIProvider;
  model: string;
  tokenCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  fallbackUsed: boolean;
  providersAttempted: AIProvider[];
}

export interface ProviderCircuitBreaker {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  openedAt: number;
}

export interface ProviderHealthStatus {
  available: boolean;
  circuitBreakerOpen: boolean;
  failureCount: number;
}

// ============================================================================
// PROVIDER CONFIGS
// ============================================================================

const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  aiml: {
    provider: "aiml",
    apiKeyEnvVar: "AIML_API_KEY",
    baseUrl: "https://api.aimlapi.com/v1",
    completionsPath: "/chat/completions",
    authHeaderFormat: "bearer",
    requestFormat: "openai",
  },
  anthropic: {
    provider: "anthropic",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    baseUrl: "https://api.anthropic.com",
    completionsPath: "/v1/messages",
    authHeaderFormat: "x-api-key",
    requestFormat: "anthropic",
  },
  openai: {
    provider: "openai",
    apiKeyEnvVar: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
    completionsPath: "/chat/completions",
    authHeaderFormat: "bearer",
    requestFormat: "openai",
  },
  xai: {
    provider: "xai",
    apiKeyEnvVar: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
    completionsPath: "/chat/completions",
    authHeaderFormat: "bearer",
    requestFormat: "openai",
  },
};

// ============================================================================
// CIRCUIT BREAKER SETTINGS
// ============================================================================

const CB_FAILURE_THRESHOLD = 3;
const CB_RESET_TIMEOUT_MS = 60_000; // 1 minute

// ============================================================================
// PROVIDER FALLBACK MANAGER
// ============================================================================

export class ProviderFallbackManager {
  private circuitBreakers: Map<AIProvider, ProviderCircuitBreaker>;
  private providerOrder: AIProvider[];

  constructor(
    providerOrder: AIProvider[] = ["aiml", "anthropic", "openai", "xai"],
  ) {
    this.providerOrder = providerOrder;
    this.circuitBreakers = new Map();

    for (const provider of providerOrder) {
      this.circuitBreakers.set(provider, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        openedAt: 0,
      });
    }
  }

  /**
   * Execute an LLM request with automatic provider fallback.
   * Tries models in chain order, skipping those with open circuit breakers
   * or missing API keys.
   */
  async execute(
    request: LLMRequest,
    modelChain: ModelEntry[],
  ): Promise<LLMResponse> {
    const providersAttempted: AIProvider[] = [];
    let lastError: string | undefined;

    for (const modelEntry of modelChain) {
      const provider = modelEntry.provider;
      const config = PROVIDER_CONFIGS[provider];

      // Skip if circuit breaker is open
      if (this.isProviderOpen(provider)) {
        continue;
      }

      // Skip if no API key
      const apiKey = process.env[config.apiKeyEnvVar];
      if (!apiKey) {
        continue;
      }

      providersAttempted.push(provider);
      const startTime = Date.now();

      try {
        const text = await this.callProvider(config, apiKey, {
          ...request,
          model: modelEntry.modelId,
        });

        const latencyMs = Date.now() - startTime;

        // Estimate tokens (rough: ~4 chars per token)
        const inputTokens = Math.ceil(
          (request.systemPrompt.length + request.userPrompt.length) / 4,
        );
        const outputTokens = Math.ceil(text.length / 4);
        const tokenCount = inputTokens + outputTokens;
        const costUsd =
          inputTokens * modelEntry.costPerInputToken +
          outputTokens * modelEntry.costPerOutputToken;

        this.recordSuccess(provider);

        return {
          text,
          provider,
          model: modelEntry.modelId,
          tokenCount,
          inputTokens,
          outputTokens,
          costUsd,
          latencyMs,
          fallbackUsed: providersAttempted.length > 1,
          providersAttempted,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        this.recordFailure(provider);
      }
    }

    throw new Error(
      `All providers failed. Attempted: [${providersAttempted.join(", ")}]. Last error: ${lastError ?? "no providers available"}`,
    );
  }

  /** Call a specific provider's API */
  private async callProvider(
    config: ProviderConfig,
    apiKey: string,
    request: LLMRequest,
  ): Promise<string> {
    const timeoutMs = request.timeoutMs ?? 15_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const envBaseUrl =
        process.env[`${config.provider.toUpperCase()}_API_URL`];
      const url =
        (envBaseUrl ?? config.baseUrl) + config.completionsPath;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (config.authHeaderFormat === "bearer") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else {
        headers["x-api-key"] = apiKey;
      }

      let body: string;

      if (config.requestFormat === "anthropic") {
        headers["anthropic-version"] = "2023-06-01";
        body = JSON.stringify({
          model: request.model,
          max_tokens: request.maxOutputTokens ?? 2000,
          system: request.systemPrompt,
          messages: [{ role: "user", content: request.userPrompt }],
          temperature: request.temperature ?? 0.3,
        });
      } else {
        body = JSON.stringify({
          model: request.model,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxOutputTokens ?? 2000,
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Provider ${config.provider} error: ${response.status} ${response.statusText} ${errorText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      // Extract text based on format
      if (config.requestFormat === "anthropic") {
        const content = data.content as
          | Array<{ text: string }>
          | undefined;
        return content?.[0]?.text ?? "";
      }
      const choices = data.choices as
        | Array<{ message: { content: string } }>
        | undefined;
      return choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }

  // =========================================================================
  // CIRCUIT BREAKERS
  // =========================================================================

  /** Check if a provider's circuit breaker is open */
  isProviderOpen(provider: AIProvider): boolean {
    const cb = this.circuitBreakers.get(provider);
    if (!cb || !cb.isOpen) return false;

    // Check if reset timeout has passed (half-open)
    if (Date.now() - cb.openedAt >= CB_RESET_TIMEOUT_MS) {
      cb.isOpen = false;
      cb.failureCount = 0;
      return false;
    }

    return true;
  }

  /** Record a successful call -- resets the circuit breaker */
  private recordSuccess(provider: AIProvider): void {
    const cb = this.circuitBreakers.get(provider);
    if (cb) {
      cb.isOpen = false;
      cb.failureCount = 0;
    }
  }

  /** Record a failed call -- may trip the circuit breaker */
  private recordFailure(provider: AIProvider): void {
    const cb = this.circuitBreakers.get(provider);
    if (!cb) return;

    cb.failureCount++;
    cb.lastFailureTime = Date.now();

    if (cb.failureCount >= CB_FAILURE_THRESHOLD) {
      cb.isOpen = true;
      cb.openedAt = Date.now();
    }
  }

  /** Get health status of all providers */
  getProviderHealth(): Record<AIProvider, ProviderHealthStatus> {
    const health: Record<string, ProviderHealthStatus> = {};

    for (const provider of this.providerOrder) {
      const config = PROVIDER_CONFIGS[provider];
      const cb = this.circuitBreakers.get(provider);
      health[provider] = {
        available: !!process.env[config.apiKeyEnvVar],
        circuitBreakerOpen: this.isProviderOpen(provider),
        failureCount: cb?.failureCount ?? 0,
      };
    }

    return health as Record<AIProvider, ProviderHealthStatus>;
  }

  /** Reset circuit breaker for a specific provider */
  resetProvider(provider: AIProvider): void {
    const cb = this.circuitBreakers.get(provider);
    if (cb) {
      cb.isOpen = false;
      cb.failureCount = 0;
      cb.lastFailureTime = 0;
      cb.openedAt = 0;
    }
  }

  /** Reset all circuit breakers */
  resetAll(): void {
    for (const provider of this.providerOrder) {
      this.resetProvider(provider);
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let fallbackInstance: ProviderFallbackManager | null = null;

export function getProviderFallbackManager(): ProviderFallbackManager {
  if (!fallbackInstance) {
    fallbackInstance = new ProviderFallbackManager();
  }
  return fallbackInstance;
}

export function resetProviderFallbackManager(): void {
  fallbackInstance = null;
}
