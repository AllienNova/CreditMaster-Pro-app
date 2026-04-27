# PART XI: OPERATIONAL REFERENCE & DAILY WORKFLOW

---

## Chapter 40: Daily PCTT Workflow (Pre-Market to Post-Market)

Trading is an operational discipline. A strategy with an 85% win rate becomes a 55% win rate if the operator skips steps, chases entries, or fails to review. This chapter defines the exact sequence of operations for running PCTT as a daily process, from first scan to final journal entry.

The workflow is structured as three phases: Pre-Market (before the session opens), Session Monitoring (while markets are live), and Post-Market Review (after the close). Each phase has a defined set of tasks, a recommended time allocation, and a Python implementation that an agent can execute without human intervention.

### 40.1 The Three-Phase Architecture

```python
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from enum import Enum
from typing import List, Dict, Optional, Tuple
import numpy as np


class SessionPhase(Enum):
    PRE_MARKET = "PRE_MARKET"
    SESSION_ACTIVE = "SESSION_ACTIVE"
    POST_MARKET = "POST_MARKET"


@dataclass
class InstrumentScanResult:
    symbol: str
    regime: str                    # TRENDING, MEAN_REVERTING, CHOPPY, VOLATILE
    macro_gate_pass: bool          # HTF alignment confirmed
    has_frozen_structure: bool     # Active frozen lines from prior breaks
    active_q_score: Optional[float]
    overnight_gap_pct: float       # Gap from prior close
    atr_current: float
    notes: str = ""


@dataclass
class PortfolioStatus:
    open_positions: int
    total_heat: float              # Sum of risk across open positions as pct of equity
    max_correlated: int            # Most correlated positions in any single cluster
    daily_pnl: float
    drawdown_from_peak: float
    scale_factor: float            # S(DD) drawdown scaling factor


class DailyPCTTWorkflow:
    """
    Complete daily operational workflow for PCTT.

    Timing guidance (US equities):
        Pre-Market:  06:30 - 09:25 ET  (~2h 55m)
        Session:     09:30 - 16:00 ET  (~6h 30m)
        Post-Market: 16:05 - 17:00 ET  (~55m)

    Timing guidance (Forex, 24h):
        Pre-Session: 30 min before preferred session open
        Session:     Full session (London, NY, or Asian)
        Post-Session: 15 min after session close

    Timing guidance (Crypto, 24h):
        Pre-Shift:   15 min before shift start
        Active:      8h shift (continuous rotation for 24h coverage)
        Post-Shift:  15 min after shift end

    Timing guidance (Futures):
        Pre-Market:  60 min before pit open or electronic session
        Session:     Full session per contract
        Post-Market: 30 min after close
    """

    def __init__(self, watchlist: List[str], equity: float, risk_params: dict):
        self.watchlist = watchlist
        self.equity = equity
        self.risk_params = risk_params
        self.scan_results: List[InstrumentScanResult] = []
        self.portfolio_status: Optional[PortfolioStatus] = None
        self.active_alerts: List[dict] = []
        self.trade_candidates: List[dict] = []
        self.phase = SessionPhase.PRE_MARKET

    # ----------------------------------------------------------------
    # PHASE 1: PRE-MARKET
    # ----------------------------------------------------------------

    def pre_market_scan(self, bars_data: Dict[str, np.ndarray]) -> dict:
        """
        Execute all 7 pre-market tasks. Run this 30-60 minutes before
        session open for equities, or at shift start for 24h markets.

        Returns a summary dict with actionable instruments and alerts.
        """
        results = {}

        # Task 1: Check overnight gaps on watchlist
        gap_report = self._check_overnight_gaps(bars_data)
        results["gaps"] = gap_report

        # Task 2: Run regime detection on all instruments
        regime_report = self._run_regime_detection(bars_data)
        results["regimes"] = regime_report

        # Task 3: Filter for instruments in TRENDING or VOLATILE regime
        tradeable = [
            r for r in regime_report
            if r["regime"] in ("TRENDING", "VOLATILE")
        ]
        results["tradeable_instruments"] = tradeable

        # Task 4: Check macro gate (HTF alignment) for each tradeable
        macro_results = self._check_macro_gates(tradeable, bars_data)
        results["macro_gate_results"] = macro_results

        # Task 5: Identify instruments with active frozen structures
        frozen = self._scan_frozen_structures(bars_data)
        results["frozen_structures"] = frozen

        # Task 6: Check portfolio heat and drawdown status
        self.portfolio_status = self._assess_portfolio_status()
        results["portfolio_status"] = self.portfolio_status

        # Task 7: Review yesterday's open positions
        position_review = self._review_open_positions()
        results["open_position_review"] = position_review

        # Build prioritized watchlist
        self.trade_candidates = self._prioritize_candidates(results)
        results["priority_watchlist"] = self.trade_candidates

        self.phase = SessionPhase.SESSION_ACTIVE
        return results

    def _check_overnight_gaps(self, bars_data: Dict[str, np.ndarray]) -> List[dict]:
        """
        For each symbol, compare current pre-market price to prior close.
        Flag gaps > 1 ATR as significant.
        Gaps > 2 ATR may invalidate existing frozen structures.
        """
        gap_report = []
        for symbol in self.watchlist:
            bars = bars_data.get(symbol)
            if bars is None or len(bars) < 2:
                continue
            prior_close = bars[-2]["close"]  # Yesterday's close
            current_open = bars[-1]["open"]  # Today's open (or pre-market)
            atr = self._compute_atr(bars, period=14)
            gap = current_open - prior_close
            gap_atr = abs(gap) / atr if atr > 0 else 0.0

            gap_report.append({
                "symbol": symbol,
                "gap_dollars": round(gap, 4),
                "gap_atr": round(gap_atr, 2),
                "gap_direction": "UP" if gap > 0 else "DOWN",
                "significant": gap_atr > 1.0,
                "structure_invalidating": gap_atr > 2.0,
            })
        return gap_report

    def _run_regime_detection(self, bars_data: Dict[str, np.ndarray]) -> List[dict]:
        """
        Run the 6-method ensemble regime detector on each instrument.
        Methods: Efficiency Ratio, Crossing Count, Hurst Exponent,
                 Kalman Slope, CUSUM, Fractal Dimension.
        Require 4/6 agreement for regime classification.
        """
        regime_results = []
        for symbol in self.watchlist:
            bars = bars_data.get(symbol)
            if bars is None:
                continue
            # Each method votes: TRENDING, MEAN_REVERTING, or CHOPPY
            votes = self._ensemble_regime_votes(bars)
            regime = self._majority_vote(votes, min_agreement=4)
            regime_results.append({
                "symbol": symbol,
                "regime": regime,
                "votes": votes,
                "confidence": sum(1 for v in votes.values() if v == regime) / 6,
            })
        return regime_results

    def _check_macro_gates(self, tradeable: List[dict],
                           bars_data: Dict[str, np.ndarray]) -> List[dict]:
        """
        For each tradeable instrument, check higher-timeframe alignment.
        Macro gate passes when HTF trend direction matches the setup direction.
        Uses Kalman-smoothed slope on the HTF bars.
        """
        macro_results = []
        for item in tradeable:
            symbol = item["symbol"]
            # Compare daily setup direction with weekly/4H trend
            htf_bias = self._get_htf_bias(symbol, bars_data)
            macro_results.append({
                "symbol": symbol,
                "htf_bias": htf_bias,  # BULLISH, BEARISH, or NEUTRAL
                "gate_pass": htf_bias != "NEUTRAL",
            })
        return macro_results

    def _scan_frozen_structures(self, bars_data: Dict[str, np.ndarray]) -> List[dict]:
        """
        Check which instruments have frozen Action/Safety lines from
        prior confirmed breaks. These are the highest-priority setups
        because they are already past Gate 7 in the cascading pipeline.
        """
        frozen = []
        for symbol in self.watchlist:
            # Check if a break was confirmed on a prior bar with
            # the retest window still open
            has_frozen = self._check_frozen_lines(symbol, bars_data)
            if has_frozen:
                frozen.append({
                    "symbol": symbol,
                    "frozen_since_bar": has_frozen["break_bar"],
                    "retest_bars_remaining": has_frozen["bars_remaining"],
                    "frozen_action_slope": has_frozen["action_slope"],
                    "frozen_safety_slope": has_frozen["safety_slope"],
                })
        return frozen

    def _assess_portfolio_status(self) -> PortfolioStatus:
        """
        Calculate current portfolio heat, drawdown, and scaling factor.
        If total heat >= 6%, no new positions until heat decreases.
        If drawdown > 20%, scale factor drops to 0 (trading halt).
        """
        # Placeholder: in production, read from broker API
        return PortfolioStatus(
            open_positions=0,
            total_heat=0.0,
            max_correlated=0,
            daily_pnl=0.0,
            drawdown_from_peak=0.0,
            scale_factor=1.0,
        )

    def _review_open_positions(self) -> List[dict]:
        """
        For each open position, check:
        - Current trailing stop phase
        - Distance to stop (in ATR)
        - Unrealized R-multiple
        - Whether fail-fast or stagnation conditions are now met
        """
        return []  # Populated from live position tracker

    def _prioritize_candidates(self, scan: dict) -> List[dict]:
        """
        Rank instruments by priority:
        1. Instruments with frozen structures AND retest forming (highest)
        2. Instruments in TRENDING regime with macro gate pass
        3. Instruments in VOLATILE regime with macro gate pass
        4. Everything else (do not trade)
        """
        priority_list = []
        frozen_symbols = {f["symbol"] for f in scan.get("frozen_structures", [])}
        macro_pass = {
            m["symbol"] for m in scan.get("macro_gate_results", [])
            if m["gate_pass"]
        }

        for item in scan.get("tradeable_instruments", []):
            symbol = item["symbol"]
            score = 0
            if symbol in frozen_symbols:
                score += 100
            if symbol in macro_pass:
                score += 50
            if item["regime"] == "TRENDING":
                score += 20
            elif item["regime"] == "VOLATILE":
                score += 10
            priority_list.append({"symbol": symbol, "priority_score": score})

        priority_list.sort(key=lambda x: x["priority_score"], reverse=True)
        return priority_list

    # ----------------------------------------------------------------
    # PHASE 2: SESSION MONITORING
    # ----------------------------------------------------------------

    def session_monitoring(self, current_bar: dict, symbol: str) -> dict:
        """
        Called on each new bar close during the active session.
        Executes the 7 real-time monitoring tasks.

        Returns actions dict: signals, alerts, and management commands.
        """
        actions = {"signals": [], "alerts": [], "management": []}

        # Task 1: Monitor for new pivots forming
        new_pivot = self._detect_new_pivot(current_bar, symbol)
        if new_pivot:
            actions["alerts"].append({
                "type": "NEW_PIVOT",
                "symbol": symbol,
                "pivot": new_pivot,
            })

        # Task 2: Check for break confirmations (2-stage)
        break_signal = self._check_break_confirmation(current_bar, symbol)
        if break_signal:
            actions["signals"].append({
                "type": "BREAK_CONFIRMED",
                "symbol": symbol,
                "break_data": break_signal,
            })
            # Immediately freeze the boundary lines
            self._freeze_lines(symbol, break_signal)

        # Task 3: Watch retest windows on active breaks
        retest = self._check_retest_window(current_bar, symbol)
        if retest:
            actions["alerts"].append({
                "type": "RETEST_DETECTED",
                "symbol": symbol,
                "retest_data": retest,
            })

        # Task 4: Score rejections in real-time (4-feature)
        if retest:
            rejection = self._score_rejection(current_bar, symbol)
            actions["alerts"].append({
                "type": "REJECTION_SCORED",
                "symbol": symbol,
                "score": rejection["score"],
                "features": rejection["features"],
            })

            # Task 5: Validate risk geometry before entry
            if rejection["score"] >= 3:
                geometry = self._validate_risk_geometry(current_bar, symbol)
                if geometry["pass"]:
                    actions["signals"].append({
                        "type": "ENTRY_SIGNAL",
                        "symbol": symbol,
                        "direction": geometry["direction"],
                        "d_geom": geometry["d_geom"],
                        "size": geometry["position_size"],
                        "stop": geometry["stop_price"],
                        "grade": geometry["grade"],
                    })

        # Task 6: Manage trailing stops (7-phase) for open positions
        trail_update = self._update_trailing_stops(current_bar, symbol)
        if trail_update:
            actions["management"].append(trail_update)

        # Task 7: Check fail-fast conditions
        fail_fast = self._check_fail_fast(current_bar, symbol)
        if fail_fast:
            actions["management"].append({
                "type": "FAIL_FAST_EXIT",
                "symbol": symbol,
                "reason": fail_fast["reason"],
            })

        return actions

    def _detect_new_pivot(self, bar: dict, symbol: str) -> Optional[dict]:
        """Adaptive zigzag pivot detection with ATR threshold."""
        return None  # Implemented in pivot-detection module

    def _check_break_confirmation(self, bar: dict, symbol: str) -> Optional[dict]:
        """
        Two-stage break:
        Stage 1 (Penetration): Close beyond Action Line + beta_p * ATR
        Stage 2 (Confirmation): Next bar closes beyond Action Line + beta_c * ATR
        """
        return None  # Implemented in break-detection module

    def _freeze_lines(self, symbol: str, break_data: dict) -> None:
        """Snapshot Action and Safety lines at break bar. Lock slopes."""
        pass  # Stores frozen line parameters for retest monitoring

    def _check_retest_window(self, bar: dict, symbol: str) -> Optional[dict]:
        """
        After confirmed break, watch for price to return within
        retest_tolerance * ATR of the frozen Action Line within
        retest_window bars (default 12).
        """
        return None

    def _score_rejection(self, bar: dict, symbol: str) -> dict:
        """
        4-feature rejection scorer:
        1. Wick/Body ratio >= 1.5 (tail rejection)
        2. CLV >= 0.6 (close in favorable half)
        3. Volume >= 1.5x 20-bar SMA (conviction)
        4. Close beyond Action Line in break direction (hold)
        Score = count of features present (0-4). Need >= 3 for entry.
        """
        return {"score": 0, "features": {}}

    def _validate_risk_geometry(self, bar: dict, symbol: str) -> dict:
        """
        Compute dGeom = |entry - Safety| / ATR.
        Pass if 0.5 <= dGeom <= 2.5.
        Compute position size, stop price, and R:R ratio.
        """
        return {"pass": False}

    def _update_trailing_stops(self, bar: dict, symbol: str) -> Optional[dict]:
        """Update trailing stop per the 7-phase system."""
        return None

    def _check_fail_fast(self, bar: dict, symbol: str) -> Optional[dict]:
        """
        Fail-fast triggers:
        - Close back through Safety Line
        - Regime shift to CHOPPY within first 5 bars
        - Volume collapse (< 0.5x SMA) in first 3 bars
        """
        return None

    # ----------------------------------------------------------------
    # PHASE 3: POST-MARKET REVIEW
    # ----------------------------------------------------------------

    def post_market_review(self, daily_trades: List[dict],
                           all_bars: Dict[str, np.ndarray]) -> dict:
        """
        Execute all 7 post-market tasks.
        Run within 1 hour of session close.

        Returns a review summary dict for journaling.
        """
        review = {}

        # Task 1: Log all trades with full pipeline data
        review["trade_log"] = self._log_trades(daily_trades)

        # Task 2: Calculate daily P&L and R-multiples
        review["daily_pnl"] = self._calculate_daily_pnl(daily_trades)
        review["r_multiples"] = [t.get("r_multiple", 0) for t in daily_trades]

        # Task 3: Update rolling performance metrics
        review["rolling_metrics"] = self._update_rolling_metrics(daily_trades)

        # Task 4: Check edge decay indicators
        review["edge_decay"] = self._check_edge_decay()

        # Task 5: Review missed setups (opportunity cost)
        review["missed_setups"] = self._scan_missed_setups(all_bars)

        # Task 6: Update correlation matrix
        review["correlation_update"] = self._update_correlations(all_bars)

        # Task 7: Prepare next-day watchlist
        review["next_day_watchlist"] = self._prepare_next_watchlist(all_bars)

        return review

    def _log_trades(self, trades: List[dict]) -> List[dict]:
        """
        For each trade, capture:
        - Full PCTTTradeRecord (see Chapter 42)
        - Screenshot/chart reference
        - Pipeline gate data (which gates passed and scores)
        """
        return trades

    def _calculate_daily_pnl(self, trades: List[dict]) -> dict:
        """
        Gross P&L, net P&L (after commissions/slippage), and R-total.
        R-total = sum of R-multiples for all closed trades today.
        """
        gross = sum(t.get("pnl", 0) for t in trades)
        r_total = sum(t.get("r_multiple", 0) for t in trades)
        return {"gross_pnl": gross, "r_total": round(r_total, 2)}

    def _update_rolling_metrics(self, trades: List[dict]) -> dict:
        """
        Update the rolling 20-trade window metrics:
        - Win rate, expectancy, profit factor
        - Average winner/loser ratio
        - Max consecutive wins/losses
        """
        return {}  # Updated in persistent storage

    def _check_edge_decay(self) -> dict:
        """
        Edge decay signals (any 2 of 3 triggers a review):
        1. Rolling 20-trade win rate drops below 65%
        2. Rolling expectancy drops below 0.3R
        3. Profit factor drops below 1.5
        """
        return {"decay_detected": False, "triggers": []}

    def _scan_missed_setups(self, bars: Dict[str, np.ndarray]) -> List[dict]:
        """
        Retroactively scan for setups that passed all 12 gates today
        but were not taken (due to heat limits, missed alerts, etc).
        """
        return []

    def _update_correlations(self, bars: Dict[str, np.ndarray]) -> dict:
        """
        Recompute rolling 20-day return correlations across all
        watchlist instruments. Flag pairs with |corr| > 0.70.
        """
        return {}

    def _prepare_next_watchlist(self, bars: Dict[str, np.ndarray]) -> List[str]:
        """
        Build tomorrow's watchlist:
        - Keep instruments with active frozen structures
        - Add instruments approaching potential break zones
        - Remove instruments that shifted to CHOPPY regime
        """
        return self.watchlist

    # ----------------------------------------------------------------
    # Utility methods
    # ----------------------------------------------------------------

    @staticmethod
    def _compute_atr(bars: np.ndarray, period: int = 14) -> float:
        """Standard ATR calculation."""
        if len(bars) < period + 1:
            return 0.0
        tr_values = []
        for i in range(-period, 0):
            high = bars[i]["high"]
            low = bars[i]["low"]
            prev_close = bars[i - 1]["close"]
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            tr_values.append(tr)
        return float(np.mean(tr_values))

    @staticmethod
    def _ensemble_regime_votes(bars: np.ndarray) -> Dict[str, str]:
        """Placeholder for 6-method ensemble. Returns dict of method: vote."""
        return {
            "efficiency_ratio": "TRENDING",
            "crossing_count": "TRENDING",
            "hurst": "TRENDING",
            "kalman_slope": "TRENDING",
            "cusum": "TRENDING",
            "fractal_dim": "TRENDING",
        }

    @staticmethod
    def _majority_vote(votes: Dict[str, str], min_agreement: int = 4) -> str:
        """Return the regime with >= min_agreement votes, else CHOPPY."""
        from collections import Counter
        counts = Counter(votes.values())
        top_regime, top_count = counts.most_common(1)[0]
        return top_regime if top_count >= min_agreement else "CHOPPY"

    def _get_htf_bias(self, symbol: str, bars: Dict[str, np.ndarray]) -> str:
        """Placeholder for higher-timeframe Kalman slope bias."""
        return "BULLISH"

    def _check_frozen_lines(self, symbol: str,
                            bars: Dict[str, np.ndarray]) -> Optional[dict]:
        """Placeholder for frozen line lookup."""
        return None
```

