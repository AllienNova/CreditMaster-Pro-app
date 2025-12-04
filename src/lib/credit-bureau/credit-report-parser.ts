/**
 * Credit Report Parser Service
 * 
 * Parses credit reports from different bureaus (Experian, Equifax, TransUnion)
 * and normalizes them into a consistent format.
 * 
 * Currently supports:
 * - Mock credit reports (for development)
 * - Future: Plaid format
 * - Future: Direct bureau formats
 */

import {
  Bureau,
  ParsedCreditReport,
  ValidationResult,
  MockCreditReportOptions,
  CreditBureauRawPayload,
} from '@/types/credit-bureau';
import { generateMockCreditReport } from './mock-credit-report-generator';

type CreditReportFormat = 'mock' | 'plaid' | 'experian' | 'equifax' | 'transunion';

/**
 * Credit Report Parser Class
 */
export class CreditReportParser {
  /**
   * Parse a credit report from raw data
   */
  async parseReport(
    rawData: CreditBureauRawPayload | ParsedCreditReport,
    bureau: Bureau,
    reportDate?: Date
  ): Promise<ParsedCreditReport> {
    // Validate input
    if (!rawData) {
      throw new Error('Raw data is required');
    }

    if (!bureau) {
      throw new Error('Bureau is required');
    }

    if (this.isParsedReport(rawData)) {
      return rawData;
    }

    const normalizedReportDate = reportDate?.toISOString();
    console.log('📄 Parsing credit report payload', { bureau, reportDate: normalizedReportDate });

    // Determine format and parse accordingly
    const format = this.detectFormat(rawData as CreditBureauRawPayload);

    switch (format) {
      case 'mock':
        return this.parseMockReport(rawData, bureau);
      case 'plaid':
        return this.parsePlaidReport(rawData, bureau);
      case 'experian':
        return this.parseExperianReport(rawData);
      case 'equifax':
        return this.parseEquifaxReport(rawData);
      case 'transunion':
        return this.parseTransUnionReport(rawData);
      default:
        throw new Error(`Unsupported credit report format: ${format}`);
    }
  }

  /**
   * Detect the format of the credit report
   */
  private detectFormat(rawData: CreditBureauRawPayload): CreditReportFormat {
    const formatFlag = this.getString(rawData, 'format');
    const isMock = this.getBoolean(rawData, 'isMock');
    if (formatFlag === 'mock' || isMock === true) {
      return 'mock';
    }

    // Check for mock format
    if (this.hasProperty(rawData, 'personalInfo') && this.hasProperty(rawData, 'accounts')) {
      return 'mock';
    }

    // Check for Plaid format
    if (this.hasProperty(rawData, 'credit_report') || this.hasProperty(rawData, 'accounts')) {
      return 'plaid';
    }

    // Check for Experian format
    if (this.hasProperty(rawData, 'CreditProfile') || this.hasProperty(rawData, 'experianData')) {
      return 'experian';
    }

    // Check for Equifax format
    if (this.hasProperty(rawData, 'equifaxCreditReport') || this.hasProperty(rawData, 'EFXReport')) {
      return 'equifax';
    }

    // Check for TransUnion format
    if (this.hasProperty(rawData, 'TransUnionReport') || this.hasProperty(rawData, 'TUReport')) {
      return 'transunion';
    }

    // Default to mock for development
    return 'mock';
  }

  /**
   * Parse mock credit report
   */
  private parseMockReport(rawData: CreditBureauRawPayload, bureau: Bureau): ParsedCreditReport {
    const candidate = rawData as Partial<ParsedCreditReport>;
    if (candidate.personalInfo && candidate.accounts) {
      return candidate as ParsedCreditReport;
    }

    const options: MockCreditReportOptions = {
      bureau,
      creditScore: this.getNumber(rawData, 'creditScore'),
      accountCount: this.getNumber(rawData, 'accountCount'),
      inquiryCount: this.getNumber(rawData, 'inquiryCount'),
      publicRecordCount: this.getNumber(rawData, 'publicRecordCount'),
      includeNegativeItems: this.getBoolean(rawData, 'includeNegativeItems'),
    };

    return generateMockCreditReport(options);
  }

  /**
   * Parse Plaid credit report
   * https://plaid.com/docs/api/products/credit/
   */
  private parsePlaidReport(rawData: CreditBureauRawPayload, bureau: Bureau): ParsedCreditReport {
    // TODO: Implement Plaid parsing
    // This will be implemented when we integrate with Plaid
    console.warn('⚠️ Plaid credit report parsing not implemented', {
      bureau,
      keys: Object.keys(rawData || {}),
    });
    throw new Error('Plaid format parsing not yet implemented');
  }

  /**
   * Parse Experian credit report
   */
  private parseExperianReport(rawData: CreditBureauRawPayload): ParsedCreditReport {
    // TODO: Implement Experian parsing
    // This will be implemented when we integrate with Experian API
    console.warn('⚠️ Experian credit report parsing not implemented', {
      keys: Object.keys(rawData || {}),
    });
    throw new Error('Experian format parsing not yet implemented');
  }

  /**
   * Parse Equifax credit report
   */
  private parseEquifaxReport(rawData: CreditBureauRawPayload): ParsedCreditReport {
    // TODO: Implement Equifax parsing
    // This will be implemented when we integrate with Equifax API
    console.warn('⚠️ Equifax credit report parsing not implemented', {
      keys: Object.keys(rawData || {}),
    });
    throw new Error('Equifax format parsing not yet implemented');
  }

