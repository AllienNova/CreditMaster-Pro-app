# SSOT-batch1c: Exhaustive Registries for PCTT Agentic System

<!-- SSOT-DC-REGISTRY: Dataclass and Enum Registry -->
<!-- SSOT-EVT-REGISTRY: Event Type Registry -->
<!-- SSOT-TOOL-REGISTRY: Tool Registry -->
<!-- Generated from: Architecture Parts 1-7 -->
<!-- Status: COMPLETE -->

---

<!-- BEGIN SSOT-DC-REGISTRY -->

## SSOT-DC-REGISTRY: Complete Dataclass and Enum Registry

Total: 96 dataclasses and enums across 7 architecture parts.

---

### Category A: Core Data Models (Part 2)

**SSOT-DC-001: OHLCVBar**
- Source: Part 2, Section 11.2
- Owner: Sentinel Agent
```python
@dataclass
class OHLCVBar:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    instrument: str
    timeframe: str  # 1m, 5m, 15m, 1h, 4h, D, W
```

**SSOT-DC-002: Pivot**
- Source: Part 2, Section 11.2
- Owner: Signal Agent
```python
@dataclass
class Pivot:
    bar_index: int
    timestamp: datetime
    price: float
    pivot_type: str  # HIGH, LOW
    atr_at_detection: float
    confirmed: bool
```

**SSOT-DC-003: CandidateLine**
- Source: Part 2, Section 11.2
- Owner: Signal Agent
```python
@dataclass
class CandidateLine:
    line_id: str
    line_type: str  # SUPPORT, RESISTANCE
    slope: float
    intercept: float
    touches: int
    length_bars: int
    q_score: float
    grade: str  # A, B, None
    instrument: str
    timeframe: str
```

**SSOT-DC-004: FrozenStructure**
- Source: Part 2, Section 11.2
- Owner: Signal Agent
```python
@dataclass
class FrozenStructure:
    structure_id: str
    action_line_slope: float
    action_line_intercept: float
    safety_line_slope: float
    safety_line_intercept: float
    break_bar_index: int
    break_time: datetime
    direction: str  # LONG, SHORT
    instrument: str
    consumed: bool  # One-break-one-trade flag
```

**SSOT-DC-005: PCTTTradeRecord**
- Source: Part 2, Section 11.2
- Owner: Journal Agent
```python
@dataclass
class PCTTTradeRecord:
    trade_id: str
    entry_time: datetime
    entry_price: float
    direction: str
    instrument: str
    timeframe: str
    q_score: float
    rejection_score: int
    regime: str
    d_geom: float
    grade: str
    position_size: float
    risk_per_share: float
    initial_stop: float
    action_line_value: float
    safety_line_value: float
    trailing_phases: list
    partial_exits: list
    fail_fast_triggered: bool
    max_favorable_excursion: float
    max_adverse_excursion: float
    exit_time: datetime
    exit_price: float
    exit_reason: str
    r_multiple: float
    duration_bars: int
    realized_pnl: float
    commission: float
    macro_gate_result: str
    confluence_score: float
    entry_regime: str
    exit_regime: str
```

---

### Category B: Agent Memory Structures (Part 1)

**SSOT-DC-006: SentinelMemory**
- Source: Part 1, Section 3.1
- Owner: Sentinel Agent
```python
@dataclass
class SentinelMemory:
    current_session_phase: str
    market_brief: dict
    watchlist: list
    overnight_gaps: dict
    vix_level: float
    vix_regime: str
    calendar_events_today: list
    session_start_time: str
    session_end_time: str
    last_brief_published: str
    crisis_active: bool
    instruments_monitored: int
```

**SSOT-DC-007: RegimeMemory**
- Source: Part 1, Section 3.2
- Owner: Regime Agent
```python
@dataclass
class RegimeMemory:
    current_regime: str
    regime_confidence: int
    ensemble_votes: dict
    efficiency_ratio: float
    cusum_alarm: bool
    cusum_location: int
    regime_duration_bars: int
    transition_probability: float
    regime_parameters: dict
    historical_regimes: list
    last_ensemble_run: str
    instruments_classified: dict
```

**SSOT-DC-008: SignalMemory**
- Source: Part 1, Section 3.3
- Owner: Signal Agent
```python
@dataclass
class SignalMemory:
    active_candidates: list
    frozen_structures: list
    consumed_breaks: set
    fsm_states: dict
    pending_retests: list
    last_signal_time: str
    signals_generated_today: int
    pipeline_rejection_counts: dict
    q_score_distribution: list
    grade_distribution: dict
    active_instruments: list
    retest_windows: dict
```

**SSOT-DC-009: RiskMemory**
- Source: Part 1, Section 3.4 (updated in Part 4 Fix 3)
- Owner: Risk Agent
```python
@dataclass
class RiskMemory:
    equity: float
    peak_equity: float
    current_drawdown_pct: float
    drawdown_scale: float
    open_positions: list
    portfolio_heat_pct: float
    daily_pnl: float
    daily_loss_limit_remaining: float
    consecutive_losses: int
    circuit_breaker_status: str
    survival_score: int
    correlation_matrix: dict
    # Added in Part 4 Fix 3
    asset_allocation: dict
    deployed_by_class: dict
    allocation_headroom: dict
    allocation_last_updated: str
```

**SSOT-DC-010: OrchestratorMemory**
- Source: Part 1, Section 3.5
- Owner: Orchestrator Agent
```python
@dataclass
class OrchestratorMemory:
    current_workflow_phase: str
    pending_approvals: list
    active_agents: dict
    system_mode: str
    human_connected: bool
    last_human_interaction: str
    conflicts_today: list
    rotation_check_due: bool
    daily_trade_count: int
    proposal_history: list
```

**SSOT-DC-011: ExecutionMemory**
- Source: Part 1, Section 3.6
- Owner: Execution Agent
```python
@dataclass
class ExecutionMemory:
    open_positions: dict
    pending_orders: list
    position_phases: dict
    trailing_stops: dict
    partial_exits_pending: dict
    broker_connected: bool
    broker_latency_ms: float
    fills_today: list
    slippage_avg: float
    commission_total_today: float
    fail_fast_candidates: list
```

**SSOT-DC-012: JournalMemory**
- Source: Part 1, Section 3.7 (updated in Part 4 Fix 8)
- Owner: Journal Agent
```python
@dataclass
class JournalMemory:
    trade_history: list
    rolling_metrics: dict
    daily_reports: list
    weekly_reports: list
    # Added in Part 4 Fix 8
    consecutive_edge_decay_alerts: int = 0
    edge_decay_alert_history: list = None
    last_edge_decay_check: str = None
```

---

### Category C: Regime and Classification (Parts 1, 4)

**SSOT-DC-013: RegimeClassification**
- Source: Part 4, Fix 1 (updated from Part 1)
- Owner: Regime Agent
```python
@dataclass
class RegimeClassification:
    instrument: str
    timeframe: str
    regime: str              # TRENDING, VOLATILE, MEAN_REVERTING, CHOPPY
    confidence: int          # Number of ensemble votes (0-6)
    ensemble_votes: dict     # {method_name: vote}
    efficiency_ratio: float
    cusum_alarm: bool
    cusum_location: int
    duration_bars: int
    transition_probability: float
    htf_slope: float         # Kalman-filtered slope of the higher timeframe
    htf_direction: str       # BULLISH, BEARISH, FLAT
    htf_timeframe: str       # e.g., 4h, D
    timestamp: datetime
```

---

### Category D: Pre-Market and Daily Workflow (Part 2)

**SSOT-DC-014: PreMarketWorksheet**
- Source: Part 2, Section 6.2.1
- Owner: Sentinel Agent
```python
@dataclass
class PreMarketWorksheet:
    es_gap_pct: float
    nq_gap_pct: float
    gap_classification: str  # SMALL, MEDIUM, LARGE, MASSIVE
    asia_direction: str      # BULLISH, BEARISH, MIXED
    europe_direction: str
    yield_10y: float
    yield_2y: float
    curve_slope: float
    vix_level: float
    vix_regime: str          # LOW_VOL, NORMAL, ELEVATED, CRISIS
    vix_direction: str       # RISING, FALLING, FLAT
    term_structure: str      # CONTANGO, BACKWARDATION
    crude_direction: str
    gold_direction: str
    dxy_direction: str
    tier_1_events: list
    earnings_today: list
    fed_speakers: list
    adx_reading: float
    overnight_range_vs_20day: float
    regime_summary: str      # TRENDING, RANGING, TRANSITIONAL, CRISIS
    resistance_levels: list
    support_levels: list
    bias: str                # LONG, SHORT, NEUTRAL
    max_trades: int
    position_size_adjustment: float
```

**SSOT-DC-015: DailySpeedJournal**
- Source: Part 2, Section 6.4.2
- Owner: Journal Agent
```python
@dataclass
class DailySpeedJournal:
    date: str
    market_regime: str
    vix_close: float
    sp500_change_pct: float
    trades_taken: int
    wins: int
    losses: int
    total_pnl: float
    best_trade: dict
    worst_trade: dict
    laws_violated: list
    system_emotional_state: str
    one_sentence_summary: str
```

---

### Category E: Universe Selection (Part 3)

**SSOT-DC-016: LiquidityScreenConfig**
- Source: Part 3, Section 14.2 Stage 2
- Owner: Sentinel Agent
```python
@dataclass
class LiquidityScreenConfig:
    equity_min_adv_dollars: float = 10_000_000
    equity_min_price: float = 10.00
    equity_max_spread_pct: float = 0.05
    equity_min_market_cap: float = 2_000_000_000
    equity_requires_weekly_options: bool = True
    futures_min_adv_contracts: int = 10_000
    futures_max_spread_ticks: int = 2
    forex_max_spread_pct: float = 0.02
    forex_min_daily_volume_usd: float = 1_000_000_000
    crypto_max_spread_pct: float = 0.10
    crypto_min_adv_dollars: float = 50_000_000
    crypto_min_market_cap: float = 1_000_000_000
    min_history_days: int = 365
    max_data_gaps_pct: float = 2.0
    earnings_exclusion_sessions: int = 2
    corporate_event_exclusion_days: int = 5
```

**SSOT-DC-017: LiquidityScreenResult**
- Source: Part 3, Section 14.2 Stage 2
- Owner: Sentinel Agent
```python
@dataclass
class LiquidityScreenResult:
    instrument: str
    asset_class: str
    passed: bool
    adv_dollars: float
    spread_pct: float
    market_cap: Optional[float]
    price: float
    data_quality_score: float
    has_options_chain: bool
    pending_corporate_event: bool
    earnings_within_window: bool
    failure_reasons: list
```

**SSOT-DC-018: PCTTSuitabilityComponents**
- Source: Part 3, Section 14.2 Stage 3
- Owner: Sentinel Agent
```python
@dataclass
class PCTTSuitabilityComponents:
    trendability_raw: float
    structure_clarity_raw: float
    vol_consistency_raw: float
    liquidity_depth_raw: float
    cost_efficiency_raw: float
```

**SSOT-DC-019: PCTTSuitabilityScore**
- Source: Part 3, Section 14.2 Stage 3
- Owner: Sentinel Agent
```python
@dataclass
class PCTTSuitabilityScore:
    instrument: str
    asset_class: str
    composite_score: float
    components: PCTTSuitabilityComponents
    trendability_normalized: float
    structure_normalized: float
    vol_consistency_normalized: float
    liquidity_normalized: float
    cost_efficiency_normalized: float
    lookback_days: int
    computed_at: str
    rank: int = 0
```