### 40.2 Timing Guidance by Instrument Class

| Instrument | Pre-Market Duration | Key Pre-Market Focus | Session Hours | Post-Market Duration |
|:-----------|:-------------------|:--------------------|:-------------|:--------------------|
| US Equities | 90 min (07:00-09:25 ET) | Gap analysis, pre-market volume, earnings calendar | 09:30-16:00 ET | 60 min |
| E-mini Futures | 60 min before pit open | Overnight globex range, settlement price gaps | 09:30-16:15 ET (RTH) | 30 min |
| Forex Majors | 30 min before session | Asian session range, macro news calendar | London or NY session (8h) | 15 min |
| Crypto (BTC/ETH) | 15 min before shift | 24h VWAP deviation, funding rates | 8h shift rotation | 15 min |
| Commodities | 45 min before open | Inventory reports, weather data, geopolitical scan | Per exchange hours | 30 min |

**Critical timing rules:**

1. Never enter trades in the first 15 minutes of the US equity session. The opening auction creates false pivots and unreliable volume signals.
2. Avoid the last 30 minutes of any session for new entries. Reduced liquidity widens spreads and distorts rejection candle quality.
3. For forex, the London-NY overlap (13:00-17:00 UTC) produces the highest-quality PCTT signals due to maximum liquidity and volatility.
4. For crypto, Sunday 20:00 UTC through Monday 08:00 UTC is the lowest-liquidity window. Widen retest tolerance by 1.5x during this period.

---

## Chapter 41: Position Management State Machine

Every PCTT position follows a deterministic lifecycle. There are exactly 7 states and 10 defined transitions. No position can exist outside this state machine. No transition can fire without its precondition being met.

### 41.1 State Definitions

