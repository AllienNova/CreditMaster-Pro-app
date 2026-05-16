import ConnectorRegistry from "../registry";
import {
  BaseConnector,
  ConnectorConfig,
  ConnectorType,
  HealthCheckResult,
} from "../types";

// ============================================================================
// Mock connector builder
// ============================================================================

function makeConfig(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
  return {
    name: "test-provider",
    provider: "test-provider",
    version: "1.0.0",
    priority: 1,
    regions: ["US"],
    capabilities: [],
    rateLimits: { requestsPerMinute: 60 },
    retry: { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000, exponentialBase: 2 },
    cache: { enabled: false, defaultTTLSeconds: 60 },
    healthCheckInterval: 60000,
    timeout: 5000,
    enabled: true,
    ...overrides,
  };
}

class MockConnector extends BaseConnector {
  readonly name: string;
  readonly type: ConnectorType = "banking";
  private _initialized = false;
  private _healthResult: HealthCheckResult;
  private _methodResult: unknown = "ok";
  private _shouldFailInit = false;

  constructor(
    name: string,
    config: Partial<ConnectorConfig> = {},
    opts: { healthResult?: HealthCheckResult; methodResult?: unknown; failInit?: boolean } = {},
  ) {
    super(makeConfig({ name, provider: name, ...config }));
    this.name = name;
    this._healthResult = opts.healthResult ?? { success: true, latencyMs: 5 };
    this._methodResult = opts.methodResult ?? "ok";
    this._shouldFailInit = opts.failInit ?? false;
  }

  async initialize(): Promise<void> {
    if (this._shouldFailInit) throw new Error("init failed");
    this._initialized = true;
    this.initialized = true;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return this._healthResult;
  }

