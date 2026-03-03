/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Currency Service Unit Tests
 *
 * Tests for exchange rate management, currency conversion, formatting,
 * historical rate tracking, rate change alerts, portfolio valuation,
 * DB persistence, and auto-refresh lifecycle.
 */

import {
  createCurrencyService,
  DEFAULT_RATES,
  SUPPORTED_CURRENCIES,
  CURRENCY_INFO,
} from "../currency-service";
import type {
  CurrencyCode,
  PortfolioPosition,
} from "../currency-service";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
jest.mock("@/lib/supabase/server", () => {
  const _admin = { from: jest.fn() };
  return { supabaseAdmin: _admin };
});

/** Helper: get the mock supabaseAdmin from the mocked module */
function supabaseAdmin() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

/**
 * Build a Supabase chain mock that terminates with a resolved value.
 * Each chained method returns the same object so .select().gte().order() etc. work.
 */
function buildChain(resolvedValue: { data: any; error: any }) {
  const chain: any = {};
  const methods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "order",
    "limit",
    "single",
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // The final await resolves to data/error
  chain.then = (resolve: any) => resolve(resolvedValue);
  return chain;
}

// ============================================================================
// TESTS
// ============================================================================

describe("CurrencyService", () => {
  // --------------------------------------------------------------------------
  // Rate Management
  // --------------------------------------------------------------------------
  describe("Rate Management", () => {
    it("should initialize with default USD-based rates", () => {
      const svc = createCurrencyService();
      const rates = svc.getRates();
      expect(rates.USD).toBe(1.0);
      expect(rates.EUR).toBe(DEFAULT_RATES.EUR);
      expect(rates.JPY).toBe(DEFAULT_RATES.JPY);
    });

    it("should set rates and update lastUpdated", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      const before = svc.getLastUpdated();
      await new Promise((r) => setTimeout(r, 10));
      await svc.setRates({ EUR: 0.95, GBP: 0.8 });

      const rates = svc.getRates();
      expect(rates.EUR).toBe(0.95);
      expect(rates.GBP).toBe(0.8);
      expect(rates.USD).toBe(1.0);
      expect(svc.getLastUpdated().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it("should reject USD base rate != 1", async () => {
      const svc = createCurrencyService();
      await expect(svc.setRates({ USD: 2.0 })).rejects.toThrow(
        "USD base rate must be 1.0",
      );
    });

    it("should reject non-positive rates", async () => {
      const svc = createCurrencyService();
      await expect(svc.setRates({ EUR: -1 })).rejects.toThrow(
        "Invalid rate for EUR",
      );
      await expect(svc.setRates({ GBP: 0 })).rejects.toThrow(
        "Invalid rate for GBP",
      );
    });

    it("getRate should return rate for supported currency", () => {
      const svc = createCurrencyService();
      expect(svc.getRate("USD")).toBe(1.0);
      expect(svc.getRate("EUR")).toBe(DEFAULT_RATES.EUR);
    });

    it("getRate should throw for unsupported currency", () => {
      const svc = createCurrencyService();
      expect(() => svc.getRate("XYZ" as CurrencyCode)).toThrow(
        "Unsupported currency",
      );
    });

    it("getCrossRate should calculate correct cross rate", () => {
      const svc = createCurrencyService();
      // EUR/JPY = JPY_rate / EUR_rate
      const expected = DEFAULT_RATES.JPY / DEFAULT_RATES.EUR;
      expect(svc.getCrossRate("EUR", "JPY")).toBeCloseTo(expected, 6);
    });

    it("getCrossRate for same currency should be 1", () => {
      const svc = createCurrencyService();
      expect(svc.getCrossRate("EUR", "EUR")).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Staleness
  // --------------------------------------------------------------------------
  describe("Staleness", () => {
    it("should not be stale immediately after creation", () => {
      const svc = createCurrencyService();
      expect(svc.isStale()).toBe(false);
    });

    it("should be stale after refresh interval elapses", () => {
      jest.useFakeTimers();
      const svc2 = createCurrencyService({ refreshIntervalMs: 100 });
      expect(svc2.isStale()).toBe(false);
      jest.advanceTimersByTime(150);
      expect(svc2.isStale()).toBe(true);
      jest.useRealTimers();
    });
  });

  // --------------------------------------------------------------------------
  // Currency Conversion
  // --------------------------------------------------------------------------
  describe("Currency Conversion", () => {
    it("convert should return same amount for same currency", () => {
      const svc = createCurrencyService();
      expect(svc.convert(100, "USD", "USD")).toBe(100);
    });

    it("convert should calculate correct amount USD -> EUR", () => {
      const svc = createCurrencyService();
      const result = svc.convert(100, "USD", "EUR");
      const expected = 100 * (DEFAULT_RATES.EUR / DEFAULT_RATES.USD);
      expect(result).toBeCloseTo(expected, 6);
    });

    it("convert should calculate correct amount EUR -> JPY", () => {
      const svc = createCurrencyService();
      const result = svc.convert(100, "EUR", "JPY");
      const expected = 100 * (DEFAULT_RATES.JPY / DEFAULT_RATES.EUR);
      expect(result).toBeCloseTo(expected, 4);
    });

    it("convert should throw for negative amount", () => {
      const svc = createCurrencyService();
      expect(() => svc.convert(-10, "USD", "EUR")).toThrow(
        "Amount must be non-negative",
      );
    });

    it("convert should handle zero amount", () => {
      const svc = createCurrencyService();
      expect(svc.convert(0, "USD", "EUR")).toBe(0);
    });

    it("convertAndRound should round to currency decimal digits", () => {
      const svc = createCurrencyService();
      // JPY has 0 decimal digits
      const jpyResult = svc.convertAndRound(1, "USD", "JPY");
      expect(jpyResult).toBe(Math.round(DEFAULT_RATES.JPY));

      // EUR has 2 decimal digits
      const eurResult = svc.convertAndRound(100, "USD", "EUR");
      expect(Number.isInteger(eurResult * 100)).toBe(true);
    });

    it("convertAndRound for same currency returns same value", () => {
      const svc = createCurrencyService();
      expect(svc.convertAndRound(123.456, "USD", "USD")).toBeCloseTo(
        123.46,
        2,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Formatting
  // --------------------------------------------------------------------------
  describe("Formatting", () => {
    it("formatCurrency should format USD correctly", () => {
      const svc = createCurrencyService();
      const formatted = svc.formatCurrency(1234.56, "USD");
      expect(formatted).toContain("1,234.56");
    });

    it("formatCurrency should format JPY with 0 decimal places", () => {
      const svc = createCurrencyService();
      const formatted = svc.formatCurrency(1234, "JPY");
      // JPY should not have decimal places
      expect(formatted).not.toContain(".");
    });

    it("formatCurrency should accept locale override", () => {
      const svc = createCurrencyService();
      const formatted = svc.formatCurrency(1234.56, "EUR", "en-US");
      // en-US locale for EUR
      expect(formatted).toContain("1,234.56");
    });

    it("formatCurrency should throw for unsupported currency", () => {
      const svc = createCurrencyService();
      expect(() => svc.formatCurrency(100, "XYZ" as CurrencyCode)).toThrow(
        "Unsupported currency",
      );
    });
  });

  // --------------------------------------------------------------------------
  // Historical Rate Tracking
  // --------------------------------------------------------------------------
  describe("Historical Rate Tracking", () => {
    it("getHistory should return empty array initially", () => {
      const svc = createCurrencyService();
      expect(svc.getHistory()).toHaveLength(0);
    });

    it("setRates should push snapshot to history buffer", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      await svc.setRates({ EUR: 0.93 });
      expect(svc.getHistory()).toHaveLength(1);
      expect(svc.getHistory()[0].rates.EUR).toBe(0.93);
    });

    it("getHistoricalRates should return rate entries for a pair", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      await svc.setRates({ EUR: 0.93, JPY: 150 });
      const entries = svc.getHistoricalRates("EUR", "JPY");

      expect(entries).toHaveLength(1);
      expect(entries[0].rate).toBeCloseTo(150 / 0.93, 4);
      expect(entries[0].date).toBeInstanceOf(Date);
    });

    it("loadHistory should populate buffer from Supabase", async () => {
      const svc = createCurrencyService();
      const mockRows = [
        {
          id: "1",
          base_currency: "USD",
          rates: { USD: 1, EUR: 0.91 },
          recorded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          base_currency: "USD",
          rates: { USD: 1, EUR: 0.92 },
          recorded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      const chain = buildChain({ data: mockRows, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      await svc.loadHistory();
      expect(svc.getHistory()).toHaveLength(2);
    });

    it("loadHistory should handle DB error gracefully", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({
        data: null,
        error: { message: "DB error" },
      });
      supabaseAdmin().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await svc.loadHistory();
      expect(svc.getHistory()).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it("loadHistory should handle null data gracefully", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      await svc.loadHistory();
      expect(svc.getHistory()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Rate Change Alerts
  // --------------------------------------------------------------------------
  describe("Rate Change Alerts", () => {
    it("setAlertThreshold should store threshold", () => {
      const svc = createCurrencyService();
      svc.setAlertThreshold("EUR", "USD", 2.0);
      const thresholds = svc.getAlertThresholds();
      expect(thresholds).toHaveLength(1);
      expect(thresholds[0]).toEqual({ pair: "EUR/USD", threshold: 2.0 });
    });

    it("setAlertThreshold should reject non-positive threshold", () => {
      const svc = createCurrencyService();
      expect(() => svc.setAlertThreshold("EUR", "USD", 0)).toThrow(
        "Alert threshold must be a positive number",
      );
      expect(() => svc.setAlertThreshold("EUR", "USD", -1)).toThrow(
        "Alert threshold must be a positive number",
      );
    });

    it("removeAlertThreshold should remove existing threshold", () => {
      const svc = createCurrencyService();
      svc.setAlertThreshold("EUR", "USD", 2.0);
      svc.removeAlertThreshold("EUR", "USD");
      expect(svc.getAlertThresholds()).toHaveLength(0);
    });

    it("should fire alert when rate change exceeds threshold", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      // Set threshold: trigger if EUR/USD changes by >= 1%
      svc.setAlertThreshold("EUR", "USD", 1.0);

      // First setRates establishes previousRates
      await svc.setRates({ EUR: 0.92 });
      expect(svc.peekAlerts()).toHaveLength(0);

      // Second setRates triggers alert evaluation — 10% change
      await svc.setRates({ EUR: 1.012 });
      const alerts = svc.peekAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].pair).toBe("EUR/USD");
      expect(alerts[0].changePercent).toBeGreaterThanOrEqual(1.0);
    });

    it("should NOT fire alert when change is below threshold", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      svc.setAlertThreshold("EUR", "USD", 50);
      await svc.setRates({ EUR: 0.92 });
      await svc.setRates({ EUR: 0.921 }); // tiny change
      expect(svc.peekAlerts()).toHaveLength(0);
    });

    it("consumeAlerts should return and clear pending alerts", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      svc.setAlertThreshold("EUR", "USD", 1.0);
      await svc.setRates({ EUR: 0.92 });
      await svc.setRates({ EUR: 1.1 });

      const consumed = svc.consumeAlerts();
      expect(consumed.length).toBeGreaterThanOrEqual(1);
      // After consume, pending should be empty
      expect(svc.peekAlerts()).toHaveLength(0);
    });

    it("peekAlerts should not clear pending alerts", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      svc.setAlertThreshold("EUR", "USD", 1.0);
      await svc.setRates({ EUR: 0.92 });
      await svc.setRates({ EUR: 1.1 });

      svc.peekAlerts();
      expect(svc.peekAlerts().length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Alert Persistence
  // --------------------------------------------------------------------------
  describe("Alert Persistence", () => {
    it("persistAlert should insert alert row into Supabase", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      const alert = {
        id: "alert_1",
        pair: "EUR/USD",
        from: "EUR" as CurrencyCode,
        to: "USD" as CurrencyCode,
        previousRate: 0.92,
        currentRate: 0.95,
        changePercent: 3.26,
        threshold: 2.0,
        triggeredAt: new Date(),
      };

      await svc.persistAlert("user-123", alert);
      expect(supabaseAdmin().from).toHaveBeenCalledWith("rate_change_alerts");
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          pair: "EUR/USD",
          from_currency: "EUR",
          to_currency: "USD",
        }),
      );
    });

    it("persistAlert should handle errors gracefully", async () => {
      const svc = createCurrencyService();
      supabaseAdmin().from.mockImplementation(() => {
        throw new Error("DB connection failed");
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await svc.persistAlert("user-123", {
        id: "alert_1",
        pair: "EUR/USD",
        from: "EUR" as CurrencyCode,
        to: "USD" as CurrencyCode,
        previousRate: 0.92,
        currentRate: 0.95,
        changePercent: 3.26,
        threshold: 2.0,
        triggeredAt: new Date(),
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("loadAlerts should return alerts from Supabase", async () => {
      const svc = createCurrencyService();
      const mockRows = [
        {
          id: "alert-1",
          user_id: "user-123",
          pair: "EUR/USD",
          from_currency: "EUR",
          to_currency: "USD",
          previous_rate: 0.92,
          current_rate: 0.95,
          change_percent: 3.26,
          threshold: 2.0,
          triggered_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];
      const chain = buildChain({ data: mockRows, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      const alerts = await svc.loadAlerts("user-123");
      expect(alerts).toHaveLength(1);
      expect(alerts[0].pair).toBe("EUR/USD");
      expect(alerts[0].triggeredAt).toBeInstanceOf(Date);
    });

    it("loadAlerts should accept options (limit, since)", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: [], error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      const since = new Date("2026-01-01");
      await svc.loadAlerts("user-123", { limit: 5, since });
      expect(chain.gte).toHaveBeenCalled();
      expect(chain.limit).toHaveBeenCalledWith(5);
    });

    it("loadAlerts should return empty array on DB error", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({
        data: null,
        error: { message: "DB error" },
      });
      supabaseAdmin().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const alerts = await svc.loadAlerts("user-123");
      expect(alerts).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("loadAlerts should return empty array when data is null", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      const alerts = await svc.loadAlerts("user-123");
      expect(alerts).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Portfolio Valuation
  // --------------------------------------------------------------------------
  describe("Portfolio Valuation", () => {
    it("should valuate a multi-currency portfolio", () => {
      const svc = createCurrencyService();
      const positions: PortfolioPosition[] = [
        { id: "1", name: "US Stocks", amount: 10000, currency: "USD" },
        { id: "2", name: "Euro Bonds", amount: 5000, currency: "EUR" },
        { id: "3", name: "JPY Cash", amount: 500000, currency: "JPY" },
      ];

      const valuation = svc.valuatePortfolio(positions, "USD");
      expect(valuation.baseCurrency).toBe("USD");
      expect(valuation.positions).toHaveLength(3);
      expect(valuation.totalValue).toBeGreaterThan(0);
      expect(valuation.valuedAt).toBeInstanceOf(Date);

      // USD position should convert 1:1
      const usdPos = valuation.positions.find((p) => p.id === "1");
      expect(usdPos?.convertedAmount).toBe(10000);
      expect(usdPos?.exchangeRate).toBe(1);
    });

    it("should handle empty portfolio", () => {
      const svc = createCurrencyService();
      const valuation = svc.valuatePortfolio([], "USD");
      expect(valuation.totalValue).toBe(0);
      expect(valuation.positions).toHaveLength(0);
    });

    it("should valuate portfolio in non-USD base currency", () => {
      const svc = createCurrencyService();
      const positions: PortfolioPosition[] = [
        { id: "1", name: "US Stocks", amount: 1000, currency: "USD" },
      ];

      const valuation = svc.valuatePortfolio(positions, "EUR");
      expect(valuation.baseCurrency).toBe("EUR");
      // 1000 USD * (EUR/USD cross rate)
      const expectedRate = DEFAULT_RATES.EUR / DEFAULT_RATES.USD;
      expect(valuation.positions[0].convertedAmount).toBeCloseTo(
        1000 * expectedRate,
        2,
      );
    });

    it("should round converted amounts to 2 decimal places", () => {
      const svc = createCurrencyService();
      const positions: PortfolioPosition[] = [
        { id: "1", name: "Test", amount: 333.333, currency: "USD" },
      ];

      const valuation = svc.valuatePortfolio(positions, "EUR");
      const pos = valuation.positions[0];
      // Check that convertedAmount has at most 2 decimal places
      const decimalStr = pos.convertedAmount.toString().split(".")[1] || "";
      expect(decimalStr.length).toBeLessThanOrEqual(2);
    });
  });

  // --------------------------------------------------------------------------
  // Auto-Refresh Lifecycle
  // --------------------------------------------------------------------------
  describe("Auto-Refresh Lifecycle", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("startAutoRefresh should throw without a callback", () => {
      const svc = createCurrencyService({ refreshIntervalMs: 100 });
      expect(() => svc.startAutoRefresh()).toThrow(
        "Set a refresh callback via setRefreshCallback()",
      );
    });

    it("startAutoRefresh should invoke callback on interval", async () => {
      const svc = createCurrencyService({ refreshIntervalMs: 100 });
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      const cb = jest.fn().mockResolvedValue({ USD: 1, EUR: 0.94 });
      svc.setRefreshCallback(cb);
      svc.startAutoRefresh();

      // Advance past one interval
      jest.advanceTimersByTime(150);
      // Flush microtasks for the async callback
      await Promise.resolve();

      expect(cb).toHaveBeenCalled();
      svc.stopAutoRefresh();
    });

    it("stopAutoRefresh should stop the timer", () => {
      const svc = createCurrencyService({ refreshIntervalMs: 100 });
      const cb = jest.fn().mockResolvedValue({ USD: 1, EUR: 0.94 });
      svc.setRefreshCallback(cb);
      svc.startAutoRefresh();
      svc.stopAutoRefresh();

      jest.advanceTimersByTime(300);
      expect(cb).not.toHaveBeenCalled();
    });

    it("startAutoRefresh should be idempotent (no double timers)", () => {
      const svc = createCurrencyService({ refreshIntervalMs: 100 });
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      const cb = jest.fn().mockResolvedValue({ USD: 1, EUR: 0.94 });
      svc.setRefreshCallback(cb);
      svc.startAutoRefresh();
      svc.startAutoRefresh(); // second call should be no-op

      jest.advanceTimersByTime(150);
      // Should only have one interval running
      svc.stopAutoRefresh();
    });

    it("auto-refresh should handle callback errors gracefully", async () => {
      const svc = createCurrencyService({ refreshIntervalMs: 100 });
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const cb = jest.fn().mockRejectedValue(new Error("Network error"));
      svc.setRefreshCallback(cb);
      svc.startAutoRefresh();

      jest.advanceTimersByTime(150);
      await Promise.resolve();

      expect(cb).toHaveBeenCalled();
      svc.stopAutoRefresh();
      consoleSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------
  describe("Utility Methods", () => {
    it("isSupportedCurrency should return true for supported codes", () => {
      const svc = createCurrencyService();
      expect(svc.isSupportedCurrency("USD")).toBe(true);
      expect(svc.isSupportedCurrency("EUR")).toBe(true);
      expect(svc.isSupportedCurrency("BRL")).toBe(true);
    });

    it("isSupportedCurrency should return false for unsupported codes", () => {
      const svc = createCurrencyService();
      expect(svc.isSupportedCurrency("XYZ")).toBe(false);
      expect(svc.isSupportedCurrency("")).toBe(false);
    });

    it("getCurrencyInfo should return correct metadata", () => {
      const svc = createCurrencyService();
      const info = svc.getCurrencyInfo("USD");
      expect(info.code).toBe("USD");
      expect(info.name).toBe("US Dollar");
      expect(info.symbol).toBe("$");
      expect(info.decimalDigits).toBe(2);
    });

    it("getCurrencyInfo should throw for unsupported currency", () => {
      const svc = createCurrencyService();
      expect(() => svc.getCurrencyInfo("XYZ" as CurrencyCode)).toThrow(
        "Unsupported currency",
      );
    });

    it("getSupportedCurrencies should return all 10 currencies", () => {
      const svc = createCurrencyService();
      const currencies = svc.getSupportedCurrencies();
      expect(currencies).toHaveLength(SUPPORTED_CURRENCIES.length);
      expect(currencies.map((c) => c.code)).toEqual(
        expect.arrayContaining(["USD", "EUR", "GBP", "JPY"]),
      );
    });

    it("getSupportedCurrencies should return copies (not references)", () => {
      const svc = createCurrencyService();
      const currencies = svc.getSupportedCurrencies();
      currencies[0].name = "Mutated";
      // Re-fetch should not be mutated
      const fresh = svc.getSupportedCurrencies();
      expect(fresh[0].name).not.toBe("Mutated");
    });
  });

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------
  describe("Reset", () => {
    it("should reset all state to defaults", async () => {
      const svc = createCurrencyService({ refreshIntervalMs: 100 });
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      // Modify state
      await svc.setRates({ EUR: 0.99 });
      svc.setAlertThreshold("EUR", "USD", 1.0);
      await svc.setRates({ EUR: 1.2 });

      // Reset
      svc.reset();

      expect(svc.getRates().EUR).toBe(DEFAULT_RATES.EUR);
      expect(svc.getAlertThresholds()).toHaveLength(0);
      expect(svc.peekAlerts()).toHaveLength(0);
      expect(svc.getHistory()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // DB Persistence on setRates
  // --------------------------------------------------------------------------
  describe("DB Persistence", () => {
    it("setRates should persist snapshot to exchange_rate_history", async () => {
      const svc = createCurrencyService();
      const chain = buildChain({ data: null, error: null });
      supabaseAdmin().from.mockReturnValue(chain);

      await svc.setRates({ EUR: 0.95 });

      expect(supabaseAdmin().from).toHaveBeenCalledWith(
        "exchange_rate_history",
      );
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          base_currency: "USD",
          rates: expect.objectContaining({ EUR: 0.95, USD: 1 }),
        }),
      );
    });

    it("setRates should handle DB persistence errors gracefully", async () => {
      const svc = createCurrencyService();
      supabaseAdmin().from.mockImplementation(() => {
        throw new Error("DB write failed");
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Should not throw — error is caught internally
      await svc.setRates({ EUR: 0.95 });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // Exported Constants
  // --------------------------------------------------------------------------
  describe("Exported Constants", () => {
    it("DEFAULT_RATES should have all supported currencies", () => {
      for (const code of SUPPORTED_CURRENCIES) {
        expect(DEFAULT_RATES[code]).toBeDefined();
        expect(typeof DEFAULT_RATES[code]).toBe("number");
        expect(DEFAULT_RATES[code]).toBeGreaterThan(0);
      }
    });

    it("CURRENCY_INFO should have metadata for all supported currencies", () => {
      for (const code of SUPPORTED_CURRENCIES) {
        const info = CURRENCY_INFO[code];
        expect(info).toBeDefined();
        expect(info.code).toBe(code);
        expect(info.name).toBeTruthy();
        expect(info.symbol).toBeTruthy();
        expect(info.locale).toBeTruthy();
        expect(typeof info.decimalDigits).toBe("number");
      }
    });
  });
});
