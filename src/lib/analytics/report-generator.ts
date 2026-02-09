/**
 * Report Generator
 *
 * Generates formatted reports in various formats:
 * - PDF reports
 * - CSV exports
 * - JSON data exports
 * - HTML reports
 */

import type {
  AnalyticsReport,
  UserAnalytics,
  DisputeAnalytics,
  WorkflowAnalytics,
  AIUsageAnalytics,
} from './analytics-engine';

type SystemAnalyticsOverview = {
  disputes: DisputeAnalytics;
  workflows: WorkflowAnalytics;
  ai_usage: AIUsageAnalytics;
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ReportFormat = 'pdf' | 'csv' | 'json' | 'html';

export interface ReportOptions {
  format: ReportFormat;
  includeCharts?: boolean;
  includeRawData?: boolean;
  template?: string;
}

export interface GeneratedReport {
  report_id: string;
  format: ReportFormat;
  content: string | Buffer;
  filename: string;
  size_bytes: number;
  generated_at: string;
}

// ============================================================================
// REPORT GENERATOR CLASS
// ============================================================================

export class ReportGenerator {
  /**
   * Generate report in specified format
   */
  static async generateReport(
    report: AnalyticsReport,
    options: ReportOptions
  ): Promise<GeneratedReport> {
    // Generating report

    switch (options.format) {
      case 'json':
        return this.generateJSON(report);
      case 'csv':
        return this.generateCSV(report);
      case 'html':
        return this.generateHTML(report, options);
      case 'pdf':
        return this.generatePDF(report, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Generate JSON report
   */
  private static async generateJSON(
    report: AnalyticsReport
  ): Promise<GeneratedReport> {
    const content = JSON.stringify(report, null, 2);

    return {
      report_id: report.report_id,
      format: 'json',
      content,
      filename: `report_${report.report_id}.json`,
      size_bytes: Buffer.byteLength(content),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate CSV report
   */
  private static async generateCSV(
    report: AnalyticsReport
  ): Promise<GeneratedReport> {
    let csv = '';

    // Add header
    csv += `Report ID,${report.report_id}\n`;
    csv += `Report Type,${report.report_type}\n`;
    csv += `Generated At,${report.generated_at}\n`;
    csv += `Period,${report.period_start} to ${report.period_end}\n`;
    csv += `Summary,${report.summary}\n`;
    csv += '\n';

    // Add data based on report type
    if (report.report_type === 'user' && this.isUserAnalytics(report.data)) {
      csv += 'Metric,Value\n';
      csv += `Total Disputes,${report.data.total_disputes}\n`;
      csv += `Successful Disputes,${report.data.successful_disputes}\n`;
      csv += `Success Rate,${report.data.success_rate}%\n`;
      csv += `Total Savings,$${report.data.total_savings}\n`;
    } else if (
      report.report_type === 'system' &&
      this.isSystemAnalyticsOverview(report.data)
    ) {
      csv += 'Category,Metric,Value\n';
      csv += `Disputes,Total,${report.data.disputes.total_disputes}\n`;
      csv += `Disputes,Success Rate,${report.data.disputes.success_rate}%\n`;
      csv += `Workflows,Total,${report.data.workflows.total_workflows}\n`;
      csv += `Workflows,Success Rate,${report.data.workflows.success_rate}%\n`;
    }

    return {
      report_id: report.report_id,
      format: 'csv',
      content: csv,
      filename: `report_${report.report_id}.csv`,
      size_bytes: Buffer.byteLength(csv),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate HTML report
   */
  private static async generateHTML(
    report: AnalyticsReport,
    options: ReportOptions
  ): Promise<GeneratedReport> {
    const optionDetails = {
      includeCharts: options.includeCharts ?? false,
      includeRawData: options.includeRawData ?? false,
      template: options.template ?? 'default',
    };
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Report - ${report.report_id}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .report-header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .report-header h1 {
      margin: 0 0 10px 0;
      color: #333;
    }
    .report-meta {
      color: #666;
      font-size: 14px;
    }
    .report-section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .report-section h2 {
      margin: 0 0 20px 0;
      color: #333;
      border-bottom: 2px solid #4F46E5;
      padding-bottom: 10px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .metric:last-child {
      border-bottom: none;
    }
    .metric-label {
      font-weight: 500;
      color: #666;
    }
    .metric-value {
      font-weight: 600;
      color: #333;
    }
    .summary {
      background: #EEF2FF;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #4F46E5;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>Analytics Report</h1>
    <div class="report-meta">
      <p><strong>Report ID:</strong> ${report.report_id}</p>
      <p><strong>Type:</strong> ${report.report_type}</p>
      <p><strong>Generated:</strong> ${new Date(report.generated_at).toLocaleString()}</p>
      <p><strong>Period:</strong> ${new Date(report.period_start).toLocaleDateString()} - ${new Date(report.period_end).toLocaleDateString()}</p>
    </div>
  </div>
  
  <div class="report-section">
    <h2>Summary</h2>
    <p>${report.summary}</p>
  </div>

  <div class="report-section">
    <h2>Report Options</h2>
    <ul>
      <li><strong>Template:</strong> ${optionDetails.template}</li>
      <li><strong>Include Charts:</strong> ${optionDetails.includeCharts ? 'Yes' : 'No'}</li>
      <li><strong>Include Raw Data:</strong> ${optionDetails.includeRawData ? 'Yes' : 'No'}</li>
    </ul>
  </div>
  
  <div class="report-section">
    <h2>Data</h2>
    <pre>${JSON.stringify(report.data, null, 2)}</pre>
  </div>
  
  <div class="summary">
    <strong>Note:</strong> This report was automatically generated by Fynvita Analytics Engine.
  </div>
</body>
</html>
    `.trim();

    return {
      report_id: report.report_id,
      format: 'html',
      content: html,
      filename: `report_${report.report_id}.html`,
      size_bytes: Buffer.byteLength(html),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate PDF report
   */
  private static async generatePDF(
    report: AnalyticsReport,
    options: ReportOptions
  ): Promise<GeneratedReport> {
    // In production, use a library like puppeteer or pdfkit
    // For now, return a placeholder
    // ReportGenerator: PDF generation requires puppeteer or pdfkit

    const templateName = options.template ?? 'default';
    const content = `PDF Report: ${report.report_id}\n\nTemplate: ${templateName}\nCharts: ${
      options.includeCharts ? 'included' : 'excluded'
    }\nRaw Data: ${options.includeRawData ? 'included' : 'excluded'}\n\nThis is a placeholder. In production, use puppeteer or pdfkit to generate actual PDFs.`;

    return {
      report_id: report.report_id,
      format: 'pdf',
      content,
      filename: `report_${report.report_id}.pdf`,
      size_bytes: Buffer.byteLength(content),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate multiple reports in different formats
   */
  static async generateMultipleFormats(
    report: AnalyticsReport,
    formats: ReportFormat[]
  ): Promise<GeneratedReport[]> {
    // ReportGenerator: Generating reports in multiple formats

    const reports = await Promise.all(
      formats.map((format) => this.generateReport(report, { format }))
    );

    return reports;
  }

  /**
   * Export data to CSV
   */
  static exportToCSV(
    data: Array<Record<string, unknown>>,
    headers: string[]
  ): string {
    let csv = headers.join(',') + '\n';

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        // Escape commas and quotes
        if (
          typeof value === 'string' &&
          (value.includes(',') || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  private static isUserAnalytics(
    data: AnalyticsReport['data']
  ): data is UserAnalytics {
    return typeof (data as UserAnalytics)?.total_disputes === 'number';
  }

  private static isSystemAnalyticsOverview(
    data: AnalyticsReport['data']
  ): data is SystemAnalyticsOverview {
    const candidate = data as Partial<SystemAnalyticsOverview>;
    return Boolean(
      candidate?.disputes && candidate?.workflows && candidate?.ai_usage
    );
  }
}

export default ReportGenerator;