```python
from enum import Enum, auto
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Callable


class PositionState(Enum):
    NO_POSITION = auto()      # Idle. Scanning for setups.
    SIGNAL_DETECTED = auto()  # All 12 gates passed. Entry signal generated.
    ENTRY_PENDING = auto()    # Order submitted, awaiting fill.
    POSITION_OPEN = auto()    # Filled. Initial stop placed. Trailing phase 1.
    TRAILING = auto()         # Position profitable. Trailing phases 2-6 active.
    PARTIAL_EXIT = auto()     # First partial taken (60% at 1R). Remainder trailing.
    FULL_EXIT = auto()        # Position fully closed. Logging and review.


@dataclass
class PositionContext:
    symbol: str
    direction: str                      # "LONG" or "SHORT"
    entry_price: float = 0.0
    entry_time: Optional[datetime] = None
    initial_stop: float = 0.0
    current_stop: float = 0.0
    position_size: float = 0.0
    remaining_size: float = 0.0
    grade: str = ""                     # "A" or "B"
    q_score: float = 0.0
    d_geom: float = 0.0
    rejection_score: int = 0
    trailing_phase: int = 1
    bars_in_trade: int = 0
    max_favorable: float = 0.0         # Best R-multiple reached
    r_multiple: float = 0.0
    partial_exits: List[dict] = field(default_factory=list)
    fail_fast_triggered: bool = False
    exit_price: float = 0.0
    exit_time: Optional[datetime] = None
    exit_reason: str = ""


class PositionManager:
    """
    Deterministic state machine for PCTT position lifecycle.

    States: NO_POSITION -> SIGNAL_DETECTED -> ENTRY_PENDING ->
            POSITION_OPEN -> TRAILING -> PARTIAL_EXIT -> FULL_EXIT

    All transitions are event-driven. No transition occurs without
    an explicit trigger event and validated precondition.
    """

    def __init__(self):
        self.state = PositionState.NO_POSITION
        self.context = PositionContext(symbol="", direction="")
        self.transition_log: List[dict] = []

    def process_event(self, event: str, data: dict) -> PositionState:
        """
        Central event dispatcher. Routes events to the correct
        transition handler based on current state.

        Valid events:
            ENTRY_SIGNAL      - 12-gate pipeline produces a trade signal
            ORDER_SUBMITTED   - Entry order sent to broker
            ORDER_FILLED      - Broker confirms fill
            ORDER_REJECTED    - Broker rejects order
            ORDER_EXPIRED     - Limit order expires unfilled
            STOP_HIT          - Stop loss triggered
            PARTIAL_TARGET    - Price reaches 1R target
            TRAIL_ADVANCE     - Trailing stop phase advances
            FAIL_FAST         - Fail-fast condition detected
            MANUAL_EXIT       - Operator or circuit breaker forces exit
        """
        handler = self._get_handler(event)
        if handler is None:
            return self.state  # Event not valid in current state

        old_state = self.state
        new_state = handler(data)
        self.state = new_state

        self._log_transition(old_state, new_state, event, data)
        return new_state

    def _get_handler(self, event: str) -> Optional[Callable]:
        """
        Transition table. Maps (current_state, event) -> handler.
        Returns None if the event is not valid in the current state.
        """
        table = {
            # From NO_POSITION
            (PositionState.NO_POSITION, "ENTRY_SIGNAL"):
                self._handle_entry_signal,

            # From SIGNAL_DETECTED
            (PositionState.SIGNAL_DETECTED, "ORDER_SUBMITTED"):
                self._handle_order_submitted,
            (PositionState.SIGNAL_DETECTED, "MANUAL_EXIT"):
                self._handle_cancel_signal,

            # From ENTRY_PENDING
            (PositionState.ENTRY_PENDING, "ORDER_FILLED"):
                self._handle_order_filled,
            (PositionState.ENTRY_PENDING, "ORDER_REJECTED"):
                self._handle_order_failed,
            (PositionState.ENTRY_PENDING, "ORDER_EXPIRED"):
                self._handle_order_failed,

            # From POSITION_OPEN
            (PositionState.POSITION_OPEN, "STOP_HIT"):
                self._handle_stop_hit,
            (PositionState.POSITION_OPEN, "FAIL_FAST"):
                self._handle_fail_fast,
            (PositionState.POSITION_OPEN, "TRAIL_ADVANCE"):
                self._handle_trail_advance,
            (PositionState.POSITION_OPEN, "PARTIAL_TARGET"):
                self._handle_partial_target,
            (PositionState.POSITION_OPEN, "MANUAL_EXIT"):
                self._handle_manual_exit,

            # From TRAILING
            (PositionState.TRAILING, "STOP_HIT"):
                self._handle_stop_hit,
            (PositionState.TRAILING, "PARTIAL_TARGET"):
                self._handle_partial_target,
            (PositionState.TRAILING, "TRAIL_ADVANCE"):
                self._handle_trail_advance,
            (PositionState.TRAILING, "FAIL_FAST"):
                self._handle_fail_fast,
            (PositionState.TRAILING, "MANUAL_EXIT"):
                self._handle_manual_exit,

            # From PARTIAL_EXIT
            (PositionState.PARTIAL_EXIT, "STOP_HIT"):
                self._handle_stop_hit,
            (PositionState.PARTIAL_EXIT, "TRAIL_ADVANCE"):
                self._handle_trail_advance,
            (PositionState.PARTIAL_EXIT, "MANUAL_EXIT"):
                self._handle_manual_exit,

            # From FULL_EXIT
            (PositionState.FULL_EXIT, "ENTRY_SIGNAL"):
                self._handle_entry_signal,
        }
        return table.get((self.state, event))

    # ----------------------------------------------------------------
    # Transition handlers
    # ----------------------------------------------------------------

    def _handle_entry_signal(self, data: dict) -> PositionState:
        """
        Precondition: All 12 cascading gates passed.
        Action: Populate context with signal data.
        """
        self.context = PositionContext(
            symbol=data["symbol"],
            direction=data["direction"],
            grade=data["grade"],
            q_score=data["q_score"],
            d_geom=data["d_geom"],
            rejection_score=data["rejection_score"],
        )
        return PositionState.SIGNAL_DETECTED

    def _handle_order_submitted(self, data: dict) -> PositionState:
        """
        Precondition: Signal detected, portfolio heat check passed.
        Action: Record order ID, set limit price.
        """
        self.context.entry_price = data["limit_price"]
        self.context.position_size = data["size"]
        self.context.remaining_size = data["size"]
        return PositionState.ENTRY_PENDING

    def _handle_order_filled(self, data: dict) -> PositionState:
        """
        Precondition: Broker confirms fill.
        Action: Set initial stop at Safety Line + buffer.
                Start trailing phase 1 (initial hold).
                Record fill time and actual fill price.
        """
        self.context.entry_price = data["fill_price"]
        self.context.entry_time = data["fill_time"]
        self.context.initial_stop = data["stop_price"]
        self.context.current_stop = data["stop_price"]
        self.context.trailing_phase = 1
        self.context.bars_in_trade = 0
        return PositionState.POSITION_OPEN

    def _handle_order_failed(self, data: dict) -> PositionState:
        """
        Precondition: Order rejected or expired.
        Action: Clear context, return to idle.
        One-break-one-trade rule: this frozen structure is now consumed.
        Do NOT re-enter on the same break event.
        """
        self.context.exit_reason = data.get("reason", "ORDER_FAILED")
        return PositionState.NO_POSITION

    def _handle_trail_advance(self, data: dict) -> PositionState:
        """
        Precondition: Trailing stop phase criteria met.
        Action: Update stop level, advance phase counter.

        Phase transitions:
            Phase 1 -> 2: Price reaches 0.8R (move stop to breakeven)
            Phase 2 -> 3: Price reaches 1.0R (partial exit trigger zone)
            Phase 3 -> 4: Post-partial, trail by prior pivots
            Phase 4 -> 5: Time stop check (20 bars with no new high)
            Phase 5 -> 6: Momentum tightening (ATR percentile > 75)
            Phase 6 -> 7: Final trailing, tightest stop
        """
        new_phase = data["new_phase"]
        new_stop = data["new_stop"]
        self.context.trailing_phase = new_phase
        self.context.current_stop = new_stop
        if new_phase >= 2:
            return PositionState.TRAILING
        return self.state

    def _handle_partial_target(self, data: dict) -> PositionState:
        """
        Precondition: Price reaches 1R target.
        Action: Exit 60% of position at market.
                Move stop to breakeven on remainder.
                Log partial exit.
        """
        partial_pct = 0.60
        partial_size = self.context.position_size * partial_pct
        self.context.remaining_size = self.context.position_size - partial_size
        self.context.partial_exits.append({
            "time": data["time"],
            "price": data["price"],
            "size": partial_size,
            "pct": partial_pct,
            "r_at_exit": 1.0,
        })
        # Move stop to breakeven for remainder
        self.context.current_stop = self.context.entry_price
        return PositionState.PARTIAL_EXIT

    def _handle_stop_hit(self, data: dict) -> PositionState:
        """
        Precondition: Price touches current stop level.
        Action: Exit all remaining shares at stop price.
                Calculate final R-multiple.
                Transition to FULL_EXIT for logging.
        """
        self.context.exit_price = data["stop_price"]
        self.context.exit_time = data["time"]
        self.context.exit_reason = "STOP_HIT"
        self.context.r_multiple = self._calculate_r_multiple()
        return PositionState.FULL_EXIT

    def _handle_fail_fast(self, data: dict) -> PositionState:
        """
        Precondition: Fail-fast condition detected.
        Conditions:
            - Close back through Safety Line
            - Regime shifts to CHOPPY within 5 bars
            - Volume collapse (< 0.5x SMA) in first 3 bars
        Action: Market exit on all remaining shares.
        """
        self.context.exit_price = data["current_price"]
        self.context.exit_time = data["time"]
        self.context.exit_reason = f"FAIL_FAST: {data['reason']}"
        self.context.fail_fast_triggered = True
        self.context.r_multiple = self._calculate_r_multiple()
        return PositionState.FULL_EXIT

    def _handle_manual_exit(self, data: dict) -> PositionState:
        """
        Precondition: Operator decision or circuit breaker trigger.
        Action: Market exit on all remaining shares.
        """
        self.context.exit_price = data["current_price"]
        self.context.exit_time = data["time"]
        self.context.exit_reason = data.get("reason", "MANUAL_EXIT")
        self.context.r_multiple = self._calculate_r_multiple()
        return PositionState.FULL_EXIT

    def _handle_cancel_signal(self, data: dict) -> PositionState:
        """Cancel a detected signal before order submission."""
        self.context.exit_reason = "SIGNAL_CANCELLED"
        return PositionState.NO_POSITION

    # ----------------------------------------------------------------
    # Helpers
    # ----------------------------------------------------------------

    def _calculate_r_multiple(self) -> float:
        """
        R = (exit_price - entry_price) / (entry_price - initial_stop)
        For shorts, negate both numerator and denominator.
        """
        risk = abs(self.context.entry_price - self.context.initial_stop)
        if risk == 0:
            return 0.0
        if self.context.direction == "LONG":
            reward = self.context.exit_price - self.context.entry_price
        else:
            reward = self.context.entry_price - self.context.exit_price
        return round(reward / risk, 2)

    def _log_transition(self, old: PositionState, new: PositionState,
                        event: str, data: dict) -> None:
        """Record every state transition for audit trail."""
        self.transition_log.append({
            "timestamp": datetime.now().isoformat(),
            "from_state": old.name,
            "to_state": new.name,
            "event": event,
            "data_summary": {k: str(v)[:100] for k, v in data.items()},
        })
```

### 41.2 State Transition Diagram (Text Format)

```
                         ENTRY_SIGNAL
    NO_POSITION ──────────────────────────> SIGNAL_DETECTED
        ^                                       |
        |  ORDER_FAILED                         | ORDER_SUBMITTED
        |  SIGNAL_CANCELLED                     v
        +──────────────────────────────── ENTRY_PENDING
        |                                       |
        |                                       | ORDER_FILLED
        |                                       v
        |                               POSITION_OPEN
        |                              /     |      \
        |                  STOP_HIT   / TRAIL |       \ FAIL_FAST
        |                            /  ADVANCE        \
        |                           v       v           v
        |                     FULL_EXIT  TRAILING   FULL_EXIT
        |                        |      /    |   \      |
        |                        | STOP/  PARTIAL \FAIL |
        |                        |  HIT   TARGET   FAST |
        |                        v    v     v       v   v
        |                     FULL_EXIT  PARTIAL_EXIT  FULL_EXIT
        |                                   |
        |                          STOP_HIT | MANUAL_EXIT
        |                                   v
        +──────────────────────────── FULL_EXIT
                  (after logging)
```

