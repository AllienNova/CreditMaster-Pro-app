/**
 * Investment Charts - Barrel Export
 *
 * TradingView Lightweight Charts integration for Fynvita
 */

// Core Chart Component
export {
  InvestmentChart,
  default as InvestmentChartDefault,
} from './InvestmentChart';
export type {
  InvestmentChartProps,
  IndicatorConfig,
  CrosshairData,
} from './InvestmentChart';

// Advanced Chart Container
export {
  AdvancedChartContainer,
  default as AdvancedChartContainerDefault,
} from './AdvancedChartContainer';

// Technical Indicators
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateVWAP,
  calculateStochastic,
} from './TechnicalIndicators';

export type {
  IndicatorPoint,
  MACDPoint,
  BollingerBandsPoint,
  StochasticPoint,
} from './TechnicalIndicators';

// Drawing Tools
export {
  createDrawingToolManager,
  detectSupportResistanceLevels,
} from './ChartDrawingTools';

export type {
  DrawingToolManager,
  SupportResistanceLevel,
} from './ChartDrawingTools';
