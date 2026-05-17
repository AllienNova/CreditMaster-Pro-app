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
| Portfolio analytics — risk metrics | `src/app/api/investments/analytics/risk/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`calculateRiskMetrics`), `src/components/investments/analytics/PortfolioAnalyticsDashboard.tsx` | DEGRADED — FND-030 (unscoped `getPortfolio`/`getHoldings`), FND-031 (Sharpe/Sortino/Calmar/Information ratio divisions unguarded) |
| Portfolio analytics — correlation | `src/app/api/investments/analytics/correlation/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`analyzeCorrelations`) | DEGRADED — FND-030 (unscoped facade calls) |
| Portfolio analytics — diversification | `src/app/api/investments/analytics/diversification/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`analyzeDiversification`) | DEGRADED — FND-030 (unscoped facade calls) |
| Portfolio analytics — rebalance | `src/app/api/investments/analytics/rebalance/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`generateRebalancingRecommendations`) | DEGRADED — FND-030 (unscoped facade calls) |
| Portfolio analytics — performance | `src/app/api/investments/analytics/performance/route.ts`, `src/lib/investments/portfolio-analytics.ts` (`calculatePerformance`), `src/lib/investments/services/PerformanceCalculator.ts` (`benchmarkAgainstSP500`) | DEGRADED — FND-030 (unscoped facade), FND-032 (hardcoded `benchmarkReturnPercent=10`, `beta=1.0`, `correlation=0.85`), FND-035 (volatility = `|dayChangePercent| × sqrt(period)`, not stddev) |
| Portfolio analyze (ad-hoc holdings) | `src/app/api/investments/portfolio/analyze/route.ts`, `src/lib/investments/services/PortfolioAnalysisService.ts`, `src/app/investments/analytics/page.tsx` | DEGRADED — FND-033 (per-element schema validation + array-length cap missing; malformed elements reach engine) |
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
| Performance benchmarking | `src/lib/investments/services/PerformanceCalculator.ts` (`benchmarkAgainstSP500`, `calculateVolatility`, `calculateSharpeRatio`), `src/app/api/investments/analytics/performance/route.ts` | DEGRADED — FND-032 (fabricated constants: `beta=1.0`, `correlation=0.85`, `benchmarkReturnPercent=10`), FND-035 (volatility formula wrong) |
| Market data | `src/lib/investments/market-data-service.ts`, `src/lib/investments/services/MarketDataService.ts`, `src/lib/investments/services/MarketDataWebSocketService.ts` | WORKING |
| Watchlist | `src/app/investments/watchlist/page.tsx` | WORKING |

---

## Status Summary

| Status | Count |
|---|---|
| WORKING | 16 |
| WORKING (verified closed — FND-034) | 1 |
| DEGRADED | 5 |
| MOCK | 0 |

**DEGRADED rows and the findings that close them:**

- Portfolio analytics risk metrics — INV-2 (FND-030), INV-3 (FND-031)
- Portfolio analytics correlation — INV-2 (FND-030)
- Portfolio analytics diversification — INV-2 (FND-030)
- Portfolio analytics rebalance — INV-2 (FND-030)
- Portfolio analytics performance — INV-2 (FND-030), INV-4 (FND-032), INV-5 (FND-035)
- Portfolio analyze ad-hoc — INV-6 (FND-033)
- Performance benchmarking — INV-4 (FND-032), INV-5 (FND-035)

After INV-2 through INV-6 close, every row in this table must show `WORKING`.

**No MOCK rows found.** All spot-checked routes and services make real Supabase queries or real computations (even where the computation is mathematically wrong per FND-031/032/035 — those are correctness bugs, not fabricated data).