### 41.3 Critical Rules

1. **One-Break-One-Trade.** Once a frozen structure produces an entry (filled or failed), that structure is consumed. The system must detect a new break to generate a new signal. This prevents re-entry chasing on the same setup.

2. **No state skipping.** Every position must pass through SIGNAL_DETECTED and ENTRY_PENDING before becoming POSITION_OPEN. There are no "market order on signal" shortcuts that bypass the pending state.

3. **Partial exit is mandatory at 1R.** The transition from POSITION_OPEN or TRAILING to PARTIAL_EXIT fires automatically when price reaches 1R. This is not optional. The 60/40 split (exit 60%, trail 40%) is a fixed rule.

4. **FULL_EXIT always transitions to logging.** No position can close without producing a complete PCTTTradeRecord (Chapter 42). The state machine enforces this by requiring the FULL_EXIT state to persist until the record is written.

5. **Fail-fast overrides trailing.** If a fail-fast condition is detected, the position exits immediately regardless of trailing phase, unrealized profit, or any other factor.

---

## Chapter 42: Journal & Performance Tracking

The trade journal is the feedback loop that makes PCTT self-correcting. Without it, the system degrades into discretionary guessing within 3 months. Every trade must produce a complete record. Every week must produce an aggregate review. Every month must produce an edge decay analysis.

### 42.1 The PCTTTradeRecord

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Tuple, Optional


@dataclass
class PCTTTradeRecord:
    """
    Complete record for a single PCTT trade.
    Every field is mandatory. No partial records allowed.
    """

    # ---- Entry Fields ----
    trade_id: str                   # Unique ID: "{symbol}_{timestamp_ms}"
    entry_time: datetime            # Fill timestamp (UTC)
    entry_price: float              # Actual fill price
    direction: str                  # "LONG" or "SHORT"
    instrument: str                 # Symbol/ticker
    timeframe: str                  # "5m", "15m", "1h", "4h", "D"
    q_score: float                  # Quality score of boundary [0.0, 1.0]
    rejection_score: int            # 0-4 (count of rejection features)
    regime: str                     # TRENDING, VOLATILE, MEAN_REVERTING, CHOPPY
    d_geom: float                   # Risk geometry metric (ATR units)
    grade: str                      # "A" (q >= 0.70) or "B" (q >= 0.55)
    position_size: float            # Shares or contracts
    risk_per_share: float           # |entry - initial_stop|
    initial_stop: float             # Stop price at entry
    action_line_value: float        # Frozen Action Line at entry bar
    safety_line_value: float        # Frozen Safety Line at entry bar
    action_slope: float             # Slope of frozen Action Line (price/bar)
    safety_slope: float             # Slope of frozen Safety Line (price/bar)

    # ---- Management Fields ----
    trailing_phases: List[Tuple[int, datetime, float]] = field(default_factory=list)
        # [(phase_number, transition_time, new_stop_level), ...]
    partial_exits: List[Tuple[datetime, float, float]] = field(default_factory=list)
        # [(exit_time, pct_exited, exit_price), ...]
    fail_fast_triggered: bool = False
    fail_fast_reason: str = ""
    max_favorable_excursion: float = 0.0   # Best R reached during trade
    max_adverse_excursion: float = 0.0     # Worst R reached during trade
    bars_at_max_favorable: int = 0         # How many bars to reach best R

    # ---- Exit Fields ----
    exit_time: datetime = None
    exit_price: float = 0.0
    exit_reason: str = ""
        # STOP_HIT, PARTIAL_TARGET, FAIL_FAST, MANUAL_EXIT,
        # TIME_STOP, STAGNATION, CIRCUIT_BREAKER
    r_multiple: float = 0.0                # Final R outcome
    duration_bars: int = 0                 # Total bars from entry to final exit
    realized_pnl: float = 0.0             # Dollar P&L after commissions
    commission_total: float = 0.0

    # ---- Context Fields ----
    macro_gate_result: str = ""            # BULLISH, BEARISH, NEUTRAL
    confluence_score: float = 0.0          # Multi-TF alignment score
    entry_regime: str = ""                 # Regime at entry
    exit_regime: str = ""                  # Regime at exit
    regime_changed: bool = False           # Did regime shift during trade?
    atr_at_entry: float = 0.0
    atr_at_exit: float = 0.0
    volume_ratio_at_entry: float = 0.0     # Volume / 20-bar SMA at entry
    break_bar_index: int = 0               # Bar index of the confirmed break
    retest_bar_index: int = 0              # Bar index of the retest
    rejection_bar_index: int = 0           # Bar index of the rejection candle

    def to_dict(self) -> dict:
        """Serialize for JSON storage."""
        import json
        result = {}
        for k, v in self.__dict__.items():
            if isinstance(v, datetime):
                result[k] = v.isoformat() if v else None
            elif isinstance(v, list):
                result[k] = [
                    [x.isoformat() if isinstance(x, datetime) else x for x in item]
                    if isinstance(item, (list, tuple)) else item
                    for item in v
                ]
            else:
                result[k] = v
        return result
```

### 42.2 Performance Metrics Engine

```python
from typing import List
import numpy as np


class PerformanceTracker:
    """
    Rolling and cumulative performance metrics for PCTT.
    Operates on a list of completed PCTTTradeRecord objects.
    """

    def __init__(self, records: List[PCTTTradeRecord]):
        self.records = records
        self.r_multiples = np.array([r.r_multiple for r in records])

    def rolling_metrics(self, window: int = 20) -> dict:
        """
        Compute rolling metrics over the last `window` trades.
        Default window: 20 trades (not 20 days).
        """
        if len(self.r_multiples) < window:
            recent = self.r_multiples
        else:
            recent = self.r_multiples[-window:]

        wins = recent[recent > 0]
        losses = recent[recent <= 0]

        win_rate = len(wins) / len(recent) if len(recent) > 0 else 0.0
        avg_win = float(np.mean(wins)) if len(wins) > 0 else 0.0
        avg_loss = float(np.mean(losses)) if len(losses) > 0 else 0.0
        expectancy = win_rate * avg_win + (1 - win_rate) * avg_loss

        gross_profit = float(np.sum(wins)) if len(wins) > 0 else 0.0
        gross_loss = float(np.abs(np.sum(losses))) if len(losses) > 0 else 0.001
        profit_factor = gross_profit / gross_loss

        return {
            "window": window,
            "trade_count": len(recent),
            "win_rate": round(win_rate, 4),
            "avg_winner_r": round(avg_win, 2),
            "avg_loser_r": round(avg_loss, 2),
            "expectancy_r": round(expectancy, 3),
            "profit_factor": round(profit_factor, 2),
        }

    def consecutive_stats(self) -> dict:
        """Max consecutive wins and losses."""
        max_wins = 0
        max_losses = 0
        current_wins = 0
        current_losses = 0

        for r in self.r_multiples:
            if r > 0:
                current_wins += 1
                current_losses = 0
                max_wins = max(max_wins, current_wins)
            else:
                current_losses += 1
                current_wins = 0
                max_losses = max(max_losses, current_losses)

        return {
            "max_consecutive_wins": max_wins,
            "max_consecutive_losses": max_losses,
        }

    def recovery_factor(self) -> float:
        """
        Recovery Factor = Total Net Profit / Max Drawdown.
        Higher is better. Values > 3.0 indicate robust recovery.
        """
        equity_curve = np.cumsum(self.r_multiples)
        if len(equity_curve) == 0:
            return 0.0
        running_max = np.maximum.accumulate(equity_curve)
        drawdowns = running_max - equity_curve
        max_dd = float(np.max(drawdowns)) if len(drawdowns) > 0 else 0.001
        total_profit = float(equity_curve[-1])
        return round(total_profit / max_dd, 2) if max_dd > 0 else 0.0

    def r_distribution(self, bins: int = 20) -> dict:
        """
        Histogram of R-multiples for distribution analysis.
        Returns bin edges and counts for plotting.
        """
        if len(self.r_multiples) == 0:
            return {"bins": [], "counts": []}
        counts, edges = np.histogram(self.r_multiples, bins=bins)
        return {
            "bin_edges": [round(float(e), 2) for e in edges],
            "counts": [int(c) for c in counts],
            "median_r": round(float(np.median(self.r_multiples)), 2),
            "mean_r": round(float(np.mean(self.r_multiples)), 2),
            "std_r": round(float(np.std(self.r_multiples)), 2),
        }

    def grade_comparison(self) -> dict:
        """
        Compare A-Grade vs B-Grade performance.
        This reveals whether the quality filter is working.
        """
        a_records = [r for r in self.records if r.grade == "A"]
        b_records = [r for r in self.records if r.grade == "B"]

        def _stats(recs):
            if not recs:
                return {"count": 0, "win_rate": 0, "avg_r": 0, "expectancy": 0}
            rs = np.array([r.r_multiple for r in recs])
            wins = rs[rs > 0]
            wr = len(wins) / len(rs)
            return {
                "count": len(recs),
                "win_rate": round(wr, 4),
                "avg_r": round(float(np.mean(rs)), 2),
                "expectancy": round(float(np.mean(rs)), 3),
            }

        return {
            "a_grade": _stats(a_records),
            "b_grade": _stats(b_records),
        }

    def regime_conditional(self) -> dict:
        """
        Performance broken down by entry regime.
        Shows which regimes produce the best outcomes.
        """
        from collections import defaultdict
        by_regime = defaultdict(list)
        for r in self.records:
            by_regime[r.entry_regime].append(r.r_multiple)

        result = {}
        for regime, rs in by_regime.items():
            arr = np.array(rs)
            wins = arr[arr > 0]
            result[regime] = {
                "count": len(rs),
                "win_rate": round(len(wins) / len(rs), 4) if rs else 0,
                "avg_r": round(float(np.mean(arr)), 2),
                "total_r": round(float(np.sum(arr)), 2),
            }
        return result

    def edge_decay_check(self) -> dict:
        """
        Check for edge decay using 3 indicators.
        If 2 of 3 are triggered, recommend parameter review.

        Thresholds:
            1. Rolling 20-trade win rate < 65%
            2. Rolling 20-trade expectancy < 0.3R
            3. Rolling 20-trade profit factor < 1.5
        """
        metrics = self.rolling_metrics(window=20)
        triggers = []

        if metrics["win_rate"] < 0.65:
            triggers.append(f"Win rate {metrics['win_rate']:.1%} < 65%")
        if metrics["expectancy_r"] < 0.3:
            triggers.append(f"Expectancy {metrics['expectancy_r']:.2f}R < 0.3R")
        if metrics["profit_factor"] < 1.5:
            triggers.append(f"Profit factor {metrics['profit_factor']:.1f} < 1.5")

        return {
            "decay_detected": len(triggers) >= 2,
            "triggers": triggers,
            "recommendation": (
                "PAUSE TRADING. Run walk-forward re-optimization."
                if len(triggers) >= 2
                else "Edge intact. Continue trading."
            ),
        }
