/**
 * Execution Quality Tracker
 *
 * Tracks per-broker/venue execution metrics: slippage, fill rate,
 * latency, and reject rate. Alerts when slippage exceeds the
 * policy threshold (execution.slippage_threshold_bps).
 */

import { getPolicy } from "@/lib/trading/config";

// ============================================================================
// TYPES
// ============================================================================

export interface FillRecord {
  brokerId: string;
  orderId: string;
  symbol: string;
  expectedPrice: number;
  fillPrice: number;
  /** Latency from order submission to fill acknowledgement, in ms. */
  latencyMs: number;
  filled: boolean;
  timestamp: number;
}

export interface ExecutionMetrics {
  brokerId: string;
  totalOrders: number;
  filledOrders: number;
  rejectedOrders: number;
  avgSlippageBps: number;
  fillRate: number;
  avgLatencyMs: number;
  rejectRate: number;
  maxSlippageBps: number;
  minSlippageBps: number;
}

export interface SlippageAlert {
  brokerId: string;
  orderId: string;
  slippageBps: number;
  thresholdBps: number;
  timestamp: number;
}

// ============================================================================
// QUALITY TRACKER
// ============================================================================

interface BrokerStats {
  slippages: number[];
  latencies: number[];
  fillCount: number;
  rejectCount: number;
  totalCount: number;
}

export class QualityTracker {
  private readonly stats: Map<string, BrokerStats> = new Map();
  private readonly alertListeners: Array<(alert: SlippageAlert) => void> = [];

  /**
   * Subscribe to slippage alerts.
   */
  onSlippageAlert(listener: (alert: SlippageAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const idx = this.alertListeners.indexOf(listener);
      if (idx >= 0) this.alertListeners.splice(idx, 1);
    };
  }

  /**
   * Record a fill (or reject) and compute slippage.
   */
  recordFill(fill: FillRecord): void {
    const bs = this.getOrCreate(fill.brokerId);
    bs.totalCount += 1;

    if (!fill.filled) {
      bs.rejectCount += 1;
      return;
    }

    bs.fillCount += 1;
    bs.latencies.push(fill.latencyMs);

    const slippageBps = this.computeSlippageBps(
      fill.expectedPrice,
      fill.fillPrice,
    );
    bs.slippages.push(slippageBps);

    const threshold = getPolicy().execution.slippage_threshold_bps;
    if (Math.abs(slippageBps) > threshold) {
      const alert: SlippageAlert = {
        brokerId: fill.brokerId,
        orderId: fill.orderId,
        slippageBps,
        thresholdBps: threshold,
        timestamp: fill.timestamp,
      };
      for (const listener of this.alertListeners) {
        listener(alert);
      }
    }
  }

  /**
   * Get aggregated execution metrics for a broker.
   */
  getMetrics(brokerId: string): ExecutionMetrics {
    const bs = this.stats.get(brokerId);

    if (!bs || bs.totalCount === 0) {
      return {
        brokerId,
        totalOrders: 0,
        filledOrders: 0,
        rejectedOrders: 0,
        avgSlippageBps: 0,
        fillRate: 0,
        avgLatencyMs: 0,
        rejectRate: 0,
        maxSlippageBps: 0,
        minSlippageBps: 0,
      };
    }

    const avgSlippage =
      bs.slippages.length > 0
        ? bs.slippages.reduce((a, b) => a + b, 0) / bs.slippages.length
        : 0;

    const avgLatency =
      bs.latencies.length > 0
        ? bs.latencies.reduce((a, b) => a + b, 0) / bs.latencies.length
        : 0;

    return {
      brokerId,
      totalOrders: bs.totalCount,
      filledOrders: bs.fillCount,
      rejectedOrders: bs.rejectCount,
      avgSlippageBps: avgSlippage,
      fillRate: bs.totalCount > 0 ? bs.fillCount / bs.totalCount : 0,
      avgLatencyMs: avgLatency,
      rejectRate: bs.totalCount > 0 ? bs.rejectCount / bs.totalCount : 0,
      maxSlippageBps: bs.slippages.length > 0 ? Math.max(...bs.slippages) : 0,
      minSlippageBps: bs.slippages.length > 0 ? Math.min(...bs.slippages) : 0,
    };
  }

  /**
   * Reset all tracked data for a broker.
   */
  reset(brokerId: string): void {
    this.stats.delete(brokerId);
  }

  /**
   * Reset all tracked data.
   */
  resetAll(): void {
    this.stats.clear();
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private getOrCreate(brokerId: string): BrokerStats {
    let bs = this.stats.get(brokerId);
    if (!bs) {
      bs = {
        slippages: [],
        latencies: [],
        fillCount: 0,
        rejectCount: 0,
        totalCount: 0,
      };
      this.stats.set(brokerId, bs);
    }
    return bs;
  }

  /**
   * Slippage in basis points.
   * Positive = unfavorable (fill worse than expected).
   */
  private computeSlippageBps(expected: number, actual: number): number {
    if (expected === 0) return 0;
    return ((actual - expected) / expected) * 10_000;
  }
}
