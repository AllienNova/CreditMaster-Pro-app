/**
 * BrokerRouter - Comprehensive Test Suite
 *
 * Tests connection management, routing by preference/capability,
 * aggregate operations, and error handling.
 */

import { BrokerRouter } from "../brokers/broker-router";
import { BrokerFactory } from "../brokers/broker-factory";
import type { BrokerCapabilities } from "../brokers/broker-factory";
import type {
  BrokerInterface,
  BrokerConnection,
  BrokerCredentials,
  SupportedBroker,
  AccountInfo,
  Position,
  Order,
} from "../brokers/broker-interface";

// ============================================================================
// MOCK SETUP
// ============================================================================

function mockPosition(symbol: string, quantity: number): Position {
  return {
    symbol,
    quantity,
    side: "long" as const,
    entryPrice: 150,
    currentPrice: 155,
    marketValue: quantity * 155,
    costBasis: quantity * 150,
    unrealizedPL: quantity * 5,
    unrealizedPLPercent: 3.33,
    realizedPL: 0,
    assetClass: "stock" as const,
  };
}

function mockOrder(id: string, symbol: string): Order {
  return {
    id,
    symbol,
    side: "buy" as const,
    type: "limit" as const,
    quantity: 10,
    filledQuantity: 0,
    status: "new" as const,
    timeInForce: "day" as const,
    extendedHours: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function mockAccountInfo(
  id: string,
  cash: number,
  portfolioValue: number,
  buyingPower: number,
): AccountInfo {
  return {
    id,
    status: "active" as const,
    currency: "USD",
    cash,
    portfolioValue,
    buyingPower,
    lastEquity: portfolioValue,
    multiplier: 1,
    patternDayTrader: false,
    tradingBlocked: false,
    transfersBlocked: false,
  };
}

function mockConnection(accountId: string): BrokerConnection {
  return {
    connected: true,
    accountId,
    buyingPower: 100000,
    cash: 50000,
    portfolioValue: 75000,
  };
}

function createMockBrokerInstance(overrides?: {
  positions?: Position[];
  orders?: Order[];
  account?: AccountInfo;
  connection?: BrokerConnection;
}): BrokerInterface {
  const connection =
    overrides?.connection ?? mockConnection("mock-acc");

  return {
    connect: jest.fn().mockResolvedValue(connection),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getConnectionStatus: jest.fn().mockReturnValue({
      connected: true,
      lastHeartbeat: new Date(),
      latencyMs: 10,
      marketStatus: "closed" as const,
    }),
    getAccount: jest
      .fn()
      .mockResolvedValue(
        overrides?.account ??
          mockAccountInfo("mock-acc", 50000, 75000, 100000),
      ),
    getPositions: jest
      .fn()
      .mockResolvedValue(overrides?.positions ?? []),
    getPosition: jest.fn().mockResolvedValue(null),
    getOrders: jest
      .fn()
      .mockResolvedValue(overrides?.orders ?? []),
    getOrder: jest.fn().mockResolvedValue(null),
    getOrderHistory: jest.fn().mockResolvedValue([]),
    placeOrder: jest.fn().mockResolvedValue({ success: true }),
    placeBracketOrder: jest.fn().mockResolvedValue({ success: true }),
    placeOCOOrder: jest.fn().mockResolvedValue({ success: true }),
    modifyOrder: jest.fn().mockResolvedValue({ success: true }),
    cancelOrder: jest.fn().mockResolvedValue({ success: true, orderId: "o1" }),
    cancelAllOrders: jest.fn().mockResolvedValue([]),
    closePosition: jest.fn().mockResolvedValue({ success: true }),
    closeAllPositions: jest.fn().mockResolvedValue([]),
    getQuote: jest.fn().mockResolvedValue({
      symbol: "AAPL",
      bid: 149.5,
      ask: 150.5,
      bidSize: 100,
      askSize: 200,
      last: 150,
      lastSize: 50,
      volume: 10000,
      timestamp: new Date(),
    }),
    getQuotes: jest.fn().mockResolvedValue([]),
    streamQuotes: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    getLevel2: jest.fn().mockResolvedValue({
      symbol: "AAPL",
      bids: [],
      asks: [],
      timestamp: new Date(),
    }),
    isMarketOpen: jest.fn().mockResolvedValue(false),
    getMarketHours: jest.fn().mockResolvedValue({
      open: new Date(),
      close: new Date(),
    }),
    supportedOrderTypes: jest.fn().mockReturnValue(["market", "limit"]),
  } as unknown as BrokerInterface;
}

function alpacaCapabilities(): BrokerCapabilities {
  return {
    fractionalShares: true,
    extendedHours: true,
    optionsTrading: false,
    cryptoTrading: true,
    paperTrading: true,
    bracketOrders: true,
    ocoOrders: true,
    trailingStop: true,
    level2Data: false,
    streamingQuotes: true,
  };
}

function driveWealthCapabilities(): BrokerCapabilities {
  return {
    fractionalShares: true,
    extendedHours: false,
    optionsTrading: false,
    cryptoTrading: false,
    paperTrading: true,
    bracketOrders: false,
    ocoOrders: false,
    trailingStop: false,
    level2Data: false,
    streamingQuotes: false,
  };
}

function mockCredentials(): BrokerCredentials {
  return {
    apiKey: "test-key",
    apiSecret: "test-secret",
    paperTrading: true,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("BrokerRouter", () => {
  let factory: BrokerFactory;
  let router: BrokerRouter;
  let alpacaMock: BrokerInterface;
  let dwMock: BrokerInterface;

  beforeEach(() => {
    factory = new BrokerFactory();

    alpacaMock = createMockBrokerInstance({
      positions: [mockPosition("AAPL", 10), mockPosition("GOOGL", 5)],
      orders: [mockOrder("ord-1", "AAPL")],
      account: mockAccountInfo("alpaca-acc", 50000, 75000, 100000),
    });

    dwMock = createMockBrokerInstance({
      positions: [mockPosition("AAPL", 20), mockPosition("MSFT", 15)],
      orders: [mockOrder("ord-2", "MSFT")],
      account: mockAccountInfo("dw-acc", 30000, 45000, 60000),
    });

    factory.register({
      type: "alpaca",
      create: () => alpacaMock,
      capabilities: alpacaCapabilities(),
    });

    factory.register({
      type: "drivewealth",
      create: () => dwMock,
      capabilities: driveWealthCapabilities(),
    });

    router = new BrokerRouter(factory);
  });

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  describe("connectBroker", () => {
    it("should connect a broker and return session", async () => {
      const session = await router.connectBroker("alpaca", mockCredentials());
      expect(session.broker).toBe("alpaca");
      expect(session.instance).toBe(alpacaMock);
      expect(session.connection.connected).toBe(true);
      expect(session.connectedAt).toBeInstanceOf(Date);
    });

    it("should call connect on the broker instance", async () => {
      const creds = mockCredentials();
      await router.connectBroker("alpaca", creds);
      expect(alpacaMock.connect).toHaveBeenCalledWith(creds);
    });

    it("should throw when connecting already-connected broker", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await expect(
        router.connectBroker("alpaca", mockCredentials()),
      ).rejects.toThrow("already connected");
    });

    it("should allow connecting multiple different brokers", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());
      expect(router.getConnectedBrokers()).toHaveLength(2);
    });
  });

  describe("disconnectBroker", () => {
    it("should disconnect a connected broker", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.disconnectBroker("alpaca");
      expect(router.getConnectedBrokers()).toHaveLength(0);
      expect(alpacaMock.disconnect).toHaveBeenCalled();
    });

    it("should throw when disconnecting a broker that is not connected", async () => {
      await expect(router.disconnectBroker("alpaca")).rejects.toThrow(
        "not connected",
      );
    });
  });

  describe("disconnectAll", () => {
    it("should disconnect all connected brokers", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());
      await router.disconnectAll();
      expect(router.getConnectedBrokers()).toHaveLength(0);
      expect(alpacaMock.disconnect).toHaveBeenCalled();
      expect(dwMock.disconnect).toHaveBeenCalled();
    });

    it("should handle disconnecting when no brokers connected", async () => {
      await expect(router.disconnectAll()).resolves.not.toThrow();
    });
  });

  describe("getConnectedBrokers", () => {
    it("should return empty array when no brokers connected", () => {
      expect(router.getConnectedBrokers()).toEqual([]);
    });

    it("should return connected broker types", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      const connected = router.getConnectedBrokers();
      expect(connected).toContain("alpaca");
      expect(connected).toHaveLength(1);
    });
  });

  describe("getSession", () => {
    it("should return undefined for unconnected broker", () => {
      expect(router.getSession("alpaca")).toBeUndefined();
    });

    it("should return session for connected broker", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      const session = router.getSession("alpaca");
      expect(session).toBeDefined();
      expect(session?.broker).toBe("alpaca");
    });
  });

  describe("hasConnectedBrokers", () => {
    it("should return false when no brokers connected", () => {
      expect(router.hasConnectedBrokers()).toBe(false);
    });

    it("should return true when at least one broker connected", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      expect(router.hasConnectedBrokers()).toBe(true);
    });
  });

  // ==========================================================================
  // ROUTING
  // ==========================================================================

  describe("getBroker", () => {
    it("should return first connected broker when no preference given", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      const broker = router.getBroker();
      expect(broker).toBe(alpacaMock);
    });

    it("should throw when no brokers connected and no preference", () => {
      expect(() => router.getBroker()).toThrow("No brokers are connected");
    });

    it("should return preferred broker when connected", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const broker = router.getBroker({ preferredBroker: "drivewealth" });
      expect(broker).toBe(dwMock);
    });

    it("should fall back to first connected when preferred is not connected", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      const broker = router.getBroker({ preferredBroker: "drivewealth" });
      expect(broker).toBe(alpacaMock);
    });

    it("should return fallback broker when preferred is not connected", async () => {
      await router.connectBroker("drivewealth", mockCredentials());
      const broker = router.getBroker({
        preferredBroker: "alpaca",
        fallbackBroker: "drivewealth",
      });
      expect(broker).toBe(dwMock);
    });

    it("should prefer capability match over fallback", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const broker = router.getBroker({
        preferredBroker: "schwab",
        requireCapability: "cryptoTrading",
        fallbackBroker: "drivewealth",
      });
      // Alpaca supports crypto, so it should be chosen
      expect(broker).toBe(alpacaMock);
    });

    it("should skip preferred broker if it lacks required capability", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      // DriveWealth does not support cryptoTrading
      const broker = router.getBroker({
        preferredBroker: "drivewealth",
        requireCapability: "cryptoTrading",
      });
      expect(broker).toBe(alpacaMock);
    });

    it("should return preferred broker if it has required capability", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const broker = router.getBroker({
        preferredBroker: "alpaca",
        requireCapability: "cryptoTrading",
      });
      expect(broker).toBe(alpacaMock);
    });
  });

  describe("getBrokerForCapability", () => {
    it("should return broker with requested capability", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      const broker = router.getBrokerForCapability("cryptoTrading");
      expect(broker).toBe(alpacaMock);
    });

    it("should return null when no connected broker has capability", async () => {
      await router.connectBroker("drivewealth", mockCredentials());
      const broker = router.getBrokerForCapability("cryptoTrading");
      expect(broker).toBeNull();
    });

    it("should return null when no brokers connected", () => {
      const broker = router.getBrokerForCapability("fractionalShares");
      expect(broker).toBeNull();
    });

    it("should find DriveWealth for fractionalShares", async () => {
      await router.connectBroker("drivewealth", mockCredentials());
      const broker = router.getBrokerForCapability("fractionalShares");
      expect(broker).toBe(dwMock);
    });

    it("should find only Alpaca for streamingQuotes", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());
      const broker = router.getBrokerForCapability("streamingQuotes");
      expect(broker).toBe(alpacaMock);
    });
  });

  // ==========================================================================
  // AGGREGATE OPERATIONS
  // ==========================================================================

  describe("getAllPositions", () => {
    it("should aggregate positions from all connected brokers", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const positions = await router.getAllPositions();
      expect(positions.size).toBe(2);
      expect(positions.get("alpaca")).toHaveLength(2);
      expect(positions.get("drivewealth")).toHaveLength(2);
    });

    it("should return empty map when no brokers connected", async () => {
      const positions = await router.getAllPositions();
      expect(positions.size).toBe(0);
    });

    it("should include positions from a single broker", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      const positions = await router.getAllPositions();
      expect(positions.size).toBe(1);
      expect(positions.get("alpaca")).toHaveLength(2);
    });

    it("should handle a broker that errors on getPositions", async () => {
      const failingBroker = createMockBrokerInstance();
      (failingBroker.getPositions as jest.Mock).mockRejectedValue(
        new Error("API error"),
      );

      factory.register({
        type: "schwab",
        create: () => failingBroker,
        capabilities: alpacaCapabilities(),
      });

      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("schwab", mockCredentials());

      const positions = await router.getAllPositions();
      // Only Alpaca should be in the result; Schwab failed
      expect(positions.has("alpaca")).toBe(true);
      expect(positions.has("schwab")).toBe(false);
    });
  });

  describe("getAllOrders", () => {
    it("should aggregate orders from all connected brokers", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const orders = await router.getAllOrders();
      expect(orders.size).toBe(2);
      expect(orders.get("alpaca")).toHaveLength(1);
      expect(orders.get("drivewealth")).toHaveLength(1);
    });

    it("should return empty map when no brokers connected", async () => {
      const orders = await router.getAllOrders();
      expect(orders.size).toBe(0);
    });

    it("should pass filters to each broker", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const filters = { status: "new" as const, symbol: "AAPL" };
      await router.getAllOrders(filters);

      expect(alpacaMock.getOrders).toHaveBeenCalledWith(filters);
      expect(dwMock.getOrders).toHaveBeenCalledWith(filters);
    });

    it("should handle a broker that errors on getOrders", async () => {
      const failingBroker = createMockBrokerInstance();
      (failingBroker.getOrders as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      factory.register({
        type: "schwab",
        create: () => failingBroker,
        capabilities: alpacaCapabilities(),
      });

      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("schwab", mockCredentials());

      const orders = await router.getAllOrders();
      expect(orders.has("alpaca")).toBe(true);
      expect(orders.has("schwab")).toBe(false);
    });
  });

  describe("getAggregateAccount", () => {
    it("should aggregate account info from all connected brokers", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const aggregate = await router.getAggregateAccount();
      expect(aggregate.totalCash).toBe(80000); // 50000 + 30000
      expect(aggregate.totalPortfolioValue).toBe(120000); // 75000 + 45000
      expect(aggregate.totalBuyingPower).toBe(160000); // 100000 + 60000
      expect(aggregate.brokers.size).toBe(2);
    });

    it("should return zeros when no brokers connected", async () => {
      const aggregate = await router.getAggregateAccount();
      expect(aggregate.totalCash).toBe(0);
      expect(aggregate.totalPortfolioValue).toBe(0);
      expect(aggregate.totalBuyingPower).toBe(0);
      expect(aggregate.brokers.size).toBe(0);
    });

    it("should include individual broker account info in map", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("drivewealth", mockCredentials());

      const aggregate = await router.getAggregateAccount();
      const alpacaAccount = aggregate.brokers.get("alpaca");
      const dwAccount = aggregate.brokers.get("drivewealth");

      expect(alpacaAccount?.cash).toBe(50000);
      expect(dwAccount?.cash).toBe(30000);
    });

    it("should handle a single broker", async () => {
      await router.connectBroker("alpaca", mockCredentials());
      const aggregate = await router.getAggregateAccount();
      expect(aggregate.totalCash).toBe(50000);
      expect(aggregate.totalPortfolioValue).toBe(75000);
      expect(aggregate.brokers.size).toBe(1);
    });

    it("should handle a broker that errors on getAccount", async () => {
      const failingBroker = createMockBrokerInstance();
      (failingBroker.getAccount as jest.Mock).mockRejectedValue(
        new Error("Auth expired"),
      );

      factory.register({
        type: "schwab",
        create: () => failingBroker,
        capabilities: alpacaCapabilities(),
      });

      await router.connectBroker("alpaca", mockCredentials());
      await router.connectBroker("schwab", mockCredentials());

      const aggregate = await router.getAggregateAccount();
      // Only Alpaca account should be counted
      expect(aggregate.totalCash).toBe(50000);
      expect(aggregate.brokers.size).toBe(1);
    });
  });
});
