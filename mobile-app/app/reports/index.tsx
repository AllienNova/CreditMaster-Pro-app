import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { lightTheme } from "../../src/constants/theme";
import { useCreditStore } from "../../src/store/creditStore";
import { useDashboardStore } from "../../src/store/dashboardStore";
import { useTradingStore } from "../../src/store/tradingStore";
import { useTaxStore } from "../../src/store/taxStore";
import { useDebtStore } from "../../src/store/debtStore";
import { useBudgetStore } from "../../src/store/budgetStore";

type ReportType = "credit" | "financial" | "trading" | "tax";

interface ReportConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    type: "credit",
    title: "Credit Summary",
    description: "Score overview, factors, account summary, and recent inquiries across all bureaus",
    icon: "shield-checkmark-outline",
    color: "#3B82F6",
  },
  {
    type: "financial",
    title: "Financial Overview",
    description: "Net worth, income vs expenses, budget summary, and debt overview",
    icon: "wallet-outline",
    color: "#10B981",
  },
  {
    type: "trading",
    title: "Trading Performance",
    description: "Portfolio summary, trade history, win/loss stats, and risk metrics",
    icon: "trending-up-outline",
    color: "#8B5CF6",
  },
  {
    type: "tax",
    title: "Tax Summary",
    description: "Tax overview, deductions found, and estimated liability",
    icon: "receipt-outline",
    color: "#F59E0B",
  },
];

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getReportDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildBaseHtml(title: string, accentColor: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; background: #fff; padding: 40px; }
    .header { border-bottom: 3px solid ${accentColor}; padding-bottom: 20px; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 700; color: #111827; }
    .header .subtitle { font-size: 14px; color: #6B7280; margin-top: 4px; }
    .header .date { font-size: 12px; color: #9CA3AF; margin-top: 8px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 18px; font-weight: 600; color: ${accentColor}; margin-bottom: 12px; border-left: 4px solid ${accentColor}; padding-left: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #F9FAFB; text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB; }
    td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #F3F4F6; }
    tr:last-child td { border-bottom: none; }
    .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
    .metric-card { background: #F9FAFB; border-radius: 8px; padding: 16px; }
    .metric-label { font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-value { font-size: 24px; font-weight: 700; color: #111827; margin-top: 4px; }
    .metric-change { font-size: 12px; margin-top: 2px; }
    .positive { color: #22C55E; }
    .negative { color: #EF4444; }
    .neutral { color: #6B7280; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-good { background: #DCFCE7; color: #166534; }
    .badge-fair { background: #FEF3C7; color: #92400E; }
    .badge-poor { background: #FEE2E2; color: #991B1B; }
    .footer { margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 16px; font-size: 11px; color: #9CA3AF; text-align: center; }
    .empty-state { text-align: center; padding: 32px; color: #9CA3AF; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Fynvita ${title}</h1>
    <div class="subtitle">Your Financial Vitality Platform</div>
    <div class="date">Generated: ${getReportDate()}</div>
  </div>
  ${bodyContent}
  <div class="footer">
    This report was generated by Fynvita. Data is based on your most recent sync.
  </div>
</body>
</html>`;
}

export default function ReportsScreen() {
  const router = useRouter();
  const [generatingReport, setGeneratingReport] = useState<ReportType | null>(null);

  const scores = useCreditStore((s) => s.scores);
  const factors = useCreditStore((s) => s.factors);
  const alerts = useCreditStore((s) => s.alerts);
  const currentScore = useCreditStore((s) => s.currentScore);

  const dashboard = useDashboardStore((s) => s.dashboard);

  const budgets = useBudgetStore((s) => s.budgets);

  const debtOverview = useDebtStore((s) => s.overview);

  const tradeHistory = useTradingStore((s) => s.tradeHistory);
  const tradeStats = useTradingStore((s) => s.tradeStats);
  const openPositions = useTradingStore((s) => s.openPositions);
  const riskMetrics = useTradingStore((s) => s.riskMetrics);
  const positionSummary = useTradingStore((s) => s.positionSummary);

  const taxAnalysis = useTaxStore((s) => s.analysis);
  const deductionSummary = useTaxStore((s) => s.deductionSummary);
  const deductionCategories = useTaxStore((s) => s.deductionCategories);

  const buildCreditReportHtml = useCallback((): string => {
    const scoreRows = scores.length > 0
      ? scores.map((s) => {
          const changeStr = s.change != null
            ? `<span class="${s.change >= 0 ? "positive" : "negative"}">${s.change >= 0 ? "+" : ""}${s.change}</span>`
            : "-";
          const scoreLabel = s.score >= 750 ? "Excellent" : s.score >= 700 ? "Good" : s.score >= 650 ? "Fair" : "Poor";
          const badgeClass = s.score >= 750 ? "badge-good" : s.score >= 700 ? "badge-good" : s.score >= 650 ? "badge-fair" : "badge-poor";
          return `<tr><td style="text-transform:capitalize">${s.bureau}</td><td><strong>${s.score}</strong></td><td>${changeStr}</td><td><span class="badge ${badgeClass}">${scoreLabel}</span></td><td>${s.date ? formatDate(s.date) : "-"}</td></tr>`;
        }).join("")
      : '<tr><td colspan="5" class="empty-state">No credit score data available</td></tr>';

    const factorRows = factors.length > 0
      ? factors.map((f) => {
          const impactClass = f.impact === "positive" || f.impact === "high_positive" ? "positive" : f.impact === "negative" || f.impact === "high_negative" ? "negative" : "neutral";
          const impactLabel = f.impact.replace("_", " ");
          return `<tr><td>${f.name}</td><td style="text-transform:capitalize">${f.category.replace(/_/g, " ")}</td><td class="${impactClass}" style="text-transform:capitalize;font-weight:600">${impactLabel}</td></tr>`;
        }).join("")
      : '<tr><td colspan="3" class="empty-state">No factor data available</td></tr>';

    const recentAlerts = alerts.slice(0, 5);
    const alertRows = recentAlerts.length > 0
      ? recentAlerts.map((a) => {
          const sevClass = a.severity === "critical" || a.severity === "high" ? "negative" : a.severity === "medium" ? "neutral" : "positive";
          return `<tr><td>${a.title}</td><td class="${sevClass}" style="text-transform:capitalize;font-weight:600">${a.severity}</td><td>${a.description}</td></tr>`;
        }).join("")
      : '<tr><td colspan="3" class="empty-state">No recent alerts</td></tr>';

    const body = `
      <div class="section">
        <div class="section-title">Score Overview</div>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Average Score</div>
            <div class="metric-value">${currentScore ?? "N/A"}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Bureaus Tracked</div>
            <div class="metric-value">${scores.length}</div>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Bureau Scores</div>
        <table>
          <tr><th>Bureau</th><th>Score</th><th>Change</th><th>Rating</th><th>Last Updated</th></tr>
          ${scoreRows}
        </table>
      </div>
      <div class="section">
        <div class="section-title">Score Factors</div>
        <table>
          <tr><th>Factor</th><th>Category</th><th>Impact</th></tr>
          ${factorRows}
        </table>
      </div>
      <div class="section">
        <div class="section-title">Recent Alerts</div>
        <table>
          <tr><th>Alert</th><th>Severity</th><th>Details</th></tr>
          ${alertRows}
        </table>
      </div>`;

    return buildBaseHtml("Credit Summary Report", "#3B82F6", body);
  }, [scores, factors, alerts, currentScore]);

  const buildFinancialReportHtml = useCallback((): string => {
    const netWorth = dashboard?.netWorth ?? 0;
    const totalAssets = dashboard?.totalAssets ?? 0;
    const totalLiabilities = dashboard?.totalLiabilities ?? 0;
    const monthlyIncome = dashboard?.monthlyIncome ?? 0;
    const monthlyExpenses = dashboard?.monthlyExpenses ?? 0;
    const savingsRate = dashboard?.savingsRate ?? 0;
    const cashFlow = monthlyIncome - monthlyExpenses;

    const budgetRows = budgets.length > 0
      ? budgets.map((b) => {
          const pctUsed = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
          const statusClass = pctUsed >= 100 ? "negative" : pctUsed >= 80 ? "neutral" : "positive";
          return `<tr><td style="text-transform:capitalize">${b.category}</td><td>${formatCurrency(b.limit)}</td><td>${formatCurrency(b.spent)}</td><td class="${statusClass}" style="font-weight:600">${formatPercent(pctUsed)}</td></tr>`;
        }).join("")
      : '<tr><td colspan="4" class="empty-state">No budget data available</td></tr>';

    const debtRows = debtOverview?.debts && debtOverview.debts.length > 0
      ? debtOverview.debts.map((d) => {
          return `<tr><td>${d.name}</td><td style="text-transform:capitalize">${d.type}</td><td>${formatCurrency(d.balance)}</td><td>${formatPercent(d.interestRate)}</td><td>${formatCurrency(d.minimumPayment)}</td></tr>`;
        }).join("")
      : '<tr><td colspan="5" class="empty-state">No debt data available</td></tr>';

    const body = `
      <div class="section">
        <div class="section-title">Net Worth</div>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Net Worth</div>
            <div class="metric-value">${formatCurrency(netWorth)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Assets</div>
            <div class="metric-value">${formatCurrency(totalAssets)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Liabilities</div>
            <div class="metric-value">${formatCurrency(totalLiabilities)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Savings Rate</div>
            <div class="metric-value">${formatPercent(savingsRate)}</div>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Income vs Expenses</div>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Monthly Income</div>
            <div class="metric-value">${formatCurrency(monthlyIncome)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Monthly Expenses</div>
            <div class="metric-value">${formatCurrency(monthlyExpenses)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Cash Flow</div>
            <div class="metric-value ${cashFlow >= 0 ? "positive" : "negative"}">${formatCurrency(cashFlow)}</div>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Budget Summary</div>
        <table>
          <tr><th>Category</th><th>Limit</th><th>Spent</th><th>Used</th></tr>
          ${budgetRows}
        </table>
      </div>
      <div class="section">
        <div class="section-title">Debt Overview</div>
        ${debtOverview ? `
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Total Debt</div>
            <div class="metric-value negative">${formatCurrency(debtOverview.totalDebt)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Monthly Payments</div>
            <div class="metric-value">${formatCurrency(debtOverview.monthlyPayments)}</div>
          </div>
        </div>` : ""}
        <table>
          <tr><th>Name</th><th>Type</th><th>Balance</th><th>Rate</th><th>Min Payment</th></tr>
          ${debtRows}
        </table>
      </div>`;

    return buildBaseHtml("Financial Overview Report", "#10B981", body);
  }, [dashboard, budgets, debtOverview]);

  const buildTradingReportHtml = useCallback((): string => {
    const positionRows = openPositions.length > 0
      ? openPositions.map((p) => {
          const plClass = p.unrealizedPL >= 0 ? "positive" : "negative";
          return `<tr><td><strong>${p.symbol}</strong></td><td style="text-transform:capitalize">${p.side}</td><td>${p.quantity}</td><td>${formatCurrency(p.avgEntryPrice)}</td><td>${formatCurrency(p.currentPrice)}</td><td>${formatCurrency(p.marketValue)}</td><td class="${plClass}" style="font-weight:600">${formatCurrency(p.unrealizedPL)}</td></tr>`;
        }).join("")
      : '<tr><td colspan="7" class="empty-state">No open positions</td></tr>';

    const recentTrades = tradeHistory.slice(0, 10);
    const historyRows = recentTrades.length > 0
      ? recentTrades.map((t) => {
          const outcome = t.outcome ?? "breakeven";
          const outcomeClass = outcome === "win" ? "positive" : outcome === "loss" ? "negative" : "neutral";
          const pl = t.profitLoss ?? 0;
          return `<tr><td><strong>${t.symbol}</strong></td><td style="text-transform:capitalize">${t.direction}</td><td>${formatCurrency(t.entryPrice)}</td><td>${t.exitPrice != null ? formatCurrency(t.exitPrice) : "-"}</td><td class="${outcomeClass}" style="font-weight:600">${formatCurrency(pl)}</td><td style="text-transform:capitalize" class="${outcomeClass}">${outcome}</td></tr>`;
        }).join("")
      : '<tr><td colspan="6" class="empty-state">No trade history</td></tr>';

    const stats = tradeStats;
    const risk = riskMetrics;
    const summary = positionSummary;

    const body = `
      <div class="section">
        <div class="section-title">Portfolio Summary</div>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Open Positions</div>
            <div class="metric-value">${openPositions.length}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Market Value</div>
            <div class="metric-value">${formatCurrency(summary?.totalValue ?? openPositions.reduce((s, p) => s + p.marketValue, 0))}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Unrealized P&L</div>
            <div class="metric-value ${(summary?.totalUnrealizedPL ?? 0) >= 0 ? "positive" : "negative"}">${formatCurrency(summary?.totalUnrealizedPL ?? openPositions.reduce((s, p) => s + p.unrealizedPL, 0))}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Trades</div>
            <div class="metric-value">${stats?.totalTrades ?? 0}</div>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Open Positions</div>
        <table>
          <tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Current</th><th>Value</th><th>P&L</th></tr>
          ${positionRows}
        </table>
      </div>
      <div class="section">
        <div class="section-title">Win/Loss Statistics</div>
        ${stats ? `
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Win Rate</div>
            <div class="metric-value">${formatPercent(stats.winRate)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Profit Factor</div>
            <div class="metric-value">${stats.profitFactor.toFixed(2)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Avg Win</div>
            <div class="metric-value positive">${formatCurrency(stats.averageWin)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Avg Loss</div>
            <div class="metric-value negative">${formatCurrency(stats.averageLoss)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Best Trade</div>
            <div class="metric-value positive">${formatCurrency(stats.bestTrade)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Worst Trade</div>
            <div class="metric-value negative">${formatCurrency(stats.worstTrade)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Expectancy</div>
            <div class="metric-value">${formatCurrency(stats.expectancy)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total P&L</div>
            <div class="metric-value ${stats.totalPL >= 0 ? "positive" : "negative"}">${formatCurrency(stats.totalPL)}</div>
          </div>
        </div>` : '<div class="empty-state">No trading statistics available</div>'}
      </div>
      <div class="section">
        <div class="section-title">Risk Metrics</div>
        ${risk ? `
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Portfolio Heat</div>
            <div class="metric-value">${formatPercent(risk.portfolioHeat)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Gross Exposure</div>
            <div class="metric-value">${formatCurrency(risk.grossExposure)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Current Drawdown</div>
            <div class="metric-value negative">${formatPercent(risk.currentDrawdown)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Max Drawdown</div>
            <div class="metric-value negative">${formatPercent(risk.maxDrawdown)}</div>
          </div>
        </div>` : '<div class="empty-state">No risk metrics available</div>'}
      </div>
      <div class="section">
        <div class="section-title">Recent Trade History</div>
        <table>
          <tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Outcome</th></tr>
          ${historyRows}
        </table>
      </div>`;

    return buildBaseHtml("Trading Performance Report", "#8B5CF6", body);
  }, [tradeHistory, tradeStats, openPositions, riskMetrics, positionSummary]);

  const buildTaxReportHtml = useCallback((): string => {
    const projection = taxAnalysis?.currentProjection;
    const opportunities = taxAnalysis?.opportunities ?? [];

    const opportunityRows = opportunities.length > 0
      ? opportunities.map((o) => {
          return `<tr><td>${o.strategyName}</td><td class="positive" style="font-weight:600">${formatCurrency(o.potentialTaxSavings)}</td><td style="text-transform:capitalize">${o.priority}</td><td>${formatCurrency(o.remainingCapacity)}</td></tr>`;
        }).join("")
      : '<tr><td colspan="4" class="empty-state">No tax opportunities identified</td></tr>';

    const deductionRows = deductionSummary?.byCategory && deductionSummary.byCategory.length > 0
      ? deductionSummary.byCategory.map((c) => {
          return `<tr><td style="text-transform:capitalize">${c.category}</td><td>${formatCurrency(c.amount)}</td><td>${formatPercent(c.percentage)}</td></tr>`;
        }).join("")
      : '<tr><td colspan="3" class="empty-state">No deduction data available</td></tr>';

    const body = `
      <div class="section">
        <div class="section-title">Tax Overview</div>
        ${projection ? `
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Gross Income</div>
            <div class="metric-value">${formatCurrency(projection.grossIncome)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Taxable Income</div>
            <div class="metric-value">${formatCurrency(projection.taxableIncome)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Estimated Tax</div>
            <div class="metric-value negative">${formatCurrency(projection.totalTax)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Effective Rate</div>
            <div class="metric-value">${formatPercent(projection.effectiveRate)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Marginal Rate</div>
            <div class="metric-value">${formatPercent(projection.federalMarginalRate)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Monthly Take-Home</div>
            <div class="metric-value positive">${formatCurrency(projection.monthlyTakeHome)}</div>
          </div>
        </div>` : '<div class="empty-state">No tax analysis available. Run a tax analysis to generate data.</div>'}
      </div>
      <div class="section">
        <div class="section-title">Deductions Found</div>
        ${deductionSummary ? `
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Total Deductions</div>
            <div class="metric-value">${formatCurrency(deductionSummary.totalDeductions)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Recommendation</div>
            <div class="metric-value" style="font-size:18px;text-transform:capitalize">${deductionSummary.itemizedVsStandard.recommendation}</div>
            <div class="metric-change positive">Saves ${formatCurrency(deductionSummary.itemizedVsStandard.savings)}</div>
          </div>
        </div>` : ""}
        <table>
          <tr><th>Category</th><th>Amount</th><th>% of Total</th></tr>
          ${deductionRows}
        </table>
      </div>
      <div class="section">
        <div class="section-title">Tax Optimization Opportunities</div>
        <table>
          <tr><th>Strategy</th><th>Potential Savings</th><th>Priority</th><th>Remaining Capacity</th></tr>
          ${opportunityRows}
        </table>
        ${taxAnalysis ? `
        <div class="metric-grid" style="margin-top:16px">
          <div class="metric-card">
            <div class="metric-label">Total Potential Savings</div>
            <div class="metric-value positive">${formatCurrency(taxAnalysis.totalPotentialSavings)}</div>
          </div>
        </div>` : ""}
      </div>`;

    return buildBaseHtml("Tax Summary Report", "#F59E0B", body);
  }, [taxAnalysis, deductionSummary]);

  const generateReport = useCallback(async (reportType: ReportType) => {
    setGeneratingReport(reportType);

    try {
      let html: string;
      switch (reportType) {
        case "credit":
          html = buildCreditReportHtml();
          break;
        case "financial":
          html = buildFinancialReportHtml();
          break;
        case "trading":
          html = buildTradingReportHtml();
          break;
        case "tax":
          html = buildTaxReportHtml();
          break;
      }

      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Share ${REPORT_CONFIGS.find((r) => r.type === reportType)?.title ?? "Report"}`,
        });
      } else {
        Alert.alert("PDF Generated", "Your report has been saved. Sharing is not available on this device.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      Alert.alert("Report Error", `Failed to generate report: ${message}`);
    } finally {
      setGeneratingReport(null);
    }
  }, [buildCreditReportHtml, buildFinancialReportHtml, buildTradingReportHtml, buildTaxReportHtml]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionLabel}>Generate Reports</Text>
        <Text style={styles.sectionDescription}>
          Create PDF reports from your financial data. Tap Generate to build and share.
        </Text>

        {REPORT_CONFIGS.map((config) => {
          const isGenerating = generatingReport === config.type;
          return (
            <View key={config.type} style={styles.reportCard}>
              <View style={[styles.iconCircle, { backgroundColor: config.color + "15" }]}>
                <Ionicons name={config.icon} size={28} color={config.color} />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{config.title}</Text>
                <Text style={styles.reportDescription}>{config.description}</Text>
              </View>
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: config.color }, isGenerating && styles.buttonDisabled]}
                onPress={() => generateReport(config.type)}
                disabled={generatingReport !== null}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Generate</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Other Report Actions</Text>

        <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/reports/comparison")}>
          <View style={styles.actionLeft}>
            <Ionicons name="git-compare-outline" size={22} color={lightTheme.colors.primary} />
            <Text style={styles.actionText}>Bureau Comparison</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={lightTheme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/reports/upload")}>
          <View style={styles.actionLeft}>
            <Ionicons name="cloud-upload-outline" size={22} color={lightTheme.colors.primary} />
            <Text style={styles.actionText}>Upload Credit Report</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={lightTheme.colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 48,
    backgroundColor: lightTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: lightTheme.colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginBottom: 2,
  },
  reportDescription: {
    fontSize: 12,
    color: lightTheme.colors.textSecondary,
    lineHeight: 16,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: 100,
    justifyContent: "center",
  },
  generateButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: lightTheme.colors.border,
    marginVertical: 24,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
    color: lightTheme.colors.text,
  },
});