**SSOT-DC-020: WatchlistEntry**
- Source: Part 3, Section 14.2 Stage 5
- Owner: Sentinel Agent
```python
@dataclass
class WatchlistEntry:
    instrument: str
    asset_class: str
    sector: str
    pctt_suitability: float
    regime: str
    regime_bonus: float
    final_score: float
    rank: int
    eligible_strategies: list
    max_grade: str
    atr_multiplier: float
    size_multiplier: float
    human_override: bool
```

**SSOT-DC-021: FinalWatchlist**
- Source: Part 3, Section 14.2 Stage 5
- Owner: Sentinel Agent
```python
@dataclass
class FinalWatchlist:
    date: str
    instruments: list  # List[WatchlistEntry]
    total_scored: int
    regime_filtered: int
    final_count: int
    asset_class_distribution: dict
    sector_distribution: dict
    human_overrides: list
    rebuild_type: str  # FULL or REFRESH
```

**SSOT-DC-022: AssetAllocation**
- Source: Part 3, Section 14.4
- Owner: Sentinel Agent / Risk Agent
```python
@dataclass
class AssetAllocation:
    macro_regime: str  # RISK_ON, RISK_OFF, TRANSITION, CRISIS
    base_allocation: dict
    correlation_adjusted: dict
    performance_tilted: dict
    final_allocation: dict
    total_deployed_pct: float
    cash_reserve_pct: float
```

**SSOT-DC-023: InstrumentProfile**
- Source: Part 3, Section 14.5
- Owner: Sentinel Agent
```python
@dataclass
class InstrumentProfile:
    instrument: str
    asset_class: str
    sector: str
    exchange: str
    currency: str
    avg_daily_volume_dollars: float
    avg_daily_volume_shares: float
    avg_spread_pct: float
    market_cap: float
    has_weekly_options: bool
    liquidity_screen_passed: bool
    liquidity_failure_reasons: list
    pctt_suitability_score: float
    trendability: float
    structure_clarity: float
    vol_consistency: float
    liquidity_depth: float
    cost_efficiency: float
    suitability_rank: int
    current_regime: str
    regime_confidence: float
    regime_duration_bars: int
    regime_bonus: float
    on_watchlist: bool
    watchlist_rank: int
    final_score: float
    eligible_strategies: list
    max_grade: str
    rolling_20_win_rate: float
    rolling_20_expectancy: float
    rolling_20_avg_r: float
    total_trades: int
    avg_hold_duration_bars: float
    last_full_scan: str
    last_daily_refresh: str
    human_override: bool
    notes: str
```

---

### Category F: Operating Modes (Part 3)

**SSOT-DC-024: TradingMode (Enum)**
- Source: Part 3, Section 15.4
- Owner: Orchestrator Agent
```python
class TradingMode(Enum):
    MANUAL = "MANUAL"
    SUPERVISED = "SUPERVISED"
    AUTONOMOUS = "AUTONOMOUS"
    HALTED = "HALTED"
```

**SSOT-DC-025: ModeParameters**
- Source: Part 3, Section 15.4
- Owner: Orchestrator Agent
```python
@dataclass
class ModeParameters:
    max_risk_per_trade_pct: float
    max_portfolio_heat_pct: float
    max_concurrent_positions: int
    min_setup_grade: str
    min_q_score: float
    circuit_breaker_daily_loss_pct: float
    consecutive_loss_pause_threshold: int
    proposal_timeout_bars: Optional[int]
    human_approval_required: bool
    notifications_enabled: bool
    auto_execute: bool
    trailing_stops_auto: bool
    partial_exits_auto: bool
```

**SSOT-DC-026: ModeTransitionRequirements**
- Source: Part 3, Section 15.4
- Owner: Orchestrator Agent
```python
@dataclass
class ModeTransitionRequirements:
    min_trades: int
    min_expectancy: float
    max_drawdown_pct: float
    min_survival_score: int
    human_confirmation_required: bool
```

**SSOT-DC-027: OperatingMode**
- Source: Part 3, Section 15.4
- Owner: Orchestrator Agent
```python
@dataclass
class OperatingMode:
    current_mode: TradingMode
    mode_parameters: ModeParameters
    mode_since: str
    trades_in_current_mode: int
    automatic_downgrade_enabled: bool
    time_limited_autonomy: Optional[dict]
    mode_history: list
    upgrade_eligible: bool
    upgrade_requirements_met: dict
```

---

### Category G: Rotation and Opportunity Cost (Part 3)

**SSOT-DC-028: OpportunityScoreComponents**
- Source: Part 3, Section 16.2
- Owner: Orchestrator Agent
```python
@dataclass
class OpportunityScoreComponents:
    pctt_suitability: float
    regime_bonus: float
    active_setup_bonus: float
    raw_score: float
    final_score: float
```

**SSOT-DC-029: HoldScoreComponents**
- Source: Part 3, Section 16.3
- Owner: Orchestrator Agent
```python
@dataclass
class HoldScoreComponents:
    current_r: float
    recency_weight: float
    momentum_score: float
    regime_alignment: float
    raw_hold_score: float
```

**SSOT-DC-030: StalePositionCheck**
- Source: Part 3, Section 16.5
- Owner: Orchestrator Agent
```python
@dataclass
class StalePositionCheck:
    position_id: str
    instrument: str
    is_stale: bool
    stale_flags: int
    duration_flag: bool
    volume_flag: bool
    regime_flag: bool
    structure_flag: bool
    bars_held: int
    current_r: float
    volume_decline_bars: int
    regime_at_entry: str
    regime_current: str
    bars_since_favorable_pivot: int
    recommendation: str  # HOLD, ROTATION_CANDIDATE, URGENT_REVIEW
```

**SSOT-DC-031: InstrumentPerformance**
- Source: Part 3, Section 16.7
- Owner: Journal Agent
```python
@dataclass
class InstrumentPerformance:
    instrument: str
    asset_class: str
    rolling_20_win_rate: float
    rolling_20_expectancy: float
    rolling_20_avg_r: float
    rolling_20_profit_factor: float
    avg_hold_duration_bars: float
    total_trades: int
    pctt_suitability_score: float
    last_trade_date: str
    last_updated: datetime
    rank: int
    rotation_candidate: bool
    removal_scheduled: bool
```

**SSOT-DC-032: InstrumentRotationHistory**
- Source: Part 3, Section 16.7
- Owner: Journal Agent
```python
@dataclass
class InstrumentRotationHistory:
    instrument: str
    rotations_into: int
    rotations_out_of: int
    avg_r_at_rotation_out: float
    avg_r_of_replacement: float
    net_rotation_value: float
```

**SSOT-DC-033: SignalComparison**
- Source: Part 3, Section 16.8
- Owner: Orchestrator Agent
```python
@dataclass
class SignalComparison:
    instrument_a: str
    instrument_b: str
    signal_score_a: float
    signal_score_b: float
    correlation: float
    decision: str  # TAKE_A, TAKE_B, TAKE_BOTH, TAKE_NEITHER
    reason: str
```

**SSOT-DC-034: RotationRecord**
- Source: Part 3, Section 16.10
- Owner: Journal Agent
```python
@dataclass
class RotationRecord:
    rotation_id: str
    timestamp: str
    mode: str
    closed_instrument: str
    closed_direction: str
    closed_r_at_rotation: float
    closed_hold_score: float
    closed_bars_held: int
    closed_stale_flags: int
    opened_instrument: str
    opened_direction: str
    opened_q_score: float
    opened_grade: str
    opened_opportunity_score: float
    close_transaction_cost: float
    open_transaction_cost: float
    total_rotation_cost_r: float
    new_position_r: Optional[float] = None
    rotation_added_value: Optional[float] = None
    outcome_recorded: bool = False
```

**SSOT-DC-035: RotationMetrics**
- Source: Part 3, Section 16.10
- Owner: Journal Agent
```python
@dataclass
class RotationMetrics:
    total_rotations: int
    rotations_with_outcome: int
    rotation_hit_rate: float
    rotation_miss_rate: float
    avg_r_improvement: float
    median_r_improvement: float
    best_rotation_r: float
    worst_rotation_r: float
    avg_rotation_cost_r: float
    total_rotation_cost_r: float
    net_rotation_value_r: float
    avg_net_value_per_rotation: float
    autonomous_rotation_count: int
    autonomous_hit_rate: float
    supervised_rotation_count: int
    supervised_hit_rate: float
    rolling_10_hit_rate: float
    rotation_value_trending: str  # IMPROVING, STABLE, DECLINING
```

---

### Category H: Circuit Breaker and Risk Extensions (Part 4)

**SSOT-DC-036: ConsecutiveLossTracker**
- Source: Part 4, Fix 7
- Owner: Risk Agent
```python
@dataclass
class ConsecutiveLossTracker:
    count: int = 0
    stage: str = "NORMAL"         # NORMAL, SOFT_PAUSE, HARD_HALT
    size_multiplier: float = 1.0
    loss_sequence: list = None
    soft_pause_since: str = None
    hard_halt_since: str = None
    recovery_trades_remaining: int = 0
```

**SSOT-DC-037: KellyInputs**
- Source: Part 4, Fix 12
- Owner: Journal Agent
```python
@dataclass
class KellyInputs:
    win_rate: float
    avg_winner_r: float
    avg_loser_r: float
    payoff_ratio: float
    sample_size: int
    kelly_fraction: float
    half_kelly: float
    quarter_kelly: float
    last_updated: str = ""
```

---

### Category I: Visualization (Part 4)

**SSOT-DC-038: VisualizationEvent**
- Source: Part 4, Section 18.4
- Owner: All Agents (publisher), Visualization Engine (consumer)
```python
@dataclass
class VisualizationEvent:
    timestamp: datetime
    agent: str
    event_type: str      # OVERLAY, ANNOTATION, MARKER, PANEL_UPDATE, ALERT, LINE, ZONE, BADGE
    layer: str           # BACKGROUND, PRICE_LEVEL, BAR_LEVEL, OVERLAY, SIDEBAR, STATUS, TOAST
    priority: int        # 1=must show, 2=default, 3=if enabled
    instrument: str
    data: dict
    ttl: int             # Seconds. 0=permanent.
    style: dict
    replaces: Optional[str] = None
    group: Optional[str] = None
    interactive: bool = False
```

**SSOT-DC-039: ChartVisualizationConfig**
- Source: Part 4, Section 18.4
- Owner: Visualization Engine
```python
@dataclass
class ChartVisualizationConfig:
    enabled: bool = True
    theme: str = "dark"
    sentinel_sessions: bool = True
    sentinel_events: bool = True
    sentinel_vix_badge: bool = True
    sentinel_gap: bool = True
    sentinel_overnight_range: bool = True
    regime_tint: bool = True
    regime_label: bool = True
    regime_transitions: bool = True
    regime_cusum: bool = True
    regime_er_subplot: bool = False
    signal_pivots: bool = True
    signal_candidate_lines: bool = True
    signal_scored_lines: bool = True
    signal_frozen_structures: bool = True
    signal_pipeline_badges: bool = False
    signal_retest_zones: bool = True
    signal_rejection_annotations: bool = True
    signal_dgeom_bracket: bool = True
    signal_entry_markers: bool = True
    risk_size_annotation: bool = True
    risk_heat_gauge: bool = True
    risk_drawdown_badge: bool = True
    risk_survival_badge: bool = True
    risk_circuit_breaker: bool = True
    risk_veto_annotation: bool = True
    orchestrator_approval_panel: bool = True
    orchestrator_mode_banner: bool = True
    orchestrator_agent_status: bool = True
    orchestrator_conflict_log: bool = False
    execution_entry_exit_markers: bool = True
    execution_stop_line: bool = True
    execution_target_lines: bool = True
    execution_trailing_trail: bool = True
    execution_partial_markers: bool = True
    execution_pnl_watermark: bool = True
    execution_failfast_annotation: bool = True
    execution_time_stop_countdown: bool = True
    journal_pnl_ticker: bool = True
    journal_metrics_panel: bool = True
    journal_edge_decay: bool = True
    journal_history_markers: bool = True
    journal_r_sparkline: bool = True
    animation_enabled: bool = True
    animation_speed: str = "normal"
    line_fade_duration_ms: int = 500
    marker_flash_duration_ms: int = 300
    zone_fill_duration_ms: int = 200
```

