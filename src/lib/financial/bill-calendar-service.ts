/**
 * Bill Calendar Service
 *
 * Manages recurring bills, payment schedules, and reminders.
 * Features:
 * - Track recurring bills with due dates
 * - Calendar view of upcoming payments
 * - Payment reminders and notifications
 * - Bill payment history tracking
 * - Autopay status management
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();

// ============================================================================
// TYPES
// ============================================================================

export type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semi-annually"
  | "annually"
  | "one-time";

export type BillCategory =
  | "housing"
  | "utilities"
  | "insurance"
  | "subscriptions"
  | "loans"
  | "credit_cards"
  | "phone"
  | "internet"
  | "streaming"
  | "memberships"
  | "other";

export type BillStatus = "pending" | "paid" | "overdue" | "scheduled";

export type ReminderType = "email" | "push" | "sms" | "in_app";

export interface Bill {
  id: string;
  userId: string;
  name: string;
  payee: string;
  amount: number;
  category: BillCategory;
  frequency: BillFrequency;
  dueDay: number; // Day of month (1-31) or day of week (0-6) for weekly
  nextDueDate: Date;
  autopayEnabled: boolean;
  autopayAccountId?: string;
  reminderDaysBefore: number;
  reminderTypes: ReminderType[];
  notes?: string;
  websiteUrl?: string;
  accountNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillPayment {
  id: string;
  billId: string;
  userId: string;
  amount: number;
  paidDate: Date;
  dueDate: Date;
  status: "paid" | "partial" | "late";
  paymentMethod?: string;
  confirmationNumber?: string;
  notes?: string;
  createdAt: Date;
}

export interface CalendarDay {
  date: Date;
  bills: BillWithStatus[];
  totalDue: number;
  hasPastDue: boolean;
}

export interface BillWithStatus extends Bill {
  status: BillStatus;
  daysUntilDue: number;
  isPastDue: boolean;
}

export interface BillReminder {
  id: string;
  billId: string;
  userId: string;
  reminderDate: Date;
  reminderType: ReminderType;
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

export interface BillSummary {
  totalMonthlyBills: number;
  totalUpcomingWeek: number;
  totalOverdue: number;
  billsCount: number;
  paidThisMonth: number;
  upcomingBills: BillWithStatus[];
  overdueBills: BillWithStatus[];
  autopayCount: number;
  manualPayCount: number;
}

export interface CreateBillInput {
  userId: string;
  name: string;
  payee: string;
  amount: number;
  category: BillCategory;
  frequency: BillFrequency;
  dueDay: number;
  nextDueDate: Date;
  autopayEnabled?: boolean;
  autopayAccountId?: string;
  reminderDaysBefore?: number;
  reminderTypes?: ReminderType[];
  notes?: string;
  websiteUrl?: string;
  accountNumber?: string;
}

export interface UpdateBillInput {
  name?: string;
  payee?: string;
  amount?: number;
  category?: BillCategory;
  frequency?: BillFrequency;
  dueDay?: number;
  nextDueDate?: Date;
  autopayEnabled?: boolean;
  autopayAccountId?: string;
  reminderDaysBefore?: number;
  reminderTypes?: ReminderType[];
  notes?: string;
  websiteUrl?: string;
  accountNumber?: string;
  isActive?: boolean;
}

// ============================================================================
// BILL CALENDAR SERVICE
// ============================================================================

export class BillCalendarService {
  // ==========================================================================
  // BILL CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new bill
   */
  async createBill(input: CreateBillInput): Promise<Bill> {
    const { data, error } = await supabase
      .from("bills")
      .insert({
        user_id: input.userId,
        name: input.name,
        payee: input.payee,
        amount: input.amount,
        category: input.category,
        frequency: input.frequency,
        due_day: input.dueDay,
        next_due_date: input.nextDueDate.toISOString(),
        autopay_enabled: input.autopayEnabled ?? false,
        autopay_account_id: input.autopayAccountId || null,
        reminder_days_before: input.reminderDaysBefore ?? 3,
        reminder_types: input.reminderTypes ?? ["in_app"],
        notes: input.notes || null,
        website_url: input.websiteUrl || null,
        account_number: input.accountNumber || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create bill: ${error?.message}`);
    }

    // Schedule reminders for the new bill
    await this.scheduleReminders(
      data.id,
      input.userId,
      input.nextDueDate,
      input.reminderDaysBefore ?? 3,
      input.reminderTypes ?? ["in_app"],
    );

    return this.mapRowToBill(data);
  }

  /**
   * Get bill by ID
   */
  async getBillById(billId: string, userId: string): Promise<Bill | null> {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("id", billId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToBill(data);
  }

  /**
   * Get all bills for a user
   */
  async getBillsByUser(
    userId: string,
    options?: { activeOnly?: boolean; category?: BillCategory },
  ): Promise<Bill[]> {
    let query = supabase.from("bills").select("*").eq("user_id", userId);

    if (options?.activeOnly !== false) {
      query = query.eq("is_active", true);
    }

    if (options?.category) {
      query = query.eq("category", options.category);
    }

    const { data, error } = await query.order("next_due_date", {
      ascending: true,
    });

    if (error) {
      throw new Error(`Failed to fetch bills: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToBill(row));
  }

  /**
   * Update a bill
   */
  async updateBill(
    billId: string,
    userId: string,
    updates: UpdateBillInput,
  ): Promise<Bill> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.payee !== undefined) updateData.payee = updates.payee;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.frequency !== undefined)
      updateData.frequency = updates.frequency;
    if (updates.dueDay !== undefined) updateData.due_day = updates.dueDay;
    if (updates.nextDueDate !== undefined)
      updateData.next_due_date = updates.nextDueDate.toISOString();
    if (updates.autopayEnabled !== undefined)
      updateData.autopay_enabled = updates.autopayEnabled;
    if (updates.autopayAccountId !== undefined)
      updateData.autopay_account_id = updates.autopayAccountId;
    if (updates.reminderDaysBefore !== undefined)
      updateData.reminder_days_before = updates.reminderDaysBefore;
    if (updates.reminderTypes !== undefined)
      updateData.reminder_types = updates.reminderTypes;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.websiteUrl !== undefined)
      updateData.website_url = updates.websiteUrl;
    if (updates.accountNumber !== undefined)
      updateData.account_number = updates.accountNumber;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from("bills")
      .update(updateData)
      .eq("id", billId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update bill: ${error?.message}`);
    }

    return this.mapRowToBill(data);
  }

  /**
   * Delete a bill
   */
  async deleteBill(billId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", billId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete bill: ${error.message}`);
    }

    return true;
  }

  // ==========================================================================
  // CALENDAR VIEWS
  // ==========================================================================

  /**
   * Get calendar view for a month
   */
  async getMonthCalendar(
    userId: string,
    year: number,
    month: number,
  ): Promise<CalendarDay[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const bills = await this.getBillsByUser(userId, { activeOnly: true });
    const payments = await this.getPaymentsForPeriod(
      userId,
      startDate,
      endDate,
    );

    const calendar: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= endDate.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayBills: BillWithStatus[] = [];

      for (const bill of bills) {
        if (this.isBillDueOnDate(bill, date)) {
          const isPaid = payments.some(
            (p) =>
              p.billId === bill.id && this.isSameDay(new Date(p.dueDate), date),
          );

          const daysUntilDue = Math.ceil(
            (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );
          const isPastDue = daysUntilDue < 0 && !isPaid;

          dayBills.push({
            ...bill,
            status: isPaid ? "paid" : isPastDue ? "overdue" : "pending",
            daysUntilDue,
            isPastDue,
          });
        }
      }

      calendar.push({
        date,
        bills: dayBills,
        totalDue: dayBills
          .filter((b) => b.status !== "paid")
          .reduce((sum, b) => sum + b.amount, 0),
        hasPastDue: dayBills.some((b) => b.isPastDue),
      });
    }

    return calendar;
  }

  /**
   * Get upcoming bills for a number of days
   */
  async getUpcomingBills(
    userId: string,
    days: number = 30,
  ): Promise<BillWithStatus[]> {
    const bills = await this.getBillsByUser(userId, { activeOnly: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const upcomingBills: BillWithStatus[] = [];

    for (const bill of bills) {
      const nextDue = new Date(bill.nextDueDate);
      if (nextDue >= today && nextDue <= endDate) {
        const daysUntilDue = Math.ceil(
          (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        upcomingBills.push({
          ...bill,
          status: "pending",
          daysUntilDue,
          isPastDue: false,
        });
      }
    }

    return upcomingBills.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  /**
   * Get overdue bills
   */
  async getOverdueBills(userId: string): Promise<BillWithStatus[]> {
    const bills = await this.getBillsByUser(userId, { activeOnly: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueBills: BillWithStatus[] = [];

    for (const bill of bills) {
      const nextDue = new Date(bill.nextDueDate);
      if (nextDue < today) {
        const daysUntilDue = Math.ceil(
          (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        overdueBills.push({
          ...bill,
          status: "overdue",
          daysUntilDue,
          isPastDue: true,
        });
      }
    }

    return overdueBills.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  // ==========================================================================
  // BILL PAYMENTS
  // ==========================================================================

  /**
   * Record a bill payment
   */
  async recordPayment(
    billId: string,
    userId: string,
    amount: number,
    paidDate: Date,
    options?: {
      paymentMethod?: string;
      confirmationNumber?: string;
      notes?: string;
    },
  ): Promise<BillPayment> {
    const bill = await this.getBillById(billId, userId);
    if (!bill) {
      throw new Error("Bill not found");
    }

    const isLate = paidDate > bill.nextDueDate;

    const { data, error } = await supabase
      .from("bill_payments")
      .insert({
        bill_id: billId,
        user_id: userId,
        amount,
        paid_date: paidDate.toISOString(),
        due_date: bill.nextDueDate.toISOString(),
        status: isLate ? "late" : amount < bill.amount ? "partial" : "paid",
        payment_method: options?.paymentMethod || null,
        confirmation_number: options?.confirmationNumber || null,
        notes: options?.notes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record payment: ${error?.message}`);
    }

    // Update next due date
    const nextDueDate = this.calculateNextDueDate(bill);
    await this.updateBill(billId, userId, { nextDueDate });

    return this.mapRowToPayment(data);
  }

  /**
   * Get payments for a bill
   */
  async getPaymentHistory(
    billId: string,
    userId: string,
    limit: number = 12,
  ): Promise<BillPayment[]> {
    const { data, error } = await supabase
      .from("bill_payments")
      .select("*")
      .eq("bill_id", billId)
      .eq("user_id", userId)
      .order("paid_date", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToPayment(row));
  }

  /**
   * Get all payments for a period
   */
  async getPaymentsForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BillPayment[]> {
    const { data, error } = await supabase
      .from("bill_payments")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", startDate.toISOString())
      .lte("due_date", endDate.toISOString());

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToPayment(row));
  }

  // ==========================================================================
  // SUMMARY & ANALYTICS
  // ==========================================================================

  /**
   * Get bill summary for a user
   */
  async getBillSummary(userId: string): Promise<BillSummary> {
    const bills = await this.getBillsByUser(userId, { activeOnly: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get payments this month
    const payments = await this.getPaymentsForPeriod(
      userId,
      monthStart,
      monthEnd,
    );

    const upcomingBills: BillWithStatus[] = [];
    const overdueBills: BillWithStatus[] = [];
    let totalMonthlyBills = 0;
    let totalUpcomingWeek = 0;
    let totalOverdue = 0;
    let autopayCount = 0;

    for (const bill of bills) {
      const nextDue = new Date(bill.nextDueDate);
      const daysUntilDue = Math.ceil(
        (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calculate monthly equivalent
      totalMonthlyBills += this.getMonthlyEquivalent(
        bill.amount,
        bill.frequency,
      );

      if (bill.autopayEnabled) autopayCount++;

      if (nextDue < today) {
        // Overdue
        const isPaid = payments.some((p) => p.billId === bill.id);
        if (!isPaid) {
          totalOverdue += bill.amount;
          overdueBills.push({
            ...bill,
            status: "overdue",
            daysUntilDue,
            isPastDue: true,
          });
        }
      } else if (nextDue <= weekFromNow) {
        // Due within a week
        totalUpcomingWeek += bill.amount;
        upcomingBills.push({
          ...bill,
          status: "pending",
          daysUntilDue,
          isPastDue: false,
        });
      }
    }

    const paidThisMonth = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalMonthlyBills: Math.round(totalMonthlyBills * 100) / 100,
      totalUpcomingWeek: Math.round(totalUpcomingWeek * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      billsCount: bills.length,
      paidThisMonth: Math.round(paidThisMonth * 100) / 100,
      upcomingBills: upcomingBills.sort(
        (a, b) => a.daysUntilDue - b.daysUntilDue,
      ),
      overdueBills: overdueBills.sort(
        (a, b) => a.daysUntilDue - b.daysUntilDue,
      ),
      autopayCount,
      manualPayCount: bills.length - autopayCount,
    };
  }

  // ==========================================================================
  // REMINDERS
  // ==========================================================================

  /**
   * Schedule reminders for a bill
   */
  private async scheduleReminders(
    billId: string,
    userId: string,
    dueDate: Date,
    daysBefore: number,
    reminderTypes: ReminderType[],
  ): Promise<void> {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);

    for (const type of reminderTypes) {
      await supabase.from("bill_reminders").insert({
        bill_id: billId,
        user_id: userId,
        reminder_date: reminderDate.toISOString(),
        reminder_type: type,
        sent: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Get pending reminders to send
   */
  async getPendingReminders(userId?: string): Promise<BillReminder[]> {
    const now = new Date();
    let query = supabase
      .from("bill_reminders")
      .select("*")
      .eq("sent", false)
      .lte("reminder_date", now.toISOString());

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch reminders: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToReminder(row));
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from("bill_reminders")
      .update({
        sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq("id", reminderId);

    if (error) {
      throw new Error(`Failed to mark reminder as sent: ${error.message}`);
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private calculateNextDueDate(bill: Bill): Date {
    const current = new Date(bill.nextDueDate);
    const next = new Date(current);

    switch (bill.frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "semi-annually":
        next.setMonth(next.getMonth() + 6);
        break;
      case "annually":
        next.setFullYear(next.getFullYear() + 1);
        break;
      case "one-time":
        // One-time bills don't recur
        break;
    }

    return next;
  }

  private getMonthlyEquivalent(
    amount: number,
    frequency: BillFrequency,
  ): number {
    switch (frequency) {
      case "weekly":
        return amount * 4.33;
      case "biweekly":
        return amount * 2.17;
      case "monthly":
        return amount;
      case "quarterly":
        return amount / 3;
      case "semi-annually":
        return amount / 6;
      case "annually":
        return amount / 12;
      case "one-time":
        return 0;
      default:
        return amount;
    }
  }

  private isBillDueOnDate(bill: Bill, date: Date): boolean {
    const dueDate = new Date(bill.nextDueDate);
    return this.isSameDay(dueDate, date);
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private mapRowToBill(row: Record<string, unknown>): Bill {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      payee: row.payee as string,
      amount: row.amount as number,
      category: row.category as BillCategory,
      frequency: row.frequency as BillFrequency,
      dueDay: row.due_day as number,
      nextDueDate: new Date(row.next_due_date as string),
      autopayEnabled: row.autopay_enabled as boolean,
      autopayAccountId: row.autopay_account_id as string | undefined,
      reminderDaysBefore: row.reminder_days_before as number,
      reminderTypes: row.reminder_types as ReminderType[],
      notes: row.notes as string | undefined,
      websiteUrl: row.website_url as string | undefined,
      accountNumber: row.account_number as string | undefined,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToPayment(row: Record<string, unknown>): BillPayment {
    return {
      id: row.id as string,
      billId: row.bill_id as string,
      userId: row.user_id as string,
      amount: row.amount as number,
      paidDate: new Date(row.paid_date as string),
      dueDate: new Date(row.due_date as string),
      status: row.status as "paid" | "partial" | "late",
      paymentMethod: row.payment_method as string | undefined,
      confirmationNumber: row.confirmation_number as string | undefined,
      notes: row.notes as string | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }

  private mapRowToReminder(row: Record<string, unknown>): BillReminder {
    return {
      id: row.id as string,
      billId: row.bill_id as string,
      userId: row.user_id as string,
      reminderDate: new Date(row.reminder_date as string),
      reminderType: row.reminder_type as ReminderType,
      sent: row.sent as boolean,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const billCalendarService = new BillCalendarService();
export default billCalendarService;
