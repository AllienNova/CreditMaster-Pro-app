/**
 * Per-Broker Circuit Breaker
 *
 * State machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 *
 * Transitions:
 *   CLOSED  -> OPEN      : N consecutive rejects within window_seconds
 *   OPEN    -> HALF_OPEN : after probe_after_seconds elapses
 *   HALF_OPEN -> CLOSED  : close_after_successes consecutive OK fills
 *   HALF_OPEN -> OPEN    : any reject
 *
 * All thresholds are sourced from ExecutionPolicy.broker_circuit_breaker
 * via getPolicy().
 */

import { getPolicy } from "@/lib/trading/config";
import {
  INC_BROKER_CIRCUIT_OPEN,
  type CanonicalIncident,
} from "@/lib/trading/incidents/incident-codes";

// ============================================================================
// TYPES
// ============================================================================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitSnapshot {
  brokerId: string;
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  openedAt: number | null;
  lastFailureAt: number | null;
}

export interface CircuitEvent {
  brokerId: string;
  previousState: CircuitState;
  newState: CircuitState;
  timestamp: number;
  incident: CanonicalIncident | null;
}

interface BrokerState {
  state: CircuitState;
  failureTimestamps: number[];
  consecutiveSuccesses: number;
  openedAt: number | null;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export class BrokerCircuitBreaker {
  private readonly brokers: Map<string, BrokerState> = new Map();
  private readonly listeners: Array<(event: CircuitEvent) => void> = [];

  /**
   * Subscribe to state transition events.
   * Returns an unsubscribe function.
   */
  onTransition(listener: (event: CircuitEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Returns true if the broker is allowed to accept new orders.
   * Automatically transitions OPEN -> HALF_OPEN when the probe window elapses.
   */
  canSend(brokerId: string, now: number = Date.now()): boolean {
    const bs = this.getOrCreate(brokerId);

    if (bs.state === "CLOSED") return true;

    if (bs.state === "OPEN") {
      const policy = getPolicy().execution.broker_circuit_breaker;
      const elapsed = now - (bs.openedAt ?? now);
      if (elapsed >= policy.probe_after_seconds * 1_000) {
        this.transitionTo(brokerId, bs, "HALF_OPEN", now);
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow one probe order
    return true;
  }

  /**
   * Record a successful fill/ack for a broker.
   */
  recordSuccess(brokerId: string, now: number = Date.now()): void {
    const bs = this.getOrCreate(brokerId);

    if (bs.state === "CLOSED") {
      // Reset failure window
      bs.failureTimestamps = [];
      return;
    }

    if (bs.state === "HALF_OPEN") {
      bs.consecutiveSuccesses += 1;
      const policy = getPolicy().execution.broker_circuit_breaker;
      if (bs.consecutiveSuccesses >= policy.close_after_successes) {
        this.transitionTo(brokerId, bs, "CLOSED", now);
      }
    }
    // In OPEN state, success is ignored (shouldn't happen unless racing)
  }

  /**
   * Record a reject/failure for a broker.
   */
  recordFailure(brokerId: string, now: number = Date.now()): void {
    const bs = this.getOrCreate(brokerId);

    if (bs.state === "HALF_OPEN") {
      this.transitionTo(brokerId, bs, "OPEN", now);
      return;
    }

    if (bs.state === "OPEN") return;

    // CLOSED: add timestamp and check window
    const policy = getPolicy().execution.broker_circuit_breaker;
    const windowStart = now - policy.window_seconds * 1_000;
    bs.failureTimestamps.push(now);
    bs.failureTimestamps = bs.failureTimestamps.filter((t) => t >= windowStart);

    if (bs.failureTimestamps.length >= policy.consecutive_rejects) {
      this.transitionTo(brokerId, bs, "OPEN", now);
    }
  }

  /**
   * Returns the current circuit state for a broker.
   */
  getState(brokerId: string): CircuitState {
    return this.getOrCreate(brokerId).state;
  }

  /**
   * Returns a full snapshot for a broker.
   */
  getSnapshot(brokerId: string): CircuitSnapshot {
    const bs = this.getOrCreate(brokerId);
    return {
      brokerId,
      state: bs.state,
      consecutiveFailures: bs.failureTimestamps.length,
      consecutiveSuccesses: bs.consecutiveSuccesses,
      openedAt: bs.openedAt,
      lastFailureAt:
        bs.failureTimestamps.length > 0
          ? bs.failureTimestamps[bs.failureTimestamps.length - 1]
          : null,
    };
  }

  /**
   * Resets a broker back to CLOSED (for testing / admin override).
   */
  reset(brokerId: string): void {
    this.brokers.delete(brokerId);
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private getOrCreate(brokerId: string): BrokerState {
    let bs = this.brokers.get(brokerId);
    if (!bs) {
      bs = {
        state: "CLOSED",
        failureTimestamps: [],
        consecutiveSuccesses: 0,
        openedAt: null,
      };
      this.brokers.set(brokerId, bs);
    }
    return bs;
  }

  private transitionTo(
    brokerId: string,
    bs: BrokerState,
    newState: CircuitState,
    now: number,
  ): void {
    const previousState = bs.state;
    bs.state = newState;

    if (newState === "OPEN") {
      bs.openedAt = now;
      bs.consecutiveSuccesses = 0;
    } else if (newState === "CLOSED") {
      bs.failureTimestamps = [];
      bs.consecutiveSuccesses = 0;
      bs.openedAt = null;
    } else if (newState === "HALF_OPEN") {
      bs.consecutiveSuccesses = 0;
    }

    const incident: CanonicalIncident | null =
      newState === "OPEN" ? INC_BROKER_CIRCUIT_OPEN : null;

    const event: CircuitEvent = {
      brokerId,
      previousState,
      newState,
      timestamp: now,
      incident,
    };

    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
