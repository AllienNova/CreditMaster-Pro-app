/**
 * Dispute Service
 *
 * Handles credit report dispute generation and tracking
 * Uses AI to generate personalized dispute letters
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();
import { getAIOrchestrator } from "@/lib/ai-orchestrator";
import type {
  DisputeItem,
  InaccuracyType,
  DisputeStrategy,
  StrategyRecommendation,
  LetterGenerationResponse,
} from "./types";

interface CreditAccountSnapshot {
  current_balance?: number;
  payment_status?: string;
  days_late?: number;
  [key: string]: unknown;
}

interface CreditInquirySnapshot {
  [key: string]: unknown;
}

interface CreditPublicRecordSnapshot {
  date_filed?: string;
  [key: string]: unknown;
}

interface CreditReportSnapshot {
  accounts?: CreditAccountSnapshot[];
  inquiries?: CreditInquirySnapshot[];
  public_records?: CreditPublicRecordSnapshot[];
}

interface DisputeInaccuracy {
  type: "account" | "inquiry" | "public_record";
  issues: string[];
  account?: CreditAccountSnapshot;
  inquiry?: CreditInquirySnapshot;
  record?: CreditPublicRecordSnapshot;
}

interface DisputeUserInfo {
  name?: string;
  address?: string;
  ssn?: string;
  accountNumber?: string;
}

/**
 * Dispute Service Class
 */
class DisputeService {
  /**
   * Scan credit report for inaccuracies
   */
  async scanForInaccuracies(
    creditReport: CreditReportSnapshot,
  ): Promise<DisputeInaccuracy[]> {
    const inaccuracies: DisputeInaccuracy[] = [];

    try {
      // Scan accounts for errors
      for (const account of creditReport.accounts || []) {
        // Check for common inaccuracies
        const issues = this.identifyAccountIssues(account);
        if (issues.length > 0) {
          inaccuracies.push({
            account,
            issues,
            type: "account",
          });
        }
      }

      // Scan inquiries
      for (const inquiry of creditReport.inquiries || []) {
        // Check if inquiry might be unauthorized
        if (this.isPotentiallyUnauthorized(inquiry)) {
          inaccuracies.push({
            inquiry,
            issues: ["potentially_unauthorized"],
            type: "inquiry",
          });
        }
      }

      // Scan public records
      for (const record of creditReport.public_records || []) {
        // Check if record is outdated or incorrect
        const issues = this.identifyRecordIssues(record);
        if (issues.length > 0) {
          inaccuracies.push({
            record,
            issues,
            type: "public_record",
          });
        }
      }

      return inaccuracies;
    } catch (_error) {
      // DisputeService error: Error scanning for inaccuracies
      return inaccuracies;
    }
  }

