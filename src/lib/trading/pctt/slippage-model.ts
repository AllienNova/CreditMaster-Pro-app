/**
 * PCTT Slippage Model
 *
 * Models execution slippage based on:
 * - Volatility (ATR)
 * - Order size relative to ADV
 * - Time of day / liquidity regime
 * - Spread estimates
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SlippageConfig {
  // Base slippage (constant component)
  baseSlippage: number; // In price points (default: 0.01)

  // Volatility component
  volatilityMultiplier: number; // ATR multiplier (default: 0.1)

  // Size impact
  sizeImpactCoeff: number; // Impact per % of ADV (default: 0.05)
  maxSizeImpact: number; // Cap on size impact (default: 0.5%)

  // Time of day adjustments
  openingMultiplier: number; // First 30 min multiplier (default: 2.0)
  closingMultiplier: number; // Last 30 min multiplier (default: 1.5)
  lunchMultiplier: number; // 12-1pm multiplier (default: 1.3)

  // Spread modeling
  useSpreadEstimate: boolean; // Include spread in slippage
  defaultSpreadBps: number; // Default spread in bps (default: 5)

  // Asset class adjustments
  cryptoMultiplier: number; // Crypto slippage multiplier (default: 1.5)
  forexMultiplier: number; // Forex slippage multiplier (default: 0.8)
  futuresMultiplier: number; // Futures slippage multiplier (default: 1.0)
}

export interface SlippageEstimate {
  expectedSlippage: number; // Expected slippage in price
  expectedSlippageBps: number; // Expected slippage in basis points
  worstCaseSlippage: number; // 95th percentile estimate
  components: {
    base: number;
    volatility: number;
    sizeImpact: number;
    timeOfDay: number;
    spread: number;
  };
  adjustedEntryPrice: number; // Entry price with slippage
  adjustedStopPrice: number; // Stop price with slippage buffer
}

export interface MarketConditions {
  atr: number; // Current ATR
  price: number; // Current price
  volume?: number; // Current volume
  adv?: number; // Average daily volume
  spreadBps?: number; // Current spread in bps
  assetClass?: "stock" | "crypto" | "forex" | "futures";
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_SLIPPAGE_CONFIG: SlippageConfig = {
  baseSlippage: 0.01,
  volatilityMultiplier: 0.1,
  sizeImpactCoeff: 0.05,
  maxSizeImpact: 0.005,
  openingMultiplier: 2.0,
  closingMultiplier: 1.5,
  lunchMultiplier: 1.3,
  useSpreadEstimate: true,
  defaultSpreadBps: 5,
  cryptoMultiplier: 1.5,
  forexMultiplier: 0.8,
  futuresMultiplier: 1.0,
};

// ============================================================================
// SLIPPAGE MODEL
// ============================================================================

export class SlippageModel {
  private config: SlippageConfig;

  constructor(config: Partial<SlippageConfig> = {}) {
    this.config = { ...DEFAULT_SLIPPAGE_CONFIG, ...config };
  }

  /**
   * Estimate slippage for an order
   */
  estimateSlippage(
    side: "buy" | "sell",
    quantity: number,
    conditions: MarketConditions,
  ): SlippageEstimate {
    const { atr, price, volume, adv, spreadBps, assetClass } = conditions;

    // 1. Base slippage
    const baseComponent = this.config.baseSlippage;

    // 2. Volatility component (higher volatility = more slippage)
    const volatilityComponent = this.config.volatilityMultiplier * atr;

    // 3. Size impact (larger orders relative to ADV have more impact)
    let sizeImpactComponent = 0;
    if (adv && adv > 0) {
      const orderValue = quantity * price;
      const percentOfADV = orderValue / (adv * price);
      sizeImpactComponent = Math.min(
        this.config.sizeImpactCoeff * percentOfADV * price,
        this.config.maxSizeImpact * price,
      );
    }

    // 4. Time of day adjustment
    const timeMultiplier = this.getTimeOfDayMultiplier();
    const timeOfDayComponent =
      (baseComponent + volatilityComponent) * (timeMultiplier - 1);

    // 5. Spread component
    let spreadComponent = 0;
    if (this.config.useSpreadEstimate) {
      const effectiveSpread = spreadBps ?? this.config.defaultSpreadBps;
      spreadComponent = ((effectiveSpread / 10000) * price) / 2; // Half spread
    }

    // 6. Asset class adjustment
    const assetMultiplier = this.getAssetClassMultiplier(assetClass);

    // Calculate total expected slippage
    const rawSlippage =
      baseComponent +
      volatilityComponent +
      sizeImpactComponent +
      timeOfDayComponent +
      spreadComponent;
    const expectedSlippage = rawSlippage * assetMultiplier;
    const expectedSlippageBps = (expectedSlippage / price) * 10000;

    // Worst case (2x expected for 95th percentile estimate)
    const worstCaseSlippage = expectedSlippage * 2;

    // Adjust prices based on side
    let adjustedEntryPrice: number;
    let adjustedStopPrice: number;

    if (side === "buy") {
      adjustedEntryPrice = price + expectedSlippage;
      adjustedStopPrice = price - worstCaseSlippage; // Buffer for stop
    } else {
      adjustedEntryPrice = price - expectedSlippage;
      adjustedStopPrice = price + worstCaseSlippage;
    }

    return {
      expectedSlippage,
      expectedSlippageBps,
      worstCaseSlippage,
      components: {
        base: baseComponent * assetMultiplier,
        volatility: volatilityComponent * assetMultiplier,
        sizeImpact: sizeImpactComponent * assetMultiplier,
        timeOfDay: timeOfDayComponent * assetMultiplier,
        spread: spreadComponent * assetMultiplier,
      },
      adjustedEntryPrice,
      adjustedStopPrice,
    };
  }

  /**
   * Get time of day multiplier based on market hours
   */
  private getTimeOfDayMultiplier(): number {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Market hours (EST): 9:30 AM - 4:00 PM
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    // First 30 minutes after open
    if (totalMinutes >= marketOpen && totalMinutes < marketOpen + 30) {
      return this.config.openingMultiplier;
    }

    // Last 30 minutes before close
    if (totalMinutes >= marketClose - 30 && totalMinutes < marketClose) {
      return this.config.closingMultiplier;
    }

    // Lunch hour (12:00 - 1:00 PM)
    if (totalMinutes >= 12 * 60 && totalMinutes < 13 * 60) {
      return this.config.lunchMultiplier;
    }

    return 1.0;
  }

  /**
   * Get asset class multiplier
   */
  private getAssetClassMultiplier(assetClass?: string): number {
    switch (assetClass) {
      case "crypto":
        return this.config.cryptoMultiplier;
      case "forex":
        return this.config.forexMultiplier;
      case "futures":
        return this.config.futuresMultiplier;
      default:
        return 1.0;
    }
  }

  /**
   * Adjust position size to account for slippage cost
   */
  adjustPositionSize(
    targetDollarRisk: number,
    entryPrice: number,
    stopPrice: number,
    slippageEstimate: SlippageEstimate,
  ): { adjustedQuantity: number; effectiveRisk: number } {
    // Original risk per share
    const originalRiskPerShare = Math.abs(entryPrice - stopPrice);

    // Add slippage buffer to risk
    const effectiveRiskPerShare =
      originalRiskPerShare + slippageEstimate.worstCaseSlippage;

    // Calculate adjusted quantity
    const adjustedQuantity = Math.floor(
      targetDollarRisk / effectiveRiskPerShare,
    );
    const effectiveRisk = adjustedQuantity * effectiveRiskPerShare;

    return { adjustedQuantity, effectiveRisk };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<SlippageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current config
   */
  getConfig(): SlippageConfig {
    return { ...this.config };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createSlippageModel(
  config?: Partial<SlippageConfig>,
): SlippageModel {
  return new SlippageModel(config);
}
