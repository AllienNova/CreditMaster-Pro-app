// ============================================================================
// BILL TYPES
// ============================================================================

export type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type BillStatus = "active" | "paused" | "cancelled";

export type BillCategory =
  | "utilities"
  | "rent"
  | "mortgage"
  | "insurance"
  | "subscription"
  | "loan"
  | "credit_card"
  | "phone"
  | "internet"
  | "streaming"
  | "other";

export interface Bill {
  id: string;
  userId: string;
  merchantName: string;
  category: BillCategory;
  amount: number;
  frequency: BillFrequency;
  nextDueDate: Date;
  lastPaidDate?: Date;
  lastPaidAmount?: number;
  status: BillStatus;
  isAutoPay: boolean;
  accountId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillPayment {
  id: string;
  billId: string;
  userId: string;
  transactionId?: string;
  amount: number;
  paidDate: Date;
  dueDate: Date;
  isLate: boolean;
  createdAt: Date;
}

export interface BillDetectionRule {
  merchantPattern: string;
  category: BillCategory;
  minAmount?: number;
  maxAmount?: number;
  frequency?: BillFrequency;
}

export interface DetectedBill {
  merchantName: string;
  category: BillCategory;
  averageAmount: number;
  frequency: BillFrequency;
  nextExpectedDate: Date;
  confidence: number; // 0-100
  transactionIds: string[];
  lastTransactionDate: Date;
}

export interface BillSummary {
  totalMonthlyBills: number;
  totalUpcoming: number;
  totalOverdue: number;
  upcomingBills: Array<{
    id: string;
    merchantName: string;
    amount: number;
    dueDate: Date;
    daysUntilDue: number;
  }>;
  overdueBills: Array<{
    id: string;
    merchantName: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }>;
  billsByCategory: Record<BillCategory, number>;
}

export interface BillAlert {
  id: string;
  billId: string;
  userId: string;
  type: "upcoming" | "overdue" | "amount_change" | "new_bill";
  message: string;
  severity: "info" | "warning" | "error";
  read: boolean;
  createdAt: Date;
}

export interface BillCreateInput {
  merchantName: string;
  category: BillCategory;
  amount: number;
  frequency: BillFrequency;
  nextDueDate: Date;
  isAutoPay?: boolean;
  accountId?: string;
  notes?: string;
}

export interface BillUpdateInput {
  merchantName?: string;
  category?: BillCategory;
  amount?: number;
  frequency?: BillFrequency;
  nextDueDate?: Date;
  lastPaidDate?: Date;
  lastPaidAmount?: number;
  status?: BillStatus;
  isAutoPay?: boolean;
  accountId?: string;
  notes?: string;
}

export interface BillDetectionOptions {
  startDate?: Date;
  endDate?: Date;
  minOccurrences?: number; // Minimum number of transactions to consider it a bill
  confidenceThreshold?: number; // Minimum confidence score (0-100)
}

export interface BillPaymentInput {
  billId: string;
  amount: number;
  paidDate: Date;
  transactionId?: string;
}
