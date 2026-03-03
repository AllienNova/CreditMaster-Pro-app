/**
 * Model Registry
 *
 * Central registry mapping AI trading agents to their preferred models.
 * Supports per-agent configuration, model catalog, and selection by criteria.
 *
 * Each of the 7 PCTT trading agents has a default model assignment.
 * The registry manages availability (via env vars), fallback chains,
 * per-agent overrides, and model selection by cost/quality/speed.
 */

import type { AgentType, AIProvider } from "../agents/agent-types";

// Re-export for convenience
export type { AgentType, AIProvider };

// ============================================================================
// TYPES
// ============================================================================

export interface ModelEntry {
  provider: AIProvider;
  modelId: string;
  displayName: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxTokens: number;
  maxOutputTokens: number;
  capabilities: ("chat" | "function_calling" | "json_mode" | "vision")[];
  tier: "fast" | "standard" | "premium";
  /** Whether this model is available (has API key configured) */
  available: boolean;
}

export interface AgentModelConfig {
  agentType: AgentType;
  primaryModel: string; // modelId
  fallbackModels: string[]; // ordered fallback modelIds
  maxLatencyMs: number;
  temperature: number;
  maxOutputTokens: number;
}

export interface ModelSelectionCriteria {
  /** Prefer lower cost */
  preferCost?: boolean;
  /** Prefer higher quality */
  preferQuality?: boolean;
  /** Prefer lower latency */
  preferSpeed?: boolean;
  /** Required capabilities */
  requiredCapabilities?: ModelEntry["capabilities"];
  /** Exclude specific providers */
  excludeProviders?: AIProvider[];
}

// ============================================================================
// MODEL CATALOG
// ============================================================================

const MODEL_CATALOG: ModelEntry[] = [
  // AIML models (proxy to many providers)
  {
    provider: "aiml",
    modelId: "aiml/claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet (via AIML)",
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    maxTokens: 200_000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "json_mode"],
    tier: "standard",
    available: false,
  },
  {
    provider: "aiml",
    modelId: "aiml/gpt-4o-mini",
    displayName: "GPT-4o Mini (via AIML)",
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
    maxTokens: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ["chat", "function_calling", "json_mode"],
    tier: "fast",
    available: false,
  },
  {
    provider: "aiml",
    modelId: "aiml/gpt-4o",
    displayName: "GPT-4o (via AIML)",
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
    maxTokens: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ["chat", "function_calling", "json_mode", "vision"],
    tier: "standard",
    available: false,
  },
  // Direct Anthropic
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    maxTokens: 200_000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "json_mode"],
    tier: "standard",
    available: false,
  },
  {
    provider: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    displayName: "Claude Haiku 4.5",
    costPerInputToken: 0.0000008,
    costPerOutputToken: 0.000004,
    maxTokens: 200_000,
    maxOutputTokens: 8192,
    capabilities: ["chat", "json_mode"],
    tier: "fast",
    available: false,
  },
  // Direct OpenAI
  {
    provider: "openai",
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
    maxTokens: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ["chat", "function_calling", "json_mode", "vision"],
    tier: "standard",
    available: false,
  },
  {
    provider: "openai",
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
    maxTokens: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ["chat", "function_calling", "json_mode"],
    tier: "fast",
    available: false,
  },
  // xAI
  {
    provider: "xai",
    modelId: "grok-2",
    displayName: "Grok 2",
    costPerInputToken: 0.000002,
    costPerOutputToken: 0.00001,
    maxTokens: 131_072,
    maxOutputTokens: 8192,
    capabilities: ["chat", "json_mode"],
    tier: "standard",
    available: false,
  },
];

// ============================================================================
// DEFAULT AGENT CONFIGS
// ============================================================================

const DEFAULT_AGENT_CONFIGS: AgentModelConfig[] = [
  {
    agentType: "sentiment",
    primaryModel: "aiml/gpt-4o-mini",
    fallbackModels: ["gpt-4o-mini", "claude-haiku-4-5-20251001", "grok-2"],
    maxLatencyMs: 10_000,
    temperature: 0.3,
    maxOutputTokens: 2000,
  },
  {
    agentType: "regime_confirmation",
    primaryModel: "aiml/gpt-4o",
    fallbackModels: ["gpt-4o", "claude-sonnet-4-20250514", "grok-2"],
    maxLatencyMs: 15_000,
    temperature: 0.2,
    maxOutputTokens: 2000,
  },
  {
    agentType: "news_impact",
    primaryModel: "aiml/gpt-4o-mini",
    fallbackModels: ["gpt-4o-mini", "claude-haiku-4-5-20251001", "grok-2"],
    maxLatencyMs: 10_000,
    temperature: 0.3,
    maxOutputTokens: 2000,
  },
  {
    agentType: "signal_explainer",
    primaryModel: "aiml/claude-3-5-sonnet",
    fallbackModels: ["claude-sonnet-4-20250514", "gpt-4o", "grok-2"],
    maxLatencyMs: 15_000,
    temperature: 0.4,
    maxOutputTokens: 3000,
  },
  {
    agentType: "risk_narrative",
    primaryModel: "aiml/claude-3-5-sonnet",
    fallbackModels: ["claude-sonnet-4-20250514", "gpt-4o", "grok-2"],
    maxLatencyMs: 15_000,
    temperature: 0.3,
    maxOutputTokens: 3000,
  },
  {
    agentType: "earnings_analysis",
    primaryModel: "aiml/gpt-4o",
    fallbackModels: ["gpt-4o", "claude-sonnet-4-20250514", "grok-2"],
    maxLatencyMs: 15_000,
    temperature: 0.2,
    maxOutputTokens: 2000,
  },
  {
    agentType: "consensus_arbiter",
    primaryModel: "aiml/gpt-4o",
    fallbackModels: ["gpt-4o", "claude-sonnet-4-20250514", "grok-2"],
    maxLatencyMs: 20_000,
    temperature: 0.1,
    maxOutputTokens: 3000,
  },
];

