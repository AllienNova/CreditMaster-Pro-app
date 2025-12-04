/**
 * Database Types for Credit Repair System
 * 
 * These types match the database schema exactly.
 * They are separate from the application types to maintain clear separation.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type Bureau = 'experian' | 'equifax' | 'transunion';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

export type ActionType =
  | 'dispute_inaccuracy'
  | 'pay_down_utilization'
  | 'goodwill_letter'
  | 'pay_for_delete'
  | 'remove_inquiry'
  | 'optimize_payment_timing'
  | 'piggybacking'
  | 'credit_builder_loan'
  | 'secured_card'
  | 'other';

export type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DisputeStrategy =
  | 'basic_dispute'
  | 'debt_validation'
  | 'method_of_verification'
  | 'procedural_violation'
  | 'statute_of_limitations'
  | 'identity_theft'
  | 'mixed_file'
  | 'creditor_direct'
  | 'goodwill'
  | 'pay_for_delete';

export type DisputeStatus =
  | 'draft'
  | 'sent'
  | 'under_review'
  | 'resolved'
  | 'rejected';

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

/**
 * Credit Repair Score
 * Tracks user's credit repair score over time
 */
export interface CreditRepairScore {
  id: string;
  userId: string;
  score: number; // 0-100
  factors: Record<string, number>;
  opportunities: Array<{
    type: string;
    impact: number;
    timeline?: string;
  }>;
  estimatedImpact?: number;
  timeline?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Credit Repair Action
 * Tracks individual actions user can take
 */
export interface CreditRepairAction {
  id: string;
  userId: string;
  actionType: ActionType;
  actionData: JsonRecord;
  status: ActionStatus;
  impact?: number;
  successRate?: number;
  timeline?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Credit Repair Progress
 * Tracks milestones and progress over time
 */
export interface CreditRepairProgress {
  id: string;
  userId: string;
  milestoneType: string;
  milestoneData: JsonRecord;
  achievedAt: Date;
  scoreBefore?: number;
  scoreAfter?: number;
  impact?: number;
  createdAt: Date;
}

/**
 * Credit Report
 * Stores credit report data from bureaus
 */
export interface CreditReport {
  id: string;
  userId: string;
  reportData: JsonRecord;
  bureau: Bureau;
  reportDate: Date;
  score?: number;
  accounts?: JsonRecord[];
  inquiries?: JsonRecord[];
  collections?: JsonRecord[];
  publicRecords?: JsonRecord[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dispute
 * Tracks credit report disputes
 */
export interface Dispute {
  id: string;
  userId: string;
  itemType: string;
  itemDescription: string;
  creditorName?: string;
  accountNumber?: string;
  balance?: number;
  inaccuracyType: string;
  strategy: DisputeStrategy;
  letterContent?: string;
  status: DisputeStatus;
  bureau: Bureau;
  sentAt?: Date;
  responseReceivedAt?: Date;
  outcome?: 'removed' | 'updated' | 'verified' | 'pending';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Goodwill Letter
 * Tracks goodwill letter requests
 */
export interface GoodwillLetter {
  id: string;
  userId: string;
  creditorName: string;
  accountNumber?: string;
  latePaymentDate: Date;
  reason: string;
  letterContent: string;
  status: 'draft' | 'sent' | 'response_received' | 'approved' | 'denied';
  sentAt?: Date;
  responseReceivedAt?: Date;
  outcome?: 'removed' | 'denied' | 'pending';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Negotiation
 * Tracks pay-for-delete negotiations
 */
export interface Negotiation {
  id: string;
  userId: string;
  collectionAgency: string;
  originalCreditor?: string;
  accountNumber?: string;
  originalBalance: number;
  currentBalance: number;
  settlementPercentage?: number;
  settlementAmount?: number;
  scripts?: Record<string, string>;
  status: 'pending' | 'negotiating' | 'agreed' | 'paid' | 'completed' | 'failed';
  agreedAt?: Date;
  paidAt?: Date;
  deletionConfirmedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Credit Card
 * Tracks credit card information for utilization optimization
 */
export interface CreditCard {
  id: string;
  userId: string;
  cardName: string;
  currentBalance: number;
  creditLimit: number;
  utilization: number; // Auto-calculated by database
  statementDate: number; // Day of month (1-31)
  dueDate: number; // Day of month (1-31)
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
