/**
 * Mock Credit Bureau Adapter
 *
 * Implements the CreditBureauAdapter interface with realistic mock data.
 * Used for development, testing, and as a graceful fallback when a live
 * bureau API is unavailable.
 */

import type {
  BureauResponse,
  CreditBureauAdapter,
  CreditReport,
  CreditReportRequest,
  DisputeSubmission,
  UserPII,
  Bureau,
  CreditAccount,
  CreditInquiry,
  PublicRecord,
} from "./types";

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateMockAccounts(count: number): CreditAccount[] {
  const accountTypes: CreditAccount["account_type"][] = [
    "credit_card",
    "mortgage",
    "auto_loan",
    "student_loan",
    "personal_loan",
    "other",
  ];
  const statuses: CreditAccount["payment_status"][] = [
    "current",
    "current",
    "current",
    "current",
    "late",
    "closed",
  ];

  return Array.from({ length: count }, (_, i) => {
    const accountType = randomChoice(accountTypes);
    const creditLimit =
      accountType === "credit_card"
        ? randomInt(1000, 50000)
        : accountType === "mortgage"
          ? randomInt(100000, 500000)
          : randomInt(5000, 30000);
    const balance = randomInt(0, Math.floor(creditLimit * 0.8));

    return {
      id: `mock_acc_${i}_${Date.now()}`,
      account_number: `****${randomInt(1000, 9999)}`,
      account_type: accountType,
      creditor_name: randomChoice([
        "Chase Bank",
        "Bank of America",
        "Wells Fargo",
        "Capital One",
        "Discover",
        "Citi",
        "US Bank",
        "American Express",
      ]),
      balance,
      credit_limit: creditLimit,
      payment_status: randomChoice(statuses),
      opened_date: `${randomInt(2015, 2024)}-${String(randomInt(1, 12)).padStart(2, "0")}-01`,
      last_payment_date: `2026-${String(randomInt(1, 2)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`,
      payment_history: Array.from({ length: 12 }, (__, m) => ({
        month: `2025-${String(m + 1).padStart(2, "0")}`,
        status: randomChoice(["OK", "OK", "OK", "OK", "30", "NA"]) as
          | "OK"
          | "30"
          | "60"
          | "90"
          | "120"
          | "CO"
          | "NA",
      })),
    };
  });
}

function generateMockInquiries(count: number): CreditInquiry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock_inq_${i}_${Date.now()}`,
    inquiry_date: `2026-${String(randomInt(1, 2)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`,
    creditor_name: randomChoice([
      "Auto Dealer Inc",
      "Mortgage Lender Co",
      "Credit Card Company",
      "Insurance Provider",
      "Rental Agency",
    ]),
    inquiry_type: randomChoice(["hard", "soft"]) as "hard" | "soft",
  }));
}

function generateMockPublicRecords(count: number): PublicRecord[] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => ({
    id: `mock_pr_${i}_${Date.now()}`,
    record_type: randomChoice([
      "bankruptcy",
      "tax_lien",
      "judgment",
      "foreclosure",
    ]) as PublicRecord["record_type"],
    filing_date: `${randomInt(2020, 2025)}-${String(randomInt(1, 12)).padStart(2, "0")}-01`,
    status: randomChoice(["filed", "discharged", "satisfied", "dismissed"]) as
      | "filed"
      | "discharged"
      | "satisfied"
      | "dismissed",
    amount: randomInt(1000, 50000),
    court_name: randomChoice([
      "District Court",
      "Superior Court",
      "Federal Court",
    ]),
  }));
}

// ---------------------------------------------------------------------------
// MockCreditBureauAdapter
// ---------------------------------------------------------------------------

export interface MockAdapterOptions {
  /** Override the bureau name to simulate. Defaults to the request's bureau. */
  simulatedBureau?: Bureau;
  /** Base credit score to return (randomized +/- 20). Defaults to 720. */
  baseScore?: number;
  /** Number of accounts to generate. Defaults to 5. */
  accountCount?: number;
  /** Number of inquiries to generate. Defaults to 3. */
  inquiryCount?: number;
  /** Number of public records to generate. Defaults to 0. */
  publicRecordCount?: number;
  /** Simulated latency in milliseconds. Defaults to 0. */
  latencyMs?: number;
  /** Force an error response (useful for testing error handling). */
  forceError?: string;
}

export class MockCreditBureauAdapter implements CreditBureauAdapter {
  readonly bureau: Bureau | "mock" = "mock";
  private options: MockAdapterOptions;

  constructor(options: MockAdapterOptions = {}) {
    this.options = options;
  }

  async getCreditReport(
    request: CreditReportRequest,
    _userPII: UserPII,
  ): Promise<BureauResponse<CreditReport>> {
    // Simulate latency
    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.options.latencyMs),
      );
    }

    // Simulate error
    if (this.options.forceError) {
      return {
        success: false,
        error: this.options.forceError,
        bureau: this.options.simulatedBureau ?? request.bureau,
        timestamp: new Date().toISOString(),
      };
    }

    const bureau = this.options.simulatedBureau ?? request.bureau;
    const baseScore = this.options.baseScore ?? 720;
    const score = Math.max(
      300,
      Math.min(850, baseScore + randomInt(-20, 20)),
    );

    const report: CreditReport = {
      id: `mock_${bureau}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: request.user_id,
      bureau,
      credit_score: score,
      report_date: new Date().toISOString(),
      accounts: generateMockAccounts(this.options.accountCount ?? 5),
      inquiries: generateMockInquiries(this.options.inquiryCount ?? 3),
      public_records: generateMockPublicRecords(
        this.options.publicRecordCount ?? 0,
      ),
      raw_data: { source: "mock_adapter", generated_at: new Date().toISOString() },
      created_at: new Date().toISOString(),
    };

    return {
      success: true,
      data: report,
      bureau,
      timestamp: new Date().toISOString(),
      reference_id: `mock_ref_${Date.now()}`,
    };
  }

  async submitDispute(
    dispute: DisputeSubmission,
    _userPII: UserPII,
  ): Promise<BureauResponse> {
    // Simulate latency
    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.options.latencyMs),
      );
    }

    // Simulate error
    if (this.options.forceError) {
      return {
        success: false,
        error: this.options.forceError,
        bureau: this.options.simulatedBureau ?? dispute.bureau,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: {
        disputeId: `mock_dispute_${Date.now()}`,
        status: "submitted",
        estimatedResolutionDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      bureau: this.options.simulatedBureau ?? dispute.bureau,
      timestamp: new Date().toISOString(),
      reference_id: `mock_disp_ref_${Date.now()}`,
    };
  }
}

export default MockCreditBureauAdapter;
