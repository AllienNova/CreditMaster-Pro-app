/**
 * Credit Bureau Service
 * 
 * Main service that orchestrates credit bureau integrations
 * Provides unified interface for all three major credit bureaus
 */

import { supabase } from '../supabase';
import { ExperianClient } from './experian-client';
import { EquifaxClient } from './equifax-client';
import { TransUnionClient } from './transunion-client';
import type {
  BureauCredentials,
  BureauResponse,
  CreditReport,
  CreditReportRequest,
  DisputeSubmission,
  UserPII,
  Bureau,
  CreditAnalysis,
  CreditUtilization,
  CreditAccount
} from './types';

export class CreditBureauService {
  private static experianClient: ExperianClient | null = null;
  private static equifaxClient: EquifaxClient | null = null;
  private static transunionClient: TransUnionClient | null = null;
  private static initialized = false;

  /**
   * Initialize the service with API credentials
   */
  static initialize(credentials: BureauCredentials): void {
    this.experianClient = new ExperianClient(
      credentials.experian.client_id,
      credentials.experian.client_secret,
      credentials.experian.sandbox
    );

    this.equifaxClient = new EquifaxClient(
      credentials.equifax.api_key,
      credentials.equifax.client_id,
      credentials.equifax.environment
    );

    this.transunionClient = new TransUnionClient(
      credentials.transunion.subscriber_id,
      credentials.transunion.api_key,
      credentials.transunion.environment
    );

    this.initialized = true;
    console.log('🏦 Credit Bureau Service initialized');
  }

