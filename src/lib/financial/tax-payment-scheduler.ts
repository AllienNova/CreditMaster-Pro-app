/**
 * Tax Payment Scheduler
 *
 * Handles scheduling and tracking of tax-related deadlines:
 * - IRS quarterly estimated tax payment reminders
 * - Filing deadline tracking (federal + state)
 * - Extension deadline management
 * - Calendar integration for tax dates
 * - Payment amount estimation
 *
 * @module TaxPaymentScheduler
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type TaxDeadlineType =
  | "quarterly_estimated"
  | "annual_filing"
  | "extension_filing"
  | "state_filing"
  | "amendment"
  | "payment_due";

export type TaxDeadlineStatus =
  | "upcoming"
  | "due_soon"    // within 14 days
  | "overdue"
  | "completed"
  | "extended";

export interface TaxDeadline {
  id: string;
  userId: string;
  type: TaxDeadlineType;
  title: string;
  description: string;
  dueDate: Date;
  status: TaxDeadlineStatus;
  amount?: number;
  state?: string; // state code for state filings
  taxYear: number;
  quarter?: number; // 1-4 for quarterly
  reminderDays: number[]; // days before due to remind
  completedAt?: Date;
  extensionDate?: Date;
  notes?: string;
}

export interface QuarterlyEstimate {
  quarter: number;
  dueDate: Date;
  estimatedAmount: number;
  paidAmount: number;
  remaining: number;
  status: TaxDeadlineStatus;
}

export interface TaxPaymentSchedule {
  userId: string;
  taxYear: number;
  annualIncome: number;
  estimatedTax: number;
  quarterlyPayments: QuarterlyEstimate[];
  filingDeadline: TaxDeadline;
  stateDeadlines: TaxDeadline[];
  extensionDeadline?: TaxDeadline;
  totalPaid: number;
  totalRemaining: number;
}

export interface TaxCalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: TaxDeadlineType;
  description: string;
  amount?: number;
  isUrgent: boolean;
}

export interface PaymentEstimation {
  annualIncome: number;
  filingStatus: "single" | "married_filing_jointly" | "married_filing_separately" | "head_of_household";
  estimatedTax: number;
  quarterlyAmount: number;
  effectiveRate: number;
  safeHarborAmount: number;
}

export interface DeadlineReminder {
  deadlineId: string;
  userId: string;
  title: string;
  message: string;
  daysUntilDue: number;
  dueDate: Date;
  amount?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** IRS quarterly estimated tax payment due dates (month, day). */
const QUARTERLY_DUE_DATES: Array<{ quarter: number; month: number; day: number }> = [
  { quarter: 1, month: 4, day: 15 },   // Q1: Apr 15
  { quarter: 2, month: 6, day: 15 },   // Q2: Jun 15
  { quarter: 3, month: 9, day: 15 },   // Q3: Sep 15
  { quarter: 4, month: 1, day: 15 },   // Q4: Jan 15 (next year)
];

/** Federal tax filing deadline: April 15. */
const FEDERAL_FILING_MONTH = 4;
const FEDERAL_FILING_DAY = 15;

/** Extension grants 6 months: October 15. */
const EXTENSION_MONTH = 10;
const EXTENSION_DAY = 15;

/** Default reminder intervals (days before due). */
const DEFAULT_REMINDER_DAYS = [30, 14, 7, 3, 1];

/** Simplified federal tax brackets (2025, single) for estimation. */
const FEDERAL_BRACKETS_SINGLE: Array<{ min: number; max: number; rate: number }> = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

const FEDERAL_BRACKETS_JOINT: Array<{ min: number; max: number; rate: number }> = [
  { min: 0, max: 23200, rate: 0.10 },
  { min: 23200, max: 94300, rate: 0.12 },
  { min: 94300, max: 201050, rate: 0.22 },
  { min: 201050, max: 383900, rate: 0.24 },
  { min: 383900, max: 487450, rate: 0.32 },
  { min: 487450, max: 731200, rate: 0.35 },
  { min: 731200, max: Infinity, rate: 0.37 },
];

