/**
 * Multi-Currency Support Service
 *
 * Provides exchange rate management, currency conversion, locale-aware
 * formatting, historical rate tracking, rate change alerts, and
 * multi-currency portfolio valuation.
 *
 * Rates are supplied externally via setRates() — no outbound API calls.
 * Supabase is used for persistence; in-memory caches provide fast lookups.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** ISO 4217 currency codes supported by the service */
export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CAD"
  | "AUD"
  | "CHF"
  | "CNY"
  | "INR"
  | "BRL";

/** Metadata for each supported currency */
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  decimalDigits: number;
}

/** A single exchange rate entry (base → quote) */
export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  timestamp: Date;
}

/** Object keyed by currency code with USD-based rates */
export interface ExchangeRateMap {
  [currency: string]: number;
}

/** A snapshot of rates at a point in time */
export interface RateSnapshot {
  rates: ExchangeRateMap;
  timestamp: Date;
  base: CurrencyCode;
}

/** Historical rate entry for a single currency pair */
export interface HistoricalRateEntry {
  date: Date;
  rate: number;
}

/** Alert fired when a currency pair moves beyond threshold */
export interface RateChangeAlert {
  id: string;
  pair: string;
  from: CurrencyCode;
  to: CurrencyCode;
  previousRate: number;
  currentRate: number;
  changePercent: number;
  threshold: number;
  triggeredAt: Date;
}

/** Configuration for rate change alert thresholds */
export interface AlertThresholdConfig {
  pair: string;
  threshold: number;
}

/** A position in a multi-currency portfolio */
export interface PortfolioPosition {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
}

/** Result of portfolio valuation */
export interface PortfolioValuation {
  baseCurrency: CurrencyCode;
  totalValue: number;
  positions: Array<{
    id: string;
    name: string;
    originalAmount: number;
    originalCurrency: CurrencyCode;
    convertedAmount: number;
    exchangeRate: number;
  }>;
  valuedAt: Date;
}

/** Supabase row shape for exchange_rate_history */
export interface ExchangeRateRow {
  id: string;
  base_currency: string;
  rates: ExchangeRateMap;
  recorded_at: string;
  created_at: string;
}

/** Supabase row shape for rate_change_alerts */
export interface RateChangeAlertRow {
  id: string;
  user_id: string;
  pair: string;
  from_currency: string;
  to_currency: string;
  previous_rate: number;
  current_rate: number;
  change_percent: number;
  threshold: number;
  triggered_at: string;
  created_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** All supported currency codes */
export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "INR",
  "BRL",
] as const;

/** Metadata for each supported currency */
export const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    locale: "en-US",
    decimalDigits: 2,
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "\u20AC",
    locale: "de-DE",
    decimalDigits: 2,
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "\u00A3",
    locale: "en-GB",
    decimalDigits: 2,
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "\u00A5",
    locale: "ja-JP",
    decimalDigits: 0,
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    locale: "en-CA",
    decimalDigits: 2,
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    locale: "en-AU",
    decimalDigits: 2,
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    locale: "de-CH",
    decimalDigits: 2,
  },
  CNY: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "\u00A5",
    locale: "zh-CN",
    decimalDigits: 2,
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "\u20B9",
    locale: "en-IN",
    decimalDigits: 2,
  },
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    locale: "pt-BR",
    decimalDigits: 2,
  },
};

/**
 * Default USD-based exchange rates for offline/testing use.
 * Values are approximate mid-market rates as of early 2026.
 */
export const DEFAULT_RATES: ExchangeRateMap = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.12,
  BRL: 4.97,
};

/** Maximum number of days to retain in the historical rate buffer */
const HISTORY_BUFFER_DAYS = 90;

