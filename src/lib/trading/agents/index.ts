/**
 * AI Trading Agents — Barrel Exports
 *
 * Re-exports all types, schemas, base class, and concrete agents
 * for the 7-agent trading intelligence system.
 */

export * from "./agent-types";
export { TradingAgent } from "./base-agent";
export type { LLMCallResult } from "./base-agent";
export * from "./agent-schemas";

// Concrete agents
export {
  SentimentAgent,
  createSentimentAgent,
  SENTIMENT_AGENT_CONFIG,
} from "./sentiment-agent";
export {
  RegimeConfirmationAgent,
  createRegimeConfirmationAgent,
  REGIME_CONFIRMATION_AGENT_CONFIG,
} from "./regime-confirmation-agent";
export {
  EarningsAgent,
  createEarningsAgent,
  EARNINGS_AGENT_CONFIG,
} from "./earnings-agent";
export {
  SignalExplainerAgent,
  createSignalExplainerAgent,
  SIGNAL_EXPLAINER_CONFIG,
} from "./signal-explainer-agent";
export {
  RiskNarrativeAgent,
  createRiskNarrativeAgent,
  RISK_NARRATIVE_CONFIG,
} from "./risk-narrative-agent";
export {
  ConsensusArbiterAgent,
  createConsensusArbiterAgent,
  buildAgentVotes,
  CONSENSUS_ARBITER_CONFIG,
} from "./consensus-arbiter-agent";
export {
  NewsImpactAgent,
  createNewsImpactAgent,
  NEWS_IMPACT_AGENT_CONFIG,
} from "./news-impact-agent";
