/**
 * Broker Factory
 *
 * Registry-based factory that instantiates broker implementations by type.
 * Supports capability querying to determine which brokers support specific features.
 * Brokers are registered lazily to avoid circular dependencies.
 */

import type { BrokerInterface, SupportedBroker } from "./broker-interface";

// ============================================================================
// TYPES
// ============================================================================

export interface BrokerCapabilities {
  fractionalShares: boolean;
  extendedHours: boolean;
  optionsTrading: boolean;
  cryptoTrading: boolean;
  paperTrading: boolean;
  bracketOrders: boolean;
  ocoOrders: boolean;
  trailingStop: boolean;
  level2Data: boolean;
  streamingQuotes: boolean;
}

export interface BrokerRegistration {
  type: SupportedBroker;
  create: () => BrokerInterface;
  capabilities: BrokerCapabilities;
}

// ============================================================================
// BROKER FACTORY CLASS
// ============================================================================

export class BrokerFactory {
  private readonly registry: Map<SupportedBroker, BrokerRegistration> =
    new Map();

  /**
   * Register a broker implementation with its capabilities.
   * If a broker with the same type is already registered, it will be replaced.
   */
  register(registration: BrokerRegistration): void {
    this.registry.set(registration.type, registration);
  }

  /**
   * Create a new instance of the specified broker type.
   * Throws if the broker type is not registered.
   */
  create(type: SupportedBroker): BrokerInterface {
    const registration = this.registry.get(type);
    if (!registration) {
      throw new Error(
        `Broker "${type}" is not registered. Available brokers: ${this.listAvailable().join(", ") || "none"}`,
      );
    }
    return registration.create();
  }

  /**
   * Get the capabilities of a registered broker type.
   * Throws if the broker type is not registered.
   */
  getCapabilities(type: SupportedBroker): BrokerCapabilities {
    const registration = this.registry.get(type);
    if (!registration) {
      throw new Error(
        `Broker "${type}" is not registered. Cannot retrieve capabilities.`,
      );
    }
    return { ...registration.capabilities };
  }

  /**
   * List all registered broker types.
   */
  listAvailable(): SupportedBroker[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if a broker type is registered.
   */
  isRegistered(type: SupportedBroker): boolean {
    return this.registry.has(type);
  }

  /**
   * Find all registered brokers that have a specific capability.
   */
  findBrokersWithCapability(
    capability: keyof BrokerCapabilities,
  ): SupportedBroker[] {
    const result: SupportedBroker[] = [];
    for (const [type, registration] of this.registry) {
      if (registration.capabilities[capability]) {
        result.push(type);
      }
    }
    return result;
  }

  /**
   * Remove a broker registration.
   */
  unregister(type: SupportedBroker): boolean {
    return this.registry.delete(type);
  }

  /**
   * Get the number of registered brokers.
   */
  get size(): number {
    return this.registry.size;
  }
}

// ============================================================================
// DEFAULT CAPABILITIES
// ============================================================================

export const ALPACA_CAPABILITIES: BrokerCapabilities = {
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

export const DRIVEWEALTH_CAPABILITIES: BrokerCapabilities = {
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

// ============================================================================
// FACTORY SINGLETON WITH DEFAULT REGISTRATIONS
// ============================================================================

/**
 * Create a BrokerFactory with Alpaca and DriveWealth pre-registered.
 * Uses dynamic imports internally to avoid circular dependencies.
 */
export function createBrokerFactory(): BrokerFactory {
  const factory = new BrokerFactory();

  factory.register({
    type: "alpaca",
    create: () => {
      // Lazy require to avoid circular dependency issues at module level
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AlpacaBroker } = require("./alpaca-broker") as {
        AlpacaBroker: new () => BrokerInterface;
      };
      return new AlpacaBroker();
    },
    capabilities: ALPACA_CAPABILITIES,
  });

  factory.register({
    type: "drivewealth",
    create: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DriveWealthBroker } = require("./drivewealth-broker") as {
        DriveWealthBroker: new () => BrokerInterface;
      };
      return new DriveWealthBroker();
    },
    capabilities: DRIVEWEALTH_CAPABILITIES,
  });

  return factory;
}

/** Default singleton factory instance */
let defaultFactory: BrokerFactory | null = null;

export function getBrokerFactory(): BrokerFactory {
  defaultFactory ??= createBrokerFactory();
  return defaultFactory;
}
