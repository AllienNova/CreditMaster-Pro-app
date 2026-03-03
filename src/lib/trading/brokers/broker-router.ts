/**
 * Broker Router
 *
 * Routes trading operations to the best available broker based on:
 * - User preference (preferred/fallback broker)
 * - Required capabilities (fractional shares, crypto, etc.)
 * - Connection status (only routes to connected brokers)
 *
 * Also provides aggregate views across all connected brokers:
 * - Combined positions, orders, and account info
 */

import type {
  BrokerInterface,
  BrokerConnection,
  BrokerCredentials,
  SupportedBroker,
  AccountInfo,
  Position,
  Order,
  OrderFilters,
} from "./broker-interface";
import type { BrokerCapabilities, BrokerFactory } from "./broker-factory";

// ============================================================================
// TYPES
// ============================================================================

export interface BrokerSession {
  broker: SupportedBroker;
  instance: BrokerInterface;
  connection: BrokerConnection;
  connectedAt: Date;
}

export interface RoutingPreference {
  preferredBroker?: SupportedBroker;
  fallbackBroker?: SupportedBroker;
  requireCapability?: keyof BrokerCapabilities;
}

export interface AggregateAccountInfo {
  totalCash: number;
  totalPortfolioValue: number;
  totalBuyingPower: number;
  brokers: Map<SupportedBroker, AccountInfo>;
}

// ============================================================================
// BROKER ROUTER CLASS
// ============================================================================

export class BrokerRouter {
  private readonly sessions: Map<SupportedBroker, BrokerSession> = new Map();
  private readonly factory: BrokerFactory;

