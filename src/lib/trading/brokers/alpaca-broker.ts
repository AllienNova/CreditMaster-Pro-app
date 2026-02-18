/**
 * Alpaca Broker Implementation
 *
 * Commission-free trading via Alpaca API.
 * Supports stocks, ETFs, and crypto with paper trading mode.
 */

import { Observable, Subject } from "rxjs";
import {
  BrokerInterface,
  BrokerCredentials,
  BrokerConnection,
  ConnectionStatus,
  AccountInfo,
  Position,
  Order,
  OrderRequest,
  OrderResult,
  BracketOrderRequest,
  BracketOrderResult,
  OCOOrderRequest,
  OCOOrderResult,
  OrderModification,
  CancelResult,
  Quote,
  Level2Data,
  OrderFilters,
  OrderType,
  OrderSide,
  OrderStatus,
  TimeInForce,
} from "./broker-interface";

// ============================================================================
// ALPACA API TYPES
// ============================================================================

interface AlpacaAccount {
  id: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  daytrading_buying_power: string;
  maintenance_margin: string;
  initial_margin: string;
  last_equity: string;
  multiplier: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  qty: string;
  side: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  asset_class: string;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: string;
  type: string;
  qty: string;
  filled_qty: string;
  status: string;
  limit_price?: string;
  stop_price?: string;
  trail_percent?: string;
  trail_price?: string;
  time_in_force: string;
  extended_hours: boolean;
  created_at: string;
  updated_at: string;
  filled_at?: string;
  filled_avg_price?: string;
  legs?: AlpacaOrder[];
}

interface AlpacaQuote {
  symbol: string;
  bid: number;
  ask: number;
  bid_size: number;
  ask_size: number;
  last: number;
  last_size: number;
  volume: number;
  timestamp: string;
}

// ============================================================================
// ALPACA BROKER CLASS
// ============================================================================

export class AlpacaBroker implements BrokerInterface {
  private baseUrl: string;
  private dataUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private paperTrading: boolean;
  private connected: boolean = false;
  private lastHeartbeat: Date = new Date();
  private quoteSubject: Subject<Quote> = new Subject();
  private websocket: WebSocket | null = null;

  constructor() {
    this.baseUrl = "";
    this.dataUrl = "https://data.alpaca.markets";
    this.apiKey = "";
    this.apiSecret = "";
    this.paperTrading = true;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(credentials: BrokerCredentials): Promise<BrokerConnection> {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.paperTrading = credentials.paperTrading ?? true;

    this.baseUrl = this.paperTrading
      ? "https://paper-api.alpaca.markets"
      : "https://api.alpaca.markets";

    // Validate connection by fetching account
    const account = await this.getAccount();

    this.connected = true;
    this.lastHeartbeat = new Date();

    // Initialize WebSocket for real-time data
    await this.initWebSocket();

    return {
      connected: true,
      accountId: account.id,
      buyingPower: account.buyingPower,
      cash: account.cash,
      portfolioValue: account.portfolioValue,
      dayTradesRemaining: account.patternDayTrader ? undefined : 3,
    };
  }

  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.connected = false;
  }

  getConnectionStatus(): ConnectionStatus {
    // Calculate latency from last heartbeat
    const latencyMs = this.lastHeartbeat
      ? Date.now() - this.lastHeartbeat.getTime()
      : 0;

    // Determine market status based on current time (US Eastern)
    const now = new Date();
    const etHour = now.getUTCHours() - 5; // Approximate ET offset
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = etHour >= 9.5 && etHour < 16; // 9:30 AM - 4:00 PM ET
    const marketStatus = isWeekday && isMarketHours ? "open" : "closed";

    return {
      connected: this.connected,
      lastHeartbeat: this.lastHeartbeat,
      latencyMs: Math.min(latencyMs, 10000), // Cap at 10 seconds
      marketStatus: marketStatus as "open" | "closed",
    };
  }

  // ============================================================================
  // ACCOUNT INFORMATION
  // ============================================================================

