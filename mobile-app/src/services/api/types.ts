/**
 * Fynvita Mobile API Types
 * Comprehensive type definitions for all API interactions
 */

// Base API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Credit Score Types
export interface CreditScore {
  id: string;
  userId: string;
  bureau: "experian" | "equifax" | "transunion";
  score: number;
  previousScore?: number;
  change?: number;
  date: string;
  lastUpdated?: string; // ISO timestamp of last update
  factors?: CreditFactor[];
}

export interface CreditFactor {
  id: string; // Factor identifier (payment_history, credit_utilization, etc.)
  name: string; // Display name
  impact:
    | "high_positive"
    | "positive"
    | "neutral"
    | "negative"
    | "high_negative";
  category:
    | "payment_history"
    | "credit_utilization"
    | "credit_age"
    | "credit_mix"
    | "new_credit";
  status?: "excellent" | "good" | "fair" | "poor" | "very_poor"; // Overall status
  value?: string; // Current value (e.g., "18% utilization", "100% on-time")
  description: string;
  recommendation?: string;
  percentImpact?: number; // FICO weight percentage (35, 30, 15, 10, 10)
}

export interface CreditScoreHistory {
  history: Array<{ date: string; score: number; bureau?: string }>; // Historical score data points
  scores?: CreditScore[]; // Legacy field for compatibility
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  trend: "improving" | "declining" | "stable";
  periodStart: string;
  periodEnd: string;
}

// Credit Monitoring Types
export type AlertType =
  | "new_account"
  | "score_change"
  | "inquiry"
  | "address_change"
  | "fraud_alert"
  | "derogatory";

export interface CreditMonitoringAlert {
  id: string;
  userId: string;
  bureau: string;
  alertType: AlertType;
  type: AlertType; // Alias for alertType for backward compatibility
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  message?: string; // Alias for description
  data?: Record<string, unknown>;
  details?: Record<string, unknown>; // Alias for data
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  isRead?: boolean; // Alias for acknowledged
}

export interface BureauStatus {
  connected: boolean;
  enabled?: boolean;
  lastSync?: string;
}

export interface MonitoringStatus {
  isActive: boolean;
  bureaus: {
    experian: BureauStatus;
    equifax: BureauStatus;
    transunion: BureauStatus;
    [key: string]: BureauStatus; // Index signature for dynamic access
  };
  alertsCount: { total: number; unread: number };
  nextScheduledSync?: string;
}

// Dispute Types
export type DisputeStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "ready"
  | "sent"
  | "under_review"
  | "resolved"
  | "rejected"
  | "deleted";

export interface Dispute {
  id: string;
  userId: string;
  bureau: "experian" | "equifax" | "transunion";
  status: DisputeStatus;
  itemType: string;
  creditorName: string;
  accountNumber?: string;
  disputeReason: string;
  letterContent?: string;
  documents?: string[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  resolvedAt?: string;
  outcome?: "removed" | "updated" | "verified" | "pending";
  responseDetails?: string;
  followUpDate?: string;
}

export interface DisputeTemplate {
  id: string;
  name: string;
  category: string;
  scenario: string;
  successRate: number;
  tone: "formal" | "humble" | "assertive" | "legal";
  letterText: string;
  requiredDocuments: string[];
  placeholders: string[];
  bestPractices?: string[];
}

export interface DisputeStrategy {
  id: string;
  name: string;
  description: string;
  successRate: number;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  riskLevel: "low" | "medium" | "high";
  timeline: string;
  steps: { step: number; title: string; description: string }[];
}

export interface DisputeReason {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  legalBasis?: string;
}

export interface StrategyRecommendation {
  strategyId: string;
  name: string;
  confidence: number;
  reasoning: string;
}

// Financial Types
export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "loan"
  // Plaid's account.type is depository | credit | loan | investment | other,
  // and depository splits by subtype. "other" is what an unrecognised type
  // maps to — without it, toMobileAccountType would have to round every
  // unknown account into one of the five above, and a loan filed as checking
  // would be counted as an asset.
  | "other";

export interface BankAccount {
  id: string;
  userId: string;
  institutionName: string;
  accountType: AccountType;
  type: AccountType; // Alias for accountType
  accountName: string;
  name: string; // Alias for accountName
  balance: number;
  availableBalance?: number;
  lastSynced: string;
  isConnected: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  category: string;
  merchantName: string;
  date: string;
  pending: boolean;
  type: "income" | "expense" | "transfer";
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  period: "weekly" | "monthly" | "yearly";
}

export type GoalType =
  | "emergency_fund"
  | "debt_payoff"
  | "savings"
  | "investment"
  | "retirement"
  | "education"
  | "home"
  | "vacation"
  | "other";

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  type?: GoalType;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  targetDate?: string; // Alias for deadline
  monthlyContribution?: number;
  status: "active" | "completed" | "paused";
}

// User Types
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: Address;
  subscriptionTier: "free" | "basic" | "premium" | "enterprise";
  subscriptionStatus: "active" | "canceled" | "past_due" | "trialing";
  createdAt: string;
  updatedAt: string;
  /**
   * Server-assigned role. GET /api/profile returns it (profile/route.ts:98)
   * and the mobile adapter previously dropped it, so the app had no notion of
   * an admin at all — which is why the twelve admin screens had no entry
   * point that could be shown to the right people and hidden from everyone
   * else. Display-gating only; every admin API enforces its own permission
   * server-side.
   */
  role?: "user" | "premium" | "admin" | "super_admin";
  onboardingCompleted: boolean;
  goals?: string[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type:
    | "dispute_update"
    | "score_change"
    | "alert"
    | "recommendation"
    | "payment"
    | "system";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  categories: {
    disputes: boolean;
    scoreChanges: boolean;
    alerts: boolean;
    recommendations: boolean;
    payments: boolean;
    marketing: boolean;
  };
}

// Subscription Types
export interface Subscription {
  id: string;
  userId: string;
  plan: "free" | "basic" | "premium" | "enterprise";
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  features: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  highlighted?: boolean;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  userId: string;
  type: "credit_card" | "loan" | "action" | "insight";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  potentialImpact?: number;
  actionUrl?: string;
  expiresAt?: string;
  dismissed: boolean;
}

// Identity Protection Types
export interface IdentityProtectionStatus {
  isActive: boolean;
  darkWebMonitoring: boolean;
  lastScan?: string;
  exposedDataCount: number;
  alerts: IdentityAlert[];
}

export interface IdentityAlert {
  id: string;
  type: "breach" | "dark_web" | "fraud_attempt";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  exposedData?: string[];
  recommendations: string[];
  createdAt: string;
  resolved: boolean;
}

// Document Types
export interface Document {
  id: string;
  userId: string;
  name: string;
  type: "credit_report" | "dispute_response" | "identity" | "income" | "other";
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: "processing" | "analyzed" | "error";
  uploadedAt: string;
  analysisResult?: DocumentAnalysis;
}

export interface DocumentAnalysis {
  bureau?: string;
  score?: number;
  accountsCount: number;
  disputableItems: number;
  recommendations: string[];
}

// API Request Config Types
export interface RequestConfig {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  enableCache?: boolean; // Renamed from 'cache' to avoid conflict with native RequestCache type
  cacheTime?: number;
  offlineSupport?: boolean;
  method?: string;
  body?: string;
}

