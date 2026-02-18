/**
 * Order Execution Engine
 *
 * Unified order execution with real-time market data integration.
 * Combines WebSocket streaming, broker API, and order management.
 */

import { Subject, Observable, BehaviorSubject, Subscription } from "rxjs";
import { filter, takeUntil, debounceTime } from "rxjs/operators";
import {
  RealtimeTradingService,
  createRealtimeTradingService,
  RealtimeQuote,
  OrderUpdate as RealtimeOrderUpdate,
  TradeUpdate,
  ConnectionState,
} from "./realtime-trading-service";
import { AlpacaBroker, createAlpacaBroker } from "../brokers/alpaca-broker";
import {
  OrderManager,
  createOrderManager,
  BrokerClient,
  BrokerOrderParams,
  BrokerOrderResponse,
  BrokerOrder,
} from "../orders/order-manager";
import {
  Order,
  OrderRequest,
  OrderStatus,
  OrderValidationResult,
} from "../orders/order-types";

// ============================================================================
// TYPES
// ============================================================================

export type ExecutionMode = "live" | "paper" | "simulation";

export interface ExecutionConfig {
  mode: ExecutionMode;
  apiKey: string;
  apiSecret: string;
  dataFeed: "iex" | "sip";
  autoReconnect: boolean;
  priceValidation: boolean;
  maxPriceDeviation: number;
  orderConfirmation: boolean;
  preTradeRiskCheck: boolean;
}

export interface ExecutionResult {
  success: boolean;
  order?: Order;
  validation?: OrderValidationResult;
  error?: string;
  executionId?: string;
  confirmedPrice?: number;
  slippage?: number;
}

export interface PendingExecution {
  id: string;
  request: OrderRequest;
  quote?: RealtimeQuote;
  status:
    | "pending_confirmation"
    | "pending_execution"
    | "executing"
    | "completed"
    | "failed";
  createdAt: Date;
  confirmedAt?: Date;
  executedAt?: Date;
  result?: ExecutionResult;
}

export interface ExecutionEvent {
  type:
    | "quote_update"
    | "order_created"
    | "order_submitted"
    | "order_filled"
    | "order_cancelled"
    | "order_error"
    | "execution_confirmed";
  executionId?: string;
  orderId?: string;
  symbol?: string;
  data?: unknown;
  timestamp: Date;
}

export interface LivePriceInfo {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  spreadPercent: number;
  lastUpdate: Date;
}

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  mode: "paper",
  apiKey: "",
  apiSecret: "",
  dataFeed: "iex",
  autoReconnect: true,
  priceValidation: true,
  maxPriceDeviation: 0.02, // 2% max deviation from quoted price
  orderConfirmation: true,
  preTradeRiskCheck: true,
};

// ============================================================================
// ORDER EXECUTION ENGINE
// ============================================================================

export class OrderExecutionEngine {
  private config: ExecutionConfig;

  // Core components
  private realtimeService: RealtimeTradingService;
  private broker: AlpacaBroker;
  private orderManager: OrderManager;

  // State
  private isInitialized = false;
  private pendingExecutions = new Map<string, PendingExecution>();
  private livePrices = new Map<string, LivePriceInfo>();
  private watchedSymbols = new Set<string>();

  // Event subjects
  private executionEventSubject = new Subject<ExecutionEvent>();
  private livePriceSubject = new Subject<LivePriceInfo>();
  private connectionStateSubject = new BehaviorSubject<{
    data: ConnectionState;
    trading: ConnectionState;
    broker: boolean;
  }>({ data: "disconnected", trading: "disconnected", broker: false });

  // Subscriptions
  private subscriptions: Subscription[] = [];
  private destroy$ = new Subject<void>();

  constructor(config: Partial<ExecutionConfig> = {}) {
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config };

    // Initialize components
    this.realtimeService = createRealtimeTradingService({
      paperTrading: this.config.mode === "paper",
      dataFeed: this.config.dataFeed,
    });
    this.broker = createAlpacaBroker();
    this.orderManager = createOrderManager();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the execution engine with credentials
   */
  async initialize(credentials?: {
    apiKey: string;
    apiSecret: string;
  }): Promise<void> {
    if (credentials) {
      this.config.apiKey = credentials.apiKey;
      this.config.apiSecret = credentials.apiSecret;
    }

    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error("API credentials required for initialization");
    }

