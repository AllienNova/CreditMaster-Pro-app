/**
 * TransUnion API Client
 * 
 * Integration with TransUnion TrueVision API for credit reports and disputes
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

export class TransUnionClient {
  private subscriberId: string;
  private apiKey: string;
  private environment: 'test' | 'production';

  constructor(subscriberId: string, apiKey: string, environment: 'test' | 'production' = 'test') {
    this.subscriberId = subscriberId;
    this.apiKey = apiKey;
    this.environment = environment;
  }

  /**
   * Retrieve credit report from TransUnion
   */
  async getCreditReport(
    request: CreditReportRequest,
    userPII: UserPII
  ): Promise<BureauResponse<CreditReport>> {
    try {
      console.log('📊 Retrieving TransUnion credit report...');

      const endpoint = this.environment === 'test'
        ? 'https://netaccess-test.transunion.com/tuapi/creditreport/v3/report'
        : 'https://netaccess.transunion.com/tuapi/creditreport/v3/report';

      const payload = {
        requestControlOptions: {
          subscriberId: this.subscriberId,
          permissiblePurpose: request.permissible_purpose || '3F'
        },
        subject: {
          subjectRecord: {
            indicative: {
              name: {
                person: {
                  first: userPII.firstName,
                  last: userPII.lastName
                }
              },
              socialSecurity: {
                number: userPII.ssn
              },
              dateOfBirth: userPII.dateOfBirth,
              address: userPII.addresses[0] ? {
                street: {
                  unparsed: userPII.addresses[0].streetAddress
                },
                location: {
                  city: userPII.addresses[0].city,
                  state: userPII.addresses[0].state,
                  zipCode: userPII.addresses[0].zipCode
                }
              } : undefined
            }
          }
        },
        addOnProducts: {
          riskModel: true,
          fraudShield: true,
          creditVision: true
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TransUnion API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Transform TransUnion response to our format
      const creditReport = this.transformResponse(data, request.user_id);

      console.log('✅ TransUnion report retrieved successfully');

      return {
        success: true,
        data: creditReport,
        bureau: 'transunion',
        timestamp: new Date().toISOString(),
        reference_id: data.responseControlOptions?.trackingNumber
      };

    } catch (error) {
      console.error('❌ TransUnion API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        bureau: 'transunion',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Submit dispute to TransUnion
   */
  async submitDispute(
    dispute: DisputeSubmission,
    userPII: UserPII
  ): Promise<BureauResponse> {
    try {
      console.log('📝 Submitting dispute to TransUnion...');

      const endpoint = this.environment === 'test'
        ? 'https://netaccess-test.transunion.com/tuapi/dispute/v1/submit'
        : 'https://netaccess.transunion.com/tuapi/dispute/v1/submit';

      const payload = {
        requestControlOptions: {
          subscriberId: this.subscriberId
        },
        subject: {
          name: {
            first: userPII.firstName,
            last: userPII.lastName
          },
          ssn: userPII.ssn,
          dateOfBirth: userPII.dateOfBirth
        },
        dispute: {
          itemId: dispute.credit_item_id,
          reasonCode: this.mapDisputeReasonCode(dispute.dispute_reason),
          statement: dispute.consumer_statement,
          documents: dispute.supporting_documents || []
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`TransUnion dispute submission failed: ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ TransUnion dispute submitted successfully');

      return {
        success: true,
        data: data,
        bureau: 'transunion',
        timestamp: new Date().toISOString(),
        reference_id: data.disputeId
      };

    } catch (error) {
      console.error('❌ TransUnion dispute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        bureau: 'transunion',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Transform TransUnion response to our standard format
   */
  private transformResponse(data: TransUnionCreditReportResponse, userId: string): CreditReport {
    const creditReport = data.creditReport || {};
    
    return {
      id: `tu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      bureau: 'transunion',
      credit_score: data.riskModel?.score || creditReport.score || 0,
      report_date: new Date().toISOString(),
      accounts: this.parseAccounts(creditReport.tradelines || []),
      inquiries: this.parseInquiries(creditReport.inquiries || []),
      public_records: this.parsePublicRecords(creditReport.publicRecords || []),
      raw_data: data,
      created_at: new Date().toISOString()
    };
  }

  private parseAccounts(tradelines: TransUnionTradeline[]): CreditAccount[] {
    return tradelines.map((tradeline) => ({
      id: tradeline.accountNumber || `acc_${Math.random().toString(36).substr(2, 9)}`,
      account_number: tradeline.accountNumber || `acc_${Math.random().toString(36).substr(2, 9)}`,
      account_type: this.mapAccountType(tradeline.accountType ?? ''),
      creditor_name: tradeline.creditorName || tradeline.subscriberName || 'Unknown Creditor',
      balance: tradeline.balance || 0,
      credit_limit: tradeline.creditLimit || tradeline.highCredit || 0,
      payment_status: this.mapPaymentStatus(tradeline.paymentStatus ?? ''),
      opened_date: tradeline.dateOpened || new Date().toISOString(),
      last_payment_date: tradeline.lastPaymentDate || undefined,
      payment_history: []
    }));
  }

  private parseInquiries(inquiries: TransUnionInquiryPayload[]): CreditInquiry[] {
    return inquiries.map((inquiry) => ({
      id: `inq_${Math.random().toString(36).substr(2, 9)}`,
      inquiry_date: inquiry.inquiryDate || new Date().toISOString(),
      creditor_name: inquiry.subscriberName || 'Unknown Creditor',
      inquiry_type: inquiry.inquiryType === '1' ? 'hard' : 'soft'
    }));
  }

  private parsePublicRecords(records: TransUnionPublicRecordPayload[]): PublicRecord[] {
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
      '18': 'credit_card',
      '26': 'mortgage',
      '37': 'auto_loan',
      '93': 'student_loan',
      '48': 'personal_loan'
    };
    return mapping[type] || 'other';
  }

  private mapPaymentStatus(status: string): CreditAccount['payment_status'] {
    if (!status || status === '0' || status === 'C') return 'current';
    if (status === '1' || status === '2') return 'late';
    if (status === '9') return 'charged_off';
    if (status === 'COL') return 'collection';
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

  private mapDisputeReasonCode(reason: string): string {
    const mapping: Record<string, string> = {
      'not_mine': '01',
      'incorrect_balance': '02',
      'incorrect_payment_history': '03',
      'account_closed': '04',
      'paid_in_full': '05',
      'duplicate': '06',
      'fraud': '07',
      'identity_theft': '08'
    };
    return mapping[reason] || '99';
  }
}

export default TransUnionClient;

interface TransUnionTradeline {
  accountNumber?: string;
  accountType?: string;
  creditorName?: string;
  subscriberName?: string;
  balance?: number;
  creditLimit?: number;
  highCredit?: number;
  paymentStatus?: string;
  dateOpened?: string;
  lastPaymentDate?: string;
}

interface TransUnionInquiryPayload {
  inquiryDate?: string;
  subscriberName?: string;
  inquiryType?: string;
}

interface TransUnionPublicRecordPayload {
  recordType?: string;
  filingDate?: string;
  status?: string;
  amount?: number;
  courtName?: string;
}

interface TransUnionCreditReportData {
  score?: number;
  tradelines?: TransUnionTradeline[];
  inquiries?: TransUnionInquiryPayload[];
  publicRecords?: TransUnionPublicRecordPayload[];
}

interface TransUnionCreditReportResponse {
  riskModel?: { score?: number };
  creditReport?: TransUnionCreditReportData;
  [key: string]: unknown;
}
