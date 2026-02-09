import { supabase } from '@/lib/supabase';
import type {
  Bill,
  BillPayment,
  BillDetectionRule,
  DetectedBill,
  BillSummary,
  BillAlert,
  BillCreateInput,
  BillUpdateInput,
  BillDetectionOptions,
  BillPaymentInput,
  BillFrequency,
  BillCategory,
} from './types/bill.types';

// ============================================================================
// TYPES
// ============================================================================

interface Transaction {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
  merchantName: string;
  category?: string;
}

interface RecurringPattern {
  merchantName: string;
  transactions: Transaction[];
  averageAmount: number;
  frequency: BillFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  confidence: number;
}

// ============================================================================
// BILL DETECTION SERVICE
// ============================================================================

class BillDetectionService {
  // ==========================================================================
  // BILL CRUD OPERATIONS
  // ==========================================================================

  /**
   * Get all bills for a user
   */
  async getBillsByUser(
    userId: string,
    options?: { activeOnly?: boolean; category?: BillCategory }
  ): Promise<Bill[]> {
    let query = supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_date', { ascending: true });

    if (options?.activeOnly) {
      query = query.eq('status', 'active');
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch bills: ${error.message}`);
    }

    return (data || []).map(this.mapBillFromDb);
  }

  /**
   * Get a single bill by ID
   */
  async getBillById(billId: string, userId: string): Promise<Bill | null> {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch bill: ${error.message}`);
    }