/** Default refresh interval for rates cache (15 minutes) */
const DEFAULT_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class CurrencyService {
  /** Current exchange rates (USD-based) */
  private currentRates: ExchangeRateMap;

  /** Timestamp of the last rate update */
  private lastUpdated: Date;

  /** In-memory historical rate buffer (last 90 days of snapshots) */
  private historyBuffer: RateSnapshot[] = [];

  /** Previous rates for detecting changes that trigger alerts */
  private previousRates: ExchangeRateMap | null = null;

  /** User-configured alert thresholds keyed by pair string "FROM/TO" */
  private alertThresholds: Map<string, number> = new Map();

  /** Fired alerts waiting to be consumed */
  private pendingAlerts: RateChangeAlert[] = [];

  /** Refresh interval handle */
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  /** Refresh interval in milliseconds */
  private refreshIntervalMs: number;

  /** Callback invoked when rates refresh is due (caller provides new rates) */
  private onRefreshCallback:
    | (() => Promise<ExchangeRateMap> | ExchangeRateMap)
    | null = null;

  constructor(options?: { refreshIntervalMs?: number }) {
    this.currentRates = { ...DEFAULT_RATES };
    this.lastUpdated = new Date();
    this.refreshIntervalMs =
      options?.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  }

  // ==========================================================================
  // RATE MANAGEMENT
  // ==========================================================================

  /**
   * Set current exchange rates. Rates must be USD-based
   * (i.e., how many units of each currency equal 1 USD).
   *
   * Triggers change detection and alert evaluation.
   */
  async setRates(rates: ExchangeRateMap): Promise<void> {
    // Validate that USD base rate is always 1
    if (rates.USD !== undefined && rates.USD !== 1) {
      throw new Error("USD base rate must be 1.0");
    }

    // Validate all provided currencies
    for (const code of Object.keys(rates)) {
      if (typeof rates[code] !== "number" || rates[code] <= 0) {
        throw new Error(`Invalid rate for ${code}: must be a positive number`);
      }
    }

    this.previousRates = { ...this.currentRates };
    this.currentRates = { ...DEFAULT_RATES, ...rates, USD: 1.0 };
    this.lastUpdated = new Date();

    // Push to history buffer
    this.pushToHistory({
      rates: { ...this.currentRates },
      timestamp: this.lastUpdated,
      base: "USD",
    });

    // Evaluate alert thresholds
    this.evaluateAlerts();

    // Persist snapshot to Supabase
    await this.persistRateSnapshot();
  }

  /**
   * Get the current exchange rates map.
   */
  getRates(): Readonly<ExchangeRateMap> {
    return { ...this.currentRates };
  }

  /**
   * Get the rate for a specific currency (against USD).
   */
  getRate(currency: CurrencyCode): number {
    const rate = this.currentRates[currency];
    if (rate === undefined) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
    return rate;
  }

  /**
   * Get the cross rate between two currencies.
   */
  getCrossRate(from: CurrencyCode, to: CurrencyCode): number {
    const fromRate = this.getRate(from);
    const toRate = this.getRate(to);
    return toRate / fromRate;
  }

  /**
   * Get the timestamp of the last rate update.
   */
  getLastUpdated(): Date {
    return new Date(this.lastUpdated.getTime());
  }

  /**
   * Check whether the cached rates are stale (older than refresh interval).
   */
  isStale(): boolean {
    const elapsed = Date.now() - this.lastUpdated.getTime();
    return elapsed > this.refreshIntervalMs;
  }

  // ==========================================================================
  // CURRENCY CONVERSION
  // ==========================================================================

  /**
   * Convert an amount from one currency to another using current rates.
   *
   * @param amount     The amount to convert
   * @param fromCurrency  Source currency code
   * @param toCurrency    Target currency code
   * @returns The converted amount (not rounded — caller decides precision)
   */
  convert(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
  ): number {
    if (amount < 0) {
      throw new Error("Amount must be non-negative");
    }

    if (fromCurrency === toCurrency) {
      return amount;
    }

    const crossRate = this.getCrossRate(fromCurrency, toCurrency);
    return amount * crossRate;
  }

  /**
   * Convert and round to the target currency's standard decimal digits.
   */
  convertAndRound(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
  ): number {
    const converted = this.convert(amount, fromCurrency, toCurrency);
    const digits = CURRENCY_INFO[toCurrency].decimalDigits;
    const factor = Math.pow(10, digits);
    return Math.round(converted * factor) / factor;
  }

  // ==========================================================================
  // FORMATTING
  // ==========================================================================

  /**
   * Format an amount for display using the currency's locale conventions.
   *
   * @param amount   The numeric amount
   * @param currency The currency code
   * @param overrideLocale  Optional locale override (e.g. "en-US")
   * @returns A locale-formatted currency string (e.g. "$1,234.56")
   */
  formatCurrency(
    amount: number,
    currency: CurrencyCode,
    overrideLocale?: string,
  ): string {
    const info = CURRENCY_INFO[currency];
    if (!info) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const locale = overrideLocale ?? info.locale;

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: info.code,
      minimumFractionDigits: info.decimalDigits,
      maximumFractionDigits: info.decimalDigits,
    }).format(amount);
  }

  // ==========================================================================
  // HISTORICAL RATE TRACKING
  // ==========================================================================

  /**
   * Get the in-memory historical rate buffer (last 90 days of snapshots).
   */
  getHistory(): readonly RateSnapshot[] {
    return [...this.historyBuffer];
  }

  /**
   * Get historical rates for a specific currency pair over the buffer window.
   */
  getHistoricalRates(
    from: CurrencyCode,
    to: CurrencyCode,
  ): HistoricalRateEntry[] {
    return this.historyBuffer.map((snapshot) => {
      const fromRate = snapshot.rates[from] ?? 1;
      const toRate = snapshot.rates[to] ?? 1;
      return {
        date: new Date(snapshot.timestamp.getTime()),
        rate: toRate / fromRate,
      };
    });
  }

  /**
   * Load historical rate snapshots from Supabase into the in-memory buffer.
   */
  async loadHistory(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HISTORY_BUFFER_DAYS);

    const { data, error } = await (supabaseAdmin.from as any)(
      "exchange_rate_history",
    )
      .select("*")
      .gte("recorded_at", cutoffDate.toISOString())
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error("Failed to load exchange rate history:", error.message);
      return;
    }

    if (data && Array.isArray(data)) {
      this.historyBuffer = (data as ExchangeRateRow[]).map((row) => ({
        rates: row.rates,
        timestamp: new Date(row.recorded_at),
        base: row.base_currency as CurrencyCode,
      }));
    }
  }

  /**
   * Push a snapshot to the in-memory buffer, pruning entries older than 90 days.
   */
  private pushToHistory(snapshot: RateSnapshot): void {
    this.historyBuffer.push(snapshot);

    // Prune entries older than the retention window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HISTORY_BUFFER_DAYS);
    this.historyBuffer = this.historyBuffer.filter(
      (entry) => entry.timestamp.getTime() >= cutoff.getTime(),
    );
  }

  /**
   * Persist the current rate snapshot to Supabase.
   */
  private async persistRateSnapshot(): Promise<void> {
    try {
      await (supabaseAdmin.from as any)("exchange_rate_history").insert({
        base_currency: "USD",
        rates: { ...this.currentRates },
        recorded_at: this.lastUpdated.toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to persist rate snapshot:", err);
    }
  }

  // ==========================================================================
  // RATE CHANGE ALERTS
  // ==========================================================================

  /**
   * Set an alert threshold for a currency pair.
   * When the pair's rate changes by more than `threshold` percent, an alert fires.
   *
   * @param from      Source currency
   * @param to        Target currency
   * @param threshold Percentage change to trigger alert (e.g. 2.0 = 2%)
   */
  setAlertThreshold(
    from: CurrencyCode,
    to: CurrencyCode,
    threshold: number,
  ): void {
    if (threshold <= 0) {
      throw new Error("Alert threshold must be a positive number");
    }
    const pair = `${from}/${to}`;
    this.alertThresholds.set(pair, threshold);
  }

  /**
   * Remove an alert threshold for a currency pair.
   */
  removeAlertThreshold(from: CurrencyCode, to: CurrencyCode): void {
    const pair = `${from}/${to}`;
    this.alertThresholds.delete(pair);
  }

  /**
   * Get all configured alert thresholds.
   */
  getAlertThresholds(): AlertThresholdConfig[] {
    const result: AlertThresholdConfig[] = [];
    this.alertThresholds.forEach((threshold, pair) => {
      result.push({ pair, threshold });
    });
    return result;
  }

  /**
   * Retrieve and clear pending alerts.
   */
  consumeAlerts(): RateChangeAlert[] {
    const alerts = [...this.pendingAlerts];
    this.pendingAlerts = [];
    return alerts;
  }

  /**
   * Get pending alerts without clearing them.
   */
  peekAlerts(): readonly RateChangeAlert[] {
    return [...this.pendingAlerts];
  }

  /**
   * Evaluate all configured thresholds against rate changes
   * and generate alerts where breached.
   */
  private evaluateAlerts(): void {
    if (!this.previousRates) {
      return;
    }

    this.alertThresholds.forEach((threshold, pair) => {
      const [fromStr, toStr] = pair.split("/");
      const from = fromStr as CurrencyCode;
      const to = toStr as CurrencyCode;

      const prevFromRate = this.previousRates![from];
      const prevToRate = this.previousRates![to];
      const currFromRate = this.currentRates[from];
      const currToRate = this.currentRates[to];

      if (
        prevFromRate === undefined ||
        prevToRate === undefined ||
        currFromRate === undefined ||
        currToRate === undefined
      ) {
        return;
      }

      const previousCrossRate = prevToRate / prevFromRate;
      const currentCrossRate = currToRate / currFromRate;

      if (previousCrossRate === 0) {
        return;
      }

      const changePercent = Math.abs(
        ((currentCrossRate - previousCrossRate) / previousCrossRate) * 100,
      );

      if (changePercent >= threshold) {
        this.pendingAlerts.push({
          id: `alert_${pair}_${Date.now()}`,
          pair,
          from,
          to,
          previousRate: previousCrossRate,
          currentRate: currentCrossRate,
          changePercent: Math.round(changePercent * 100) / 100,
          threshold,
          triggeredAt: new Date(),
        });
      }
    });
  }

  /**
   * Persist a rate change alert to Supabase for a specific user.
   */
  async persistAlert(userId: string, alert: RateChangeAlert): Promise<void> {
    try {
      await (supabaseAdmin.from as any)("rate_change_alerts").insert({
        user_id: userId,
        pair: alert.pair,
        from_currency: alert.from,
        to_currency: alert.to,
        previous_rate: alert.previousRate,
        current_rate: alert.currentRate,
        change_percent: alert.changePercent,
        threshold: alert.threshold,
        triggered_at: alert.triggeredAt.toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to persist rate change alert:", err);
    }
  }

  /**
   * Load persisted alerts for a user from Supabase.
   */
  async loadAlerts(
    userId: string,
    options?: { limit?: number; since?: Date },
  ): Promise<RateChangeAlert[]> {
    let query = (supabaseAdmin.from as any)("rate_change_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("triggered_at", { ascending: false });

    if (options?.since) {
      query = query.gte("triggered_at", options.since.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load rate change alerts:", error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return (data as RateChangeAlertRow[]).map((row) => ({
      id: row.id,
      pair: row.pair,
      from: row.from_currency as CurrencyCode,
      to: row.to_currency as CurrencyCode,
      previousRate: row.previous_rate,
      currentRate: row.current_rate,
      changePercent: row.change_percent,
      threshold: row.threshold,
      triggeredAt: new Date(row.triggered_at),
    }));
  }

  // ==========================================================================
  // PORTFOLIO VALUATION
  // ==========================================================================

  /**
   * Valuate a multi-currency portfolio in a single base currency.
   *
   * @param positions     Array of portfolio positions with amounts in various currencies
   * @param baseCurrency  The target currency for valuation
   * @returns Detailed portfolio valuation with per-position breakdown
   */
  valuatePortfolio(
    positions: PortfolioPosition[],
    baseCurrency: CurrencyCode,
  ): PortfolioValuation {
    let totalValue = 0;
    const valuedPositions: PortfolioValuation["positions"] = [];

    for (const position of positions) {
      const exchangeRate = this.getCrossRate(position.currency, baseCurrency);
      const convertedAmount = position.amount * exchangeRate;

      valuedPositions.push({
        id: position.id,
        name: position.name,
        originalAmount: position.amount,
        originalCurrency: position.currency,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        exchangeRate: Math.round(exchangeRate * 1_000_000) / 1_000_000,
      });

      totalValue += convertedAmount;
    }

    return {
      baseCurrency,
      totalValue: Math.round(totalValue * 100) / 100,
      positions: valuedPositions,
      valuedAt: new Date(),
    };
  }

  // ==========================================================================
  // AUTO-REFRESH LIFECYCLE
  // ==========================================================================

  /**
   * Register a callback that will be invoked on each refresh interval
   * to supply new rates. The callback should return an ExchangeRateMap.
   */
  setRefreshCallback(
    callback: () => Promise<ExchangeRateMap> | ExchangeRateMap,
  ): void {
    this.onRefreshCallback = callback;
  }

  /**
   * Start the automatic refresh timer.
   * Requires a refresh callback to be set via setRefreshCallback().
   */
  startAutoRefresh(): void {
    if (this.refreshTimer) {
      return; // Already running
    }

    if (!this.onRefreshCallback) {
      throw new Error(
        "Set a refresh callback via setRefreshCallback() before starting auto-refresh",
      );
    }

    this.refreshTimer = setInterval(async () => {
      if (!this.onRefreshCallback) {
        return;
      }
      try {
        const newRates = await this.onRefreshCallback();
        await this.setRates(newRates);
      } catch (err) {
        console.error("Auto-refresh failed:", err);
      }
    }, this.refreshIntervalMs);
  }

  /**
   * Stop the automatic refresh timer.
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Check whether a currency code is supported.
   */
  isSupportedCurrency(code: string): code is CurrencyCode {
    return SUPPORTED_CURRENCIES.includes(code as CurrencyCode);
  }

  /**
   * Get metadata for a supported currency.
   */
  getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
    const info = CURRENCY_INFO[code];
    if (!info) {
      throw new Error(`Unsupported currency: ${code}`);
    }
    return { ...info };
  }

  /**
   * Get all supported currencies with their metadata.
   */
  getSupportedCurrencies(): CurrencyInfo[] {
    return SUPPORTED_CURRENCIES.map((code) => ({ ...CURRENCY_INFO[code] }));
  }

  /**
   * Reset the service to default state (useful for testing).
   */
  reset(): void {
    this.stopAutoRefresh();
    this.currentRates = { ...DEFAULT_RATES };
    this.lastUpdated = new Date();
    this.historyBuffer = [];
    this.previousRates = null;
    this.alertThresholds.clear();
    this.pendingAlerts = [];
    this.onRefreshCallback = null;
  }
}

// ============================================================================
// FACTORY & SINGLETON EXPORTS
// ============================================================================

/**
 * Factory function to create a new CurrencyService instance.
 */
export function createCurrencyService(options?: {
  refreshIntervalMs?: number;
}): CurrencyService {
  return new CurrencyService(options);
}

/** Singleton instance for application-wide use */
export const currencyService = new CurrencyService();
export default currencyService;
