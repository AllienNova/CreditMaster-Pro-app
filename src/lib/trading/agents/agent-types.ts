/**
 * AI Trading Agent Types
 *
 * Type definitions for the 7-agent trading intelligence system.
 * Each agent receives market context, calls an LLM, validates
 * the response with Zod, and returns a typed decision.
 */

import type { z } from "zod";
import type { OperatingMode } from "../modes/mode-types";

// ============================================================================
// AGENT IDENTIFICATION
// ============================================================================

/** The 7 AI agent types in the PCTT trading system */
export type AgentType =
  | "sentiment"
  | "regime_confirmation"
  | "news_impact"
  | "signal_explainer"
  | "risk_narrative"
  | "earnings_analysis"
  | "consensus_arbiter";

/** Supported AI providers for LLM calls */
export type AIProvider = "aiml" | "anthropic" | "openai" | "xai";

/** Agent decision bias direction */
export type AgentBias = "bullish" | "bearish" | "neutral";

/** Confidence level categories */
export type ConfidenceLevel =
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high";

// ============================================================================
// AGENT INPUT
// ============================================================================

/** Context passed to every agent on execution */
export interface AgentContext {
  /** Trading symbol (e.g., "AAPL") */
  symbol: string;
  /** Optional signal ID from PCTT pipeline */
  signalId?: string;
  /** User ID for logging and personalization */
  userId: string;
  /** Current operating mode (WATCH / GUIDED / AUTONOMOUS) */
  operatingMode: OperatingMode;
  /** Current market price */
  currentPrice: number;
  /** 24-hour price change percentage */
  priceChange24h?: number;
  /** 24-hour trading volume */
  volume24h?: number;
  /** Signal type from PCTT pipeline */
  signalType?: "buy" | "sell" | "hold";
  /** Signal strength (0-100) */
  signalStrength?: number;
  /** Detected market regime */
  regimeType?: string;
  /** Agent-specific additional context */
  additionalContext?: Record<string, unknown>;
}

// ============================================================================
// AGENT DECISIONS
// ============================================================================

/** Base decision all agents return (plus their specific fields) */
export interface BaseAgentDecision {
  agentType: AgentType;
  bias: AgentBias;
  confidence: number; // 0-1
  confidenceLevel: ConfidenceLevel;
  reasoning: string;
  timestamp: string;
}

/** Sentiment Agent output */
export interface SentimentDecision extends BaseAgentDecision {
  agentType: "sentiment";
  sentimentScore: number; // -1 to 1
  sources: string[];
  keyPhrases: string[];
}

/** RegimeConfirmation Agent output */
export interface RegimeConfirmationDecision extends BaseAgentDecision {
  agentType: "regime_confirmation";
  confirmedRegime: string;
  regimeConfidence: number;
  alternativeRegimes: Array<{ regime: string; probability: number }>;
}

/** NewsImpact Agent output */
export interface NewsImpactDecision extends BaseAgentDecision {
  agentType: "news_impact";
  impactScore: number; // -1 to 1
  impactTimeframe: "immediate" | "short_term" | "medium_term" | "long_term";
  catalysts: string[];
  risks: string[];
}

/** SignalExplainer Agent output */
export interface SignalExplainerDecision extends BaseAgentDecision {
  agentType: "signal_explainer";
  explanation: string;
  factors: Array<{ name: string; impact: number; description: string }>;
  suggestedAction: "buy" | "sell" | "hold" | "reduce";
}

/** RiskNarrative Agent output */
export interface RiskNarrativeDecision extends BaseAgentDecision {
  agentType: "risk_narrative";
  riskLevel: "low" | "medium" | "high" | "extreme";
  riskScore: number; // 0-100
  narrativeSummary: string;
  keyRisks: Array<{ risk: string; severity: number; mitigation: string }>;
}

/** Earnings Agent output */
export interface EarningsDecision extends BaseAgentDecision {
  agentType: "earnings_analysis";
  earningsSurprise: number | null; // percentage
  revenueGrowth: number | null;
  guidanceDirection:
    | "raised"
    | "maintained"
    | "lowered"
    | "withdrawn"
    | "none";
  keyMetrics: Array<{ metric: string; value: string; vsExpected: string }>;
}