```

### 42.3 Weekly and Monthly Review Cadence

**Weekly review (every Friday post-market or Sunday pre-market):**

1. Calculate the rolling 20-trade metrics. Compare to prior week.
2. Run the edge decay check. If 2/3 triggers fire, halt live trading and switch to paper until resolved.
3. Review the R-distribution histogram. Look for fat left tails (large losers) or thin right tails (cutting winners short).
4. Compare A-Grade vs B-Grade performance. If B-Grade expectancy is negative, temporarily restrict to A-Grade only.
5. Check regime-conditional performance. If a regime shows negative expectancy over 10+ trades, add it to the regime blacklist.

**Monthly review (first weekend of each month):**

1. Full equity curve analysis. Calculate recovery factor and Sharpe ratio (annualized R per unit of R-std).
2. Walk-forward validation: re-run the backtest on the most recent 3 months of out-of-sample data. Compare to in-sample expectations.
3. Parameter sensitivity check: perturb each parameter by +/- 10% and check if performance degrades by more than 15%. If it does, the parameter is fragile. Widen the acceptable range or switch to a more robust default.
4. Correlation analysis: check if any instrument pairs in the portfolio have developed correlations above 0.70 that were below 0.50 at the start of the month. Update the correlation matrix.
5. Update the PCTT parameter file if any adjustments are warranted. Document the change, the evidence, and the expected impact.

---

---

# APPENDICES

---

## Appendix A: Complete Default Parameter Table

This table contains every tunable parameter in the PCTT pipeline. Parameters are organized by pipeline stage. All distance-based parameters are expressed in ATR multiples unless otherwise noted. All ratio parameters are dimensionless.

### A.1 Pivot Detection

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| pivot_left_bars | 5 | [3, 10] | bars | Left lookback for swing detection |
| pivot_right_bars | 5 | [3, 10] | bars | Right confirmation for swing detection |
| atr_period | 14 | [10, 20] | bars | ATR calculation period |
| zigzag_atr_threshold | 1.0 | [0.5, 2.0] | ATR multiples | Minimum swing size to register as pivot |

### A.2 Boundary Estimation

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| min_touches | 3 | [2, 5] | count | Minimum pivot touches to form a valid boundary |
| touch_tolerance | 0.5 | [0.3, 1.0] | ATR multiples | Maximum distance from line to count as a touch |
| huber_delta | 1.35 | [1.0, 2.0] | dimensionless | Huber loss transition parameter (outlier sensitivity) |
| ransac_inlier_threshold | 0.5 | [0.3, 0.8] | ATR multiples | RANSAC inlier distance threshold |
| min_line_length | 10 | [5, 20] | bars | Minimum horizontal span for a valid boundary |
| max_line_age | 200 | [100, 500] | bars | Maximum bars before a boundary is considered stale |

### A.3 Q-Score

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| q_score_touch_weight | 0.35 | [0.20, 0.50] | ratio | Weight of touch count component in Q-Score |
| q_score_length_weight | 0.25 | [0.15, 0.35] | ratio | Weight of line length component in Q-Score |
| q_score_slope_weight | 0.20 | [0.10, 0.30] | ratio | Weight of slope alignment component in Q-Score |
| q_score_violation_penalty | 0.20 | [0.10, 0.30] | ratio | Weight of violation penalty component in Q-Score |
| q_sigmoid_scale | 3.0 | [1.0, 5.0] | dimensionless | Steepness of sigmoid normalization curve |
| q_a_grade_threshold | 0.70 | [0.65, 0.80] | ratio | Minimum Q-Score for A-Grade classification |
| q_b_grade_threshold | 0.55 | [0.45, 0.65] | ratio | Minimum Q-Score for B-Grade classification |
| touch_spacing_penalty_lambda | 0.10 | [0.05, 0.20] | ratio | Penalty for clustered (non-independent) touches |

### A.4 Break Detection

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| break_penetration_buffer (beta_p) | 0.3 | [0.1, 0.5] | ATR multiples | Stage 1 penetration distance beyond Action Line |
| break_confirmation_buffer (beta_c) | 0.5 | [0.3, 0.8] | ATR multiples | Stage 2 confirmation distance beyond Action Line |
| volume_confirmation_sma | 20 | [10, 50] | bars | SMA period for volume baseline |
| volume_expansion_factor | 1.5 | [1.2, 2.0] | ratio | Required volume multiple for break confirmation |

### A.5 Retest and Rejection

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| retest_window | 12 | [5, 20] | bars | Maximum bars after break to detect a valid retest |
| retest_tolerance | 0.3 | [0.1, 0.5] | ATR multiples | Maximum distance from frozen Action Line for retest |
| rejection_min_score | 3 | [2, 4] | out of 4 | Minimum rejection features for entry |
| clv_threshold | 0.6 | [0.5, 0.8] | ratio | Close Location Value cutoff for favorable close |
| wick_body_ratio_min | 1.5 | [1.0, 3.0] | ratio | Minimum wick-to-body ratio for tail rejection |

### A.6 Risk Geometry

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| d_geom_min | 0.5 | [0.3, 0.8] | ATR multiples | Minimum dGeom for trade acceptance |
| d_geom_max | 2.5 | [2.0, 3.5] | ATR multiples | Maximum dGeom for trade acceptance |
| min_rr_ratio | 2.0 | [1.5, 3.0] | ratio | Minimum reward-to-risk ratio |

### A.7 Trailing Stop (7 Phases)

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| initial_stop_atr_mult | 1.5 | [1.0, 2.5] | ATR multiples | Initial stop distance (Phase 1) |
| breakeven_trigger_r | 0.8 | [0.5, 1.0] | R-multiples | R-level to trigger breakeven stop (Phase 2) |
| partial_exit_pct | 0.60 | [0.50, 0.75] | ratio | Fraction of position to exit at 1R |
| partial_exit_r_trigger | 1.0 | [0.8, 1.5] | R-multiples | R-level that triggers the partial exit |
| pivot_trail_lookback | 3 | [2, 5] | pivots | Number of prior pivots for structural trailing (Phase 4) |
| time_stop_bars | 20 | [10, 40] | bars | Stagnation time limit (Phase 5) |
| momentum_tightening_percentile | 75 | [60, 90] | percentile | ATR percentile threshold for momentum tightening (Phase 6) |
| circuit_breaker_daily_loss | 0.02 | [0.01, 0.03] | ratio | Daily loss limit as fraction of equity (Phase 7) |

### A.8 Regime Detection

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| er_period | 20 | [10, 50] | bars | Efficiency Ratio lookback period |
| er_trending_threshold | 0.45 | [0.35, 0.60] | ratio | ER above this = TRENDING vote |
| crossing_count_period | 20 | [10, 50] | bars | Period for mean-crossing count |
| crossing_count_chop_threshold | 8 | [5, 12] | count | Crossings above this = CHOPPY vote |
| hurst_window | 100 | [50, 200] | bars | Window for Hurst exponent estimation |
| hurst_trending_threshold | 0.55 | [0.52, 0.65] | ratio | Hurst above this = TRENDING vote |
| kalman_process_noise | 0.01 | [0.001, 0.05] | dimensionless | Kalman filter process noise (Q matrix scalar) |
| cusum_threshold | 2.0 | [1.5, 3.0] | std devs | CUSUM detection threshold for regime shifts |
| ensemble_min_agreement | 4 | [3, 5] | out of 6 | Minimum method votes for regime classification |

### A.9 Position Sizing

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| risk_per_trade_a_grade | 0.01 | [0.005, 0.02] | ratio | Risk per A-Grade trade (1% of equity) |
| risk_per_trade_b_grade | 0.005 | [0.0025, 0.01] | ratio | Risk per B-Grade trade (0.5% of equity) |
| kelly_fraction | 0.25 | [0.10, 0.50] | ratio | Fraction of full Kelly to use (quarter Kelly) |
| max_portfolio_heat | 0.06 | [0.04, 0.10] | ratio | Maximum total risk across all open positions |
| max_correlated_positions | 3 | [2, 5] | count | Maximum positions with correlation > 0.70 |
| drawdown_scale_max | 0.20 | [0.10, 0.30] | ratio | Drawdown level at which scaling factor reaches 0 |

### A.10 Mode Switching

| Parameter | Default | Range | Unit | Description |
|:----------|:--------|:------|:-----|:------------|
| mode_switch_er_threshold | 0.45 | [0.35, 0.55] | ratio | ER threshold for switching between HWR and HE modes |
| high_wr_min_q_score | 0.70 | [0.65, 0.80] | ratio | Minimum Q-Score in High Win Rate mode |
| high_exp_min_rr | 3.0 | [2.5, 4.0] | ratio | Minimum R:R in High Expectancy mode |
| mode_switch_lookback | 100 | [50, 200] | bars | Lookback period for mode evaluation |

---

## Appendix B: Cascading Gate Architecture

The PCTT pipeline is a sequence of 12 filters (gates). Each gate eliminates setups that fail to meet a specific quality criterion. The cumulative effect is extreme selectivity: only 0.5% to 1.5% of all price action becomes a trade signal.

### B.1 Gate Flow Diagram

```
    ┌─────────────────────────────────────────────────────────────┐
    │                    ALL PRICE ACTION (100%)                  │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 1: Pivot Detection                                    │
    │  Criterion: Swing high/low confirmed by left+right bars     │
    │  Pass rate: 100% of bars analyzed, ~5-10% are pivot bars    │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 2: Candidate Line Construction                        │
    │  Criterion: >= 3 touches, min 10 bars length                │
    │  Pass rate: ~15% of instruments have valid structures       │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 3: Boundary Quality (Q-Score)                         │
    │  Criterion: Q-Score >= 0.55 (B-Grade minimum)               │
    │  Pass rate: ~60% of candidate lines                         │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 4: Regime Filter                                      │
    │  Criterion: Ensemble regime = TRENDING or VOLATILE (4/6)    │
    │  Pass rate: ~50% of qualified structures                    │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 5: Multi-Timeframe Confluence (Macro Gate)            │
    │  Criterion: HTF bias aligns with setup direction            │
    │  Pass rate: ~40% of regime-filtered setups                  │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 6: Break Detection (2-Stage)                          │
    │  Criterion: Penetration + Confirmation closes beyond line   │
    │  Pass rate: ~30% of aligned structures show confirmed break │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 7: Line Freezing                                      │
    │  Criterion: Snapshot Action + Safety lines at break bar     │
    │  Pass rate: 100% of confirmed breaks produce frozen lines   │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 8: Retest Detection                                   │
    │  Criterion: Price returns within 0.3 ATR of frozen Action   │
    │             Line within 12 bars of break                    │
    │  Pass rate: ~60% of frozen structures show valid retest     │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 9: Rejection Scoring (4-Feature)                      │
    │  Criterion: Score >= 3 out of 4 features present            │
    │  Pass rate: ~70% of retests produce quality rejection bars  │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 10: Risk Geometry (dGeom)                             │
    │  Criterion: 0.5 <= dGeom <= 2.5 AND R:R >= 2.0             │
    │  Pass rate: ~80% of scored rejections pass geometry filter  │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 11: Portfolio Risk Check                              │
    │  Criterion: Total heat < 6%, correlated positions < 3       │
    │  Pass rate: ~90% pass when portfolio is not fully loaded    │
    └───────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  GATE 12: ENTRY SIGNAL                                      │
    │  Net pass rate: ~0.5% to 1.5% of all observed setups       │
    │  This is the signal that triggers the Position State Machine │
    └─────────────────────────────────────────────────────────────┘
