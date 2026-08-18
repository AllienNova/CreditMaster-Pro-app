# Automated investing — what the comparable products actually do

Read 2026-08-18 from the vendors' own marketing and disclosure pages, at the
owner's request, to inform the trading agent design (tasks #83/#84) and the
autonomy ladder (SF-24).

Everything below is **observed from their public pages**, not legal analysis.
Nothing here is advice about what Fynvita may lawfully do; the regulatory
questions it raises are for counsel.

---

## Alinea Invest — alinea-invest.com

| | |
|---|---|
| Positioning | "your personal wealth manager"; beginner investors |
| AI feature | **"AI Allie"** — "personal investing companion", "AI Copilot" |
| What the AI does | Answers questions about market events and individual stocks, "24/7 market insights", "AI Allie Recaps" |
| What the AI does NOT do | It does not choose or place trades |
| Automation | **"Automated Investing"** — "Pick an amount. Pick a schedule. We'll handle the rest" |
| Portfolio construction | **"Curated by real experts, not algorithms"** |
| Adviser | Alinea Advisory Services LLC — **SEC-registered investment adviser** |
| Custody / execution | **DriveWealth LLC**, member FINRA/SIPC |
| Bank linking | Plaid |
| Human oversight | "Human advisors… Real people with real licenses" |
| Price | **$120/year** flat, auto-renewing, no refunds for unused time |

The split is deliberate and marketed as such: **the AI advises, humans build the
portfolios, and the automation is a schedule.** "Not algorithms" is a selling
point, not an omission.

Worth noting: Fynvita already integrates DriveWealth (Wave 6), so the custody
layer matches.

## Composer — composer.trade

| | |
|---|---|
| Positioning | Retail algorithmic trading without code |
| Unit of work | **"Symphonies"** — rule-based strategies in a visual no-code editor |
| What the AI does | Drafts a strategy from natural language: "explain your goals… the AI-assisted editor will create the strategy for you" |
| Who decides | The **user** — strategies are "fully editable"; the AI output is a starting point |
| Automation | "Composer executes your trading strategy, making trades and rebalancing automatically" |
| Broker-dealer | **Composer Securities LLC** — SEC-registered BD, FINRA/SIPC |
| Clearing / custody | Alpaca Securities LLC and Apex Clearing Corporation |
| Registration framing | Broker-dealer. **No RIA registration is claimed on the page** |
| Price | Flat monthly subscription ("Trading Pass"), no commissions or management fees |
| AI disclosure | A **separate, specific disclosure** for AI-powered strategy creation, on top of standard BD disclosures and Form CRS |

---

## The pattern both share

Neither product lets an AI make a discretionary trade decision for the user.

- **Alinea**: the AI explains; a human curates the portfolio; the automation is
  scheduling contributions.
- **Composer**: the AI drafts; the **user approves and edits the rules**; the
  system then executes the user's own strategy mechanically.

In both cases a human authors the decision and the machine carries it out. That
is the line they are both on the same side of, and it is drawn in the product,
not just the copy — Composer makes strategies editable and ships a dedicated AI
disclosure; Alinea markets "not algorithms" for the part that picks holdings.

## What this means for Fynvita

Fynvita's stated design goes further: an agentic system that invests
automatically across three autonomy levels, up to AUTONOMOUS. **That is the
thing neither comparable does.** It is either the differentiator or the cliff,
and which one depends on decisions that are not engineering decisions:

1. **Who authors the decision in AUTONOMOUS mode?** If the user defines rules
   and agents execute them, the shape matches Composer. If an agent chooses
   what to buy, that is a different product and a different regulatory posture.
2. **What is Fynvita registered as?** Alinea is an RIA; Composer is a BD. Both
   state it plainly on the marketing page. Fynvita needs an answer before
   AUTONOMOUS ships, and the answer shapes the code — suitability checks,
   disclosure surfaces and record-keeping are build items, not paperwork.
3. **AI-specific disclosure.** Composer carries a dedicated disclosure for
   AI-generated strategies. Fynvita currently has none, and it has eight agents.
4. **What does the user actually control?** "Total control" needs a concrete
   surface: which agent runs, what it may do, what it may never do, and how to
   stop it mid-flight.

## Cross-references

- **SF-24** — the autonomy ladder does not currently work: GUIDED → AUTONOMOUS
  is unreachable, and "30 days active" counts trades rather than days. Whatever
  is decided above, that gate has to measure something real first.
- **SF-25 / rev 26** — the eight "agents" are prompt-and-parse over a raw
  `/chat/completions` fetch, with no tool use and no SDK. The agent layer is
  ahead, not behind.
- **SF-18** — the recommendation engine can never return "buy". A system that
  invests automatically cannot ship on an engine that can only hold or sell.

## Sources

- [Alinea Invest](https://www.alinea-invest.com/)
- [Composer](https://www.composer.trade/)

SEC primary sources (robo-adviser guidance) were attempted and returned
403/404; the registration facts above are taken from each vendor's own
disclosure text and should be re-verified against SEC IAPD/BrokerCheck before
being relied on.
