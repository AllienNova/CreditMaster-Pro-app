/**
 * Clock Skew Monitor
 *
 * Detects and responds to clock drift between the local system and
 * exchange/NTP timestamps. When skew exceeds policy.execution.clock_skew.max_ms
 * for consecutive_breach_limit consecutive checks, trading is halted.
 * Resumes after resume_after_ok consecutive OK checks.
 *
 * All thresholds from ExecutionPolicy.clock_skew via getPolicy().
 */

import { getPolicy } from "@/lib/trading/config";
import {
  INC_CLOCK_SKEW,
  type CanonicalIncident,
} from "@/lib/trading/incidents/incident-codes";

// ============================================================================
// TYPES
// ============================================================================

export type ClockStatus = "OK" | "BREACH" | "HALTED";

export interface ClockSkewResult {
  status: ClockStatus;
  skewMs: number;
  consecutiveBreaches: number;
  consecutiveOks: number;
  halted: boolean;
  incident: CanonicalIncident | null;
}

export interface ClockEvent {
  status: ClockStatus;
  skewMs: number;
  timestamp: number;
  incident: CanonicalIncident | null;
}

// ============================================================================
// CLOCK MONITOR
// ============================================================================

export class ClockMonitor {
  private consecutiveBreaches = 0;
  private consecutiveOks = 0;
  private halted = false;
  private readonly listeners: Array<(event: ClockEvent) => void> = [];

  /**
   * Subscribe to clock skew events.
   * Returns an unsubscribe function.
   */
  onEvent(listener: (event: ClockEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Check clock skew between the local clock and an exchange/NTP timestamp.
   *
   * @param exchangeTimestamp - Authoritative timestamp in epoch ms
   * @param localNow - Local system time in epoch ms (defaults to Date.now())
   */
  checkClockSkew(
    exchangeTimestamp: number,
    localNow: number = Date.now(),
  ): ClockSkewResult {
    const policy = getPolicy().execution.clock_skew;
    const skewMs = Math.abs(localNow - exchangeTimestamp);

    if (skewMs > policy.max_ms) {
      return this.recordBreach(skewMs, localNow, policy);
    }

    return this.recordOk(skewMs, localNow, policy);
  }

  /**
   * Returns whether trading is currently halted due to clock skew.
   */
  isHalted(): boolean {
    return this.halted;
  }

  /**
   * Force-reset the monitor to OK state (admin override).
   */
  reset(): void {
    this.consecutiveBreaches = 0;
    this.consecutiveOks = 0;
    this.halted = false;
  }

  /** Current consecutive breach count. */
  getConsecutiveBreaches(): number {
    return this.consecutiveBreaches;
  }

  /** Current consecutive OK count. */
  getConsecutiveOks(): number {
    return this.consecutiveOks;
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private recordBreach(
    skewMs: number,
    now: number,
    policy: { consecutive_breach_limit: number; resume_after_ok: number },
  ): ClockSkewResult {
    this.consecutiveBreaches += 1;
    this.consecutiveOks = 0;

    let incident: CanonicalIncident | null = null;

    if (
      !this.halted &&
      this.consecutiveBreaches >= policy.consecutive_breach_limit
    ) {
      this.halted = true;
      incident = INC_CLOCK_SKEW;
    }

    const status: ClockStatus = this.halted ? "HALTED" : "BREACH";

    this.emit({
      status,
      skewMs,
      timestamp: now,
      incident,
    });

    return {
      status,
      skewMs,
      consecutiveBreaches: this.consecutiveBreaches,
      consecutiveOks: this.consecutiveOks,
      halted: this.halted,
      incident,
    };
  }

  private recordOk(
    skewMs: number,
    now: number,
    policy: { consecutive_breach_limit: number; resume_after_ok: number },
  ): ClockSkewResult {
    this.consecutiveOks += 1;
    this.consecutiveBreaches = 0;

    if (this.halted && this.consecutiveOks >= policy.resume_after_ok) {
      this.halted = false;
    }

    this.emit({
      status: this.halted ? "HALTED" : "OK",
      skewMs,
      timestamp: now,
      incident: null,
    });

    return {
      status: this.halted ? "HALTED" : "OK",
      skewMs,
      consecutiveBreaches: this.consecutiveBreaches,
      consecutiveOks: this.consecutiveOks,
      halted: this.halted,
      incident: null,
    };
  }

  private emit(event: ClockEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
