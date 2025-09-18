import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, parseISO, differenceInDays } from 'date-fns';
import { supabase } from './supabase';
import type { 
  User, 
  CreditItem, 
  DisputeExecution, 
  Strategy, 
  CreditReport,
  StrategyAnalysisResult 
} from '@/types';

export interface DocumentGenerationOptions {
  includeCharts?: boolean;
  includeTimeline?: boolean;
  includeStrategies?: boolean;
  includeLetters?: boolean;
  watermark?: string;
  customBranding?: boolean;
}

export interface ReportData {
  user: User;
  creditReports: CreditReport[];
  creditItems: CreditItem[];
  disputes: DisputeExecution[];
  strategies: Strategy[];
  analysisResult?: StrategyAnalysisResult;
  generatedAt: string;
}

export class DocumentGenerator {
  private static readonly COLORS = {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    gray: '#6b7280',
    lightGray: '#f8fafc'
  };

  private static readonly FONTS = {
    heading: 'helvetica',
    body: 'helvetica',
    mono: 'courier'
  };

  /**
   * Generate comprehensive credit analysis report
   */
  static async generateCreditAnalysisReport(
    reportData: ReportData,
    options: DocumentGenerationOptions = {}
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Set default options
    const opts = {
      includeCharts: true,
      includeTimeline: true,
      includeStrategies: true,
      includeLetters: false,
      watermark: 'CreditMaster Pro',
      customBranding: true,
      ...options
    };

    try {
      // Cover Page
      yPosition = this.generateCoverPage(pdf, reportData, yPosition, pageWidth);
      
      // Executive Summary
      pdf.addPage();
      yPosition = 20;
      yPosition = this.generateExecutiveSummary(pdf, reportData, yPosition, pageWidth);

      // Credit Profile Overview
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }
      yPosition = this.generateCreditProfileOverview(pdf, reportData, yPosition, pageWidth);

      // Credit Items Analysis
      pdf.addPage();
      yPosition = 20;
      yPosition = this.generateCreditItemsAnalysis(pdf, reportData, yPosition, pageWidth);

      // Strategy Recommendations
      if (opts.includeStrategies && reportData.analysisResult) {
        pdf.addPage();
        yPosition = 20;
        yPosition = this.generateStrategyRecommendations(pdf, reportData, yPosition, pageWidth);
      }

      // Dispute History
      if (reportData.disputes.length > 0) {
        pdf.addPage();
        yPosition = 20;
        yPosition = this.generateDisputeHistory(pdf, reportData, yPosition, pageWidth);
      }

      // Timeline Analysis
      if (opts.includeTimeline) {
        pdf.addPage();
        yPosition = 20;
        yPosition = this.generateTimelineAnalysis(pdf, reportData, yPosition, pageWidth);
      }

      // Action Plan
      pdf.addPage();
      yPosition = 20;
      yPosition = this.generateActionPlan(pdf, reportData, yPosition, pageWidth);

      // Legal Disclaimers
      pdf.addPage();
      yPosition = 20;
      this.generateLegalDisclaimers(pdf, yPosition, pageWidth);

      // Add watermark to all pages
      if (opts.watermark) {
        this.addWatermark(pdf, opts.watermark);
      }

      // Add page numbers
      this.addPageNumbers(pdf);

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Generate dispute letter PDF
   */
  static async generateDisputeLetter(
    letterData: any,
    options: DocumentGenerationOptions = {}
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    try {
      // Header with date and contact info
      pdf.setFontSize(12);
      pdf.setFont(this.FONTS.body, 'normal');
      pdf.text(format(new Date(), 'MMMM dd, yyyy'), pageWidth - 50, yPosition);
      yPosition += 20;

      // Recipient address
      pdf.setFontSize(11);
      pdf.text(letterData.recipient_name || 'Credit Bureau', 20, yPosition);
      yPosition += 6;
      pdf.text(letterData.recipient_address || 'Dispute Department', 20, yPosition);
      yPosition += 20;

      // Subject line
      pdf.setFont(this.FONTS.body, 'bold');
      pdf.text('RE: ' + (letterData.subject || 'Credit Report Dispute'), 20, yPosition);
      yPosition += 15;

      // Letter content
      pdf.setFont(this.FONTS.body, 'normal');
      const content = letterData.content || '';
      const lines = pdf.splitTextToSize(content, pageWidth - 40);
      
      for (const line of lines) {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      }

      // Signature area
      yPosition += 20;
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text('Sincerely,', 20, yPosition);
      yPosition += 20;
      pdf.text('_________________________', 20, yPosition);
      yPosition += 6;
      pdf.text(letterData.sender_name || 'Consumer Name', 20, yPosition);

      // Legal citations
      if (letterData.legal_citations && letterData.legal_citations.length > 0) {
        yPosition += 20;
        pdf.setFont(this.FONTS.body, 'bold');
        pdf.text('Legal Citations:', 20, yPosition);
        yPosition += 8;
        
        pdf.setFont(this.FONTS.body, 'normal');
        letterData.legal_citations.forEach((citation: string) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text('• ' + citation, 25, yPosition);
          yPosition += 6;
        });
      }

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating dispute letter PDF:', error);
      throw new Error('Failed to generate dispute letter PDF');
    }
  }