---

### Category J: Platform Abstraction (Part 4)

**SSOT-DC-040: EntryProposal**
- Source: Part 4, Section 19.1
- Owner: Signal Agent (via StrategyPlugin)
```python
@dataclass
class EntryProposal:
    strategy_name: str
    instrument: str
    direction: str
    entry_price: float
    stop_price: float
    target_prices: List[float]
    quality_score: float
    grade: str
    regime_at_signal: str
    confidence: float
    metadata: dict
    timestamp: datetime
    ttl_bars: int
```

**SSOT-DC-041: TrailingStopConfig**
- Source: Part 4, Section 19.1
- Owner: Execution Agent (via StrategyPlugin)
```python
@dataclass
class TrailingStopConfig:
    phases: List[dict]
    fail_fast_conditions: List[dict]
    partial_exit_rules: List[dict]
    time_stop_bars: int
```

**SSOT-DC-042: OrderResult**
- Source: Part 4, Section 19.2
- Owner: Execution Agent (via PlatformAdapter)
```python
@dataclass
class OrderResult:
    order_id: str
    status: str  # FILLED, PARTIAL, REJECTED, PENDING
    fill_price: float
    fill_size: float
    slippage: float
    commission: float
    timestamp: str
```

**SSOT-DC-043: AccountState**
- Source: Part 4, Section 19.2
- Owner: Execution Agent (via PlatformAdapter)
```python
@dataclass
class AccountState:
    equity: float
    cash: float
    buying_power: float
    margin_used: float
    unrealized_pnl: float
    realized_pnl_today: float
```

---

### Category K: UI/UX and WebSocket (Part 5)

**SSOT-DC-044: MessageType (str Enum)**
- Source: Part 5, Section (UI/UX)
- Owner: WebSocket Layer
```python
class MessageType(str, Enum):
    INIT = "INIT"
    BAR_UPDATE = "BAR_UPDATE"
    VIZ_EVENT = "VIZ_EVENT"
    POSITION_UPDATE = "POSITION_UPDATE"
    AGENT_STATE = "AGENT_STATE"
    ALERT = "ALERT"
    APPROVAL_REQUEST = "APPROVAL_REQUEST"
    CHAT_RESPONSE = "CHAT_RESPONSE"
    SYSTEM_STATUS = "SYSTEM_STATUS"
    METRICS_UPDATE = "METRICS_UPDATE"
    MODE_CHANGE = "MODE_CHANGE"
    USER_COMMAND = "USER_COMMAND"
    APPROVAL_RESPONSE = "APPROVAL_RESPONSE"
    CHAT_MESSAGE = "CHAT_MESSAGE"
    CONFIG_UPDATE = "CONFIG_UPDATE"
    LAYOUT_SAVE = "LAYOUT_SAVE"
    CHART_INTERACTION = "CHART_INTERACTION"
```

**SSOT-DC-045: WebSocketMessage**
- Source: Part 5
- Owner: WebSocket Layer
```python
@dataclass
class WebSocketMessage:
    type: MessageType
    payload: dict
    timestamp: str
    sequence: int
    source: str
    request_id: Optional[str] = None
    agent: Optional[str] = None
```

**SSOT-DC-046: InitPayload**
- Source: Part 5
- Owner: WebSocket Layer
```python
@dataclass
class InitPayload:
    system_mode: str
    open_positions: list
    active_instruments: list
    regime_states: dict
    agent_statuses: dict
    portfolio_heat: float
    drawdown_pct: float
    survival_score: int
    circuit_breaker_status: str
    rolling_metrics: dict
    daily_pnl: float
    daily_trades: int
    visualization_config: dict
    pending_approvals: list
    recent_alerts: list
    broker_connected: bool
    data_feed_connected: bool
    server_time: str
```

**SSOT-DC-047: PanelLayout**
- Source: Part 5
- Owner: UI Engine
```python
@dataclass
class PanelLayout:
    chart_width_pct: float
    chart_height_pct: float
    sidebar_width_pct: float
    position_panel_height_pct: float
    er_subplot_height_pct: float
    notification_panel_height_pct: float
    chat_panel_height_pct: float
    window_width: int
    window_height: int
    is_maximized: bool
```

**SSOT-DC-048: LayoutPreset**
- Source: Part 5
- Owner: UI Engine
```python
@dataclass
class LayoutPreset:
    name: str
    description: str
    layout: PanelLayout
    created_at: str
    is_default: bool
```

**SSOT-DC-049: SetupConfig**
- Source: Part 5
- Owner: System Configuration
```python
@dataclass
class SetupConfig:
    broker_config: dict
    risk_params: dict
    universe: dict
    mode: str
    alerts: dict
    visualization: dict
    created_at: str
    updated_at: str
```

---

### Category L: BaseAgent Framework (Part 6)

**SSOT-DC-050: AgentLayer (Enum)**
- Source: Part 6, Section 25.2.1
- Owner: BaseAgent Framework
```python
class AgentLayer(Enum):
    PERCEPTION = "PERCEPTION"
    ANALYSIS = "ANALYSIS"
    DECISION = "DECISION"
    ACTION = "ACTION"
    LEARNING = "LEARNING"
```

**SSOT-DC-051: AgentStatus (Enum)**
- Source: Part 6, Section 25.2.1
- Owner: BaseAgent Framework
```python
class AgentStatus(Enum):
    INITIALIZING = "INITIALIZING"
    READY = "READY"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    ERROR = "ERROR"
    STOPPED = "STOPPED"
```

**SSOT-DC-052: ToolPermission_v6 (Enum)**
- Source: Part 6, Section 25.2.1
- Owner: BaseAgent Framework
```python
class ToolPermission(Enum):
    READ_ONLY = "READ_ONLY"
    READ_WRITE = "READ_WRITE"
    EXECUTE = "EXECUTE"
    ADMIN = "ADMIN"
```

**SSOT-DC-053: ToolSpec**
- Source: Part 6, Section 25.2.1
- Owner: BaseAgent Framework
```python
@dataclass
class ToolSpec:
    name: str
    description: str
    plugin: str
    permission: ToolPermission
    input_schema: dict
    output_schema: dict
    timeout_ms: int = 5000
    retryable: bool = True
    idempotent: bool = False
    circuit_breaker_enabled: bool = True
    rate_limit_per_minute: int = 60
```

**SSOT-DC-054: Handoff**
- Source: Part 6, Section 25.2.1
- Owner: BaseAgent Framework
```python
@dataclass
class Handoff:
    source_agent: str
    target_agent: str
    payload: dict
    priority: str = "NORMAL"
    requires_response: bool = False
    correlation_id: str = ""
    created_at: str = ""
```

**SSOT-DC-055: AgentHealthCheck**
- Source: Part 6, Section 25.2.1
- Owner: BaseAgent Framework
```python
@dataclass
class AgentHealthCheck:
    agent_name: str
    status: AgentStatus
    uptime_seconds: float
    last_execution_at: str
    error_count_last_hour: int
    avg_latency_ms: float
    circuit_breaker_state: str
    memory_usage_mb: float
    tools_available: int
    tools_healthy: int
    checks_passed: list
    checks_failed: list
    timestamp: str
```

**SSOT-DC-056: AuditEntry**
- Source: Part 6, Section 25.2.1
- Owner: BaseAgent Framework
```python
@dataclass
class AuditEntry:
    entry_id: str
    agent_name: str
    action: str
    input_summary: str
    output_summary: str
    duration_ms: float
    success: bool
    error_message: Optional[str]
    correlation_id: str
    parent_span_id: Optional[str]
    timestamp: str
```

---

### Category M: Resilience (Part 6)

**SSOT-DC-057: CircuitBreakerState (Enum)**
- Source: Part 6, Section 25.2.4
- Owner: BaseAgent Framework
```python
class CircuitBreakerState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"
```

**SSOT-DC-058: ResilienceConfig**
- Source: Part 6, Section 25.2.4
- Owner: BaseAgent Framework
```python
@dataclass
class ResilienceConfig:
    max_retries: int = 3
    base_delay_seconds: float = 0.5
    max_delay_seconds: float = 30.0
    jitter_seconds: float = 1.0
    circuit_breaker_fail_max: int = 5
    circuit_breaker_reset_timeout: int = 60
    timeout_seconds: float = 10.0
```

---

### Category N: Calibration Agent (Part 6)

**SSOT-DC-059: CalibrationRun**
- Source: Part 6, Section 26
- Owner: Calibration Agent
```python
@dataclass
class CalibrationRun:
    run_id: str
    triggered_by: str
    parameters_tuned: list
    search_space: list
    train_period: str
    validate_period: str
    test_period: str
    objective_function: str
    current_values: dict
    proposed_values: dict
    current_performance: dict
    proposed_performance: dict
    improvement_pct: float
    p_value: float
    is_significant: bool
    human_approved: Optional[bool]
    applied_at: Optional[str]
    rollback_triggered: bool
    status: str
    timestamp: str
```

**SSOT-DC-060: ParameterSnapshot**
- Source: Part 6, Section 26
- Owner: Calibration Agent
```python
@dataclass
class ParameterSnapshot:
    snapshot_id: str
    parameters: dict
    regime: str
    performance_at_snapshot: dict
    created_at: str
    created_by: str
```

**SSOT-DC-061: CalibrationMemory**
- Source: Part 6, Section 26
- Owner: Calibration Agent
```python
@dataclass
class CalibrationMemory:
    current_parameters: dict
    baseline_parameters: dict
    parameter_drift: dict
    last_calibration_run: Optional[CalibrationRun]
    next_scheduled_calibration: str
    calibration_in_progress: bool
    parameter_snapshots: list
    calibration_runs: list
    rollback_count: int
    regime_parameter_map: dict
    trades_since_last_calibration: int
    performance_since_last_calibration: dict
    monitoring_active: bool
    monitoring_trades_remaining: int
    monitoring_baseline: dict
```

**SSOT-DC-062: DataWindow**
- Source: Part 6, Section 26
- Owner: Calibration Agent
```python
@dataclass
class DataWindow:
    anchor_date: str
    train_end: str
    validate_start: str
    validate_end: str
    test_start: str
    test_end: str
    total_trades: int
    train_trades: int
    validate_trades: int
    test_trades: int
```

**SSOT-DC-063: ParameterSearchSpace**
- Source: Part 6, Section 26
- Owner: Calibration Agent
```python
@dataclass
class ParameterSearchSpace:
    name: str
    current_value: float
    min_value: float
    max_value: float
    step_size: float
    constraint: str = "none"
```

**SSOT-DC-064: SignificanceTestResult**
- Source: Part 6, Section 26
- Owner: Calibration Agent
```python
@dataclass
class SignificanceTestResult:
    metric: str
    current_mean: float
    proposed_mean: float
    difference: float
    p_value: float
    confidence_interval_95: tuple
    is_significant: bool
    n_bootstrap_samples: int
    effect_size: float
```

---

### Category O: Research Agent (Part 6)

