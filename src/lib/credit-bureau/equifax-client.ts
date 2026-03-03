/**
 * Equifax API Client
 *
 * Integration with Equifax OneView API for credit reports and disputes
 */

import type {
  BureauResponse,
  CreditBureauAdapter,
  CreditReport,
  CreditReportRequest,
  DisputeSubmission,
  UserPII,
  CreditAccount,
  CreditInquiry,
  PublicRecord,
  Bureau,
} from "./types";

export class EquifaxClient implements CreditBureauAdapter {
  readonly bureau: Bureau = "equifax";
  private apiKey: string;
  private clientId: string;
  private environment: "sandbox" | "production";

  constructor(
    apiKey: string,
    clientId: string,
    environment: "sandbox" | "production" = "sandbox",
  ) {
    this.apiKey = apiKey;
    this.clientId = clientId;
    this.environment = environment;
  }

  /**
   * Retrieve credit report from Equifax
   */
  async getCreditReport(
    request: CreditReportRequest,
    userPII: UserPII,
  ): Promise<BureauResponse<CreditReport>> {
    try {
      // EquifaxClient: Retrieving Equifax credit report

      const endpoint =
        this.environment === "sandbox"
          ? "https://api.sandbox.equifax.com/business/oneview/v1/credit-report"
          : "https://api.equifax.com/business/oneview/v1/credit-report";

      const payload = {
        consumers: [
          {
            personalInfo: {
              name: {
                firstName: userPII.firstName,
                lastName: userPII.lastName,
              },
              ssn: userPII.ssn,
              dateOfBirth: userPII.dateOfBirth,
              addresses: userPII.addresses.map((addr) => ({
                streetAddress: addr.streetAddress,
                city: addr.city,
                state: addr.state,
                zipCode: addr.zipCode,
              })),
            },
            requestType: request.report_type.toUpperCase(),
          },
        ],
        options: {
          includeScores: true,
          includeFactors: true,
          includeAlerts: true,
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Client-Id": this.clientId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Equifax API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // Transform Equifax response to our format
      const creditReport = this.transformResponse(data, request.user_id);

      // EquifaxClient: Equifax report retrieved successfully

      return {
        success: true,
        data: creditReport,
        bureau: "equifax",
        timestamp: new Date().toISOString(),
        reference_id: data.reportId,
      };
    } catch (_error) {
      // EquifaxClient error: Equifax API error
      return {
        success: false,
        error: _error instanceof Error ? _error.message : "Unknown error",
        bureau: "equifax",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Submit dispute to Equifax
   */
  async submitDispute(
    dispute: DisputeSubmission,
    userPII: UserPII,
  ): Promise<BureauResponse> {
    try {
      // EquifaxClient: Submitting dispute to Equifax

      const endpoint =
        this.environment === "sandbox"
          ? "https://api.sandbox.equifax.com/business/oneview/v1/dispute"
          : "https://api.equifax.com/business/oneview/v1/dispute";

      const payload = {
        consumer: {
          personalInfo: {
            name: {
              firstName: userPII.firstName,
              lastName: userPII.lastName,
            },
            ssn: userPII.ssn,
            dateOfBirth: userPII.dateOfBirth,
          },
        },
        dispute: {
          itemId: dispute.credit_item_id,
          reasonCode: this.mapDisputeReasonCode(dispute.dispute_reason),
          statement: dispute.consumer_statement,
          supportingDocuments: dispute.supporting_documents || [],
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Client-Id": this.clientId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Equifax dispute submission failed: ${response.status}`,
        );
      }

      const data = await response.json();

      // EquifaxClient: Equifax dispute submitted successfully

      return {
        success: true,
        data: data,
        bureau: "equifax",
        timestamp: new Date().toISOString(),
        reference_id: data.disputeId,
      };
    } catch (_error) {
      // EquifaxClient error: Equifax dispute error
      return {
        success: false,
        error: _error instanceof Error ? _error.message : "Unknown error",
        bureau: "equifax",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Transform Equifax response to our standard format
   */
  private transformResponse(
    data: EquifaxCreditReportResponse,
    userId: string,
  ): CreditReport {
    const consumer = data.consumers?.[0] || {};

    return {
      id: `eqf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      bureau: "equifax",
      credit_score: consumer.creditScore?.score || data.creditScore?.score || 0,
      report_date: new Date().toISOString(),
      accounts: this.parseAccounts(consumer.tradelines || []),
      inquiries: this.parseInquiries(consumer.inquiries || []),
      public_records: this.parsePublicRecords(consumer.publicRecords || []),
      raw_data: data,
      created_at: new Date().toISOString(),
    };
  }

  private parseAccounts(tradelines: EquifaxTradeline[]): CreditAccount[] {
    return tradelines.map((tradeline) => ({
      id:
        tradeline.accountNumber ||
        `acc_${Math.random().toString(36).substr(2, 9)}`,
      account_number:
        tradeline.accountNumber ||
        `acc_${Math.random().toString(36).substr(2, 9)}`,
      account_type: this.mapAccountType(tradeline.accountType ?? ""),
      creditor_name:
        tradeline.creditorName || tradeline.businessName || "Unknown Creditor",
      balance: tradeline.balance || 0,
      credit_limit: tradeline.creditLimit || tradeline.highCredit || 0,
      payment_status: this.mapPaymentStatus(tradeline.paymentStatus ?? ""),
      opened_date: tradeline.dateOpened || new Date().toISOString(),
      last_payment_date: tradeline.lastPaymentDate || undefined,
      payment_history: [],
    }));
  }

  private parseInquiries(inquiries: EquifaxInquiryPayload[]): CreditInquiry[] {
    return inquiries.map((inquiry) => ({
      id: `inq_${Math.random().toString(36).substr(2, 9)}`,
      inquiry_date: inquiry.inquiryDate || new Date().toISOString(),
      creditor_name: inquiry.businessName || "Unknown Creditor",
      inquiry_type: ["h", "hard"].includes(
        (inquiry.inquiryType || "").toLowerCase(),
      )
        ? "hard"
        : "soft",
    }));
  }

  private parsePublicRecords(
    records: EquifaxPublicRecordPayload[],
  ): PublicRecord[] {
    return records.map((record) => ({
      id: `pr_${Math.random().toString(36).substr(2, 9)}`,
      record_type: this.mapRecordType(record.recordType),
      filing_date: record.filingDate || new Date().toISOString(),
      status: this.mapRecordStatus(record.status),
      amount: record.amount,
      court_name: record.courtName,
    }));
  }

  private mapAccountType(type: string): CreditAccount["account_type"] {
    const mapping: Record<string, CreditAccount["account_type"]> = {
      CC: "credit_card",
      MT: "mortgage",
      AL: "auto_loan",
      SL: "student_loan",
      PL: "personal_loan",
    };
    return mapping[type] || "other";
  }

  private mapPaymentStatus(status: string): CreditAccount["payment_status"] {
    if (!status || status === "C" || status === "CURRENT") return "current";
    if (status === "L" || status === "LATE") return "late";
    if (status === "CO" || status === "CHARGEOFF") return "charged_off";
    if (status === "COL" || status === "COLLECTION") return "collection";
    if (status === "CLS" || status === "CLOSED") return "closed";
    return "current";
  }

  private mapRecordType(type?: string): PublicRecord["record_type"] {
    const mapping: Record<string, PublicRecord["record_type"]> = {
      BANKRUPTCY: "bankruptcy",
      TAX_LIEN: "tax_lien",
      JUDGMENT: "judgment",
      FORECLOSURE: "foreclosure",
    };
    return type && mapping[type] ? mapping[type] : "judgment";
  }

  private mapRecordStatus(status?: string): PublicRecord["status"] {
    const normalized = status?.toUpperCase();
    switch (normalized) {
      case "DISCHARGED":
        return "discharged";
      case "SATISFIED":
        return "satisfied";
      case "DISMISSED":
        return "dismissed";
      default:
        return "filed";
    }
  }

  private mapDisputeReasonCode(reason: string): string {
    const mapping: Record<string, string> = {
      not_mine: "NM",
      incorrect_balance: "IB",
      incorrect_payment_history: "IPH",
      account_closed: "AC",
      paid_in_full: "PIF",
      duplicate: "DUP",
      fraud: "FR",
      identity_theft: "IT",
    };
    return mapping[reason] || "OTH";
  }
}

export default EquifaxClient;

interface EquifaxCreditScore {
  score?: number;
}

interface EquifaxTradeline {
  accountNumber?: string;
  accountType?: string;
  creditorName?: string;
  businessName?: string;
  balance?: number;
  creditLimit?: number;
  highCredit?: number;
  paymentStatus?: string;
  dateOpened?: string;
  lastPaymentDate?: string;
}

interface EquifaxInquiryPayload {
  inquiryDate?: string;
  businessName?: string;
  inquiryType?: string;
}

interface EquifaxPublicRecordPayload {
  recordType?: string;
  filingDate?: string;
  status?: string;
  amount?: number;
  courtName?: string;
}

interface EquifaxConsumer {
  creditScore?: EquifaxCreditScore;
  tradelines?: EquifaxTradeline[];
  inquiries?: EquifaxInquiryPayload[];
  publicRecords?: EquifaxPublicRecordPayload[];
}

interface EquifaxCreditReportResponse {
  consumers?: EquifaxConsumer[];
  creditScore?: EquifaxCreditScore;
  [key: string]: unknown;
}
