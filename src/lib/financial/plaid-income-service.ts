/**
 * Plaid Income Verification Service
 *
 * Handles income verification, paystubs, tax forms, and bank income via the Plaid SDK.
 */

import { getPlaidClient } from "@/lib/financial/plaid-client";
import type {
  Paystub,
  Taxform,
  DocumentMetadata,
  W2,
  CreditBankIncomeItem,
  CreditBankIncomeSource,
} from "plaid";

// Types

export interface PlaidIncomeVerificationResult {
  incomeVerificationId: string;
  requestId: string;
}

export interface PlaidPaystubEmployer {
  name: string | null;
  addressCity: string | null;
  addressRegion: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
}

export interface PlaidPaystubEmployee {
  name: string | null;
  addressCity: string | null;
  addressRegion: string | null;
  addressPostalCode: string | null;
}

export interface PlaidPaystubEarnings {
  subtotalAmount: number | null;
  totalAmount: number | null;
  currency: string | null;
}

export interface PlaidPaystub {
  employer: PlaidPaystubEmployer;
  employee: PlaidPaystubEmployee;
  payPeriodStartDate: string | null;
  payPeriodEndDate: string | null;
  payDate: string | null;
  earnings: PlaidPaystubEarnings;
  documentId: string | null;
}

export interface PlaidPaystubsResult {
  paystubs: PlaidPaystub[];
  documentMetadata: Array<{
    name: string | null;
    documentType: string | null;
  }>;
  requestId: string;
}

export interface PlaidTaxForm {
  documentType: string | null;
  documentId: string | null;
  w2: PlaidW2Data | null;
}

export interface PlaidW2Data {
  employer: { name: string | null; ein: string | null } | null;
  employee: { name: string | null; address: string | null } | null;
  taxYear: string | null;
  wagesTipsCompensation: string | null;
  federalIncomeTaxWithheld: string | null;
  socialSecurityWages: string | null;
  socialSecurityTaxWithheld: string | null;
  medicareWagesAndTips: string | null;
  medicareTaxWithheld: string | null;
  stateTaxInfos: Array<{
    state: string | null;
    stateIncomeTax: string | null;
    stateWages: string | null;
  }>;
}

export interface PlaidTaxFormsResult {
  taxforms: PlaidTaxForm[];
  documentMetadata: Array<{
    name: string | null;
    documentType: string | null;
  }>;
  requestId: string | null;
}

export interface PlaidBankIncomeSource {
  incomeSourceId: string | null;
  incomeDescription: string | null;
  incomeCategory: string | null;
  accountId: string | null;
  startDate: string | null;
  endDate: string | null;
  payFrequency: string | null;
  totalAmount: number | null;
  transactionCount: number | null;
  currency: string | null;
}

export interface PlaidBankIncomeItem {
  itemId: string | null;
  institutionId: string | null;
  institutionName: string | null;
  lastUpdatedTime: string | null;
  incomeSources: PlaidBankIncomeSource[];
}

export interface PlaidBankIncomeResult {
  items: PlaidBankIncomeItem[];
  requestId: string;
}

export interface PlaidBankIncomeRefreshResult {
  requestId: string;
}

// Error helper

interface PlaidApiError {
  response?: {
    status?: number;
    data?: {
      error_type?: string;
      error_code?: string;
      error_message?: string;
      display_message?: string | null;
    };
  };
}

function isPlaidApiError(error: unknown): error is PlaidApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as PlaidApiError).response === "object"
  );
}

