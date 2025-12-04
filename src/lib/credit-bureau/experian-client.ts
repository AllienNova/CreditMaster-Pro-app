/**
 * Experian API Client
 * 
 * Integration with Experian Connect API for credit reports and disputes
 */

import type { 
  BureauResponse, 
  CreditReport, 
  CreditReportRequest, 
  DisputeSubmission,
  UserPII,
  CreditAccount,
  CreditInquiry,
  PublicRecord
} from './types';

export class ExperianClient {
  private clientId: string;
  private clientSecret: string;
  private sandbox: boolean;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId: string, clientSecret: string, sandbox: boolean = true) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.sandbox = sandbox;
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const endpoint = this.sandbox
        ? 'https://sandbox-us-api.experian.com/oauth2/v1/token'
        : 'https://us-api.experian.com/oauth2/v1/token';

      const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
          'Grant_type': 'client_credentials'
        }
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);

      if (!this.accessToken) {
        throw new Error('No access token received from Experian');
      }

      return this.accessToken;

    } catch (error) {
      console.error('❌ Experian token error:', error);
      throw new Error('Failed to obtain Experian access token');
    }
  }

  /**
   * Retrieve credit report from Experian
   */
  async getCreditReport(
    request: CreditReportRequest,
    userPII: UserPII
  ): Promise<BureauResponse<CreditReport>> {
    try {
      console.log('📊 Retrieving Experian credit report...');

      const endpoint = this.sandbox 
        ? 'https://sandbox-us-api.experian.com/consumerservices/credit-profile/v2/credit-report'
        : 'https://us-api.experian.com/consumerservices/credit-profile/v2/credit-report';

      const token = await this.getAccessToken();

      const payload = {
        consumerPii: {
          primaryApplicant: {
            name: {
              firstName: userPII.firstName,
              lastName: userPII.lastName
            },
            ssn: userPII.ssn,
            dob: {
              dob: userPII.dateOfBirth
            },
            currentAddress: userPII.addresses[0] ? {
              line1: userPII.addresses[0].streetAddress,
              city: userPII.addresses[0].city,
              state: userPII.addresses[0].state,
              zipCode: userPII.addresses[0].zipCode
            } : undefined
          }
        },
        requestor: {
          subscriberCode: this.clientId,
          permissiblePurpose: request.permissible_purpose || 'ACCOUNT_REVIEW'
        },
        addOns: {
          directCheck: 'Y',
          demographics: 'Y',
          riskModels: 'Y'
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Experian API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Transform Experian response to our format
      const creditReport = this.transformResponse(data, request.user_id);

      console.log('✅ Experian report retrieved successfully');
      
      return {
        success: true,
        data: creditReport,
        bureau: 'experian',
        timestamp: new Date().toISOString(),
        reference_id: data.requestId
      };

    } catch (error) {
      console.error('❌ Experian API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        bureau: 'experian',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Submit dispute to Experian
   */
  async submitDispute(
    dispute: DisputeSubmission,
    userPII: UserPII
  ): Promise<BureauResponse> {
    try {
      console.log('📝 Submitting dispute to Experian...');

      const endpoint = this.sandbox
        ? 'https://sandbox-us-api.experian.com/consumerservices/dispute/v1/submit'
        : 'https://us-api.experian.com/consumerservices/dispute/v1/submit';

      const token = await this.getAccessToken();

      const payload = {
        consumerPii: {
          name: {
            firstName: userPII.firstName,
            lastName: userPII.lastName
          },
          ssn: userPII.ssn,
          dob: userPII.dateOfBirth
        },
        dispute: {
          itemId: dispute.credit_item_id,
          reason: dispute.dispute_reason,
          statement: dispute.consumer_statement,
          documents: dispute.supporting_documents || []
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Experian dispute submission failed: ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ Experian dispute submitted successfully');

      return {
        success: true,
        data: data,
        bureau: 'experian',
        timestamp: new Date().toISOString(),
        reference_id: data.disputeId
      };

    } catch (error) {
      console.error('❌ Experian dispute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        bureau: 'experian',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Transform Experian response to our standard format
   */
  private transformResponse(data: ExperianCreditReportResponse, userId: string): CreditReport {
    return {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      bureau: 'experian',
      credit_score: data.riskModel?.score || data.creditScore?.score || 0,
      report_date: new Date().toISOString(),
      accounts: this.parseAccounts(data.tradelines || []),
      inquiries: this.parseInquiries(data.inquiries || []),
      public_records: this.parsePublicRecords(data.publicRecords || []),
      raw_data: data,
      created_at: new Date().toISOString()
    };
  }

  private parseAccounts(tradelines: ExperianTradeline[]): CreditAccount[] {
    return tradelines.map((tradeline) => ({
      id: tradeline.accountNumber || `acc_${Math.random().toString(36).substr(2, 9)}`,
      account_number: tradeline.accountNumber || `acc_${Math.random().toString(36).substr(2, 9)}`,
      account_type: this.mapAccountType(tradeline.accountType ?? ''),
      creditor_name: tradeline.creditorName || tradeline.subscriberName || 'Unknown Creditor',
      balance: tradeline.balance || 0,
      credit_limit: tradeline.creditLimit || 0,
      payment_status: this.mapPaymentStatus(tradeline.paymentStatus ?? ''),
      opened_date: tradeline.dateOpened || new Date().toISOString(),
      last_payment_date: tradeline.lastPaymentDate || undefined,
      payment_history: []
    }));
  }

  private parseInquiries(inquiries: ExperianInquiryPayload[]): CreditInquiry[] {
    return inquiries.map((inquiry) => ({
      id: `inq_${Math.random().toString(36).substr(2, 9)}`,
      inquiry_date: inquiry.inquiryDate || new Date().toISOString(),
      creditor_name: inquiry.subscriberName || 'Unknown Creditor',
      inquiry_type: inquiry.inquiryType === 'hard' ? 'hard' : 'soft'
    }));
  }

  private parsePublicRecords(records: ExperianPublicRecordPayload[]): PublicRecord[] {
    return records.map((record) => ({
      id: `pr_${Math.random().toString(36).substr(2, 9)}`,
      record_type: this.mapRecordType(record.recordType),
      filing_date: record.filingDate || new Date().toISOString(),
      status: this.mapRecordStatus(record.status),
      amount: record.amount,
      court_name: record.courtName
    }));
  }

  private mapAccountType(type: string): CreditAccount['account_type'] {
    const mapping: Record<string, CreditAccount['account_type']> = {
      'R': 'credit_card',
      'I': 'mortgage',
      'M': 'mortgage',
      'O': 'auto_loan',
      'C': 'credit_card'
    };
    return mapping[type] || 'other';
  }

  private mapPaymentStatus(status: string): CreditAccount['payment_status'] {
    if (!status || status === 'C' || status === '0') return 'current';
    if (status === 'L' || status === '1') return 'late';
    if (status === 'CO') return 'charged_off';
    if (status === 'CLS') return 'closed';
    return 'current';
  }

  private mapRecordType(type?: string): PublicRecord['record_type'] {
    const mapping: Record<string, PublicRecord['record_type']> = {
      'BK': 'bankruptcy',
      'TL': 'tax_lien',
      'JD': 'judgment',
      'FC': 'foreclosure'
    };
    return type && mapping[type] ? mapping[type] : 'judgment';
  }

  private mapRecordStatus(status?: string): PublicRecord['status'] {
    const normalized = status?.toUpperCase();
    switch (normalized) {
      case 'DISCHARGED':
        return 'discharged';
      case 'SATISFIED':
        return 'satisfied';
      case 'DISMISSED':
        return 'dismissed';
      default:
        return 'filed';
    }
  }
}

interface ExperianScore {
  score?: number;
}

interface ExperianTradeline {
  accountNumber?: string;
  accountType?: string;
  creditorName?: string;
  subscriberName?: string;
  balance?: number;
  creditLimit?: number;
  paymentStatus?: string;
  dateOpened?: string;
  lastPaymentDate?: string;
}

interface ExperianInquiryPayload {
  inquiryDate?: string;
  subscriberName?: string;
  inquiryType?: string;
}

interface ExperianPublicRecordPayload {
  recordType?: string;
  filingDate?: string;
  status?: string;
  amount?: number;
  courtName?: string;
}

interface ExperianCreditReportResponse {
  riskModel?: ExperianScore;
  creditScore?: ExperianScore;
  tradelines?: ExperianTradeline[];
  inquiries?: ExperianInquiryPayload[];
  publicRecords?: ExperianPublicRecordPayload[];
  [key: string]: unknown;
}

export default ExperianClient;
