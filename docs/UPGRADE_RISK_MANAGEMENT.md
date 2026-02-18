# Risk Management Upgrade (65 → 102/100)

## Gap Analysis (+37 points needed)

| Feature                | Current | Target                | Points |
| ---------------------- | ------- | --------------------- | ------ |
| Trailing Stops         | None    | 5 types               | +10    |
| Risk Rules Engine      | None    | Full automation       | +8     |
| Position Sizing        | Basic   | Kelly + Risk-based    | +5     |
| Correlation Monitoring | None    | Real-time             | +4     |
| Drawdown Protection    | None    | Auto kill-switch      | +4     |
| Portfolio Heat Map     | None    | Visual risk dashboard | +3     |
| Scenario Analysis      | None    | Stress testing        | +3     |

## Core Components

### 1. Trailing Stop Types

| Type          | Formula                       | Best For            |
| ------------- | ----------------------------- | ------------------- |
| Percentage    | `high * (1 - pct)`            | Simple, all markets |
| ATR           | `high - (ATR * mult)`         | Volatility-adjusted |
| Chandelier    | `highestHigh - (ATR * mult)`  | Trend following     |
| Parabolic SAR | Accelerating formula          | Strong trends       |
| Volatility    | `high - (price * vol * mult)` | Adaptive            |

### 2. Risk Rules Engine

```typescript
interface RiskRules {
  // Position limits
  maxPositionSize: number; // % of portfolio per position
  maxSectorExposure: number; // % per sector
  maxCorrelatedExposure: number; // % correlated assets
  maxOpenPositions: number;

  // Loss limits
  maxDailyLoss: number; // % triggers pause
  maxWeeklyLoss: number; // % triggers review
  maxDrawdown: number; // % triggers kill switch
  maxLossPerTrade: number; // Hard stop

  // Cash management
  minCashReserve: number; // Always maintain
  marginUtilizationLimit: number;

  // Time rules
  tradingHoursOnly: boolean;
  noTradesBeforeEarnings: number; // Days before
  noTradesAroundFOMC: boolean;

  // Consensus requirements
  minSignalConsensus: number; // % agreement required
  minConfidence: number; // Minimum confidence score
}
```

### 3. Position Sizing Methods

```typescript
interface PositionSizer {
  // Fixed methods
  fixedDollar(amount: number): number;
  fixedShares(shares: number): number;
  percentPortfolio(percent: number): number;

  // Risk-based methods
  riskBased(params: {
    entryPrice: number;
    stopLoss: number;
    riskPercent: number; // % of portfolio to risk
  }): number;

  // Kelly Criterion
  kellyCriterion(params: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    kellyFraction: number; // Usually 0.25-0.5 of full Kelly
  }): number;

  // Volatility-adjusted
  volatilityAdjusted(params: {
    targetVolatility: number;
    assetVolatility: number;
    portfolioValue: number;
  }): number;
}
```

### 4. Kill Switch System

```typescript
interface KillSwitch {
  // Triggers
  triggers: {
    maxDrawdown: number; // % from peak
    dailyLossLimit: number; // % daily loss
    consecutiveLosses: number; // N losses in a row
    systemError: boolean; // API/connection issues
    manualTrigger: boolean;
  };

  // Actions when triggered
  actions: {
    closeAllPositions: boolean;
    cancelAllOrders: boolean;
    disableNewTrades: boolean;
    sendAlert: boolean;
    requireManualReset: boolean;
  };

  // Methods
  check(): Promise<KillSwitchStatus>;
  trigger(reason: string): Promise<void>;
  reset(userId: string, confirmation: string): Promise<void>;
}
```

### 5. Correlation Monitor

```typescript
interface CorrelationMonitor {
  // Calculate correlations
  calculateCorrelation(
    symbol1: string,
    symbol2: string,
    period: number,
  ): Promise<number>;
  getCorrelationMatrix(symbols: string[]): Promise<Matrix>;

  // Monitor portfolio
  getPortfolioCorrelations(portfolio: Portfolio): Promise<CorrelationReport>;
  detectHighCorrelation(threshold: number): Promise<HighCorrelationAlert[]>;

  // Recommendations
  suggestDiversification(
    portfolio: Portfolio,
  ): Promise<DiversificationSuggestion[]>;
}
```

### 6. Stress Testing

```typescript
interface StressTester {
  // Historical scenarios
  replayHistoricalCrash(
    event: "dot_com" | "2008" | "covid" | "custom",
  ): Promise<StressResult>;

  // Custom scenarios
  runScenario(params: {
    marketMove: number; // % market move
    volatilitySpike: number; // VIX level
    correlationShock: number; // Correlation increase
    liquidityDrop: number; // % liquidity reduction
  }): Promise<StressResult>;

  // Monte Carlo
  monteCarloVaR(params: {
    iterations: number;
    confidenceLevel: number;
    timeHorizon: number;
  }): Promise<VaRResult>;
}
```

## Risk Dashboard Metrics

| Metric           | Target | Alert Level |
| ---------------- | ------ | ----------- |
| Portfolio Beta   | < 1.2  | > 1.5       |
| Max Position     | < 10%  | > 15%       |
| Sector Exposure  | < 25%  | > 35%       |
| Correlation      | < 0.6  | > 0.8       |
| Daily VaR 95%    | < 2%   | > 3%        |
| Sharpe Ratio     | > 1.5  | < 1.0       |
| Current Drawdown | < 10%  | > 15%       |

## Timeline

| Week  | Deliverable                         |
| ----- | ----------------------------------- |
| 1-2   | Trailing stop service (all 5 types) |
| 3-4   | Risk rules engine                   |
| 5-6   | Position sizing methods             |
| 7-8   | Kill switch system                  |
| 9-10  | Correlation monitor                 |
| 11-12 | Stress testing                      |
