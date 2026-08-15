/**
 * Paper Trading Engine
 *
 * Provides a risk-free simulated trading environment for users to:
 * - Practice trading strategies without real money
 * - Test signals and algorithms
 * - Learn market mechanics
 * - Track performance in a sandbox environment
 *
 * Security: All paper trades are clearly marked and isolated from real trading.
 *
 * Persistence: paper_accounts/paper_orders/paper_positions/paper_fills/
 * paper_trades (20260731000030_paper_trading_tables.sql) use the repo's
 * standard snake_case columns, so every read/write here goes through a
 * mapDbToX() or an explicit snake_case payload — the class's own public
 * types (PaperAccount, PaperPosition, PaperTrade) stay camelCase and never
 * change shape for callers. Every mutation checks `{ error }` and throws
 * instead of discarding it: a silently-dropped paper_fills/paper_trades
 * insert would otherwise let trackTradeForGraduation() count a trade toward
 * WATCH->GUIDED graduation that was never actually recorded.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Order,
  OrderRequest,
  OrderStatus,
  OrderSide,
  OrderType,
  TimeInForce,
  Fill,
  OrderBlotter,
  OrderFilter,
  OrderValidationResult,
} from "../orders/order-types";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";
import type { ModeStatus } from "@/lib/trading/modes/mode-types";

// ============================================================================
// TYPES
// ============================================================================

export interface PaperAccount {
  id: string;
  userId: string;
  name: string;
  initialBalance: number;
  cashBalance: number;
  buyingPower: number;
  portfolioValue: number;
  totalValue: number;
  dayTradeCount: number;
  isPDTRestricted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaperPosition {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  costBasis: number;
  side: "long" | "short";
  createdAt: Date;
  updatedAt: Date;
}

export interface PaperTrade {
  id: string;
  accountId: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  totalValue: number;
  commission: number;
  fees: number;
  realizedPL?: number;
  executedAt: Date;
}

export interface PaperPerformance {
  accountId: string;
  startDate: Date;
  endDate: Date;
  startingValue: number;
  endingValue: number;
  netPL: number;
  netPLPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  dailyReturns: { date: string; value: number; return: number }[];
}

export interface PaperTradingConfig {
  initialBalance: number;
  commissionPerTrade: number;
  slippagePercent: number;
  allowShortSelling: boolean;
  allowMarginTrading: boolean;
  marginRequirement: number;
  maxLeverage: number;
  simulateDelays: boolean;
  delayMs: number;
  simulatePartialFills: boolean;
  realisticPriceExecution: boolean;
}

const DEFAULT_CONFIG: PaperTradingConfig = {
  initialBalance: 100000,
  commissionPerTrade: 0,
  slippagePercent: 0.1,
  allowShortSelling: true,
  allowMarginTrading: false,
  marginRequirement: 0.5,
  maxLeverage: 2,
  simulateDelays: true,
  delayMs: 500,
  simulatePartialFills: false,
  realisticPriceExecution: true,
};

// ============================================================================
// DB ROW <-> DOMAIN MAPPING
// ============================================================================
// Mirrors the mapDbToOrder/mapDbToPosition convention already established in
// src/lib/trading/orders/order-manager.ts and
// src/lib/trading/positions/position-manager.ts.

function mapDbToAccount(data: Record<string, unknown>): PaperAccount {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    name: data.name as string,
    initialBalance: Number(data.initial_balance),
    cashBalance: Number(data.cash_balance),
    buyingPower: Number(data.buying_power),
    portfolioValue: Number(data.portfolio_value),
    totalValue: Number(data.total_value),
    dayTradeCount: Number(data.day_trade_count),
    isPDTRestricted: Boolean(data.is_pdt_restricted),
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapDbToPosition(data: Record<string, unknown>): PaperPosition {
  return {
    id: data.id as string,
    accountId: data.account_id as string,
    symbol: data.symbol as string,
    quantity: Number(data.quantity),
    avgEntryPrice: Number(data.avg_entry_price),
    currentPrice: Number(data.current_price),
    marketValue: Number(data.market_value),
    unrealizedPL: Number(data.unrealized_pl),
    unrealizedPLPercent: Number(data.unrealized_pl_percent),
    realizedPL: Number(data.realized_pl),
    costBasis: Number(data.cost_basis),
    side: data.side as PaperPosition["side"],
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapDbToPaperOrder(data: Record<string, unknown>): Order {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    accountId: data.account_id as string,
    symbol: data.symbol as string,
    side: data.side as OrderSide,
    quantity: Number(data.quantity),
    type: data.type as OrderType,
    limitPrice: data.limit_price != null ? Number(data.limit_price) : undefined,
    stopPrice: data.stop_price != null ? Number(data.stop_price) : undefined,
    trailPercent:
      data.trail_percent != null ? Number(data.trail_percent) : undefined,
    trailAmount:
      data.trail_amount != null ? Number(data.trail_amount) : undefined,
    timeInForce: data.time_in_force as TimeInForce,
    extendedHours: data.extended_hours as boolean | undefined,
    orderClass: data.order_class as Order["orderClass"],
    takeProfitPrice:
      data.take_profit_price != null ? Number(data.take_profit_price) : undefined,
    stopLossPrice:
      data.stop_loss_price != null ? Number(data.stop_loss_price) : undefined,
    stopLossLimitPrice:
      data.stop_loss_limit_price != null
        ? Number(data.stop_loss_limit_price)
        : undefined,
    clientOrderId: data.client_order_id as string | undefined,
    signalId: data.signal_id as string | undefined,
    strategyId: data.strategy_id as string | undefined,
    notes: data.notes as string | undefined,
    status: data.status as OrderStatus,
    filledQty: Number(data.filled_qty),
    filledAvgPrice:
      data.filled_avg_price != null ? Number(data.filled_avg_price) : undefined,
    commission: data.commission != null ? Number(data.commission) : undefined,
    estimatedValue: Number(data.estimated_value),
    createdAt: new Date(data.created_at as string),
    filledAt: data.filled_at ? new Date(data.filled_at as string) : undefined,
    cancelledAt: data.cancelled_at
      ? new Date(data.cancelled_at as string)
      : undefined,
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapDbToTrade(data: Record<string, unknown>): PaperTrade {
  return {
    id: data.id as string,
    accountId: data.account_id as string,
    orderId: data.order_id as string,
    symbol: data.symbol as string,
    side: data.side as OrderSide,
    quantity: Number(data.quantity),
    price: Number(data.price),
    totalValue: Number(data.total_value),
    commission: Number(data.commission),
    fees: Number(data.fees),
    realizedPL: data.realized_pl != null ? Number(data.realized_pl) : undefined,
    executedAt: new Date(data.executed_at as string),
  };
}

// ============================================================================
// PAPER TRADING ENGINE
// ============================================================================

export class PaperTradingEngine {
  private supabase: SupabaseClient;
  private config: PaperTradingConfig;
  private priceCache: Map<string, { price: number; timestamp: number }> =
    new Map();
  private readonly PRICE_CACHE_TTL = 5000; // 5 seconds

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<PaperTradingConfig> = {},
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  async createAccount(
    userId: string,
    name: string = "Paper Trading Account",
    initialBalance?: number,
  ): Promise<PaperAccount> {
    const balance = initialBalance ?? this.config.initialBalance;

    const { data, error } = await this.supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("paper_accounts")
      .insert({
        user_id: userId,
        name,
        initial_balance: balance,
        cash_balance: balance,
        buying_power: balance,
        portfolio_value: 0,
        total_value: balance,
        day_trade_count: 0,
        is_pdt_restricted: false,
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to create paper account: ${error.message}`);
    return mapDbToAccount(data);
  }

  async getAccount(userId: string): Promise<PaperAccount | null> {
    const { data, error } = await this.supabase
      .from("paper_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to get paper account: ${error.message}`);
    }

    return data ? mapDbToAccount(data) : null;
  }

  /**
   * Fetch the raw paper_accounts row by id. Unlike getAccount(userId), a
   * missing row here is always an unexpected error (every caller already
   * holds an accountId obtained moments earlier from getAccount/getPositions),
   * so this throws on any error including "not found" — matching the
   * pre-existing behavior of resetAccount/updateAccountBalance/getPerformance.
   */
  private async getAccountRowById(
    accountId: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from("paper_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to fetch account: ${error?.message ?? "not found"}`,
      );
    }
    return data;
  }

  async resetAccount(accountId: string): Promise<PaperAccount> {
    // Get account to get initial balance
    const { data: account, error: fetchError } = await this.supabase
      .from("paper_accounts")
      .select("initial_balance")
      .eq("id", accountId)
      .single();

    if (fetchError)
      throw new Error(`Failed to fetch account: ${fetchError.message}`);

    // Delete all positions, orders and trades. Checked (not fire-and-forget):
    // if any delete fails, continuing to reset the balance would leave a
    // "reset" account showing a fresh cash balance next to stale positions/
    // orders/trade history — a worse, harder-to-notice inconsistency than
    // surfacing the failure to the caller.
    const { error: posError } = await this.supabase
      .from("paper_positions")
      .delete()
      .eq("account_id", accountId);
    if (posError)
      throw new Error(`Failed to reset positions: ${posError.message}`);

    const { error: ordError } = await this.supabase
      .from("paper_orders")
      .delete()
      .eq("account_id", accountId);
    if (ordError)
      throw new Error(`Failed to reset orders: ${ordError.message}`);

    const { error: tradeError } = await this.supabase
      .from("paper_trades")
      .delete()
      .eq("account_id", accountId);
    if (tradeError)
      throw new Error(`Failed to reset trades: ${tradeError.message}`);

    // Reset account balances
    const { data, error } = await this.supabase
      .from("paper_accounts")
      .update({
        cash_balance: account.initial_balance,
        buying_power: account.initial_balance,
        portfolio_value: 0,
        total_value: account.initial_balance,
        day_trade_count: 0,
        is_pdt_restricted: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .select()
      .single();

    if (error) throw new Error(`Failed to reset account: ${error.message}`);
    return mapDbToAccount(data);
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  async placeOrder(accountId: string, request: OrderRequest): Promise<Order> {
    // Validate order
    const { result: validation, account } = await this.validateOrder(
      accountId,
      request,
    );
    if (!validation.isValid) {
      throw new Error(
        `Order validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
      );
    }

    // Get current price for the symbol
    const currentPrice = await this.getCurrentPrice(request.symbol);

    // Calculate execution price with slippage
    const executionPrice = this.calculateExecutionPrice(
      currentPrice,
      request.side,
      request.type,
      request.limitPrice,
    );

    // Create order. account is guaranteed non-null here: validation.isValid
    // is only true when validateOrder found the account (see ACCOUNT_NOT_FOUND
    // check below).
    const { data: createdOrder, error } = await this.supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("paper_orders")
      .insert({
        user_id: account!.user_id,
        account_id: accountId,
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        type: request.type,
        limit_price: request.limitPrice,
        stop_price: request.stopPrice,
        trail_percent: request.trailPercent,
        trail_amount: request.trailAmount,
        time_in_force: request.timeInForce,
        extended_hours: request.extendedHours,
        order_class: request.orderClass,
        take_profit_price: request.takeProfitPrice,
        stop_loss_price: request.stopLossPrice,
        stop_loss_limit_price: request.stopLossLimitPrice,
        client_order_id: request.clientOrderId,
        signal_id: request.signalId,
        strategy_id: request.strategyId,
        notes: request.notes,
        status: "pending",
        filled_qty: 0,
        estimated_value: request.quantity * executionPrice,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create order: ${error.message}`);

    // Simulate execution delay
    if (this.config.simulateDelays) {
      await this.delay(this.config.delayMs);
    }

    // Execute the order
    const executedOrder = await this.executeOrder(
      mapDbToPaperOrder(createdOrder),
      executionPrice,
    );

    return executedOrder;
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const { data: order, error: fetchError } = await this.supabase
      .from("paper_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError) throw new Error(`Order not found: ${fetchError.message}`);

    if (["filled", "cancelled", "rejected"].includes(order.status)) {
      throw new Error(`Cannot cancel order in status: ${order.status}`);
    }

    const { data, error } = await this.supabase
      .from("paper_orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw new Error(`Failed to cancel order: ${error.message}`);
    return mapDbToPaperOrder(data);
  }

  async getOrders(accountId: string, filter?: OrderFilter): Promise<Order[]> {
    let query = this.supabase
      .from("paper_orders")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (filter?.status && filter.status.length > 0) {
      query = query.in("status", filter.status);
    }
    if (filter?.side) {
      query = query.eq("side", filter.side);
    }
    if (filter?.symbol) {
      query = query.eq("symbol", filter.symbol);
    }
    if (filter?.startDate) {
      query = query.gte("created_at", filter.startDate.toISOString());
    }
    if (filter?.endDate) {
      query = query.lte("created_at", filter.endDate.toISOString());
    }
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get orders: ${error.message}`);
    return (data || []).map(mapDbToPaperOrder);
  }

  async getOrderBlotter(accountId: string): Promise<OrderBlotter> {
    const orders = await this.getOrders(accountId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openOrders = orders.filter((o) =>
      ["pending", "submitted", "accepted", "partial"].includes(o.status),
    );
    const filledOrders = orders.filter((o) => o.status === "filled");
    const cancelledOrders = orders.filter((o) => o.status === "cancelled");

    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
    const todayFills = filledOrders.filter(
      (o) => new Date(o.filledAt!) >= today,
    );

    return {
      openOrders,
      filledOrders,
      cancelledOrders,
      totalOpenValue: openOrders.reduce((sum, o) => sum + o.estimatedValue, 0),
      totalFilledValue: filledOrders.reduce(
        (sum, o) => sum + (o.filledAvgPrice || 0) * o.filledQty,
        0,
      ),
      todayOrderCount: todayOrders.length,
      todayFillCount: todayFills.length,
    };
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  async getPositions(accountId: string): Promise<PaperPosition[]> {
    const { data, error } = await this.supabase
      .from("paper_positions")
      .select("*")
      .eq("account_id", accountId)
      .gt("quantity", 0);

    if (error) throw new Error(`Failed to get positions: ${error.message}`);

    // Update current prices
    const updatedPositions = await Promise.all(
      (data || []).map(async (row) => {
        const pos = mapDbToPosition(row);
        const currentPrice = await this.getCurrentPrice(pos.symbol);
        const marketValue = pos.quantity * currentPrice;
        const unrealizedPL = marketValue - pos.costBasis;
        const unrealizedPLPercent = (unrealizedPL / pos.costBasis) * 100;

        return {
          ...pos,
          currentPrice,
          marketValue,
          unrealizedPL,
          unrealizedPLPercent,
        };
      }),
    );

    return updatedPositions;
  }

  async getPosition(
    accountId: string,
    symbol: string,
  ): Promise<PaperPosition | null> {
    const { data, error } = await this.supabase
      .from("paper_positions")
      .select("*")
      .eq("account_id", accountId)
      .eq("symbol", symbol)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to get position: ${error.message}`);
    }

    if (!data) return null;

    const position = mapDbToPosition(data);
    const currentPrice = await this.getCurrentPrice(position.symbol);
    const marketValue = position.quantity * currentPrice;
    const unrealizedPL = marketValue - position.costBasis;

    return {
      ...position,
      currentPrice,
      marketValue,
      unrealizedPL,
      unrealizedPLPercent: (unrealizedPL / position.costBasis) * 100,
    };
  }

  // ==========================================================================
  // TRADE HISTORY
  // ==========================================================================

  async getTrades(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<PaperTrade[]> {
    let query = this.supabase
      .from("paper_trades")
      .select("*")
      .eq("account_id", accountId)
      .order("executed_at", { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte("executed_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("executed_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get trades: ${error.message}`);
    return (data || []).map(mapDbToTrade);
  }

  // ==========================================================================
  // PERFORMANCE ANALYTICS
  // ==========================================================================

  async getPerformance(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaperPerformance> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Get account
    const { data: account, error: accountError } = await this.supabase
      .from("paper_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accountError)
      throw new Error(`Failed to get account: ${accountError.message}`);

    // Get trades in period
    const trades = await this.getTrades(accountId, start, end, 1000);

    // Calculate metrics
    const winningTrades = trades.filter((t) => (t.realizedPL || 0) > 0);
    const losingTrades = trades.filter((t) => (t.realizedPL || 0) < 0);

    const totalWins = winningTrades.reduce(
      (sum, t) => sum + (t.realizedPL || 0),
      0,
    );
    const totalLosses = Math.abs(
      losingTrades.reduce((sum, t) => sum + (t.realizedPL || 0), 0),
    );

    const totalValue = Number(account.total_value);
    const initialBalance = Number(account.initial_balance);
    const netPL = totalValue - initialBalance;
    const netPLPercent = (netPL / initialBalance) * 100;

    return {
      accountId,
      startDate: start,
      endDate: end,
      startingValue: initialBalance,
      endingValue: totalValue,
      netPL,
      netPLPercent,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      profitFactor:
        totalLosses > 0
          ? totalWins / totalLosses
          : totalWins > 0
            ? Infinity
            : 0,
      maxDrawdown: await this.calculateMaxDrawdown(accountId, start, end),
      sharpeRatio: await this.calculateSharpeRatio(accountId, start, end),
      dailyReturns: await this.getDailyReturns(accountId, start, end),
    };
  }

  // ==========================================================================
  // GRADUATION TRACKING
  // ==========================================================================

  /**
   * Get graduation status for a user from the operating mode manager.
   * Returns the full mode status including graduation progress.
   */
  async getGraduationStatus(
    userId: string,
  ): Promise<{ success: boolean; data?: ModeStatus; error?: string }> {
    try {
      const modeManager = createOperatingModeManager(userId);
      const result = await modeManager.getModeStatus();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to get graduation status: ${message}`,
      };
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async validateOrder(
    accountId: string,
    request: OrderRequest,
  ): Promise<{
    result: OrderValidationResult;
    account: Record<string, unknown> | null;
  }> {
    const errors: { field: string; message: string; code: string }[] = [];
    const warnings: { field: string; message: string; suggestion?: string }[] =
      [];

    // Get account. A genuine query error (not "no rows") must not be
    // misreported as a business validation failure — that would tell the
    // caller "create an account first" when the real problem is a DB outage.
    const { data: account, error: accountError } = await this.supabase
      .from("paper_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accountError && accountError.code !== "PGRST116") {
      throw new Error(`Failed to validate order: ${accountError.message}`);
    }

    if (!account) {
      errors.push({
        field: "accountId",
        message: "Account not found",
        code: "ACCOUNT_NOT_FOUND",
      });
      return { result: { isValid: false, errors, warnings }, account: null };
    }

    // Validate symbol
    if (!request.symbol || request.symbol.length === 0) {
      errors.push({
        field: "symbol",
        message: "Symbol is required",
        code: "SYMBOL_REQUIRED",
      });
    }

    // Validate quantity
    if (!request.quantity || request.quantity <= 0) {
      errors.push({
        field: "quantity",
        message: "Quantity must be positive",
        code: "INVALID_QUANTITY",
      });
    }

    // Validate buying power for buy orders
    if (request.side === "buy") {
      const currentPrice = await this.getCurrentPrice(request.symbol);
      const estimatedCost = request.quantity * currentPrice;
      const buyingPower = Number(account.buying_power);

      if (estimatedCost > buyingPower) {
        errors.push({
          field: "quantity",
          message: `Insufficient buying power. Required: $${estimatedCost.toFixed(2)}, Available: $${buyingPower.toFixed(2)}`,
          code: "INSUFFICIENT_BUYING_POWER",
        });
      }
    }

    // Validate position for sell orders
    if (request.side === "sell") {
      const position = await this.getPosition(accountId, request.symbol);

      if (!position || position.quantity < request.quantity) {
        if (!this.config.allowShortSelling) {
          errors.push({
            field: "quantity",
            message:
              "Insufficient shares to sell and short selling is disabled",
            code: "INSUFFICIENT_SHARES",
          });
        } else {
          warnings.push({
            field: "side",
            message: "This will create a short position",
          });
        }
      }
    }

    // Validate limit price for limit orders
    if (["limit", "stop_limit"].includes(request.type) && !request.limitPrice) {
      errors.push({
        field: "limitPrice",
        message: "Limit price is required for limit orders",
        code: "LIMIT_PRICE_REQUIRED",
      });
    }

    // Validate stop price for stop orders
    if (["stop", "stop_limit"].includes(request.type) && !request.stopPrice) {
      errors.push({
        field: "stopPrice",
        message: "Stop price is required for stop orders",
        code: "STOP_PRICE_REQUIRED",
      });
    }

    return {
      result: { isValid: errors.length === 0, errors, warnings },
      account,
    };
  }

  private async executeOrder(
    order: Order,
    executionPrice: number,
  ): Promise<Order> {
    const fillQuantity = order.quantity;
    const totalValue = fillQuantity * executionPrice;
    const commission = this.config.commissionPerTrade;

    // Create fill record. Checked: a fill is the execution audit record —
    // silently dropping it must not let the rest of executeOrder proceed as
    // if the trade were real.
    const { error: fillError } = await this.supabase.from("paper_fills").insert({
      account_id: order.accountId,
      order_id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: fillQuantity,
      price: executionPrice,
      commission,
      fees: 0,
    });
    if (fillError)
      throw new Error(`Failed to record fill: ${fillError.message}`);

    // Compute realized P&L for graduation tracking before position update
    const realizedPL = await this.computeRealizedPL(
      order.accountId,
      order.symbol,
      order.side,
      fillQuantity,
      executionPrice,
    );

    // Update position
    await this.updatePosition(
      order.accountId,
      order.symbol,
      order.side,
      fillQuantity,
      executionPrice,
    );

    // Update account balance
    await this.updateAccountBalance(
      order.accountId,
      order.side,
      totalValue,
      commission,
    );

    // Create trade record. Checked, and deliberately BEFORE graduation
    // tracking below: if this insert fails, the throw aborts executeOrder
    // before trackTradeForGraduation() is ever reached, so a trade that
    // wasn't actually recorded to paper_trades can never increment the
    // WATCH->GUIDED graduation counter. This is the fail-closed guarantee
    // the phantom-table version of this code had only by accident (nothing
    // could ever reach this line); it now holds for a real, deliberate
    // reason. No .select().single() here — graduation tracking only needs
    // realizedPL, which is already a local variable from computeRealizedPL()
    // above, so re-reading the inserted row would be a pure round-trip.
    const { error: tradeError } = await this.supabase.from("paper_trades").insert({
      account_id: order.accountId,
      order_id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: fillQuantity,
      price: executionPrice,
      total_value: totalValue,
      commission,
      fees: 0,
      realized_pl: realizedPL !== 0 ? realizedPL : null,
    });

    if (tradeError)
      throw new Error(`Failed to record trade: ${tradeError.message}`);

    // Track trade for graduation (fire-and-forget — never blocks execution)
    const userId = await this.getUserIdForAccount(order.accountId);
    if (userId) {
      this.trackTradeForGraduation(userId, { realizedPL }).catch(() => {
        // Swallowed intentionally: graduation tracking must not affect trade execution
      });

      // Track strategy performance if the trade closes a position (has realized P&L)
      if (realizedPL !== 0) {
        this.recordStrategyPerformance(
          userId,
          order.symbol,
          realizedPL,
          realizedPL > 0,
        ).catch(() => {
          // Swallowed intentionally
        });
      }
    }

    // Update order status
    const { data: updatedOrder, error } = await this.supabase
      .from("paper_orders")
      .update({
        status: "filled",
        filled_qty: fillQuantity,
        filled_avg_price: executionPrice,
        filled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        commission,
      })
      .eq("id", order.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update order: ${error.message}`);
    return mapDbToPaperOrder(updatedOrder);
  }

  private async updatePosition(
    accountId: string,
    symbol: string,
    side: OrderSide,
    quantity: number,
    price: number,
  ): Promise<void> {
    const existing = await this.getPosition(accountId, symbol);

    if (!existing) {
      // Create new position
      const { error } = await this.supabase.from("paper_positions").insert({
        account_id: accountId,
        symbol,
        quantity: side === "buy" ? quantity : -quantity,
        avg_entry_price: price,
        current_price: price,
        market_value: quantity * price,
        unrealized_pl: 0,
        unrealized_pl_percent: 0,
        realized_pl: 0,
        cost_basis: quantity * price,
        side: side === "buy" ? "long" : "short",
      });
      if (error)
        throw new Error(`Failed to create position: ${error.message}`);
    } else {
      // Update existing position
      let newQuantity: number;
      let newAvgPrice: number;
      let realizedPL = existing.realizedPL;

      if (side === "buy") {
        if (existing.quantity >= 0) {
          // Adding to long position
          const totalCost =
            existing.quantity * existing.avgEntryPrice + quantity * price;
          newQuantity = existing.quantity + quantity;
          newAvgPrice = totalCost / newQuantity;
        } else {
          // Covering short position
          const coveredQty = Math.min(quantity, Math.abs(existing.quantity));
          realizedPL += coveredQty * (existing.avgEntryPrice - price);
          newQuantity = existing.quantity + quantity;
          newAvgPrice = newQuantity > 0 ? price : existing.avgEntryPrice;
        }
      } else {
        if (existing.quantity <= 0) {
          // Adding to short position
          const totalCost =
            Math.abs(existing.quantity) * existing.avgEntryPrice +
            quantity * price;
          newQuantity = existing.quantity - quantity;
          newAvgPrice = totalCost / Math.abs(newQuantity);
        } else {
          // Selling long position
          const soldQty = Math.min(quantity, existing.quantity);
          realizedPL += soldQty * (price - existing.avgEntryPrice);
          newQuantity = existing.quantity - quantity;
          newAvgPrice = newQuantity > 0 ? existing.avgEntryPrice : price;
        }
      }

      if (newQuantity === 0) {
        // Close position
        const { error } = await this.supabase
          .from("paper_positions")
          .delete()
          .eq("id", existing.id);
        if (error)
          throw new Error(`Failed to close position: ${error.message}`);
      } else {
        const { error } = await this.supabase
          .from("paper_positions")
          .update({
            quantity: newQuantity,
            avg_entry_price: newAvgPrice,
            cost_basis: Math.abs(newQuantity) * newAvgPrice,
            realized_pl: realizedPL,
            side: newQuantity > 0 ? "long" : "short",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error)
          throw new Error(`Failed to update position: ${error.message}`);
      }
    }
  }

  private async updateAccountBalance(
    accountId: string,
    side: OrderSide,
    totalValue: number,
    commission: number,
  ): Promise<void> {
    const account = await this.getAccountRowById(accountId);
    const cashBalance = Number(account.cash_balance);

    let newCashBalance: number;
    if (side === "buy") {
      newCashBalance = cashBalance - totalValue - commission;
    } else {
      newCashBalance = cashBalance + totalValue - commission;
    }

    // Calculate portfolio value
    const positions = await this.getPositions(accountId);
    const portfolioValue = positions.reduce((sum, p) => sum + p.marketValue, 0);

    const { error } = await this.supabase
      .from("paper_accounts")
      .update({
        cash_balance: newCashBalance,
        buying_power: newCashBalance, // Simplified - could include margin
        portfolio_value: portfolioValue,
        total_value: newCashBalance + portfolioValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (error)
      throw new Error(`Failed to update account balance: ${error.message}`);
  }

  private calculateExecutionPrice(
    currentPrice: number,
    side: OrderSide,
    orderType: OrderType,
    limitPrice?: number,
  ): number {
    if (orderType === "limit" && limitPrice) {
      // For limit orders, use limit price (assuming it's marketable)
      return limitPrice;
    }

    // Apply slippage for market orders
    const slippage = currentPrice * (this.config.slippagePercent / 100);
    return side === "buy" ? currentPrice + slippage : currentPrice - slippage;
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return cached.price;
    }

    // Fetch from market data service (simplified - would use real API)
    try {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${process.env.POLYGON_API_KEY}`,
      );
      const data = await response.json();

      if (data.results && data.results[0]) {
        const price = data.results[0].c; // Close price
        this.priceCache.set(symbol, { price, timestamp: Date.now() });
        return price;
      }
    } catch {
      // Fallback to mock price for testing
    }

    // Fallback mock price
    const mockPrice = 100 + Math.random() * 100;
    this.priceCache.set(symbol, { price: mockPrice, timestamp: Date.now() });
    return mockPrice;
  }

  private async calculateMaxDrawdown(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const dailyReturns = await this.getDailyReturns(
      accountId,
      startDate,
      endDate,
    );

    if (dailyReturns.length === 0) return 0;

    let peak = dailyReturns[0].value;
    let maxDrawdown = 0;

    for (const day of dailyReturns) {
      if (day.value > peak) {
        peak = day.value;
      }
      const drawdown = (peak - day.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown * 100;
  }

  private async calculateSharpeRatio(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const dailyReturns = await this.getDailyReturns(
      accountId,
      startDate,
      endDate,
    );

    if (dailyReturns.length < 2) return 0;

    const returns = dailyReturns.map((d) => d.return);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const riskFreeRate = 0.05 / 252; // Annualized 5% / trading days
    const sharpe = ((avgReturn - riskFreeRate) / stdDev) * Math.sqrt(252);

    return sharpe;
  }

  private async getDailyReturns(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; value: number; return: number }[]> {
    // Simplified - would query actual daily snapshots
    const { data: account } = await this.supabase
      .from("paper_accounts")
      .select("initial_balance, total_value")
      .eq("id", accountId)
      .single();

    if (!account) return [];

    // Generate mock daily returns for now
    const days: { date: string; value: number; return: number }[] = [];
    let currentValue = Number(account.initial_balance);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dailyReturn = (Math.random() - 0.48) * 0.04; // -2% to +2%
      currentValue = currentValue * (1 + dailyReturn);

      days.push({
        date: currentDate.toISOString().split("T")[0],
        value: currentValue,
        return: dailyReturn * 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  /**
   * Compute the realized P&L that will result from this trade.
   * This mirrors the logic in updatePosition but only computes the P&L,
   * without mutating any state.
   */
  private async computeRealizedPL(
    accountId: string,
    symbol: string,
    side: OrderSide,
    quantity: number,
    price: number,
  ): Promise<number> {
    try {
      const existing = await this.getPosition(accountId, symbol);
      if (!existing) return 0;

      if (side === "buy" && existing.quantity < 0) {
        // Covering short position
        const coveredQty = Math.min(quantity, Math.abs(existing.quantity));
        return coveredQty * (existing.avgEntryPrice - price);
      } else if (side === "sell" && existing.quantity > 0) {
        // Selling long position
        const soldQty = Math.min(quantity, existing.quantity);
        return soldQty * (price - existing.avgEntryPrice);
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get the userId for a given paper trading account.
   */
  private async getUserIdForAccount(
    accountId: string,
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from("paper_accounts")
        .select("user_id")
        .eq("id", accountId)
        .single();

      if (error || !data) return null;
      return data.user_id;
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Track a completed trade for graduation purposes.
   * This is a fire-and-forget side-effect: errors are logged but never thrown.
   */
  private async trackTradeForGraduation(
    userId: string,
    trade: Pick<PaperTrade, "realizedPL">,
  ): Promise<void> {
    try {
      const modeManager = createOperatingModeManager(userId);

      // Determine if the trade is profitable based on realizedPL
      const profitable = (trade.realizedPL ?? 0) > 0;

      // Record the paper trade for graduation counter
      await modeManager.recordPaperTrade(profitable);

      // Record an active day for the watch mode
      await modeManager.recordActiveDay("watch");
    } catch (err) {
      // Graduation tracking must never break trade execution
      console.error(
        "[PaperTradingEngine] Graduation tracking failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Record per-strategy performance metrics.
   * Updates the strategy_performance JSONB field on the trading_accounts table.
   * Fire-and-forget: errors are logged but never thrown.
   */
  private async recordStrategyPerformance(
    userId: string,
    strategyName: string,
    pnl: number,
    profitable: boolean,
  ): Promise<void> {
    try {
      const modeManager = createOperatingModeManager(userId);
      const accountResult = await modeManager.getAccount();

      if (!accountResult.success || !accountResult.data) {
        console.error(
          "[PaperTradingEngine] Cannot record strategy performance: account not found",
        );
        return;
      }

      const account = accountResult.data;
      const currentPerformance = (account.strategyPerformance ?? {}) as Record<
        string,
        { wins: number; losses: number; totalPnl: number }
      >;

      const existing = currentPerformance[strategyName] ?? {
        wins: 0,
        losses: 0,
        totalPnl: 0,
      };

      const updated = {
        ...currentPerformance,
        [strategyName]: {
          wins: existing.wins + (profitable ? 1 : 0),
          losses: existing.losses + (profitable ? 0 : 1),
          totalPnl: existing.totalPnl + pnl,
        },
      };

      // Update the strategy_performance JSONB field directly via our own Supabase client
      const { error } = await this.supabase
        .from("trading_accounts")
        .update({
          strategy_performance: updated,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error(
          "[PaperTradingEngine] Failed to update strategy performance:",
          error.message,
        );
      }
    } catch (err) {
      console.error(
        "[PaperTradingEngine] Strategy performance tracking failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let paperTradingEngineInstance: PaperTradingEngine | null = null;

export function getPaperTradingEngine(
  config?: Partial<PaperTradingConfig>,
): PaperTradingEngine {
  if (!paperTradingEngineInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    paperTradingEngineInstance = new PaperTradingEngine(
      supabaseUrl,
      supabaseKey,
      config,
    );
  }
  return paperTradingEngineInstance;
}