const STANDARD_DEDUCTIONS: Record<string, number> = {
  single: 14600,
  married_filing_jointly: 29200,
  married_filing_separately: 14600,
  head_of_household: 21900,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getQuarterlyDueDate(quarter: number, taxYear: number): Date {
  const qd = QUARTERLY_DUE_DATES.find((q) => q.quarter === quarter);
  if (!qd) throw new Error(`Invalid quarter: ${quarter}`);
  const year = quarter === 4 ? taxYear + 1 : taxYear;
  return new Date(year, qd.month - 1, qd.day);
}

function getFederalFilingDate(taxYear: number): Date {
  return new Date(taxYear + 1, FEDERAL_FILING_MONTH - 1, FEDERAL_FILING_DAY);
}

function getExtensionDate(taxYear: number): Date {
  return new Date(taxYear + 1, EXTENSION_MONTH - 1, EXTENSION_DAY);
}

function computeDeadlineStatus(
  dueDate: Date,
  completed: boolean,
  extended: boolean,
  now?: Date,
): TaxDeadlineStatus {
  if (completed) return "completed";
  if (extended) return "extended";

  const current = now ?? new Date();
  const diff = dueDate.getTime() - current.getTime();
  const daysUntil = diff / (1000 * 60 * 60 * 24);

  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 14) return "due_soon";
  return "upcoming";
}

function calculateFederalTax(
  income: number,
  filingStatus: string,
): number {
  const deduction = STANDARD_DEDUCTIONS[filingStatus] ?? STANDARD_DEDUCTIONS.single;
  const taxableIncome = Math.max(0, income - deduction);

  const brackets =
    filingStatus === "married_filing_jointly"
      ? FEDERAL_BRACKETS_JOINT
      : FEDERAL_BRACKETS_SINGLE;

  let tax = 0;
  let remaining = taxableIncome;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.max - bracket.min);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }

  return Math.round(tax * 100) / 100;
}

// ── Service ──────────────────────────────────────────────────────────────────

class TaxPaymentScheduler {
  private readonly deadlines: Map<string, TaxDeadline[]> = new Map();
  private readonly payments: Map<string, Map<string, number>> = new Map(); // userId -> deadlineId -> paid

  // ── Estimation ─────────────────────────────────────────────────────────

  /**
   * Estimate quarterly tax payments based on annual income.
   */
  estimatePayments(
    annualIncome: number,
    filingStatus: "single" | "married_filing_jointly" | "married_filing_separately" | "head_of_household" = "single",
  ): PaymentEstimation {
    const estimatedTax = calculateFederalTax(annualIncome, filingStatus);
    const quarterlyAmount = Math.ceil(estimatedTax / 4);
    const effectiveRate =
      annualIncome > 0 ? (estimatedTax / annualIncome) * 100 : 0;

    // Safe harbor: 100% of prior year tax (approximated as current estimate)
    // or 110% if AGI > 150k
    const safeHarborMultiplier = annualIncome > 150000 ? 1.1 : 1.0;
    const safeHarborAmount = Math.ceil(
      (estimatedTax * safeHarborMultiplier) / 4,
    );

    return {
      annualIncome,
      filingStatus,
      estimatedTax,
      quarterlyAmount,
      effectiveRate: Math.round(effectiveRate * 100) / 100,
      safeHarborAmount,
    };
  }

  // ── Schedule Generation ────────────────────────────────────────────────