function extractPlaidError(error: unknown): Error {
  if (isPlaidApiError(error) && error.response?.data) {
    const { error_type, error_code, error_message } = error.response.data;
    const statusCode = error.response.status ?? 500;
    const message = `Plaid API error [${statusCode}]: ${error_type ?? "UNKNOWN"} - ${error_code ?? "UNKNOWN"} - ${error_message ?? "Unknown error"}`;
    const enrichedError = new Error(message);
    (enrichedError as unknown as Record<string, unknown>).statusCode =
      statusCode;
    (enrichedError as unknown as Record<string, unknown>).errorType =
      error_type;
    (enrichedError as unknown as Record<string, unknown>).errorCode =
      error_code;
    return enrichedError;
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

/**
 * Plaid Income Verification Service Class
 */
class PlaidIncomeService {
  /**
   * Create an income verification session
   */
  async createIncomeVerification(
    webhook: string,
    options?: { accessTokens?: string[]; precheckId?: string },
  ): Promise<PlaidIncomeVerificationResult> {
    if (!webhook) {
      throw new Error("Webhook URL is required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.incomeVerificationCreate({
        webhook,
        precheck_id: options?.precheckId,
        options: options?.accessTokens
          ? { access_tokens: options.accessTokens }
          : undefined,
      });

      return {
        incomeVerificationId: response.data.income_verification_id,
        requestId: response.data.request_id,
      };
    } catch (error) {
      throw extractPlaidError(error);
    }
  }

  /**
   * Get paystub data for an income verification
   */
  async getPaystubs(accessToken: string): Promise<PlaidPaystubsResult> {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.incomeVerificationPaystubsGet({
        access_token: accessToken,
      });

      const paystubs: PlaidPaystub[] = (response.data.paystubs ?? []).map(
        (p) => this.mapPaystub(p),
      );

      const documentMetadata = (response.data.document_metadata ?? []).map(
        (d) => this.mapDocumentMetadata(d),
      );

      return {
        paystubs,
        documentMetadata,
        requestId: response.data.request_id,
      };
    } catch (error) {
      throw extractPlaidError(error);
    }
  }

  /**
   * Get tax forms (W-2s) for an income verification
   */
  async getTaxForms(accessToken: string): Promise<PlaidTaxFormsResult> {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.incomeVerificationTaxformsGet({
        access_token: accessToken,
      });

      const taxforms: PlaidTaxForm[] = (response.data.taxforms ?? []).map(
        (t) => this.mapTaxForm(t),
      );

      const documentMetadata = (response.data.document_metadata ?? []).map(
        (d) => this.mapDocumentMetadata(d),
      );

      return {
        taxforms,
        documentMetadata,
        requestId: response.data.request_id ?? null,
      };
    } catch (error) {
      throw extractPlaidError(error);
    }
  }

  /**
   * Get bank income data via Plaid Credit Bank Income API
   */
  async getBankIncome(userToken: string): Promise<PlaidBankIncomeResult> {
    if (!userToken) {
      throw new Error("User token is required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.creditBankIncomeGet({
        user_token: userToken,
      });

      const bankIncomeReports = response.data.bank_income ?? [];
      const items: PlaidBankIncomeItem[] = [];

      for (const report of bankIncomeReports) {
        const reportItems = report.items ?? [];
        for (const item of reportItems) {
          items.push(this.mapBankIncomeItem(item));
        }
      }

      return {
        items,
        requestId: response.data.request_id,
      };
    } catch (error) {
      throw extractPlaidError(error);
    }
  }

  /**
   * Refresh bank income data
   */
  async refreshBankIncome(
    userToken: string,
    daysRequested?: number,
  ): Promise<PlaidBankIncomeRefreshResult> {
    if (!userToken) {
      throw new Error("User token is required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.creditBankIncomeRefresh({
        user_token: userToken,
        options: daysRequested ? { days_requested: daysRequested } : undefined,
      });

      return {
        requestId: response.data.request_id,
      };
    } catch (error) {
      throw extractPlaidError(error);
    }
  }

  /**
   * Map SDK DocumentMetadata to our format
   */
  private mapDocumentMetadata(d: DocumentMetadata): {
    name: string | null;
    documentType: string | null;
  } {
    return {
      name: d.name ?? null,
      documentType: d.status ?? null,
    };
  }

  /**
   * Map raw paystub data to our PlaidPaystub interface
   */
  private mapPaystub(p: Paystub): PlaidPaystub {
    const employer = p.employer;
    const employee = p.employee;
    const payPeriodDetails = p.pay_period_details;
    const netPay = p.net_pay;

    const employerAddress = employer.address;
    const employeeAddress = employee.address;

    return {
      employer: {
        name: employer.name ?? null,
        addressCity: employerAddress?.city ?? null,
        addressRegion: employerAddress?.region ?? null,
        addressPostalCode: employerAddress?.postal_code ?? null,
        addressCountry: employerAddress?.country ?? null,
      },
      employee: {
        name: employee.name ?? null,
        addressCity: employeeAddress?.city ?? null,
        addressRegion: employeeAddress?.region ?? null,
        addressPostalCode: employeeAddress?.postal_code ?? null,
      },
      payPeriodStartDate: payPeriodDetails.start_date ?? null,
      payPeriodEndDate: payPeriodDetails.end_date ?? null,
      payDate: payPeriodDetails.pay_date ?? null,
      earnings: {
        subtotalAmount: netPay.current_amount ?? null,
        totalAmount: netPay.ytd_amount ?? null,
        currency: netPay.iso_currency_code ?? null,
      },
      documentId: p.doc_id ?? null,
    };
  }

  /**
   * Map raw tax form data to our PlaidTaxForm interface
   */
  private mapTaxForm(t: Taxform): PlaidTaxForm {
    const w2Data = t.w2;

    return {
      documentType: t.document_type ?? null,
      documentId: t.doc_id ?? null,
      w2: w2Data ? this.mapW2(w2Data) : null,
    };
  }

  /**
   * Map W-2 data
   */
  private mapW2(w2: W2): PlaidW2Data {
    const employer = w2.employer;
    const employee = w2.employee;
    const employeeAddress = employee?.address;
    const stateTaxInfos = w2.state_and_local_wages ?? [];

    return {
      employer: employer
        ? {
            name: employer.name ?? null,
            ein: w2.employer_id_number ?? null,
          }
        : null,
      employee: employee
        ? {
            name: employee.name ?? null,
            address: employeeAddress?.city
              ? `${employeeAddress.city ?? ""}, ${employeeAddress.region ?? ""} ${employeeAddress.postal_code ?? ""}`
              : null,
          }
        : null,
      taxYear: w2.tax_year ?? null,
      wagesTipsCompensation: w2.wages_tips_other_comp ?? null,
      federalIncomeTaxWithheld: w2.federal_income_tax_withheld ?? null,
      socialSecurityWages: w2.social_security_wages ?? null,
      socialSecurityTaxWithheld: w2.social_security_tax_withheld ?? null,
      medicareWagesAndTips: w2.medicare_wages_and_tips ?? null,
      medicareTaxWithheld: w2.medicare_tax_withheld ?? null,
      stateTaxInfos: stateTaxInfos.map((s) => ({
        state: s.state ?? null,
        stateIncomeTax: s.state_income_tax ?? null,
        stateWages: s.state_wages_tips ?? null,
      })),
    };
  }

  /**
   * Map bank income item data
   */
  private mapBankIncomeItem(item: CreditBankIncomeItem): PlaidBankIncomeItem {
    const sources = item.bank_income_sources ?? [];

    return {
      itemId: item.item_id ?? null,
      institutionId: item.institution_id ?? null,
      institutionName: item.institution_name ?? null,
      lastUpdatedTime: item.last_updated_time ?? null,
      incomeSources: sources.map((s) => this.mapBankIncomeSource(s)),
    };
  }

  /**
   * Map bank income source data
   */
  private mapBankIncomeSource(
    s: CreditBankIncomeSource,
  ): PlaidBankIncomeSource {
    return {
      incomeSourceId: s.income_source_id ?? null,
      incomeDescription: s.income_description ?? null,
      incomeCategory: (s.income_category as string) ?? null,
      accountId: s.account_id ?? null,
      startDate: s.start_date ?? null,
      endDate: s.end_date ?? null,
      payFrequency: (s.pay_frequency as string) ?? null,
      totalAmount: s.total_amount ?? null,
      transactionCount: s.transaction_count ?? null,
      currency: null,
    };
  }
}

// Export singleton instance
export const plaidIncomeService = new PlaidIncomeService();
export default plaidIncomeService;
