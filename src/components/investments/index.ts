/**
 * Investment Components Index
 * 
 * Central export point for all investment-related components
 */

// Dashboard
export { InvestmentDashboard } from './dashboard/InvestmentDashboard';

// Charts
export { AdvancedChartContainer } from './charts/AdvancedChartContainer';
export { 
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  calculateOBV,
  calculateVWAP,
} from './charts/TechnicalIndicators';

// Alerts
export { AlertsPanel } from './alerts/AlertsPanel';

// Patterns
export { PatternOverlay } from './patterns/PatternOverlay';

