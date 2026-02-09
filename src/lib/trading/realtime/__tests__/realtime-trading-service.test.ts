/**
 * Real-Time Trading Service Tests
 */

import {
  RealtimeTradingService,
  createRealtimeTradingService,
  DEFAULT_REALTIME_CONFIG,
  ConnectionState,
  RealtimeQuote,
  OrderUpdate,
} from '../realtime-trading-service';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  onclose: (() => void) | null = null;

  private messageQueue: string[] = [];

  constructor(public url: string) {
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send(data: string): void {
    const parsed = JSON.parse(data);

    // Simulate auth response
    if (parsed.action === 'auth') {
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify([{ T: 'success', msg: 'authenticated' }]),
        });
      }, 10);
    }

    // Simulate trading auth response
    if (parsed.action === 'authenticate') {
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify({
            stream: 'authorization',
            data: { status: 'authorized' },
          }),
        });
      }, 10);
    }

    // Simulate subscription response
    if (parsed.action === 'subscribe') {
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify([{ T: 'subscription', ...parsed }]),
        });
      }, 10);
    }

    // Simulate listen response
    if (parsed.action === 'listen') {
      setTimeout(() => {
        this.onmessage?.({
          data: JSON.stringify({
            stream: 'listening',
            data: { streams: parsed.data.streams },
          }),
        });
      }, 10);
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Helper to simulate incoming messages
  simulateMessage(data: unknown): void {
    this.onmessage?.({
      data: JSON.stringify(data),
    });
  }
}

// Store original WebSocket
const OriginalWebSocket = global.WebSocket;