  /**
   * Parse TransUnion credit report
   */
  private parseTransUnionReport(rawData: CreditBureauRawPayload): ParsedCreditReport {
    // TODO: Implement TransUnion parsing
    // This will be implemented when we integrate with TransUnion API
    console.warn('⚠️ TransUnion credit report parsing not implemented', {
      keys: Object.keys(rawData || {}),
    });
    throw new Error('TransUnion format parsing not yet implemented');
  }

  /**
   * Validate a parsed credit report
   */
  validateReport(report: ParsedCreditReport): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate personal info
    if (!report.personalInfo) {
      errors.push('Personal information is required');
    } else {
      if (!report.personalInfo.firstName) {
        errors.push('First name is required');
      }
      if (!report.personalInfo.lastName) {
        errors.push('Last name is required');
      }
      if (!report.personalInfo.addresses || report.personalInfo.addresses.length === 0) {
        warnings.push('No addresses found');
      }
    }

    // Validate credit score
    if (!report.creditScore) {
      errors.push('Credit score is required');
    } else if (report.creditScore < 300 || report.creditScore > 850) {
      errors.push('Credit score must be between 300 and 850');
    }

    // Validate accounts
    if (!report.accounts || report.accounts.length === 0) {
      warnings.push('No credit accounts found');
    } else {
      report.accounts.forEach((account, index) => {
        if (!account.creditorName) {
          errors.push(`Account ${index + 1}: Creditor name is required`);
        }
        if (!account.accountType) {
          errors.push(`Account ${index + 1}: Account type is required`);
        }
        if (account.balance < 0) {
          errors.push(`Account ${index + 1}: Balance cannot be negative`);
        }
        if (account.creditLimit && account.creditLimit < account.balance) {
          warnings.push(`Account ${index + 1}: Balance exceeds credit limit`);
        }
      });
    }

    // Validate inquiries
    if (report.inquiries) {
      report.inquiries.forEach((inquiry, index) => {
        if (!inquiry.creditorName) {
          errors.push(`Inquiry ${index + 1}: Creditor name is required`);
        }
        if (!inquiry.inquiryDate) {
          errors.push(`Inquiry ${index + 1}: Inquiry date is required`);
        }
      });
    }

    // Validate public records
    if (report.publicRecords) {
      report.publicRecords.forEach((record, index) => {
        if (!record.recordType) {
          errors.push(`Public record ${index + 1}: Record type is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate credit utilization
   */
  calculateUtilization(report: ParsedCreditReport): number {
    const revolvingAccounts = report.accounts.filter(
      (account) => account.accountType === 'credit_card' || account.accountType === 'revolving'
    );

    const totalBalance = revolvingAccounts.reduce((sum, account) => sum + account.balance, 0);
    const totalLimit = revolvingAccounts.reduce(
      (sum, account) => sum + (account.creditLimit || 0),
      0
    );

    if (totalLimit === 0) return 0;
    return (totalBalance / totalLimit) * 100;
  }

  /**
   * Calculate average account age in months
   */
  calculateAverageAccountAge(report: ParsedCreditReport): number {
    if (report.accounts.length === 0) return 0;

    const now = new Date();
    const totalMonths = report.accounts.reduce((sum, account) => {
      const openedDate = new Date(account.openedDate);
      const months =
        (now.getFullYear() - openedDate.getFullYear()) * 12 +
        (now.getMonth() - openedDate.getMonth());
      return sum + months;
    }, 0);

    return Math.round(totalMonths / report.accounts.length);
  }

  /**
   * Count negative items
   */
  countNegativeItems(report: ParsedCreditReport): number {
    let count = 0;

    // Count late payments
    count += report.accounts.filter((account) =>
      ['late_30', 'late_60', 'late_90', 'late_120', 'charge_off', 'collection'].includes(
        account.paymentStatus
      )
    ).length;

    // Count public records
    count += report.publicRecords.length;

    return count;
  }

  /**
   * Get oldest account age in months
   */
  getOldestAccountAge(report: ParsedCreditReport): number {
    if (report.accounts.length === 0) return 0;

    const now = new Date();
    const oldestAccount = report.accounts.reduce((oldest, account) => {
      const accountDate = new Date(account.openedDate);
      const oldestDate = new Date(oldest.openedDate);
      return accountDate < oldestDate ? account : oldest;
    });

    const openedDate = new Date(oldestAccount.openedDate);
    return (
      (now.getFullYear() - openedDate.getFullYear()) * 12 +
      (now.getMonth() - openedDate.getMonth())
    );
  }

  private isParsedReport(value: unknown): value is ParsedCreditReport {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Partial<ParsedCreditReport>;
    return Boolean(candidate.personalInfo) && Array.isArray(candidate.accounts);
  }

  private getString(payload: CreditBureauRawPayload, key: string): string | undefined {
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getNumber(payload: CreditBureauRawPayload, key: string): number | undefined {
    const value = payload[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private getBoolean(payload: CreditBureauRawPayload, key: string): boolean | undefined {
    const value = payload[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return undefined;
  }

  private hasProperty(payload: CreditBureauRawPayload, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(payload, key);
  }
}

// Export singleton instance
export const creditReportParser = new CreditReportParser();
export default creditReportParser;
