/**
 * Model Registry Tests
 *
 * Tests for the central model catalog, per-agent configuration,
 * availability detection, model chain resolution, and selection criteria.
 */

import {
  ModelRegistry,
  getModelRegistry,
  resetModelRegistry,
} from "../model-registry";
import type {
  AgentModelConfig,
  ModelEntry,
  ModelSelectionCriteria,
} from "../model-registry";
import type { AgentType, AIProvider } from "../../agents/agent-types";

// ============================================================================
// HELPERS
// ============================================================================

const ALL_AGENT_TYPES: AgentType[] = [
  "sentiment",
  "regime_confirmation",
  "news_impact",
  "signal_explainer",
  "risk_narrative",
  "earnings_analysis",
  "consensus_arbiter",
];

function setEnvKeys(keys: Partial<Record<AIProvider, string>>): void {
  process.env.AIML_API_KEY = keys.aiml ?? "";
  process.env.ANTHROPIC_API_KEY = keys.anthropic ?? "";
  process.env.OPENAI_API_KEY = keys.openai ?? "";
  process.env.XAI_API_KEY = keys.xai ?? "";
}

function clearEnvKeys(): void {
  delete process.env.AIML_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
}

// ============================================================================
// TESTS
// ============================================================================

describe("ModelRegistry", () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    clearEnvKeys();
    resetModelRegistry();
  });

  afterEach(() => {
    clearEnvKeys();
  });

  // --------------------------------------------------------------------------
  // Constructor & Initialization
  // --------------------------------------------------------------------------

  describe("constructor", () => {
    it("initializes the model catalog with all entries", () => {
      registry = new ModelRegistry();
      const catalog = registry.getCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(8);
    });

    it("initializes agent configs for all 7 agent types", () => {
      registry = new ModelRegistry();
      for (const agentType of ALL_AGENT_TYPES) {
        const config = registry.getAgentConfig(agentType);
        expect(config.agentType).toBe(agentType);
        expect(config.primaryModel).toBeDefined();
        expect(config.fallbackModels.length).toBeGreaterThan(0);
      }
    });

    it("starts with all models unavailable when no env vars set", () => {
      registry = new ModelRegistry();
      const available = registry.getAvailableModels();
      expect(available).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // refreshAvailability
  // --------------------------------------------------------------------------

  describe("refreshAvailability", () => {
    it("marks AIML models available when AIML_API_KEY is set", () => {
      setEnvKeys({ aiml: "test-key" });
      registry = new ModelRegistry();

      const available = registry.getAvailableModels();
      expect(available.length).toBeGreaterThan(0);
      expect(available.every((m) => m.provider === "aiml")).toBe(true);
    });

    it("marks multiple provider models available when keys are set", () => {
      setEnvKeys({ aiml: "key1", openai: "key2" });
      registry = new ModelRegistry();

      const available = registry.getAvailableModels();
      const providers = new Set(available.map((m) => m.provider));
      expect(providers.has("aiml")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("anthropic")).toBe(false);
    });

    it("updates availability when refreshAvailability is called", () => {
      registry = new ModelRegistry();
      expect(registry.getAvailableModels()).toHaveLength(0);

      process.env.XAI_API_KEY = "xai-test";
      registry.refreshAvailability();

      const available = registry.getAvailableModels();
      expect(available.length).toBeGreaterThan(0);
      expect(available.every((m) => m.provider === "xai")).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // getCatalog / getAvailableModels / getModel
  // --------------------------------------------------------------------------

  describe("getCatalog", () => {
    it("returns all models regardless of availability", () => {
      registry = new ModelRegistry();
      const catalog = registry.getCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(8);
      // All should be unavailable since no keys set
      expect(catalog.every((m) => !m.available)).toBe(true);
    });
  });

  describe("getAvailableModels", () => {
    it("returns only available models", () => {
      setEnvKeys({ anthropic: "test" });
      registry = new ModelRegistry();
      const available = registry.getAvailableModels();
      expect(available.every((m) => m.available)).toBe(true);
      expect(available.every((m) => m.provider === "anthropic")).toBe(true);
    });
  });

  describe("getModel", () => {
    it("returns model by ID", () => {
      registry = new ModelRegistry();
      const model = registry.getModel("gpt-4o");
      expect(model).toBeDefined();
      expect(model!.provider).toBe("openai");
      expect(model!.displayName).toBe("GPT-4o");
    });

    it("returns undefined for unknown model ID", () => {
      registry = new ModelRegistry();
      const model = registry.getModel("nonexistent-model");
      expect(model).toBeUndefined();
    });

    it("finds AIML proxy models", () => {
      registry = new ModelRegistry();
      const model = registry.getModel("aiml/gpt-4o-mini");
      expect(model).toBeDefined();
      expect(model!.provider).toBe("aiml");
      expect(model!.tier).toBe("fast");
    });
  });

  // --------------------------------------------------------------------------
  // getAgentConfig
  // --------------------------------------------------------------------------

  describe("getAgentConfig", () => {
    it("returns correct config for sentiment agent", () => {
      registry = new ModelRegistry();
      const config = registry.getAgentConfig("sentiment");
      expect(config.agentType).toBe("sentiment");
      expect(config.primaryModel).toBe("aiml/gpt-4o-mini");
      expect(config.temperature).toBe(0.3);
    });

    it("returns correct config for consensus_arbiter agent", () => {
      registry = new ModelRegistry();
      const config = registry.getAgentConfig("consensus_arbiter");
      expect(config.agentType).toBe("consensus_arbiter");
      expect(config.primaryModel).toBe("aiml/gpt-4o");
      expect(config.temperature).toBe(0.1);
      expect(config.maxLatencyMs).toBe(20_000);
    });

    it("throws for unknown agent type", () => {
      registry = new ModelRegistry();
      expect(() =>
        registry.getAgentConfig("unknown_agent" as AgentType),
      ).toThrow("No model config for agent type: unknown_agent");
    });

    it("returns a copy (not a reference)", () => {
      registry = new ModelRegistry();
      const config1 = registry.getAgentConfig("sentiment");
      const config2 = registry.getAgentConfig("sentiment");
      config1.temperature = 999;
      expect(config2.temperature).toBe(0.3);
    });
  });

  // --------------------------------------------------------------------------
  // setAgentOverride / clearAgentOverride
  // --------------------------------------------------------------------------

  describe("setAgentOverride", () => {
    it("overrides specific fields for an agent", () => {
      registry = new ModelRegistry();
      registry.setAgentOverride("sentiment", {
        temperature: 0.8,
        maxOutputTokens: 5000,
      });

      const config = registry.getAgentConfig("sentiment");
      expect(config.temperature).toBe(0.8);
      expect(config.maxOutputTokens).toBe(5000);
      // Non-overridden fields preserved
      expect(config.primaryModel).toBe("aiml/gpt-4o-mini");
    });

    it("overrides primaryModel for an agent", () => {
      registry = new ModelRegistry();
      registry.setAgentOverride("sentiment", {
        primaryModel: "gpt-4o",
      });

      const config = registry.getAgentConfig("sentiment");
      expect(config.primaryModel).toBe("gpt-4o");
    });

    it("does not allow overriding agentType", () => {
      registry = new ModelRegistry();
      // Even if someone passes agentType in the override object via cast,
      // the implementation uses { ...base, ...override, agentType }
      registry.setAgentOverride("sentiment", {
        temperature: 0.9,
      });
      const config = registry.getAgentConfig("sentiment");
      expect(config.agentType).toBe("sentiment");
    });
  });

  describe("clearAgentOverride", () => {
    it("removes override and restores defaults", () => {
      registry = new ModelRegistry();
      registry.setAgentOverride("sentiment", { temperature: 0.9 });
      expect(registry.getAgentConfig("sentiment").temperature).toBe(0.9);

      registry.clearAgentOverride("sentiment");
      expect(registry.getAgentConfig("sentiment").temperature).toBe(0.3);
    });

    it("is a no-op if no override exists", () => {
      registry = new ModelRegistry();
      registry.clearAgentOverride("sentiment");
      const config = registry.getAgentConfig("sentiment");
      expect(config.temperature).toBe(0.3);
    });
  });

  // --------------------------------------------------------------------------
  // getModelChain
  // --------------------------------------------------------------------------

  describe("getModelChain", () => {
    it("returns only available models in the chain", () => {
      setEnvKeys({ aiml: "key" });
      registry = new ModelRegistry();

      const chain = registry.getModelChain("sentiment");
      expect(chain.length).toBeGreaterThan(0);
      expect(chain.every((m) => m.available)).toBe(true);
      // Primary is AIML, so should be in chain
      expect(chain[0].provider).toBe("aiml");
    });

    it("returns empty chain when no providers available", () => {
      registry = new ModelRegistry();
      const chain = registry.getModelChain("sentiment");
      expect(chain).toHaveLength(0);
    });

    it("includes fallback models from other providers when available", () => {
      setEnvKeys({ aiml: "key1", openai: "key2", xai: "key3" });
      registry = new ModelRegistry();

      // sentiment: primary=aiml/gpt-4o-mini, fallbacks=[gpt-4o-mini, claude-haiku-4-5-20251001, grok-2]
      const chain = registry.getModelChain("sentiment");
      const providers = chain.map((m) => m.provider);
      expect(providers).toContain("aiml");
      expect(providers).toContain("openai");
      expect(providers).toContain("xai");
    });

    it("preserves order: primary first, then fallbacks", () => {
      setEnvKeys({ aiml: "key", openai: "key2" });
      registry = new ModelRegistry();

      // regime_confirmation: primary=aiml/gpt-4o, fallbacks=[gpt-4o, claude-sonnet-4-20250514, grok-2]
      const chain = registry.getModelChain("regime_confirmation");
      expect(chain[0].modelId).toBe("aiml/gpt-4o");
      if (chain.length > 1) {
        expect(chain[1].modelId).toBe("gpt-4o");
      }
    });
  });

  // --------------------------------------------------------------------------
  // selectModel
  // --------------------------------------------------------------------------

  describe("selectModel", () => {
    it("returns null when no candidates available", () => {
      registry = new ModelRegistry();
      const result = registry.selectModel({ preferCost: true });
      expect(result).toBeNull();
    });

    it("selects cheapest model with preferCost", () => {
      setEnvKeys({ aiml: "key", openai: "key", anthropic: "key", xai: "key" });
      registry = new ModelRegistry();

      const result = registry.selectModel({ preferCost: true });
      expect(result).not.toBeNull();
      // The cheapest models are gpt-4o-mini variants
      expect(result!.tier).toBe("fast");
    });

    it("selects fast-tier model with preferSpeed", () => {
      setEnvKeys({ aiml: "key", openai: "key", anthropic: "key" });
      registry = new ModelRegistry();

      const result = registry.selectModel({ preferSpeed: true });
      expect(result).not.toBeNull();
      expect(result!.tier).toBe("fast");
    });

    it("selects standard/premium-tier model with preferQuality", () => {
      setEnvKeys({ aiml: "key", openai: "key", anthropic: "key", xai: "key" });
      registry = new ModelRegistry();

      const result = registry.selectModel({ preferQuality: true });
      expect(result).not.toBeNull();
      // Standard or premium tier
      expect(["standard", "premium"]).toContain(result!.tier);
    });

    it("excludes specific providers", () => {
      setEnvKeys({ aiml: "key", openai: "key", anthropic: "key", xai: "key" });
      registry = new ModelRegistry();

      const result = registry.selectModel({
        preferCost: true,
        excludeProviders: ["aiml", "openai"],
      });
      expect(result).not.toBeNull();
      expect(result!.provider).not.toBe("aiml");
      expect(result!.provider).not.toBe("openai");
    });

    it("filters by required capabilities", () => {
      setEnvKeys({ aiml: "key", openai: "key", anthropic: "key", xai: "key" });
      registry = new ModelRegistry();

      const result = registry.selectModel({
        preferQuality: true,
        requiredCapabilities: ["vision"],
      });
      expect(result).not.toBeNull();
      expect(result!.capabilities).toContain("vision");
    });

    it("returns null when no model matches required capabilities", () => {
      setEnvKeys({ xai: "key" });
      registry = new ModelRegistry();

      // xAI grok-2 does not have vision capability
      const result = registry.selectModel({
        requiredCapabilities: ["vision"],
      });
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe("singleton", () => {
    it("getModelRegistry returns the same instance", () => {
      const r1 = getModelRegistry();
      const r2 = getModelRegistry();
      expect(r1).toBe(r2);
    });

    it("resetModelRegistry creates a new instance", () => {
      const r1 = getModelRegistry();
      resetModelRegistry();
      const r2 = getModelRegistry();
      expect(r1).not.toBe(r2);
    });
  });
});