/** ConsensusArbiter output (aggregates all other agents) */
export interface ConsensusDecision extends BaseAgentDecision {
  agentType: "consensus_arbiter";
  agentVotes: Array<{
    agentType: AgentType;
    bias: AgentBias;
    confidence: number;
    weight: number;
  }>;
  consensusBias: AgentBias;
  consensusStrength: number; // 0-1
  dissent: boolean;
  dissentingAgents: AgentType[];
  recommendation: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
}

/** Union of all agent decisions */
export type AgentDecision =
  | SentimentDecision
  | RegimeConfirmationDecision
  | NewsImpactDecision
  | SignalExplainerDecision
  | RiskNarrativeDecision
  | EarningsDecision
  | ConsensusDecision;

// ============================================================================
// AGENT METRICS
// ============================================================================

/** Execution metrics for a single agent call */
export interface AgentMetrics {
  latencyMs: number;
  tokenCount: number;
  costUsd: number;
  provider: AIProvider;
  model: string;
  fallbackUsed: boolean;
  fallbackChain?: AIProvider[];
  validationPassed: boolean;
  validationErrors?: string[];
}

// ============================================================================
// AGENT RESULT
// ============================================================================

/** Result of agent execution: decision + metrics + success/error */
export interface AgentResult<T extends BaseAgentDecision = BaseAgentDecision> {
  success: boolean;
  decision?: T;
  metrics: AgentMetrics;
  error?: string;
}

// ============================================================================
// AGENT LOG ENTRY (matches DB schema)
// ============================================================================

/** Log entry for persisting agent execution to trading_agent_logs table */
export interface AgentLogEntry {
  userId: string;
  signalId?: string;
  agentType: AgentType;
  decision: Record<string, unknown>;
  confidence: number;
  provider: AIProvider;
  model: string;
  fallbackUsed: boolean;
  fallbackChain?: AIProvider[];
  latencyMs: number;
  tokenCount: number;
  costUsd: number;
  validationPassed: boolean;
  validationErrors?: string[];
  symbol?: string;
  operatingMode?: OperatingMode;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

/** Configuration for a single trading agent */
export interface AgentConfig {
  /** Agent type identifier */
  agentType: AgentType;
  /** Display name */
  name: string;
  /** Description of what this agent does */
  description: string;
  /** Default model to use */
  defaultModel: string;
  /** Default provider */
  defaultProvider: AIProvider;
  /** Maximum latency before timeout (ms) */
  maxLatencyMs: number;
  /** Maximum retries on failure */
  maxRetries: number;
  /** Whether this agent is required for consensus */
  requiredForConsensus: boolean;
  /** Weight in consensus voting (0-1) */
  consensusWeight: number;
  /** Zod schema for validating the LLM response */
  responseSchema: z.ZodType;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/** Runtime state of an agent's circuit breaker */
export interface AgentCircuitBreaker {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  halfOpenAttempts: number;
}

/** Configuration for agent circuit breaker behavior */
export interface AgentCircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time window for counting failures (ms) */
  failureWindowMs: number;
  /** How long the circuit stays open before half-open (ms) */
  resetTimeoutMs: number;
  /** Max half-open attempts before re-opening */
  halfOpenMaxAttempts: number;
}

/** Default circuit breaker configuration */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: AgentCircuitBreakerConfig = {
  failureThreshold: 3,
  failureWindowMs: 60_000, // 1 minute
  resetTimeoutMs: 30_000, // 30 seconds
  halfOpenMaxAttempts: 1,
};

// ============================================================================
// CONFIDENCE UTILITIES
// ============================================================================

/** Threshold ranges for each confidence level [min, max) */
export const CONFIDENCE_THRESHOLDS: Record<ConfidenceLevel, [number, number]> =
  {
    very_low: [0, 0.2],
    low: [0.2, 0.4],
    medium: [0.4, 0.6],
    high: [0.6, 0.8],
    very_high: [0.8, 1.0],
  };

/** Map a numeric confidence (0-1) to a named level */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "very_high";
  if (confidence >= 0.6) return "high";
  if (confidence >= 0.4) return "medium";
  if (confidence >= 0.2) return "low";
  return "very_low";
}
