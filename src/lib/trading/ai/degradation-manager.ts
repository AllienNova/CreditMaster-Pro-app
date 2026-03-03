/**
 * Degradation Manager
 *
 * 5-level degradation system for trading AI services.
 * Automatically reduces service level when providers are unhealthy.
 *
 * Level 1 (FULL):      All agents active, all providers available
 * Level 2 (REDUCED):   Non-critical agents disabled, primary provider only
 * Level 3 (MINIMAL):   Only consensus + risk agents, fallback providers
 * Level 4 (RULE_ONLY): No AI agents, rule-based engine only
 * Level 5 (HALT):      All trading signals paused, manual only
 */

import type { AIProvider } from "../agents/agent-types";
import type { AgentType } from "../agents/agent-types";

// Re-export for convenience
export type { AgentType, AIProvider };

// ============================================================================
// TYPES
// ============================================================================

export type DegradationLevel = 1 | 2 | 3 | 4 | 5;

export interface DegradationState {
  level: DegradationLevel;
  levelName: string;
  activeAgents: AgentType[];
  disabledAgents: AgentType[];
  reason: string;
  since: string;
  autoRecoveryEnabled: boolean;
}

export interface DegradationEvent {
  fromLevel: DegradationLevel;
  toLevel: DegradationLevel;
  reason: string;
  timestamp: string;
  providerHealth: Record<AIProvider, boolean>;
}

// ============================================================================
// AGENT CRITICALITY TIERS
// ============================================================================

const CRITICAL_AGENTS: AgentType[] = [
  "consensus_arbiter",
  "risk_narrative",
  "regime_confirmation",
];

const STANDARD_AGENTS: AgentType[] = [
  "sentiment",
  "signal_explainer",
  "earnings_analysis",
];

const OPTIONAL_AGENTS: AgentType[] = ["news_impact"];

const ALL_AGENTS: AgentType[] = [
  ...CRITICAL_AGENTS,
  ...STANDARD_AGENTS,
  ...OPTIONAL_AGENTS,
];

// ============================================================================
// LEVEL CONFIGURATION
// ============================================================================

const LEVEL_NAMES: Record<DegradationLevel, string> = {
  1: "FULL",
  2: "REDUCED",
  3: "MINIMAL",
  4: "RULE_ONLY",
  5: "HALT",
};

const LEVEL_AGENTS: Record<DegradationLevel, AgentType[]> = {
  1: ALL_AGENTS,
  2: [...CRITICAL_AGENTS, ...STANDARD_AGENTS],
  3: CRITICAL_AGENTS,
  4: [],
  5: [],
};

// ============================================================================
// DEGRADATION MANAGER CLASS
// ============================================================================

export class DegradationManager {
  private currentLevel: DegradationLevel;
  private reason: string;
  private since: string;
  private autoRecoveryEnabled: boolean;
  private eventHistory: DegradationEvent[];
  private maxHistorySize: number;

  constructor() {
    this.currentLevel = 1;
    this.reason = "System nominal";
    this.since = new Date().toISOString();
    this.autoRecoveryEnabled = true;
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /** Get current degradation state */
  getState(): DegradationState {
    const activeAgents = LEVEL_AGENTS[this.currentLevel];
    const disabledAgents = ALL_AGENTS.filter(
      (a) => !activeAgents.includes(a),
    );

    return {
      level: this.currentLevel,
      levelName: LEVEL_NAMES[this.currentLevel],
      activeAgents: [...activeAgents],
      disabledAgents,
      reason: this.reason,
      since: this.since,
      autoRecoveryEnabled: this.autoRecoveryEnabled,
    };
  }

  /** Check if a specific agent is active at the current level */
  isAgentActive(agentType: AgentType): boolean {
    return LEVEL_AGENTS[this.currentLevel].includes(agentType);
  }

  /** Get current degradation level */
  getLevel(): DegradationLevel {
    return this.currentLevel;
  }

  /** Set degradation level manually */
  setLevel(level: DegradationLevel, reason: string): void {
    if (level === this.currentLevel) return;

    const event: DegradationEvent = {
      fromLevel: this.currentLevel,
      toLevel: level,
      reason,
      timestamp: new Date().toISOString(),
      providerHealth: {
        aiml: true,
        anthropic: true,
        openai: true,
        xai: true,
      },
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this.currentLevel = level;
    this.reason = reason;
    this.since = new Date().toISOString();
  }

  /**
   * Evaluate degradation level based on provider health.
   * Call this after provider failures to auto-adjust.
   */
  evaluateHealth(
    providerHealth: Record<AIProvider, boolean>,
  ): DegradationLevel {
    const availableCount =
      Object.values(providerHealth).filter(Boolean).length;
    const primaryAvailable = providerHealth.aiml;

    let newLevel: DegradationLevel;
    let reason: string;

    if (availableCount >= 3 && primaryAvailable) {
      newLevel = 1;
      reason = "All providers healthy";
    } else if (availableCount >= 2) {
      newLevel = 2;
      reason = `${4 - availableCount} provider(s) unavailable`;
    } else if (availableCount === 1) {
      newLevel = 3;
      reason = "Only one provider available -- minimal AI mode";
    } else {
      newLevel = 4;
      reason = "No AI providers available -- rule-based only";
    }

    if (this.autoRecoveryEnabled || newLevel > this.currentLevel) {
      this.setLevel(newLevel, reason);
    }

    return this.currentLevel;
  }

  /** Enable or disable auto-recovery */
  setAutoRecovery(enabled: boolean): void {
    this.autoRecoveryEnabled = enabled;
  }

  /** Force halt (level 5) -- manual override */
  halt(reason: string): void {
    this.setLevel(5, reason);
    this.autoRecoveryEnabled = false;
  }

  /** Resume from halt -- manually restore to level 1 */
  resume(): void {
    this.autoRecoveryEnabled = true;
    this.setLevel(1, "Manual resume from halt");
  }

  /** Get event history */
  getHistory(): readonly DegradationEvent[] {
    return this.eventHistory;
  }

  /** Clear event history */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let degradationInstance: DegradationManager | null = null;

export function getDegradationManager(): DegradationManager {
  if (!degradationInstance) {
    degradationInstance = new DegradationManager();
  }
  return degradationInstance;
}

export function resetDegradationManager(): void {
  degradationInstance = null;
}
