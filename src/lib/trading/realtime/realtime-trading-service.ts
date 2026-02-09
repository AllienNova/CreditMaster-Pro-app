/**
 * Real-Time Trading Service
 *
 * Provides WebSocket-based real-time market data and order execution
 * with automatic reconnection, event streaming, and status tracking.
 */

import {
  Subject,
  Observable,
  BehaviorSubject,
  timer,
  Subscription,
} from 'rxjs';
import { retry, takeUntil, filter } from 'rxjs/operators';

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type MarketDataType = 'quote' | 'trade' | 'bar' | 'orderbook';

export interface RealtimeQuote {
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: Date;
}

export interface RealtimeTrade {
  symbol: string;
  price: number;
  size: number;
  exchange: string;
  timestamp: Date;
  conditions?: string[];
}

export interface RealtimeBar {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  timestamp: Date;
}

export interface OrderUpdate {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  status: OrderUpdateStatus;
  quantity: number;
  filledQuantity: number;
  filledAvgPrice?: number;
  limitPrice?: number;
  stopPrice?: number;
  timestamp: Date;
  event: OrderEvent;
}

export type OrderUpdateStatus =
  | 'new'
  | 'partially_filled'
  | 'filled'
  | 'done_for_day'
  | 'canceled'
  | 'expired'
  | 'replaced'
  | 'pending_cancel'
  | 'pending_replace'
  | 'accepted'
  | 'pending_new'
  | 'accepted_for_bidding'
  | 'stopped'
  | 'rejected'
  | 'suspended'
  | 'calculated';

export type OrderEvent =
  | 'new'
  | 'fill'
  | 'partial_fill'
  | 'canceled'
  | 'expired'
  | 'replaced'
  | 'rejected'
  | 'pending_new'
  | 'stopped'
  | 'suspended'
  | 'order_replace_rejected'
  | 'order_cancel_rejected';

export interface TradeUpdate {
  event: 'trade_update';
  order: OrderUpdate;
  executionId?: string;
  positionQuantity?: number;
  price?: number;
  timestamp: Date;
}

export interface RealtimeConfig {
  apiKey: string;
  apiSecret: string;
  paperTrading: boolean;
  dataFeed: 'iex' | 'sip';
  reconnectAttempts: number;
  reconnectDelayMs: number;
  heartbeatIntervalMs: number;
  subscriptionBatchSize: number;
}

export interface SubscriptionStatus {
  quotes: string[];
  trades: string[];
  bars: string[];
  orderUpdates: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_REALTIME_CONFIG: RealtimeConfig = {
  apiKey: '',
  apiSecret: '',
  paperTrading: true,
  dataFeed: 'iex',
  reconnectAttempts: 10,
  reconnectDelayMs: 1000,
  heartbeatIntervalMs: 30000,
  subscriptionBatchSize: 100,
};

// ============================================================================
// REALTIME TRADING SERVICE
// ============================================================================

export class RealtimeTradingService {
  private config: RealtimeConfig;

  // WebSocket connections
  private dataWs: WebSocket | null = null;
  private tradingWs: WebSocket | null = null;

  // Connection state
  private dataConnectionState = new BehaviorSubject<ConnectionState>(
    'disconnected'
  );
  private tradingConnectionState = new BehaviorSubject<ConnectionState>(
    'disconnected'
  );
  private reconnectAttempts = 0;

  // Event subjects
  private quoteSubject = new Subject<RealtimeQuote>();
  private tradeSubject = new Subject<RealtimeTrade>();
  private barSubject = new Subject<RealtimeBar>();
  private orderUpdateSubject = new Subject<OrderUpdate>();
  private tradeUpdateSubject = new Subject<TradeUpdate>();
  private errorSubject = new Subject<Error>();

  // Subscription tracking
  private subscriptions: SubscriptionStatus = {
    quotes: [],
    trades: [],
    bars: [],
    orderUpdates: false,
  };

  // Heartbeat management
  private heartbeatSubscription: Subscription | null = null;
  private lastDataHeartbeat: Date = new Date();
  private lastTradingHeartbeat: Date = new Date();

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(config: Partial<RealtimeConfig> = {}) {
    this.config = { ...DEFAULT_REALTIME_CONFIG, ...config };
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Initialize real-time connections for market data and trading updates
   */
  async connect(credentials?: {
    apiKey: string;
    apiSecret: string;
  }): Promise<void> {
    if (credentials) {
      this.config.apiKey = credentials.apiKey;
      this.config.apiSecret = credentials.apiSecret;
    }

    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API credentials required for real-time connection');
    }

    await Promise.all([this.connectDataStream(), this.connectTradingStream()]);

    this.startHeartbeat();
  }