```

### B.2 Cumulative Pass-Through Calculation

The following table shows how selectivity compounds across gates. Starting from 1,000 hypothetical setups scanned in a typical week:

| Gate | Criterion | Individual Pass Rate | Cumulative Survivors |
|:-----|:----------|:---------------------|:--------------------|
| 1 | Pivot Detection | 100% (all analyzed) | 1,000 |
| 2 | Candidate Lines | 15% | 150 |
| 3 | Q-Score >= 0.55 | 60% | 90 |
| 4 | Regime Filter | 50% | 45 |
| 5 | Macro Gate | 40% | 18 |
| 6 | Break Confirmed | 30% | 5.4 |
| 7 | Line Frozen | 100% | 5.4 |
| 8 | Retest Detected | 60% | 3.2 |
| 9 | Rejection >= 3/4 | 70% | 2.3 |
| 10 | dGeom in [0.5, 2.5] | 80% | 1.8 |
| 11 | Portfolio Heat OK | 90% | 1.6 |
| 12 | Entry Signal | 100% (final gate) | 1.6 |

From 1,000 scanned structures, approximately 1 to 2 become actual entries. This extreme selectivity is the mechanism behind the 80-87% win rate on taken trades. The system does not win more often because its entries are better at predicting direction. It wins more often because it refuses to trade unless the structural, volumetric, regime, and risk conditions are simultaneously favorable.

### B.3 Why This Architecture Works

Each gate addresses a different failure mode:

- **Gates 1-3** ensure structural quality. Bad boundaries produce bad signals.
- **Gate 4** prevents trading in regimes where trendlines have no predictive power (choppy, mean-reverting).
- **Gate 5** prevents trading against the dominant higher-timeframe trend.
- **Gates 6-9** require a specific sequence of events (break, freeze, retest, reject) that confirms institutional order flow.
- **Gate 10** ensures the trade geometry supports meaningful position sizing.
- **Gate 11** prevents portfolio-level risk concentration.

Removing any single gate increases trade frequency but degrades win rate and expectancy. The gates are not redundant. They are complementary filters addressing orthogonal risk dimensions.

---

## Appendix C: Glossary of PCTT Terms

**Action Line.** The boundary line that price must break to generate a trade signal. In a bullish setup, the Action Line is the upper trendline (resistance). In a bearish setup, it is the lower trendline (support). *Related: Safety Line, Boundary Estimation. Stage: Boundary Estimation.*

**ATR% (ATR Percentage).** The 14-period Average True Range expressed as a percentage of price. Used to normalize volatility across instruments with different price levels. A $500 stock with ATR of $10 has ATR% = 2.0%. *Related: ATR, Risk Geometry. Stage: Pivot Detection.*

**B-Grade.** A setup classification where Q-Score falls between 0.55 and 0.70. B-Grade setups receive half the position size of A-Grade setups (0.5% risk vs 1.0%). *Related: A-Grade, Q-Score. Stage: Q-Score.*

**Break Buffer.** The distance beyond the Action Line that price must close to register a penetration (beta_p) or confirmation (beta_c). Expressed in ATR multiples. Prevents false breaks from noise. *Related: Break Confirmation, Penetration. Stage: Break Detection.*

**Break Confirmation.** Stage 2 of the 2-stage break detection process. After penetration (Stage 1), the next bar must close beyond Action Line + beta_c * ATR. Both stages must occur for a confirmed break. *Related: Break Buffer, Penetration. Stage: Break Detection.*

**Cascading Gates.** The 12-stage sequential filter architecture of PCTT. Each gate eliminates setups that fail a specific quality criterion. The net effect is that only 0.5-1.5% of price action becomes a trade signal. *Related: all pipeline stages. Stage: Architecture.*

**Circuit Breaker.** An automatic trading halt triggered when daily losses reach 2% of account equity. Prevents catastrophic drawdown during regime failures or black swan events. *Related: Fail-Fast Exit, Drawdown Scaling. Stage: Trailing Stop (Phase 7).*

**CLV (Close Location Value).** A measure of where within the bar's range the close falls. CLV = (Close - Low) / (High - Low) for longs. A CLV >= 0.6 means the close is in the upper 40% of the range, indicating buying pressure. *Related: Rejection Score, Wick/Body Ratio. Stage: Rejection Scoring.*

**Confluence Score.** A composite score reflecting multi-timeframe alignment. Aggregates signals from the macro (HTF), meso (setup TF), and micro (entry TF) levels. Higher confluence improves expected win rate. *Related: Macro Gate, Multi-TF. Stage: Multi-TF Confluence.*

**Crossing Count.** The number of times price crosses its simple moving average within a lookback period. High crossing counts (> 8 in 20 bars) indicate choppy, mean-reverting behavior. *Related: Efficiency Ratio, Regime. Stage: Regime Detection.*

**CUSUM (Cumulative Sum).** A statistical change-detection algorithm that identifies regime transitions. When cumulative deviations from the mean exceed a threshold (default 2.0 std devs), a regime shift is signaled. *Related: Regime, Kalman Filter. Stage: Regime Detection.*

**dGeom (Risk Geometry Metric).** The distance from entry price to the Safety Line, measured in ATR multiples. dGeom = |P_entry - Safety(t_entry)| / ATR. Valid range: [0.5, 2.5]. *Related: Safety Line, Position Sizing. Stage: Risk Geometry.*

**Edge Decay.** The gradual loss of strategy profitability over time as market structure evolves. Detected when 2 of 3 indicators trigger: rolling win rate < 65%, expectancy < 0.3R, profit factor < 1.5. *Related: Walk-Forward, Performance Tracking. Stage: Post-Market Review.*

**Efficiency Ratio (ER).** The ratio of net price displacement to total path length over a lookback period. ER = |Close - Close[n]| / Sum(|Close[i] - Close[i-1]|). Values above 0.45 indicate trending conditions. *Related: Regime, Crossing Count. Stage: Regime Detection.*

**Ensemble Agreement.** The number of regime detection methods (out of 6) that agree on the current regime classification. A minimum of 4/6 agreement is required. *Related: Regime, Efficiency Ratio. Stage: Regime Detection.*

**Fail-Fast Exit.** An immediate exit triggered when early-trade conditions indicate the thesis has failed. Triggers: close through Safety Line, regime shift to CHOPPY within 5 bars, or volume collapse in first 3 bars. *Related: Circuit Breaker, Trailing Stop. Stage: Position Management.*

**Frozen Line.** A boundary line (Action or Safety) whose slope and intercept are locked at the moment of a confirmed break. Frozen lines do not update with new price data. They serve as the reference for retest detection and stop placement. *Related: One-Break-One-Trade, Retest Window. Stage: Line Freezing.*

**Huber Estimation.** A robust regression method for fitting boundary lines to pivot points. Uses Huber loss (quadratic for small residuals, linear for large), making it less sensitive to outlier touches than OLS. Default delta = 1.35. *Related: RANSAC, Boundary Estimation. Stage: Boundary Estimation.*

**Hurst Exponent.** A measure of long-term memory in a time series. H > 0.55 indicates persistent (trending) behavior. H < 0.45 indicates anti-persistent (mean-reverting) behavior. H near 0.50 indicates random walk. *Related: Regime, Efficiency Ratio. Stage: Regime Detection.*

**Kalman Filter.** A recursive state estimator used in PCTT for two purposes: (1) smoothing price to extract trend slope in regime detection, and (2) smoothing the Efficiency Ratio for mode switching. Process noise parameter: 0.01. *Related: Regime, CUSUM. Stage: Regime Detection.*

**Kelly Criterion.** The mathematically optimal fraction of capital to risk per trade given known win rate and payoff ratio. PCTT uses quarter-Kelly (0.25x the full Kelly fraction) to reduce variance. Full Kelly = (W * B - L) / B, where W = win rate, L = loss rate, B = avg win / avg loss. *Related: Position Sizing, Risk Per Trade. Stage: Position Sizing.*

**Macro Gate.** The higher-timeframe directional filter. Checks if the HTF trend (weekly or daily) aligns with the setup direction on the meso timeframe. Bullish setups require bullish HTF bias. Bearish setups require bearish HTF bias. *Related: Multi-TF, Confluence Score. Stage: Multi-TF Confluence.*

**Meso Setup.** The primary timeframe on which PCTT boundary structures are identified and graded. Typically the 1h or 4h chart for swing trading, or the 15m chart for day trading. *Related: Macro Gate, Micro Entry. Stage: Architecture.*

**Micro Entry.** The lowest timeframe used for precise entry timing within the meso setup's retest window. Typically one timeframe below the meso (e.g., 5m if meso is 15m). *Related: Meso Setup, Macro Gate. Stage: Architecture.*

**Mode Switch.** The transition between High Win Rate (HWR) mode and High Expectancy (HE) mode based on market regime. HWR mode uses tighter Q-Score filters (>= 0.70) in trending markets. HE mode uses wider R:R requirements (>= 3.0) in volatile markets. *Related: Regime, Efficiency Ratio. Stage: Mode Switching.*

**Momentum Tightening.** Trailing stop Phase 6, where the stop is tightened when ATR drops below its 75th percentile value over the recent lookback. This captures profits when volatility contracts, signaling the move may be exhausting. *Related: Trailing Stop, ATR. Stage: Trailing Stop (Phase 6).*

**One-Break-One-Trade.** The rule that each confirmed break on a frozen structure produces at most one entry attempt. If the entry fills, that structure is consumed. If the order fails or expires, the structure is still consumed. No re-entry on the same break. *Related: Frozen Line, Position State Machine. Stage: Position Management.*

**Pivot.** A swing high or swing low detected by the adaptive zigzag algorithm. A pivot high requires `pivot_left_bars` lower highs to the left and `pivot_right_bars` lower highs to the right. Pivots are the anchor points for all boundary construction. *Related: Zigzag, ATR Threshold. Stage: Pivot Detection.*

**Q-Score.** The composite quality score for a boundary line, ranging from 0.0 to 1.0. Combines four weighted components: touch count (0.35), line length (0.25), slope alignment (0.20), and violation penalty (0.20). Normalized via sigmoid function. *Related: Grade, Touch. Stage: Q-Score.*

**RANSAC (Random Sample Consensus).** A robust regression method that iteratively fits lines to random subsets of pivot points, selecting the model with the most inliers within the tolerance threshold. More robust than Huber for heavily contaminated data. *Related: Huber Estimation, Boundary Estimation. Stage: Boundary Estimation.*

**Regime.** The current market state classification. One of: TRENDING, VOLATILE, MEAN_REVERTING, or CHOPPY. Determined by the 6-method ensemble detector. PCTT only trades in TRENDING and VOLATILE regimes. *Related: Efficiency Ratio, Ensemble Agreement. Stage: Regime Detection.*

**Rejection Score.** A 0-4 integer scoring the quality of a retest rejection candle. One point each for: (1) wick/body ratio >= 1.5, (2) CLV >= 0.6, (3) volume >= 1.5x SMA, (4) close beyond Action Line in break direction. Minimum score of 3 required for entry. *Related: CLV, Wick/Body Ratio. Stage: Rejection Scoring.*

**Retest Window.** The maximum number of bars after a confirmed break during which a valid retest can occur. Default: 12 bars. If price does not return to the frozen Action Line within this window, the setup expires. *Related: Frozen Line, Retest Tolerance. Stage: Retest Detection.*

**Risk Geometry.** The spatial relationship between entry price, Safety Line (stop), and target. Quantified by dGeom and the reward-to-risk ratio. Both must pass thresholds for the trade to be accepted. *Related: dGeom, Min R:R. Stage: Risk Geometry.*

**R-Multiple.** The profit or loss of a trade expressed as a multiple of the initial risk. R = (exit - entry) / (entry - stop) for longs. A 2R trade earned twice the initial risk. A -1R trade lost the full initial risk. *Related: Risk Geometry, Performance Tracking. Stage: Position Management.*

**Safety Line.** The boundary line opposite to the Action Line, used as the structural stop-loss reference. In a bullish setup (upward break of resistance), the Safety Line is the lower trendline (support). In a bearish setup, it is the upper trendline. *Related: Action Line, dGeom. Stage: Boundary Estimation.*

**Scratch Trade.** A trade that exits near breakeven (between -0.1R and +0.1R). Scratch trades typically result from fail-fast exits or breakeven stops being hit shortly after being moved. Not counted as wins or losses in some performance summaries. *Related: Fail-Fast, Breakeven Stop. Stage: Position Management.*

**Sigmoid Normalization.** The function used to compress raw Q-Score component values into the [0, 1] range. f(x) = 1 / (1 + exp(-k * (x - x0))), where k is the scale parameter (default 3.0). Creates smooth, differentiable transitions between low and high scores. *Related: Q-Score. Stage: Q-Score.*

**Stagnation Exit.** An exit triggered when price fails to make a new high (for longs) or new low (for shorts) within `time_stop_bars` bars (default 20). Indicates the trade thesis has stalled and capital should be redeployed. *Related: Time Stop, Trailing Stop Phase 5. Stage: Trailing Stop.*

**Structural Level.** A price level derived from pivot-anchored boundary lines rather than arbitrary horizontal levels. Structural levels have quantified quality (Q-Score) and defined slope, making them superior to traditional "support/resistance" levels. *Related: Boundary Estimation, Q-Score. Stage: Architecture.*

**Time Stop.** Phase 5 of the trailing stop system. If no new favorable extreme is reached within 20 bars, the stop is tightened to the most recent adverse pivot. This prevents capital from being locked in non-performing positions. *Related: Stagnation Exit, Trailing Stop. Stage: Trailing Stop (Phase 5).*

**Touch.** A pivot point that falls within `touch_tolerance` ATR of a candidate boundary line. More touches indicate a more validated boundary. Minimum 3 touches required. Touch spacing is also evaluated to penalize clustered touches. *Related: Touch Tolerance, Q-Score. Stage: Boundary Estimation.*

**Touch Tolerance.** The maximum distance (in ATR multiples) that a pivot can be from a candidate line and still count as a "touch." Default: 0.5 ATR. Wider tolerance finds more touches but risks fitting noise. *Related: Touch, Boundary Estimation. Stage: Boundary Estimation.*

**Trailing Stop Phase.** One of 7 sequential phases in the PCTT trailing stop system. Phases: (1) Initial hold, (2) Breakeven, (3) Partial exit zone, (4) Pivot-based trailing, (5) Time stop, (6) Momentum tightening, (7) Circuit breaker. *Related: dGeom, Position Management. Stage: Trailing Stop.*

**Volume Confirmation.** A requirement that the break bar's volume exceeds 1.5x the 20-bar volume SMA. Ensures that the break has institutional participation rather than being a low-liquidity false signal. *Related: Break Detection, Volume Expansion Factor. Stage: Break Detection.*

**Walk-Forward.** A validation methodology where parameters are optimized on an in-sample period and then tested on the immediately following out-of-sample period. The window then rolls forward. This prevents overfitting by ensuring the system works on unseen data. *Related: Edge Decay, Performance Tracking. Stage: Validation.*

**Wick/Body Ratio.** The ratio of the rejection wick length to the candle body length. For a bullish rejection, wick = low to min(open, close), body = |open - close|. A ratio >= 1.5 indicates strong rejection of the retest level. *Related: CLV, Rejection Score. Stage: Rejection Scoring.*

**Zigzag.** The adaptive pivot detection algorithm that identifies significant swing highs and lows. "Adaptive" means the minimum swing threshold is scaled by ATR, so the algorithm adjusts to current volatility. Only swings exceeding `zigzag_atr_threshold * ATR` register as pivots. *Related: Pivot, ATR Threshold. Stage: Pivot Detection.*

---

## Appendix D: Quick-Start Implementation Checklist

This checklist guides an agent or developer through implementing the complete PCTT pipeline from scratch. Steps are ordered by dependency. Each step includes estimated complexity, prerequisites, and a key test case to validate the implementation.

### Step 1: Set Up Data Feed (OHLCV Bars)

**Complexity:** Low
**Dependencies:** None
**Description:** Connect to a market data source and retrieve OHLCV (Open, High, Low, Close, Volume) bars for one or more instruments at one or more timeframes. Store bars in a structured array (numpy structured array or list of dicts).

```python
# Key test case
def test_data_feed():
    bars = fetch_bars("AAPL", timeframe="1h", count=500)
    assert len(bars) >= 500
    assert all(k in bars[0] for k in ["open", "high", "low", "close", "volume"])
    assert all(bars[i]["high"] >= bars[i]["low"] for i in range(len(bars)))
    assert all(bars[i]["high"] >= bars[i]["open"] for i in range(len(bars)))
    assert all(bars[i]["high"] >= bars[i]["close"] for i in range(len(bars)))
