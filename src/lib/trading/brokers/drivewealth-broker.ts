/**
 * DriveWealth Broker Implementation
 *
 * Banking-as-a-Service (BaaS) broker via DriveWealth API.
 * Supports fractional shares, US equities, and ETFs.
 * Uses JWT authentication with client credentials.
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
// DRIVEWEALTH API TYPES
// ============================================================================

interface DriveWealthCredentials extends BrokerCredentials {
  clientID?: string;
  clientSecret?: string;
  appKey?: string;
}

interface DriveWealthAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface DriveWealthAccount {
  id: string;
  accountNo: string;
  status: string;
  currency: string;
  cash: number;
  equity: number;
  buyingPower: number;
  goodFaithViolations: number;
  patternDayTrader: boolean;
  tradingBlocked: boolean;
  transfersBlocked: boolean;
}

interface DriveWealthPosition {
  id: string;
  symbol: string;
  qty: number;
  side: string;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  instrumentType: string;
}

interface DriveWealthOrder {
  id: string;
  refID?: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  filledQty: number;
  status: string;
  limitPrice?: number;
  stopPrice?: number;
  trailPercent?: number;
  trailAmount?: number;
  timeInForce: string;
  extendedHours: boolean;
  createdAt: string;
  updatedAt: string;
  filledAt?: string;
  avgFillPrice?: number;
  legs?: DriveWealthOrder[];
}

interface DriveWealthQuote {
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  lastTrade: number;
  lastTradeSize: number;
  volume: number;
  timestamp: string;
}

interface DriveWealthMarketHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  status: string;
}

// ============================================================================
// DRIVEWEALTH BROKER CLASS
// ============================================================================

export class DriveWealthBroker implements BrokerInterface {
  private baseUrl: string;
  private appKey: string;
  private clientID: string;
  private clientSecret: string;
  private accessToken: string;
  private accountId: string;
  private connected: boolean = false;
  private lastHeartbeat: Date = new Date();
  private quoteSubject: Subject<Quote> = new Subject();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.baseUrl = "";
    this.appKey = "";
    this.clientID = "";
    this.clientSecret = "";
    this.accessToken = "";
    this.accountId = "";
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(credentials: BrokerCredentials): Promise<BrokerConnection> {
    const dwCreds = credentials as DriveWealthCredentials;
    this.clientID = dwCreds.clientID || dwCreds.apiKey;
    this.clientSecret = dwCreds.clientSecret || dwCreds.apiSecret;
    this.appKey = dwCreds.appKey || dwCreds.apiKey;

    this.baseUrl = credentials.paperTrading !== false
      ? "https://bo-api.drivewealth.io"
      : "https://api.drivewealth.io";

    if (credentials.baseUrl) {
      this.baseUrl = credentials.baseUrl;
    }

    // Authenticate with DriveWealth
    const authResponse = await this.authenticate();
    this.accessToken = authResponse.access_token;
    this.connected = true;
    this.lastHeartbeat = new Date();

    // Fetch account info
    const account = await this.getAccount();
    this.accountId = account.id;

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
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.accessToken = "";
    this.connected = false;
  }

  getConnectionStatus(): ConnectionStatus {
    const latencyMs = this.lastHeartbeat
      ? Date.now() - this.lastHeartbeat.getTime()
      : 0;

    const now = new Date();
    const etHour = now.getUTCHours() - 5;
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = etHour >= 9.5 && etHour < 16;
    const marketStatus = isWeekday && isMarketHours ? "open" : "closed";

    return {
      connected: this.connected,
      lastHeartbeat: this.lastHeartbeat,
      latencyMs: Math.min(latencyMs, 10000),
      marketStatus: marketStatus as "open" | "closed",
    };
  }

  // ============================================================================
  // ACCOUNT INFORMATION
  // ============================================================================

  async getAccount(): Promise<AccountInfo> {
    const accounts = await this.request<DriveWealthAccount[]>(
      "/back-office/accounts",
    );

    const account = accounts[0];
    if (!account) {
      throw new Error("No DriveWealth account found");
    }

    this.accountId = account.id;

    return {
      id: account.id,
      status: this.mapAccountStatus(account.status),
      currency: account.currency || "USD",
      cash: account.cash,
      portfolioValue: account.equity,
      buyingPower: account.buyingPower,
      dayTradingBuyingPower: account.buyingPower,
      maintenanceMargin: 0,
      initialMargin: 0,
      lastEquity: account.equity,
      multiplier: 1,
      patternDayTrader: account.patternDayTrader,
      tradingBlocked: account.tradingBlocked,
      transfersBlocked: account.transfersBlocked,
    };
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.request<DriveWealthPosition[]>(
      `/back-office/accounts/${this.accountId}/positions`,
    );
    return response.map((p) => this.mapPosition(p));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const positions = await this.getPositions();
      return positions.find((p) => p.symbol === symbol) || null;
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
      params.set("status", statuses.map((s) => this.mapOrderStatusToDW(s)).join(","));
    }
    if (filters?.symbol) params.set("symbol", filters.symbol);
    if (filters?.limit) params.set("limit", filters.limit.toString());
    if (filters?.after) params.set("from", filters.after.toISOString());
    if (filters?.until) params.set("to", filters.until.toISOString());

    const queryString = params.toString();
    const endpoint = `/back-office/accounts/${this.accountId}/orders${queryString ? `?${queryString}` : ""}`;
    const response = await this.request<DriveWealthOrder[]>(endpoint);
    return response.map((o) => this.mapOrder(o));
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.request<DriveWealthOrder>(
        `/back-office/orders/${orderId}`,
      );
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
        accountID: this.accountId,
        symbol: order.symbol,
        quantity: order.quantity,
        side: order.side.toUpperCase(),
        type: this.mapOrderTypeToDW(order.type),
        timeInForce: this.mapTimeInForceToDW(order.timeInForce || "day"),
        extendedHours: order.extendedHours ?? false,
      };

      if (order.limitPrice !== undefined) body.limitPrice = order.limitPrice;
      if (order.stopPrice !== undefined) body.stopPrice = order.stopPrice;
      if (order.trailingPercent !== undefined) body.trailPercent = order.trailingPercent;
      if (order.trailingAmount !== undefined) body.trailAmount = order.trailingAmount;
      if (order.clientOrderId) body.refID = order.clientOrderId;

      const response = await this.request<DriveWealthOrder>(
        "/back-office/orders",
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
      // DriveWealth does not have native bracket orders.
      // Compose by placing the entry order first.
      const entryBody: Record<string, unknown> = {
        accountID: this.accountId,
        symbol: bracket.symbol,
        quantity: bracket.quantity,
        side: bracket.side.toUpperCase(),
        type: bracket.entryType === "limit" ? "LIMIT" : "MARKET",
        timeInForce: this.mapTimeInForceToDW(bracket.timeInForce || "gtc"),
      };

      if (bracket.entryPrice !== undefined) entryBody.limitPrice = bracket.entryPrice;

      const entryResponse = await this.request<DriveWealthOrder>(
        "/back-office/orders",
        "POST",
        entryBody,
      );
      const entryOrder = this.mapOrder(entryResponse);

      // Place take-profit limit order
      const tpBody: Record<string, unknown> = {
        accountID: this.accountId,
        symbol: bracket.symbol,
        quantity: bracket.quantity,
        side: bracket.side === "buy" ? "SELL" : "BUY",
        type: "LIMIT",
        limitPrice: bracket.takeProfitPrice,
        timeInForce: this.mapTimeInForceToDW(bracket.timeInForce || "gtc"),
      };

      const tpResponse = await this.request<DriveWealthOrder>(
        "/back-office/orders",
        "POST",
        tpBody,
      );
      const takeProfitOrder = this.mapOrder(tpResponse);

      // Place stop-loss order
      const slBody: Record<string, unknown> = {
        accountID: this.accountId,
        symbol: bracket.symbol,
        quantity: bracket.quantity,
        side: bracket.side === "buy" ? "SELL" : "BUY",
        type: bracket.stopLossLimitPrice !== undefined ? "STOP_LIMIT" : "STOP",
        stopPrice: bracket.stopLossPrice,
        timeInForce: this.mapTimeInForceToDW(bracket.timeInForce || "gtc"),
      };

      if (bracket.stopLossLimitPrice !== undefined) {
        slBody.limitPrice = bracket.stopLossLimitPrice;
      }

      const slResponse = await this.request<DriveWealthOrder>(
        "/back-office/orders",
        "POST",
        slBody,
      );
      const stopLossOrder = this.mapOrder(slResponse);

      return {
        success: true,
        entryOrder,
        takeProfitOrder,
        stopLossOrder,
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
      // DriveWealth does not have native OCO. Place two separate orders.
      const limitBody: Record<string, unknown> = {
        accountID: this.accountId,
        symbol: oco.symbol,
        quantity: oco.quantity,
        side: oco.side.toUpperCase(),
        type: "LIMIT",
        limitPrice: oco.takeProfitPrice,
        timeInForce: this.mapTimeInForceToDW(oco.timeInForce || "gtc"),
      };

      const stopBody: Record<string, unknown> = {
        accountID: this.accountId,
        symbol: oco.symbol,
        quantity: oco.quantity,
        side: oco.side.toUpperCase(),
        type: "STOP",
        stopPrice: oco.stopLossPrice,
        timeInForce: this.mapTimeInForceToDW(oco.timeInForce || "gtc"),
      };

      const [limitResponse, stopResponse] = await Promise.all([
        this.request<DriveWealthOrder>("/back-office/orders", "POST", limitBody),
        this.request<DriveWealthOrder>("/back-office/orders", "POST", stopBody),
      ]);

      return {
        success: true,
        orders: [this.mapOrder(limitResponse), this.mapOrder(stopResponse)],
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
      if (modifications.quantity !== undefined) body.quantity = modifications.quantity;
      if (modifications.limitPrice !== undefined) body.limitPrice = modifications.limitPrice;
      if (modifications.stopPrice !== undefined) body.stopPrice = modifications.stopPrice;
      if (modifications.trailPercent !== undefined) body.trailPercent = modifications.trailPercent;
      if (modifications.timeInForce !== undefined) {
        body.timeInForce = this.mapTimeInForceToDW(modifications.timeInForce);
      }

      const response = await this.request<DriveWealthOrder>(
        `/back-office/orders/${orderId}`,
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
      await this.request(`/back-office/orders/${orderId}`, "DELETE");
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
    try {
      const orders = await this.getOrders({
        status: ["new", "pending", "accepted"] as OrderStatus[],
        symbol,
      });

      const results = await Promise.all(
        orders.map((order) => this.cancelOrder(order.id)),
      );
      return results;
    } catch {
      return [];
    }
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  async closePosition(symbol: string, percent?: number): Promise<OrderResult> {
    try {
      const position = await this.getPosition(symbol);
      if (!position) {
        return { success: false, error: `No position found for ${symbol}` };
      }

      const quantity = percent
        ? Math.floor(position.quantity * (percent / 100))
        : position.quantity;

      const closeSide: OrderSide = position.side === "long" ? "sell" : "buy";

      return this.placeOrder({
        symbol,
        side: closeSide,
        type: "market",
        quantity,
        timeInForce: "day",
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async closeAllPositions(): Promise<OrderResult[]> {
    try {
      const positions = await this.getPositions();
      const results = await Promise.all(
        positions.map((pos) => this.closePosition(pos.symbol)),
      );
      return results;
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
    const response = await this.request<DriveWealthQuote>(
      `/back-office/market-data/quotes/${symbol}`,
    );
    return this.mapQuote(response);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes = await Promise.all(
      symbols.map((symbol) =>
        this.request<DriveWealthQuote>(
          `/back-office/market-data/quotes/${symbol}`,
        ),
      ),
    );
    return quotes.map((q) => this.mapQuote(q));
  }

  streamQuotes(symbols: string[]): Observable<Quote> {
    // DriveWealth does not provide WebSocket streaming for quotes.
    // Use polling as a fallback.
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        for (const symbol of symbols) {
          const quote = await this.getQuote(symbol);
          this.quoteSubject.next(quote);
        }
      } catch {
        // Polling error — silently continue
      }
    }, 5000);

    return this.quoteSubject.asObservable();
  }

  async getLevel2(symbol: string): Promise<Level2Data> {
    // DriveWealth does not provide Level 2 data.
    // Return empty structure for interface compliance.
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
    const hours = await this.request<DriveWealthMarketHours>(
      "/back-office/market-data/market-hours",
    );
    return hours.isOpen;
  }

  async getMarketHours(): Promise<{ open: Date; close: Date }> {
    const hours = await this.request<DriveWealthMarketHours>(
      "/back-office/market-data/market-hours",
    );
    return {
      open: new Date(hours.openTime),
      close: new Date(hours.closeTime),
    };
  }

  supportedOrderTypes(): OrderType[] {
    return ["market", "limit", "stop", "stop_limit"];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async authenticate(): Promise<DriveWealthAuthResponse> {
    const response = await fetch(`${this.baseUrl}/back-office/auth/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "dw-client-app-key": this.appKey,
      },
      body: JSON.stringify({
        clientID: this.clientID,
        clientSecret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Authentication failed" }));
      throw new Error(
        (error as { message?: string }).message || `HTTP ${response.status}`,
      );
    }

    return response.json() as Promise<DriveWealthAuthResponse>;
  }

  private async request<T>(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "dw-client-app-key": this.appKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Auto-refresh token on 401
    if (response.status === 401) {
      const authResponse = await this.authenticate();
      this.accessToken = authResponse.access_token;

      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "dw-client-app-key": this.appKey,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        (error as { message?: string }).message || `HTTP ${response.status}`,
      );
    }

    this.lastHeartbeat = new Date();
    return response.json() as Promise<T>;
  }

  // ============================================================================
  // MAPPING FUNCTIONS
  // ============================================================================

  private mapPosition(pos: DriveWealthPosition): Position {
    return {
      symbol: pos.symbol,
      quantity: pos.qty,
      side: pos.side === "LONG" || pos.side === "long" ? "long" : "short",
      entryPrice: pos.avgPrice,
      currentPrice: pos.marketPrice,
      marketValue: pos.marketValue,
      costBasis: pos.costBasis,
      unrealizedPL: pos.unrealizedPL,
      unrealizedPLPercent: pos.unrealizedPLPercent,
      realizedPL: pos.realizedPL,
      assetClass: this.mapAssetClass(pos.instrumentType),
    };
  }

  private mapOrder(order: DriveWealthOrder): Order {
    return {
      id: order.id,
      clientOrderId: order.refID,
      symbol: order.symbol,
      side: order.side.toLowerCase() as OrderSide,
      type: this.reverseMapOrderType(order.type),
      quantity: order.quantity,
      filledQuantity: order.filledQty,
      status: this.mapOrderStatus(order.status),
      limitPrice: order.limitPrice,
      stopPrice: order.stopPrice,
      trailPercent: order.trailPercent,
      trailPrice: order.trailAmount,
      timeInForce: this.reverseMapTimeInForce(order.timeInForce),
      extendedHours: order.extendedHours,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      filledAt: order.filledAt ? new Date(order.filledAt) : undefined,
      filledAvgPrice: order.avgFillPrice,
      legs: order.legs?.map((leg) => this.mapOrder(leg)),
    };
  }

  private mapQuote(quote: DriveWealthQuote): Quote {
    return {
      symbol: quote.symbol,
      bid: quote.bid,
      ask: quote.ask,
      bidSize: quote.bidSize,
      askSize: quote.askSize,
      last: quote.lastTrade,
      lastSize: quote.lastTradeSize,
      volume: quote.volume,
      timestamp: new Date(quote.timestamp),
    };
  }

  private mapOrderTypeToDW(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      market: "MARKET",
      limit: "LIMIT",
      stop: "STOP",
      stop_limit: "STOP_LIMIT",
      trailing_stop: "TRAILING_STOP",
    };
    return mapping[type];
  }

  private reverseMapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      MARKET: "market",
      LIMIT: "limit",
      STOP: "stop",
      STOP_LIMIT: "stop_limit",
      TRAILING_STOP: "trailing_stop",
    };
    return mapping[type] || "market";
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      NEW: "new",
      PENDING: "pending",
      ACCEPTED: "accepted",
      FILLED: "filled",
      PARTIALLY_FILLED: "partially_filled",
      CANCELED: "canceled",
      CANCELLED: "canceled",
      REJECTED: "rejected",
      EXPIRED: "expired",
    };
    return mapping[status] || "pending";
  }

  private mapOrderStatusToDW(status: OrderStatus): string {
    const mapping: Record<OrderStatus, string> = {
      new: "NEW",
      pending: "PENDING",
      accepted: "ACCEPTED",
      filled: "FILLED",
      partially_filled: "PARTIALLY_FILLED",
      canceled: "CANCELED",
      rejected: "REJECTED",
      expired: "EXPIRED",
    };
    return mapping[status];
  }

  private mapTimeInForceToDW(tif: TimeInForce): string {
    const mapping: Record<TimeInForce, string> = {
      day: "DAY",
      gtc: "GTC",
      ioc: "IOC",
      fok: "FOK",
      opg: "OPG",
      cls: "CLS",
    };
    return mapping[tif];
  }

  private reverseMapTimeInForce(tif: string): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
      DAY: "day",
      GTC: "gtc",
      IOC: "ioc",
      FOK: "fok",
      OPG: "opg",
      CLS: "cls",
    };
    return mapping[tif] || "day";
  }

  private mapAccountStatus(
    status: string,
  ): "active" | "restricted" | "disabled" {
    const normalized = status.toUpperCase();
    if (normalized === "ACTIVE" || normalized === "OPEN") return "active";
    if (normalized === "RESTRICTED" || normalized === "SUSPENDED") return "restricted";
    return "disabled";
  }

  private mapAssetClass(
    instrumentType: string,
  ): "stock" | "crypto" | "option" {
    const normalized = instrumentType.toUpperCase();
    if (normalized === "CRYPTO" || normalized === "CRYPTOCURRENCY") return "crypto";
    if (normalized === "OPTION" || normalized === "OPTIONS") return "option";
    return "stock";
  }
}

// Export singleton factory
export function createDriveWealthBroker(): DriveWealthBroker {
  return new DriveWealthBroker();
}
