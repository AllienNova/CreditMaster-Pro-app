# Trading System Upgrade (25 → 102/100)

## Core Components

### 1. Broker Integration
- **Alpaca** (primary) - Commission-free, great API
- **Interactive Brokers** - Professional grade
- **Paper Trading** - Simulation mode

### 2. Trailing Stop Types
| Type | Description |
|------|-------------|
| Percentage | Fixed % below high |
| ATR-Based | Dynamic based on volatility |
| Chandelier | ATR from highest high |
| Parabolic SAR | Accelerating stops |
| Volatility | Wider in volatile markets |

### 3. Three Trading Engines

**Rule-Based Engine**
- Visual condition builder
- Entry/exit rules
- Position sizing
- Time/volume filters

**ML Engine**
- Random Forest / Gradient Boosting
- LSTM for sequences
- Feature engineering
- Model versioning

**LLM Engine**
- Market analysis (Claude/GPT/DeepSeek)
- Signal interpretation
- Trade idea generation
- Risk assessment

### 4. Signal Fusion
- Weighted consensus from all engines
- Dynamic weight adjustment
- Conflict resolution
- Confidence scoring

### 5. Risk Gateway
- Max daily loss limits
- Position size limits
- Correlation limits
- Kill switch at max drawdown

### 6. Backtesting
- Historical simulation
- Walk-forward optimization
- Monte Carlo analysis
- Strategy comparison

## Timeline: 20 Weeks

## Target Metrics
- Sharpe Ratio > 2.0
- Max Drawdown < 15%
- Win Rate > 55%