```

### Step 2: Implement ATR Calculation (14-Period)

**Complexity:** Low
**Dependencies:** Step 1
**Description:** Compute the 14-period Average True Range. True Range = max(H-L, |H-Prev_C|, |L-Prev_C|). ATR = SMA(TR, 14). This is the volatility normalizer used throughout the entire pipeline.

```python
# Key test case
def test_atr():
    atr = compute_atr(bars, period=14)
    assert atr > 0
    assert len(atr_series) == len(bars) - 14  # Or padded with NaN
```

### Step 3: Implement Adaptive Zigzag Pivot Detection

**Complexity:** Medium
**Dependencies:** Steps 1, 2
**Description:** Detect swing highs and lows using left/right bar confirmation and ATR-scaled minimum swing size. A swing high requires `pivot_left_bars` lower highs to the left and `pivot_right_bars` lower highs to the right, with swing magnitude >= `zigzag_atr_threshold * ATR`.

```python
# Key test case
def test_pivots():
    pivots = detect_pivots(bars, left=5, right=5, atr_threshold=1.0)
    assert len(pivots) > 0
    for p in pivots:
        assert p["type"] in ("HIGH", "LOW")
        assert p["bar_index"] >= 5  # Cannot detect in first left_bars
    # Verify alternation: highs and lows should generally alternate
    types = [p["type"] for p in pivots]
    alternation_violations = sum(
        1 for i in range(1, len(types)) if types[i] == types[i-1]
    )
    assert alternation_violations / len(types) < 0.15  # Allow some violations
```

### Step 4: Build Candidate Line Generator (Pivot Pairs)

**Complexity:** Medium
**Dependencies:** Step 3
**Description:** Generate all valid candidate trendlines by connecting pairs of same-type pivots (high-to-high for resistance, low-to-low for support). Filter by minimum length (10 bars), minimum touches (3), and maximum age (200 bars).

```python
# Key test case
def test_candidate_lines():
    lines = generate_candidate_lines(pivots, min_touches=3, min_length=10)
    for line in lines:
        assert line["touches"] >= 3
        assert line["length_bars"] >= 10
        assert line["type"] in ("RESISTANCE", "SUPPORT")
```

### Step 5: Implement Huber Boundary Estimation

**Complexity:** Medium
**Dependencies:** Step 4
**Description:** Fit boundary lines to pivot points using Huber regression. Huber loss is quadratic for residuals within `delta` and linear beyond, providing robustness to outlier pivots.

```python
# Key test case
def test_huber():
    slope, intercept = huber_fit(pivot_prices, pivot_indices, delta=1.35)
    residuals = [abs(p - (slope * i + intercept)) for p, i in zip(pivot_prices, pivot_indices)]
    assert np.median(residuals) < touch_tolerance * atr  # Most points close to line
```

### Step 6: Implement RANSAC Boundary Estimation

**Complexity:** Medium
**Dependencies:** Step 4
**Description:** Fit boundary lines using RANSAC. Iteratively sample 2 points, fit a line, count inliers within threshold. Select model with most inliers. Provides a second estimate for comparison with Huber.

```python
# Key test case
def test_ransac():
    slope, intercept, inliers = ransac_fit(
        pivot_prices, pivot_indices, threshold=0.5 * atr, iterations=1000
    )
    assert len(inliers) >= 3  # At least min_touches inliers
```

### Step 7: Build Q-Score Calculator with Sigmoid Normalization

**Complexity:** Medium
**Dependencies:** Steps 5, 6
**Description:** Compute the composite quality score for each boundary line. Four weighted components: touch count (0.35), length (0.25), slope alignment (0.20), violation penalty (0.20). Apply sigmoid normalization to each component before weighting.

```python
# Key test case
def test_q_score():
    q = compute_q_score(line, atr, sigmoid_scale=3.0)
    assert 0.0 <= q <= 1.0
    # A line with 5 touches, 50 bars, good slope, no violations should score high
    high_quality = compute_q_score(good_line, atr)
    assert high_quality >= 0.70
    # A line with 2 touches should score low
    low_quality = compute_q_score(poor_line, atr)
    assert low_quality < 0.55
```

### Step 8: Implement Setup Grading (A/B)

**Complexity:** Low
**Dependencies:** Step 7
**Description:** Classify each boundary as A-Grade (Q >= 0.70) or B-Grade (Q >= 0.55). Lines with Q < 0.55 are discarded. Grade determines position sizing (A = 1% risk, B = 0.5% risk).

```python
# Key test case
def test_grading():
    assert grade_line(0.75) == "A"
    assert grade_line(0.60) == "B"
    assert grade_line(0.50) is None  # Below threshold, no grade
```

### Step 9: Build 6-Method Regime Detection Ensemble

**Complexity:** High
**Dependencies:** Steps 1, 2
**Description:** Implement all 6 regime detectors: Efficiency Ratio, Crossing Count, Hurst Exponent, Kalman Slope, CUSUM, and Fractal Dimension. Each method votes TRENDING, MEAN_REVERTING, or CHOPPY. Require 4/6 agreement.

```python
# Key test case
def test_regime():
    regime = detect_regime(bars)
    assert regime in ("TRENDING", "MEAN_REVERTING", "CHOPPY", "VOLATILE")
    # On a strongly trending synthetic series, should detect TRENDING
    trending_bars = generate_synthetic_trend(slope=0.5, noise=0.1, length=200)
    assert detect_regime(trending_bars) == "TRENDING"
    # On a choppy synthetic series, should detect CHOPPY
    choppy_bars = generate_synthetic_chop(period=5, length=200)
    assert detect_regime(choppy_bars) == "CHOPPY"
```

### Step 10: Implement Multi-Timeframe Data Alignment

**Complexity:** Medium
**Dependencies:** Steps 1, 9
**Description:** Align bars from multiple timeframes (e.g., 15m, 1h, 4h, D) so that each meso-level bar has access to the corresponding HTF bar's regime and direction. Handle timezone alignment and bar boundary synchronization.

```python
# Key test case
def test_mtf_alignment():
    aligned = align_timeframes(bars_15m, bars_1h, bars_4h)
    # Each 15m bar should map to exactly one 1h and one 4h bar
    assert all(a["htf_bar"] is not None for a in aligned)
