/**
 * Fractional Order Service
 *
 * Converts dollar-based orders into fractional share quantities,
 * validates broker support for fractional shares, and provides
 * lot-splitting for dollar-cost averaging strategies.
 *
 * Relies on BrokerRouter for broker selection and order execution.
 */

import type {
  OrderSide,
  OrderResult,
  Quote,
} from "@/lib/trading/brokers/broker-interface";
import type { BrokerRouter, RoutingPreference } from "@/lib/trading/brokers/broker-router";

// ============================================================================
// TYPES
// ============================================================================

export interface DollarOrderParams {
  /** Stock or ETF ticker symbol */
  symbol: string;
  /** Dollar amount to invest */
  dollarAmount: number;
  /** Buy or sell */
  side: OrderSide;
  /** Optional broker routing preference */
  brokerPreference?: RoutingPreference;
  /** User placing the order */
  userId: string;
}

export interface ShareOrderParams {
  /** Stock or ETF ticker symbol */
  symbol: string;
  /** Number of shares (may be fractional, e.g. 0.5) */
  quantity: number;
  /** Buy or sell */
  side: OrderSide;
  /** Optional broker routing preference */
  brokerPreference?: RoutingPreference;
  /** User placing the order */
  userId: string;
}

export interface LotSplit {
  /** 1-based lot index */
  lotNumber: number;
  /** Dollar amount for this lot */
  amount: number;
  /** Estimated share quantity for this lot */
  shares: number;
}

export interface FractionalOrderResult {
  success: boolean;
  orderResult?: OrderResult;
  sharesOrdered?: number;
  estimatedCost?: number;
  error?: string;
}

export interface FractionalValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum dollar amount for a fractional order (most brokers enforce $1) */
const MIN_DOLLAR_AMOUNT = 1;

/** Maximum decimal places for fractional share quantities */
const MAX_SHARE_DECIMALS = 9;

/** Minimum share quantity accepted by most brokers */
const MIN_SHARE_QUANTITY = 0.000000001;

// ============================================================================
// FRACTIONAL ORDER SERVICE
// ============================================================================

export class FractionalOrderService {
  private readonly router: BrokerRouter;

  constructor(router: BrokerRouter) {
    this.router = router;
  }

  // ==========================================================================
  // DOLLAR-BASED ORDERS
  // ==========================================================================