  /**
   * Generate a complete tax payment schedule for a user and tax year.
   */
  generateSchedule(
    userId: string,
    taxYear: number,
    annualIncome: number,
    filingStatus: "single" | "married_filing_jointly" | "married_filing_separately" | "head_of_household" = "single",
    states?: string[],
    now?: Date,
  ): TaxPaymentSchedule {
    const estimation = this.estimatePayments(annualIncome, filingStatus);
    const deadlines: TaxDeadline[] = [];

    // Generate quarterly deadlines
    const quarterlyPayments: QuarterlyEstimate[] = [];
    for (let q = 1; q <= 4; q++) {
      const dueDate = getQuarterlyDueDate(q, taxYear);
      const paid = this.getPaymentAmount(userId, `q${q}_${taxYear}`);
      const status = computeDeadlineStatus(dueDate, paid >= estimation.quarterlyAmount, false, now);

      const deadline: TaxDeadline = {
        id: generateId("tax_dl"),
        userId,
        type: "quarterly_estimated",
        title: `Q${q} ${taxYear} Estimated Tax Payment`,
        description: `Quarterly estimated tax payment for Q${q} ${taxYear}`,
        dueDate,
        status,
        amount: estimation.quarterlyAmount,
        taxYear,
        quarter: q,
        reminderDays: DEFAULT_REMINDER_DAYS,
        completedAt: paid >= estimation.quarterlyAmount ? new Date() : undefined,
      };

      deadlines.push(deadline);
      quarterlyPayments.push({
        quarter: q,
        dueDate,
        estimatedAmount: estimation.quarterlyAmount,
        paidAmount: paid,
        remaining: Math.max(0, estimation.quarterlyAmount - paid),
        status,
      });
    }

    // Federal filing deadline
    const filingDate = getFederalFilingDate(taxYear);
    const filingDeadline: TaxDeadline = {
      id: generateId("tax_dl"),
      userId,
      type: "annual_filing",
      title: `${taxYear} Federal Tax Return`,
      description: `Federal income tax return filing deadline for tax year ${taxYear}`,
      dueDate: filingDate,
      status: computeDeadlineStatus(filingDate, false, false, now),
      taxYear,
      reminderDays: DEFAULT_REMINDER_DAYS,
    };
    deadlines.push(filingDeadline);

    // State deadlines
    const stateDeadlines: TaxDeadline[] = (states ?? []).map((state) => {
      const dl: TaxDeadline = {
        id: generateId("tax_dl"),
        userId,
        type: "state_filing",
        title: `${taxYear} ${state} State Tax Return`,
        description: `State income tax return for ${state}, tax year ${taxYear}`,
        dueDate: filingDate, // Most states follow federal deadline
        status: computeDeadlineStatus(filingDate, false, false, now),
        state,
        taxYear,
        reminderDays: DEFAULT_REMINDER_DAYS,
      };
      deadlines.push(dl);
      return dl;
    });

    // Store deadlines
    this.deadlines.set(userId, [
      ...(this.deadlines.get(userId) ?? []),
      ...deadlines,
    ]);

    const totalPaid = quarterlyPayments.reduce((sum, q) => sum + q.paidAmount, 0);

    return {
      userId,
      taxYear,
      annualIncome,
      estimatedTax: estimation.estimatedTax,
      quarterlyPayments,
      filingDeadline,
      stateDeadlines,
      totalPaid,
      totalRemaining: Math.max(0, estimation.estimatedTax - totalPaid),
    };
  }

  // ── Extension Management ───────────────────────────────────────────────

  /**
   * File for an extension, updating the filing deadline.
   */
  fileExtension(userId: string, taxYear: number): TaxDeadline {
    const extensionDate = getExtensionDate(taxYear);
    const deadline: TaxDeadline = {
      id: generateId("tax_dl"),
      userId,
      type: "extension_filing",
      title: `${taxYear} Extension Filing Deadline`,
      description: `Extended filing deadline for tax year ${taxYear} (6-month extension)`,
      dueDate: extensionDate,
      status: computeDeadlineStatus(extensionDate, false, false),
      taxYear,
      reminderDays: DEFAULT_REMINDER_DAYS,
      extensionDate,
    };

    // Mark original filing deadline as extended
    const userDeadlines = this.deadlines.get(userId) ?? [];
    for (const dl of userDeadlines) {
      if (dl.type === "annual_filing" && dl.taxYear === taxYear) {
        dl.status = "extended";
        dl.extensionDate = extensionDate;
      }
    }

    userDeadlines.push(deadline);
    this.deadlines.set(userId, userDeadlines);

    return deadline;
  }

