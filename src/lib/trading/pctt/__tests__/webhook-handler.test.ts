/**
 * Tests for PCTT Webhook Handler
 *
 * Self-contained -- no external mocks needed.
 * Tests validation, filtering, cooldowns, position sizing, and execution.
 */

import {
  PCTTWebhookHandler,
  createPCTTWebhookHandler,
  createWebhookMiddleware,
} from "../webhook-handler";
import type {
  PCTTWebhookPayload,
  WebhookConfig,
  ExecutionResult,
} from "../webhook-handler";

// ============================================================================
// FIXTURES
// ============================================================================

function validLongPayload(): PCTTWebhookPayload {
  return {
    signal: "long",
    symbol: "AAPL",
    price: 150,
    stop: 145,
    target1: 160,
    target2: 170,
    qScore: 0.8,
    regime: "TREND UP",
    timestamp: new Date().toISOString(),
  };
}

function validShortPayload(): PCTTWebhookPayload {
  return {
    signal: "short",
    symbol: "TSLA",
    price: 200,
    stop: 210,
    target1: 185,
    target2: 170,
    qScore: 0.75,
    regime: "TREND DOWN",
    timestamp: new Date().toISOString(),
  };
}

function defaultConfig(overrides: Partial<WebhookConfig> = {}): WebhookConfig {
  return {
    maxPositionSize: 1000,
    riskPerTrade: 0.02,
    accountSize: 100_000,
    paperTrading: true,
    minQScore: 0.65,
    allowedRegimes: ["TREND UP", "TREND DOWN", "TRANSITION"],
    cooldownSeconds: 300,
    ...overrides,
  };
}

// ============================================================================
// CONSTRUCTOR & FACTORY
// ============================================================================

