# ADR-0005 — Canonical market-data / quotes vendor

- **Status:** Accepted (owner sign-off 2026-07-26)
- **Date:** 2026-07-26
- **Deciders:** owner (product + finance)
- **Confidence:** low (owner call)

## Context

Five providers are half-wired and none is canonical: `UnifiedMarketDataService` (Alpha Vantage → Polygon → CoinGecko, `src/lib/investments/market-data-service.ts`), a Finnhub connector (`src/lib/connectors/market-data/finnhub-connector.ts`), a Polygon REST+WS client (`src/lib/integrations/polygon.ts`), and the Alpaca broker's own feed (`src/lib/trading/brokers/alpaca-broker.ts:496,507`; WS `iex`/`sip` `:607`). **`src/lib/investments/services/MarketDataService.ts` fabricates synthetic candles** when a provider returns too few bars — a standalone honesty defect. Web watchlist + OHLC charts need one real source.

## Decision

We will make **Alpaca Market Data the single canonical source** for watchlist quotes + OHLC (free IEX real-time, credential already exists, WS already coded), keep **Polygon Advanced ($199/mo) as the paid upgrade** if IEX coverage proves too thin, and **delete the synthetic-candle fabrication** in `MarketDataService.ts`.

## Rationale

Alpaca needs no new vendor or secret (broker creds exist), gives free real-time IEX + multi-year history + generous rate limits, and its WS is already implemented — lowest cost, lowest integration risk. The fabrication deletion is unconditional (honesty), independent of which vendor wins.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Polygon.io/Massive primary | deep history, cheap unlimited calls | real-time = $199/mo; another vendor | keep as paid upgrade, not primary |
| Finnhub primary | fundamentals + news | `/stock/candle` likely premium **(verify)** | OHLC paywall risk |
| Alpha Vantage (current Unified primary) | free tier | ~25 req/day **(verify)** — too thin for live watchlist | unfit as primary |

## Consequences

### Positive
- One data credential; 5 clients → 1 primary + 1 fallback; free real-time; fabrication removed.
### Negative
- Free IEX ≈ 2.5% of volume → thin quotes on illiquid names; real-time SIP is paid **(verify $)**.
### Neutral / follow-ups
- UI needs an "IEX/delayed" free-tier disclaimer.

## Implementation notes

- Proceed-now: delete synthetic-candle fallback in `MarketDataService.ts` + honesty test (empty/real, never synthetic). Canonical consolidation is FR-601 (M6), gated on ratification.

## Revisit triggers

- Instruments Alpaca can't cover; IEX quote-gap complaints; need for real-time SIP.

## Owner must decide

Ratify Alpaca Market Data (free IEX; Polygon Advanced as paid upgrade) as the one canonical quotes+OHLC source and authorize deleting the synthetic-candle fallback?

## References

- Alpaca: docs.alpaca.markets/us/docs/about-market-data-api, .../real-time-stock-pricing-data, .../historical-stock-data-1. Polygon: massive.com/pricing. Finnhub: finnhub.io/docs/api/rate-limit, finnhub.io/pricing.
