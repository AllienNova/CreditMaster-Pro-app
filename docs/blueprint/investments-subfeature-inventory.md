# Investments Sub-Feature Inventory

**Purpose:** This document is the mandatory before/after evidence for the Investments vertical (INV-1 through INV-6). Every investments sub-feature is enumerated here before any Wave 7 fix is applied. After all INV tasks close, every row must show `WORKING` — no sub-feature may be removed or left `DEGRADED`.

**Branch:** `remediation/wave-7-foundation`
**Enumerated against HEAD:** `cff3aaa` (post-Payments vertical merge)
**Date:** 2026-05-17

**Findings to close:** FND-030/031/032/033/035 (fix), FND-034 (verified closed).

---

## Route Summary (28 routes)

All 28 routes are wrapped with `withAuth` from `@/lib/auth/api-guard`. No route is unauthenticated.

| Route | Methods | Auth Guard |
|---|---|---|
| `/api/investments/holdings` | GET, POST | `withAuth` |
| `/api/investments/holdings/[id]` | GET, PATCH, DELETE | `withAuth` |
| `/api/investments/portfolio` | GET | `withAuth` |
| `/api/investments/portfolio/analyze` | POST, GET | `withAuth` |
| `/api/investments/portfolio-analysis` | POST, GET | `withAuth` |
| `/api/investments/analytics/risk` | GET | `withAuth` |
| `/api/investments/analytics/correlation` | GET | `withAuth` |
| `/api/investments/analytics/diversification` | GET | `withAuth` |
| `/api/investments/analytics/rebalance` | GET | `withAuth` |
| `/api/investments/analytics/performance` | GET | `withAuth` |
| `/api/investments/analyze/[symbol]` | GET, POST | `withAuth` |
| `/api/investments/analyze/[symbol]/fundamental` | GET | `withAuth` |
| `/api/investments/analyze/[symbol]/recommendation` | GET | `withAuth` |
| `/api/investments/analyze/[symbol]/sentiment` | GET | `withAuth` |
| `/api/investments/analyze/[symbol]/technical` | GET | `withAuth` |
| `/api/investments/crypto/[coinId]` | GET | `withAuth` |
| `/api/investments/crypto/[coinId]/sentiment` | GET | `withAuth` |
| `/api/investments/crypto/trending` | GET | `withAuth` |
| `/api/investments/dividends` | GET | `withAuth` |
| `/api/investments/alerts` | GET, POST, DELETE | `withAuth` |
| `/api/investments/allocation-analysis` | POST, GET | `withAuth` |
| `/api/investments/comprehensive-analysis` | POST, GET | `withAuth` |
| `/api/investments/patterns` | POST, GET | `withAuth` |
| `/api/investments/recommendations` | POST, GET | `withAuth` |
| `/api/investments/signals` | GET, POST | `withAuth` |
| `/api/investments/signals/[id]` | GET, PATCH | `withAuth` |
| `/api/investments/signals/active` | GET | `withAuth` |
| `/api/investments/signals/performance` | GET | `withAuth` |

## Service Files (26 files, excluding types/index)