    return this.mapBillFromDb(data);
  }

  /**
   * Create a new bill
   */
  async createBill(userId: string, input: BillCreateInput): Promise<Bill> {
    const { data, error } = await supabase
      .from('bills')
      .insert({
        user_id: userId,
        merchant_name: input.merchantName,
        category: input.category,
        amount: input.amount,
        frequency: input.frequency,
        next_due_date: input.nextDueDate.toISOString(),
        is_auto_pay: input.isAutoPay || false,
        account_id: input.accountId,
        notes: input.notes,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create bill: ${error.message}`);
    }

    return this.mapBillFromDb(data);
  }

  /**
   * Update a bill
   */
  async updateBill(
    billId: string,
    userId: string,
    input: BillUpdateInput
  ): Promise<Bill> {
    const updateData: Record<string, unknown> = {};

    if (input.merchantName !== undefined)
      updateData.merchant_name = input.merchantName;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.frequency !== undefined) updateData.frequency = input.frequency;
    if (input.nextDueDate !== undefined)
      updateData.next_due_date = input.nextDueDate.toISOString();
    if (input.lastPaidDate !== undefined)
      updateData.last_paid_date = input.lastPaidDate.toISOString();
    if (input.lastPaidAmount !== undefined)
      updateData.last_paid_amount = input.lastPaidAmount;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.isAutoPay !== undefined) updateData.is_auto_pay = input.isAutoPay;
    if (input.accountId !== undefined) updateData.account_id = input.accountId;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabase
      .from('bills')
      .update(updateData)
      .eq('id', billId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update bill: ${error.message}`);
    }

    return this.mapBillFromDb(data);
  }

  /**
   * Delete a bill
   */
  async deleteBill(billId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', billId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete bill: ${error.message}`);
    }
  }

  // ==========================================================================
  // BILL DETECTION
  // ==========================================================================

  /**
   * Detect recurring bills from transactions
   */
  async detectBills(
    userId: string,
    options?: BillDetectionOptions
  ): Promise<DetectedBill[]> {
    const transactions = await this.getTransactions(userId, options);

    // Group transactions by merchant
    const merchantGroups = this.groupTransactionsByMerchant(transactions);

    // Analyze each merchant group for recurring patterns
    const patterns: RecurringPattern[] = [];
    for (const [merchantName, txns] of Object.entries(merchantGroups)) {
      const pattern = this.analyzeRecurringPattern(merchantName, txns);
      if (
        pattern &&
        pattern.confidence >= (options?.confidenceThreshold || 70)
      ) {
        patterns.push(pattern);
      }
    }

    // Convert patterns to detected bills
    return patterns.map((pattern) => this.patternToDetectedBill(pattern));
  }

  /**
   * Get transactions for bill detection
   */
  private async getTransactions(
    userId: string,
    options?: BillDetectionOptions
  ): Promise<Transaction[]> {
    // Fetches transactions from database or Plaid integration
    const endDate = options?.endDate || new Date();
    const startDate =
      options?.startDate ||
      new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });

      if (error) {
        // BillDetectionService error: Error fetching transactions
        return [];
      }

      // Transform database transactions to expected format
      return (transactions || []).map((t: any) => ({
        id: t.id,
        date: new Date(t.date),
        amount: Math.abs(t.amount),
        merchantName: t.merchant_name || t.name || 'Unknown',
        category: t.category || 'Other',
        accountId: t.account_id,
      }));
    } catch (_error) {
      // BillDetectionService error: Transaction fetch error
      void _error;
      return [];
    }
  }

  /**
   * Group transactions by merchant name
   */
  private groupTransactionsByMerchant(
    transactions: Transaction[]
  ): Record<string, Transaction[]> {
    const groups: Record<string, Transaction[]> = {};

    for (const txn of transactions) {
      const normalizedName = this.normalizeMerchantName(txn.merchantName);
      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }
      groups[normalizedName].push(txn);
    }

    return groups;
  }

  /**
   * Normalize merchant name for grouping
   */
  private normalizeMerchantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  /**
   * Analyze transactions for recurring patterns
   */
  private analyzeRecurringPattern(
    merchantName: string,
    transactions: Transaction[]
  ): RecurringPattern | null {
    if (transactions.length < 2) {
      return null;
    }

    // Sort by date
    const sorted = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Calculate average amount
    const averageAmount =
      sorted.reduce((sum, t) => sum + t.amount, 0) / sorted.length;

    // Detect frequency
    const frequency = this.detectFrequency(sorted);
    if (!frequency) {
      return null;
    }

    // Calculate confidence score
    const confidence = this.calculateConfidence(
      sorted,
      averageAmount,
      frequency
    );

    // Extract day of month or week
    const dayOfMonth = this.extractDayOfMonth(sorted);
    const dayOfWeek = this.extractDayOfWeek(sorted);

    return {
      merchantName,
      transactions: sorted,
      averageAmount,
      frequency,
      dayOfMonth,
      dayOfWeek,
      confidence,
    };
  }

  /**
   * Detect frequency of recurring transactions
   */
  private detectFrequency(transactions: Transaction[]): BillFrequency | null {
    if (transactions.length < 2) {
      return null;
    }

    const intervals: number[] = [];
    for (let i = 1; i < transactions.length; i++) {
      const days = Math.round(
        (transactions[i].date.getTime() - transactions[i - 1].date.getTime()) /
          (24 * 60 * 60 * 1000)
      );
      intervals.push(days);
    }

    const avgInterval =
      intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    // Determine frequency based on average interval
    if (avgInterval >= 6 && avgInterval <= 8) return 'weekly';
    if (avgInterval >= 13 && avgInterval <= 15) return 'biweekly';
    if (avgInterval >= 28 && avgInterval <= 32) return 'monthly';
    if (avgInterval >= 88 && avgInterval <= 95) return 'quarterly';
    if (avgInterval >= 360 && avgInterval <= 370) return 'yearly';

    return null;
  }

  /**
   * Calculate confidence score for recurring pattern
   */
  private calculateConfidence(
    transactions: Transaction[],
    averageAmount: number,
    frequency: BillFrequency
  ): number {
    let score = 50; // Base score

    // More transactions = higher confidence
    score += Math.min(transactions.length * 5, 30);

    // Consistent amounts = higher confidence
    const amountVariance =
      transactions.reduce(
        (sum, t) => sum + Math.abs(t.amount - averageAmount),
        0
      ) / transactions.length;
    const amountConsistency = Math.max(
      0,
      100 - (amountVariance / averageAmount) * 100
    );
    score += amountConsistency * 0.2;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Extract most common day of month
   */
  private extractDayOfMonth(transactions: Transaction[]): number | undefined {
    const days = transactions.map((t) => t.date.getDate());
    const dayCount: Record<number, number> = {};

    for (const day of days) {
      dayCount[day] = (dayCount[day] || 0) + 1;
    }

    const mostCommonDay = Object.entries(dayCount).sort(
      ([, a], [, b]) => b - a
    )[0];

    return mostCommonDay ? parseInt(mostCommonDay[0]) : undefined;
  }

  /**
   * Extract most common day of week
   */
  private extractDayOfWeek(transactions: Transaction[]): number | undefined {
    const days = transactions.map((t) => t.date.getDay());
    const dayCount: Record<number, number> = {};

    for (const day of days) {
      dayCount[day] = (dayCount[day] || 0) + 1;
    }

    const mostCommonDay = Object.entries(dayCount).sort(
      ([, a], [, b]) => b - a
    )[0];

    return mostCommonDay ? parseInt(mostCommonDay[0]) : undefined;
  }

  /**
   * Convert recurring pattern to detected bill
   */
  private patternToDetectedBill(pattern: RecurringPattern): DetectedBill {
    const lastTransaction =
      pattern.transactions[pattern.transactions.length - 1];
    const nextExpectedDate = this.calculateNextDueDate(
      lastTransaction.date,
      pattern.frequency,
      pattern.dayOfMonth
    );

    return {
      merchantName: pattern.merchantName,
      category: this.inferCategory(pattern.merchantName),
      averageAmount: pattern.averageAmount,
      frequency: pattern.frequency,
      nextExpectedDate,
      confidence: pattern.confidence,
      transactionIds: pattern.transactions.map((t) => t.id),
      lastTransactionDate: lastTransaction.date,
    };
  }

  /**
   * Calculate next due date based on frequency
   */
  private calculateNextDueDate(
    lastDate: Date,
    frequency: BillFrequency,
    dayOfMonth?: number
  ): Date {
    const next = new Date(lastDate);

    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        if (dayOfMonth) {
          next.setDate(dayOfMonth);
        }
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  /**
   * Infer bill category from merchant name
   */
  private inferCategory(merchantName: string): BillCategory {
    const name = merchantName.toLowerCase();

    if (
      name.includes('netflix') ||
      name.includes('spotify') ||
      name.includes('hulu')
    )
      return 'streaming';
    if (
      name.includes('electric') ||
      name.includes('gas') ||
      name.includes('water')
    )
      return 'utilities';
    if (name.includes('insurance')) return 'insurance';
    if (
      name.includes('phone') ||
      name.includes('verizon') ||
      name.includes('att')
    )
      return 'phone';
    if (
      name.includes('internet') ||
      name.includes('comcast') ||
      name.includes('spectrum')
    )
      return 'internet';
    if (name.includes('rent') || name.includes('apartment')) return 'rent';
    if (name.includes('mortgage') || name.includes('loan')) return 'mortgage';

    return 'other';
  }

  // ==========================================================================
  // BILL PAYMENTS
  // ==========================================================================

  /**
   * Record a bill payment
   */
  async recordPayment(
    userId: string,
    input: BillPaymentInput
  ): Promise<BillPayment> {
    // Get the bill to verify ownership and get due date
    const bill = await this.getBillById(input.billId, userId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    const isLate = input.paidDate > bill.nextDueDate;

    const { data, error } = await supabase
      .from('bill_payments')
      .insert({
        bill_id: input.billId,
        user_id: userId,
        transaction_id: input.transactionId,
        amount: input.amount,
        paid_date: input.paidDate.toISOString(),
        due_date: bill.nextDueDate.toISOString(),
        is_late: isLate,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record payment: ${error.message}`);
    }

    // Update bill's last paid info and next due date
    const nextDueDate = this.calculateNextDueDate(
      input.paidDate,
      bill.frequency
    );

    await this.updateBill(input.billId, userId, {
      lastPaidDate: input.paidDate,
      lastPaidAmount: input.amount,
      nextDueDate,
    });

    return this.mapBillPaymentFromDb(data);
  }

  /**
   * Get payment history for a bill
   */
  async getPaymentHistory(
    billId: string,
    userId: string
  ): Promise<BillPayment[]> {
    const { data, error } = await supabase
      .from('bill_payments')
      .select('*')
      .eq('bill_id', billId)
      .eq('user_id', userId)
      .order('paid_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }

    return (data || []).map(this.mapBillPaymentFromDb);
  }

  // ==========================================================================
  // BILL SUMMARY & ANALYTICS
  // ==========================================================================

  /**
   * Get bill summary for a user
   */
  async getBillSummary(userId: string): Promise<BillSummary> {
    const bills = await this.getBillsByUser(userId, { activeOnly: true });

    const now = new Date();
    const upcomingBills: BillSummary['upcomingBills'] = [];
    const overdueBills: BillSummary['overdueBills'] = [];
    const billsByCategory: Record<BillCategory, number> = {} as Record<
      BillCategory,
      number
    >;

    let totalMonthlyBills = 0;

    for (const bill of bills) {
      // Calculate monthly equivalent
      const monthlyAmount = this.convertToMonthlyAmount(
        bill.amount,
        bill.frequency
      );
      totalMonthlyBills += monthlyAmount;

      // Count by category
      billsByCategory[bill.category] =
        (billsByCategory[bill.category] || 0) + monthlyAmount;

      // Check if upcoming or overdue
      const daysUntilDue = Math.ceil(
        (bill.nextDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysUntilDue < 0) {
        overdueBills.push({
          id: bill.id,
          merchantName: bill.merchantName,
          amount: bill.amount,
          dueDate: bill.nextDueDate,
          daysOverdue: Math.abs(daysUntilDue),
        });
      } else if (daysUntilDue <= 30) {
        upcomingBills.push({
          id: bill.id,
          merchantName: bill.merchantName,
          amount: bill.amount,
          dueDate: bill.nextDueDate,
          daysUntilDue,
        });
      }
    }

    // Sort upcoming bills by due date
    upcomingBills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      totalMonthlyBills,
      totalUpcoming: upcomingBills.reduce((sum, b) => sum + b.amount, 0),
      totalOverdue: overdueBills.reduce((sum, b) => sum + b.amount, 0),
      upcomingBills,
      overdueBills,
      billsByCategory,
    };
  }

  /**
   * Convert bill amount to monthly equivalent
   */
  private convertToMonthlyAmount(
    amount: number,
    frequency: BillFrequency
  ): number {
    switch (frequency) {
      case 'weekly':
        return amount * 4.33; // Average weeks per month
      case 'biweekly':
        return amount * 2.17; // Average biweekly periods per month
      case 'monthly':
        return amount;
      case 'quarterly':
        return amount / 3;
      case 'yearly':
        return amount / 12;
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Map database bill to Bill type
   */
  private mapBillFromDb(data: any): Bill {
    return {
      id: data.id,
      userId: data.user_id,
      merchantName: data.merchant_name,
      category: data.category,
      amount: parseFloat(data.amount),
      frequency: data.frequency,
      nextDueDate: new Date(data.next_due_date),
      lastPaidDate: data.last_paid_date
        ? new Date(data.last_paid_date)
        : undefined,
      lastPaidAmount: data.last_paid_amount
        ? parseFloat(data.last_paid_amount)
        : undefined,
      status: data.status,
      isAutoPay: data.is_auto_pay,
      accountId: data.account_id,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map database bill payment to BillPayment type
   */
  private mapBillPaymentFromDb(data: any): BillPayment {
    return {
      id: data.id,
      billId: data.bill_id,
      userId: data.user_id,
      transactionId: data.transaction_id,
      amount: parseFloat(data.amount),
      paidDate: new Date(data.paid_date),
      dueDate: new Date(data.due_date),
      isLate: data.is_late,
      createdAt: new Date(data.created_at),
    };
  }
}

// Export singleton instance
export const billDetectionService = new BillDetectionService();
