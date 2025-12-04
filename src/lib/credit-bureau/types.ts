/**
 * Credit Bureau Integration Types
 * 
 * Type definitions for credit bureau API integration
 */

export interface BureauCredentials {
  experian: {
    client_id: string;
    client_secret: string;
    sandbox: boolean;
  };
  equifax: {
    api_key: string;
    client_id: string;
    environment: 'sandbox' | 'production';
  };
  transunion: {
    subscriber_id: string;
    api_key: string;
    environment: 'test' | 'production';
  };
}

export type Bureau = 'experian' | 'equifax' | 'transunion';
export type ReportType = 'full' | 'monitoring' | 'score_only';
export type CreditBureauRawPayload = Record<string, unknown>;

export interface CreditReportRequest {
  user_id: string;
  bureau: Bureau;
  report_type: ReportType;
  consumer_consent: boolean;
  permissible_purpose: string;
}

export interface CreditReport {
  id: string;
  user_id: string;
  bureau: Bureau;
  credit_score: number;
  report_date: string;
  accounts?: CreditAccount[];
  inquiries?: CreditInquiry[];
  public_records?: PublicRecord[];
  raw_data: CreditBureauRawPayload;
  created_at: string;
}

export interface CreditAccount {
  id: string;
  account_number: string;
  account_type: 'credit_card' | 'mortgage' | 'auto_loan' | 'student_loan' | 'personal_loan' | 'other';
  creditor_name: string;
  balance: number;
  credit_limit?: number;
  payment_status: 'current' | 'late' | 'charged_off' | 'collection' | 'closed';
  opened_date: string;
  last_payment_date?: string;
  payment_history: PaymentHistory[];
}

export interface PaymentHistory {
  month: string;
  status: 'OK' | '30' | '60' | '90' | '120' | 'CO' | 'NA';
}

export interface CreditInquiry {
  id: string;
  inquiry_date: string;
  creditor_name: string;
  inquiry_type: 'hard' | 'soft';
}

export interface PublicRecord {
  id: string;
  record_type: 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure';
  filing_date: string;
  status: 'filed' | 'discharged' | 'satisfied' | 'dismissed';
  amount?: number;
  court_name?: string;
}

export interface DisputeSubmission {
  bureau: Bureau;
  credit_item_id: string;
  dispute_reason: string;
  dispute_method: string;
  supporting_documents?: string[];
  consumer_statement?: string;
}

export interface BureauResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  bureau: string;
  timestamp: string;
  reference_id?: string;
}

export interface CreditMonitoringAlert {
  id: string;
  user_id: string;
  bureau: string;
  alert_type: 'new_account' | 'score_change' | 'inquiry' | 'address_change' | 'fraud_alert';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  acknowledged: boolean;
}

export interface UserPII {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  addresses: Address[];
}

export interface Address {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CreditUtilization {
  total_credit_limit: number;
  total_balance: number;
  utilization_percentage: number;
  by_account: Array<{
    account_id: string;
    creditor_name: string;
    credit_limit: number;
    balance: number;
    utilization: number;
  }>;
}

export interface CreditAnalysis {
  credit_score: number;
  score_factors: string[];
  utilization: CreditUtilization;
  negative_items: Array<{
    type: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  positive_factors: string[];
  recommendations: string[];
}