  async disconnect(): Promise<void> {
    this._initialized = false;
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  async testMethod(): Promise<unknown> {
    return this._methodResult;
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("ConnectorRegistry", () => {
  beforeEach(() => {
    ConnectorRegistry.resetInstance();
  });

  afterEach(() => {
    ConnectorRegistry.resetInstance();
  });

  // --------------------------------------------------------------------------
  // getInstance / singleton
  // --------------------------------------------------------------------------

  describe("getInstance", () => {
    it("returns the same instance on repeated calls", () => {
      const a = ConnectorRegistry.getInstance();
      const b = ConnectorRegistry.getInstance();
      expect(a).toBe(b);
    });

    it("returns a new instance after resetInstance", () => {
      const a = ConnectorRegistry.getInstance();
      ConnectorRegistry.resetInstance();
      const b = ConnectorRegistry.getInstance();
      expect(a).not.toBe(b);
    });
  });

  // --------------------------------------------------------------------------
  // register
  // --------------------------------------------------------------------------

  describe("register", () => {
    it("registers a connector so getConnectors returns it", () => {
      const registry = ConnectorRegistry.getInstance();
      const connector = new MockConnector("prov-a");
      registry.register("banking", connector);
      expect(registry.getConnectors("banking")).toContain(connector);
    });

    it("initializes health status as unknown after registration", () => {
      const registry = ConnectorRegistry.getInstance();
      const connector = new MockConnector("prov-b");
      registry.register("banking", connector);
      const health = registry.getHealth("prov-b");
      expect(health?.status).toBe("unknown");
    });

    it("registering a second connector of the same type returns both", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("prov-1"));
      registry.register("banking", new MockConnector("prov-2"));
      expect(registry.getConnectors("banking").length).toBe(2);
    });

    it("getConnectors returns empty array for unregistered type", () => {
      const registry = ConnectorRegistry.getInstance();
      expect(registry.getConnectors("credit")).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // unregister
  // --------------------------------------------------------------------------

  describe("unregister", () => {
    it("returns true and removes the connector", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("prov-x"));
      const result = registry.unregister("banking", "prov-x");
      expect(result).toBe(true);
      expect(registry.getConnectors("banking")).toHaveLength(0);
    });

    it("returns false when provider does not exist", () => {
      const registry = ConnectorRegistry.getInstance();
      expect(registry.unregister("banking", "nonexistent")).toBe(false);
    });

    it("returns false when connector type has no registrations", () => {
      const registry = ConnectorRegistry.getInstance();
      expect(registry.unregister("credit", "any")).toBe(false);
    });

    it("removes health status entry after unregister", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("prov-z"));
      registry.unregister("banking", "prov-z");
      expect(registry.getHealth("prov-z")).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getConnector
  // --------------------------------------------------------------------------

  describe("getConnector", () => {
    it("retrieves a registered connector by name", () => {
      const registry = ConnectorRegistry.getInstance();
      const connector = new MockConnector("named-provider");
      registry.register("banking", connector);
      expect(registry.getConnector("banking", "named-provider")).toBe(connector);
    });

    it("returns undefined for unregistered provider name", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("prov-a"));
      expect(registry.getConnector("banking", "prov-x")).toBeUndefined();
    });

    it("returns undefined for unregistered type", () => {
      const registry = ConnectorRegistry.getInstance();
      expect(registry.getConnector("credit", "any")).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getAvailableProviders
  // --------------------------------------------------------------------------

  describe("getAvailableProviders", () => {
    it("returns provider names sorted by priority (lower = higher priority)", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("low-priority", { priority: 10 }));
      registry.register("banking", new MockConnector("high-priority", { priority: 1 }));
      const providers = registry.getAvailableProviders("banking");
      expect(providers[0]).toBe("high-priority");
    });

    it("excludes providers marked as down", async () => {
      const registry = ConnectorRegistry.getInstance();
      const connector = new MockConnector("will-fail", {}, {
        healthResult: { success: false, latencyMs: 100 },
      });
      registry.register("banking", connector);
      // Simulate 3 consecutive failures to mark as down
      await registry.checkAllHealth();
      await registry.checkAllHealth();
      await registry.checkAllHealth();
      const providers = registry.getAvailableProviders("banking");
      expect(providers).not.toContain("will-fail");
    });

    it("returns empty array when no providers registered", () => {
      const registry = ConnectorRegistry.getInstance();
      expect(registry.getAvailableProviders("insurance")).toEqual([]);
    });

    it("filters by region when specified", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("us-only", { regions: ["US"] }));
      registry.register("banking", new MockConnector("gb-only", { regions: ["GB"] }));
      const providers = registry.getAvailableProviders("banking", "US");
      expect(providers).toContain("us-only");
      expect(providers).not.toContain("gb-only");
    });

    it("includes connector with wildcard region for any region query", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("global", { regions: ["*"] }));
      const providers = registry.getAvailableProviders("banking", "AU");
      expect(providers).toContain("global");
    });

    it("enforces circuit breaker if set", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("blocked"));
      registry.setCircuitBreakerCheck(() => false); // block all
      const providers = registry.getAvailableProviders("banking");
      expect(providers).toHaveLength(0);
    });

    it("passes through when circuit breaker allows", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("allowed"));
      registry.setCircuitBreakerCheck(() => true); // allow all
      const providers = registry.getAvailableProviders("banking");
      expect(providers).toContain("allowed");
    });
  });

  // --------------------------------------------------------------------------
  // executeWithFallback
  // --------------------------------------------------------------------------

  describe("executeWithFallback", () => {
    it("returns success result when method succeeds", async () => {
      const registry = ConnectorRegistry.getInstance();
      const connector = new MockConnector("exec-prov", {}, { methodResult: "data-value" });
      registry.register("banking", connector);
      const result = await registry.executeWithFallback("banking", "testMethod", []);
      expect(result.success).toBe(true);
      expect(result.data).toBe("data-value");
      expect(result.provider).toBe("exec-prov");
    });

    it("returns NO_PROVIDERS error when no providers registered", async () => {
      const registry = ConnectorRegistry.getInstance();
      const result = await registry.executeWithFallback("insurance", "someMethod", []);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NO_PROVIDERS");
    });

    it("initializes uninitiated connector before executing", async () => {
      const registry = ConnectorRegistry.getInstance();
      const connector = new MockConnector("lazy");
      expect(connector.isInitialized()).toBe(false);
      registry.register("banking", connector);
      await registry.executeWithFallback("banking", "testMethod", []);
      expect(connector.isInitialized()).toBe(true);
    });

    it("returns error when method does not exist on connector", async () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("prov"));
      const result = await registry.executeWithFallback("banking", "nonExistentMethod", []);
      expect(result.success).toBe(false);
    });

    it("falls back to second provider when first fails", async () => {
      const registry = ConnectorRegistry.getInstance();

      class FailingConnector extends MockConnector {
        async testMethod(): Promise<unknown> {
          throw new Error("primary failed");
        }
      }

      const failing = new FailingConnector("prov-fail", { priority: 1 });
      (failing as any)._initialized = true; // skip init

      const working = new MockConnector("prov-ok", { priority: 2 }, { methodResult: "fallback" });
      (working as any)._initialized = true;

      registry.register("banking", failing);
      registry.register("banking", working);

      const result = await registry.executeWithFallback<string>(
        "banking",
        "testMethod",
        [],
        { maxRetries: 0 },
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe("fallback");
      expect(result.provider).toBe("prov-ok");
    });

    it("respects fallbackEnabled:false — stops after first provider", async () => {
      const registry = ConnectorRegistry.getInstance();

      class FailingConnector extends MockConnector {
        async testMethod(): Promise<unknown> {
          throw new Error("fail");
        }
      }

      const failing = new FailingConnector("first", { priority: 1 });
      (failing as any)._initialized = true;

      const backup = new MockConnector("second", { priority: 2 });
      (backup as any)._initialized = true;

      registry.register("banking", failing);
      registry.register("banking", backup);

      const result = await registry.executeWithFallback(
        "banking",
        "testMethod",
        [],
        { fallbackEnabled: false, maxRetries: 0 },
      );
      expect(result.success).toBe(false);
      expect(result.provider).toBe("first");
    });

    it("uses preferredProvider first even if lower priority", async () => {
      const registry = ConnectorRegistry.getInstance();
      const preferred = new MockConnector("preferred", { priority: 99 }, { methodResult: "from-preferred" });
      (preferred as any)._initialized = true;
      const other = new MockConnector("other", { priority: 1 });
      (other as any)._initialized = true;
      registry.register("banking", preferred);
      registry.register("banking", other);
      const result = await registry.executeWithFallback<string>(
        "banking",
        "testMethod",
        [],
        { preferredProvider: "preferred", maxRetries: 0 },
      );
      expect(result.provider).toBe("preferred");
      expect(result.data).toBe("from-preferred");
    });
  });

  // --------------------------------------------------------------------------
  // Health tracking
  // --------------------------------------------------------------------------

  describe("health tracking", () => {
    it("marks provider as healthy after successful health check", async () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("healthy-prov"));
      await registry.checkAllHealth();
      expect(registry.getHealth("healthy-prov")?.status).toBe("healthy");
    });

    it("increments consecutiveFailures after failed health check", async () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("fail-prov", {}, {
        healthResult: { success: false, latencyMs: 0 },
      }));
      await registry.checkAllHealth();
      expect(registry.getHealth("fail-prov")?.consecutiveFailures).toBe(1);
    });

    it("marks provider as down after 3 consecutive failures (unhealthyThreshold)", async () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("down-prov", {}, {
        healthResult: { success: false, latencyMs: 0 },
      }));
      await registry.checkAllHealth();
      await registry.checkAllHealth();
      await registry.checkAllHealth();
      expect(registry.getHealth("down-prov")?.status).toBe("down");
    });

    it("getHealth returns undefined for unregistered provider", () => {
      const registry = ConnectorRegistry.getInstance();
      expect(registry.getHealth("nobody")).toBeUndefined();
    });

    it("getAllHealth returns a map with all registered providers", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("a"));
      registry.register("banking", new MockConnector("b"));
      const all = registry.getAllHealth();
      expect(all.has("a")).toBe(true);
      expect(all.has("b")).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // getStats
  // --------------------------------------------------------------------------

  describe("getStats", () => {
    it("returns zero total connectors when none registered", () => {
      const registry = ConnectorRegistry.getInstance();
      expect(registry.getStats().totalConnectors).toBe(0);
    });

    it("counts connectors by type correctly", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("b1"));
      registry.register("banking", new MockConnector("b2"));
      registry.register("credit", new MockConnector("c1"));
      const stats = registry.getStats();
      expect(stats.connectorsByType["banking"]).toBe(2);
      expect(stats.connectorsByType["credit"]).toBe(1);
      expect(stats.totalConnectors).toBe(3);
    });

    it("healthSummary includes unknown count for freshly registered", () => {
      const registry = ConnectorRegistry.getInstance();
      registry.register("banking", new MockConnector("x"));
      expect(registry.getStats().healthSummary.unknown).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Event emitter
  // --------------------------------------------------------------------------

  describe("on / event emitter", () => {
    it("calls handler when health_degraded event fires", async () => {
      const registry = ConnectorRegistry.getInstance();
      const events: string[] = [];
      registry.on((e) => { events.push(e.type); });
      registry.register("banking", new MockConnector("degraded-prov", {}, {
        healthResult: { success: false, latencyMs: 0 },
      }));
      // 3 failures to trigger health_degraded (down)
      await registry.checkAllHealth();
      await registry.checkAllHealth();
      await registry.checkAllHealth();
      expect(events).toContain("health_degraded");
    });

    it("unsubscribe removes the handler", async () => {
      const registry = ConnectorRegistry.getInstance();
      const events: string[] = [];
      const unsub = registry.on((e) => { events.push(e.type); });
      unsub();
      registry.register("banking", new MockConnector("prov"));
      await registry.checkAllHealth();
      expect(events).toHaveLength(0);
    });

    it("emits circuit_open event when circuit breaker blocks a provider", () => {
      const registry = ConnectorRegistry.getInstance();
      const events: string[] = [];
      registry.on((e) => { events.push(e.type); });
      registry.register("banking", new MockConnector("blocked"));
      registry.setCircuitBreakerCheck(() => false);
      registry.getAvailableProviders("banking");
      expect(events).toContain("circuit_open");
    });
  });
});