  /**
   * Generate monthly progress report
   */
  static async generateMonthlyReport(
    userId: string,
    month: string,
    options: DocumentGenerationOptions = {}
  ): Promise<Blob> {
    try {
      // Fetch data for the month
      const reportData = await this.fetchMonthlyData(userId, month);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont(this.FONTS.heading, 'bold');
      pdf.text('Monthly Progress Report', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(14);
      pdf.setFont(this.FONTS.body, 'normal');
      pdf.text(format(parseISO(month + '-01'), 'MMMM yyyy'), 20, yPosition);
      yPosition += 20;

      // Summary metrics
      yPosition = this.generateMonthlySummary(pdf, reportData, yPosition, pageWidth);

      // Dispute activity
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }
      yPosition = this.generateMonthlyDisputeActivity(pdf, reportData, yPosition, pageWidth);

      // Score changes
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }
      yPosition = this.generateMonthlyScoreChanges(pdf, reportData, yPosition, pageWidth);

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating monthly report:', error);
      throw new Error('Failed to generate monthly report');
    }
  }

  /**
   * Generate strategy effectiveness report
   */
  static async generateStrategyReport(
    strategies: Strategy[],
    executions: DisputeExecution[]
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    try {
      // Title
      pdf.setFontSize(18);
      pdf.setFont(this.FONTS.heading, 'bold');
      pdf.text('Strategy Effectiveness Report', 20, yPosition);
      yPosition += 15;

      // Generate date
      pdf.setFontSize(10);
      pdf.setFont(this.FONTS.body, 'normal');
      pdf.text('Generated: ' + format(new Date(), 'PPP'), 20, yPosition);
      yPosition += 20;

      // Strategy analysis
      for (const strategy of strategies) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        const strategyExecutions = executions.filter(e => e.strategy_id === strategy.id);
        const successfulExecutions = strategyExecutions.filter(e => e.success === true);
        const successRate = strategyExecutions.length > 0 
          ? (successfulExecutions.length / strategyExecutions.length) * 100 
          : 0;

        // Strategy name
        pdf.setFontSize(14);
        pdf.setFont(this.FONTS.heading, 'bold');
        pdf.text(strategy.name, 20, yPosition);
        yPosition += 8;

        // Metrics
        pdf.setFontSize(10);
        pdf.setFont(this.FONTS.body, 'normal');
        pdf.text(`Total Executions: ${strategyExecutions.length}`, 25, yPosition);
        yPosition += 5;
        pdf.text(`Successful: ${successfulExecutions.length}`, 25, yPosition);
        yPosition += 5;
        pdf.text(`Success Rate: ${successRate.toFixed(1)}%`, 25, yPosition);
        yPosition += 5;
        pdf.text(`Theoretical Rate: ${strategy.success_rate}%`, 25, yPosition);
        yPosition += 10;

        // Performance indicator
        const performance = successRate >= strategy.success_rate ? 'Above Expected' : 'Below Expected';
        const color = successRate >= strategy.success_rate ? this.COLORS.success : this.COLORS.warning;
        pdf.setTextColor(color);
        pdf.text(`Performance: ${performance}`, 25, yPosition);
        pdf.setTextColor(0, 0, 0); // Reset to black
        yPosition += 15;
      }

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating strategy report:', error);
      throw new Error('Failed to generate strategy report');
    }
  }

  // Private helper methods for PDF generation

  private static generateCoverPage(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    // Logo/Branding area
    pdf.setFillColor(this.COLORS.primary);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('CreditMaster Pro', 20, 25);
    
    pdf.setTextColor(0, 0, 0);
    yPosition = 60;

    // Report title
    pdf.setFontSize(28);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Credit Analysis Report', 20, yPosition);
    yPosition += 20;

    // User information
    pdf.setFontSize(14);
    pdf.setFont(this.FONTS.body, 'normal');
    pdf.text(`Prepared for: ${reportData.user.full_name || reportData.user.email}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Report Date: ${format(new Date(reportData.generatedAt), 'PPP')}`, 20, yPosition);
    yPosition += 30;

    // Key metrics summary
    pdf.setFontSize(16);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Report Summary', 20, yPosition);
    yPosition += 15;

    const metrics = this.calculateSummaryMetrics(reportData);
    pdf.setFontSize(12);
    pdf.setFont(this.FONTS.body, 'normal');
    
    Object.entries(metrics).forEach(([key, value]) => {
      pdf.text(`${key}: ${value}`, 25, yPosition);
      yPosition += 8;
    });

    return yPosition;
  }

  private static generateExecutiveSummary(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    pdf.setFontSize(18);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Executive Summary', 20, yPosition);
    yPosition += 15;

    const summary = this.generateSummaryText(reportData);
    pdf.setFontSize(11);
    pdf.setFont(this.FONTS.body, 'normal');
    
    const lines = pdf.splitTextToSize(summary, pageWidth - 40);
    lines.forEach((line: string) => {
      pdf.text(line, 20, yPosition);
      yPosition += 6;
    });

    return yPosition + 10;
  }

  private static generateCreditProfileOverview(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    pdf.setFontSize(16);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Credit Profile Overview', 20, yPosition);
    yPosition += 15;

    // Credit scores
    if (reportData.creditReports.length > 0) {
      const latestReport = reportData.creditReports[0];
      pdf.setFontSize(12);
      pdf.setFont(this.FONTS.body, 'bold');
      pdf.text('Current Credit Score', 20, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(24);
      pdf.setTextColor(this.getScoreColor(latestReport.credit_score || 0));
      pdf.text((latestReport.credit_score || 0).toString(), 25, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 15;
    }

    // Credit utilization
    const utilization = this.calculateUtilization(reportData.creditItems);
    pdf.setFontSize(12);
    pdf.setFont(this.FONTS.body, 'bold');
    pdf.text('Credit Utilization', 20, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(14);
    pdf.setTextColor(this.getUtilizationColor(utilization));
    pdf.text(`${utilization.toFixed(1)}%`, 25, yPosition);
    pdf.setTextColor(0, 0, 0);
    yPosition += 15;

    // Account summary
    pdf.setFontSize(12);
    pdf.setFont(this.FONTS.body, 'bold');
    pdf.text('Account Summary', 20, yPosition);
    yPosition += 10;

    const accountSummary = this.getAccountSummary(reportData.creditItems);
    pdf.setFontSize(10);
    pdf.setFont(this.FONTS.body, 'normal');
    
    Object.entries(accountSummary).forEach(([type, count]) => {
      pdf.text(`${type}: ${count}`, 25, yPosition);
      yPosition += 6;
    });

    return yPosition + 10;
  }

  private static generateCreditItemsAnalysis(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    pdf.setFontSize(16);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Credit Items Analysis', 20, yPosition);
    yPosition += 15;

    // Negative items
    const negativeItems = reportData.creditItems.filter(item => 
      ['collection', 'charge_off', 'late_payment', 'bankruptcy'].includes(item.item_type)
    );

    if (negativeItems.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont(this.FONTS.heading, 'bold');
      pdf.text('Negative Items Requiring Attention', 20, yPosition);
      yPosition += 10;

      negativeItems.slice(0, 10).forEach(item => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(10);
        pdf.setFont(this.FONTS.body, 'bold');
        pdf.text(`${item.creditor} - ${item.item_type}`, 25, yPosition);
        yPosition += 5;
        
        pdf.setFont(this.FONTS.body, 'normal');
        pdf.text(`Status: ${item.payment_status}`, 30, yPosition);
        yPosition += 4;
        if (item.balance) {
          pdf.text(`Balance: $${item.balance.toFixed(2)}`, 30, yPosition);
          yPosition += 4;
        }
        pdf.text(`Reported: ${item.first_reported_date}`, 30, yPosition);
        yPosition += 8;
      });
    }

    return yPosition + 10;
  }

  private static generateStrategyRecommendations(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    if (!reportData.analysisResult) return yPosition;

    pdf.setFontSize(16);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('AI Strategy Recommendations', 20, yPosition);
    yPosition += 15;

    // Top recommendations
    reportData.analysisResult.recommendations.slice(0, 5).forEach((rec, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont(this.FONTS.body, 'bold');
      pdf.text(`${index + 1}. ${rec.strategy.name}`, 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont(this.FONTS.body, 'normal');
      pdf.text(`Success Probability: ${(rec.successProbability * 100).toFixed(1)}%`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Impact Score: ${rec.impactScore.toFixed(1)}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Target Items: ${rec.targetItems.length}`, 25, yPosition);
      yPosition += 10;
    });

    return yPosition + 10;
  }

  private static generateDisputeHistory(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    pdf.setFontSize(16);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Dispute History', 20, yPosition);
    yPosition += 15;

    const recentDisputes = reportData.disputes
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    recentDisputes.forEach(dispute => {
      if (yPosition > 260) {
        pdf.addPage();
        yPosition = 20;
      }

      const creditItem = reportData.creditItems.find(item => item.id === dispute.item_id);
      
      pdf.setFontSize(11);
      pdf.setFont(this.FONTS.body, 'bold');
      pdf.text(`${creditItem?.creditor || 'Unknown'} - ${dispute.dispute_reason}`, 20, yPosition);
      yPosition += 6;

      pdf.setFontSize(9);
      pdf.setFont(this.FONTS.body, 'normal');
      pdf.text(`Status: ${dispute.execution_status}`, 25, yPosition);
      yPosition += 4;
      pdf.text(`Created: ${format(parseISO(dispute.created_at), 'MMM dd, yyyy')}`, 25, yPosition);
      yPosition += 4;
      
      if (dispute.success !== null) {
        const status = dispute.success ? 'Successful' : 'Unsuccessful';
        const color = dispute.success ? this.COLORS.success : this.COLORS.danger;
        pdf.setTextColor(color);
        pdf.text(`Result: ${status}`, 25, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 4;
      }
      
      yPosition += 6;
    });

    return yPosition + 10;
  }

  private static generateTimelineAnalysis(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    pdf.setFontSize(16);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Timeline Analysis', 20, yPosition);
    yPosition += 15;

    // Calculate timeline metrics
    const timelineData = this.calculateTimelineMetrics(reportData);
    
    pdf.setFontSize(12);
    pdf.setFont(this.FONTS.body, 'normal');
    
    Object.entries(timelineData).forEach(([period, data]) => {
      pdf.text(`${period}:`, 20, yPosition);
      yPosition += 6;
      pdf.text(`  Disputes Filed: ${data.disputes}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`  Items Resolved: ${data.resolved}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`  Score Change: ${data.scoreChange > 0 ? '+' : ''}${data.scoreChange}`, 25, yPosition);
      yPosition += 10;
    });

    return yPosition + 10;
  }

  private static generateActionPlan(
    pdf: jsPDF, 
    reportData: ReportData, 
    yPosition: number, 
    pageWidth: number
  ): number {
    pdf.setFontSize(16);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Recommended Action Plan', 20, yPosition);
    yPosition += 15;

    const actionPlan = this.generateActionPlanSteps(reportData);
    
    actionPlan.forEach((step, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont(this.FONTS.body, 'bold');
      pdf.text(`${index + 1}. ${step.title}`, 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont(this.FONTS.body, 'normal');
      const lines = pdf.splitTextToSize(step.description, pageWidth - 50);
      lines.forEach((line: string) => {
        pdf.text(line, 25, yPosition);
        yPosition += 5;
      });
      
      pdf.text(`Timeline: ${step.timeline}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Priority: ${step.priority}`, 25, yPosition);
      yPosition += 10;
    });

    return yPosition + 10;
  }

  private static generateLegalDisclaimers(
    pdf: jsPDF, 
    yPosition: number, 
    pageWidth: number
  ): void {
    pdf.setFontSize(14);
    pdf.setFont(this.FONTS.heading, 'bold');
    pdf.text('Legal Disclaimers', 20, yPosition);
    yPosition += 15;

    const disclaimers = [
      'This report is for informational purposes only and does not constitute legal advice.',
      'Credit repair results may vary and are not guaranteed.',
      'All strategies comply with the Fair Credit Reporting Act (FCRA) and Credit Repair Organizations Act (CROA).',
      'Consumers have the right to dispute inaccurate information on their credit reports.',
      'This service does not provide legal representation or advice.',
      'Results typically take 30-90 days to appear on credit reports.'
    ];

    pdf.setFontSize(9);
    pdf.setFont(this.FONTS.body, 'normal');
    
    disclaimers.forEach(disclaimer => {
      const lines = pdf.splitTextToSize(`• ${disclaimer}`, pageWidth - 40);
      lines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    });
  }

  private static addWatermark(pdf: jsPDF, watermarkText: string): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(50);
      pdf.text(watermarkText, 105, 150, { 
        angle: 45, 
        align: 'center' 
      });
    }
    
    pdf.setTextColor(0, 0, 0); // Reset color
  }

  private static addPageNumbers(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setFont(this.FONTS.body, 'normal');
      pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
  }

  // Helper methods for calculations and data processing

  private static calculateSummaryMetrics(reportData: ReportData): Record<string, string> {
    const totalItems = reportData.creditItems.length;
    const negativeItems = reportData.creditItems.filter(item => 
      ['collection', 'charge_off', 'late_payment'].includes(item.item_type)
    ).length;
    const totalDisputes = reportData.disputes.length;
    const successfulDisputes = reportData.disputes.filter(d => d.success === true).length;
    const successRate = totalDisputes > 0 ? ((successfulDisputes / totalDisputes) * 100).toFixed(1) : '0';

    return {
      'Total Credit Items': totalItems.toString(),
      'Negative Items': negativeItems.toString(),
      'Total Disputes': totalDisputes.toString(),
      'Successful Disputes': successfulDisputes.toString(),
      'Success Rate': `${successRate}%`
    };
  }

  private static generateSummaryText(reportData: ReportData): string {
    const metrics = this.calculateSummaryMetrics(reportData);
    
    return `This comprehensive credit analysis report provides a detailed overview of your credit profile and repair progress. 
    
Your credit file contains ${metrics['Total Credit Items']} total items, with ${metrics['Negative Items']} items requiring attention. 
Through our advanced dispute strategies, we have filed ${metrics['Total Disputes']} disputes with a success rate of ${metrics['Success Rate']}.

Our AI-powered analysis has identified specific opportunities for credit improvement and provides personalized recommendations 
based on your unique credit profile. The strategies outlined in this report are designed to maximize your credit score 
improvement while ensuring full compliance with federal credit laws.`;
  }

  private static calculateUtilization(creditItems: CreditItem[]): number {
    const creditCards = creditItems.filter(item => item.item_type === 'credit_card');
    const totalLimit = creditCards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
    const totalBalance = creditCards.reduce((sum, card) => sum + (card.balance || 0), 0);
    
    return totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  }

  private static getAccountSummary(creditItems: CreditItem[]): Record<string, number> {
    const summary: Record<string, number> = {};
    
    creditItems.forEach(item => {
      const type = item.item_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      summary[type] = (summary[type] || 0) + 1;
    });
    
    return summary;
  }

  private static getScoreColor(score: number): string {
    if (score >= 740) return this.COLORS.success;
    if (score >= 670) return this.COLORS.warning;
    return this.COLORS.danger;
  }

  private static getUtilizationColor(utilization: number): string {
    if (utilization <= 10) return this.COLORS.success;
    if (utilization <= 30) return this.COLORS.warning;
    return this.COLORS.danger;
  }

  private static calculateTimelineMetrics(reportData: ReportData): Record<string, any> {
    // This would calculate metrics over different time periods
    // For now, returning mock data structure
    return {
      'Last 30 Days': { disputes: 3, resolved: 1, scoreChange: 15 },
      'Last 60 Days': { disputes: 5, resolved: 3, scoreChange: 28 },
      'Last 90 Days': { disputes: 8, resolved: 5, scoreChange: 42 }
    };
  }

  private static generateActionPlanSteps(reportData: ReportData): Array<{
    title: string;
    description: string;
    timeline: string;
    priority: string;
  }> {
    return [
      {
        title: 'Address High-Impact Negative Items',
        description: 'Focus on removing collections, charge-offs, and late payments that have the most significant impact on your credit score.',
        timeline: '30-60 days',
        priority: 'High'
      },
      {
        title: 'Optimize Credit Utilization',
        description: 'Reduce credit card balances to below 10% of available limits to maximize score improvement.',
        timeline: '1-2 months',
        priority: 'High'
      },
      {
        title: 'Dispute Inaccurate Information',
        description: 'Challenge any inaccurate, outdated, or unverifiable information on your credit reports.',
        timeline: '30-90 days',
        priority: 'Medium'
      },
      {
        title: 'Monitor Progress and Follow Up',
        description: 'Regularly check credit reports for updates and follow up on pending disputes.',
        timeline: 'Ongoing',
        priority: 'Medium'
      }
    ];
  }

  private static async fetchMonthlyData(userId: string, month: string): Promise<any> {
    // This would fetch actual monthly data from the database
    // For now, returning a mock structure
    return {
      disputes: [],
      scoreChanges: [],
      newItems: [],
      resolvedItems: []
    };
  }

  private static generateMonthlySummary(pdf: jsPDF, data: any, yPosition: number, pageWidth: number): number {
    // Implementation for monthly summary generation
    return yPosition + 50;
  }

  private static generateMonthlyDisputeActivity(pdf: jsPDF, data: any, yPosition: number, pageWidth: number): number {
    // Implementation for monthly dispute activity
    return yPosition + 50;
  }

  private static generateMonthlyScoreChanges(pdf: jsPDF, data: any, yPosition: number, pageWidth: number): number {
    // Implementation for monthly score changes
    return yPosition + 50;
  }
}

export default DocumentGenerator;

