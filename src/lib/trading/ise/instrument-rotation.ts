/**
 * Instrument Rotation Service
 *
 * Manages the Active Trading Set with hysteresis and cooldown rules
 * to prevent thrashing while allowing adaptive rotation.
 */

import type {
  InstrumentRanking,
  ActiveInstrumentSet,
  ActiveInstrumentState,
  RotationConfig,
  RotationEvent,
  RotationDecision,
  RotationEventType,
  UserTier,
} from "./types";
import { DEFAULT_ROTATION_CONFIG } from "./types";

// ============================================================================
// ROTATION STATE
// ============================================================================

export interface RotationState {
  activeSet: Set<string>;
  instrumentStates: Map<string, ActiveInstrumentState>;
  cooldowns: Map<string, number>; // Symbol -> cooldown end timestamp
  lastRotationAt: number;
  rotationCount: number;
}

export function createRotationState(): RotationState {
  return {
    activeSet: new Set(),
    instrumentStates: new Map(),
    cooldowns: new Map(),
    lastRotationAt: Date.now(),
    rotationCount: 0,
  };
}

// ============================================================================
// ROTATION LOGIC
// ============================================================================

/**
 * Evaluate rotation decision based on current rankings and state
 */
export function evaluateRotation(params: {
  rankings: InstrumentRanking[];
  state: RotationState;
  maxActiveSize: number;
  config: RotationConfig;
  nowMs?: number;
}): RotationDecision {
  const { rankings, state, maxActiveSize, config, nowMs = Date.now() } = params;

  const entries: RotationDecision["entries"] = [];
  const exits: RotationDecision["exits"] = [];
  const holds: RotationDecision["holds"] = [];

  // Build score map from rankings
  const scoreMap = new Map<string, number>();
  const rankMap = new Map<string, number>();
  for (let i = 0; i < rankings.length; i++) {
    scoreMap.set(rankings[i].symbol, rankings[i].score);
    rankMap.set(rankings[i].symbol, i + 1);
  }

  // Desired set = top K by score
  const desiredSet = new Set(
    rankings.slice(0, maxActiveSize).map((r) => r.symbol),
  );

  // Find worst score in current active set
  let worstActiveScore = Infinity;
  let worstActiveSymbol = "";
  for (const symbol of state.activeSet) {
    const score = scoreMap.get(symbol) ?? 0;
    if (score < worstActiveScore) {
      worstActiveScore = score;
      worstActiveSymbol = symbol;
    }
  }

  // If active set is empty, worst score is 0
  if (state.activeSet.size === 0) {
    worstActiveScore = 0;
  }

  // === EVALUATE EXITS ===
  for (const symbol of state.activeSet) {
    const score = scoreMap.get(symbol) ?? 0;
    const instState = state.instrumentStates.get(symbol);

    // Skip if not in desired and meets exit criteria
    if (!desiredSet.has(symbol)) {
      // Check dwell time
      const dwellMs = instState ? nowMs - instState.enteredAt.getTime() : 0;
      if (dwellMs < config.minDwellMs) {
        // Still in dwell period, hold
        holds.push({ symbol, score });
        continue;
      }

      // Check hysteresis for exit
      const scoreDrop = (instState?.lastScore ?? score) - score;
      if (scoreDrop > config.deltaExit || !desiredSet.has(symbol)) {
        exits.push({
          symbol,
          score,
          reason: `Dropped from top ${maxActiveSize} (rank ${rankMap.get(symbol) ?? "N/A"})`,
        });
      } else {
        holds.push({ symbol, score });
      }
    } else {
      holds.push({ symbol, score });
    }
  }

  // Limit exits per cycle
  const actualExits = exits.slice(0, config.maxExitsPerCycle);

  // === EVALUATE ENTRIES ===
  const projectedActiveSize = state.activeSet.size - actualExits.length;
  const slotsAvailable = maxActiveSize - projectedActiveSize;

  for (const ranking of rankings) {
    if (entries.length >= Math.min(slotsAvailable, config.maxEntriesPerCycle)) {
      break;
    }

    const { symbol, score } = ranking;

    // Skip if already active
    if (state.activeSet.has(symbol)) continue;

    // Check cooldown
    const cooldownEnd = state.cooldowns.get(symbol) ?? 0;
    if (nowMs < cooldownEnd) {
      continue;
    }

    // Check hysteresis: must beat worst active by delta
    if (score > worstActiveScore + config.deltaEnter) {
      entries.push({
        symbol,
        score,
        reason: `Score ${(score * 100).toFixed(0)}% > threshold ${((worstActiveScore + config.deltaEnter) * 100).toFixed(0)}%`,
      });
    }
  }

  const shouldRotate = entries.length > 0 || actualExits.length > 0;

  return {
    shouldRotate,
    entries,
    exits: actualExits,
    holds,
  };
}

