# PCTT Agentic System Architecture (Part 2)

## 6. A Day in the Life: Complete Daily Workflow

This section maps the agentic system's daily workflow to the book's practical routines from Chapters 25-31 (Section 6: The Trader's Day).

### 6.1 Daily Timeline Overview

```mermaid
gantt
    title PCTT Agentic System Daily Schedule (US Equities)
    dateFormat HH:mm
    axisFormat %H:%M

    section Sentinel
    Wake + Data Collection      :s1, 08:00, 30min
    Gap Analysis + News Scan    :s2, after s1, 15min
    MarketBrief Publication     :s3, after s2, 15min
    Session Monitoring          :s4, 09:30, 390min
    Post-Market Wind Down       :s5, 16:00, 30min

    section Regime
    Initial Classification      :r1, 08:45, 15min
    Continuous Monitoring        :r2, 09:30, 390min

    section Signal
    Pre-scan Structures          :sg1, 09:00, 30min
    Pipeline Active              :sg2, 09:35, 385min

    section Risk
    Portfolio Health Check       :rk1, 08:30, 15min
    Continuous Validation        :rk2, 09:30, 390min

    section Orchestrator
    Wake All Agents              :o1, 08:00, 5min
    Human Briefing               :o2, 09:15, 15min
    Session Coordination         :o3, 09:30, 390min
    Trigger Post-Market          :o4, 16:00, 5min

    section Execution
    Verify Broker Connection     :e1, 09:20, 10min
    Position Management          :e2, 09:30, 390min
    EOD Position Review          :e3, 15:45, 15min

    section Journal
    Load Yesterday's State       :j1, 08:00, 10min
    Real-time Recording          :j2, 09:30, 390min
    Daily Report Generation      :j3, 16:05, 25min
    Report to Human              :j4, after j3, 5min

    section Human
    Review MarketBrief           :h1, 09:15, 15min
    Session: Approve/Reject      :h2, 09:30, 390min
    Review Daily Report          :h3, 16:30, 15min
```

### 6.2 Phase 1: Pre-Market (08:00-09:30 ET)

**Book Reference:** Chapter 25 "Before the Bell: Pre-Market Preparation Protocol"

The book prescribes a 25-35 minute pre-market routine. The agentic system automates and extends this to 90 minutes, starting at 08:00 ET.

#### 6.2.1 Sentinel Pre-Market Workflow (08:00-08:45)

```mermaid
graph TD
    A[08:00 Wake] --> B[Fetch overnight futures<br/>ES NQ YM RTY]
    B --> C[Calculate gaps for<br/>all watchlist instruments]
    C --> D[Classify gaps:<br/>< 0.3% = Small/Fade<br/>0.3-0.7% = Medium/Wait<br/>0.7-1.5% = Large/With Gap<br/>> 1.5% = Massive/Trend Day]
    D --> E[Check Asia session:<br/>Nikkei DAX FTSE<br/>sentiment + moves]
    E --> F[Bond market:<br/>10Y yield 2Y yield<br/>Curve slope]
    F --> G[Commodity check:<br/>Crude Gold DXY]
    G --> H[VIX analysis:<br/>Spot + term structure<br/>Contango vs backwardation]
    H --> I[News scan:<br/>Overnight geopolitical<br/>Central bank actions<br/>Major corp events]
    I --> J[Calendar check:<br/>Tier 1: FOMC CPI NFP GDP<br/>Tier 2: PPI retail ISM<br/>Tier 3: Background noise]
    J --> K[Build MarketBrief]
    K --> L[Publish to Event Bus<br/>08:45 deadline]
```

**Automated Pre-Market Preparation Worksheet (from Chapter 25):**

```python
@dataclass
class PreMarketWorksheet:
    # Step 1: Overnight futures
    es_gap_pct: float
    nq_gap_pct: float
    gap_classification: str  # SMALL, MEDIUM, LARGE, MASSIVE

    # Step 2: Global sentiment
    asia_direction: str  # BULLISH, BEARISH, MIXED
    europe_direction: str

    # Step 3: Bond market
    yield_10y: float
    yield_2y: float
    curve_slope: float  # Positive = normal, negative = inverted

    # Step 4: VIX regime
    vix_level: float
    vix_regime: str  # LOW_VOL, NORMAL, ELEVATED, CRISIS
    vix_direction: str  # RISING, FALLING, FLAT
    term_structure: str  # CONTANGO, BACKWARDATION

    # Step 5: Commodities
    crude_direction: str
    gold_direction: str
    dxy_direction: str

    # Step 6: Calendar
    tier_1_events: list  # [{event, time, expected_impact}]
    earnings_today: list  # [{ticker, time, pre/post}]
    fed_speakers: list

    # Step 7: Regime assessment
    adx_reading: float
    overnight_range_vs_20day: float  # Percentage
    regime_summary: str  # TRENDING, RANGING, TRANSITIONAL, CRISIS

    # Step 8: Key levels (top 3 above, top 3 below)
    resistance_levels: list  # [price, source, timeframe]
    support_levels: list

    # Step 9: Today's plan
    bias: str  # LONG, SHORT, NEUTRAL
    max_trades: int
    position_size_adjustment: float  # 1.0 = normal, 0.5 = reduced
```

#### 6.2.2 Regime Initial Classification (08:45-09:00)

After receiving MarketBrief, Regime agent runs initial ensemble on all watchlist instruments.

```mermaid
graph TD
    A[Receive MarketBrief] --> B[For each instrument<br/>in watchlist]
    B --> C[Fetch last 200 bars<br/>at meso timeframe]
    C --> D[Run 6-method ensemble]
    D --> E{Regime classified?}
    E -->|TRENDING| F[Active for PCTT]
    E -->|VOLATILE| G[Active with<br/>1.5x ATR params]
    E -->|MEAN_REVERTING| H[Boundary plays only]
    E -->|CHOPPY| I[Excluded from<br/>today's watchlist]
    F --> J[Publish per-instrument<br/>regime classification]
    G --> J
    H --> J
    I --> J
    J --> K[Final tradeable<br/>instrument list]
```

#### 6.2.3 Human Briefing (09:15-09:30)

The Orchestrator presents the human with a concise morning briefing:

```
========================================
PCTT MORNING BRIEFING - [Date]
========================================

MARKET ENVIRONMENT:
  VIX: 18.5 (NORMAL) | Direction: Flat
  ES Gap: +0.4% (MEDIUM) | NQ Gap: +0.6% (MEDIUM)
  Bond: 10Y 4.32% (+2bp) | Curve: +42bp (normal)
  DXY: 104.2 (flat) | Oil: $78.50 (+0.3%)

REGIME STATUS:
  Portfolio Regime: TRENDING (5/6 agreement)
  CUSUM: No alarms

TRADEABLE INSTRUMENTS (6 of 12 watchlist):
  AAPL: TRENDING (ER=0.52) - Active frozen structure from yesterday
  MSFT: TRENDING (ER=0.48) - No active structures
  NVDA: VOLATILE (ER=0.61) - Break pending confirmation
  ES:   TRENDING (ER=0.55) - Clean, no structures
  EUR/USD: MEAN_REVERTING - Boundary plays only
  BTC:  TRENDING (ER=0.47) - Active frozen structure

EXCLUDED (CHOPPY):
  AMZN, GOOGL, TSLA, NQ, GBP/USD, ETH

CALENDAR:
  10:00 AM: ISM Services (Tier 2)
  No Tier 1 events today
  No earnings for watchlist instruments

PORTFOLIO STATUS:
  Equity: $102,340 | DD: 2.1% | Heat: 1.8% (1 open position)
  Survival Score: 9/10
  Open: AAPL LONG 50 shares, +0.6R, Phase 4 trailing

PLAN:
  Bias: LONG (HTF trend intact)
  Max new positions: 2
  Focus: AAPL retest opportunity, NVDA break confirmation
========================================
[Approve Plan] [Modify] [No Trading Today]
```

### 6.3 Phase 2: Market Session (09:30-16:00 ET)

**Book Reference:** Chapter 26 (First 30 Minutes), Chapter 27 (Mid-Session Management), Chapter 28 (The Close)

#### 6.3.1 First 30 Minutes (09:30-10:00)

```mermaid
graph TD
    A[09:30 Market Open] --> B[Sentinel: Record opening<br/>print and ORB range]
    B --> C[Signal: DO NOT generate<br/>signals for 5 minutes<br/>Ch.26: Let spreads settle]
    C --> D[09:35 First candle<br/>analysis]
    D --> E{Large range candle<br/>greater than 2x avg?}
    E -->|Yes| F[High energy day<br/>Expect continuation]
    E -->|No| G[Normal or Undecided<br/>Wait for structure]
    F --> H[09:35-09:45<br/>First pullback watch]
    G --> H
    H --> I[09:45-10:00<br/>Opening range established]
    I --> J[Signal: Begin full<br/>12-stage pipeline]
    J --> K[10:00 Reversal window<br/>Check: Did direction change?]
    K --> L[Full session<br/>monitoring begins]
```

#### 6.3.2 Core Session Loop (10:00-15:00)

Every bar, the system executes this loop:

```mermaid
graph TD
    A[New Bar Arrives] --> B[Sentinel: Update<br/>session context]
    B --> C[Regime: Update<br/>ensemble votes]
    C --> D{Regime changed?}
    D -->|Yes| E[Publish regime_transition<br/>Alert all agents]
    D -->|No| F[Continue]
    E --> F

    F --> G[Signal: Run<br/>12-stage pipeline]
    G --> H{Entry proposal<br/>generated?}
    H -->|No| I[Check existing<br/>positions]
    H -->|Yes| J[Risk: Validate<br/>proposal]
    J --> K{Risk approved?}
    K -->|No| L[Log rejection]
    K -->|Yes| M[Orchestrator:<br/>Human approval gate]
    M --> N{Human approves?}
    N -->|Yes| O[Execution: Place<br/>order]
    N -->|No/Timeout| P[Log and resume]

    I --> Q[Execution: For each<br/>open position]
    Q --> R[Update trailing stop<br/>per phase rules]
    R --> S{Fail-fast<br/>triggered?}
    S -->|Yes| T[IMMEDIATE EXIT<br/>Market order]
    S -->|No| U{Stop hit?}
    U -->|Yes| V[EXIT<br/>Log to Journal]
    U -->|No| W{Partial exit<br/>at 1R?}
    W -->|Yes| X[Execute 60%<br/>partial exit]
    W -->|No| Y[Continue<br/>holding]

    T --> V
    V --> Z[Journal: Record<br/>PCTTTradeRecord]
```

#### 6.3.3 Lunch Hour Protocol (11:30-13:30)

**Book Reference:** Chapter 27 "The Lunch Hour Trap"

```mermaid
graph TD
    A[11:30 Lunch Hour<br/>Begins] --> B[Sentinel publishes<br/>LUNCH_HOUR event]
    B --> C[Signal: PAUSE<br/>new signal generation]
    C --> D[Execution: Continue<br/>managing open positions]
    D --> E{Profitable position<br/>stalling?}
    E -->|Yes| F[Tighten trailing stop<br/>Volume declining + narrow candles]
    E -->|No| G[Hold per phase rules]

    B --> H[Human notification:<br/>Lunch hour. No new setups.<br/>Review morning trades.<br/>Update afternoon levels.]

    I[13:15 Pre-afternoon] --> J[Sentinel publishes<br/>SESSION_RESUME]
    J --> K[Signal: Resume<br/>pipeline processing]
    K --> L[Regime: Re-run<br/>ensemble fresh]
```

**Book quote from Ch.27:** "Volume drops 40-60% during lunch vs. first 90 min. False breakout rate rises to 68%. Do NOT initiate new positions 11:30-13:30."

#### 6.3.4 Power Hour Protocol (15:00-16:00)

**Book Reference:** Chapter 28 "Power Hour"

```mermaid
graph TD
    A[15:00 Power Hour<br/>Begins] --> B[Sentinel publishes<br/>POWER_HOUR event]
    B --> C[Phase 1: 15:00-15:15<br/>The Reveal<br/>Institutional flow visible]
    C --> D[Phase 2: 15:15-15:30<br/>Acceleration<br/>Direction confirmed?]
    D --> E[Phase 3: 15:30-15:50<br/>Algorithmic Surge<br/>Volume ramps]
    E --> F[Phase 4: 15:50-16:00<br/>MOC Imbalance Published]

    B --> G[Execution: Decision<br/>by 15:00 for open trades]
    G --> H{Take profit<br/>or hold through close?}
    H -->|Take| I[Close profitable<br/>positions]
    H -->|Hold| J[Maintain stops<br/>Accept overnight risk]

    F --> K{MOC imbalance<br/>greater than 1B?}
    K -->|Buy imbalance| L[Expect 3-8pt<br/>ES rally into close]
    K -->|Sell imbalance| M[Expect 3-8pt<br/>ES decline into close]
    K -->|Small| N[No mechanical<br/>edge at close]

    O[15:45] --> P[Execution: Review<br/>overnight position decisions]
    P --> Q{Hold overnight?}
    Q -->|No earnings, no events,<br/>trend aligned, stop at BE| R[HOLD with reduced size]
    Q -->|Earnings tonight,<br/>VIX greater than 30, Friday| S[FLATTEN before close]
```

### 6.4 Phase 3: Post-Market (16:00-17:00 ET)

**Book Reference:** Chapter 28 (Post-Market Journaling), Chapter 29 (Trading Journal)

#### 6.4.1 Post-Market Workflow

```mermaid
graph TD
    A[16:00 Market Close] --> B[Sentinel: Publish<br/>MARKET_CLOSE event]
    B --> C[Execution: Finalize<br/>all pending orders]
    C --> D[Journal: Begin<br/>daily report]

    D --> E[Step 1: Log all<br/>trades with full<br/>PCTTTradeRecord]
    E --> F[Step 2: Calculate<br/>daily PnL and<br/>R-multiples]
    F --> G[Step 3: Update<br/>rolling 20-trade metrics]
    G --> H[Step 4: Check<br/>edge decay indicators]
    H --> I{Edge decay<br/>detected?}
    I -->|Yes| J[EDGE DECAY ALERT<br/>Include in report]
    I -->|No| K[Continue]
    J --> K
    K --> L[Step 5: Scan missed<br/>setups that passed<br/>all gates but were not taken]
    L --> M[Step 6: Update<br/>correlation matrix]
    M --> N[Step 7: Prepare<br/>next-day watchlist]
    N --> O[Generate Daily Report]
    O --> P[Orchestrator sends<br/>to Human]
```

#### 6.4.2 The 5-Minute Speed Journal (from Chapter 29)

The Journal agent produces this automatically:

```python
@dataclass
class DailySpeedJournal:
    date: str
    market_regime: str  # Low Vol / Normal / Elevated / Crisis
    vix_close: float
    sp500_change_pct: float
    trades_taken: int
    wins: int
    losses: int
    total_pnl: float
    best_trade: dict  # {setup, r_multiple}
    worst_trade: dict  # {setup, r_multiple}
    laws_violated: list  # Any law violations detected
    system_emotional_state: str  # Disciplined / Cautious / Aggressive
    one_sentence_summary: str  # Auto-generated
```

**Book quote from Ch.29:** "The one-sentence summary is most critical. After 30 days, 30 sentences reveal patterns invisible in the moment."

#### 6.4.3 Weekly Review (Sunday, 30 minutes)

**Book Reference:** Chapter 29 (Weekly Review Protocol), Chapter 31 (Weekly Rhythm)

```mermaid
graph TD
    A[Sunday: Weekly Review<br/>Triggered by Orchestrator] --> B[Step 1: Equity Curve<br/>Analysis 5 min]
    B --> C[Smooth or jagged?<br/>Largest win vs loss ratio<br/>Drawdown recovery time]
    C --> D[Step 2: Win/Loss<br/>Clustering 5 min]
    D --> E[By day of week<br/>By time of day<br/>By instrument<br/>By regime]
    E --> F[Step 3: Law Violation<br/>Tracking 10 min]
    F --> G[Which laws violated?<br/>Which laws followed?<br/>Cost of violations in R]
    G --> H[Step 4: Setup<br/>Attribution 10 min]
    H --> I[A-Grade vs B-Grade<br/>Regime-conditional<br/>Instrument-specific]
    I --> J[Generate Weekly<br/>Report to Human]
    J --> K{Adjustments<br/>needed?}
    K -->|Yes| L[Propose parameter<br/>changes for next week]
    K -->|No| M[Maintain current<br/>configuration]
```

### 6.5 Crisis Workflow

**Book Reference:** Chapter 28 (Crisis Protocols), Strativion crisis-protocols.yaml

```mermaid
graph TD
    A[CRISIS TRIGGER<br/>Any of: VIX greater than 35,<br/>SPX drop greater than 3%,<br/>Correlation greater than 0.7,<br/>Spreads greater than 3x normal] --> B[Sentinel: Publish<br/>CRISIS_ALERT]

    B --> C[Orchestrator:<br/>IMMEDIATE HALT]
    C --> D[All agents enter<br/>CRISIS MODE]

    D --> E[Phase 1: Reduce<br/>First 30 Minutes]
    E --> E1[Cut gross exposure 50%]
    E --> E2[Set max heat to 3%]
    E --> E3[Widen stops by 1.5x ATR]
    E --> E4[Cancel all pending orders]

    E1 --> F[Phase 2: Hedge<br/>Minutes 30-60]
    E2 --> F
    E3 --> F
    E4 --> F
    F --> F1[Activate tail hedges]
    F --> F2[Check correlation >= 0.8<br/>Reduce to 3 positions max]
    F --> F3[Daily loss limit to 1.5%]

    F1 --> G[Phase 3: Monitor<br/>Ongoing]
    F2 --> G
    F3 --> G
    G --> G1[Risk report every 2 hours]
    G --> G2[Log all actions]
    G --> G3[No discretionary decisions]

    G1 --> H{Re-entry<br/>conditions met?}
    H -->|No| G
    H -->|Yes| I[Re-Entry Protocol]
    I --> I1[Days 1-5: 25% size]
    I --> I2[Days 5-10: 50% size]
    I --> I3[Days 10-20: 75% size]
    I --> I4[Day 20+: Normal if clean]
```

**Re-entry conditions (ALL must be met):**
1. VIX peaked and declined, closed below 25 for 5 consecutive sessions
2. Portfolio correlation returned below 0.5
3. Spreads normalized (< 1.5x pre-crisis)
4. No circuit breakers in prior 10 sessions
5. ADX shows identifiable regime

---

## 7. Guardrails Architecture

### 7.1 Three Layers of Protection

```mermaid
graph TB
    subgraph "Layer 1: Agent-Level Guardrails"
        G1[Each agent has<br/>hardcoded limits]
        G1A[Signal: Non-repainting<br/>One-break-one-trade]
        G1B[Risk: 2% max per trade<br/>8% max heat]
        G1C[Execution: Stop required<br/>for every position]
    end

    subgraph "Layer 2: System-Level Guardrails"
        G2[Cross-agent rules<br/>enforced by Orchestrator]
        G2A[No trading during CHOPPY]
        G2B[Human approval required<br/>for all entries]
        G2C[Circuit breakers<br/>halt everything]
    end

    subgraph "Layer 3: Survival Overrides"
        G3[Law 30 hardcoded<br/>Cannot be overridden]
        G3A[20% DD = automatic halt]
        G3B[Crisis = immediate reduction]
        G3C[Any agent can trigger<br/>emergency stop]
    end

    G1 --> G2
    G2 --> G3
```

### 7.2 Complete Guardrail Matrix

| Guardrail | Agent | Type | Override Possible? | Consequence of Violation |
|-----------|-------|------|-------------------|------------------------|
| Non-repainting | Signal | Hard | No | System integrity failure |
| One-break-one-trade | Signal | Hard | No | Skip duplicate entry |
| Q-Score minimum 0.55 | Signal | Hard | No | Trade not generated |
| Regime gate | Signal + Regime | Hard | No | No signals in CHOPPY |
| Max risk 2% per trade | Risk | Hard | No | Position size capped |
| Max portfolio heat 8% | Risk | Hard | No | New trade rejected |
| Max correlated positions 5 | Risk | Hard | No | New trade rejected |
| Drawdown halt at 20% | Risk | Hard | No | All trading stops |
| Circuit breaker 2% daily loss | Risk | Hard | Human can resume | Session halted |
| Circuit breaker 3 consecutive losses | Risk | Soft | Human can override | Size reduced 50% |
| Human approval for entries | Orchestrator | Hard | No | Trade requires approval |
| Stop required for every position | Execution | Hard | No | Order rejected |
| Mandatory partial at 1R | Execution | Hard | No | Auto-executed |
| Fail-fast conditions | Execution | Hard | No | Immediate market exit |
| Trade recording mandatory | Journal | Hard | No | System blocks next trade |
| Lunch hour no new entries | Sentinel | Soft | Human can override | Warning issued |
| Session boundary respect | Sentinel | Soft | Human can override | Warning issued |

---

## 8. Observability & Monitoring

### 8.1 Observability Stack

```mermaid
graph TB
    subgraph "Data Collection"
        L1[Agent Logs<br/>Structured JSON]
        L2[Event Bus Log<br/>All events timestamped]
        L3[Trade Log<br/>PCTTTradeRecord]
        L4[Metric Counters<br/>Pipeline pass/fail rates]
    end

    subgraph "Processing"
        P1[Log Aggregator<br/>ELK or Loki]
        P2[Metrics Engine<br/>Prometheus or InfluxDB]
        P3[Alert Engine<br/>Rules-based alerting]
    end

    subgraph "Visualization"
        V1[Dashboard<br/>Grafana or Custom]
        V2[Alert Channel<br/>SMS or Discord or Email]
        V3[Daily Report<br/>PDF or HTML]
    end

    L1 --> P1
    L2 --> P1
    L3 --> P2
    L4 --> P2
    P1 --> V1
    P2 --> V1
    P1 --> P3
    P2 --> P3
    P3 --> V2
    P2 --> V3
```

### 8.2 Key Metrics to Monitor

| Metric | Source | Threshold | Alert Level |
|--------|--------|-----------|-------------|
| Pipeline rejection rate | Signal | Should be > 99% | Warning if < 98% |
| Signal generation rate | Signal | 1-3 per week per instrument | Warning if > 5/week |
| Regime classification confidence | Regime | Should be 4/6+ | Alert if 3/6 |
| Average fill slippage | Execution | < 0.1 ATR | Alert if > 0.2 ATR |
| Trailing stop phase distribution | Execution | Majority should reach Phase 3+ | Warning if > 50% exit Phase 1 |
| Portfolio heat utilization | Risk | Average 2-4% of 6% max | Warning if consistently > 5% |
| Circuit breaker activations | Risk | < 1 per month | Alert on every activation |
| Edge decay triggers | Journal | 0 of 3 triggers | Alert at 1, Pause at 2 |
| Human response time | Orchestrator | < 30 seconds | Warning if > 60s average |
| Broker connection uptime | Execution | 99.9% | Alert on any disconnection |
| Event bus latency | All | < 50ms | Alert if > 200ms |
| Memory store latency | All | < 10ms | Alert if > 100ms |

### 8.3 Dashboard Layout

```
+------------------------------------------------------+
| PCTT TRADING SYSTEM DASHBOARD                         |
+--------------+---------------+-----------------------+
| SYSTEM STATE | PORTFOLIO     | TODAY'S PERFORMANCE    |
| * NORMAL     | Equity: $102K | P&L: +$340 (+0.33%)   |
| Regime: TREND| DD: 2.1%     | Trades: 1W 0L          |
| VIX: 18.5   | Heat: 1.8%   | R-Total: +1.2R         |
| Session: OPEN| Survival: 9  | Win Rate: 100% (1/1)   |
+--------------+---------------+-----------------------+
| ACTIVE POSITIONS                                      |
| +-----+------+-------+------+-------+----+----------+|
| |Inst |Dir   |Entry  |Stop  |Phase  |R   |Heat      ||
| +-----+------+-------+------+-------+----+----------+|
| |AAPL |LONG  |195.50 |195.50|P4:Piv |+1.2|1.0%      ||
| |NVDA |      |PENDING|      |Signal |    |0.8%(est) ||
| +-----+------+-------+------+-------+----+----------+|
+------------------------------------------------------+
| AGENT STATUS                                          |
| Sentinel: * Active (session monitoring)               |
| Regime:   * Active (TRENDING 5/6, 47 bars)           |
| Signal:   * Active (NVDA in WAIT_RETEST state)       |
| Risk:     * Active (heat OK, no breakers)            |
| Executor: * Active (managing AAPL Phase 4)           |
| Journal:  * Active (recording)                       |
| Orchestr: * Active (NVDA proposal pending human)     |
+------------------------------------------------------+
| RECENT EVENTS                                         |
| 10:42 Signal: NVDA entry proposal (LONG, Q=0.72, A) |
| 10:42 Risk: APPROVED (76 shares, 0.98% risk)        |
| 10:42 Orchestrator: Awaiting human approval...       |
| 10:15 Execution: AAPL stop moved to BE (Phase 2->4) |
| 09:55 Regime: TRENDING confirmed (5/6, ER=0.52)     |
| 08:45 Sentinel: MarketBrief published                |
+------------------------------------------------------+
```

---

## 9. Testing Architecture

### 9.1 Test Pyramid

```mermaid
graph TB
    subgraph "Level 1: Unit Tests"
        U1[ATR calculation]
        U2[Pivot detection]
        U3[Q-Score math]
        U4[Position sizing]
        U5[Drawdown scaling]
        U6[Rejection scoring]
        U7[dGeom filter]
    end

    subgraph "Level 2: Integration Tests"
        I1[Signal pipeline<br/>end-to-end]
        I2[Risk validation<br/>chain]
        I3[Execution lifecycle<br/>entry to exit]
        I4[Journal recording<br/>and analytics]
    end

    subgraph "Level 3: Agent Tests"
        A1[Each agent in<br/>isolation with<br/>mock events]
        A2[Agent-to-agent<br/>communication]
        A3[Human approval<br/>simulation]
    end

    subgraph "Level 4: System Tests"
        S1[Full day simulation<br/>with historical data]
        S2[Crisis scenario<br/>testing]
        S3[Walk-forward<br/>validation]
        S4[Monte Carlo<br/>permutation]
    end

    U1 --> I1
    U2 --> I1
    U3 --> I1
    U4 --> I2
    U5 --> I2
    U6 --> I1
    U7 --> I1
    I1 --> A1
    I2 --> A1
    I3 --> A1
    I4 --> A1
    A1 --> S1
    A2 --> S1
    A3 --> S1
```

### 9.2 Critical Test Scenarios

| Scenario | What It Tests | Expected Behavior |
|----------|--------------|-------------------|
| Break without retest | Signal FSM timeout | FSM returns to IDLE after 12 bars |
| 20% drawdown | Risk circuit breaker | All trading halted immediately |
| VIX spike to 40 | Sentinel crisis detection | System enters CRISIS mode |
| Regime flip mid-trade | Execution fail-fast | Position closed if within 5 bars |
| Human unresponsive | Orchestrator timeout | Proposal auto-expires after 2 bars |
| Broker disconnection | Execution resilience | Alert + queue orders for reconnect |
| Correlated position attempt | Risk correlation check | New trade rejected |
| B-Grade at A-Grade size | Risk grade validation | Size capped at 0.5% |
| Same break re-entry | Signal one-break-one-trade | Entry blocked |
| Look-ahead in boundary | Signal non-repainting | t-1 data only used |
| Lunch hour signal | Sentinel session guard | Signal suppressed with warning |
| 3 consecutive losses | Risk circuit breaker | Size reduced 50% |
| Edge decay 2/3 triggers | Journal detection | System recommends pause |
| Flash crash | Crisis playbook 1 | 5-minute wait, then assess |
| MOC imbalance > $1B | Sentinel power hour | Alert published |

### 9.3 Backtesting Validation

```mermaid
graph TD
    A[Historical Data<br/>5+ years, 3+ TFs] --> B[Walk-Forward<br/>6 windows, 70/30 split]
    B --> C[Per Window:<br/>Optimize in-sample]
    C --> D[Test out-of-sample<br/>with frozen params]
    D --> E[Compute degradation<br/>ratio per window]
    E --> F{Avg degradation<br/>greater than 0.60?}
    F -->|No| G[Parameters overfit<br/>Simplify or widen]
    F -->|Yes| H[Monte Carlo<br/>10K permutations]
    H --> I{p-value < 0.05?}
    I -->|No| J[Edge not significant<br/>Need more data]
    I -->|Yes| K[White's Reality Check<br/>Multiple testing correction]
    K --> L{WRC p < 0.05?}
    L -->|No| M[Data snooping<br/>Reduce param space]
    L -->|Yes| N[VALIDATED<br/>Deploy with monitoring]
```

---

## 10. Configuration Architecture

### 10.1 Configuration Hierarchy

```mermaid
graph TB
    subgraph "Level 1: Global Defaults"
        G[pctt-parameters.yaml<br/>All 70+ parameters<br/>with validated defaults]
    end

    subgraph "Level 2: Market Overrides"
        M1[equities.yaml]
        M2[futures.yaml]
        M3[forex.yaml]
        M4[crypto.yaml]
        M5[commodities.yaml]
        M6[bonds.yaml]
    end

    subgraph "Level 3: Regime Overrides"
        R1[trending_params.yaml]
        R2[volatile_params.yaml]
        R3[mean_reverting_params.yaml]
    end

    subgraph "Level 4: Instrument Overrides"
        I1[AAPL_overrides.yaml]
        I2[ES_overrides.yaml]
        I3[EURUSD_overrides.yaml]
    end

    G --> M1
    G --> M2
    G --> M3
    G --> M4
    G --> M5
    G --> M6
    M1 --> R1
    M1 --> R2
    M1 --> R3
    R1 --> I1
    R1 --> I2
```

### 10.2 Parameter Resolution

```python
def resolve_parameters(instrument: str, regime: str) -> dict:
    """
    Resolve parameters using the 4-level hierarchy:
    1. Start with global defaults
    2. Apply market-class overrides (equities, forex, etc.)
    3. Apply regime-specific overrides (trending, volatile, etc.)
    4. Apply instrument-specific overrides (AAPL, ES, etc.)

    Later levels override earlier ones. Missing keys fall through
    to the previous level.
    """
    params = load_yaml("pctt-parameters.yaml")  # Global defaults

    market_class = classify_instrument(instrument)  # e.g., "equities"
    market_overrides = load_yaml(f"{market_class}.yaml")
    params.update(market_overrides)

    regime_overrides = load_yaml(f"{regime.lower()}_params.yaml")
    params.update(regime_overrides)

    instrument_file = f"{instrument}_overrides.yaml"
    if exists(instrument_file):
        params.update(load_yaml(instrument_file))

    return params
```

---

## 11. Data Architecture

### 11.1 Data Flow

```mermaid
graph LR
    subgraph "Input Data"
        D1[OHLCV Bars<br/>Real-time + Historical]
        D2[Volume Data<br/>Per bar + ADV]
        D3[Calendar Events<br/>Economic + Earnings]
        D4[News Headlines<br/>Filtered sentiment]
        D5[VIX + Correlation<br/>Market-wide metrics]
    end

    subgraph "Processing"
        P1[ATR Calculation]
        P2[Pivot Detection]
        P3[Regime Detection]
        P4[Q-Score Computation]
        P5[Risk Metrics]
    end

    subgraph "Output Data"
        O1[Trade Signals]
        O2[Position Updates]
        O3[Performance Metrics]
        O4[Reports]
        O5[Audit Trail]
    end

    D1 --> P1
    D1 --> P2
    D1 --> P3
    D2 --> P4
    D5 --> P3
    D5 --> P5
    P1 --> O1
    P2 --> O1
    P3 --> O1
    P4 --> O1
    P5 --> O2
    O1 --> O3
    O2 --> O3
    O3 --> O4
    O1 --> O5
    O2 --> O5
```

### 11.2 Data Storage Schema

```python
# Core data models
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

@dataclass
class Pivot:
    bar_index: int
    timestamp: datetime
    price: float
    pivot_type: str  # HIGH, LOW
    atr_at_detection: float
    confirmed: bool

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

@dataclass
class PCTTTradeRecord:
    # (Complete 35+ field record as defined in the pamphlet)
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

## 12. Implementation Roadmap

### 12.1 Phase Sequence

```mermaid
graph LR
    subgraph "Phase 1: Foundation (Weeks 1-3)"
        F1[Data feed integration]
        F2[ATR + Pivot detection]
        F3[Boundary estimation]
        F4[Q-Score calculator]
        F5[Memory store setup]
    end

    subgraph "Phase 2: Core Pipeline (Weeks 4-6)"
        C1[Regime ensemble]
        C2[Break detection + FSM]
        C3[Line freezing]
        C4[Retest + Rejection]
        C5[Risk geometry]
    end

    subgraph "Phase 3: Agents (Weeks 7-10)"
        A1[Signal Agent]
        A2[Risk Agent]
        A3[Execution Agent]
        A4[Sentinel Agent]
        A5[Regime Agent]
    end

    subgraph "Phase 4: System (Weeks 11-14)"
        S1[Orchestrator]
        S2[Journal Agent]
        S3[Event Bus]
        S4[Human Interface]
        S5[Dashboard]
    end

    subgraph "Phase 5: Validation (Weeks 15-18)"
        V1[Walk-forward testing]
        V2[Monte Carlo]
        V3[Paper trading]
        V4[Crisis simulation]
        V5[Go-live with 25% size]
    end

    F1 --> C1
    F2 --> C2
    F3 --> C3
    F4 --> C4
    F5 --> A1
    C1 --> A5
    C2 --> A1
    C3 --> A1
    C4 --> A1
    C5 --> A2
    A1 --> S1
    A2 --> S1
    A3 --> S1
    A4 --> S1
    A5 --> S1
    S1 --> V1
    S2 --> V1
    S3 --> V1
    S4 --> V3
    S5 --> V3
```

### 12.2 Technology Stack Recommendations

| Component | Recommended | Alternative | Rationale |
|-----------|------------|-------------|-----------|
| Agent Framework | Claude Agent SDK | LangGraph, CrewAI | Native Anthropic integration, tool use |
| Language | Python 3.11+ | TypeScript (PCTT engine) | Strativion ecosystem, numpy/scipy |
| Event Bus | Redis Pub/Sub | RabbitMQ, Kafka | Low latency, simple, sufficient scale |
| Memory Store | Redis + SQLite | PostgreSQL | Hot data in Redis, cold in SQLite |
| Broker API | IBKR TWS API | Alpaca, TD Ameritrade | Most complete, futures+stocks+options |
| Data Feed | Polygon.io | Alpha Vantage, IBKR | Real-time + historical, websocket |
| Dashboard | Streamlit | Grafana, custom React | Rapid prototyping, Python native |
| Monitoring | Prometheus + Grafana | Datadog, custom | Industry standard, free |
| Alerting | Discord webhook | Slack, SMS, Email | Real-time, mobile, free |
| Config | YAML files | etcd, Consul | Already in Strativion ecosystem |
| Testing | pytest + hypothesis | unittest | Property-based testing for math |
| CI/CD | GitHub Actions | GitLab CI | Standard, free tier sufficient |

---

## 13. Key Recommendations

### 13.1 Start Small, Scale Carefully

1. **Week 1-2:** Build the Signal agent alone with paper trading. Validate the 12-stage pipeline produces reasonable signals.
2. **Week 3-4:** Add Risk agent. Validate sizing and circuit breakers on historical data.
3. **Week 5-6:** Add Execution agent. Paper trade the full entry-to-exit lifecycle.
4. **Week 7-8:** Add Sentinel, Regime, and Journal agents. Run full daily workflow in simulation.
5. **Week 9-10:** Add Orchestrator with human-in-the-loop. Practice the approval flow.
6. **Week 11-14:** Walk-forward validation on 5+ years of data.
7. **Week 15-18:** Paper trade live markets for 4 weeks minimum.
8. **Week 19+:** Go live with 25% of target sizing. Scale up over 4 weeks if metrics hold.

### 13.2 Critical Success Factors

1. **Non-repainting is non-negotiable.** Test every calculation for look-ahead bias. One bug here invalidates all backtests.
2. **The human must remain engaged.** The system presents, the human decides. If the human starts rubber-stamping approvals, the system degrades to full automation without the safety net.
3. **Law 30 overrides everything.** The Risk agent's survival checks cannot be bypassed, even by the human. The only exception is the human physically disabling the system.
4. **Journal everything.** The Journal agent's data becomes the system's most valuable asset after 100+ trades. Edge decay detection saves accounts.
5. **Test crisis scenarios.** Paper trade through historical crises (March 2020, August 2024 Japan unwind, SVB March 2023). Verify the system behaves correctly.

### 13.3 Common Failure Modes to Avoid

| Failure Mode | Cause | Prevention |
|-------------|-------|------------|
| Over-trading | Signal agent too loose | Monitor rejection rate (should be > 99%) |
| Under-trading | Signal agent too strict | Track missed setups in Journal |
| Regime thrashing | Ensemble debounce too short | Require 5-bar persistence for transitions |
| Human fatigue | Too many approval requests | Limit to 3 proposals per session |
| Slippage erosion | Limit orders too tight | Monitor fill rate, adjust if < 70% |
| Edge decay blindness | Journal checks too infrequent | Run edge checks after every trade |
| Configuration drift | Manual parameter changes | Version control all YAML, require approval |
| Single point of failure | Broker disconnection | Alert within 5 seconds, queue orders |

---

*End of PCTT Agentic Trading System Architecture.*

*This document provides the complete blueprint for building, testing, and deploying a 7-agent automated trading system with human-in-the-loop based on the PCTT method and the 30 Laws of Trading. Every component is designed for deterministic, non-repainting, survival-first operation.*
