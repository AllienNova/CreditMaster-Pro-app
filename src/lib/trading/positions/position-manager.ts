/**
 * Position Management System
 *
 * Handles position tracking, P&L calculation, and portfolio state:
 * - Real-time position tracking
 * - P&L calculation (unrealized and realized)
 * - Position reconciliation with broker
 * - Trade journaling
 * - Portfolio exposure analysis
 */

/**
 * Service-role client, NOT the request-scoped `createClient()`.
 *
 * `positions` deliberately grants `authenticated` no table privilege — see
 * supabase/migrations/20260731000009_financial_accounts_revoke_authenticated.sql,
 * which documents the decision: a role with no grant gets a loud 42501 rather
 * than a silent empty read, and silent-empty was the defect class that made
 * financial pages render $0 with nothing to log. Every real read in this
 * codebase goes through the service role with explicit `user_id` scoping.
 *
 * This module was still on the session client, so every call hit
 * `permission denied for table positions` and /api/trading/positions,
 * /api/trading/orders and /api/trading/risk all returned 500. The 42501 was
 * the schema working as designed; the module was on the wrong side of it.
 *
 * Because the service role BYPASSES RLS, the `.eq("user_id", …)` in
 * loadPositions and the `user_id` written by persistPosition are now the only
 * thing separating one user's positions from another's. Do not remove them.
 */
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { logger } from "@/lib/monitoring/logger";
import {
  Position,
  PositionSide,
  PositionStatus,
  PositionClose,
  PositionSummary,
  PositionFilter,
  TradeRecord,
  PositionManagerConfig,
  DEFAULT_POSITION_MANAGER_CONFIG,
} from "./position-types";
import { Order, Fill } from "../orders/order-types";

// ============================================================================
// DB ROW TYPE (positions table — supabase/migrations/20260731000000_trading_orders_positions.sql)
// ============================================================================
//
// Same rationale as OrderRow in ../orders/order-manager.ts: src/lib/supabase/
// types.ts doesn't model this table (owned by a separate slice), which
// degrades `.upsert()`'s argument type to `never` even though `.from()`
// itself accepts any string. This narrows the query builder locally.
// PositionRow mirrors the migration's columns exactly.
interface PositionRow {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  cost_basis: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_pl_percent: number;
  realized_pl: number;
  total_pl: number;
  stop_loss_price?: number;
  take_profit_price?: number;
  risk_amount?: number;
  risk_percent?: number;
  strategy_id?: string;
  signal_id?: string;
  opened_at: string;
  last_updated_at: string;
  closed_at?: string;
  status: PositionStatus;
  exchange?: string;
  asset_class?: string;
  notes?: string;
}

interface PositionsTableClient {
  upsert(
    row: PositionRow,
  ): Promise<{ error: { message: string; code?: string } | null }>;
}

// ============================================================================
// POSITION MANAGER CLASS
// ============================================================================

export class PositionManager {
  private readonly config: PositionManagerConfig;
  private readonly positions: Map<string, Position> = new Map();
  private readonly positionsBySymbol: Map<string, string> = new Map(); // symbol -> positionId
  private readonly trades: TradeRecord[] = [];
  private readonly priceCache: Map<string, number> = new Map();
  private accountEquity: number = 0;

  constructor(config: Partial<PositionManagerConfig> = {}) {
    this.config = { ...DEFAULT_POSITION_MANAGER_CONFIG, ...config };
  }

  // ==========================================================================
  // POSITION LIFECYCLE
  // ==========================================================================

  async openPosition(
    fill: Fill,
    order: Order,
    userId: string,
    accountId: string,
  ): Promise<Position> {
    // Check if position already exists for this symbol
    const existingPositionId = this.positionsBySymbol.get(fill.symbol);

    if (existingPositionId) {
      // Add to existing position
      return this.addToPosition(existingPositionId, fill, order);
    }

    // Create new position
    const position: Position = {
      id: this.generatePositionId(),
      userId,
      accountId,
      symbol: fill.symbol,
      side: order.side === "buy" ? "long" : "short",
      quantity: fill.quantity,
      avgEntryPrice: fill.price,
      currentPrice: fill.price,
      costBasis: fill.quantity * fill.price,
      marketValue: fill.quantity * fill.price,
      unrealizedPL: 0,
      unrealizedPLPercent: 0,
      realizedPL: 0,
      totalPL: 0,
      stopLossPrice: order.stopLossPrice,
      takeProfitPrice: order.takeProfitPrice,
      strategyId: order.strategyId,
      signalId: order.signalId,
      openedAt: new Date(),
      lastUpdatedAt: new Date(),
      status: "open",
    };

    // Calculate risk
    if (position.stopLossPrice) {
      position.riskAmount =
        Math.abs(position.avgEntryPrice - position.stopLossPrice) *
        position.quantity;
      position.riskPercent =
        this.accountEquity > 0 ? position.riskAmount / this.accountEquity : 0;
    }

    // Store position
    this.positions.set(position.id, position);
    this.positionsBySymbol.set(position.symbol, position.id);

    // Record trade
    this.recordTrade(fill, order, position.id);

    // Persist
    await this.persistPosition(position);

    return position;
  }

