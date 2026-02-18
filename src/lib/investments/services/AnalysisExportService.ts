/**
 * Analysis Export Service
 *
 * Provides functionality to export investment analysis results to various formats:
 * - CSV: Tabular data export for spreadsheet analysis
 * - PDF: Professional reports with charts and formatting
 * - JSON: Raw data export for programmatic use
 *
 * Features:
 * - Multiple export formats
 * - Customizable templates
 * - Data sanitization and formatting
 * - Batch export support
 */

import type { ComprehensiveAnalysis } from "@/lib/investments/services/InvestmentAnalysisEngine";
import type { PortfolioMetrics } from "@/lib/investments/services/PortfolioAnalysisService";

// Type alias for backwards compatibility
type InvestmentAnalysis = ComprehensiveAnalysis;

// Portfolio Analysis type
export interface PortfolioAnalysis {
  portfolioId: string;
  analyzedAt: Date;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  portfolioHealth: number;
  portfolioRisk: string;
  diversificationScore: number;
  overallSignal: string;
  overallConfidence: number;
  summary?: string;
}

export interface ExportOptions {
  format: "csv" | "pdf" | "json";
  includeCharts?: boolean;
  includeRawData?: boolean;
  template?: "standard" | "detailed" | "summary";
}

export interface ExportResult {
  data: string | Blob;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Analysis Export Service
 */
export class AnalysisExportService {
  /**
   * Export investment analysis to specified format
   */
  async exportInvestmentAnalysis(
    analysis: InvestmentAnalysis,
    options: ExportOptions,
  ): Promise<ExportResult> {
    switch (options.format) {
      case "csv":
        return this.exportToCSV(analysis);
      case "json":
        return this.exportToJSON(analysis);
      case "pdf":
        return this.exportToPDF(analysis, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export portfolio analysis to specified format
   */
  async exportPortfolioAnalysis(
    analysis: PortfolioAnalysis,
    options: ExportOptions,
  ): Promise<ExportResult> {
    switch (options.format) {
      case "csv":
        return this.exportPortfolioToCSV(analysis);
      case "json":
        return this.exportToJSON(analysis);
      case "pdf":
        return this.exportPortfolioToPDF(analysis, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export investment analysis to CSV
   */
  private exportToCSV(analysis: InvestmentAnalysis): ExportResult {
    const rows: string[][] = [];

    // Header
    rows.push(["Investment Analysis Report"]);
    rows.push(["Symbol", analysis.symbol]);
    rows.push(["Analyzed At", analysis.analyzedAt.toISOString()]);
    rows.push(["Current Price", analysis.currentPrice.toString()]);
    rows.push([]);

    // Overall Signal
    rows.push(["Overall Signal", analysis.overallSignal.toUpperCase()]);
    rows.push([
      "Confidence",
      (analysis.overallConfidence * 100).toFixed(2) + "%",
    ]);
    rows.push(["Risk Level", analysis.riskLevel]);
    rows.push([]);

    // Composite Scores
    rows.push(["Composite Scores"]);
    rows.push([
      "Technical Score",
      analysis.compositeScore.technical.toString(),
    ]);
    rows.push([
      "Fundamental Score",
      analysis.compositeScore.fundamental.toString(),
    ]);
    rows.push([
      "Sentiment Score",
      analysis.compositeScore.sentiment.toString(),
    ]);
    rows.push(["Pattern Score", analysis.compositeScore.pattern.toString()]);
    rows.push(["Overall Score", analysis.compositeScore.overall.toString()]);
    rows.push([]);

    // Insights
    rows.push(["Key Insights"]);
    analysis.keyInsights.forEach((insight, index) => {
      rows.push([`${index + 1}`, insight]);
    });
    rows.push([]);

    // Risks
    rows.push(["Risk Factors"]);
    analysis.risks.forEach((risk, index) => {
      rows.push([`${index + 1}`, risk]);
    });
    rows.push([]);

    // Opportunities
    rows.push(["Opportunities"]);
    analysis.opportunities.forEach((opportunity, index) => {
      rows.push([`${index + 1}`, opportunity]);
    });

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const filename = `investment-analysis-${analysis.symbol}-${Date.now()}.csv`;

    return {
      data: csvContent,
      filename,
      mimeType: "text/csv",
      size: csvContent.length,
    };
  }

  /**
   * Export portfolio analysis to CSV
   */
  private exportPortfolioToCSV(analysis: PortfolioAnalysis): ExportResult {
    const rows: string[][] = [];

    // Header
    rows.push(["Portfolio Analysis Report"]);
    rows.push(["Portfolio ID", analysis.portfolioId]);
    rows.push(["Analyzed At", analysis.analyzedAt.toISOString()]);
    rows.push([]);

    // Portfolio Summary
    rows.push(["Portfolio Summary"]);
    rows.push(["Total Value", `$${analysis.totalValue.toFixed(2)}`]);
    rows.push(["Total Cost", `$${analysis.totalCost.toFixed(2)}`]);
    rows.push(["Total Gain/Loss", `$${analysis.totalGainLoss.toFixed(2)}`]);
    rows.push([
      "Total Gain/Loss %",
      `${analysis.totalGainLossPercent.toFixed(2)}%`,
    ]);
    rows.push(["Portfolio Health", analysis.portfolioHealth.toString()]);
    rows.push(["Portfolio Risk", analysis.portfolioRisk]);
    rows.push([
      "Diversification Score",
      analysis.diversificationScore.toString(),
    ]);
    rows.push([]);

    // Overall Signal
    rows.push(["Overall Signal", analysis.overallSignal.toUpperCase()]);
    rows.push([
      "Confidence",
      (analysis.overallConfidence * 100).toFixed(2) + "%",
    ]);
    rows.push([]);

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const filename = `portfolio-analysis-${analysis.portfolioId}-${Date.now()}.csv`;

    return {
      data: csvContent,
      filename,
      mimeType: "text/csv",
      size: csvContent.length,
    };
  }

  /**
   * Export to JSON
   */
  private exportToJSON(
    analysis: InvestmentAnalysis | PortfolioAnalysis,
  ): ExportResult {
    const jsonContent = JSON.stringify(analysis, null, 2);
    const isPortfolio = "portfolioId" in analysis;
    const identifier = isPortfolio
      ? (analysis as PortfolioAnalysis).portfolioId
      : (analysis as InvestmentAnalysis).symbol;
    const filename = `${isPortfolio ? "portfolio" : "investment"}-analysis-${identifier}-${Date.now()}.json`;

    return {
      data: jsonContent,
      filename,
      mimeType: "application/json",
      size: jsonContent.length,
    };
  }

  /**
   * Export investment analysis to PDF
   */
  private async exportToPDF(
    analysis: InvestmentAnalysis,
    options: ExportOptions,
  ): Promise<ExportResult> {
    // For now, return a simple HTML-based PDF representation
    // In production, you would use a library like jsPDF or pdfmake
    const htmlContent = this.generateInvestmentHTML(analysis, options);
    const filename = `investment-analysis-${analysis.symbol}-${Date.now()}.html`;

    return {
      data: htmlContent,
      filename,
      mimeType: "text/html",
      size: htmlContent.length,
    };
  }

  /**
   * Export portfolio analysis to PDF
   */
  private async exportPortfolioToPDF(
    analysis: PortfolioAnalysis,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const htmlContent = this.generatePortfolioHTML(analysis, options);
    const filename = `portfolio-analysis-${analysis.portfolioId}-${Date.now()}.html`;

    return {
      data: htmlContent,
      filename,
      mimeType: "text/html",
      size: htmlContent.length,
    };
  }

  /**
   * Generate HTML for investment analysis
   */
  private generateInvestmentHTML(
    analysis: InvestmentAnalysis,
    options: ExportOptions,
  ): string {
    const template = options.template || "standard";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Investment Analysis Report - ${analysis.symbol}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2563eb; }
    h2 { color: #1e40af; margin-top: 30px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .section { margin: 20px 0; }
    .metric { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .metric-label { font-weight: bold; }
    .signal-buy { color: #10b981; font-weight: bold; }
    .signal-sell { color: #ef4444; font-weight: bold; }
    .signal-hold { color: #f59e0b; font-weight: bold; }
    ul { list-style-type: none; padding: 0; }
    li { padding: 8px; margin: 5px 0; background: #f3f4f6; border-left: 3px solid #2563eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Investment Analysis Report</h1>
    <p><strong>Symbol:</strong> ${analysis.symbol}</p>
    <p><strong>Current Price:</strong> $${analysis.currentPrice.toFixed(2)}</p>
    <p><strong>Analyzed At:</strong> ${analysis.analyzedAt.toISOString()}</p>
  </div>

  <div class="section">
    <h2>Overall Signal</h2>
    <div class="metric">
      <span class="metric-label">Signal:</span>
      <span class="signal-${analysis.overallSignal}">${analysis.overallSignal.toUpperCase()}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Confidence:</span>
      <span>${(analysis.overallConfidence * 100).toFixed(2)}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">Risk Level:</span>
      <span>${analysis.riskLevel}</span>
    </div>
  </div>

  <div class="section">
    <h2>Composite Scores</h2>
    <div class="metric">
      <span class="metric-label">Technical Score:</span>
      <span>${analysis.compositeScore.technical}/100</span>
    </div>
    <div class="metric">
      <span class="metric-label">Fundamental Score:</span>
      <span>${analysis.compositeScore.fundamental}/100</span>
    </div>
    <div class="metric">
      <span class="metric-label">Sentiment Score:</span>
      <span>${analysis.compositeScore.sentiment}/100</span>
    </div>
    <div class="metric">
      <span class="metric-label">Pattern Score:</span>
      <span>${analysis.compositeScore.pattern}/100</span>
    </div>
    <div class="metric">
      <span class="metric-label">Overall Score:</span>
      <span>${analysis.compositeScore.overall}/100</span>
    </div>
  </div>

  <div class="section">
    <h2>Key Insights</h2>
    <ul>
      ${analysis.keyInsights.map((insight) => `<li>${insight}</li>`).join("")}
    </ul>
  </div>

  <div class="section">
    <h2>Risk Factors</h2>
    <ul>
      ${analysis.risks.map((risk) => `<li>${risk}</li>`).join("")}
    </ul>
  </div>

  <div class="section">
    <h2>Opportunities</h2>
    <ul>
      ${analysis.opportunities.map((opportunity) => `<li>${opportunity}</li>`).join("")}
    </ul>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <p>${analysis.summary}</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for portfolio analysis
   */
  private generatePortfolioHTML(
    analysis: PortfolioAnalysis,
    options: ExportOptions,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Portfolio Analysis Report - ${analysis.portfolioId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2563eb; }
    h2 { color: #1e40af; margin-top: 30px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .section { margin: 20px 0; }
    .metric { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .metric-label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Portfolio Analysis Report</h1>
    <p><strong>Portfolio ID:</strong> ${analysis.portfolioId}</p>
    <p><strong>Analyzed At:</strong> ${analysis.analyzedAt.toISOString()}</p>
  </div>

  <div class="section">
    <h2>Portfolio Summary</h2>
    <div class="metric">
      <span class="metric-label">Total Value:</span>
      <span>$${analysis.totalValue.toFixed(2)}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Total Cost:</span>
      <span>$${analysis.totalCost.toFixed(2)}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Total Gain/Loss:</span>
      <span>$${analysis.totalGainLoss.toFixed(2)}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Total Gain/Loss %:</span>
      <span>${analysis.totalGainLossPercent.toFixed(2)}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">Portfolio Health:</span>
      <span>${analysis.portfolioHealth}/100</span>
    </div>
    <div class="metric">
      <span class="metric-label">Portfolio Risk:</span>
      <span>${analysis.portfolioRisk}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Diversification Score:</span>
      <span>${analysis.diversificationScore}/100</span>
    </div>
  </div>

  <div class="section">
    <h2>Overall Signal</h2>
    <div class="metric">
      <span class="metric-label">Signal:</span>
      <span>${analysis.overallSignal.toUpperCase()}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Confidence:</span>
      <span>${(analysis.overallConfidence * 100).toFixed(2)}%</span>
    </div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <p>${analysis.summary}</p>
  </div>
</body>
</html>
    `.trim();
  }
}

// Singleton instance
let analysisExportServiceInstance: AnalysisExportService | null = null;

/**
 * Get singleton instance of AnalysisExportService
 */
export function getAnalysisExportService(): AnalysisExportService {
  if (!analysisExportServiceInstance) {
    analysisExportServiceInstance = new AnalysisExportService();
  }
  return analysisExportServiceInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetAnalysisExportService(): void {
  analysisExportServiceInstance = null;
}
