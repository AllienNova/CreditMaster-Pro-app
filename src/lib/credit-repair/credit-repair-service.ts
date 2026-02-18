/**
 * Credit Repair Service
 * 
 * Core business logic for credit repair system
 * Focuses on PROVEN strategies that actually work
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();
import { CreditBureauService } from '@/lib/credit-bureau';
import type {
  CreditRepairScore,
  ScoreFactor,
  Opportunity,
  QuickWin,
  OpportunityType,
  CreditRepairProgress,
  Milestone,
} from './types';
import type {
  Bureau as CreditBureau,
  BureauResponse,
  CreditReport as BureauCreditReport,
  CreditAccount,
  CreditInquiry,
} from '@/lib/credit-bureau/types';

type BureauReportResults = Partial<Record<CreditBureau, BureauResponse<BureauCreditReport>>>;
const CREDIT_BUREAUS: CreditBureau[] = ['experian', 'equifax', 'transunion'];

/**
 * Credit Repair Service Class
 */
class CreditRepairService {
  /**
   * Get Credit Repair Score (0-100)
   * Based on opportunities for improvement, not current credit score
   */
  async getCreditRepairScore(userId: string): Promise<CreditRepairScore> {
    try {
      // Get credit reports from all bureaus
      const reports = await CreditBureauService.getAllCreditReports(userId);
      
      // Calculate score factors
      const factors: ScoreFactor[] = [];
      
      // 1. Dispute Opportunities (40% weight)
      const disputeScore = await this.calculateDisputeScore(reports);
      factors.push({
        category: 'disputes',
        weight: 40,
        currentScore: disputeScore.score,
        maxScore: 100,
        impact: disputeScore.impact,
      });
      
      // 2. Utilization Optimization (30% weight)
      const utilizationScore = await this.calculateUtilizationScore(reports);
      factors.push({
        category: 'utilization',
        weight: 30,
        currentScore: utilizationScore.score,
        maxScore: 100,
        impact: utilizationScore.impact,
      });
      
      // 3. Negotiation Opportunities (20% weight)
      const negotiationScore = await this.calculateNegotiationScore(reports);
      factors.push({
        category: 'negotiations',
        weight: 20,
        currentScore: negotiationScore.score,
        maxScore: 100,
        impact: negotiationScore.impact,
      });
      
      // 4. Building Opportunities (10% weight)
      const buildingScore = await this.calculateBuildingScore(reports);
      factors.push({
        category: 'building',
        weight: 10,
        currentScore: buildingScore.score,
        maxScore: 100,
        impact: buildingScore.impact,
      });
      
      // Calculate overall score (weighted average)
      const overallScore = factors.reduce((sum, factor) => {
        return sum + (factor.currentScore * factor.weight / 100);
      }, 0);
      
      // Calculate total estimated impact
      const estimatedImpact = factors.reduce((sum, factor) => sum + factor.impact, 0);
      
      // Get opportunities
      const opportunities = await this.getOpportunities(userId, reports);
      
      // Calculate timeline (based on highest priority opportunities)
      const timeline = this.calculateTimeline(opportunities);
      
      return {
        score: Math.round(overallScore),
        factors,
        opportunities,
        estimatedImpact: Math.round(estimatedImpact),
        timeline,
      };
    } catch (_error) {
      // CreditRepairService error: Error calculating credit repair score
      throw _error;
    }
  }

