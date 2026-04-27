# Pivot‑Constrained Trendline Trading (PCTT) Platform

## Production Autonomous Trading System Specification (v1.0)

**Date:** January 16, 2026

---

## 0. One‑liner

A multi‑tenant trading automation platform that turns TradingView PCTT alerts into broker‑executed orders with deterministic state machines, risk governance, execution realism, monitoring, and an extensible agent architecture.

## 1. Operating Constraints (TradingView)

- TradingView webhooks are simple HTTP POSTs triggered by alerts; the receiver must respond quickly to avoid lost signals. citeturn0search0
- Strategy alerts can embed custom JSON using placeholders (e.g., order action, symbol, qty) via `strategy.order.alert_message`/`{{strategy.order.alert_message}}`. citeturn0search1

> Design rule: webhook endpoint must be **idempotent** and return 2xx within ~1–2 seconds under load. Everything else is async.

## 2. High‑Level Architecture

### 2.1 Components

1. **Webhook Gateway (FastAPI)**
   - Validates tenant token
   - Idempotent inbox write (dedupe)
   - Emits event to message bus

2. **Event Bus (NATS/RabbitMQ)**
   - decouples ingestion from processing

3. **Core Engine (Workers)**
   - PCTT structure state machine
   - risk governor
   - order intent builder

4. **Execution Router**
   - broker abstraction layer
   - order placement/modification
   - reconciliation + drift correction

5. **Position Manager**
   - hybrid trailing stops
   - partials
   - emergency exits

6. **Research/Validation Suite**
   - walk‑forward, bootstrap, permutation tests
   - calibration + drift monitoring

7. **UI (Next.js)**
   - configuration
   - live positions
   - risk dashboard
   - audit views

8. **Observability**
   - metrics, logs, traces
   - alerting

### 2.2 Dataflow (signal → trade)

1. TradingView alert → webhook
2. Inbox table (dedupe)
3. Publish `inbox_id`
4. Worker loads inbox payload
5. Update structure state
6. Risk gate
7. Emit OrderIntent
8. BrokerConnector executes
9. Fills stream updates position
10. Trailing/partials update orders
11. UI + audit update

## 3. Native Financial Agents (Agentic Decomposition)

Agents are bounded, testable services with explicit inputs/outputs. They communicate through the event bus and shared state.

### 3.1 Agent list

1. **Signal Intake Agent**
   - validates + stores webhook events

2. **Structure Agent**
   - computes/updates ℜ_t object (trendlines, Q, regime)
   - enforces freeze logic

3. **Probability/Calibration Agent**
   - maps raw Q → calibrated win probability
   - monitors Brier score drift

4. **Risk Governor Agent**
   - portfolio heat, correlation, drawdown scaling
   - returns allow/deny + max risk budget

5. **Execution Agent**
   - converts OrderIntent to broker API calls
   - handles order types and modify/cancel

6. **Reconciliation Agent**
   - compares expected vs actual positions
   - repairs drift (cancel/replace)

7. **Position Management Agent**
   - trailing stops, partial exits, time stops

8. **Microstructure Agent**
   - spread/impact filters
   - liquidity checks (ADV)

9. **Compliance/Audit Agent**
   - immutable logs
   - policy enforcement

10. **Research Agent**

- scheduled walk‑forward and significance tests
- parameter drift detection

## 4. Broker Abstraction Layer

All brokers implement the same interface; connectors differ per broker.

```python
class BrokerConnector(ABC):
    async def authenticate(self, credentials) -> Session
    async def place_order(self, order: OrderIntent) -> OrderResult
    async def modify_order(self, order_id, modifications) -> OrderResult
    async def cancel_order(self, order_id) -> OrderResult
    async def get_positions(self) -> list[Position]
    async def get_account_info(self) -> AccountInfo
    async def subscribe_fills(self) -> AsyncIterator[Fill]
```

**Connector examples**

- Binance Spot API (crypto) citeturn0search3
- cTrader/Spotware Open API (FX/CFD) citeturn0search2

## 5. Market Adapter Layer

Market adapters provide market‑specific rules: sizing, session filters, tick sizes, spread models, and risk buffers.

- **Crypto adapter**: 24/7, volatility shocks, exchange outages
- **FX adapter**: 24/5 sessions, news filters, spread gating
- **Equities adapter**: gap risk, earnings blackout, ADV sizing
- **Futures adapter**: contract roll, tick size, margin rules
- **Options adapter**: delta sizing, IV/skew filters, assignment risk

## 6. Data Model (Conceptual)

Minimal tables needed day 1 (multi‑tenant)

- tenants
- users
- webhook_inbox (idempotency)
- strategies (versions + configs)
- broker_accounts (+ encrypted credentials reference)
- orders, fills, positions
- risk_limits
- audit_log (append‑only)
- equity_snapshots

(See the starter codebase for initial DDL; full schema expands from there.)

## 7. API Surface (v1)

- `POST /v1/auth/register` → returns JWT + one‑time webhook token
- `POST /v1/auth/login` → JWT
- `POST /v1/webhooks/tradingview` → accepts signal JSON
- `GET /healthz`

Later:

- `GET /v1/positions`
- `GET /v1/orders`
- `POST /v1/brokers/connect`
- `POST /v1/strategies`
- `POST /v1/risk/limits`

## 8. Non‑Negotiable Production Invariants

1. **No lookahead**: pivots confirmed; frozen levels stored.
2. **Idempotent webhooks**: duplicate alert_id does not double‑trade.
3. **Broker reconciliation**: live positions are ground truth.
4. **Kill switch**: global + per‑tenant emergency stop.
5. **Audit**: every decision is logged with inputs.
6. **Statistical gates**: strategy must pass permutation/WR tests before enabling “autonomous” mode.

## 9. Phased Build Plan (Shippable Milestones)

- **M1 (Weeks 1–4)**: Ingestion + auth + inbox + mock broker + audit
- **M2 (Weeks 5–8)**: Core FSM + risk governor + paper trading
- **M3 (Weeks 9–12)**: First real connector (Crypto/Binance) + live beta
- **M4**: Second market (FX/OANDA or cTrader)
- **M5**: Equities/futures + portfolio analytics
- **M6**: Statistical validation suite + enterprise features
