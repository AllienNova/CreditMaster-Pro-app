/**
 * Market Data WebSocket Service
 *
 * Provides real-time market data updates via Server-Sent Events (SSE)
 * Supports multiple symbols and automatic reconnection
 */

export type PriceUpdate = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
};

export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type PriceUpdateCallback = (update: PriceUpdate) => void;
export type StatusChangeCallback = (status: WebSocketStatus) => void;

/**
 * Market Data WebSocket Service (using SSE)
 *
 * Manages Server-Sent Events connections for real-time market data
 */
export class MarketDataWebSocketService {
  private eventSource: EventSource | null = null;
  private status: WebSocketStatus = "disconnected";
  private subscribers: Map<string, Set<PriceUpdateCallback>> = new Map();
  private statusCallbacks: Set<StatusChangeCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribedSymbols: Set<string> = new Set();

  constructor(private apiUrl: string = "/api/ws/market-data") {}

  /**
   * Connect to SSE server
   */
  connect(): void {
    if (this.eventSource && this.status === "connected") {
      return; // Already connected
    }

    if (this.subscribedSymbols.size === 0) {
      // MarketDataWebSocketService: No symbols subscribed, skipping connection
      return;
    }

    this.setStatus("connecting");

    try {
      // Create SSE connection with subscribed symbols
      const symbols = Array.from(this.subscribedSymbols).join(",");
      const url = `${this.apiUrl}?symbols=${encodeURIComponent(symbols)}`;

      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.eventSource.onerror = (_error) => {
        // MarketDataWebSocketService error: SSE error
        this.setStatus("error");
        this.eventSource?.close();
        this.eventSource = null;
        this.attemptReconnect();
      };
    } catch (_error) {
      // MarketDataWebSocketService error: Failed to create SSE connection
      this.setStatus("error");
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from SSE server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setStatus("disconnected");
  }

  /**
   * Subscribe to price updates for a symbol
   */
  subscribe(symbol: string, callback: PriceUpdateCallback): () => void {
    const upperSymbol = symbol.toUpperCase();

    if (!this.subscribers.has(upperSymbol)) {
      this.subscribers.set(upperSymbol, new Set());
    }

    this.subscribers.get(upperSymbol)!.add(callback);

    const wasEmpty = this.subscribedSymbols.size === 0;
    this.subscribedSymbols.add(upperSymbol);

    // Reconnect if this is the first subscription or if we need to update symbols
    if (wasEmpty || this.status === "disconnected") {
      this.disconnect(); // Close existing connection
      this.connect(); // Reconnect with new symbols
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(upperSymbol, callback);
    };
  }

  /**
   * Unsubscribe from price updates for a symbol
   */
  private unsubscribe(symbol: string, callback: PriceUpdateCallback): void {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.subscribers.delete(symbol);
        this.subscribedSymbols.delete(symbol);

        // Note: SSE doesn't support sending messages to server
        // Reconnect with updated symbol list if needed
        if (this.status === "connected" && this.subscribedSymbols.size > 0) {
          this.disconnect();
          this.connect();
        }
      }
    }
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Get list of subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.type === "price_update") {
        const update: PriceUpdate = {
          symbol: message.symbol,
          price: message.price,
          change: message.change,
          changePercent: message.changePercent,
          volume: message.volume,
          timestamp: new Date(message.timestamp),
        };

        // Notify subscribers
        const callbacks = this.subscribers.get(message.symbol);
        if (callbacks) {
          callbacks.forEach((callback) => callback(update));
        }
      } else if (message.type === "pong") {
        // Heartbeat response received
      }
    } catch (_error) {
      // MarketDataWebSocketService error: Failed to parse WebSocket message
    }
  }

  /**
   * Set connection status and notify callbacks
   */
  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // MarketDataWebSocketService error: Max reconnect attempts reached
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    // MarketDataWebSocketService: Reconnecting with exponential backoff
    void delay;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Singleton instance
let instance: MarketDataWebSocketService | null = null;

/**
 * Get singleton instance of MarketDataWebSocketService
 */
export function getMarketDataWebSocketService(): MarketDataWebSocketService {
  if (!instance) {
    instance = new MarketDataWebSocketService();
  }
  return instance;
}