  constructor(factory: BrokerFactory) {
    this.factory = factory;
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Connect a broker and store the active session.
   * Throws if the broker type is not registered in the factory.
   * Throws if the broker is already connected.
   */
  async connectBroker(
    type: SupportedBroker,
    credentials: BrokerCredentials,
  ): Promise<BrokerSession> {
    if (this.sessions.has(type)) {
      throw new Error(
        `Broker "${type}" is already connected. Disconnect first before reconnecting.`,
      );
    }

    const instance = this.factory.create(type);
    const connection = await instance.connect(credentials);

    const session: BrokerSession = {
      broker: type,
      instance,
      connection,
      connectedAt: new Date(),
    };

    this.sessions.set(type, session);
    return session;
  }

  /**
   * Disconnect a specific broker and remove its session.
   * Throws if the broker is not connected.
   */
  async disconnectBroker(type: SupportedBroker): Promise<void> {
    const session = this.sessions.get(type);
    if (!session) {
      throw new Error(`Broker "${type}" is not connected.`);
    }

    await session.instance.disconnect();
    this.sessions.delete(type);
  }

  /**
   * Disconnect all connected brokers.
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];
    for (const session of this.sessions.values()) {
      disconnectPromises.push(session.instance.disconnect());
    }
    await Promise.all(disconnectPromises);
    this.sessions.clear();
  }

  /**
   * List all currently connected broker types.
   */
  getConnectedBrokers(): SupportedBroker[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get the session for a specific broker type.
   * Returns undefined if not connected.
   */
  getSession(type: SupportedBroker): BrokerSession | undefined {
    return this.sessions.get(type);
  }

  /**
   * Check if any brokers are connected.
   */
  hasConnectedBrokers(): boolean {
    return this.sessions.size > 0;
  }

  // ==========================================================================
  // ROUTING
  // ==========================================================================

  /**
   * Get a broker instance based on routing preference.
   *
   * Resolution order:
   * 1. If preferredBroker is specified and connected, use it
   * 2. If requireCapability is specified, find a connected broker with that capability
   * 3. If fallbackBroker is specified and connected, use it
   * 4. Use the first connected broker
   *
   * Throws if no connected broker matches the criteria.
   */
  getBroker(preference?: RoutingPreference): BrokerInterface {
    if (!preference) {
      return this.getFirstConnectedBroker();
    }

    // Try preferred broker first
    if (preference.preferredBroker) {
      const session = this.sessions.get(preference.preferredBroker);
      if (session) {
        // If a capability is also required, check it
        if (preference.requireCapability) {
          const capabilities = this.factory.getCapabilities(
            preference.preferredBroker,
          );
          if (capabilities[preference.requireCapability]) {
            return session.instance;
          }
          // Preferred broker doesn't have the capability, fall through
        } else {
          return session.instance;
        }
      }
    }

    // Try to find a connected broker with the required capability
    if (preference.requireCapability) {
      const broker = this.getBrokerForCapability(preference.requireCapability);
      if (broker) {
        return broker;
      }
    }

    // Try fallback broker
    if (preference.fallbackBroker) {
      const session = this.sessions.get(preference.fallbackBroker);
      if (session) {
        return session.instance;
      }
    }

    // Fall through to first connected broker
    return this.getFirstConnectedBroker();
  }

  /**
   * Get a connected broker that has the requested capability.
   * Returns null if no connected broker has the capability.
   */
  getBrokerForCapability(
    capability: keyof BrokerCapabilities,
  ): BrokerInterface | null {
    for (const [type, session] of this.sessions) {
      try {
        const capabilities = this.factory.getCapabilities(type);
        if (capabilities[capability]) {
          return session.instance;
        }
      } catch {
        // Skip brokers whose capabilities cannot be retrieved
        continue;
      }
    }
    return null;
  }

  // ==========================================================================
  // AGGREGATE OPERATIONS
  // ==========================================================================

  /**
   * Get positions from all connected brokers.
   * Returns a map keyed by broker type.
   */
  async getAllPositions(): Promise<Map<SupportedBroker, Position[]>> {
    const result = new Map<SupportedBroker, Position[]>();

    const entries = Array.from(this.sessions.entries());
    const positionResults = await Promise.allSettled(
      entries.map(async ([type, session]) => ({
        type,
        positions: await session.instance.getPositions(),
      })),
    );

    for (const settled of positionResults) {
      if (settled.status === "fulfilled") {
        result.set(settled.value.type, settled.value.positions);
      }
    }

    return result;
  }

  /**
   * Get orders from all connected brokers.
   * Returns a map keyed by broker type.
   */
  async getAllOrders(
    filters?: OrderFilters,
  ): Promise<Map<SupportedBroker, Order[]>> {
    const result = new Map<SupportedBroker, Order[]>();

    const entries = Array.from(this.sessions.entries());
    const orderResults = await Promise.allSettled(
      entries.map(async ([type, session]) => ({
        type,
        orders: await session.instance.getOrders(filters),
      })),
    );

    for (const settled of orderResults) {
      if (settled.status === "fulfilled") {
        result.set(settled.value.type, settled.value.orders);
      }
    }

    return result;
  }

  /**
   * Get aggregated account information across all connected brokers.
   * Sums cash, portfolio value, and buying power across all accounts.
   */
  async getAggregateAccount(): Promise<AggregateAccountInfo> {
    const brokers = new Map<SupportedBroker, AccountInfo>();
    let totalCash = 0;
    let totalPortfolioValue = 0;
    let totalBuyingPower = 0;

    const entries = Array.from(this.sessions.entries());
    const accountResults = await Promise.allSettled(
      entries.map(async ([type, session]) => ({
        type,
        account: await session.instance.getAccount(),
      })),
    );

    for (const settled of accountResults) {
      if (settled.status === "fulfilled") {
        const { type, account } = settled.value;
        brokers.set(type, account);
        totalCash += account.cash;
        totalPortfolioValue += account.portfolioValue;
        totalBuyingPower += account.buyingPower;
      }
    }

    return {
      totalCash,
      totalPortfolioValue,
      totalBuyingPower,
      brokers,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getFirstConnectedBroker(): BrokerInterface {
    const firstSession = this.sessions.values().next();
    if (firstSession.done) {
      throw new Error(
        "No brokers are connected. Connect at least one broker before routing.",
      );
    }
    return firstSession.value.instance;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new BrokerRouter with the given factory.
 */
export function createBrokerRouter(factory: BrokerFactory): BrokerRouter {
  return new BrokerRouter(factory);
}