```

### Step 11: Build Macro Gate (HTF Bias Filter)

**Complexity:** Low
**Dependencies:** Steps 9, 10
**Description:** Determine the higher-timeframe directional bias using Kalman-smoothed slope. Bullish if slope > 0, bearish if slope < 0, neutral if slope magnitude < threshold. Pass gate only if bias matches setup direction.

```python
# Key test case
def test_macro_gate():
    assert macro_gate("LONG", htf_bias="BULLISH") == True
    assert macro_gate("LONG", htf_bias="BEARISH") == False
    assert macro_gate("SHORT", htf_bias="BEARISH") == True
    assert macro_gate("LONG", htf_bias="NEUTRAL") == False
```

### Step 12: Implement 2-Stage Break Detection

**Complexity:** Medium
**Dependencies:** Steps 5, 6, 7, 2
**Description:** Stage 1: Bar closes beyond Action Line + beta_p * ATR (penetration). Stage 2: Next bar closes beyond Action Line + beta_c * ATR (confirmation). Both conditions must be met on consecutive bars.

```python
# Key test case
def test_break_detection():
    result = detect_break(bars, action_line, atr, beta_p=0.3, beta_c=0.5)
    if result:
        assert result["stage_1_bar"] < result["stage_2_bar"]
        assert result["stage_2_bar"] == result["stage_1_bar"] + 1
```

### Step 13: Build Line Freezing Protocol

**Complexity:** Low
**Dependencies:** Step 12
**Description:** When a break is confirmed, snapshot the Action and Safety line parameters (slope, intercept) at the break bar. These frozen values are used for all subsequent retest and stop calculations. The lines no longer update.

```python
# Key test case
def test_freeze():
    frozen = freeze_lines(action_line, safety_line, break_bar_index)
    # Verify frozen values do not change when new bars arrive
    assert frozen.action_slope == action_line["slope"]
    assert frozen.safety_intercept == safety_line["intercept"]
```

### Step 14: Implement Retest Window Monitor

**Complexity:** Medium
**Dependencies:** Step 13
**Description:** After a confirmed break, monitor subsequent bars for price returning within `retest_tolerance * ATR` of the frozen Action Line. The retest must occur within `retest_window` bars of the break. If the window expires without retest, the setup is abandoned.

```python
# Key test case
def test_retest():
    retest = detect_retest(bars, frozen_action, atr, window=12, tolerance=0.3)
    if retest:
        assert retest["bar_index"] <= break_bar + 12
        dist = abs(bars[retest["bar_index"]]["low"] - frozen_action_value)
        assert dist <= 0.3 * atr
```

### Step 15: Build 4-Feature Rejection Scorer

**Complexity:** Medium
**Dependencies:** Step 14
**Description:** Score the rejection candle at the retest bar on 4 binary features: (1) wick/body >= 1.5, (2) CLV >= 0.6, (3) volume >= 1.5x SMA, (4) close beyond Action Line. Sum features for score 0-4. Require >= 3 for entry.

```python
# Key test case
def test_rejection():
    score, features = score_rejection(bar, action_value, direction, vol_sma)
    assert 0 <= score <= 4
    assert len(features) == 4
    assert all(isinstance(f, bool) for f in features.values())
```

### Step 16: Implement Risk Geometry Filter (dGeom)

**Complexity:** Low
**Dependencies:** Step 13
**Description:** Compute dGeom = |entry - Safety| / ATR. Accept if 0.5 <= dGeom <= 2.5. Also compute R:R ratio using the nearest structural target. Accept if R:R >= 2.0.

```python
# Key test case
def test_d_geom():
    result = risk_geometry_filter(entry=100.0, safety=97.5, atr=2.0)
    assert result["d_geom"] == 1.25  # (100 - 97.5) / 2.0
    assert result["pass"] == True     # 0.5 <= 1.25 <= 2.5
```

### Step 17: Build Position Sizing Calculator (Fractional Kelly)

**Complexity:** Medium
**Dependencies:** Steps 8, 16
**Description:** Size = (Equity * Risk% * S(DD)) / (dGeom * ATR). Risk% depends on grade (A=1%, B=0.5%). S(DD) is the drawdown scaling factor. Apply quarter-Kelly cap and max portfolio heat check.

```python
# Key test case
def test_sizing():
    size = calculate_position_size(
        equity=100000, grade="A", d_geom=1.5, atr=5.0,
        drawdown_pct=0.05, max_heat=0.06, current_heat=0.02
    )
    # Expected: 100000 * 0.01 * S(0.05) / (1.5 * 5.0)
    assert size > 0
    assert size * 1.5 * 5.0 <= 100000 * 0.01  # Dollar risk <= limit
```

### Step 18: Implement 7-Phase Hybrid Trailing Stop

**Complexity:** High
**Dependencies:** Steps 2, 3, 16
**Description:** The full trailing stop system with 7 phases: (1) Initial hold at dGeom * ATR, (2) Breakeven at 0.8R, (3) Partial exit at 1R, (4) Pivot-based trailing, (5) Time stop at 20 bars, (6) Momentum tightening at 75th percentile ATR, (7) Circuit breaker at 2% daily loss.

```python
# Key test case
def test_trailing():
    manager = TrailingStopManager(entry=100, stop=97.5, direction="LONG", atr=2.0)
    # Phase 1: stop at initial level
    assert manager.current_stop == 97.5
    assert manager.phase == 1
    # Simulate price reaching 0.8R
    manager.update(price=102.0)
    assert manager.phase == 2
    assert manager.current_stop == 100.0  # Breakeven
```

### Step 19: Build Fail-Fast Exit System

**Complexity:** Low
**Dependencies:** Steps 9, 18
**Description:** Monitor three fail-fast conditions in the first bars after entry: (1) close through Safety Line, (2) regime shifts to CHOPPY within 5 bars, (3) volume < 0.5x SMA in first 3 bars. Any condition triggers immediate market exit.

```python
# Key test case
def test_fail_fast():
    result = check_fail_fast(bar, safety=97.5, regime="CHOPPY",
                             bars_in_trade=3, vol_ratio=0.4)
    assert result["triggered"] == True
    assert "REGIME_SHIFT" in result["reason"] or "VOLUME_COLLAPSE" in result["reason"]
```

### Step 20: Implement Stagnation Detection

**Complexity:** Low
**Dependencies:** Step 18
**Description:** Track the number of bars since the last new favorable extreme (new high for longs, new low for shorts). If this count exceeds `time_stop_bars` (default 20), tighten the stop to the most recent adverse pivot.

```python
# Key test case
def test_stagnation():
    detector = StagnationDetector(time_stop_bars=20)
    for i in range(21):
        detector.update(high=100.0, low=99.0)  # No new highs for 21 bars
    assert detector.stagnation_triggered == True
```

### Step 21: Build Circuit Breaker System

**Complexity:** Low
**Dependencies:** None (standalone)
**Description:** Track cumulative realized losses for the current trading day. If total daily loss reaches 2% of account equity, halt all trading for the remainder of the session. Reset at the start of each new session.

```python
# Key test case
def test_circuit_breaker():
    cb = CircuitBreaker(equity=100000, daily_limit=0.02)
    cb.record_loss(500)   # 0.5%
    assert cb.is_triggered == False
    cb.record_loss(1000)  # 1.5% cumulative
    assert cb.is_triggered == False
    cb.record_loss(600)   # 2.1% cumulative
    assert cb.is_triggered == True
```

### Step 22: Implement Trade Journaling

**Complexity:** Medium
**Dependencies:** Steps 15, 16, 17, 18
**Description:** Build the PCTTTradeRecord data structure and the PerformanceTracker analytics engine. Every trade must produce a complete record. Implement JSON serialization for persistent storage and rolling metric computation.

```python
# Key test case
def test_journaling():
    record = PCTTTradeRecord(
        trade_id="AAPL_1700000000000",
        entry_time=datetime(2025, 1, 15, 10, 30),
        entry_price=195.50,
        direction="LONG",
        instrument="AAPL",
        timeframe="1h",
        q_score=0.75,
        rejection_score=3,
        regime="TRENDING",
        d_geom=1.3,
        grade="A",
        position_size=76,
        risk_per_share=6.50,
        initial_stop=189.00,
        action_line_value=195.20,
        safety_line_value=189.00,
        action_slope=0.02,
        safety_slope=0.015,
    )
    serialized = record.to_dict()
    assert serialized["trade_id"] == "AAPL_1700000000000"
    assert serialized["q_score"] == 0.75
```

### Step 23: Set Up Walk-Forward Validation Pipeline

**Complexity:** High
**Dependencies:** All previous steps
**Description:** Build the walk-forward optimization and validation framework. Divide historical data into rolling in-sample and out-of-sample windows. Optimize parameters on in-sample, test on out-of-sample. Track out-of-sample performance to detect overfitting and edge decay.

```python
# Key test case
def test_walk_forward():
    results = walk_forward(
        bars=full_history,
        in_sample_bars=500,
        out_of_sample_bars=100,
        step_bars=100,
    )
    # Each fold should have separate in-sample and OOS performance
    for fold in results["folds"]:
        assert "in_sample_metrics" in fold
        assert "oos_metrics" in fold
        assert fold["oos_metrics"]["trade_count"] > 0
    # OOS expectancy should be > 0 for the system to be considered viable
    avg_oos_exp = np.mean([f["oos_metrics"]["expectancy"] for f in results["folds"]])
    assert avg_oos_exp > 0.0, "System fails walk-forward validation"
```

### Implementation Dependency Graph

```
Step 1 (Data Feed)
  ├── Step 2 (ATR)
  │     ├── Step 3 (Pivots)
  │     │     ├── Step 4 (Candidate Lines)
  │     │     │     ├── Step 5 (Huber)
  │     │     │     ├── Step 6 (RANSAC)
  │     │     │     │     └── Step 7 (Q-Score) ──> Step 8 (Grading)
  │     │     │     │           └── Step 12 (Break Detection)
  │     │     │     │                 └── Step 13 (Freezing)
  │     │     │     │                       ├── Step 14 (Retest)
  │     │     │     │                       │     └── Step 15 (Rejection)
  │     │     │     │                       └── Step 16 (dGeom)
  │     │     │     │                             └── Step 17 (Sizing)
  │     │     │     │
  │     │     │     └── Step 18 (Trailing Stop)
  │     │     │           ├── Step 19 (Fail-Fast)
  │     │     │           └── Step 20 (Stagnation)
  │     │
  │     └── Step 9 (Regime Ensemble)
  │           └── Step 10 (MTF Alignment)
  │                 └── Step 11 (Macro Gate)
  │
  └── Step 21 (Circuit Breaker) [standalone]

Step 22 (Journaling) depends on Steps 15, 16, 17, 18
Step 23 (Walk-Forward) depends on ALL previous steps
```

### Estimated Total Implementation Time

| Complexity | Step Count | Estimated Time Each | Total |
|:-----------|:-----------|:-------------------|:------|
| Low | 8 steps (1, 2, 8, 11, 13, 16, 19, 20, 21) | 2-4 hours | 16-36 hours |
| Medium | 10 steps (3, 4, 5, 6, 7, 10, 12, 14, 15, 17, 22) | 4-8 hours | 40-80 hours |
| High | 3 steps (9, 18, 23) | 8-16 hours | 24-48 hours |
| **Total** | **23 steps** | | **80-164 hours** |

A single developer working full-time should expect 2 to 4 weeks for a complete implementation. An agent with code generation capabilities can reduce this to 1 to 2 weeks by parallelizing independent steps (e.g., Steps 5 and 6 can be built simultaneously, as can Steps 9 and 4).

---

*End of Part XI and Appendices.*