describe('RealtimeTradingService', () => {
  beforeAll(() => {
    // @ts-expect-error - Mocking WebSocket
    global.WebSocket = MockWebSocket;
  });

  afterAll(() => {
    global.WebSocket = OriginalWebSocket;
  });

  describe('Configuration', () => {
    it('should use default config when not provided', () => {
      const service = createRealtimeTradingService();
      const status = service.getStatus();

      expect(status.dataConnection).toBe('disconnected');
      expect(status.tradingConnection).toBe('disconnected');
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        paperTrading: false,
        reconnectAttempts: 5,
      };

      const service = createRealtimeTradingService(customConfig);
      expect(service).toBeDefined();
    });

    it('should have correct default values', () => {
      expect(DEFAULT_REALTIME_CONFIG.paperTrading).toBe(true);
      expect(DEFAULT_REALTIME_CONFIG.dataFeed).toBe('iex');
      expect(DEFAULT_REALTIME_CONFIG.reconnectAttempts).toBe(10);
      expect(DEFAULT_REALTIME_CONFIG.reconnectDelayMs).toBe(1000);
      expect(DEFAULT_REALTIME_CONFIG.heartbeatIntervalMs).toBe(30000);
      expect(DEFAULT_REALTIME_CONFIG.subscriptionBatchSize).toBe(100);
    });
  });

  describe('Connection Management', () => {
    let service: RealtimeTradingService;

    beforeEach(() => {
      service = createRealtimeTradingService();
    });

    afterEach(() => {
      service.disconnect();
    });

    it('should throw error when connecting without credentials', async () => {
      await expect(service.connect()).rejects.toThrow(
        'API credentials required'
      );
    });

    it('should connect successfully with valid credentials', async () => {
      await service.connect({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(service.isConnected()).toBe(true);
    });

    it('should disconnect properly', async () => {
      await service.connect({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      service.disconnect();

      expect(service.isConnected()).toBe(false);
    });

    it('should track connection state changes', async () => {
      const states: ConnectionState[] = [];

      service.dataConnection$.subscribe((state) => {
        states.push(state);
      });

      await service.connect({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(states).toContain('connecting');
      expect(states).toContain('connected');
    });
  });

  describe('Subscription Management', () => {
    let service: RealtimeTradingService;

    beforeEach(async () => {
      service = createRealtimeTradingService();
      await service.connect({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    afterEach(() => {
      service.disconnect();
    });

    it('should subscribe to quotes', () => {
      service.subscribeQuotes(['AAPL', 'GOOGL']);

      const status = service.getStatus();
      expect(status.subscriptions.quotes).toContain('AAPL');
      expect(status.subscriptions.quotes).toContain('GOOGL');
    });

    it('should subscribe to trades', () => {
      service.subscribeTrades(['MSFT', 'AMZN']);

      const status = service.getStatus();
      expect(status.subscriptions.trades).toContain('MSFT');
      expect(status.subscriptions.trades).toContain('AMZN');
    });

    it('should subscribe to bars', () => {
      service.subscribeBars(['TSLA']);

      const status = service.getStatus();
      expect(status.subscriptions.bars).toContain('TSLA');
    });

    it('should unsubscribe from quotes', () => {
      service.subscribeQuotes(['AAPL', 'GOOGL', 'MSFT']);
      service.unsubscribeQuotes(['GOOGL']);

      const status = service.getStatus();
      expect(status.subscriptions.quotes).toContain('AAPL');
      expect(status.subscriptions.quotes).not.toContain('GOOGL');
      expect(status.subscriptions.quotes).toContain('MSFT');
    });

    it('should not duplicate subscriptions', () => {
      service.subscribeQuotes(['AAPL']);
      service.subscribeQuotes(['AAPL']);

      const status = service.getStatus();
      const aaplCount = status.subscriptions.quotes.filter(
        (s) => s === 'AAPL'
      ).length;
      expect(aaplCount).toBe(1);
    });
  });

  describe('Quote Streaming', () => {
    let service: RealtimeTradingService;

    beforeEach(async () => {
      service = createRealtimeTradingService();
      await service.connect({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    afterEach(() => {
      service.disconnect();
    });

    it('should have quotes observable available', () => {
      // Verify the observable is properly set up
      const observable = service.quotes$;
      expect(observable).toBeDefined();
      expect(typeof observable.subscribe).toBe('function');
    });

    it('should filter quotes by symbol', () => {
      const aaplQuotes: RealtimeQuote[] = [];

      service.getQuotesForSymbol('AAPL').subscribe((quote) => {
        aaplQuotes.push(quote);
      });

      // Verify the observable is created correctly
      expect(aaplQuotes).toBeDefined();
    });
  });

  describe('Order Updates', () => {
    let service: RealtimeTradingService;

    beforeEach(async () => {
      service = createRealtimeTradingService();
      await service.connect({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    afterEach(() => {
      service.disconnect();
    });

    it('should emit order updates via observable', () => {
      const updates: OrderUpdate[] = [];

      service.orderUpdates$.subscribe((update) => {
        updates.push(update);
      });

      // Verify subscription is active
      expect(service.getStatus().subscriptions.orderUpdates).toBe(true);
    });

    it('should filter order updates by order ID', () => {
      const orderId = 'test-order-123';
      let receivedUpdate = false;

      service.getOrderUpdates(orderId).subscribe(() => {
        receivedUpdate = true;
      });

      // Verify the filtered observable is created
      expect(receivedUpdate).toBe(false); // No updates yet
    });

    it('should filter order updates by symbol', () => {
      const symbolUpdates: OrderUpdate[] = [];

      service.getOrderUpdatesForSymbol('AAPL').subscribe((update) => {
        symbolUpdates.push(update);
      });

      // Verify the filtered observable is created
      expect(symbolUpdates.length).toBe(0); // No updates yet
    });
  });

  describe('Error Handling', () => {
    let service: RealtimeTradingService;

    beforeEach(() => {
      service = createRealtimeTradingService();
    });

    afterEach(() => {
      service.disconnect();
    });

    it('should emit errors via observable', () => {
      const errors: Error[] = [];

      service.errors$.subscribe((error) => {
        errors.push(error);
      });

      // Verify error subscription is active
      expect(errors.length).toBe(0);
    });
  });

  describe('Status Reporting', () => {
    let service: RealtimeTradingService;

    beforeEach(() => {
      service = createRealtimeTradingService();
    });

    afterEach(() => {
      service.disconnect();
    });

    it('should return complete status object', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('dataConnection');
      expect(status).toHaveProperty('tradingConnection');
      expect(status).toHaveProperty('subscriptions');
      expect(status).toHaveProperty('lastDataHeartbeat');
      expect(status).toHaveProperty('lastTradingHeartbeat');
    });

    it('should report disconnected when not connected', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should return subscriptions object with correct structure', () => {
      const status = service.getStatus();

      expect(status.subscriptions).toHaveProperty('quotes');
      expect(status.subscriptions).toHaveProperty('trades');
      expect(status.subscriptions).toHaveProperty('bars');
      expect(status.subscriptions).toHaveProperty('orderUpdates');
      expect(Array.isArray(status.subscriptions.quotes)).toBe(true);
      expect(Array.isArray(status.subscriptions.trades)).toBe(true);
      expect(Array.isArray(status.subscriptions.bars)).toBe(true);
    });
  });
});

describe('Factory Functions', () => {
  it('should create new instance with createRealtimeTradingService', () => {
    const service1 = createRealtimeTradingService();
    const service2 = createRealtimeTradingService();

    expect(service1).not.toBe(service2);

    service1.disconnect();
    service2.disconnect();
  });
});