  /**
   * Connect to market data WebSocket stream
   */
  private async connectDataStream(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dataConnectionState.next('connecting');

      const wsUrl =
        this.config.dataFeed === 'sip'
          ? 'wss://stream.data.alpaca.markets/v2/sip'
          : 'wss://stream.data.alpaca.markets/v2/iex';

      this.dataWs = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        reject(new Error('Data stream connection timeout'));
      }, 10000);

      this.dataWs.onopen = () => {
        // RealTime:('[RealtimeTrading] Data WebSocket connected');
        this.authenticateDataStream();
      };

      this.dataWs.onmessage = (event) => {
        this.handleDataMessage(event.data);

        // Resolve on successful auth
        const messages = JSON.parse(event.data);
        for (const msg of messages) {
          if (msg.T === 'success' && msg.msg === 'authenticated') {
            clearTimeout(timeout);
            this.dataConnectionState.next('connected');
            this.reconnectAttempts = 0;
            this.resubscribeAll();
            resolve();
          } else if (msg.T === 'error') {
            clearTimeout(timeout);
            this.dataConnectionState.next('error');
            reject(new Error(msg.msg || 'Authentication failed'));
          }
        }
      };

      this.dataWs.onerror = (error) => {
        // RealTime error:('[RealtimeTrading] Data WebSocket error:', error);
        this.errorSubject.next(new Error('Data stream connection error'));
      };