**SSOT-DC-065: ResearchFinding**
- Source: Part 6, Section 27
- Owner: Research Agent
```python
@dataclass
class ResearchFinding:
    finding_id: str
    instrument: str
    finding_type: str
    headline: str
    summary: str
    sentiment: float
    confidence: float
    freshness: float
    source: str
    source_url: str
    impact_assessment: str
    related_instruments: list
    expires_at: str
    tags: list
    created_at: str
```

**SSOT-DC-066: EarningsCalendarEntry**
- Source: Part 6, Section 27
- Owner: Research Agent
```python
@dataclass
class EarningsCalendarEntry:
    instrument: str
    report_date: str
    report_time: str
    consensus_eps: float
    consensus_revenue: float
    whisper_number: Optional[float]
    previous_eps: float
    previous_revenue: float
    analyst_count: int
    implied_move_pct: float
    historical_surprise_avg: float
```

**SSOT-DC-067: SentimentSnapshot**
- Source: Part 6, Section 27
- Owner: Research Agent
```python
@dataclass
class SentimentSnapshot:
    instrument: str
    news_sentiment: float
    social_sentiment: float
    options_sentiment: float
    analyst_sentiment: float
    composite_sentiment: float
    sample_size: int
    timestamp: str
```

**SSOT-DC-068: ResearchMemory**
- Source: Part 6, Section 27
- Owner: Research Agent
```python
@dataclass
class ResearchMemory:
    active_findings: list
    earnings_calendar: list
    macro_events_today: list
    current_sentiment: dict
    pre_market_brief_published: bool
    findings_24h: int
    sentiment_history: list
    earnings_results: list
    watchlist: list
    research_focus: list
    update_interval_minutes: int
    last_update: str
    findings_today: int
    average_confidence: float
    stale_findings_purged: int
```

---

### Category P: Strategy Agent (Part 6)

**SSOT-DC-069: StrategyHypothesis**
- Source: Part 6, Section 28
- Owner: Strategy Agent
```python
@dataclass
class StrategyHypothesis:
    hypothesis_id: str
    description: str
    modification_type: str
    modification_detail: dict
    expected_improvement: str
    risk_assessment: str
    minimum_sample_size: int
    created_at: str
    status: str
```

**SSOT-DC-070: BacktestResult**
- Source: Part 6, Section 28
- Owner: Strategy Agent
```python
@dataclass
class BacktestResult:
    result_id: str
    hypothesis_id: str
    variant: str
    data_range: str
    data_type: str
    total_trades: int
    win_rate: float
    profit_factor: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    avg_r_multiple: float
    expectancy: float
    trades_per_month: float
    per_trade_returns: list
    timestamp: str
```

**SSOT-DC-071: VariantComparison**
- Source: Part 6, Section 28
- Owner: Strategy Agent
```python
@dataclass
class VariantComparison:
    comparison_id: str
    hypothesis_id: str
    current_result: BacktestResult
    proposed_result: BacktestResult
    metrics_comparison: dict
    p_value_sharpe: float
    p_value_profit_factor: float
    p_value_win_rate: float
    ci_95_sharpe: tuple
    ci_95_pf: tuple
    effect_size_sharpe: float
    is_significant: bool
    recommendation: str
    report_markdown: str
```

**SSOT-DC-072: RolloutState**
- Source: Part 6, Section 28
- Owner: Strategy Agent
```python
@dataclass
class RolloutState:
    hypothesis_id: str
    current_stage: int
    stage_trades_completed: int
    stage_trades_required: int
    stage_performance: dict
    control_performance: dict
    human_approved_stages: list
    auto_revert_triggered: bool
    started_at: str
    last_updated: str
```

**SSOT-DC-073: StrategyMemory**
- Source: Part 6, Section 28
- Owner: Strategy Agent
```python
@dataclass
class StrategyMemory:
    active_hypotheses: list
    active_rollout: Optional[RolloutState]
    current_strategy_version: str
    pending_comparisons: list
    completed_hypotheses: list
    backtest_results: list
    comparisons: list
    rollout_history: list
    hypotheses_tested_total: int
    hypotheses_deployed: int
    hypotheses_rejected: int
    hypotheses_reverted: int
    average_improvement_deployed: float
```

**SSOT-DC-074: RolloutStageConfig**
- Source: Part 6, Section 28
- Owner: Strategy Agent
```python
@dataclass
class RolloutStageConfig:
    stage: int
    name: str
    position_size_multiplier: float
    required_trades: int
    max_degradation_pct: float
    requires_human_approval: bool
```

---

### Category Q: Reconciliation Agent (Part 6)

**SSOT-DC-075: PositionRecord**
- Source: Part 6, Section 29
- Owner: Reconciliation Agent
```python
@dataclass
class PositionRecord:
    instrument: str
    quantity: float
    avg_price: float
    side: str
    unrealized_pnl: float
    market_value: float
    cost_basis: float
    source: str
    timestamp: str
```

**SSOT-DC-076: BalanceRecord**
- Source: Part 6, Section 29
- Owner: Reconciliation Agent
```python
@dataclass
class BalanceRecord:
    cash: float
    margin_used: float
    buying_power: float
    equity: float
    day_pnl: float
    source: str
    timestamp: str
```

**SSOT-DC-077: DriftRecord**
- Source: Part 6, Section 29
- Owner: Reconciliation Agent
```python
@dataclass
class DriftRecord:
    drift_id: str
    instrument: str
    category: str
    system_quantity: float
    broker_quantity: float
    quantity_diff: float
    system_avg_price: float
    broker_avg_price: float
    price_diff: float
    dollar_impact: float
    auto_corrected: bool
    escalated: bool
    resolution: Optional[str]
    detected_at: str
    resolved_at: Optional[str]
```

**SSOT-DC-078: BrokerHealthMetrics**
- Source: Part 6, Section 29
- Owner: Reconciliation Agent
```python
@dataclass
class BrokerHealthMetrics:
    latency_p50_ms: float
    latency_p95_ms: float
    latency_p99_ms: float
    error_count_5min: int
    total_calls_5min: int
    error_rate_pct: float
    timeout_count_5min: int
    health_status: str
    last_successful_call: str
    last_error: Optional[str]
    last_error_at: Optional[str]
```

**SSOT-DC-079: ReconciliationMemory**
- Source: Part 6, Section 29
- Owner: Reconciliation Agent
```python
@dataclass
class ReconciliationMemory:
    last_reconciliation_at: str
    last_reconciliation_result: str
    positions_system: list
    positions_broker: list
    balance_system: BalanceRecord
    balance_broker: BalanceRecord
    active_drifts: list
    broker_health: BrokerHealthMetrics
    drift_history_24h: list
    auto_corrections_today: int
    reconciliation_run_count_today: int
    broker_health_history: list
    total_reconciliations: int
    total_drifts_detected: int
    total_auto_corrections: int
    total_escalations: int
    avg_reconciliation_latency_ms: float
    worst_drift_ever: Optional[DriftRecord]
```

**SSOT-DC-080: ReconciliationSchedule**
- Source: Part 6, Section 29
- Owner: Reconciliation Agent
```python
@dataclass
class ReconciliationSchedule:
    market_hours_interval_seconds: int = 300
    pre_market_interval_seconds: int = 900
    after_hours_interval_seconds: int = 1800
    overnight_interval_seconds: int = 3600
    on_trade_event: bool = True
```

---

### Category R: Tool Permission Model (Part 7)

**SSOT-DC-081: PermissionLevel (IntEnum)**
- Source: Part 7, Section 30
- Owner: Permission Framework
```python
class PermissionLevel(IntEnum):
    READ = 0
    WRITE = 1
    EXECUTE = 2
    ADMIN = 3
```

**SSOT-DC-082: ToolPermission_v7**
- Source: Part 7, Section 30
- Owner: Permission Framework
```python
@dataclass
class ToolPermission:
    tool_name: str
    required_level: PermissionLevel
    requires_human_approval: bool = False
    auto_approve_in_autonomous: bool = False
    max_calls_per_minute: int = 60
    max_calls_per_session: Optional[int] = None
    description: str = ""
    category: str = "general"
```

**SSOT-DC-083: AgentPermissionGrant**
- Source: Part 7, Section 30
- Owner: Permission Framework
```python
@dataclass
class AgentPermissionGrant:
    agent_name: str
    mode: str
    granted_level: PermissionLevel
    tool_categories: list
    excluded_tools: list
```

**SSOT-DC-084: ToolInvocationRecord**
- Source: Part 7, Section 30.3
- Owner: Audit System
```python
@dataclass
class ToolInvocationRecord:
    record_id: str
    timestamp: str
    agent_name: str
    tool_name: str
    tool_category: str
    permission_level_required: int
    permission_level_granted: int
    parameters: dict
    result_summary: str
    result_status: str
    approval_status: Optional[str]
    approved_by: Optional[str]
    approval_latency_ms: Optional[float]
    execution_latency_ms: float
    operating_mode: str
    trace_id: str
    span_id: str
    error_message: Optional[str]
    session_date: str
```

**SSOT-DC-085: PermissionEscalation**
- Source: Part 7, Section 30.4
- Owner: Permission Framework
```python
@dataclass
class PermissionEscalation:
    escalation_id: str
    requesting_agent: str
    requested_tool: str
    requested_level: PermissionLevel
    current_level: PermissionLevel
    reason: str
    urgency: str = "NORMAL"
    current_mode: str = ""
    requested_at: str = ""
    ttl_seconds: int = 300
    status: str = "PENDING"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    expires_at: Optional[str] = None
    used: bool = False
    used_at: Optional[str] = None
```

---

### Category S: Rate Limiting (Part 7)

**SSOT-DC-086: RateLimitConfig**
- Source: Part 7, Section 30.5
- Owner: Rate Limiter
```python
@dataclass
class RateLimitConfig:
    max_calls_per_minute: int = 60
    max_calls_per_session: Optional[int] = None
    burst_allowance: int = 0
    burst_window_seconds: int = 10
    cooldown_after_burst_seconds: int = 30
```

**SSOT-DC-087: RateLimitState**
- Source: Part 7, Section 30.5
- Owner: Rate Limiter
```python
@dataclass
class RateLimitState:
    call_timestamps: list
    session_count: int = 0
    in_cooldown: bool = False
    cooldown_until: Optional[str] = None
```

---

### Category T: Margin Monitoring (Part 7)

**SSOT-DC-088: AssetClass (str Enum)**
- Source: Part 7, Section 31
- Owner: Margin Monitor
```python
class AssetClass(str, Enum):
    EQUITY = "EQUITY"
    OPTION = "OPTION"
    FUTURE = "FUTURE"
    FOREX = "FOREX"
    CRYPTO = "CRYPTO"
```

**SSOT-DC-089: MarginAccountType (str Enum)**
- Source: Part 7, Section 31
- Owner: Margin Monitor
```python
class MarginAccountType(str, Enum):
    CASH = "CASH"
    MARGIN = "MARGIN"
    PORTFOLIO_MARGIN = "PORTFOLIO_MARGIN"
```

**SSOT-DC-090: MarginPosition**
- Source: Part 7, Section 31
- Owner: Margin Monitor
```python
@dataclass
class MarginPosition:
    instrument: str
    asset_class: AssetClass
    side: str
    quantity: float
    entry_price: float
    current_price: float
    contract_multiplier: float = 1.0
    initial_margin_pct: float = 0.50
    maintenance_margin_pct: float = 0.25
    notional_value: float = 0.0
    initial_margin: float = 0.0
    maintenance_margin: float = 0.0
    unrealized_pnl: float = 0.0
    margin_usage: float = 0.0
    liquidation_price: float = 0.0
    margin_cushion_pct: float = 0.0
    last_updated: str = ""
```