/**
 * Apply rotation decision to state
 */
export function applyRotation(params: {
  decision: RotationDecision;
  state: RotationState;
  config: RotationConfig;
  nowMs?: number;
}): {
  newState: RotationState;
  events: RotationEvent[];
} {
  const { decision, state, config, nowMs = Date.now() } = params;

  const events: RotationEvent[] = [];
  const newActiveSet = new Set(state.activeSet);
  const newInstrumentStates = new Map(state.instrumentStates);
  const newCooldowns = new Map(state.cooldowns);

  const activeSetBefore = [...state.activeSet];

  // Process exits
  for (const exit of decision.exits) {
    newActiveSet.delete(exit.symbol);
    newInstrumentStates.delete(exit.symbol);

    // Set cooldown
    newCooldowns.set(exit.symbol, nowMs + config.cooldownMs);

    events.push({
      id: `rot_${Date.now()}_${exit.symbol}`,
      userId: "", // Will be set by caller
      symbol: exit.symbol,
      instrumentId: "",
      eventType: "exit",
      scoreBefore: state.instrumentStates.get(exit.symbol)?.lastScore,
      scoreAfter: exit.score,
      reason: exit.reason,
      triggerSource: "auto",
      activeSetBefore,
      activeSetAfter: [...newActiveSet],
      timestamp: new Date(nowMs),
    });
  }

  // Process entries
  for (const entry of decision.entries) {
    newActiveSet.add(entry.symbol);
    newInstrumentStates.set(entry.symbol, {
      symbol: entry.symbol,
      enteredAt: new Date(nowMs),
      lastScore: entry.score,
      consecutiveRankings: 1,
      inCooldown: false,
    });

    events.push({
      id: `rot_${Date.now()}_${entry.symbol}`,
      userId: "",
      symbol: entry.symbol,
      instrumentId: "",
      eventType: "enter",
      scoreAfter: entry.score,
      reason: entry.reason,
      triggerSource: "auto",
      activeSetBefore,
      activeSetAfter: [...newActiveSet],
      timestamp: new Date(nowMs),
    });
  }

  // Update scores for holds
  for (const hold of decision.holds) {
    const existing = newInstrumentStates.get(hold.symbol);
    if (existing) {
      existing.lastScore = hold.score;
      existing.consecutiveRankings++;
    }
  }

  // Clean up expired cooldowns
  for (const [symbol, endTime] of newCooldowns) {
    if (nowMs >= endTime) {
      newCooldowns.delete(symbol);
    }
  }

  return {
    newState: {
      activeSet: newActiveSet,
      instrumentStates: newInstrumentStates,
      cooldowns: newCooldowns,
      lastRotationAt: nowMs,
      rotationCount: state.rotationCount + (decision.shouldRotate ? 1 : 0),
    },
    events,
  };
}

// ============================================================================
// ROTATION SERVICE CLASS
// ============================================================================

export class InstrumentRotationService {
  private state: RotationState;
  private config: RotationConfig;
  private maxActiveSize: number;
  private eventLog: RotationEvent[] = [];

  constructor(maxActiveSize: number = 5, config: Partial<RotationConfig> = {}) {
    this.state = createRotationState();
    this.config = { ...DEFAULT_ROTATION_CONFIG, ...config };
    this.maxActiveSize = maxActiveSize;
  }

  /**
   * Process new rankings and update active set
   */
  rotate(rankings: InstrumentRanking[]): RotationDecision {
    const decision = evaluateRotation({
      rankings,
      state: this.state,
      maxActiveSize: this.maxActiveSize,
      config: this.config,
    });

    if (decision.shouldRotate) {
      const { newState, events } = applyRotation({
        decision,
        state: this.state,
        config: this.config,
      });

      this.state = newState;
      this.eventLog.push(...events);

      // Keep only last 1000 events in memory
      if (this.eventLog.length > 1000) {
        this.eventLog = this.eventLog.slice(-1000);
      }
    }

    return decision;
  }