  /**
   * Ensure service is initialized
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      // Auto-initialize with environment variables
      const credentials: BureauCredentials = {
        experian: {
          client_id: process.env.EXPERIAN_CLIENT_ID || '',
          client_secret: process.env.EXPERIAN_CLIENT_SECRET || '',
          sandbox: process.env.EXPERIAN_SANDBOX === 'true'
        },
        equifax: {
          api_key: process.env.EQUIFAX_API_KEY || '',
          client_id: process.env.EQUIFAX_CLIENT_ID || '',
          environment: (process.env.EQUIFAX_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
        },
        transunion: {
          subscriber_id: process.env.TRANSUNION_SUBSCRIBER_ID || '',
          api_key: process.env.TRANSUNION_API_KEY || '',
          environment: (process.env.TRANSUNION_ENVIRONMENT as 'test' | 'production') || 'test'
        }
      };
      this.initialize(credentials);
    }
  }

  /**
   * Get credit report from a specific bureau
   */
  static async getCreditReport(
    userId: string,
    bureau: Bureau,
    reportType: 'full' | 'monitoring' | 'score_only' = 'full'
  ): Promise<BureauResponse<CreditReport>> {
    this.ensureInitialized();

    try {
      const userPII = await this.getUserPII(userId);
      
      const request: CreditReportRequest = {
        user_id: userId,
        bureau,
        report_type: reportType,
        consumer_consent: true,
        permissible_purpose: 'ACCOUNT_REVIEW'
      };

      let response: BureauResponse<CreditReport>;

      switch (bureau) {
        case 'experian':
          if (!this.experianClient) throw new Error('Experian client not initialized');
          response = await this.experianClient.getCreditReport(request, userPII);
          break;
        case 'equifax':
          if (!this.equifaxClient) throw new Error('Equifax client not initialized');
          response = await this.equifaxClient.getCreditReport(request, userPII);
          break;
        case 'transunion':
          if (!this.transunionClient) throw new Error('TransUnion client not initialized');
          response = await this.transunionClient.getCreditReport(request, userPII);
          break;
        default:
          throw new Error(`Unknown bureau: ${bureau}`);
      }

      // Save to database if successful
      if (response.success && response.data) {
        await this.saveCreditReport(response.data);
      }

      return response;

    } catch (error) {
      console.error(`❌ Error getting ${bureau} credit report:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        bureau,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get credit reports from all three bureaus
   */
  static async getAllCreditReports(userId: string): Promise<{
    experian?: BureauResponse<CreditReport>;
    equifax?: BureauResponse<CreditReport>;
    transunion?: BureauResponse<CreditReport>;
  }> {
    console.log('🏦 Retrieving credit reports from all bureaus...');

    // Execute all requests in parallel
    const [experianResult, equifaxResult, transunionResult] = await Promise.allSettled([
      this.getCreditReport(userId, 'experian'),
      this.getCreditReport(userId, 'equifax'),
      this.getCreditReport(userId, 'transunion')
    ]);

    const results: Partial<Record<Bureau, BureauResponse<CreditReport>>> = {};

    if (experianResult.status === 'fulfilled') {
      results.experian = experianResult.value;
    }
    if (equifaxResult.status === 'fulfilled') {
      results.equifax = equifaxResult.value;
    }
    if (transunionResult.status === 'fulfilled') {
      results.transunion = transunionResult.value;
    }

    console.log('✅ Multi-bureau credit report retrieval completed');
    return results;
  }

  /**
   * Submit dispute to a specific bureau
   */
  static async submitDispute(
    userId: string,
    dispute: DisputeSubmission
  ): Promise<BureauResponse> {
    this.ensureInitialized();

    try {
      const userPII = await this.getUserPII(userId);

      let response: BureauResponse;

      switch (dispute.bureau) {
        case 'experian':
          if (!this.experianClient) throw new Error('Experian client not initialized');
          response = await this.experianClient.submitDispute(dispute, userPII);
          break;
        case 'equifax':
          if (!this.equifaxClient) throw new Error('Equifax client not initialized');
          response = await this.equifaxClient.submitDispute(dispute, userPII);
          break;
        case 'transunion':
          if (!this.transunionClient) throw new Error('TransUnion client not initialized');
          response = await this.transunionClient.submitDispute(dispute, userPII);
          break;
        default:
          throw new Error(`Unknown bureau: ${dispute.bureau}`);
      }

      // Save dispute record if successful
      if (response.success) {
        await this.saveDisputeRecord({
          user_id: userId,
          bureau: dispute.bureau,
          credit_item_id: dispute.credit_item_id,
          dispute_reason: dispute.dispute_reason,
          status: 'submitted',
          reference_id: response.reference_id,
          created_at: new Date().toISOString()
        });
      }

      return response;

    } catch (error) {
      console.error(`❌ Error submitting dispute to ${dispute.bureau}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        bureau: dispute.bureau,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze credit report and provide recommendations
   */
  static async analyzeCreditReport(creditReport: CreditReport): Promise<CreditAnalysis> {
    const accounts = creditReport.accounts || [];
    const inquiries = creditReport.inquiries || [];
    const publicRecords = creditReport.public_records || [];

    // Calculate credit utilization
    const utilization = this.calculateCreditUtilization(accounts);

    // Identify negative items
    const negativeItems = [];

    // Late payments
    const lateAccounts = accounts.filter(acc => acc.payment_status === 'late');
    if (lateAccounts.length > 0) {
      negativeItems.push({
        type: 'late_payments',
        description: `${lateAccounts.length} account(s) with late payments`,
        impact: 'high' as const,
        recommendation: 'Bring all accounts current and set up automatic payments'
      });
    }

    // High utilization
    if (utilization.utilization_percentage > 30) {
      negativeItems.push({
        type: 'high_utilization',
        description: `Credit utilization at ${utilization.utilization_percentage.toFixed(1)}%`,
        impact: 'high' as const,
        recommendation: 'Pay down balances to below 30% utilization'
      });
    }

    // Public records
    if (publicRecords.length > 0) {
      negativeItems.push({
        type: 'public_records',
        description: `${publicRecords.length} public record(s) on file`,
        impact: 'high' as const,
        recommendation: 'Resolve public records and consider dispute if inaccurate'
      });
    }

    // Hard inquiries
    const recentInquiries = inquiries.filter(inq => {
      const inquiryDate = new Date(inq.inquiry_date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return inquiryDate > sixMonthsAgo && inq.inquiry_type === 'hard';
    });

    if (recentInquiries.length > 3) {
      negativeItems.push({
        type: 'too_many_inquiries',
        description: `${recentInquiries.length} hard inquiries in last 6 months`,
        impact: 'medium' as const,
        recommendation: 'Avoid applying for new credit for 6-12 months'
      });
    }

    // Positive factors
    const positiveFactors = [];
    if (utilization.utilization_percentage < 30) {
      positiveFactors.push('Low credit utilization');
    }
    if (accounts.filter(acc => acc.payment_status === 'current').length > 0) {
      positiveFactors.push('Accounts in good standing');
    }

    return {
      credit_score: creditReport.credit_score,
      score_factors: this.getScoreFactors(creditReport.credit_score),
      utilization,
      negative_items: negativeItems,
      positive_factors: positiveFactors,
      recommendations: this.generateRecommendations(negativeItems)
    };
  }

  /**
   * Calculate credit utilization
   */
  private static calculateCreditUtilization(accounts: CreditAccount[]): CreditUtilization {
    const creditAccounts = accounts.filter(
      (acc): acc is CreditAccount & { credit_limit: number } =>
        typeof acc.credit_limit === 'number' && acc.credit_limit > 0
    );

    const totalLimit = creditAccounts.reduce((sum, acc) => sum + (acc.credit_limit || 0), 0);
    const totalBalance = creditAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    return {
      total_credit_limit: totalLimit,
      total_balance: totalBalance,
      utilization_percentage: totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0,
      by_account: creditAccounts.map(acc => ({
        account_id: acc.id,
        creditor_name: acc.creditor_name,
        credit_limit: acc.credit_limit,
        balance: acc.balance,
        utilization: acc.credit_limit > 0 ? (acc.balance / acc.credit_limit) * 100 : 0
      }))
    };
  }

  private static getScoreFactors(score: number): string[] {
    if (score >= 800) return ['Exceptional credit history', 'Very low risk'];
    if (score >= 740) return ['Very good credit history', 'Low risk'];
    if (score >= 670) return ['Good credit history', 'Average risk'];
    if (score >= 580) return ['Fair credit history', 'Higher risk'];
    return ['Poor credit history', 'High risk'];
  }

  private static generateRecommendations(
    negativeItems: CreditAnalysis['negative_items']
  ): string[] {
    return negativeItems.map(item => item.recommendation);
  }

  /**
   * Get user PII from database
   */
  private static async getUserPII(userId: string): Promise<UserPII> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error('User profile not found');
    }

    return {
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      ssn: profile.ssn || '',
      dateOfBirth: profile.date_of_birth || '',
      addresses: [{
        streetAddress: profile.address_line1 || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zip_code || ''
      }]
    };
  }

  /**
   * Save credit report to database
   */
  private static async saveCreditReport(report: CreditReport): Promise<void> {
    const { error } = await supabase
      .from('credit_reports')
      .insert(report);

    if (error) {
      console.error('❌ Error saving credit report:', error);
      throw error;
    }
  }

  /**
   * Save dispute record to database
   */
  private static async saveDisputeRecord(dispute: BureauDisputeRecord): Promise<void> {
    const { error } = await supabase
      .from('bureau_disputes')
      .insert(dispute);

    if (error) {
      console.error('❌ Error saving dispute record:', error);
      throw error;
    }
  }
}

export default CreditBureauService;

interface BureauDisputeRecord {
  user_id: string;
  bureau: Bureau;
  credit_item_id: string;
  dispute_reason: string;
  status: 'submitted' | 'processing' | 'resolved' | 'rejected';
  reference_id?: string;
  created_at: string;
}
