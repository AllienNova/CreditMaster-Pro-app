/**
 * Investment Hooks Index
 *
 * Central export point for all investment-related hooks
 */

export { usePortfolio } from "../usePortfolio";
export type { UsePortfolioOptions, UsePortfolioReturn } from "../usePortfolio";

export { useStockAnalysis } from "../useStockAnalysis";
export type {
  UseStockAnalysisOptions,
  UseStockAnalysisReturn,
} from "../useStockAnalysis";

export { useHoldings } from "../useHoldings";
export type { UseHoldingsOptions, UseHoldingsReturn } from "../useHoldings";

export { useMarketData } from "../useMarketData";
export type {
  UseMarketDataOptions,
  UseMarketDataReturn,
} from "../useMarketData";

export { useRealTimePrice } from "../useRealTimePrice";
export type {
  UseRealTimePriceOptions,
  UseRealTimePriceReturn,
} from "../useRealTimePrice";
