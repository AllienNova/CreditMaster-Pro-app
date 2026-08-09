/**
 * Regime Monitor
 *
 * Tracks the current market regime and fires RegimeTransitionEvent when the
 * regime changes. Uses hysteresis: a new regime must be confirmed by
 * CONFIRMATION_BARS consecutive classifications before a transition is
 * committed.
 *
 * The monitor is the only stateful class in the regime module. All other
 * exports are pure functions.
 */

import type { MarketRegime } from "@/lib/trading/config";
import type { RegimeClassification } from "./regime-detector";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Number of consecutive bars in the candidate regime required before
 *  a transition is committed. Prevents whipsaw on noisy boundaries. */
const CONFIRMATION_BARS = 3;

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface RegimeTransitionEvent {
  from: MarketRegime;
  to: MarketRegime;
  timestamp: Date;
  confidence: number;
  trigger: string;
}

// ============================================================================
// REGIME MONITOR
// ============================================================================

export class RegimeMonitor {
  private currentRegime: MarketRegime = "ranging";
  private candidateRegime: MarketRegime | null = null;
  private candidateCount = 0;

  /**
   * Feed a new regime classification into the monitor.
   *
   * Returns a RegimeTransitionEvent if the regime has just changed
   * (after CONFIRMATION_BARS consecutive confirmations), or null
   * if the regime is unchanged / still confirming.
   */
  update(classification: RegimeClassification): RegimeTransitionEvent | null {
    const incoming = classification.regime;

    if (incoming === this.currentRegime) {
      // Same regime — reset any candidate that was building
      this.candidateRegime = null;
      this.candidateCount = 0;
      return null;
    }

    if (incoming === this.candidateRegime) {
      // Continuing to confirm the same candidate
      this.candidateCount++;
    } else {
      // New candidate different from both current and previous candidate
      this.candidateRegime = incoming;
      this.candidateCount = 1;
    }

    if (this.candidateCount >= CONFIRMATION_BARS) {
      const event: RegimeTransitionEvent = {
        from: this.currentRegime,
        to: incoming,
        timestamp: new Date(),
        confidence: classification.confidence,
        trigger: classification.details,
      };

      this.currentRegime = incoming;
      this.candidateRegime = null;
      this.candidateCount = 0;

      this.logTransition(event);
      return event;
    }

    return null;
  }

  getCurrentRegime(): MarketRegime {
    return this.currentRegime;
  }

  /** How many consecutive bars the candidate regime has been confirmed.
   *  Returns 0 when no candidate is pending. */
  getCandidateCount(): number {
    return this.candidateCount;
  }

  /** Reset internal state (useful for testing). */
  reset(initialRegime: MarketRegime = "ranging"): void {
    this.currentRegime = initialRegime;
    this.candidateRegime = null;
    this.candidateCount = 0;
  }

  private logTransition(event: RegimeTransitionEvent): void {
    // Structured log for audit trail — uses console only (no DB writes here;
    // callers integrate with the incident/audit system per Sprint 2)
    console.info(
      JSON.stringify({
        level: "INFO",
        event: "REGIME_TRANSITION",
        from: event.from,
        to: event.to,
        confidence: event.confidence,
        trigger: event.trigger,
        timestamp: event.timestamp.toISOString(),
      }),
    );
  }
}