| File | Exported Entry Points |
|---|---|
| `src/lib/investments/ai-stock-analyst.ts` | `AIStockAnalyst` class |
| `src/lib/investments/crypto-analyst.ts` | `CryptoAnalyst` class |
| `src/lib/investments/market-data-service.ts` | `marketDataService` singleton |
| `src/lib/investments/portfolio-analytics.ts` | `PortfolioAnalytics` class |
| `src/lib/investments/portfolio-service.ts` | `portfolioService` singleton (`PortfolioServiceFacade`) |
| `src/lib/investments/signal-generator.ts` | `SignalGenerator` class |
| `src/lib/investments/services/AIRecommendationEngine.ts` | `AIRecommendationEngine` class |
| `src/lib/investments/services/AllocationAnalyzer.ts` | `AllocationAnalyzer` class |
| `src/lib/investments/services/AnalysisCacheService.ts` | `AnalysisCacheService` class |
| `src/lib/investments/services/AnalysisExportService.ts` | `AnalysisExportService` class |
| `src/lib/investments/services/AssetAllocationService.ts` | `AssetAllocationService` class |
| `src/lib/investments/services/AutoRebalanceScheduler.ts` | `AutoRebalanceScheduler` class |
| `src/lib/investments/services/DividendTrackingService.ts` | `DividendTrackingService` class |
| `src/lib/investments/services/FundamentalAnalysisService.ts` | `FundamentalAnalysisService` class |
| `src/lib/investments/services/InvestmentAnalysisEngine.ts` | `InvestmentAnalysisEngine` class |
| `src/lib/investments/services/MarketDataService.ts` | `MarketDataService` class |
| `src/lib/investments/services/MarketDataWebSocketService.ts` | `MarketDataWebSocketService` class |
| `src/lib/investments/services/PatternRecognitionService.ts` | `PatternRecognitionService` class |
| `src/lib/investments/services/PerformanceCalculator.ts` | `PerformanceCalculator` class |
| `src/lib/investments/services/PortfolioAnalysisService.ts` | `PortfolioAnalysisService` class |
| `src/lib/investments/services/PortfolioRebalanceService.ts` | `PortfolioRebalanceService` class |
| `src/lib/investments/services/PortfolioService.ts` | `PortfolioService` class (user-scoped, canonical) |
| `src/lib/investments/services/PriceAlertService.ts` | `PriceAlertService` class |
| `src/lib/investments/services/SentimentAnalysisService.ts` | `SentimentAnalysisService` class |
| `src/lib/investments/services/TaxLossHarvestingService.ts` | `TaxLossHarvestingService` class |
| `src/lib/investments/services/TechnicalAnalysisService.ts` | `TechnicalAnalysisService` class |

## Pages (15 pages)

| Page | Path |
|---|---|
| Investments root | `src/app/investments/page.tsx` |
| Holdings management | `src/app/investments/holdings/page.tsx` |
| Add holding | `src/app/investments/add-holding/page.tsx` |
| Analytics dashboard | `src/app/investments/analytics/page.tsx` |
| Stock analysis | `src/app/investments/analyze/[symbol]/page.tsx` |
| Crypto detail | `src/app/investments/crypto/[coinId]/page.tsx` |
| Dividends | `src/app/investments/dividends/page.tsx` |
| Performance | `src/app/investments/performance/page.tsx` |
| Rebalance | `src/app/investments/rebalance/page.tsx` |
| Research | `src/app/investments/research/page.tsx` |
| Signals | `src/app/investments/signals/page.tsx` |
| Watchlist | `src/app/investments/watchlist/page.tsx` |
| Comprehensive analysis (dashboard) | `src/app/(dashboard)/investments/comprehensive-analysis/page.tsx` |
| Financial investments | `src/app/financial/investments/page.tsx` |
| Invest landing | `src/app/invest/page.tsx` |

## Components

| Component | Path |
|---|---|
| `AIInvestmentInsights` | `src/components/investments/AIInvestmentInsights.tsx` |
| `AlertsPanel` | `src/components/investments/alerts/AlertsPanel.tsx` |
| `AssetAllocationPanel` | `src/components/investments/allocation/AssetAllocationPanel.tsx` |
| `EfficientFrontierChart` | `src/components/investments/allocation/EfficientFrontierChart.tsx` |
| `ComprehensiveAnalysisPanel` | `src/components/investments/analysis/ComprehensiveAnalysisPanel.tsx` |
| `PortfolioAnalyticsDashboard` | `src/components/investments/analytics/PortfolioAnalyticsDashboard.tsx` |
| `AdvancedChartContainer` | `src/components/investments/charts/AdvancedChartContainer.tsx` |
| `InvestmentChart` | `src/components/investments/charts/InvestmentChart.tsx` |
| `InvestmentDashboard` | `src/components/investments/dashboard/InvestmentDashboard.tsx` |
| `HoldingsManagement` | `src/components/investments/HoldingsManagement.tsx` |
| `PatternOverlay` | `src/components/investments/patterns/PatternOverlay.tsx` |
| `PortfolioOverview` | `src/components/investments/PortfolioOverview.tsx` |
| `AllocationConfigPanel` | `src/components/investments/rebalance/AllocationConfigPanel.tsx` |
| `DriftAlertPanel` | `src/components/investments/rebalance/DriftAlertPanel.tsx` |
| `RebalanceHistoryPanel` | `src/components/investments/rebalance/RebalanceHistoryPanel.tsx` |
| `RebalancePreviewModal` | `src/components/investments/rebalance/RebalancePreviewModal.tsx` |
| `RebalanceSchedulePanel` | `src/components/investments/rebalance/RebalanceSchedulePanel.tsx` |
| `StockAnalysisView` | `src/components/investments/StockAnalysisView.tsx` |
| `InvestmentPortfolio` (financial) | `src/components/financial/InvestmentPortfolio.tsx` |