    try {
      // Connect to broker
      await this.broker.connect({
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        paperTrading: this.config.mode === "paper",
      });

      // Connect to real-time streams
      await this.realtimeService.connect({
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
      });

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      this.updateConnectionState();

      // OrderExecutionEngine: Initialized successfully
    } catch (error) {
      // OrderExecutionEngine error: Initialization failed
      throw error;
    }
  }

  /**
   * Setup event handlers for real-time updates
   */
  private setupEventHandlers(): void {
    // Handle quote updates
    const quoteSub = this.realtimeService.quotes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((quote) => this.handleQuoteUpdate(quote));
    this.subscriptions.push(quoteSub);

    // Handle order updates from trading stream
    const orderSub = this.realtimeService.orderUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe((update) => this.handleOrderUpdate(update));
    this.subscriptions.push(orderSub);

    // Handle trade updates
    const tradeSub = this.realtimeService.tradeUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe((update) => this.handleTradeUpdate(update));
    this.subscriptions.push(tradeSub);

    // Track connection state changes
    const dataConnSub = this.realtimeService.dataConnection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateConnectionState());
    this.subscriptions.push(dataConnSub);

    const tradingConnSub = this.realtimeService.tradingConnection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateConnectionState());
    this.subscriptions.push(tradingConnSub);
  }

  /**
   * Shutdown the execution engine
   */
  shutdown(): void {
    this.destroy$.next();

    // Clean up subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];

    // Disconnect services (with null checks)
    if (this.realtimeService) {
      this.realtimeService.disconnect();
    }
    if (this.broker) {
      this.broker.disconnect();
    }

    this.isInitialized = false;
    this.pendingExecutions.clear();
    this.livePrices.clear();
    this.watchedSymbols.clear();

    // OrderExecutionEngine: Shutdown complete
  }

  // ============================================================================
  // ORDER EXECUTION
  // ============================================================================

  /**
   * Execute an order with optional confirmation step
   */
  async executeOrder(
    request: OrderRequest,
    userId: string,
    accountId: string,
    skipConfirmation = false,
  ): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      return { success: false, error: "Engine not initialized" };
    }

    const executionId = this.generateExecutionId();

    // Create pending execution
    const pending: PendingExecution = {
      id: executionId,
      request,
      status: "pending_confirmation",
      createdAt: new Date(),
    };

    // Get live price if available
    const livePrice = this.livePrices.get(request.symbol);
    if (livePrice) {
      pending.quote = {
        symbol: request.symbol,
        bid: livePrice.bid,
        ask: livePrice.ask,
        bidSize: 0,
        askSize: 0,
        timestamp: livePrice.lastUpdate,
      };
    }

    this.pendingExecutions.set(executionId, pending);

    // Price validation
    if (this.config.priceValidation && livePrice) {
      const validationResult = this.validatePrice(request, livePrice);
      if (!validationResult.valid) {
        pending.status = "failed";
        pending.result = {
          success: false,
          error: validationResult.reason,
          executionId,
        };
        return pending.result;
      }
    }

    // If confirmation required and not skipped
    if (this.config.orderConfirmation && !skipConfirmation) {
      this.emitEvent({
        type: "execution_confirmed",
        executionId,
        symbol: request.symbol,
        data: { request, quote: pending.quote },
        timestamp: new Date(),
      });
      return {
        success: true,
        executionId,
        confirmedPrice: livePrice?.mid,
      };
    }

    // Execute immediately
    return this.submitExecution(executionId, userId, accountId);
  }

  /**
   * Confirm and submit a pending execution
   */
  async confirmExecution(
    executionId: string,
    userId: string,
    accountId: string,
  ): Promise<ExecutionResult> {
    const pending = this.pendingExecutions.get(executionId);
    if (!pending) {
      return { success: false, error: "Execution not found" };
    }

    if (pending.status !== "pending_confirmation") {
      return { success: false, error: `Invalid status: ${pending.status}` };
    }

    pending.confirmedAt = new Date();
    return this.submitExecution(executionId, userId, accountId);
  }

  /**
   * Cancel a pending execution
   */
  cancelPendingExecution(executionId: string): boolean {
    const pending = this.pendingExecutions.get(executionId);
    if (!pending || pending.status !== "pending_confirmation") {
      return false;
    }

    pending.status = "failed";
    pending.result = { success: false, error: "Cancelled by user" };
    this.pendingExecutions.delete(executionId);
    return true;
  }

  /**
   * Submit execution to broker
   */
  private async submitExecution(
    executionId: string,
    userId: string,
    accountId: string,
  ): Promise<ExecutionResult> {
    const pending = this.pendingExecutions.get(executionId);
    if (!pending) {
      return { success: false, error: "Execution not found" };
    }

    pending.status = "pending_execution";

    try {
      // Create order in order manager
      const { order, validation } = await this.orderManager.createOrder(
        pending.request,
        userId,
        accountId,
      );

      if (!order) {
        pending.status = "failed";
        pending.result = {
          success: false,
          validation,
          error: "Order validation failed",
          executionId,
        };
        return pending.result;
      }

      pending.status = "executing";

      // Submit to broker
      const brokerClient = this.createBrokerClient();
      const submittedOrder = await this.orderManager.submitOrder(
        order.id,
        brokerClient,
      );

      if (!submittedOrder || submittedOrder.status === "error") {
        pending.status = "failed";
        pending.result = {
          success: false,
          order: submittedOrder || order,
          error: submittedOrder?.errorMessage || "Submission failed",
          executionId,
        };

        this.emitEvent({
          type: "order_error",
          executionId,
          orderId: order.id,
          symbol: order.symbol,
          data: { error: pending.result.error },
          timestamp: new Date(),
        });

        return pending.result;
      }

      // Calculate slippage if we have a reference price
      let slippage: number | undefined;
      if (pending.quote) {
        const referencePrice =
          pending.request.side === "buy"
            ? pending.quote.ask
            : pending.quote.bid;
        if (submittedOrder.limitPrice) {
          slippage =
            (submittedOrder.limitPrice - referencePrice) / referencePrice;
        }
      }

      pending.status = "completed";
      pending.executedAt = new Date();
      pending.result = {
        success: true,
        order: submittedOrder,
        validation,
        executionId,
        confirmedPrice: pending.quote?.ask,
        slippage,
      };

      this.emitEvent({
        type: "order_submitted",
        executionId,
        orderId: submittedOrder.id,
        symbol: submittedOrder.symbol,
        data: { order: submittedOrder },
        timestamp: new Date(),
      });

      return pending.result;
    } catch (error) {
      pending.status = "failed";
      pending.result = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionId,
      };

      this.emitEvent({
        type: "order_error",
        executionId,
        symbol: pending.request.symbol,
        data: { error: pending.result.error },
        timestamp: new Date(),
      });

      return pending.result;
    }
  }

  /**
   * Cancel an active order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.isInitialized) return false;

    const brokerClient = this.createBrokerClient();
    const success = await this.orderManager.cancelOrder(orderId, brokerClient);

    if (success) {
      this.emitEvent({
        type: "order_cancelled",
        orderId,
        timestamp: new Date(),
      });
    }

    return success;
  }

  /**
   * Cancel all open orders
   */
  async cancelAllOrders(): Promise<number> {
    if (!this.isInitialized) return 0;

    const brokerClient = this.createBrokerClient();
    return this.orderManager.cancelAllOrders(brokerClient);
  }

  // ============================================================================
  // PRICE MANAGEMENT
  // ============================================================================

  /**
   * Watch symbols for real-time price updates
   */
  watchSymbols(symbols: string[]): void {
    const newSymbols = symbols.filter((s) => !this.watchedSymbols.has(s));

    if (newSymbols.length > 0) {
      this.realtimeService.subscribeQuotes(newSymbols);
      newSymbols.forEach((s) => this.watchedSymbols.add(s));
    }
  }

  /**
   * Stop watching symbols
   */
  unwatchSymbols(symbols: string[]): void {
    this.realtimeService.unsubscribeQuotes(symbols);
    symbols.forEach((s) => {
      this.watchedSymbols.delete(s);
      this.livePrices.delete(s);
    });
  }

  /**
   * Get current live price for a symbol
   */
  getLivePrice(symbol: string): LivePriceInfo | undefined {
    return this.livePrices.get(symbol);
  }

  /**
   * Get all live prices
   */
  getAllLivePrices(): Map<string, LivePriceInfo> {
    return new Map(this.livePrices);
  }

  /**
   * Fetch fresh quote from broker
   */
  async getQuote(symbol: string): Promise<LivePriceInfo | null> {
    try {
      const quote = await this.broker.getQuote(symbol);
      const mid = (quote.bid + quote.ask) / 2;
      const spread = quote.ask - quote.bid;

      const priceInfo: LivePriceInfo = {
        symbol,
        bid: quote.bid,
        ask: quote.ask,
        mid,
        spread,
        spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
        lastUpdate: quote.timestamp,
      };

      this.livePrices.set(symbol, priceInfo);
      return priceInfo;
    } catch (error) {
      // OrderExecutionEngine error: Failed to get quote
      return null;
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle incoming quote updates
   */
  private handleQuoteUpdate(quote: RealtimeQuote): void {
    const mid = (quote.bid + quote.ask) / 2;
    const spread = quote.ask - quote.bid;

    const priceInfo: LivePriceInfo = {
      symbol: quote.symbol,
      bid: quote.bid,
      ask: quote.ask,
      mid,
      spread,
      spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
      lastUpdate: quote.timestamp,
    };

    this.livePrices.set(quote.symbol, priceInfo);
    this.livePriceSubject.next(priceInfo);

    this.emitEvent({
      type: "quote_update",
      symbol: quote.symbol,
      data: priceInfo,
      timestamp: quote.timestamp,
    });
  }

  /**
   * Handle order status updates from trading stream
   */
  private handleOrderUpdate(update: RealtimeOrderUpdate): void {
    // Map realtime status to order manager status
    const statusMap: Record<string, OrderStatus> = {
      new: "submitted",
      accepted: "accepted",
      partially_filled: "partial",
      filled: "filled",
      canceled: "cancelled",
      expired: "expired",
      rejected: "rejected",
    };

    const mappedStatus = statusMap[update.status] || "error";

    // Update in order manager
    this.orderManager.handleOrderUpdate({
      orderId: update.clientOrderId || update.orderId,
      status: mappedStatus,
      filledQty: update.filledQuantity,
      filledAvgPrice: update.filledAvgPrice,
      timestamp: update.timestamp,
    });

    // Emit appropriate event
    if (mappedStatus === "filled") {
      this.emitEvent({
        type: "order_filled",
        orderId: update.orderId,
        symbol: update.symbol,
        data: {
          filledQty: update.filledQuantity,
          filledAvgPrice: update.filledAvgPrice,
        },
        timestamp: update.timestamp,
      });
    }
  }

  /**
   * Handle trade execution updates
   */
  private handleTradeUpdate(update: TradeUpdate): void {
    // Additional processing for trade updates if needed
    // OrderExecutionEngine: Trade update received
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate order price against live market
   */
  private validatePrice(
    request: OrderRequest,
    price: LivePriceInfo,
  ): { valid: boolean; reason?: string } {
    // For market orders, just check if market is tradeable
    if (request.type === "market") {
      if (price.spread === 0) {
        return { valid: false, reason: "Market appears closed (no spread)" };
      }
      return { valid: true };
    }

    // For limit orders, check price deviation
    if (request.limitPrice) {
      const referencePrice = request.side === "buy" ? price.ask : price.bid;
      const deviation =
        Math.abs(request.limitPrice - referencePrice) / referencePrice;

      if (deviation > this.config.maxPriceDeviation) {
        return {
          valid: false,
          reason: `Limit price deviates ${(deviation * 100).toFixed(2)}% from market (max ${(this.config.maxPriceDeviation * 100).toFixed(2)}%)`,
        };
      }
    }

    return { valid: true };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Create broker client adapter for order manager
   */
  private createBrokerClient(): BrokerClient {
    return {
      submitOrder: async (
        params: BrokerOrderParams,
      ): Promise<BrokerOrderResponse> => {
        const result = await this.broker.placeOrder({
          symbol: params.symbol,
          side: params.side as "buy" | "sell",
          quantity: params.qty,
          type: params.type as
            | "market"
            | "limit"
            | "stop"
            | "stop_limit"
            | "trailing_stop",
          timeInForce: params.time_in_force as "day" | "gtc" | "ioc" | "fok",
          limitPrice: params.limit_price,
          stopPrice: params.stop_price,
          clientOrderId: params.client_order_id,
        });

        if (!result.success || !result.order) {
          throw new Error(result.error || "Order submission failed");
        }

        return {
          id: result.order.id,
          client_order_id: result.order.clientOrderId || "",
          status: result.order.status,
        };
      },

      cancelOrder: async (orderId: string): Promise<void> => {
        const result = await this.broker.cancelOrder(orderId);
        if (!result.success) {
          throw new Error(result.error || "Cancel failed");
        }
      },

      getOrders: async (params: {
        status?: string;
      }): Promise<BrokerOrder[]> => {
        // Map status string to broker filter
        const statusFilter =
          params.status === "open"
            ? (["new", "accepted", "pending_new", "partially_filled"] as const)
            : undefined;
        const orders = await this.broker.getOrders({
          status:
            statusFilter as unknown as import("../brokers/broker-interface").OrderStatus[],
        });

        return orders.map((o) => ({
          id: o.id,
          client_order_id: o.clientOrderId || "",
          status: o.status,
          filled_qty: o.filledQuantity,
          filled_avg_price: o.filledAvgPrice,
        }));
      },

      getOrder: async (orderId: string): Promise<BrokerOrder> => {
        const order = await this.broker.getOrder(orderId);
        if (!order) {
          throw new Error("Order not found");
        }

        return {
          id: order.id,
          client_order_id: order.clientOrderId ?? "",
          status: order.status,
          filled_qty: order.filledQuantity,
          filled_avg_price: order.filledAvgPrice,
        } satisfies BrokerOrder;
      },
    };
  }

  private generateExecutionId(): string {
    return `EXE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: ExecutionEvent): void {
    this.executionEventSubject.next(event);
  }

  private updateConnectionState(): void {
    const status = this.realtimeService.getStatus();
    this.connectionStateSubject.next({
      data: status.dataConnection,
      trading: status.tradingConnection,
      broker: this.broker.getConnectionStatus().connected,
    });
  }

  // ============================================================================
  // OBSERVABLES
  // ============================================================================

  /**
   * Execution events observable
   */
  get events$(): Observable<ExecutionEvent> {
    return this.executionEventSubject.asObservable();
  }

  /**
   * Live price updates observable
   */
  get livePrices$(): Observable<LivePriceInfo> {
    return this.livePriceSubject.asObservable();
  }

  /**
   * Connection state observable
   */
  get connectionState$(): Observable<{
    data: ConnectionState;
    trading: ConnectionState;
    broker: boolean;
  }> {
    return this.connectionStateSubject.asObservable();
  }

  /**
   * Get price updates for a specific symbol
   */
  getPriceUpdates(symbol: string): Observable<LivePriceInfo> {
    return this.livePriceSubject.pipe(
      filter((price) => price.symbol === symbol),
    );
  }

  /**
   * Get events for a specific order
   */
  getOrderEvents(orderId: string): Observable<ExecutionEvent> {
    return this.executionEventSubject.pipe(
      filter((event) => event.orderId === orderId),
    );
  }

  // ============================================================================
  // STATUS
  // ============================================================================

  /**
   * Get current engine status
   */
  getStatus(): {
    initialized: boolean;
    mode: ExecutionMode;
    connections: {
      data: ConnectionState;
      trading: ConnectionState;
      broker: boolean;
    };
    watchedSymbols: string[];
    pendingExecutions: number;
    openOrders: Order[];
  } {
    const realtimeStatus = this.realtimeService.getStatus();

    return {
      initialized: this.isInitialized,
      mode: this.config.mode,
      connections: {
        data: realtimeStatus.dataConnection,
        trading: realtimeStatus.tradingConnection,
        broker: this.broker.getConnectionStatus().connected,
      },
      watchedSymbols: Array.from(this.watchedSymbols),
      pendingExecutions: this.pendingExecutions.size,
      openOrders: this.orderManager.getOpenOrders(),
    };
  }

  /**
   * Check if engine is ready for trading
   */
  isReady(): boolean {
    if (!this.isInitialized) return false;

    const status = this.realtimeService.getStatus();
    return (
      status.dataConnection === "connected" &&
      status.tradingConnection === "connected" &&
      this.broker.getConnectionStatus().connected
    );
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let executionEngineInstance: OrderExecutionEngine | null = null;

export function getOrderExecutionEngine(
  config?: Partial<ExecutionConfig>,
): OrderExecutionEngine {
  if (!executionEngineInstance) {
    executionEngineInstance = new OrderExecutionEngine(config);
  }
  return executionEngineInstance;
}

export function createOrderExecutionEngine(
  config?: Partial<ExecutionConfig>,
): OrderExecutionEngine {
  return new OrderExecutionEngine(config);
}