  async getAccount(): Promise<AccountInfo> {
    const response = await this.request<AlpacaAccount>("/v2/account");

    return {
      id: response.id,
      status: response.status as "active" | "restricted" | "disabled",
      currency: response.currency,
      cash: parseFloat(response.cash),
      portfolioValue: parseFloat(response.portfolio_value),
      buyingPower: parseFloat(response.buying_power),
      dayTradingBuyingPower: parseFloat(response.daytrading_buying_power),
      maintenanceMargin: parseFloat(response.maintenance_margin),
      initialMargin: parseFloat(response.initial_margin),
      lastEquity: parseFloat(response.last_equity),
      multiplier: parseFloat(response.multiplier),
      patternDayTrader: response.pattern_day_trader,
      tradingBlocked: response.trading_blocked,
      transfersBlocked: response.transfers_blocked,
    };
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.request<AlpacaPosition[]>("/v2/positions");
    return response.map(this.mapPosition);
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const response = await this.request<AlpacaPosition>(
        `/v2/positions/${symbol}`,
      );
      return this.mapPosition(response);
    } catch {
      return null;
    }
  }

  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      params.set("status", statuses.join(","));
    }
    if (filters?.symbol) params.set("symbols", filters.symbol);
    if (filters?.limit) params.set("limit", filters.limit.toString());
    if (filters?.after) params.set("after", filters.after.toISOString());
    if (filters?.until) params.set("until", filters.until.toISOString());

    const response = await this.request<AlpacaOrder[]>(`/v2/orders?${params}`);
    return response.map(this.mapOrder);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.request<AlpacaOrder>(`/v2/orders/${orderId}`);
      return this.mapOrder(response);
    } catch {
      return null;
    }
  }

  async getOrderHistory(params: {
    after?: Date;
    until?: Date;
    limit?: number;
  }): Promise<Order[]> {
    return this.getOrders({
      status: ["filled", "canceled", "expired"] as OrderStatus[],
      after: params.after,
      until: params.until,
      limit: params.limit,
    });
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    try {
      const body: Record<string, unknown> = {
        symbol: order.symbol,
        qty: order.quantity.toString(),
        side: order.side,
        type: this.mapOrderType(order.type),
        time_in_force: order.timeInForce || "day",
        extended_hours: order.extendedHours ?? false,
      };

      if (order.limitPrice) body.limit_price = order.limitPrice.toString();
      if (order.stopPrice) body.stop_price = order.stopPrice.toString();
      if (order.trailingPercent)
        body.trail_percent = order.trailingPercent.toString();
      if (order.trailingAmount)
        body.trail_price = order.trailingAmount.toString();
      if (order.clientOrderId) body.client_order_id = order.clientOrderId;

      const response = await this.request<AlpacaOrder>(
        "/v2/orders",
        "POST",
        body,
      );

      return {
        success: true,
        order: this.mapOrder(response),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async placeBracketOrder(
    bracket: BracketOrderRequest,
  ): Promise<BracketOrderResult> {
    try {
      const body: Record<string, unknown> = {
        symbol: bracket.symbol,
        qty: bracket.quantity.toString(),
        side: bracket.side,
        type: bracket.entryType,
        time_in_force: bracket.timeInForce || "gtc",
        order_class: "bracket",
        take_profit: {
          limit_price: bracket.takeProfitPrice.toString(),
        },
        stop_loss: {
          stop_price: bracket.stopLossPrice.toString(),
          limit_price: bracket.stopLossLimitPrice?.toString(),
        },
      };

      if (bracket.entryPrice) body.limit_price = bracket.entryPrice.toString();

      const response = await this.request<AlpacaOrder>(
        "/v2/orders",
        "POST",
        body,
      );
      const mainOrder = this.mapOrder(response);

      return {
        success: true,
        entryOrder: mainOrder,
        takeProfitOrder: mainOrder.legs?.[0],
        stopLossOrder: mainOrder.legs?.[1],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async placeOCOOrder(oco: OCOOrderRequest): Promise<OCOOrderResult> {
    try {
      const body: Record<string, unknown> = {
        symbol: oco.symbol,
        qty: oco.quantity.toString(),
        side: oco.side,
        type: "limit",
        time_in_force: oco.timeInForce || "gtc",
        limit_price: oco.limitPrice.toString(),
        order_class: "oco",
        take_profit: {
          limit_price: oco.takeProfitPrice.toString(),
        },
        stop_loss: {
          stop_price: oco.stopLossPrice.toString(),
        },
      };

      const response = await this.request<AlpacaOrder>(
        "/v2/orders",
        "POST",
        body,
      );
      const orders = [this.mapOrder(response)];
      if (response.legs) {
        orders.push(...response.legs.map(this.mapOrder));
      }

      return {
        success: true,
        orders,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async modifyOrder(
    orderId: string,
    modifications: OrderModification,
  ): Promise<OrderResult> {
    try {
      const body: Record<string, unknown> = {};
      if (modifications.quantity) body.qty = modifications.quantity.toString();
      if (modifications.limitPrice)
        body.limit_price = modifications.limitPrice.toString();
      if (modifications.stopPrice)
        body.stop_price = modifications.stopPrice.toString();
      if (modifications.trailPercent)
        body.trail = modifications.trailPercent.toString();
      if (modifications.timeInForce)
        body.time_in_force = modifications.timeInForce;

      const response = await this.request<AlpacaOrder>(
        `/v2/orders/${orderId}`,
        "PATCH",
        body,
      );

      return {
        success: true,
        order: this.mapOrder(response),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cancelOrder(orderId: string): Promise<CancelResult> {
    try {
      await this.request(`/v2/orders/${orderId}`, "DELETE");
      return { success: true, orderId };
    } catch (error) {
      return {
        success: false,
        orderId,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cancelAllOrders(symbol?: string): Promise<CancelResult[]> {
    const params = symbol ? `?symbols=${symbol}` : "";
    await this.request(`/v2/orders${params}`, "DELETE");

    // Return empty array since Alpaca doesn't return individual results
    return [];
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  async closePosition(symbol: string, percent?: number): Promise<OrderResult> {
    try {
      const params = percent ? `?percentage=${percent}` : "";
      const response = await this.request<AlpacaOrder>(
        `/v2/positions/${symbol}${params}`,
        "DELETE",
      );

      return {
        success: true,
        order: this.mapOrder(response),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async closeAllPositions(): Promise<OrderResult[]> {
    try {
      const response = await this.request<AlpacaOrder[]>(
        "/v2/positions",
        "DELETE",
      );
      return response.map((order) => ({
        success: true,
        order: this.mapOrder(order),
      }));
    } catch (error) {
      return [
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      ];
    }
  }

  // ============================================================================
  // MARKET DATA
  // ============================================================================

  async getQuote(symbol: string): Promise<Quote> {
    const response = await this.request<{ quote: AlpacaQuote }>(
      `/v2/stocks/${symbol}/quotes/latest`,
      "GET",
      undefined,
      this.dataUrl,
    );

    return this.mapQuote(response.quote, symbol);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const response = await this.request<{
      quotes: Record<string, AlpacaQuote>;
    }>(
      `/v2/stocks/quotes/latest?symbols=${symbols.join(",")}`,
      "GET",
      undefined,
      this.dataUrl,
    );

    return Object.entries(response.quotes).map(([symbol, quote]) =>
      this.mapQuote(quote, symbol),
    );
  }

  streamQuotes(symbols: string[]): Observable<Quote> {
    // Subscribe to symbols via WebSocket
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(
        JSON.stringify({
          action: "subscribe",
          quotes: symbols,
        }),
      );
    }

    return this.quoteSubject.asObservable();
  }

  async getLevel2(symbol: string): Promise<Level2Data> {
    // Alpaca provides Level 2 data via WebSocket subscription
    // For now, return empty data structure
    return {
      symbol,
      bids: [],
      asks: [],
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  async isMarketOpen(): Promise<boolean> {
    const clock = await this.request<{ is_open: boolean }>("/v2/clock");
    return clock.is_open;
  }

  async getMarketHours(): Promise<{ open: Date; close: Date }> {
    const clock = await this.request<{
      next_open: string;
      next_close: string;
    }>("/v2/clock");

    return {
      open: new Date(clock.next_open),
      close: new Date(clock.next_close),
    };
  }

  supportedOrderTypes(): OrderType[] {
    return ["market", "limit", "stop", "stop_limit", "trailing_stop"];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async request<T>(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>,
    baseUrl?: string,
  ): Promise<T> {
    const url = `${baseUrl || this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        "APCA-API-KEY-ID": this.apiKey,
        "APCA-API-SECRET-KEY": this.apiSecret,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    this.lastHeartbeat = new Date();
    return response.json();
  }

  private async initWebSocket(): Promise<void> {
    const wsUrl = this.paperTrading
      ? "wss://stream.data.alpaca.markets/v2/iex"
      : "wss://stream.data.alpaca.markets/v2/sip";

    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      this.websocket?.send(
        JSON.stringify({
          action: "auth",
          key: this.apiKey,
          secret: this.apiSecret,
        }),
      );
    };

    this.websocket.onmessage = (event) => {
      const messages = JSON.parse(event.data);
      for (const msg of messages) {
        if (msg.T === "q") {
          this.quoteSubject.next({
            symbol: msg.S,
            bid: msg.bp,
            ask: msg.ap,
            bidSize: msg.bs,
            askSize: msg.as,
            last: msg.bp, // Use bid as last for simplicity
            lastSize: msg.bs,
            volume: 0,
            timestamp: new Date(msg.t),
          });
        }
      }
    };

    this.websocket.onerror = (_error) => {
      // AlpacaBroker error: WebSocket error
      void _error;
    };

    this.websocket.onclose = () => {
      // AlpacaBroker: WebSocket closed
    };
  }

  private mapPosition(pos: AlpacaPosition): Position {
    return {
      symbol: pos.symbol,
      quantity: parseFloat(pos.qty),
      side: pos.side === "long" ? "long" : "short",
      entryPrice: parseFloat(pos.avg_entry_price),
      currentPrice: parseFloat(pos.current_price),
      marketValue: parseFloat(pos.market_value),
      costBasis: parseFloat(pos.cost_basis),
      unrealizedPL: parseFloat(pos.unrealized_pl),
      unrealizedPLPercent: parseFloat(pos.unrealized_plpc) * 100,
      realizedPL: 0, // Not provided by Alpaca
      assetClass: pos.asset_class as "stock" | "crypto" | "option",
    };
  }

  private mapOrder(order: AlpacaOrder): Order {
    return {
      id: order.id,
      clientOrderId: order.client_order_id,
      symbol: order.symbol,
      side: order.side as OrderSide,
      type: this.reverseMapOrderType(order.type),
      quantity: parseFloat(order.qty),
      filledQuantity: parseFloat(order.filled_qty),
      status: order.status as OrderStatus,
      limitPrice: order.limit_price ? parseFloat(order.limit_price) : undefined,
      stopPrice: order.stop_price ? parseFloat(order.stop_price) : undefined,
      trailPercent: order.trail_percent
        ? parseFloat(order.trail_percent)
        : undefined,
      trailPrice: order.trail_price ? parseFloat(order.trail_price) : undefined,
      timeInForce: order.time_in_force as TimeInForce,
      extendedHours: order.extended_hours,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      filledAt: order.filled_at ? new Date(order.filled_at) : undefined,
      filledAvgPrice: order.filled_avg_price
        ? parseFloat(order.filled_avg_price)
        : undefined,
      legs: order.legs?.map((leg) => this.mapOrder(leg)),
    };
  }

  private mapQuote(quote: AlpacaQuote, symbol: string): Quote {
    return {
      symbol,
      bid: quote.bid,
      ask: quote.ask,
      bidSize: quote.bid_size,
      askSize: quote.ask_size,
      last: quote.last,
      lastSize: quote.last_size,
      volume: quote.volume,
      timestamp: new Date(quote.timestamp),
    };
  }

  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      market: "market",
      limit: "limit",
      stop: "stop",
      stop_limit: "stop_limit",
      trailing_stop: "trailing_stop",
    };
    return mapping[type];
  }

  private reverseMapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      market: "market",
      limit: "limit",
      stop: "stop",
      stop_limit: "stop_limit",
      trailing_stop: "trailing_stop",
    };
    return mapping[type] || "market";
  }
}

// Export singleton factory
export function createAlpacaBroker(): AlpacaBroker {
  return new AlpacaBroker();
}
