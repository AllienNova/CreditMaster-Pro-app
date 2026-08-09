# 30 Laws Dashboard — TradingView Pine Script

Free companion tool that operationalizes Chapter 69's 30-Law Dashboard.

## What It Does

Drop-in Pine Script indicator for TradingView. Shows at a glance:

- **Regime classification** (Law 8): SHOCK / TRENDING / RANGING / TRANSITION — shock check takes priority
- **ADX(14), ATR ratio, VIX** — the three inputs the regime classifier consumes
- **Regime-aware risk caps** — risk per trade, max positions, max portfolio heat, min R-multiple
- **Reference position size** — computed from your equity, the regime risk cap, and a 1.5×ATR stop
- **Law 29 ceiling reminder** — 2% per trade, 10% heat, 1% P(ruin) — displayed as a permanent footer

Background tint flags shock and transition regimes visually.

## Install in 60 Seconds

1. Open TradingView on any chart (SPY, QQQ, ES1!, NQ1! all work).
2. Click **Pine Editor** at the bottom.
3. Paste the contents of `30-laws-dashboard.pine`.
4. Click **Save** (name it "30 Laws Dashboard"), then **Add to chart**.
5. Set your account equity and default risk % in the indicator settings.
6. Optionally switch `CBOE:VIX` to another volatility proxy if you are outside US equities.

## Alerts

The script registers two TradingView alert conditions you can enable:

- **Regime transition** — fires when regime changes; prompt is "halt new entries 15 min and re-classify"
- **Shock regime** — fires when shock regime is active; prompt reminds you to cut to shock caps

Create these alerts once per chart via TradingView's alert dialog.

## Limitations

- VIX data on TradingView free tier has a 15-minute delay. For live trading, pipe VIX from your broker's feed.
- Reference position size uses a 1.5×ATR stop as a default. Your actual invalidation must be structural (Law 22). The "reference size" is a sanity check, not a substitute for the pre-trade validator.
- This dashboard does NOT place orders. It is a display tool. Execution belongs to your broker platform or trading agent.

## Integration with the Strativion Agent

The regime classification and risk caps in this script match `agent-config.json.regime_aware_caps` and `prompts/regime-classifier.md` exactly. If you use the Tasklet agent knowledge base alongside this dashboard, both sources will agree on regime and sizing.

## License

Free to use alongside the book. Credit *The 30 Indisputable Laws of Trading* (Djam, 2026) in any derivative work.
