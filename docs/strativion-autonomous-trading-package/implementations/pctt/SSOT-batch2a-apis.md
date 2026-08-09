# SSOT Batch 2a-APIs: Database Schemas and API Specifications

**Generated:** 2026-02-23
**Source:** Architecture Parts 1, 4, 5, 6, 7
**Scope:** SSOT-DB-01 through DB-04, SSOT-API-WS-01, SSOT-API-REST-01, SSOT-API-BROKER-01/02, SSOT-API-DATA-01

---

<!-- SSOT-DB-01 -->
## SSOT-DB-01: PostgreSQL Schema (Cold Tier)

PostgreSQL serves as the cold storage tier for all persistent data. Access latency target: under 100ms. All tables use `TIMESTAMPTZ` for timezone-aware timestamps. All monetary values use `NUMERIC(14,4)` for precision. All percentage values use `NUMERIC(8,6)` stored as decimals (e.g., 0.0125 for 1.25%).

---

### Table: `trades`

Stores every completed PCTTTradeRecord. Append-only. One row per trade. Maps directly to the PCTTTradeRecord dataclass (SSOT-DC-005).

```sql
CREATE TABLE trades (
    trade_id            TEXT PRIMARY KEY,
    entry_time          TIMESTAMPTZ NOT NULL,
    entry_price         NUMERIC(14,4) NOT NULL,
    direction           TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    instrument          TEXT NOT NULL,
    timeframe           TEXT NOT NULL,
    q_score             NUMERIC(6,4) NOT NULL,
    rejection_score     INTEGER NOT NULL CHECK (rejection_score BETWEEN 0 AND 4),
    regime              TEXT NOT NULL CHECK (regime IN ('TRENDING', 'VOLATILE', 'MEAN_REVERTING', 'CHOPPY')),
    d_geom              NUMERIC(6,4) NOT NULL,
    grade               TEXT NOT NULL CHECK (grade IN ('A', 'B')),
    position_size       NUMERIC(14,4) NOT NULL,
    risk_per_share      NUMERIC(14,4) NOT NULL,
    initial_stop        NUMERIC(14,4) NOT NULL,
    action_line_value   NUMERIC(14,4) NOT NULL,
    safety_line_value   NUMERIC(14,4) NOT NULL,
    trailing_phases     JSONB NOT NULL DEFAULT '[]',
    partial_exits       JSONB NOT NULL DEFAULT '[]',
    fail_fast_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    max_favorable_excursion NUMERIC(14,4) NOT NULL DEFAULT 0,
    max_adverse_excursion   NUMERIC(14,4) NOT NULL DEFAULT 0,
    exit_time           TIMESTAMPTZ,
    exit_price          NUMERIC(14,4),
    exit_reason         TEXT,
    r_multiple          NUMERIC(8,4),
    duration_bars       INTEGER,
    realized_pnl        NUMERIC(14,4),
    commission          NUMERIC(14,4) DEFAULT 0,
    macro_gate_result   TEXT,
    confluence_score    NUMERIC(6,4),
    entry_regime        TEXT,
    exit_regime         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_instrument ON trades(instrument);
CREATE INDEX idx_trades_entry_time ON trades(entry_time);
CREATE INDEX idx_trades_exit_time ON trades(exit_time);
CREATE INDEX idx_trades_direction ON trades(direction);
CREATE INDEX idx_trades_grade ON trades(grade);
CREATE INDEX idx_trades_regime ON trades(regime);
CREATE INDEX idx_trades_r_multiple ON trades(r_multiple);
CREATE INDEX idx_trades_instrument_time ON trades(instrument, entry_time);
```

| Column | Type | Nullable | Default | Constraints | Index | Description |
|--------|------|----------|---------|-------------|-------|-------------|
| trade_id | TEXT | No | | PRIMARY KEY | PK | Unique trade identifier (UUID) |
| entry_time | TIMESTAMPTZ | No | | | Yes | Timestamp of trade entry |
| entry_price | NUMERIC(14,4) | No | | | | Fill price at entry |
| direction | TEXT | No | | CHECK IN ('LONG','SHORT') | Yes | Trade direction |
| instrument | TEXT | No | | | Yes | Ticker symbol (e.g., AAPL, NVDA) |
| timeframe | TEXT | No | | | | Bar timeframe (1m, 5m, 15m, 1h, 4h, D, W) |
| q_score | NUMERIC(6,4) | No | | | | Quality score from boundary estimation (0.0 to 1.0) |
| rejection_score | INTEGER | No | | CHECK 0 to 4 | | 4-feature rejection score |
| regime | TEXT | No | | CHECK enum | Yes | Market regime at entry |
| d_geom | NUMERIC(6,4) | No | | | | Risk geometry distance in ATR units |
| grade | TEXT | No | | CHECK IN ('A','B') | Yes | Setup grade |
| position_size | NUMERIC(14,4) | No | | | | Number of shares/contracts |
| risk_per_share | NUMERIC(14,4) | No | | | | Dollar risk per share |
| initial_stop | NUMERIC(14,4) | No | | | | Initial stop price |
| action_line_value | NUMERIC(14,4) | No | | | | Frozen Action Line value at entry |
| safety_line_value | NUMERIC(14,4) | No | | | | Frozen Safety Line value at entry |
| trailing_phases | JSONB | No | '[]' | | | Array of phase transitions with timestamps |
| partial_exits | JSONB | No | '[]' | | | Array of partial exit records |
| fail_fast_triggered | BOOLEAN | No | FALSE | | | Whether fail-fast exit was triggered |
| max_favorable_excursion | NUMERIC(14,4) | No | 0 | | | Maximum unrealized profit during trade (MFE) |
| max_adverse_excursion | NUMERIC(14,4) | No | 0 | | | Maximum unrealized loss during trade (MAE) |
| exit_time | TIMESTAMPTZ | Yes | | | Yes | Timestamp of trade exit |
| exit_price | NUMERIC(14,4) | Yes | | | | Fill price at exit |
| exit_reason | TEXT | Yes | | | | Why the trade was closed |
| r_multiple | NUMERIC(8,4) | Yes | | | Yes | Profit/loss in R units |
| duration_bars | INTEGER | Yes | | | | Number of bars trade was open |
| realized_pnl | NUMERIC(14,4) | Yes | | | | Dollar P&L after commissions |
| commission | NUMERIC(14,4) | Yes | 0 | | | Total commissions paid |
| macro_gate_result | TEXT | Yes | | | | HTF macro gate pass/fail result |
| confluence_score | NUMERIC(6,4) | Yes | | | | Multi-timeframe confluence score |
| entry_regime | TEXT | Yes | | | | Regime at entry (may differ from `regime` if transition) |
| exit_regime | TEXT | Yes | | | | Regime at exit |
| created_at | TIMESTAMPTZ | No | NOW() | | | Row creation timestamp |
| updated_at | TIMESTAMPTZ | No | NOW() | | | Row last update timestamp |

---

### Table: `daily_metrics`

One row per trading day. Computed by the Journal agent during post-market phase.

