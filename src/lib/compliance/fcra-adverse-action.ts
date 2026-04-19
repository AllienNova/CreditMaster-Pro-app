/**
 * FCRA Adverse Action Notice Service (Section 615)
 *
 * When a consumer is denied credit, insurance, employment, or other benefits
 * based in whole or in part on information in a consumer report, the entity
 * taking the adverse action must provide notice including:
 *
 * 1. The name, address, and phone number of the credit bureau that supplied the report
 * 2. A statement that the bureau did not make the decision and cannot explain why
 * 3. The consumer's right to obtain a free copy of the report within 60 days
 * 4. The consumer's right to dispute the accuracy of the report
 *
 * This service generates and delivers compliant adverse action notices.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

export interface CreditBureauInfo {
  name: string;
  address: string;
  phone: string;
  website: string;
}

export const CREDIT_BUREAUS: Record<string, CreditBureauInfo> = {
  equifax: {
    name: "Equifax Information Services LLC",
    address: "P.O. Box 740256, Atlanta, GA 30374",
    phone: "1-800-685-1111",
    website: "www.equifax.com",
  },
  experian: {
    name: "Experian",
    address: "P.O. Box 4500, Allen, TX 75013",
    phone: "1-888-397-3742",
    website: "www.experian.com",
  },
  transunion: {
    name: "TransUnion LLC",
    address: "P.O. Box 1000, Chester, PA 19016",
    phone: "1-800-916-8800",
    website: "www.transunion.com",
  },
};

export type AdverseActionReason =
  | "insufficient_credit_history"
  | "high_debt_to_income"
  | "delinquent_accounts"
  | "too_many_inquiries"
  | "low_credit_score"
  | "collections_on_record"
  | "bankruptcy_on_record"
  | "insufficient_income"
  | "other";

export interface AdverseActionNotice {
  id: string;
  userId: string;
  action: string;
  reasons: AdverseActionReason[];
  creditScoreUsed?: number;
  creditScoreRange?: { min: number; max: number };
  bureauUsed: string;
  bureauInfo: CreditBureauInfo;
  noticeDate: Date;
  freeReportDeadline: Date;
  deliveredAt?: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = { from: (table: string) => any; auth?: any };

export class FCRAAdverseActionService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dbClient: DbClient;

  constructor(dbClient?: DbClient) {
    this.dbClient = dbClient ?? (supabaseAdmin as DbClient);
  }

  /**
   * Generate an FCRA-compliant adverse action notice (Section 615).
   * Call this whenever a user is denied or downgraded based on credit data.
   */
  async createNotice(params: {
    userId: string;
    action: string;
    reasons: AdverseActionReason[];
    creditScoreUsed?: number;
    creditScoreRange?: { min: number; max: number };
    bureauUsed: keyof typeof CREDIT_BUREAUS;
  }): Promise<AdverseActionNotice> {
    const bureauInfo = CREDIT_BUREAUS[params.bureauUsed];
    if (!bureauInfo) {
      throw new Error(`Unknown credit bureau: ${params.bureauUsed}`);
    }

    const noticeDate = new Date();
    const freeReportDeadline = new Date(noticeDate);
    freeReportDeadline.setDate(freeReportDeadline.getDate() + 60);

    const noticeId = `aan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const notice: AdverseActionNotice = {
      id: noticeId,
      userId: params.userId,
      action: params.action,
      reasons: params.reasons,
      creditScoreUsed: params.creditScoreUsed,
      creditScoreRange: params.creditScoreRange,
      bureauUsed: params.bureauUsed,
      bureauInfo,
      noticeDate,
      freeReportDeadline,
    };

    await this.dbClient.from("adverse_action_notices").insert({
      id: notice.id,
      user_id: notice.userId,
      action: notice.action,
      reasons: notice.reasons,
      credit_score_used: notice.creditScoreUsed,
      credit_score_range: notice.creditScoreRange,
      bureau_used: notice.bureauUsed,
      notice_date: notice.noticeDate.toISOString(),
      free_report_deadline: notice.freeReportDeadline.toISOString(),
      created_at: new Date().toISOString(),
    });

    await this.dbClient.from("audit_logs").insert({
      user_id: params.userId,
      action: "fcra_adverse_action_notice",
      details: {
        notice_id: noticeId,
        adverse_action: params.action,
        bureau: params.bureauUsed,
      },
      created_at: new Date().toISOString(),
    });

    return notice;
  }

  /**
   * Format the adverse action notice as a user-facing text notice.
   */
  formatNotice(notice: AdverseActionNotice): string {
    const reasonDescriptions: Record<AdverseActionReason, string> = {
      insufficient_credit_history: "Insufficient credit history",
      high_debt_to_income: "High debt-to-income ratio",
      delinquent_accounts: "Delinquent accounts on credit report",
      too_many_inquiries: "Too many recent credit inquiries",
      low_credit_score: "Credit score did not meet minimum requirements",
      collections_on_record: "Collection accounts on credit report",
      bankruptcy_on_record: "Bankruptcy on credit report",
      insufficient_income: "Insufficient income for requested product",
      other: "Other factors in credit report",
    };

    const lines: string[] = [
      "ADVERSE ACTION NOTICE",
      `Date: ${notice.noticeDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      `Action Taken: ${notice.action}`,
      "",
      "Reason(s) for this decision:",
      ...notice.reasons.map(
        (r, i) => `  ${i + 1}. ${reasonDescriptions[r]}`,
      ),
      "",
    ];

    if (notice.creditScoreUsed !== undefined) {
      lines.push(`Credit score used in this decision: ${notice.creditScoreUsed}`);
      if (notice.creditScoreRange) {
        lines.push(
          `Score range: ${notice.creditScoreRange.min} - ${notice.creditScoreRange.max}`,
        );
      }
      lines.push("");
    }

    lines.push(
      "This decision was based in whole or in part on information obtained from:",
      `  ${notice.bureauInfo.name}`,
      `  ${notice.bureauInfo.address}`,
      `  Phone: ${notice.bureauInfo.phone}`,
      "",
      "IMPORTANT RIGHTS UNDER THE FAIR CREDIT REPORTING ACT:",
      "",
      `The credit bureau listed above did not make this decision and is unable to explain why this decision was made.`,
      "",
      `You have the right to obtain a free copy of your credit report from the bureau listed above within 60 days of this notice (by ${notice.freeReportDeadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}).`,
      "",
      "You have the right to dispute the accuracy or completeness of any information in your credit report. The credit bureau must investigate your dispute within 30 days.",
      "",
      "You may also contact the Federal Trade Commission (FTC) at www.ftc.gov or 1-877-382-4357 for information about your rights.",
    );

    return lines.join("\n");
  }

  /**
   * Retrieve all adverse action notices for a user.
   */
  async getNoticesForUser(userId: string): Promise<AdverseActionNotice[]> {
    const { data } = await this.dbClient
      .from("adverse_action_notices")
      .select("*")
      .eq("user_id", userId)
      .order("notice_date", { ascending: false });

    return (data ?? []).map((n: Record<string, unknown>) => ({
      id: n.id as string,
      userId: n.user_id as string,
      action: n.action as string,
      reasons: n.reasons as AdverseActionReason[],
      creditScoreUsed: n.credit_score_used as number | undefined,
      creditScoreRange: n.credit_score_range as
        | { min: number; max: number }
        | undefined,
      bureauUsed: n.bureau_used as string,
      bureauInfo: CREDIT_BUREAUS[n.bureau_used as string] ?? CREDIT_BUREAUS.equifax,
      noticeDate: new Date(n.notice_date as string),
      freeReportDeadline: new Date(n.free_report_deadline as string),
      deliveredAt: n.delivered_at ? new Date(n.delivered_at as string) : undefined,
    }));
  }
}

export const adverseActionService = new FCRAAdverseActionService();