  private async addToPosition(
    positionId: string,
    fill: Fill,
    order: Order,
  ): Promise<Position> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    // Calculate new average entry price
    const totalCost = position.costBasis + fill.price * fill.quantity;
    const totalQuantity = position.quantity + fill.quantity;

    position.avgEntryPrice = totalCost / totalQuantity;
    position.quantity = totalQuantity;
    position.costBasis = totalCost;
    position.marketValue = totalQuantity * position.currentPrice;
    position.lastUpdatedAt = new Date();

    // Recalculate P&L
    this.calculatePositionPL(position);

    // Record trade
    this.recordTrade(fill, order, positionId);

    // Persist
    await this.persistPosition(position);

    return position;
  }

  async reducePosition(
    positionId: string,
    fill: Fill,
    order: Order,
  ): Promise<{ position: Position; realizedPL: number }> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    const closeQuantity = Math.min(fill.quantity, position.quantity);

    // Calculate realized P&L for this portion
    const realizedPL =
      position.side === "long"
        ? (fill.price - position.avgEntryPrice) * closeQuantity
        : (position.avgEntryPrice - fill.price) * closeQuantity;

    position.realizedPL += realizedPL;
    position.quantity -= closeQuantity;
    position.costBasis = position.quantity * position.avgEntryPrice;
    position.marketValue = position.quantity * position.currentPrice;
    position.lastUpdatedAt = new Date();

    // Check if fully closed
    if (position.quantity <= 0) {
      position.quantity = 0;
      position.status = "closed";
      position.closedAt = new Date();
      this.positionsBySymbol.delete(position.symbol);
    }

    // Recalculate P&L
    this.calculatePositionPL(position);

    // Record trade
    this.recordTrade(fill, order, positionId, realizedPL);

    // Persist
    await this.persistPosition(position);

    return { position, realizedPL };
  }

  async closePosition(
    close: PositionClose,
  ): Promise<{ position: Position; realizedPL: number }> {
    const position = this.positions.get(close.positionId);
    if (!position) {
      throw new Error(`Position ${close.positionId} not found`);
    }

    const closeQuantity = close.closeQuantity || position.quantity;

    // Calculate realized P&L
    const realizedPL =
      position.side === "long"
        ? (close.closePrice - position.avgEntryPrice) * closeQuantity
        : (position.avgEntryPrice - close.closePrice) * closeQuantity;

    position.realizedPL += realizedPL;
    position.quantity -= closeQuantity;
    position.costBasis = position.quantity * position.avgEntryPrice;
    position.currentPrice = close.closePrice;
    position.marketValue = position.quantity * position.currentPrice;
    position.lastUpdatedAt = close.timestamp;
    position.totalPL = position.realizedPL + position.unrealizedPL;

    // Check if fully closed
    if (position.quantity <= 0) {
      position.quantity = 0;
      position.unrealizedPL = 0;
      position.unrealizedPLPercent = 0;
      position.status = "closed";
      position.closedAt = close.timestamp;
      this.positionsBySymbol.delete(position.symbol);
    } else {
      this.calculatePositionPL(position);
    }

    // Persist
    await this.persistPosition(position);

    return { position, realizedPL };
  }

  // ==========================================================================
  // PRICE UPDATES & P&L
  // ==========================================================================

  updatePrice(symbol: string, price: number): void {
    this.priceCache.set(symbol, price);

    const positionId = this.positionsBySymbol.get(symbol);
    const position = positionId ? this.positions.get(positionId) : undefined;
    if (position?.status === "open") {
      position.currentPrice = price;
      position.marketValue = position.quantity * price;
      this.calculatePositionPL(position);
      position.lastUpdatedAt = new Date();
    }
  }

  updatePrices(prices: Record<string, number>): void {
    for (const [symbol, price] of Object.entries(prices)) {
      this.updatePrice(symbol, price);
    }
  }

  private calculatePositionPL(position: Position): void {
    if (position.status !== "open") return;

    const priceDiff = position.currentPrice - position.avgEntryPrice;

    position.unrealizedPL =
      position.side === "long"
        ? priceDiff * position.quantity
        : -priceDiff * position.quantity;

    position.unrealizedPLPercent =
      position.costBasis > 0 ? position.unrealizedPL / position.costBasis : 0;

    position.totalPL = position.realizedPL + position.unrealizedPL;
  }

  setAccountEquity(equity: number): void {
    this.accountEquity = equity;
  }

  // ==========================================================================
  // POSITION QUERIES
  // ==========================================================================

  getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }

  getPositionBySymbol(symbol: string): Position | undefined {
    const positionId = this.positionsBySymbol.get(symbol);
    return positionId ? this.positions.get(positionId) : undefined;
  }

  getOpenPositions(): Position[] {
    return Array.from(this.positions.values()).filter(
      (p) => p.status === "open",
    );
  }

  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  async getPositions(filter: PositionFilter): Promise<Position[]> {
    let positions = Array.from(this.positions.values());

    if (filter.status && filter.status.length > 0) {
      positions = positions.filter((p) => filter.status!.includes(p.status));
    }

    if (filter.side) {
      positions = positions.filter((p) => p.side === filter.side);
    }

    if (filter.symbol) {
      positions = positions.filter((p) => p.symbol === filter.symbol);
    }

    if (filter.strategyId) {
      positions = positions.filter((p) => p.strategyId === filter.strategyId);
    }

    if (filter.minValue !== undefined) {
      positions = positions.filter((p) => p.marketValue >= filter.minValue!);
    }

    if (filter.maxValue !== undefined) {
      positions = positions.filter((p) => p.marketValue <= filter.maxValue!);
    }

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    return positions.slice(offset, offset + limit);
  }

  // ==========================================================================
  // PORTFOLIO SUMMARY
  // ==========================================================================

  getSummary(): PositionSummary {
    const openPositions = this.getOpenPositions();

    let totalMarketValue = 0;
    let totalCostBasis = 0;
    let totalUnrealizedPL = 0;
    let totalRealizedPL = 0;
    let longExposure = 0;
    let shortExposure = 0;
    let largestPosition: PositionSummary["largestPosition"] = null;
    const sectorExposure: Record<string, number> = {};

    for (const position of openPositions) {
      totalMarketValue += position.marketValue;
      totalCostBasis += position.costBasis;
      totalUnrealizedPL += position.unrealizedPL;
      totalRealizedPL += position.realizedPL;

      if (position.side === "long") {
        longExposure += position.marketValue;
      } else {
        shortExposure += position.marketValue;
      }

      // Track largest position
      if (!largestPosition || position.marketValue > largestPosition.value) {
        largestPosition = {
          symbol: position.symbol,
          value: position.marketValue,
          percent:
            this.accountEquity > 0
              ? position.marketValue / this.accountEquity
              : 0,
        };
      }

      // Track sector exposure
      const sector = position.assetClass || "Unknown";
      sectorExposure[sector] =
        (sectorExposure[sector] || 0) + position.marketValue;
    }

    return {
      totalPositions: openPositions.length,
      longPositions: openPositions.filter((p) => p.side === "long").length,
      shortPositions: openPositions.filter((p) => p.side === "short").length,
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedPL,
      totalRealizedPL,
      totalPL: totalUnrealizedPL + totalRealizedPL,
      dayPL: this.calculateDayPL(),
      weekPL: this.calculateWeekPL(),
      monthPL: this.calculateMonthPL(),
      grossExposure: longExposure + shortExposure,
      netExposure: longExposure - shortExposure,
      largestPosition,
      sectorExposure,
    };
  }

  private calculateDayPL(): number {
    const today = new Date().toISOString().split("T")[0];
    return this.trades
      .filter((t) => t.executedAt.toISOString().split("T")[0] === today)
      .reduce((sum, t) => sum + (t.realizedPL || 0), 0);
  }

  private calculateWeekPL(): number {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.trades
      .filter((t) => t.executedAt >= weekAgo)
      .reduce((sum, t) => sum + (t.realizedPL || 0), 0);
  }

  private calculateMonthPL(): number {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return this.trades
      .filter((t) => t.executedAt >= monthAgo)
      .reduce((sum, t) => sum + (t.realizedPL || 0), 0);
  }

  // ==========================================================================
  // TRADE HISTORY
  // ==========================================================================

  private recordTrade(
    fill: Fill,
    order: Order,
    positionId: string,
    realizedPL?: number,
  ): void {
    const trade: TradeRecord = {
      id: `TRD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      positionId,
      userId: order.userId,
      symbol: fill.symbol,
      side: fill.side,
      quantity: fill.quantity,
      price: fill.price,
      value: fill.quantity * fill.price,
      orderId: order.id,
      fillId: fill.id,
      commission: fill.commission || 0,
      fees: fill.fees || 0,
      slippage: order.limitPrice ? Math.abs(fill.price - order.limitPrice) : 0,
      realizedPL,
      executedAt: fill.timestamp,
      strategyId: order.strategyId,
      signalId: order.signalId,
    };

    this.trades.push(trade);
  }

  getTrades(filter?: {
    positionId?: string;
    symbol?: string;
    limit?: number;
  }): TradeRecord[] {
    let trades = [...this.trades];

    if (filter?.positionId) {
      trades = trades.filter((t) => t.positionId === filter.positionId);
    }

    if (filter?.symbol) {
      trades = trades.filter((t) => t.symbol === filter.symbol);
    }

    // Sort by execution time descending
    trades.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());

    if (filter?.limit) {
      trades = trades.slice(0, filter.limit);
    }

    return trades;
  }

  // ==========================================================================
  // RECONCILIATION
  // ==========================================================================

  async reconcileWithBroker(
    brokerPositions: BrokerPosition[],
  ): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      matched: 0,
      mismatched: 0,
      missingLocal: 0,
      missingBroker: 0,
      corrections: [],
    };

    const brokerPositionMap = new Map(
      brokerPositions.map((p) => [p.symbol, p]),
    );

    // Check local positions against broker
    for (const [symbol, positionId] of this.positionsBySymbol) {
      const localPosition = this.positions.get(positionId);
      const brokerPosition = brokerPositionMap.get(symbol);

      if (!localPosition) continue;

      if (brokerPosition) {
        // Compare quantities
        const brokerQty =
          brokerPosition.side === "long"
            ? brokerPosition.qty
            : -brokerPosition.qty;
        const localQty =
          localPosition.side === "long"
            ? localPosition.quantity
            : -localPosition.quantity;

        if (Math.abs(brokerQty - localQty) > 0.0001) {
          result.mismatched++;
          result.corrections.push({
            symbol,
            type: "quantity_mismatch",
            action: "adjust",
            localQty: localPosition.quantity,
            brokerQty: Math.abs(brokerPosition.qty),
          });

          // Update local to match broker
          localPosition.quantity = Math.abs(brokerPosition.qty);
          localPosition.avgEntryPrice = brokerPosition.avg_entry_price;
          localPosition.costBasis =
            localPosition.quantity * localPosition.avgEntryPrice;
          localPosition.marketValue =
            localPosition.quantity * localPosition.currentPrice;
          this.calculatePositionPL(localPosition);
        } else {
          result.matched++;
        }

        brokerPositionMap.delete(symbol);
      } else {
        // Position missing on broker
        result.missingBroker++;
        result.corrections.push({
          symbol,
          type: "missing_broker",
          action: "close_local",
          localQty: localPosition.quantity,
          brokerQty: 0,
        });

        if (this.config.autoCLoseOnReconcile) {
          await this.closePosition({
            positionId,
            closePrice: localPosition.currentPrice,
            timestamp: new Date(),
            reason: "liquidation",
          });
        }
      }
    }

    // Positions on broker not in local
    for (const [symbol, brokerPosition] of brokerPositionMap) {
      result.missingLocal++;
      result.corrections.push({
        symbol,
        type: "missing_local",
        action: "import",
        localQty: 0,
        brokerQty: brokerPosition.qty,
      });

      // Could import position if needed
    }

    return result;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private generatePositionId(): string {
    return `POS-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Deliberately no try/catch here: a persist failure must surface to the
  // caller (openPosition/addToPosition/reducePosition/closePosition), which
  // ultimately propagates to the API route's own try/catch (positions/route.ts
  // wraps both GET and POST handlers and returns a typed 5xx). Swallowing was
  // the root cause of every position write silently no-op'ing: upsert()
  // resolves with `{ error }` rather than throwing (postgrest-js only rejects
  // on a network failure — confirmed via
  // @supabase/postgrest-js/src/PostgrestBuilder.ts), and the old code never
  // read `error` off the result at all, so the try/catch had nothing to catch.
  private async persistPosition(position: Position): Promise<void> {
    const supabase = getServiceRoleClient();

    const { error } = await (
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      supabase.from("positions") as unknown as PositionsTableClient
    ).upsert({
      id: position.id,
      user_id: position.userId,
      account_id: position.accountId,
      symbol: position.symbol,
      side: position.side,
      quantity: position.quantity,
      avg_entry_price: position.avgEntryPrice,
      current_price: position.currentPrice,
      cost_basis: position.costBasis,
      market_value: position.marketValue,
      unrealized_pl: position.unrealizedPL,
      unrealized_pl_percent: position.unrealizedPLPercent,
      realized_pl: position.realizedPL,
      total_pl: position.totalPL,
      stop_loss_price: position.stopLossPrice,
      take_profit_price: position.takeProfitPrice,
      risk_amount: position.riskAmount,
      risk_percent: position.riskPercent,
      strategy_id: position.strategyId,
      signal_id: position.signalId,
      opened_at: position.openedAt.toISOString(),
      last_updated_at: position.lastUpdatedAt.toISOString(),
      closed_at: position.closedAt?.toISOString(),
      status: position.status,
      exchange: position.exchange,
      asset_class: position.assetClass,
      notes: position.notes,
    });

    if (error) {
      logger.error(
        `Failed to persist position ${position.id}`,
        new Error(error.message),
        { positionId: position.id, userId: position.userId, code: error.code },
      );
      throw new Error(
        `Failed to persist position ${position.id}: ${error.message}`,
      );
    }
  }

  // The DB error is logged then rethrown (not swallowed): loadPositions()
  // hydrates this process-lifetime singleton's in-memory Map from the DB at
  // the start of every request (positions/route.ts calls it before serving
  // GET/POST) — a serverless cold start always begins with an empty Map, so
  // a failed load must not be indistinguishable from "this user has zero
  // positions." The route's own try/catch converts the rethrow into a typed
  // 500 rather than a false "you have no positions" 200.
  async loadPositions(userId: string): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "open");

      if (error) throw error;

      for (const row of data || []) {
        const position = this.mapDbToPosition(row);
        this.positions.set(position.id, position);
        this.positionsBySymbol.set(position.symbol, position.id);
      }
    } catch (err) {
      logger.error(
        `Failed to load positions for user ${userId}`,
        err as Error,
        { userId },
      );
      throw err;
    }
  }

  private mapDbToPosition(data: Record<string, unknown>): Position {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      accountId: data.account_id as string,
      symbol: data.symbol as string,
      side: data.side as PositionSide,
      quantity: data.quantity as number,
      avgEntryPrice: data.avg_entry_price as number,
      currentPrice: data.current_price as number,
      costBasis: data.cost_basis as number,
      marketValue: data.market_value as number,
      unrealizedPL: data.unrealized_pl as number,
      unrealizedPLPercent: data.unrealized_pl_percent as number,
      realizedPL: data.realized_pl as number,
      totalPL: data.total_pl as number,
      stopLossPrice: data.stop_loss_price as number | undefined,
      takeProfitPrice: data.take_profit_price as number | undefined,
      riskAmount: data.risk_amount as number | undefined,
      riskPercent: data.risk_percent as number | undefined,
      strategyId: data.strategy_id as string | undefined,
      signalId: data.signal_id as string | undefined,
      openedAt: new Date(data.opened_at as string),
      lastUpdatedAt: new Date(data.last_updated_at as string),
      closedAt: data.closed_at ? new Date(data.closed_at as string) : undefined,
      status: data.status as PositionStatus,
      exchange: data.exchange as string | undefined,
      assetClass: data.asset_class as string | undefined,
      notes: data.notes as string | undefined,
    };
  }
}

// ============================================================================
// BROKER POSITION INTERFACE
// ============================================================================

export interface BrokerPosition {
  symbol: string;
  side: "long" | "short";
  qty: number;
  avg_entry_price: number;
  market_value: number;
  unrealized_pl: number;
}

export interface ReconciliationResult {
  matched: number;
  mismatched: number;
  missingLocal: number;
  missingBroker: number;
  corrections: ReconciliationCorrection[];
}

export interface ReconciliationCorrection {
  symbol: string;
  type: "quantity_mismatch" | "missing_broker" | "missing_local";
  action: string;
  localQty: number;
  brokerQty: number;
}

// ============================================================================
// FACTORY
// ============================================================================

let positionManagerInstance: PositionManager | null = null;

export function getPositionManager(
  config?: Partial<PositionManagerConfig>,
): PositionManager {
  positionManagerInstance ??= new PositionManager(config);
  return positionManagerInstance;
}

export function createPositionManager(
  config?: Partial<PositionManagerConfig>,
): PositionManager {
  return new PositionManager(config);
}
