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

    const account: Omit<PaperAccount, "id"> = {
      userId,
      name,
      initialBalance: balance,
      cashBalance: balance,
      buyingPower: balance,
      portfolioValue: 0,
      totalValue: balance,
      dayTradeCount: 0,
      isPDTRestricted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from("paper_accounts")
      .insert(account)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to create paper account: ${error.message}`);
    return data;
  }

  async getAccount(userId: string): Promise<PaperAccount | null> {
    const { data, error } = await this.supabase
      .from("paper_accounts")
      .select("*")
      .eq("userId", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to get paper account: ${error.message}`);
    }

    return data;
  }

  async resetAccount(accountId: string): Promise<PaperAccount> {
    // Get account to get initial balance
    const { data: account, error: fetchError } = await this.supabase
      .from("paper_accounts")
      .select("initialBalance")
      .eq("id", accountId)
      .single();

    if (fetchError)
      throw new Error(`Failed to fetch account: ${fetchError.message}`);

    // Delete all positions
    await this.supabase
      .from("paper_positions")
      .delete()
      .eq("accountId", accountId);

    // Delete all orders
    await this.supabase
      .from("paper_orders")
      .delete()
      .eq("accountId", accountId);

    // Delete all trades
    await this.supabase
      .from("paper_trades")
      .delete()
      .eq("accountId", accountId);

    // Reset account balances
    const { data, error } = await this.supabase
      .from("paper_accounts")
      .update({
        cashBalance: account.initialBalance,
        buyingPower: account.initialBalance,
        portfolioValue: 0,
        totalValue: account.initialBalance,
        dayTradeCount: 0,
        isPDTRestricted: false,
        updatedAt: new Date(),
      })
      .eq("id", accountId)
      .select()
      .single();

    if (error) throw new Error(`Failed to reset account: ${error.message}`);
    return data;
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  async placeOrder(accountId: string, request: OrderRequest): Promise<Order> {
    // Validate order
    const validation = await this.validateOrder(accountId, request);
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

    // Create order
    const order: Omit<Order, "id"> = {
      ...request,
      userId: "", // Will be filled from account
      accountId,
      status: "pending",
      filledQty: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedValue: request.quantity * executionPrice,
    };

    const { data: createdOrder, error } = await this.supabase
      .from("paper_orders")
      .insert(order)
      .select()
      .single();

    if (error) throw new Error(`Failed to create order: ${error.message}`);

    // Simulate execution delay
    if (this.config.simulateDelays) {
      await this.delay(this.config.delayMs);
    }

    // Execute the order
    const executedOrder = await this.executeOrder(createdOrder, executionPrice);

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
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw new Error(`Failed to cancel order: ${error.message}`);
    return data;
  }

  async getOrders(accountId: string, filter?: OrderFilter): Promise<Order[]> {
    let query = this.supabase
      .from("paper_orders")
      .select("*")
      .eq("accountId", accountId)
      .order("createdAt", { ascending: false });

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
      query = query.gte("createdAt", filter.startDate.toISOString());
    }
    if (filter?.endDate) {
      query = query.lte("createdAt", filter.endDate.toISOString());
    }
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get orders: ${error.message}`);
    return data || [];
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
      .eq("accountId", accountId)
      .gt("quantity", 0);

    if (error) throw new Error(`Failed to get positions: ${error.message}`);

    // Update current prices
    const updatedPositions = await Promise.all(
      (data || []).map(async (pos) => {
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
      .eq("accountId", accountId)
      .eq("symbol", symbol)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to get position: ${error.message}`);
    }

    if (!data) return null;

    const currentPrice = await this.getCurrentPrice(data.symbol);
    const marketValue = data.quantity * currentPrice;
    const unrealizedPL = marketValue - data.costBasis;

    return {
      ...data,
      currentPrice,
      marketValue,
      unrealizedPL,
      unrealizedPLPercent: (unrealizedPL / data.costBasis) * 100,
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
      .eq("accountId", accountId)
      .order("executedAt", { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte("executedAt", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("executedAt", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get trades: ${error.message}`);
    return data || [];
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

    const netPL = account.totalValue - account.initialBalance;
    const netPLPercent = (netPL / account.initialBalance) * 100;

    return {
      accountId,
      startDate: start,
      endDate: end,
      startingValue: account.initialBalance,
      endingValue: account.totalValue,
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
  // PRIVATE METHODS
  // ==========================================================================

  private async validateOrder(
    accountId: string,
    request: OrderRequest,
  ): Promise<OrderValidationResult> {
    const errors: { field: string; message: string; code: string }[] = [];
    const warnings: { field: string; message: string; suggestion?: string }[] =
      [];

    // Get account
    const { data: account } = await this.supabase
      .from("paper_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (!account) {
      errors.push({
        field: "accountId",
        message: "Account not found",
        code: "ACCOUNT_NOT_FOUND",
      });
      return { isValid: false, errors, warnings };
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

      if (estimatedCost > account.buyingPower) {
        errors.push({
          field: "quantity",
          message: `Insufficient buying power. Required: $${estimatedCost.toFixed(2)}, Available: $${account.buyingPower.toFixed(2)}`,
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
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async executeOrder(
    order: Order,
    executionPrice: number,
  ): Promise<Order> {
    const fillQuantity = order.quantity;
    const totalValue = fillQuantity * executionPrice;
    const commission = this.config.commissionPerTrade;

    // Create fill record
    const fill: Omit<Fill, "id"> = {
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: fillQuantity,
      price: executionPrice,
      timestamp: new Date(),
      commission,
      fees: 0,
    };

    await this.supabase.from("paper_fills").insert(fill);

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

    // Create trade record
    const trade: Omit<PaperTrade, "id"> = {
      accountId: order.accountId,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: fillQuantity,
      price: executionPrice,
      totalValue,
      commission,
      fees: 0,
      executedAt: new Date(),
    };

    await this.supabase.from("paper_trades").insert(trade);

    // Update order status
    const { data: updatedOrder, error } = await this.supabase
      .from("paper_orders")
      .update({
        status: "filled",
        filledQty: fillQuantity,
        filledAvgPrice: executionPrice,
        filledAt: new Date(),
        updatedAt: new Date(),
        commission,
      })
      .eq("id", order.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update order: ${error.message}`);
    return updatedOrder;
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
      const position: Omit<PaperPosition, "id"> = {
        accountId,
        symbol,
        quantity: side === "buy" ? quantity : -quantity,
        avgEntryPrice: price,
        currentPrice: price,
        marketValue: quantity * price,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        realizedPL: 0,
        costBasis: quantity * price,
        side: side === "buy" ? "long" : "short",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.supabase.from("paper_positions").insert(position);
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
        await this.supabase
          .from("paper_positions")
          .delete()
          .eq("id", existing.id);
      } else {
        await this.supabase
          .from("paper_positions")
          .update({
            quantity: newQuantity,
            avgEntryPrice: newAvgPrice,
            costBasis: Math.abs(newQuantity) * newAvgPrice,
            realizedPL,
            side: newQuantity > 0 ? "long" : "short",
            updatedAt: new Date(),
          })
          .eq("id", existing.id);
      }
    }
  }

  private async updateAccountBalance(
    accountId: string,
    side: OrderSide,
    totalValue: number,
    commission: number,
  ): Promise<void> {
    const { data: account, error: fetchError } = await this.supabase
      .from("paper_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (fetchError)
      throw new Error(`Failed to fetch account: ${fetchError.message}`);

    let newCashBalance: number;
    if (side === "buy") {
      newCashBalance = account.cashBalance - totalValue - commission;
    } else {
      newCashBalance = account.cashBalance + totalValue - commission;
    }

    // Calculate portfolio value
    const positions = await this.getPositions(accountId);
    const portfolioValue = positions.reduce((sum, p) => sum + p.marketValue, 0);

    await this.supabase
      .from("paper_accounts")
      .update({
        cashBalance: newCashBalance,
        buyingPower: newCashBalance, // Simplified - could include margin
        portfolioValue,
        totalValue: newCashBalance + portfolioValue,
        updatedAt: new Date(),
      })
      .eq("id", accountId);
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
      .select("initialBalance, totalValue")
      .eq("id", accountId)
      .single();

    if (!account) return [];

    // Generate mock daily returns for now
    const days: { date: string; value: number; return: number }[] = [];
    let currentValue = account.initialBalance;
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
