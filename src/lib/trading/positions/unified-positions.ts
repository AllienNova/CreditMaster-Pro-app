/**
 * Unified Position Service
 *
 * Aggregates positions across multiple connected brokers into a unified view.
 * Calculates:
 * - Weighted average entry prices across brokers
 * - Total P&L (unrealized and realized)
 * - Portfolio allocation percentages
 * - Per-broker breakdown for each position
 */

import type {
  SupportedBroker,
  Position,
} from "../brokers/broker-interface";
import type { BrokerRouter } from "../brokers/broker-router";

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedPosition {
  symbol: string;
  totalQuantity: number;
  averageEntryPrice: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  brokerBreakdown: Map<SupportedBroker, Position>;
}

// ============================================================================
// UNIFIED POSITION SERVICE
// ============================================================================

export class UnifiedPositionService {
  private readonly router: BrokerRouter;

  constructor(router: BrokerRouter) {
    this.router = router;
  }

  /**
   * Get unified positions across all connected brokers.
   * Positions in the same symbol from different brokers are merged
   * with weighted-average entry prices and summed quantities.
   */
  async getUnifiedPositions(): Promise<UnifiedPosition[]> {
    const allPositions = await this.router.getAllPositions();
    const symbolMap = new Map<string, Map<SupportedBroker, Position>>();

    // Group positions by symbol across brokers
    for (const [brokerType, positions] of allPositions) {
      for (const position of positions) {
        let brokerMap = symbolMap.get(position.symbol);
        if (!brokerMap) {
          brokerMap = new Map();
          symbolMap.set(position.symbol, brokerMap);
        }
        brokerMap.set(brokerType, position);
      }
    }

    // Build unified positions
    const unified: UnifiedPosition[] = [];
    for (const [symbol, brokerMap] of symbolMap) {
      unified.push(this.mergePositions(symbol, brokerMap));
    }

    // Sort by total market value descending
    unified.sort((a, b) => b.totalMarketValue - a.totalMarketValue);

    return unified;
  }

  /**
   * Get a single unified position for a specific symbol.
   * Returns null if the symbol is not held in any broker.
   */
  async getUnifiedPosition(symbol: string): Promise<UnifiedPosition | null> {
    const allPositions = await this.router.getAllPositions();
    const brokerMap = new Map<SupportedBroker, Position>();

    for (const [brokerType, positions] of allPositions) {
      const match = positions.find((p) => p.symbol === symbol);
      if (match) {
        brokerMap.set(brokerType, match);
      }
    }

    if (brokerMap.size === 0) {
      return null;
    }

    return this.mergePositions(symbol, brokerMap);
  }

  /**
   * Get the total portfolio value across all connected brokers.
   */
  async getTotalPortfolioValue(): Promise<number> {
    const allPositions = await this.router.getAllPositions();
    let total = 0;

    for (const [, positions] of allPositions) {
      for (const position of positions) {
        total += position.marketValue;
      }
    }

    return total;
  }

  /**
   * Get portfolio allocation as a map of symbol to percentage of total.
   * Percentages are expressed as decimals (e.g., 0.25 = 25%).
   */
  async getPortfolioAllocation(): Promise<Map<string, number>> {
    const unified = await this.getUnifiedPositions();
    const totalValue = unified.reduce(
      (sum, pos) => sum + pos.totalMarketValue,
      0,
    );

    const allocation = new Map<string, number>();
    if (totalValue === 0) {
      return allocation;
    }

    for (const position of unified) {
      allocation.set(position.symbol, position.totalMarketValue / totalValue);
    }

    return allocation;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private mergePositions(
    symbol: string,
    brokerMap: Map<SupportedBroker, Position>,
  ): UnifiedPosition {
    let totalQuantity = 0;
    let totalCostBasis = 0;
    let totalMarketValue = 0;
    let totalUnrealizedPL = 0;

    for (const position of brokerMap.values()) {
      totalQuantity += position.quantity;
      totalCostBasis += position.costBasis;
      totalMarketValue += position.marketValue;
      totalUnrealizedPL += position.unrealizedPL;
    }

    const averageEntryPrice =
      totalQuantity > 0 ? totalCostBasis / totalQuantity : 0;

    const totalUnrealizedPLPercent =
      totalCostBasis > 0 ? (totalUnrealizedPL / totalCostBasis) * 100 : 0;

    return {
      symbol,
      totalQuantity,
      averageEntryPrice,
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      brokerBreakdown: brokerMap,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createUnifiedPositionService(
  router: BrokerRouter,
): UnifiedPositionService {
  return new UnifiedPositionService(router);
}