  /**
   * Get Quick Wins (30-day actions)
   */
  async getQuickWins(userId: string): Promise<QuickWin[]> {
    const quickWins: QuickWin[] = [];
    
    try {
      const reports = await CreditBureauService.getAllCreditReports(userId);
      
      // 1. Pay down high utilization (FASTEST)
      const highUtilizationCards = this.findHighUtilizationCards(reports);
      if (highUtilizationCards.length > 0) {
        quickWins.push({
          id: 'pay_down_utilization',
          title: 'Pay Down High Utilization Cards',
          description: `You have ${highUtilizationCards.length} cards with high utilization. Paying them down can increase your score by 20-50 points in 30 days.`,
          impact: 35,
          timeline: '30 days',
          difficulty: 'easy',
          cost: 0,
          steps: [
            'Identify cards with >30% utilization',
            'Pay down to <10% utilization',
            'Pay BEFORE statement closing date',
            'Wait for next statement to report',
          ],
          successRate: 95,
        });
      }
      
      // 2. Remove unauthorized inquiries
      const unauthorizedInquiries = this.findUnauthorizedInquiries(reports);
      if (unauthorizedInquiries.length > 0) {
        quickWins.push({
          id: 'remove_inquiries',
          title: 'Remove Unauthorized Hard Inquiries',
          description: `You have ${unauthorizedInquiries.length} hard inquiries that may be unauthorized. Removing them can increase your score by 5-10 points each.`,
          impact: unauthorizedInquiries.length * 7,
          timeline: '30-45 days',
          difficulty: 'easy',
          cost: 0,
          steps: [
            'Identify inquiries you didn\'t authorize',
            'Send dispute letters to bureaus',
            'Wait 30 days for investigation',
            'Follow up if needed',
          ],
          successRate: 50,
        });
      }
      
      // 3. Dispute obvious inaccuracies
      const obviousErrors = this.findObviousErrors(reports);
      if (obviousErrors.length > 0) {
        quickWins.push({
          id: 'dispute_errors',
          title: 'Dispute Obvious Errors',
          description: `You have ${obviousErrors.length} obvious errors on your credit report. Removing them can increase your score by 10-30 points each.`,
          impact: obviousErrors.length * 20,
          timeline: '30-45 days',
          difficulty: 'easy',
          cost: 0,
          steps: [
            'Identify obvious errors (wrong balance, not yours, etc.)',
            'Generate dispute letters with AI',
            'Send certified mail to bureaus',
            'Wait 30 days for investigation',
          ],
          successRate: 70,
        });
      }
      
      // 4. Optimize payment timing
      quickWins.push({
        id: 'optimize_payment_timing',
        title: 'Optimize Payment Timing',
        description: 'Pay your credit cards BEFORE the statement closing date (not the due date) to lower reported utilization.',
        impact: 15,
        timeline: '30 days',
        difficulty: 'easy',
        cost: 0,
        steps: [
          'Find statement closing dates for all cards',
          'Pay balances 3-5 days before closing',
          'Set up reminders or autopay',
          'Wait for next statement to report',
        ],
        successRate: 100,
      });
      
      // Sort by impact (highest first)
      quickWins.sort((a, b) => b.impact - a.impact);
      
      return quickWins;
    } catch (_error) {
      // CreditRepairService error: Error getting quick wins
      void _error;
      return quickWins;
    }
  }

