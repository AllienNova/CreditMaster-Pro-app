# Web ↔ Mobile Parity Audit (2026-07-24)

Read-only audit of `src/app` (web, Next.js) vs `mobile-app/app` (Expo/RN).

## Headline
- **Structural (route) parity: 39/44 = 88.6%** — the screen exists on both platforms.
- **Functional (real-data-on-both) parity: ≈28/44 ≈ 64%** (estimate) — many screens exist but
  render mock/hardcoded data on one or both sides.
- **Mobile is NOT the thin platform** — ~230 mobile screens vs 204 web pages; mobile is *richer*
  on trading, disputes, tax, student-loans, investment analysis.
- **Root cause of the gap is shared mock-data debt, not a mobile port gap.** Web: only ~61/204
  pages make real API calls (~78 carry mock markers). Mobile: ~73 real, ~30 `setTimeout`+hardcoded.

## Parity math
- Denominator = 44 distinct user-facing app workflows (web marketing/legal pages excluded).
- Present on both = 39 → structural 39/44 = 88.6%.
- Web-only (2): Real Estate, Crypto holdings. Mobile-only (3): Global Search, Activity Feed, Device Handoff.
- ~11 of the 39 are stubbed on ≥1 side → functional ≈ 28/44 ≈ 64%.

## Path to ≥98% — four directions (biggest number-movers last)
- **A. Mobile must ADD (web-only real features):** Real Estate, Crypto holdings, Shared/collaborative
  Goals, Marketplace sub-cats (auto-insurance, auto-loans, loans).
- **B. Finish mobile data wiring (web-real / mobile-stub):** **Credit Repair** stack (mobile = 8
  hardcoded screens; highest-value gap), **Billing/Subscriptions** (mobile needs IAP/RevenueCat, not
  web card-checkout).
- **C. Inverted — web behind mobile:** **Trading** (web fully stubbed; mobile has real store-backed
  paper + agents/positions/orders/risk), **Watchlist** (web mock, mobile real).
- **D. Shared backend mock-debt (fixing the API fixes BOTH platforms — moves the number most):**
  Admin (web analytics `Math.random`, FND-049), Marketplace, Insights, Budgeting, Notifications,
  Documents, Savings, Dashboard analytics.

## Bottom line
Reaching ≥98% is mostly (a) wiring mobile Credit Repair + Billing to real APIs, (b) porting 3–4
small web-only screens to mobile, and (c) killing shared mock-debt in Admin/Marketplace/Insights/
Budgeting/Notifications on both platforms. It is a **multi-session effort**, not a small port. Full
per-workflow evidence table: see the parity-audit report in PR #3 discussion / session record.
