/**
 * Instrument Registry — 8.5
 *
 * Provides metadata for traded instruments. Classification is by symbol pattern:
 *   crypto:   BTC, ETH, SOL, ADA, DOGE, AVAX, MATIC, XRP, BNB, LINK, UNI, LTC
 *             or any symbol matching /^[A-Z]{2,5}USD[TC]?$/ (e.g., BTCUSDT)
 *   equities: standard US ticker symbols (1–5 alpha chars)
 *   futures:  symbols ending in a contract suffix pattern (/^[A-Z]{1,4}[FGHJKMNQUVXZ]\d{1,2}$/)
 *   options:  OCC symbol format (typically 21+ chars) — basic detection
 *
 * Default metadata is defined per asset class. Callers may register custom
 * instruments via registerInstrument() for non-standard symbols.
 */

export type AssetClass =
  | "equities"
  | "options"
  | "futures"
  | "crypto"
  | "fx";

export interface InstrumentMetadata {
  symbol: string;
  assetClass: AssetClass;
  tickSize: number;
  multiplier: number;
  currency: string;
  exchange: string;
  tradable: boolean;
  sessionCalendar: string; // reference to the applicable calendar
  settlementDays: number;
}

// ============================================================================
// CLASSIFICATION RULES
// ============================================================================

// Known crypto base symbols (uppercase)
const CRYPTO_BASE_SYMBOLS = new Set([
  "BTC", "ETH", "SOL", "ADA", "DOGE", "AVAX", "MATIC", "XRP",
  "BNB", "LINK", "UNI", "LTC", "DOT", "ATOM", "NEAR",
]);

// Futures contract month codes per CME/ICE convention
const FUTURES_MONTH_CODES = new Set([
  "F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z",
]);

function classifySymbol(symbol: string): AssetClass {
  const upper = symbol.toUpperCase().trim();

  // Crypto: bare base symbols or USDT/USDC pairs
  if (CRYPTO_BASE_SYMBOLS.has(upper)) return "crypto";
  if (/^[A-Z]{2,8}USDT?C?$/.test(upper)) return "crypto";

  // Futures: root 1–4 chars + month code + year digits (e.g., ESH25, CL Z5)
  // OCC options format: symbol (1–6) + date (6) + type (1) + strike (8) = 21 chars
  if (upper.length >= 21 && /^[A-Z]{1,6}\d{6}[CP]\d{8}$/.test(upper)) {
    return "options";
  }

  // Futures pattern: 1–4 alpha root + single month code + 1–2 digit year
  const futuresMatch = upper.match(/^([A-Z]{1,4})([FGHJKMNQUVXZ])(\d{1,2})$/);
  if (futuresMatch && FUTURES_MONTH_CODES.has(futuresMatch[2])) {
    return "futures";
  }

  // FX: standard pairs like EURUSD, GBPUSD (6 chars, two 3-char currency codes)
  if (/^[A-Z]{3}[A-Z]{3}$/.test(upper)) {
    const knownCurrencies = new Set([
      "USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD",
      "SEK", "NOK", "DKK", "SGD", "HKD", "MXN",
    ]);
    const base = upper.slice(0, 3);
    const quote = upper.slice(3);
    if (knownCurrencies.has(base) && knownCurrencies.has(quote)) return "fx";
  }

  // Default: equities (1–5 uppercase alpha)
  return "equities";
}

// ============================================================================
// DEFAULT METADATA PER ASSET CLASS
// ============================================================================

const DEFAULT_METADATA: Record<AssetClass, Omit<InstrumentMetadata, "symbol">> = {
  equities: {
    assetClass: "equities",
    tickSize: 0.01,
    multiplier: 1,
    currency: "USD",
    exchange: "XNYS",
    tradable: true,
    sessionCalendar: "XNYS",
    settlementDays: 2,
  },
  options: {
    assetClass: "options",
    tickSize: 0.01,
    multiplier: 100,
    currency: "USD",
    exchange: "XNYS",
    tradable: true,
    sessionCalendar: "XNYS",
    settlementDays: 1,
  },
  futures: {
    assetClass: "futures",
    tickSize: 0.25,
    multiplier: 50,
    currency: "USD",
    exchange: "XCME",
    tradable: true,
    sessionCalendar: "XCME",
    settlementDays: 0,
  },
  crypto: {
    assetClass: "crypto",
    tickSize: 0.01,
    multiplier: 1,
    currency: "USD",
    exchange: "BINANCE",
    tradable: true,
    sessionCalendar: "BINANCE",
    settlementDays: 0,
  },
  fx: {
    assetClass: "fx",
    tickSize: 0.0001,
    multiplier: 100_000,
    currency: "USD",
    exchange: "XIFE",
    tradable: true,
    sessionCalendar: "XIFE",
    settlementDays: 2,
  },
};

// ============================================================================
// CUSTOM REGISTRY — for non-standard instruments
// ============================================================================

const customRegistry = new Map<string, InstrumentMetadata>();

/**
 * Register custom metadata for a specific instrument.
 * Overrides classification-based defaults for the given symbol.
 */
export function registerInstrument(metadata: InstrumentMetadata): void {
  customRegistry.set(metadata.symbol.toUpperCase(), metadata);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns metadata for the given symbol.
 * Custom registry takes precedence over classification-based defaults.
 */
export function getInstrumentMetadata(symbol: string): InstrumentMetadata {
  const upper = symbol.toUpperCase().trim();

  const custom = customRegistry.get(upper);
  if (custom) return custom;

  const assetClass = classifySymbol(upper);
  return {
    symbol: upper,
    ...DEFAULT_METADATA[assetClass],
  };
}

/**
 * Returns true if the symbol is classified as a US equity.
 */
export function isEquity(symbol: string): boolean {
  const upper = symbol.toUpperCase().trim();
  const custom = customRegistry.get(upper);
  if (custom) return custom.assetClass === "equities";
  return classifySymbol(upper) === "equities";
}

/**
 * Returns true if the symbol is classified as a cryptocurrency.
 */
export function isCrypto(symbol: string): boolean {
  const upper = symbol.toUpperCase().trim();
  const custom = customRegistry.get(upper);
  if (custom) return custom.assetClass === "crypto";
  return classifySymbol(upper) === "crypto";
}

/**
 * Returns true if the symbol is classified as a futures contract.
 */
export function isFutures(symbol: string): boolean {
  const upper = symbol.toUpperCase().trim();
  const custom = customRegistry.get(upper);
  if (custom) return custom.assetClass === "futures";
  return classifySymbol(upper) === "futures";
}