  /**
   * Select best dispute strategy for an item
   */
  async selectStrategy(
    _item: DisputeInaccuracy | DisputeItem,
    inaccuracyType: InaccuracyType,
  ): Promise<StrategyRecommendation> {
    // Strategy selection logic based on inaccuracy type
    const strategies: Record<InaccuracyType, StrategyRecommendation> = {
      not_mine: {
        strategy: "identity_theft",
        successRate: 85,
        timeline: "30-45 days",
        difficulty: "medium",
        legalBasis: "FCRA Section 611 - Identity theft protection",
        description:
          "Dispute account as not belonging to you, potentially identity theft",
        steps: [
          "File identity theft report with FTC",
          "Send dispute letter with police report",
          "Request fraud alert on credit reports",
          "Follow up after 30 days",
        ],
      },
      incorrect_balance: {
        strategy: "basic_dispute",
        successRate: 70,
        timeline: "30 days",
        difficulty: "easy",
        legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        description: "Dispute incorrect balance amount",
        steps: [
          "Gather proof of correct balance",
          "Send dispute letter to bureaus",
          "Include supporting documentation",
          "Wait 30 days for investigation",
        ],
      },
      incorrect_payment_history: {
        strategy: "method_of_verification",
        successRate: 65,
        timeline: "30-45 days",
        difficulty: "medium",
        legalBasis: "FCRA Section 611 - Method of verification",
        description: "Challenge how the bureau verified the payment history",
        steps: [
          "Request method of verification",
          "Challenge verification process",
          "Demand proof of accuracy",
          "Escalate if verification is weak",
        ],
      },
      incorrect_date: {
        strategy: "basic_dispute",
        successRate: 75,
        timeline: "30 days",
        difficulty: "easy",
        legalBasis: "FCRA Section 611 - Dispute of inaccurate information",
        description: "Dispute incorrect dates (opened, closed, last payment)",
        steps: [
          "Identify incorrect dates",
          "Provide correct dates with proof",
          "Send dispute letter",
          "Follow up after 30 days",
        ],
      },
      duplicate: {
        strategy: "basic_dispute",
        successRate: 90,
        timeline: "30 days",
        difficulty: "easy",
        legalBasis: "FCRA Section 611 - Duplicate reporting",
        description: "Dispute duplicate accounts",
        steps: [
          "Identify duplicate accounts",
          "Point out duplication in letter",
          "Request removal of duplicate",
          "Verify removal after 30 days",
        ],
      },
      outdated: {
        strategy: "statute_of_limitations",
        successRate: 95,
        timeline: "30 days",
        difficulty: "easy",
        legalBasis: "FCRA Section 605 - 7-year reporting limit",
        description: "Remove items past 7-year reporting limit",
        steps: [
          "Calculate reporting period",
          "Cite FCRA Section 605",
          "Demand immediate removal",
          "File CFPB complaint if not removed",
        ],
      },
      unauthorized_inquiry: {
        strategy: "basic_dispute",
        successRate: 50,
        timeline: "30 days",
        difficulty: "easy",
        legalBasis: "FCRA Section 604 - Permissible purposes",
        description: "Remove unauthorized hard inquiries",
        steps: [
          "Identify inquiries you didn't authorize",
          "Claim lack of authorization",
          "Request removal",
          "Follow up after 30 days",
        ],
      },
      identity_theft: {
        strategy: "identity_theft",
        successRate: 90,
        timeline: "30-45 days",
        difficulty: "medium",
        legalBasis: "FCRA Section 605B - Identity theft protection",
        description: "Remove fraudulent accounts due to identity theft",
        steps: [
          "File FTC identity theft report",
          "File police report",
          "Send identity theft affidavit",
          "Request fraud alert",
          "Follow up after 30 days",
        ],
      },
      mixed_file: {
        strategy: "mixed_file",
        successRate: 85,
        timeline: "30-45 days",
        difficulty: "medium",
        legalBasis: "FCRA Section 611 - Mixed file correction",
        description: "Correct mixed credit files",
        steps: [
          "Identify items belonging to someone else",
          "Provide proof of identity",
          "Request file separation",
          "Verify correction after 30 days",
        ],
      },
      other: {
        strategy: "basic_dispute",
        successRate: 60,
        timeline: "30 days",
        difficulty: "easy",
        legalBasis: "FCRA Section 611 - General dispute",
        description: "General dispute of inaccurate information",
        steps: [
          "Describe the inaccuracy",
          "Provide supporting evidence",
          "Request investigation",
          "Follow up after 30 days",
        ],
      },
    };

    return strategies[inaccuracyType] || strategies.other;
  }

