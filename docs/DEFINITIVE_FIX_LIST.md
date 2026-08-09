# Fynvita Definitive Fix List

> Generated: 2026-04-27 | Post-review state | All P0/P1 FIXED

## Fixed This Session (32 commits)

### P0 Critical — All Fixed
| Fix | File | Commit |
|-----|------|--------|
| Build: decouple client component from server-side supabase import | `src/components/financial/SubscriptionCancellationWizard.tsx` | cbf46a3 |
| Security: compliance gates fail-closed on error | `src/app/api/trading/orders/route.ts:211` | b1bad1f |

### P1 High — All Fixed
| Fix | File | Commit |
|-----|------|--------|
| CSP header added | `next.config.js:27-37` | d4617f3 |
| Stripe lazy init (no dummy key) | `src/lib/payment/stripe-service.ts:14-29` | d4617f3 |
| Legacy branding (cpfi.com) | `mobile-app/src/services/api/{credit,user}.ts` | d4617f3 |
| Legacy branding (Credit Pro Team) | `mobile-app/app/help/guide-detail.tsx` | d4617f3 |
| Legacy branding (admin@cpfi.com) | `mobile-app/app/admin/audit.tsx` | d4617f3 |
| Test fixes for async fetch pattern | `src/components/financial/__tests__/SubscriptionCancellationWizard.test.tsx` | d4617f3 |

## Remaining Backlog (P2/P3 — Post-Beta)

### P2 Medium
| Issue | File | Notes |
|-------|------|-------|
| Mock data fallback in credit-builder goals | `src/app/credit-builder/goals/page.tsx:20` | MOCK_ACTIVE_GOALS used as fallback |
| Mock data in weekly summary | `src/app/insights/weekly-summary/page.tsx:75` | MOCK_SUMMARY fallback |
| Mock data in alerts | `src/app/insights/alerts/page.tsx:51` | MOCK_ALERTS fallback |
| Mock data in financial intelligence | `src/app/financial-intelligence/page.tsx:141-200` | Multiple mock objects |
| CSP unsafe-eval | `next.config.js` | Required by Stripe/Plaid SDKs |
| Mobile test coverage at ~30% | `mobile-app/src/store/__tests__/` | 180 tests added, target 50% |

### P3 Low
| Issue | File | Notes |
|-------|------|-------|
| 841 ESLint warnings | Various | Legacy code, tracked |
| 6 affiliate test failures | `src/lib/commerce/affiliate/__tests__/` | Pre-existing Wave 6 |
| npm audit 14 vulns (dev deps) | `package.json` | 2 low, 11 moderate, 1 high |