**SSOT-DC-091: MarginHealthTier (str Enum)**
- Source: Part 7, Section 31
- Owner: Margin Monitor
```python
class MarginHealthTier(str, Enum):
    GREEN = "GREEN"      # >150%
    YELLOW = "YELLOW"    # 125-150%
    ORANGE = "ORANGE"    # 110-125%
    RED = "RED"          # <110%
```

**SSOT-DC-092: AggregateMargin**
- Source: Part 7, Section 31
- Owner: Margin Monitor
```python
@dataclass
class AggregateMargin:
    timestamp: str
    total_equity: float
    cash_balance: float
    total_unrealized_pnl: float
    total_margin_used: float
    total_initial_margin: float
    total_maintenance_margin: float
    margin_ratio: float
    buying_power: float
    excess_margin: float
    maintenance_call_distance: float
    health_tier: MarginHealthTier
    positions_count: int
    highest_margin_position: str
    highest_margin_pct: float
    day_trade_buying_power: float
    is_pdt_account: bool
    pdt_equity_sufficient: bool
```

**SSOT-DC-093: LiquidationScenario**
- Source: Part 7, Section 31
- Owner: Margin Monitor
```python
@dataclass
class LiquidationScenario:
    shock_pct: float
    projected_equity: float
    projected_margin_used: float
    projected_margin_ratio: float
    projected_health_tier: MarginHealthTier
    positions_liquidated: list
    margin_call_amount: float
    is_margin_call: bool
```

**SSOT-DC-094: LiquidationRisk**
- Source: Part 7, Section 31
- Owner: Margin Monitor
```python
@dataclass
class LiquidationRisk:
    timestamp: str
    position_distances: dict
    scenarios: list  # List[LiquidationScenario]
    single_position_max_pct: float
    single_position_instrument: str
    sector_concentration: dict
    correlated_groups: list
    worst_case_loss_1pct: float
    worst_case_loss_5pct: float
    worst_case_loss_10pct: float
    nearest_liquidation_instrument: str
    nearest_liquidation_distance_pct: float
```

---

### Category U: Compliance Engine (Part 7)

**SSOT-DC-095: ComplianceVerdict (str Enum)**
- Source: Part 7, Section 32
- Owner: Compliance Engine
```python
class ComplianceVerdict(str, Enum):
    PASS = "PASS"
    WARN = "WARN"
    BLOCK = "BLOCK"
```

**SSOT-DC-096: ComplianceResult**
- Source: Part 7, Section 32
- Owner: Compliance Engine
```python
@dataclass
class ComplianceResult:
    rule_name: str
    verdict: ComplianceVerdict
    reason: str
    details: dict
    timestamp: str
    severity: str
```

**SSOT-DC-097: ComplianceCheckSummary**
- Source: Part 7, Section 32
- Owner: Compliance Engine
```python
@dataclass
class ComplianceCheckSummary:
    proposal_id: str
    instrument: str
    side: str
    quantity: float
    overall_verdict: ComplianceVerdict
    results: list  # List[ComplianceResult]
    checked_at: str
    blocked_by: Optional[list]
    warnings: list
```

**SSOT-DC-098: DayTradeRecord**
- Source: Part 7, Section 32
- Owner: Compliance Engine (PDT)
```python
@dataclass
class DayTradeRecord:
    instrument: str
    open_time: str
    close_time: str
    side: str
    quantity: float
    open_price: float
    close_price: float
    pnl: float
    business_date: str
```

**SSOT-DC-099: PDTStatus**
- Source: Part 7, Section 32
- Owner: Compliance Engine (PDT)
```python
@dataclass
class PDTStatus:
    is_margin_account: bool
    is_cash_account: bool
    account_equity: float
    equity_meets_threshold: bool
    pdt_threshold: float
    day_trades_in_window: int
    day_trades_remaining: int
    is_pdt_classified: bool
    pdt_buying_power: float
    finra_2026_rule_active: bool
    window_start: str
    window_end: str
    day_trade_history: list
    warning_message: Optional[str]
    blocked: bool
    block_reason: Optional[str]
```

**SSOT-DC-100: WashSaleFlag**
- Source: Part 7, Section 32
- Owner: Compliance Engine (Wash Sale)
```python
@dataclass
class WashSaleFlag:
    flag_id: str
    instrument_sold: str
    instrument_bought: str
    sale_date: str
    purchase_date: str
    sale_price: float
    sale_quantity: float
    purchase_price: float
    purchase_quantity: float
    disallowed_loss: float
    adjusted_cost_basis: float
    is_prospective: bool
    is_substantially_identical: bool
    match_type: str
    wash_sale_window_start: str
    wash_sale_window_end: str
    holding_period_adjustment_days: int
```

**SSOT-DC-101: LossTransaction**
- Source: Part 7, Section 32
- Owner: Compliance Engine (Wash Sale)
```python
@dataclass
class LossTransaction:
    instrument: str
    sale_date: str
    sale_price: float
    quantity: float
    cost_basis: float
    realized_loss: float
    window_start: str
    window_end: str
```

**SSOT-DC-102: ConcentrationLimits**
- Source: Part 7, Section 32
- Owner: Compliance Engine
```python
@dataclass
class ConcentrationLimits:
    max_single_instrument_pct: float = 20.0
    max_single_instrument_margin_pct: float = 30.0
    max_single_sector_pct: float = 40.0
    sectors: dict = None
    max_equity_pct: float = 80.0
    max_options_pct: float = 20.0
    max_futures_pct: float = 30.0
    max_forex_pct: float = 20.0
    max_crypto_pct: float = 10.0
    strategy_name: str = ""
```

---

### Category V: Prop Firm Compliance (Part 7)

**SSOT-DC-103: PropFirmPhase (str Enum)**
- Source: Part 7, Section 32.7
- Owner: Compliance Engine (Prop Firm)
```python
class PropFirmPhase(str, Enum):
    EVALUATION_1 = "EVALUATION_1"
    EVALUATION_2 = "EVALUATION_2"
    FUNDED = "FUNDED"
    SCALING = "SCALING"
```

**SSOT-DC-104: DrawdownType (str Enum)**
- Source: Part 7, Section 32.7
- Owner: Compliance Engine (Prop Firm)
```python
class DrawdownType(str, Enum):
    STATIC = "STATIC"
    TRAILING = "TRAILING"
    DAILY = "DAILY"
    EOD = "EOD"
```

**SSOT-DC-105: PropFirmProfile**
- Source: Part 7, Section 32.7
- Owner: Compliance Engine (Prop Firm)
```python
@dataclass
class PropFirmProfile:
    firm_name: str
    phase: PropFirmPhase
    account_size: float
    max_daily_loss_pct: float
    max_daily_loss_abs: float
    max_total_drawdown_pct: float
    max_total_drawdown_abs: float
    drawdown_type: DrawdownType
    daily_loss_reset_time: str
    daily_loss_reset_tz: str
    profit_target_pct: float
    profit_target_abs: float
    min_trading_days: int
    max_position_size_lots: float
    max_open_positions: int
    allow_weekend_holding: bool
    allow_news_trading: bool
    news_blackout_minutes: int
    allow_overnight_holding: bool
    max_overnight_exposure_pct: float
    consistency_rule_enabled: bool
    max_daily_profit_pct_of_total: float
    min_profitable_days_pct: float
    scaling_profit_threshold: Optional[float]
    scaling_next_account_size: Optional[float]
```

**SSOT-DC-106: PropFirmState**
- Source: Part 7, Section 32.7
- Owner: Compliance Engine (Prop Firm)
```python
@dataclass
class PropFirmState:
    profile: PropFirmProfile
    current_equity: float
    starting_balance: float
    high_water_mark: float
    daily_start_equity: float
    daily_pnl: float
    daily_realized_pnl: float
    daily_unrealized_pnl: float
    daily_trade_count: int
    total_pnl: float
    total_drawdown: float
    trading_days_count: int
    profitable_days_count: int
    max_single_day_profit: float
    last_daily_reset: str
    account_start_date: str
```

---

### Category W: Distributed Tracing (Part 7)

**SSOT-DC-107: TracingConfig**
- Source: Part 7, Section 33
- Owner: Observability Framework
```python
@dataclass
class TracingConfig:
    service_name: str
    service_version: str
    backend: str
    endpoint: str
    sample_rate: float
    batch_export_schedule_ms: int
    max_export_batch_size: int
    max_queue_size: int
    enable_metrics: bool
    metrics_export_interval_ms: int
    propagation_format: str
    environment: str
```

<!-- END SSOT-DC-REGISTRY -->
<!-- Total dataclasses/enums registered: 107 (exceeds initial estimate of 96 due to thorough Parts 2-4 extraction) -->

---

<!-- BEGIN SSOT-EVT-REGISTRY -->

## SSOT-EVT-REGISTRY: Complete Event Type Registry

Total: 56 event types across Parts 1, 3, 6, and 7.

---

### Part 1 Core Events (19 events)

| ID | Event Name | Publisher | Subscribers | Payload Reference | Priority | TTL |
|----|-----------|-----------|-------------|-------------------|----------|-----|
| SSOT-EVT-001 | `market_brief` | Sentinel | Regime, Signal, Risk, Orchestrator | PreMarketWorksheet (DC-014) | P2 | Session |
| SSOT-EVT-002 | `session_change` | Sentinel | All Agents | `{phase, timestamp, instrument}` | P2 | Until next change |
| SSOT-EVT-003 | `crisis_alert` | Sentinel | All Agents | `{trigger, vix, spx_drop, correlation, spreads}` | P1 | Until resolved |
| SSOT-EVT-004 | `regime_classification` | Regime | Signal, Risk, Orchestrator | RegimeClassification (DC-013) | P2 | Until next classification |
| SSOT-EVT-005 | `regime_transition` | Regime | All Agents | `{instrument, old_regime, new_regime, confidence, bar_index}` | P1 | 24h |
| SSOT-EVT-006 | `cusum_alarm` | Regime | Signal, Orchestrator | `{instrument, alarm_type, bar_index, direction}` | P2 | Until next ensemble |
| SSOT-EVT-007 | `entry_proposal` | Signal | Risk | EntryProposal (DC-040) | P2 | ttl_bars |
| SSOT-EVT-008 | `pipeline_status` | Signal | Journal | `{instrument, bar_index, stages_passed, stages_failed, stage_details}` | P3 | 1h |
| SSOT-EVT-009 | `risk_approval` | Risk | Orchestrator | `{proposal_id, approved, position_size, risk_pct, heat_after, survival_score}` | P2 | 2 bars |
| SSOT-EVT-010 | `risk_veto` | Risk | Signal, Journal | `{proposal_id, reason, heat_pct, breaker_status}` | P2 | 1h |
| SSOT-EVT-011 | `circuit_breaker` | Risk | All Agents | `{type, trigger_value, action, timestamp}` | P1 | Until cleared |
| SSOT-EVT-012 | `human_decision` | Orchestrator | Signal, Execution, Journal | `{proposal_id, decision, modifications, response_time_ms}` | P2 | 2 bars |
| SSOT-EVT-013 | `workflow_phase` | Orchestrator | All Agents | `{phase, scheduled_actions, dependencies}` | P3 | Until next phase |
| SSOT-EVT-014 | `order_placed` | Execution | Risk, Journal | `{order_id, instrument, direction, size, price, order_type}` | P2 | Until fill/cancel |
| SSOT-EVT-015 | `order_filled` | Execution | Risk, Journal, Orchestrator | OrderResult (DC-042) | P2 | 24h |
| SSOT-EVT-016 | `position_update` | Execution | Risk, Journal, Orchestrator | `{position_id, instrument, phase, current_stop, current_r, state}` | P2 | Until next update |
| SSOT-EVT-017 | `stop_triggered` | Execution | Risk, Journal | `{position_id, instrument, stop_price, fill_price, phase, r_multiple}` | P1 | 24h |
| SSOT-EVT-018 | `trade_recorded` | Journal | Orchestrator | PCTTTradeRecord (DC-005) | P3 | Permanent |
| SSOT-EVT-019 | `edge_decay_alert` | Journal | Orchestrator, Risk | `{triggers_active, trigger_details, recommendation, consecutive_count}` | P1 | Until reset |

