/**
 * Credit Bureau Types
 * 
 * Type definitions for credit reports, accounts, inquiries, and public records
 */

export type Bureau = 'experian' | 'equifax' | 'transunion';

export type AccountType = 
  | 'credit_card'
  | 'mortgage'
  | 'auto_loan'
  | 'student_loan'
  | 'personal_loan'
  | 'installment'
  | 'revolving'
  | 'other';

export type PaymentStatus = 
  | 'current'
  | 'late_30'
  | 'late_60'
  | 'late_90'
  | 'late_120'
  | 'charge_off'
  | 'collection'
  | 'closed';

export type InquiryType = 'hard' | 'soft';

export type PublicRecordType = 
  | 'bankruptcy'
  | 'judgment'
  | 'tax_lien'
  | 'foreclosure'
  | 'repossession';

type JsonPrimitive = string | number | boolean | null | Date;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type CreditBureauRawPayload = Record<string, JsonValue>;

// =====================================================
// PERSONAL INFORMATION
// =====================================================

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: Date;
  ssn?: string; // Last 4 digits only
  addresses: Address[];
  employers?: Employer[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  type: 'current' | 'previous';
  reportedDate?: Date;
}

export interface Employer {
  name: string;
  position?: string;
  startDate?: Date;
  endDate?: Date;
}

// =====================================================
// CREDIT ACCOUNT
// =====================================================

export interface CreditAccount {
  id: string;
  reportId: string;
  userId: string;
  accountType: AccountType;
  accountNumber: string; // Masked (e.g., "****1234")
  creditorName: string;
  balance: number;
  creditLimit?: number;
  paymentStatus: PaymentStatus;
  openedDate: Date;
  closedDate?: Date;
  lastPaymentDate?: Date;
  paymentHistory: PaymentHistory[];
  isDisputed: boolean;
  disputeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentHistory {
  month: string; // Format: "YYYY-MM"
  status: PaymentStatus;
  amount?: number;
}

// =====================================================
// CREDIT INQUIRY
// =====================================================

export interface CreditInquiry {
  id: string;
  reportId: string;
  userId: string;
  inquiryType: InquiryType;
  creditorName: string;
  inquiryDate: Date;
  isDisputed: boolean;
  disputeId?: string;
  createdAt: Date;
}

// =====================================================
// PUBLIC RECORD
// =====================================================

export interface PublicRecord {
  id: string;
  reportId: string;
  userId: string;
  recordType: PublicRecordType;
  filingDate?: Date;
  status: string;
  amount?: number;
  courtName?: string;
  caseNumber?: string;
  isDisputed: boolean;
  disputeId?: string;
  createdAt: Date;
}

// =====================================================
// CREDIT REPORT
// =====================================================

export interface CreditReport {
  id: string;
  userId: string;
  bureau: Bureau;
  reportDate: Date;
  creditScore: number;
  scoreFactors: string[];
  personalInfo: PersonalInfo;
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  publicRecords: PublicRecord[];
  rawData: CreditBureauRawPayload;
  parsedData: ParsedCreditReport;
  importedAt: Date;
  updatedAt: Date;
}

// =====================================================
// CREDIT SCORE
// =====================================================

export interface CreditScore {
  score: number;
  bureau: Bureau;
  date: Date;
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// =====================================================
// CREDIT SUMMARY
// =====================================================

export interface CreditSummary {
  userId: string;
  scores: {
    experian?: number;
    equifax?: number;
    transunion?: number;
    average?: number;
  };
  totalAccounts: number;
  openAccounts: number;
  closedAccounts: number;
  totalBalance: number;
  totalCreditLimit: number;
  utilizationRate: number;
  oldestAccountAge: number; // in months
  averageAccountAge: number; // in months
  totalInquiries: number;
  hardInquiries: number;
  softInquiries: number;
  publicRecords: number;
  negativeItems: number;
  lastUpdated: Date;
}

// =====================================================
// ACCOUNT SUMMARY
// =====================================================

export interface AccountSummary {
  totalAccounts: number;
  currentAccounts: number;
  lateAccounts: number;
  closedAccounts: number;
  totalBalance: number;
  totalCreditLimit: number;
  utilizationRate: number;
}

// =====================================================
// IMPORT/EXPORT
// =====================================================

export interface CreditReportImportRequest {
  bureau: Bureau;
  reportData: CreditBureauRawPayload; // Raw credit report data
  reportDate?: Date;
}

export interface CreditReportImportResponse {
  success: boolean;
  reportId?: string;
  message?: string;
  errors?: string[];
}

// =====================================================
// VALIDATION
// =====================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// =====================================================
// PARSER RESULT
// =====================================================

export interface ParsedCreditReport {
  personalInfo: PersonalInfo;
  creditScore: number;
  scoreFactors: string[];
  accounts: Omit<CreditAccount, 'id' | 'reportId' | 'userId' | 'createdAt' | 'updatedAt'>[];
  inquiries: Omit<CreditInquiry, 'id' | 'reportId' | 'userId' | 'createdAt'>[];
  publicRecords: Omit<PublicRecord, 'id' | 'reportId' | 'userId' | 'createdAt'>[];
}

// =====================================================
// MOCK DATA TYPES
// =====================================================

export interface MockCreditReportOptions {
  bureau: Bureau;
  creditScore?: number;
  accountCount?: number;
  inquiryCount?: number;
  publicRecordCount?: number;
  includeNegativeItems?: boolean;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface GetCreditReportsResponse {
  success: boolean;
  data?: CreditReport[];
  error?: string;
}

export interface GetCreditReportResponse {
  success: boolean;
  data?: CreditReport;
  error?: string;
}

export interface GetCreditSummaryResponse {
  success: boolean;
  data?: CreditSummary;
  error?: string;
}

export interface GetAccountsResponse {
  success: boolean;
  data?: CreditAccount[];
  error?: string;
}

export interface GetInquiriesResponse {
  success: boolean;
  data?: CreditInquiry[];
  error?: string;
}

export interface GetPublicRecordsResponse {
  success: boolean;
  data?: PublicRecord[];
  error?: string;
}