      this.dataWs.onclose = () => {
        // RealTime:('[RealtimeTrading] Data WebSocket closed');
        this.dataConnectionState.next('disconnected');
        this.handleReconnect('data');
      };
    });
  }

  /**
   * Connect to trading updates WebSocket stream
   */
  private async connectTradingStream(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tradingConnectionState.next('connecting');

      const wsUrl = this.config.paperTrading
        ? 'wss://paper-api.alpaca.markets/stream'
        : 'wss://api.alpaca.markets/stream';

      this.tradingWs = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        reject(new Error('Trading stream connection timeout'));
      }, 10000);

      this.tradingWs.onopen = () => {
        // RealTime:('[RealtimeTrading] Trading WebSocket connected');
        this.authenticateTradingStream();
      };

      this.tradingWs.onmessage = (event) => {
        this.handleTradingMessage(event.data);

        // Resolve on successful auth
        const data = JSON.parse(event.data);
        if (
          data.stream === 'authorization' &&
          data.data?.status === 'authorized'
        ) {
          clearTimeout(timeout);
          this.tradingConnectionState.next('connected');
          this.subscribeToTradeUpdates();
          resolve();
        } else if (
          data.stream === 'authorization' &&
          data.data?.status === 'unauthorized'
        ) {
          clearTimeout(timeout);
          this.tradingConnectionState.next('error');
          reject(new Error('Trading stream authentication failed'));
        }
      };

      this.tradingWs.onerror = (error) => {
        // RealTime error:('[RealtimeTrading] Trading WebSocket error:', error);
        this.errorSubject.next(new Error('Trading stream connection error'));
      };

      this.tradingWs.onclose = () => {
        // RealTime:('[RealtimeTrading] Trading WebSocket closed');
        this.tradingConnectionState.next('disconnected');
        this.handleReconnect('trading');
      };
    });
  }

  /**
   * Authenticate data stream connection
   */
  private authenticateDataStream(): void {
    if (this.dataWs?.readyState === WebSocket.OPEN) {
      this.dataWs.send(
        JSON.stringify({
          action: 'auth',
          key: this.config.apiKey,
          secret: this.config.apiSecret,
        })
      );
    }
  }

  /**
   * Authenticate trading stream connection
   */
  private authenticateTradingStream(): void {
    if (this.tradingWs?.readyState === WebSocket.OPEN) {
      this.tradingWs.send(
        JSON.stringify({
          action: 'authenticate',
          data: {
            key_id: this.config.apiKey,
            secret_key: this.config.apiSecret,
          },
        })
      );
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(streamType: 'data' | 'trading'): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      // Max reconnect attempts reached for stream
      this.errorSubject.next(
        new Error(`Max reconnect attempts reached for ${streamType} stream`)
      );
      return;
    }

    const state =
      streamType === 'data'
        ? this.dataConnectionState
        : this.tradingConnectionState;
    state.next('reconnecting');
    this.reconnectAttempts++;

    const delay =
      this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);
    // Reconnecting stream with exponential backoff

    setTimeout(async () => {
      try {
        if (streamType === 'data') {
          await this.connectDataStream();
        } else {
          await this.connectTradingStream();
        }
      } catch {
        // Reconnect failed silently caught
      }
    }, delay);
  }

  /**
   * Disconnect all streams
   */
  disconnect(): void {
    this.destroy$.next();
    this.stopHeartbeat();

    if (this.dataWs) {
      this.dataWs.close();
      this.dataWs = null;
    }

    if (this.tradingWs) {
      this.tradingWs.close();
      this.tradingWs = null;
    }

    this.dataConnectionState.next('disconnected');
    this.tradingConnectionState.next('disconnected');
    this.subscriptions = {
      quotes: [],
      trades: [],
      bars: [],
      orderUpdates: false,
    };
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  /**
   * Handle incoming data stream messages
   */
  private handleDataMessage(data: string): void {
    try {
      const messages = JSON.parse(data);
      this.lastDataHeartbeat = new Date();

      for (const msg of messages) {
        switch (msg.T) {
          case 'q': // Quote
            this.quoteSubject.next({
              symbol: msg.S,
              bid: msg.bp,
              ask: msg.ap,
              bidSize: msg.bs,
              askSize: msg.as,
              timestamp: new Date(msg.t),
            });
            break;

          case 't': // Trade
            this.tradeSubject.next({
              symbol: msg.S,
              price: msg.p,
              size: msg.s,
              exchange: msg.x,
              timestamp: new Date(msg.t),
              conditions: msg.c,
            });
            break;

          case 'b': // Bar
            this.barSubject.next({
              symbol: msg.S,
              open: msg.o,
              high: msg.h,
              low: msg.l,
              close: msg.c,
              volume: msg.v,
              vwap: msg.vw,
              timestamp: new Date(msg.t),
            });
            break;

          case 'subscription':
            // RealTime:('[RealtimeTrading] Subscription updated:', msg);
            break;

          case 'error':
            // RealTime error:('[RealtimeTrading] Data stream error:', msg);
            this.errorSubject.next(new Error(msg.msg || 'Data stream error'));
            break;
        }
      }
    } catch (error) {
      // RealTime error:('[RealtimeTrading] Failed to parse data message:', error);
    }
  }

  /**
   * Handle incoming trading stream messages
   */
  private handleTradingMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.lastTradingHeartbeat = new Date();

      if (message.stream === 'trade_updates') {
        const update = message.data;

        const orderUpdate: OrderUpdate = {
          orderId: update.order.id,
          clientOrderId: update.order.client_order_id,
          symbol: update.order.symbol,
          side: update.order.side,
          type: update.order.type,
          status: update.order.status,
          quantity: parseFloat(update.order.qty),
          filledQuantity: parseFloat(update.order.filled_qty),
          filledAvgPrice: update.order.filled_avg_price
            ? parseFloat(update.order.filled_avg_price)
            : undefined,
          limitPrice: update.order.limit_price
            ? parseFloat(update.order.limit_price)
            : undefined,
          stopPrice: update.order.stop_price
            ? parseFloat(update.order.stop_price)
            : undefined,
          timestamp: new Date(update.timestamp),
          event: update.event as OrderEvent,
        };

        this.orderUpdateSubject.next(orderUpdate);

        const tradeUpdate: TradeUpdate = {
          event: 'trade_update',
          order: orderUpdate,
          executionId: update.execution_id,
          positionQuantity: update.position_qty
            ? parseFloat(update.position_qty)
            : undefined,
          price: update.price ? parseFloat(update.price) : undefined,
          timestamp: new Date(update.timestamp),
        };

        this.tradeUpdateSubject.next(tradeUpdate);
      }
    } catch (_error) {
      // Trading message parse error silently caught
    }
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Subscribe to real-time quotes for symbols
   */
  subscribeQuotes(symbols: string[]): void {
    const newSymbols = symbols.filter(
      (s) => !this.subscriptions.quotes.includes(s)
    );
    if (newSymbols.length === 0) return;

    this.subscriptions.quotes.push(...newSymbols);

    if (this.dataWs?.readyState === WebSocket.OPEN) {
      // Batch subscriptions
      for (
        let i = 0;
        i < newSymbols.length;
        i += this.config.subscriptionBatchSize
      ) {
        const batch = newSymbols.slice(
          i,
          i + this.config.subscriptionBatchSize
        );
        this.dataWs.send(
          JSON.stringify({
            action: 'subscribe',
            quotes: batch,
          })
        );
      }
    }
  }

  /**
   * Subscribe to real-time trades for symbols
   */
  subscribeTrades(symbols: string[]): void {
    const newSymbols = symbols.filter(
      (s) => !this.subscriptions.trades.includes(s)
    );
    if (newSymbols.length === 0) return;

    this.subscriptions.trades.push(...newSymbols);

    if (this.dataWs?.readyState === WebSocket.OPEN) {
      for (
        let i = 0;
        i < newSymbols.length;
        i += this.config.subscriptionBatchSize
      ) {
        const batch = newSymbols.slice(
          i,
          i + this.config.subscriptionBatchSize
        );
        this.dataWs.send(
          JSON.stringify({
            action: 'subscribe',
            trades: batch,
          })
        );
      }
    }
  }

  /**
   * Subscribe to real-time bars for symbols
   */
  subscribeBars(symbols: string[]): void {
    const newSymbols = symbols.filter(
      (s) => !this.subscriptions.bars.includes(s)
    );
    if (newSymbols.length === 0) return;

    this.subscriptions.bars.push(...newSymbols);

    if (this.dataWs?.readyState === WebSocket.OPEN) {
      for (
        let i = 0;
        i < newSymbols.length;
        i += this.config.subscriptionBatchSize
      ) {
        const batch = newSymbols.slice(
          i,
          i + this.config.subscriptionBatchSize
        );
        this.dataWs.send(
          JSON.stringify({
            action: 'subscribe',
            bars: batch,
          })
        );
      }
    }
  }

  /**
   * Subscribe to trade/order updates
   */
  private subscribeToTradeUpdates(): void {
    if (this.tradingWs?.readyState === WebSocket.OPEN) {
      this.tradingWs.send(
        JSON.stringify({
          action: 'listen',
          data: {
            streams: ['trade_updates'],
          },
        })
      );
      this.subscriptions.orderUpdates = true;
    }
  }

  /**
   * Unsubscribe from quotes
   */
  unsubscribeQuotes(symbols: string[]): void {
    this.subscriptions.quotes = this.subscriptions.quotes.filter(
      (s) => !symbols.includes(s)
    );

    if (this.dataWs?.readyState === WebSocket.OPEN) {
      this.dataWs.send(
        JSON.stringify({
          action: 'unsubscribe',
          quotes: symbols,
        })
      );
    }
  }

  /**
   * Unsubscribe from trades
   */
  unsubscribeTrades(symbols: string[]): void {
    this.subscriptions.trades = this.subscriptions.trades.filter(
      (s) => !symbols.includes(s)
    );

    if (this.dataWs?.readyState === WebSocket.OPEN) {
      this.dataWs.send(
        JSON.stringify({
          action: 'unsubscribe',
          trades: symbols,
        })
      );
    }
  }

  /**
   * Unsubscribe from bars
   */
  unsubscribeBars(symbols: string[]): void {
    this.subscriptions.bars = this.subscriptions.bars.filter(
      (s) => !symbols.includes(s)
    );

    if (this.dataWs?.readyState === WebSocket.OPEN) {
      this.dataWs.send(
        JSON.stringify({
          action: 'unsubscribe',
          bars: symbols,
        })
      );
    }
  }

  /**
   * Resubscribe to all previously subscribed symbols after reconnect
   */
  private resubscribeAll(): void {
    if (this.subscriptions.quotes.length > 0) {
      const symbols = [...this.subscriptions.quotes];
      this.subscriptions.quotes = [];
      this.subscribeQuotes(symbols);
    }

    if (this.subscriptions.trades.length > 0) {
      const symbols = [...this.subscriptions.trades];
      this.subscriptions.trades = [];
      this.subscribeTrades(symbols);
    }

    if (this.subscriptions.bars.length > 0) {
      const symbols = [...this.subscriptions.bars];
      this.subscriptions.bars = [];
      this.subscribeBars(symbols);
    }
  }

  // ============================================================================
  // HEARTBEAT MANAGEMENT
  // ============================================================================

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatSubscription = timer(
      this.config.heartbeatIntervalMs,
      this.config.heartbeatIntervalMs
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const now = new Date();
        const dataTimeout =
          now.getTime() - this.lastDataHeartbeat.getTime() >
          this.config.heartbeatIntervalMs * 2;
        const tradingTimeout =
          now.getTime() - this.lastTradingHeartbeat.getTime() >
          this.config.heartbeatIntervalMs * 2;

        if (
          dataTimeout &&
          this.dataConnectionState.getValue() === 'connected'
        ) {
          // RealTime warning:('[RealtimeTrading] Data stream heartbeat timeout');
          this.dataWs?.close();
        }

        if (
          tradingTimeout &&
          this.tradingConnectionState.getValue() === 'connected'
        ) {
          // RealTime warning:('[RealtimeTrading] Trading stream heartbeat timeout');
          this.tradingWs?.close();
        }
      });
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatSubscription) {
      this.heartbeatSubscription.unsubscribe();
      this.heartbeatSubscription = null;
    }
  }

  // ============================================================================
  // OBSERVABLES
  // ============================================================================

  /**
   * Get connection state observable for data stream
   */
  get dataConnection$(): Observable<ConnectionState> {
    return this.dataConnectionState.asObservable();
  }

  /**
   * Get connection state observable for trading stream
   */
  get tradingConnection$(): Observable<ConnectionState> {
    return this.tradingConnectionState.asObservable();
  }

  /**
   * Get quote updates observable
   */
  get quotes$(): Observable<RealtimeQuote> {
    return this.quoteSubject.asObservable();
  }

  /**
   * Get trade updates observable
   */
  get trades$(): Observable<RealtimeTrade> {
    return this.tradeSubject.asObservable();
  }

  /**
   * Get bar updates observable
   */
  get bars$(): Observable<RealtimeBar> {
    return this.barSubject.asObservable();
  }

  /**
   * Get order updates observable
   */
  get orderUpdates$(): Observable<OrderUpdate> {
    return this.orderUpdateSubject.asObservable();
  }

  /**
   * Get trade updates observable (includes execution details)
   */
  get tradeUpdates$(): Observable<TradeUpdate> {
    return this.tradeUpdateSubject.asObservable();
  }

  /**
   * Get error observable
   */
  get errors$(): Observable<Error> {
    return this.errorSubject.asObservable();
  }

  /**
   * Get quotes for a specific symbol
   */
  getQuotesForSymbol(symbol: string): Observable<RealtimeQuote> {
    return this.quoteSubject.pipe(filter((quote) => quote.symbol === symbol));
  }

  /**
   * Get order updates for a specific order
   */
  getOrderUpdates(orderId: string): Observable<OrderUpdate> {
    return this.orderUpdateSubject.pipe(
      filter((update) => update.orderId === orderId)
    );
  }

  /**
   * Get order updates for a specific symbol
   */
  getOrderUpdatesForSymbol(symbol: string): Observable<OrderUpdate> {
    return this.orderUpdateSubject.pipe(
      filter((update) => update.symbol === symbol)
    );
  }

  // ============================================================================
  // STATUS
  // ============================================================================

  /**
   * Get current connection status
   */
  getStatus(): {
    dataConnection: ConnectionState;
    tradingConnection: ConnectionState;
    subscriptions: SubscriptionStatus;
    lastDataHeartbeat: Date;
    lastTradingHeartbeat: Date;
  } {
    return {
      dataConnection: this.dataConnectionState.getValue(),
      tradingConnection: this.tradingConnectionState.getValue(),
      subscriptions: { ...this.subscriptions },
      lastDataHeartbeat: this.lastDataHeartbeat,
      lastTradingHeartbeat: this.lastTradingHeartbeat,
    };
  }

  /**
   * Check if connected to both streams
   */
  isConnected(): boolean {
    return (
      this.dataConnectionState.getValue() === 'connected' &&
      this.tradingConnectionState.getValue() === 'connected'
    );
  }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

let realtimeTradingServiceInstance: RealtimeTradingService | null = null;

export function getRealtimeTradingService(
  config?: Partial<RealtimeConfig>
): RealtimeTradingService {
  if (!realtimeTradingServiceInstance) {
    realtimeTradingServiceInstance = new RealtimeTradingService(config);
  }
  return realtimeTradingServiceInstance;
}

export function createRealtimeTradingService(
  config?: Partial<RealtimeConfig>
): RealtimeTradingService {
  return new RealtimeTradingService(config);
}
