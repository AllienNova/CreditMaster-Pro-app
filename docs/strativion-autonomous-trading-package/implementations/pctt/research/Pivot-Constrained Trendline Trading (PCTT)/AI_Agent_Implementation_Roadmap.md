# AI Agent Trading System: Implementation Roadmap

## From Blueprint to Backtesting-Ready Prototype

**Document Version:** 1.0  
**Date:** January 15, 2026  
**Prepared for:** Honour

---

## Executive Summary

This document provides a detailed, step-by-step implementation roadmap for converting the AI Agent Trading Architecture blueprint into a functional, backtesting-ready prototype. The roadmap is organized into **6 phases** spanning approximately **8-12 weeks** for a solo developer or small team.

---

## Table of Contents

1. [Phase 1: Environment Setup & Infrastructure](#phase-1-environment-setup--infrastructure-week-1-2)
2. [Phase 2: Data Pipeline Implementation](#phase-2-data-pipeline-implementation-week-2-3)
3. [Phase 3: Core Strategy Engine](#phase-3-core-strategy-engine-week-3-5)
4. [Phase 4: Backtesting Framework](#phase-4-backtesting-framework-week-5-7)
5. [Phase 5: AI/ML Enhancement Layer](#phase-5-aiml-enhancement-layer-week-7-9)
6. [Phase 6: Monitoring & Paper Trading](#phase-6-monitoring--paper-trading-week-9-12)
7. [Technology Stack Summary](#technology-stack-summary)
8. [File Structure](#file-structure)
9. [Deployment Options](#deployment-options)

---

## Phase 1: Environment Setup & Infrastructure (Week 1-2)

### 1.1 Development Environment

**Step 1: Create Project Structure**

```bash
mkdir -p rg-trading-agent/{src,tests,data,configs,notebooks,logs,models}
cd rg-trading-agent
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows
```

**Step 2: Install Core Dependencies**

Create `requirements.txt`:

```txt
# Core
python-dotenv==1.0.0
pydantic==2.5.0
pydantic-settings==2.1.0

# Data & Analysis
pandas==2.1.0
numpy==1.26.0
scipy==1.11.0
ta-lib==0.4.28  # Technical analysis (requires system install)

# Database
sqlalchemy==2.0.23
asyncpg==0.29.0
redis==5.0.1
timescaledb==0.1.0  # Optional: for time-series optimization

# API & Async
httpx==0.25.0
aiohttp==3.9.0
websockets==12.0
ccxt==4.1.0  # Crypto exchange connectivity

# ML/AI
scikit-learn==1.3.0
xgboost==2.0.0
optuna==3.4.0  # Hyperparameter optimization

# Backtesting
vectorbt==0.26.0  # Vectorized backtesting
backtrader==1.9.78  # Event-driven backtesting (alternative)

# Visualization
plotly==5.18.0
dash==2.14.0

# Monitoring
prometheus-client==0.19.0
structlog==23.2.0

# Testing
pytest==7.4.0
pytest-asyncio==0.21.0
pytest-cov==4.1.0
```

Install:

```bash
pip install -r requirements.txt
```

**Step 3: Database Setup**

Option A: Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  timescaledb:
    image: timescale/timescaledb:latest-pg15
    container_name: rg_timescaledb
    environment:
      POSTGRES_USER: rg_agent
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: rg_trading
    ports:
      - "5432:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rg_agent -d rg_trading"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: rg_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  grafana:
    image: grafana/grafana:latest
    container_name: rg_grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  timescale_data:
  redis_data:
  grafana_data:
```

Start services:

```bash
docker-compose up -d
```

**Step 4: Configuration Management**

Create `configs/settings.py`:

```python
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from enum import Enum

class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class TradingMode(str, Enum):
    BACKTEST = "backtest"
    PAPER = "paper"
    LIVE = "live"

class Settings(BaseSettings):
    # Environment
    environment: Environment = Environment.DEVELOPMENT
    trading_mode: TradingMode = TradingMode.BACKTEST

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "rg_agent"
    db_password: str = Field(..., env="DB_PASSWORD")
    db_name: str = "rg_trading"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379

    # API Keys (for live/paper trading)
    binance_api_key: Optional[str] = None
    binance_api_secret: Optional[str] = None
    alpaca_api_key: Optional[str] = None
    alpaca_api_secret: Optional[str] = None

    # Strategy Parameters
    default_timeframe: str = "4h"
    lookback_window: int = 200
    pivot_left: int = 2
    pivot_right: int = 2
    er_trend_threshold: float = 0.35
    er_range_threshold: float = 0.20
    q_a_threshold: float = 0.70
    q_b_threshold: float = 0.60
    d_geom_max: float = 2.5

    # Risk Management
    max_risk_per_trade: float = 0.01  # 1%
    max_daily_drawdown: float = 0.03  # 3%
    max_positions: int = 3

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

Create `.env`:

```bash
DB_PASSWORD=your_secure_password
GRAFANA_PASSWORD=admin123
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
```

---

## Phase 2: Data Pipeline Implementation (Week 2-3)

### 2.1 Database Schema

Create `src/database/models.py`:

```python
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Enum, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class TimeframeEnum(enum.Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"

class RegimeEnum(enum.Enum):
    TREND = "trend"
    RANGE = "range"
    TRANSITION = "transition"

class EventEnum(enum.Enum):
    IDLE = "idle"
    BREAK = "break"
    RETEST = "retest"
    REJECT = "reject"
    FAIL = "fail"
    TIMEOUT = "timeout"

class OHLCV(Base):
    """Raw price data - use TimescaleDB hypertable for performance"""
    __tablename__ = "ohlcv"

    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), nullable=False)
    timeframe = Column(Enum(TimeframeEnum), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)

    __table_args__ = (
        Index('idx_ohlcv_symbol_tf_ts', 'symbol', 'timeframe', 'timestamp'),
    )

class StructureState(Base):
    """Computed structure object per bar"""
    __tablename__ = "structure_state"

    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), nullable=False)
    timeframe = Column(Enum(TimeframeEnum), nullable=False)
    timestamp = Column(DateTime, nullable=False)

    # Boundaries
    support_level = Column(Float)
    support_slope = Column(Float)
    resistance_level = Column(Float)
    resistance_slope = Column(Float)

    # Quality scores
    q_support = Column(Float)
    q_resistance = Column(Float)

    # Regime
    regime = Column(Enum(RegimeEnum))
    efficiency_ratio = Column(Float)
    crossing_count = Column(Integer)

    # Event state
    event = Column(Enum(EventEnum))

    # Distances
    d_support_norm = Column(Float)
    d_resistance_norm = Column(Float)

    # CHOCH/MSS
    mss_bullish = Column(Boolean, default=False)
    mss_bearish = Column(Boolean, default=False)

    __table_args__ = (
        Index('idx_structure_symbol_tf_ts', 'symbol', 'timeframe', 'timestamp'),
    )

class Signal(Base):
    """Generated trading signals"""
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), nullable=False)
    timeframe = Column(Enum(TimeframeEnum), nullable=False)
    timestamp = Column(DateTime, nullable=False)

    direction = Column(String(10))  # 'long' or 'short'
    entry_price = Column(Float)
    stop_loss = Column(Float)
    take_profit_1 = Column(Float)

    q_score = Column(Float)
    setup_grade = Column(String(1))  # 'A', 'B', or 'C'
    d_geom = Column(Float)
    rejection_score = Column(Integer)

    regime_at_signal = Column(Enum(RegimeEnum))
    mss_aligned = Column(Boolean)

    is_valid = Column(Boolean, default=True)
    invalidation_reason = Column(String(100))

class Trade(Base):
    """Executed trades (backtest or live)"""
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True)
    signal_id = Column(Integer, ForeignKey('signals.id'))
    symbol = Column(String(20), nullable=False)

    entry_time = Column(DateTime)
    entry_price = Column(Float)
    direction = Column(String(10))
    position_size = Column(Float)

    exit_time = Column(DateTime)
    exit_price = Column(Float)
    exit_reason = Column(String(50))  # 'stop', 'tp1', 'trail', 'time', 'manual'

    pnl_absolute = Column(Float)
    pnl_percent = Column(Float)
    r_multiple = Column(Float)

    max_favorable_excursion = Column(Float)
    max_adverse_excursion = Column(Float)

    # Execution details
    slippage = Column(Float)
    commission = Column(Float)

    signal = relationship("Signal")
```

### 2.2 Data Fetcher

Create `src/data/fetcher.py`:

```python
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
import ccxt.async_support as ccxt
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import OHLCV, TimeframeEnum
import structlog

logger = structlog.get_logger()

class DataFetcher:
    """Fetches historical and real-time OHLCV data from exchanges"""

    TIMEFRAME_MAP = {
        TimeframeEnum.M1: "1m",
        TimeframeEnum.M5: "5m",
        TimeframeEnum.M15: "15m",
        TimeframeEnum.H1: "1h",
        TimeframeEnum.H4: "4h",
        TimeframeEnum.D1: "1d",
        TimeframeEnum.W1: "1w",
    }

    def __init__(self, exchange_id: str = "binance"):
        self.exchange_id = exchange_id
        self.exchange = None

    async def connect(self):
        """Initialize exchange connection"""
        exchange_class = getattr(ccxt, self.exchange_id)
        self.exchange = exchange_class({
            'enableRateLimit': True,
            'options': {'defaultType': 'spot'}
        })
        await self.exchange.load_markets()
        logger.info(f"Connected to {self.exchange_id}")

    async def disconnect(self):
        """Close exchange connection"""
        if self.exchange:
            await self.exchange.close()

    async def fetch_ohlcv(
        self,
        symbol: str,
        timeframe: TimeframeEnum,
        since: Optional[datetime] = None,
        limit: int = 1000
    ) -> pd.DataFrame:
        """Fetch OHLCV data from exchange"""

        tf_str = self.TIMEFRAME_MAP[timeframe]
        since_ts = int(since.timestamp() * 1000) if since else None

        all_data = []
        current_since = since_ts

        while True:
            try:
                ohlcv = await self.exchange.fetch_ohlcv(
                    symbol, tf_str, since=current_since, limit=limit
                )

                if not ohlcv:
                    break

                all_data.extend(ohlcv)

                # Check if we got less than limit (end of data)
                if len(ohlcv) < limit:
                    break

                # Move to next batch
                current_since = ohlcv[-1][0] + 1

                # Rate limiting
                await asyncio.sleep(self.exchange.rateLimit / 1000)

            except Exception as e:
                logger.error(f"Error fetching OHLCV: {e}")
                break

        if not all_data:
            return pd.DataFrame()

        df = pd.DataFrame(all_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df['symbol'] = symbol
        df['timeframe'] = timeframe.value

        return df

    async def fetch_historical(
        self,
        symbol: str,
        timeframe: TimeframeEnum,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Fetch historical data for backtesting"""

        end_date = end_date or datetime.utcnow()

        logger.info(f"Fetching {symbol} {timeframe.value} from {start_date} to {end_date}")

        df = await self.fetch_ohlcv(symbol, timeframe, since=start_date)

        # Filter to date range
        df = df[(df['timestamp'] >= start_date) & (df['timestamp'] <= end_date)]

        logger.info(f"Fetched {len(df)} bars")

        return df


class DataManager:
    """Manages data storage and retrieval"""

    def __init__(self, session: AsyncSession, fetcher: DataFetcher):
        self.session = session
        self.fetcher = fetcher

    async def ensure_data(
        self,
        symbol: str,
        timeframe: TimeframeEnum,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Ensure data exists in database, fetch if missing"""

        # Check existing data
        # ... (query database for existing range)

        # Fetch missing data
        df = await self.fetcher.fetch_historical(symbol, timeframe, start_date, end_date)

        # Store in database
        # ... (bulk insert)

        return df
```

### 2.3 Technical Indicators

Create `src/indicators/technical.py`:

```python
import numpy as np
import pandas as pd
from typing import Tuple, Optional
from dataclasses import dataclass

@dataclass
class PivotPoint:
    """Represents a confirmed pivot point"""
    bar_index: int
    price: float
    is_high: bool
    timestamp: pd.Timestamp

class TechnicalIndicators:
    """Core technical indicator calculations matching Pine Script logic"""

    @staticmethod
    def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """Average True Range"""
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(window=period).mean()

    @staticmethod
    def efficiency_ratio(close: pd.Series, period: int = 150) -> pd.Series:
        """Kaufman's Efficiency Ratio"""
        net_change = abs(close - close.shift(period))
        sum_changes = abs(close - close.shift(1)).rolling(window=period).sum()
        return net_change / sum_changes.replace(0, np.nan)

    @staticmethod
    def pivots(
        high: pd.Series,
        low: pd.Series,
        left: int = 2,
        right: int = 2
    ) -> Tuple[pd.Series, pd.Series]:
        """
        Detect pivot highs and lows (non-repainting)
        Returns series with pivot values at confirmation bar (offset by 'right')
        """
        pivot_highs = pd.Series(index=high.index, dtype=float)
        pivot_lows = pd.Series(index=low.index, dtype=float)

        for i in range(left + right, len(high)):
            # Check pivot high
            center_idx = i - right
            center_high = high.iloc[center_idx]

            is_pivot_high = True
            for j in range(center_idx - left, center_idx + right + 1):
                if j != center_idx and high.iloc[j] >= center_high:
                    is_pivot_high = False
                    break

            if is_pivot_high:
                pivot_highs.iloc[i] = center_high

            # Check pivot low
            center_low = low.iloc[center_idx]

            is_pivot_low = True
            for j in range(center_idx - left, center_idx + right + 1):
                if j != center_idx and low.iloc[j] <= center_low:
                    is_pivot_low = False
                    break

            if is_pivot_low:
                pivot_lows.iloc[i] = center_low

        return pivot_highs, pivot_lows

    @staticmethod
    def crossing_count(
        close: pd.Series,
        midline: pd.Series,
        period: int = 150
    ) -> pd.Series:
        """Count midline crossings over period"""
        above = close > midline
        crosses = (above != above.shift(1)).astype(int)
        return crosses.rolling(window=period).sum()

    @staticmethod
    def clv(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
        """Close Location Value"""
        range_hl = high - low
        return ((2 * close - high - low) / range_hl.replace(0, np.nan)).fillna(0)
```

---

## Phase 3: Core Strategy Engine (Week 3-5)

### 3.1 Structure Estimator

Create `src/strategy/structure.py`:

```python
import numpy as np
import pandas as pd
from typing import List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
from src.indicators.technical import TechnicalIndicators, PivotPoint

class Regime(Enum):
    TREND = "trend"
    RANGE = "range"
    TRANSITION = "transition"

class Event(Enum):
    IDLE = "idle"
    BREAK = "break"
    RETEST = "retest"
    REJECT = "reject"
    FAIL = "fail"
    TIMEOUT = "timeout"

@dataclass
class BoundaryLine:
    """Represents a support or resistance line"""
    intercept: float
    slope: float
    score: float
    touches: int
    anchor_bar: int

    def value_at(self, bar_index: int) -> float:
        """Get line value at specific bar"""
        return self.intercept + self.slope * bar_index

@dataclass
class StructureObject:
    """The Structure API output for a single bar"""
    timestamp: pd.Timestamp
    bar_index: int

    # Boundaries
    support: Optional[BoundaryLine] = None
    resistance: Optional[BoundaryLine] = None

    # Quality
    q_support: float = 0.0
    q_resistance: float = 0.0

    # Regime
    regime: Regime = Regime.TRANSITION
    efficiency_ratio: float = 0.0
    crossing_count: int = 0

    # Event
    event: Event = Event.IDLE

    # Distances (normalized by ATR)
    d_support: float = 0.0
    d_resistance: float = 0.0

    # CHOCH/MSS
    mss_bullish: bool = False
    mss_bearish: bool = False

    # Frozen lines (after break)
    action_line: Optional[BoundaryLine] = None
    safety_line: Optional[BoundaryLine] = None
    break_bar: Optional[int] = None
    break_direction: int = 0  # -1 short, +1 long


class StructureEstimator:
    """
    Estimates market structure boundaries using pivot-constrained optimization.
    Implements the mathematical framework from the paper.
    """

    def __init__(
        self,
        lookback: int = 200,
        pivot_left: int = 2,
        pivot_right: int = 2,
        max_pivots: int = 12,
        alpha: float = 0.10,  # Touch tolerance
        omega_s: float = 0.20,  # Span reward
        lambda_v: float = 1.50,  # Violation penalty
        eval_step: int = 4,
        min_touches: int = 2,
        er_trend: float = 0.35,
        er_range: float = 0.20,
        cross_max: int = 8,
        cross_min: int = 20,
    ):
        self.lookback = lookback
        self.pivot_left = pivot_left
        self.pivot_right = pivot_right
        self.max_pivots = max_pivots
        self.alpha = alpha
        self.omega_s = omega_s
        self.lambda_v = lambda_v
        self.eval_step = eval_step
        self.min_touches = min_touches
        self.er_trend = er_trend
        self.er_range = er_range
        self.cross_max = cross_max
        self.cross_min = cross_min

        # State
        self.pivot_lows: List[PivotPoint] = []
        self.pivot_highs: List[PivotPoint] = []
        self.last_structure: Optional[StructureObject] = None

    def _score_line(
        self,
        pivots: List[PivotPoint],
        bars: pd.DataFrame,
        atr: float,
        is_support: bool,
        current_bar: int
    ) -> Optional[BoundaryLine]:
        """Score candidate lines from pivot pairs"""

        if len(pivots) < 2:
            return None

        best_score = -np.inf
        best_line = None

        # Generate candidates from pivot pairs
        for i in range(min(len(pivots) - 1, 6)):
            for j in range(i + 1, min(len(pivots), 7)):
                p1, p2 = pivots[i], pivots[j]

                if p1.bar_index == p2.bar_index:
                    continue

                # Calculate line parameters
                slope = (p1.price - p2.price) / (p1.bar_index - p2.bar_index)
                intercept = p1.price - slope * p1.bar_index

                # Score the line
                tau = self.alpha * atr

                # Touch reward
                touch_reward = 0.0
                touches = 0
                for p in pivots:
                    line_val = intercept + slope * p.bar_index
                    if is_support:
                        dist = p.price - line_val
                        if 0 <= dist <= tau:
                            touches += 1
                            touch_reward += 1.0 - dist / tau
                    else:
                        dist = line_val - p.price
                        if 0 <= dist <= tau:
                            touches += 1
                            touch_reward += 1.0 - dist / tau

                if touches < self.min_touches:
                    continue

                # Violation penalty (sampled)
                violation_penalty = 0.0
                window_start = max(0, current_bar - self.lookback)
                for idx in range(window_start, current_bar, self.eval_step):
                    if idx >= len(bars):
                        break
                    line_val = intercept + slope * idx
                    if is_support:
                        bar_low = bars.iloc[idx]['low']
                        if bar_low < line_val - tau:
                            violation_penalty += (line_val - bar_low) / atr
                    else:
                        bar_high = bars.iloc[idx]['high']
                        if bar_high > line_val + tau:
                            violation_penalty += (bar_high - line_val) / atr

                # Span reward
                span = abs(p1.bar_index - p2.bar_index)
                span_reward = self.omega_s * np.log(1 + span)

                # Total score
                score = touch_reward + span_reward - self.lambda_v * violation_penalty

                if score > best_score:
                    best_score = score
                    best_line = BoundaryLine(
                        intercept=intercept,
                        slope=slope,
                        score=score,
                        touches=touches,
                        anchor_bar=p1.bar_index
                    )

        return best_line

    def _classify_regime(self, er: float, crossings: int) -> Regime:
        """Classify market regime"""
        if er >= self.er_trend and crossings <= self.cross_max:
            return Regime.TREND
        elif er <= self.er_range or crossings >= self.cross_min:
            return Regime.RANGE
        else:
            return Regime.TRANSITION

    def update(self, bars: pd.DataFrame, current_idx: int) -> StructureObject:
        """
        Update structure estimation for current bar.
        Uses only data available at current_idx (past-only).
        """

        current_bar = bars.iloc[current_idx]
        timestamp = current_bar.name if isinstance(current_bar.name, pd.Timestamp) else bars.index[current_idx]

        # Calculate ATR
        atr_series = TechnicalIndicators.atr(
            bars['high'][:current_idx+1],
            bars['low'][:current_idx+1],
            bars['close'][:current_idx+1]
        )
        atr = atr_series.iloc[-1] if len(atr_series) > 0 else 1.0

        # Detect new pivots
        pivot_highs, pivot_lows = TechnicalIndicators.pivots(
            bars['high'][:current_idx+1],
            bars['low'][:current_idx+1],
            self.pivot_left,
            self.pivot_right
        )

        # Update pivot lists
        if not pd.isna(pivot_lows.iloc[-1]) if len(pivot_lows) > 0 else False:
            new_pivot = PivotPoint(
                bar_index=current_idx - self.pivot_right,
                price=pivot_lows.iloc[-1],
                is_high=False,
                timestamp=timestamp
            )
            self.pivot_lows.insert(0, new_pivot)
            if len(self.pivot_lows) > self.max_pivots:
                self.pivot_lows.pop()

        if not pd.isna(pivot_highs.iloc[-1]) if len(pivot_highs) > 0 else False:
            new_pivot = PivotPoint(
                bar_index=current_idx - self.pivot_right,
                price=pivot_highs.iloc[-1],
                is_high=True,
                timestamp=timestamp
            )
            self.pivot_highs.insert(0, new_pivot)
            if len(self.pivot_highs) > self.max_pivots:
                self.pivot_highs.pop()

        # Estimate boundaries (using past-only data)
        support = self._score_line(
            self.pivot_lows, bars, atr, is_support=True, current_bar=current_idx
        )
        resistance = self._score_line(
            self.pivot_highs, bars, atr, is_support=False, current_bar=current_idx
        )

        # Calculate Q-scores
        q_support = 1.0 / (1.0 + np.exp(-support.score / 3.0)) if support else 0.0
        q_resistance = 1.0 / (1.0 + np.exp(-resistance.score / 3.0)) if resistance else 0.0

        # Calculate regime
        er_series = TechnicalIndicators.efficiency_ratio(bars['close'][:current_idx+1])
        er = er_series.iloc[-1] if len(er_series) > 0 and not pd.isna(er_series.iloc[-1]) else 0.0

        # Midline and crossings
        if support and resistance:
            midline = pd.Series(
                [(support.value_at(i) + resistance.value_at(i)) / 2 for i in range(len(bars))],
                index=bars.index
            )
        else:
            midline = bars['close'].ewm(span=50).mean()

        crossings_series = TechnicalIndicators.crossing_count(
            bars['close'][:current_idx+1], midline[:current_idx+1]
        )
        crossings = int(crossings_series.iloc[-1]) if len(crossings_series) > 0 else 0

        regime = self._classify_regime(er, crossings)

        # Calculate distances
        close = current_bar['close']
        d_support = abs(close - support.value_at(current_idx)) / atr if support else 0.0
        d_resistance = abs(close - resistance.value_at(current_idx)) / atr if resistance else 0.0

        # CHOCH/MSS detection
        mss_bullish = False
        mss_bearish = False
        if len(self.pivot_highs) > 0:
            last_ph = self.pivot_highs[0].price
            if close > last_ph and bars.iloc[current_idx - 1]['close'] <= last_ph:
                mss_bullish = True
        if len(self.pivot_lows) > 0:
            last_pl = self.pivot_lows[0].price
            if close < last_pl and bars.iloc[current_idx - 1]['close'] >= last_pl:
                mss_bearish = True

        # Create structure object
        structure = StructureObject(
            timestamp=timestamp,
            bar_index=current_idx,
            support=support,
            resistance=resistance,
            q_support=q_support,
            q_resistance=q_resistance,
            regime=regime,
            efficiency_ratio=er,
            crossing_count=crossings,
            event=Event.IDLE,
            d_support=d_support,
            d_resistance=d_resistance,
            mss_bullish=mss_bullish,
            mss_bearish=mss_bearish
        )

        self.last_structure = structure
        return structure
```

### 3.2 Signal Generator

Create `src/strategy/signals.py`:

```python
from dataclasses import dataclass
from typing import Optional
from enum import Enum
import pandas as pd
import numpy as np
from src.strategy.structure import StructureEstimator, StructureObject, Regime, Event, BoundaryLine

class SignalDirection(Enum):
    LONG = "long"
    SHORT = "short"

@dataclass
class TradingSignal:
    """Generated trading signal"""
    timestamp: pd.Timestamp
    bar_index: int
    direction: SignalDirection
    entry_price: float
    stop_loss: float
    take_profit_1: float

    q_score: float
    setup_grade: str  # 'A', 'B', 'C'
    d_geom: float
    rejection_score: int

    regime: Regime
    mss_aligned: bool

    is_valid: bool = True
    invalidation_reason: Optional[str] = None


class SignalGenerator:
    """
    Generates trading signals based on structure analysis.
    Implements the break-retest-rejection pattern.
    """

    def __init__(
        self,
        beta_p: float = 0.10,  # Break penetration
        beta_c: float = 0.15,  # Break confirmation
        gamma: float = 0.20,   # Retest buffer
        delta: float = 0.20,   # Fail buffer
        retest_window: int = 12,
        q_a_threshold: float = 0.70,
        q_b_threshold: float = 0.60,
        d_geom_max: float = 2.5,
        stop_buffer: float = 0.20,
    ):
        self.beta_p = beta_p
        self.beta_c = beta_c
        self.gamma = gamma
        self.delta = delta
        self.retest_window = retest_window
        self.q_a_threshold = q_a_threshold
        self.q_b_threshold = q_b_threshold
        self.d_geom_max = d_geom_max
        self.stop_buffer = stop_buffer

        # State machine
        self.state = "idle"  # idle, wait_retest_short, wait_retest_long
        self.break_bar: Optional[int] = None
        self.action_line: Optional[BoundaryLine] = None
        self.safety_line: Optional[BoundaryLine] = None
        self.break_direction: int = 0

    def _check_break(
        self,
        bar: pd.Series,
        structure: StructureObject,
        atr: float
    ) -> Optional[int]:
        """Check for break conditions. Returns direction (-1 short, +1 long, None no break)"""

        if structure.regime == Regime.RANGE:
            return None

        # Use past-only boundaries (from previous bar's estimation)
        if structure.support:
            support_prev = structure.support.value_at(structure.bar_index - 1)

            # Break down
            penetrate = bar['low'] < support_prev - self.beta_p * atr
            confirm = bar['close'] < support_prev - self.beta_c * atr

            if penetrate and confirm:
                return -1

        if structure.resistance:
            resist_prev = structure.resistance.value_at(structure.bar_index - 1)

            # Break up
            penetrate = bar['high'] > resist_prev + self.beta_p * atr
            confirm = bar['close'] > resist_prev + self.beta_c * atr

            if penetrate and confirm:
                return 1

        return None

    def _check_retest(
        self,
        bar: pd.Series,
        current_idx: int,
        atr: float
    ) -> bool:
        """Check if price is retesting the action line"""

        if self.action_line is None or self.break_bar is None:
            return False

        bars_since_break = current_idx - self.break_bar
        if bars_since_break > self.retest_window or bars_since_break <= 0:
            return False

        action_val = self.action_line.value_at(current_idx)
        return abs(bar['close'] - action_val) <= self.gamma * atr

    def _score_rejection(self, bar: pd.Series, direction: int) -> int:
        """Score rejection candle (0-4)"""

        score = 0
        body = abs(bar['close'] - bar['open'])
        upper_wick = bar['high'] - max(bar['close'], bar['open'])
        lower_wick = min(bar['close'], bar['open']) - bar['low']

        # CLV
        range_hl = bar['high'] - bar['low']
        if range_hl > 0:
            clv = (2 * bar['close'] - bar['high'] - bar['low']) / range_hl
            if direction == -1 and clv < -0.3:  # Short: close near low
                score += 1
            elif direction == 1 and clv > 0.3:  # Long: close near high
                score += 1

        # Wick/Body ratio
        if body > 0:
            if direction == -1 and upper_wick / body > 1.5:
                score += 1
            elif direction == 1 and lower_wick / body > 1.5:
                score += 1

        # Candle direction
        if direction == -1 and bar['close'] < bar['open']:
            score += 1
        elif direction == 1 and bar['close'] > bar['open']:
            score += 1

        # Position vs action line
        if self.action_line:
            action_val = self.action_line.value_at(int(bar.name) if hasattr(bar.name, '__int__') else 0)
            if direction == -1 and bar['close'] < action_val:
                score += 1
            elif direction == 1 and bar['close'] > action_val:
                score += 1

        return score

    def _check_failure(
        self,
        bar: pd.Series,
        current_idx: int,
        atr: float
    ) -> bool:
        """Check if break has failed"""

        if self.action_line is None:
            return False

        action_val = self.action_line.value_at(current_idx)

        if self.break_direction == -1:  # Short break
            return bar['close'] > action_val + self.delta * atr
        elif self.break_direction == 1:  # Long break
            return bar['close'] < action_val - self.delta * atr

        return False

    def process_bar(
        self,
        bar: pd.Series,
        structure: StructureObject,
        atr: float
    ) -> Optional[TradingSignal]:
        """Process a single bar and potentially generate a signal"""

        current_idx = structure.bar_index

        # State: IDLE - look for breaks
        if self.state == "idle":
            break_dir = self._check_break(bar, structure, atr)

            if break_dir == -1:
                self.state = "wait_retest_short"
                self.break_bar = current_idx
                self.break_direction = -1
                self.action_line = structure.support
                self.safety_line = structure.resistance

            elif break_dir == 1:
                self.state = "wait_retest_long"
                self.break_bar = current_idx
                self.break_direction = 1
                self.action_line = structure.resistance
                self.safety_line = structure.support

            return None

        # State: WAIT_RETEST - look for retest + rejection
        if self.state in ["wait_retest_short", "wait_retest_long"]:

            # Check timeout
            bars_since_break = current_idx - self.break_bar
            if bars_since_break > self.retest_window:
                self._reset_state()
                return None

            # Check failure
            if self._check_failure(bar, current_idx, atr):
                self._reset_state()
                return None

            # Check retest
            if self._check_retest(bar, current_idx, atr):

                direction = SignalDirection.SHORT if self.break_direction == -1 else SignalDirection.LONG
                rejection_score = self._score_rejection(bar, self.break_direction)

                # Require 3/4 rejection features
                if rejection_score >= 3:

                    # Calculate risk geometry
                    if self.safety_line:
                        safety_val = self.safety_line.value_at(current_idx)
                        d_geom = abs(bar['close'] - safety_val) / atr
                    else:
                        d_geom = 999.0

                    # Check risk geometry filter
                    if d_geom > self.d_geom_max:
                        self._reset_state()
                        return TradingSignal(
                            timestamp=structure.timestamp,
                            bar_index=current_idx,
                            direction=direction,
                            entry_price=bar['close'],
                            stop_loss=0,
                            take_profit_1=0,
                            q_score=0,
                            setup_grade='C',
                            d_geom=d_geom,
                            rejection_score=rejection_score,
                            regime=structure.regime,
                            mss_aligned=False,
                            is_valid=False,
                            invalidation_reason=f"d_geom {d_geom:.2f} > {self.d_geom_max}"
                        )

                    # Determine setup grade
                    q_score = structure.q_support if direction == SignalDirection.SHORT else structure.q_resistance
                    touches = structure.support.touches if direction == SignalDirection.SHORT and structure.support else \
                              structure.resistance.touches if direction == SignalDirection.LONG and structure.resistance else 0

                    if q_score >= self.q_a_threshold and touches >= 3:
                        setup_grade = 'A'
                    elif q_score >= self.q_b_threshold:
                        setup_grade = 'B'
                    else:
                        setup_grade = 'C'

                    # Skip C-grade setups
                    if setup_grade == 'C':
                        self._reset_state()
                        return None

                    # Calculate stop and target
                    entry_price = bar['close']
                    if direction == SignalDirection.SHORT:
                        stop_loss = safety_val + self.stop_buffer * atr if self.safety_line else entry_price + 2 * atr
                        take_profit_1 = entry_price - abs(entry_price - stop_loss)
                    else:
                        stop_loss = safety_val - self.stop_buffer * atr if self.safety_line else entry_price - 2 * atr
                        take_profit_1 = entry_price + abs(entry_price - stop_loss)

                    # Check MSS alignment
                    mss_aligned = (direction == SignalDirection.SHORT and structure.mss_bearish) or \
                                  (direction == SignalDirection.LONG and structure.mss_bullish)

                    # Generate signal
                    signal = TradingSignal(
                        timestamp=structure.timestamp,
                        bar_index=current_idx,
                        direction=direction,
                        entry_price=entry_price,
                        stop_loss=stop_loss,
                        take_profit_1=take_profit_1,
                        q_score=q_score,
                        setup_grade=setup_grade,
                        d_geom=d_geom,
                        rejection_score=rejection_score,
                        regime=structure.regime,
                        mss_aligned=mss_aligned,
                        is_valid=True
                    )

                    self._reset_state()
                    return signal

        return None

    def _reset_state(self):
        """Reset state machine to idle"""
        self.state = "idle"
        self.break_bar = None
        self.action_line = None
        self.safety_line = None
        self.break_direction = 0
```

---

## Phase 4: Backtesting Framework (Week 5-7)

### 4.1 Backtester Engine

Create `src/backtest/engine.py`:

```python
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from src.strategy.structure import StructureEstimator, StructureObject
from src.strategy.signals import SignalGenerator, TradingSignal, SignalDirection
from src.indicators.technical import TechnicalIndicators
import structlog

logger = structlog.get_logger()

@dataclass
class Position:
    """Represents an open position"""
    signal: TradingSignal
    entry_bar: int
    entry_price: float
    size: float
    direction: SignalDirection

    initial_stop: float
    current_stop: float

    be_triggered: bool = False
    tp1_triggered: bool = False
    partial_closed: float = 0.0

    max_favorable_excursion: float = 0.0
    max_adverse_excursion: float = 0.0

@dataclass
class TradeResult:
    """Result of a closed trade"""
    signal: TradingSignal
    entry_bar: int
    entry_price: float
    exit_bar: int
    exit_price: float
    exit_reason: str

    size: float
    pnl_absolute: float
    pnl_percent: float
    r_multiple: float

    mfe: float
    mae: float

    slippage: float = 0.0
    commission: float = 0.0

@dataclass
class BacktestConfig:
    """Backtesting configuration"""
    initial_capital: float = 10000.0
    risk_per_trade_a: float = 0.01  # 1% for A setups
    risk_per_trade_b: float = 0.005  # 0.5% for B setups

    commission_pct: float = 0.0005  # 0.05%
    slippage_pct: float = 0.0001    # 0.01%

    be_trigger_r: float = 0.8
    tp1_r: float = 1.0
    tp1_pct: float = 0.6  # Close 60% at TP1
    trail_start_r: float = 1.0
    trail_buffer_atr: float = 0.2
    time_stop_bars: int = 20
    time_stop_min_r: float = 0.5

    max_positions: int = 1
    max_daily_loss: float = 0.03  # 3%

@dataclass
class BacktestResult:
    """Complete backtest results"""
    trades: List[TradeResult]
    equity_curve: pd.Series

    # Summary metrics
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0

    total_pnl: float = 0.0
    total_pnl_pct: float = 0.0

    profit_factor: float = 0.0
    expectancy_r: float = 0.0

    max_drawdown: float = 0.0
    max_drawdown_pct: float = 0.0

    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0

    avg_win: float = 0.0
    avg_loss: float = 0.0
    avg_win_r: float = 0.0
    avg_loss_r: float = 0.0

    largest_win: float = 0.0
    largest_loss: float = 0.0

    avg_bars_in_trade: float = 0.0

    # By setup grade
    a_setup_stats: Dict = field(default_factory=dict)
    b_setup_stats: Dict = field(default_factory=dict)


class BacktestEngine:
    """
    Event-driven backtesting engine with realistic execution modeling.
    """

    def __init__(self, config: BacktestConfig):
        self.config = config
        self.structure_estimator = StructureEstimator()
        self.signal_generator = SignalGenerator()

    def run(
        self,
        data: pd.DataFrame,
        warmup_bars: int = 200
    ) -> BacktestResult:
        """
        Run backtest on historical data.

        Args:
            data: DataFrame with OHLCV columns and DatetimeIndex
            warmup_bars: Bars to skip for indicator warmup
        """

        logger.info(f"Starting backtest on {len(data)} bars")

        # Initialize state
        equity = self.config.initial_capital
        equity_curve = []
        trades: List[TradeResult] = []
        position: Optional[Position] = None
        daily_pnl = 0.0
        current_date = None

        # Pre-calculate ATR for the entire series
        atr_series = TechnicalIndicators.atr(data['high'], data['low'], data['close'])

        # Main loop
        for i in range(warmup_bars, len(data)):
            bar = data.iloc[i]
            atr = atr_series.iloc[i] if not pd.isna(atr_series.iloc[i]) else 1.0

            # Reset daily PnL on new day
            bar_date = bar.name.date() if hasattr(bar.name, 'date') else None
            if bar_date != current_date:
                daily_pnl = 0.0
                current_date = bar_date

            # Update structure
            structure = self.structure_estimator.update(data, i)

            # Manage existing position
            if position is not None:
                position, trade_result = self._manage_position(
                    position, bar, i, atr, data
                )

                if trade_result is not None:
                    trades.append(trade_result)
                    equity += trade_result.pnl_absolute
                    daily_pnl += trade_result.pnl_absolute
                    position = None

            # Check for new signals (if no position and not circuit-broken)
            if position is None and daily_pnl > -self.config.max_daily_loss * equity:
                signal = self.signal_generator.process_bar(bar, structure, atr)

                if signal is not None and signal.is_valid:
                    position = self._open_position(signal, bar, equity, atr)

            # Record equity
            mark_to_market = equity
            if position is not None:
                unrealized = self._calculate_unrealized(position, bar)
                mark_to_market += unrealized

            equity_curve.append({
                'timestamp': bar.name,
                'equity': mark_to_market,
                'position': 1 if position else 0
            })

        # Close any remaining position at end
        if position is not None:
            final_bar = data.iloc[-1]
            trade_result = self._close_position(
                position, final_bar, len(data) - 1, "end_of_data"
            )
            trades.append(trade_result)
            equity += trade_result.pnl_absolute

        # Calculate results
        equity_df = pd.DataFrame(equity_curve).set_index('timestamp')
        result = self._calculate_results(trades, equity_df)

        logger.info(f"Backtest complete: {result.total_trades} trades, "
                   f"PnL: {result.total_pnl_pct:.2%}, "
                   f"Win rate: {result.win_rate:.2%}")

        return result

    def _open_position(
        self,
        signal: TradingSignal,
        bar: pd.Series,
        equity: float,
        atr: float
    ) -> Position:
        """Open a new position"""

        # Apply slippage to entry
        slippage = bar['close'] * self.config.slippage_pct
        if signal.direction == SignalDirection.LONG:
            entry_price = bar['close'] + slippage
        else:
            entry_price = bar['close'] - slippage

        # Calculate position size
        risk_pct = self.config.risk_per_trade_a if signal.setup_grade == 'A' else self.config.risk_per_trade_b
        risk_amount = equity * risk_pct
        stop_distance = abs(entry_price - signal.stop_loss)

        if stop_distance > 0:
            size = risk_amount / stop_distance
        else:
            size = 0

        # Apply commission
        commission = size * entry_price * self.config.commission_pct

        return Position(
            signal=signal,
            entry_bar=signal.bar_index,
            entry_price=entry_price,
            size=size,
            direction=signal.direction,
            initial_stop=signal.stop_loss,
            current_stop=signal.stop_loss
        )

    def _manage_position(
        self,
        position: Position,
        bar: pd.Series,
        bar_idx: int,
        atr: float,
        data: pd.DataFrame
    ) -> Tuple[Optional[Position], Optional[TradeResult]]:
        """Manage existing position, return updated position and any trade result"""

        # Calculate current R-multiple
        if position.direction == SignalDirection.LONG:
            current_price = bar['close']
            r_value = position.entry_price - position.initial_stop
            current_r = (current_price - position.entry_price) / r_value if r_value != 0 else 0

            # Update MFE/MAE
            position.max_favorable_excursion = max(
                position.max_favorable_excursion,
                (bar['high'] - position.entry_price) / r_value if r_value != 0 else 0
            )
            position.max_adverse_excursion = max(
                position.max_adverse_excursion,
                (position.entry_price - bar['low']) / r_value if r_value != 0 else 0
            )

            # Check stop hit
            if bar['low'] <= position.current_stop:
                return None, self._close_position(position, bar, bar_idx, "stop", position.current_stop)

        else:  # SHORT
            current_price = bar['close']
            r_value = position.initial_stop - position.entry_price
            current_r = (position.entry_price - current_price) / r_value if r_value != 0 else 0

            # Update MFE/MAE
            position.max_favorable_excursion = max(
                position.max_favorable_excursion,
                (position.entry_price - bar['low']) / r_value if r_value != 0 else 0
            )
            position.max_adverse_excursion = max(
                position.max_adverse_excursion,
                (bar['high'] - position.entry_price) / r_value if r_value != 0 else 0
            )

            # Check stop hit
            if bar['high'] >= position.current_stop:
                return None, self._close_position(position, bar, bar_idx, "stop", position.current_stop)

        # Break-even trigger
        if current_r >= self.config.be_trigger_r and not position.be_triggered:
            position.be_triggered = True
            if position.direction == SignalDirection.LONG:
                position.current_stop = max(position.current_stop, position.entry_price + 0.05 * atr)
            else:
                position.current_stop = min(position.current_stop, position.entry_price - 0.05 * atr)

        # Partial take profit
        if current_r >= self.config.tp1_r and not position.tp1_triggered:
            position.tp1_triggered = True
            position.partial_closed = position.size * self.config.tp1_pct
            position.size -= position.partial_closed
            # Note: In real implementation, record partial close as separate trade

        # Pivot-based trailing (after trail start)
        if current_r >= self.config.trail_start_r:
            # Get recent pivots
            pivot_highs, pivot_lows = TechnicalIndicators.pivots(
                data['high'][:bar_idx+1],
                data['low'][:bar_idx+1]
            )

            if position.direction == SignalDirection.LONG:
                # Trail below last pivot low
                recent_pl = pivot_lows.dropna().tail(1)
                if len(recent_pl) > 0:
                    pivot_stop = recent_pl.iloc[-1] - self.config.trail_buffer_atr * atr
                    position.current_stop = max(position.current_stop, pivot_stop)
            else:
                # Trail above last pivot high
                recent_ph = pivot_highs.dropna().tail(1)
                if len(recent_ph) > 0:
                    pivot_stop = recent_ph.iloc[-1] + self.config.trail_buffer_atr * atr
                    position.current_stop = min(position.current_stop, pivot_stop)

        # Time stop
        bars_in_trade = bar_idx - position.entry_bar
        if bars_in_trade >= self.config.time_stop_bars and current_r < self.config.time_stop_min_r:
            return None, self._close_position(position, bar, bar_idx, "time_stop")

        return position, None

    def _close_position(
        self,
        position: Position,
        bar: pd.Series,
        bar_idx: int,
        reason: str,
        exit_price: Optional[float] = None
    ) -> TradeResult:
        """Close position and return trade result"""

        if exit_price is None:
            exit_price = bar['close']

        # Apply slippage
        slippage = exit_price * self.config.slippage_pct
        if position.direction == SignalDirection.LONG:
            exit_price -= slippage
        else:
            exit_price += slippage

        # Calculate PnL
        if position.direction == SignalDirection.LONG:
            pnl_per_unit = exit_price - position.entry_price
        else:
            pnl_per_unit = position.entry_price - exit_price

        pnl_absolute = pnl_per_unit * position.size
        pnl_percent = pnl_per_unit / position.entry_price

        # Calculate R-multiple
        r_value = abs(position.entry_price - position.initial_stop)
        r_multiple = pnl_per_unit / r_value if r_value != 0 else 0

        # Commission
        commission = position.size * exit_price * self.config.commission_pct
        pnl_absolute -= commission

        return TradeResult(
            signal=position.signal,
            entry_bar=position.entry_bar,
            entry_price=position.entry_price,
            exit_bar=bar_idx,
            exit_price=exit_price,
            exit_reason=reason,
            size=position.size,
            pnl_absolute=pnl_absolute,
            pnl_percent=pnl_percent,
            r_multiple=r_multiple,
            mfe=position.max_favorable_excursion,
            mae=position.max_adverse_excursion,
            slippage=slippage,
            commission=commission
        )

    def _calculate_unrealized(self, position: Position, bar: pd.Series) -> float:
        """Calculate unrealized PnL for mark-to-market"""
        if position.direction == SignalDirection.LONG:
            return (bar['close'] - position.entry_price) * position.size
        else:
            return (position.entry_price - bar['close']) * position.size

    def _calculate_results(
        self,
        trades: List[TradeResult],
        equity_df: pd.DataFrame
    ) -> BacktestResult:
        """Calculate comprehensive backtest statistics"""

        if not trades:
            return BacktestResult(trades=trades, equity_curve=equity_df['equity'])

        # Basic stats
        total_trades = len(trades)
        winners = [t for t in trades if t.pnl_absolute > 0]
        losers = [t for t in trades if t.pnl_absolute <= 0]

        winning_trades = len(winners)
        losing_trades = len(losers)
        win_rate = winning_trades / total_trades if total_trades > 0 else 0

        # PnL
        total_pnl = sum(t.pnl_absolute for t in trades)
        initial_equity = equity_df['equity'].iloc[0]
        total_pnl_pct = total_pnl / initial_equity

        # Profit factor
        gross_profit = sum(t.pnl_absolute for t in winners)
        gross_loss = abs(sum(t.pnl_absolute for t in losers))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

        # Expectancy
        avg_r = np.mean([t.r_multiple for t in trades])

        # Drawdown
        equity_series = equity_df['equity']
        rolling_max = equity_series.expanding().max()
        drawdown = equity_series - rolling_max
        max_drawdown = drawdown.min()
        max_drawdown_pct = max_drawdown / rolling_max[drawdown.idxmin()]

        # Sharpe ratio (assuming daily returns)
        returns = equity_series.pct_change().dropna()
        sharpe = returns.mean() / returns.std() * np.sqrt(252) if returns.std() > 0 else 0

        # Sortino ratio
        downside_returns = returns[returns < 0]
        sortino = returns.mean() / downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 and downside_returns.std() > 0 else 0

        # Average win/loss
        avg_win = np.mean([t.pnl_absolute for t in winners]) if winners else 0
        avg_loss = np.mean([t.pnl_absolute for t in losers]) if losers else 0
        avg_win_r = np.mean([t.r_multiple for t in winners]) if winners else 0
        avg_loss_r = np.mean([t.r_multiple for t in losers]) if losers else 0

        # Largest win/loss
        largest_win = max([t.pnl_absolute for t in winners]) if winners else 0
        largest_loss = min([t.pnl_absolute for t in losers]) if losers else 0

        # Average bars in trade
        avg_bars = np.mean([t.exit_bar - t.entry_bar for t in trades])

        # Stats by setup grade
        a_trades = [t for t in trades if t.signal.setup_grade == 'A']
        b_trades = [t for t in trades if t.signal.setup_grade == 'B']

        a_stats = {
            'count': len(a_trades),
            'win_rate': len([t for t in a_trades if t.pnl_absolute > 0]) / len(a_trades) if a_trades else 0,
            'avg_r': np.mean([t.r_multiple for t in a_trades]) if a_trades else 0
        }

        b_stats = {
            'count': len(b_trades),
            'win_rate': len([t for t in b_trades if t.pnl_absolute > 0]) / len(b_trades) if b_trades else 0,
            'avg_r': np.mean([t.r_multiple for t in b_trades]) if b_trades else 0
        }

        return BacktestResult(
            trades=trades,
            equity_curve=equity_series,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            total_pnl=total_pnl,
            total_pnl_pct=total_pnl_pct,
            profit_factor=profit_factor,
            expectancy_r=avg_r,
            max_drawdown=max_drawdown,
            max_drawdown_pct=max_drawdown_pct,
            sharpe_ratio=sharpe,
            sortino_ratio=sortino,
            avg_win=avg_win,
            avg_loss=avg_loss,
            avg_win_r=avg_win_r,
            avg_loss_r=avg_loss_r,
            largest_win=largest_win,
            largest_loss=largest_loss,
            avg_bars_in_trade=avg_bars,
            a_setup_stats=a_stats,
            b_setup_stats=b_stats
        )
```

### 4.2 Running a Backtest

Create `scripts/run_backtest.py`:

```python
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from src.data.fetcher import DataFetcher
from src.database.models import TimeframeEnum
from src.backtest.engine import BacktestEngine, BacktestConfig
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
    ]
)

async def main():
    # Fetch data
    fetcher = DataFetcher("binance")
    await fetcher.connect()

    try:
        # Get 2 years of 4H data
        data = await fetcher.fetch_historical(
            symbol="BTC/USDT",
            timeframe=TimeframeEnum.H4,
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2026, 1, 15)
        )

        # Set index
        data = data.set_index('timestamp')

        # Run backtest
        config = BacktestConfig(
            initial_capital=10000,
            risk_per_trade_a=0.01,
            risk_per_trade_b=0.005,
            commission_pct=0.0005,
            slippage_pct=0.0001
        )

        engine = BacktestEngine(config)
        result = engine.run(data, warmup_bars=250)

        # Print results
        print("\n" + "="*60)
        print("BACKTEST RESULTS")
        print("="*60)
        print(f"Total Trades:     {result.total_trades}")
        print(f"Win Rate:         {result.win_rate:.2%}")
        print(f"Profit Factor:    {result.profit_factor:.2f}")
        print(f"Expectancy (R):   {result.expectancy_r:.2f}")
        print(f"Total PnL:        ${result.total_pnl:,.2f} ({result.total_pnl_pct:.2%})")
        print(f"Max Drawdown:     {result.max_drawdown_pct:.2%}")
        print(f"Sharpe Ratio:     {result.sharpe_ratio:.2f}")
        print(f"Avg Bars/Trade:   {result.avg_bars_in_trade:.1f}")
        print("\nBy Setup Grade:")
        print(f"  A-Setups: {result.a_setup_stats['count']} trades, "
              f"{result.a_setup_stats['win_rate']:.2%} win rate, "
              f"{result.a_setup_stats['avg_r']:.2f}R avg")
        print(f"  B-Setups: {result.b_setup_stats['count']} trades, "
              f"{result.b_setup_stats['win_rate']:.2%} win rate, "
              f"{result.b_setup_stats['avg_r']:.2f}R avg")

    finally:
        await fetcher.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Phase 5: AI/ML Enhancement Layer (Week 7-9)

### 5.1 Q-Score Calibration

Create `src/ml/calibration.py`:

```python
import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss
from typing import Tuple, Dict
import joblib

class QScoreCalibrator:
    """
    Calibrates Q-scores to actual win probabilities using isotonic regression.
    """

    def __init__(self):
        self.calibrator = IsotonicRegression(out_of_bounds='clip')
        self.is_fitted = False

    def fit(self, q_scores: np.ndarray, outcomes: np.ndarray) -> Dict:
        """
        Fit calibrator on historical data.

        Args:
            q_scores: Array of Q-scores from signals
            outcomes: Binary array (1 = win, 0 = loss)

        Returns:
            Dictionary with calibration metrics
        """
        self.calibrator.fit(q_scores, outcomes)
        self.is_fitted = True

        # Calculate calibration metrics
        calibrated = self.predict(q_scores)
        brier = brier_score_loss(outcomes, calibrated)

        # Reliability curve
        fraction_positives, mean_predicted = calibration_curve(
            outcomes, calibrated, n_bins=10
        )

        return {
            'brier_score': brier,
            'fraction_positives': fraction_positives,
            'mean_predicted': mean_predicted
        }

    def predict(self, q_scores: np.ndarray) -> np.ndarray:
        """Convert Q-scores to calibrated probabilities"""
        if not self.is_fitted:
            raise ValueError("Calibrator not fitted")
        return self.calibrator.predict(q_scores)

    def save(self, path: str):
        """Save calibrator to disk"""
        joblib.dump(self.calibrator, path)

    def load(self, path: str):
        """Load calibrator from disk"""
        self.calibrator = joblib.load(path)
        self.is_fitted = True
```

### 5.2 Regime Classifier Enhancement

Create `src/ml/regime_classifier.py`:

```python
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from typing import List, Tuple
import optuna

class EnhancedRegimeClassifier:
    """
    ML-enhanced regime classification using gradient boosting.
    """

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []

    def extract_features(self, data: pd.DataFrame, idx: int) -> np.ndarray:
        """Extract features for regime classification"""

        features = []

        # Efficiency ratio at multiple lookbacks
        for lb in [50, 100, 150, 200]:
            if idx >= lb:
                net = abs(data['close'].iloc[idx] - data['close'].iloc[idx - lb])
                path = data['close'].iloc[idx-lb:idx+1].diff().abs().sum()
                er = net / path if path > 0 else 0
                features.append(er)
            else:
                features.append(0)

        # Volatility features
        if idx >= 20:
            returns = data['close'].iloc[idx-20:idx+1].pct_change()
            features.append(returns.std())
            features.append(returns.mean())
        else:
            features.extend([0, 0])

        # ATR ratio (current vs average)
        if idx >= 50:
            atr_current = self._calc_atr(data, idx, 14)
            atr_avg = self._calc_atr(data, idx, 50)
            features.append(atr_current / atr_avg if atr_avg > 0 else 1)
        else:
            features.append(1)

        # Price position relative to moving averages
        for ma_len in [20, 50, 100]:
            if idx >= ma_len:
                ma = data['close'].iloc[idx-ma_len:idx+1].mean()
                features.append((data['close'].iloc[idx] - ma) / ma)
            else:
                features.append(0)

        return np.array(features)

    def _calc_atr(self, data: pd.DataFrame, idx: int, period: int) -> float:
        """Calculate ATR at specific index"""
        if idx < period:
            return 0

        tr_sum = 0
        for i in range(idx - period + 1, idx + 1):
            tr = max(
                data['high'].iloc[i] - data['low'].iloc[i],
                abs(data['high'].iloc[i] - data['close'].iloc[i-1]),
                abs(data['low'].iloc[i] - data['close'].iloc[i-1])
            )
            tr_sum += tr

        return tr_sum / period

    def train(
        self,
        data: pd.DataFrame,
        labels: pd.Series,
        optimize: bool = True
    ) -> dict:
        """Train the regime classifier"""

        # Extract features for all labeled points
        X = []
        y = []

        for idx in labels.index:
            if idx >= 200:  # Need enough history
                features = self.extract_features(data, idx)
                X.append(features)
                y.append(labels[idx])

        X = np.array(X)
        y = np.array(y)

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        if optimize:
            # Hyperparameter optimization with Optuna
            def objective(trial):
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 50, 200),
                    'max_depth': trial.suggest_int('max_depth', 3, 8),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                    'subsample': trial.suggest_float('subsample', 0.6, 1.0)
                }

                model = GradientBoostingClassifier(**params, random_state=42)

                # Cross-validation score
                from sklearn.model_selection import cross_val_score
                scores = cross_val_score(model, X_scaled, y, cv=5, scoring='accuracy')
                return scores.mean()

            study = optuna.create_study(direction='maximize')
            study.optimize(objective, n_trials=50, show_progress_bar=True)

            best_params = study.best_params
        else:
            best_params = {
                'n_estimators': 100,
                'max_depth': 5,
                'learning_rate': 0.1,
                'subsample': 0.8
            }

        # Train final model
        self.model = GradientBoostingClassifier(**best_params, random_state=42)
        self.model.fit(X_scaled, y)

        return {
            'best_params': best_params,
            'train_accuracy': self.model.score(X_scaled, y)
        }

    def predict(self, data: pd.DataFrame, idx: int) -> Tuple[int, np.ndarray]:
        """Predict regime for a single bar"""
        features = self.extract_features(data, idx)
        features_scaled = self.scaler.transform(features.reshape(1, -1))

        prediction = self.model.predict(features_scaled)[0]
        probabilities = self.model.predict_proba(features_scaled)[0]

        return prediction, probabilities
```

---

## Phase 6: Monitoring & Paper Trading (Week 9-12)

### 6.1 Live Data Handler

Create `src/live/data_handler.py`:

```python
import asyncio
from typing import Callable, Dict, Optional
import ccxt.async_support as ccxt
import pandas as pd
from datetime import datetime
import structlog

logger = structlog.get_logger()

class LiveDataHandler:
    """Handles real-time data streaming for paper/live trading"""

    def __init__(self, exchange_id: str = "binance"):
        self.exchange_id = exchange_id
        self.exchange = None
        self.callbacks: Dict[str, Callable] = {}
        self.running = False

    async def connect(self):
        """Initialize exchange connection"""
        exchange_class = getattr(ccxt, self.exchange_id)
        self.exchange = exchange_class({
            'enableRateLimit': True,
            'options': {'defaultType': 'spot'}
        })
        await self.exchange.load_markets()
        logger.info(f"Connected to {self.exchange_id}")

    def on_bar(self, symbol: str, callback: Callable):
        """Register callback for new bar events"""
        self.callbacks[symbol] = callback

    async def start_streaming(self, symbol: str, timeframe: str):
        """Start streaming bars for a symbol"""
        self.running = True

        while self.running:
            try:
                # Fetch latest bar
                ohlcv = await self.exchange.fetch_ohlcv(
                    symbol, timeframe, limit=2
                )

                if ohlcv and len(ohlcv) >= 2:
                    latest_bar = ohlcv[-1]
                    bar_data = {
                        'timestamp': pd.Timestamp(latest_bar[0], unit='ms'),
                        'open': latest_bar[1],
                        'high': latest_bar[2],
                        'low': latest_bar[3],
                        'close': latest_bar[4],
                        'volume': latest_bar[5]
                    }

                    if symbol in self.callbacks:
                        await self.callbacks[symbol](bar_data)

                # Wait for next bar (simplified - should align to bar close)
                await asyncio.sleep(60)  # Poll every minute

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                await asyncio.sleep(5)

    async def stop(self):
        """Stop streaming"""
        self.running = False
        if self.exchange:
            await self.exchange.close()
```

### 6.2 Paper Trading Engine

Create `src/live/paper_trader.py`:

```python
import asyncio
from typing import Optional, Dict
from datetime import datetime
import pandas as pd
from src.strategy.structure import StructureEstimator
from src.strategy.signals import SignalGenerator, TradingSignal
from src.live.data_handler import LiveDataHandler
from src.indicators.technical import TechnicalIndicators
import structlog

logger = structlog.get_logger()

class PaperTrader:
    """Paper trading engine for strategy validation"""

    def __init__(
        self,
        symbol: str,
        timeframe: str,
        initial_capital: float = 10000.0
    ):
        self.symbol = symbol
        self.timeframe = timeframe
        self.capital = initial_capital

        self.data_handler = LiveDataHandler()
        self.structure_estimator = StructureEstimator()
        self.signal_generator = SignalGenerator()

        self.bars: pd.DataFrame = pd.DataFrame()
        self.position: Optional[Dict] = None
        self.trades: list = []

    async def initialize(self):
        """Initialize with historical data"""
        await self.data_handler.connect()

        # Fetch historical data for warmup
        from src.data.fetcher import DataFetcher
        from src.database.models import TimeframeEnum

        fetcher = DataFetcher()
        await fetcher.connect()

        tf_map = {'1h': TimeframeEnum.H1, '4h': TimeframeEnum.H4, '1d': TimeframeEnum.D1}

        historical = await fetcher.fetch_historical(
            self.symbol,
            tf_map.get(self.timeframe, TimeframeEnum.H4),
            datetime.now() - pd.Timedelta(days=365)
        )

        self.bars = historical.set_index('timestamp')
        await fetcher.disconnect()

        logger.info(f"Initialized with {len(self.bars)} historical bars")

    async def on_new_bar(self, bar_data: Dict):
        """Process new bar"""

        # Append to bars
        new_row = pd.DataFrame([bar_data]).set_index('timestamp')
        self.bars = pd.concat([self.bars, new_row])

        # Keep last N bars
        if len(self.bars) > 5000:
            self.bars = self.bars.iloc[-5000:]

        current_idx = len(self.bars) - 1
        bar = self.bars.iloc[-1]

        # Calculate ATR
        atr_series = TechnicalIndicators.atr(
            self.bars['high'], self.bars['low'], self.bars['close']
        )
        atr = atr_series.iloc[-1]

        # Update structure
        structure = self.structure_estimator.update(self.bars, current_idx)

        # Log current state
        logger.info(
            "Bar processed",
            timestamp=bar_data['timestamp'],
            close=bar['close'],
            regime=structure.regime.value,
            q_support=f"{structure.q_support:.2f}",
            q_resistance=f"{structure.q_resistance:.2f}"
        )

        # Manage position
        if self.position:
            self._manage_position(bar, atr)

        # Check for signals
        if not self.position:
            signal = self.signal_generator.process_bar(bar, structure, atr)

            if signal and signal.is_valid:
                self._open_position(signal, bar)

    def _open_position(self, signal: TradingSignal, bar: pd.Series):
        """Open paper position"""

        risk_pct = 0.01 if signal.setup_grade == 'A' else 0.005
        risk_amount = self.capital * risk_pct
        stop_distance = abs(signal.entry_price - signal.stop_loss)
        size = risk_amount / stop_distance if stop_distance > 0 else 0

        self.position = {
            'signal': signal,
            'entry_price': signal.entry_price,
            'size': size,
            'stop_loss': signal.stop_loss,
            'entry_time': bar.name
        }

        logger.info(
            "Position opened",
            direction=signal.direction.value,
            entry=signal.entry_price,
            stop=signal.stop_loss,
            size=size,
            grade=signal.setup_grade
        )

    def _manage_position(self, bar: pd.Series, atr: float):
        """Manage open position"""

        signal = self.position['signal']
        entry = self.position['entry_price']
        stop = self.position['stop_loss']

        # Check stop hit
        if signal.direction.value == 'long':
            if bar['low'] <= stop:
                self._close_position(stop, "stop_loss")
                return
        else:
            if bar['high'] >= stop:
                self._close_position(stop, "stop_loss")
                return

        # Update trailing stop (simplified)
        # ... (implement full trailing logic)

    def _close_position(self, exit_price: float, reason: str):
        """Close position"""

        signal = self.position['signal']
        entry = self.position['entry_price']
        size = self.position['size']

        if signal.direction.value == 'long':
            pnl = (exit_price - entry) * size
        else:
            pnl = (entry - exit_price) * size

        self.capital += pnl

        trade = {
            'entry_price': entry,
            'exit_price': exit_price,
            'pnl': pnl,
            'reason': reason,
            'direction': signal.direction.value
        }
        self.trades.append(trade)

        logger.info(
            "Position closed",
            exit_price=exit_price,
            pnl=f"${pnl:.2f}",
            reason=reason,
            capital=f"${self.capital:.2f}"
        )

        self.position = None

    async def run(self):
        """Start paper trading"""
        await self.initialize()

        self.data_handler.on_bar(self.symbol, self.on_new_bar)

        logger.info(f"Starting paper trading on {self.symbol} {self.timeframe}")

        await self.data_handler.start_streaming(self.symbol, self.timeframe)
```

---

## Technology Stack Summary

| Component            | Technology                    | Purpose                       |
| :------------------- | :---------------------------- | :---------------------------- |
| **Language**         | Python 3.11+                  | Core development              |
| **Database**         | TimescaleDB (PostgreSQL)      | Time-series data storage      |
| **Cache**            | Redis                         | Real-time state, pub/sub      |
| **Data Fetching**    | CCXT                          | Multi-exchange connectivity   |
| **Backtesting**      | Custom engine + VectorBT      | Strategy validation           |
| **ML/AI**            | Scikit-learn, XGBoost, Optuna | Model training & optimization |
| **Visualization**    | Plotly, Dash                  | Interactive dashboards        |
| **Monitoring**       | Prometheus, Grafana           | System metrics                |
| **Logging**          | Structlog                     | Structured logging            |
| **Containerization** | Docker, Docker Compose        | Deployment                    |

---

## File Structure

```
rg-trading-agent/
├── configs/
│   ├── settings.py
│   └── logging.py
├── src/
│   ├── __init__.py
│   ├── database/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   └── connection.py
│   ├── data/
│   │   ├── __init__.py
│   │   └── fetcher.py
│   ├── indicators/
│   │   ├── __init__.py
│   │   └── technical.py
│   ├── strategy/
│   │   ├── __init__.py
│   │   ├── structure.py
│   │   └── signals.py
│   ├── backtest/
│   │   ├── __init__.py
│   │   ├── engine.py
│   │   └── analysis.py
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── calibration.py
│   │   └── regime_classifier.py
│   └── live/
│       ├── __init__.py
│       ├── data_handler.py
│       └── paper_trader.py
├── scripts/
│   ├── run_backtest.py
│   ├── train_models.py
│   └── paper_trade.py
├── tests/
│   ├── test_indicators.py
│   ├── test_structure.py
│   └── test_backtest.py
├── notebooks/
│   └── analysis.ipynb
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Deployment Options

### Option 1: Local Development

```bash
docker-compose up -d
python scripts/run_backtest.py
```

### Option 2: Cloud Deployment (Railway/Render)

- Deploy TimescaleDB as managed service
- Deploy Python app as web service
- Use Redis Cloud for caching

### Option 3: VPS (DigitalOcean/Vultr)

- Single $20/month droplet
- Docker Compose for all services
- Nginx reverse proxy for dashboard

---

## Next Steps After Prototype

1. **Validation Phase (2-4 weeks)**
   - Run backtests across multiple assets
   - Validate Q-score calibration
   - Paper trade for 1 month minimum

2. **Optimization Phase (2-4 weeks)**
   - Parameter sensitivity analysis
   - Walk-forward optimization
   - Cross-asset robustness testing

3. **Production Phase (4-8 weeks)**
   - Implement live execution (start with small capital)
   - Add monitoring and alerting
   - Implement circuit breakers and kill switch

4. **Enhancement Phase (Ongoing)**
   - Add ML regime classifier
   - Implement multi-timeframe stack
   - Add portfolio-level risk management

---

_Document prepared by Manus AI. For educational purposes only. Always validate thoroughly before risking real capital._