  /**
   * Generate dispute letter using AI
   */
  async generateDisputeLetter(
    item: DisputeInaccuracy | DisputeItem,
    strategy: DisputeStrategy,
    inaccuracyType: InaccuracyType,
    userInfo: DisputeUserInfo,
  ): Promise<LetterGenerationResponse> {
    try {
      // Generate letter using AI
      const orchestrator = getAIOrchestrator();
      const creditReportPayload = JSON.parse(JSON.stringify(item)) as Record<
        string,
        unknown
      >;
      const letter = await orchestrator.generateDispute({
        creditReport: creditReportPayload,
        disputeReason: inaccuracyType,
        userInfo: {
          name: userInfo.name || "User",
          address: userInfo.address || "",
          ssn: userInfo.ssn,
          accountNumber: userInfo.accountNumber,
        },
        additionalContext: `Strategy: ${strategy}`,
      });

      // Generate tips
      const tips = this.generateDisputeTips(strategy, inaccuracyType);

      // Calculate follow-up date (30 days from now)
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 30);

      return {
        letter,
        subject: `Dispute of Inaccurate Information - ${userInfo.name}`,
        tips,
        followUpDate,
      };
    } catch (error) {
      // DisputeService error: Error generating dispute letter
      throw error;
    }
  }

  /**
   * Track dispute status
   */
  async trackDispute(
    disputeId: string,
    userId: string,
  ): Promise<DisputeItem | null> {
    try {
      // The user_id filter is load-bearing: this runs on the service role,
      // which bypasses RLS. Scoped now rather than annotated because nothing
      // calls this yet — the moment something does, it would have been an
      // IDOR returning any user's full dispute row.
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      return data as DisputeItem;
    } catch (_error) {
      // DisputeService error: Error tracking dispute
      return null;
    }
  }

  /**
   * Generate CFPB complaint (escalation)
   */
  async generateCFPBComplaint(dispute: DisputeItem): Promise<string> {
    try {
      const complaint = `
CONSUMER FINANCIAL PROTECTION BUREAU COMPLAINT

Date: ${new Date().toLocaleDateString()}

Consumer Information:
[User information would be inserted here]

Company: ${dispute.bureau === "experian" ? "Experian" : dispute.bureau === "equifax" ? "Equifax" : "TransUnion"}

Issue: Credit Reporting - Incorrect information on credit report

Description:
I filed a dispute with ${dispute.bureau} on ${dispute.filedAt?.toLocaleDateString()} regarding ${dispute.itemDescription}.

The bureau has failed to properly investigate and correct this inaccurate information within the required 30-day period as mandated by the Fair Credit Reporting Act (FCRA) Section 611.

[Additional details would be inserted here]

Desired Resolution:
I request that the Consumer Financial Protection Bureau investigate this matter and ensure that ${dispute.bureau} complies with FCRA requirements by:
1. Properly investigating the disputed item
2. Correcting or removing the inaccurate information
3. Providing me with written results of the investigation

I am prepared to provide any additional documentation necessary to support my complaint.

Sincerely,
[User signature]
      `.trim();

      return complaint;
    } catch (error) {
      // DisputeService error: Error generating CFPB complaint
      throw error;
    }
  }

  // Private helper methods

  private identifyAccountIssues(account: CreditAccountSnapshot): string[] {
    const issues: string[] = [];

    // Check for common issues
    if ((account.current_balance ?? 0) < 0) {
      issues.push("negative_balance");
    }

    if (account.payment_status === "late" && (account.days_late ?? 0) === 0) {
      issues.push("incorrect_late_payment");
    }

    // Add more checks...

    return issues;
  }

  private isPotentiallyUnauthorized(inquiry: CreditInquirySnapshot): boolean {
    void inquiry;
    // Logic to determine if inquiry might be unauthorized
    // For now, return false (would need more sophisticated logic)
    return false;
  }

  private identifyRecordIssues(record: CreditPublicRecordSnapshot): string[] {
    const issues: string[] = [];

    // Check if record is past 7-year limit
    if (record.date_filed) {
      const age =
        (Date.now() - new Date(record.date_filed).getTime()) /
        (1000 * 60 * 60 * 24 * 365);
      if (age > 7) {
        issues.push("outdated");
      }
    }

    return issues;
  }

  private createDisputePrompt(
    item: DisputeInaccuracy | DisputeItem,
    strategy: DisputeStrategy,
    inaccuracyType: InaccuracyType,
    userInfo: DisputeUserInfo,
  ): string {
    return `Generate a professional dispute letter for the following:
    
Item: ${JSON.stringify(item)}
Strategy: ${strategy}
Inaccuracy Type: ${inaccuracyType}
User: ${userInfo.name}

The letter should be professional, cite relevant FCRA sections, and clearly explain the inaccuracy.`;
  }

  private generateDisputeTips(
    strategy: DisputeStrategy,
    inaccuracyType: InaccuracyType,
  ): string[] {
    void strategy;
    void inaccuracyType;
    return [
      "Send via certified mail with return receipt",
      "Keep copies of all correspondence",
      "Follow up after 30 days if no response",
      "Document everything",
      "Be persistent but professional",
    ];
  }
}

// Export singleton instance
export const disputeService = new DisputeService();
export default disputeService;