### Part 3 Events (4 events)

| ID | Event Name | Publisher | Subscribers | Payload Reference | Priority | TTL |
|----|-----------|-----------|-------------|-------------------|----------|-----|
| SSOT-EVT-020 | `watchlist_rebuilt` | Sentinel | Regime, Signal, Orchestrator | FinalWatchlist (DC-021) | P2 | Until next rebuild |
| SSOT-EVT-021 | `rotation_close_request` | Orchestrator | Execution, Journal, Risk | `{position_id, instrument, reason, replacement_instrument, replacement_direction, replacement_q_score}` | P2 | Until executed |
| SSOT-EVT-022 | `rotation_executed` | Execution | Orchestrator, Journal | `{closed_position_id, closed_instrument, closed_r, new_order_id}` | P2 | 24h |
| SSOT-EVT-023 | `position_stale` | Orchestrator | Journal | StalePositionCheck (DC-030) | P3 | Until rotation or close |

### Part 6 Calibration Events (7 events)

| ID | Event Name | Publisher | Subscribers | Payload Reference | Priority | TTL |
|----|-----------|-----------|-------------|-------------------|----------|-----|
| SSOT-EVT-024 | `calibration_started` | Calibration | Orchestrator, Journal | `{run_id, triggered_by, parameters_tuned}` | P2 | Until complete |
| SSOT-EVT-025 | `calibration_complete` | Calibration | Orchestrator | CalibrationRun (DC-059) | P2 | 24h |
| SSOT-EVT-026 | `calibration_approved` | Orchestrator | Calibration | `{run_id, approved_by}` | P2 | 1h |
| SSOT-EVT-027 | `calibration_rejected` | Orchestrator | Calibration, Journal | `{run_id, rejected_by, reason}` | P2 | 24h |
| SSOT-EVT-028 | `calibration_applied` | Calibration | All Agents | `{run_id, parameters, effective_at}` | P1 | Until rollback or next calibration |
| SSOT-EVT-029 | `calibration_rollback` | Calibration | All Agents | `{run_id, rolled_back_to, reason}` | P1 | 24h |
| SSOT-EVT-030 | `calibration_monitoring` | Calibration | Journal | `{run_id, trades_remaining, performance_vs_baseline}` | P3 | Until monitoring complete |

### Part 6 Research Events (6 events)

| ID | Event Name | Publisher | Subscribers | Payload Reference | Priority | TTL |
|----|-----------|-----------|-------------|-------------------|----------|-----|
| SSOT-EVT-031 | `research_brief_ready` | Research | Sentinel, Orchestrator | `{brief_id, summary, key_findings}` | P2 | Session |
| SSOT-EVT-032 | `research_alert` | Research | Sentinel, Risk, Orchestrator | ResearchFinding (DC-065) | P1 | Finding TTL |
| SSOT-EVT-033 | `earnings_result` | Research | Sentinel, Signal, Risk | `{instrument, eps_actual, revenue_actual, surprise_pct, reaction_direction}` | P1 | 24h |
| SSOT-EVT-034 | `sentiment_shift` | Research | Sentinel, Signal | SentimentSnapshot (DC-067) | P2 | 1h |
| SSOT-EVT-035 | `macro_event_published` | Research | Sentinel | `{event_type, actual, expected, deviation, impact}` | P1 | 4h |
| SSOT-EVT-036 | `research_eod_complete` | Research | Journal | `{findings_count, average_confidence, purged_count}` | P3 | 24h |

### Part 6 Strategy Events (8 events)

| ID | Event Name | Publisher | Subscribers | Payload Reference | Priority | TTL |
|----|-----------|-----------|-------------|-------------------|----------|-----|
| SSOT-EVT-037 | `strategy_hypothesis_created` | Strategy | Orchestrator, Journal | StrategyHypothesis (DC-069) | P3 | Until resolved |
| SSOT-EVT-038 | `strategy_backtest_complete` | Strategy | Orchestrator | BacktestResult (DC-070) | P2 | 24h |
| SSOT-EVT-039 | `strategy_comparison_ready` | Strategy | Orchestrator | VariantComparison (DC-071) | P2 | 24h |
| SSOT-EVT-040 | `strategy_approved` | Orchestrator | Strategy | `{hypothesis_id, approved_by}` | P2 | 1h |
| SSOT-EVT-041 | `strategy_rejected` | Orchestrator | Strategy, Journal | `{hypothesis_id, rejected_by, reason}` | P2 | 24h |
| SSOT-EVT-042 | `strategy_rollout_stage_complete` | Strategy | Orchestrator | RolloutState (DC-072) | P2 | Until next stage |
| SSOT-EVT-043 | `strategy_deployed` | Strategy | All Agents | `{hypothesis_id, version, effective_at}` | P1 | Permanent |
| SSOT-EVT-044 | `strategy_reverted` | Strategy | All Agents | `{hypothesis_id, reverted_to, reason}` | P1 | 24h |

### Part 6 Reconciliation Events (8 events)

| ID | Event Name | Publisher | Subscribers | Payload Reference | Priority | TTL |
|----|-----------|-----------|-------------|-------------------|----------|-----|
| SSOT-EVT-045 | `reconciliation_complete` | Reconciliation | Orchestrator, Journal | `{run_id, drifts_found, auto_corrected, escalated}` | P3 | 24h |
| SSOT-EVT-046 | `reconciliation_auto_corrected` | Reconciliation | Journal | DriftRecord (DC-077) | P2 | 24h |
| SSOT-EVT-047 | `reconciliation_major_drift` | Reconciliation | Orchestrator, Risk | DriftRecord (DC-077) | P1 | Until resolved |
| SSOT-EVT-048 | `reconciliation_missing_position` | Reconciliation | Orchestrator, Risk | `{instrument, system_qty, broker_qty, source}` | P1 | Until resolved |
| SSOT-EVT-049 | `reconciliation_phantom_position` | Reconciliation | Orchestrator, Risk | `{instrument, broker_qty, source}` | P1 | Until resolved |
| SSOT-EVT-050 | `broker_health_degraded` | Reconciliation | Orchestrator | BrokerHealthMetrics (DC-078) | P2 | Until recovered |
| SSOT-EVT-051 | `broker_health_critical` | Reconciliation | All Agents | BrokerHealthMetrics (DC-078) | P1 | Until recovered |
| SSOT-EVT-052 | `reconciliation_systematic_issue` | Reconciliation | Orchestrator | `{issue_type, pattern, affected_instruments, recommendation}` | P1 | Until resolved |

### Part 7 Margin Events (4 events)

| ID | Event Name | Publisher | Subscribers | Payload Reference | Priority | TTL |
|----|-----------|-----------|-------------|-------------------|----------|-----|
| SSOT-EVT-053 | `margin_tier_change` | Risk (Margin Monitor) | Orchestrator, Journal | AggregateMargin (DC-092) | P1 | Until next change |
| SSOT-EVT-054 | `margin_stress_update` | Risk (Margin Monitor) | Risk, Orchestrator | LiquidationRisk (DC-094) | P2 | 15min |
| SSOT-EVT-055 | `margin_call_warning` | Risk (Margin Monitor) | All Agents | `{margin_ratio, call_amount, positions_at_risk}` | P1 | Until resolved |
| SSOT-EVT-056 | `liquidation_imminent` | Risk (Margin Monitor) | All Agents | `{instrument, distance_pct, projected_price}` | P1 | Until resolved |

<!-- END SSOT-EVT-REGISTRY -->
<!-- Total events registered: 56 -->

---

<!-- BEGIN SSOT-TOOL-REGISTRY -->

## SSOT-TOOL-REGISTRY: Complete Tool Registry

Total: 127 tools across 11 agents.

---

### Sentinel Agent Tools (18 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-001 | `fetch_ohlcv` | data | READ | 5000 | true | 120/min |
| SSOT-TOOL-002 | `fetch_vix` | data | READ | 5000 | true | 60/min |
| SSOT-TOOL-003 | `fetch_calendar` | data | READ | 5000 | true | 30/min |
| SSOT-TOOL-004 | `fetch_news` | data | READ | 5000 | true | 30/min |
| SSOT-TOOL-005 | `compute_overnight_gap` | compute | READ | 2000 | true | 60/min |
| SSOT-TOOL-006 | `check_session_time` | compute | READ | 1000 | true | 120/min |
| SSOT-TOOL-007 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-008 | `read_memory` | system | READ | 1000 | true | 120/min |
| SSOT-TOOL-009 | `write_memory` | system | WRITE | 1000 | true | 120/min |
| SSOT-TOOL-010 | `load_master_universe` | universe | READ | 10000 | true | 5/min |
| SSOT-TOOL-011 | `screen_liquidity_batch` | universe | READ | 30000 | true | 5/min |
| SSOT-TOOL-012 | `compute_suitability_batch` | universe | READ | 60000 | true | 5/min |
| SSOT-TOOL-013 | `request_regime_batch` | universe | READ | 60000 | true | 5/min |
| SSOT-TOOL-014 | `build_watchlist` | universe | WRITE | 10000 | true | 10/min |
| SSOT-TOOL-015 | `apply_human_override` | universe | WRITE | 2000 | false | 10/min |
| SSOT-TOOL-016 | `get_instrument_profile` | universe | READ | 2000 | true | 60/min |
| SSOT-TOOL-017 | `publish_watchlist` | universe | EXECUTE | 5000 | true | 10/min |
| SSOT-TOOL-018 | `log_universe_stats` | universe | WRITE | 2000 | true | 10/min |

**Input/Output Summary:**
- `fetch_ohlcv`: Input: `{instrument, timeframe, count}`. Output: `List[OHLCVBar]`
- `fetch_vix`: Input: `{}`. Output: `{vix_level, vix_direction, term_structure}`
- `fetch_calendar`: Input: `{date}`. Output: `List[{event, time, tier, expected_impact}]`
- `fetch_news`: Input: `{instruments, lookback_hours}`. Output: `List[{headline, sentiment, source}]`
- `compute_overnight_gap`: Input: `{instrument, prev_close, current_open}`. Output: `{gap_pct, classification}`
- `check_session_time`: Input: `{}`. Output: `{phase, minutes_until_next_phase}`
- `load_master_universe`: Input: `{config_path}`. Output: `List[str]` (instrument symbols)
- `screen_liquidity_batch`: Input: `{instruments, market_data}`. Output: `List[LiquidityScreenResult]`
- `compute_suitability_batch`: Input: `{instruments, price_data, atr_data}`. Output: `List[PCTTSuitabilityScore]`
- `request_regime_batch`: Input: `{instruments}`. Output: `Dict[str, RegimeClassification]`
- `build_watchlist`: Input: `{scores, regimes, config}`. Output: `FinalWatchlist`
- `apply_human_override`: Input: `{instrument, action, reason}`. Output: Updated watchlist
- `get_instrument_profile`: Input: `{instrument}`. Output: `InstrumentProfile`
- `publish_watchlist`: Input: `{watchlist}`. Output: Confirmation
- `log_universe_stats`: Input: `{stage_counts}`. Output: Confirmation

