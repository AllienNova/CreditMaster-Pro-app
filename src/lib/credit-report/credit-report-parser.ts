/**
 * Credit Report Parser Service
 * Parses credit reports from Experian, Equifax, and TransUnion
 */

export type Bureau = "experian" | "equifax" | "transunion";

export interface CreditAccount {
  accountName: string;
  accountNumber: string;
  accountType:
    | "credit_card"
    | "mortgage"
    | "auto_loan"
    | "student_loan"
    | "personal_loan"
    | "collection"
    | "other";
  balance: number;
  creditLimit?: number;
  paymentStatus:
    | "current"
    | "late_30"
    | "late_60"
    | "late_90"
    | "late_120"
    | "collection"
    | "charge_off";
  openDate: string;
  lastReportedDate: string;
  monthlyPayment?: number;
  highBalance?: number;
}

export interface CreditInquiry {
  creditorName: string;
  inquiryDate: string;
  inquiryType: "hard" | "soft";
}

export interface PublicRecord {
  type: "bankruptcy" | "tax_lien" | "civil_judgment" | "foreclosure";
  filedDate: string;
  status: string;
  amount?: number;
}

export interface ParsedCreditReport {
  bureau: Bureau;
  reportDate: string;
  personalInfo: {
    name: string;
    addresses: string[];
    employers: string[];
    ssn?: string;
  };
  creditScore?: number;
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  publicRecords: PublicRecord[];
  collections: CreditAccount[];
  disputeableItems: DisputeableItem[];
}

export interface DisputeableItem {
  itemId: string;
  type:
    | "late_payment"
    | "collection"
    | "inquiry"
    | "balance_error"
    | "account_not_mine"
    | "duplicate"
    | "outdated";
  description: string;
  bureau: Bureau;
  severity: "high" | "medium" | "low";
  estimatedScoreImpact: number;
  recommendedAction: string;
}

export class CreditReportParser {
  /**
   * Parse a credit report from text content
   */
  async parseReport(
    content: string,
    bureau: Bureau,
  ): Promise<ParsedCreditReport> {
    // Detect bureau if not specified
    const detectedBureau = bureau || this.detectBureau(content);

    switch (detectedBureau) {
      case "experian":
        return this.parseExperianReport(content);
      case "equifax":
        return this.parseEquifaxReport(content);
      case "transunion":
        return this.parseTransUnionReport(content);
      default:
        return this.parseGenericReport(content, detectedBureau);
    }
  }

  private detectBureau(content: string): Bureau {
    const lower = content.toLowerCase();
    if (lower.includes("experian")) return "experian";
    if (lower.includes("equifax")) return "equifax";
    if (lower.includes("transunion")) return "transunion";
    return "experian"; // Default
  }

  private parseExperianReport(content: string): ParsedCreditReport {
    return this.createMockParsedReport("experian", content);
  }

  private parseEquifaxReport(content: string): ParsedCreditReport {
    return this.createMockParsedReport("equifax", content);
  }

  private parseTransUnionReport(content: string): ParsedCreditReport {
    return this.createMockParsedReport("transunion", content);
  }

  private parseGenericReport(
    content: string,
    bureau: Bureau,
  ): ParsedCreditReport {
    return this.createMockParsedReport(bureau, content);
  }

  private createMockParsedReport(
    bureau: Bureau,
    _content: string,
  ): ParsedCreditReport {
    return {
      bureau,
      reportDate: new Date().toISOString(),
      personalInfo: { name: "User", addresses: [], employers: [] },
      creditScore: 680,
      accounts: [],
      inquiries: [],
      publicRecords: [],
      collections: [],
      disputeableItems: [],
    };
  }

  /**
   * Identify items that can be disputed
   */
  identifyDisputeableItems(report: ParsedCreditReport): DisputeableItem[] {
    const items: DisputeableItem[] = [];

    // Check for late payments
    report.accounts.forEach((account, index) => {
      if (
        ["late_30", "late_60", "late_90", "late_120"].includes(
          account.paymentStatus,
        )
      ) {
        items.push({
          itemId: `late-${index}`,
          type: "late_payment",
          description: `Late payment on ${account.accountName}`,
          bureau: report.bureau,
          severity: account.paymentStatus === "late_120" ? "high" : "medium",
          estimatedScoreImpact: account.paymentStatus === "late_120" ? 50 : 30,
          recommendedAction: "Send goodwill letter requesting removal",
        });
      }
    });

    // Check for collections
    report.collections.forEach((collection, index) => {
      items.push({
        itemId: `collection-${index}`,
        type: "collection",
        description: `Collection account: ${collection.accountName}`,
        bureau: report.bureau,
        severity: "high",
        estimatedScoreImpact: 80,
        recommendedAction: "Request debt validation or pay-for-delete",
      });
    });

    return items;
  }
}

export const creditReportParser = new CreditReportParser();