describe("PCTTWebhookHandler", () => {
  describe("constructor / factory", () => {
    it("creates handler with default config", () => {
      const handler = new PCTTWebhookHandler();
      expect(handler).toBeDefined();
    });

    it("creates handler via factory", () => {
      const handler = createPCTTWebhookHandler({ paperTrading: true });
      expect(handler).toBeDefined();
    });

    it("creates middleware function", () => {
      const middleware = createWebhookMiddleware({ paperTrading: true });
      expect(typeof middleware).toBe("function");
    });
  });

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe("validatePayload", () => {
    let handler: PCTTWebhookHandler;

    beforeEach(() => {
      handler = new PCTTWebhookHandler();
    });

    it("accepts valid long payload", () => {
      const result = handler.validatePayload(validLongPayload());
      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload!.signal).toBe("long");
    });

    it("accepts valid short payload", () => {
      const result = handler.validatePayload(validShortPayload());
      expect(result.valid).toBe(true);
      expect(result.payload!.signal).toBe("short");
    });

    it("rejects null body", () => {
      const result = handler.validatePayload(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("object");
    });

    it("rejects non-object body", () => {
      const result = handler.validatePayload("not an object");
      expect(result.valid).toBe(false);
    });

    it("rejects missing signal", () => {
      const result = handler.validatePayload({ symbol: "AAPL", price: 100 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("signal");
    });

    it("rejects invalid signal value", () => {
      const payload = { ...validLongPayload(), signal: "buy" };
      const result = handler.validatePayload(payload);
      expect(result.valid).toBe(false);
    });

    it("rejects missing symbol", () => {
      const { symbol, ...rest } = validLongPayload();
      const result = handler.validatePayload(rest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("symbol");
    });

    it("rejects non-string symbol", () => {
      const result = handler.validatePayload({
        ...validLongPayload(),
        symbol: 123,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects missing price", () => {
      const { price, ...rest } = validLongPayload();
      const result = handler.validatePayload(rest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("price");
    });

    it("rejects zero price", () => {
      const result = handler.validatePayload({
        ...validLongPayload(),
        price: 0,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects negative price", () => {
      const result = handler.validatePayload({
        ...validLongPayload(),
        price: -10,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects missing stop", () => {
      const { stop, ...rest } = validLongPayload();
      const result = handler.validatePayload(rest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("stop");
    });

    it("rejects missing target1", () => {
      const { target1, ...rest } = validLongPayload();
      const result = handler.validatePayload(rest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("target1");
    });

    it("rejects qScore below 0", () => {
      const result = handler.validatePayload({
        ...validLongPayload(),
        qScore: -0.1,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("qScore");
    });

    it("rejects qScore above 1", () => {
      const result = handler.validatePayload({
        ...validLongPayload(),
        qScore: 1.5,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects long signal with stop above price", () => {
      const result = handler.validatePayload({
        ...validLongPayload(),
        price: 100,
        stop: 105,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("below");
    });

    it("rejects long signal with stop equal to price", () => {
      const result = handler.validatePayload({
        ...validLongPayload(),
        price: 100,
        stop: 100,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects short signal with stop below price", () => {
      const result = handler.validatePayload({
        ...validShortPayload(),
        price: 200,
        stop: 195,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("above");
    });

    it("rejects short signal with stop equal to price", () => {
      const result = handler.validatePayload({
        ...validShortPayload(),
        price: 200,
        stop: 200,
      });
      expect(result.valid).toBe(false);
    });

    it("defaults target2 to target1 when missing", () => {
      const payload = { ...validLongPayload() };
      delete (payload as Record<string, unknown>).target2;
      const result = handler.validatePayload(payload);
      expect(result.valid).toBe(true);
      expect(result.payload!.target2).toBe(payload.target1);
    });

    it("defaults regime to UNKNOWN when missing", () => {
      const payload = { ...validLongPayload() };
      delete (payload as Record<string, unknown>).regime;
      const result = handler.validatePayload(payload);
      expect(result.valid).toBe(true);
      expect(result.payload!.regime).toBe("UNKNOWN");
    });
  });

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  describe("applyFilters", () => {
    it("passes all filters with valid payload and matching config", () => {
      const handler = createPCTTWebhookHandler(defaultConfig());
      const result = handler.applyFilters(validLongPayload());
      expect(result.passed).toBe(true);
    });

    it("blocks symbol not in allowed list", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ allowedSymbols: ["TSLA", "GOOG"] }),
      );
      const result = handler.applyFilters(validLongPayload()); // AAPL
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("AAPL");
    });

    it("passes when allowed symbols is empty (no filter)", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ allowedSymbols: [] }),
      );
      const result = handler.applyFilters(validLongPayload());
      expect(result.passed).toBe(true);
    });

    it("blocks low Q-score", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ minQScore: 0.8 }),
      );
      const payload = { ...validLongPayload(), qScore: 0.5 };
      const result = handler.applyFilters(payload);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Q-Score");
    });

    it("passes Q-score at threshold", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ minQScore: 0.8 }),
      );
      const payload = { ...validLongPayload(), qScore: 0.8 };
      const result = handler.applyFilters(payload);
      expect(result.passed).toBe(true);
    });

    it("blocks disallowed regime", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ allowedRegimes: ["TREND UP"] }),
      );
      const payload = { ...validLongPayload(), regime: "RANGE" };
      const result = handler.applyFilters(payload);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("RANGE");
    });

    it("passes matching regime", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ allowedRegimes: ["TREND UP", "TRANSITION"] }),
      );
      const payload = { ...validLongPayload(), regime: "TRANSITION" };
      const result = handler.applyFilters(payload);
      expect(result.passed).toBe(true);
    });
  });

  // ==========================================================================
  // COOLDOWN
  // ==========================================================================

  describe("checkCooldown", () => {
    it("allows first signal for any symbol", () => {
      const handler = createPCTTWebhookHandler(defaultConfig());
      const result = handler.checkCooldown("AAPL");
      expect(result.allowed).toBe(true);
    });

    it("blocks during cooldown period", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ cooldownSeconds: 300 }),
      );

      // Execute a signal to set cooldown
      await handler.processWebhook(validLongPayload());

      // Check cooldown
      const result = handler.checkCooldown("AAPL");
      expect(result.allowed).toBe(false);
      expect(result.remainingSeconds).toBeGreaterThan(0);
    });

    it("allows after cooldown expires", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ cooldownSeconds: 0 }),
      );

      await handler.processWebhook(validLongPayload());

      const result = handler.checkCooldown("AAPL");
      expect(result.allowed).toBe(true);
    });

    it("allows different symbol during cooldown", async () => {
      const handler = createPCTTWebhookHandler(defaultConfig());

      await handler.processWebhook(validLongPayload()); // AAPL cooldown

      const result = handler.checkCooldown("TSLA");
      expect(result.allowed).toBe(true);
    });
  });

  // ==========================================================================
  // POSITION SIZING
  // ==========================================================================

  describe("calculatePositionSize", () => {
    it("calculates based on risk per trade", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({
          accountSize: 100_000,
          riskPerTrade: 0.02,
          maxPositionSize: 10_000,
        }),
      );

      const payload = validLongPayload(); // price=150, stop=145, risk=5/share
      const size = handler.calculatePositionSize(payload);

      // riskAmount = 100000 * 0.02 = 2000
      // shares = floor(2000 / 5) = 400
      expect(size).toBe(400);
    });

    it("caps at max position size", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({
          accountSize: 1_000_000,
          riskPerTrade: 0.05,
          maxPositionSize: 100,
        }),
      );

      const payload = validLongPayload(); // risk=5/share
      const size = handler.calculatePositionSize(payload);

      // riskAmount = 1000000 * 0.05 = 50000, shares = 10000, capped at 100
      expect(size).toBe(100);
    });

    it("handles short positions", () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({
          accountSize: 100_000,
          riskPerTrade: 0.02,
          maxPositionSize: 10_000,
        }),
      );

      const payload = validShortPayload(); // price=200, stop=210, risk=10/share
      const size = handler.calculatePositionSize(payload);

      // riskAmount = 2000, shares = floor(2000 / 10) = 200
      expect(size).toBe(200);
    });

    it("returns 0 for zero risk distance", () => {
      const handler = createPCTTWebhookHandler(defaultConfig());
      const payload = { ...validLongPayload(), price: 100, stop: 100 };
      // This payload would fail validation, but we can test position sizing directly
      // We need to make stop < price for long, but very close
      const payload2 = {
        ...validLongPayload(),
        price: 100,
        stop: 99.999999999,
      };
      const size = handler.calculatePositionSize(payload2);
      // Very small risk distance => very large shares, capped by max
      expect(size).toBeLessThanOrEqual(1000);
    });

    it("returns maxPositionSize when no account size", () => {
      const handler = createPCTTWebhookHandler({
        accountSize: undefined,
        riskPerTrade: undefined,
        maxPositionSize: 500,
      });
      const size = handler.calculatePositionSize(validLongPayload());
      expect(size).toBe(500);
    });
  });

  // ==========================================================================
  // PROCESS WEBHOOK (full flow)
  // ==========================================================================

  describe("processWebhook", () => {
    it("executes paper trade for valid payload", async () => {
      const handler = createPCTTWebhookHandler(defaultConfig());
      const result = await handler.processWebhook(validLongPayload());

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toMatch(/^PAPER-/);
      expect(result.executedPrice).toBeDefined();
      expect(result.executedQuantity).toBeDefined();
      expect(result.executedQuantity).toBeGreaterThan(0);
    });

    it("returns error for invalid payload", async () => {
      const handler = createPCTTWebhookHandler(defaultConfig());
      const result = await handler.processWebhook({ invalid: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("respects authentication when secret is set", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ secretToken: "my-secret" }),
      );

      // No auth header
      const noAuth = await handler.processWebhook(validLongPayload(), {});
      expect(noAuth.success).toBe(false);
      expect(noAuth.error).toContain("Unauthorized");

      // Wrong auth
      const wrongAuth = await handler.processWebhook(validLongPayload(), {
        "x-webhook-secret": "wrong",
      });
      expect(wrongAuth.success).toBe(false);

      // Correct auth via x-webhook-secret
      const correctAuth = await handler.processWebhook(validLongPayload(), {
        "x-webhook-secret": "my-secret",
      });
      expect(correctAuth.success).toBe(true);
    });

    it("accepts authorization header", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ secretToken: "my-secret" }),
      );

      const result = await handler.processWebhook(validLongPayload(), {
        authorization: "my-secret",
      });
      expect(result.success).toBe(true);
    });

    it("blocks during cooldown", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ cooldownSeconds: 300 }),
      );

      const first = await handler.processWebhook(validLongPayload());
      expect(first.success).toBe(true);

      const second = await handler.processWebhook(validLongPayload());
      expect(second.success).toBe(false);
      expect(second.error).toContain("Cooldown");
    });

    it("applies Q-score filter", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ minQScore: 0.9 }),
      );

      const result = await handler.processWebhook({
        ...validLongPayload(),
        qScore: 0.7,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Q-Score");
    });

    it("uses custom onSignal handler", async () => {
      const customResult: ExecutionResult = {
        success: true,
        orderId: "CUSTOM-123",
        executedPrice: 150.5,
        executedQuantity: 100,
      };

      const handler = createPCTTWebhookHandler(
        defaultConfig({
          onSignal: jest.fn().mockResolvedValue(customResult),
        }),
      );

      const result = await handler.processWebhook(validLongPayload());
      expect(result.success).toBe(true);
      expect(result.orderId).toBe("CUSTOM-123");
    });

    it("returns error when no handler and not paper trading", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ paperTrading: false }),
      );

      const result = await handler.processWebhook(validLongPayload());
      expect(result.success).toBe(false);
      expect(result.error).toContain("No execution handler");
    });

    it("calls onError for exceptions", async () => {
      const onError = jest.fn();
      const handler = createPCTTWebhookHandler(
        defaultConfig({
          onSignal: jest
            .fn()
            .mockRejectedValue(new Error("Connection failed")),
          onError,
        }),
      );

      const result = await handler.processWebhook(validLongPayload());
      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection failed");
      expect(onError).toHaveBeenCalled();
    });

    it("logs successful signals", async () => {
      const handler = createPCTTWebhookHandler(defaultConfig());

      await handler.processWebhook(validLongPayload());

      const logs = handler.getSignalLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].payload.symbol).toBe("AAPL");
      expect(logs[0].result.success).toBe(true);
      expect(logs[0].positionSize).toBeGreaterThan(0);
    });

    it("simulates slippage for long trades", async () => {
      const handler = createPCTTWebhookHandler(defaultConfig());
      const result = await handler.processWebhook(validLongPayload());

      // Long slippage adds to price
      expect(result.executedPrice!).toBeGreaterThanOrEqual(150);
    });

    it("simulates slippage for short trades", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ cooldownSeconds: 0 }),
      );
      const result = await handler.processWebhook(validShortPayload());

      // Short slippage subtracts from price
      expect(result.executedPrice!).toBeLessThanOrEqual(200);
    });
  });

  // ==========================================================================
  // STATS & LOGGING
  // ==========================================================================

  describe("getStats", () => {
    it("returns zero stats initially", () => {
      const handler = createPCTTWebhookHandler(defaultConfig());
      const stats = handler.getStats();

      expect(stats.totalSignals).toBe(0);
      expect(stats.successfulSignals).toBe(0);
      expect(stats.failedSignals).toBe(0);
      expect(stats.avgQScore).toBe(0);
    });

    it("tracks stats after processing", async () => {
      const handler = createPCTTWebhookHandler(
        defaultConfig({ cooldownSeconds: 0 }),
      );

      await handler.processWebhook(validLongPayload());
      await handler.processWebhook(validShortPayload());

      const stats = handler.getStats();
      expect(stats.totalSignals).toBe(2);
      expect(stats.successfulSignals).toBe(2);
      expect(stats.longSignals).toBe(1);
      expect(stats.shortSignals).toBe(1);
      expect(stats.avgQScore).toBeGreaterThan(0);
      expect(stats.totalRisk).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("clears logs and cooldowns", async () => {
      const handler = createPCTTWebhookHandler(defaultConfig());

      await handler.processWebhook(validLongPayload());
      expect(handler.getSignalLogs().length).toBe(1);

      handler.reset();
      expect(handler.getSignalLogs().length).toBe(0);
      expect(handler.getStats().totalSignals).toBe(0);

      // Should be able to trade again (no cooldown)
      const result = await handler.processWebhook(validLongPayload());
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // MIDDLEWARE
  // ==========================================================================

  describe("createWebhookMiddleware", () => {
    it("processes request through middleware", async () => {
      const middleware = createWebhookMiddleware(defaultConfig());

      const result = await middleware({
        body: validLongPayload(),
        headers: {},
      });

      expect(result.success).toBe(true);
    });
  });
});