  /**
   * Get all opportunities for improvement
   */
  async getOpportunities(userId: string, reports?: BureauReportResults): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];
    
    try {
      const bureauReports: BureauReportResults = reports || await CreditBureauService.getAllCreditReports(userId);
      
      // 1. Dispute opportunities
      const disputeOpps = await this.getDisputeOpportunities(bureauReports);
      opportunities.push(...disputeOpps);
      
      // 2. Utilization opportunities
      const utilizationOpps = await this.getUtilizationOpportunities(bureauReports);
      opportunities.push(...utilizationOpps);
      
      // 3. Goodwill opportunities
      const goodwillOpps = await this.getGoodwillOpportunities(bureauReports);
      opportunities.push(...goodwillOpps);
      
      // 4. Pay-for-delete opportunities
      const payForDeleteOpps = await this.getPayForDeleteOpportunities(bureauReports);
      opportunities.push(...payForDeleteOpps);
      
      // 5. Inquiry removal opportunities
      const inquiryOpps = await this.getInquiryOpportunities(bureauReports);
      opportunities.push(...inquiryOpps);
      
      // 6. Payment timing opportunities
      const paymentOpps = await this.getPaymentTimingOpportunities(bureauReports);
      opportunities.push(...paymentOpps);
      
      // Sort by priority and impact
      opportunities.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority];
        const bPriority = priorityWeight[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.impact - a.impact;
      });
      
      return opportunities;
    } catch (_error) {
      // CreditRepairService error: Error getting opportunities
      void _error;
      return opportunities;
    }
  }

  /**
   * Calculate impact of an action
   */
  async calculateImpact(
    action: OpportunityType,
    userId: string,
    data?: unknown
  ): Promise<number> {
    try {
      const reports = await CreditBureauService.getAllCreditReports(userId);
      
      switch (action) {
        case 'dispute_inaccuracy':
          return this.calculateDisputeImpact(data, reports);
        
        case 'pay_down_utilization':
          return this.calculateUtilizationImpact(data, reports);
        
        case 'goodwill_letter':
          return this.calculateGoodwillImpact(data, reports);
        
        case 'pay_for_delete':
          return this.calculatePayForDeleteImpact(data, reports);
        
        case 'remove_inquiry':
          return 7; // Average 5-10 points per inquiry
        
        case 'optimize_payment_timing':
          return 15; // Average 10-20 points
        
        case 'piggybacking':
          return 55; // Average 30-80 points
        
        case 'credit_builder_loan':
          return 40; // Average 30-50 points (slow)
        
        case 'secured_card':
          return 35; // Average 20-50 points (slow)
        
        default:
          return 0;
      }
    } catch (_error) {
      // CreditRepairService error: Error calculating impact
      void _error;
      return 0;
    }
  }

  /**
   * Get credit repair progress
   */
  async getProgress(userId: string): Promise<CreditRepairProgress | null> {
    try {
      // Get starting score (first recorded score)
      const { data: firstScore } = await supabase
        .from('credit_scores')
        .select('*')
        .eq('user_id', userId)
        .order('score_date', { ascending: true })
        .limit(1)
        .single();
      
      if (!firstScore) {
        return null;
      }
      
      // Get current score (latest score)
      const { data: currentScore } = await supabase
        .from('credit_scores')
        .select('*')
        .eq('user_id', userId)
        .order('score_date', { ascending: false })
        .limit(1)
        .single();
      
      if (!currentScore) {
        return null;
      }
      
      // Get all completed actions
      const { data: actions } = await supabase
        .from('credit_repair_actions')
        .select('*')
        .eq('user_id', userId);
      
      const completedActions = actions?.filter(a => a.completed) || [];
      const totalActions = actions?.length || 0;
      
      // Calculate milestones
      const milestones: Milestone[] = completedActions.map(action => ({
        date: new Date(action.completed_at),
        score: action.score_after || currentScore.score,
        action: action.action_type,
        impact: action.impact_score || 0,
      }));
      
      // Calculate days elapsed
      const startDate = new Date(firstScore.score_date);
      const now = new Date();
      const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Estimate days remaining (based on target score)
      const targetScore = 700; // Default target
      const scoreIncrease = currentScore.score - firstScore.score;
      const remainingPoints = targetScore - currentScore.score;
      const pointsPerDay = daysElapsed > 0 ? scoreIncrease / daysElapsed : 0;
      const estimatedDaysRemaining = pointsPerDay > 0 ? Math.ceil(remainingPoints / pointsPerDay) : 90;
      
      return {
        userId,
        startDate,
        startingScore: firstScore.score,
        currentScore: currentScore.score,
        targetScore,
        scoreIncrease,
        daysElapsed,
        estimatedDaysRemaining: Math.max(0, estimatedDaysRemaining),
        completedActions: completedActions.length,
        totalActions,
        milestones,
      };
    } catch (_error) {
      // CreditRepairService error: Error getting progress
      void _error;
      return null;
    }
  }

  // Private helper methods

  private async calculateDisputeScore(
    reports: BureauReportResults
  ): Promise<{ score: number; impact: number }> {
    let disputableItems = 0;
    let estimatedImpact = 0;

    for (const bureau of CREDIT_BUREAUS) {
      const report = this.getReport(reports, bureau);
      if (!report?.accounts) continue;

      const negativeItems = report.accounts.filter((account) =>
        account.payment_status === 'late' ||
        account.payment_status === 'collection' ||
        account.payment_status === 'charged_off'
      );

      disputableItems += negativeItems.length;
      estimatedImpact += negativeItems.length * 20;
    }

    const score = Math.max(0, 100 - disputableItems * 10);

    return { score, impact: Math.min(150, estimatedImpact) };
  }

  private async calculateUtilizationScore(
    reports: BureauReportResults
  ): Promise<{ score: number; impact: number }> {
    let totalLimit = 0;
    let totalBalance = 0;

    for (const bureau of CREDIT_BUREAUS) {
      const report = this.getReport(reports, bureau);
      if (!report?.accounts) continue;

      const revolvingAccounts = report.accounts.filter(
        (account) => (account.credit_limit ?? 0) > 0
      );

      for (const account of revolvingAccounts) {
        totalLimit += account.credit_limit ?? 0;
        totalBalance += account.balance ?? 0;
      }
    }

    if (totalLimit === 0) {
      return { score: 100, impact: 0 };
    }

    const utilization = (totalBalance / totalLimit) * 100;
    const score = Math.max(0, 100 - utilization);

    const targetUtilization = 10;
    const utilizationReduction = Math.max(0, utilization - targetUtilization);
    const impact = Math.round((utilizationReduction / 10) * 35);

    return { score, impact: Math.min(50, impact) };
  }

  private async calculateNegotiationScore(
    reports: BureauReportResults
  ): Promise<{ score: number; impact: number }> {
    let latePayments = 0;
    let collections = 0;

    for (const bureau of CREDIT_BUREAUS) {
      const report = this.getReport(reports, bureau);
      if (!report?.accounts) continue;

      report.accounts.forEach((account) => {
        if (account.payment_status === 'late') {
          latePayments += 1;
        }
        if (account.payment_status === 'collection' || account.payment_status === 'charged_off') {
          collections += 1;
        }
      });
    }

    const totalNegotiable = latePayments + collections;
    const score = Math.max(0, 100 - totalNegotiable * 15);
    const impact = (latePayments * 20) + (collections * 75);

    return { score, impact: Math.min(100, impact) };
  }

  private async calculateBuildingScore(
    reports: BureauReportResults
  ): Promise<{ score: number; impact: number }> {
    let accountCount = 0;
    let oldestAccountAge = 0;

    for (const bureau of CREDIT_BUREAUS) {
      const report = this.getReport(reports, bureau);
      if (!report?.accounts?.length) continue;

      accountCount = Math.max(accountCount, report.accounts.length);

      const oldestAccount = report.accounts.reduce<CreditAccount | null>((oldest, account) => {
        if (!oldest) return account;
        return new Date(account.opened_date) < new Date(oldest.opened_date) ? account : oldest;
      }, null);

      if (oldestAccount) {
        const openedDate = new Date(oldestAccount.opened_date);
        const now = new Date();
        const age = (now.getFullYear() - openedDate.getFullYear()) * 12 +
          (now.getMonth() - openedDate.getMonth());
        oldestAccountAge = Math.max(oldestAccountAge, age);
      }
    }

    let score = 50;
    if (accountCount >= 5) score += 25;
    if (oldestAccountAge >= 5) score += 25;

    const impact = accountCount < 3 ? 50 : 30;

    return { score, impact };
  }

  private calculateTimeline(opportunities: Opportunity[]): string {
    if (opportunities.length === 0) return '0 days';

    // Get highest priority opportunities
    const highPriority = opportunities.filter(o => o.priority === 'high');

    if (highPriority.length === 0) return '90 days';

    // Most high priority items take 30-90 days
    return '30-90 days';
  }

  private findHighUtilizationCards(reports: BureauReportResults): CreditAccount[] {
    const highUtilCards: CreditAccount[] = [];

    for (const bureau of CREDIT_BUREAUS) {
      const report = this.getReport(reports, bureau);
      if (!report?.accounts) continue;

      report.accounts.forEach((account) => {
        const limit = account.credit_limit ?? 0;
        if (limit === 0) {
          return;
        }
        const balance = account.balance ?? 0;
        const utilization = (balance / limit) * 100;
        if (utilization > 30) {
          highUtilCards.push(account);
        }
      });
    }

    return highUtilCards;
  }

  private findUnauthorizedInquiries(reports: BureauReportResults): CreditInquiry[] {
    const inquiries: CreditInquiry[] = [];

    for (const bureau of CREDIT_BUREAUS) {
      const report = this.getReport(reports, bureau);
      if (!report?.inquiries) continue;
      inquiries.push(...report.inquiries);
    }

    return inquiries;
  }

  private findObviousErrors(reports: BureauReportResults): CreditAccount[] {
    const errors: CreditAccount[] = [];

    for (const bureau of CREDIT_BUREAUS) {
      const report = this.getReport(reports, bureau);
      if (!report?.accounts) continue;

      const errorAccounts = report.accounts.filter(() => {
        // Placeholder for actual validation logic
        return false;
      });

      errors.push(...errorAccounts);
    }

    return errors;
  }

  private async getDisputeOpportunities(reports: BureauReportResults): Promise<Opportunity[]> {
    void reports;
    // Placeholder - would scan for disputable items
    return [];
  }

  private async getUtilizationOpportunities(reports: BureauReportResults): Promise<Opportunity[]> {
    void reports;
    // Placeholder - would find high utilization cards
    return [];
  }

  private async getGoodwillOpportunities(reports: BureauReportResults): Promise<Opportunity[]> {
    void reports;
    // Placeholder - would find late payments eligible for goodwill
    return [];
  }

  private async getPayForDeleteOpportunities(reports: BureauReportResults): Promise<Opportunity[]> {
    void reports;
    // Placeholder - would find collections eligible for pay-for-delete
    return [];
  }

  private async getInquiryOpportunities(reports: BureauReportResults): Promise<Opportunity[]> {
    void reports;
    // Placeholder - would find unauthorized inquiries
    return [];
  }

  private async getPaymentTimingOpportunities(reports: BureauReportResults): Promise<Opportunity[]> {
    void reports;
    // Placeholder - would analyze payment timing
    return [];
  }

  private calculateDisputeImpact(data: unknown, reports: BureauReportResults): number {
    void data;
    void reports;
    return 20; // Average 10-30 points per disputed item
  }

  private calculateUtilizationImpact(data: unknown, reports: BureauReportResults): number {
    void data;
    void reports;
    return 35; // Average 20-50 points
  }

  private calculateGoodwillImpact(data: unknown, reports: BureauReportResults): number {
    void data;
    void reports;
    return 20; // Average 10-30 points per late payment
  }

  private calculatePayForDeleteImpact(data: unknown, reports: BureauReportResults): number {
    void data;
    void reports;
    return 75; // Average 50-100 points per collection
  }

  private getReport(
    reports: BureauReportResults,
    bureau: CreditBureau
  ): BureauCreditReport | null {
    const response = reports[bureau];
    if (response?.success && response.data) {
      return response.data;
    }
    return null;
  }
}

// Export singleton instance
export const creditRepairService = new CreditRepairService();
export default creditRepairService;
