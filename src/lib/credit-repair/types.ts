/**
 * Credit Repair Types
 *
 * Type definitions for the credit repair system
 */

// Credit Repair Score (0-100)
export interface CreditRepairScore {
  score: number; // 0-100
  factors: ScoreFactor[];
  opportunities: Opportunity[];
  estimatedImpact: number; // Potential score increase
  timeline: string; // e.g., "90 days"
}

export interface ScoreFactor {
  category: "disputes" | "utilization" | "negotiations" | "building";
  weight: number; // 0-100
  currentScore: number; // 0-100
  maxScore: number; // 0-100
  impact: number; // Potential points
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  impact: number; // Estimated score increase
  successRate: number; // 0-100
  timeline: string; // e.g., "30 days"
  cost: number; // $0 for free
  priority: "high" | "medium" | "low";
  status: "available" | "in_progress" | "completed";
  actions: Action[];
}

export type OpportunityType =
  | "dispute_inaccuracy"
  | "pay_down_utilization"
  | "goodwill_letter"
  | "pay_for_delete"
  | "remove_inquiry"
  | "optimize_payment_timing"
  | "piggybacking"
  | "credit_builder_loan"
  | "secured_card";

export interface Action {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

// Quick Wins (30-day actions)
export interface QuickWin {
  id: string;
  title: string;
  description: string;
  impact: number; // Estimated score increase
  timeline: string; // e.g., "30 days"
  difficulty: "easy" | "medium" | "hard";
  cost: number;
  steps: string[];
  successRate: number;
}

// Dispute Types
export interface DisputeItem {
  id: string;
  userId: string;
  itemType: "account" | "inquiry" | "public_record" | "personal_info";
  bureau: "experian" | "equifax" | "transunion" | "all";
  itemDescription: string;
  inaccuracyType: InaccuracyType;
  strategy: DisputeStrategy;
  letter: string;
  status: DisputeStatus;
  filedAt?: Date;
  responseAt?: Date;
  outcome?: DisputeOutcome;
  notes?: string;
}

export type InaccuracyType =
  | "not_mine"
  | "incorrect_balance"
  | "incorrect_payment_history"
  | "incorrect_date"
  | "duplicate"
  | "outdated"
  | "unauthorized_inquiry"
  | "identity_theft"
  | "mixed_file"
  | "other";

export type DisputeStrategy =
  | "basic_dispute"
  | "debt_validation"
  | "method_of_verification"
  | "procedural_violation"
  | "statute_of_limitations"
  | "identity_theft"
  | "mixed_file"
  | "creditor_direct"
  | "goodwill"
  | "pay_for_delete";

export type DisputeStatus =
  | "draft"
  | "ready_to_send"
  | "sent"
  | "under_investigation"
  | "resolved"
  | "escalated";

export type DisputeOutcome = "deleted" | "updated" | "verified" | "pending";

// Utilization Types
export interface UtilizationAnalysis {
  overall: UtilizationMetric;
  perCard: CardUtilization[];
  recommendations: UtilizationRecommendation[];
  estimatedImpact: number;
}

export interface UtilizationMetric {
  current: number; // 0-100 percentage
  target: number; // Recommended target (usually 10%)
  difference: number;
  impact: number; // Score impact of reaching target
}

export interface CardUtilization {
  accountId: string;
  accountName: string;
  currentBalance: number;
  creditLimit: number;
  utilization: number; // 0-100 percentage
  statementDate: Date;
  dueDate: Date;
  recommendedPayment: number;
  impact: number;
}

export interface UtilizationRecommendation {
  type:
    | "pay_down"
    | "balance_transfer"
    | "credit_limit_increase"
    | "multiple_payments";
  title: string;
  description: string;
  amount?: number;
  impact: number;
  priority: "high" | "medium" | "low";
}

// Goodwill Letter Types
export interface GoodwillRequest {
  id: string;
  userId: string;
  accountId: string;
  creditorName: string;
  latePaymentDate: Date;
  reason: string;
  letter: string;
  status: "draft" | "sent" | "approved" | "denied";
  sentAt?: Date;
  responseAt?: Date;
  outcome?: "removed" | "denied";
}

// Pay-for-Delete Types
export interface PayForDeleteNegotiation {
  id: string;
  userId: string;
  collectionId: string;
  collectionAgency: string;
  originalCreditor: string;
  originalBalance: number;
  currentBalance: number;
  settlementOffer: number;
  settlementPercentage: number; // 0-100
  status: "draft" | "negotiating" | "agreed" | "paid" | "deleted";
  agreement?: string;
  paidAt?: Date;
  deletedAt?: Date;
}

// Inquiry Removal Types
export interface InquiryRemoval {
  id: string;
  userId: string;
  inquiryId: string;
  creditorName: string;
  inquiryDate: Date;
  bureau: "experian" | "equifax" | "transunion";
  reason: "unauthorized" | "identity_theft" | "consolidation";
  letter: string;
  status: "draft" | "sent" | "removed" | "verified";
  sentAt?: Date;
  responseAt?: Date;
}

// Payment Timing Types
export interface PaymentSchedule {
  accountId: string;
  accountName: string;
  statementDate: Date;
  dueDate: Date;
  recommendedPaymentDate: Date;
  currentBalance: number;
  minimumPayment: number;
  recommendedPayment: number;
  autopayEnabled: boolean;
}

// Credit Building Types
export interface CreditBuildingPlan {
  readiness: ReadinessAssessment;
  recommendations: BuildingRecommendation[];
  timeline: string;
  estimatedImpact: number;
}

export interface ReadinessAssessment {
  ready: boolean;
  reasons: string[];
  blockers: string[];
  score: number; // 0-100
}

export interface BuildingRecommendation {
  type: "piggybacking" | "secured_card" | "credit_builder_loan" | "self_lender";
  title: string;
  description: string;
  cost: number;
  timeline: string;
  impact: number;
  priority: "high" | "medium" | "low";
  pros: string[];
  cons: string[];
}

// AI Generation Types
export interface LetterGenerationRequest {
  type:
    | "dispute"
    | "goodwill"
    | "pay_for_delete"
    | "inquiry_removal"
    | "validation";
  data: JsonRecord;
  tone?: "professional" | "firm" | "friendly";
}

export interface LetterGenerationResponse {
  letter: string;
  subject?: string;
  tips: string[];
  followUpDate?: Date;
}

// Progress Tracking
export interface CreditRepairProgress {
  userId: string;
  startDate: Date;
  startingScore: number;
  currentScore: number;
  targetScore: number;
  scoreIncrease: number;
  daysElapsed: number;
  estimatedDaysRemaining: number;
  completedActions: number;
  totalActions: number;
  milestones: Milestone[];
}

export interface Milestone {
  date: Date;
  score: number;
  action: string;
  impact: number;
}

// Strategy Selection
export interface StrategyRecommendation {
  strategy: DisputeStrategy;
  successRate: number;
  timeline: string;
  difficulty: "easy" | "medium" | "hard";
  legalBasis: string;
  description: string;
  steps: string[];
}