  /**
   * Place a dollar-based order. Fetches the current price, converts the dollar
   * amount into a fractional share quantity, validates the order, and submits
   * it through the broker.
   */
  async placeDollarOrder(params: DollarOrderParams): Promise<FractionalOrderResult> {
    const { symbol, dollarAmount, side, brokerPreference, userId } = params;

    // Validate fractional support
    const validation = this.validateFractionalOrder({
      dollarAmount,
      symbol,
      brokerPreference,
    });
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join("; "),
      };
    }

    // Resolve broker (require fractional shares capability)
    const preference: RoutingPreference = {
      ...brokerPreference,
      requireCapability: "fractionalShares",
    };

    const broker = this.router.getBroker(preference);

    // Fetch current quote
    let quote: Quote;
    try {
      quote = await broker.getQuote(symbol);
    } catch (err) {
      return {
        success: false,
        error: `Failed to fetch quote for ${symbol}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (quote.last <= 0 && quote.ask <= 0) {
      return {
        success: false,
        error: `Invalid price data for ${symbol}: last=${quote.last}, ask=${quote.ask}`,
      };
    }

    const currentPrice = quote.ask > 0 ? quote.ask : quote.last;
    const shares = this.calculateShareQuantity(symbol, dollarAmount, currentPrice);

    if (shares < MIN_SHARE_QUANTITY) {
      return {
        success: false,
        error: `Dollar amount $${dollarAmount.toFixed(2)} is too small to purchase any shares of ${symbol} at $${currentPrice.toFixed(2)}`,
      };
    }

    // Place the order
    try {
      const orderResult = await broker.placeOrder({
        symbol,
        side,
        type: "market",
        quantity: shares,
        timeInForce: "day",
        clientOrderId: `FRAC-${userId}-${Date.now()}`,
      });

      return {
        success: orderResult.success,
        orderResult,
        sharesOrdered: shares,
        estimatedCost: shares * currentPrice,
        error: orderResult.error,
      };
    } catch (err) {
      return {
        success: false,
        error: `Order placement failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ==========================================================================
  // SHARE-BASED ORDERS
  // ==========================================================================

  /**
   * Place a fractional share order directly. Validates the broker supports
   * fractional shares and submits the order.
   */
  async placeShareOrder(params: ShareOrderParams): Promise<FractionalOrderResult> {
    const { symbol, quantity, side, brokerPreference, userId } = params;

    if (quantity <= 0) {
      return { success: false, error: "Quantity must be greater than 0" };
    }

    if (quantity < MIN_SHARE_QUANTITY) {
      return { success: false, error: `Quantity ${quantity} is below the minimum of ${MIN_SHARE_QUANTITY}` };
    }

    const preference: RoutingPreference = {
      ...brokerPreference,
      requireCapability: "fractionalShares",
    };

    const broker = this.router.getBroker(preference);

    // Fetch price for cost estimate
    let estimatedCost: number | undefined;
    try {
      const quote = await broker.getQuote(symbol);
      const price = quote.ask > 0 ? quote.ask : quote.last;
      estimatedCost = quantity * price;
    } catch {
      // Non-fatal: proceed without cost estimate
    }

    try {
      const orderResult = await broker.placeOrder({
        symbol,
        side,
        type: "market",
        quantity: parseFloat(quantity.toFixed(MAX_SHARE_DECIMALS)),
        timeInForce: "day",
        clientOrderId: `FRAC-${userId}-${Date.now()}`,
      });

      return {
        success: orderResult.success,
        orderResult,
        sharesOrdered: quantity,
        estimatedCost,
        error: orderResult.error,
      };
    } catch (err) {
      return {
        success: false,
        error: `Order placement failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ==========================================================================
  // LOT SPLITTING (DCA)
  // ==========================================================================

  /**
   * Split a total dollar amount into equal lots for dollar-cost averaging.
   * Each lot contains the dollar amount and estimated share quantity based
   * on the provided current price.
   *
   * @param symbol - Ticker symbol (for labeling; price is passed separately)
   * @param totalAmount - Total dollar amount to split
   * @param lotCount - Number of lots to create
   * @param currentPrice - Optional price for share estimation (if omitted, lots have 0 shares)
   * @returns Array of LotSplit objects
   */
  splitIntoLots(
    _symbol: string,
    totalAmount: number,
    lotCount: number,
    currentPrice?: number,
  ): LotSplit[] {
    if (totalAmount <= 0) {
      throw new FractionalOrderError("Total amount must be greater than 0");
    }
    if (lotCount <= 0 || !Number.isInteger(lotCount)) {
      throw new FractionalOrderError("Lot count must be a positive integer");
    }
    if (currentPrice !== undefined && currentPrice <= 0) {
      throw new FractionalOrderError("Current price must be greater than 0");
    }

    const baseLotAmount = Math.floor((totalAmount / lotCount) * 100) / 100;
    const remainder = Math.round((totalAmount - baseLotAmount * lotCount) * 100) / 100;

    const lots: LotSplit[] = [];

    for (let i = 0; i < lotCount; i++) {
      // Distribute any rounding remainder to the last lot
      const amount = i === lotCount - 1 ? baseLotAmount + remainder : baseLotAmount;
      const shares =
        currentPrice !== undefined && currentPrice > 0
          ? parseFloat((amount / currentPrice).toFixed(MAX_SHARE_DECIMALS))
          : 0;

      lots.push({
        lotNumber: i + 1,
        amount: parseFloat(amount.toFixed(2)),
        shares,
      });
    }

    return lots;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Convert a dollar amount to a fractional share quantity.
   * Rounds down to MAX_SHARE_DECIMALS decimal places.
   */
  calculateShareQuantity(
    _symbol: string,
    dollarAmount: number,
    currentPrice: number,
  ): number {
    if (dollarAmount <= 0) {
      throw new FractionalOrderError("Dollar amount must be greater than 0");
    }
    if (currentPrice <= 0) {
      throw new FractionalOrderError("Current price must be greater than 0");
    }

    const rawShares = dollarAmount / currentPrice;
    // Round down to avoid over-spending
    const factor = Math.pow(10, MAX_SHARE_DECIMALS);
    return Math.floor(rawShares * factor) / factor;
  }

  /**
   * Validate that a fractional order can be executed.
   * Checks dollar amount minimums and broker capability.
   */
  validateFractionalOrder(params: {
    dollarAmount?: number;
    quantity?: number;
    symbol: string;
    brokerPreference?: RoutingPreference;
  }): FractionalValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Dollar amount validation
    if (params.dollarAmount !== undefined) {
      if (params.dollarAmount <= 0) {
        errors.push("Dollar amount must be greater than 0");
      } else if (params.dollarAmount < MIN_DOLLAR_AMOUNT) {
        errors.push(`Dollar amount must be at least $${MIN_DOLLAR_AMOUNT}`);
      }
    }

    // Share quantity validation
    if (params.quantity !== undefined) {
      if (params.quantity <= 0) {
        errors.push("Share quantity must be greater than 0");
      } else if (params.quantity < MIN_SHARE_QUANTITY) {
        errors.push(`Share quantity must be at least ${MIN_SHARE_QUANTITY}`);
      }
    }

    // Symbol validation
    if (!params.symbol || params.symbol.trim() === "") {
      errors.push("Symbol is required");
    }

    // Broker capability check
    try {
      const preference: RoutingPreference = {
        ...params.brokerPreference,
        requireCapability: "fractionalShares",
      };
      this.router.getBroker(preference);
    } catch {
      errors.push("No connected broker supports fractional share trading");
    }

    // Warn about non-US stocks potentially not supporting fractional
    if (params.symbol && /[.:]/.test(params.symbol)) {
      warnings.push(
        "International symbols may have limited fractional share support",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class FractionalOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FractionalOrderError";
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createFractionalOrderService(
  router: BrokerRouter,
): FractionalOrderService {
  return new FractionalOrderService(router);
}