```sql
CREATE TABLE daily_metrics (
    date                TEXT PRIMARY KEY,
    equity_open         NUMERIC(14,4) NOT NULL,
    equity_close        NUMERIC(14,4) NOT NULL,
    daily_pnl           NUMERIC(14,4) NOT NULL,
    daily_pnl_pct       NUMERIC(8,6) NOT NULL,
    trades_taken        INTEGER NOT NULL DEFAULT 0,
    wins                INTEGER NOT NULL DEFAULT 0,
    losses              INTEGER NOT NULL DEFAULT 0,
    win_rate            NUMERIC(8,6),
    avg_r_multiple      NUMERIC(8,4),
    total_r             NUMERIC(8,4),
    expectancy          NUMERIC(8,4),
    profit_factor       NUMERIC(8,4),
    max_drawdown_pct    NUMERIC(8,6) NOT NULL DEFAULT 0,
    max_drawdown_dollar NUMERIC(14,4) NOT NULL DEFAULT 0,
    peak_heat_pct       NUMERIC(8,6) NOT NULL DEFAULT 0,
    avg_heat_pct        NUMERIC(8,6) NOT NULL DEFAULT 0,
    regime_distribution JSONB NOT NULL DEFAULT '{}',
    sharpe_daily        NUMERIC(8,4),
    sortino_daily       NUMERIC(8,4),
    commissions_total   NUMERIC(14,4) NOT NULL DEFAULT 0,
    slippage_avg        NUMERIC(14,4),
    circuit_breaker_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    edge_decay_triggers INTEGER NOT NULL DEFAULT 0,
    system_mode         TEXT NOT NULL DEFAULT 'SUPERVISED',
    one_sentence_summary TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_daily_metrics_pnl ON daily_metrics(daily_pnl);
CREATE INDEX idx_daily_metrics_mode ON daily_metrics(system_mode);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| date | TEXT | No | | Trading date (YYYY-MM-DD), primary key |
| equity_open | NUMERIC(14,4) | No | | Account equity at market open |
| equity_close | NUMERIC(14,4) | No | | Account equity at market close |
| daily_pnl | NUMERIC(14,4) | No | | Dollar P&L for the day |
| daily_pnl_pct | NUMERIC(8,6) | No | | Percentage P&L for the day |
| trades_taken | INTEGER | No | 0 | Number of trades executed |
| wins | INTEGER | No | 0 | Number of winning trades |
| losses | INTEGER | No | 0 | Number of losing trades |
| win_rate | NUMERIC(8,6) | Yes | | Win rate as decimal |
| avg_r_multiple | NUMERIC(8,4) | Yes | | Average R-multiple across all trades |
| total_r | NUMERIC(8,4) | Yes | | Sum of all R-multiples |
| expectancy | NUMERIC(8,4) | Yes | | Mathematical expectancy in R |
| profit_factor | NUMERIC(8,4) | Yes | | Gross profit / gross loss |
| max_drawdown_pct | NUMERIC(8,6) | No | 0 | Peak intraday drawdown percentage |
| max_drawdown_dollar | NUMERIC(14,4) | No | 0 | Peak intraday drawdown in dollars |
| peak_heat_pct | NUMERIC(8,6) | No | 0 | Maximum portfolio heat reached |
| avg_heat_pct | NUMERIC(8,6) | No | 0 | Average portfolio heat across the session |
| regime_distribution | JSONB | No | '{}' | Time spent in each regime: {"TRENDING": 0.65, "CHOPPY": 0.20, ...} |
| sharpe_daily | NUMERIC(8,4) | Yes | | Daily Sharpe ratio (annualized) |
| sortino_daily | NUMERIC(8,4) | Yes | | Daily Sortino ratio (annualized) |
| commissions_total | NUMERIC(14,4) | No | 0 | Total commissions for the day |
| slippage_avg | NUMERIC(14,4) | Yes | | Average slippage per fill |
| circuit_breaker_triggered | BOOLEAN | No | FALSE | Whether any circuit breaker fired |
| edge_decay_triggers | INTEGER | No | 0 | Number of edge decay triggers active (0 to 3) |
| system_mode | TEXT | No | 'SUPERVISED' | Operating mode for the session |
| one_sentence_summary | TEXT | Yes | | Journal agent summary |
| created_at | TIMESTAMPTZ | No | NOW() | Row creation timestamp |

---

### Table: `calibration_runs`

Stores parameter snapshots and performance results from Calibration agent runs.

```sql
CREATE TABLE calibration_runs (
    run_id              TEXT PRIMARY KEY,
    run_type            TEXT NOT NULL CHECK (run_type IN ('BACKTEST', 'WALK_FORWARD', 'OPTIMIZATION', 'SENSITIVITY')),
    started_at          TIMESTAMPTZ NOT NULL,
    completed_at        TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    instrument          TEXT,
    timeframe           TEXT,
    date_range_start    TEXT NOT NULL,
    date_range_end      TEXT NOT NULL,
    parameter_snapshot  JSONB NOT NULL,
    results_metrics     JSONB,
    total_trades        INTEGER,
    win_rate            NUMERIC(8,6),
    profit_factor       NUMERIC(8,4),
    sharpe_ratio        NUMERIC(8,4),
    max_drawdown_pct    NUMERIC(8,6),
    expectancy_r        NUMERIC(8,4),
    avg_r_multiple      NUMERIC(8,4),
    recovery_factor     NUMERIC(8,4),
    regime_breakdown    JSONB,
    recommendations     JSONB,
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,
    applied_at          TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calibration_run_type ON calibration_runs(run_type);
CREATE INDEX idx_calibration_started ON calibration_runs(started_at);
CREATE INDEX idx_calibration_status ON calibration_runs(status);
CREATE INDEX idx_calibration_instrument ON calibration_runs(instrument);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| run_id | TEXT | No | | Unique run identifier (UUID) |
| run_type | TEXT | No | | Type of calibration: BACKTEST, WALK_FORWARD, OPTIMIZATION, SENSITIVITY |
| started_at | TIMESTAMPTZ | No | | When the run started |
| completed_at | TIMESTAMPTZ | Yes | | When the run finished |
| status | TEXT | No | RUNNING | Run status |
| instrument | TEXT | Yes | | Target instrument (null for portfolio-wide) |
| timeframe | TEXT | Yes | | Target timeframe |
| date_range_start | TEXT | No | | Backtest start date (YYYY-MM-DD) |
| date_range_end | TEXT | No | | Backtest end date (YYYY-MM-DD) |
| parameter_snapshot | JSONB | No | | Full parameter set used for this run |
| results_metrics | JSONB | Yes | | Comprehensive results object |
| total_trades | INTEGER | Yes | | Number of trades in backtest |
| win_rate | NUMERIC(8,6) | Yes | | Win rate achieved |
| profit_factor | NUMERIC(8,4) | Yes | | Profit factor achieved |
| sharpe_ratio | NUMERIC(8,4) | Yes | | Sharpe ratio achieved |
| max_drawdown_pct | NUMERIC(8,6) | Yes | | Maximum drawdown percentage |
| expectancy_r | NUMERIC(8,4) | Yes | | Expectancy in R-multiples |
| avg_r_multiple | NUMERIC(8,4) | Yes | | Average R per trade |
| recovery_factor | NUMERIC(8,4) | Yes | | Net profit / max drawdown |
| regime_breakdown | JSONB | Yes | | Performance segmented by regime |
| recommendations | JSONB | Yes | | Parameter change recommendations |
| approved_by | TEXT | Yes | | Who approved the parameter changes |
| approved_at | TIMESTAMPTZ | Yes | | When changes were approved |
| applied_at | TIMESTAMPTZ | Yes | | When changes were applied to live config |
| error_message | TEXT | Yes | | Error details if run failed |
| created_at | TIMESTAMPTZ | No | NOW() | Row creation timestamp |

---

### Table: `research_findings`

Stores findings from the Research agent with confidence scores and freshness tracking.

```sql
CREATE TABLE research_findings (
    finding_id          TEXT PRIMARY KEY,
    finding_type        TEXT NOT NULL CHECK (finding_type IN ('SECTOR_ROTATION', 'CORRELATION_SHIFT', 'REGIME_ANOMALY', 'VOLUME_PATTERN', 'SEASONAL_BIAS', 'NEWS_IMPACT', 'INTERMARKET_SIGNAL')),
    instrument          TEXT,
    sector              TEXT,
    summary             TEXT NOT NULL,
    details             JSONB NOT NULL,
    confidence          NUMERIC(6,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    freshness           NUMERIC(6,4) NOT NULL DEFAULT 1.0 CHECK (freshness BETWEEN 0 AND 1),
    data_sources        JSONB NOT NULL DEFAULT '[]',
    actionable          BOOLEAN NOT NULL DEFAULT FALSE,
    action_recommended  TEXT,
    expires_at          TIMESTAMPTZ,
    superseded_by       TEXT REFERENCES research_findings(finding_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_type ON research_findings(finding_type);
CREATE INDEX idx_findings_instrument ON research_findings(instrument);
CREATE INDEX idx_findings_confidence ON research_findings(confidence);
CREATE INDEX idx_findings_freshness ON research_findings(freshness);
CREATE INDEX idx_findings_created ON research_findings(created_at);
CREATE INDEX idx_findings_actionable ON research_findings(actionable) WHERE actionable = TRUE;
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| finding_id | TEXT | No | | Unique finding identifier (UUID) |
| finding_type | TEXT | No | | Category of the finding |
| instrument | TEXT | Yes | | Specific instrument (null if sector/market-wide) |
| sector | TEXT | Yes | | Sector (e.g., Technology, Healthcare) |
| summary | TEXT | No | | One-line human-readable summary |
| details | JSONB | No | | Full analysis payload |
| confidence | NUMERIC(6,4) | No | | Confidence score (0.0 to 1.0) |
| freshness | NUMERIC(6,4) | No | 1.0 | Freshness decay value, degrades over time |
| data_sources | JSONB | No | '[]' | List of data sources used |
| actionable | BOOLEAN | No | FALSE | Whether this finding suggests a trading action |
| action_recommended | TEXT | Yes | | Recommended action if actionable |
| expires_at | TIMESTAMPTZ | Yes | | When this finding becomes stale |
| superseded_by | TEXT | Yes | | FK to newer finding that replaces this one |
| created_at | TIMESTAMPTZ | No | NOW() | Row creation timestamp |
| updated_at | TIMESTAMPTZ | No | NOW() | Row last update timestamp |

---

### Table: `strategy_hypotheses`

Stores backtested strategy variations and their rollout state.

```sql
CREATE TABLE strategy_hypotheses (
    hypothesis_id       TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    description         TEXT NOT NULL,
    parameter_changes   JSONB NOT NULL,
    baseline_params     JSONB NOT NULL,
    backtest_run_id     TEXT REFERENCES calibration_runs(run_id),
    backtest_win_rate   NUMERIC(8,6),
    backtest_pf         NUMERIC(8,4),
    backtest_sharpe     NUMERIC(8,4),
    backtest_trades     INTEGER,
    rollout_state       TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (rollout_state IN ('PROPOSED', 'BACKTESTED', 'PAPER_TESTING', 'SHADOW_LIVE', 'ACTIVE', 'RETIRED', 'REJECTED')),
    rollout_started_at  TIMESTAMPTZ,
    rollout_completed_at TIMESTAMPTZ,
    paper_test_results  JSONB,
    shadow_live_results JSONB,
    live_performance    JSONB,
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_by          TEXT NOT NULL DEFAULT 'calibration_agent',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hypotheses_state ON strategy_hypotheses(rollout_state);
CREATE INDEX idx_hypotheses_created ON strategy_hypotheses(created_at);
CREATE INDEX idx_hypotheses_backtest ON strategy_hypotheses(backtest_run_id);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| hypothesis_id | TEXT | No | | Unique identifier (UUID) |
| name | TEXT | No | | Human-readable name |
| description | TEXT | No | | What this hypothesis tests |
| parameter_changes | JSONB | No | | Proposed parameter modifications |
| baseline_params | JSONB | No | | Baseline parameters for comparison |
| backtest_run_id | TEXT | Yes | | FK to calibration_runs table |
| backtest_win_rate | NUMERIC(8,6) | Yes | | Backtest win rate |
| backtest_pf | NUMERIC(8,4) | Yes | | Backtest profit factor |
| backtest_sharpe | NUMERIC(8,4) | Yes | | Backtest Sharpe ratio |
| backtest_trades | INTEGER | Yes | | Number of trades in backtest |
| rollout_state | TEXT | No | PROPOSED | Current state in rollout lifecycle |
| rollout_started_at | TIMESTAMPTZ | Yes | | When rollout began |
| rollout_completed_at | TIMESTAMPTZ | Yes | | When rollout finished |
| paper_test_results | JSONB | Yes | | Results from paper trading phase |
| shadow_live_results | JSONB | Yes | | Results from shadow live phase |
| live_performance | JSONB | Yes | | Live trading performance metrics |
| approved_by | TEXT | Yes | | Who approved promotion to next stage |
| approved_at | TIMESTAMPTZ | Yes | | When promotion was approved |
| rejection_reason | TEXT | Yes | | Why the hypothesis was rejected |
| created_by | TEXT | No | calibration_agent | Which agent created this hypothesis |
| created_at | TIMESTAMPTZ | No | NOW() | Row creation timestamp |
| updated_at | TIMESTAMPTZ | No | NOW() | Row last update timestamp |

---

### Table: `config_versions`

Version-controlled parameter history. Every config change produces a new row.

```sql
CREATE TABLE config_versions (
    version_id          SERIAL PRIMARY KEY,
    config_scope        TEXT NOT NULL CHECK (config_scope IN ('GLOBAL', 'INSTRUMENT', 'AGENT', 'REGIME')),
    config_key          TEXT NOT NULL,
    instrument          TEXT,
    previous_value      JSONB,
    new_value           JSONB NOT NULL,
    change_reason       TEXT NOT NULL,
    changed_by          TEXT NOT NULL,
    change_source       TEXT NOT NULL CHECK (change_source IN ('HUMAN', 'CALIBRATION', 'TECH_STRATEGY', 'SYSTEM')),
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,
    applied_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reverted            BOOLEAN NOT NULL DEFAULT FALSE,
    reverted_at         TIMESTAMPTZ,
    reverted_by         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_config_scope ON config_versions(config_scope);
CREATE INDEX idx_config_key ON config_versions(config_key);
CREATE INDEX idx_config_instrument ON config_versions(instrument);
CREATE INDEX idx_config_applied ON config_versions(applied_at);
CREATE INDEX idx_config_source ON config_versions(change_source);
CREATE INDEX idx_config_scope_key ON config_versions(config_scope, config_key);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| version_id | SERIAL | No | auto | Auto-incrementing version number |
| config_scope | TEXT | No | | Scope: GLOBAL, INSTRUMENT, AGENT, REGIME |
| config_key | TEXT | No | | Parameter path (e.g., "risk.max_heat_pct") |
| instrument | TEXT | Yes | | Instrument if scope is INSTRUMENT |
| previous_value | JSONB | Yes | | Value before change (null for first entry) |
| new_value | JSONB | No | | New value being set |
| change_reason | TEXT | No | | Why this change was made |
| changed_by | TEXT | No | | Agent or human who initiated the change |
| change_source | TEXT | No | | Origin: HUMAN, CALIBRATION, TECH_STRATEGY, SYSTEM |
| approved_by | TEXT | Yes | | Who approved (required for ADMIN-level changes) |
| approved_at | TIMESTAMPTZ | Yes | | When approval was given |
| applied_at | TIMESTAMPTZ | No | NOW() | When the change was applied |
| reverted | BOOLEAN | No | FALSE | Whether this change was rolled back |
| reverted_at | TIMESTAMPTZ | Yes | | When rollback occurred |
| reverted_by | TEXT | Yes | | Who initiated the rollback |
| created_at | TIMESTAMPTZ | No | NOW() | Row creation timestamp |

<!-- /SSOT-DB-01 -->

---

<!-- SSOT-DB-02 -->
## SSOT-DB-02: Redis Key Schema (Hot/Warm Tier)

Redis serves as the hot and warm memory tier. Hot tier keys hold current-bar state with sub-millisecond access. Warm tier keys hold session-scoped data with single-digit millisecond access. Key naming follows the pattern `{namespace}:{agent}:{key}` with optional instrument or date suffixes.

**Connection:** `redis://127.0.0.1:6379/0` (default database 0 for hot, database 1 for warm).

---

### Sentinel Agent Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `market:brief:{date}` | hash | 24h | Today's MarketBrief. Contains session phase, gaps, VIX, calendar events, survival check. | `{"session": "OPEN", "vix_level": "18.4", "vix_regime": "NORMAL", "survival_check": "GREEN", "gap_AAPL": "-0.3", "gap_NVDA": "1.2"}` |
| `sentinel:session` | string | Until changed | Current session phase identifier. | `"POWER_HOUR"` |
| `sentinel:watchlist` | list | Until changed | Ordered list of instruments currently on the watchlist. | `["AAPL", "NVDA", "MSFT", "SPY", "QQQ"]` |
| `sentinel:alerts` | list | 24h | Active unresolved alerts. Each entry is a JSON object. | `[{"type": "VIX_ELEVATED", "level": "YELLOW", "value": 28.5, "time": "2026-02-23T14:30:00Z"}]` |
| `sentinel:calendar:{date}` | list | 24h | Economic calendar events for the day. | `[{"time": "08:30", "event": "CPI", "impact": "HIGH", "forecast": "3.1%"}]` |
| `sentinel:overnight_gaps` | hash | 24h | Overnight gap data per instrument. | `{"AAPL": "0.8", "NVDA": "-1.2", "SPY": "0.3"}` |

---

### Regime Agent Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `regime:{instrument}` | hash | Until next ensemble run | Current regime classification for an instrument. | `{"regime": "TRENDING", "confidence": "5", "duration_bars": "47", "efficiency_ratio": "0.72", "transition_probability": "0.12"}` |
| `htf:{instrument}` | hash | Until next ensemble run | Higher-timeframe slope data for macro gate (Fix 1). | `{"htf_slope": "0.0034", "htf_direction": "BULLISH", "htf_timeframe": "4h"}` |
| `regime:history:{instrument}` | list (capped at 50) | 24h | Last 50 regime classifications with timestamps. | `[{"regime": "TRENDING", "confidence": 5, "ts": "2026-02-23T10:00:00Z"}, ...]` |
| `regime:parameters:{instrument}` | hash | Until regime change | Active regime-specific parameter overrides. | `{"atr_multiplier": "1.0", "size_adjustment": "1.0", "retest_tolerance": "0.40"}` |
| `regime:cusum:{instrument}` | hash | Until next run | CUSUM detector internal state. | `{"alarm": "false", "location": "0", "cumulative_sum": "1.23"}` |

---

### Signal Agent Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `fsm:{instrument}` | hash | Until changed | Current FSM state for the instrument. | `{"state": "WAIT_RETEST", "break_bar": "1042", "bars_waiting": "3", "timeout_at_bar": "1054"}` |
| `frozen:{instrument}:{break_bar}` | hash | Until trade closed | Frozen Action/Safety line structure snapshot. | `{"action_slope": "0.0012", "action_intercept": "182.50", "safety_slope": "0.0010", "safety_intercept": "176.30", "direction": "LONG", "frozen_at": "2026-02-23T10:42:00Z"}` |
| `signal:pipeline_state` | hash | Until changed | Current pipeline statistics. | `{"runs_today": "847", "signals_today": "2", "rejection_rate": "0.9976"}` |
| `consumed_breaks:{instrument}` | hash | 24h | Consumed break structures for one-break-one-trade enforcement (Fix 10). | `{"structure_ids": ["struct_AAPL_20260223_1042"], "session_date": "2026-02-23"}` |
| `signal:candidates:{instrument}` | list | Until changed | Active candidate trendlines with Q-scores. | `[{"line_id": "L001", "q_score": 0.78, "grade": "A", "touches": 4}]` |
| `signal:pivots:{instrument}` | list (capped at 100) | Until changed | Recent detected pivots. | `[{"bar_index": 1035, "price": 182.40, "type": "LOW", "confirmed": true}]` |

---

### Risk Agent Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `heat:portfolio` | string | Real-time | Current portfolio heat percentage. Updated on every position change. | `"3.2"` |
| `circuit:status` | hash | Until cleared | Circuit breaker state. | `{"status": "GREEN", "daily_loss_pct": "0.4", "consecutive_losses": "1", "drawdown_pct": "2.1", "survival_score": "8"}` |
| `risk:equity` | hash | Real-time | Current account equity state. | `{"equity": "50240.00", "peak_equity": "51200.00", "drawdown_pct": "1.87", "drawdown_scale": "0.91"}` |
| `risk:positions` | hash | Real-time | Summary of all open positions with risk data. Keys are position IDs. | `{"pos_001": "{\"instrument\": \"AAPL\", \"risk_pct\": 0.99, \"heat_contribution\": 0.99}"}` |
| `risk:correlation` | hash | 1h | Pairwise correlation matrix (serialized). | `{"AAPL:MSFT": "0.82", "AAPL:NVDA": "0.65", "NVDA:MSFT": "0.71"}` |
| `risk:allocation` | hash | Until changed | Current asset allocation state (Fix 3). | `{"equities_deployed": "0.45", "equities_target": "0.55", "futures_deployed": "0.10", "futures_target": "0.15"}` |
| `risk:consecutive_losses` | hash | Until changed | Consecutive loss tracker state (Fix 7). | `{"count": "1", "stage": "NORMAL", "size_multiplier": "1.0"}` |

---

### Execution Agent Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `position:{position_id}` | hash | Until closed | Full state of an active position. | `{"instrument": "AAPL", "direction": "LONG", "entry_price": "182.40", "size": "120", "current_stop": "183.80", "phase": "4", "mfe": "5.20", "mae": "1.10", "bars_held": "47", "partial_done": "true"}` |
| `execution:orders` | list | 24h | Pending and recent orders. | `[{"order_id": "ORD001", "instrument": "AAPL", "type": "LIMIT", "price": "182.50", "status": "FILLED"}]` |
| `execution:fills_today` | list | 24h | All fills for today with slippage data. | `[{"order_id": "ORD001", "fill_price": "182.52", "slippage": "0.02", "time": "10:42:15"}]` |
| `execution:broker` | hash | 30s | Broker connection health. | `{"connected": "true", "latency_ms": "12", "last_heartbeat": "2026-02-23T14:30:00Z"}` |

---

### Orchestrator Agent Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `orchestrator:mode` | string | Until changed | Current system operating mode. | `"SUPERVISED"` |
| `orchestrator:phase` | string | Until changed | Current workflow phase. | `"SESSION"` |
| `orchestrator:pending_approvals` | list | 24h | Pending human approval requests. | `[{"request_id": "REQ001", "gate": "G1", "instrument": "NVDA", "expires_at": "2026-02-23T14:35:00Z"}]` |
| `orchestrator:agents` | hash | 30s | Status of all agents. | `{"sentinel": "RUNNING", "regime": "RUNNING", "signal": "RUNNING", "risk": "READY", "execution": "RUNNING", "journal": "READY", "orchestrator": "RUNNING"}` |

---

### Journal Agent Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `metrics:rolling20` | hash | Per trade update | Rolling 20-trade performance metrics. Includes Kelly inputs (Fix 12). | `{"win_rate": "0.62", "expectancy": "0.31", "profit_factor": "1.85", "avg_r": "0.42", "sharpe": "1.8", "total_trades": "20", "kelly_fraction": "0.18", "half_kelly": "0.09", "quarter_kelly": "0.045"}` |
| `journal:edge_decay` | hash | Until changed | Current edge decay status. | `{"triggers_active": "0", "status": "GREEN", "consecutive_alerts": "0"}` |
| `journal:today` | hash | 24h | Today's running performance. | `{"trades": "2", "wins": "1", "losses": "0", "pnl": "604.40", "best_r": "1.8"}` |
| `performance:instrument:{instrument}` | hash | 1h | Per-instrument rolling metrics for rotation decisions. | `{"win_rate": "0.70", "avg_r": "0.55", "trades": "10", "last_trade": "2026-02-23T11:00:00Z"}` |

---

### Config Keys

| Key Pattern | Data Type | TTL | Description | Example Value |
|-------------|-----------|-----|-------------|---------------|
| `config:params:{instrument}` | hash | Until changed | Active trading parameters for an instrument. | `{"zigzag_left": "5", "zigzag_right": "5", "atr_thresh": "1.0", "min_touches": "3", "q_threshold_a": "0.70", "q_threshold_b": "0.55", "break_beta_p": "0.20", "break_beta_c": "0.40", "retest_window": "12", "retest_atr": "0.40"}` |
| `config:params:global` | hash | Until changed | Global system parameters. | `{"max_risk_per_trade": "0.01", "max_heat": "0.06", "max_correlated": "3", "daily_loss_limit": "0.02", "drawdown_halt": "0.20"}` |

<!-- /SSOT-DB-02 -->

---

<!-- SSOT-DB-03 -->
## SSOT-DB-03: SQLite Audit Log Schema

SQLite serves as the durable audit trail for all tool invocations and system events. The database file is stored at `data/audit/tool_invocations.db`. WAL mode is enabled for concurrent read/write performance. The audit log is append-only during trading sessions.

### Table: `audit_entries`

Maps directly to the ToolInvocationRecord dataclass from Part 7, Section 30.3.

```sql
CREATE TABLE IF NOT EXISTS audit_entries (
    record_id               TEXT PRIMARY KEY,
    timestamp               TEXT NOT NULL,
    agent_name              TEXT NOT NULL,
    tool_name               TEXT NOT NULL,
    tool_category           TEXT NOT NULL,
    permission_level_required INTEGER NOT NULL,
    permission_level_granted  INTEGER NOT NULL,
    parameters              TEXT NOT NULL,
    result_summary          TEXT,
    result_status           TEXT NOT NULL CHECK (result_status IN ('SUCCESS', 'DENIED', 'ERROR', 'TIMEOUT')),
    approval_status         TEXT NOT NULL CHECK (approval_status IN ('NOT_REQUIRED', 'APPROVED', 'REJECTED', 'TIMEOUT', 'PENDING')),
    approved_by             TEXT,
    approval_latency_ms     REAL,
    execution_latency_ms    REAL NOT NULL,
    operating_mode          TEXT NOT NULL,
    trace_id                TEXT,
    span_id                 TEXT,
    error_message           TEXT,
    session_date            TEXT NOT NULL
);

PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_entries(agent_name);
CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_entries(tool_name);
CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_entries(result_status);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_entries(session_date);
CREATE INDEX IF NOT EXISTS idx_audit_trace ON audit_entries(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_approval ON audit_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_agent_session ON audit_entries(agent_name, session_date);
```

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| record_id | TEXT | No | UUID, primary key |
| timestamp | TEXT | No | ISO-8601 timestamp of invocation |
| agent_name | TEXT | No | Name of the requesting agent |
| tool_name | TEXT | No | Name of the tool invoked |
| tool_category | TEXT | No | Category: market_data, order_management, risk_config, etc. |
| permission_level_required | INTEGER | No | 0=READ, 1=WRITE, 2=EXECUTE, 3=ADMIN |
| permission_level_granted | INTEGER | No | Level the agent was granted |
| parameters | TEXT | No | JSON-serialized input parameters |
| result_summary | TEXT | Yes | Brief summary of the result |
| result_status | TEXT | No | SUCCESS, DENIED, ERROR, or TIMEOUT |
| approval_status | TEXT | No | NOT_REQUIRED, APPROVED, REJECTED, TIMEOUT, PENDING |
| approved_by | TEXT | Yes | "human", "auto", or "system_critical_override" |
| approval_latency_ms | REAL | Yes | Time between request and approval |
| execution_latency_ms | REAL | No | Tool execution time in milliseconds |
| operating_mode | TEXT | No | MANUAL, SUPERVISED, AUTONOMOUS, HALTED |
| trace_id | TEXT | Yes | OpenTelemetry trace ID for distributed tracing |
| span_id | TEXT | Yes | OpenTelemetry span ID |
| error_message | TEXT | Yes | Error details if result_status is ERROR |
| session_date | TEXT | No | YYYY-MM-DD for partitioning and archival |

### Retention Policy

| Action | Schedule | Details |
|--------|----------|---------|
| **Active storage** | Real-time | All records from current and previous 7 days remain in SQLite |
| **Weekly archive** | Every Sunday 00:00 UTC | Records older than 7 days are exported to Parquet and deleted from SQLite |
| **Cold archive** | Indefinite | Parquet files stored in `data/archive/audit/` partitioned by week |
| **VACUUM** | After weekly archive | SQLite VACUUM to reclaim space |

<!-- /SSOT-DB-03 -->

---

<!-- SSOT-DB-04 -->
## SSOT-DB-04: Parquet Archive Schema

Parquet serves as the cold archive tier for historical data. Apache Parquet provides columnar compression, efficient analytical queries, and cross-platform compatibility. All Parquet files use Snappy compression.

### File Naming Convention

```
data/archive/{data_type}/{year}/{month}/{data_type}_{instrument}_{date_range}.parquet
```

**Examples:**
```
data/archive/trades/2026/02/trades_ALL_20260217_20260223.parquet
data/archive/audit/2026/02/audit_ALL_20260217_20260223.parquet
data/archive/bars/2026/02/bars_AAPL_5m_20260201_20260228.parquet
data/archive/metrics/2026/02/metrics_daily_20260201_20260228.parquet
data/archive/regimes/2026/02/regimes_AAPL_20260201_20260228.parquet
```

### Partition Strategy

| Data Type | Partition Level 1 | Partition Level 2 | File Granularity |
|-----------|-------------------|-------------------|------------------|
| trades | Year | Month | Weekly (Mon to Sun) |
| audit | Year | Month | Weekly |
| bars (OHLCV) | Year | Month | Monthly, per instrument, per timeframe |
| daily_metrics | Year | Month | Monthly |
| regime_history | Year | Month | Monthly, per instrument |
| calibration_runs | Year | Month | Monthly |

### Column Definitions by Data Type

**trades.parquet columns:**
All columns from the `trades` PostgreSQL table, with the following type mappings:

| Parquet Column | Parquet Type | Source |
|----------------|-------------|--------|
| trade_id | STRING | trades.trade_id |
| entry_time | TIMESTAMP(MILLIS, UTC) | trades.entry_time |
| entry_price | DOUBLE | trades.entry_price |
| direction | STRING | trades.direction |
| instrument | STRING | trades.instrument |
| timeframe | STRING | trades.timeframe |
| q_score | DOUBLE | trades.q_score |
| rejection_score | INT32 | trades.rejection_score |
| regime | STRING | trades.regime |
| d_geom | DOUBLE | trades.d_geom |
| grade | STRING | trades.grade |
| position_size | DOUBLE | trades.position_size |
| risk_per_share | DOUBLE | trades.risk_per_share |
| initial_stop | DOUBLE | trades.initial_stop |
| action_line_value | DOUBLE | trades.action_line_value |
| safety_line_value | DOUBLE | trades.safety_line_value |
| trailing_phases | STRING (JSON) | trades.trailing_phases |
| partial_exits | STRING (JSON) | trades.partial_exits |
| fail_fast_triggered | BOOLEAN | trades.fail_fast_triggered |
| max_favorable_excursion | DOUBLE | trades.max_favorable_excursion |
| max_adverse_excursion | DOUBLE | trades.max_adverse_excursion |
| exit_time | TIMESTAMP(MILLIS, UTC) | trades.exit_time |
| exit_price | DOUBLE | trades.exit_price |
| exit_reason | STRING | trades.exit_reason |
| r_multiple | DOUBLE | trades.r_multiple |
| duration_bars | INT32 | trades.duration_bars |
| realized_pnl | DOUBLE | trades.realized_pnl |
| commission | DOUBLE | trades.commission |
| macro_gate_result | STRING | trades.macro_gate_result |
| confluence_score | DOUBLE | trades.confluence_score |
| entry_regime | STRING | trades.entry_regime |
| exit_regime | STRING | trades.exit_regime |

**bars.parquet columns:**

| Parquet Column | Parquet Type | Description |
|----------------|-------------|-------------|
| timestamp | TIMESTAMP(MILLIS, UTC) | Bar timestamp |
| open | DOUBLE | Open price |
| high | DOUBLE | High price |
| low | DOUBLE | Low price |
| close | DOUBLE | Close price |
| volume | DOUBLE | Volume |
| instrument | STRING | Ticker symbol |
| timeframe | STRING | Bar timeframe (1m, 5m, 15m, 1h, 4h, D, W) |

### Compression Settings

| Setting | Value |
|---------|-------|
| Compression codec | Snappy |
| Row group size | 128 MB |
| Page size | 1 MB |
| Dictionary encoding | Enabled for STRING columns |
| Statistics | Min/max per column per row group |
| Write version | Parquet 2.6 |

<!-- /SSOT-DB-04 -->

---

<!-- SSOT-API-WS-01 -->
## SSOT-API-WS-01: WebSocket Protocol

The WebSocket protocol provides the primary communication channel between the Python backend and the React frontend. All messages use JSON serialization over a persistent WebSocket connection.

### Connection

| Property | Value |
|----------|-------|
| URL | `ws://127.0.0.1:8765` |
| Protocol | WebSocket (RFC 6455) |
| Encoding | UTF-8 JSON |
| Authentication | Local-only (no auth required for localhost connections) |
| Max message size | 1 MB |
| Ping interval | 30 seconds |
| Pong timeout | 10 seconds |

### Message Envelope

Every message uses this envelope structure:

```json
{
  "type": "MESSAGE_TYPE",
  "payload": {},
  "timestamp": "2026-02-23T14:30:00.123Z",
  "sequence": 12345,
  "source": "backend",
  "request_id": "optional-uuid",
  "agent": "optional-agent-name"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Message type identifier (see table below) |
| payload | object | Yes | Type-specific data |
| timestamp | string | Yes | ISO-8601 with millisecond precision |
| sequence | integer | Yes | Monotonically increasing per connection |
| source | string | Yes | "backend" or "frontend" |
| request_id | string | No | UUID for request-response correlation |
| agent | string | No | Which agent produced this message (backend only) |

### Message Types

---

#### INIT (Server -> Client)

Sent once on connection establishment. Contains full system state for frontend hydration.

```json
{
  "type": "INIT",
  "payload": {
    "system_mode": "SUPERVISED",
    "open_positions": [
      {
        "position_id": "pos_001",
        "instrument": "AAPL",
        "direction": "LONG",
        "entry_price": 182.40,
        "current_price": 185.60,
        "stop_price": 183.80,
        "size": 120,
        "remaining_size": 48,
        "unrealized_pnl": 384.00,
        "unrealized_r": 1.8,
        "phase": "PHASE_4",
        "entry_time": "2026-02-23T10:42:00Z",
        "bars_held": 47,
        "q_score": 0.78,
        "grade": "A"
      }
    ],
    "active_instruments": ["AAPL", "NVDA", "MSFT", "SPY", "QQQ"],
    "regime_states": {
      "AAPL": {"regime": "TRENDING", "confidence": 5, "efficiency_ratio": 0.72, "duration_bars": 47}
    },
    "agent_statuses": {
      "sentinel": {"name": "Sentinel", "state": "RUNNING", "health": "HEALTHY", "last_update": "2026-02-23T14:30:00Z", "current_activity": "Core Session Monitoring"},
      "regime": {"name": "Regime", "state": "RUNNING", "health": "HEALTHY", "last_update": "2026-02-23T14:30:00Z", "current_activity": "TRENDING 5/6"},
      "signal": {"name": "Signal", "state": "RUNNING", "health": "HEALTHY", "last_update": "2026-02-23T14:30:00Z", "current_activity": "NVDA WAIT_RETEST"},
      "risk": {"name": "Risk", "state": "READY", "health": "HEALTHY", "last_update": "2026-02-23T14:30:00Z", "current_activity": "Heat 2.8% OK"},
      "orchestrator": {"name": "Orchestrator", "state": "RUNNING", "health": "HEALTHY", "last_update": "2026-02-23T14:30:00Z", "current_activity": "Monitoring"},
      "execution": {"name": "Execution", "state": "RUNNING", "health": "HEALTHY", "last_update": "2026-02-23T14:30:00Z", "current_activity": "AAPL Phase 4"},
      "journal": {"name": "Journal", "state": "READY", "health": "HEALTHY", "last_update": "2026-02-23T14:30:00Z", "current_activity": "1W 0L today"}
    },
    "portfolio_heat": 2.8,
    "drawdown_pct": 2.1,
    "survival_score": 8,
    "circuit_breaker_status": "NORMAL",
    "rolling_metrics": {"win_rate": 0.62, "expectancy": 0.31, "profit_factor": 1.85, "avg_r": 0.42, "sharpe": 1.8, "total_trades": 20},
    "daily_pnl": 604.40,
    "daily_trades": 1,
    "visualization_config": {},
    "pending_approvals": [],
    "recent_alerts": [],
    "broker_connected": true,
    "data_feed_connected": true,
    "server_time": "2026-02-23T14:30:00.123Z"
  },
  "timestamp": "2026-02-23T14:30:00.123Z",
  "sequence": 1,
  "source": "backend"
}
```

---

#### BAR_UPDATE (Server -> Client)

New OHLCV bar data for chart rendering.

```json
{
  "type": "BAR_UPDATE",
  "payload": {
    "instrument": "AAPL",
    "timeframe": "5m",
    "bar": {
      "timestamp": "2026-02-23T14:30:00Z",
      "open": 185.40,
      "high": 185.80,
      "low": 185.20,
      "close": 185.60,
      "volume": 234567
    }
  },
  "timestamp": "2026-02-23T14:35:00Z",
  "sequence": 1234,
  "source": "backend",
  "agent": "sentinel"
}
```

---

#### VIZ_EVENT (Server -> Client)

Agent visualization events for chart overlays (pivots, trendlines, regime tints, etc.).

```json
{
  "type": "VIZ_EVENT",
  "payload": {
    "agent": "signal",
    "viz_type": "PIVOT_DETECTED",
    "instrument": "AAPL",
    "data": {
      "bar_index": 1035,
      "price": 182.40,
      "pivot_type": "LOW",
      "confirmed": true
    }
  },
  "timestamp": "2026-02-23T10:35:00Z",
  "sequence": 1235,
  "source": "backend",
  "agent": "signal"
}
```

---

#### POSITION_UPDATE (Server -> Client)

Real-time position state changes.

```json
{
  "type": "POSITION_UPDATE",
  "payload": {
    "position_id": "pos_001",
    "instrument": "AAPL",
    "direction": "LONG",
    "entry_price": 182.40,
    "current_price": 185.60,
    "stop_price": 183.80,
    "size": 120,
    "remaining_size": 48,
    "unrealized_pnl": 384.00,
    "unrealized_r": 1.8,
    "phase": "PHASE_4",
    "bars_held": 47,
    "event": "PHASE_TRANSITION"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1236,
  "source": "backend",
  "agent": "execution"
}
```

---

#### AGENT_STATE (Server -> Client)

Agent status updates when state changes.

```json
{
  "type": "AGENT_STATE",
  "payload": {
    "agent_name": "signal",
    "state": "RUNNING",
    "health": "HEALTHY",
    "current_activity": "NVDA WAIT_RETEST bar 3/12",
    "last_update": "2026-02-23T14:31:00Z"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1237,
  "source": "backend",
  "agent": "orchestrator"
}
```

---

#### ALERT (Server -> Client)

System alerts, warnings, and notifications.

```json
{
  "type": "ALERT",
  "payload": {
    "alert_id": "ALT001",
    "severity": "WARNING",
    "category": "REGIME",
    "title": "Regime Transition Warning",
    "message": "AAPL ensemble agreement dropped from 5/6 to 3/6. Possible regime change.",
    "instrument": "AAPL",
    "agent": "regime",
    "requires_action": false,
    "auto_dismiss_seconds": 60
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1238,
  "source": "backend",
  "agent": "regime"
}
```

---

#### APPROVAL_REQUEST (Server -> Client)

Trade proposal requiring human approval at a gate.

```json
{
  "type": "APPROVAL_REQUEST",
  "payload": {
    "request_id": "REQ001",
    "gate": "G1",
    "instrument": "NVDA",
    "direction": "LONG",
    "entry_price": 875.20,
    "stop_price": 868.50,
    "position_size": 76,
    "risk_dollars": 509.20,
    "risk_pct": 1.01,
    "q_score": 0.75,
    "grade": "A",
    "d_geom": 1.3,
    "regime": "TRENDING",
    "regime_confidence": 5,
    "survival_score": 8,
    "portfolio_heat_after": 3.8,
    "confluence_score": 0.82,
    "macro_bias": "BULLISH",
    "rejection_score": 3,
    "expires_at": "2026-02-23T14:40:00Z",
    "timeout_bars": 2
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1239,
  "source": "backend",
  "agent": "orchestrator"
}
```

---

#### CHAT_RESPONSE (Server -> Client)

Response to a user chat message.

```json
{
  "type": "CHAT_RESPONSE",
  "payload": {
    "response_text": "AAPL is currently in a TRENDING regime with 5/6 ensemble agreement. Duration: 47 bars. Efficiency Ratio: 0.72.",
    "data": {"regime": "TRENDING", "confidence": 5, "duration": 47},
    "request_id": "CHAT001"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1240,
  "source": "backend",
  "agent": "orchestrator"
}
```

---

#### SYSTEM_STATUS (Server -> Client)

Periodic system health broadcast.

```json
{
  "type": "SYSTEM_STATUS",
  "payload": {
    "system_mode": "SUPERVISED",
    "broker_connected": true,
    "data_feed_connected": true,
    "latency_ms": 12,
    "agents_healthy": 7,
    "agents_total": 7,
    "uptime_seconds": 28800
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1241,
  "source": "backend"
}
```

---

#### METRICS_UPDATE (Server -> Client)

Rolling metrics refresh (after each trade or periodically).

```json
{
  "type": "METRICS_UPDATE",
  "payload": {
    "win_rate": 0.62,
    "expectancy": 0.31,
    "profit_factor": 1.85,
    "avg_r": 0.42,
    "sharpe": 1.8,
    "total_trades": 20,
    "daily_pnl": 604.40,
    "daily_trades": 1,
    "portfolio_heat": 2.8,
    "drawdown_pct": 2.1,
    "survival_score": 8,
    "edge_decay_status": "GREEN"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1242,
  "source": "backend",
  "agent": "journal"
}
```

---

#### MODE_CHANGE (Server -> Client)

System operating mode change notification.

```json
{
  "type": "MODE_CHANGE",
  "payload": {
    "old_mode": "SUPERVISED",
    "new_mode": "MANUAL",
    "reason": "User requested mode change",
    "changed_by": "human",
    "effective_at": "2026-02-23T14:31:00Z"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 1243,
  "source": "backend",
  "agent": "orchestrator"
}
```

---

#### USER_COMMAND (Client -> Server)

User-initiated command from the frontend.

```json
{
  "type": "USER_COMMAND",
  "payload": {
    "command": "PAUSE_TRADING",
    "reason": "Manual pause for review"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 500,
  "source": "frontend"
}
```

---

#### APPROVAL_RESPONSE (Client -> Server)

Human response to an approval request.

```json
{
  "type": "APPROVAL_RESPONSE",
  "payload": {
    "request_id": "REQ001",
    "decision": "APPROVED",
    "modifications": null,
    "reason": null
  },
  "timestamp": "2026-02-23T14:32:00Z",
  "sequence": 501,
  "source": "frontend"
}
```

Valid decisions: `APPROVED`, `REJECTED`, `MODIFIED`. If `MODIFIED`, include `modifications` object with changed fields.

---

#### CHAT_MESSAGE (Client -> Server)

User chat input.

```json
{
  "type": "CHAT_MESSAGE",
  "payload": {
    "message": "What regime is AAPL in?",
    "request_id": "CHAT001"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 502,
  "source": "frontend"
}
```

---

#### CONFIG_UPDATE (Client -> Server)

User configuration change request.

```json
{
  "type": "CONFIG_UPDATE",
  "payload": {
    "scope": "GLOBAL",
    "key": "risk.max_heat_pct",
    "value": 5.0,
    "reason": "Reducing max heat during volatile period"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 503,
  "source": "frontend"
}
```

---

#### LAYOUT_SAVE (Client -> Server)

Frontend layout state persistence.

```json
{
  "type": "LAYOUT_SAVE",
  "payload": {
    "preset_name": "custom_1",
    "layout": {
      "chart_width_pct": 70.0,
      "sidebar_width_px": 320,
      "sidebar_collapsed": false,
      "position_panel_height_px": 160,
      "position_panel_collapsed": false,
      "er_subplot_visible": false,
      "chat_height_pct": 35.0
    }
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 504,
  "source": "frontend"
}
```

---

#### CHART_INTERACTION (Client -> Server)

User interactions with the chart (clicking entry arrows, overriding stops).

```json
{
  "type": "CHART_INTERACTION",
  "payload": {
    "action": "STOP_OVERRIDE",
    "position_id": "pos_001",
    "new_stop_price": 184.00,
    "reason": "Tightening stop manually"
  },
  "timestamp": "2026-02-23T14:31:00Z",
  "sequence": 505,
  "source": "frontend"
}
```

---

### Heartbeat Protocol

| Property | Value |
|----------|-------|
| Mechanism | WebSocket Ping/Pong frames (RFC 6455 control frames) |
| Server ping interval | 30 seconds |
| Client pong timeout | 10 seconds |
| Reconnection on timeout | Yes, automatic |
| Max reconnection attempts | 10 |
| Reconnection backoff | Exponential: 1s, 2s, 4s, 8s, 16s, 30s (cap) |
| State recovery on reconnect | Server sends fresh INIT message |

### Rate Limiting

| Direction | Limit | Enforcement |
|-----------|-------|-------------|
| Server to Client | 100 messages/second | Server-side throttle with priority queue. CRITICAL messages never throttled. |
| Client to Server | 30 messages/second | Server rejects excess with error response |
| APPROVAL_RESPONSE | 1 per request_id | Server ignores duplicates |
| CHAT_MESSAGE | 10 per minute | Server queues excess with delay |

<!-- /SSOT-API-WS-01 -->

---

<!-- SSOT-API-REST-01 -->
## SSOT-API-REST-01: Internal REST Endpoints

FastAPI server provides REST endpoints for system management, configuration, and data access. These endpoints are secondary to the WebSocket protocol. They are used for operations that do not require real-time streaming: health checks, configuration changes, historical data retrieval.

**Base URL:** `http://127.0.0.1:8765/api/v1`
**Auth:** None (localhost only). Production deployments must add API key authentication via `X-API-Key` header.

---

### GET /health

System health check endpoint.

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/v1/health` |
| Query Params | None |
| Request Body | None |
| Auth | None |
| Rate Limit | 60/minute |

**Response (200 OK):**

```json
{
  "status": "healthy",
  "uptime_seconds": 28800,
  "version": "1.0.0",
  "broker_connected": true,
  "data_feed_connected": true,
  "redis_connected": true,
  "postgres_connected": true,
  "agents_healthy": 7,
  "agents_total": 7,
  "system_mode": "SUPERVISED",
  "timestamp": "2026-02-23T14:30:00Z"
}
```

---

### GET /status

Full system status including all agent states.

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/v1/status` |
| Query Params | None |
| Request Body | None |
| Auth | None |
| Rate Limit | 30/minute |

**Response (200 OK):**

```json
{
  "system_mode": "SUPERVISED",
  "workflow_phase": "SESSION",
  "circuit_breaker_status": "NORMAL",
  "survival_score": 8,
  "portfolio_heat": 2.8,
  "drawdown_pct": 2.1,
  "daily_pnl": 604.40,
  "agents": {
    "sentinel": {"state": "RUNNING", "health": "HEALTHY"},
    "regime": {"state": "RUNNING", "health": "HEALTHY"},
    "signal": {"state": "RUNNING", "health": "HEALTHY"},
    "risk": {"state": "READY", "health": "HEALTHY"},
    "orchestrator": {"state": "RUNNING", "health": "HEALTHY"},
    "execution": {"state": "RUNNING", "health": "HEALTHY"},
    "journal": {"state": "READY", "health": "HEALTHY"}
  },
  "pending_approvals": 0,
  "open_positions": 2,
  "timestamp": "2026-02-23T14:30:00Z"
}
```

---

### GET /agents

List all agents with detailed state.

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/v1/agents` |
| Query Params | `name` (optional, filter by agent name) |
| Request Body | None |
| Auth | None |
| Rate Limit | 30/minute |

**Response (200 OK):**

```json
{
  "agents": [
    {
      "name": "sentinel",
      "layer": "PERCEPTION",
      "state": "RUNNING",
      "health": "HEALTHY",
      "uptime_seconds": 28800,
      "last_execution_at": "2026-02-23T14:30:00Z",
      "error_count_last_hour": 0,
      "avg_latency_ms": 3.2,
      "tools_available": 18,
      "tools_healthy": 18,
      "current_activity": "Core Session Monitoring"
    }
  ],
  "total": 7
}
```

---

### GET /positions

List all open positions.

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/v1/positions` |
| Query Params | `instrument` (optional), `direction` (optional), `include_closed` (boolean, default false) |
| Request Body | None |
| Auth | None |
| Rate Limit | 30/minute |

**Response (200 OK):**

```json
{
  "positions": [
    {
      "position_id": "pos_001",
      "instrument": "AAPL",
      "direction": "LONG",
      "entry_price": 182.40,
      "current_price": 185.60,
      "stop_price": 183.80,
      "size": 120,
      "remaining_size": 48,
      "unrealized_pnl": 384.00,
      "unrealized_r": 1.8,
      "phase": "PHASE_4",
      "entry_time": "2026-02-23T10:42:00Z",
      "bars_held": 47,
      "q_score": 0.78,
      "grade": "A",
      "portfolio_heat_contribution": 0.99
    }
  ],
  "total_heat": 2.8,
  "total_unrealized_pnl": 604.40
}
```

---

### POST /approve

Approve a pending trade proposal.

| Property | Value |
|----------|-------|
| Method | POST |
| Path | `/api/v1/approve` |
| Query Params | None |
| Auth | None (localhost) |
| Rate Limit | 10/minute |

**Request Body:**

```json
{
  "request_id": "REQ001",
  "modifications": null
}
```

**Response (200 OK):**

```json
{
  "status": "approved",
  "request_id": "REQ001",
  "routed_to": "execution",
  "timestamp": "2026-02-23T14:32:00Z"
}
```

**Response (404 Not Found):** Request expired or not found.
**Response (409 Conflict):** Request already resolved.

---

### POST /reject

Reject a pending trade proposal.

| Property | Value |
|----------|-------|
| Method | POST |
| Path | `/api/v1/reject` |
| Query Params | None |
| Auth | None (localhost) |
| Rate Limit | 10/minute |

**Request Body:**

```json
{
  "request_id": "REQ001",
  "reason": "Regime looks unstable"
}
```

**Response (200 OK):**

```json
{
  "status": "rejected",
  "request_id": "REQ001",
  "reason": "Regime looks unstable",
  "timestamp": "2026-02-23T14:32:00Z"
}
```

---

### GET /metrics

Retrieve performance metrics.

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/v1/metrics` |
| Query Params | `window` (int, default 20, rolling trade window), `period` (daily/weekly/monthly) |
| Request Body | None |
| Auth | None |
| Rate Limit | 30/minute |

**Response (200 OK):**

```json
{
  "rolling": {
    "window": 20,
    "win_rate": 0.62,
    "expectancy": 0.31,
    "profit_factor": 1.85,
    "avg_r": 0.42,
    "sharpe": 1.8,
    "total_trades": 20,
    "kelly_fraction": 0.18,
    "half_kelly": 0.09,
    "quarter_kelly": 0.045
  },
  "daily": {
    "pnl": 604.40,
    "trades": 1,
    "wins": 1,
    "losses": 0
  },
  "edge_decay": {
    "triggers_active": 0,
    "status": "GREEN",
    "consecutive_alerts": 0
  },
  "timestamp": "2026-02-23T14:30:00Z"
}
```

---

### GET /config

Retrieve current system configuration.

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/v1/config` |
| Query Params | `scope` (GLOBAL/INSTRUMENT/AGENT), `instrument` (optional), `key` (optional, specific parameter path) |
| Request Body | None |
| Auth | None |
| Rate Limit | 30/minute |

**Response (200 OK):**

```json
{
  "scope": "GLOBAL",
  "config": {
    "risk": {
      "max_risk_per_trade_pct": 1.0,
      "max_portfolio_heat_pct": 6.0,
      "daily_loss_limit_pct": 2.0,
      "drawdown_halt_pct": 20.0,
      "max_correlated_positions": 3
    },
    "signal": {
      "zigzag_left": 5,
      "zigzag_right": 5,
      "atr_threshold": 1.0,
      "min_touches": 3,
      "q_threshold_a": 0.70,
      "q_threshold_b": 0.55,
      "break_beta_p": 0.20,
      "break_beta_c": 0.40,
      "retest_window_bars": 12,
      "retest_atr_tolerance": 0.40
    }
  },
  "version": 42,
  "last_changed_at": "2026-02-20T18:00:00Z"
}
```

---

### PUT /config

Update system configuration parameters.

| Property | Value |
|----------|-------|
| Method | PUT |
| Path | `/api/v1/config` |
| Query Params | None |
| Auth | None (localhost) |
| Rate Limit | 5/minute |

**Request Body:**

```json
{
  "scope": "GLOBAL",
  "key": "risk.max_portfolio_heat_pct",
  "value": 5.0,
  "reason": "Reducing heat during elevated VIX period"
}
```

**Response (200 OK):**

```json
{
  "status": "applied",
  "scope": "GLOBAL",
  "key": "risk.max_portfolio_heat_pct",
  "previous_value": 6.0,
  "new_value": 5.0,
  "version": 43,
  "applied_at": "2026-02-23T14:32:00Z"
}
```

**Response (400 Bad Request):** Invalid key or value out of allowed range.
**Response (403 Forbidden):** Change requires human approval (ADMIN-level parameter).

---

### POST /mode

Change the system operating mode.

| Property | Value |
|----------|-------|
| Method | POST |
| Path | `/api/v1/mode` |
| Query Params | None |
| Auth | None (localhost) |
| Rate Limit | 2/minute |

**Request Body:**

```json
{
  "target_mode": "MANUAL",
  "reason": "Switching to manual for review session"
}
```

**Response (200 OK):**

```json
{
  "status": "mode_changed",
  "previous_mode": "SUPERVISED",
  "new_mode": "MANUAL",
  "effective_at": "2026-02-23T14:32:00Z",
  "restrictions": []
}
```

**Response (400 Bad Request):** Invalid mode or transition not allowed (e.g., HALTED to AUTONOMOUS directly).

Valid modes: `MANUAL`, `SUPERVISED`, `AUTONOMOUS`, `HALTED`.
Valid transitions: MANUAL <-> SUPERVISED <-> AUTONOMOUS. Any mode -> HALTED. HALTED -> MANUAL only (must restart from MANUAL).

---

### GET /history

Retrieve historical trade data.

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/v1/history` |
| Query Params | `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD), `instrument` (optional), `grade` (optional), `regime` (optional), `limit` (int, default 100, max 1000), `offset` (int, default 0) |
| Request Body | None |
| Auth | None |
| Rate Limit | 10/minute |

**Response (200 OK):**

```json
{
  "trades": [
    {
      "trade_id": "TRD001",
      "instrument": "AAPL",
      "direction": "LONG",
      "entry_time": "2026-02-23T10:42:00Z",
      "exit_time": "2026-02-23T15:30:00Z",
      "entry_price": 182.40,
      "exit_price": 186.80,
      "r_multiple": 2.1,
      "realized_pnl": 528.00,
      "grade": "A",
      "regime": "TRENDING",
      "exit_reason": "PHASE_4_PIVOT_STOP"
    }
  ],
  "total": 156,
  "limit": 100,
  "offset": 0
}
```

<!-- /SSOT-API-REST-01 -->

---

<!-- SSOT-API-BROKER-01 -->
## SSOT-API-BROKER-01: IBKR TWS Integration

Interactive Brokers integration via the TWS API (or IB Gateway). The Execution agent communicates with IBKR through a Python adapter layer using the `ib_insync` library.

### Connection

| Property | Value |
|----------|-------|
| Protocol | TCP socket (TWS API protocol) |
| Library | `ib_insync` (Python async wrapper) |
| TWS Port (Live) | 7496 |
| TWS Port (Paper) | 7497 |
| IB Gateway Port (Live) | 4001 |
| IB Gateway Port (Paper) | 4002 |
| Client ID | 1 (configurable, must be unique per connection) |
| Connection Timeout | 10 seconds |
| Read-only API | Disabled (must allow order placement) |
| Master Client ID | 0 (reserved for manual TWS usage) |

### Order Types Supported

| Order Type | IBKR Code | PCTT Usage | Parameters |
|------------|-----------|------------|------------|
| MARKET | `MKT` | Fail-fast exits, circuit breaker exits | None |
| LIMIT | `LMT` | Standard entries, partial exits, trailing stop adjustments | `lmtPrice` |
| STOP | `STP` | Initial stop-loss placement | `auxPrice` |
| STOP_LIMIT | `STP LMT` | Trailing stop management (all phases) | `auxPrice` (trigger), `lmtPrice` (limit) |
| TRAILING_STOP | `TRAIL` | Phase 4+ trailing (alternative to manual adjustment) | `trailingPercent` or `auxPrice` (trail amount) |

**Order attributes used:**

| Attribute | Value | Description |
|-----------|-------|-------------|
| tif | "DAY" | Time in force: day orders only (no GTC) |
| outsideRth | false | No orders during extended hours (configurable) |
| transmit | true | Always transmit immediately (no manual confirm) |
| account | Configured account ID | Explicit account targeting |

### Data Subscriptions

| Subscription | Method | Parameters | Frequency |
|-------------|--------|------------|-----------|
| Real-time 5s bars | `reqRealTimeBars()` | instrument, 5, "TRADES", useRTH=True | Every 5 seconds |
| Historical bars | `reqHistoricalData()` | instrument, endDateTime, duration, barSize | On demand |
| Account updates | `reqAccountUpdates()` | subscribe=True, account | Real-time on change |
| Position updates | `reqPositions()` | | Real-time on change |
| Order status | `reqOpenOrders()` + callbacks | | Real-time on change |
| Market data | `reqMktData()` | instrument, genericTickList | Streaming tick data |

**Historical data bar sizes supported:** 1 min, 5 mins, 15 mins, 1 hour, 4 hours, 1 day, 1 week.
**Historical data durations:** 1 D, 2 D, 1 W, 1 M, 3 M, 6 M, 1 Y, 2 Y.

### Error Codes and Handling

| Code | Severity | Description | PCTT Action |
|------|----------|-------------|-------------|
| 162 | Warning | Historical data request pacing violation | Backoff 10 seconds, retry |
| 200 | Error | No security definition found | Remove from watchlist, alert |
| 201 | Error | Order rejected | Log to Journal, alert Orchestrator |
| 202 | Info | Order cancelled | Confirm cancellation |
| 321 | Error | Server error validating request | Retry once, then alert |
| 354 | Error | No subscription for market data | Resubscribe, alert if persistent |
| 502 | Fatal | Cannot connect to TWS | Reconnection protocol |
| 504 | Fatal | Not connected | Reconnection protocol |
| 1100 | Fatal | Connectivity lost | Reconnection protocol, halt new orders |
| 1101 | Info | Connectivity restored (data lost) | Resync positions and orders |
| 1102 | Info | Connectivity restored (data intact) | Resume normal operation |
| 2104 | Info | Market data farm connected | Log |
| 2106 | Info | HMDS data farm connected | Log |
| 2158 | Warning | Sec-def data farm connected | Log |

### Rate Limits and Throttling

| Operation | Limit | Enforcement |
|-----------|-------|-------------|
| Order submissions | 50 per second | Client-side queue with 20ms spacing |
| Historical data requests | 6 per 2 seconds for same instrument, 60 per 10 minutes total | Client-side pacing with backoff |
| Market data subscriptions | 100 concurrent (varies by account tier) | Track active subscriptions |
| Account data requests | 1 per second | Client-side throttle |
| Message rate | 50 per second | TWS enforced |

### Reconnection Strategy

| Step | Action | Timing |
|------|--------|--------|
| 1 | Detect disconnect (error 1100 or socket close) | Immediate |
| 2 | Halt all new order submissions | Immediate |
| 3 | Attempt reconnection | 5 second delay |
| 4 | Exponential backoff retries | 5s, 10s, 20s, 40s, 60s, 60s (cap) |
| 5 | Max reconnection attempts | 20 |
| 6 | On reconnect: resync open orders | Immediate |
| 7 | On reconnect: resync positions | Immediate |
| 8 | On reconnect: verify account state | Immediate |
| 9 | On reconnect: resume data subscriptions | After position sync |
| 10 | If max attempts exceeded: enter HALTED mode, notify human | After 20 failures |

<!-- /SSOT-API-BROKER-01 -->

---

<!-- SSOT-API-BROKER-02 -->
## SSOT-API-BROKER-02: Alpaca Integration

Alpaca serves as an alternative broker, primarily for paper trading and development. The integration uses the Alpaca Trade API v2 (REST + WebSocket).

### REST API

| Property | Value |
|----------|-------|
| Base URL (Paper) | `https://paper-api.alpaca.markets` |
| Base URL (Live) | `https://api.alpaca.markets` |
| API Version | v2 |
| Auth Header | `APCA-API-KEY-ID: {key}` and `APCA-API-SECRET-KEY: {secret}` |
| Content-Type | application/json |

### Authentication

| Property | Value |
|----------|-------|
| Method | API Key + Secret in HTTP headers |
| Key storage | Encrypted in `config/credentials.yaml` (AES-256) |
| Key rotation | Manual, recommended every 90 days |

### WebSocket Streaming

| Property | Value |
|----------|-------|
| URL (Paper) | `wss://paper-api.alpaca.markets/stream` |
| URL (Live) | `wss://api.alpaca.markets/stream` |
| Data streams | `trade_updates` (order/fill events) |
| Auth message | `{"action": "auth", "key": "...", "secret": "..."}` |
| Subscribe message | `{"action": "listen", "data": {"streams": ["trade_updates"]}}` |

### Order Submission

```json
POST /v2/orders
{
  "symbol": "AAPL",
  "qty": 120,
  "side": "buy",
  "type": "limit",
  "time_in_force": "day",
  "limit_price": 182.50,
  "stop_price": null,
  "client_order_id": "pctt_ORD001_20260223"
}
```

**Supported order types:** `market`, `limit`, `stop`, `stop_limit`, `trailing_stop`.
**Supported TIF values:** `day`, `gtc`, `ioc`, `fok`.

### Position Queries

```
GET /v2/positions                 # All open positions
GET /v2/positions/{symbol}        # Specific position
DELETE /v2/positions              # Close all positions
DELETE /v2/positions/{symbol}     # Close specific position
```

### Account Information

```
GET /v2/account                   # Account details (equity, buying power, etc.)
GET /v2/account/activities        # Account activity history
```

### Paper vs Live Switching

| Property | Paper | Live |
|----------|-------|------|
| Base URL | `paper-api.alpaca.markets` | `api.alpaca.markets` |
| API Keys | Separate paper keys | Separate live keys |
| Config key | `broker.alpaca.paper_mode: true` | `broker.alpaca.paper_mode: false` |
| Switch mechanism | Config change + restart | Config change + restart |
| Safeguard | Paper mode is default. Live mode requires explicit confirmation and `broker.alpaca.live_confirmed: true` in config. |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Orders | 200/minute |
| Other API calls | 200/minute |
| WebSocket connections | 1 per API key |
| Data API | Separate limits (see SSOT-API-DATA-01) |

<!-- /SSOT-API-BROKER-02 -->

---

<!-- SSOT-API-DATA-01 -->
## SSOT-API-DATA-01: Polygon.io Market Data

Polygon.io provides historical and real-time market data. The PCTT system uses Polygon for bar data, snapshots, and reference data. Real-time streaming uses Polygon's WebSocket feed.

### REST Endpoints

**Base URL:** `https://api.polygon.io`
**Auth:** Query parameter `apiKey={key}` or header `Authorization: Bearer {key}`

---

#### GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}

Aggregate bars (OHLCV) for a date range.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticker | string (path) | Yes | Ticker symbol (e.g., AAPL) |
| multiplier | int (path) | Yes | Bar size multiplier (1, 5, 15, etc.) |
| timespan | string (path) | Yes | minute, hour, day, week, month |
| from | string (path) | Yes | Start date (YYYY-MM-DD) or timestamp (ms) |
| to | string (path) | Yes | End date (YYYY-MM-DD) or timestamp (ms) |
| adjusted | boolean (query) | No | Adjust for splits (default true) |
| sort | string (query) | No | asc or desc (default asc) |
| limit | int (query) | No | Max results (default 5000, max 50000) |

**Response:**

```json
{
  "ticker": "AAPL",
  "queryCount": 100,
  "resultsCount": 100,
  "adjusted": true,
  "results": [
    {
      "v": 234567,
      "vw": 185.42,
      "o": 185.40,
      "c": 185.60,
      "h": 185.80,
      "l": 185.20,
      "t": 1708700400000,
      "n": 1234
    }
  ],
  "status": "OK",
  "request_id": "abc123"
}
```

**Field mapping to OHLCVBar:**

| Polygon Field | PCTT Field | Description |
|---------------|-----------|-------------|
| t | timestamp | Unix timestamp in milliseconds |
| o | open | Open price |
| h | high | High price |
| l | low | Low price |
| c | close | Close price |
| v | volume | Trading volume |
| vw | (derived) | Volume-weighted average price |
| n | (metadata) | Number of transactions |

---

#### GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}

Real-time snapshot for a single ticker.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticker | string (path) | Yes | Ticker symbol |

**Response includes:** last trade, last quote, minute bar, daily bar, previous day bar.

---

#### GET /v3/reference/tickers

Reference data for instruments.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticker | string (query) | No | Filter by ticker |
| type | string (query) | No | CS (common stock), ETF, etc. |
| market | string (query) | No | stocks, crypto, fx, otc |
| exchange | string (query) | No | Exchange code |
| active | boolean (query) | No | Only active tickers |
| limit | int (query) | No | Max results (default 100, max 1000) |

Used by the Research agent for universe discovery and the Sentinel agent for instrument profile building.

---

### WebSocket Streaming

| Property | Value |
|----------|-------|
| URL (Stocks) | `wss://socket.polygon.io/stocks` |
| URL (Crypto) | `wss://socket.polygon.io/crypto` |
| URL (Forex) | `wss://socket.polygon.io/forex` |
| Auth message | `{"action": "auth", "params": "{api_key}"}` |

**Subscribe to channels:**

```json
{"action": "subscribe", "params": "AM.AAPL,AM.NVDA,AM.MSFT"}
```

**Channel prefixes:**

| Prefix | Channel | Description | Frequency |
|--------|---------|-------------|-----------|
| T. | Trades | Individual trades | Per trade |
| Q. | Quotes | NBBO quotes | Per quote update |
| AM. | Minute Aggregates | 1-minute OHLCV bars | Every minute |
| A. | Second Aggregates | Per-second aggregates | Every second |

**Minute Aggregate message (AM.*):**

```json
{
  "ev": "AM",
  "sym": "AAPL",
  "v": 12345,
  "av": 567890,
  "op": 185.10,
  "vw": 185.42,
  "o": 185.40,
  "c": 185.60,
  "h": 185.80,
  "l": 185.20,
  "a": 185.35,
  "z": 100,
  "s": 1708700400000,
  "e": 1708700460000
}
```

| Field | Description |
|-------|-------------|
| ev | Event type (AM for minute agg) |
| sym | Ticker symbol |
| v | Volume for this bar |
| av | Accumulated volume for the day |
| op | Official open price for the day |
| vw | Volume-weighted average price |
| o | Open |
| c | Close |
| h | High |
| l | Low |
| a | Today's VWAP |
| z | Average trade size |
| s | Bar start timestamp (ms) |
| e | Bar end timestamp (ms) |

### Rate Limits by Tier

| Tier | REST Calls/Minute | WebSocket Connections | Historical Data Limit |
|------|-------------------|----------------------|----------------------|
| Basic (Free) | 5 | 1 | 2 years, end-of-day only |
| Starter | 100 | 1 | 2 years, minute bars |
| Developer | 1,000 | 1 | 5+ years, minute bars |
| Advanced | Unlimited | 1 | 15+ years, all bar sizes |
| Enterprise | Unlimited | Multiple | Full history |

**PCTT Recommended Tier:** Developer or Advanced (minute-level data required for pipeline).

### Data Normalization

All Polygon data is normalized to the internal OHLCVBar format before use by any agent:

```python
def normalize_polygon_bar(raw: dict, instrument: str, timeframe: str) -> OHLCVBar:
    """
    Convert a Polygon aggregate bar to the internal OHLCVBar format.
    """
    from datetime import datetime, timezone

    return OHLCVBar(
        timestamp=datetime.fromtimestamp(raw["t"] / 1000, tz=timezone.utc),
        open=float(raw["o"]),
        high=float(raw["h"]),
        low=float(raw["l"]),
        close=float(raw["c"]),
        volume=float(raw["v"]),
        instrument=instrument,
        timeframe=timeframe,
    )
```

**Data quality checks applied after normalization:**

1. Reject bars where high < low (invalid data).
2. Reject bars where volume is negative.
3. Reject bars where open, high, low, or close is zero or negative.
4. Flag bars where volume is zero (may indicate pre/post market or data gap).
5. Flag bars where the range (high minus low) exceeds 5x the 20-bar ATR (possible data error).

<!-- /SSOT-API-DATA-01 -->

---

**End of SSOT Batch 2a-APIs**
