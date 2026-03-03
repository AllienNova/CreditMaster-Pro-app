/**
 * BrokerFactory - Comprehensive Test Suite
 *
 * Tests broker registration, creation, capability querying,
 * listing, and error handling.
 */

import { BrokerFactory } from "../brokers/broker-factory";
import type {
  BrokerCapabilities,
  BrokerRegistration,
} from "../brokers/broker-factory";
import type { BrokerInterface, SupportedBroker } from "../brokers/broker-interface";

// ============================================================================
// MOCK SETUP
// ============================================================================

function createMockBroker(): BrokerInterface {
  return {
    connect: jest.fn().mockResolvedValue({
      connected: true,
      accountId: "mock-acc",
      buyingPower: 100000,
      cash: 50000,
      portfolioValue: 75000,
    }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getConnectionStatus: jest.fn().mockReturnValue({
      connected: false,
      lastHeartbeat: new Date(),
      latencyMs: 0,
      marketStatus: "closed" as const,
    }),
    getAccount: jest.fn().mockResolvedValue({
      id: "mock-acc",
      status: "active" as const,
      currency: "USD",
      cash: 50000,
      portfolioValue: 75000,
      buyingPower: 100000,
      lastEquity: 74000,
      multiplier: 1,
      patternDayTrader: false,
      tradingBlocked: false,
      transfersBlocked: false,
    }),
    getPositions: jest.fn().mockResolvedValue([]),
    getPosition: jest.fn().mockResolvedValue(null),
    getOrders: jest.fn().mockResolvedValue([]),
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

function makeRegistration(
  type: SupportedBroker,
  capabilities: BrokerCapabilities,
): BrokerRegistration {
  return {
    type,
    create: () => createMockBroker(),
    capabilities,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("BrokerFactory", () => {
  let factory: BrokerFactory;

  beforeEach(() => {
    factory = new BrokerFactory();
  });

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  describe("register", () => {
    it("should register a broker", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      expect(factory.isRegistered("alpaca")).toBe(true);
    });

    it("should register multiple brokers", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );
      expect(factory.isRegistered("alpaca")).toBe(true);
      expect(factory.isRegistered("drivewealth")).toBe(true);
    });

    it("should replace an existing registration with the same type", () => {
      const caps1 = alpacaCapabilities();
      const caps2 = { ...alpacaCapabilities(), cryptoTrading: false };

      factory.register(makeRegistration("alpaca", caps1));
      factory.register(makeRegistration("alpaca", caps2));

      expect(factory.size).toBe(1);
      const retrieved = factory.getCapabilities("alpaca");
      expect(retrieved.cryptoTrading).toBe(false);
    });

    it("should increase size on new registrations", () => {
      expect(factory.size).toBe(0);
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      expect(factory.size).toBe(1);
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );
      expect(factory.size).toBe(2);
    });
  });

  // ==========================================================================
  // CREATION
  // ==========================================================================

  describe("create", () => {
    it("should create a broker instance for a registered type", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      const broker = factory.create("alpaca");
      expect(broker).toBeDefined();
      expect(typeof broker.connect).toBe("function");
      expect(typeof broker.placeOrder).toBe("function");
    });

    it("should create new instances on each call", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      const broker1 = factory.create("alpaca");
      const broker2 = factory.create("alpaca");
      expect(broker1).not.toBe(broker2);
    });

    it("should throw when creating an unregistered broker", () => {
      expect(() => factory.create("alpaca")).toThrow(
        'Broker "alpaca" is not registered',
      );
    });

    it("should include available brokers in error message when unregistered", () => {
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );
      expect(() => factory.create("alpaca")).toThrow("drivewealth");
    });

    it("should say 'none' when no brokers available and creating fails", () => {
      expect(() => factory.create("alpaca")).toThrow("none");
    });

    it("should create different broker types", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );

      const alpaca = factory.create("alpaca");
      const dw = factory.create("drivewealth");

      expect(alpaca).toBeDefined();
      expect(dw).toBeDefined();
      expect(alpaca).not.toBe(dw);
    });
  });

  // ==========================================================================
  // CAPABILITIES
  // ==========================================================================

  describe("getCapabilities", () => {
    it("should return capabilities for a registered broker", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      const caps = factory.getCapabilities("alpaca");
      expect(caps.fractionalShares).toBe(true);
      expect(caps.cryptoTrading).toBe(true);
      expect(caps.extendedHours).toBe(true);
      expect(caps.bracketOrders).toBe(true);
    });

    it("should return a copy of capabilities (not a reference)", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      const caps1 = factory.getCapabilities("alpaca");
      const caps2 = factory.getCapabilities("alpaca");
      expect(caps1).not.toBe(caps2);
      expect(caps1).toEqual(caps2);
    });

    it("should throw when getting capabilities for unregistered broker", () => {
      expect(() => factory.getCapabilities("schwab")).toThrow(
        'Broker "schwab" is not registered',
      );
    });

    it("should reflect DriveWealth capabilities correctly", () => {
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );
      const caps = factory.getCapabilities("drivewealth");
      expect(caps.fractionalShares).toBe(true);
      expect(caps.extendedHours).toBe(false);
      expect(caps.cryptoTrading).toBe(false);
      expect(caps.bracketOrders).toBe(false);
      expect(caps.streamingQuotes).toBe(false);
    });
  });

  // ==========================================================================
  // LISTING & QUERYING
  // ==========================================================================

  describe("listAvailable", () => {
    it("should return empty array when no brokers registered", () => {
      expect(factory.listAvailable()).toEqual([]);
    });

    it("should list all registered broker types", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );

      const available = factory.listAvailable();
      expect(available).toContain("alpaca");
      expect(available).toContain("drivewealth");
      expect(available).toHaveLength(2);
    });
  });

  describe("isRegistered", () => {
    it("should return false for unregistered broker", () => {
      expect(factory.isRegistered("alpaca")).toBe(false);
    });

    it("should return true for registered broker", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      expect(factory.isRegistered("alpaca")).toBe(true);
    });

    it("should return false after unregister", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      factory.unregister("alpaca");
      expect(factory.isRegistered("alpaca")).toBe(false);
    });
  });

  describe("findBrokersWithCapability", () => {
    beforeEach(() => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );
    });

    it("should find brokers with fractionalShares", () => {
      const brokers = factory.findBrokersWithCapability("fractionalShares");
      expect(brokers).toContain("alpaca");
      expect(brokers).toContain("drivewealth");
    });

    it("should find only Alpaca for cryptoTrading", () => {
      const brokers = factory.findBrokersWithCapability("cryptoTrading");
      expect(brokers).toContain("alpaca");
      expect(brokers).not.toContain("drivewealth");
    });

    it("should find only Alpaca for bracketOrders", () => {
      const brokers = factory.findBrokersWithCapability("bracketOrders");
      expect(brokers).toEqual(["alpaca"]);
    });

    it("should find only Alpaca for streamingQuotes", () => {
      const brokers = factory.findBrokersWithCapability("streamingQuotes");
      expect(brokers).toEqual(["alpaca"]);
    });

    it("should return empty for level2Data (neither supports)", () => {
      const brokers = factory.findBrokersWithCapability("level2Data");
      expect(brokers).toHaveLength(0);
    });

    it("should return empty when no brokers registered", () => {
      const emptyFactory = new BrokerFactory();
      expect(
        emptyFactory.findBrokersWithCapability("fractionalShares"),
      ).toEqual([]);
    });
  });

  // ==========================================================================
  // UNREGISTER
  // ==========================================================================

  describe("unregister", () => {
    it("should remove a registered broker", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      const removed = factory.unregister("alpaca");
      expect(removed).toBe(true);
      expect(factory.isRegistered("alpaca")).toBe(false);
    });

    it("should return false when unregistering non-existent broker", () => {
      const removed = factory.unregister("alpaca");
      expect(removed).toBe(false);
    });

    it("should not affect other registrations", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );
      factory.unregister("alpaca");
      expect(factory.isRegistered("drivewealth")).toBe(true);
      expect(factory.size).toBe(1);
    });
  });

  // ==========================================================================
  // SIZE
  // ==========================================================================

  describe("size", () => {
    it("should be 0 for empty factory", () => {
      expect(factory.size).toBe(0);
    });

    it("should reflect number of registrations", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      expect(factory.size).toBe(1);
      factory.register(
        makeRegistration("drivewealth", driveWealthCapabilities()),
      );
      expect(factory.size).toBe(2);
    });

    it("should not double-count replaced registrations", () => {
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      factory.register(makeRegistration("alpaca", alpacaCapabilities()));
      expect(factory.size).toBe(1);
    });
  });
});