  // ── Payment Tracking ───────────────────────────────────────────────────

  recordPayment(userId: string, deadlineId: string, amount: number): void {
    let userPayments = this.payments.get(userId);
    if (!userPayments) {
      userPayments = new Map();
      this.payments.set(userId, userPayments);
    }

    const existing = userPayments.get(deadlineId) ?? 0;
    userPayments.set(deadlineId, existing + amount);
  }

  getPaymentAmount(userId: string, deadlineId: string): number {
    return this.payments.get(userId)?.get(deadlineId) ?? 0;
  }

  // ── Deadline Management ────────────────────────────────────────────────

  markComplete(userId: string, deadlineId: string): boolean {
    const userDeadlines = this.deadlines.get(userId) ?? [];
    const deadline = userDeadlines.find((d) => d.id === deadlineId);
    if (!deadline) return false;

    deadline.status = "completed";
    deadline.completedAt = new Date();
    return true;
  }

  getDeadlines(userId: string, options?: {
    type?: TaxDeadlineType;
    status?: TaxDeadlineStatus;
    taxYear?: number;
  }): TaxDeadline[] {
    let deadlines = this.deadlines.get(userId) ?? [];

    if (options?.type) {
      deadlines = deadlines.filter((d) => d.type === options.type);
    }
    if (options?.status) {
      deadlines = deadlines.filter((d) => d.status === options.status);
    }
    if (options?.taxYear) {
      deadlines = deadlines.filter((d) => d.taxYear === options.taxYear);
    }

    return deadlines.sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
    );
  }

  // ── Calendar Events ────────────────────────────────────────────────────

  /**
   * Generate calendar events for all deadlines.
   */
  getCalendarEvents(userId: string, taxYear?: number): TaxCalendarEvent[] {
    const deadlines = this.getDeadlines(userId, { taxYear });

    return deadlines.map((d) => ({
      id: d.id,
      title: d.title,
      date: d.dueDate,
      type: d.type,
      description: d.description,
      amount: d.amount,
      isUrgent: d.status === "due_soon" || d.status === "overdue",
    }));
  }

  // ── Reminders ──────────────────────────────────────────────────────────

  /**
   * Get reminders for deadlines that are due within reminder windows.
   */
  getUpcomingReminders(userId: string, now?: Date): DeadlineReminder[] {
    const currentTime = now ?? new Date();
    const deadlines = this.getDeadlines(userId);
    const reminders: DeadlineReminder[] = [];

    for (const deadline of deadlines) {
      if (deadline.status === "completed" || deadline.status === "extended")
        continue;

      const daysUntil = Math.ceil(
        (deadline.dueDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntil < 0) {
        reminders.push({
          deadlineId: deadline.id,
          userId,
          title: `OVERDUE: ${deadline.title}`,
          message: `This deadline was ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago`,
          daysUntilDue: daysUntil,
          dueDate: deadline.dueDate,
          amount: deadline.amount,
        });
      } else if (deadline.reminderDays.includes(daysUntil)) {
        reminders.push({
          deadlineId: deadline.id,
          userId,
          title: deadline.title,
          message: `Due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          daysUntilDue: daysUntil,
          dueDate: deadline.dueDate,
          amount: deadline.amount,
        });
      }
    }

    return reminders.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }
}

// ── Export Singleton ─────────────────────────────────────────────────────────

export const taxPaymentScheduler = new TaxPaymentScheduler();
export default taxPaymentScheduler;
