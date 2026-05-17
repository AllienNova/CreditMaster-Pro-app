/**
 * Credit Builder Loan Referral Service
 *
 * Helps users find and compare credit builder loans:
 * - Loan product database with multiple providers
 * - Personalized recommendations based on user profile
 * - Application tracking
 * - Progress monitoring
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type LoanProvider =
  | "self"
  | "chime"
  | "moneyLion"
  | "dave"
  | "brigit"
  | "current"
  | "varo"
  | "credit_strong"
  | "local_credit_union";

export type LoanType =
  | "traditional"
  | "share_secured"
  | "passbook"
  | "cd_secured";

export interface CreditBuilderLoan {
  id: string;
  provider: LoanProvider;
  name: string;
  type: LoanType;

  // Loan terms
  loanAmountMin: number;
  loanAmountMax: number;
  termMonths: number[];
  apr: { min: number; max: number };
  monthlyPaymentRange: { min: number; max: number };

  // Fees
  applicationFee: number;
  monthlyFee: number;
  lateFee: number;
  earlyPayoffPenalty: boolean;

  // Features
  reportsToBureaus: ("equifax" | "experian" | "transunion")[];
  noHardPull: boolean;
  savingsComponent: boolean;
  payoutAtEnd: boolean;

  // Requirements
  minIncome?: number;
  minBankAccountAge?: number;
  noBankruptcy: boolean;

  // Metadata
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  applicationUrl: string;
  rating: number;
}

export interface UserLoanProfile {
  userId: string;
  monthlyIncome: number;
  availableMonthlyPayment: number;
  creditScore?: number;
  hasBankAccount: boolean;
  bankAccountAgeMonths: number;
  hasBankruptcy: boolean;
  primaryGoal:
    | "build_credit"
    | "establish_history"
    | "improve_score"
    | "build_savings";
  preferredTerm: number;
}

export interface LoanRecommendation {
  loan: CreditBuilderLoan;
  matchScore: number;
  approvalLikelihood: "high" | "medium" | "low";
  reasons: string[];
  warnings?: string[];
  suggestedAmount: number;
  suggestedTerm: number;
  estimatedMonthlyPayment: number;
  projectedScoreImpact: number;
  totalCost: number;
  savingsAtEnd?: number;
}

export interface LoanApplication {
  id: string;
  userId: string;
  loanId: string;
  provider: LoanProvider;
  status:
    | "started"
    | "submitted"
    | "approved"
    | "denied"
    | "active"
    | "completed"
    | "defaulted";
  appliedDate: Date;
  approvedDate?: Date;
  loanAmount?: number;
  term?: number;
  apr?: number;
  monthlyPayment?: number;
  startDate?: Date;
  endDate?: Date;
  paymentsMade: number;
  paymentsRemaining: number;
  onTimePayments: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LOAN DATABASE
// ============================================================================

const CREDIT_BUILDER_LOANS: CreditBuilderLoan[] = [
  {
    id: "self-credit-builder",
    provider: "self",
    name: "Self Credit Builder Account",
    type: "traditional",
    loanAmountMin: 520,
    loanAmountMax: 1800,
    termMonths: [12, 24],
    apr: { min: 12.42, max: 15.92 },
    monthlyPaymentRange: { min: 25, max: 150 },
    applicationFee: 0,
    monthlyFee: 0,
    lateFee: 0,
    earlyPayoffPenalty: false,
    reportsToBureaus: ["equifax", "experian", "transunion"],
    noHardPull: true,
    savingsComponent: true,
    payoutAtEnd: true,
    noBankruptcy: false,
    description:
      "Build credit while building savings. Your payments are held in a CD and returned when complete.",
    pros: [
      "Reports to all 3 bureaus",
      "No hard credit check",
      "Get your money back at end",
      "Low starting payments",
    ],
    cons: ["Takes time to build credit", "Funds locked during term"],
    bestFor: ["First-time credit builders", "Those wanting forced savings"],
    applicationUrl: "https://www.self.inc",
    rating: 4.5,
  },
  {
    id: "chime-credit-builder",
    provider: "chime",
    name: "Chime Credit Builder Visa",
    type: "share_secured",
    loanAmountMin: 0,
    loanAmountMax: 10000,
    termMonths: [0], // No set term - revolving
    apr: { min: 0, max: 0 },
    monthlyPaymentRange: { min: 0, max: 0 },
    applicationFee: 0,
    monthlyFee: 0,
    lateFee: 0,
    earlyPayoffPenalty: false,
    reportsToBureaus: ["equifax", "experian", "transunion"],
    noHardPull: true,
    savingsComponent: false,
    payoutAtEnd: false,
    noBankruptcy: false,
    description:
      "Secured credit card that reports like a regular card. Move money from Chime account to use.",
    pros: [
      "No fees",
      "No interest",
      "Reports to all bureaus",
      "Easy to qualify",
    ],
    cons: ["Requires Chime checking account", "Must fund before use"],
    bestFor: ["Existing Chime members", "Those who want no fees"],
    applicationUrl: "https://www.chime.com",
    rating: 4.7,
  },
  {
    id: "moneylion-credit-builder",
    provider: "moneyLion",
    name: "MoneyLion Credit Builder Plus",
    type: "traditional",
    loanAmountMin: 500,
    loanAmountMax: 1000,
    termMonths: [12],
    apr: { min: 5.99, max: 29.99 },
    monthlyPaymentRange: { min: 42, max: 90 },
    applicationFee: 0,
    monthlyFee: 19.99,
    lateFee: 15,
    earlyPayoffPenalty: false,
    reportsToBureaus: ["equifax", "experian", "transunion"],
    noHardPull: false,
    savingsComponent: true,
    payoutAtEnd: true,
    noBankruptcy: true,
    description:
      "Credit builder loan with membership perks including cash advances and financial tracking.",
    pros: ["Quick approval", "Membership includes extras", "Rewards program"],
    cons: ["Monthly membership fee", "Hard credit pull"],
    bestFor: ["Those who want additional banking features"],
    applicationUrl: "https://www.moneylion.com",
    rating: 4.2,
  },
  {
    id: "credit-strong-builder",
    provider: "credit_strong",
    name: "Credit Strong Instal Loan",
    type: "cd_secured",
    loanAmountMin: 1000,
    loanAmountMax: 2500,
    termMonths: [12, 24, 36, 48, 60, 120],
    apr: { min: 7.75, max: 15.61 },
    monthlyPaymentRange: { min: 15, max: 110 },
    applicationFee: 0,
    monthlyFee: 0,
    lateFee: 10,
    earlyPayoffPenalty: false,
    reportsToBureaus: ["equifax", "experian", "transunion"],
    noHardPull: true,
    savingsComponent: true,
    payoutAtEnd: true,
    minIncome: 0,
    noBankruptcy: false,
    description:
      "Flexible terms from 1-10 years. Payments as low as $15/month build credit and savings.",
    pros: [
      "Very flexible terms",
      "Low payment options",
      "No credit check",
      "Reports to all bureaus",
    ],
    cons: ["Longer terms mean more interest", "Funds locked"],
    bestFor: ["Those wanting low payments", "Long-term credit building"],
    applicationUrl: "https://www.creditstrong.com",
    rating: 4.4,
  },
  {
    id: "local-cu-share-secured",
    provider: "local_credit_union",
    name: "Credit Union Share-Secured Loan",
    type: "share_secured",
    loanAmountMin: 250,
    loanAmountMax: 5000,
    termMonths: [6, 12, 24, 36],
    apr: { min: 3, max: 10 },
    monthlyPaymentRange: { min: 25, max: 200 },
    applicationFee: 0,
    monthlyFee: 0,
    lateFee: 15,
    earlyPayoffPenalty: false,
    reportsToBureaus: ["equifax", "experian", "transunion"],
    noHardPull: false,
    savingsComponent: true,
    payoutAtEnd: true,
    noBankruptcy: false,
    description:
      "Traditional credit builder loan from local credit unions. Requires membership and deposit.",
    pros: ["Lowest rates available", "Personal service", "Community focused"],
    cons: ["Requires CU membership", "May require deposit upfront"],
    bestFor: ["Those with CU membership", "Seeking lowest cost option"],
    applicationUrl: "https://www.ncua.gov/consumers/share-insurance-estimator",
    rating: 4.6,
  },
];

// ============================================================================
// SERVICE
// ============================================================================

export class CreditBuilderLoanService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  async getRecommendations(
    profile: UserLoanProfile,
  ): Promise<LoanRecommendation[]> {
    const recommendations: LoanRecommendation[] = [];

    for (const loan of CREDIT_BUILDER_LOANS) {
      const matchScore = this.calculateMatchScore(loan, profile);
      if (matchScore < 30) continue; // Filter out poor matches

      const suggestedAmount = this.suggestLoanAmount(loan, profile);
      const suggestedTerm = this.suggestTerm(loan, profile);
      const estimatedMonthlyPayment = this.estimateMonthlyPayment(
        loan,
        suggestedAmount,
        suggestedTerm,
      );

      recommendations.push({
        loan,
        matchScore,
        approvalLikelihood: this.assessApprovalLikelihood(loan, profile),
        reasons: this.generateReasons(loan, profile),
        warnings: this.generateWarnings(loan, profile),
        suggestedAmount,
        suggestedTerm,
        estimatedMonthlyPayment,
        projectedScoreImpact: this.estimateScoreImpact(loan, profile),
        totalCost: this.calculateTotalCost(
          loan,
          suggestedAmount,
          suggestedTerm,
        ),
        savingsAtEnd: loan.payoutAtEnd ? suggestedAmount : undefined,
      });
    }

    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateMatchScore(
    loan: CreditBuilderLoan,
    profile: UserLoanProfile,
  ): number {
    let score = 50; // Base score

    // Check if monthly payment is affordable
    const minPayment = loan.monthlyPaymentRange.min;
    if (minPayment <= profile.availableMonthlyPayment) {
      score += 20;
    } else {
      score -= 30;
    }

    // Bonus for reporting to all bureaus
    if (loan.reportsToBureaus.length === 3) {
      score += 15;
    }

    // Bonus for no hard pull (if user has limited credit)
    if (
      loan.noHardPull &&
      (!profile.creditScore || profile.creditScore < 650)
    ) {
      score += 10;
    }

    // Match savings component with goal
    if (loan.savingsComponent && profile.primaryGoal === "build_savings") {
      score += 15;
    }

    // Check bankruptcy restriction
    if (loan.noBankruptcy && profile.hasBankruptcy) {
      score -= 50;
    }

    // Fee considerations
    if (loan.monthlyFee === 0) {
      score += 10;
    } else {
      score -= loan.monthlyFee / 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private suggestLoanAmount(
    loan: CreditBuilderLoan,
    profile: UserLoanProfile,
  ): number {
    // Start with a reasonable amount based on monthly payment capacity
    const monthlyCapacity = profile.availableMonthlyPayment;
    const estimatedAmount = monthlyCapacity * 12; // Assume 12 month term

    return Math.max(
      loan.loanAmountMin,
      Math.min(loan.loanAmountMax, estimatedAmount),
    );
  }

  private suggestTerm(
    loan: CreditBuilderLoan,
    profile: UserLoanProfile,
  ): number {
    if (loan.termMonths.length === 0 || loan.termMonths[0] === 0) {
      return 0; // Revolving credit
    }

    // Prefer user's preferred term if available
    if (loan.termMonths.includes(profile.preferredTerm)) {
      return profile.preferredTerm;
    }

    // Otherwise suggest 12 months as balanced option
    if (loan.termMonths.includes(12)) {
      return 12;
    }

    return loan.termMonths[0];
  }

  private estimateMonthlyPayment(
    loan: CreditBuilderLoan,
    amount: number,
    term: number,
  ): number {
    if (term === 0) return 0; // Revolving

    const avgApr = (loan.apr.min + loan.apr.max) / 2 / 100;
    const monthlyRate = avgApr / 12;

    if (monthlyRate === 0) {
      return amount / term;
    }

    return (
      (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1)
    );
  }

  private assessApprovalLikelihood(
    loan: CreditBuilderLoan,
    profile: UserLoanProfile,
  ): "high" | "medium" | "low" {
    if (loan.noBankruptcy && profile.hasBankruptcy) {
      return "low";
    }

    if (loan.noHardPull) {
      return "high";
    }

    if (profile.creditScore && profile.creditScore >= 580) {
      return "high";
    }

    if (profile.hasBankAccount && profile.bankAccountAgeMonths >= 3) {
      return "medium";
    }

    return "low";
  }

  private generateReasons(
    loan: CreditBuilderLoan,
    profile: UserLoanProfile,
  ): string[] {
    const reasons: string[] = [];

    if (loan.reportsToBureaus.length === 3) {
      reasons.push("Reports to all 3 credit bureaus for maximum impact");
    }

    if (loan.noHardPull) {
      reasons.push("No hard credit inquiry protects your current score");
    }

    if (loan.savingsComponent && loan.payoutAtEnd) {
      reasons.push("Build savings while building credit - get funds at end");
    }

    if (loan.monthlyFee === 0 && loan.applicationFee === 0) {
      reasons.push("No fees keeps more money in your pocket");
    }

    if (loan.monthlyPaymentRange.min <= profile.availableMonthlyPayment) {
      reasons.push(
        `Monthly payment fits your budget of $${profile.availableMonthlyPayment}`,
      );
    }

    return reasons.slice(0, 4);
  }

  private generateWarnings(
    loan: CreditBuilderLoan,
    profile: UserLoanProfile,
  ): string[] | undefined {
    const warnings: string[] = [];

    if (loan.monthlyFee > 0) {
      warnings.push(`Monthly fee of $${loan.monthlyFee} adds to total cost`);
    }

    if (!loan.noHardPull) {
      warnings.push("Application may temporarily lower your credit score");
    }

    if (loan.earlyPayoffPenalty) {
      warnings.push("Early payoff penalty applies");
    }

    return warnings.length > 0 ? warnings : undefined;
  }

  private estimateScoreImpact(
    loan: CreditBuilderLoan,
    profile: UserLoanProfile,
  ): number {
    let impact = 20; // Base impact for on-time payments

    // More bureaus = more impact
    impact += loan.reportsToBureaus.length * 5;

    // New credit seekers benefit more
    if (!profile.creditScore || profile.creditScore < 600) {
      impact += 15;
    }

    return impact;
  }

  private calculateTotalCost(
    loan: CreditBuilderLoan,
    amount: number,
    term: number,
  ): number {
    if (term === 0) return 0;

    const monthlyPayment = this.estimateMonthlyPayment(loan, amount, term);
    const totalPayments = monthlyPayment * term;
    const totalFees = loan.applicationFee + loan.monthlyFee * term;

    return totalPayments + totalFees - (loan.payoutAtEnd ? amount : 0);
  }

  // ==========================================================================
  // APPLICATION TRACKING
  // ==========================================================================

  async trackApplication(
    application: Omit<LoanApplication, "id" | "createdAt" | "updatedAt">,
  ): Promise<LoanApplication> {
    const now = new Date();
    const newApp: LoanApplication = {
      ...application,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("credit_builder_applications")
      .insert(this.toDbFormat(newApp))
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async updateApplication(
    applicationId: string,
    userId: string,
    updates: Partial<LoanApplication>,
  ): Promise<LoanApplication> {
    const { data, error } = await this.supabase
      .from("credit_builder_applications")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async getUserApplications(userId: string): Promise<LoanApplication[]> {
    const { data, error } = await this.supabase
      .from("credit_builder_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.fromDbFormat);
  }

  // ==========================================================================
  // CATALOG
  // ==========================================================================

  getAllLoans(): CreditBuilderLoan[] {
    return CREDIT_BUILDER_LOANS;
  }

  getLoanById(loanId: string): CreditBuilderLoan | undefined {
    return CREDIT_BUILDER_LOANS.find((l) => l.id === loanId);
  }

  getLoansByProvider(provider: LoanProvider): CreditBuilderLoan[] {
    return CREDIT_BUILDER_LOANS.filter((l) => l.provider === provider);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private toDbFormat(app: LoanApplication): Record<string, unknown> {
    return {
      id: app.id,
      user_id: app.userId,
      loan_id: app.loanId,
      provider: app.provider,
      status: app.status,
      applied_date: app.appliedDate.toISOString(),
      approved_date: app.approvedDate?.toISOString(),
      loan_amount: app.loanAmount,
      term: app.term,
      apr: app.apr,
      monthly_payment: app.monthlyPayment,
      start_date: app.startDate?.toISOString(),
      end_date: app.endDate?.toISOString(),
      payments_made: app.paymentsMade,
      payments_remaining: app.paymentsRemaining,
      on_time_payments: app.onTimePayments,
      created_at: app.createdAt.toISOString(),
      updated_at: app.updatedAt.toISOString(),
    };
  }

  private fromDbFormat(data: Record<string, unknown>): LoanApplication {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      loanId: data.loan_id as string,
      provider: data.provider as LoanProvider,
      status: data.status as LoanApplication["status"],
      appliedDate: new Date(data.applied_date as string),
      approvedDate: data.approved_date
        ? new Date(data.approved_date as string)
        : undefined,
      loanAmount: data.loan_amount as number | undefined,
      term: data.term as number | undefined,
      apr: data.apr as number | undefined,
      monthlyPayment: data.monthly_payment as number | undefined,
      startDate: data.start_date
        ? new Date(data.start_date as string)
        : undefined,
      endDate: data.end_date ? new Date(data.end_date as string) : undefined,
      paymentsMade: data.payments_made as number,
      paymentsRemaining: data.payments_remaining as number,
      onTimePayments: data.on_time_payments as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let creditBuilderLoanServiceInstance: CreditBuilderLoanService | null = null;

export function getCreditBuilderLoanService(): CreditBuilderLoanService {
  if (!creditBuilderLoanServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    creditBuilderLoanServiceInstance = new CreditBuilderLoanService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return creditBuilderLoanServiceInstance;
}