---

### Regime Agent Tools (10 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-019 | `compute_efficiency_ratio` | compute | READ | 2000 | true | 120/min |
| SSOT-TOOL-020 | `compute_crossing_count` | compute | READ | 2000 | true | 120/min |
| SSOT-TOOL-021 | `compute_hurst_exponent` | compute | READ | 5000 | true | 60/min |
| SSOT-TOOL-022 | `compute_kalman_slope` | compute | READ | 3000 | true | 120/min |
| SSOT-TOOL-023 | `compute_cusum` | compute | READ | 2000 | true | 120/min |
| SSOT-TOOL-024 | `compute_volatility_regime` | compute | READ | 2000 | true | 120/min |
| SSOT-TOOL-025 | `run_ensemble` | compute | READ | 5000 | true | 60/min |
| SSOT-TOOL-026 | `get_regime_parameters` | config | READ | 1000 | true | 60/min |
| SSOT-TOOL-027 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-028 | `classify_regime_batch` | compute | READ | 30000 | true | 10/min |

**Input/Output Summary:**
- `compute_efficiency_ratio`: Input: `{prices, period}`. Output: `{er_value}`
- `compute_crossing_count`: Input: `{prices, sma_period}`. Output: `{crossing_count, regime_vote}`
- `compute_hurst_exponent`: Input: `{prices, max_lag}`. Output: `{hurst, regime_vote}`
- `compute_kalman_slope`: Input: `{prices}`. Output: `{slope, direction, regime_vote}`
- `compute_cusum`: Input: `{prices, threshold}`. Output: `{alarm, location, direction}`
- `compute_volatility_regime`: Input: `{prices, atr_series}`. Output: `{vol_regime, regime_vote}`
- `run_ensemble`: Input: `{instrument, timeframe}`. Output: `RegimeClassification`
- `get_regime_parameters`: Input: `{regime}`. Output: `{parameter_overrides}`
- `classify_regime_batch`: Input: `{instruments, timeframe}`. Output: `Dict[str, RegimeClassification]`

---

### Signal Agent Tools (13 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-029 | `detect_pivots` | pipeline | READ | 3000 | true | 120/min |
| SSOT-TOOL-030 | `generate_candidates` | pipeline | READ | 5000 | true | 60/min |
| SSOT-TOOL-031 | `fit_huber` | pipeline | READ | 5000 | true | 60/min |
| SSOT-TOOL-032 | `fit_ransac` | pipeline | READ | 5000 | true | 60/min |
| SSOT-TOOL-033 | `calculate_q_score` | pipeline | READ | 2000 | true | 120/min |
| SSOT-TOOL-034 | `grade_setup` | pipeline | READ | 1000 | true | 120/min |
| SSOT-TOOL-035 | `check_macro_gate` | pipeline | READ | 2000 | true | 120/min |
| SSOT-TOOL-036 | `detect_break` | pipeline | READ | 3000 | true | 120/min |
| SSOT-TOOL-037 | `freeze_lines` | pipeline | WRITE | 2000 | false | 60/min |
| SSOT-TOOL-038 | `detect_retest` | pipeline | READ | 2000 | true | 120/min |
| SSOT-TOOL-039 | `score_rejection` | pipeline | READ | 2000 | true | 120/min |
| SSOT-TOOL-040 | `risk_geometry` | pipeline | READ | 2000 | true | 120/min |
| SSOT-TOOL-041 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |

**Input/Output Summary:**
- `detect_pivots`: Input: `{bars, left, right, atr}`. Output: `List[Pivot]`
- `generate_candidates`: Input: `{pivots, min_touches}`. Output: `List[CandidateLine]`
- `fit_huber`: Input: `{pivot_points}`. Output: `{slope, intercept, residuals}`
- `fit_ransac`: Input: `{pivot_points}`. Output: `{slope, intercept, inlier_mask}`
- `calculate_q_score`: Input: `{line, bars}`. Output: `{q_score, components}`
- `grade_setup`: Input: `{q_score}`. Output: `{grade}` (A, B, or None)
- `check_macro_gate`: Input: `{direction, instrument}`. Output: `{passed, htf_direction}`
- `detect_break`: Input: `{bars, line}`. Output: `{break_confirmed, break_bar, momentum}`
- `freeze_lines`: Input: `{line, break_event}`. Output: `FrozenStructure`
- `detect_retest`: Input: `{bars, frozen_structure}`. Output: `{retest_detected, bar_index}`
- `score_rejection`: Input: `{bar, frozen_structure}`. Output: `{score, features}`
- `risk_geometry`: Input: `{entry, stop, atr}`. Output: `{d_geom, passed}`

---

### Risk Agent Tools (10 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-042 | `calculate_position_size` | risk | READ | 2000 | true | 60/min |
| SSOT-TOOL-043 | `compute_drawdown_scale` | risk | READ | 1000 | true | 120/min |
| SSOT-TOOL-044 | `compute_portfolio_heat` | risk | READ | 2000 | true | 120/min |
| SSOT-TOOL-045 | `check_correlation` | risk | READ | 3000 | true | 60/min |
| SSOT-TOOL-046 | `compute_survival_score` | risk | READ | 2000 | true | 60/min |
| SSOT-TOOL-047 | `check_circuit_breakers` | risk | READ | 1000 | true | 120/min |
| SSOT-TOOL-048 | `kelly_criterion` | risk | READ | 1000 | true | 120/min |
| SSOT-TOOL-049 | `compute_ruin_probability` | risk | READ | 3000 | true | 30/min |
| SSOT-TOOL-050 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-051 | `check_asset_allocation` | risk | READ | 2000 | true | 60/min |

**Input/Output Summary:**
- `calculate_position_size`: Input: `{equity, risk_pct, entry, stop, grade, regime, drawdown_scale}`. Output: `{shares, dollar_risk, risk_pct_actual}`
- `compute_drawdown_scale`: Input: `{equity, peak_equity}`. Output: `{drawdown_pct, scale_factor}`
- `compute_portfolio_heat`: Input: `{open_positions}`. Output: `{heat_pct, heat_by_position}`
- `check_correlation`: Input: `{new_instrument, existing_positions, correlation_matrix}`. Output: `{approved, correlated_count, correlated_instruments}`
- `compute_survival_score`: Input: `{equity, drawdown, heat, consecutive_losses, edge_metrics}`. Output: `{score, components}`
- `check_circuit_breakers`: Input: `{daily_pnl, consecutive_losses, drawdown}`. Output: `{any_active, active_breakers}`
- `kelly_criterion`: Input: `{win_rate, payoff_ratio}`. Output: `{kelly_fraction, half_kelly, quarter_kelly}`
- `compute_ruin_probability`: Input: `{win_rate, payoff_ratio, risk_per_trade}`. Output: `{ruin_probability, safe_fraction}`
- `check_asset_allocation`: Input: `{instrument, asset_class, proposed_risk, total_equity, current_allocation, target_allocation}`. Output: `{approved, headroom}`

---

### Orchestrator Agent Tools (11 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-052 | `present_approval_request` | workflow | EXECUTE | 5000 | false | 30/min |
| SSOT-TOOL-053 | `notify_human` | workflow | EXECUTE | 5000 | true | 30/min |
| SSOT-TOOL-054 | `log_conflict` | workflow | WRITE | 2000 | true | 60/min |
| SSOT-TOOL-055 | `schedule_workflow` | workflow | WRITE | 2000 | true | 30/min |
| SSOT-TOOL-056 | `change_system_mode` | admin | ADMIN | 5000 | false | 5/min |
| SSOT-TOOL-057 | `run_rotation_check` | workflow | EXECUTE | 10000 | true | 10/min |
| SSOT-TOOL-058 | `broadcast_event` | system | EXECUTE | 2000 | true | 30/min |
| SSOT-TOOL-059 | `read_all_agent_states` | system | READ | 5000 | true | 30/min |
| SSOT-TOOL-060 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-061 | `read_memory` | system | READ | 1000 | true | 120/min |
| SSOT-TOOL-062 | `write_memory` | system | WRITE | 1000 | true | 120/min |

**Input/Output Summary:**
- `present_approval_request`: Input: `{gate_type, proposal, risk_assessment, context}`. Output: `{request_id, status, expires_at}`
- `notify_human`: Input: `{notification_type, message, priority, channels}`. Output: `{delivered, channel_results}`
- `log_conflict`: Input: `{agent_a, agent_b, conflict_type, details, resolution}`. Output: `{conflict_id, logged}`
- `schedule_workflow`: Input: `{phase_name, scheduled_time, dependencies}`. Output: `{schedule_id, confirmed}`
- `change_system_mode`: Input: `{target_mode, reason, human_confirmed}`. Output: `{success, old_mode, new_mode, effective_at}`
- `run_rotation_check`: Input: `{force}`. Output: `{rotation_candidates, best_opportunity, recommendation}`
- `broadcast_event`: Input: `{event_type, payload, priority}`. Output: `{event_id, delivered_to}`
- `read_all_agent_states`: Input: None. Output: `{agent_states, system_health, active_conflicts}`

---

### Execution Agent Tools (10 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-063 | `place_order` | execution | EXECUTE | 10000 | false | 30/min |
| SSOT-TOOL-064 | `cancel_order` | execution | EXECUTE | 5000 | true | 30/min |
| SSOT-TOOL-065 | `modify_order` | execution | EXECUTE | 5000 | true | 30/min |
| SSOT-TOOL-066 | `get_position` | execution | READ | 2000 | true | 60/min |
| SSOT-TOOL-067 | `get_fills` | execution | READ | 2000 | true | 60/min |
| SSOT-TOOL-068 | `compute_trailing_stop` | compute | READ | 1000 | true | 120/min |
| SSOT-TOOL-069 | `check_fail_fast` | compute | READ | 1000 | true | 120/min |
| SSOT-TOOL-070 | `check_stagnation` | compute | READ | 1000 | true | 120/min |
| SSOT-TOOL-071 | `execute_partial_exit` | execution | EXECUTE | 10000 | false | 10/min |
| SSOT-TOOL-072 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |

**Input/Output Summary:**
- `place_order`: Input: `{instrument, direction, size, order_type, limit_price, stop_price}`. Output: `OrderResult`
- `cancel_order`: Input: `{order_id}`. Output: `{cancelled, reason}`
- `modify_order`: Input: `{order_id, modifications}`. Output: `OrderResult`
- `get_position`: Input: `{instrument}`. Output: `{position_details}`
- `get_fills`: Input: `{order_id}`. Output: `List[{fill_price, fill_size, timestamp}]`
- `compute_trailing_stop`: Input: `{position, current_bar, phase}`. Output: `{new_stop, phase_change}`
- `check_fail_fast`: Input: `{position, bars_since_entry, regime}`. Output: `{triggered, reason}`
- `check_stagnation`: Input: `{position, bars_since_last_extreme}`. Output: `{stagnant, bars_count}`
- `execute_partial_exit`: Input: `{position_id, pct_to_close, reason}`. Output: `OrderResult`

---