---

## Sub-Feature Inventory

| Sub-feature | Key files | Status |
|---|---|---|
| Holdings management (CRUD) | `src/app/api/investments/holdings/route.ts` (GET/POST), `src/app/api/investments/holdings/[id]/route.ts` (GET/PATCH/DELETE), `src/lib/investments/services/PortfolioService.ts`, `src/components/investments/HoldingsManagement.tsx`, `src/app/investments/holdings/page.tsx` | WORKING |
| Holdings DELETE authz | `src/app/api/investments/holdings/[id]/route.ts` DELETE handler — atomic `.delete().eq("id",id).eq("user_id",user.id)` | WORKING (verified closed — FND-034) |
| Portfolio management | `src/app/api/investments/portfolio/route.ts`, `src/lib/investments/services/PortfolioService.ts`, `src/components/investments/PortfolioOverview.tsx`, `src/app/investments/page.tsx` | WORKING |
| Portfolio analytics — risk metrics | `src/app/api/investments/analytics/risk/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`calculateRiskMetrics`), `src/components/investments/analytics/PortfolioAnalyticsDashboard.tsx` | WORKING (verified closed — FND-030 user-scoped INV-2, FND-031 division guards INV-3) |
| Portfolio analytics — correlation | `src/app/api/investments/analytics/correlation/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`analyzeCorrelations`) | WORKING (verified closed — FND-030 user-scoped INV-2) |
| Portfolio analytics — diversification | `src/app/api/investments/analytics/diversification/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`analyzeDiversification`) | WORKING (verified closed — FND-030 user-scoped INV-2) |
| Portfolio analytics — rebalance | `src/app/api/investments/analytics/rebalance/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`generateRebalancingRecommendations`) | WORKING (verified closed — FND-030 user-scoped INV-2) |
| Portfolio analytics — performance | `src/app/api/investments/analytics/performance/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`calculatePerformance`), `src/lib/investments/services/PerformanceCalculator.ts` (`benchmarkAgainstSP500`) | WORKING (verified closed — FND-030 INV-2, FND-032 honest benchmark INV-4, FND-035 honest volatility INV-5) |
| Portfolio analyze (ad-hoc holdings) | `src/app/api/investments/portfolio/analyze/route.ts`, `src/lib/investments/services/PortfolioAnalysisService.ts`, `src/app/investments/analytics/page.tsx` | WORKING (verified closed — FND-033 per-element Zod validation + 500-element cap INV-6) |
| Portfolio analysis (saved) | `src/app/api/investments/portfolio-analysis/route.ts`, `src/lib/investments/services/PortfolioAnalysisService.ts`, `src/components/investments/PortfolioOverview.tsx` | WORKING |
| AI stock analysis | `src/app/api/investments/analyze/[symbol]/route.ts` (GET/POST), `src/app/api/investments/analyze/[symbol]/fundamental/route.ts`, `src/app/api/investments/analyze/[symbol]/recommendation/route.ts`, `src/app/api/investments/analyze/[symbol]/sentiment/route.ts`, `src/app/api/investments/analyze/[symbol]/technical/route.ts`, `src/lib/investments/ai-stock-analyst.ts`, `src/lib/investments/services/FundamentalAnalysisService.ts`, `src/lib/investments/services/TechnicalAnalysisService.ts`, `src/lib/investments/services/SentimentAnalysisService.ts`, `src/components/investments/StockAnalysisView.tsx`, `src/app/investments/analyze/[symbol]/page.tsx` | WORKING |
| Comprehensive analysis | `src/app/api/investments/comprehensive-analysis/route.ts`, `src/lib/investments/services/InvestmentAnalysisEngine.ts`, `src/components/investments/analysis/ComprehensiveAnalysisPanel.tsx`, `src/app/(dashboard)/investments/comprehensive-analysis/page.tsx` | WORKING |
| Crypto analysis | `src/app/api/investments/crypto/[coinId]/route.ts`, `src/app/api/investments/crypto/[coinId]/sentiment/route.ts`, `src/app/api/investments/crypto/trending/route.ts`, `src/lib/investments/crypto-analyst.ts`, `src/app/investments/crypto/[coinId]/page.tsx` | WORKING |
| Dividends tracking | `src/app/api/investments/dividends/route.ts`, `src/lib/investments/services/DividendTrackingService.ts`, `src/app/investments/dividends/page.tsx` | WORKING |
| Price alerts | `src/app/api/investments/alerts/route.ts` (GET/POST/DELETE), `src/lib/investments/services/PriceAlertService.ts`, `src/components/investments/alerts/AlertsPanel.tsx` | WORKING |
| Asset allocation | `src/app/api/investments/allocation-analysis/route.ts`, `src/lib/investments/services/AssetAllocationService.ts`, `src/lib/investments/services/AllocationAnalyzer.ts`, `src/components/investments/allocation/AssetAllocationPanel.tsx`, `src/components/investments/allocation/EfficientFrontierChart.tsx` | WORKING |
| Trading signals | `src/app/api/investments/signals/route.ts` (GET/POST), `src/app/api/investments/signals/[id]/route.ts` (GET/PATCH), `src/app/api/investments/signals/active/route.ts`, `src/app/api/investments/signals/performance/route.ts`, `src/lib/investments/signal-generator.ts`, `src/app/investments/signals/page.tsx` | WORKING |
| AI recommendations | `src/app/api/investments/recommendations/route.ts`, `src/lib/investments/services/AIRecommendationEngine.ts`, `src/app/investments/research/page.tsx` | WORKING |
| Pattern recognition | `src/app/api/investments/patterns/route.ts`, `src/lib/investments/services/PatternRecognitionService.ts`, `src/components/investments/patterns/PatternOverlay.tsx` | WORKING |
| Portfolio rebalance (automated) | `src/lib/investments/services/PortfolioRebalanceService.ts`, `src/lib/investments/services/AutoRebalanceScheduler.ts`, `src/components/investments/rebalance/`, `src/app/investments/rebalance/page.tsx` | WORKING |
| Performance benchmarking | `src/lib/investments/services/PerformanceCalculator.ts` (`benchmarkAgainstSP500`, `calculateVolatility`, `calculateSharpeRatio`), `src/app/api/investments/analytics/performance/route.ts` | WORKING (verified closed — FND-032 honest benchmark `dataAvailable` INV-4, FND-035 honest volatility/Sharpe INV-5) |
| Market data | `src/lib/investments/market-data-service.ts`, `src/lib/investments/services/MarketDataService.ts`, `src/lib/investments/services/MarketDataWebSocketService.ts` | WORKING |
| Watchlist | `src/app/investments/watchlist/page.tsx` | WORKING |

---

## Status Summary

| Status | Count |
|---|---|
| WORKING | 15 |
| WORKING (verified closed — Wave 7 finding) | 8 |
| DEGRADED | 0 |
| MOCK | 0 |

**Findings closed by the Investments vertical (all rows now `WORKING`):**

- Holdings DELETE authz — FND-034 (verified already atomic; cross-user regression test added INV-2)
- Portfolio analytics risk metrics — INV-2 (FND-030), INV-3 (FND-031)
- Portfolio analytics correlation — INV-2 (FND-030)
- Portfolio analytics diversification — INV-2 (FND-030)
- Portfolio analytics rebalance — INV-2 (FND-030)
- Portfolio analytics performance — INV-2 (FND-030), INV-4 (FND-032), INV-5 (FND-035)
- Portfolio analyze ad-hoc — INV-6 (FND-033)
- Performance benchmarking — INV-4 (FND-032), INV-5 (FND-035)

All INV-1 through INV-6 tasks closed 2026-05-17. Every row shows `WORKING`; no sub-feature removed.

**No MOCK rows found.** All spot-checked routes and services make real Supabase queries or real computations (even where the computation is mathematically wrong per FND-031/032/035 — those are correctness bugs, not fabricated data).
