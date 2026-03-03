/**
 * AI Trading Infrastructure
 *
 * Model registry, provider fallback, and degradation management
 * for the PCTT 7-agent trading intelligence system.
 */

// Model Registry
export {
  ModelRegistry,
  getModelRegistry,
  resetModelRegistry,
} from "./model-registry";

export type {
  ModelEntry,
  AgentModelConfig,
  ModelSelectionCriteria,
} from "./model-registry";

// Provider Fallback
export {
  ProviderFallbackManager,
  getProviderFallbackManager,
  resetProviderFallbackManager,
} from "./provider-fallback";

export type {
  ProviderConfig,
  LLMRequest,
  LLMResponse,
  ProviderCircuitBreaker,
  ProviderHealthStatus,
} from "./provider-fallback";

// Degradation Manager
export {
  DegradationManager,
  getDegradationManager,
  resetDegradationManager,
} from "./degradation-manager";

export type {
  DegradationLevel,
  DegradationState,
  DegradationEvent,
} from "./degradation-manager";

// Re-export shared types from agent-types for consumers
export type { AgentType, AIProvider } from "../agents/agent-types";