### Journal Agent Tools (11 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-073 | `append_trade_record` | journal | WRITE | 5000 | true | 30/min |
| SSOT-TOOL-074 | `compute_rolling_metrics` | compute | READ | 5000 | true | 30/min |
| SSOT-TOOL-075 | `generate_daily_report` | journal | WRITE | 30000 | true | 5/min |
| SSOT-TOOL-076 | `generate_weekly_report` | journal | WRITE | 60000 | true | 2/min |
| SSOT-TOOL-077 | `detect_edge_decay` | compute | READ | 5000 | true | 30/min |
| SSOT-TOOL-078 | `compute_instrument_performance` | compute | READ | 5000 | true | 30/min |
| SSOT-TOOL-079 | `compute_rotation_metrics` | compute | READ | 5000 | true | 30/min |
| SSOT-TOOL-080 | `compute_mode_statistics` | compute | READ | 5000 | true | 30/min |
| SSOT-TOOL-081 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-082 | `read_memory` | system | READ | 1000 | true | 120/min |
| SSOT-TOOL-083 | `write_memory` | system | WRITE | 1000 | true | 120/min |

**Input/Output Summary:**
- `append_trade_record`: Input: `PCTTTradeRecord`. Output: `{record_id, validated, warnings}`
- `compute_rolling_metrics`: Input: `{window_size}`. Output: `RollingMetrics` (including KellyInputs)
- `generate_daily_report`: Input: `{date}`. Output: `DailyReport`
- `generate_weekly_report`: Input: `{week_ending}`. Output: `WeeklyReport`
- `detect_edge_decay`: Input: `{lookback_trades}`. Output: `{triggers_active, trigger_details, recommendation}`
- `compute_instrument_performance`: Input: `{instrument}`. Output: `InstrumentPerformance`
- `compute_rotation_metrics`: Input: `{rotation_records}`. Output: `RotationMetrics`
- `compute_mode_statistics`: Input: `{mode}`. Output: `ModeStatistics`

---

### Calibration Agent Tools (10 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-084 | `create_data_windows` | calibration | READ | 5000 | true | 10/min |
| SSOT-TOOL-085 | `define_search_space` | calibration | READ | 2000 | true | 10/min |
| SSOT-TOOL-086 | `run_walk_forward` | calibration | EXECUTE | 300000 | false | 2/min |
| SSOT-TOOL-087 | `run_significance_test` | calibration | READ | 30000 | true | 5/min |
| SSOT-TOOL-088 | `snapshot_parameters` | calibration | WRITE | 2000 | true | 10/min |
| SSOT-TOOL-089 | `apply_parameters` | calibration | ADMIN | 5000 | false | 5/min |
| SSOT-TOOL-090 | `rollback_parameters` | calibration | ADMIN | 5000 | false | 5/min |
| SSOT-TOOL-091 | `monitor_post_calibration` | calibration | READ | 5000 | true | 30/min |
| SSOT-TOOL-092 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-093 | `read_memory` | system | READ | 1000 | true | 120/min |

**Input/Output Summary:**
- `create_data_windows`: Input: `{anchor_date, train_pct, validate_pct, test_pct}`. Output: `DataWindow`
- `define_search_space`: Input: `{parameters, constraints}`. Output: `List[ParameterSearchSpace]`
- `run_walk_forward`: Input: `{data_window, search_space, objective}`. Output: `CalibrationRun`
- `run_significance_test`: Input: `{current_returns, proposed_returns, n_bootstrap}`. Output: `SignificanceTestResult`
- `snapshot_parameters`: Input: `{parameters, regime}`. Output: `ParameterSnapshot`
- `apply_parameters`: Input: `{run_id, parameters}`. Output: `{applied, effective_at}`
- `rollback_parameters`: Input: `{run_id, rollback_to}`. Output: `{rolled_back, parameters}`
- `monitor_post_calibration`: Input: `{run_id}`. Output: `{trades_remaining, performance_vs_baseline}`

---

### Research Agent Tools (12 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-094 | `fetch_news_feed` | research | READ | 10000 | true | 30/min |
| SSOT-TOOL-095 | `fetch_earnings_calendar` | research | READ | 10000 | true | 10/min |
| SSOT-TOOL-096 | `fetch_economic_calendar` | research | READ | 10000 | true | 10/min |
| SSOT-TOOL-097 | `analyze_sentiment` | research | READ | 15000 | true | 20/min |
| SSOT-TOOL-098 | `score_finding_confidence` | research | READ | 2000 | true | 60/min |
| SSOT-TOOL-099 | `create_research_brief` | research | WRITE | 30000 | true | 5/min |
| SSOT-TOOL-100 | `check_earnings_surprise` | research | READ | 5000 | true | 30/min |
| SSOT-TOOL-101 | `detect_macro_event` | research | READ | 5000 | true | 30/min |
| SSOT-TOOL-102 | `purge_stale_findings` | research | WRITE | 5000 | true | 10/min |
| SSOT-TOOL-103 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-104 | `read_memory` | system | READ | 1000 | true | 120/min |
| SSOT-TOOL-105 | `write_memory` | system | WRITE | 1000 | true | 120/min |

**Input/Output Summary:**
- `fetch_news_feed`: Input: `{instruments, sources, lookback_hours}`. Output: `List[ResearchFinding]`
- `fetch_earnings_calendar`: Input: `{date_range, instruments}`. Output: `List[EarningsCalendarEntry]`
- `fetch_economic_calendar`: Input: `{date_range}`. Output: `List[{event, time, expected, actual}]`
- `analyze_sentiment`: Input: `{instrument, sources}`. Output: `SentimentSnapshot`
- `score_finding_confidence`: Input: `{finding}`. Output: `{confidence, source_weight, freshness_multiplier}`
- `create_research_brief`: Input: `{findings, sentiment, calendar}`. Output: `{brief_id, summary}`
- `check_earnings_surprise`: Input: `{instrument, actual_eps, consensus_eps}`. Output: `{surprise_pct, reaction}`
- `detect_macro_event`: Input: `{economic_data}`. Output: `{event_type, impact, deviation}`
- `purge_stale_findings`: Input: `{max_age_hours}`. Output: `{purged_count}`

---

### Strategy Agent Tools (10 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-106 | `create_hypothesis` | strategy | WRITE | 5000 | true | 10/min |
| SSOT-TOOL-107 | `run_backtest` | strategy | EXECUTE | 300000 | false | 2/min |
| SSOT-TOOL-108 | `compare_variants` | strategy | READ | 60000 | true | 5/min |
| SSOT-TOOL-109 | `start_rollout` | strategy | EXECUTE | 5000 | false | 5/min |
| SSOT-TOOL-110 | `advance_rollout_stage` | strategy | EXECUTE | 5000 | false | 5/min |
| SSOT-TOOL-111 | `revert_strategy` | strategy | ADMIN | 5000 | false | 5/min |
| SSOT-TOOL-112 | `deploy_strategy` | strategy | ADMIN | 10000 | false | 2/min |
| SSOT-TOOL-113 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-114 | `read_memory` | system | READ | 1000 | true | 120/min |
| SSOT-TOOL-115 | `write_memory` | system | WRITE | 1000 | true | 120/min |

**Input/Output Summary:**
- `create_hypothesis`: Input: `{description, modification_type, modification_detail}`. Output: `StrategyHypothesis`
- `run_backtest`: Input: `{hypothesis_id, data_range, variant}`. Output: `BacktestResult`
- `compare_variants`: Input: `{current_result, proposed_result, n_permutations}`. Output: `VariantComparison`
- `start_rollout`: Input: `{hypothesis_id, stage_configs}`. Output: `RolloutState`
- `advance_rollout_stage`: Input: `{hypothesis_id}`. Output: `RolloutState`
- `revert_strategy`: Input: `{hypothesis_id, reason}`. Output: `{reverted, reverted_to}`
- `deploy_strategy`: Input: `{hypothesis_id}`. Output: `{deployed, version, effective_at}`

---

### Reconciliation Agent Tools (12 tools)

| ID | Tool Name | Category | Permission | Timeout (ms) | Retryable | Rate Limit |
|----|-----------|----------|------------|-------------|-----------|------------|
| SSOT-TOOL-116 | `fetch_broker_positions` | reconciliation | READ | 10000 | true | 30/min |
| SSOT-TOOL-117 | `fetch_broker_balances` | reconciliation | READ | 10000 | true | 30/min |
| SSOT-TOOL-118 | `fetch_system_positions` | reconciliation | READ | 2000 | true | 60/min |
| SSOT-TOOL-119 | `fetch_system_balances` | reconciliation | READ | 2000 | true | 60/min |
| SSOT-TOOL-120 | `compare_positions` | reconciliation | READ | 5000 | true | 30/min |
| SSOT-TOOL-121 | `compare_balances` | reconciliation | READ | 5000 | true | 30/min |
| SSOT-TOOL-122 | `auto_correct_drift` | reconciliation | EXECUTE | 10000 | false | 10/min |
| SSOT-TOOL-123 | `escalate_drift` | reconciliation | EXECUTE | 5000 | true | 10/min |
| SSOT-TOOL-124 | `check_broker_health` | reconciliation | READ | 5000 | true | 30/min |
| SSOT-TOOL-125 | `publish_event` | system | EXECUTE | 2000 | true | 120/min |
| SSOT-TOOL-126 | `read_memory` | system | READ | 1000 | true | 120/min |
| SSOT-TOOL-127 | `write_memory` | system | WRITE | 1000 | true | 120/min |

**Input/Output Summary:**
- `fetch_broker_positions`: Input: `{}`. Output: `List[PositionRecord]`
- `fetch_broker_balances`: Input: `{}`. Output: `BalanceRecord`
- `fetch_system_positions`: Input: `{}`. Output: `List[PositionRecord]`
- `fetch_system_balances`: Input: `{}`. Output: `BalanceRecord`
- `compare_positions`: Input: `{system_positions, broker_positions}`. Output: `List[DriftRecord]`
- `compare_balances`: Input: `{system_balance, broker_balance}`. Output: `{matched, differences}`
- `auto_correct_drift`: Input: `{drift_record}`. Output: `{corrected, action_taken}`
- `escalate_drift`: Input: `{drift_record, severity}`. Output: `{escalated, notification_sent}`
- `check_broker_health`: Input: `{window_minutes}`. Output: `BrokerHealthMetrics`

<!-- END SSOT-TOOL-REGISTRY -->
<!-- Total tools registered: 127 -->

---

## Summary

| Registry | Count |
|----------|-------|
| Dataclasses and Enums (SSOT-DC) | 107 |
| Event Types (SSOT-EVT) | 56 |
| Tools (SSOT-TOOL) | 127 |
| **Total Registry Entries** | **290** |

**Source Architecture Parts Referenced:**
- Part 1: Core 7 agents, memory structures, events, shared infrastructure
- Part 2: Daily workflow, data models, guardrails, observability
- Part 3: Universe selection, operating modes, instrument rotation
- Part 4: QA fixes, visualization, platform abstraction, coverage matrix
- Part 5: UI/UX, WebSocket protocol, layout configuration
- Part 6: BaseAgent framework, Calibration, Research, Strategy, Reconciliation agents
- Part 7: Tool permissions, margin monitoring, compliance engine, prop firm, tracing

**Notes:**
- Dataclass count (107) exceeds initial estimate (82-96) because Parts 2-4 contained additional dataclasses not captured in the Part 7 summary tally (which only counted 42 from Parts 1-4 and 40 from Parts 5-7). The thorough extraction identified 43 from Parts 1-4, 6 from Part 5, 32 from Part 6, and 26 from Part 7.
- Event count (56) exceeds initial estimate (52) due to 4 events from Part 3 (watchlist_rebuilt, rotation_close_request, rotation_executed, position_stale) not included in the Part 7 tally.
- Tool count matches the confirmed 127 across 11 agents.
- All `publish_event`, `read_memory`, and `write_memory` tools are duplicated per agent as each agent maintains its own tool instance, but they map to the same underlying system infrastructure.
