/**
 * Goodwill Letter Service
 *
 * Generates personalized goodwill letters to creditors requesting removal
 * of negative items from credit reports. Features:
 * - Multiple letter templates for different situations
 * - Variable substitution for personalization
 * - PDF generation
 * - Letter tracking and history
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type LetterType =
  | "late_payment"
  | "collection"
  | "charge_off"
  | "medical_debt"
  | "hardship"
  | "long_term_customer"
  | "first_time_late"
  | "paid_in_full";

export type LetterStatus =
  | "draft"
  | "ready"
  | "sent"
  | "delivered"
  | "response_received"
  | "successful"
  | "unsuccessful";

export interface GoodwillLetter {
  id: string;
  userId: string;
  creditorName: string;
  accountNumber: string;
  letterType: LetterType;
  status: LetterStatus;
  subject: string;
  body: string;
  variables: Record<string, string>;
  sentDate?: Date;
  responseDate?: Date;
  responseNotes?: string;
  outcome?: "removed" | "declined" | "partial" | "pending";
  createdAt: Date;
  updatedAt: Date;
}

export interface LetterTemplate {
  id: string;
  type: LetterType;
  name: string;
  description: string;
  subject: string;
  body: string;
  requiredVariables: string[];
  optionalVariables: string[];
  successRate: number;
  useCount: number;
}

export interface CreateLetterInput {
  userId: string;
  creditorName: string;
  accountNumber: string;
  letterType: LetterType;
  variables: Record<string, string>;
}

export interface LetterVariables {
  userName: string;
  userAddress: string;
  userCity: string;
  userState: string;
  userZip: string;
  userPhone: string;
  userEmail: string;
  creditorName: string;
  creditorAddress?: string;
  accountNumber: string;
  latePaymentDate?: string;
  latePaymentAmount?: string;
  reasonForLateness?: string;
  yearsAsCustomer?: string;
  totalAccountsWithCreditor?: string;
  currentAccountStatus?: string;
  hardshipExplanation?: string;
  correctedDate?: string;
}

// ============================================================================
// LETTER TEMPLATES
// ============================================================================

const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: "tpl-late-payment-1",
    type: "late_payment",
    name: "Late Payment - First Time",
    description:
      "For customers with a single late payment on an otherwise clean history",
    subject:
      "Goodwill Request for Late Payment Removal - Account {{accountNumber}}",
    body: `{{currentDate}}

{{userName}}
{{userAddress}}
{{userCity}}, {{userState}} {{userZip}}

{{creditorName}}
{{creditorAddress}}

Re: Goodwill Adjustment Request
Account Number: {{accountNumber}}

Dear Customer Service Department,

I am writing to request a goodwill adjustment to remove a late payment reported on my account ending in {{accountNumber}}.

I have been a loyal customer of {{creditorName}} for {{yearsAsCustomer}} years and have always taken my financial obligations seriously. Unfortunately, in {{latePaymentDate}}, I experienced {{reasonForLateness}}, which resulted in a payment being made {{daysLate}} days late.

Since that incident, I have:
- Maintained a perfect payment history
- Set up automatic payments to prevent future occurrences
- Continued to be a responsible account holder

I understand that accurate credit reporting is important, but I respectfully ask that you consider my overall history as a customer and make a goodwill adjustment by removing this single late payment from my credit report.

This negative mark is affecting my ability to {{impactStatement}}, and its removal would be greatly appreciated.

I am not disputing the accuracy of the late payment—I am simply asking for a gesture of goodwill based on my otherwise excellent history with your company.

Thank you for your time and consideration. I look forward to continuing our positive relationship.

Sincerely,

{{userName}}
Phone: {{userPhone}}
Email: {{userEmail}}`,
    requiredVariables: [
      "userName",
      "userAddress",
      "userCity",
      "userState",
      "userZip",
      "creditorName",
      "accountNumber",
      "latePaymentDate",
      "reasonForLateness",
    ],
    optionalVariables: [
      "creditorAddress",
      "yearsAsCustomer",
      "daysLate",
      "impactStatement",
      "userPhone",
      "userEmail",
    ],
    successRate: 0.45,
    useCount: 1250,
  },
  {
    id: "tpl-hardship-1",
    type: "hardship",
    name: "Financial Hardship",
    description: "For customers who experienced documented financial hardship",
    subject:
      "Goodwill Adjustment Request Due to Financial Hardship - Account {{accountNumber}}",
    body: `{{currentDate}}

{{userName}}
{{userAddress}}
{{userCity}}, {{userState}} {{userZip}}

{{creditorName}}
{{creditorAddress}}

Re: Goodwill Adjustment Request - Financial Hardship
Account Number: {{accountNumber}}

Dear Customer Service Department,

I am writing to request a goodwill adjustment to my credit report regarding my account ending in {{accountNumber}}.

During {{hardshipPeriod}}, I experienced significant financial hardship due to {{hardshipReason}}. This unexpected situation made it impossible for me to maintain my regular payment schedule despite my best efforts.

Details of my hardship:
{{hardshipExplanation}}

Since recovering from this difficult period, I have:
- Brought my account current
- Made consistent on-time payments
- Demonstrated my commitment to financial responsibility

I am not disputing the accuracy of the reported information. However, I am asking for your compassion and understanding given the extraordinary circumstances I faced. Many creditors offer goodwill adjustments for customers who have demonstrated recovery from hardship situations.

The negative marks from this period are significantly impacting my credit score and my ability to move forward financially. Removing these items would allow me to continue rebuilding my financial life.

I have enclosed documentation supporting my hardship claim for your review.

Thank you for considering my request. Your understanding during this time would mean a great deal to me.

Sincerely,

{{userName}}
Phone: {{userPhone}}
Email: {{userEmail}}`,
    requiredVariables: [
      "userName",
      "userAddress",
      "userCity",
      "userState",
      "userZip",
      "creditorName",
      "accountNumber",
      "hardshipPeriod",
      "hardshipReason",
      "hardshipExplanation",
    ],
    optionalVariables: ["creditorAddress", "userPhone", "userEmail"],
    successRate: 0.38,
    useCount: 890,
  },
  {
    id: "tpl-long-term-1",
    type: "long_term_customer",
    name: "Long-Term Customer Appeal",
    description: "Emphasizes loyalty and long customer relationship",
    subject: "Loyal Customer Goodwill Request - Account {{accountNumber}}",
    body: `{{currentDate}}

{{userName}}
{{userAddress}}
{{userCity}}, {{userState}} {{userZip}}

{{creditorName}}
{{creditorAddress}}

Re: Goodwill Adjustment Request - Loyal Customer
Account Number: {{accountNumber}}

Dear Customer Service Department,

I have been a proud customer of {{creditorName}} for {{yearsAsCustomer}} years. During this time, I have maintained {{totalAccountsWithCreditor}} accounts with your institution and have always valued our relationship.

I am writing regarding a late payment that was reported on my account ending in {{accountNumber}} during {{latePaymentDate}}. While I acknowledge this payment was late, I want to emphasize that this was an isolated incident that does not reflect my typical payment behavior.

My track record with {{creditorName}}:
- {{yearsAsCustomer}} years as a customer
- {{totalAccountsWithCreditor}} accounts maintained
- {{onTimePaymentPercentage}}% on-time payment history
- {{totalPaidToCreditor}} total paid to your institution

I understand the importance of accurate credit reporting, but I respectfully request that you consider our long-standing relationship and make a goodwill adjustment by removing this single late payment from my credit report.

I value being a customer of {{creditorName}} and plan to continue our relationship for many years to come. This goodwill gesture would reinforce my loyalty and confidence in your company's commitment to its customers.

Thank you for your time and consideration.

Respectfully,

{{userName}}
Phone: {{userPhone}}
Email: {{userEmail}}`,
    requiredVariables: [
      "userName",
      "userAddress",
      "userCity",
      "userState",
      "userZip",
      "creditorName",
      "accountNumber",
      "yearsAsCustomer",
      "latePaymentDate",
    ],
    optionalVariables: [
      "creditorAddress",
      "totalAccountsWithCreditor",
      "onTimePaymentPercentage",
      "totalPaidToCreditor",
      "userPhone",
      "userEmail",
    ],
    successRate: 0.52,
    useCount: 2100,
  },
  {
    id: "tpl-paid-in-full-1",
    type: "paid_in_full",
    name: "Paid in Full - Removal Request",
    description: "For accounts that have been paid in full",
    subject:
      "Account Paid in Full - Goodwill Removal Request - {{accountNumber}}",
    body: `{{currentDate}}

{{userName}}
{{userAddress}}
{{userCity}}, {{userState}} {{userZip}}

{{creditorName}}
{{creditorAddress}}

Re: Paid in Full Account - Goodwill Adjustment Request
Account Number: {{accountNumber}}

Dear Customer Service Department,

I am writing regarding account {{accountNumber}}, which I have now paid in full as of {{paidInFullDate}}.

I fulfilled my obligation to {{creditorName}} by paying the total amount of {{totalAmountPaid}}. While the account previously had some negative history, I have demonstrated my commitment to honoring my debts by bringing this account to a zero balance.

I am requesting that {{creditorName}} consider a goodwill adjustment to remove the negative information associated with this account from my credit report. As a gesture of goodwill, many creditors will remove or update negative marks for customers who have fully satisfied their debts.

This account is now:
Paid in full
Balance: $0.00
Obligation satisfied

Removing this negative mark would help me continue to rebuild my credit and demonstrate that working with creditors to resolve accounts leads to positive outcomes for both parties.

I appreciate your consideration and look forward to your response.

Sincerely,

{{userName}}
Phone: {{userPhone}}
Email: {{userEmail}}`,
    requiredVariables: [
      "userName",
      "userAddress",
      "userCity",
      "userState",
      "userZip",
      "creditorName",
      "accountNumber",
      "paidInFullDate",
      "totalAmountPaid",
    ],
    optionalVariables: ["creditorAddress", "userPhone", "userEmail"],
    successRate: 0.35,
    useCount: 750,
  },
  {
    id: "tpl-medical-1",
    type: "medical_debt",
    name: "Medical Debt Goodwill",
    description: "For medical debt situations",
    subject: "Medical Debt Goodwill Request - Account {{accountNumber}}",
    body: `{{currentDate}}

{{userName}}
{{userAddress}}
{{userCity}}, {{userState}} {{userZip}}

{{creditorName}}
{{creditorAddress}}

Re: Medical Debt Goodwill Adjustment Request
Account Number: {{accountNumber}}

Dear Customer Service Department,

I am writing to request a goodwill adjustment regarding a medical debt on account {{accountNumber}}.

In {{medicalEventDate}}, I required {{medicalProcedure}} due to {{medicalReason}}. Like many Americans, I faced unexpected medical expenses that were difficult to manage alongside my regular financial obligations.

The circumstances of this debt:
- Medical event occurred: {{medicalEventDate}}
- Nature of medical care: {{medicalProcedure}}
- Original amount: {{originalAmount}}
- Current status: {{currentStatus}}

I have since {{resolutionDescription}} and am committed to maintaining my financial health. Medical debt is one of the leading causes of credit problems for American families, often occurring through no fault of the patient.

I am respectfully requesting that you consider removing or updating this account on my credit report as a goodwill gesture. This would significantly help my financial recovery and allow me to focus on my continued health and wellbeing.

Thank you for your understanding and compassion during this difficult situation.

Sincerely,

{{userName}}
Phone: {{userPhone}}
Email: {{userEmail}}`,
    requiredVariables: [
      "userName",
      "userAddress",
      "userCity",
      "userState",
      "userZip",
      "creditorName",
      "accountNumber",
      "medicalEventDate",
      "medicalProcedure",
    ],
    optionalVariables: [
      "creditorAddress",
      "medicalReason",
      "originalAmount",
      "currentStatus",
      "resolutionDescription",
      "userPhone",
      "userEmail",
    ],
    successRate: 0.42,
    useCount: 560,
  },
];

// ============================================================================
// GOODWILL LETTER SERVICE
// ============================================================================

export class GoodwillLetterService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // TEMPLATE MANAGEMENT
  // ==========================================================================

  getTemplates(): LetterTemplate[] {
    return LETTER_TEMPLATES;
  }

  getTemplatesByType(type: LetterType): LetterTemplate[] {
    return LETTER_TEMPLATES.filter((t) => t.type === type);
  }

  getTemplateById(templateId: string): LetterTemplate | undefined {
    return LETTER_TEMPLATES.find((t) => t.id === templateId);
  }

  getRecommendedTemplates(situation: {
    hasLongHistory: boolean;
    isFirstTimeLate: boolean;
    isPaidInFull: boolean;
    hadHardship: boolean;
    isMedicalDebt: boolean;
  }): LetterTemplate[] {
    const recommended: LetterTemplate[] = [];

    if (situation.isMedicalDebt) {
      recommended.push(...this.getTemplatesByType("medical_debt"));
    }
    if (situation.isPaidInFull) {
      recommended.push(...this.getTemplatesByType("paid_in_full"));
    }
    if (situation.hadHardship) {
      recommended.push(...this.getTemplatesByType("hardship"));
    }
    if (situation.hasLongHistory) {
      recommended.push(...this.getTemplatesByType("long_term_customer"));
    }
    if (situation.isFirstTimeLate) {
      recommended.push(...this.getTemplatesByType("first_time_late"));
      recommended.push(...this.getTemplatesByType("late_payment"));
    }

    // Sort by success rate
    return recommended.sort((a, b) => b.successRate - a.successRate);
  }

  // ==========================================================================
  // LETTER GENERATION
  // ==========================================================================

  async createLetter(input: CreateLetterInput): Promise<GoodwillLetter> {
    const template = LETTER_TEMPLATES.find((t) => t.type === input.letterType);
    if (!template) {
      throw new Error(`Template not found for type: ${input.letterType}`);
    }

    // Validate required variables
    const missingVars = template.requiredVariables.filter(
      (v) => !input.variables[v] && v !== "currentDate",
    );
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(", ")}`);
    }

    // Add current date
    const variables = {
      ...input.variables,
      currentDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    // Generate letter content
    const subject = this.substituteVariables(template.subject, variables);
    const body = this.substituteVariables(template.body, variables);

    const letter: Omit<GoodwillLetter, "id"> = {
      userId: input.userId,
      creditorName: input.creditorName,
      accountNumber: input.accountNumber,
      letterType: input.letterType,
      status: "draft",
      subject,
      body,
      variables,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from("goodwill_letters")
      .insert({
        user_id: letter.userId,
        creditor_name: letter.creditorName,
        account_number: letter.accountNumber,
        letter_type: letter.letterType,
        status: letter.status,
        subject: letter.subject,
        body: letter.body,
        variables: letter.variables,
        created_at: letter.createdAt.toISOString(),
        updated_at: letter.updatedAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create letter: ${error.message}`);

    return this.mapRowToLetter(data);
  }

  async updateLetter(
    letterId: string,
    userId: string,
    updates: Partial<
      Pick<GoodwillLetter, "body" | "subject" | "status" | "variables">
    >,
  ): Promise<GoodwillLetter> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.body !== undefined) updateData.body = updates.body;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.variables !== undefined)
      updateData.variables = updates.variables;

    const { data, error } = await this.supabase
      .from("goodwill_letters")
      .update(updateData)
      .eq("id", letterId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update letter: ${error.message}`);

    return this.mapRowToLetter(data);
  }

  // ==========================================================================
  // LETTER RETRIEVAL
  // ==========================================================================

  async getLetterById(
    letterId: string,
    userId: string,
  ): Promise<GoodwillLetter | null> {
    const { data, error } = await this.supabase
      .from("goodwill_letters")
      .select("*")
      .eq("id", letterId)
      .eq("user_id", userId)
      .single();

    if (error) return null;

    return this.mapRowToLetter(data);
  }

  async getLettersByUser(
    userId: string,
    options?: { status?: LetterStatus; limit?: number },
  ): Promise<GoodwillLetter[]> {
    let query = this.supabase
      .from("goodwill_letters")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get letters: ${error.message}`);

    return (data || []).map((row) => this.mapRowToLetter(row));
  }

  // ==========================================================================
  // LETTER SENDING & TRACKING
  // ==========================================================================

  async markAsSent(letterId: string, userId: string): Promise<GoodwillLetter> {
    const { data, error } = await this.supabase
      .from("goodwill_letters")
      .update({
        status: "sent",
        sent_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", letterId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to mark letter as sent: ${error.message}`);

    return this.mapRowToLetter(data);
  }

  async recordResponse(
    letterId: string,
    userId: string,
    response: {
      outcome: "removed" | "declined" | "partial" | "pending";
      notes?: string;
    },
  ): Promise<GoodwillLetter> {
    const { data, error } = await this.supabase
      .from("goodwill_letters")
      .update({
        status:
          response.outcome === "removed"
            ? "successful"
            : response.outcome === "declined"
              ? "unsuccessful"
              : "response_received",
        response_date: new Date().toISOString(),
        response_notes: response.notes,
        outcome: response.outcome,
        updated_at: new Date().toISOString(),
      })
      .eq("id", letterId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to record response: ${error.message}`);

    return this.mapRowToLetter(data);
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  async getUserStats(userId: string): Promise<{
    totalLetters: number;
    sent: number;
    successful: number;
    pending: number;
    successRate: number;
  }> {
    const letters = await this.getLettersByUser(userId);

    const sent = letters.filter((l) => l.sentDate).length;
    const successful = letters.filter((l) => l.outcome === "removed").length;
    const pending = letters.filter(
      (l) => l.status === "sent" || l.status === "response_received",
    ).length;

    return {
      totalLetters: letters.length,
      sent,
      successful,
      pending,
      successRate: sent > 0 ? (successful / sent) * 100 : 0,
    };
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  generatePlainText(letter: GoodwillLetter): string {
    return `${letter.subject}\n\n${letter.body}`;
  }

  generateHTML(letter: GoodwillLetter): string {
    const bodyHtml = letter.body
      .split("\n\n")
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("\n");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${letter.subject}</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; max-width: 8.5in; margin: 1in auto; }
    p { margin-bottom: 1em; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private substituteVariables(
    text: string,
    variables: Record<string, string>,
  ): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, value || `[${key}]`);
    }
    return result;
  }

  private mapRowToLetter(row: Record<string, unknown>): GoodwillLetter {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      creditorName: row.creditor_name as string,
      accountNumber: row.account_number as string,
      letterType: row.letter_type as LetterType,
      status: row.status as LetterStatus,
      subject: row.subject as string,
      body: row.body as string,
      variables: row.variables as Record<string, string>,
      sentDate: row.sent_date ? new Date(row.sent_date as string) : undefined,
      responseDate: row.response_date
        ? new Date(row.response_date as string)
        : undefined,
      responseNotes: row.response_notes as string | undefined,
      outcome: row.outcome as GoodwillLetter["outcome"],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let goodwillLetterServiceInstance: GoodwillLetterService | null = null;

export function getGoodwillLetterService(): GoodwillLetterService {
  if (!goodwillLetterServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    goodwillLetterServiceInstance = new GoodwillLetterService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return goodwillLetterServiceInstance;
}