// ============================================================================
// MODEL REGISTRY CLASS
// ============================================================================

/** Model Registry -- central configuration for AI model selection */
export class ModelRegistry {
  private catalog: ModelEntry[];
  private agentConfigs: Map<AgentType, AgentModelConfig>;
  private overrides: Map<AgentType, Partial<AgentModelConfig>>;

  constructor() {
    this.catalog = MODEL_CATALOG.map((m) => ({ ...m }));
    this.agentConfigs = new Map();
    this.overrides = new Map();

    for (const config of DEFAULT_AGENT_CONFIGS) {
      this.agentConfigs.set(config.agentType, { ...config });
    }

    this.refreshAvailability();
  }

  /** Refresh model availability based on current environment variables */
  refreshAvailability(): void {
    const keys: Record<AIProvider, string | undefined> = {
      aiml: process.env.AIML_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      xai: process.env.XAI_API_KEY,
    };

    for (const model of this.catalog) {
      model.available = !!keys[model.provider];
    }
  }

  /** Get the full model catalog */
  getCatalog(): readonly ModelEntry[] {
    return this.catalog;
  }

  /** Get available models only */
  getAvailableModels(): ModelEntry[] {
    return this.catalog.filter((m) => m.available);
  }

  /** Look up a model by ID */
  getModel(modelId: string): ModelEntry | undefined {
    return this.catalog.find((m) => m.modelId === modelId);
  }

  /** Get the configuration for a specific agent */
  getAgentConfig(agentType: AgentType): AgentModelConfig {
    const base = this.agentConfigs.get(agentType);
    if (!base) {
      throw new Error(`No model config for agent type: ${agentType}`);
    }

    const override = this.overrides.get(agentType);
    if (!override) return { ...base };

    return {
      ...base,
      ...override,
      agentType, // Never override agentType
    };
  }

  /** Override model config for a specific agent */
  setAgentOverride(
    agentType: AgentType,
    override: Partial<Omit<AgentModelConfig, "agentType">>,
  ): void {
    this.overrides.set(agentType, override);
  }

  /** Clear overrides for an agent */
  clearAgentOverride(agentType: AgentType): void {
    this.overrides.delete(agentType);
  }

  /** Get the resolved model chain for an agent (primary + fallbacks, filtered to available) */
  getModelChain(agentType: AgentType): ModelEntry[] {
    const config = this.getAgentConfig(agentType);
    const allModelIds = [config.primaryModel, ...config.fallbackModels];

    const chain: ModelEntry[] = [];
    for (const modelId of allModelIds) {
      const model = this.catalog.find((m) => m.modelId === modelId);
      if (model && model.available) {
        chain.push(model);
      }
    }
    return chain;
  }

  /** Select the best model based on criteria */
  selectModel(criteria: ModelSelectionCriteria): ModelEntry | null {
    let candidates = this.catalog.filter((m) => m.available);

    if (criteria.excludeProviders?.length) {
      candidates = candidates.filter(
        (m) => !criteria.excludeProviders!.includes(m.provider),
      );
    }

    if (criteria.requiredCapabilities?.length) {
      candidates = candidates.filter((m) =>
        criteria.requiredCapabilities!.every((cap) =>
          m.capabilities.includes(cap),
        ),
      );
    }

    if (candidates.length === 0) return null;

    // Score candidates
    const scored = candidates.map((m) => {
      let score = 0;
      if (criteria.preferCost) {
        // Lower cost = higher score (invert the cost so cheaper is better)
        score -= (m.costPerInputToken + m.costPerOutputToken) * 1_000_000;
      }
      if (criteria.preferQuality) {
        score += m.tier === "premium" ? 3 : m.tier === "standard" ? 2 : 1;
      }
      if (criteria.preferSpeed) {
        score += m.tier === "fast" ? 3 : m.tier === "standard" ? 2 : 1;
      }
      return { model: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].model;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let registryInstance: ModelRegistry | null = null;

export function getModelRegistry(): ModelRegistry {
  if (!registryInstance) {
    registryInstance = new ModelRegistry();
  }
  return registryInstance;
}

/** Reset singleton (for testing) */
export function resetModelRegistry(): void {
  registryInstance = null;
}