  /**
   * Force add an instrument (manual override)
   */
  forceAdd(symbol: string, reason: string = "Manual addition"): boolean {
    if (this.state.activeSet.size >= this.maxActiveSize) {
      return false;
    }

    const nowMs = Date.now();
    this.state.activeSet.add(symbol);
    this.state.instrumentStates.set(symbol, {
      symbol,
      enteredAt: new Date(nowMs),
      lastScore: 0,
      consecutiveRankings: 0,
      inCooldown: false,
    });

    this.eventLog.push({
      id: `rot_${nowMs}_${symbol}`,
      userId: "",
      symbol,
      instrumentId: "",
      eventType: "enter",
      reason,
      triggerSource: "manual",
      activeSetBefore: [...this.state.activeSet].filter((s) => s !== symbol),
      activeSetAfter: [...this.state.activeSet],
      timestamp: new Date(nowMs),
    });

    return true;
  }

  /**
   * Force remove an instrument (manual override)
   */
  forceRemove(symbol: string, reason: string = "Manual removal"): boolean {
    if (!this.state.activeSet.has(symbol)) {
      return false;
    }

    const nowMs = Date.now();
    const prevState = this.state.instrumentStates.get(symbol);

    this.state.activeSet.delete(symbol);
    this.state.instrumentStates.delete(symbol);
    this.state.cooldowns.set(symbol, nowMs + this.config.cooldownMs);

    this.eventLog.push({
      id: `rot_${nowMs}_${symbol}`,
      userId: "",
      symbol,
      instrumentId: "",
      eventType: "exit",
      scoreBefore: prevState?.lastScore,
      reason,
      triggerSource: "manual",
      activeSetBefore: [...this.state.activeSet, symbol],
      activeSetAfter: [...this.state.activeSet],
      timestamp: new Date(nowMs),
    });

    return true;
  }

  /**
   * Check if symbol is in active set
   */
  isActive(symbol: string): boolean {
    return this.state.activeSet.has(symbol);
  }

  /**
   * Check if symbol is in cooldown
   */
  isInCooldown(symbol: string): boolean {
    const cooldownEnd = this.state.cooldowns.get(symbol) ?? 0;
    return Date.now() < cooldownEnd;
  }

  /**
   * Get cooldown remaining time in ms
   */
  getCooldownRemaining(symbol: string): number {
    const cooldownEnd = this.state.cooldowns.get(symbol) ?? 0;
    return Math.max(0, cooldownEnd - Date.now());
  }

  /**
   * Get current active symbols
   */
  getActiveSymbols(): string[] {
    return [...this.state.activeSet];
  }

  /**
   * Get instrument state
   */
  getInstrumentState(symbol: string): ActiveInstrumentState | undefined {
    return this.state.instrumentStates.get(symbol);
  }

  /**
   * Get recent rotation events
   */
  getRecentEvents(limit: number = 20): RotationEvent[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get full state for persistence
   */
  getState(): RotationState {
    return { ...this.state };
  }

  /**
   * Restore state from persistence
   */
  restoreState(state: RotationState): void {
    this.state = {
      activeSet: new Set(state.activeSet),
      instrumentStates: new Map(state.instrumentStates),
      cooldowns: new Map(state.cooldowns),
      lastRotationAt: state.lastRotationAt,
      rotationCount: state.rotationCount,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RotationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update max active size
   */
  setMaxActiveSize(size: number): void {
    this.maxActiveSize = size;
  }

  /**
   * Reset state (clear everything)
   */
  reset(): void {
    this.state = createRotationState();
    this.eventLog = [];
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createRotationService(
  maxActiveSize: number = 5,
  config?: Partial<RotationConfig>,
): InstrumentRotationService {
  return new InstrumentRotationService(maxActiveSize, config);
}

// ============================================================================
// EXPLANATION
// ============================================================================

/**
 * Generate human-readable explanation for rotation decision
 */
export function explainRotation(decision: RotationDecision): string {
  const parts: string[] = [];

  if (!decision.shouldRotate) {
    parts.push("No rotation needed. Active set unchanged.");
    return parts.join(" ");
  }

  if (decision.entries.length > 0) {
    parts.push(
      `Adding: ${decision.entries.map((e) => `${e.symbol} (${(e.score * 100).toFixed(0)}%)`).join(", ")}.`,
    );
  }

  if (decision.exits.length > 0) {
    parts.push(
      `Removing: ${decision.exits.map((e) => `${e.symbol} (${e.reason})`).join(", ")}.`,
    );
  }

  parts.push(`Holding ${decision.holds.length} instruments.`);

  return parts.join(" ");
}
